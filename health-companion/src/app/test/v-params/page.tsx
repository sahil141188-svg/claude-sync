export const dynamic = 'force-dynamic';

export default async function TestParams({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = 'weekly' } = await searchParams;
  return <p>v-params ok ({range})</p>;
}
