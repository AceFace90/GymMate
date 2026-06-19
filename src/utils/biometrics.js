export function getAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (isNaN(birth)) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

export function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

export function bmiCategory(bmi) {
  if (!bmi) return '';
  const b = parseFloat(bmi);
  if (b < 18.5) return 'Underweight';
  if (b < 25) return 'Healthy';
  if (b < 30) return 'Overweight';
  return 'Obese';
}

export function calcTDEE(weightKg, heightCm, age, sex, activityLevel) {
  if (!weightKg || !heightCm || !age || !sex) return null;
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);
  const a = parseFloat(age);
  let bmr = sex === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
  const multipliers = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

export const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (1–2 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very Active (2× daily or physical job)',
};

export const GOAL_LABELS = {
  fat_loss: 'Fat Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  endurance: 'Endurance',
  strength: 'Strength & Power',
};
