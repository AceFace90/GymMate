#!/usr/bin/env node

// Takes unmatched videos and creates new exercise entries
// Infers muscle group and category from video titles

const fs = require('fs');
const path = require('path');

// Load videos
const videos = JSON.parse(fs.readFileSync('scripts/youtube-videos.json', 'utf8'));

// Load existing exercises to get matched ones
const exercisesPath = path.join(__dirname, '../src/data/exercises.js');
const exercisesCode = fs.readFileSync(exercisesPath, 'utf8');
const existingNames = exercisesCode.match(/name: '([^']+)'/g).map(m => m.match(/name: '([^']+)'/)[1]);

// Load current video mappings to find unmatched
const videoMappingPath = path.join(__dirname, '../src/data/exercise-videos.js');
const mappingCode = fs.readFileSync(videoMappingPath, 'utf8');
const mappedVideoIds = [...mappingCode.matchAll(/videoId: '([^']+)'/g)].map(m => m[1]);

// Get unmatched videos
const unmatchedVideos = videos.filter(v => !mappedVideoIds.includes(v.videoId));

console.log(`Found ${unmatchedVideos.length} unmatched videos\n`);

// Categorization rules based on keywords
function categorizeExercise(title) {
  const lower = title.toLowerCase();

  // Muscle group inference
  let muscleGroup = 'full_body';
  if (/chest|pec|press|fly|pushup|dip/i.test(lower)) muscleGroup = 'chest';
  else if (/back|row|pulldown|pull.?up|lat|deadlift/i.test(lower)) muscleGroup = 'back';
  else if (/leg|squat|lunge|calf|glute|hip|thigh|quad/i.test(lower)) muscleGroup = 'legs';
  else if (/shoulder|deltoid|shrug|raise|press/i.test(lower)) muscleGroup = 'shoulders';
  else if (/bicep|tricep|curl|arm|pushdown|extension|kickback/i.test(lower)) muscleGroup = 'arms';
  else if (/core|abs|plank|crunch|woodchop|pallof|twist/i.test(lower)) muscleGroup = 'core';
  else if (/cardio|treadmill|bike|row|elliptical|battle|jump|rope/i.test(lower)) muscleGroup = 'cardio';

  // Category inference
  let category = 'bodyweight';
  if (/barbell|ez.?bar|trap.?bar/i.test(lower)) category = 'barbell';
  else if (/dumbbell|kettlebell/i.test(lower)) category = 'dumbbell';
  else if (/machine|seated.*press|leg.*press|hammer.*strength/i.test(lower)) category = 'machine';
  else if (/cable|rope.*|band/i.test(lower)) category = 'cable';
  else if (/cardio|treadmill|bike|elliptical|battle/i.test(lower)) category = 'cardio';

  return { muscleGroup, category };
}

// Generate instructions from title
function generateInstructions(title) {
  const lower = title.toLowerCase();

  // Extract key terms
  let instructions = '';

  // Stance/position
  if (/standing/i.test(lower)) instructions += 'Stand upright. ';
  else if (/seated/i.test(lower)) instructions += 'Sit with back supported. ';
  else if (/kneeling/i.test(lower)) instructions += 'Kneel on floor or pad. ';
  else if (/lying|supine/i.test(lower)) instructions += 'Lie on bench. ';
  else if (/prone/i.test(lower)) instructions += 'Lie face down. ';

  // Grip/hand position
  if (/neutral/i.test(lower)) instructions += 'Use neutral grip (palms facing each other). ';
  else if (/pronated/i.test(lower)) instructions += 'Use overhand grip (palms down). ';
  else if (/supinated/i.test(lower)) instructions += 'Use underhand grip (palms up). ';
  else if (/close.*grip/i.test(lower)) instructions += 'Grip closer than shoulder-width. ';
  else if (/wide/i.test(lower)) instructions += 'Grip wider than shoulder-width. ';

  // Movement pattern
  if (/curl/i.test(lower)) instructions += 'Curl weight toward shoulder, lower with control.';
  else if (/extension/i.test(lower)) instructions += 'Extend fully at the joint, return slowly.';
  else if (/press/i.test(lower)) instructions += 'Press weight away from body, return with control.';
  else if (/row/i.test(lower)) instructions += 'Pull weight toward body, squeeze shoulder blades.';
  else if (/raise/i.test(lower)) instructions += 'Raise weight to specified height, lower slowly.';
  else if (/pulldown/i.test(lower)) instructions += 'Pull bar down toward chest, control the return.';
  else if (/squat/i.test(lower)) instructions += 'Lower into squat position, drive back up through heels.';
  else if (/lunge/i.test(lower)) instructions += 'Step forward/back into lunge, return to start.';
  else if (/fly/i.test(lower)) instructions += 'Open arms wide in arc, bring together with slight bend in elbows.';
  else if (/shrug/i.test(lower)) instructions += 'Shrug shoulders straight up, hold briefly, lower fully.';

  // Special variations
  if (/1.*1\/2/i.test(lower)) instructions += ' Perform 1.5 reps (full rep + half rep).';
  else if (/alternate/i.test(lower)) instructions += ' Alternate sides each rep.';
  else if (/single.*arm|single.*leg/i.test(lower)) instructions += ' Work one side at a time.';
  else if (/landmine/i.test(lower)) instructions = 'Barbell anchored at one end. ' + instructions;
  else if (/pallof/i.test(lower)) instructions = 'Cable at chest height. Press out resisting rotation, hold, return.';
  else if (/woodchop/i.test(lower)) instructions = 'Cable at side. Rotate torso pulling cable across body in chopping motion.';

  if (!instructions) {
    instructions = 'Follow proper form for this exercise variation.';
  }

  return instructions.trim();
}

// Clean up exercise name
function cleanName(title) {
  return title
    .replace(/\(.*?\)/g, '') // Remove parentheticals
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Generate new exercise entries
const newExercises = [];
for (const video of unmatchedVideos) {
  const name = cleanName(video.title);

  // Skip if name too generic or already exists
  if (name.length < 3 || existingNames.includes(name)) continue;
  if (/ATP Personal Training/i.test(name)) continue;

  const { muscleGroup, category } = categorizeExercise(video.title);
  const instructions = generateInstructions(video.title);

  newExercises.push({
    name,
    muscleGroup,
    category,
    instructions,
    videoId: video.videoId,
    videoUrl: video.url,
  });
}

console.log(`Generated ${newExercises.length} new exercises\n`);

// Group by muscle group for clean insertion
const grouped = newExercises.reduce((acc, ex) => {
  if (!acc[ex.muscleGroup]) acc[ex.muscleGroup] = [];
  acc[ex.muscleGroup].push(ex);
  return acc;
}, {});

// Output format for exercises.js
console.log('=== NEW EXERCISES TO ADD ===\n');

const muscleGroupLabels = {
  chest: 'CHEST',
  back: 'BACK',
  legs: 'LEGS',
  shoulders: 'SHOULDERS',
  arms: 'ARMS',
  core: 'CORE',
  cardio: 'CARDIO',
  full_body: 'FULL BODY',
};

for (const [group, exercises] of Object.entries(grouped)) {
  console.log(`  // ── ${muscleGroupLabels[group]} (new) ────────────────────────────────────────`);
  for (const ex of exercises) {
    console.log(`  { name: '${ex.name}', muscleGroup: '${ex.muscleGroup}', category: '${ex.category}', instructions: '${ex.instructions}' },`);
  }
  console.log('');
}

// Save to file for review
const outputPath = path.join(__dirname, 'new-exercises.json');
fs.writeFileSync(outputPath, JSON.stringify(newExercises, null, 2));
console.log(`\n✅ Saved ${newExercises.length} new exercises to ${outputPath}`);
console.log('\nReview the output above and new-exercises.json, then add to src/data/exercises.js');
