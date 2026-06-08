(() => {
  if (window.__juliansTweaksRedditLoaded === true) {
    return;
  }
  window.__juliansTweaksRedditLoaded = true;

  const STYLE_ID = "julians-tweaks-reddit-style";

  // name -> { key: storage key, class: root class toggled on <html> }
  const FEATURES = {
    hidePromoted: { key: "reddit.hidePromoted", class: "julians-tweaks-reddit-hide-promoted" },
    hideRecommendations: { key: "reddit.hideRecommendations", class: "julians-tweaks-reddit-hide-recs" },
    hideSidebar: { key: "reddit.hideSidebar", class: "julians-tweaks-reddit-hide-sidebar" },
    hidePremium: { key: "reddit.hidePremium", class: "julians-tweaks-reddit-hide-premium" },
    hideAppBanner: { key: "reddit.hideAppBanner", class: "julians-tweaks-reddit-hide-appbanner" }
  };
  const CLASS = Object.fromEntries(Object.entries(FEATURES).map(([n, f]) => [n, f.class]));
  const MESSAGE_TYPES = { ping: "JT_REDDIT_PING", apply: "JT_REDDIT_APPLY" };

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
    ensureStyle();
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

/* ---- Recommended subreddit content & sidebars ---- */
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

/* ---- Premium / Gold / Awards upsells ---- */
html.${CLASS.hidePremium} a[href*="/premium"],
html.${CLASS.hidePremium} a[href*="reddit_premium" i],
html.${CLASS.hidePremium} [aria-label*="Reddit Premium" i],
html.${CLASS.hidePremium} faceplate-tracker[noun*="premium" i],
html.${CLASS.hidePremium} [aria-label*="Give Award" i],
html.${CLASS.hidePremium} [aria-label*="Award" i][role="button"],
html.${CLASS.hidePremium} award-button,
html.${CLASS.hidePremium} shreddit-award-button,
html.${CLASS.hidePremium} shreddit-async-loader[bundlename*="award" i] {
  display: none !important;
}

/* ---- "Open in app" / use-the-app banners ---- */
html.${CLASS.hideAppBanner} xpromo-app-selector,
html.${CLASS.hideAppBanner} reddit-app-selector,
html.${CLASS.hideAppBanner} shreddit-experience-tree,
html.${CLASS.hideAppBanner} [bundlename*="xpromo" i],
html.${CLASS.hideAppBanner} [aria-label*="Open Reddit" i],
html.${CLASS.hideAppBanner} [aria-label*="Open in the app" i],
html.${CLASS.hideAppBanner} [data-testid="bottom-bar"]:has([href*="play.google"]),
html.${CLASS.hideAppBanner} [data-testid="bottom-bar"]:has([href*="apps.apple"]) {
  display: none !important;
}
`;
})();
