(() => {
  if (window.__juliansTweaksInstagramLoaded === true) {
    return;
  }
  window.__juliansTweaksInstagramLoaded = true;

  const STYLE_ID = "julians-tweaks-instagram-style";
  const CLASS = {
    hideReels: "julians-tweaks-instagram-hide-reels"
  };
  const STORAGE_KEYS = {
    hideReels: "instagram.hideReels"
  };
  const MESSAGE_TYPES = {
    ping: "JT_INSTAGRAM_PING",
    apply: "JT_INSTAGRAM_APPLY"
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
      applyAll(message.settings || {});
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }
    if (changes[STORAGE_KEYS.hideReels]) {
      toggleRootClass(CLASS.hideReels, Boolean(changes[STORAGE_KEYS.hideReels].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.sync.get({
        [STORAGE_KEYS.hideReels]: false
      });
      applyAll({
        hideReels: Boolean(stored[STORAGE_KEYS.hideReels])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyle();
    toggleRootClass(CLASS.hideReels, Boolean(settings.hideReels));
  }

  function toggleRootClass(klass, on) {
    if (document.documentElement) {
      document.documentElement.classList.toggle(klass, on);
    } else {
      window.requestAnimationFrame(() => toggleRootClass(klass, on));
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "JuliansTweaks";
    style.textContent = CSS;
    (document.head || document.documentElement).append(style);
  }

  /* Instagram uses generated class names that change frequently. The most
     stable hooks are href patterns. We hide:
     - Sidebar "Reels" nav item (any <a href="/reels/...">)
     - Feed/explore items that link to a reel URL
     - The dedicated /reels/ landing page itself stays available; we only
       hide entry points from other pages. */
  const CSS = `
/* ---- Sidebar / nav entry to Reels ---- */
html.${CLASS.hideReels} a[href="/reels/"],
html.${CLASS.hideReels} a[href^="/reels/"][role="link"]:has(svg[aria-label="Reels" i]),
html.${CLASS.hideReels} a[href="/reels/"][role="link"] {
  display: none !important;
}

/* ---- Feed Reels card (multiple variants over time) ---- */
html.${CLASS.hideReels} article:has(a[href*="/reel/"]),
html.${CLASS.hideReels} section:has(> h2):has(a[href*="/reel/"]),
html.${CLASS.hideReels} div[role="presentation"]:has(a[href*="/reel/"]),
html.${CLASS.hideReels} main [style*="aspect-ratio"]:has(a[href*="/reel/"]) {
  display: none !important;
}

/* ---- Explore grid: hide reels tiles ---- */
html.${CLASS.hideReels} a[href*="/reel/"][role="link"] {
  display: none !important;
}

/* ---- Profile tabs: hide the "Reels" tab on user profiles ---- */
html.${CLASS.hideReels} a[href$="/reels/"][role="tab"],
html.${CLASS.hideReels} div[role="tab"]:has(svg[aria-label="Reels" i]) {
  display: none !important;
}
`;
})();
