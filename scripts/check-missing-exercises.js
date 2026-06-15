#!/usr/bin/env node

/**
 * Check which exercises from the pasted list are missing from exercises.js
 */

const fs = require('fs');
const path = require('path');

// Read exercises.js
const exercisesPath = path.join(__dirname, '../src/data/exercises.js');
const content = fs.readFileSync(exercisesPath, 'utf8');

// Extract all exercise names from exercises.js
const existingExercises = new Set();
const regex = /name:\s*['"]([^'"]+)['"]/g;
let match;

while ((match = regex.exec(content)) !== null) {
  existingExercises.add(match[1].toLowerCase());
}

// Pasted list from user
const pastedList = [
  'Cat Cow',
  'Bird Dog',
  'Fire Hydrant',
  'Shin Box',
  'Toe Touch',
  'Hip mobility complex',
  'Worlds Greatest Stretch',
  'Ankle Dorsiflexion',
  'Lower body mobility flow',
  'Torso mobility flow',
  'Shoulder dislocates (band or broomstick)',
  'Upper Back Mobility (Broomstick)',
  'Shoulder External Rotation',
  'Bowler Squat',
  'Reverse Nordics',
  'Scapular Pushups',
  'Modified Push Up (Elevated Hands)',
  'L Sit (Floor)',
  'Shoulder Taps',
  'High Plank (Hands)',
  'Low Plank (Elbows)',
  'Oblique Plank (Side)',
  'Around the World (Shoulders)',
  'Seal (Yoga)',
  '90/90 Hip Stretch',
  'Banded Shoulder External Rotation',
  'Palloff Press',
  'Cable Woodchop (High to Low)',
  'Dead Bug',
  'Stir the Pot',
  'Body Saw',
  'Leg Raises',
  'Hanging Leg Raises',
  'Standing Knee Tucks',
  'Reverse Crunch',
  'Mountain Climber',
  'Bicycle Crunch',
  'Russian Twist',
  'Cable Crunch',
  'Ab Wheel Rollout',
  'Plank',
  'Hanging Knee Raises',
  'Side Plank',
  'Crunch',
  'Hip Thrust (single leg)',
  'Cable Standing Hip Abduction',
  'Cable Glute Kickback',
  'RDL (Single Leg)',
  'Leg Curl (Single Leg)',
  'Bulgarian Split Squats',
  'Leg Press (Single Leg)',
  'Walking Lunge (alternative dumbbell grip)'
];

// Check which are missing
const missing = [];
const found = [];

pastedList.forEach(ex => {
  const normalized = ex.toLowerCase()
    .replace(/world's/i, 'world\'s')
    .replace(/palloff/i, 'pallof');

  // Fuzzy matching for common variations
  let exists = existingExercises.has(normalized);

  // Try variations
  if (!exists) {
    // Try "Leg Raise" vs "Leg Raises"
    exists = existingExercises.has(normalized.replace(/s$/, ''));
  }
  if (!exists) {
    exists = existingExercises.has(normalized + 's');
  }
  // Try "Hanging Leg Raise" vs "Leg Raise"
  if (!exists && normalized.includes('hanging')) {
    exists = existingExercises.has('hanging ' + normalized.split('hanging ')[1]);
  }

  if (exists) {
    found.push(ex);
  } else {
    missing.push(ex);
  }
});

console.log(`\n📊 Analysis of ${pastedList.length} exercises:\n`);
console.log(`✅ Already in library: ${found.length}`);
console.log(`❌ Missing: ${missing.length}\n`);

if (missing.length > 0) {
  console.log('Missing exercises:\n');
  missing.forEach(ex => console.log(`  - ${ex}`));
}
