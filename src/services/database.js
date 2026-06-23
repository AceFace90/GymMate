import * as SQLite from 'expo-sqlite';

let db = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('gymmate.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const MIGRATIONS = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS exercises (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    muscle_group TEXT   NOT NULL,  -- chest|back|legs|shoulders|arms|core|cardio|full_body
    category    TEXT    NOT NULL,  -- barbell|dumbbell|machine|cable|bodyweight|cardio
    instructions TEXT,
    is_custom   INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS programs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    days_per_week INTEGER DEFAULT 3,
    is_active   INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS program_days (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id  INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    day_number  INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    sort_order  INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS program_exercises (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    program_day_id  INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    sets            INTEGER DEFAULT 3,
    reps            TEXT    DEFAULT '8-12',
    rest_seconds    INTEGER DEFAULT 90,
    notes           TEXT,
    sort_order      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id      INTEGER REFERENCES programs(id),
    program_day_id  INTEGER REFERENCES program_days(id),
    day_name        TEXT,
    started_at      TEXT    DEFAULT (datetime('now', 'localtime')),
    completed_at    TEXT,
    duration_seconds INTEGER,
    notes           TEXT
  );

  CREATE TABLE IF NOT EXISTS session_sets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
    exercise_name   TEXT    NOT NULL,
    set_number      INTEGER NOT NULL,
    weight_kg       REAL,
    reps            INTEGER,
    rpe             REAL,
    completed       INTEGER DEFAULT 0,
    is_pr           INTEGER DEFAULT 0,
    logged_at       TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );

  INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `,

  // v2 — PT-client collaboration
  `
  ALTER TABLE programs ADD COLUMN created_by_user_id TEXT;
  ALTER TABLE programs ADD COLUMN is_template INTEGER DEFAULT 0;
  ALTER TABLE programs ADD COLUMN linked_template_id TEXT;

  CREATE TABLE IF NOT EXISTS workout_feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    trainer_user_id TEXT    NOT NULL,
    feedback_text   TEXT    NOT NULL,
    created_at      TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  INSERT OR IGNORE INTO schema_version (version) VALUES (2);
  `,
];

// Auto-backup hooks — implemented in the web build (database.web.js) where
// every setTable() write schedules a debounced cloud backup. Native uses
// SQLite and a different backup path; these are no-ops so the shared App
// wiring (setBackupListener / flushBackup) works on both platforms. Wiring
// native auto-backup is tracked separately (see task: port fixes to native).
export function setBackupListener() {}
export function flushBackup() {}

export async function initDatabase(builtinExercises) {
  const database = await getDb();

  // Run migrations
  let currentVersion = 0;
  try {
    const row = await database.getFirstAsync('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
    currentVersion = row ? row.version : 0;
  } catch (_) {
    // table doesn't exist yet
  }

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await database.execAsync(MIGRATIONS[i]);
  }

  // Seed built-in exercises if not already present
  const count = await database.getFirstAsync('SELECT COUNT(*) as n FROM exercises WHERE is_custom = 0');
  if (count.n === 0 && builtinExercises) {
    const stmt = await database.prepareAsync(
      'INSERT OR IGNORE INTO exercises (name, muscle_group, category, instructions, is_custom) VALUES (?, ?, ?, ?, 0)'
    );
    for (const ex of builtinExercises) {
      await stmt.executeAsync([ex.name, ex.muscleGroup, ex.category, ex.instructions || null]);
    }
    await stmt.finalizeAsync();
  }
}

// ─── Backup / restore ────────────────────────────────────────────────────────
// Mirror of the web DB's export/import for native (expo-sqlite). Used by cloudSync.js.

// v2 — sessions removed from blob; restored from workout_sessions_cloud instead
const BACKUP_VERSION = 2;
const BACKUP_TABLES = [
  'exercises', 'programs', 'program_days', 'program_exercises',
];

export async function exportAllData() {
  const database = await getDb();
  const data = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await database.getAllAsync(`SELECT * FROM ${table}`);
  }
  return { version: BACKUP_VERSION, data };
}

export async function importAllData(payload) {
  if (!payload || !payload.data) return;
  const database = await getDb();
  await database.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    for (const table of BACKUP_TABLES) {
      const rows = payload.data[table];
      if (!Array.isArray(rows)) continue;
      await database.execAsync(`DELETE FROM ${table}`);
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        await database.runAsync(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          cols.map((c) => row[c])
        );
      }
    }
  } finally {
    await database.execAsync('PRAGMA foreign_keys = ON;');
  }
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export async function getExercises({ muscleGroup, category, search } = {}) {
  const database = await getDb();
  let query = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];
  if (muscleGroup) { query += ' AND muscle_group = ?'; params.push(muscleGroup); }
  if (category)    { query += ' AND category = ?';     params.push(category); }
  if (search)      { query += ' AND name LIKE ?';      params.push(`%${search}%`); }
  query += ' ORDER BY name ASC';
  return database.getAllAsync(query, params);
}

export async function getExerciseById(id) {
  const database = await getDb();
  return database.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id]);
}

export async function getExerciseByName(name) {
  const database = await getDb();
  return database.getFirstAsync('SELECT * FROM exercises WHERE name = ? COLLATE NOCASE', [name]);
}

export async function createCustomExercise({ name, muscleGroup, category, instructions }) {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO exercises (name, muscle_group, category, instructions, is_custom) VALUES (?, ?, ?, ?, 1)',
    [name, muscleGroup, category, instructions || null]
  );
  return result.lastInsertRowId;
}

// ─── Programs ────────────────────────────────────────────────────────────────

export async function getPrograms() {
  const database = await getDb();
  return database.getAllAsync(
    'SELECT * FROM programs WHERE is_template = 0 OR is_template IS NULL ORDER BY created_at DESC'
  );
}

export async function getProgramById(id) {
  const database = await getDb();
  const program = await database.getFirstAsync('SELECT * FROM programs WHERE id = ?', [id]);
  if (!program) return null;
  const days = await database.getAllAsync(
    'SELECT * FROM program_days WHERE program_id = ? ORDER BY sort_order, day_number',
    [id]
  );
  for (const day of days) {
    day.exercises = await database.getAllAsync(
      `SELECT pe.*, e.name as exercise_name, e.muscle_group, e.category
       FROM program_exercises pe
       JOIN exercises e ON pe.exercise_id = e.id
       WHERE pe.program_day_id = ?
       ORDER BY pe.sort_order`,
      [day.id]
    );
  }
  program.days = days;
  return program;
}

export async function createProgram({ name, description, daysPerWeek, isActive, createdByUserId, isTemplate, linkedTemplateId }) {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO programs (name, description, days_per_week, is_active, created_by_user_id, is_template, linked_template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      daysPerWeek || 3,
      isActive ? 1 : 0,
      createdByUserId || null,
      isTemplate ? 1 : 0,
      linkedTemplateId || null,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateProgram(id, { name, description, daysPerWeek, isActive }) {
  const database = await getDb();
  if (isActive !== undefined) {
    // Only one active program at a time
    await database.runAsync('UPDATE programs SET is_active = 0');
    if (isActive) {
      await database.runAsync('UPDATE programs SET is_active = 1 WHERE id = ?', [id]);
    }
  }
  if (name !== undefined) {
    await database.runAsync(
      'UPDATE programs SET name = ?, description = ?, days_per_week = ? WHERE id = ?',
      [name, description || null, daysPerWeek || 3, id]
    );
  }
}

export async function deleteProgram(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM programs WHERE id = ?', [id]);
}

export async function getActiveProgram() {
  const database = await getDb();
  const program = await database.getFirstAsync('SELECT * FROM programs WHERE is_active = 1');
  if (!program) return null;
  return getProgramById(program.id);
}

// ─── Program Days ────────────────────────────────────────────────────────────

export async function addProgramDay(programId, { name, dayNumber, sortOrder }) {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO program_days (program_id, day_number, name, sort_order) VALUES (?, ?, ?, ?)',
    [programId, dayNumber, name, sortOrder || 0]
  );
  return result.lastInsertRowId;
}

export async function updateProgramDay(id, { name }) {
  const database = await getDb();
  await database.runAsync('UPDATE program_days SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteProgramDay(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM program_days WHERE id = ?', [id]);
}

// ─── Program Exercises ───────────────────────────────────────────────────────

export async function addExerciseToDay(programDayId, { exerciseId, sets, reps, restSeconds, notes, sortOrder }) {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO program_exercises (program_day_id, exercise_id, sets, reps, rest_seconds, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [programDayId, exerciseId, sets || 3, reps || '8-12', restSeconds || 90, notes || null, sortOrder || 0]
  );
  return result.lastInsertRowId;
}

export async function updateProgramExercise(id, { sets, reps, restSeconds, notes }) {
  const database = await getDb();
  await database.runAsync(
    'UPDATE program_exercises SET sets = ?, reps = ?, rest_seconds = ?, notes = ? WHERE id = ?',
    [sets, reps, restSeconds, notes || null, id]
  );
}

export async function removeExerciseFromDay(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM program_exercises WHERE id = ?', [id]);
}

// Persist a new exercise order within a day. `orderedIds` is the full list of
// program_exercise ids for that day, in the desired order.
export async function reorderDayExercises(programDayId, orderedIds) {
  const database = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await database.runAsync(
      'UPDATE program_exercises SET sort_order = ? WHERE id = ? AND program_day_id = ?',
      [i, orderedIds[i], programDayId]
    );
  }
}

// ─── Workout Sessions ────────────────────────────────────────────────────────

export async function startSession({ programId, programDayId, dayName }) {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO workout_sessions (program_id, program_day_id, day_name) VALUES (?, ?, ?)',
    [programId || null, programDayId || null, dayName || 'Workout']
  );
  return result.lastInsertRowId;
}

export async function completeSession(id, { durationSeconds, notes }) {
  const database = await getDb();
  await database.runAsync(
    `UPDATE workout_sessions
     SET completed_at = datetime('now', 'localtime'), duration_seconds = ?, notes = ?
     WHERE id = ?`,
    [durationSeconds || null, notes || null, id]
  );
}

export async function getRecentSessions(limit = 20) {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT ws.*, COUNT(ss.id) as total_sets
     FROM workout_sessions ws
     LEFT JOIN session_sets ss ON ss.session_id = ws.id AND ss.completed = 1
     WHERE ws.completed_at IS NOT NULL
     GROUP BY ws.id
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getSessionById(id) {
  const database = await getDb();
  const session = await database.getFirstAsync('SELECT * FROM workout_sessions WHERE id = ?', [id]);
  if (!session) return null;
  session.sets = await database.getAllAsync(
    'SELECT * FROM session_sets WHERE session_id = ? ORDER BY exercise_name, set_number',
    [id]
  );
  return session;
}

export async function deleteSession(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM workout_sessions WHERE id = ?', [id]);
}

// Restore a session from cloud backup. Uses INSERT OR REPLACE so safe to call
// multiple times. Returns the local session id.
export async function restoreSession({ id, program_id, program_day_id, day_name, started_at, completed_at, duration_seconds, notes }) {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO workout_sessions
       (id, program_id, program_day_id, day_name, started_at, completed_at, duration_seconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, program_id ?? null, program_day_id ?? null, day_name ?? 'Workout',
     started_at ?? null, completed_at ?? null, duration_seconds ?? null, notes ?? null]
  );
  return id;
}

// ─── Session Sets ────────────────────────────────────────────────────────────

export async function logSet({ sessionId, exerciseId, exerciseName, setNumber, weightKg, reps, rpe }) {
  const database = await getDb();
  // Check for PR
  const pr = await database.getFirstAsync(
    `SELECT MAX(weight_kg) as best
     FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.completed = 1 AND ws.id != ?`,
    [exerciseId, sessionId]
  );
  const isPR = weightKg && pr && pr.best !== null ? weightKg > pr.best : (!pr || pr.best === null) && weightKg > 0;

  const result = await database.runAsync(
    `INSERT INTO session_sets
       (session_id, exercise_id, exercise_name, set_number, weight_kg, reps, rpe, completed, is_pr)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [sessionId, exerciseId, exerciseName, setNumber, weightKg || null, reps || null, rpe || null, isPR ? 1 : 0]
  );
  return { id: result.lastInsertRowId, isPR };
}

export async function updateSet(id, { weightKg, reps, rpe, completed }) {
  const database = await getDb();
  await database.runAsync(
    'UPDATE session_sets SET weight_kg = ?, reps = ?, rpe = ?, completed = ? WHERE id = ?',
    [weightKg || null, reps || null, rpe || null, completed ? 1 : 0, id]
  );
}

export async function deleteSet(id) {
  const database = await getDb();
  await database.runAsync('DELETE FROM session_sets WHERE id = ?', [id]);
}

// Restore a set from cloud backup. No explicit id — let SQLite assign one.
export async function restoreSet({ session_id, exercise_id, exercise_name, set_number, weight_kg, reps, rpe, completed, is_pr }) {
  const database = await getDb();
  // Skip if this set already exists for this session/exercise/set_number
  const existing = await database.getFirstAsync(
    'SELECT id FROM session_sets WHERE session_id = ? AND exercise_name = ? AND set_number = ?',
    [session_id, exercise_name, set_number]
  );
  if (existing) return;
  await database.runAsync(
    `INSERT INTO session_sets
       (session_id, exercise_id, exercise_name, set_number, weight_kg, reps, rpe, completed, is_pr)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [session_id, exercise_id ?? 0, exercise_name, set_number,
     weight_kg ?? null, reps ?? null, rpe ?? null, completed ?? 0, is_pr ?? 0]
  );
}

export async function getSetsForSession(sessionId) {
  const database = await getDb();
  return database.getAllAsync(
    'SELECT * FROM session_sets WHERE session_id = ? ORDER BY exercise_name, set_number',
    [sessionId]
  );
}

// ─── Progress / Analytics ────────────────────────────────────────────────────

export async function getExerciseHistory(exerciseId, limit = 30) {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT
       ws.started_at as date,
       MAX(ss.weight_kg) as max_weight,
       SUM(ss.reps * COALESCE(ss.weight_kg, 0)) as total_volume,
       COUNT(*) as total_sets
     FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.completed = 1 AND ws.completed_at IS NOT NULL
     GROUP BY DATE(ws.started_at)
     ORDER BY ws.started_at DESC
     LIMIT ?`,
    [exerciseId, limit]
  );
}

export async function getPersonalRecords() {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT
       e.id,
       e.name,
       e.muscle_group,
       pr.best_weight,
       pr.reps_at_best,
       pr.achieved_at
     FROM exercises e
     INNER JOIN (
       SELECT
         ss.exercise_id,
         ss.weight_kg as best_weight,
         ss.reps as reps_at_best,
         ws.started_at as achieved_at
       FROM session_sets ss
       JOIN workout_sessions ws ON ws.id = ss.session_id
       WHERE ss.completed = 1
         AND ss.weight_kg IS NOT NULL
         AND ss.weight_kg = (
           SELECT MAX(ss2.weight_kg)
           FROM session_sets ss2
           WHERE ss2.exercise_id = ss.exercise_id
             AND ss2.completed = 1
             AND ss2.weight_kg IS NOT NULL
         )
       GROUP BY ss.exercise_id
     ) pr ON pr.exercise_id = e.id
     ORDER BY e.name ASC`
  );
}

export async function getWeeklyVolume(weeksBack = 12) {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT
       strftime('%Y-W%W', ws.started_at) as week,
       COUNT(DISTINCT ws.id) as sessions,
       COUNT(ss.id) as total_sets,
       SUM(ss.reps * COALESCE(ss.weight_kg, 0)) as total_volume
     FROM workout_sessions ws
     LEFT JOIN session_sets ss ON ss.session_id = ws.id AND ss.completed = 1
     WHERE ws.completed_at IS NOT NULL
       AND ws.started_at >= datetime('now', 'localtime', '-${weeksBack} weeks')
     GROUP BY week
     ORDER BY week ASC`
  );
}

export async function getMuscleGroupVolume(daysBack = 30) {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT
       e.muscle_group,
       COUNT(ss.id) as total_sets,
       SUM(ss.reps * COALESCE(ss.weight_kg, 0)) as total_volume
     FROM session_sets ss
     JOIN exercises e ON e.id = ss.exercise_id
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.completed = 1
       AND ws.completed_at IS NOT NULL
       AND ws.started_at >= datetime('now', 'localtime', '-${daysBack} days')
     GROUP BY e.muscle_group
     ORDER BY total_sets DESC`
  );
}

// Per-day activity for the last `daysBack` days. One row per day with a
// completed session — { date: 'YYYY-MM-DD', sessions, total_sets, total_volume }.
// The dashboard fills in the zero days client-side.
export async function getDailyActivity(daysBack = 14) {
  const database = await getDb();
  return database.getAllAsync(
    `SELECT
       DATE(ws.started_at) as date,
       COUNT(DISTINCT ws.id) as sessions,
       SUM(CASE WHEN ss.completed = 1 THEN 1 ELSE 0 END) as total_sets,
       SUM(ss.reps * COALESCE(ss.weight_kg, 0)) as total_volume
     FROM workout_sessions ws
     LEFT JOIN session_sets ss ON ss.session_id = ws.id
     WHERE ws.completed_at IS NOT NULL
       AND DATE(ws.started_at) >= DATE('now', 'localtime', '-' || ? || ' days')
     GROUP BY DATE(ws.started_at)
     ORDER BY date ASC`,
    [daysBack]
  );
}

export async function getLastSetForExercise(exerciseId) {
  const database = await getDb();
  return database.getFirstAsync(
    `SELECT ss.weight_kg, ss.reps
     FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.completed = 1
     ORDER BY ws.started_at DESC, ss.set_number DESC
     LIMIT 1`,
    [exerciseId]
  );
}

export async function getExerciseStats(exerciseId) {
  const database = await getDb();
  return database.getFirstAsync(
    `SELECT
       MAX(ss.weight_kg) as max_weight,
       MAX(ss.reps * COALESCE(ss.weight_kg, 0)) as best_volume,
       COUNT(DISTINCT ws.id) as total_sessions
     FROM session_sets ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.exercise_id = ? AND ss.completed = 1 AND ws.completed_at IS NOT NULL`,
    [exerciseId]
  );
}
