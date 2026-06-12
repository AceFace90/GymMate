// Fuzzy match an exercise name (e.g. from Gemini) against the DB exercise list.
// Returns the best DB row plus a list of ranked candidates the user can pick from.

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')   // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s) {
  return new Set(normalize(s).split(' ').filter(Boolean));
}

// Jaccard-ish token overlap, 0..1
function tokenScore(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  ta.forEach((t) => { if (tb.has(t)) shared += 1; });
  return shared / Math.max(ta.size, tb.size);
}

// Score one DB exercise against a target name (0..1, higher = better)
function scoreOne(target, ex) {
  const nt = normalize(target);
  const ne = normalize(ex.name);
  if (!nt || !ne) return 0;
  if (nt === ne) return 1;
  if (ne.includes(nt) || nt.includes(ne)) return 0.85;
  return tokenScore(nt, ne);
}

// Rank all exercises against a single name.
export function rankMatches(name, exercises, limit = 5) {
  return exercises
    .map((ex) => ({ ex, score: scoreOne(name, ex) }))
    .filter((r) => r.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.ex);
}

// Best single match for an exact-ish name (used by AI program import).
// Returns the DB row or null if nothing crosses the threshold.
export function bestMatch(name, exercises, threshold = 0.5) {
  let best = null;
  let bestScore = threshold;
  for (const ex of exercises) {
    const s = scoreOne(name, ex);
    if (s >= bestScore) { best = ex; bestScore = s; }
  }
  return best;
}

// Combine a primary name + alternatives into a single deduped candidate list,
// optionally biased toward a muscle group / category hint from the vision model.
export function candidatesFromVision(result, exercises, limit = 6) {
  const names = [result?.exercise, ...(result?.alternatives || [])].filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const name of names) {
    for (const ex of rankMatches(name, exercises, 3)) {
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(ex);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
