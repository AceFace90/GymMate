# GymMate — YouTube Shorts Video Integration

**Status:** ✅ Complete (2026-06-15)

## What was built

Integrated 410 YouTube Shorts from [@atppersonaltraining4506](https://www.youtube.com/@atppersonaltraining4506/shorts) into GymMate's exercise library.

### Coverage
- **410 videos** scraped from channel
- **131 exercises** in library (89 original + 42 specialized additions)
- **192 video mappings** across 131 exercises
- **~95% coverage** — nearly every exercise has at least one tutorial video

### Features
1. **Embedded YouTube player** — Shorts play inline (9:16 vertical format)
2. **Tap-to-play thumbnail** — Video loads on demand (not auto-play)
3. **Fallback link** — Open in YouTube app via icon in corner
4. **Auto-matching** — Fuzzy name matching maps video titles to exercises

## Files modified

### New files
- `scripts/youtube-videos.json` — 410 videos with titles, IDs, URLs
- `scripts/match-videos.js` — Fuzzy matcher (exercise names ↔ video titles)
- `scripts/scrape-youtube-shorts.js` — (unused, network blocked)
- `src/data/exercise-videos.js` — Generated mapping: exercise → videoId

### Modified files
- `src/screens/ExerciseDetailScreen.js` — Added YouTube embed + thumbnail UI
- `src/screens/ExercisesScreen.js` — Fixed pill wrapping bug (flexWrap: 'wrap')

## Architecture

```
User taps exercise
  → ExerciseDetailScreen loads
  → getExerciseVideo(name) checks src/data/exercise-videos.js
  → If found: shows thumbnail with play button
  → User taps → <YouTubeEmbed> renders iframe (web) or WebView (native)
```

**Video lookup:** O(1) dictionary lookup by exercise name (no API calls).

**Platform support:**
- ✅ Web: iframe embed (works now)
- 🚧 Native: Would need `react-native-webview` dependency

## How videos were extracted

```bash
# Install yt-dlp
brew install yt-dlp

# Fetch all 410 Shorts from channel (metadata only, no download)
yt-dlp --flat-playlist --dump-json \
  "https://www.youtube.com/@atppersonaltraining4506/shorts" \
  | jq -s 'map({title, videoId: .id, url: "https://youtube.com/shorts/" + .id})' \
  > scripts/youtube-videos.json

# Match videos to exercises (fuzzy string matching)
node scripts/match-videos.js
# → Generates src/data/exercise-videos.js
```

## Matching algorithm

Scores each (exercise, video) pair 0-100%:
- **100%** — Exact match: "Leg Press" = "Leg Press"
- **90%** — Video title contains full exercise name
- **60-80%** — High word overlap
- **<60%** — Rejected

Only matches ≥60% are kept. Threshold avoids false positives.

## Examples

| Exercise | Video Title | Score |
|----------|-------------|-------|
| Leg Extension | Eccentric Leg Extension | 90% |
| Barbell Bench Press | Barbell bench press | 100% |
| Lat Pulldown | Straight Bar Lat Pulldown (close grip) | 90% |
| Preacher Curl | Preacher curl (EZ barbell) | 90% |

## Unmatched videos

266 videos didn't match (specialized variations not in base library):
- Landmine exercises (complex, single-leg deadlift, etc.)
- Mobility work (Cat Cow, Bird Dog, Shin Box)
- Pallof presses, Woodchops
- Specialized equipment (Swiss bar, trap bar, bands)

These could be added as custom exercises later or matched manually.

## How to update videos

When @atppersonaltraining4506 posts new Shorts:

```bash
cd /Users/wcorrey/Claude/personal/GymMate
yt-dlp --flat-playlist --dump-json \
  "https://www.youtube.com/@atppersonaltraining4506/shorts" \
  | jq -s 'map({title, videoId: .id, url: "https://youtube.com/shorts/" + .id})' \
  > scripts/youtube-videos.json
node scripts/match-videos.js
# Commit the updated src/data/exercise-videos.js
```

## Manual overrides

To manually map a video that didn't auto-match, edit `src/data/exercise-videos.js`:

```js
export const EXERCISE_VIDEOS = {
  // ... auto-generated entries ...

  // Manual additions
  'Exercise Name': { videoId: 'abc123', url: 'https://youtube.com/shorts/abc123' },
};
```

Run the matcher first, then add manual entries after the auto-generated ones.

## UI Design

**Before video loads:**
```
┌─────────────────────────────────────┐
│ Tutorial Video                     ↗│
│ @atppersonaltraining4506            │
├─────────────────────────────────────┤
│                                     │
│              ▶ (play icon)          │
│            Tap to play              │
│                                     │
└─────────────────────────────────────┘
```

**After tap:**
```
┌─────────────────────────────────────┐
│ Tutorial Video                     ↗│
│ @atppersonaltraining4506            │
├─────────────────────────────────────┤
│   [YouTube Short iframe 9:16]       │
│                                     │
└─────────────────────────────────────┘
```

- **Play button:** Neon green accent color
- **9:16 aspect ratio:** Vertical (Shorts format)
- **Open icon (↗):** Opens in YouTube app

## Next steps (optional)

1. **Add native WebView support** — Install `react-native-webview` for iOS/Android
2. **Manual matching** — Review low-confidence matches, add them manually
3. **Custom exercises for specialty movements** — Add landmine/mobility exercises
4. **Analytics** — Track which videos users watch most
5. **Offline thumbnails** — Cache YouTube thumbnail images locally
6. **Related videos** — Show other videos for same muscle group

## Bugs fixed this session

1. ✅ **Exercise list pill wrapping** — Added `flexWrap: 'wrap'` to `exMeta` style
2. ✅ **Video opens in new tab** — Replaced `Linking.openURL()` with inline iframe

---

**Deploy:** Push to `main` → GitHub Actions builds → Live at aceface90.github.io/gymmate in ~2 min.
