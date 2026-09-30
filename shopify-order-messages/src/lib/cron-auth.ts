/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". External schedulers must do the same. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
