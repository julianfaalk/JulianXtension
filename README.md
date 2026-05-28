# Julians Tweaks

A Manifest V3 Chrome extension that bundles multiple per-site tweaks under one popup.

## Apps

### 1. X Themes
Apply one of 12 curated themes to **x.com / twitter.com**. Inspired by *X-Dim Mode*.

Presets: X Dim, Lights Out, Midnight, Obsidian, Aurora, Ultraviolet, Ember, Rose Noir, Forest, Cyberpunk, Nord, Dracula.

### 2. YouTube
Hide YouTube Shorts everywhere — sidebar, home shelves, search, watch-page sidebar, channel tabs, mobile pivot bar. Single toggle.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this folder.

The popup shows two tabs (**X Themes**, **YouTube**); pick the app, change the setting, switch tabs to configure the other. State persists in `chrome.storage.local`.

## Reload after changes

1. `chrome://extensions`.
2. Click the reload icon on the **Julians Tweaks** card.
3. Refresh any open X / YouTube tabs.

## Adding more apps

Each app is one content script + one section in `popup.html` + one init function in `popup.js`. Pattern:

- Add the new host to `host_permissions` and a new entry in `content_scripts` in `manifest.json`.
- Create `<your-app>.js` content script with a message listener and a `chrome.storage.onChanged` listener.
- Add a `<section class="pane" data-app="...">` in `popup.html` and a tab button in `<nav class="tabs">`.
- Add an `init<App>()` in `popup.js` and call it from `init()`.
