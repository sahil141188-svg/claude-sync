# Audit — Rocket Launch ERP (PR #1)

**Branch audited:** `claude/sales-erp-app-design-uts09f` @ `7ae95ab`
**Audit date:** 2026-07-29
**Method:** full TypeScript compile, live run in headless Chromium (Vite dev server + Playwright), line-by-line review of the Zustand store and all 16 pages, and a reachability check of the deployment domain `os.ansbharat.com`.

---

## Verdict

**The app does not run — not in production build, and not in dev mode.** Three independent fatal defects each block the app before a user can see the login screen, and behind those sit broken core mechanics: the scoring engine never scores, the login guard locks everyone out, attendance can never be marked, and the manager approval / warning workflows don't persist anything. **PR #1 must not be merged in its current state.**

| Layer | Status |
|---|---|
| `npm run build` (`tsc && vite build`) | ❌ fails — 110 TypeScript errors in 11 files |
| CSS compile (dev & build) | ❌ fails — invalid `@apply border-border` blanks the whole app |
| Login page module load | ❌ crashes — named import of a default-only export (7 files) |
| Auth guard after login | ❌ redirect loop — checks a localStorage key nothing writes |
| KPI scoring engine | ❌ silently never fires — reads `.kpis`, pages write `kpiCommitment`/`kpiActual`/`kpiTargets` |
| Leaderboard | ❌ always empty — filters on `isActive`, a field no user ever has |
| ScoreCard | ❌ shows the wrong week — non-ISO week math disagrees with the store |
| Deployment (os.ansbharat.com) | ❌ not serving (DNS → Vercel, but page unreachable; build cannot succeed) |

---

## Deployment check — os.ansbharat.com

- `os.ansbharat.com` resolves via CNAME to `cname.vercel-dns.com` (66.33.60.130 / 76.76.21.61) — the Vercel custom-domain wiring is in place.
- The page could not be fetched from two independent paths (this environment's proxy and an external crawler); the external crawler fetched `ansbharat.com` (the Robotek wholesale login) fine, so the failure is specific to the `os.` subdomain — consistent with a failed or missing Vercel deployment.
- This is expected: Vercel's default build for this repo runs `npm run build` = `tsc && vite build`, which **cannot succeed** (110 type errors), and even with `tsc` skipped, `vite build` dies on the CSS error below. Every deployment of this branch will fail until the fatal defects are fixed.

---

## Fatal defects (each one alone makes the app unusable)

### F1 — CSS fails to compile → blank screen everywhere
`src/index.css:8` — `* { @apply border-border; }` references a Tailwind class `border-border` that does not exist; `tailwind.config.js` defines `rocket.border`, not a `border` color token. This is a shadcn/ui idiom copied without the matching theme config.
**Verified live:** Vite returns 500 for `index.css`, the module graph fails, and the browser renders an empty `<body>`. Nothing — not even the login screen — appears.

### F2 — 7 files import `useERPStore` as a named export
`src/store/erpStore.ts:511` only has `export default useERPStore`. But `Login.tsx:3`, `Layout.tsx:18`, `WeeklyPlan.tsx:15`, `MorningLaunch.tsx:4`, `LeadTracker.tsx:4`, `Attendance.tsx:2`, `Warnings.tsx:2` all do `import { useERPStore } from '../store/erpStore'`.
**Verified live** (after patching F1): the Login route throws `SyntaxError: The requested module '/src/store/erpStore.ts' does not provide an export named 'useERPStore'` and crashes; Layout crashing takes down every authenticated route.

### F3 — Build is impossible: 110 TypeScript errors
`npm run build` runs `tsc` first; it exits with **110 errors across 11 files** (23 in the store alone). Root causes: demo users missing required `joinDate`/`isActive` fields, the store writing `WeekScore`/`DayScore` shapes that don't match their declared types, comparisons against status values that don't exist in the unions (`'completed'`, `'cancelled'`, `'closed_won'`), and pervasive implicit-`any` in map/filter callbacks.

### F4 — Auth guard checks a key nothing ever writes → login is a dead end
`src/App.tsx:41-46` — `ProtectedLayout` gates on `localStorage.getItem('user')`. No code in the app ever writes a `user` key (verified by grep: only `darkMode` and the Zustand persist key `rocket-launch-erp-v1` are written). Even with F1/F2 fixed, a successful PIN login navigates to `/`, the guard sees `null`, and bounces straight back to `/login` — forever. The inverse is also broken: `logout()` never clears the key, so if it were ever set, logged-out users would still pass the guard.

### F5 — The scoring engine never scores anything
`src/store/erpStore.ts:340-341, 387` — `computeWeekScore` reads `(morning as any).kpis`, `(evening as any).kpis`, and `(weeklyPlan as any).kpis`. The pages (and the types) use `kpiCommitment`, `kpiActual`, and `kpiTargets`. The `.kpis` field is never written by anything, so:
- `committed` is always `{}` → `committedVal === 0` → every KPI is skipped → **no KPI deduction or bonus is ever applied**;
- `achievementPct` is always 0 for everyone (which also makes `Warnings.tsx` flag every rep with a "0% plan achievement" yellow card).
The entire deficit-scoring philosophy the PR describes — the core of the product — is dead code.

### F6 — The leaderboard can never show anyone
`Leaderboard.tsx:111,126,137,551` — every tab filters users on `u.isActive`, but no demo user has that field and nothing ever sets it, so the filter drops everyone. Week, Daily Flash, and All-Time tabs permanently show the empty state even with full data — and the mount effect that pre-computes scores filters the same empty list, so it computes nothing.

### F7 — ScoreCard computes weeks with a different algorithm than the store
`ScoreCard.tsx:25-54` uses a non-ISO `Math.ceil`-from-Jan-1 week number while the store uses ISO weeks. On 2026-07-29 the page asks for `2026-W30` while the store writes `2026-W31`: the header shows this week's dates over last week's scores, every Day Score cell falls back to 0, Team Rank and Grade History come up empty, and a spurious duplicate `WeekScore` row is inserted that double-counts in the leaderboard's All-Time totals.

---

## High-severity findings

### Store / scoring
- **Week bounds are Sunday–Friday, not Monday–Saturday (IST).** `erpStore.ts:29` serializes local-midnight dates with `toISOString()`; in IST (UTC+5:30) that lands on the previous day. Verified: `getWeekBounds('2026-W31')` → 2026-07-26 (Sun) … 2026-07-31 (Fri). Every user is docked −10 for "No morning plan" on Sunday (a non-working day) every week, and Saturday's work is silently excluded — a Grade S becomes structurally impossible.
- **Future days are penalized.** `computeWeekScore` iterates all six week days with no `date <= today` cutoff; on Monday a rep already carries −50 for Tue–Sat.
- **UTC/IST split-brain dates.** `today()` and record dates use the UTC date while deadline checks use local hours. Between 00:00 and 05:30 IST: an evening report submitted at 00:30 Wed is stored under Tuesday **and** marked on-time; a morning plan at 05:15 Tue overwrites Monday's plan and then "disappears" at 05:30; attendance saves against the wrong date; the week score recompute can target a different week than the one displayed.
- **Evening preview scoring ≠ store scoring.** `EveningLanding.tsx:198-204` shows task penalties (−5 partial / −10 not done) that the store never applies, while the store applies attendance penalties the preview omits — the submit-screen score, the persisted `todayScore`, and the leaderboard can never agree. `MorningLaunch.tsx:243-250` shows a third, invented score formula.
- **`getPendingItems` is wrong on all three counts** (`erpStore.ts:450-470`): follow-ups checked via nonexistent `fu.done` (counts done/cancelled ones), stale leads via nonexistent `lead.status === 'closed_won'` (won/lost leads never excluded), tasks via nonexistent statuses `'completed'`/`'cancelled'` (approved tasks counted pending forever).

### Roles & permissions
- **No role-based route guards at all.** `App.tsx` gates only on the (broken) localStorage check; `Layout.tsx` merely hides nav links. A sales exec can type `/manager`, `/warnings`, `/dashboard`, or `/reports` and get the full manager/admin UI — including coaching notes labeled "visible to manager & admin only", the ability to assign tasks to peers, approve/reject teammates, and company-wide PIP records. `Warnings.tsx` doesn't even check login.
- **PIN collision → impersonation.** `Profile.tsx` PIN change never checks uniqueness, and `login()` (`erpStore.ts:158`) resolves `users.find(u => u.pin === pin)` first-match-wins. A rep who sets their PIN to `2001` races the OSR manager for that login.

### Workflows that silently don't persist
- **Manager approval queue is cosmetic.** `ManagerDashboard.tsx:92-93,305,320` — Approve/Reject only mutate local `useState`; `updateTaskStatus` exists in the store but is called from zero pages. Refresh ⇒ everything is pending again; task lifecycle is permanently stuck at `'assigned'`.
- **The entire warning/PIP system is local state.** `Warnings.tsx:52-55` — notices, escalations, PIP notes all vanish on refresh; the store has no action that writes a `Warning`, so `warnings` is permanently `[]`. "Extend PIP" and "HR Review" buttons have no handlers at all.
- **Attendance can never be marked.** `Attendance.tsx:100-107` filters staff by `u.managerId`/`u.isActive` — fields no demo user has and no action sets. Every manager/admin sees "No team members found"; absent/late penalties can therefore never fire either. The page also breaks the Rules of Hooks (`Attendance.tsx:95` early-returns before `useMemo` hooks), crashing on login transition.
- **Weekly plan is Monday-or-never.** `WeeklyPlan.tsx:59,139,426` hard-disables submission unless `getDay() === 1`, with no late/admin path. A rep absent Monday runs the whole week with zero KPI accountability (empty commitment → store skips all comparisons).
- **Carry-forward never works.** `WeeklyPlan.tsx:94-99` matches on `ts.taskId`/`'pending'`/`'rescheduled'` — fields and values that never exist on `TaskStatusRecord` (`taskIndex`, `'done'|'partial'|'not_done'`); the list is always empty.
- **Manager team summary always blank.** `ManagerDashboard.tsx:128-129` reads `weekScore.dailyScores[date].total` per the type, but the store writes an array under `dayScores` with a different shape — every Mon–Sat cell renders "-" forever.

### Dashboards & reports
- **Scores only recompute on evening submit.** `erpStore.ts:216-217` — `markAttendance`, morning, and weekly submissions never trigger `computeWeekScore`. Marking someone absent changes nothing until their next evening submit, and a member who never submits an evening actual gets **no WeekScore row at all** — vanishing from the leaderboard and team averages instead of ranking last.
- **Reports page invents its own scoring model.** `Reports.tsx:128-153` sums `evening.todayScore` with its own penalties instead of using store `weekScores` — its totals and grades contradict ScoreCard and Leaderboard for the same person and week, and the WhatsApp export (`Reports.tsx:292-294`) broadcasts those wrong numbers to the team.
- **Leaderboard never refreshes.** `Leaderboard.tsx:123-127` — the ranking `useMemo` depends only on stable references, not on the scores themselves; recomputed scores render the stale (initially empty) list.
- **Non-submitters are invisible in the admin table.** `AdminDashboard.tsx:372` — rows for execs with no week score render dark-on-dark (`#1e293b` on `#1e293b`) — precisely the people an admin most needs to see.
- **All five admin Quick Actions are dead.** `AdminDashboard.tsx:487-491` navigates to `/admin/users`, `/admin/broadcast`, etc. — none exist; the wildcard route bounces every click back to the dashboard. Same class of bug: MyDashboard's "Weekly" action targets `/weekly` instead of `/weekly-plan` (`MyDashboard.tsx:283`).
- **Any user can open anyone's scorecard.** `ScoreCard.tsx:108-121` — `/scorecard/<userId>` is not role-gated; a rep can view any colleague's full scorecard, attendance, and deductions.

---

## Medium-severity findings

- `WeeklyPlan.tsx:256` renders `#{prevWeekScore.rank}` — no code ever writes `rank` → "Rank #undefined".
- `WeeklyPlan.tsx:64` — `currentUser!` with no logged-out guard → white-screen TypeError on direct navigation.
- `EveningLanding.tsx:130-135` — task statuses default to `'done'`; submitting without touching Section 2 records all tasks complete, zero penalty.
- `MorningLaunch.tsx:239-241` — clearing a KPI input stores `0`, which exempts that KPI from all scoring — a silent opt-out loophole.
- `ManagerDashboard.tsx:600-604` — "vs Last Wk" compares against the first score from *any* other week, not the previous one.
- `LeadTracker.tsx:305,541` — rescheduled follow-ups (`status: 'rescheduled'`) disappear from the pending list permanently.
- `Warnings.tsx:68-76` — yellow-card trigger fires on `achievementPct < 60` with no "has data" guard; combined with F5 every rep is publicly flagged at 0%.
- `Profile.tsx:132-136` — `joinDate` missing on all demo users → "Invalid Date" and `NaN` "Days in Team" for everyone.
- `Profile.tsx:35-97` — badges, streaks, and 8-week history are hardcoded sample constants shown to every user as their own data.
- `erpStore.ts:245` — `markAttendance` never sets the required `markedAt` → audit "Time" column permanently "—".
- `EveningLanding.tsx:344-374` — leads persist twice with different filters; blank lead rows are stored forever inside `eveningActuals`.
- `Reports.tsx:152` — Achieve% has no lower clamp on the deficit score; a member can show "-200%".
- `ScoreCard.tsx:127-132` — `computeWeekScore` (which writes to the store) is called inside `useMemo` during render — React "cannot update while rendering" warnings and extra render passes.
- `ScoreCard.tsx:181-187` — Team Rank gives non-submitters a score of 0 and sorts descending — the least active member ranks #1.
- `ScoreCard.tsx:210-228` — the Score Breakdown reconstructs deductions as flat −5 per issue (store uses −5/−10/−15/−20 bands) and mislabels positives as "Bonus" — the rows visibly don't sum to the FINAL score printed beneath them.
- `ScoreCard.tsx:232-239` — attendance % divides by all 6 week days including future ones — a member present Monday shows "17%" on Tuesday.
- `AdminDashboard.tsx:96-104` — on Sundays the plan-compliance window computes against *next* week's dates → always 0%.
- `AdminDashboard.tsx:144` — activity feed reads `l.companyName` but the field is `company` → "added a lead: undefined".
- `MyDashboard.tsx:84-101` — the streak counter counts Sunday as a broken day, so every Monday the streak resets to 0; it can never exceed ~6.

## Low-severity findings

- `Layout.tsx:66,70` — two nav items point at `/attendance` ("Tasks" and "Attendance"); there is no tasks page anywhere, so assigned tasks have no UI destination.
- `Warnings.tsx:34-43` — hardcoded week-52 year rollover breaks in 53-week ISO years (2026 has 53).
- `Warnings.tsx:111-120` — hardcoded "recovery story" about a named demo user displayed as fact.
- `Attendance.tsx:139-149` — "Save All" rewrites `markedBy` on untouched records to whoever clicked.
- `Attendance.tsx:165-192` — three different attendance-percentage formulas on one screen; a member can be flagged "Below 80%" beside a card showing 80%+.
- `Profile.tsx:127-130`, `Layout.tsx:54-57` — `navigate()` called during render (React Router warning / StrictMode crash risk).
- `Profile.tsx:179-183` — PIN-change success message can never be seen (panel closes first).
- `Playbook.tsx:543-545` — "Request Training" button has no handler.
- `MorningLaunch.tsx:211` — 10:00:59 counts as on-time while the evening check is strict; inconsistent deadline semantics.
- `erpStore.ts:33-35` — IDs from `Math.random().toString(36)` — collision-prone; fine for a demo, not for real records.
- `Leaderboard.tsx:306-308` — rank-movement chevrons are derived from `userId.charCodeAt(0) % 3` — fabricated per-user constants shown as performance movement; some users show a permanent red "down" arrow.
- `Leaderboard.tsx:144,529` — Daily Flash awards +10 for any morning plan while the legend says "on time"; `submittedOnTime` is never checked, and its positive points are incommensurable with the weekly deficit model.
- `AdminDashboard.tsx:117-137` — activity feed fabricates 09:00/18:00 timestamps despite real `submittedAt` values existing — same-day activity is misordered.
- `Reports.tsx:363-368` — week navigation pages into empty future weeks with no cap and no "back to this week" reset.

---

## Security assessment

This is a client-only demo architecture; treat every "control" in it as decorative:

1. **All PINs ship to every visitor in plaintext.** The full user list including PINs is bundled in the JS and persisted in `localStorage` (`rocket-launch-erp-v1`). Anyone can open DevTools and read the CEO PIN — or simply set `currentUser` in storage.
2. **No server, so no real authorization.** Role checks (where they exist at all) are client-side; all data of all users lives in each browser's localStorage, so "permissions" only restyle data the user already fully possesses.
3. **Data is per-browser, not synced.** A manager's browser can never see a rep's submissions made on the rep's phone — the multi-user product concept (leaderboards, approvals, team dashboards) fundamentally cannot work without a backend. This is the biggest architectural gap: as built, every user sees only their own island of data plus the hardcoded demo users.
4. The 4-digit PIN space (10,000 combinations) with no rate limiting would be trivially brute-forceable even with a backend.

**If this is intended for real use at Robotek, it needs a backend (auth + database) before any of the per-page fixes matter.**

---

## Evidence

- `tsc` output: 110 errors / 11 files (full list reproducible with `npm run build`).
- Headless-Chromium run: blank page + 500 on `index.css` (F1); after patching F1, `SyntaxError … does not provide an export named 'useERPStore'` on the login route (F2).
- Week-bounds check under `TZ=Asia/Kolkata`: `2026-W31` → `2026-07-26` (Sunday) to `2026-07-31` (Friday).
- `os.ansbharat.com`: CNAME → `cname.vercel-dns.com`; page unreachable from two independent fetch paths while the apex domain serves fine.

---

## Recommended fix order

1. **F1** – remove/replace `@apply border-border` (or add a `border` color token) — unblocks rendering.
2. **F2** – make the store export consistent (add `export { useERPStore }` or fix the 7 imports) — unblocks every page.
3. **F4** – replace the localStorage `'user'` guard with the store's `currentUser` (and clear state on logout).
4. **F5 + week-bounds + UTC/IST** – single source of truth for dates (a `localDateString()` helper) and one canonical KPI field name; delete the `as any` casts so tsc enforces it.
5. **F3** – burn down the 110 type errors; they are the same field-mismatch bugs surfacing at compile time — fixing 4 will fix most of 5.
6. Fix the data-model drift in one sweep: add `isActive`/`managerId`/`joinDate` to users (F6), make ScoreCard use the store's week helpers (F7), and align every status/field name with the type unions.
7. Wire the phantom workflows to the store (approvals, warnings, attendance, carry-forward), add role guards on routes, then re-test the full Monday→Saturday loop.
8. Decide the real architecture question: localStorage demo vs. actual multi-user tool (needs a backend).
