// Web database — localStorage implementation
// Metro resolves this file automatically on web (database.web.js > database.js)

import { nsKey } from './activeUser';

// ─── Storage helpers ─────────────────────────────────────────────────────────
// Every base key below is namespaced per active user via nsKey() so users (and
// the demo) never share a dataset. See src/services/activeUser.js.

const KEYS = {
  exercises:        'gymmate_exercises',
  programs:         'gymmate_programs',
  programDays:      'gymmate_programDays',
  programExercises: 'gymmate_programExercises',
  sessions:         'gymmate_sessions',
  sessionSets:      'gymmate_sessionSets',
  counters:         'gymmate_counters',
};

function loadTable(key) {
  try {
    const raw = localStorage.getItem(nsKey(key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTable(key, data) {
  try {
    localStorage.setItem(nsKey(key), JSON.stringify(data));
  } catch (e) {
    console.error('GymMate storage error:', e);
  }
}

function getTable(key)      { return loadTable(KEYS[key]); }
function setTable(key, arr) { saveTable(KEYS[key], arr); }

// ─── Backup / restore ────────────────────────────────────────────────────────
// Serialize the whole local dataset for cloud backup, and restore it wholesale.
// Used by cloudSync.js. Schema version lets us migrate restored payloads later.

const BACKUP_VERSION = 1;

export async function exportAllData() {
  const data = {};
  for (const key of Object.keys(KEYS)) {
    data[key] = (() => { try { return JSON.parse(localStorage.getItem(nsKey(KEYS[key]))) ?? null; } catch { return null; } })();
  }
  // Biometrics live outside KEYS (read directly by Home/Biometrics screens) but
  // belong in the per-user backup too.
  data.biometrics = (() => { try { return JSON.parse(localStorage.getItem(nsKey('gymmate_biometrics'))) ?? null; } catch { return null; } })();
  return { version: BACKUP_VERSION, data };
}

export async function importAllData(payload) {
  if (!payload || !payload.data) return;
  for (const key of Object.keys(KEYS)) {
    if (payload.data[key] != null) {
      localStorage.setItem(nsKey(KEYS[key]), JSON.stringify(payload.data[key]));
    }
  }
  if (payload.data.biometrics != null) {
    localStorage.setItem(nsKey('gymmate_biometrics'), JSON.stringify(payload.data.biometrics));
  }
}

function nextId(tableName) {
  const counters = (() => { try { return JSON.parse(localStorage.getItem(nsKey(KEYS.counters))) || {}; } catch { return {}; } })();
  counters[tableName] = (counters[tableName] || 0) + 1;
  localStorage.setItem(nsKey(KEYS.counters), JSON.stringify(counters));
  return counters[tableName];
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function dateStr(iso) {
  return iso ? iso.slice(0, 10) : '';
}

// ─── Database init ────────────────────────────────────────────────────────────

export async function initDatabase(builtinExercises) {
  const existing = getTable('exercises');
  const builtInCount = existing.filter((e) => !e.is_custom).length;
  console.log('[DB] initDatabase: existing built-in exercises:', builtInCount, '/ expected:', builtinExercises?.length || 0);

  // Seed if no exercises, OR if count doesn't match (missing exercises from updates)
  if (builtinExercises && (builtInCount === 0 || builtInCount !== builtinExercises.length)) {
    console.log('[DB] Seeding', builtinExercises.length, 'built-in exercises (preserving custom)');

    // Keep custom exercises
    const customExercises = existing.filter((e) => e.is_custom);

    const seeded = builtinExercises.map((ex, i) => ({
      id: nextId('exercises'),
      name: ex.name,
      muscle_group: ex.muscleGroup,
      category: ex.category,
      instructions: ex.instructions || null,
      is_custom: 0,
      created_at: now(),
    }));

    // Combine built-in + custom
    setTable('exercises', [...seeded, ...customExercises]);
    console.log('[DB] Seeded', seeded.length, 'built-in +', customExercises.length, 'custom exercises');
  }
}

// ─── Exercises ────────────────────────────────────────────────────────────────

export async function getExercises({ muscleGroup, category, search } = {}) {
  let rows = getTable('exercises');
  console.log('[DB] getExercises: total exercises:', rows.length, 'filter:', muscleGroup || 'none');
  if (muscleGroup) {
    rows = rows.filter((e) => e.muscle_group === muscleGroup);
    console.log('[DB] After muscle group filter:', rows.length, 'exercises');
  }
  if (category)    rows = rows.filter((e) => e.category === category);
  if (search)      rows = rows.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExerciseById(id) {
  return getTable('exercises').find((e) => e.id === id) || null;
}

export async function createCustomExercise({ name, muscleGroup, category, instructions }) {
  const rows = getTable('exercises');
  const id = nextId('exercises');
  rows.push({ id, name, muscle_group: muscleGroup, category, instructions: instructions || null, is_custom: 1, created_at: now() });
  setTable('exercises', rows);
  return id;
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export async function getPrograms() {
  return getTable('programs').sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProgramById(id) {
  const program = getTable('programs').find((p) => p.id === id);
  if (!program) return null;

  const days = getTable('programDays')
    .filter((d) => d.program_id === id)
    .sort((a, b) => a.sort_order - b.sort_order || a.day_number - b.day_number);

  const programExercises = getTable('programExercises');
  const exercises = getTable('exercises');

  for (const day of days) {
    day.exercises = programExercises
      .filter((pe) => pe.program_day_id === day.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((pe) => {
        const ex = exercises.find((e) => e.id === pe.exercise_id) || {};
        return {
          ...pe,
          exercise_name: ex.name || '',
          muscle_group:  ex.muscle_group || '',
          category:      ex.category || '',
        };
      });
  }

  program.days = days;
  return program;
}

export async function createProgram({ name, description, daysPerWeek, isActive, createdByUserId, isTemplate, linkedTemplateId }) {
  const rows = getTable('programs');
  const id = nextId('programs');
  rows.push({
    id,
    name,
    description: description || null,
    days_per_week: daysPerWeek || 3,
    is_active: isActive ? 1 : 0,
    created_at: now(),
    created_by_user_id: createdByUserId || null,
    is_template: isTemplate ? 1 : 0,
    linked_template_id: linkedTemplateId || null,
  });
  setTable('programs', rows);
  return id;
}

export async function updateProgram(id, { name, description, daysPerWeek, isActive, isTemplate }) {
  const rows = getTable('programs');
  if (isTemplate !== undefined) {
    const program = rows.find((p) => p.id === id);
    if (program) program.is_template = isTemplate ? 1 : 0;
  }
  if (isActive !== undefined) {
    rows.forEach((p) => { p.is_active = 0; });
    const p = rows.find((p) => p.id === id);
    if (p && isActive) p.is_active = 1;
  }
  if (name !== undefined) {
    const p = rows.find((p) => p.id === id);
    if (p) { p.name = name; p.description = description || null; p.days_per_week = daysPerWeek || 3; }
  }
  setTable('programs', rows);
}

export async function deleteProgram(id) {
  setTable('programs', getTable('programs').filter((p) => p.id !== id));
  // cascade: days → program exercises
  const days = getTable('programDays').filter((d) => d.program_id === id);
  const dayIds = days.map((d) => d.id);
  setTable('programDays', getTable('programDays').filter((d) => d.program_id !== id));
  setTable('programExercises', getTable('programExercises').filter((pe) => !dayIds.includes(pe.program_day_id)));
}

export async function getActiveProgram() {
  const program = getTable('programs').find((p) => p.is_active === 1);
  if (!program) return null;
  return getProgramById(program.id);
}

// ─── Program Days ─────────────────────────────────────────────────────────────

export async function addProgramDay(programId, { name, dayNumber, sortOrder }) {
  const rows = getTable('programDays');
  const id = nextId('programDays');
  rows.push({ id, program_id: programId, day_number: dayNumber, name, sort_order: sortOrder || 0 });
  setTable('programDays', rows);
  return id;
}

export async function updateProgramDay(id, { name }) {
  const rows = getTable('programDays');
  const d = rows.find((d) => d.id === id);
  if (d) d.name = name;
  setTable('programDays', rows);
}

export async function deleteProgramDay(id) {
  setTable('programDays', getTable('programDays').filter((d) => d.id !== id));
  setTable('programExercises', getTable('programExercises').filter((pe) => pe.program_day_id !== id));
}

// ─── Program Exercises ────────────────────────────────────────────────────────

export async function addExerciseToDay(programDayId, { exerciseId, sets, reps, restSeconds, notes, sortOrder }) {
  const rows = getTable('programExercises');
  const id = nextId('programExercises');
  rows.push({ id, program_day_id: programDayId, exercise_id: exerciseId, sets: sets || 3, reps: reps || '8-12', rest_seconds: restSeconds || 90, notes: notes || null, sort_order: sortOrder || 0 });
  setTable('programExercises', rows);
  return id;
}

export async function updateProgramExercise(id, { sets, reps, restSeconds, notes }) {
  const rows = getTable('programExercises');
  const pe = rows.find((pe) => pe.id === id);
  if (pe) { pe.sets = sets; pe.reps = reps; pe.rest_seconds = restSeconds; pe.notes = notes || null; }
  setTable('programExercises', rows);
}

export async function removeExerciseFromDay(id) {
  setTable('programExercises', getTable('programExercises').filter((pe) => pe.id !== id));
}

// Persist a new exercise order within a day. `orderedIds` is the full list of
// program_exercise ids for that day, in the desired order.
export async function reorderDayExercises(programDayId, orderedIds) {
  const rows = getTable('programExercises');
  orderedIds.forEach((peId, i) => {
    const pe = rows.find((r) => r.id === peId && r.program_day_id === programDayId);
    if (pe) pe.sort_order = i;
  });
  setTable('programExercises', rows);
}

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export async function startSession({ programId, programDayId, dayName }) {
  const rows = getTable('sessions');
  const id = nextId('sessions');
  rows.push({ id, program_id: programId || null, program_day_id: programDayId || null, day_name: dayName || 'Workout', started_at: now(), completed_at: null, duration_seconds: null, notes: null });
  setTable('sessions', rows);
  return id;
}

export async function completeSession(id, { durationSeconds, notes }) {
  const rows = getTable('sessions');
  const s = rows.find((s) => s.id === id);
  if (s) { s.completed_at = now(); s.duration_seconds = durationSeconds || null; s.notes = notes || null; }
  setTable('sessions', rows);
}

export async function getRecentSessions(limit = 20) {
  const sessions = getTable('sessions')
    .filter((s) => s.completed_at)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, limit);

  const allSets = getTable('sessionSets');
  return sessions.map((s) => ({
    ...s,
    total_sets: allSets.filter((ss) => ss.session_id === s.id && ss.completed).length,
  }));
}

export async function getSessionById(id) {
  const session = getTable('sessions').find((s) => s.id === id);
  if (!session) return null;
  session.sets = getTable('sessionSets')
    .filter((ss) => ss.session_id === id)
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number);
  return session;
}

export async function deleteSession(id) {
  setTable('sessions', getTable('sessions').filter((s) => s.id !== id));
  setTable('sessionSets', getTable('sessionSets').filter((ss) => ss.session_id !== id));
}

// ─── Session Sets ─────────────────────────────────────────────────────────────

export async function logSet({ sessionId, exerciseId, exerciseName, setNumber, weightKg, reps, rpe }) {
  // Check for PR
  const allSets = getTable('sessionSets');
  const allSessions = getTable('sessions');
  const prevBest = allSets
    .filter((ss) => ss.exercise_id === exerciseId && ss.completed && ss.session_id !== sessionId)
    .reduce((max, ss) => (ss.weight_kg && ss.weight_kg > max ? ss.weight_kg : max), 0);
  const isPR = weightKg > 0 && weightKg > prevBest;

  const id = nextId('sessionSets');
  allSets.push({ id, session_id: sessionId, exercise_id: exerciseId, exercise_name: exerciseName, set_number: setNumber, weight_kg: weightKg || null, reps: reps || null, rpe: rpe || null, completed: true, is_pr: isPR ? 1 : 0, logged_at: now() });
  setTable('sessionSets', allSets);
  return { id, isPR };
}

export async function updateSet(id, { weightKg, reps, rpe, completed }) {
  const rows = getTable('sessionSets');
  const s = rows.find((s) => s.id === id);
  if (s) { s.weight_kg = weightKg || null; s.reps = reps || null; s.rpe = rpe || null; s.completed = !!completed; }
  setTable('sessionSets', rows);
}

export async function deleteSet(id) {
  setTable('sessionSets', getTable('sessionSets').filter((s) => s.id !== id));
}

export async function getSetsForSession(sessionId) {
  return getTable('sessionSets')
    .filter((ss) => ss.session_id === sessionId)
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number);
}

// ─── Progress / Analytics ─────────────────────────────────────────────────────

export async function getExerciseHistory(exerciseId, limit = 30) {
  const sets = getTable('sessionSets').filter((ss) => ss.exercise_id === exerciseId && ss.completed);
  const sessions = getTable('sessions').filter((s) => s.completed_at);
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  // Group by date
  const byDate = {};
  for (const ss of sets) {
    const session = sessionMap[ss.session_id];
    if (!session) continue;
    const date = dateStr(session.started_at);
    if (!byDate[date]) byDate[date] = { date: session.started_at, sets: [] };
    byDate[date].sets.push(ss);
  }

  return Object.values(byDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((group) => ({
      date: group.date,
      max_weight:   Math.max(...group.sets.map((s) => s.weight_kg || 0)) || null,
      total_volume: group.sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight_kg || 0), 0),
      total_sets:   group.sets.length,
    }));
}

export async function getPersonalRecords() {
  const sets = getTable('sessionSets').filter((ss) => ss.completed && ss.weight_kg);
  const exercises = getTable('exercises');
  const sessions = getTable('sessions');
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  // Best weight per exercise
  const best = {};
  for (const ss of sets) {
    if (!best[ss.exercise_id] || ss.weight_kg > best[ss.exercise_id].weight_kg) {
      best[ss.exercise_id] = ss;
    }
  }

  return exercises
    .filter((e) => best[e.id])
    .map((e) => ({
      id:          e.id,
      name:        e.name,
      muscle_group: e.muscle_group,
      best_weight: best[e.id].weight_kg,
      reps_at_best: best[e.id].reps,
      achieved_at: sessionMap[best[e.id].session_id]?.started_at || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getWeeklyVolume(weeksBack = 12) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);

  const sessions = getTable('sessions').filter((s) => s.completed_at && new Date(s.started_at) >= cutoff);
  const sets = getTable('sessionSets').filter((ss) => ss.completed);
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  const byWeek = {};
  for (const ss of sets) {
    const session = sessionMap[ss.session_id];
    if (!session) continue;
    const d = new Date(session.started_at);
    const weekNum = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
    if (!byWeek[weekNum]) byWeek[weekNum] = { week: weekNum, sessions: new Set(), total_sets: 0, total_volume: 0 };
    byWeek[weekNum].sessions.add(ss.session_id);
    byWeek[weekNum].total_sets += 1;
    byWeek[weekNum].total_volume += (ss.reps || 0) * (ss.weight_kg || 0);
  }

  return Object.values(byWeek)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({ ...w, sessions: w.sessions.size }));
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export async function getMuscleGroupVolume(daysBack = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const sessions = getTable('sessions').filter((s) => s.completed_at && new Date(s.started_at) >= cutoff);
  const sessionIds = new Set(sessions.map((s) => s.id));
  const sets = getTable('sessionSets').filter((ss) => ss.completed && sessionIds.has(ss.session_id));
  const exercises = getTable('exercises');
  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

  const byGroup = {};
  for (const ss of sets) {
    const ex = exMap[ss.exercise_id];
    if (!ex) continue;
    const g = ex.muscle_group;
    if (!byGroup[g]) byGroup[g] = { muscle_group: g, total_sets: 0, total_volume: 0 };
    byGroup[g].total_sets += 1;
    byGroup[g].total_volume += (ss.reps || 0) * (ss.weight_kg || 0);
  }

  return Object.values(byGroup).sort((a, b) => b.total_sets - a.total_sets);
}

// Per-day activity for the last `daysBack` days. Returns one entry per day
// that has a completed session — { date: 'YYYY-MM-DD', sessions, total_sets, total_volume }.
// The dashboard fills in the zero days client-side.
export async function getDailyActivity(daysBack = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const sessions = getTable('sessions').filter((s) => s.completed_at && new Date(s.started_at) >= cutoff);
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const sets = getTable('sessionSets').filter((ss) => ss.completed && sessionMap[ss.session_id]);

  const byDate = {};
  for (const s of sessions) {
    const date = dateStr(s.started_at);
    if (!byDate[date]) byDate[date] = { date, sessions: 0, total_sets: 0, total_volume: 0 };
    byDate[date].sessions += 1;
  }
  for (const ss of sets) {
    const date = dateStr(sessionMap[ss.session_id].started_at);
    if (!byDate[date]) byDate[date] = { date, sessions: 0, total_sets: 0, total_volume: 0 };
    byDate[date].total_sets += 1;
    byDate[date].total_volume += (ss.reps || 0) * (ss.weight_kg || 0);
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLastSetForExercise(exerciseId) {
  const sets = getTable('sessionSets').filter((ss) => ss.exercise_id === exerciseId && ss.completed);
  const sessions = getTable('sessions');
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  const sorted = sets
    .filter((ss) => sessionMap[ss.session_id])
    .sort((a, b) => {
      const da = sessionMap[a.session_id]?.started_at || '';
      const db = sessionMap[b.session_id]?.started_at || '';
      return db.localeCompare(da) || b.set_number - a.set_number;
    });

  return sorted[0] ? { weight_kg: sorted[0].weight_kg, reps: sorted[0].reps } : null;
}

export async function getExerciseStats(exerciseId) {
  const sets = getTable('sessionSets').filter((ss) => ss.exercise_id === exerciseId && ss.completed);
  const sessions = getTable('sessions').filter((s) => s.completed_at);
  const sessionIds = new Set(sessions.map((s) => s.id));

  const completedSets = sets.filter((ss) => sessionIds.has(ss.session_id));

  if (completedSets.length === 0) {
    return { max_weight: 0, best_volume: 0, total_sessions: 0 };
  }

  const maxWeight = Math.max(...completedSets.map((ss) => ss.weight_kg || 0));
  const bestVolume = Math.max(...completedSets.map((ss) => (ss.reps || 0) * (ss.weight_kg || 0)));
  const totalSessions = new Set(completedSets.map((ss) => ss.session_id)).size;

  return {
    max_weight: maxWeight,
    best_volume: bestVolume,
    total_sessions: totalSessions,
  };
}

// Clear the is_pr flag on all sets for a given exercise (resets PR history without
// deleting workout data). Used when a user wants to reset their PRs for an exercise.
export async function resetPRsForExercise(exerciseId) {
  const sets = getTable('sessionSets');
  sets.forEach((s) => { if (s.exercise_id === exerciseId) s.is_pr = 0; });
  setTable('sessionSets', sets);
}
