# Fetching All 420 YouTube Shorts

The issue: when you saved the HTML, only 48 videos were loaded (what was visible). YouTube lazy-loads the rest as you scroll.

## Options to get all 420 videos:

### Option 1: Scroll + Save HTML (manual but thorough)
1. Open https://www.youtube.com/@atppersonaltraining4506/shorts
2. Keep scrolling until ALL 420 videos are loaded (YouTube will say "No more content")
3. Save the page as HTML again
4. Run: `node -e "... parse script ..." > scripts/youtube-videos.json`
5. Run: `node scripts/match-videos.js`

### Option 2: Use yt-dlp (requires install)
```bash
# Install yt-dlp
brew install yt-dlp

# Fetch all shorts metadata (no download, just JSON)
yt-dlp --flat-playlist --dump-json \
  "https://www.youtube.com/@atppersonaltraining4506/shorts" \
  | jq -s 'map({title, id: .id, url: "https://www.youtube.com/shorts/\(.id)"})' \
  > scripts/youtube-videos.json

# Then run the matcher
node scripts/match-videos.js
```

### Option 3: YouTube Data API (requires API key)
1. Get a free API key from https://console.cloud.google.com/apis/credentials
2. Find the channel's "Shorts" playlist ID
3. Use the API to fetch all videos

### Option 4: Work with what we have (48 videos)
We've already matched 13 exercises from the first 48 videos. This covers:
- Key compound movements (bench, deadlift, rows)
- Common isolation (lateral raises, leg extension, curls)
- Core (crunches)

You can expand later as needed.

## Recommended: Option 1 (scroll + resave)
It's manual but guaranteed to work without installing tools or API keys.
