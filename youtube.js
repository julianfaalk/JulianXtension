(() => {
  if (window.__juliansTweaksYTLoaded === true) {
    return;
  }
  window.__juliansTweaksYTLoaded = true;

  const STYLE_ID = "julians-tweaks-yt-style";
  const CLASS = {
    hideShorts: "julians-tweaks-hide-shorts",
    hideSidebar: "julians-tweaks-yt-hide-sidebar",
    hideComments: "julians-tweaks-yt-hide-comments"
  };
  const STORAGE_KEYS = {
    hideShorts: "youtube.hideShorts",
    hideSidebar: "youtube.hideSidebar",
    hideComments: "youtube.hideComments"
  };
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
      applyAll(message.settings || pickLegacy(message));
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  /* Backwards compat: earlier popup versions sent { hideShorts } directly
     instead of { settings: { ... } }. */
  function pickLegacy(message) {
    return {
      hideShorts: Boolean(message.hideShorts),
      hideSidebar: Boolean(message.hideSidebar),
      hideComments: Boolean(message.hideComments)
    };
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes[STORAGE_KEYS.hideShorts]) {
      toggleRootClass(CLASS.hideShorts, Boolean(changes[STORAGE_KEYS.hideShorts].newValue));
    }
    if (changes[STORAGE_KEYS.hideSidebar]) {
      toggleRootClass(CLASS.hideSidebar, Boolean(changes[STORAGE_KEYS.hideSidebar].newValue));
    }
    if (changes[STORAGE_KEYS.hideComments]) {
      toggleRootClass(CLASS.hideComments, Boolean(changes[STORAGE_KEYS.hideComments].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.local.get({
        [STORAGE_KEYS.hideShorts]: false,
        [STORAGE_KEYS.hideSidebar]: false,
        [STORAGE_KEYS.hideComments]: false
      });
      applyAll({
        hideShorts: Boolean(stored[STORAGE_KEYS.hideShorts]),
        hideSidebar: Boolean(stored[STORAGE_KEYS.hideSidebar]),
        hideComments: Boolean(stored[STORAGE_KEYS.hideComments])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyleInjected();
    toggleRootClass(CLASS.hideShorts, Boolean(settings.hideShorts));
    toggleRootClass(CLASS.hideSidebar, Boolean(settings.hideSidebar));
    toggleRootClass(CLASS.hideComments, Boolean(settings.hideComments));
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
    style.textContent = HIDE_SHORTS_CSS;
    (document.head || document.documentElement).append(style);
  }

  /* applyHideShorts kept for any old callers (none in current popup) */
  function applyHideShorts(enabled) {
    applyAll({ hideShorts: enabled });
  }
  void applyHideShorts;

  /* CSS only matches when <html> has the corresponding root class.
     Toggling the class is the on/off switch. */
  const HIDE_SHORTS_CSS = `
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
`;
})();
