(() => {
  if (window.__juliansXtensionLoadedVersion === 2) {
    return;
  }

  window.__juliansXtensionLoaded = true;
  window.__juliansXtensionLoadedVersion = 2;

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
  const xPaintedElements = new Set();
  let currentTheme = null;
  let xRepaintTimer = null;
  let xSurfaceObserver = null;

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
    const style = getOrCreateStyle();

    currentTheme = theme;
    style.textContent = buildThemeCss(theme, accentRgb, buttonRgb);
    document.documentElement.dataset.juliansXtensionActive = "true";

    if (isXHost()) {
      startXSurfaceObserver();
      scheduleXSurfacePaint();
    }
  }

  function buildThemeCss(theme, accentRgb, buttonRgb) {
    const colors = theme.colors;
    const radius = `${theme.radius}px`;
    const fontScale = String(theme.fontScale / 100);
    const spacing = String(theme.spacing / 100);

    return `
:root {
  --jxt-bg: ${colors.background};
  --jxt-surface: ${colors.surface};
  --jxt-text: ${colors.text};
  --jxt-muted: ${colors.mutedText};
  --jxt-accent: ${colors.accent};
  --jxt-accent-soft: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.14);
  --jxt-button: ${colors.button};
  --jxt-button-soft: rgba(${buttonRgb.r}, ${buttonRgb.g}, ${buttonRgb.b}, 0.16);
  --jxt-button-text: ${colors.buttonText};
  --jxt-border: ${colors.border};
  --jxt-radius: ${radius};
  --jxt-font-scale: ${fontScale};
  --jxt-spacing: ${spacing};
  accent-color: var(--jxt-accent) !important;
}

html {
  background: var(--jxt-bg) !important;
  font-size: calc(100% * var(--jxt-font-scale)) !important;
}

body {
  background: var(--jxt-bg) !important;
  color: var(--jxt-text) !important;
}

body,
main,
[role="main"],
[data-testid="primaryColumn"],
[data-testid="sidebarColumn"],
[data-testid="primaryColumn"] > div,
[data-testid="sidebarColumn"] > div,
[data-testid="primaryColumn"] article,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"],
[data-testid="primaryColumn"] [role="tablist"],
[data-testid="primaryColumn"] [role="tablist"] > div,
header[role="banner"],
nav[role="navigation"],
aside {
  background-color: var(--jxt-bg) !important;
  color: var(--jxt-text) !important;
}

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
[role="menu"],
[role="listbox"],
[data-testid="HoverCard"],
[role="tooltip"] {
  background-color: var(--jxt-surface) !important;
  border-color: var(--jxt-border) !important;
  color: var(--jxt-text) !important;
}

:where(p, h1, h2, h3, h4, h5, h6, li, label, summary, blockquote, [role="heading"], [data-testid="tweetText"], [data-testid="tweetText"] *),
[style*="color: rgb(231, 233, 234)"],
[style*="color:rgb(231,233,234)"],
[style*="color: rgb(247, 249, 249)"],
[style*="color:rgb(247,249,249)"] {
  color: var(--jxt-text) !important;
}

:where(time, [datetime], small, figcaption, [style*="color: rgb(113, 118, 123)"], [style*="color:rgb(113,118,123)"]),
[style*="color: rgb(139, 152, 165)"],
[style*="color:rgb(139,152,165)"] {
  color: var(--jxt-muted) !important;
}

a[href],
a:visited,
[role="link"] {
  color: var(--jxt-accent) !important;
}

svg,
svg * {
  color: currentColor;
}

input,
textarea,
select,
[contenteditable="true"],
[data-testid="SearchBox_Search_Input"],
[data-testid="SearchBox_Search_Input"] *,
[aria-label="Search query"],
[aria-label="Search query"] * {
  background-color: var(--jxt-surface) !important;
  border-color: var(--jxt-border) !important;
  color: var(--jxt-text) !important;
}

input::placeholder,
textarea::placeholder {
  color: var(--jxt-muted) !important;
}

input:focus,
textarea:focus,
select:focus,
[contenteditable="true"]:focus {
  border-color: var(--jxt-accent) !important;
  outline: 2px solid var(--jxt-accent) !important;
  outline-offset: 2px !important;
}

button,
[role="button"],
input[type="button"],
input[type="reset"],
input[type="submit"] {
  border-color: var(--jxt-button) !important;
}

button:not(:disabled):hover,
[role="button"]:not([aria-disabled="true"]):hover {
  box-shadow: inset 0 0 0 999px var(--jxt-button-soft) !important;
}

button[type="submit"]:not(:disabled),
input[type="submit"]:not(:disabled),
[role="button"][data-testid*="tweetButton" i],
[role="button"][data-testid="SideNav_NewTweet_Button"],
[data-testid="confirmationSheetConfirm"] {
  background-color: var(--jxt-button) !important;
  border-color: var(--jxt-button) !important;
  color: var(--jxt-button-text) !important;
}

button[type="submit"]:not(:disabled) *,
input[type="submit"]:not(:disabled) *,
[role="button"][data-testid*="tweetButton" i] *,
[role="button"][data-testid="SideNav_NewTweet_Button"] *,
[data-testid="confirmationSheetConfirm"] * {
  color: var(--jxt-button-text) !important;
}

[role="tab"][aria-selected="true"],
[role="tab"][aria-selected="true"] *,
[aria-current="page"],
[aria-current="page"] *,
[data-state="active"],
[data-active="true"],
[aria-pressed="true"] {
  border-color: var(--jxt-accent) !important;
  color: var(--jxt-accent) !important;
}

[role="tab"][aria-selected="true"] div,
[role="tab"][aria-selected="true"] span:last-child,
[style*="border-color: rgb(29, 155, 240)"],
[style*="border-color:rgb(29,155,240)"] {
  border-color: var(--jxt-accent) !important;
}

[style*="color: rgb(29, 155, 240)"],
[style*="color:rgb(29,155,240)"],
[style*="fill: rgb(29, 155, 240)"],
[style*="fill:rgb(29,155,240)"] {
  color: var(--jxt-accent) !important;
  fill: var(--jxt-accent) !important;
}

[style*="background-color: rgb(29, 155, 240)"],
[style*="background-color:rgb(29,155,240)"] {
  background-color: var(--jxt-accent) !important;
}

div[style*="background-color: rgb(0, 0, 0)"],
div[style*="background-color:rgb(0,0,0)"],
div[style*="background-color: rgba(0, 0, 0"],
div[style*="background-color:rgba(0,0,0"] {
  background-color: var(--jxt-bg) !important;
}

div[style*="background-color: rgb(22, 24, 28)"],
div[style*="background-color:rgb(22,24,28)"],
div[style*="background-color: rgb(32, 35, 39)"],
div[style*="background-color:rgb(32,35,39)"] {
  background-color: var(--jxt-surface) !important;
}

[data-testid="primaryColumn"] form div[style*="background-color: rgb(0, 0, 0)"],
[data-testid="primaryColumn"] form div[style*="background-color:rgb(0,0,0)"],
[data-testid="primaryColumn"] form div[style*="background-color: rgba(0, 0, 0"],
[data-testid="primaryColumn"] form div[style*="background-color:rgba(0,0,0"],
[data-testid="primaryColumn"] form [style*="background-color: rgb(0, 0, 0)"],
[data-testid="primaryColumn"] form [style*="background-color:rgb(0,0,0)"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form) [style*="background-color: rgb(0, 0, 0)"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form) [style*="background-color:rgb(0,0,0)"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form) [style*="background-color: rgba(0, 0, 0"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form) [style*="background-color:rgba(0,0,0"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]) [style*="background-color: rgb(0, 0, 0)"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]) [style*="background-color:rgb(0,0,0)"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]) [style*="background-color: rgba(0, 0, 0"],
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]) [style*="background-color:rgba(0,0,0"],
[data-testid="sidebarColumn"] section[style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] section[style*="background-color:rgb(0,0,0)"],
[data-testid="sidebarColumn"] section[style*="background-color: rgba(0, 0, 0"],
[data-testid="sidebarColumn"] section[style*="background-color:rgba(0,0,0"],
[data-testid="sidebarColumn"] section div[style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] section div[style*="background-color:rgb(0,0,0)"],
[data-testid="sidebarColumn"] section div[style*="background-color: rgba(0, 0, 0"],
[data-testid="sidebarColumn"] section div[style*="background-color:rgba(0,0,0"],
[data-testid="sidebarColumn"] section [style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] section [style*="background-color:rgb(0,0,0)"],
[data-testid="sidebarColumn"] [style*="background-color: rgb(0, 0, 0)"],
[data-testid="sidebarColumn"] [style*="background-color:rgb(0,0,0)"],
[data-testid="sidebarColumn"] [style*="background-color: rgba(0, 0, 0"],
[data-testid="sidebarColumn"] [style*="background-color:rgba(0,0,0"],
[data-testid="sidebarColumn"] [style*="background-color: rgb(0, 0, 0)"]:has(h1, h2, h3, [role="heading"]),
[data-testid="sidebarColumn"] [style*="background-color:rgb(0,0,0)"]:has(h1, h2, h3, [role="heading"]),
[role="complementary"] section[style*="background-color: rgb(0, 0, 0)"],
[role="complementary"] section[style*="background-color:rgb(0,0,0)"],
[role="complementary"] section [style*="background-color: rgb(0, 0, 0)"],
[role="complementary"] section [style*="background-color:rgb(0,0,0)"],
aside section[style*="background-color: rgb(0, 0, 0)"],
aside section[style*="background-color:rgb(0,0,0)"],
aside section [style*="background-color: rgb(0, 0, 0)"],
aside section [style*="background-color:rgb(0,0,0)"] {
  background-color: var(--jxt-surface) !important;
}

[style*="border-color: rgb(47, 51, 54)"],
[style*="border-color:rgb(47,51,54)"],
[style*="border-color: rgb(56, 68, 77)"],
[style*="border-color:rgb(56,68,77)"] {
  border-color: var(--jxt-border) !important;
}

hr,
[role="separator"],
:where(article, section, aside, nav, header, footer, input, textarea, select) {
  border-color: var(--jxt-border) !important;
}

:where(button, [role="button"], input, textarea, select, article, [role="dialog"], [role="menu"], img, video) {
  border-radius: var(--jxt-radius) !important;
}

[data-testid="primaryColumn"] article,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"] {
  padding-block: calc(8px * var(--jxt-spacing)) !important;
}

:where(button, [role="button"]) {
  padding-inline: calc(14px * var(--jxt-spacing));
}

[data-testid="tweetText"],
[data-testid="tweetText"] * {
  font-size: calc(15px * var(--jxt-font-scale)) !important;
  line-height: 1.45 !important;
}

progress,
meter {
  accent-color: var(--jxt-accent) !important;
}

::selection {
  background: var(--jxt-accent-soft) !important;
  color: var(--jxt-text) !important;
}

* {
  scrollbar-color: var(--jxt-accent) var(--jxt-bg);
}
`;
  }

  function clearTheme() {
    document.getElementById(STYLE_ID)?.remove();
    stopXSurfaceObserver();
    restoreXPaintedSurfaces();
    currentTheme = null;
    delete document.documentElement.dataset.juliansXtensionActive;
  }

  function startXSurfaceObserver() {
    if (xSurfaceObserver || !document.documentElement) {
      return;
    }

    xSurfaceObserver = new MutationObserver(() => {
      scheduleXSurfacePaint();
    });
    xSurfaceObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopXSurfaceObserver() {
    window.clearTimeout(xRepaintTimer);
    xRepaintTimer = null;

    if (xSurfaceObserver) {
      xSurfaceObserver.disconnect();
      xSurfaceObserver = null;
    }
  }

  function scheduleXSurfacePaint() {
    if (!currentTheme || !isXHost()) {
      return;
    }

    window.clearTimeout(xRepaintTimer);
    xRepaintTimer = window.setTimeout(() => {
      paintXDynamicSurfaces(currentTheme);
    }, 80);
  }

  function paintXDynamicSurfaces(theme) {
    if (!document.body) {
      return;
    }

    pruneDisconnectedPaintedElements();
    for (const element of xPaintedElements) {
      paintSurfaceElement(element, theme.colors.surface);
    }

    for (const root of getXSurfaceRoots()) {
      paintSurfaceElement(root, theme.colors.surface);

      for (const element of root.querySelectorAll("*")) {
        if (shouldPaintXSurface(element)) {
          paintSurfaceElement(element, theme.colors.surface);
        }
      }
    }
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

  function shouldPaintXSurface(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const box = element.getBoundingClientRect();
    if (box.width < 12 || box.height < 8) {
      return false;
    }

    const background = window.getComputedStyle(element).backgroundColor;
    return isNearBlackBackground(background);
  }

  function isNearBlackBackground(value) {
    const rgb = parseRgb(value);
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
    xPaintedElements.add(element);
  }

  function restoreXPaintedSurfaces() {
    for (const element of xPaintedElements) {
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

    xPaintedElements.clear();
  }

  function pruneDisconnectedPaintedElements() {
    for (const element of xPaintedElements) {
      if (!element.isConnected) {
        xPaintedElements.delete(element);
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
