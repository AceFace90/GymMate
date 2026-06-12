export const PHASES = {
  menstrual: {
    label: 'Menstrual', color: '#ef4444', days: [1, 5], icon: '🔴',
    trainingFocus: 'Low-intensity movement, yoga, walking. Honour fatigue.',
    nutrition: 'Iron-rich foods (leafy greens, lean red meat). Stay hydrated.',
    notes: 'Progesterone and estrogen are at their lowest. Energy dips are normal.',
  },
  follicular: {
    label: 'Follicular', color: '#f97316', days: [6, 13], icon: '🟡',
    trainingFocus: 'Build intensity — strength training, HIIT, skill work.',
    nutrition: 'Higher carb intake supports rising energy. Lean protein for muscle synthesis.',
    notes: 'Estrogen rises, boosting mood and pain tolerance. Best phase for PRs.',
  },
  ovulatory: {
    label: 'Ovulatory', color: '#39ff14', days: [14, 16], icon: '🟢',
    trainingFocus: 'Peak power output — heavy lifts, sprints, competition.',
    nutrition: 'Balanced macros. Cruciferous veg support estrogen metabolism.',
    notes: 'Energy and strength peak. Warm up thoroughly — ACL risk slightly elevated.',
  },
  luteal: {
    label: 'Luteal', color: '#8b5cf6', days: [17, 28], icon: '🟣',
    trainingFocus: 'Steady-state cardio, moderate strength, recovery work.',
    nutrition: 'Caloric needs rise ~100–300 kcal. Magnesium helps with cramps.',
    notes: 'Progesterone rises. Core temperature up, perceived effort is higher.',
  },
};

export function getCurrentPhase(lastPeriodDateStr, cycleLength = 28) {
  if (!lastPeriodDateStr) return null;
  const lastPeriod = new Date(lastPeriodDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastPeriod.setHours(0, 0, 0, 0);
  const msSince = today - lastPeriod;
  if (msSince < 0) return null;
  const dayInCycle = (Math.floor(msSince / 86400000) % cycleLength) + 1;
  const scale = cycleLength / 28;
  for (const [key, phase] of Object.entries(PHASES)) {
    const start = Math.round(phase.days[0] * scale);
    const end = Math.round(phase.days[1] * scale);
    if (dayInCycle >= start && dayInCycle <= end) {
      return { key, ...phase, dayInCycle, cycleLength };
    }
  }
  return { key: 'luteal', ...PHASES.luteal, dayInCycle, cycleLength };
}

export function daysUntilNextPeriod(lastPeriodDateStr, cycleLength = 28) {
  if (!lastPeriodDateStr) return null;
  const lastPeriod = new Date(lastPeriodDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastPeriod.setHours(0, 0, 0, 0);
  const daysSince = Math.floor((today - lastPeriod) / 86400000);
  return cycleLength - (daysSince % cycleLength);
}
