(() => {
  if (window.__juliansTweaksGoogleLoaded === true) {
    return;
  }
  window.__juliansTweaksGoogleLoaded = true;

  const STYLE_ID = "julians-tweaks-google-style";
  const CLASS = {
    hideAiOverview: "julians-tweaks-google-hide-ai",
    hideSponsored: "julians-tweaks-google-hide-sponsored"
  };
  const STORAGE_KEYS = {
    hideAiOverview: "google.hideAiOverview",
    hideSponsored: "google.hideSponsored"
  };
  const MESSAGE_TYPES = {
    ping: "JT_GOOGLE_PING",
    apply: "JT_GOOGLE_APPLY"
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
    if (areaName !== "local") {
      return;
    }
    if (changes[STORAGE_KEYS.hideAiOverview]) {
      toggleRootClass(CLASS.hideAiOverview, Boolean(changes[STORAGE_KEYS.hideAiOverview].newValue));
    }
    if (changes[STORAGE_KEYS.hideSponsored]) {
      toggleRootClass(CLASS.hideSponsored, Boolean(changes[STORAGE_KEYS.hideSponsored].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.local.get({
        [STORAGE_KEYS.hideAiOverview]: false,
        [STORAGE_KEYS.hideSponsored]: false
      });
      applyAll({
        hideAiOverview: Boolean(stored[STORAGE_KEYS.hideAiOverview]),
        hideSponsored: Boolean(stored[STORAGE_KEYS.hideSponsored])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyle();
    toggleRootClass(CLASS.hideAiOverview, Boolean(settings.hideAiOverview));
    toggleRootClass(CLASS.hideSponsored, Boolean(settings.hideSponsored));
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

  const CSS = `
/* ---- AI Overview ----
   Google labels the AI block with multiple identifiers that change
   regularly. Catch the known stable ones plus their typical containers. */
html.${CLASS.hideAiOverview} [data-attrid*="ai_overview" i],
html.${CLASS.hideAiOverview} [data-attrid*="aioverview" i],
html.${CLASS.hideAiOverview} [data-attrid="kc:/aiOverview"],
html.${CLASS.hideAiOverview} [data-attrid*="kp.*ai" i],
html.${CLASS.hideAiOverview} div[jscontroller="vBV3Bd"],
html.${CLASS.hideAiOverview} div[jsname="V67aGc"],
html.${CLASS.hideAiOverview} div[jsname="X3vCwd"],
html.${CLASS.hideAiOverview} #m-x-content,
html.${CLASS.hideAiOverview} #_msla_e_,
html.${CLASS.hideAiOverview} .M8OgIe,
html.${CLASS.hideAiOverview} .AIBob,
html.${CLASS.hideAiOverview} [data-subtree*="ai_overview" i],
html.${CLASS.hideAiOverview} block-component[data-attrid*="ai" i],
html.${CLASS.hideAiOverview} div[data-async-context*="ai_overview" i] {
  display: none !important;
}

/* The AI Overview block has a distinctive parent wrapper above the search
   results when expanded — collapse it too. */
html.${CLASS.hideAiOverview} #search > div > div > div:has([data-attrid*="ai_overview" i]),
html.${CLASS.hideAiOverview} #rcnt > div > div:has([data-attrid*="ai_overview" i]) {
  display: none !important;
}

/* ---- Sponsored / paid ads ---- */
html.${CLASS.hideSponsored} [data-text-ad],
html.${CLASS.hideSponsored} [data-text-ad="1"],
html.${CLASS.hideSponsored} #tads,
html.${CLASS.hideSponsored} #tadsb,
html.${CLASS.hideSponsored} #bottomads,
html.${CLASS.hideSponsored} .commercial-unit-desktop-top,
html.${CLASS.hideSponsored} .commercial-unit-desktop-rhs,
html.${CLASS.hideSponsored} .ads-fr,
html.${CLASS.hideSponsored} .cu-container,
html.${CLASS.hideSponsored} [aria-label="Anzeigen" i],
html.${CLASS.hideSponsored} [aria-label="Werbung" i],
html.${CLASS.hideSponsored} [aria-label="Sponsored" i],
html.${CLASS.hideSponsored} [aria-label="Ads" i],
html.${CLASS.hideSponsored} div[jscontroller="msmzHf"],
html.${CLASS.hideSponsored} div[jscontroller="LBKAYf"],
html.${CLASS.hideSponsored} .uEierd,
html.${CLASS.hideSponsored} [data-pla] {
  display: none !important;
}

/* Shopping carousel that appears for product queries */
html.${CLASS.hideSponsored} [data-async-context*="shopping" i],
html.${CLASS.hideSponsored} .pla-unit-container,
html.${CLASS.hideSponsored} .commercial-unit-desktop-rhs {
  display: none !important;
}
`;
})();
