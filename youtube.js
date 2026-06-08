(() => {
  if (window.__juliansTweaksYTLoaded === true) {
    return;
  }
  window.__juliansTweaksYTLoaded = true;

  const STYLE_ID = "julians-tweaks-yt-style";

  // name -> { key: storage key, class: root class toggled on <html> }
  const FEATURES = {
    hideShorts: { key: "youtube.hideShorts", class: "julians-tweaks-hide-shorts" },
    hideSidebar: { key: "youtube.hideSidebar", class: "julians-tweaks-yt-hide-sidebar" },
    hideComments: { key: "youtube.hideComments", class: "julians-tweaks-yt-hide-comments" },
    hideHomeFeed: { key: "youtube.hideHomeFeed", class: "julians-tweaks-yt-hide-home" },
    hideEndCards: { key: "youtube.hideEndCards", class: "julians-tweaks-yt-hide-endcards" },
    hideLiveChat: { key: "youtube.hideLiveChat", class: "julians-tweaks-yt-hide-livechat" }
  };
  const CLASS = Object.fromEntries(Object.entries(FEATURES).map(([n, f]) => [n, f.class]));
  const MESSAGE_TYPES = { ping: "JT_YT_PING", apply: "JT_YT_APPLY" };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }
    if (message.type === MESSAGE_TYPES.ping) {
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === MESSAGE_TYPES.apply) {
      applyAll(message.settings || pickLegacy(message));
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  /* Backwards compat: earlier popup versions sent { hideShorts } directly. */
  function pickLegacy(message) {
    return Object.fromEntries(Object.keys(FEATURES).map((n) => [n, Boolean(message[n])]));
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }
    for (const f of Object.values(FEATURES)) {
      if (changes[f.key]) {
        toggleRootClass(f.class, Boolean(changes[f.key].newValue));
      }
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const defaults = Object.fromEntries(Object.values(FEATURES).map((f) => [f.key, false]));
      const stored = await chrome.storage.sync.get(defaults);
      const settings = {};
      for (const [name, f] of Object.entries(FEATURES)) {
        settings[name] = Boolean(stored[f.key]);
      }
      applyAll(settings);
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyleInjected();
    for (const [name, f] of Object.entries(FEATURES)) {
      toggleRootClass(f.class, Boolean(settings[name]));
    }
  }

  function toggleRootClass(klass, on) {
    if (document.documentElement) {
      document.documentElement.classList.toggle(klass, on);
    } else {
      window.requestAnimationFrame(() => toggleRootClass(klass, on));
    }
  }

  function ensureStyleInjected() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "JuliansTweaks";
    style.textContent = CSS;
    (document.head || document.documentElement).append(style);
  }

  /* CSS only matches when <html> has the corresponding root class. */
  const CSS = `
/* === HIDE SHORTS ============================================== */

/* --- Sidebar entries (mini guide + full guide) --- */
html.${CLASS.hideShorts} ytd-mini-guide-entry-renderer:has(a[title="Shorts" i]),
html.${CLASS.hideShorts} ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
html.${CLASS.hideShorts} ytd-guide-entry-renderer:has(a[title="Shorts" i]),
html.${CLASS.hideShorts} ytd-guide-entry-renderer:has(a[href="/shorts"]),
html.${CLASS.hideShorts} a[href="/shorts"][title="Shorts" i],
html.${CLASS.hideShorts} a[href="/shorts"] {
  display: none !important;
}

/* --- Home / Subscriptions: Shorts shelves --- */
html.${CLASS.hideShorts} ytd-rich-shelf-renderer[is-shorts],
html.${CLASS.hideShorts} ytd-reel-shelf-renderer,
html.${CLASS.hideShorts} ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
html.${CLASS.hideShorts} ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
html.${CLASS.hideShorts} grid-shelf-view-model:has(a[href*="/shorts/"]),
html.${CLASS.hideShorts} ytm-shorts-lockup-view-model,
html.${CLASS.hideShorts} ytm-shorts-lockup-view-model-v2 {
  display: none !important;
}

/* --- Search results: Shorts videos + Shorts shelves --- */
html.${CLASS.hideShorts} ytd-video-renderer:has(a[href*="/shorts/"]),
html.${CLASS.hideShorts} ytd-shorts,
html.${CLASS.hideShorts} ytd-search ytd-reel-shelf-renderer {
  display: none !important;
}

/* --- Watch page sidebar (related): hide Shorts items --- */
html.${CLASS.hideShorts} ytd-compact-video-renderer:has(a[href*="/shorts/"]),
html.${CLASS.hideShorts} ytd-compact-renderer:has(a[href*="/shorts/"]),
html.${CLASS.hideShorts} yt-lockup-view-model:has(a[href*="/shorts/"]) {
  display: none !important;
}

/* --- Channel pages: hide the "Shorts" tab --- */
html.${CLASS.hideShorts} yt-tab-shape[tab-title="Shorts" i],
html.${CLASS.hideShorts} tp-yt-paper-tab:has(yt-formatted-string[title="Shorts" i]),
html.${CLASS.hideShorts} ytd-tab-renderer:has(a[href*="/shorts"]) {
  display: none !important;
}

/* --- Mobile / responsive Shorts entries --- */
html.${CLASS.hideShorts} ytm-pivot-bar-item-renderer:has(a[href="/shorts"]) {
  display: none !important;
}

/* === HIDE WATCH-PAGE SIDEBAR (related videos) ================= */
html.${CLASS.hideSidebar} ytd-watch-flexy:not([theater]) #secondary,
html.${CLASS.hideSidebar} ytd-watch-flexy:not([theater]) #secondary-inner,
html.${CLASS.hideSidebar} ytd-watch-flexy #related,
html.${CLASS.hideSidebar} ytd-watch-next-secondary-results-renderer {
  display: none !important;
}

/* Re-center primary column when sidebar is hidden */
html.${CLASS.hideSidebar} ytd-watch-flexy[is-two-columns_] #primary {
  max-width: min(1280px, calc(100% - 48px)) !important;
  margin-inline: auto !important;
}

/* === HIDE COMMENTS ============================================ */
html.${CLASS.hideComments} ytd-comments,
html.${CLASS.hideComments} ytd-comments#comments,
html.${CLASS.hideComments} #comments {
  display: none !important;
}

/* === HIDE HOME FEED (focus mode) ============================= */
/* Empties the YouTube home page — subscriptions, search and the rest of
   YouTube keep working. Scoped to page-subtype="home" so other pages stay. */
html.${CLASS.hideHomeFeed} ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
html.${CLASS.hideHomeFeed} ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer,
html.${CLASS.hideHomeFeed} ytd-browse[page-subtype="home"] ytd-feed-filter-chip-bar-renderer {
  display: none !important;
}

/* === HIDE END-SCREEN CARDS =================================== */
/* The suggested-video / channel cards overlaid in the last seconds. */
html.${CLASS.hideEndCards} .ytp-ce-element,
html.${CLASS.hideEndCards} .ytp-ce-covering-overlay,
html.${CLASS.hideEndCards} .ytp-endscreen-content,
html.${CLASS.hideEndCards} .html5-endscreen {
  display: none !important;
}

/* === HIDE LIVE CHAT ========================================== */
html.${CLASS.hideLiveChat} ytd-live-chat-frame,
html.${CLASS.hideLiveChat} #chat-container,
html.${CLASS.hideLiveChat} #chat.ytd-watch-flexy {
  display: none !important;
}
`;
})();
