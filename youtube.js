(() => {
  if (window.__juliansTweaksYTLoaded === true) {
    return;
  }
  window.__juliansTweaksYTLoaded = true;

  const STYLE_ID = "julians-tweaks-yt-style";
  const ROOT_CLASS = "julians-tweaks-hide-shorts";
  const STORAGE_KEY = "youtube.hideShorts";
  const MESSAGE_TYPES = {
    ping: "JT_YT_PING",
    apply: "JT_YT_APPLY"
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === MESSAGE_TYPES.ping) {
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === MESSAGE_TYPES.apply) {
      applyHideShorts(Boolean(message.hideShorts));
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) {
      return;
    }
    applyHideShorts(Boolean(changes[STORAGE_KEY].newValue));
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.local.get({ [STORAGE_KEY]: false });
      applyHideShorts(Boolean(stored[STORAGE_KEY]));
    } catch (_error) {
      /* no-op */
    }
  }

  function applyHideShorts(enabled) {
    ensureStyleInjected();
    if (document.documentElement) {
      document.documentElement.classList.toggle(ROOT_CLASS, enabled);
    } else {
      // <html> not yet present at document_start; retry shortly.
      window.requestAnimationFrame(() => applyHideShorts(enabled));
    }
  }

  function ensureStyleInjected() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "JuliansTweaks";
    style.textContent = HIDE_SHORTS_CSS;
    (document.head || document.documentElement).append(style);
  }

  /* CSS only matches when <html> has the ROOT_CLASS, so toggling the class
     is the on/off switch — no need to add/remove a style element. */
  const HIDE_SHORTS_CSS = `
/* --- Sidebar entries (mini guide + full guide) --- */
html.${ROOT_CLASS} ytd-mini-guide-entry-renderer:has(a[title="Shorts" i]),
html.${ROOT_CLASS} ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
html.${ROOT_CLASS} ytd-guide-entry-renderer:has(a[title="Shorts" i]),
html.${ROOT_CLASS} ytd-guide-entry-renderer:has(a[href="/shorts"]),
html.${ROOT_CLASS} a[href="/shorts"][title="Shorts" i],
html.${ROOT_CLASS} a[href="/shorts"] {
  display: none !important;
}

/* --- Home / Subscriptions: Shorts shelves --- */
html.${ROOT_CLASS} ytd-rich-shelf-renderer[is-shorts],
html.${ROOT_CLASS} ytd-reel-shelf-renderer,
html.${ROOT_CLASS} ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
html.${ROOT_CLASS} ytd-rich-section-renderer:has(ytd-reel-shelf-renderer),
html.${ROOT_CLASS} grid-shelf-view-model:has(a[href*="/shorts/"]),
html.${ROOT_CLASS} ytm-shorts-lockup-view-model,
html.${ROOT_CLASS} ytm-shorts-lockup-view-model-v2 {
  display: none !important;
}

/* --- Search results: Shorts videos + Shorts shelves --- */
html.${ROOT_CLASS} ytd-video-renderer:has(a[href*="/shorts/"]),
html.${ROOT_CLASS} ytd-shorts,
html.${ROOT_CLASS} ytd-search ytd-reel-shelf-renderer {
  display: none !important;
}

/* --- Watch page sidebar (related): hide Shorts items --- */
html.${ROOT_CLASS} ytd-compact-video-renderer:has(a[href*="/shorts/"]),
html.${ROOT_CLASS} ytd-compact-renderer:has(a[href*="/shorts/"]),
html.${ROOT_CLASS} yt-lockup-view-model:has(a[href*="/shorts/"]) {
  display: none !important;
}

/* --- Channel pages: hide the "Shorts" tab --- */
html.${ROOT_CLASS} yt-tab-shape[tab-title="Shorts" i],
html.${ROOT_CLASS} tp-yt-paper-tab:has(yt-formatted-string[title="Shorts" i]),
html.${ROOT_CLASS} ytd-tab-renderer:has(a[href*="/shorts"]) {
  display: none !important;
}

/* --- Mobile / responsive Shorts entries --- */
html.${ROOT_CLASS} ytm-pivot-bar-item-renderer:has(a[href="/shorts"]) {
  display: none !important;
}
`;
})();
