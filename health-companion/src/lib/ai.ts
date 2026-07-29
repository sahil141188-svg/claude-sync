/**
 * AI helpers — prescription extraction (vision OCR) and nightly health analysis.
 * Uses Gemini when GEMINI_API_KEY is set, otherwise falls back to OpenAI.
 * Both return strict JSON parsed with a defensive extractor.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const OPENAI_MODEL = 'gpt-4o-mini';

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('AI response contained no JSON');
  return JSON.parse(match[0]) as T;
}

async function callGemini(parts: unknown[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callOpenAI(content: unknown): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export interface ExtractedPrescription {
  doctor_name: string | null;
  prescribed_on: string | null;
  medicines: {
    name: string;
    morning: boolean;
    afternoon: boolean;
    night: boolean;
    dose: string | null;
    duration_days: number | null;
  }[];
}

const EXTRACT_PROMPT = `You are a medical prescription reader. Read this prescription image and return ONLY JSON:
{
  "doctor_name": string | null,
  "prescribed_on": "YYYY-MM-DD" | null,
  "medicines": [
    { "name": string, "morning": boolean, "afternoon": boolean, "night": boolean,
      "dose": string | null, "duration_days": number | null }
  ]
}
Interpret "1-0-1" style frequency as morning-afternoon-night flags. If handwriting is unclear, make your best guess for the name and keep flags conservative. Return an empty medicines array if nothing is readable.`;

export async function extractPrescriptionFromImage(
  base64Image: string,
  mimeType: string
): Promise<ExtractedPrescription> {
  let text: string;
  if (process.env.GEMINI_API_KEY) {
    text = await callGemini([
      { text: EXTRACT_PROMPT },
      { inline_data: { mime_type: mimeType, data: base64Image } },
    ]);
  } else if (process.env.OPENAI_API_KEY) {
    text = await callOpenAI([
      { type: 'text', text: EXTRACT_PROMPT },
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
    ]);
  } else {
    throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  }
  return extractJson<ExtractedPrescription>(text);
}

export interface HealthAnalysis {
  status: 'improving' | 'needs_attention' | 'critical';
  summary: string;
  sugar_trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  bp_trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  recommendations: string[];
}

export async function analyzeHealth(dataSummary: string): Promise<HealthAnalysis> {
  const prompt = `You are a caring health assistant for an elderly Indian patient with diabetes and blood pressure issues.
Analyse the last 7 days of data below and return ONLY JSON:
{
  "status": "improving" | "needs_attention" | "critical",
  "summary": string (2-3 warm sentences in simple Hindi written in Devanagari),
  "sugar_trend": "increasing" | "decreasing" | "stable" | "unknown",
  "bp_trend": "increasing" | "decreasing" | "stable" | "unknown",
  "recommendations": string[] (3-5 short actionable tips in simple Hindi, e.g. "रोज़ 30 मिनट टहलें")
}
Mark "critical" if BP stays above 150 systolic or sugar consistently above 250 — and include "डॉक्टर से मिलें" in recommendations.

DATA:
${dataSummary}`;

  let text: string;
  if (process.env.GEMINI_API_KEY) {
    text = await callGemini([{ text: prompt }]);
  } else if (process.env.OPENAI_API_KEY) {
    text = await callOpenAI(prompt);
  } else {
    throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
  }
  return extractJson<HealthAnalysis>(text);
}
