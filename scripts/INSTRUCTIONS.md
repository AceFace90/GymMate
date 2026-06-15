# YouTube Shorts → Exercise Video Mapping

## Option 1: Browser Console Scrape (Easiest)

1. Open https://www.youtube.com/@atppersonaltraining4506/shorts in your browser
2. Scroll down to load all shorts
3. Open DevTools (F12 or Cmd+Option+I)
4. Paste this into the Console tab:

```javascript
copy(JSON.stringify(
  Array.from(document.querySelectorAll('ytd-rich-item-renderer'))
    .map(el => {
      const link = el.querySelector('a#thumbnail');
      const title = el.querySelector('#video-title');
      if (!link || !title) return null;
      const url = link.href;
      const videoId = url.match(/shorts\/([^?]+)/)?.[1];
      return {
        title: title.getAttribute('title') || title.textContent.trim(),
        videoId,
        url: `https://www.youtube.com/shorts/${videoId}`
      };
    })
    .filter(Boolean),
  null,
  2
))
```

5. This copies the JSON to your clipboard. Paste it into `scripts/youtube-videos.json`
6. Run: `node scripts/match-videos.js`

## Option 2: Manual Entry

Edit `scripts/youtube-videos.json` with this format:

```json
[
  {
    "title": "Lat Pulldown",
    "videoId": "abc123xyz",
    "url": "https://www.youtube.com/shorts/abc123xyz"
  },
  {
    "title": "Bench Press Tutorial",
    "videoId": "def456",
    "url": "https://www.youtube.com/shorts/def456"
  }
]
```

Then run: `node scripts/match-videos.js`

## What Happens Next

The matcher will:
- Compare video titles to all 89 exercise names
- Score each match (0-100% confidence)
- Generate `src/data/exercise-videos.js` with the mappings
- Show you low-confidence matches to review

You can then import this in the app to show video links in ExerciseDetailScreen.
