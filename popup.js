/* -----------------------------------------------------------------
   Julians Tweaks — popup controller
   6 apps: X Themes, YouTube, Google, LinkedIn, Reddit, GitHub.
   Each app:
   - Owns one or more storage keys
   - Has a content script that listens to chrome.storage.onChanged
   - Renders a pane in the popup with toggle / chooser UI
   ----------------------------------------------------------------- */

const STORAGE_KEYS = {
  /* X */
  xEnabled: "enabled",
  xTheme: "theme",
  xCustomHue: "customHue",
  xCustomSat: "customSat",
  xCustomDark: "customDark",
  xBirdLogo: "birdLogo",
  xLegacyActive: "xthemes.active",
  xHideTrends: "x.hideTrends",
  xHideWhoToFollow: "x.hideWhoToFollow",
  xHideGrok: "x.hideGrok",
  xHideAds: "x.hideAds",
  xHidePremium: "x.hidePremium",
  xHideViews: "x.hideViews",
  /* YouTube */
  ytHideShorts: "youtube.hideShorts",
  ytHideSidebar: "youtube.hideSidebar",
  ytHideComments: "youtube.hideComments",
  ytHideHomeFeed: "youtube.hideHomeFeed",
  ytHideEndCards: "youtube.hideEndCards",
  ytHideLiveChat: "youtube.hideLiveChat",
  /* Google */
  googleHideAi: "google.hideAiOverview",
  googleHideSponsored: "google.hideSponsored",
  googleHidePeopleAsk: "google.hidePeopleAsk",
  googleHideRelated: "google.hideRelated",
  /* LinkedIn */
  linkedinHidePromoted: "linkedin.hidePromoted",
  linkedinHideNews: "linkedin.hideNewsRail",
  linkedinHidePymk: "linkedin.hidePymk",
  /* Reddit */
  redditHidePromoted: "reddit.hidePromoted",
  redditHideRecs: "reddit.hideRecommendations",
  redditHideSidebar: "reddit.hideSidebar",
  redditHidePremium: "reddit.hidePremium",
  redditHideAppBanner: "reddit.hideAppBanner",
  /* GitHub */
  githubHideCopilot: "github.hideCopilot",
  githubHideSponsors: "github.hideSponsors",
  githubHideFeedWidgets: "github.hideFeedWidgets",
  /* Instagram */
  instagramHideReels: "instagram.hideReels",
  /* UI */
  lastApp: "ui.lastApp"
};

const APP_META = {
  x:         { hosts: ["x.com", "twitter.com", "pro.x.com"], script: ["xdim.js", "content.js"], ping: "XDM_PING" },
  youtube:   { hosts: ["youtube.com"],          script: "youtube.js",   ping: "JT_YT_PING" },
  google:    { hosts: ["google.com", "google.de", "google.co.uk", "google.at", "google.ch"], script: "google.js", ping: "JT_GOOGLE_PING" },
  linkedin:  { hosts: ["linkedin.com"],         script: "linkedin.js",  ping: "JT_LINKEDIN_PING" },
  reddit:    { hosts: ["reddit.com"],           script: "reddit.js",    ping: "JT_REDDIT_PING" },
  github:    { hosts: ["github.com"],           script: "github.js",    ping: "JT_GITHUB_PING" },
  instagram: { hosts: ["instagram.com"],        script: "instagram.js", ping: "JT_INSTAGRAM_PING" }
};

const SHARE_URL = (() => {
  const text = encodeURIComponent("If you miss X's dark blue theme, X Dim Mode brings it back — free extension:");
  const url = encodeURIComponent("https://xdim.app");
  return `https://x.com/intent/tweet?text=${text}&url=${url}`;
})();

const RATE_URL = "https://chromewebstore.google.com/detail/x-dim-mode/cplloghlcgkjkogmbehmkhlleopnfogc/reviews";
const MAILERLITE_URL = "https://assets.mailerlite.com/jsonp/1436119/forms/179598724460184835/subscribe";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

const els = {
  tabs: document.querySelectorAll(".tab"),
  panes: document.querySelectorAll(".pane"),
  message: document.querySelector("#message"),
  /* X */
  xDimDot: document.querySelector("#xDimDot"),
  xDimToggle: document.querySelector("#xDimToggle"),
  xDimHueSlider: document.querySelector("#xDimHueSlider"),
  xDimSatSlider: document.querySelector("#xDimSatSlider"),
  xDimDarkSlider: document.querySelector("#xDimDarkSlider"),
  xDimCustomPanel: document.querySelector("#xDimCustomPanel"),
  xThemeDots: document.querySelectorAll(".xdim-theme-dot"),
  xCustomDot: document.querySelector(".xdim-custom-dot"),
  xHint: document.querySelector("#xHint"),
  xExtrasLink: document.querySelector("#xExtrasLink"),
  xCreditLink: document.querySelector("#xCreditLink"),
  xShareLink: document.querySelector("#xShareLink"),
  xVersion: document.querySelector("#xVersion"),
  xEmailPrompt: document.querySelector("#xEmailPrompt"),
  xEmailPromptText: document.querySelector("#xEmailPromptText"),
  xEmailPromptClose: document.querySelector("#xEmailPromptClose"),
  xEmailPromptForm: document.querySelector("#xEmailPromptForm"),
  xEmailPromptInput: document.querySelector("#xEmailPromptInput"),
  xEmailPromptBtn: document.querySelector("#xEmailPromptBtn"),
  xEmailPromptSpam: document.querySelector("#xEmailPromptSpam"),
  xEmailPromptSuccess: document.querySelector("#xEmailPromptSuccess"),
  xEngagePrompt: document.querySelector("#xEngagePrompt"),
  xEngageText: document.querySelector("#xEngageText"),
  xEngageClose: document.querySelector("#xEngageClose"),
  xEngageShare: document.querySelector("#xEngageShare"),
  xEngageRate: document.querySelector("#xEngageRate"),
  xBirdLogo: document.querySelector("#xBirdLogo"),
  xHideTrends: document.querySelector("#xHideTrends"),
  xHideWhoToFollow: document.querySelector("#xHideWhoToFollow"),
  xHideGrok: document.querySelector("#xHideGrok"),
  xHideAds: document.querySelector("#xHideAds"),
  xHidePremium: document.querySelector("#xHidePremium"),
  xHideViews: document.querySelector("#xHideViews"),
  /* YouTube */
  ytHideShorts: document.querySelector("#ytHideShorts"),
  ytHideSidebar: document.querySelector("#ytHideSidebar"),
  ytHideComments: document.querySelector("#ytHideComments"),
  ytHideHomeFeed: document.querySelector("#ytHideHomeFeed"),
  ytHideEndCards: document.querySelector("#ytHideEndCards"),
  ytHideLiveChat: document.querySelector("#ytHideLiveChat"),
  /* Google */
  googleHideAi: document.querySelector("#googleHideAi"),
  googleHideSponsored: document.querySelector("#googleHideSponsored"),
  googleHidePeopleAsk: document.querySelector("#googleHidePeopleAsk"),
  googleHideRelated: document.querySelector("#googleHideRelated"),
  /* LinkedIn */
  linkedinHidePromoted: document.querySelector("#linkedinHidePromoted"),
  linkedinHideNews: document.querySelector("#linkedinHideNews"),
  linkedinHidePymk: document.querySelector("#linkedinHidePymk"),
  /* Reddit */
  redditHidePromoted: document.querySelector("#redditHidePromoted"),
  redditHideRecs: document.querySelector("#redditHideRecs"),
  redditHideSidebar: document.querySelector("#redditHideSidebar"),
  redditHidePremium: document.querySelector("#redditHidePremium"),
  redditHideAppBanner: document.querySelector("#redditHideAppBanner"),
  /* GitHub */
  githubHideCopilot: document.querySelector("#githubHideCopilot"),
  githubHideSponsors: document.querySelector("#githubHideSponsors"),
  githubHideFeedWidgets: document.querySelector("#githubHideFeedWidgets"),
  /* Instagram */
  instagramHideReels: document.querySelector("#instagramHideReels")
};

let activeTab = null;
let activeTabHost = "";
let messageTimer = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  activeTab = await getActiveTab();
  activeTabHost = activeTab?.url ? hostnameOf(activeTab.url) : "";

  bindTabs();

  await initX();
  await initYouTube();
  await initGoogle();
  await initLinkedIn();
  await initReddit();
  await initGithub();
  await initInstagram();

  /* Restore last viewed app, but default to whichever the current tab is. */
  const stored = await chrome.storage.sync.get({ [STORAGE_KEYS.lastApp]: null });
  const fromHost = appForHost(activeTabHost);
  switchApp(stored[STORAGE_KEYS.lastApp] || fromHost || "x", { persist: false });
}

/* ---- Tab routing ---- */

function bindTabs() {
  for (const tab of els.tabs) {
    tab.addEventListener("click", () => switchApp(tab.dataset.app));
  }
}

function switchApp(app, { persist = true } = {}) {
  for (const tab of els.tabs) {
    const active = tab.dataset.app === app;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  }
  for (const pane of els.panes) {
    const active = pane.dataset.app === app;
    pane.classList.toggle("is-active", active);
    pane.hidden = !active;
  }

  setMessage("");

  /* Lazy-init superlevels feature pages (chrome.storage.local). These
     loaders are defined further down; guard in case a page was removed. */
  if (app === "cookies" && typeof loadCookies === "function") loadCookies();
  if (app === "redirects" && typeof loadRedirects === "function") loadRedirects();
  if (app === "darkmode" && typeof loadDarkMode === "function") loadDarkMode();
  if (app === "jstoggle" && typeof loadJsToggle === "function") loadJsToggle();
  if (app === "nocookie" && typeof loadNoCookie === "function") loadNoCookie();
  if (app === "livecss" && typeof loadLiveCSS === "function") loadLiveCSS();
  if (app === "unhook" && typeof loadUnhook === "function") loadUnhook();
  if (app === "xunhook" && typeof loadXUnhook === "function") loadXUnhook();
  if (app === "jsonformat" && typeof loadJsonFormat === "function") loadJsonFormat();
  if (app === "music" && typeof loadMusicHistory === "function") { loadMusicHistory(); loadAcrFields(); }

  if (persist) {
    chrome.storage.sync.set({ [STORAGE_KEYS.lastApp]: app });
  }
}

function appForHost(hostname) {
  const host = String(hostname || "").replace(/^www\./i, "").toLowerCase();
  for (const [app, meta] of Object.entries(APP_META)) {
    if (meta.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return app;
    }
  }
  return null;
}

/* ---- Generic toggle wiring ----
   Given a list of { input, storageKey, app, settingsKey, label }, this
   helper does the boring boilerplate: load initial state, write to
   storage on change, broadcast a settings object to the active tab if
   it matches the app, and show a status message. The settings object
   is rebuilt from ALL toggles in the group so the content script
   always gets a complete picture. */
function wireToggleGroup(app, applyMessageType, toggles) {
  const broadcast = async () => {
    const settings = Object.fromEntries(
      toggles.map((t) => [t.settingsKey, t.input.checked])
    );
    await maybeApplyToActiveTab(app, {
      type: applyMessageType,
      settings
    });
  };

  for (const t of toggles) {
    t.input.addEventListener("change", async () => {
      await chrome.storage.sync.set({ [t.storageKey]: t.input.checked });
      await broadcast();
      setMessage(t.input.checked ? `${t.label} aus` : `${t.label} sichtbar`, "success");
    });
  }
}

async function loadToggleStates(toggles) {
  const defaults = Object.fromEntries(toggles.map((t) => [t.storageKey, false]));
  const stored = await chrome.storage.sync.get(defaults);
  for (const t of toggles) {
    t.input.checked = Boolean(stored[t.storageKey]);
  }
}

/* ---- X Dim Mode ---- */

async function initX() {
  await chrome.storage.sync.remove(STORAGE_KEYS.xLegacyActive);
  initXDimLinks();
  initXDimPrompts();

  const stored = await chrome.storage.sync.get({
    [STORAGE_KEYS.xEnabled]: true,
    [STORAGE_KEYS.xTheme]: "dim",
    [STORAGE_KEYS.xCustomHue]: 210,
    [STORAGE_KEYS.xCustomSat]: 34,
    [STORAGE_KEYS.xCustomDark]: 12,
    [STORAGE_KEYS.xBirdLogo]: false
  });

  els.xDimToggle.checked = Boolean(stored[STORAGE_KEYS.xEnabled]);
  els.xBirdLogo.checked = Boolean(stored[STORAGE_KEYS.xBirdLogo]);
  els.xDimDot.classList.toggle("active", els.xDimToggle.checked);
  els.xDimHueSlider.value = normalizeHue(stored[STORAGE_KEYS.xCustomHue]);
  els.xDimSatSlider.value = normalizeSat(stored[STORAGE_KEYS.xCustomSat]);
  els.xDimDarkSlider.value = normalizeDark(stored[STORAGE_KEYS.xCustomDark]);
  setActiveXDimTheme(normalizeXDimTheme(stored[STORAGE_KEYS.xTheme]));

  els.xDimToggle.addEventListener("change", async () => {
    const enabled = els.xDimToggle.checked;
    await chrome.storage.sync.set({ [STORAGE_KEYS.xEnabled]: enabled });
    els.xDimDot.classList.toggle("active", enabled);
    await ensureActiveXScript();
    setMessage(enabled ? "Dim aktiviert" : "Dim deaktiviert", "success");
  });

  for (const dot of els.xThemeDots) {
    if (dot.dataset.theme === "custom") {
      continue;
    }
    dot.addEventListener("click", async () => {
      const theme = normalizeXDimTheme(dot.dataset.theme);
      await chrome.storage.sync.set({ [STORAGE_KEYS.xTheme]: theme });
      setActiveXDimTheme(theme);
      await ensureActiveXScript();
      setMessage(`${dot.title || theme} gespeichert`, "success");
    });
  }

  els.xCustomDot.addEventListener("click", async () => {
    setActiveXDimTheme("custom");
    await persistCustomXDim();
    setMessage("Eigene Farbe gespeichert", "success");
  });

  /* Dragging fires many input events; chrome.storage.sync is rate-limited
     (~120 writes/min), so preview live in the popup but debounce the write. */
  for (const slider of [els.xDimHueSlider, els.xDimSatSlider, els.xDimDarkSlider]) {
    slider.addEventListener("input", previewCustomXDim);
  }

  els.xBirdLogo.addEventListener("change", async () => {
    await chrome.storage.sync.set({ [STORAGE_KEYS.xBirdLogo]: els.xBirdLogo.checked });
    await ensureActiveXScript();
    setMessage(els.xBirdLogo.checked ? "Vogel-Logo aktiviert" : "X-Logo sichtbar", "success");
  });

  refreshXHint();

  const xToggles = [
    { input: els.xHideTrends,      storageKey: STORAGE_KEYS.xHideTrends,      settingsKey: "hideTrends",      label: "Trends" },
    { input: els.xHideWhoToFollow, storageKey: STORAGE_KEYS.xHideWhoToFollow, settingsKey: "hideWhoToFollow", label: "Who to follow" },
    { input: els.xHideGrok,        storageKey: STORAGE_KEYS.xHideGrok,        settingsKey: "hideGrok",        label: "Grok" },
    { input: els.xHideAds,         storageKey: STORAGE_KEYS.xHideAds,         settingsKey: "hideAds",         label: "Werbung" },
    { input: els.xHidePremium,     storageKey: STORAGE_KEYS.xHidePremium,     settingsKey: "hidePremium",     label: "Premium-Werbung" },
    { input: els.xHideViews,       storageKey: STORAGE_KEYS.xHideViews,       settingsKey: "hideViews",       label: "Aufrufzahlen" }
  ];
  await loadToggleStates(xToggles);

  /* For X we don't send applyAll messages — content.js listens to
     chrome.storage.onChanged directly for these keys. */
  for (const t of xToggles) {
    t.input.addEventListener("change", async () => {
      await chrome.storage.sync.set({ [t.storageKey]: t.input.checked });
      setMessage(t.input.checked ? `${t.label} aus` : `${t.label} sichtbar`, "success");
    });
  }
}

function setActiveXDimTheme(theme) {
  for (const dot of els.xThemeDots) {
    dot.classList.toggle("active", dot.dataset.theme === theme);
  }

  updateCustomPreview();
  els.xDimCustomPanel.classList.toggle("open", theme === "custom");
}

/* Mirrors the live custom values into the swatch + the saturation / darkness
   slider tracks so the controls preview the actual resulting colour. */
function updateCustomPreview() {
  const hue = normalizeHue(els.xDimHueSlider.value);
  const sat = normalizeSat(els.xDimSatSlider.value);
  const dark = normalizeDark(els.xDimDarkSlider.value);

  els.xCustomDot.style.background = `hsl(${hue}, ${sat}%, ${dark + 16}%)`;

  els.xDimSatSlider.style.setProperty(
    "--track",
    `linear-gradient(to right, hsl(${hue}, 0%, ${dark + 14}%), hsl(${hue}, 60%, ${dark + 14}%))`
  );
  els.xDimDarkSlider.style.setProperty(
    "--track",
    `linear-gradient(to right, hsl(${hue}, ${sat}%, 7%), hsl(${hue}, ${sat}%, 22%))`
  );
}

let customSaveTimer = null;

/* Instant in-popup preview (swatch + slider tracks), debounced persist. */
function previewCustomXDim() {
  setActiveXDimTheme("custom");
  window.clearTimeout(customSaveTimer);
  customSaveTimer = window.setTimeout(persistCustomXDim, 250);
}

async function persistCustomXDim() {
  window.clearTimeout(customSaveTimer);
  const hue = normalizeHue(els.xDimHueSlider.value);
  const sat = normalizeSat(els.xDimSatSlider.value);
  const dark = normalizeDark(els.xDimDarkSlider.value);
  await chrome.storage.sync.set({
    [STORAGE_KEYS.xTheme]: "custom",
    [STORAGE_KEYS.xCustomHue]: hue,
    [STORAGE_KEYS.xCustomSat]: sat,
    [STORAGE_KEYS.xCustomDark]: dark
  });
  await ensureActiveXScript();
}

function refreshXHint() {
  if (appForHost(activeTabHost) === "x") {
    els.xHint.textContent = "Dim wird auf diesem X-Tab sofort angewendet.";
  } else {
    els.xHint.textContent = "Öffne x.com, twitter.com oder X Pro. Dim greift dort automatisch.";
  }
}

function initXDimLinks() {
  els.xExtrasLink.title = i18nMessage("extras", "Extras");
  els.xCreditLink.textContent = "Made by @jlnfalk";
  els.xShareLink.textContent = i18nMessage("popupShareLink", "Share");
  els.xShareLink.href = SHARE_URL;
  if (els.xVersion) {
    try {
      els.xVersion.textContent = "v" + chrome.runtime.getManifest().version;
    } catch (_error) {
      /* no-op */
    }
  }
}

async function initXDimPrompts() {
  const stored = await chrome.storage.sync.get({
    installTimestamp: null,
    emailPromptDismissed: false,
    engageDismissed: false
  });

  els.xEmailPromptText.textContent = i18nMessage("emailPromptHeading", "See what I'm building next");
  els.xEmailPromptBtn.textContent = i18nMessage("subscribe", "Subscribe");
  els.xEmailPromptSpam.textContent = i18nMessage("emailNoSpam", "No spam, ever.");
  els.xEmailPromptSuccess.textContent = i18nMessage("emailSuccess", "You're in! I'll keep you posted.");
  els.xEngageText.textContent = i18nMessage("engageQuestion", "Enjoying X Dim Mode?");
  els.xEngageShare.textContent = i18nMessage("shareOnX", "Share on X");
  els.xEngageShare.href = SHARE_URL;
  els.xEngageRate.textContent = i18nMessage("engageRate", "Review");
  els.xEngageRate.href = RATE_URL;

  els.xEmailPromptClose.addEventListener("click", () => {
    chrome.storage.sync.set({ emailPromptDismissed: true });
    els.xEmailPrompt.hidden = true;
  });

  els.xEmailPromptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.xEmailPromptBtn.disabled = true;
    els.xEmailPromptBtn.textContent = "...";

    const body = new FormData();
    body.append("fields[email]", els.xEmailPromptInput.value);
    body.append("ml-submit", "1");
    body.append("anticsrf", "true");

    try {
      await fetch(MAILERLITE_URL, { method: "POST", body, mode: "no-cors" });
      els.xEmailPromptForm.hidden = true;
      els.xEmailPromptSpam.hidden = true;
      els.xEmailPromptSuccess.hidden = false;
      chrome.storage.sync.set({ emailPromptDismissed: true });
    } catch (_error) {
      els.xEmailPromptBtn.disabled = false;
      els.xEmailPromptBtn.textContent = i18nMessage("subscribe", "Subscribe");
    }
  });

  const dismissEngage = () => {
    chrome.storage.sync.set({ engageDismissed: true });
    els.xEngagePrompt.hidden = true;
  };
  els.xEngageClose.addEventListener("click", dismissEngage);
  els.xEngageShare.addEventListener("click", dismissEngage);
  els.xEngageRate.addEventListener("click", dismissEngage);

  if (!stored.installTimestamp) {
    return;
  }

  const elapsed = Date.now() - stored.installTimestamp;
  if (!stored.emailPromptDismissed && elapsed >= SEVEN_DAYS) {
    els.xEmailPrompt.hidden = false;
    return;
  }

  if (stored.emailPromptDismissed && !stored.engageDismissed && elapsed >= FOURTEEN_DAYS) {
    els.xEngagePrompt.hidden = false;
  }
}

function i18nMessage(key, fallback = "") {
  const value = chrome.i18n?.getMessage?.(key);
  return value || fallback;
}

function normalizeXDimTheme(value) {
  const allowed = new Set([
    "dim", "slate", "jade", "plum", "dusk", "ember", "teal", "indigo", "rose", "custom"
  ]);
  return allowed.has(value) ? value : "dim";
}

function normalizeSat(value) {
  const sat = Number(value);
  return Number.isFinite(sat) ? Math.min(60, Math.max(0, Math.round(sat))) : 34;
}

function normalizeDark(value) {
  const dark = Number(value);
  return Number.isFinite(dark) ? Math.min(18, Math.max(7, Math.round(dark))) : 12;
}

function normalizeHue(value) {
  const hue = Number(value);
  return Number.isFinite(hue) ? Math.min(360, Math.max(0, Math.round(hue))) : 210;
}

async function ensureActiveXScript() {
  if (appForHost(activeTabHost) !== "x") {
    return;
  }
  await sendToActiveTab({ type: "XDM_PING" }, "x");
}

/* ---- YouTube ---- */

async function initYouTube() {
  const toggles = [
    { input: els.ytHideShorts,   storageKey: STORAGE_KEYS.ytHideShorts,   settingsKey: "hideShorts",   label: "Shorts" },
    { input: els.ytHideSidebar,  storageKey: STORAGE_KEYS.ytHideSidebar,  settingsKey: "hideSidebar",  label: "Sidebar" },
    { input: els.ytHideComments, storageKey: STORAGE_KEYS.ytHideComments, settingsKey: "hideComments", label: "Kommentare" },
    { input: els.ytHideHomeFeed, storageKey: STORAGE_KEYS.ytHideHomeFeed, settingsKey: "hideHomeFeed", label: "Startseiten-Feed" },
    { input: els.ytHideEndCards, storageKey: STORAGE_KEYS.ytHideEndCards, settingsKey: "hideEndCards", label: "End-Screen-Kacheln" },
    { input: els.ytHideLiveChat, storageKey: STORAGE_KEYS.ytHideLiveChat, settingsKey: "hideLiveChat", label: "Live-Chat" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("youtube", "JT_YT_APPLY", toggles);
}

/* ---- Google ---- */

async function initGoogle() {
  const toggles = [
    { input: els.googleHideAi,         storageKey: STORAGE_KEYS.googleHideAi,         settingsKey: "hideAiOverview", label: "AI-Overviews" },
    { input: els.googleHideSponsored,  storageKey: STORAGE_KEYS.googleHideSponsored,  settingsKey: "hideSponsored",  label: "Anzeigen" },
    { input: els.googleHidePeopleAsk,  storageKey: STORAGE_KEYS.googleHidePeopleAsk,  settingsKey: "hidePeopleAsk",  label: "Ähnliche Fragen" },
    { input: els.googleHideRelated,    storageKey: STORAGE_KEYS.googleHideRelated,    settingsKey: "hideRelated",    label: "Verwandte Suchen" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("google", "JT_GOOGLE_APPLY", toggles);
}

/* ---- LinkedIn ---- */

async function initLinkedIn() {
  const toggles = [
    { input: els.linkedinHidePromoted, storageKey: STORAGE_KEYS.linkedinHidePromoted, settingsKey: "hidePromoted",  label: "Promoted" },
    { input: els.linkedinHideNews,     storageKey: STORAGE_KEYS.linkedinHideNews,     settingsKey: "hideNewsRail",  label: "News-Rail" },
    { input: els.linkedinHidePymk,     storageKey: STORAGE_KEYS.linkedinHidePymk,     settingsKey: "hidePymk",      label: "PYMK" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("linkedin", "JT_LINKEDIN_APPLY", toggles);
}

/* ---- Reddit ---- */

async function initReddit() {
  const toggles = [
    { input: els.redditHidePromoted,   storageKey: STORAGE_KEYS.redditHidePromoted,   settingsKey: "hidePromoted",        label: "Promoted" },
    { input: els.redditHideRecs,       storageKey: STORAGE_KEYS.redditHideRecs,       settingsKey: "hideRecommendations", label: "Empfehlungen" },
    { input: els.redditHideSidebar,    storageKey: STORAGE_KEYS.redditHideSidebar,    settingsKey: "hideSidebar",         label: "Sidebar" },
    { input: els.redditHidePremium,    storageKey: STORAGE_KEYS.redditHidePremium,    settingsKey: "hidePremium",         label: "Premium & Awards" },
    { input: els.redditHideAppBanner,  storageKey: STORAGE_KEYS.redditHideAppBanner,  settingsKey: "hideAppBanner",       label: "App-Banner" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("reddit", "JT_REDDIT_APPLY", toggles);
}

/* ---- GitHub ---- */

async function initGithub() {
  const toggles = [
    { input: els.githubHideCopilot,      storageKey: STORAGE_KEYS.githubHideCopilot,      settingsKey: "hideCopilot",     label: "Copilot" },
    { input: els.githubHideSponsors,     storageKey: STORAGE_KEYS.githubHideSponsors,     settingsKey: "hideSponsors",    label: "Sponsors" },
    { input: els.githubHideFeedWidgets,  storageKey: STORAGE_KEYS.githubHideFeedWidgets,  settingsKey: "hideFeedWidgets", label: "Feed-Widgets" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("github", "JT_GITHUB_APPLY", toggles);
}

/* ---- Instagram ---- */

async function initInstagram() {
  const toggles = [
    { input: els.instagramHideReels, storageKey: STORAGE_KEYS.instagramHideReels, settingsKey: "hideReels", label: "Reels" }
  ];
  await loadToggleStates(toggles);
  wireToggleGroup("instagram", "JT_INSTAGRAM_APPLY", toggles);
}

/* ---- Tab messaging helpers ---- */

/* Send a message to the active tab only if it matches the given app.
   When the active tab matches but the content script isn't yet present
   (e.g. first install, dynamic tab created before extension load), we
   inject the script then retry. */
async function maybeApplyToActiveTab(app, message) {
  if (appForHost(activeTabHost) !== app) {
    return;
  }
  await sendToActiveTab(message, app);
}

async function sendToActiveTab(message, app) {
  if (!activeTab?.id) {
    return;
  }

  const meta = APP_META[app];
  if (!meta) {
    return;
  }

  let response = await sendMessage(activeTab.id, { type: meta.ping });

  if (!response?.ok) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: Array.isArray(meta.script) ? meta.script : [meta.script]
      });
    } catch (_error) {
      throw new Error("Inhaltsskript konnte nicht geladen werden");
    }
  }

  response = await sendMessage(activeTab.id, message);
  if (!response?.ok) {
    throw new Error("Tab nahm das Update nicht an");
  }
}

function sendMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

/* ---- Helpers ---- */

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch (_error) {
    return "";
  }
}

function setMessage(text, kind = "") {
  window.clearTimeout(messageTimer);
  els.message.textContent = text;
  els.message.classList.toggle("is-error", kind === "error");
  els.message.classList.toggle("is-success", kind === "success");

  if (text && kind === "success") {
    messageTimer = window.setTimeout(() => {
      els.message.textContent = "";
      els.message.classList.remove("is-success");
    }, 2400);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   superlevels feature pages — merged in verbatim (chrome.storage.local).
   Storage keys & message types are UNCHANGED from superlevels. The
   original nav (switchToPage / last_tab) and the basic 𝕏 Dim page are
   intentionally dropped: Julian's switchApp() drives navigation and his
   enhanced X-Dim page replaces the basic one. All loaders below are
   called lazily from switchApp().
   ═══════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════
//  Tab Cleaner
// ═══════════════════════════════════
const enabledEl = document.getElementById("enabled");
const timeoutEl = document.getElementById("timeout");
const hostInput = document.getElementById("hostInput");
const addBtn = document.getElementById("addBtn");
const listEl = document.getElementById("list");

chrome.storage.local.get(["enabled", "timeoutMin", "exclusions"], (data) => {
  if (enabledEl) enabledEl.checked = data.enabled !== false;
  if (timeoutEl) timeoutEl.value = data.timeoutMin || 5;
  renderExclusionList(data.exclusions || []);
});

if (enabledEl) enabledEl.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: enabledEl.checked });
});

if (timeoutEl) timeoutEl.addEventListener("change", () => {
  const val = Math.max(1, Math.min(1440, parseInt(timeoutEl.value) || 5));
  timeoutEl.value = val;
  chrome.storage.local.set({ timeoutMin: val });
});

function addHost() {
  let host = hostInput.value.trim().toLowerCase();
  if (!host) return;
  host = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  chrome.storage.local.get(["exclusions"], (data) => {
    const exclusions = data.exclusions || [];
    if (exclusions.includes(host)) { hostInput.value = ""; return; }
    exclusions.push(host);
    chrome.storage.local.set({ exclusions }, () => {
      hostInput.value = "";
      renderExclusionList(exclusions);
    });
  });
}

if (addBtn) addBtn.addEventListener("click", addHost);
if (hostInput) hostInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addHost(); });

function removeHost(host) {
  chrome.storage.local.get(["exclusions"], (data) => {
    const exclusions = (data.exclusions || []).filter((h) => h !== host);
    chrome.storage.local.set({ exclusions }, () => renderExclusionList(exclusions));
  });
}

function renderExclusionList(exclusions) {
  if (!listEl) return;
  if (!exclusions.length) {
    listEl.innerHTML = '<div class="empty">No exclusions — all tabs can be closed</div>';
    return;
  }
  listEl.innerHTML = exclusions
    .map((h) => `<div class="item"><span>${esc(h)}</span><button data-host="${escA(h)}">&times;</button></div>`)
    .join("");
  listEl.querySelectorAll("button[data-host]").forEach((btn) => {
    btn.addEventListener("click", () => removeHost(btn.dataset.host));
  });
}

// ── Closed Tabs History ──
const closedSection = document.getElementById("closedSection");

function loadClosedTabs() {
  if (!closedSection) return;
  chrome.storage.local.get(["closed_tabs"], (data) => {
    const closed = data.closed_tabs || [];
    if (!closed.length) {
      closedSection.innerHTML = "";
      return;
    }
    closedSection.innerHTML = `
      <div class="closed-header">
        <h2 class="sl-h2">Recently Closed</h2>
        <button id="clearClosed">Clear</button>
      </div>
    ` + closed.map((t, i) => `
      <div class="closed-item" data-url="${escA(t.url)}" data-idx="${i}">
        ${t.favIconUrl ? `<img class="favicon" src="${escA(t.favIconUrl)}" onerror="this.style.display='none'">` : '<div class="favicon"></div>'}
        <span class="closed-title" title="${escA(t.url)}">${esc(t.title)}</span>
        <span class="closed-time">${timeAgo(t.time)}</span>
        <button class="reopen" title="Re-open">↗</button>
      </div>
    `).join("");

    document.getElementById("clearClosed").addEventListener("click", () => {
      chrome.storage.local.remove("closed_tabs", loadClosedTabs);
    });

    closedSection.querySelectorAll(".closed-item").forEach((item) => {
      item.addEventListener("click", () => {
        chrome.tabs.create({ url: item.dataset.url });
      });
    });
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

loadClosedTabs();

// ═══════════════════════════════════
//  Cookie Editor
// ═══════════════════════════════════
const cookieDomainEl = document.getElementById("cookieDomain");
const cookieCountEl = document.getElementById("cookieCount");
const cookieListEl = document.getElementById("cookieList");

let currentUrl = "";
let currentDomain = "";
let allCookies = [];

async function loadCookies() {
  if (!cookieListEl) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    cookieDomainEl.textContent = "No accessible page";
    cookieCountEl.textContent = "0";
    cookieListEl.innerHTML = '<div class="empty">Cannot read cookies from this page</div>';
    return;
  }
  currentUrl = tab.url;
  try {
    currentDomain = new URL(tab.url).hostname;
  } catch {
    currentDomain = "";
  }
  cookieDomainEl.textContent = currentDomain;

  const cookies = await chrome.cookies.getAll({ url: tab.url });
  cookies.sort((a, b) => a.name.localeCompare(b.name));
  allCookies = cookies;
  cookieCountEl.textContent = cookies.length;
  renderCookies(cookies);
}

function renderCookies(cookies) {
  if (!cookies.length) {
    cookieListEl.innerHTML = '<div class="empty">No cookies for this site</div>';
    return;
  }
  cookieListEl.innerHTML = cookies.map((c, i) => `
    <div class="cookie-item" data-idx="${i}">
      <div class="cookie-row">
        <span class="cookie-chevron">&#9660;</span>
        <span class="cookie-name">${esc(c.name)}</span>
        <button class="cookie-del" data-delidx="${i}" title="Delete">&times;</button>
      </div>
      <div class="cookie-details">
        <div class="cookie-field">
          <label>Name</label>
          <input type="text" value="${escA(c.name)}" data-field="name" data-i="${i}">
        </div>
        <div class="cookie-field">
          <label>Value</label>
          <textarea data-field="value" data-i="${i}">${esc(c.value)}</textarea>
        </div>
        <div class="advanced-toggle" data-adv="${i}">Show Advanced</div>
        <div class="advanced-fields" data-advf="${i}">
          <div class="cookie-field">
            <label>Domain</label>
            <input type="text" value="${escA(c.domain)}" data-field="domain" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Path</label>
            <input type="text" value="${escA(c.path)}" data-field="path" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>SameSite</label>
            <input type="text" value="${escA(c.sameSite || "unspecified")}" data-field="sameSite" data-i="${i}">
          </div>
          <div class="cookie-field">
            <label>Secure: ${c.secure ? "Yes" : "No"} &nbsp;|&nbsp; HttpOnly: ${c.httpOnly ? "Yes" : "No"}</label>
          </div>
        </div>
        <div class="cookie-actions">
          <button class="btn-save" data-saveidx="${i}">&#128190; Save</button>
          <button class="btn-del2" data-delidx="${i}">&#128465; Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  // Expand / collapse
  cookieListEl.querySelectorAll(".cookie-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".cookie-del")) return;
      row.closest(".cookie-item").classList.toggle("expanded");
    });
  });

  // Show Advanced
  cookieListEl.querySelectorAll(".advanced-toggle").forEach((t) => {
    t.addEventListener("click", () => {
      const fields = cookieListEl.querySelector(`.advanced-fields[data-advf="${t.dataset.adv}"]`);
      fields.classList.toggle("show");
      t.textContent = fields.classList.contains("show") ? "Hide Advanced" : "Show Advanced";
    });
  });

  // Delete buttons
  cookieListEl.querySelectorAll("[data-delidx]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCookie(allCookies[parseInt(btn.dataset.delidx)]);
    });
  });

  // Save buttons
  cookieListEl.querySelectorAll("[data-saveidx]").forEach((btn) => {
    btn.addEventListener("click", () => saveCookie(parseInt(btn.dataset.saveidx)));
  });
}

async function deleteCookie(cookie) {
  const protocol = cookie.secure ? "https" : "http";
  const url = `${protocol}://${cookie.domain.replace(/^\./, "")}${cookie.path}`;
  await chrome.cookies.remove({ url, name: cookie.name });
  loadCookies();
}

async function saveCookie(idx) {
  const original = allCookies[idx];
  const item = cookieListEl.querySelector(`.cookie-item[data-idx="${idx}"]`);

  const nameEl = item.querySelector('[data-field="name"]');
  const valueEl = item.querySelector('[data-field="value"]');
  const domainEl = item.querySelector('[data-field="domain"]');
  const pathEl = item.querySelector('[data-field="path"]');
  const sameSiteEl = item.querySelector('[data-field="sameSite"]');

  // Remove old cookie first
  const protocol = original.secure ? "https" : "http";
  const oldUrl = `${protocol}://${original.domain.replace(/^\./, "")}${original.path}`;
  await chrome.cookies.remove({ url: oldUrl, name: original.name });

  const domain = domainEl ? domainEl.value : original.domain;
  const path = pathEl ? pathEl.value : original.path;
  const newUrl = `${protocol}://${domain.replace(/^\./, "")}${path}`;

  const details = {
    url: newUrl,
    name: nameEl.value,
    value: valueEl.value,
    path: path,
    secure: original.secure,
    httpOnly: original.httpOnly,
    sameSite: sameSiteEl ? sameSiteEl.value : original.sameSite || "unspecified",
  };
  if (!original.hostOnly) details.domain = domain;
  if (original.expirationDate) details.expirationDate = original.expirationDate;

  await chrome.cookies.set(details);
  loadCookies();
}

// Delete All
{
  const _btnDeleteAll = document.getElementById("btnDeleteAll");
  if (_btnDeleteAll) _btnDeleteAll.addEventListener("click", async () => {
    if (!allCookies.length) return;
    for (const c of allCookies) {
      const protocol = c.secure ? "https" : "http";
      const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;
      await chrome.cookies.remove({ url, name: c.name });
    }
    loadCookies();
  });

  // Refresh
  const _btnRefresh = document.getElementById("btnRefresh");
  if (_btnRefresh) _btnRefresh.addEventListener("click", () => loadCookies());

  // Export
  const _btnExport = document.getElementById("btnExport");
  if (_btnExport) _btnExport.addEventListener("click", () => {
    if (!allCookies.length) return;
    const data = JSON.stringify(allCookies, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cookies-${currentDomain}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Add Cookie Modal
  const addModal = document.getElementById("addModal");
  const _btnAdd = document.getElementById("btnAdd");
  if (_btnAdd && addModal) _btnAdd.addEventListener("click", () => {
    document.getElementById("newDomain").value = currentDomain ? "." + currentDomain : "";
    document.getElementById("newPath").value = "/";
    document.getElementById("newName").value = "";
    document.getElementById("newValue").value = "";
    addModal.classList.add("show");
  });
  const _modalCancel = document.getElementById("modalCancel");
  if (_modalCancel && addModal) _modalCancel.addEventListener("click", () => {
    addModal.classList.remove("show");
  });
  if (addModal) addModal.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.classList.remove("show");
  });
  const _modalSave = document.getElementById("modalSave");
  if (_modalSave && addModal) _modalSave.addEventListener("click", async () => {
    const name = document.getElementById("newName").value.trim();
    if (!name) return;
    const domain = document.getElementById("newDomain").value.trim();
    const path = document.getElementById("newPath").value.trim() || "/";
    const url = `https://${domain.replace(/^\./, "")}${path}`;
    await chrome.cookies.set({
      url,
      name,
      value: document.getElementById("newValue").value,
      domain,
      path,
    });
    addModal.classList.remove("show");
    loadCookies();
  });
}

// ═══════════════════════════════════
//  Redirect Tracer
// ═══════════════════════════════════
const redirectChainEl = document.getElementById("redirectChain");
let lastRedirectText = "";

async function loadRedirects() {
  if (!redirectChainEl) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    redirectChainEl.innerHTML = '<div class="redirect-empty"><div class="big-icon">🔀</div><p>No active tab</p></div>';
    return;
  }

  const data = await chrome.runtime.sendMessage({ type: "getRedirects", tabId: tab.id });
  const chain = data.chain || [];
  const finalUrl = data.finalUrl || tab.url;
  const finalStatus = data.finalStatus || 200;

  if (!chain.length) {
    // No redirects — just show the final URL
    redirectChainEl.innerHTML = renderStep(finalUrl, finalStatus, true, false);
    lastRedirectText = `${finalUrl}\n${finalStatus}: Final destination`;
    return;
  }

  let html = "";
  let text = "";
  chain.forEach((hop, i) => {
    const label = getRedirectLabel(hop.statusCode);
    html += renderStep(hop.url, hop.statusCode, false, true);
    text += `${hop.url}\n${hop.statusCode}: ${label} to ${hop.redirectUrl}\n\n`;
  });
  // Final destination
  html += renderStep(finalUrl, finalStatus, true, false);
  text += `${finalUrl}\n${finalStatus}: Final destination`;

  redirectChainEl.innerHTML = html;
  lastRedirectText = text;
}

function renderStep(url, statusCode, isFinal, hasConnector) {
  const iconClass = isFinal ? (statusCode >= 400 ? "error" : "final") : "redirect";
  const codeClass = statusCode >= 500 ? "code-5xx" : statusCode >= 400 ? "code-4xx" : `code-${statusCode}`;
  const label = isFinal ? "Final destination" : getRedirectLabel(statusCode);
  const arrow = isFinal
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="#6af38a" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="#6ab0f3" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';

  return `
    <div class="redirect-step">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="step-icon ${iconClass}">${arrow}</div>
        ${hasConnector ? '<div class="step-connector"></div>' : ''}
      </div>
      <div class="step-content">
        <div class="step-url">${esc(url)}</div>
        <div class="step-status"><span class="code ${codeClass}">${statusCode}</span> ${esc(label)}</div>
      </div>
    </div>
  `;
}

function getRedirectLabel(code) {
  const labels = {
    301: "Permanent redirect",
    302: "Temporary redirect (Found)",
    303: "See Other",
    307: "Temporary redirect",
    308: "Permanent redirect",
  };
  return labels[code] || `Redirect (${code})`;
}

{
  const _btnRedirectRefresh = document.getElementById("btnRedirectRefresh");
  if (_btnRedirectRefresh) _btnRedirectRefresh.addEventListener("click", () => loadRedirects());

  const _btnRedirectCopy = document.getElementById("btnRedirectCopy");
  if (_btnRedirectCopy) _btnRedirectCopy.addEventListener("click", async () => {
    if (!lastRedirectText) return;
    await navigator.clipboard.writeText(lastRedirectText);
    const btn = document.getElementById("btnRedirectCopy");
    const orig = btn.querySelector("span").textContent;
    btn.querySelector("span").textContent = "Copied!";
    setTimeout(() => { btn.querySelector("span").textContent = orig; }, 1500);
  });
}

// ═══════════════════════════════════
//  Dark Mode
// ═══════════════════════════════════
const darkToggle = document.getElementById("darkToggle");
const darkStatus = document.getElementById("darkStatus");
const darkHostEl = document.getElementById("darkHost");
const darkBrightness = document.getElementById("darkBrightness");
const darkBrightnessVal = document.getElementById("darkBrightnessVal");
const scopeSite = document.getElementById("scopeSite");
const scopeGlobal = document.getElementById("scopeGlobal");

let darkHost = "";
let darkScope = "site"; // "site" or "global"

async function loadDarkMode() {
  if (!darkToggle) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { darkHost = new URL(tab.url).hostname; } catch { darkHost = ""; }
  darkHostEl.textContent = darkHost ? `Current site: ${darkHost}` : "";

  const siteKey = "darkmode_" + darkHost;
  const data = await chrome.storage.local.get([siteKey, "darkmode_global", "darkmode_brightness"]);

  const brightness = data.darkmode_brightness || 100;
  darkBrightness.value = brightness;
  darkBrightnessVal.textContent = brightness + "%";

  const siteState = data[siteKey];
  const globalState = data.darkmode_global || false;
  const enabled = siteState !== undefined ? siteState : globalState;

  darkToggle.checked = enabled;
  updateDarkStatus(enabled);
}

function updateDarkStatus(on) {
  darkStatus.textContent = on ? "ON" : "OFF";
  darkStatus.className = "sl-status " + (on ? "on" : "off");
}

async function applyDark() {
  const enabled = darkToggle.checked;
  const brightness = parseInt(darkBrightness.value);
  updateDarkStatus(enabled);

  // Save preference
  if (darkScope === "global") {
    await chrome.storage.local.set({ darkmode_global: enabled });
  } else {
    const siteKey = "darkmode_" + darkHost;
    await chrome.storage.local.set({ [siteKey]: enabled });
  }
  await chrome.storage.local.set({ darkmode_brightness: brightness });

  // Send to active tab's content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: "darkmode_toggle",
      enabled,
      brightness,
    }).catch(() => {});
  }
}

if (darkToggle) {
  darkToggle.addEventListener("change", applyDark);

  darkBrightness.addEventListener("input", () => {
    darkBrightnessVal.textContent = darkBrightness.value + "%";
  });
  darkBrightness.addEventListener("change", applyDark);

  scopeSite.addEventListener("click", () => {
    darkScope = "site";
    scopeSite.classList.add("active");
    scopeGlobal.classList.remove("active");
  });
  scopeGlobal.addEventListener("click", () => {
    darkScope = "global";
    scopeGlobal.classList.add("active");
    scopeSite.classList.remove("active");
  });
}

// ═══════════════════════════════════
//  Cookie Consent (GDPR) Dismisser
// ═══════════════════════════════════
const nocookieToggle = document.getElementById("nocookieToggle");
const nocookieStatus = document.getElementById("nocookieStatus");

async function loadNoCookie() {
  if (!nocookieToggle) return;
  const data = await chrome.storage.local.get(["nocookie_enabled"]);
  const enabled = data.nocookie_enabled !== false;
  nocookieToggle.checked = enabled;
  updateNoCookieUI(enabled);
}

function updateNoCookieUI(on) {
  nocookieStatus.textContent = on ? "ON" : "OFF";
  nocookieStatus.className = "sl-status " + (on ? "on" : "off");
}

if (nocookieToggle) nocookieToggle.addEventListener("change", async () => {
  const enabled = nocookieToggle.checked;
  updateNoCookieUI(enabled);
  await chrome.storage.local.set({ nocookie_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "nocookie_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  Live CSS Editor
// ═══════════════════════════════════
const livecssHostEl = document.getElementById("livecssHost");
const livecssEditor = document.getElementById("livecssEditor");
const livecssSave = document.getElementById("livecssSave");
const livecssClear = document.getElementById("livecssClear");

let livecssHost = "";

async function loadLiveCSS() {
  if (!livecssEditor) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { livecssHost = new URL(tab.url).hostname; } catch { livecssHost = ""; }
  livecssHostEl.textContent = livecssHost ? `Editing CSS for: ${livecssHost}` : "No accessible page";

  const key = "livecss_" + livecssHost;
  const data = await chrome.storage.local.get([key]);
  livecssEditor.value = data[key] || "";
}

if (livecssEditor) {
  // Live preview as user types
  livecssEditor.addEventListener("input", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: livecssEditor.value }).catch(() => {});
    }
  });

  // Allow Tab key to insert spaces in textarea
  livecssEditor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = livecssEditor.selectionStart;
      const end = livecssEditor.selectionEnd;
      livecssEditor.value = livecssEditor.value.substring(0, start) + "  " + livecssEditor.value.substring(end);
      livecssEditor.selectionStart = livecssEditor.selectionEnd = start + 2;
      livecssEditor.dispatchEvent(new Event("input"));
    }
  });

  livecssSave.addEventListener("click", async () => {
    const key = "livecss_" + livecssHost;
    await chrome.storage.local.set({ [key]: livecssEditor.value });
    livecssSave.textContent = "Saved!";
    setTimeout(() => { livecssSave.textContent = "Save"; }, 1500);
  });

  livecssClear.addEventListener("click", async () => {
    livecssEditor.value = "";
    const key = "livecss_" + livecssHost;
    await chrome.storage.local.remove(key);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: "livecss_update", css: "" }).catch(() => {});
    }
  });
}

// ═══════════════════════════════════
//  YouTube Unhook
// ═══════════════════════════════════
const unhookToggle = document.getElementById("unhookToggle");
const unhookStatus = document.getElementById("unhookStatus");

async function loadUnhook() {
  if (!unhookToggle) return;
  const data = await chrome.storage.local.get(["unhook_enabled"]);
  const enabled = data.unhook_enabled !== false;
  unhookToggle.checked = enabled;
  updateUnhookUI(enabled);
}

function updateUnhookUI(on) {
  unhookStatus.textContent = on ? "ON" : "OFF";
  unhookStatus.className = "sl-status " + (on ? "on" : "off");
}

if (unhookToggle) unhookToggle.addEventListener("change", async () => {
  const enabled = unhookToggle.checked;
  updateUnhookUI(enabled);
  await chrome.storage.local.set({ unhook_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "unhook_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  X Unhook
// ═══════════════════════════════════
const xunhookToggle = document.getElementById("xunhookToggle");
const xunhookStatus = document.getElementById("xunhookStatus");

async function loadXUnhook() {
  if (!xunhookToggle) return;
  const data = await chrome.storage.local.get(["xunhook_enabled"]);
  const enabled = data.xunhook_enabled !== false;
  xunhookToggle.checked = enabled;
  updateXUnhookUI(enabled);
}

function updateXUnhookUI(on) {
  xunhookStatus.textContent = on ? "ON" : "OFF";
  xunhookStatus.className = "sl-status " + (on ? "on" : "off");
}

if (xunhookToggle) xunhookToggle.addEventListener("change", async () => {
  const enabled = xunhookToggle.checked;
  updateXUnhookUI(enabled);
  await chrome.storage.local.set({ xunhook_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "xunhook_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  JavaScript Toggle
// ═══════════════════════════════════
const jsToggle = document.getElementById("jsToggle");
const jsStatus = document.getElementById("jsStatus");
const jsIndicator = document.getElementById("jsIndicator");
const jsHostLabel = document.getElementById("jsHostLabel");

let jsHost = "";

async function loadJsToggle() {
  if (!jsToggle) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  try { jsHost = new URL(tab.url).hostname; } catch { jsHost = ""; }
  jsHostLabel.textContent = jsHost || "No accessible page";

  if (!jsHost) return;

  if (!chrome.contentSettings || !chrome.contentSettings.javascript) return;
  const pattern = `https://${jsHost}/*`;
  chrome.contentSettings.javascript.get({ primaryUrl: pattern }, (details) => {
    const enabled = details.setting === "allow";
    jsToggle.checked = enabled;
    updateJsUI(enabled);
  });
}

function updateJsUI(enabled) {
  jsStatus.textContent = enabled ? "ENABLED" : "DISABLED";
  jsStatus.className = "sl-status " + (enabled ? "on" : "off");
  jsIndicator.className = "indicator " + (enabled ? "on" : "off");
}

if (jsToggle) jsToggle.addEventListener("change", async () => {
  const enabled = jsToggle.checked;
  updateJsUI(enabled);

  if (!chrome.contentSettings || !chrome.contentSettings.javascript) return;
  const pattern = `https://${jsHost}/*`;
  chrome.contentSettings.javascript.set({
    primaryPattern: pattern,
    setting: enabled ? "allow" : "block",
  });
  // Also set for http
  chrome.contentSettings.javascript.set({
    primaryPattern: `http://${jsHost}/*`,
    setting: enabled ? "allow" : "block",
  });

  // Reload the tab so the change takes effect
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) chrome.tabs.reload(tab.id);
});

// ═══════════════════════════════════
//  Music Recognizer (ACRCloud)
// ═══════════════════════════════════
// ACRCloud credentials — loaded from storage so they're not hardcoded in source
let ACR_HOST = "";
let ACR_KEY = "";
let ACR_SECRET = "";

// Load saved creds (set defaults on first run)
chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
  ACR_HOST = data.acr_host || "identify-eu-west-1.acrcloud.com";
  ACR_KEY = data.acr_key || "";
  ACR_SECRET = data.acr_secret || "";
});

const listenBtn = document.getElementById("listenBtn");
const listenTimer = document.getElementById("listenTimer");
const listenLabel = document.getElementById("listenLabel");
const musicResult = document.getElementById("musicResult");
const musicHistoryEl = document.getElementById("musicHistory");
let isRecording = false;

if (listenBtn) listenBtn.addEventListener("click", () => {
  if (isRecording) return;
  startListening();
});

async function startListening() {
  if (!ACR_KEY || !ACR_SECRET) {
    musicResult.innerHTML = `<div class="music-error">ACRCloud credentials not set. <a href="https://www.acrcloud.com/sign-up/" target="_blank" style="color:#6a9fd8;">Sign up free</a> and add them below.</div>`;
    showAcrConfig();
    return;
  }
  isRecording = true;
  listenBtn.classList.add("recording");
  listenBtn.closest(".music-center").classList.add("active");
  listenLabel.textContent = "Listening...";
  musicResult.innerHTML = "";

  let seconds = 10;
  listenTimer.textContent = seconds + "s";
  const interval = setInterval(() => {
    seconds--;
    listenTimer.textContent = seconds + "s";
    if (seconds <= 0) clearInterval(interval);
  }, 1000);

  try {
    const stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (s) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!s) return reject(new Error("No audio stream"));
        resolve(s);
      });
    });

    // Pipe audio back to speakers so user still hears it
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(audioCtx.destination);

    // Record 5 seconds
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        source.disconnect();
        audioCtx.close();
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: "audio/webm" }));
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 10000);
    });

    clearInterval(interval);
    listenTimer.textContent = "";
    listenLabel.textContent = "Identifying...";

    const result = await identifyWithACR(blob);
    showResult(result);
  } catch (err) {
    clearInterval(interval);
    musicResult.innerHTML = `<div class="music-error">${esc(err.message)}</div>`;
    showAcrConfig();
  } finally {
    isRecording = false;
    listenBtn.classList.remove("recording");
    listenBtn.closest(".music-center").classList.remove("active");
    listenTimer.textContent = "";
    listenLabel.textContent = "Tap to listen";
  }
}

async function hmacSha1(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function identifyWithACR(audioBlob) {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `POST\n/v1/identify\n${ACR_KEY}\naudio\n1\n${timestamp}`;
  const signature = await hmacSha1(ACR_SECRET, stringToSign);

  const arrayBuf = await audioBlob.arrayBuffer();
  const form = new FormData();
  form.append("access_key", ACR_KEY);
  form.append("data_type", "audio");
  form.append("signature_version", "1");
  form.append("signature", signature);
  form.append("timestamp", timestamp.toString());
  form.append("sample_bytes", arrayBuf.byteLength.toString());
  form.append("sample", audioBlob, "sample.webm");

  const resp = await fetch(`https://${ACR_HOST}/v1/identify`, { method: "POST", body: form });
  const data = await resp.json();

  if (data.status && data.status.code === 0 && data.metadata) {
    const music = data.metadata.music;
    const humming = data.metadata.humming;
    if (music && music.length > 0) return music[0];
    if (humming && humming.length > 0) return humming[0];
    throw new Error("Song recognized but no match found. Try a clearer part of the track.");
  } else if (data.status && data.status.code === 0) {
    throw new Error("No match found. Try during a clearer part of the song (e.g. chorus).");
  } else if (data.status && data.status.code === 1001) {
    throw new Error("No music detected. Make sure audio is playing in the tab.");
  } else {
    throw new Error(data.status ? data.status.msg : "Unknown error");
  }
}

function showResult(song) {
  const title = song.title || "Unknown";
  const artist = (song.artists || []).map((a) => a.name).join(", ") || "Unknown";
  const album = song.album ? song.album.name : "";

  const ytQuery = encodeURIComponent(`${title} ${artist}`);
  const ytUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

  musicResult.innerHTML = `
    <a class="song-card" href="${ytUrl}" target="_blank" style="text-decoration:none;color:inherit;cursor:pointer;">
      <div class="art">🎵</div>
      <div class="info">
        <div class="title">${esc(title)}</div>
        <div class="artist">${esc(artist)}</div>
        ${album ? `<div class="album">${esc(album)}</div>` : ""}
      </div>
      <div style="color:#e94560;font-size:18px;flex-shrink:0;">▶</div>
    </a>
  `;

  // Save to history
  chrome.storage.local.get(["music_history"], (data) => {
    const history = data.music_history || [];
    history.unshift({ title, artist, album, time: Date.now() });
    if (history.length > 20) history.length = 20;
    chrome.storage.local.set({ music_history: history }, loadMusicHistory);
  });
}

// ACR config save/load
{
  const _acrSaveBtn = document.getElementById("acrSaveBtn");
  if (_acrSaveBtn) _acrSaveBtn.addEventListener("click", () => {
    const host = document.getElementById("acrHost").value.trim();
    const key = document.getElementById("acrKey").value.trim();
    const secret = document.getElementById("acrSecret").value.trim();
    ACR_HOST = host || ACR_HOST;
    ACR_KEY = key;
    ACR_SECRET = secret;
    chrome.storage.local.set({ acr_host: ACR_HOST, acr_key: ACR_KEY, acr_secret: ACR_SECRET });
    document.getElementById("acrSaveBtn").textContent = "Saved!";
    setTimeout(() => { document.getElementById("acrSaveBtn").textContent = "Save"; }, 1500);
  });

  const _acrSettingsBtn = document.getElementById("acrSettingsBtn");
  if (_acrSettingsBtn) _acrSettingsBtn.addEventListener("click", () => {
    const cfg = document.getElementById("acrConfig");
    if (cfg.style.display === "none") {
      cfg.style.display = "";
      // Load fields without the auto-hide logic
      chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
        document.getElementById("acrHost").value = data.acr_host || "identify-eu-west-1.acrcloud.com";
        document.getElementById("acrKey").value = data.acr_key || "";
        document.getElementById("acrSecret").value = data.acr_secret || "";
      });
    } else {
      cfg.style.display = "none";
    }
  });
}

function showAcrConfig() {
  const cfg = document.getElementById("acrConfig");
  if (cfg) cfg.style.display = "";
}

// Load ACR fields when music tab opens
function loadAcrFields() {
  if (!document.getElementById("acrHost")) return;
  chrome.storage.local.get(["acr_host", "acr_key", "acr_secret"], (data) => {
    document.getElementById("acrHost").value = data.acr_host || "identify-eu-west-1.acrcloud.com";
    document.getElementById("acrKey").value = data.acr_key || "";
    document.getElementById("acrSecret").value = data.acr_secret || "";
    // Only show config if creds are missing
    if (!data.acr_key || !data.acr_secret) showAcrConfig();
    else document.getElementById("acrConfig").style.display = "none";
  });
}

function loadMusicHistory() {
  if (!musicHistoryEl) return;
  chrome.storage.local.get(["music_history"], (data) => {
    const history = data.music_history || [];
    if (!history.length) {
      musicHistoryEl.innerHTML = "";
      return;
    }
    musicHistoryEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><h2>Recent</h2><button id="clearHistory" style="background:none;border:none;color:#e94560;font-size:11px;cursor:pointer;">Clear</button></div>` + history.map((h) => {
      const q = encodeURIComponent(`${h.title} ${h.artist}`);
      return `<a class="history-item" href="https://www.youtube.com/results?search_query=${q}" target="_blank" style="text-decoration:none;color:inherit;cursor:pointer;">
        <span class="h-title">${esc(h.title)}</span>
        <span class="h-artist">${esc(h.artist)}</span>
        <span style="color:#e94560;font-size:12px;flex-shrink:0;">▶</span>
      </a>`;
    }).join("");
    document.getElementById("clearHistory").addEventListener("click", () => {
      chrome.storage.local.remove("music_history", loadMusicHistory);
    });
  });
}

// ═══════════════════════════════════
//  Picture-in-Picture
// ═══════════════════════════════════
const pipBtn = document.getElementById("pipBtn");
const pipLabel = document.getElementById("pipLabel");
const pipStatus = document.getElementById("pipStatus");

if (pipBtn) pipBtn.addEventListener("click", enterPiP);

async function enterPiP() {
  pipStatus.textContent = "";
  pipStatus.className = "pip-status";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    pipStatus.textContent = "No active tab";
    pipStatus.className = "pip-status err";
    return;
  }

  try {
    const result = await chrome.runtime.sendMessage({ type: "pip", tabId: tab.id });
    if (!result) {
      pipStatus.textContent = "Could not access page";
      pipStatus.className = "pip-status err";
    } else if (result.error) {
      pipStatus.textContent = result.error;
      pipStatus.className = "pip-status err";
    } else if (result.action === "entered") {
      pipStatus.textContent = "Video in Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.add("active");
    } else if (result.action === "exited") {
      pipStatus.textContent = "Exited Picture-in-Picture";
      pipStatus.className = "pip-status ok";
      pipBtn.classList.remove("active");
    }
  } catch (err) {
    pipStatus.textContent = err.message;
    pipStatus.className = "pip-status err";
  }
}

// ═══════════════════════════════════
//  JSON Formatter
// ═══════════════════════════════════
const jsonformatToggle = document.getElementById("jsonformatToggle");
const jsonformatStatus = document.getElementById("jsonformatStatus");

async function loadJsonFormat() {
  if (!jsonformatToggle) return;
  const data = await chrome.storage.local.get(["jsonformat_enabled"]);
  const enabled = data.jsonformat_enabled !== false;
  jsonformatToggle.checked = enabled;
  updateJsonFormatUI(enabled);
}

function updateJsonFormatUI(on) {
  jsonformatStatus.textContent = on ? "ON" : "OFF";
  jsonformatStatus.className = "sl-status " + (on ? "on" : "off");
}

if (jsonformatToggle) jsonformatToggle.addEventListener("change", async () => {
  const enabled = jsonformatToggle.checked;
  updateJsonFormatUI(enabled);
  await chrome.storage.local.set({ jsonformat_enabled: enabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { type: "jsonformat_toggle", enabled }).catch(() => {});
  }
});

// ═══════════════════════════════════
//  Helpers (superlevels)
// ═══════════════════════════════════
function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function escA(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
