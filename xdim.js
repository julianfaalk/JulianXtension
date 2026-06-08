(() => {
  if (window.__juliansXDimLoaded === true) {
    return;
  }
  window.__juliansXDimLoaded = true;

  // ── Constants ──────────────────────────────────────────────────────
  const DIM_BASE_ID = "julians-xdim-base";
  const DIM_BTN_ID = "x-dim-option-btn";
  const DIM_CLASS = "x-dim-active";
  const BIRD_CSS_ID = "x-dim-bird-css";
  const LOCAL_CACHE_KEY = "__xdm_enabled";
  const BIRD_PATH =
    "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z";
  const PING_TYPES = new Set(["XDM_PING", "XTHEMES_PING"]);

  // ── Theme Definitions ──────────────────────────────────────────────
  const THEMES = {
    dim: { hue: 210, sat: 34 },
    slate: { hue: 210, sat: 8 },
    jade: { hue: 150, sat: 34 },
    plum: { hue: 270, sat: 34 },
    dusk: { hue: 330, sat: 34 },
    ember: { hue: 25, sat: 34 }
  };

  let theme = "dim";
  let customHue = 210;
  let enabled = false;
  let birdLogo = false;

  function normalizeTheme(value) {
    return value === "custom" || Object.hasOwn(THEMES, value) ? value : "dim";
  }

  function normalizeHue(value) {
    const hue = Number(value);
    return Number.isFinite(hue) ? Math.min(360, Math.max(0, Math.round(hue))) : 210;
  }

  function getActiveHueSat() {
    if (theme === "custom") {
      return { hue: customHue, sat: 34 };
    }
    return THEMES[theme] || THEMES.dim;
  }

  function paletteFromHue(h, s) {
    const bSat = Math.round(s * 0.47);
    return {
      bg: `hsl(${h}, ${s}%, 13%)`,
      bgHover: `hsl(${h}, ${Math.round(s * 0.74)}%, 16%)`,
      bgElevated: `hsl(${h}, ${Math.round(s * 0.71)}%, 20%)`,
      backdrop: `hsla(${h}, ${s}%, 13%, 0.85)`,
      text: `hsl(${h}, ${Math.round(s * 0.32)}%, 60%)`,
      border: `hsl(${h}, ${bSat}%, 26%)`,
      // Raw HSL components for X's CSS variable format (space-separated, no wrapper)
      bgRaw: `${h} ${s}% 13%`,
      borderRaw: `${h} ${bSat}% 26%`,
      mutedRaw: `${h} ${bSat}% 55%`,
      grayRaw60: `${h} ${bSat}% 60%`,
      grayRaw50: `${h} ${bSat}% 50%`
    };
  }

  // ── Dim Theme CSS ──────────────────────────────────────────────────
  // Recolors X's native Lights Out theme (black → dim navy) by overriding
  // X's own design tokens. We deliberately do NOT re-theme X's light mode —
  // dim only layers on top of Lights Out, which keeps the result clean.

  function buildThemeCSS() {
    const { hue: h, sat: s } = getActiveHueSat();
    const p = paletteFromHue(h, s);
    return `
html.${DIM_CLASS} {
  --xdm-bg: ${p.bg};
  --xdm-bg-hover: ${p.bgHover};
  --xdm-bg-elevated: ${p.bgElevated};
  --xdm-backdrop: ${p.backdrop};
  --xdm-text: ${p.text};
  --xdm-border: ${p.border};
}

/* Override X's own Lights Out theme variables */
html.${DIM_CLASS} body.LightsOut {
  --color: var(--xdm-text);
  --border: ${p.borderRaw};
  --input: ${p.borderRaw};
  --border-color: var(--xdm-border);
}

/* Chat / DM interface (Tailwind + shadcn/Radix) */
html.${DIM_CLASS}[data-theme="dark"],
html.${DIM_CLASS} [data-theme="dark"] {
  --background: ${p.bgRaw};
  --border: ${p.borderRaw};
  --input: ${p.borderRaw};
  --muted-foreground: ${p.mutedRaw};
  --color-background: ${p.bgRaw};
  --color-gray-0: ${p.bgRaw};
  --color-gray-50: ${p.borderRaw};
  --color-gray-100: ${p.borderRaw};
  --color-gray-700: ${p.grayRaw60};
  --color-gray-800: ${p.grayRaw50};
}`;
  }

  // Static CSS rules — reference CSS variables, theme-independent
  const STATIC_CSS = `
/* ── Black background overrides ── */

/* HTML + Body — catches class-based black bg (e.g. Creator Studio) */
html.${DIM_CLASS},
html.${DIM_CLASS} body {
  background-color: var(--xdm-bg) !important;
}

/* Inline styles (covers body, divs, modals, dropdowns, etc.) */
html.${DIM_CLASS} [style*="background-color: rgb(0, 0, 0)"],
html.${DIM_CLASS} [style*="background-color: rgba(0, 0, 0, 1)"] {
  background-color: var(--xdm-bg) !important;
}
/* Elevated section cards (rgb(24,24,27) in dark mode → slightly lighter in dim) */
html.${DIM_CLASS} [style*="background-color: rgb(24, 24, 27)"] {
  background-color: var(--xdm-bg-hover) !important;
}
/* Icon containers in menu rows (Premium, etc.) */
html.${DIM_CLASS} [role="link"] > div > div:first-child div:has(> svg:only-child) {
  background-color: var(--xdm-bg-elevated) !important;
}

/* X utility classes for black backgrounds */
html.${DIM_CLASS} .r-kemksi,
html.${DIM_CLASS} .r-1niwhzg,
html.${DIM_CLASS} .r-yfoy6g,
html.${DIM_CLASS} .r-14lw9ot {
  background-color: var(--xdm-bg) !important;
}
/* Search bar — the input's opaque bg covers the pill's right border curve.
   Make it transparent so the pill's border and bg show through. */
html.${DIM_CLASS} form[role="search"] input {
  background-color: transparent !important;
}
/* Action-button hover circles — make transparent so they match any parent bg */
html.${DIM_CLASS} .r-1niwhzg.r-sdzlij {
  background-color: transparent !important;
}
/* Timeline top bar */
html.${DIM_CLASS} .r-5zmot {
  background-color: var(--xdm-backdrop) !important;
}
/* Tweet character counter separator */
html.${DIM_CLASS} .r-1shrkeu {
  background-color: var(--xdm-border) !important;
}
/* Sidebar button hover */
html.${DIM_CLASS} .r-1hdo0pc {
  background-color: var(--xdm-bg-hover) !important;
}
/* Secondary background (section cards on Premium, etc.) */
html.${DIM_CLASS} .r-g2wdr4 {
  background-color: var(--xdm-bg-hover) !important;
}
html.${DIM_CLASS} .r-g2wdr4 [role="link"]:hover {
  background-color: var(--xdm-bg-elevated) !important;
}

/* Borders */
html.${DIM_CLASS} .r-1kqtdi0,
html.${DIM_CLASS} .r-1roi411 {
  border-color: var(--xdm-border) !important;
}
html.${DIM_CLASS} .r-2sztyj {
  border-top-color: var(--xdm-border) !important;
}
html.${DIM_CLASS} .r-1igl3o0,
html.${DIM_CLASS} .r-rull8r {
  border-bottom-color: var(--xdm-border) !important;
}
/* Separators / dividers */
html.${DIM_CLASS} .r-gu4em3,
html.${DIM_CLASS} .r-1bnu78o {
  background-color: var(--xdm-border) !important;
}

/* Search bar icon, tweet character counter */
html.${DIM_CLASS} .r-1bwzh9t {
  color: var(--xdm-text) !important;
}
/* "What's happening" text */
html.${DIM_CLASS} .draftjs-styles_0 .public-DraftEditorPlaceholder-root,
html.${DIM_CLASS} .public-DraftEditorPlaceholder-inner {
  color: var(--xdm-text) !important;
}
/* Secondary text */
html.${DIM_CLASS} [style*="color: rgb(113, 118, 123)"],
html.${DIM_CLASS} [style*="-webkit-line-clamp: 3; color: rgb(113, 118, 123)"],
html.${DIM_CLASS} [style*="-webkit-line-clamp: 2; color: rgb(113, 118, 123)"] {
  color: var(--xdm-text) !important;
}
/* Placeholders */
html.${DIM_CLASS} ::placeholder {
  color: var(--xdm-text) !important;
}

/* Tailwind classes used in chat/DM interface */
html.${DIM_CLASS} .bg-gray-0 {
  background-color: var(--xdm-bg) !important;
}
html.${DIM_CLASS} .border-gray-50,
html.${DIM_CLASS} .border-gray-100 {
  border-color: var(--xdm-border) !important;
}

/* Grok buttons (active) */
html.${DIM_CLASS} [style*="border-color: rgb(47, 51, 54)"].r-1che71a {
  background-color: var(--xdm-bg-hover) !important;
}

/* Scanner-discovered black backgrounds */
html.${DIM_CLASS} .xdm-dimmed {
  background-color: var(--xdm-bg) !important;
}
/* Scanner-discovered elevated backgrounds (e.g. section cards) */
html.${DIM_CLASS} .xdm-dimmed-elevated {
  background-color: var(--xdm-bg-hover) !important;
}
/* Creator Studio icon containers (jf-element framework) */
html.${DIM_CLASS} .jf-element:has(> span:only-child > svg:only-child) {
  background-color: var(--xdm-bg-elevated) !important;
}
/* Creator Studio dividers inside elevated section cards */
html.${DIM_CLASS} .xdm-dimmed-elevated .jf-element:empty {
  background-color: var(--xdm-border) !important;
  border-color: var(--xdm-border) !important;
}
`;

  function buildFullCSS() {
    return buildThemeCSS() + STATIC_CSS;
  }

  // Always update the style element — prevents stale CSS after extension reload
  function ensureBaseCSS() {
    const css = buildFullCSS();
    let style = document.getElementById(DIM_BASE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = DIM_BASE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  // Inject CSS immediately at document_start — don't wait for async storage read.
  // Rules are gated by html.x-dim-active so they're inert until the class is added.
  ensureBaseCSS();

  // Optimistically apply dim before async storage read using localStorage as a sync cache.
  // First install: cache is null → default to dim. Disabled users: cache is "0" → skip.
  // Gate on system dark to match preload.css — avoids dim CSS leaking onto a light-mode page.
  if (
    localStorage.getItem(LOCAL_CACHE_KEY) !== "0" &&
    (!window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add(DIM_CLASS);
  }

  // ── PWA theme-color sync ──────────────────────────────────────────
  // Updates <meta name="theme-color"> so the PWA title bar matches the dim bg.

  let originalThemeColor = null;
  let themeColorObserver = null;

  function syncThemeColor() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      if (!document.head) {
        return;
      }
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    if (originalThemeColor === null) {
      originalThemeColor = meta.getAttribute("content");
    }
    const { hue, sat } = getActiveHueSat();
    const desired = `hsl(${hue}, ${sat}%, 13%)`;
    if (meta.getAttribute("content") !== desired) {
      meta.setAttribute("content", desired);
    }
  }

  function startThemeColorObserver() {
    if (themeColorObserver || !document.head) {
      return;
    }
    themeColorObserver = new MutationObserver(() => {
      if (enabled && document.documentElement.classList.contains(DIM_CLASS)) {
        syncThemeColor();
      }
    });
    themeColorObserver.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content"]
    });
  }

  function stopThemeColorObserver() {
    if (themeColorObserver) {
      themeColorObserver.disconnect();
      themeColorObserver = null;
    }
  }

  function restoreThemeColor() {
    if (originalThemeColor === null) {
      return;
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", originalThemeColor);
    }
    originalThemeColor = null;
  }

  function applyDim() {
    ensureBaseCSS();
    document.documentElement.classList.add(DIM_CLASS);
    syncThemeColor();
    startThemeColorObserver();
    if (document.body) {
      queueScan([document.body]);
    }
  }

  function removeDim() {
    document.documentElement.classList.remove(DIM_CLASS);
    stopThemeColorObserver();
    restoreThemeColor();
    if (scanFrame) {
      cancelAnimationFrame(scanFrame);
      scanFrame = 0;
      pending.clear();
    }
    for (const el of document.querySelectorAll(".xdm-dimmed, .xdm-dimmed-elevated")) {
      el.classList.remove("xdm-dimmed", "xdm-dimmed-elevated");
    }
  }

  // ── System Theme Sync ─────────────────────────────────────────────
  // Follows X's active theme: when X is in Lights Out (dark), layer dim on
  // top; when X switches to a light background, suspend dim (so we never
  // paint navy behind dark text). Watches body.LightsOut to detect state.

  let bodyObserver = null;
  let suspendedForLight = false;
  // Track whether X has ever been in dark mode this session. Prevents
  // removing dim before X has finished initializing.
  let seenLightsOut = false;

  function syncDimWithTheme() {
    if (!enabled || !document.body) {
      return;
    }
    const hasLightsOut = document.body.classList.contains("LightsOut");
    const dimActive = document.documentElement.classList.contains(DIM_CLASS);
    if (hasLightsOut) {
      // X is in dark mode → activate dim. applyDim is idempotent.
      suspendedForLight = false;
      applyDim();
      if (!dimActive) {
        for (const ms of [500, 1500, 3000, 5000]) {
          setTimeout(fullRescan, ms);
        }
      }
    } else if (dimActive && seenLightsOut) {
      // X switched to light mode (LightsOut was present, now removed) → suspend
      suspendedForLight = true;
      removeDim();
    }
  }

  function startBodyObserver() {
    if (bodyObserver || !document.body) {
      return;
    }
    if (document.body.classList.contains("LightsOut")) {
      seenLightsOut = true;
    }
    bodyObserver = new MutationObserver(() => {
      if (document.body.classList.contains("LightsOut")) {
        seenLightsOut = true;
      }
      syncDimWithTheme();
    });
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function stopBodyObserver() {
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
  }

  // ── Black Background Scanner ─────────────────────────────────────
  // Catches inline black backgrounds not covered by known CSS selectors.
  // Uses a CSS class (not inline styles) so toggling is instant and
  // non-destructive. Only matches pure-black / known elevated values —
  // it deliberately leaves light backgrounds alone.

  let scanFrame = 0;
  const pending = new Set();

  function queueScan(nodes) {
    for (const n of nodes) {
      if (n && n.nodeType === Node.ELEMENT_NODE) {
        pending.add(n);
      }
    }
    if (pending.size && !scanFrame) {
      scanFrame = requestAnimationFrame(flushScan);
    }
  }

  function flushScan() {
    scanFrame = 0;
    if (!document.documentElement.classList.contains(DIM_CLASS)) {
      pending.clear();
      return;
    }
    const batch = [...pending];
    pending.clear();
    for (const node of batch) {
      dimSubtree(node);
    }
  }

  function dimSubtree(root) {
    dimElement(root);
    for (const el of root.querySelectorAll(
      "div,main,aside,header,nav,section,article,footer,button"
    )) {
      dimElement(el);
    }
  }

  function dimElement(el) {
    if (
      !el ||
      el.nodeType !== Node.ELEMENT_NODE ||
      el.classList.contains("xdm-dimmed") ||
      el.classList.contains("xdm-dimmed-elevated")
    ) {
      return;
    }
    const bg = el.classList.contains("jf-element")
      ? safeComputedBackground(el)
      : el.style.backgroundColor;
    if (bg === "rgb(0, 0, 0)" || bg === "rgba(0, 0, 0, 1)") {
      el.classList.add("xdm-dimmed");
    } else if (bg === "rgb(24, 24, 27)") {
      el.classList.add("xdm-dimmed-elevated");
    }
  }

  function safeComputedBackground(el) {
    try {
      return getComputedStyle(el).backgroundColor;
    } catch (_error) {
      return "";
    }
  }

  function fullRescan() {
    if (enabled && document.body) {
      queueScan([document.body]);
    }
  }

  // ── Classic bird logo ──────────────────────────────────────────────
  // Optional tweak: swaps X's wordmark glyph back to the classic bird.

  function isXLogoPath(d) {
    return Boolean(d) && (d.startsWith("M18.244") || d.startsWith("M21.742"));
  }

  function swapSinglePath(path) {
    const d = path.getAttribute("d");
    if (!isXLogoPath(d)) {
      return;
    }
    if (!path.getAttribute("data-xdm-original-d")) {
      path.setAttribute("data-xdm-original-d", d);
    }
    path.setAttribute("d", BIRD_PATH);
    path.setAttribute("data-xdm-bird", "1");
  }

  function swapBirdLogos(root = document) {
    if (!birdLogo) {
      return;
    }
    const paths = root.querySelectorAll ? root.querySelectorAll("path") : [];
    for (const path of paths) {
      swapSinglePath(path);
    }
    if (typeof SVGPathElement !== "undefined" && root instanceof SVGPathElement) {
      swapSinglePath(root);
    }
  }

  function ensureBirdCss() {
    if (document.getElementById(BIRD_CSS_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = BIRD_CSS_ID;
    style.textContent = `
path[data-xdm-bird] { fill: currentColor !important; }
@media (prefers-color-scheme: light) {
  path[data-xdm-bird] { fill: #1d9bf0 !important; }
}`;
    (document.head || document.documentElement).appendChild(style);
  }

  function restoreBirdLogos() {
    for (const path of document.querySelectorAll("path[data-xdm-original-d]")) {
      path.setAttribute("d", path.getAttribute("data-xdm-original-d"));
      path.removeAttribute("data-xdm-original-d");
      path.removeAttribute("data-xdm-bird");
    }
    document.getElementById(BIRD_CSS_ID)?.remove();
  }

  let birdInterval = 0;

  function startBirdInterval() {
    if (birdInterval) {
      return;
    }
    birdInterval = setInterval(() => {
      if (!birdLogo) {
        stopBirdInterval();
        return;
      }
      swapBirdLogos();
    }, 2000);
  }

  function stopBirdInterval() {
    if (birdInterval) {
      clearInterval(birdInterval);
      birdInterval = 0;
    }
  }

  function enableBirdLogo() {
    ensureBirdCss();
    swapBirdLogos();
    for (const delay of [500, 1500, 3000]) {
      setTimeout(swapBirdLogos, delay);
    }
    startBirdInterval();
  }

  function disableBirdLogo() {
    stopBirdInterval();
    restoreBirdLogos();
  }

  // ── Display Settings Injection ─────────────────────────────────────
  // Adds a "Dim" radio to Settings → Display → Background, between Default
  // and Lights Out, so X's own picker reflects the extension state.

  const CHECKMARK_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-jwli3a r-1hjwoze r-12ym1je"><g><path d="M9.64 18.952l-5.55-4.861 1.317-1.504 3.951 3.459 8.459-10.948L19.4 6.32 9.64 18.952z"></path></g></svg>';

  function setSelected(btnEl) {
    btnEl.style.borderColor = "rgb(29, 155, 240)";
    btnEl.style.borderWidth = "2px";
    const circle = btnEl.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgb(29, 155, 240)";
      circle.style.borderColor = "rgb(29, 155, 240)";
      circle.innerHTML = CHECKMARK_SVG;
    }
    const input = btnEl.querySelector('input[type="radio"]');
    if (input) {
      input.checked = true;
    }
  }

  function setUnselected(btnEl) {
    btnEl.style.borderColor = "rgb(51, 54, 57)";
    btnEl.style.borderWidth = "1px";
    const circle = btnEl.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgba(0, 0, 0, 0)";
      circle.style.borderColor = "rgb(185, 202, 211)";
      circle.innerHTML = "";
    }
    const input = btnEl.querySelector('input[type="radio"]');
    if (input) {
      input.checked = false;
    }
  }

  function getDimLabel() {
    try {
      return chrome.i18n?.getMessage("dimLabel") || "Dim";
    } catch (_error) {
      return "Dim";
    }
  }

  function tryInjectDimOption() {
    if (document.getElementById(DIM_BTN_ID)) {
      return;
    }
    const bgRadio = document.querySelector('input[name="background-picker"]');
    if (!bgRadio) {
      return;
    }
    const radiogroup = bgRadio.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }
    const buttons = radiogroup.querySelectorAll(":scope > div");
    if (buttons.length < 2) {
      return;
    }

    const defaultBtn = buttons[0];
    const lightsOutBtn = buttons[1];

    const dimBtn = lightsOutBtn.cloneNode(true);
    dimBtn.id = DIM_BTN_ID;
    updateButtonColor(dimBtn);

    const dimLabel = getDimLabel();
    const label = dimBtn.querySelector("span");
    if (label) {
      label.textContent = dimLabel;
    }
    const input = dimBtn.querySelector('input[type="radio"]');
    if (input) {
      input.setAttribute("aria-label", dimLabel);
      input.checked = false;
    }

    radiogroup.insertBefore(dimBtn, lightsOutBtn);

    chrome.storage.local.get("enabled", (stored) => {
      syncSettingsButtons(Boolean(stored.enabled));
    });

    dimBtn.addEventListener("click", () => {
      chrome.storage.local.set({ enabled: true });
      syncSettingsButtons(true);
      activateLightsOut();
    });

    for (const nativeBtn of [defaultBtn, lightsOutBtn]) {
      nativeBtn.addEventListener("click", () => {
        if (switchingToDim) {
          return;
        }
        chrome.storage.local.set({ enabled: false });
        setUnselected(dimBtn);
      });
    }
  }

  function updateButtonColor(btnEl) {
    const { hue, sat } = getActiveHueSat();
    btnEl.style.backgroundColor = `hsl(${hue}, ${sat}%, 13%)`;
  }

  function updateSettingsButtonColor() {
    const dimBtn = document.getElementById(DIM_BTN_ID);
    if (dimBtn) {
      updateButtonColor(dimBtn);
    }
  }

  function syncSettingsButtons(isEnabled) {
    const dimBtn = document.getElementById(DIM_BTN_ID);
    if (!dimBtn) {
      return;
    }
    const radiogroup = dimBtn.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }
    const allBtns = radiogroup.querySelectorAll(":scope > div");
    const lightsOutBtn = allBtns[allBtns.length - 1];

    if (isEnabled) {
      setSelected(dimBtn);
      for (const btn of allBtns) {
        if (btn !== dimBtn) {
          setUnselected(btn);
        }
      }
    } else {
      setUnselected(dimBtn);
      if (lightsOutBtn) {
        setSelected(lightsOutBtn);
      }
    }
  }

  // ── Lights Out Helper ──────────────────────────────────────────────
  // Clicks X's Lights Out radio (if the Display settings page is open) so the
  // dim recolor has a black base to sit on top of.

  let switchingToDim = false;

  function activateLightsOut() {
    const dimBtn = document.getElementById(DIM_BTN_ID);
    if (!dimBtn) {
      return;
    }
    const radiogroup = dimBtn.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }
    const allBtns = radiogroup.querySelectorAll(":scope > div");
    const lightsOutBtn = allBtns[allBtns.length - 1];
    if (!lightsOutBtn) {
      return;
    }
    const loInput = lightsOutBtn.querySelector('input[type="radio"]');
    if (loInput && !loInput.checked) {
      switchingToDim = true;
      loInput.click();
      loInput.dispatchEvent(new Event("input", { bubbles: true }));
      loInput.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => {
        switchingToDim = false;
      }, 300);
    }
  }

  // ── Observer & Init ────────────────────────────────────────────────

  let observer = null;

  function startObserver() {
    if (observer) {
      return;
    }
    observer = new MutationObserver((mutations) => {
      try {
        // Re-apply dim if X removed the class (unless suspended for light mode)
        if (
          enabled &&
          !suspendedForLight &&
          !document.documentElement.classList.contains(DIM_CLASS)
        ) {
          applyDim();
        }
        // Scan newly added nodes for black backgrounds
        if (enabled && document.documentElement.classList.contains(DIM_CLASS)) {
          for (const m of mutations) {
            if (m.addedNodes.length) {
              queueScan(m.addedNodes);
            }
          }
        }
        // Swap freshly added X logos when the bird tweak is on
        if (birdLogo) {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                swapBirdLogos(node);
              }
            }
          }
        }
        // Inject the Dim radio on the display settings page
        tryInjectDimOption();
        // Start body observer once body is available
        if (enabled && document.body && !bodyObserver) {
          startBodyObserver();
        }
      } catch (_error) {
        // Extension context invalidated after reload — clean up
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Init — single storage read, then use cached state
  chrome.storage.local.get(["enabled", "theme", "customHue", "birdLogo"], (stored) => {
    theme = normalizeTheme(stored.theme);
    customHue = normalizeHue(stored.customHue);
    birdLogo = Boolean(stored.birdLogo);

    if (stored.enabled === undefined) {
      enabled = true;
      chrome.storage.local.set({ enabled: true });
    } else {
      enabled = Boolean(stored.enabled);
    }

    cacheEnabled(enabled);

    // Re-build CSS with actual theme (may differ from default injected at document_start)
    ensureBaseCSS();

    if (enabled) {
      // Apply dim immediately if system is dark (avoids flash of black).
      // If system is light, the body observer handles it once X sets its theme.
      const systemDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        applyDim();
        for (const ms of [500, 1500, 3000, 5000]) {
          setTimeout(fullRescan, ms);
        }
      }
    } else {
      // User has dim disabled — remove the optimistic early class
      removeDim();
    }

    startObserver();
    tryInjectDimOption();

    if (enabled && document.body) {
      startBodyObserver();
    }

    if (birdLogo) {
      enableBirdLogo();
    }
  });

  // ── Message + storage listeners ────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && PING_TYPES.has(message.type)) {
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.enabled) {
      enabled = Boolean(changes.enabled.newValue);
      cacheEnabled(enabled);
      if (enabled) {
        suspendedForLight = false;
        startBodyObserver();
        applyDim();
        activateLightsOut();
      } else {
        stopBodyObserver();
        removeDim();
      }
      syncSettingsButtons(enabled);
    }

    if (changes.theme || changes.customHue) {
      if (changes.theme) {
        theme = normalizeTheme(changes.theme.newValue);
      }
      if (changes.customHue) {
        customHue = normalizeHue(changes.customHue.newValue);
      }
      ensureBaseCSS();
      syncThemeColor();
      updateSettingsButtonColor();
    }

    if (changes.birdLogo) {
      birdLogo = Boolean(changes.birdLogo.newValue);
      if (birdLogo) {
        enableBirdLogo();
      } else {
        disableBirdLogo();
      }
    }
  });

  function cacheEnabled(value) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, value ? "1" : "0");
    } catch (_error) {
      /* no-op */
    }
  }
})();
