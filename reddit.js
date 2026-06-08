(() => {
  if (window.__juliansTweaksRedditLoaded === true) {
    return;
  }
  window.__juliansTweaksRedditLoaded = true;

  const STYLE_ID = "julians-tweaks-reddit-style";
  const CLASS = {
    hidePromoted: "julians-tweaks-reddit-hide-promoted",
    hideRecommendations: "julians-tweaks-reddit-hide-recs",
    hideSidebar: "julians-tweaks-reddit-hide-sidebar"
  };
  const STORAGE_KEYS = {
    hidePromoted: "reddit.hidePromoted",
    hideRecommendations: "reddit.hideRecommendations",
    hideSidebar: "reddit.hideSidebar"
  };
  const MESSAGE_TYPES = {
    ping: "JT_REDDIT_PING",
    apply: "JT_REDDIT_APPLY"
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
    if (changes[STORAGE_KEYS.hidePromoted]) {
      toggleRootClass(CLASS.hidePromoted, Boolean(changes[STORAGE_KEYS.hidePromoted].newValue));
    }
    if (changes[STORAGE_KEYS.hideRecommendations]) {
      toggleRootClass(CLASS.hideRecommendations, Boolean(changes[STORAGE_KEYS.hideRecommendations].newValue));
    }
    if (changes[STORAGE_KEYS.hideSidebar]) {
      toggleRootClass(CLASS.hideSidebar, Boolean(changes[STORAGE_KEYS.hideSidebar].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.sync.get({
        [STORAGE_KEYS.hidePromoted]: false,
        [STORAGE_KEYS.hideRecommendations]: false,
        [STORAGE_KEYS.hideSidebar]: false
      });
      applyAll({
        hidePromoted: Boolean(stored[STORAGE_KEYS.hidePromoted]),
        hideRecommendations: Boolean(stored[STORAGE_KEYS.hideRecommendations]),
        hideSidebar: Boolean(stored[STORAGE_KEYS.hideSidebar])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyle();
    toggleRootClass(CLASS.hidePromoted, Boolean(settings.hidePromoted));
    toggleRootClass(CLASS.hideRecommendations, Boolean(settings.hideRecommendations));
    toggleRootClass(CLASS.hideSidebar, Boolean(settings.hideSidebar));
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
/* ---- Promoted posts ----
   shreddit (new Reddit web component layer) uses <shreddit-ad-post>.
   Legacy markup also uses [data-promoted="true"]. */
html.${CLASS.hidePromoted} shreddit-ad-post,
html.${CLASS.hidePromoted} [data-promoted="true"],
html.${CLASS.hidePromoted} [data-testid="post-container"][data-promoted="true"],
html.${CLASS.hidePromoted} .promotedlink,
html.${CLASS.hidePromoted} article:has(shreddit-ad-post),
html.${CLASS.hidePromoted} faceplate-tracker[source="post_consume_unit"]:has(shreddit-ad-post),
html.${CLASS.hidePromoted} a[href*="/r/Advertising"][aria-label*="promoted" i] {
  display: none !important;
}

/* ---- Recommended subreddit content & sidebars ----
   The right rail mostly hosts "Popular communities", "Trending today",
   etc. — hide those modules. */
html.${CLASS.hideRecommendations} reddit-recent-pages,
html.${CLASS.hideRecommendations} popular-communities-list,
html.${CLASS.hideRecommendations} recommended-communities-list,
html.${CLASS.hideRecommendations} community-highlight-carousel,
html.${CLASS.hideRecommendations} subreddit-recommendations,
html.${CLASS.hideRecommendations} [data-testid="frontpage-sidebar"] [data-testid*="recommend" i],
html.${CLASS.hideRecommendations} aside [aria-label*="recommend" i],
html.${CLASS.hideRecommendations} aside [aria-label*="popular communities" i],
html.${CLASS.hideRecommendations} faceplate-tracker[source="community_recommendations" i],
html.${CLASS.hideRecommendations} faceplate-tracker[noun*="recommend" i],
html.${CLASS.hideRecommendations} shreddit-gallery-carousel:has([href*="/r/"]) {
  display: none !important;
}

/* Hide carousel of suggested communities that appears between posts */
html.${CLASS.hideRecommendations} shreddit-feed shreddit-gallery-carousel,
html.${CLASS.hideRecommendations} shreddit-feed [feed-position]:has(shreddit-gallery-carousel) {
  display: none !important;
}

/* ---- Right sidebar (community info, related) ---- */
html.${CLASS.hideSidebar} reddit-sidebar-nav,
html.${CLASS.hideSidebar} .subgrid-container > aside,
html.${CLASS.hideSidebar} aside[role="complementary"],
html.${CLASS.hideSidebar} [data-testid="frontpage-sidebar"],
html.${CLASS.hideSidebar} #right-sidebar-container,
html.${CLASS.hideSidebar} .side {
  display: none !important;
}

/* Expand the main column when the sidebar is hidden */
html.${CLASS.hideSidebar} .subgrid-container {
  grid-template-columns: 1fr !important;
}
`;
})();
