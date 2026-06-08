(() => {
  if (window.__juliansTweaksLinkedInLoaded === true) {
    return;
  }
  window.__juliansTweaksLinkedInLoaded = true;

  const STYLE_ID = "julians-tweaks-linkedin-style";
  const CLASS = {
    hidePromoted: "julians-tweaks-linkedin-hide-promoted",
    hideNewsRail: "julians-tweaks-linkedin-hide-news",
    hidePymk: "julians-tweaks-linkedin-hide-pymk"
  };
  const STORAGE_KEYS = {
    hidePromoted: "linkedin.hidePromoted",
    hideNewsRail: "linkedin.hideNewsRail",
    hidePymk: "linkedin.hidePymk"
  };
  const MESSAGE_TYPES = {
    ping: "JT_LINKEDIN_PING",
    apply: "JT_LINKEDIN_APPLY"
  };

  /* LinkedIn doesn't reliably tag promoted posts with a stable class.
     A MutationObserver walks the feed and marks each post container
     with a data-attribute we can hide via CSS. */
  let observer = null;

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
      markPromotedPosts();
    }
    if (changes[STORAGE_KEYS.hideNewsRail]) {
      toggleRootClass(CLASS.hideNewsRail, Boolean(changes[STORAGE_KEYS.hideNewsRail].newValue));
    }
    if (changes[STORAGE_KEYS.hidePymk]) {
      toggleRootClass(CLASS.hidePymk, Boolean(changes[STORAGE_KEYS.hidePymk].newValue));
    }
  });

  loadStored();

  async function loadStored() {
    try {
      const stored = await chrome.storage.sync.get({
        [STORAGE_KEYS.hidePromoted]: false,
        [STORAGE_KEYS.hideNewsRail]: false,
        [STORAGE_KEYS.hidePymk]: false
      });
      applyAll({
        hidePromoted: Boolean(stored[STORAGE_KEYS.hidePromoted]),
        hideNewsRail: Boolean(stored[STORAGE_KEYS.hideNewsRail]),
        hidePymk: Boolean(stored[STORAGE_KEYS.hidePymk])
      });
    } catch (_error) {
      /* no-op */
    }
  }

  function applyAll(settings) {
    ensureStyle();
    toggleRootClass(CLASS.hidePromoted, Boolean(settings.hidePromoted));
    toggleRootClass(CLASS.hideNewsRail, Boolean(settings.hideNewsRail));
    toggleRootClass(CLASS.hidePymk, Boolean(settings.hidePymk));
    if (settings.hidePromoted) {
      ensureObserver();
      markPromotedPosts();
    } else {
      stopObserver();
    }
  }

  function toggleRootClass(klass, on) {
    if (document.documentElement) {
      document.documentElement.classList.toggle(klass, on);
    } else {
      window.requestAnimationFrame(() => toggleRootClass(klass, on));
    }
  }

  function ensureObserver() {
    if (observer || !document.documentElement) {
      return;
    }
    observer = new MutationObserver(() => {
      window.requestIdleCallback
        ? window.requestIdleCallback(markPromotedPosts, { timeout: 800 })
        : window.setTimeout(markPromotedPosts, 250);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  /* Walk feed posts; if a post contains a "Promoted" / "Anzeige" label,
     stamp it with data-jt-promoted="1". Idempotent — skips already-marked
     items. */
  function markPromotedPosts() {
    if (!document.body) {
      return;
    }

    const posts = document.querySelectorAll(
      ".feed-shared-update-v2:not([data-jt-promoted]), [data-id^='urn:li:activity']:not([data-jt-promoted])"
    );

    for (const post of posts) {
      const labels = post.querySelectorAll(".feed-shared-actor__sub-description, .update-components-actor__sub-description, .update-components-header__text-view, [aria-hidden='true']");
      let promoted = false;
      for (const label of labels) {
        const text = (label.textContent || "").trim().toLowerCase();
        if (text === "promoted" || text === "anzeige" || text === "gesponsert" || text.includes("promoted ·") || text.includes("anzeige ·")) {
          promoted = true;
          break;
        }
      }
      if (promoted) {
        post.setAttribute("data-jt-promoted", "1");
      }
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
/* ---- Promoted posts (marked by markPromotedPosts) ---- */
html.${CLASS.hidePromoted} [data-jt-promoted="1"],
html.${CLASS.hidePromoted} .feed-shared-update-v2:has([data-test-id="promoted-label"]),
html.${CLASS.hidePromoted} .feed-shared-update-v2:has([data-ad-banner-container]) {
  display: none !important;
}

/* ---- News rail (right side) ---- */
html.${CLASS.hideNewsRail} aside.scaffold-layout__aside,
html.${CLASS.hideNewsRail} .scaffold-layout__aside,
html.${CLASS.hideNewsRail} aside[aria-label*="news" i],
html.${CLASS.hideNewsRail} .news-module,
html.${CLASS.hideNewsRail} #ad-banner,
html.${CLASS.hideNewsRail} .ad-banner-container {
  display: none !important;
}

/* When the news rail is hidden, give the feed more room */
html.${CLASS.hideNewsRail} .scaffold-layout__main {
  margin-right: auto !important;
  max-width: 760px !important;
}

/* ---- People you may know widgets ---- */
html.${CLASS.hidePymk} [data-id^="pymk"],
html.${CLASS.hidePymk} [aria-label*="People you may know" i],
html.${CLASS.hidePymk} [aria-label*="Personen, die Sie kennen" i],
html.${CLASS.hidePymk} [aria-label*="Personen, die du kennen" i],
html.${CLASS.hidePymk} .pymk-list,
html.${CLASS.hidePymk} .discovery-people-card,
html.${CLASS.hidePymk} section:has(> header > h2):has(.discover-entity-type-card),
html.${CLASS.hidePymk} .feed-shared-update-v2:has([data-id^="urn:li:fsd_pymk"]),
html.${CLASS.hidePymk} li.artdeco-list__item:has(button[aria-label*="Connect with" i]),
html.${CLASS.hidePymk} .scaffold-finite-scroll__content section:has(.discover-entity-type-card) {
  display: none !important;
}
`;
})();
