#!/usr/bin/env node

/**
 * Find duplicate video mappings in exercise-videos.js
 * Each exercise should only appear once in the EXERCISE_VIDEOS object
 */

const fs = require('fs');
const path = require('path');

const videoPath = path.join(__dirname, '../src/data/exercise-videos.js');
const content = fs.readFileSync(videoPath, 'utf8');

// Extract all exercise name keys
const regex = /['"]([^'"]+)['"]\s*:\s*\{\s*videoId:/g;
const exercises = [];
let match;

while ((match = regex.exec(content)) !== null) {
  exercises.push({
    name: match[1],
    line: content.substring(0, match.index).split('\n').length
  });
}

// Find duplicates
const seen = new Map();
const duplicates = [];

exercises.forEach(ex => {
  if (seen.has(ex.name)) {
    duplicates.push(ex);
  } else {
    seen.set(ex.name, ex);
  }
});

if (duplicates.length === 0) {
  console.log('✅ No duplicate video mappings found!');
  process.exit(0);
}

console.log(`\n🔍 Found ${duplicates.length} duplicate video mappings:\n`);

duplicates.forEach(dup => {
  const first = seen.get(dup.name);
  console.log(`❌ "${dup.name}"`);
  console.log(`   First occurrence: line ${first.line}`);
  console.log(`   Duplicate: line ${dup.line}\n`);
});

console.log('\n📋 Summary:');
const uniqueDuplicateNames = [...new Set(duplicates.map(d => d.name))];
console.log(`   ${uniqueDuplicateNames.length} unique exercises with duplicates`);
console.log(`   ${duplicates.length} total duplicate entries to remove\n`);

console.log('Duplicate exercise names:');
uniqueDuplicateNames.forEach(name => console.log(`  - ${name}`));
