#!/usr/bin/env node
/**
 * Post-build step for the GitHub Pages web deploy.
 *
 * Everything path-related (the `/GymMate/` base for `_expo/`, favicon, and
 * asset `httpServerLocation`) is now handled natively by Expo via
 * `experiments.baseUrl` in app.json — so this script does NOT rewrite any
 * generated paths. It only does the few things Expo's export can't:
 *
 *   1. Inject the PWA manifest <link> and an Ionicons @font-face into the
 *      generated <head> (Expo SDK 51 + Metro ignores the web/index.html
 *      template, so these can't be baked in there). The font is a stable
 *      copy shipped via public/fonts — no hashed-filename globbing needed.
 *   2. Copy index.html -> 404.html so GitHub Pages serves the SPA on deep links.
 *   3. Write version.json (the in-app update check fetches this and compares
 *      it to the baked EXPO_PUBLIC_APP_VERSION).
 *
 * Idempotent: safe to run more than once against the same dist/.
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = '/GymMate';
const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

// The build version is baked into the bundle at export time and re-published
// here so the running app can detect when a newer build is live.
const version = process.env.EXPO_PUBLIC_APP_VERSION || process.argv[2] || 'dev';

const HEAD_INJECTION = `    <link rel="manifest" href="${BASE_URL}/manifest.json" />
    <style>
      /* Ionicons @font-face so bottom-tab icons render on the web build.
         Stable copy from public/fonts — not the hashed asset bundle. */
      @font-face {
        font-family: 'Ionicons';
        src: url('${BASE_URL}/fonts/Ionicons.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    </style>
`;

function fail(msg) {
  console.error(`postbuild-web: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`dist/index.html not found — run \`expo export --platform web\` first.`);
}

let html = fs.readFileSync(indexPath, 'utf8');

// 1. Inject manifest link + Ionicons font-face (idempotent).
if (html.includes('rel="manifest"')) {
  console.log('postbuild-web: head injection already present, skipping.');
} else if (!html.includes('</head>')) {
  fail('no </head> found in dist/index.html — cannot inject manifest/font.');
} else {
  html = html.replace('</head>', `${HEAD_INJECTION}</head>`);
  fs.writeFileSync(indexPath, html);
  console.log('postbuild-web: injected manifest link + Ionicons font-face.');
}

// Sanity check: confirm the Ionicons font actually shipped from public/fonts.
if (!fs.existsSync(path.join(distDir, 'fonts', 'Ionicons.ttf'))) {
  fail('dist/fonts/Ionicons.ttf missing — expected public/fonts/Ionicons.ttf to be copied by export.');
}

// 2. SPA fallback for GitHub Pages deep links / back button.
fs.copyFileSync(indexPath, path.join(distDir, '404.html'));
console.log('postbuild-web: wrote 404.html.');

// 3. Version marker for the in-app update check.
fs.writeFileSync(
  path.join(distDir, 'version.json'),
  `${JSON.stringify({ version })}\n`
);
console.log(`postbuild-web: wrote version.json (version=${version}).`);
