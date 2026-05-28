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
  /* YouTube */
  ytHideShorts: "youtube.hideShorts",
  /* Google */
  googleHideAi: "google.hideAiOverview",
  googleHideSponsored: "google.hideSponsored",
  /* LinkedIn */
  linkedinHidePromoted: "linkedin.hidePromoted",
  linkedinHideNews: "linkedin.hideNewsRail",
  /* Reddit */
  redditHidePromoted: "reddit.hidePromoted",
  redditHideRecs: "reddit.hideRecommendations",
  /* GitHub */
  githubHideCopilot: "github.hideCopilot",
  githubHideSponsors: "github.hideSponsors",
  /* UI */
  lastApp: "ui.lastApp"
};

const APP_META = {
  x:        { hosts: ["x.com", "twitter.com"], script: "content.js",  ping: "XTHEMES_PING" },
  youtube:  { hosts: ["youtube.com"],          script: "youtube.js",  ping: "JT_YT_PING" },
  google:   { hosts: ["google.com", "google.de", "google.co.uk", "google.at", "google.ch"], script: "google.js", ping: "JT_GOOGLE_PING" },
  linkedin: { hosts: ["linkedin.com"],         script: "linkedin.js", ping: "JT_LINKEDIN_PING" },
  reddit:   { hosts: ["reddit.com"],           script: "reddit.js",   ping: "JT_REDDIT_PING" },
  github:   { hosts: ["github.com"],           script: "github.js",   ping: "JT_GITHUB_PING" }
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
  /* YouTube */
  ytHideShorts: document.querySelector("#ytHideShorts"),
  /* Google */
  googleHideAi: document.querySelector("#googleHideAi"),
  googleHideSponsored: document.querySelector("#googleHideSponsored"),
  /* LinkedIn */
  linkedinHidePromoted: document.querySelector("#linkedinHidePromoted"),
  linkedinHideNews: document.querySelector("#linkedinHideNews"),
  /* Reddit */
  redditHidePromoted: document.querySelector("#redditHidePromoted"),
  redditHideRecs: document.querySelector("#redditHideRecs"),
  /* GitHub */
  githubHideCopilot: document.querySelector("#githubHideCopilot"),
  githubHideSponsors: document.querySelector("#githubHideSponsors")
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
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.ytHideShorts]: false });
  els.ytHideShorts.checked = Boolean(stored[STORAGE_KEYS.ytHideShorts]);

  els.ytHideShorts.addEventListener("change", async () => {
    const enabled = els.ytHideShorts.checked;
    await chrome.storage.local.set({ [STORAGE_KEYS.ytHideShorts]: enabled });
    await maybeApplyToActiveTab("youtube", {
      type: "JT_YT_APPLY",
      hideShorts: enabled
    });
    setMessage(enabled ? "Shorts ausgeblendet" : "Shorts wieder sichtbar", "success");
  });
}

/* ---- Google ---- */

async function initGoogle() {
  const stored = await chrome.storage.local.get({
    [STORAGE_KEYS.googleHideAi]: false,
    [STORAGE_KEYS.googleHideSponsored]: false
  });
  els.googleHideAi.checked = Boolean(stored[STORAGE_KEYS.googleHideAi]);
  els.googleHideSponsored.checked = Boolean(stored[STORAGE_KEYS.googleHideSponsored]);

  const broadcast = async () => {
    await maybeApplyToActiveTab("google", {
      type: "JT_GOOGLE_APPLY",
      settings: {
        hideAiOverview: els.googleHideAi.checked,
        hideSponsored: els.googleHideSponsored.checked
      }
    });
  };

  els.googleHideAi.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.googleHideAi]: els.googleHideAi.checked });
    await broadcast();
    setMessage(els.googleHideAi.checked ? "AI-Overviews aus" : "AI-Overviews sichtbar", "success");
  });

  els.googleHideSponsored.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.googleHideSponsored]: els.googleHideSponsored.checked });
    await broadcast();
    setMessage(els.googleHideSponsored.checked ? "Anzeigen aus" : "Anzeigen sichtbar", "success");
  });
}

/* ---- LinkedIn ---- */

async function initLinkedIn() {
  const stored = await chrome.storage.local.get({
    [STORAGE_KEYS.linkedinHidePromoted]: false,
    [STORAGE_KEYS.linkedinHideNews]: false
  });
  els.linkedinHidePromoted.checked = Boolean(stored[STORAGE_KEYS.linkedinHidePromoted]);
  els.linkedinHideNews.checked = Boolean(stored[STORAGE_KEYS.linkedinHideNews]);

  const broadcast = async () => {
    await maybeApplyToActiveTab("linkedin", {
      type: "JT_LINKEDIN_APPLY",
      settings: {
        hidePromoted: els.linkedinHidePromoted.checked,
        hideNewsRail: els.linkedinHideNews.checked
      }
    });
  };

  els.linkedinHidePromoted.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.linkedinHidePromoted]: els.linkedinHidePromoted.checked });
    await broadcast();
    setMessage(els.linkedinHidePromoted.checked ? "Promoted aus" : "Promoted sichtbar", "success");
  });

  els.linkedinHideNews.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.linkedinHideNews]: els.linkedinHideNews.checked });
    await broadcast();
    setMessage(els.linkedinHideNews.checked ? "News-Rail aus" : "News-Rail sichtbar", "success");
  });
}

/* ---- Reddit ---- */

async function initReddit() {
  const stored = await chrome.storage.local.get({
    [STORAGE_KEYS.redditHidePromoted]: false,
    [STORAGE_KEYS.redditHideRecs]: false
  });
  els.redditHidePromoted.checked = Boolean(stored[STORAGE_KEYS.redditHidePromoted]);
  els.redditHideRecs.checked = Boolean(stored[STORAGE_KEYS.redditHideRecs]);

  const broadcast = async () => {
    await maybeApplyToActiveTab("reddit", {
      type: "JT_REDDIT_APPLY",
      settings: {
        hidePromoted: els.redditHidePromoted.checked,
        hideRecommendations: els.redditHideRecs.checked
      }
    });
  };

  els.redditHidePromoted.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.redditHidePromoted]: els.redditHidePromoted.checked });
    await broadcast();
    setMessage(els.redditHidePromoted.checked ? "Promoted aus" : "Promoted sichtbar", "success");
  });

  els.redditHideRecs.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.redditHideRecs]: els.redditHideRecs.checked });
    await broadcast();
    setMessage(els.redditHideRecs.checked ? "Empfehlungen aus" : "Empfehlungen sichtbar", "success");
  });
}

/* ---- GitHub ---- */

async function initGithub() {
  const stored = await chrome.storage.local.get({
    [STORAGE_KEYS.githubHideCopilot]: false,
    [STORAGE_KEYS.githubHideSponsors]: false
  });
  els.githubHideCopilot.checked = Boolean(stored[STORAGE_KEYS.githubHideCopilot]);
  els.githubHideSponsors.checked = Boolean(stored[STORAGE_KEYS.githubHideSponsors]);

  const broadcast = async () => {
    await maybeApplyToActiveTab("github", {
      type: "JT_GITHUB_APPLY",
      settings: {
        hideCopilot: els.githubHideCopilot.checked,
        hideSponsors: els.githubHideSponsors.checked
      }
    });
  };

  els.githubHideCopilot.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.githubHideCopilot]: els.githubHideCopilot.checked });
    await broadcast();
    setMessage(els.githubHideCopilot.checked ? "Copilot aus" : "Copilot sichtbar", "success");
  });

  els.githubHideSponsors.addEventListener("change", async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.githubHideSponsors]: els.githubHideSponsors.checked });
    await broadcast();
    setMessage(els.githubHideSponsors.checked ? "Sponsors aus" : "Sponsors sichtbar", "success");
  });
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
