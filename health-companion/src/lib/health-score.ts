import type { BpReading, ExerciseLog, MedicineLog, SugarReading, WaterLog } from './types';

export interface HealthScoreInput {
  medicineLogs: Pick<MedicineLog, 'taken'>[];
  sugar: Pick<SugarReading, 'value' | 'reading_type'>[];
  bp: Pick<BpReading, 'systolic' | 'diastolic'>[];
  water: Pick<WaterLog, 'glasses' | 'goal_glasses'> | null;
  exercise: Pick<ExerciseLog, 'duration_min'>[];
}

export interface HealthScoreResult {
  score: number; // 0–100
  parts: { label: string; score: number; max: number }[];
}

/**
 * Composite daily health score:
 *  - Medicine compliance  (35)
 *  - Sugar in range       (25)  fasting 70–130, pp/random < 180
 *  - BP in range          (20)  systolic < 140 and diastolic < 90
 *  - Water goal           (10)
 *  - Exercise ≥ 30 min    (10)
 */
export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const parts: HealthScoreResult['parts'] = [];

  const total = input.medicineLogs.length;
  const taken = input.medicineLogs.filter((l) => l.taken).length;
  const medScore = total === 0 ? 35 : Math.round((taken / total) * 35);
  parts.push({ label: 'Medicines', score: medScore, max: 35 });

  let sugarScore = 25;
  if (input.sugar.length > 0) {
    const inRange = input.sugar.filter((s) =>
      s.reading_type === 'fasting' ? s.value >= 70 && s.value <= 130 : s.value < 180
    ).length;
    sugarScore = Math.round((inRange / input.sugar.length) * 25);
  }
  parts.push({ label: 'Sugar', score: sugarScore, max: 25 });

  let bpScore = 20;
  if (input.bp.length > 0) {
    const inRange = input.bp.filter((b) => b.systolic < 140 && b.diastolic < 90).length;
    bpScore = Math.round((inRange / input.bp.length) * 20);
  }
  parts.push({ label: 'BP', score: bpScore, max: 20 });

  const goal = input.water?.goal_glasses ?? 8;
  const glasses = input.water?.glasses ?? 0;
  const waterScore = Math.min(10, Math.round((glasses / goal) * 10));
  parts.push({ label: 'Water', score: waterScore, max: 10 });

  const minutes = input.exercise.reduce((sum, e) => sum + e.duration_min, 0);
  const exScore = Math.min(10, Math.round((minutes / 30) * 10));
  parts.push({ label: 'Exercise', score: exScore, max: 10 });

  const score = parts.reduce((s, p) => s + p.score, 0);
  return { score, parts };
}

export function scoreStatus(score: number): 'improving' | 'needs_attention' | 'critical' {
  if (score >= 75) return 'improving';
  if (score >= 50) return 'needs_attention';
  return 'critical';
}
