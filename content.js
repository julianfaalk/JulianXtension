(() => {
  if (window.__xthemesLoaded === true) {
    return;
  }
  window.__xthemesLoaded = true;

  const STYLE_ID = "xthemes-style";
  const HIDES_STYLE_ID = "xthemes-hides-style";
  const STORAGE_KEY = "xthemes.active";
  const HIDE_KEYS = {
    trends: "x.hideTrends",
    whoToFollow: "x.hideWhoToFollow",
    grok: "x.hideGrok"
  };
  const HIDE_CLASS = {
    trends: "julians-tweaks-x-hide-trends",
    whoToFollow: "julians-tweaks-x-hide-wtf",
    grok: "julians-tweaks-x-hide-grok"
  };
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
    if (areaName !== "local") {
      return;
    }
    if (changes[STORAGE_KEY]) {
      const preset = normalizePreset(changes[STORAGE_KEY].newValue);
      if (preset) {
        applyTheme(preset);
      } else {
        clearTheme();
      }
    }
    for (const [name, key] of Object.entries(HIDE_KEYS)) {
      if (changes[key]) {
        toggleHide(name, Boolean(changes[key].newValue));
      }
    }
  });

  loadStoredTheme();
  loadStoredHides();

  async function loadStoredHides() {
    try {
      const defaults = Object.fromEntries(Object.values(HIDE_KEYS).map((k) => [k, false]));
      const stored = await chrome.storage.local.get(defaults);
      ensureHidesStyle();
      for (const [name, key] of Object.entries(HIDE_KEYS)) {
        toggleHide(name, Boolean(stored[key]));
      }
    } catch (_error) {
      /* no-op */
    }
  }

  function toggleHide(name, on) {
    ensureHidesStyle();
    const klass = HIDE_CLASS[name];
    if (!klass) {
      return;
    }
    if (document.documentElement) {
      document.documentElement.classList.toggle(klass, on);
    } else {
      window.requestAnimationFrame(() => toggleHide(name, on));
    }
  }

  function ensureHidesStyle() {
    if (document.getElementById(HIDES_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = HIDES_STYLE_ID;
    style.dataset.owner = "JuliansTweaks";
    style.textContent = HIDES_CSS;
    (document.head || document.documentElement).append(style);
  }

  const HIDES_CSS = `
/* ---- Hide "What's happening" / Trends panel ---- */
html.${HIDE_CLASS.trends} [data-testid="sidebarColumn"] [aria-label*="Trending" i],
html.${HIDE_CLASS.trends} [data-testid="sidebarColumn"] [aria-label*="What's happening" i],
html.${HIDE_CLASS.trends} [data-testid="sidebarColumn"] [aria-label*="Was passiert" i],
html.${HIDE_CLASS.trends} [data-testid="sidebarColumn"] section:has([aria-label*="Trend" i]),
html.${HIDE_CLASS.trends} [data-testid="trend"],
html.${HIDE_CLASS.trends} [data-testid="sidebarColumn"] [data-testid="placementTracking"]:has([data-testid="trend"]) {
  display: none !important;
}

/* ---- Hide "Who to follow" / Wem folgen ---- */
html.${HIDE_CLASS.whoToFollow} [data-testid="sidebarColumn"] [aria-label*="Who to follow" i],
html.${HIDE_CLASS.whoToFollow} [data-testid="sidebarColumn"] [aria-label*="Wem folgen" i],
html.${HIDE_CLASS.whoToFollow} [data-testid="sidebarColumn"] section:has([aria-label*="follow" i]),
html.${HIDE_CLASS.whoToFollow} [data-testid="UserCell"],
html.${HIDE_CLASS.whoToFollow} aside section:has([data-testid$="-follow"]),
html.${HIDE_CLASS.whoToFollow} [data-testid="sidebarColumn"] [data-testid="placementTracking"]:has([data-testid="UserCell"]) {
  display: none !important;
}

/* ---- Hide Grok button ---- */
html.${HIDE_CLASS.grok} [aria-label="Grok" i],
html.${HIDE_CLASS.grok} a[href="/i/grok"],
html.${HIDE_CLASS.grok} a[href$="/grok"],
html.${HIDE_CLASS.grok} [data-testid="DM_Tweet_Compose_Reply_Button"][aria-label*="Grok" i],
html.${HIDE_CLASS.grok} [aria-label*="Grok" i][role="button"],
html.${HIDE_CLASS.grok} nav a:has([aria-label*="Grok" i]),
html.${HIDE_CLASS.grok} [data-testid="primaryColumn"] [aria-label*="Grok" i],
html.${HIDE_CLASS.grok} button[aria-label="Grok" i],
html.${HIDE_CLASS.grok} div:has(> button[aria-label="Grok" i]):not(nav) {
  display: none !important;
}
`;

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

html,
body,
html body,
#react-root,
#react-root > div {
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

/* Right-rail cards, dialogs, search overlays => surface (visually distinct
   from the page bg by design — they're "panels") */
[data-testid="sidebarColumn"] section,
[data-testid="sidebarColumn"] [aria-label],
[data-testid="sidebarColumn"] [role="complementary"] section,
[role="complementary"] section,
aside section,
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

/* ============================================================
   COMPOSE / TWEET TEXTAREA / TOOLBAR
   Force everything in the compose area flush with --xt-bg so the
   textarea reads as a single seamless surface, not a stack of
   slightly-different-coloured tiles. Three layers of coverage:
     1. Dialog/form wrappers (outer)
     2. Toolbar (bottom)
     3. tweetTextarea_0 + Draft.js editor classes (inner)
   ============================================================ */

/* --- Layer 1: outer wrappers --- */
[data-testid="primaryColumn"] form,
[data-testid="primaryColumn"] form > div,
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has(form),
[data-testid="primaryColumn"] [data-testid="cellInnerDiv"]:has([data-testid="tweetTextarea_0"]),
[role="dialog"]:has([data-testid="tweetTextarea_0"]),
[role="dialog"]:has([data-testid="tweetTextarea_0"]) > div,
[role="dialog"]:has([data-testid="tweetTextarea_0"]) > div > div,
[role="dialog"]:has([data-testid="tweetTextarea_0"]) [data-testid="toolBar"],
[data-testid="primaryColumn"] [data-testid="toolBar"],
[data-testid="primaryColumn"] [data-testid="toolBar"] > div {
  background-color: var(--xt-bg) !important;
  background: var(--xt-bg) !important;
  border-color: var(--xt-border) !important;
  color: var(--xt-text) !important;
}

/* --- Layer 2: ALL descendants of the textarea container (Draft.js
       editor + every intermediate spacer/wrapper, regardless of
       which inline style or hashed class X.com applies). --- */
[data-testid="tweetTextarea_0"],
[data-testid="tweetTextarea_0"] > div,
[data-testid="tweetTextarea_0"] > div > div,
[data-testid="tweetTextarea_0"] > div > div > div,
[data-testid="tweetTextarea_0"] [contenteditable],
[data-testid="tweetTextarea_0"] [contenteditable] > div,
[data-testid="tweetTextarea_0"] [contenteditable] div[data-contents],
[data-testid="tweetTextarea_0RichTextInputContainer"],
[data-testid="tweetTextarea_0RichTextInputContainer"] > div,
[data-testid="tweetTextarea_0RichTextInputContainer"] > div > div,
[data-testid="tweetTextareaRootContainer"],
[data-testid="tweetTextareaRootContainer"] > div,
[data-testid="tweetTextareaRootContainer"] > div > div,
.DraftEditor-root,
.DraftEditor-editorContainer,
.public-DraftEditor-content,
.public-DraftEditor-content > div,
.public-DraftEditorPlaceholder-root,
.public-DraftEditorPlaceholder-inner {
  background-color: var(--xt-bg) !important;
  background: var(--xt-bg) !important;
  border-color: transparent !important;
}

/* Placeholder text inside the empty composer */
.public-DraftEditorPlaceholder-root,
.public-DraftEditorPlaceholder-inner,
[data-testid="tweetTextarea_0"] .public-DraftEditorPlaceholder-inner {
  color: var(--xt-muted) !important;
}

/* Belt-and-braces: kill any inset shadow / outline / filter on editor
   containers (not their text children) that X.com might use to create
   a "lighter inset" effect. */
[data-testid="tweetTextarea_0"],
[data-testid="tweetTextarea_0"] > div,
[data-testid="tweetTextarea_0"] > div > div,
[data-testid="tweetTextarea_0RichTextInputContainer"],
[data-testid="tweetTextarea_0RichTextInputContainer"] > div,
.DraftEditor-root,
.DraftEditor-editorContainer,
.public-DraftEditor-content {
  box-shadow: none !important;
  outline: none !important;
  filter: none !important;
}

/* --- Layer 3: subtle compose-area polish --- */

/* Soft accent rail under the textarea content when something is typed */
[data-testid="tweetTextarea_0"]:focus-within {
  position: relative;
}

[data-testid="tweetTextarea_0"]:focus-within::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--xt-accent) 30%,
    var(--xt-accent) 70%,
    transparent 100%
  );
  opacity: 0.6;
  pointer-events: none;
}

/* The "Drafts" link in compose dialog top-right uses an inline color
   that we want as accent, not link color */
[role="dialog"]:has([data-testid="tweetTextarea_0"]) [role="button"][aria-label*="Drafts" i],
[role="dialog"]:has([data-testid="tweetTextarea_0"]) a[href*="/compose/drafts"] {
  color: var(--xt-accent) !important;
}

/* Reply-settings pill ("Everyone can reply") sits below the textarea —
   give it the page bg and a hairline border for cohesion */
[role="dialog"]:has([data-testid="tweetTextarea_0"]) [aria-label*="reply" i][role="button"]:not([data-testid*="Post" i]) {
  background-color: transparent !important;
  border-color: transparent !important;
}

/* Embedded quote-tweet cards inside an article keep the page bg so they
   read as nested but visually consistent — only the border distinguishes
   them from the parent tweet. */
[data-testid="primaryColumn"] article [role="link"][tabindex="0"]:has([data-testid="User-Name"]),
[data-testid="primaryColumn"] article [data-testid="card.wrapper"],
[data-testid="primaryColumn"] article [data-testid="card.layoutSmall.media"],
[data-testid="primaryColumn"] article [data-testid="card.layoutLarge.media"],
[data-testid="primaryColumn"] article div[role="link"]:has(time):has([data-testid="User-Name"]) {
  background-color: var(--xt-bg) !important;
  border-color: var(--xt-border) !important;
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

/* Compose-area inner wrappers: when the textarea container has any inline
   background, force it flat with the page. Beats the inline-style rule
   above via :has() chain specificity. */
[data-testid="tweetTextarea_0"] [style*="background-color"],
[data-testid="tweetTextarea_0"] div,
[data-testid="tweetTextareaRootContainer"] [style*="background-color"],
[data-testid="tweetTextareaRootContainer"] div,
[role="dialog"]:has([data-testid="tweetTextarea_0"]) [style*="background-color"]:not([data-testid*="button" i]):not([role="button"]) {
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
select:focus {
  border-color: var(--xt-accent) !important;
}

/* Don't add a custom outline on contenteditable composers — X.com renders
   them inside an already-styled container, the extra outline doubles up. */

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

/* Follow button — primary state, filled with button colour */
[data-testid$="-follow"]:not([data-testid$="-unfollow"]) {
  background-color: var(--xt-button) !important;
  color: var(--xt-button-text) !important;
  border-color: var(--xt-button) !important;
}

[data-testid$="-follow"]:not([data-testid$="-unfollow"]) :where(span, div, p) {
  color: var(--xt-button-text) !important;
}

/* Following / Unfollow button — secondary state, outlined surface */
[data-testid$="-unfollow"],
[aria-label^="Following @" i],
[aria-label*="folge" i][role="button"] {
  background-color: var(--xt-surface) !important;
  color: var(--xt-text) !important;
  border-color: var(--xt-border) !important;
}

[data-testid$="-unfollow"] :where(span, div, p),
[aria-label^="Following @" i] :where(span, div, p) {
  color: var(--xt-text) !important;
}

/* "Subscribe to Premium" / generic primary CTAs that X marks with these testids */
[data-testid$="-subscribe"],
[data-testid="SubscribeButton"],
[data-testid="primary-cta"] {
  background-color: var(--xt-button) !important;
  color: var(--xt-button-text) !important;
  border-color: var(--xt-button) !important;
}

/* User-cell row hover doesn't override surface */
[data-testid="UserCell"] {
  background-color: transparent !important;
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

    /* CSS alone can't beat unknown class-based backgrounds X.com applies
       to the compose textarea wrappers, so walk the compose subtree and
       force every container to the page bg via inline style. */
    flattenComposeArea(preset);
  }

  function flattenComposeArea(preset) {
    const composers = document.querySelectorAll(
      '[data-testid="tweetTextarea_0"], [data-testid="tweetTextarea_0RichTextInputContainer"]'
    );

    for (const composer of composers) {
      /* Walk down: force bg on every div descendant of the textarea root */
      paintComposeNode(composer, preset.colors.background);
      for (const el of composer.querySelectorAll("div")) {
        paintComposeNode(el, preset.colors.background);
      }

      /* Walk up to the closest dialog or composer cell, painting each
         intermediate container so the textarea sits in a uniform block. */
      let el = composer.parentElement;
      let depth = 0;
      while (el && depth < 5) {
        paintComposeNode(el, preset.colors.background);
        if (el.matches('[role="dialog"]')) {
          break;
        }
        if (el.matches('[data-testid="cellInnerDiv"]')) {
          break;
        }
        el = el.parentElement;
        depth++;
      }
    }
  }

  function paintComposeNode(element, color) {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    /* Don't paint over elements that intentionally carry a different
       background — interactive controls, media, icons. */
    if (element.matches('[role="button"], button, img, svg, video, [data-testid="DropdownButton"], [data-testid="reply-settings"] [role="button"]')) {
      return;
    }
    element.style.setProperty("background-color", color, "important");
    element.style.setProperty("background-image", "none", "important");
  }

  function getSurfaceRoots() {
    /* Only right-rail panels — composer is now bg-coloured via static CSS. */
    return document.querySelectorAll([
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
      /* Right-rail only — composer is now bg-coloured via static CSS so we
         don't want the painter to flip it back to surface. */
      if (isRightRailSurface(box, primaryRect)) {
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
