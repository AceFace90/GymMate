import { getGeminiKey } from '../screens/SettingsScreen';

// gemini-1.5-flash was retired by Google; 2.5-flash is the current GA multimodal model.
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(parts) {
  const key = await getGeminiKey();
  if (!key) throw new Error('NO_KEY');

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function extractJSON(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1].trim());
}

// ─── Feature 1: Generate a gym program ───────────────────────────────────────

export async function generateProgram({ goal, daysPerWeek, equipment, notes, exerciseNames }) {
  const prompt = `You are an expert personal trainer. Generate a ${daysPerWeek}-day per week gym program.

Goal: ${goal}
Equipment available: ${equipment}
${notes ? `Additional notes: ${notes}` : ''}

Use ONLY exercises from this list: ${exerciseNames.join(', ')}

Return ONLY a JSON object in this exact format, no other text:
{
  "name": "program name",
  "description": "brief description",
  "days": [
    {
      "name": "Day 1 — Push",
      "exercises": [
        { "name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "restSeconds": 120 }
      ]
    }
  ]
}`;

  const text = await callGemini([{ text: prompt }]);
  return extractJSON(text);
}

// ─── Feature 2: Identify exercise from photo ─────────────────────────────────

export async function identifyExercise(imageBase64, mimeType = 'image/jpeg') {
  const prompt = `You are a gym equipment and exercise expert. Look at this image and identify what exercise or gym machine is shown.

Return ONLY a JSON object in this exact format, no other text:
{
  "exercise": "Lat Pulldown",
  "muscleGroup": "back",
  "category": "machine",
  "confidence": 0.9,
  "alternatives": ["Seated Cable Row", "Cable Pullover"]
}

muscleGroup must be one of: chest, back, legs, shoulders, arms, core, cardio, full_body
category must be one of: barbell, dumbbell, machine, cable, bodyweight, cardio
confidence is 0-1. If you cannot identify gym equipment, set confidence to 0 and exercise to "Unknown".`;

  const text = await callGemini([
    { inlineData: { data: imageBase64, mimeType } },
    { text: prompt },
  ]);
  return extractJSON(text);
}
