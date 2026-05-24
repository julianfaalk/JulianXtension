const DEFAULT_COLOR = "#1d9bf0";
const STORAGE_KEY = "siteThemes";
const MESSAGE_TYPES = {
  ping: "JULIANS_XTENSION_PING",
  setColor: "JULIANS_XTENSION_SET_COLOR",
  clearColor: "JULIANS_XTENSION_CLEAR_COLOR"
};

const els = {
  applyButton: document.querySelector("#applyButton"),
  colorInput: document.querySelector("#siteColor"),
  colorValue: document.querySelector("#colorValue"),
  message: document.querySelector("#message"),
  resetButton: document.querySelector("#resetButton"),
  siteName: document.querySelector("#siteName"),
  statusDot: document.querySelector("#statusDot")
};

let activeTab = null;
let activeHost = "";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  activeTab = await getActiveTab();

  if (!activeTab?.url) {
    setUnavailable("No active tab found.");
    return;
  }

  const url = new URL(activeTab.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    setUnavailable("Open a regular website to use this extension.");
    return;
  }

  activeHost = normalizeHost(url.hostname);
  els.siteName.textContent = activeHost;

  const themes = await getThemes();
  const existing = normalizeTheme(themes[activeHost]);
  const color = existing?.color || DEFAULT_COLOR;

  setColorUi(color);
  setActiveState(Boolean(existing));
  setMessage(existing ? "Saved color loaded." : "Pick a color for this site.");

  els.colorInput.addEventListener("input", () => {
    setColorUi(els.colorInput.value);
    applyCurrentColor();
  });
  els.applyButton.addEventListener("click", applyCurrentColor);
  els.resetButton.addEventListener("click", resetCurrentSite);
}

async function applyCurrentColor() {
  const color = normalizeColor(els.colorInput.value);
  if (!color || !activeHost || !activeTab?.id) {
    return;
  }

  try {
    const themes = await getThemes();
    themes[activeHost] = {
      color,
      updatedAt: Date.now()
    };
    await chrome.storage.sync.set({ [STORAGE_KEY]: themes });
    await sendToTab(activeTab.id, {
      type: MESSAGE_TYPES.setColor,
      host: activeHost,
      color
    });
    setActiveState(true);
    setMessage("Saved for this site.");
  } catch (error) {
    setMessage(error.message || "Could not apply this color.", true);
  }
}

async function resetCurrentSite() {
  if (!activeHost || !activeTab?.id) {
    return;
  }

  try {
    const themes = await getThemes();
    delete themes[activeHost];
    await chrome.storage.sync.set({ [STORAGE_KEY]: themes });
    await sendToTab(activeTab.id, {
      type: MESSAGE_TYPES.clearColor,
      host: activeHost
    });
    setActiveState(false);
    setMessage("Color reset for this site.");
  } catch (error) {
    setMessage(error.message || "Could not reset this site.", true);
  }
}

async function sendToTab(tabId, message) {
  let response = await sendMessage(tabId, { type: MESSAGE_TYPES.ping });

  if (!response?.ok) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }

  response = await sendMessage(tabId, message);
  if (!response?.ok) {
    throw new Error("This page did not accept the color update.");
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
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tabs[0] || null;
}

async function getThemes() {
  const result = await chrome.storage.sync.get({ [STORAGE_KEY]: {} });
  return result[STORAGE_KEY] && typeof result[STORAGE_KEY] === "object"
    ? result[STORAGE_KEY]
    : {};
}

function normalizeHost(hostname) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function normalizeTheme(value) {
  if (typeof value === "string") {
    const color = normalizeColor(value);
    return color ? { color } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const color = normalizeColor(value.color);
  return color ? { ...value, color } : null;
}

function normalizeColor(color) {
  if (typeof color !== "string") {
    return null;
  }

  const normalized = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

function setColorUi(color) {
  const normalized = normalizeColor(color) || DEFAULT_COLOR;
  els.colorInput.value = normalized;
  els.colorValue.value = normalized;
  document.documentElement.style.setProperty("--accent", normalized);
}

function setActiveState(isActive) {
  els.statusDot.classList.toggle("is-active", isActive);
  els.resetButton.disabled = !isActive;
}

function setUnavailable(message) {
  els.siteName.textContent = "Unavailable";
  els.colorInput.disabled = true;
  els.applyButton.disabled = true;
  els.resetButton.disabled = true;
  setMessage(message, true);
}

function setMessage(message, isError = false) {
  els.message.textContent = message;
  els.message.classList.toggle("is-error", isError);
}
