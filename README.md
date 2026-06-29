# JulianXtension

> One Chrome extension to declutter the web. 🧹

A Manifest V3 Chrome extension that bundles **per-site annoyance-killers** for X, YouTube, Google, LinkedIn, Reddit, GitHub & Instagram — plus a toolbox of handy tweaks — all under one popup. Settings sync across devices via `chrome.storage.sync`.

**Reuse it freely** — fork it, remix it, build your own version. If you ship something cool with it, I'd love to hear about it.

## Apps

| App | Tweaks |
|---|---|
| **X** | X Dim Mode (9 themes + custom hue/saturation/darkness, adaptive light/dark) · Classic bird logo · Hide Trends · Who-to-Follow · Grok · Ads · Premium upsells · View counts |
| **YouTube** | Hide Shorts · Watch-Page Sidebar · Comments · Home Feed (focus mode) · End-Screen Cards · Live Chat |
| **Google** | Hide AI-Overviews · Hide Sponsored · Hide People-Also-Ask · Hide Related Searches |
| **LinkedIn** | Hide Promoted · Hide News-Rail · Hide People-You-May-Know |
| **Reddit** | Hide Promoted · Recommendations · Right Sidebar · Premium/Awards · App Banners |
| **GitHub** | Hide Copilot CTAs · Hide Sponsor CTAs · Hide Home-Feed-Widgets |
| **Instagram** | Hide Reels (nav, feed, profile tab) |

All settings persist in `chrome.storage.local`. Toggling propagates to every open matching tab via storage change listeners — no per-tab messaging needed.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder.
5. Open the popup, pick an app tab, flip toggles.

## Reload after changes

1. `chrome://extensions`
2. Reload icon on the **JulianXtension** card
3. Refresh open target tabs

## Architecture

```
manifest.json     — Hosts + content scripts per app
popup.html / .css — Tabbed UI (4-col × 2-row grid of apps)
popup.js          — Tab routing, per-app init(), wireToggleGroup() helper
preload.css       — Paints the dim bg at document_start (no flash of black)
xdim.js           — X Dim Mode: recolors X's native Lights Out theme to navy
content.js        — X hide-toggles (trends, who-to-follow, Grok)
youtube.js        — YouTube hide-toggles
google.js         — Google hide-toggles
linkedin.js       — LinkedIn hide-toggles (incl. MutationObserver for promoted detection)
reddit.js         — Reddit hide-toggles
github.js         — GitHub hide-toggles
instagram.js      — Instagram hide-toggles
```

Each app's content script follows the same shape:
- Pre-injects a `<style>` with rules scoped to a root class on `<html>` per setting
- Toggles the root class to enable / disable a setting
- Listens for `chrome.runtime.onMessage` (popup → tab, instant feedback) and `chrome.storage.onChanged` (cross-tab fanout)

The popup uses `wireToggleGroup(app, applyMessageType, toggles)` to wire any number of toggles to their storage keys + active-tab broadcast in one call — see `initGoogle()` / `initReddit()` / etc.

## Adding more apps

1. Add the host(s) to `manifest.json` (`host_permissions` + new `content_scripts` entry)
2. Create `<app>.js` content script with the same shape as `youtube.js` or `instagram.js`
3. Add a `<section class="pane" data-app="...">` in `popup.html` and a tab button
4. Add `init<App>()` in `popup.js` using `wireToggleGroup` and call it from `init()`
5. Add the app's entry to the `APP_META` map and storage keys to `STORAGE_KEYS`

## Credits

Built by **Julian Falk** — say hi on X: [@julianfaalk](https://x.com/julianfaalk)

Feel free to reuse, fork and adapt this project for your own needs. ⭐ the repo if it's useful to you!
