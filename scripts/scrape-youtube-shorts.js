#!/usr/bin/env node

// Quick scraper to extract YouTube Shorts titles + URLs from @atppersonaltraining4506
// Run: node scripts/scrape-youtube-shorts.js
// Outputs: scripts/youtube-videos.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const CHANNEL_URL = 'https://www.youtube.com/@atppersonaltraining4506/shorts';

console.log('Fetching YouTube Shorts page...');

https.get(CHANNEL_URL, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // YouTube embeds video data in JSON inside <script> tags
    // Look for ytInitialData which contains the shorts grid
    const match = data.match(/var ytInitialData = ({.*?});/);
    if (!match) {
      console.error('Could not find ytInitialData in page HTML.');
      console.log('Try opening the URL in a browser and manually extracting video titles/IDs.');
      process.exit(1);
    }

    const ytData = JSON.parse(match[1]);

    // Navigate nested YouTube API structure to find shorts
    const tabs = ytData?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const shortsTab = tabs.find(t => t.tabRenderer?.title === 'Shorts');
    const items = shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    const videos = items
      .filter(item => item.richItemRenderer?.content?.reelItemRenderer)
      .map(item => {
        const reel = item.richItemRenderer.content.reelItemRenderer;
        return {
          title: reel.headline?.simpleText || 'Untitled',
          videoId: reel.videoId,
          url: `https://www.youtube.com/shorts/${reel.videoId}`
        };
      });

    if (videos.length === 0) {
      console.error('No shorts found. YouTube may have changed their HTML structure.');
      console.log('Fallback: manually create scripts/youtube-videos.json with format:');
      console.log('[{ "title": "Exercise Name", "videoId": "abc123", "url": "..." }]');
      process.exit(1);
    }

    const outPath = path.join(__dirname, 'youtube-videos.json');
    fs.writeFileSync(outPath, JSON.stringify(videos, null, 2));
    console.log(`✅ Scraped ${videos.length} shorts → ${outPath}`);
    videos.slice(0, 5).forEach(v => console.log(`   - ${v.title}`));
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
  process.exit(1);
});
