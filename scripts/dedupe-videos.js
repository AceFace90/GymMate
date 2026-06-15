#!/usr/bin/env node

/**
 * Deduplicate video mappings in exercise-videos.js
 * Keep only the first video for each exercise (they're all valid, just pick one)
 */

const fs = require('fs');
const path = require('path');

const videoPath = path.join(__dirname, '../src/data/exercise-videos.js');
const content = fs.readFileSync(videoPath, 'utf8');

// Parse the EXERCISE_VIDEOS object entries
const lines = content.split('\n');
const seen = new Set();
const dedupedLines = [];
let duplicatesRemoved = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check if this is a video mapping line
  const match = line.match(/^\s*['"]([^'"]+)['"]\s*:\s*\{\s*videoId:/);

  if (match) {
    const exerciseName = match[1];

    if (seen.has(exerciseName)) {
      // Skip duplicate
      duplicatesRemoved++;
      console.log(`🗑️  Removing duplicate: "${exerciseName}" (line ${i + 1})`);
      continue;
    }

    seen.add(exerciseName);
  }

  dedupedLines.push(line);
}

// Write the deduplicated content
const newContent = dedupedLines.join('\n');
fs.writeFileSync(videoPath, newContent, 'utf8');

console.log(`\n✅ Removed ${duplicatesRemoved} duplicate video mappings`);
console.log(`   Kept ${seen.size} unique exercise videos`);
console.log(`   File updated: ${videoPath}`);
