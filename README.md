# JuliansXtension

Manifest V3 Chrome extension for saving a custom visual theme per website.

## Test locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select this folder:

   `/Users/julianfalk/Documents/Coding/projects/2026/Falk.io/JuliansXtension`

The popup stores one theme per normalized hostname in `chrome.storage.local`.

Themes currently include background, surface, text, muted text, accent, button, button text, border, font size, corner radius, and spacing controls.

## Reload after changes

When this unpacked extension changes locally:

1. Open `chrome://extensions`.
2. Find **JuliansXtension**.
3. Click the reload icon on its card.
4. Refresh the website tab.
