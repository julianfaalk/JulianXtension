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
  xActive: "xthemes.active",
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
  x:         { hosts: ["x.com", "twitter.com"], script: "content.js",   ping: "XTHEMES_PING" },
  youtube:   { hosts: ["youtube.com"],          script: "youtube.js",   ping: "JT_YT_PING" },
  google:    { hosts: ["google.com", "google.de", "google.co.uk", "google.at", "google.ch"], script: "google.js", ping: "JT_GOOGLE_PING" },
  linkedin:  { hosts: ["linkedin.com"],         script: "linkedin.js",  ping: "JT_LINKEDIN_PING" },
  reddit:    { hosts: ["reddit.com"],           script: "reddit.js",    ping: "JT_REDDIT_PING" },
  github:    { hosts: ["github.com"],           script: "github.js",    ping: "JT_GITHUB_PING" },
  instagram: { hosts: ["instagram.com"],        script: "instagram.js", ping: "JT_INSTAGRAM_PING" }
};

const X_MESSAGES = {
  applyTheme: "XTHEMES_APPLY",
  clearTheme: "XTHEMES_CLEAR"
};

const PRESETS = [
  { id: "x-dim",       name: "X Dim",       tagline: "Klassisches X Dim-Blau",
    colors: { background: "#15202b", surface: "#1c2733", text: "#f5f8fa", mutedText: "#8899a6", accent: "#1d9bf0", button: "#1d9bf0", buttonText: "#ffffff", border: "#38444d" } },
  { id: "lights-out",  name: "Lights Out",  tagline: "Reines Schwarz, weißer Button",
    colors: { background: "#000000", surface: "#16181c", text: "#e7e9ea", mutedText: "#71767b", accent: "#1d9bf0", button: "#eff3f4", buttonText: "#0f1419", border: "#2f3336" } },
  { id: "midnight",    name: "Midnight",    tagline: "Tiefes Mitternachtsblau",
    colors: { background: "#0a0e1a", surface: "#141b2d", text: "#e8eaf6", mutedText: "#7986cb", accent: "#7986cb", button: "#5c6bc0", buttonText: "#ffffff", border: "#283048" } },
  { id: "obsidian",    name: "Obsidian",    tagline: "Schwarz mit Cyan-Akzent",
    colors: { background: "#05070b", surface: "#101722", text: "#f8fafc", mutedText: "#94a3b8", accent: "#38bdf8", button: "#38bdf8", buttonText: "#00111f", border: "#263244" } },
  { id: "aurora",      name: "Aurora",      tagline: "Grünes Leuchten",
    colors: { background: "#06120f", surface: "#0e231c", text: "#e9fff5", mutedText: "#8bb8a4", accent: "#5eead4", button: "#34d399", buttonText: "#03120d", border: "#21463a" } },
  { id: "ultraviolet", name: "Ultraviolet", tagline: "Violett auf Tinte",
    colors: { background: "#0b0a18", surface: "#17142a", text: "#f4f0ff", mutedText: "#a99cc8", accent: "#a78bfa", button: "#7c3aed", buttonText: "#ffffff", border: "#342a59" } },
  { id: "ember",       name: "Ember",       tagline: "Warmes Orange",
    colors: { background: "#15100c", surface: "#241811", text: "#fff4e8", mutedText: "#c19a7a", accent: "#fb923c", button: "#f97316", buttonText: "#160802", border: "#4a2f20" } },
  { id: "rose-noir",   name: "Rose Noir",   tagline: "Rosa auf Anthrazit",
    colors: { background: "#120d12", surface: "#201721", text: "#fff1f8", mutedText: "#b99bab", accent: "#f472b6", button: "#ec4899", buttonText: "#ffffff", border: "#463044" } },
  { id: "forest",      name: "Forest",      tagline: "Dunkler Wald",
    colors: { background: "#0f1611", surface: "#1a2620", text: "#e8f0ea", mutedText: "#7a9785", accent: "#84cc16", button: "#65a30d", buttonText: "#0a0f0b", border: "#2d3e34" } },
  { id: "cyberpunk",   name: "Cyberpunk",   tagline: "Neon Pink & Cyan",
    colors: { background: "#0d0221", surface: "#1a0b3d", text: "#fdf4ff", mutedText: "#c084fc", accent: "#22d3ee", button: "#e879f9", buttonText: "#0d0221", border: "#4c1d95" } },
  { id: "nord",        name: "Nord",        tagline: "Cooles Blaugrau",
    colors: { background: "#2e3440", surface: "#3b4252", text: "#eceff4", mutedText: "#a5adba", accent: "#88c0d0", button: "#5e81ac", buttonText: "#eceff4", border: "#4c566a" } },
  { id: "dracula",     name: "Dracula",     tagline: "Lila-Pink Klassiker",
    colors: { background: "#282a36", surface: "#363948", text: "#f8f8f2", mutedText: "#a8aab5", accent: "#bd93f9", button: "#ff79c6", buttonText: "#282a36", border: "#44475a" } }
];

const els = {
  tabs: document.querySelectorAll(".tab"),
  panes: document.querySelectorAll(".pane"),
  message: document.querySelector("#message"),
  /* X */
  xStatus: document.querySelector("#xStatus"),
  xHint: document.querySelector("#xHint"),
  xThemeList: document.querySelector("#xThemeList"),
  xClearBtn: document.querySelector("#xClearBtn"),
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
let xActiveId = null;
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

/* ---- X Themes ---- */

async function initX() {
  renderXThemes();

  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.xActive]: null });
  const record = stored[STORAGE_KEYS.xActive];
  xActiveId = record && typeof record === "object" ? record.id || null : null;

  refreshXStatus();
  highlightActiveTheme();

  els.xThemeList.addEventListener("click", onXThemeClick);
  els.xClearBtn.addEventListener("click", onXClearClick);

  /* X.com hide-toggles (theme is handled separately through preset selection) */
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

function renderXThemes() {
  els.xThemeList.replaceChildren(...PRESETS.map(createThemeCard));
}

function createThemeCard(preset) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "theme-card";
  card.dataset.themeId = preset.id;
  card.setAttribute("aria-label", `${preset.name}: ${preset.tagline}`);

  const swatch = document.createElement("span");
  swatch.className = "swatch";

  const bgBlock = document.createElement("span");
  bgBlock.className = "swatch-bg";
  bgBlock.style.background = preset.colors.background;
  bgBlock.style.setProperty("--swatch-text", preset.colors.text);

  const surfaceBlock = document.createElement("span");
  surfaceBlock.style.background = preset.colors.surface;

  const accentBlock = document.createElement("span");
  accentBlock.style.background = preset.colors.accent;

  swatch.append(bgBlock, surfaceBlock, accentBlock);

  const body = document.createElement("span");
  body.className = "theme-card-body";

  const name = document.createElement("span");
  name.className = "theme-card-name";
  name.textContent = preset.name;

  const tagline = document.createElement("span");
  tagline.className = "theme-card-tagline";
  tagline.textContent = preset.tagline;

  body.append(name, tagline);
  card.append(swatch, body);
  return card;
}

function highlightActiveTheme() {
  for (const card of els.xThemeList.querySelectorAll(".theme-card")) {
    card.classList.toggle("is-active", card.dataset.themeId === xActiveId);
  }
  els.xClearBtn.disabled = !xActiveId;
}

function refreshXStatus() {
  if (!xActiveId) {
    els.xStatus.textContent = "Wähle ein Theme";
  } else {
    const preset = PRESETS.find((p) => p.id === xActiveId);
    els.xStatus.textContent = preset ? `Aktiv: ${preset.name}` : "Aktiv";
  }

  if (appForHost(activeTabHost) === "x") {
    els.xHint.textContent = "Klick auf eine Karte, um sie auf diesem Tab anzuwenden.";
  } else {
    els.xHint.textContent = "Öffne x.com / twitter.com — Themes greifen dort automatisch.";
  }
}

async function onXThemeClick(event) {
  const card = event.target.closest(".theme-card");
  if (!card) {
    return;
  }

  const preset = PRESETS.find((p) => p.id === card.dataset.themeId);
  if (!preset) {
    return;
  }

  xActiveId = preset.id;
  await chrome.storage.local.set({ [STORAGE_KEYS.xActive]: preset });

  highlightActiveTheme();
  refreshXStatus();

  try {
    if (appForHost(activeTabHost) === "x") {
      await sendToActiveTab({ type: X_MESSAGES.applyTheme, preset }, "x");
      setMessage(`${preset.name} angewendet`, "success");
    } else {
      setMessage(`${preset.name} gespeichert`, "success");
    }
  } catch (error) {
    setMessage(error.message || "Konnte nicht angewendet werden", "error");
  }
}

async function onXClearClick() {
  xActiveId = null;
  await chrome.storage.local.remove(STORAGE_KEYS.xActive);

  highlightActiveTheme();
  refreshXStatus();

  try {
    if (appForHost(activeTabHost) === "x") {
      await sendToActiveTab({ type: X_MESSAGES.clearTheme }, "x");
    }
    setMessage("Theme entfernt", "success");
  } catch (error) {
    setMessage(error.message || "Konnte nicht entfernt werden", "error");
  }
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
        files: [meta.script]
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
