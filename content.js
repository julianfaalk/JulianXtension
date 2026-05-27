(() => {
  if (window.__xthemesLoaded === true) {
    return;
  }
  window.__xthemesLoaded = true;

  const STYLE_ID = "xthemes-style";
  const STORAGE_KEY = "xthemes.active";
  const MESSAGE_TYPES = {
    ping: "XTHEMES_PING",
    applyTheme: "XTHEMES_APPLY",
    clearTheme: "XTHEMES_CLEAR"
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
  const DEFAULT_COLORS = {
    background: "#15202b",
    surface: "#1c2733",
    text: "#f5f8fa",
    mutedText: "#8899a6",
    accent: "#1d9bf0",
    button: "#1d9bf0",
    buttonText: "#ffffff",
    border: "#38444d"
  };

  const paintedElements = new Set();
  let currentPreset = null;
  let paintTimer = null;
  let observer = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === MESSAGE_TYPES.ping) {
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === MESSAGE_TYPES.applyTheme) {
      const preset = normalizePreset(message.preset);
      if (!preset) {
        sendResponse({ ok: false });
        return true;
      }
      applyTheme(preset);
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

    const preset = normalizePreset(changes[STORAGE_KEY].newValue);
    if (preset) {
      applyTheme(preset);
    } else {
      clearTheme();
    }
  });

  loadStoredTheme();

  async function loadStoredTheme() {
    try {
      const stored = await chrome.storage.local.get({ [STORAGE_KEY]: null });
      const preset = normalizePreset(stored[STORAGE_KEY]);
      if (preset) {
        applyTheme(preset);
      }
    } catch (_error) {
      /* no-op */
    }
  }

  function applyTheme(preset) {
    currentPreset = preset;
    getOrCreateStyle().textContent = buildCss(preset);
    document.documentElement.dataset.xthemesActive = preset.id || "custom";
    startObserver();
    schedulePaint();
  }

  function clearTheme() {
    document.getElementById(STYLE_ID)?.remove();
    stopObserver();
    restorePaintedSurfaces();
    currentPreset = null;
    delete document.documentElement.dataset.xthemesActive;
  }

  function buildCss(preset) {
    const c = preset.colors;
    const accentRgb = hexToRgb(c.accent);
    const buttonRgb = hexToRgb(c.button);

    return `
:root, html {
  --xt-bg: ${c.background};
  --xt-surface: ${c.surface};
  --xt-text: ${c.text};
  --xt-muted: ${c.mutedText};
  --xt-accent: ${c.accent};
  --xt-accent-soft: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.16);
  --xt-button: ${c.button};
  --xt-button-soft: rgba(${buttonRgb.r}, ${buttonRgb.g}, ${buttonRgb.b}, 0.18);
  --xt-button-text: ${c.buttonText};
  --xt-border: ${c.border};
  --xt-grid-line: color-mix(in srgb, var(--xt-border) 60%, var(--xt-text) 40%);
  --xt-post-bg: color-mix(in srgb, var(--xt-bg) 90%, var(--xt-surface) 10%);
  color-scheme: dark !important;
  accent-color: var(--xt-accent) !important;
  caret-color: var(--xt-accent) !important;
}

html, body {
  background-color: var(--xt-bg) !important;
  color: var(--xt-text) !important;
}

/* Major layout regions */
body,
main,
[role="main"],
header[role="banner"],
nav[role="navigation"],
[data-testid="primaryColumn"],
[data-testid="sidebarColumn"],
[data-testid="primaryColumn"] > div,
[data-testid="sidebarColumn"] > div,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"],
[data-testid="primaryColumn"] [role="tablist"],
aside,
[role="complementary"] {
  background-color: var(--xt-bg) !important;
  color: var(--xt-text) !important;
}

/* Cards, dialogs, search, sidebar sections => surface */
[data-testid="sidebarColumn"] section,
[data-testid="sidebarColumn"] [aria-label],
[data-testid="sidebarColumn"] [role="complementary"] section,
[role="complementary"] section,
aside section,
[data-testid="primaryColumn"] form,
[data-testid="primaryColumn"] form > div,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form),
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]),
[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"],
[data-testid="primaryColumn"] [data-testid="toolBar"],
[data-testid="primaryColumn"] [data-testid="toolBar"] > div,
[role="search"],
[role="search"] *,
[role="dialog"],
[role="alertdialog"],
[role="menu"],
[role="listbox"],
[data-testid="HoverCard"],
[role="tooltip"] {
  background-color: var(--xt-surface) !important;
  border-color: var(--xt-border) !important;
  color: var(--xt-text) !important;
}

/* Typography */
:where(p, h1, h2, h3, h4, h5, h6, li, label, summary, blockquote, [role="heading"], [data-testid="tweetText"], [data-testid="tweetText"] *, [data-testid="UserName"] *, [data-testid="User-Name"] *),
[style*="color: rgb(231, 233, 234)"],
[style*="color:rgb(231,233,234)"],
[style*="color: rgb(247, 249, 249)"],
[style*="color:rgb(247,249,249)"],
[style*="color: rgb(15, 20, 25)"],
[style*="color:rgb(15,20,25)"] {
  color: var(--xt-text) !important;
}

/* Muted (timestamps, secondary text) */
:where(time, [datetime], small, figcaption),
[style*="color: rgb(113, 118, 123)"],
[style*="color:rgb(113,118,123)"],
[style*="color: rgb(139, 152, 165)"],
[style*="color:rgb(139,152,165)"],
[style*="color: rgb(83, 100, 113)"],
[style*="color:rgb(83,100,113)"] {
  color: var(--xt-muted) !important;
}

/* Links & accent text */
a[href],
a:visited,
[role="link"] {
  color: var(--xt-accent) !important;
  text-decoration-color: var(--xt-accent) !important;
}

/* X.com accent-blue text/icons/fills */
[style*="color: rgb(29, 155, 240)"],
[style*="color:rgb(29,155,240)"],
[style*="color: rgb(29, 161, 242)"],
[style*="color:rgb(29,161,242)"],
[style*="fill: rgb(29, 155, 240)"],
[style*="fill:rgb(29,155,240)"],
[style*="fill: rgb(29, 161, 242)"],
[style*="fill:rgb(29,161,242)"] {
  color: var(--xt-accent) !important;
  fill: var(--xt-accent) !important;
}

[style*="background-color: rgb(29, 155, 240)"],
[style*="background-color:rgb(29,155,240)"],
[style*="background-color: rgb(29, 161, 242)"],
[style*="background-color:rgb(29,161,242)"] {
  background-color: var(--xt-accent) !important;
}

/* X.com near-black surface inline styles => surface */
div[style*="background-color: rgb(0, 0, 0)"],
div[style*="background-color:rgb(0,0,0)"],
div[style*="background-color: rgba(0, 0, 0"],
div[style*="background-color:rgba(0,0,0"],
[style*="background-color: rgb(22, 24, 28)"],
[style*="background-color:rgb(22,24,28)"],
[style*="background-color: rgb(32, 35, 39)"],
[style*="background-color:rgb(32,35,39)"],
[style*="background-color: rgb(21, 32, 43)"],
[style*="background-color:rgb(21,32,43)"] {
  background-color: var(--xt-bg) !important;
}

[data-testid="sidebarColumn"] [style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] [style*="background-color:rgb(0,0,0)"],
[data-testid="sidebarColumn"] section [style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] section [style*="background-color:rgb(0,0,0)"],
[role="complementary"] section[style*="background-color: rgb(0, 0, 0)"],
aside section[style*="background-color: rgb(0, 0, 0)"] {
  background-color: var(--xt-surface) !important;
}

/* X.com light/white inline backgrounds (X's light buttons in dim mode) => button colour */
[style*="background-color: rgb(239, 243, 244)"],
[style*="background-color:rgb(239,243,244)"],
[style*="background-color: rgb(247, 249, 249)"],
[style*="background-color:rgb(247,249,249)"],
[style*="background-color: rgb(255, 255, 255)"],
[style*="background-color:rgb(255,255,255)"] {
  background-color: var(--xt-button) !important;
  color: var(--xt-button-text) !important;
}

/* X.com border-color inline styles */
[style*="border-color: rgb(47, 51, 54)"],
[style*="border-color:rgb(47,51,54)"],
[style*="border-color: rgb(56, 68, 77)"],
[style*="border-color:rgb(56,68,77)"],
[style*="border-color: rgb(239, 243, 244)"],
[style*="border-color:rgb(239,243,244)"] {
  border-color: var(--xt-border) !important;
}

/* Inputs */
input,
textarea,
select,
[contenteditable="true"],
[data-testid="SearchBox_Search_Input"],
[data-testid="SearchBox_Search_Input"] *,
[aria-label="Search query"],
[aria-label="Search query"] * {
  background-color: var(--xt-surface) !important;
  border-color: var(--xt-border) !important;
  color: var(--xt-text) !important;
  caret-color: var(--xt-accent) !important;
}

input::placeholder,
textarea::placeholder {
  color: var(--xt-muted) !important;
}

input:focus,
textarea:focus,
select:focus,
[contenteditable="true"]:focus {
  border-color: var(--xt-accent) !important;
  outline: 2px solid var(--xt-accent-soft) !important;
  outline-offset: 1px !important;
}

/* Primary X buttons: tweet, post, follow, confirm */
[data-testid="SideNav_NewTweet_Button"],
[data-testid="SideNav_NewPost_Button"],
[data-testid*="tweetButton" i],
[data-testid*="NewTweet" i],
[data-testid*="NewPost" i],
[data-testid="confirmationSheetConfirm"],
a[href="/compose/post"],
a[href="/compose/tweet"],
[role="button"][data-testid="SideNav_NewTweet_Button"],
[role="button"][data-testid*="tweetButton" i],
button[type="submit"]:not(:disabled),
input[type="submit"]:not(:disabled) {
  background-color: var(--xt-button) !important;
  color: var(--xt-button-text) !important;
  border-color: var(--xt-button) !important;
}

[data-testid="SideNav_NewTweet_Button"] *,
[data-testid="SideNav_NewPost_Button"] *,
[data-testid*="tweetButton" i] *,
[data-testid*="NewTweet" i] *,
[data-testid*="NewPost" i] *,
[data-testid="confirmationSheetConfirm"] *,
a[href="/compose/post"] *,
a[href="/compose/tweet"] *,
button[type="submit"]:not(:disabled) *,
input[type="submit"]:not(:disabled) * {
  color: var(--xt-button-text) !important;
  fill: currentColor;
}

/* Follow / secondary outlined buttons */
[data-testid$="-follow"],
[data-testid$="-unfollow"],
[data-testid="UserCell"] [role="button"] {
  border-color: var(--xt-border) !important;
}

/* Active tabs / selected nav items */
[role="tab"][aria-selected="true"],
[role="tab"][aria-selected="true"] *,
[aria-current="page"],
[aria-current="page"] *,
[data-state="active"],
[aria-pressed="true"] {
  color: var(--xt-accent) !important;
}

[role="tab"][aria-selected="true"] div,
[role="tab"][aria-selected="true"] span:last-child,
[style*="border-color: rgb(29, 155, 240)"],
[style*="border-color:rgb(29,155,240)"] {
  border-color: var(--xt-accent) !important;
}

/* Article media/quoted cards: keep their borders themed */
[data-testid="primaryColumn"] article [role="link"]:has(img),
[data-testid="primaryColumn"] article [data-testid="card.wrapper"],
[data-testid="primaryColumn"] article [data-testid="tweet"] {
  border-color: var(--xt-border) !important;
}

hr,
[role="separator"] {
  border-color: var(--xt-border) !important;
  background-color: var(--xt-border) !important;
}

/* SVG icons inherit colour */
svg {
  color: currentColor;
}

/* Selection */
::selection {
  background: var(--xt-accent-soft) !important;
  color: var(--xt-text) !important;
}

/* Scrollbar */
* {
  scrollbar-color: var(--xt-accent) var(--xt-bg);
}
`;
  }

  /* ---- Dynamic surface painter (catches dynamically inserted near-black bg) ---- */

  function startObserver() {
    if (observer || !document.documentElement) {
      return;
    }
    observer = new MutationObserver(() => schedulePaint());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserver() {
    window.clearTimeout(paintTimer);
    paintTimer = null;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function schedulePaint() {
    if (!currentPreset) {
      return;
    }
    window.clearTimeout(paintTimer);
    paintTimer = window.setTimeout(() => paintSurfaces(currentPreset), 90);
  }

  function paintSurfaces(preset) {
    if (!document.body) {
      return;
    }
    pruneDisconnectedPainted();

    for (const element of paintedElements) {
      paintElement(element, preset.colors.surface);
    }

    for (const root of getSurfaceRoots()) {
      paintElement(root, preset.colors.surface);
      for (const element of root.querySelectorAll("*")) {
        if (isNearBlackBackground(element)) {
          paintElement(element, preset.colors.surface);
        }
      }
    }

    for (const element of getLayoutSurfaceCandidates()) {
      paintElement(element, preset.colors.surface);
    }
  }

  function getSurfaceRoots() {
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

  function getLayoutSurfaceCandidates() {
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
      if (!isNearBlackBackground(element)) {
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

    return inPrimaryColumn && box.width >= 40 && box.height >= 8;
  }

  function isNearBlackBackground(element) {
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

  function paintElement(element, color) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (!element.dataset.xtPrevBgStored) {
      element.dataset.xtPrevBg = element.style.getPropertyValue("background-color");
      element.dataset.xtPrevBgPriority = element.style.getPropertyPriority("background-color");
      element.dataset.xtPrevBgStored = "true";
    }
    element.dataset.xtPainted = "true";
    element.style.setProperty("background-color", color, "important");
    paintedElements.add(element);
  }

  function restorePaintedSurfaces() {
    for (const element of paintedElements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }
      const previous = element.dataset.xtPrevBg || "";
      const priority = element.dataset.xtPrevBgPriority || "";
      if (previous) {
        element.style.setProperty("background-color", previous, priority);
      } else {
        element.style.removeProperty("background-color");
      }
      delete element.dataset.xtPrevBg;
      delete element.dataset.xtPrevBgPriority;
      delete element.dataset.xtPrevBgStored;
      delete element.dataset.xtPainted;
    }
    paintedElements.clear();
  }

  function pruneDisconnectedPainted() {
    for (const element of paintedElements) {
      if (!element.isConnected) {
        paintedElements.delete(element);
      }
    }
  }

  function getOrCreateStyle() {
    let style = document.getElementById(STYLE_ID);
    if (style) {
      return style;
    }
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "XThemes";
    (document.head || document.documentElement).append(style);
    return style;
  }

  /* ---- Validation / normalisation ---- */

  function normalizePreset(value) {
    if (!isPlainObject(value)) {
      return null;
    }

    const sourceColors = isPlainObject(value.colors) ? value.colors : {};
    const colors = {};
    for (const key of COLOR_KEYS) {
      colors[key] = normalizeColor(sourceColors[key]) || DEFAULT_COLORS[key];
    }

    return {
      id: typeof value.id === "string" ? value.id : "custom",
      name: typeof value.name === "string" ? value.name : "Custom",
      colors
    };
  }

  function normalizeColor(value) {
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim().toLowerCase();
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
