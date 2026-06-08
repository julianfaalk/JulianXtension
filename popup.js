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
  /* YouTube */
  ytHideShorts: "youtube.hideShorts",
  ytHideSidebar: "youtube.hideSidebar",
  ytHideComments: "youtube.hideComments",
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
  /* YouTube */
  ytHideShorts: document.querySelector("#ytHideShorts"),
  ytHideSidebar: document.querySelector("#ytHideSidebar"),
  ytHideComments: document.querySelector("#ytHideComments"),
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
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.lastApp]: null });
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

  if (persist) {
    chrome.storage.local.set({ [STORAGE_KEYS.lastApp]: app });
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
      await chrome.storage.local.set({ [t.storageKey]: t.input.checked });
      await broadcast();
      setMessage(t.input.checked ? `${t.label} aus` : `${t.label} sichtbar`, "success");
    });
  }
}

async function loadToggleStates(toggles) {
  const defaults = Object.fromEntries(toggles.map((t) => [t.storageKey, false]));
  const stored = await chrome.storage.local.get(defaults);
  for (const t of toggles) {
    t.input.checked = Boolean(stored[t.storageKey]);
  }
}

/* ---- X Dim Mode ---- */

async function initX() {
  await chrome.storage.local.remove(STORAGE_KEYS.xLegacyActive);
  initXDimLinks();
  initXDimPrompts();

  const stored = await chrome.storage.local.get({
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
    await chrome.storage.local.set({ [STORAGE_KEYS.xEnabled]: enabled });
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
      await chrome.storage.local.set({ [STORAGE_KEYS.xTheme]: theme });
      setActiveXDimTheme(theme);
      await ensureActiveXScript();
      setMessage(`${dot.title || theme} gespeichert`, "success");
    });
  }

  els.xCustomDot.addEventListener("click", async () => {
    await saveCustomXDim();
    setMessage("Eigene Farbe gespeichert", "success");
  });

  for (const slider of [els.xDimHueSlider, els.xDimSatSlider, els.xDimDarkSlider]) {
    slider.addEventListener("input", saveCustomXDim);
  }

  els.xBirdLogo.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.xBirdLogo]: els.xBirdLogo.checked });
    await ensureActiveXScript();
    setMessage(els.xBirdLogo.checked ? "Vogel-Logo aktiviert" : "X-Logo sichtbar", "success");
  });

  refreshXHint();

  const xToggles = [
    { input: els.xHideTrends,      storageKey: STORAGE_KEYS.xHideTrends,      settingsKey: "hideTrends",      label: "Trends" },
    { input: els.xHideWhoToFollow, storageKey: STORAGE_KEYS.xHideWhoToFollow, settingsKey: "hideWhoToFollow", label: "Who to follow" },
    { input: els.xHideGrok,        storageKey: STORAGE_KEYS.xHideGrok,        settingsKey: "hideGrok",        label: "Grok" }
  ];
  await loadToggleStates(xToggles);

  /* For X we don't send applyAll messages — content.js listens to
     chrome.storage.onChanged directly for these keys. */
  for (const t of xToggles) {
    t.input.addEventListener("change", async () => {
      await chrome.storage.local.set({ [t.storageKey]: t.input.checked });
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

async function saveCustomXDim() {
  const hue = normalizeHue(els.xDimHueSlider.value);
  const sat = normalizeSat(els.xDimSatSlider.value);
  const dark = normalizeDark(els.xDimDarkSlider.value);
  await chrome.storage.local.set({
    [STORAGE_KEYS.xTheme]: "custom",
    [STORAGE_KEYS.xCustomHue]: hue,
    [STORAGE_KEYS.xCustomSat]: sat,
    [STORAGE_KEYS.xCustomDark]: dark
  });
  setActiveXDimTheme("custom");
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
  els.xCreditLink.textContent = i18nMessage("credit", "Made by @juanbuis");
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
  const stored = await chrome.storage.local.get({
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
    chrome.storage.local.set({ emailPromptDismissed: true });
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
      chrome.storage.local.set({ emailPromptDismissed: true });
    } catch (_error) {
      els.xEmailPromptBtn.disabled = false;
      els.xEmailPromptBtn.textContent = i18nMessage("subscribe", "Subscribe");
    }
  });

  const dismissEngage = () => {
    chrome.storage.local.set({ engageDismissed: true });
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
    { input: els.ytHideComments, storageKey: STORAGE_KEYS.ytHideComments, settingsKey: "hideComments", label: "Kommentare" }
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
    { input: els.redditHidePromoted,  storageKey: STORAGE_KEYS.redditHidePromoted, settingsKey: "hidePromoted",        label: "Promoted" },
    { input: els.redditHideRecs,      storageKey: STORAGE_KEYS.redditHideRecs,     settingsKey: "hideRecommendations", label: "Empfehlungen" },
    { input: els.redditHideSidebar,   storageKey: STORAGE_KEYS.redditHideSidebar,  settingsKey: "hideSidebar",         label: "Sidebar" }
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
