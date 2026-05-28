# Julians Tweaks

A Manifest V3 Chrome extension that bundles **6 per-site tweaks** under one popup.

## Apps

| App | What it does |
|---|---|
| **X Themes** | Apply one of 12 curated themes to x.com / twitter.com |
| **YouTube** | Hide Shorts (sidebar, home, search, watch page, channel tabs) |
| **Google** | Hide AI Overviews + Sponsored ads on Google Search |
| **LinkedIn** | Hide Promoted posts + News rail on the right |
| **Reddit** | Hide Promoted posts + Recommended subreddits |
| **GitHub** | Hide Copilot CTAs + Sponsor buttons |

Settings persist in `chrome.storage.local`. Each app's content script listens for storage changes — toggling propagates to all open matching tabs.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder.
5. Open the popup, switch between app tabs, flip toggles.

## Reload after changes

1. `chrome://extensions`
2. Reload icon on the **Julians Tweaks** card
3. Refresh any open target tabs

## Architecture

```
manifest.json        — Lists hosts + content scripts per app
popup.html / .css    — Tabbed popup UI (3×2 grid of apps)
popup.js             — Tab routing + per-app init() + storage writes
content.js           — X.com theme application
youtube.js           — YouTube Shorts hiding
google.js            — Google AI-Overview / Sponsored hiding
linkedin.js          — LinkedIn promoted / news rail hiding
reddit.js            — Reddit promoted / recommendations hiding
github.js            — GitHub Copilot / Sponsors hiding
```

Each app's content script follows the same shape:
- Pre-injects a `<style>` with rules scoped to a root class on `<html>`
- Toggles the root class to enable / disable a setting
- Listens for `chrome.runtime.onMessage` (popup → tab) and `chrome.storage.onChanged` (cross-tab fanout)

## Adding more apps

1. Add the host(s) to `manifest.json` (`host_permissions` + a new `content_scripts` entry)
2. Create `<app>.js` content script with the same shape as `youtube.js`
3. Add a `<section class="pane" data-app="...">` in `popup.html` and a tab button in `<nav class="tabs">`
4. Add `init<App>()` in `popup.js` and call it from `init()`
5. Add the app's metadata to the `APP_META` object in `popup.js`
