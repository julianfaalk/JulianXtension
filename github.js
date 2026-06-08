(() => {
  if (window.__juliansTweaksGithubLoaded === true) {
    return;
  }
  window.__juliansTweaksGithubLoaded = true;

  const STYLE_ID = "julians-tweaks-github-style";
  const CLASS = {
    hideCopilot: "julians-tweaks-github-hide-copilot",
    hideSponsors: "julians-tweaks-github-hide-sponsors",
    hideFeedWidgets: "julians-tweaks-github-hide-feed-widgets"
  };
  const STORAGE_KEYS = {
    hideCopilot: "github.hideCopilot",
    hideSponsors: "github.hideSponsors",
    hideFeedWidgets: "github.hideFeedWidgets"
  };
  const MESSAGE_TYPES = {
    ping: "JT_GITHUB_PING",
    apply: "JT_GITHUB_APPLY"
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
    if (changes[STORAGE_KEYS.hideCopilot]) {
      toggleRootClass(CLASS.hideCopilot, Boolean(changes[STORAGE_KEYS.hideCopilot].newValue));
    }
    if (changes[STORAGE_KEYS.hideSponsors]) {
      toggleRootClass(CLASS.hideSponsors, Boolean(changes[STORAGE_KEYS.hideSponsors].newValue));
    }
    if (changes[STORAGE_KEYS.hideFeedWidgets]) {
      toggleRootClass(CLASS.hideFeedWidgets, Boolean(changes[STORAGE_KEYS.hideFeedWidgets].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.sync.get({
        [STORAGE_KEYS.hideCopilot]: false,
        [STORAGE_KEYS.hideSponsors]: false,
        [STORAGE_KEYS.hideFeedWidgets]: false
      });
      applyAll({
        hideCopilot: Boolean(stored[STORAGE_KEYS.hideCopilot]),
        hideSponsors: Boolean(stored[STORAGE_KEYS.hideSponsors]),
        hideFeedWidgets: Boolean(stored[STORAGE_KEYS.hideFeedWidgets])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyle();
    toggleRootClass(CLASS.hideCopilot, Boolean(settings.hideCopilot));
    toggleRootClass(CLASS.hideSponsors, Boolean(settings.hideSponsors));
    toggleRootClass(CLASS.hideFeedWidgets, Boolean(settings.hideFeedWidgets));
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
/* ---- Copilot CTAs, banners, upgrade nags ---- */
html.${CLASS.hideCopilot} .js-feature-preview-indicator-pulse,
html.${CLASS.hideCopilot} [data-testid="copilot-suggestion-banner"],
html.${CLASS.hideCopilot} [data-test-selector="copilot-banner"],
html.${CLASS.hideCopilot} react-app[app-name*="copilot" i],
html.${CLASS.hideCopilot} copilot-popover,
html.${CLASS.hideCopilot} copilot-chat-button,
html.${CLASS.hideCopilot} [aria-label="Open Copilot" i],
html.${CLASS.hideCopilot} [aria-label*="Copilot Chat" i],
html.${CLASS.hideCopilot} a[href$="/copilot"],
html.${CLASS.hideCopilot} a[href*="/copilot/"],
html.${CLASS.hideCopilot} a[href*="features/copilot"],
html.${CLASS.hideCopilot} .Header-link[href*="copilot" i],
html.${CLASS.hideCopilot} [data-target="copilot-popover-anchor.summary"],
html.${CLASS.hideCopilot} .js-copilot-chat-button {
  display: none !important;
}

/* Copilot floating chat icon bottom-right */
html.${CLASS.hideCopilot} #copilot-chat-launcher,
html.${CLASS.hideCopilot} button[data-target="copilot-chat-launcher.launcherButton"],
html.${CLASS.hideCopilot} [class*="copilot-launcher" i] {
  display: none !important;
}

/* ---- Sponsor CTAs (heart button, sponsor sections, GitHub Sponsors marketing) ---- */
html.${CLASS.hideSponsors} a[href*="/sponsors/"],
html.${CLASS.hideSponsors} a[href$="/sponsors"],
html.${CLASS.hideSponsors} [data-test-selector="ftr-sponsorlink"],
html.${CLASS.hideSponsors} .btn-sponsor,
html.${CLASS.hideSponsors} .Button:has(.octicon-heart),
html.${CLASS.hideSponsors} include-fragment[src*="sponsor_button" i],
html.${CLASS.hideSponsors} [aria-label*="Sponsor" i]:not([aria-label*="contributor" i]),
html.${CLASS.hideSponsors} .Header-link[href*="sponsors" i],
html.${CLASS.hideSponsors} .repository-content > div:has(a[href*="/sponsors/"]),
html.${CLASS.hideSponsors} .BorderGrid-row:has(a[href*="/sponsors/"]) {
  display: none !important;
}

/* ---- Home feed widgets ("Your work", "Latest from your network",
        "Explore repositories", trending suggestions) ---- */
html.${CLASS.hideFeedWidgets} feed-summary-item-card,
html.${CLASS.hideFeedWidgets} home-feed-suggestions-grid,
html.${CLASS.hideFeedWidgets} explore-feed,
html.${CLASS.hideFeedWidgets} for-you-feed-empty-state,
html.${CLASS.hideFeedWidgets} .news-feed-widget,
html.${CLASS.hideFeedWidgets} dashboard-feed,
html.${CLASS.hideFeedWidgets} [aria-label="Your work" i],
html.${CLASS.hideFeedWidgets} [aria-label*="Latest changes" i],
html.${CLASS.hideFeedWidgets} feed-trending-repositories,
html.${CLASS.hideFeedWidgets} .dashboard-sidebar,
html.${CLASS.hideFeedWidgets} #dashboard .feed-content-header,
html.${CLASS.hideFeedWidgets} aside[aria-label*="Suggestions" i],
html.${CLASS.hideFeedWidgets} aside[aria-label*="Latest changes" i],
html.${CLASS.hideFeedWidgets} aside[aria-label*="Discussions" i],
html.${CLASS.hideFeedWidgets} aside[aria-label*="Explore" i],
html.${CLASS.hideFeedWidgets} aside.feed-right-sidebar {
  display: none !important;
}
`;
})();
