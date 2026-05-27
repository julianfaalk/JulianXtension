const STORAGE_KEY = "xthemes.active";
const MESSAGE_TYPES = {
  ping: "XTHEMES_PING",
  applyTheme: "XTHEMES_APPLY",
  clearTheme: "XTHEMES_CLEAR"
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
  status: document.querySelector("#status"),
  hint: document.querySelector("#hint"),
  themeList: document.querySelector("#themeList"),
  clearBtn: document.querySelector("#clearBtn"),
  message: document.querySelector("#message")
};

let activeTab = null;
let activeId = null;
let isXTab = false;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  renderThemes();

  activeTab = await getActiveTab();
  const stored = await chrome.storage.local.get({ [STORAGE_KEY]: null });
  const record = stored[STORAGE_KEY];
  activeId = record && typeof record === "object" ? record.id || null : null;

  if (activeTab?.url) {
    try {
      const url = new URL(activeTab.url);
      isXTab = isXHost(url.hostname);
    } catch (_error) {
      isXTab = false;
    }
  }

  refreshStatus();
  highlightActive();

  els.themeList.addEventListener("click", onThemeClick);
  els.clearBtn.addEventListener("click", onClearClick);
}

function renderThemes() {
  els.themeList.replaceChildren(...PRESETS.map(createCard));
}

function createCard(preset) {
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

function highlightActive() {
  for (const card of els.themeList.querySelectorAll(".theme-card")) {
    card.classList.toggle("is-active", card.dataset.themeId === activeId);
  }
  els.clearBtn.disabled = !activeId;
}

function refreshStatus() {
  if (!activeId) {
    els.status.textContent = "Wähle ein Theme";
  } else {
    const preset = PRESETS.find((p) => p.id === activeId);
    els.status.textContent = preset ? `Aktiv: ${preset.name}` : "Aktiv: Custom";
  }

  if (isXTab) {
    els.hint.textContent = "Klick auf eine Karte, um sie auf diesem Tab anzuwenden.";
  } else {
    els.hint.textContent = "Öffne x.com / twitter.com — Themes greifen dort automatisch.";
  }
}

async function onThemeClick(event) {
  const card = event.target.closest(".theme-card");
  if (!card) {
    return;
  }

  const preset = PRESETS.find((p) => p.id === card.dataset.themeId);
  if (!preset) {
    return;
  }

  activeId = preset.id;
  await chrome.storage.local.set({ [STORAGE_KEY]: preset });

  highlightActive();
  refreshStatus();

  try {
    await applyToActiveTab(preset);
    if (isXTab) {
      setMessage(`${preset.name} angewendet.`, "success");
    } else {
      setMessage(`${preset.name} gespeichert. Wird beim nächsten X-Tab automatisch geladen.`, "success");
    }
  } catch (error) {
    setMessage(error.message || "Konnte nicht angewendet werden.", "error");
  }
}

async function onClearClick() {
  activeId = null;
  await chrome.storage.local.remove(STORAGE_KEY);
  highlightActive();
  refreshStatus();

  try {
    await clearActiveTab();
    setMessage("Theme entfernt.", "success");
  } catch (error) {
    setMessage(error.message || "Konnte nicht entfernt werden.", "error");
  }
}

async function applyToActiveTab(preset) {
  if (!activeTab?.id || !isXTab) {
    return;
  }

  await sendToTab(activeTab.id, {
    type: MESSAGE_TYPES.applyTheme,
    preset
  });
}

async function clearActiveTab() {
  if (!activeTab?.id || !isXTab) {
    return;
  }

  await sendToTab(activeTab.id, { type: MESSAGE_TYPES.clearTheme });
}

async function sendToTab(tabId, message) {
  let response = await sendMessage(tabId, { type: MESSAGE_TYPES.ping });

  if (!response?.ok) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
    } catch (_error) {
      throw new Error("Inhaltsskript konnte nicht geladen werden.");
    }
  }

  response = await sendMessage(tabId, message);
  if (!response?.ok) {
    throw new Error("Tab nahm das Theme nicht an.");
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

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function isXHost(hostname) {
  const host = String(hostname || "").replace(/^www\./i, "").toLowerCase();
  return host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com");
}

function setMessage(text, kind = "") {
  els.message.textContent = text;
  els.message.classList.toggle("is-error", kind === "error");
  els.message.classList.toggle("is-success", kind === "success");
}
