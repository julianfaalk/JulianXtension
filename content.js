(() => {
  if (window.__xthemesLoaded === true) {
    return;
  }
  window.__xthemesLoaded = true;

  // X hide-toggles. The dim theme lives in xdim.js — this script only owns the
  // optional "hide trends / who-to-follow / Grok" tweaks. Each tweak is a root
  // class on <html> gating a display:none rule, flipped from chrome.storage so
  // the popup never has to message individual tabs.

  const HIDES_STYLE_ID = "xthemes-hides-style";
  const LEGACY_THEME_KEY = "xthemes.active";

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

  // Purge any data left by the retired CSS-variable theme system.
  chrome.storage.local.remove(LEGACY_THEME_KEY).catch(() => {});

  loadStoredHides();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    for (const [name, key] of Object.entries(HIDE_KEYS)) {
      if (changes[key]) {
        toggleHide(name, Boolean(changes[key].newValue));
      }
    }
  });

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
})();
