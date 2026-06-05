(() => {
  if (window.__juliansXDimLoaded === true) {
    return;
  }
  window.__juliansXDimLoaded = true;

  const STYLE_ID = "julians-xdim-base";
  const DIM_CLASS = "x-dim-active";
  const DIM_BUTTON_ID = "x-dim-option-btn";
  const LOCAL_CACHE_KEY = "__xdm_enabled";
  const BIRD_CSS_ID = "x-dim-bird-css";
  const BIRD_PATH = "M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z";
  const MESSAGE_TYPES = {
    ping: "XDM_PING"
  };

  const THEMES = {
    dim: { hue: 210, sat: 34 },
    slate: { hue: 210, sat: 8 },
    jade: { hue: 150, sat: 34 },
    plum: { hue: 270, sat: 34 },
    dusk: { hue: 330, sat: 34 },
    ember: { hue: 25, sat: 34 }
  };

  let enabled = false;
  let activeTheme = "dim";
  let customHue = 210;
  let bodyObserver = null;
  let domObserver = null;
  let themeColorObserver = null;
  let originalThemeColor = null;
  let scanFrame = 0;
  let birdInterval = 0;
  let switchingToDim = false;
  let birdLogo = false;

  const pendingScanRoots = new Set();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_TYPES.ping || message?.type === "XTHEMES_PING") {
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  ensureBaseCss();

  chrome.storage.local.get(["enabled", "theme", "customHue", "birdLogo"], (stored) => {
    activeTheme = normalizeTheme(stored.theme);
    customHue = normalizeHue(stored.customHue);
    birdLogo = Boolean(stored.birdLogo);
    enabled = stored.enabled === undefined ? true : Boolean(stored.enabled);

    if (stored.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
    }

    cacheEnabled(enabled);
    ensureBaseCss();

    if (enabled) {
      applyDim();
      scheduleFullRescans();
    } else {
      removeDim();
    }

    startDomObserver();
    tryInjectDimOption();

    if (enabled && document.body) {
      startBodyObserver();
    }

    if (birdLogo) {
      ensureBirdCss();
      swapBirdLogos();
      for (const delay of [500, 1500, 3000]) {
        setTimeout(swapBirdLogos, delay);
      }
      startBirdInterval();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.enabled) {
      enabled = Boolean(changes.enabled.newValue);
      cacheEnabled(enabled);

      if (enabled) {
        startBodyObserver();
        applyDim();
        activateLightsOut();
        scheduleFullRescans();
      } else {
        stopBodyObserver();
        removeDim();
      }

      syncSettingsButtons(enabled);
    }

    if (changes.theme || changes.customHue) {
      if (changes.theme) {
        activeTheme = normalizeTheme(changes.theme.newValue);
      }
      if (changes.customHue) {
        customHue = normalizeHue(changes.customHue.newValue);
      }

      ensureBaseCss();
      syncThemeColor();
      updateSettingsButtonColor();
      if (enabled) {
        applyDim();
        fullRescan();
      }
    }

    if (changes.birdLogo) {
      birdLogo = Boolean(changes.birdLogo.newValue);
      if (birdLogo) {
        ensureBirdCss();
        swapBirdLogos();
        startBirdInterval();
      } else {
        stopBirdInterval();
        restoreBirdLogos();
      }
    }
  });

  function normalizeTheme(value) {
    return value === "custom" || Object.hasOwn(THEMES, value) ? value : "dim";
  }

  function normalizeHue(value) {
    const hue = Number(value);
    return Number.isFinite(hue) ? Math.min(360, Math.max(0, Math.round(hue))) : 210;
  }

  function activeHueSat() {
    if (activeTheme === "custom") {
      return { hue: customHue, sat: 34 };
    }
    return THEMES[activeTheme] || THEMES.dim;
  }

  function paletteFromHue(hue, sat) {
    const borderSat = Math.round(sat * 0.47);
    return {
      bg: `hsl(${hue}, ${sat}%, 13%)`,
      bgHover: `hsl(${hue}, ${Math.round(sat * 0.74)}%, 16%)`,
      bgElevated: `hsl(${hue}, ${Math.round(sat * 0.71)}%, 20%)`,
      backdrop: `hsla(${hue}, ${sat}%, 13%, 0.85)`,
      text: `hsl(${hue}, ${Math.round(sat * 0.32)}%, 60%)`,
      border: `hsl(${hue}, ${borderSat}%, 26%)`,
      borderSubtle: `hsl(${hue}, ${borderSat}%, 22%)`,
      bgRaw: `${hue} ${sat}% 13%`,
      borderRaw: `${hue} ${borderSat}% 26%`,
      mutedRaw: `${hue} ${borderSat}% 55%`,
      grayRaw60: `${hue} ${borderSat}% 60%`,
      grayRaw50: `${hue} ${borderSat}% 50%`
    };
  }

  function buildThemeCss() {
    const { hue, sat } = activeHueSat();
    const p = paletteFromHue(hue, sat);

    return `
html.${DIM_CLASS} {
  --xdm-bg: ${p.bg};
  --xdm-bg-hover: ${p.bgHover};
  --xdm-bg-elevated: ${p.bgElevated};
  --xdm-backdrop: ${p.backdrop};
  --xdm-text: ${p.text};
  --xdm-border: ${p.border};
  --xdm-border-subtle: ${p.borderSubtle};
}

html.${DIM_CLASS} body.LightsOut {
  --color: var(--xdm-text);
  --border: ${p.borderRaw};
  --input: ${p.borderRaw};
  --border-color: var(--xdm-border);
}

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

  function buildStaticCss() {
    return `
html.${DIM_CLASS},
html.${DIM_CLASS} body {
  background: var(--xdm-bg) !important;
  background-color: var(--xdm-bg) !important;
  color: #e7e9ea !important;
  color-scheme: dark !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  main,
  header,
  nav,
  aside,
  section,
  article,
  footer,
  [role="main"],
  [role="banner"],
  [role="navigation"],
  [role="complementary"],
  [data-testid="primaryColumn"],
  [data-testid="sidebarColumn"],
  [data-testid="cellInnerDiv"],
  [data-testid="toolBar"],
  [data-testid="tweetTextareaRootContainer"],
  [data-testid="tweetTextarea_0"],
  #react-root,
  #react-root > div
) {
  background: var(--xdm-bg) !important;
  background-color: var(--xdm-bg) !important;
  color: #e7e9ea !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  [data-testid="sidebarColumn"] section,
  [role="complementary"] section,
  aside section,
  form[role="search"],
  [role="dialog"],
  [role="menu"],
  [role="listbox"],
  [data-testid="HoverCard"]
) {
  background: var(--xdm-bg-hover) !important;
  background-color: var(--xdm-bg-hover) !important;
  border-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  header[role="banner"],
  [data-testid="primaryColumn"] > div:first-child,
  [role="main"] > div:first-child,
  div[style*="backdrop-filter"],
  div[style*="-webkit-backdrop-filter"],
  div[style*="position: sticky"],
  div[style*="position:sticky"]
) {
  background: var(--xdm-bg) !important;
  background-color: var(--xdm-bg) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  span,
  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  label,
  time,
  small,
  div[dir="auto"],
  [role="heading"],
  [data-testid="tweetText"],
  [data-testid="tweetText"] *,
  [data-testid="User-Name"] *,
  [data-testid="UserName"] *,
  [data-testid="cellInnerDiv"] [dir="auto"]
),
html.${DIM_CLASS} body:not(.LightsOut) .r-18jsvk2,
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: rgb(15, 20, 25)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color:rgb(15,20,25)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: rgba(15, 20, 25, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color:rgba(15,20,25,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: #0f1419"] {
  color: #e7e9ea !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  time,
  [datetime],
  small,
  figcaption,
  [data-testid="User-Name"] a[href*="/status/"] *
),
html.${DIM_CLASS} body:not(.LightsOut) .r-1bwzh9t,
html.${DIM_CLASS} body:not(.LightsOut) .r-1cvl2hr,
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: rgb(83, 100, 113)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color:rgb(83,100,113)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: rgba(83, 100, 113, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color:rgba(83,100,113,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color: rgb(101, 119, 134)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="color:rgb(101,119,134)"] {
  color: var(--xdm-text) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgb(255, 255, 255)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgb(255,255,255)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgba(255, 255, 255, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgba(255,255,255,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgba(255, 255, 255, 0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgba(255,255,255,0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgb(255, 255, 255)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgb(255,255,255)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgba(255, 255, 255, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgba(255,255,255,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgba(255, 255, 255, 0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgba(255,255,255,0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgb(247, 249, 249)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgb(247,249,249)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgb(247, 249, 249)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgb(247,249,249)"] {
  background: var(--xdm-bg) !important;
  background-color: var(--xdm-bg) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgb(239, 243, 244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgb(239,243,244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgba(239, 243, 244, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgba(239,243,244,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgba(239, 243, 244, 0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color:rgba(239,243,244,0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgb(239, 243, 244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgb(239,243,244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgba(239, 243, 244, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgba(239,243,244,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background: rgba(239, 243, 244, 0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background:rgba(239,243,244,0"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: rgb(239 243 244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="background-color: #eff3f4"] {
  background: var(--xdm-bg-hover) !important;
  background-color: var(--xdm-bg-hover) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color: rgb(207, 217, 222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color:rgb(207,217,222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color: rgba(207, 217, 222, 1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color:rgba(207,217,222,1)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color: rgb(239, 243, 244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-color:rgb(239,243,244)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-left-color: rgb(207, 217, 222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-left-color:rgb(207,217,222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-right-color: rgb(207, 217, 222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-right-color:rgb(207,217,222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-bottom-color: rgb(207, 217, 222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-bottom-color:rgb(207,217,222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-top-color: rgb(207, 217, 222)"],
html.${DIM_CLASS} body:not(.LightsOut) [style*="border-top-color:rgb(207,217,222)"] {
  border-color: var(--xdm-border) !important;
  border-left-color: var(--xdm-border) !important;
  border-right-color: var(--xdm-border) !important;
  border-bottom-color: var(--xdm-border) !important;
  border-top-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  [data-testid="primaryColumn"],
  [data-testid="primaryColumn"] > div,
  [data-testid="sidebarColumn"],
  [data-testid="sidebarColumn"] > div,
  [data-testid="cellInnerDiv"],
  article,
  [role="separator"],
  .r-1kqtdi0,
  .r-1roi411,
  .r-1igl3o0,
  .r-rull8r,
  .r-2sztyj,
  .r-1phboty
) {
  border-color: var(--xdm-border-subtle) !important;
  border-left-color: var(--xdm-border-subtle) !important;
  border-right-color: var(--xdm-border-subtle) !important;
  border-bottom-color: var(--xdm-border-subtle) !important;
  border-top-color: var(--xdm-border-subtle) !important;
}

html.${DIM_CLASS} body:not(.LightsOut) :where(
  button,
  [role="button"],
  [style*="position: fixed"],
  [style*="position:fixed"]
) {
  border-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} [style*="background-color: rgb(0, 0, 0)"],
html.${DIM_CLASS} [style*="background-color: rgba(0, 0, 0, 1)"] {
  background-color: var(--xdm-bg) !important;
}

html.${DIM_CLASS} [style*="background-color: rgb(24, 24, 27)"] {
  background-color: var(--xdm-bg-hover) !important;
}

html.${DIM_CLASS} [role="link"] > div > div:first-child div:has(> svg:only-child),
html.${DIM_CLASS} .jf-element:has(> span:only-child > svg:only-child) {
  background-color: var(--xdm-bg-elevated) !important;
}

html.${DIM_CLASS} .r-kemksi,
html.${DIM_CLASS} .r-1niwhzg,
html.${DIM_CLASS} .r-yfoy6g,
html.${DIM_CLASS} .r-14lw9ot {
  background-color: var(--xdm-bg) !important;
}

html.${DIM_CLASS} form[role="search"] input,
html.${DIM_CLASS} .r-1niwhzg.r-sdzlij {
  background-color: transparent !important;
}

html.${DIM_CLASS} .r-5zmot {
  background-color: var(--xdm-backdrop) !important;
}

html.${DIM_CLASS} .r-1shrkeu,
html.${DIM_CLASS} .r-gu4em3,
html.${DIM_CLASS} .r-1bnu78o {
  background-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} .r-1hdo0pc,
html.${DIM_CLASS} .r-g2wdr4 {
  background-color: var(--xdm-bg-hover) !important;
}

html.${DIM_CLASS} .r-g2wdr4 [role="link"]:hover {
  background-color: var(--xdm-bg-elevated) !important;
}

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

html.${DIM_CLASS} .r-1bwzh9t,
html.${DIM_CLASS} .draftjs-styles_0 .public-DraftEditorPlaceholder-root,
html.${DIM_CLASS} .public-DraftEditorPlaceholder-inner,
html.${DIM_CLASS} [style*="color: rgb(113, 118, 123)"],
html.${DIM_CLASS} [style*="-webkit-line-clamp: 3; color: rgb(113, 118, 123)"],
html.${DIM_CLASS} [style*="-webkit-line-clamp: 2; color: rgb(113, 118, 123)"],
html.${DIM_CLASS} ::placeholder {
  color: var(--xdm-text) !important;
}

html.${DIM_CLASS} .bg-gray-0,
html.${DIM_CLASS} .xdm-dimmed {
  background-color: var(--xdm-bg) !important;
}

html.${DIM_CLASS} .border-gray-50,
html.${DIM_CLASS} .border-gray-100 {
  border-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} [style*="border-color: rgb(47, 51, 54)"].r-1che71a,
html.${DIM_CLASS} .xdm-dimmed-elevated {
  background-color: var(--xdm-bg-hover) !important;
}

html.${DIM_CLASS} .xdm-dimmed-elevated .jf-element:empty {
  background-color: var(--xdm-border) !important;
  border-color: var(--xdm-border) !important;
}

html.${DIM_CLASS} .r-1niwhzg.r-633pao {
  background-color: transparent !important;
}`;
  }

  function ensureBaseCss() {
    const css = buildThemeCss() + buildStaticCss();
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).append(style);
    }
    if (style.textContent !== css) {
      style.textContent = css;
    }
  }

  function applyDim() {
    ensureBaseCss();
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
      pendingScanRoots.clear();
    }
    for (const element of document.querySelectorAll(".xdm-dimmed, .xdm-dimmed-elevated")) {
      element.classList.remove("xdm-dimmed", "xdm-dimmed-elevated");
    }
  }

  function syncDimWithTheme() {
    if (!enabled || !document.body) {
      return;
    }

    const isActive = document.documentElement.classList.contains(DIM_CLASS);
    applyDim();
    if (!isActive) {
      scheduleFullRescans();
    }
  }

  function startBodyObserver() {
    if (bodyObserver || !document.body) {
      return;
    }

    bodyObserver = new MutationObserver(syncDimWithTheme);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  function stopBodyObserver() {
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
  }

  function startDomObserver() {
    if (domObserver || !document.documentElement) {
      return;
    }

    domObserver = new MutationObserver((mutations) => {
      try {
        if (enabled && !document.documentElement.classList.contains(DIM_CLASS)) {
          applyDim();
        }

        if (enabled && document.documentElement.classList.contains(DIM_CLASS)) {
          for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
              queueScan(mutation.addedNodes);
            }
          }
        }

        if (birdLogo) {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                swapBirdLogos(node);
              }
            }
          }
        }

        tryInjectDimOption();

        if (enabled && document.body && !bodyObserver) {
          startBodyObserver();
        }
      } catch (_error) {
        domObserver?.disconnect();
        domObserver = null;
      }
    });

    domObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function queueScan(nodes) {
    for (const node of nodes) {
      if (node?.nodeType === Node.ELEMENT_NODE) {
        pendingScanRoots.add(node);
      }
    }

    if (pendingScanRoots.size && !scanFrame) {
      scanFrame = requestAnimationFrame(flushScan);
    }
  }

  function flushScan() {
    scanFrame = 0;
    if (!document.documentElement.classList.contains(DIM_CLASS)) {
      pendingScanRoots.clear();
      return;
    }

    const batch = [...pendingScanRoots];
    pendingScanRoots.clear();

    for (const root of batch) {
      dimSubtree(root);
    }
  }

  function dimSubtree(root) {
    dimElement(root);
    for (const element of root.querySelectorAll("div,main,aside,header,nav,section,article,footer,button")) {
      dimElement(element);
    }
  }

  function dimElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    if (element.classList.contains("xdm-dimmed") || element.classList.contains("xdm-dimmed-elevated")) {
      return;
    }

    const background = element.classList.contains("jf-element")
      ? safeComputedBackground(element)
      : element.style.backgroundColor;

    const computed = background || safeComputedBackground(element);

    if (
      computed === "rgb(0, 0, 0)" ||
      computed === "rgba(0, 0, 0, 1)" ||
      isLightBackground(computed)
    ) {
      element.classList.add("xdm-dimmed");
    } else if (
      computed === "rgb(24, 24, 27)" ||
      computed === "rgb(239, 243, 244)" ||
      computed === "rgba(239, 243, 244, 1)" ||
      isLightElevatedBackground(computed)
    ) {
      element.classList.add("xdm-dimmed-elevated");
    }
  }

  function isLightBackground(value) {
    const color = parseRgb(value);
    if (!color || color.a === 0) {
      return false;
    }
    return color.r >= 245 && color.g >= 245 && color.b >= 245;
  }

  function isLightElevatedBackground(value) {
    const color = parseRgb(value);
    if (!color || color.a === 0) {
      return false;
    }
    return color.r >= 232 && color.g >= 232 && color.b >= 232;
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

  function safeComputedBackground(element) {
    try {
      return getComputedStyle(element).backgroundColor;
    } catch (_error) {
      return "";
    }
  }

  function scheduleFullRescans() {
    for (const delay of [500, 1500, 3000, 5000]) {
      setTimeout(fullRescan, delay);
    }
  }

  function fullRescan() {
    if (enabled && document.body) {
      queueScan([document.body]);
    }
  }

  function syncThemeColor() {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      if (!document.head) {
        return;
      }
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.append(meta);
    }

    if (originalThemeColor === null) {
      originalThemeColor = meta.getAttribute("content");
    }

    const { hue, sat } = activeHueSat();
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

  function isXLogoPath(d) {
    return Boolean(d) && (d.startsWith("M18.244") || d.startsWith("M21.742"));
  }

  function swapSinglePath(path) {
    const d = path.getAttribute("d");
    if (!isXLogoPath(d)) {
      return false;
    }
    if (!path.getAttribute("data-xdm-original-d")) {
      path.setAttribute("data-xdm-original-d", d);
    }
    path.setAttribute("d", BIRD_PATH);
    path.setAttribute("data-xdm-bird", "1");
    return true;
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
path[data-xdm-bird] {
  fill: currentColor !important;
}

@media (prefers-color-scheme: light) {
  path[data-xdm-bird] {
    fill: #1d9bf0 !important;
  }
}`;
    (document.head || document.documentElement).append(style);
  }

  function removeBirdCss() {
    document.getElementById(BIRD_CSS_ID)?.remove();
  }

  function restoreBirdLogos() {
    for (const path of document.querySelectorAll("path[data-xdm-original-d]")) {
      path.setAttribute("d", path.getAttribute("data-xdm-original-d"));
      path.removeAttribute("data-xdm-original-d");
      path.removeAttribute("data-xdm-bird");
    }
    removeBirdCss();
  }

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

  function tryInjectDimOption() {
    if (document.getElementById(DIM_BUTTON_ID)) {
      return;
    }

    const backgroundRadio = document.querySelector('input[name="background-picker"]');
    if (!backgroundRadio) {
      return;
    }

    const radiogroup = backgroundRadio.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }

    const buttons = radiogroup.querySelectorAll(":scope > div");
    if (buttons.length < 2) {
      return;
    }

    const defaultButton = buttons[0];
    const lightsOutButton = buttons[1];
    const dimButton = lightsOutButton.cloneNode(true);
    dimButton.id = DIM_BUTTON_ID;
    updateButtonColor(dimButton);

    const dimLabel = getDimLabel();
    const label = dimButton.querySelector("span");
    if (label) {
      label.textContent = dimLabel;
    }

    const input = dimButton.querySelector('input[type="radio"]');
    if (input) {
      input.setAttribute("aria-label", dimLabel);
      input.checked = false;
    }

    radiogroup.insertBefore(dimButton, lightsOutButton);

    chrome.storage.local.get("enabled", (stored) => {
      syncSettingsButtons(Boolean(stored.enabled));
    });

    dimButton.addEventListener("click", () => {
      chrome.storage.local.set({ enabled: true });
      syncSettingsButtons(true);
      activateLightsOut();
    });

    for (const nativeButton of [defaultButton, lightsOutButton]) {
      nativeButton.addEventListener("click", () => {
        if (switchingToDim) {
          return;
        }
        chrome.storage.local.set({ enabled: false });
        setUnselected(dimButton);
      });
    }
  }

  function updateSettingsButtonColor() {
    const dimButton = document.getElementById(DIM_BUTTON_ID);
    if (dimButton) {
      updateButtonColor(dimButton);
    }
  }

  function updateButtonColor(button) {
    const { hue, sat } = activeHueSat();
    button.style.backgroundColor = `hsl(${hue}, ${sat}%, 13%)`;
  }

  function activateLightsOut() {
    const dimButton = document.getElementById(DIM_BUTTON_ID);
    if (!dimButton) {
      return;
    }

    const radiogroup = dimButton.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }

    const allButtons = radiogroup.querySelectorAll(":scope > div");
    const lightsOutButton = allButtons[allButtons.length - 1];
    const lightsOutInput = lightsOutButton?.querySelector('input[type="radio"]');

    if (lightsOutInput && !lightsOutInput.checked) {
      switchingToDim = true;
      lightsOutInput.click();
      lightsOutInput.dispatchEvent(new Event("input", { bubbles: true }));
      lightsOutInput.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => {
        switchingToDim = false;
      }, 300);
    }
  }

  function syncSettingsButtons(isEnabled) {
    const dimButton = document.getElementById(DIM_BUTTON_ID);
    if (!dimButton) {
      return;
    }

    const radiogroup = dimButton.closest('[role="radiogroup"]');
    if (!radiogroup) {
      return;
    }

    const allButtons = radiogroup.querySelectorAll(":scope > div");
    const lightsOutButton = allButtons[allButtons.length - 1];

    if (isEnabled) {
      setSelected(dimButton);
      for (const button of allButtons) {
        if (button !== dimButton) {
          setUnselected(button);
        }
      }
    } else {
      setUnselected(dimButton);
      if (lightsOutButton) {
        setSelected(lightsOutButton);
      }
    }
  }

  function setSelected(button) {
    button.style.borderColor = "rgb(29, 155, 240)";
    button.style.borderWidth = "2px";
    const circle = button.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgb(29, 155, 240)";
      circle.style.borderColor = "rgb(29, 155, 240)";
      circle.innerHTML = CHECKMARK_SVG;
    }
    const input = button.querySelector('input[type="radio"]');
    if (input) {
      input.checked = true;
    }
  }

  function setUnselected(button) {
    button.style.borderColor = "rgb(51, 54, 57)";
    button.style.borderWidth = "1px";
    const circle = button.querySelector('[role="radio"] > div');
    if (circle) {
      circle.style.backgroundColor = "rgba(0, 0, 0, 0)";
      circle.style.borderColor = "rgb(185, 202, 211)";
      circle.innerHTML = "";
    }
    const input = button.querySelector('input[type="radio"]');
    if (input) {
      input.checked = false;
    }
  }

  function shouldApplyImmediately() {
    return true;
  }

  function cacheEnabled(value) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, value ? "1" : "0");
    } catch (_error) {
      /* no-op */
    }
  }

  function getDimLabel() {
    try {
      return chrome.i18n?.getMessage("dimLabel") || "Dim";
    } catch (_error) {
      return "Dim";
    }
  }

  const CHECKMARK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-jwli3a r-1hjwoze r-12ym1je"><g><path d="M9.64 18.952l-5.55-4.861 1.317-1.504 3.951 3.459 8.459-10.948L19.4 6.32 9.64 18.952z"></path></g></svg>';
})();
