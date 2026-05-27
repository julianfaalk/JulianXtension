(() => {
  if (window.__juliansXtensionLoadedVersion === 3) {
    return;
  }

  window.__juliansXtensionLoaded = true;
  window.__juliansXtensionLoadedVersion = 3;

  const STYLE_ID = "juliansxtension-style";
  const STORAGE_KEY = "siteThemes";
  const THEME_VERSION = 2;
  const MESSAGE_TYPES = {
    ping: "JULIANS_XTENSION_PING",
    applyTheme: "JULIANS_XTENSION_APPLY_THEME",
    clearTheme: "JULIANS_XTENSION_CLEAR_THEME"
  };
  const COLOR_KEYS = [
    "background",
    "surface",
    "text",
    "mutedText",
    "accent",
    "button",
    "buttonText",
    "border"
  ];
  const DEFAULT_THEME = {
    version: THEME_VERSION,
    colors: {
      background: "#15202b",
      surface: "#192734",
      text: "#f5f8fa",
      mutedText: "#8899a6",
      accent: "#1da1f2",
      button: "#1da1f2",
      buttonText: "#ffffff",
      border: "#38444d"
    },
    fontScale: 100,
    radius: 16,
    spacing: 100
  };
  const host = normalizeHost(window.location.hostname);
  const paintedElements = new Set();
  let currentTheme = null;
  let repaintTimer = null;
  let surfaceObserver = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === MESSAGE_TYPES.ping) {
      sendResponse({ ok: true });
      return true;
    }

    if (message.host && normalizeHost(message.host) !== host) {
      sendResponse({ ok: false });
      return true;
    }

    if (message.type === MESSAGE_TYPES.applyTheme) {
      const theme = normalizeTheme(message.theme);
      if (!theme) {
        sendResponse({ ok: false });
        return true;
      }

      applyTheme(theme);
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === MESSAGE_TYPES.clearTheme) {
      clearTheme();
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }

    const nextThemes = changes[STORAGE_KEY].newValue || {};
    const theme = normalizeTheme(nextThemes[host]);
    if (theme) {
      applyTheme(theme);
    } else if (Object.prototype.hasOwnProperty.call(nextThemes, host)) {
      clearTheme();
    }
  });

  loadStoredTheme();

  async function loadStoredTheme() {
    try {
      const local = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
      const localThemes = isPlainObject(local[STORAGE_KEY]) ? local[STORAGE_KEY] : {};

      if (Object.prototype.hasOwnProperty.call(localThemes, host)) {
        const theme = normalizeTheme(localThemes[host]);
        if (theme) {
          applyTheme(theme);
        } else {
          clearTheme();
        }
        return;
      }

      const sync = await chrome.storage.sync.get({ [STORAGE_KEY]: {} });
      const legacyThemes = isPlainObject(sync[STORAGE_KEY]) ? sync[STORAGE_KEY] : {};
      const legacyTheme = normalizeTheme(legacyThemes[host]);

      if (legacyTheme) {
        applyTheme(legacyTheme);
      }
    } catch (_error) {
      clearTheme();
    }
  }

  function applyTheme(theme) {
    const accentRgb = hexToRgb(theme.colors.accent);
    const buttonRgb = hexToRgb(theme.colors.button);
    const bgRgb = hexToRgb(theme.colors.background);
    const style = getOrCreateStyle();

    currentTheme = theme;
    style.textContent = buildThemeCss(theme, accentRgb, buttonRgb, bgRgb);
    document.documentElement.dataset.juliansXtensionActive = "true";

    startSurfaceObserver();
    scheduleSurfacePaint();
  }

  function buildThemeCss(theme, accentRgb, buttonRgb, bgRgb) {
    const colors = theme.colors;
    const radius = `${theme.radius}px`;
    const fontScale = String(theme.fontScale / 100);
    const spacing = String(theme.spacing / 100);
    const isDark = luminance(bgRgb) < 0.5;
    const colorScheme = isDark ? "dark" : "light";

    return `
:root, html {
  --jxt-bg: ${colors.background};
  --jxt-surface: ${colors.surface};
  --jxt-text: ${colors.text};
  --jxt-muted: ${colors.mutedText};
  --jxt-accent: ${colors.accent};
  --jxt-accent-soft: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.18);
  --jxt-button: ${colors.button};
  --jxt-button-soft: rgba(${buttonRgb.r}, ${buttonRgb.g}, ${buttonRgb.b}, 0.18);
  --jxt-button-text: ${colors.buttonText};
  --jxt-border: ${colors.border};
  --jxt-grid-line: color-mix(in srgb, var(--jxt-border) 62%, var(--jxt-text) 38%);
  --jxt-post-bg: color-mix(in srgb, var(--jxt-bg) 92%, var(--jxt-surface) 8%);
  --jxt-radius: ${radius};
  --jxt-font-scale: ${fontScale};
  --jxt-spacing: ${spacing};
  color-scheme: ${colorScheme} !important;
  accent-color: var(--jxt-accent) !important;
  caret-color: var(--jxt-accent) !important;
}

html {
  background-color: var(--jxt-bg) !important;
  color: var(--jxt-text) !important;
  font-size: calc(100% * var(--jxt-font-scale)) !important;
}

body {
  background-color: var(--jxt-bg) !important;
  background-image: none !important;
  color: var(--jxt-text) !important;
}

/* Low-specificity universal coverage: gives transparent containers the theme bg
   and propagates text/border colors without forcing structural divs to a fixed background. */
:where(div, section, article, aside, header, footer, nav, main, ul, ol, dl, figure, address, hgroup, details, fieldset, [role="region"], [role="group"], [role="banner"], [role="contentinfo"], [role="navigation"], [role="complementary"]) {
  background-color: transparent;
  border-color: var(--jxt-border);
  color: inherit;
}

/* Force the major layout regions onto the theme background. */
:where(html, body, main, [role="main"], header[role="banner"], nav[role="navigation"], aside, [role="complementary"], footer[role="contentinfo"]) {
  background-color: var(--jxt-bg) !important;
  color: var(--jxt-text) !important;
}

/* Cards / dialogs / menus / popovers => surface color. Role-based only. */
:where(
  [role="dialog"],
  [role="alertdialog"],
  [role="menu"],
  [role="menubar"],
  [role="listbox"],
  [role="combobox"],
  [role="tooltip"],
  [role="status"],
  dialog
) {
  background-color: var(--jxt-surface) !important;
  border-color: var(--jxt-border) !important;
  color: var(--jxt-text) !important;
}

/* Typography text color */
:where(p, h1, h2, h3, h4, h5, h6, span, label, li, dt, dd, blockquote, summary, td, th, caption, figcaption, cite, em, strong, b, i, u, mark, q, abbr, address, pre, code, kbd, samp, var, time, [role="heading"], [role="cell"], [role="rowheader"], [role="columnheader"], [role="listitem"], [contenteditable]) {
  color: var(--jxt-text);
}

/* Muted text */
:where(time, [datetime], small, sub, sup, [class*="muted" i], [class*="secondary" i], [class*="subtle" i], [class*="caption" i], [class*="hint" i], [class*="placeholder" i]) {
  color: var(--jxt-muted);
}

/* Links use accent */
:where(a, a:visited, [role="link"]) {
  color: var(--jxt-accent);
  text-decoration-color: var(--jxt-accent);
}

:where(a:hover, [role="link"]:hover) {
  color: var(--jxt-accent);
  filter: brightness(1.15);
}

/* Form controls => surface */
:where(input, textarea, select, [contenteditable="true"], [contenteditable=""]) {
  background-color: var(--jxt-surface) !important;
  color: var(--jxt-text) !important;
  border-color: var(--jxt-border) !important;
  caret-color: var(--jxt-accent) !important;
}

:where(input, textarea, select):where(:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="submit"]):not([type="button"]):not([type="reset"])) {
  border-radius: var(--jxt-radius) !important;
}

input::placeholder,
textarea::placeholder,
[contenteditable="true"][data-placeholder]::before {
  color: var(--jxt-muted) !important;
  opacity: 0.78 !important;
}

input:focus,
textarea:focus,
select:focus,
[contenteditable="true"]:focus,
[contenteditable=""]:focus {
  border-color: var(--jxt-accent) !important;
  outline: 2px solid var(--jxt-accent-soft) !important;
  outline-offset: 1px !important;
}

/* All buttons: shared radius + readable foreground when not overridden by primary rule below */
:where(button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]) {
  border-radius: var(--jxt-radius) !important;
  accent-color: var(--jxt-accent) !important;
}

/* Primary / submit buttons: full button colour. Multiple variants because
   X.com's sidebar "Post" button has changed identifiers over time. */
input[type="submit"],
input[type="reset"],
button[type="submit"],
[data-testid="SideNav_NewTweet_Button"],
[data-testid="SideNav_NewPost_Button"],
[data-testid="tweetButton"],
[data-testid="tweetButtonInline"],
[data-testid*="NewTweet" i],
[data-testid*="NewPost" i],
[data-testid*="tweetButton" i],
[data-testid="confirmationSheetConfirm"],
a[href="/compose/post"],
a[href="/compose/tweet"],
a[href="/compose"][role="link"],
nav a[aria-label="Post" i],
nav a[aria-label="Posten" i],
[role="button"][aria-label="Post" i]:not([aria-label*="schedule" i]):not([aria-label*="draft" i]),
[role="link"][aria-label="Post" i]:not([aria-label*="schedule" i]) {
  background-color: var(--jxt-button) !important;
  color: var(--jxt-button-text) !important;
  border-color: var(--jxt-button) !important;
}

input[type="submit"] *,
input[type="reset"] *,
button[type="submit"] *,
[data-testid="SideNav_NewTweet_Button"] *,
[data-testid="SideNav_NewPost_Button"] *,
[data-testid="tweetButton"] *,
[data-testid="tweetButtonInline"] *,
[data-testid*="NewTweet" i] *,
[data-testid*="NewPost" i] *,
[data-testid*="tweetButton" i] *,
a[href="/compose/post"] *,
a[href="/compose/tweet"] *,
nav a[aria-label="Post" i] *,
nav a[aria-label="Posten" i] *,
[role="button"][aria-label="Post" i] *,
[role="link"][aria-label="Post" i] * {
  color: var(--jxt-button-text) !important;
}

/* Cover the case where the button's inline style sets a near-white background:
   any anchor/role-button with an inline white background INSIDE the X sidebar */
nav [style*="background-color: rgb(239, 243, 244)" i],
nav [style*="background-color:rgb(239,243,244)" i],
nav [style*="background-color: rgb(247, 249, 249)" i],
nav [style*="background-color:rgb(247,249,249)" i],
[role="navigation"] [style*="background-color: rgb(239, 243, 244)" i],
[role="navigation"] [style*="background-color:rgb(239,243,244)" i],
[role="navigation"] [style*="background-color: rgb(247, 249, 249)" i],
[role="navigation"] [style*="background-color:rgb(247,249,249)" i] {
  background-color: var(--jxt-button) !important;
  color: var(--jxt-button-text) !important;
}

button:disabled,
[role="button"][aria-disabled="true"],
input:disabled {
  opacity: 0.55;
}

/* Tables */
table {
  background-color: var(--jxt-surface) !important;
  color: var(--jxt-text) !important;
  border-color: var(--jxt-border) !important;
}

tr, td, th {
  border-color: var(--jxt-border) !important;
}

thead, tfoot, th {
  background-color: color-mix(in srgb, var(--jxt-surface) 70%, var(--jxt-bg) 30%) !important;
  color: var(--jxt-text) !important;
}

/* Code blocks */
:where(pre, code, kbd, samp, var) {
  background-color: var(--jxt-surface) !important;
  color: var(--jxt-text) !important;
  border-color: var(--jxt-border) !important;
  border-radius: var(--jxt-radius);
}

/* Separators */
hr, [role="separator"] {
  background-color: var(--jxt-border) !important;
  border-color: var(--jxt-border) !important;
  color: var(--jxt-border) !important;
}

/* Border radius for media containers */
:where(img, video, picture, iframe, embed, object, canvas) {
  border-color: var(--jxt-border);
}

/* SVG icons inherit colour from their text context */
svg:not([fill]) {
  fill: currentColor;
}

/* Selected / active tab states */
[role="tab"][aria-selected="true"],
[aria-current="page"],
[aria-current="true"],
[data-state="active"],
[aria-pressed="true"] {
  color: var(--jxt-accent) !important;
  border-color: var(--jxt-accent) !important;
}

/* Selection */
::selection {
  background-color: var(--jxt-accent) !important;
  color: var(--jxt-button-text) !important;
}

/* Scrollbars */
* {
  scrollbar-color: var(--jxt-accent) var(--jxt-bg);
  scrollbar-width: thin;
}

::-webkit-scrollbar {
  width: 12px;
  height: 12px;
  background-color: var(--jxt-bg);
}

::-webkit-scrollbar-thumb {
  background-color: var(--jxt-accent);
  border: 3px solid var(--jxt-bg);
  border-radius: 8px;
}

::-webkit-scrollbar-track {
  background-color: var(--jxt-surface);
}

::-webkit-scrollbar-corner {
  background-color: var(--jxt-bg);
}

/* ---- INLINE STYLE OVERRIDES ----
   Catch common light/white backgrounds and dark/black text from
   inline styles that would otherwise win over class-based rules. */

[style*="background-color:#fff" i],
[style*="background-color: #fff" i],
[style*="background:#fff" i],
[style*="background: #fff" i],
[style*="background-color:white" i],
[style*="background-color: white" i],
[style*="background:white" i],
[style*="background: white" i],
[style*="background-color: rgb(255, 255, 255)" i],
[style*="background-color:rgb(255,255,255)" i],
[style*="background: rgb(255, 255, 255)" i],
[style*="background:rgb(255,255,255)" i],
[style*="background-color: rgb(250" i],
[style*="background-color:rgb(250" i],
[style*="background-color: rgb(248" i],
[style*="background-color:rgb(248" i],
[style*="background-color: rgb(246" i],
[style*="background-color:rgb(246" i],
[style*="background-color: rgb(244" i],
[style*="background-color:rgb(244" i],
[style*="background-color: rgb(242" i],
[style*="background-color:rgb(242" i],
[style*="background-color: rgb(240" i],
[style*="background-color:rgb(240" i] {
  background-color: var(--jxt-surface) !important;
}

[style*="background-color: rgb(0, 0, 0)" i],
[style*="background-color:rgb(0,0,0)" i],
[style*="background-color: rgba(0, 0, 0" i],
[style*="background-color:rgba(0,0,0" i],
[style*="background-color:#000" i],
[style*="background-color: #000" i],
[style*="background:#000" i],
[style*="background: #000" i],
[style*="background-color:black" i],
[style*="background-color: black" i] {
  background-color: var(--jxt-bg) !important;
}

[style*="color:#000" i],
[style*="color: #000" i],
[style*="color:black" i],
[style*="color: black" i],
[style*="color: rgb(0, 0, 0)" i],
[style*="color:rgb(0,0,0)" i],
[style*="color: rgb(20" i],
[style*="color:rgb(20" i],
[style*="color: rgb(30" i],
[style*="color:rgb(30" i],
[style*="color: rgb(33" i],
[style*="color:rgb(33" i],
[style*="color: rgb(36" i],
[style*="color:rgb(36" i],
[style*="color: rgb(40" i],
[style*="color:rgb(40" i] {
  color: var(--jxt-text) !important;
}

[style*="color: rgb(255, 255, 255)" i],
[style*="color:rgb(255,255,255)" i],
[style*="color:#fff" i],
[style*="color: #fff" i],
[style*="color:white" i],
[style*="color: white" i] {
  color: var(--jxt-text) !important;
}

/* Accent colour overrides — X.com blue, GitHub blue, common link blues */
[style*="color: rgb(29, 155, 240)" i],
[style*="color:rgb(29,155,240)" i],
[style*="color: rgb(9, 105, 218)" i],
[style*="color:rgb(9,105,218)" i],
[style*="color: rgb(0, 122, 255)" i],
[style*="color:rgb(0,122,255)" i],
[style*="color: rgb(66, 133, 244)" i],
[style*="color:rgb(66,133,244)" i] {
  color: var(--jxt-accent) !important;
}

[style*="fill: rgb(29, 155, 240)" i],
[style*="fill:rgb(29,155,240)" i] {
  fill: var(--jxt-accent) !important;
}

[style*="background-color: rgb(29, 155, 240)" i],
[style*="background-color:rgb(29,155,240)" i] {
  background-color: var(--jxt-accent) !important;
}

/* X-specific surface neutralisation (kept from previous version) */
[style*="background-color: rgb(22, 24, 28)" i],
[style*="background-color:rgb(22,24,28)" i],
[style*="background-color: rgb(32, 35, 39)" i],
[style*="background-color:rgb(32,35,39)" i] {
  background-color: var(--jxt-surface) !important;
}

[style*="border-color: rgb(47, 51, 54)" i],
[style*="border-color:rgb(47,51,54)" i],
[style*="border-color: rgb(56, 68, 77)" i],
[style*="border-color:rgb(56,68,77)" i] {
  border-color: var(--jxt-border) !important;
}

/* ---- X.com layout polish (only matches on x.com / twitter.com) ---- */

[data-testid="primaryColumn"] {
  border-left: 1px solid var(--jxt-grid-line) !important;
  border-right: 1px solid var(--jxt-grid-line) !important;
}

[data-testid="primaryColumn"] article {
  background-color: var(--jxt-post-bg) !important;
}

[data-testid="primaryColumn"] [role="tablist"],
[data-testid="primaryColumn"] form,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"] {
  border-bottom: 1px solid var(--jxt-grid-line) !important;
}

[data-testid="primaryColumn"] [data-testid="cellInnerDiv"] {
  position: relative !important;
  box-shadow:
    inset 0 -1px 0 var(--jxt-grid-line),
    inset 0 1px 0 color-mix(in srgb, var(--jxt-bg) 78%, var(--jxt-grid-line) 22%) !important;
}

[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]::after {
  content: "" !important;
  position: absolute !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  z-index: 2 !important;
  height: 1px !important;
  pointer-events: none !important;
  background: var(--jxt-grid-line) !important;
}

[data-testid="tweetText"],
[data-testid="tweetText"] * {
  font-size: calc(15px * var(--jxt-font-scale)) !important;
  line-height: 1.45 !important;
}

/* Border radius universal — low specificity so site-specific overrides still win */
:where(input, textarea, select, [role="dialog"], [role="menu"], img, video, picture) {
  border-radius: var(--jxt-radius);
}
`;
  }

  function clearTheme() {
    document.getElementById(STYLE_ID)?.remove();
    stopSurfaceObserver();
    restorePaintedSurfaces();
    currentTheme = null;
    delete document.documentElement.dataset.juliansXtensionActive;
  }

  function startSurfaceObserver() {
    if (surfaceObserver || !document.documentElement) {
      return;
    }

    surfaceObserver = new MutationObserver(() => {
      scheduleSurfacePaint();
    });
    surfaceObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopSurfaceObserver() {
    window.clearTimeout(repaintTimer);
    repaintTimer = null;

    if (surfaceObserver) {
      surfaceObserver.disconnect();
      surfaceObserver = null;
    }
  }

  function scheduleSurfacePaint() {
    if (!currentTheme) {
      return;
    }

    window.clearTimeout(repaintTimer);
    repaintTimer = window.setTimeout(() => {
      paintDynamicSurfaces(currentTheme);
    }, 90);
  }

  function paintDynamicSurfaces(theme) {
    if (!document.body) {
      return;
    }

    const bgRgb = hexToRgb(theme.colors.background);
    const bgIsDark = luminance(bgRgb) < 0.5;

    pruneDisconnectedPaintedElements();

    if (isXHost()) {
      paintXSurfaces(theme);
      return;
    }

    paintGenericSurfaces(theme, bgIsDark);
  }

  function paintXSurfaces(theme) {
    for (const element of paintedElements) {
      paintSurfaceElement(element, theme.colors.surface);
    }

    for (const root of getXSurfaceRoots()) {
      paintSurfaceElement(root, theme.colors.surface);

      for (const element of root.querySelectorAll("*")) {
        if (isElementBackgroundNearBlack(element)) {
          paintSurfaceElement(element, theme.colors.surface);
        }
      }
    }

    for (const element of getXLayoutSurfaceCandidates()) {
      paintSurfaceElement(element, theme.colors.surface);
    }
  }

  function getXLayoutSurfaceCandidates() {
    const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
    const primaryRect = primaryColumn?.getBoundingClientRect();
    const candidates = [];
    const selectors = [
      "div",
      "section",
      "aside",
      "form",
      '[role="region"]',
      '[role="group"]',
      '[role="complementary"]',
      '[aria-label]'
    ].join(",");

    for (const element of document.querySelectorAll(selectors)) {
      if (!isElementBackgroundNearBlack(element)) {
        continue;
      }

      const box = element.getBoundingClientRect();
      if (isRightRailSurface(box, primaryRect) || isComposerSurface(element, box, primaryRect)) {
        candidates.push(element);
      }
    }

    return candidates;
  }

  function isRightRailSurface(box, primaryRect) {
    const rightRailStart = primaryRect
      ? primaryRect.right - 4
      : Math.round(window.innerWidth * 0.58);

    return box.left >= rightRailStart &&
      box.width >= 80 &&
      box.width <= 560 &&
      box.height >= 28 &&
      box.height <= Math.max(900, window.innerHeight);
  }

  function isComposerSurface(element, box, primaryRect) {
    if (!primaryRect || !element.closest('[data-testid="primaryColumn"]')) {
      return false;
    }

    const inPrimaryColumn = box.right >= primaryRect.left &&
      box.left <= primaryRect.right &&
      box.top >= primaryRect.top &&
      box.top <= primaryRect.top + 300;

    return inPrimaryColumn &&
      box.width >= 40 &&
      box.height >= 8;
  }

  function paintGenericSurfaces(theme, bgIsDark) {
    if (!bgIsDark) {
      return;
    }

    const selectors = [
      "header",
      "nav",
      "main",
      "section",
      "article",
      "aside",
      "footer",
      "form",
      "table",
      "thead",
      "tbody",
      '[role="banner"]',
      '[role="navigation"]',
      '[role="main"]',
      '[role="complementary"]',
      '[role="contentinfo"]',
      '[role="region"]',
      '[role="group"]',
      '[role="dialog"]',
      '[role="menu"]',
      '[role="listbox"]',
      '[class*="header" i]',
      '[class*="nav" i]',
      '[class*="card" i]',
      '[class*="panel" i]',
      '[class*="container" i]',
      '[class*="content" i]',
      '[class*="wrapper" i]',
      '[class*="sidebar" i]',
      '[class*="modal" i]',
      '[class*="dialog" i]',
      '[class*="dropdown" i]',
      '[class*="popover" i]',
      '[class*="tooltip" i]'
    ].join(",");

    const elements = document.querySelectorAll(selectors);
    let painted = 0;
    const maxToPaint = 800;

    for (const element of elements) {
      if (painted >= maxToPaint) {
        break;
      }

      if (paintedElements.has(element)) {
        paintSurfaceElement(element, pickSurfaceColor(element, theme));
        painted++;
        continue;
      }

      if (!isElementBackgroundLight(element)) {
        continue;
      }

      const box = element.getBoundingClientRect();
      if (box.width < 24 || box.height < 12) {
        continue;
      }

      paintSurfaceElement(element, pickSurfaceColor(element, theme));
      painted++;
    }
  }

  function pickSurfaceColor(element, theme) {
    const parent = element.parentElement;
    if (!parent) {
      return theme.colors.surface;
    }

    const parentBg = window.getComputedStyle(parent).backgroundColor;
    const parentRgb = parseRgb(parentBg);
    const bgRgb = hexToRgb(theme.colors.background);

    if (parentRgb && colorsCloseEnough(parentRgb, bgRgb)) {
      return theme.colors.surface;
    }

    return theme.colors.background;
  }

  function colorsCloseEnough(a, b) {
    return Math.abs(a.r - b.r) < 12 && Math.abs(a.g - b.g) < 12 && Math.abs(a.b - b.b) < 12;
  }

  function getXSurfaceRoots() {
    return document.querySelectorAll([
      '[data-testid="primaryColumn"] form',
      '[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form)',
      '[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"])',
      '[data-testid="sidebarColumn"] section',
      '[data-testid="sidebarColumn"] [role="complementary"]',
      '[role="complementary"] section',
      'aside section'
    ].join(","));
  }

  function isElementBackgroundLight(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const background = window.getComputedStyle(element).backgroundColor;
    const rgb = parseRgb(background);
    if (!rgb || rgb.a === 0) {
      return false;
    }

    return luminance(rgb) > 0.55;
  }

  function isElementBackgroundNearBlack(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const box = element.getBoundingClientRect();
    if (box.width < 12 || box.height < 8) {
      return false;
    }

    const background = window.getComputedStyle(element).backgroundColor;
    const rgb = parseRgb(background);
    if (!rgb || rgb.a === 0) {
      return false;
    }

    return rgb.r <= 36 && rgb.g <= 40 && rgb.b <= 44;
  }

  function parseRgb(value) {
    const match = String(value || "").match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
    );

    if (!match) {
      return null;
    }

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] === undefined ? 1 : Number(match[4])
    };
  }

  function luminance({ r, g, b }) {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function paintSurfaceElement(element, color) {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    if (!element.dataset.jxtPrevBackgroundStored) {
      element.dataset.jxtPrevBackground = element.style.getPropertyValue("background-color");
      element.dataset.jxtPrevBackgroundPriority = element.style.getPropertyPriority("background-color");
      element.dataset.jxtPrevBackgroundStored = "true";
    }

    element.dataset.jxtDynamicSurface = "true";
    element.style.setProperty("background-color", color, "important");
    paintedElements.add(element);
  }

  function restorePaintedSurfaces() {
    for (const element of paintedElements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      const previous = element.dataset.jxtPrevBackground || "";
      const priority = element.dataset.jxtPrevBackgroundPriority || "";

      if (previous) {
        element.style.setProperty("background-color", previous, priority);
      } else {
        element.style.removeProperty("background-color");
      }

      delete element.dataset.jxtPrevBackground;
      delete element.dataset.jxtPrevBackgroundPriority;
      delete element.dataset.jxtPrevBackgroundStored;
      delete element.dataset.jxtDynamicSurface;
    }

    paintedElements.clear();
  }

  function pruneDisconnectedPaintedElements() {
    for (const element of paintedElements) {
      if (!element.isConnected) {
        paintedElements.delete(element);
      }
    }
  }

  function getOrCreateStyle() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
      return existing;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "JuliansXtension";
    (document.head || document.documentElement).append(style);
    return style;
  }

  function normalizeTheme(value) {
    if (isPlainObject(value) && value.theme) {
      return normalizeTheme(value.theme);
    }

    if (typeof value === "string") {
      return buildThemeFromAccent(value);
    }

    if (!isPlainObject(value)) {
      return null;
    }

    if (typeof value.color === "string") {
      return buildThemeFromAccent(value.color);
    }

    const colors = {};
    const sourceColors = isPlainObject(value.colors) ? value.colors : {};

    for (const key of COLOR_KEYS) {
      colors[key] = normalizeColor(sourceColors[key]) || DEFAULT_THEME.colors[key];
    }

    return {
      version: THEME_VERSION,
      colors,
      fontScale: clampNumber(value.fontScale, 85, 130, DEFAULT_THEME.fontScale),
      radius: clampNumber(value.radius, 0, 28, DEFAULT_THEME.radius),
      spacing: clampNumber(value.spacing, 85, 120, DEFAULT_THEME.spacing),
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : undefined
    };
  }

  function buildThemeFromAccent(color) {
    const accent = normalizeColor(color);
    if (!accent) {
      return null;
    }

    return {
      ...cloneTheme(DEFAULT_THEME),
      colors: {
        ...DEFAULT_THEME.colors,
        accent,
        button: accent
      }
    };
  }

  function cloneTheme(theme) {
    return {
      ...theme,
      colors: {
        ...theme.colors
      }
    };
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function normalizeHost(hostname) {
    return String(hostname || "").replace(/^www\./i, "").toLowerCase();
  }

  function isXHost() {
    return host === "x.com" ||
      host.endsWith(".x.com") ||
      host === "twitter.com" ||
      host.endsWith(".twitter.com");
  }

  function normalizeColor(color) {
    if (typeof color !== "string") {
      return null;
    }

    const normalized = color.trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
  }

  function hexToRgb(color) {
    const value = color.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
})();
