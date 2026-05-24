const STORAGE_KEY = "siteThemes";
const THEME_VERSION = 2;
const MESSAGE_TYPES = {
  ping: "JULIANS_XTENSION_PING",
  applyTheme: "JULIANS_XTENSION_APPLY_THEME",
  clearTheme: "JULIANS_XTENSION_CLEAR_THEME"
};

const COLOR_KEYS = [
  "background",
  "surface",
  "text",
  "mutedText",
  "accent",
  "button",
  "buttonText",
  "border"
];

const DEFAULT_THEME = {
  version: THEME_VERSION,
  colors: {
    background: "#000000",
    surface: "#16181c",
    text: "#f5f7fa",
    mutedText: "#71767b",
    accent: "#1d9bf0",
    button: "#1d9bf0",
    buttonText: "#ffffff",
    border: "#2f3336"
  },
  fontScale: 100,
  radius: 14,
  spacing: 100
};

const els = {
  form: document.querySelector("#themeForm"),
  message: document.querySelector("#message"),
  resetButton: document.querySelector("#resetButton"),
  saveButton: document.querySelector("#saveButton"),
  siteName: document.querySelector("#siteName"),
  statusDot: document.querySelector("#statusDot"),
  fontScaleValue: document.querySelector("#fontScaleValue"),
  radiusValue: document.querySelector("#radiusValue"),
  spacingValue: document.querySelector("#spacingValue")
};

let activeTab = null;
let activeHost = "";
let draftTheme = cloneTheme(DEFAULT_THEME);
let previewTimer = null;

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

  const stored = await getThemeForHost(activeHost);
  draftTheme = cloneTheme(stored.theme || DEFAULT_THEME);

  renderTheme(draftTheme);
  setActiveState(Boolean(stored.theme));
  setMessage(stored.theme ? "Saved theme loaded." : "Editing a new theme.");

  els.form.addEventListener("input", handleInput);
  els.form.addEventListener("submit", saveCurrentTheme);
  els.resetButton.addEventListener("click", resetCurrentSite);

  if (stored.theme) {
    await applyThemeToActiveTab(draftTheme);
  }
}

function handleInput() {
  draftTheme = readThemeFromUi();
  renderPreview(draftTheme);
  setActiveState(false);
  setMessage("Previewing unsaved changes.");
  schedulePreview();
}

async function saveCurrentTheme(event) {
  event.preventDefault();

  if (!activeHost || !activeTab?.id) {
    return;
  }

  try {
    draftTheme = {
      ...readThemeFromUi(),
      updatedAt: Date.now()
    };

    const themes = await getLocalThemes();
    themes[activeHost] = draftTheme;
    await chrome.storage.local.set({ [STORAGE_KEY]: themes });
    await applyThemeToActiveTab(draftTheme);
    setActiveState(true);
    setMessage("Theme saved for this site.");
  } catch (error) {
    setMessage(error.message || "Could not save this theme.", true);
  }
}

async function resetCurrentSite() {
  if (!activeHost || !activeTab?.id) {
    return;
  }

  try {
    const themes = await getLocalThemes();
    themes[activeHost] = null;
    await chrome.storage.local.set({ [STORAGE_KEY]: themes });
    await sendToTab(activeTab.id, {
      type: MESSAGE_TYPES.clearTheme,
      host: activeHost
    });

    draftTheme = cloneTheme(DEFAULT_THEME);
    renderTheme(draftTheme);
    setActiveState(false);
    setMessage("Theme cleared for this site.");
  } catch (error) {
    setMessage(error.message || "Could not reset this site.", true);
  }
}

function schedulePreview() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    applyThemeToActiveTab(draftTheme).catch((error) => {
      setMessage(error.message || "Could not preview this theme.", true);
    });
  }, 120);
}

async function applyThemeToActiveTab(theme) {
  if (!activeTab?.id || !activeHost) {
    return;
  }

  await sendToTab(activeTab.id, {
    type: MESSAGE_TYPES.applyTheme,
    host: activeHost,
    theme
  });
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
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    response = await sendMessage(tabId, message);
  }

  if (!response?.ok) {
    throw new Error("This page did not accept the theme update.");
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

async function getThemeForHost(host) {
  const localThemes = await getLocalThemes();

  if (Object.prototype.hasOwnProperty.call(localThemes, host)) {
    return {
      theme: normalizeTheme(localThemes[host]),
      source: "local"
    };
  }

  const legacyThemes = await getLegacySyncThemes();
  return {
    theme: normalizeTheme(legacyThemes[host]),
    source: "sync"
  };
}

async function getLocalThemes() {
  const result = await chrome.storage.local.get({ [STORAGE_KEY]: {} });
  return isPlainObject(result[STORAGE_KEY]) ? result[STORAGE_KEY] : {};
}

async function getLegacySyncThemes() {
  try {
    const result = await chrome.storage.sync.get({ [STORAGE_KEY]: {} });
    return isPlainObject(result[STORAGE_KEY]) ? result[STORAGE_KEY] : {};
  } catch (_error) {
    return {};
  }
}

function renderTheme(theme) {
  for (const key of COLOR_KEYS) {
    const color = theme.colors[key];
    const input = document.querySelector(`[data-color-key="${key}"]`);
    const output = document.querySelector(`[data-output-for="${key}"]`);

    if (input) {
      input.value = color;
    }

    if (output) {
      output.value = color.toUpperCase();
    }
  }

  document.querySelector("#fontScale").value = theme.fontScale;
  document.querySelector("#radius").value = theme.radius;
  document.querySelector("#spacing").value = theme.spacing;
  els.fontScaleValue.value = `${theme.fontScale}%`;
  els.radiusValue.value = `${theme.radius}px`;
  els.spacingValue.value = `${theme.spacing}%`;
  renderPreview(theme);
}

function renderPreview(theme) {
  const root = document.documentElement;
  root.style.setProperty("--app-accent", theme.colors.accent);
  root.style.setProperty("--theme-bg", theme.colors.background);
  root.style.setProperty("--theme-surface", theme.colors.surface);
  root.style.setProperty("--theme-text", theme.colors.text);
  root.style.setProperty("--theme-muted", theme.colors.mutedText);
  root.style.setProperty("--theme-accent", theme.colors.accent);
  root.style.setProperty("--theme-button", theme.colors.button);
  root.style.setProperty("--theme-border", theme.colors.border);
  root.style.setProperty("--theme-radius", `${theme.radius}px`);
  root.style.setProperty("--theme-font-scale", String(theme.fontScale / 100));
  root.style.setProperty("--theme-spacing", String(theme.spacing / 100));
}

function readThemeFromUi() {
  const colors = {};

  for (const key of COLOR_KEYS) {
    const input = document.querySelector(`[data-color-key="${key}"]`);
    const color = normalizeColor(input?.value) || DEFAULT_THEME.colors[key];
    const output = document.querySelector(`[data-output-for="${key}"]`);
    colors[key] = color;

    if (output) {
      output.value = color.toUpperCase();
    }
  }

  const fontScale = readNumber("fontScale", 85, 130, DEFAULT_THEME.fontScale);
  const radius = readNumber("radius", 0, 28, DEFAULT_THEME.radius);
  const spacing = readNumber("spacing", 85, 120, DEFAULT_THEME.spacing);

  els.fontScaleValue.value = `${fontScale}%`;
  els.radiusValue.value = `${radius}px`;
  els.spacingValue.value = `${spacing}%`;

  return {
    version: THEME_VERSION,
    colors,
    fontScale,
    radius,
    spacing
  };
}

function readNumber(id, min, max, fallback) {
  const value = Number(document.querySelector(`#${id}`)?.value);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeTheme(value) {
  if (typeof value === "string") {
    return buildThemeFromAccent(value);
  }

  if (!isPlainObject(value)) {
    return null;
  }

  if (typeof value.color === "string") {
    return buildThemeFromAccent(value.color);
  }

  const colors = {};
  const sourceColors = isPlainObject(value.colors) ? value.colors : {};

  for (const key of COLOR_KEYS) {
    colors[key] = normalizeColor(sourceColors[key]) || DEFAULT_THEME.colors[key];
  }

  return {
    version: THEME_VERSION,
    colors,
    fontScale: clampNumber(value.fontScale, 85, 130, DEFAULT_THEME.fontScale),
    radius: clampNumber(value.radius, 0, 28, DEFAULT_THEME.radius),
    spacing: clampNumber(value.spacing, 85, 120, DEFAULT_THEME.spacing),
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : undefined
  };
}

function buildThemeFromAccent(color) {
  const accent = normalizeColor(color);
  if (!accent) {
    return null;
  }

  return {
    ...cloneTheme(DEFAULT_THEME),
    colors: {
      ...DEFAULT_THEME.colors,
      accent,
      button: accent
    }
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(number)));
}

function cloneTheme(theme) {
  return {
    ...theme,
    colors: {
      ...theme.colors
    }
  };
}

function normalizeHost(hostname) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function normalizeColor(color) {
  if (typeof color !== "string") {
    return null;
  }

  const normalized = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setActiveState(isActive) {
  els.statusDot.classList.toggle("is-active", isActive);
  els.resetButton.disabled = !activeHost;
}

function setUnavailable(message) {
  els.siteName.textContent = "Unavailable";
  els.form.querySelectorAll("button, input").forEach((element) => {
    element.disabled = true;
  });
  setMessage(message, true);
}

function setMessage(message, isError = false) {
  els.message.textContent = message;
  els.message.classList.toggle("is-error", isError);
}
