/* -----------------------------------------------------------------
   Julians Tweaks — popup controller
   Two apps: X Themes, YouTube. Tab UI on top, app-specific logic
   in initX() / initYouTube(). Shared chrome.storage.local with
   distinct keys so apps don't collide.
   ----------------------------------------------------------------- */

const STORAGE_KEYS = {
  xActive: "xthemes.active",
  ytHideShorts: "youtube.hideShorts",
  lastApp: "ui.lastApp"
};

const X_MESSAGES = {
  ping: "XTHEMES_PING",
  applyTheme: "XTHEMES_APPLY",
  clearTheme: "XTHEMES_CLEAR"
};

const YT_MESSAGES = {
  ping: "JT_YT_PING",
  apply: "JT_YT_APPLY"
};

const PRESETS = [
  {
    id: "x-dim",
    name: "X Dim",
    tagline: "Klassisches X Dim-Blau",
    colors: {
      background: "#15202b",
      surface: "#1c2733",
      text: "#f5f8fa",
      mutedText: "#8899a6",
      accent: "#1d9bf0",
      button: "#1d9bf0",
      buttonText: "#ffffff",
      border: "#38444d"
    }
  },
  {
    id: "lights-out",
    name: "Lights Out",
    tagline: "Reines Schwarz, weißer Button",
    colors: {
      background: "#000000",
      surface: "#16181c",
      text: "#e7e9ea",
      mutedText: "#71767b",
      accent: "#1d9bf0",
      button: "#eff3f4",
      buttonText: "#0f1419",
      border: "#2f3336"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    tagline: "Tiefes Mitternachtsblau",
    colors: {
      background: "#0a0e1a",
      surface: "#141b2d",
      text: "#e8eaf6",
      mutedText: "#7986cb",
      accent: "#7986cb",
      button: "#5c6bc0",
      buttonText: "#ffffff",
      border: "#283048"
    }
  },
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Schwarz mit Cyan-Akzent",
    colors: {
      background: "#05070b",
      surface: "#101722",
      text: "#f8fafc",
      mutedText: "#94a3b8",
      accent: "#38bdf8",
      button: "#38bdf8",
      buttonText: "#00111f",
      border: "#263244"
    }
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Grünes Leuchten",
    colors: {
      background: "#06120f",
      surface: "#0e231c",
      text: "#e9fff5",
      mutedText: "#8bb8a4",
      accent: "#5eead4",
      button: "#34d399",
      buttonText: "#03120d",
      border: "#21463a"
    }
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    tagline: "Violett auf Tinte",
    colors: {
      background: "#0b0a18",
      surface: "#17142a",
      text: "#f4f0ff",
      mutedText: "#a99cc8",
      accent: "#a78bfa",
      button: "#7c3aed",
      buttonText: "#ffffff",
      border: "#342a59"
    }
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Warmes Orange",
    colors: {
      background: "#15100c",
      surface: "#241811",
      text: "#fff4e8",
      mutedText: "#c19a7a",
      accent: "#fb923c",
      button: "#f97316",
      buttonText: "#160802",
      border: "#4a2f20"
    }
  },
  {
    id: "rose-noir",
    name: "Rose Noir",
    tagline: "Rosa auf Anthrazit",
    colors: {
      background: "#120d12",
      surface: "#201721",
      text: "#fff1f8",
      mutedText: "#b99bab",
      accent: "#f472b6",
      button: "#ec4899",
      buttonText: "#ffffff",
      border: "#463044"
    }
  },
  {
    id: "forest",
    name: "Forest",
    tagline: "Dunkler Wald",
    colors: {
      background: "#0f1611",
      surface: "#1a2620",
      text: "#e8f0ea",
      mutedText: "#7a9785",
      accent: "#84cc16",
      button: "#65a30d",
      buttonText: "#0a0f0b",
      border: "#2d3e34"
    }
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    tagline: "Neon Pink & Cyan",
    colors: {
      background: "#0d0221",
      surface: "#1a0b3d",
      text: "#fdf4ff",
      mutedText: "#c084fc",
      accent: "#22d3ee",
      button: "#e879f9",
      buttonText: "#0d0221",
      border: "#4c1d95"
    }
  },
  {
    id: "nord",
    name: "Nord",
    tagline: "Cooles Blaugrau",
    colors: {
      background: "#2e3440",
      surface: "#3b4252",
      text: "#eceff4",
      mutedText: "#a5adba",
      accent: "#88c0d0",
      button: "#5e81ac",
      buttonText: "#eceff4",
      border: "#4c566a"
    }
  },
  {
    id: "dracula",
    name: "Dracula",
    tagline: "Lila-Pink Klassiker",
    colors: {
      background: "#282a36",
      surface: "#363948",
      text: "#f8f8f2",
      mutedText: "#a8aab5",
      accent: "#bd93f9",
      button: "#ff79c6",
      buttonText: "#282a36",
      border: "#44475a"
    }
  }
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
  ytHideShorts: document.querySelector("#ytHideShorts")
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

  /* Restore the last-viewed app, defaulting to whichever host the
     current tab is on so the popup is immediately useful. */
  const stored = await chrome.storage.local.get({ [STORAGE_KEYS.lastApp]: null });
  const fromHost = isXHost(activeTabHost) ? "x" : isYouTubeHost(activeTabHost) ? "youtube" : null;
  switchApp(stored[STORAGE_KEYS.lastApp] || fromHost || "x", { persist: false });
}

/* ---- Tab switching ---- */

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

  if (isXHost(activeTabHost)) {
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
    if (isXHost(activeTabHost)) {
      await sendToTab(activeTab.id, {
        type: X_MESSAGES.applyTheme,
        preset
      }, ["content.js"]);
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
    if (isXHost(activeTabHost)) {
      await sendToTab(activeTab.id, { type: X_MESSAGES.clearTheme }, ["content.js"]);
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

  els.ytHideShorts.addEventListener("change", onYtHideShortsChange);
}

async function onYtHideShortsChange() {
  const enabled = els.ytHideShorts.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.ytHideShorts]: enabled });

  try {
    if (isYouTubeHost(activeTabHost)) {
      await sendToTab(activeTab.id, {
        type: YT_MESSAGES.apply,
        hideShorts: enabled
      }, ["youtube.js"]);
    }

    /* Storage.onChanged listener in youtube.js will propagate to all other
       open YouTube tabs without us needing to message each one. */
    setMessage(enabled ? "Shorts ausgeblendet" : "Shorts wieder sichtbar", "success");
  } catch (error) {
    setMessage(error.message || "Konnte nicht angewendet werden", "error");
  }
}

/* ---- Tab messaging ---- */

async function sendToTab(tabId, message, contentScriptFiles) {
  if (!tabId) {
    return;
  }

  let response = await sendMessage(tabId, { type: pingTypeFor(message.type) });

  if (!response?.ok) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: contentScriptFiles
      });
    } catch (_error) {
      throw new Error("Inhaltsskript konnte nicht geladen werden");
    }
  }

  response = await sendMessage(tabId, message);
  if (!response?.ok) {
    throw new Error("Tab nahm das Update nicht an");
  }
}

function pingTypeFor(messageType) {
  if (messageType === X_MESSAGES.applyTheme || messageType === X_MESSAGES.clearTheme) {
    return X_MESSAGES.ping;
  }
  return YT_MESSAGES.ping;
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

function isXHost(hostname) {
  const host = String(hostname || "").replace(/^www\./i, "").toLowerCase();
  return host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com");
}

function isYouTubeHost(hostname) {
  const host = String(hostname || "").replace(/^www\./i, "").toLowerCase();
  return host === "youtube.com" ||
    host.endsWith(".youtube.com");
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
