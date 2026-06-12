// Demo data for "Try as Super Woman" preview mode
// Seeds localStorage directly — no auth user created in gymmate_users

import AsyncStorage from '@react-native-async-storage/async-storage';
import { nsKey } from '../services/activeUser';

const BIOMETRICS_KEY = 'gymmate_biometrics';

const KEYS = {
  exercises:        'gymmate_exercises',
  programs:         'gymmate_programs',
  programDays:      'gymmate_programDays',
  programExercises: 'gymmate_programExercises',
  sessions:         'gymmate_sessions',
  sessionSets:      'gymmate_sessionSets',
  counters:         'gymmate_counters',
};

// All writes go through nsKey so the demo dataset lands in the demo user's
// namespace — never the shared/global keys (which would leak into real accounts).
function getTable(key) {
  try { return JSON.parse(localStorage.getItem(nsKey(KEYS[key]))) || []; } catch { return []; }
}
function setTable(key, arr) {
  localStorage.setItem(nsKey(KEYS[key]), JSON.stringify(arr));
}
function getCounters() {
  try { return JSON.parse(localStorage.getItem(nsKey(KEYS.counters))) || {}; } catch { return {}; }
}
function nextId(name) {
  const c = getCounters();
  c[name] = (c[name] || 0) + 1;
  localStorage.setItem(nsKey(KEYS.counters), JSON.stringify(c));
  return c[name];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export const DEMO_USER = {
  id: 'demo_superwoman',
  name: 'Super Woman',
  email: null,
  google_id: null,
  created_at: daysAgo(60),
  isDemo: true,
};

export async function seedDemoData() {
  // Biometrics
  await AsyncStorage.setItem(nsKey(BIOMETRICS_KEY), JSON.stringify({
    name: 'Super Woman',
    age: '28',
    sex: 'female',
    heightCm: '170',
    weightKg: '65',
    bodyFatPct: '22',
    activityLevel: 'moderate',
    primaryGoal: 'build_muscle',
    isPregnant: false,
    trimester: '',
    cycleLastPeriodDate: daysAgo(14).slice(0, 10),
    cycleLength: 28,
  }));

  // Find exercise IDs we need from seeded exercises
  const exercises = getTable('exercises');
  const find = (name) => exercises.find((e) => e.name === name)?.id;

  const squat     = find('Barbell Back Squat');
  const legPress  = find('Leg Press');
  const legCurl   = find('Lying Leg Curl');
  const legExt    = find('Leg Extension');
  const hipThrust = find('Hip Thrust');
  const calf      = find('Standing Calf Raise');
  const pulldown  = find('Lat Pulldown');
  const row       = find('Seated Cable Row');
  const pullup    = find('Pull-Up');
  const dumRow    = find('Single-Arm Dumbbell Row');
  const facePull  = find('Face Pull');
  const lateralR  = find('Dumbbell Lateral Raise');
  const cableLat  = find('Cable Lateral Raise');
  const revPec    = find('Reverse Pec Deck');
  const curl      = find('Dumbbell Curl');
  const hammerC   = find('Hammer Curl');
  const tricepPD  = find('Cable Tricep Pushdown');
  const dip       = find('Tricep Dip');

  // ── Program ───────────────────────────────────────────────────────────────
  const programs = getTable('programs');
  const progId = nextId('programs');
  programs.push({
    id: progId,
    name: 'Upper/Lower Hypertrophy',
    description: '4-day split — Upper A/B + Lower A/B, shoulder-safe, dumbbell & machine focus',
    days_per_week: 4,
    is_active: 1,
    created_at: daysAgo(45),
  });
  setTable('programs', programs);

  // Days
  const days = [];
  for (const [i, name] of [
    [1, 'Upper A — Back & Biceps'],
    [2, 'Lower A — Quad Focus'],
    [3, 'Upper B — Shoulders & Triceps'],
    [4, 'Lower B — Posterior Chain'],
  ].entries()) {
    const id = nextId('programDays');
    getTable('programDays'); // refresh
    const rows = getTable('programDays');
    rows.push({ id, program_id: progId, day_number: i + 1, name: name[1], sort_order: i });
    setTable('programDays', rows);
    days.push(id);
  }

  // Exercises per day
  const dayExercises = [
    // Upper A
    pulldown && [pulldown, 4, '8-12', 90],
    row      && [row,      4, '10-12', 90],
    pullup   && [pullup,   3, '6-10',  120],
    dumRow   && [dumRow,   3, '10-12', 60],
    curl     && [curl,     3, '12-15', 60],
    hammerC  && [hammerC,  3, '12-15', 60],
  ].filter(Boolean);

  const day2Exercises = [
    squat    && [squat,    4, '6-10',  180],
    legPress && [legPress, 3, '10-15', 120],
    legExt   && [legExt,   3, '12-15', 60],
    legCurl  && [legCurl,  3, '10-12', 60],
    calf     && [calf,     4, '15-20', 45],
  ].filter(Boolean);

  const day3Exercises = [
    lateralR && [lateralR, 4, '12-15', 60],
    cableLat && [cableLat, 3, '15-20', 45],
    facePull && [facePull, 4, '15-20', 60],
    revPec   && [revPec,   3, '12-15', 60],
    tricepPD && [tricepPD, 3, '12-15', 60],
    dip      && [dip,      3, '8-12',  90],
  ].filter(Boolean);

  const day4Exercises = [
    hipThrust && [hipThrust, 4, '8-12',  90],
    legCurl   && [legCurl,   4, '10-12', 60],
    squat     && [squat,     3, '8-10',  120],
    legPress  && [legPress,  3, '12-15', 90],
    calf      && [calf,      3, '20-25', 45],
  ].filter(Boolean);

  for (const [dayIdx, exList] of [dayExercises, day2Exercises, day3Exercises, day4Exercises].entries()) {
    for (const [sortIdx, [exId, sets, reps, rest]] of exList.entries()) {
      const rows = getTable('programExercises');
      rows.push({
        id: nextId('programExercises'),
        program_day_id: days[dayIdx],
        exercise_id: exId,
        sets,
        reps,
        rest_seconds: rest,
        notes: null,
        sort_order: sortIdx,
      });
      setTable('programExercises', rows);
    }
  }

  // ── Sessions (past 6 weeks) ────────────────────────────────────────────────
  // 3 completed sessions with realistic sets
  const sessionDefs = [
    { daysBack: 2,  dayIdx: 0, dayName: 'Upper A — Back & Biceps',    exList: [[pulldown, 60, 4, 10], [row, 55, 4, 10], [curl, 14, 3, 12], [hammerC, 12, 3, 12]], dur: 2820 },
    { daysBack: 5,  dayIdx: 1, dayName: 'Lower A — Quad Focus',       exList: [[squat, 70, 4, 8], [legPress, 100, 3, 12], [legExt, 45, 3, 15], [legCurl, 40, 3, 12]], dur: 3300 },
    { daysBack: 9,  dayIdx: 2, dayName: 'Upper B — Shoulders & Triceps', exList: [[lateralR, 10, 4, 15], [facePull, 25, 4, 15], [tricepPD, 30, 3, 12], [dip, 0, 3, 8]], dur: 2640 },
    { daysBack: 12, dayIdx: 3, dayName: 'Lower B — Posterior Chain',  exList: [[hipThrust, 80, 4, 10], [legCurl, 40, 4, 12], [squat, 65, 3, 10]], dur: 2700 },
    { daysBack: 16, dayIdx: 0, dayName: 'Upper A — Back & Biceps',    exList: [[pulldown, 57.5, 4, 10], [row, 52.5, 4, 10], [curl, 12, 3, 12]], dur: 2580 },
    { daysBack: 19, dayIdx: 1, dayName: 'Lower A — Quad Focus',       exList: [[squat, 67.5, 4, 8], [legPress, 95, 3, 12], [legExt, 42.5, 3, 15]], dur: 3000 },
  ];

  for (const sess of sessionDefs) {
    const sessionId = nextId('sessions');
    const startedAt = daysAgo(sess.daysBack);
    const sessions = getTable('sessions');
    sessions.push({
      id: sessionId,
      program_id: progId,
      program_day_id: days[sess.dayIdx],
      day_name: sess.dayName,
      started_at: startedAt,
      completed_at: startedAt,
      duration_seconds: sess.dur,
      notes: null,
    });
    setTable('sessions', sessions);

    for (const [exId, weight, sets, reps] of sess.exList) {
      if (!exId) continue;
      for (let s = 1; s <= sets; s++) {
        const allSets = getTable('sessionSets');
        const prevBest = allSets
          .filter((ss) => ss.exercise_id === exId && ss.completed)
          .reduce((max, ss) => (ss.weight_kg && ss.weight_kg > max ? ss.weight_kg : max), 0);
        const isPR = weight > 0 && weight > prevBest;
        allSets.push({
          id: nextId('sessionSets'),
          session_id: sessionId,
          exercise_id: exId,
          exercise_name: exercises.find((e) => e.id === exId)?.name || '',
          set_number: s,
          weight_kg: weight || null,
          reps,
          rpe: null,
          completed: true,
          is_pr: isPR ? 1 : 0,
          logged_at: startedAt,
        });
        setTable('sessionSets', allSets);
      }
    }
  }
}

export async function clearDemoData() {
  // Remove the demo user's namespaced data (biometrics + all workout tables,
  // including exercises — the namespace is the demo's alone, nothing is shared).
  await AsyncStorage.removeItem(nsKey(BIOMETRICS_KEY));
  Object.keys(KEYS).forEach(k => {
    localStorage.removeItem(nsKey(KEYS[k]));
  });
}
