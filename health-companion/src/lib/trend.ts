export type Trend = 'increasing' | 'decreasing' | 'stable' | 'unknown';

/** Simple linear-regression slope over a series → human trend. */
export function detectTrend(values: number[], tolerance = 0.5): Trend {
  if (values.length < 3) return 'unknown';
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  if (slope > tolerance) return 'increasing';
  if (slope < -tolerance) return 'decreasing';
  return 'stable';
}

export function trendLabelHi(trend: Trend): string {
  return {
    increasing: 'बढ़ रहा है ↑',
    decreasing: 'घट रहा है ↓',
    stable: 'स्थिर है →',
    unknown: 'और readings चाहिए',
  }[trend];
}

export function sugarSuggestion(trend: Trend, latest?: number): string {
  if (latest !== undefined && latest > 250)
    return 'शुगर बहुत ज़्यादा है — आज ही डॉक्टर से सलाह लें।';
  if (trend === 'increasing')
    return 'शुगर बढ़ रही है — मीठा कम करें, खाने के बाद 10 मिनट टहलें।';
  if (trend === 'decreasing') return 'बहुत बढ़िया! शुगर घट रही है, ऐसे ही जारी रखें।';
  if (trend === 'stable') return 'शुगर स्थिर है — दवा और खान-पान ऐसे ही रखें।';
  return 'रोज़ readings लेते रहें ताकि trend दिख सके।';
}

export function bpSuggestion(trend: Trend, latestSys?: number): string {
  if (latestSys !== undefined && latestSys >= 150)
    return 'BP 150 से ऊपर है — आराम करें और डॉक्टर से सलाह लें।';
  if (trend === 'increasing') return 'BP बढ़ रहा है — नमक कम करें और तनाव से बचें।';
  if (trend === 'decreasing') return 'BP घट रहा है — बहुत अच्छा! दवा जारी रखें।';
  if (trend === 'stable') return 'BP नियंत्रण में है — यही रूटीन बनाए रखें।';
  return 'रोज़ एक ही समय पर BP नापें।';
}
