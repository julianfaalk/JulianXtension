const SITE_THEMES_KEY = "siteThemes";
const CUSTOM_THEMES_KEY = "customThemes";
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
    background: "#15202b",
    surface: "#192734",
    text: "#f5f8fa",
    mutedText: "#8899a6",
    accent: "#1da1f2",
    button: "#1da1f2",
    buttonText: "#ffffff",
    border: "#38444d"
  },
  fontScale: 100,
  radius: 16,
  spacing: 100
};

const BUILT_IN_PRESETS = [
  {
    id: "x-dim",
    name: "X Dim",
    tagline: "Classic blue-black X",
    theme: DEFAULT_THEME
  },
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Sharp black and cyan",
    theme: createTheme({
      background: "#05070b",
      surface: "#101722",
      text: "#f8fafc",
      mutedText: "#94a3b8",
      accent: "#38bdf8",
      button: "#38bdf8",
      buttonText: "#00111f",
      border: "#263244"
    }, 100, 12, 98)
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Green glow, soft contrast",
    theme: createTheme({
      background: "#06120f",
      surface: "#0e231c",
      text: "#e9fff5",
      mutedText: "#8bb8a4",
      accent: "#5eead4",
      button: "#34d399",
      buttonText: "#03120d",
      border: "#21463a"
    }, 101, 18, 104)
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    tagline: "Violet, blue, and ink",
    theme: createTheme({
      background: "#0b0a18",
      surface: "#17142a",
      text: "#f4f0ff",
      mutedText: "#a99cc8",
      accent: "#8b5cf6",
      button: "#7c3aed",
      buttonText: "#ffffff",
      border: "#342a59"
    }, 100, 16, 100)
  },
  {
    id: "ember",
    name: "Ember",
    tagline: "Warm dark mode",
    theme: createTheme({
      background: "#15100c",
      surface: "#241811",
      text: "#fff4e8",
      mutedText: "#c19a7a",
      accent: "#fb923c",
      button: "#f97316",
      buttonText: "#160802",
      border: "#4a2f20"
    }, 100, 14, 100)
  },
  {
    id: "rose-noir",
    name: "Rose Noir",
    tagline: "Soft pink on charcoal",
    theme: createTheme({
      background: "#120d12",
      surface: "#201721",
      text: "#fff1f8",
      mutedText: "#b99bab",
      accent: "#f472b6",
      button: "#ec4899",
      buttonText: "#ffffff",
      border: "#463044"
    }, 102, 20, 106)
  }
];

const els = {
  activeThemeName: document.querySelector("#activeThemeName"),
  customThemeList: document.querySelector("#customThemeList"),
  form: document.querySelector("#themeForm"),
  message: document.querySelector("#message"),
  presetList: document.querySelector("#presetList"),
  resetButton: document.querySelector("#resetButton"),
  saveCustomButton: document.querySelector("#saveCustomButton"),
  saveSiteButton: document.querySelector("#saveSiteButton"),
  siteName: document.querySelector("#siteName"),
  statusDot: document.querySelector("#statusDot"),
  themeName: document.querySelector("#themeName"),
  fontScaleValue: document.querySelector("#fontScaleValue"),
  radiusValue: document.querySelector("#radiusValue"),
  spacingValue: document.querySelector("#spacingValue")
};

let activeTab = null;
let activeHost = "";
let customThemes = [];
let draftTheme = cloneTheme(DEFAULT_THEME);
let selectedThemeKey = "preset:x-dim";
let previewTimer = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  customThemes = await getCustomThemes();
  renderPresetList();
  renderCustomThemeList();

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
  if (stored.record) {
    draftTheme = cloneTheme(stored.record.theme);
    selectedThemeKey = getRecordSelectionKey(stored.record);
    renderTheme(draftTheme, stored.record.name || "Saved theme");
    setSavedState(true, stored.record.name || "Saved theme");
    await applyThemeToActiveTab(draftTheme);
  } else {
    const dimPreset = getPreset("x-dim");
    draftTheme = cloneTheme(dimPreset.theme);
    selectedThemeKey = "preset:x-dim";
    renderTheme(draftTheme, dimPreset.name);
    setSavedState(false, "No theme saved");
    setMessage("Choose a preset, tweak it, then save it for this site.");
  }

  renderSelectedThemeCards();

  els.presetList.addEventListener("click", handlePresetClick);
  els.customThemeList.addEventListener("click", handleCustomThemeClick);
  els.form.addEventListener("input", handleManualInput);
  els.form.addEventListener("submit", saveCurrentThemeForSite);
  els.saveCustomButton.addEventListener("click", saveDraftAsCustomTheme);
  els.resetButton.addEventListener("click", resetCurrentSite);
}

async function handlePresetClick(event) {
  const card = event.target.closest("[data-preset-id]");
  if (!card) {
    return;
  }

  const preset = getPreset(card.dataset.presetId);
  if (!preset) {
    return;
  }

  selectedThemeKey = `preset:${preset.id}`;
  draftTheme = cloneTheme(preset.theme);
  renderTheme(draftTheme, preset.name);
  renderSelectedThemeCards();
  await saveDraftForSite(`${preset.name} selected and saved for this site.`);
}

async function handleCustomThemeClick(event) {
  const deleteButton = event.target.closest("[data-delete-custom-id]");
  if (deleteButton) {
    deleteCustomTheme(deleteButton.dataset.deleteCustomId);
    return;
  }

  const card = event.target.closest("[data-custom-id]");
  if (!card) {
    return;
  }

  const customTheme = customThemes.find((theme) => theme.id === card.dataset.customId);
  if (!customTheme) {
    return;
  }

  selectedThemeKey = `custom:${customTheme.id}`;
  draftTheme = cloneTheme(customTheme.theme);
  renderTheme(draftTheme, customTheme.name);
  renderSelectedThemeCards();
  await saveDraftForSite(`${customTheme.name} selected and saved for this site.`);
}

function handleManualInput(event) {
  draftTheme = readThemeFromUi();

  if (event.target !== els.themeName) {
    selectedThemeKey = "manual";
    renderSelectedThemeCards();
    previewDraft("Previewing manual changes. Save for this site or save as a theme.");
    return;
  }

  setSavedState(false, "Unsaved manual theme");
}

async function saveCurrentThemeForSite(event) {
  event.preventDefault();

  await saveDraftForSite();
}

async function saveDraftForSite(successMessage) {
  if (!activeHost || !activeTab?.id) {
    return;
  }

  try {
    draftTheme = readThemeFromUi();
    const record = buildSiteThemeRecord();
    const themes = await getSiteThemes();
    themes[activeHost] = record;
    await chrome.storage.local.set({ [SITE_THEMES_KEY]: themes });
    await applyThemeToActiveTab(draftTheme);
    setSavedState(true, record.name);
    setMessage(successMessage || `${record.name} saved for ${activeHost}.`);
  } catch (error) {
    setMessage(error.message || "Could not save this theme.", true);
  }
}

async function saveDraftAsCustomTheme() {
  if (!activeHost) {
    return;
  }

  try {
    draftTheme = readThemeFromUi();
    const name = getDraftThemeName() || `${activeHost} Theme`;
    const customTheme = {
      id: createId(),
      name,
      theme: cloneTheme(draftTheme),
      updatedAt: Date.now()
    };

    customThemes = [customTheme, ...customThemes].slice(0, 24);
    await chrome.storage.local.set({ [CUSTOM_THEMES_KEY]: customThemes });
    selectedThemeKey = `custom:${customTheme.id}`;
    renderCustomThemeList();
    renderSelectedThemeCards();
    setSavedState(false, `Saved reusable theme: ${name}`);
    setMessage(`${name} added to My Themes. Save for site to make it permanent here.`);
  } catch (error) {
    setMessage(error.message || "Could not save this custom theme.", true);
  }
}

async function deleteCustomTheme(id) {
  customThemes = customThemes.filter((theme) => theme.id !== id);
  await chrome.storage.local.set({ [CUSTOM_THEMES_KEY]: customThemes });

  if (selectedThemeKey === `custom:${id}`) {
    selectedThemeKey = "manual";
  }

  renderCustomThemeList();
  renderSelectedThemeCards();
  setMessage("Custom theme deleted.");
}

async function resetCurrentSite() {
  if (!activeHost || !activeTab?.id) {
    return;
  }

  try {
    const themes = await getSiteThemes();
    themes[activeHost] = null;
    await chrome.storage.local.set({ [SITE_THEMES_KEY]: themes });
    await sendToTab(activeTab.id, {
      type: MESSAGE_TYPES.clearTheme,
      host: activeHost
    });

    const dimPreset = getPreset("x-dim");
    selectedThemeKey = "preset:x-dim";
    draftTheme = cloneTheme(dimPreset.theme);
    renderTheme(draftTheme, dimPreset.name);
    renderSelectedThemeCards();
    setSavedState(false, "No theme saved");
    setMessage("Theme cleared for this site.");
  } catch (error) {
    setMessage(error.message || "Could not reset this site.", true);
  }
}

function previewDraft(message) {
  renderPreview(draftTheme);
  setSavedState(false, getDraftThemeName() ? `Previewing: ${getDraftThemeName()}` : "Previewing theme");
  setMessage(message);
  schedulePreview();
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
  const siteThemes = await getSiteThemes();

  if (Object.prototype.hasOwnProperty.call(siteThemes, host)) {
    return {
      record: normalizeSiteThemeRecord(siteThemes[host]),
      source: "local"
    };
  }

  const legacyThemes = await getLegacySyncThemes();
  return {
    record: normalizeSiteThemeRecord(legacyThemes[host], "Imported Accent"),
    source: "sync"
  };
}

async function getSiteThemes() {
  const result = await chrome.storage.local.get({ [SITE_THEMES_KEY]: {} });
  return isPlainObject(result[SITE_THEMES_KEY]) ? result[SITE_THEMES_KEY] : {};
}

async function getCustomThemes() {
  const result = await chrome.storage.local.get({ [CUSTOM_THEMES_KEY]: [] });
  if (!Array.isArray(result[CUSTOM_THEMES_KEY])) {
    return [];
  }

  return result[CUSTOM_THEMES_KEY]
    .map(normalizeCustomTheme)
    .filter(Boolean)
    .slice(0, 24);
}

async function getLegacySyncThemes() {
  try {
    const result = await chrome.storage.sync.get({ [SITE_THEMES_KEY]: {} });
    return isPlainObject(result[SITE_THEMES_KEY]) ? result[SITE_THEMES_KEY] : {};
  } catch (_error) {
    return {};
  }
}

function renderPresetList() {
  els.presetList.replaceChildren(...BUILT_IN_PRESETS.map((preset) => {
    return createThemeCard({
      key: `preset:${preset.id}`,
      idAttribute: "presetId",
      id: preset.id,
      name: preset.name,
      tagline: preset.tagline,
      theme: preset.theme
    });
  }));
}

function renderCustomThemeList() {
  if (!customThemes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No custom themes yet. Tweak a preset and save it here.";
    els.customThemeList.replaceChildren(empty);
    return;
  }

  els.customThemeList.replaceChildren(...customThemes.map((customTheme) => {
    const row = document.createElement("div");
    row.className = "custom-theme-row";
    row.append(
      createThemeCard({
        key: `custom:${customTheme.id}`,
        idAttribute: "customId",
        id: customTheme.id,
        name: customTheme.name,
        tagline: "Custom theme",
        theme: customTheme.theme
      })
    );

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-theme";
    deleteButton.type = "button";
    deleteButton.dataset.deleteCustomId = customTheme.id;
    deleteButton.setAttribute("aria-label", `Delete ${customTheme.name}`);
    deleteButton.textContent = "x";
    row.append(deleteButton);
    return row;
  }));
}

function createThemeCard({ key, idAttribute, id, name, tagline, theme }) {
  const card = document.createElement("button");
  card.className = "theme-card";
  card.type = "button";
  card.dataset.selectionKey = key;
  card.dataset[idAttribute] = id;

  const swatch = document.createElement("span");
  swatch.className = "theme-swatch";
  for (const color of [
    theme.colors.background,
    theme.colors.surface,
    theme.colors.accent,
    theme.colors.button
  ]) {
    const block = document.createElement("span");
    block.style.backgroundColor = color;
    swatch.append(block);
  }

  const copy = document.createElement("span");
  copy.className = "theme-card-copy";

  const title = document.createElement("span");
  title.className = "theme-card-title";
  title.textContent = name;

  const subtitle = document.createElement("span");
  subtitle.className = "theme-card-subtitle";
  subtitle.textContent = tagline;

  copy.append(title, subtitle);
  card.append(swatch, copy);
  return card;
}

function renderSelectedThemeCards() {
  document.querySelectorAll("[data-selection-key]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.selectionKey === selectedThemeKey);
  });
}

function renderTheme(theme, name) {
  els.themeName.value = name || "";

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
  root.style.setProperty("--theme-button-text", theme.colors.buttonText);
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

function buildSiteThemeRecord() {
  const name = getDraftThemeName() || "Manual Theme";
  const record = {
    version: THEME_VERSION,
    source: "manual",
    name,
    theme: cloneTheme(draftTheme),
    updatedAt: Date.now()
  };

  if (selectedThemeKey.startsWith("preset:")) {
    record.source = "preset";
    record.presetId = selectedThemeKey.replace("preset:", "");
  }

  if (selectedThemeKey.startsWith("custom:")) {
    record.source = "custom";
    record.customId = selectedThemeKey.replace("custom:", "");
  }

  return record;
}

function normalizeSiteThemeRecord(value, fallbackName = "Saved Theme") {
  if (!value) {
    return null;
  }

  const wrappedTheme = isPlainObject(value) && value.theme ? value.theme : value;
  const theme = normalizeTheme(wrappedTheme);
  if (!theme) {
    return null;
  }

  if (isPlainObject(value) && value.theme) {
    return {
      version: THEME_VERSION,
      source: typeof value.source === "string" ? value.source : "manual",
      presetId: typeof value.presetId === "string" ? value.presetId : undefined,
      customId: typeof value.customId === "string" ? value.customId : undefined,
      name: typeof value.name === "string" ? value.name : fallbackName,
      theme,
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : undefined
    };
  }

  return {
    version: THEME_VERSION,
    source: "manual",
    name: fallbackName,
    theme
  };
}

function normalizeCustomTheme(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const theme = normalizeTheme(value.theme);
  if (!theme || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim()
      ? value.name.trim().slice(0, 32)
      : "Custom Theme",
    theme,
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : undefined
  };
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

function getRecordSelectionKey(record) {
  if (record.source === "preset" && record.presetId && getPreset(record.presetId)) {
    return `preset:${record.presetId}`;
  }

  if (record.source === "custom" && record.customId) {
    return `custom:${record.customId}`;
  }

  return "manual";
}

function getPreset(id) {
  return BUILT_IN_PRESETS.find((preset) => preset.id === id) || null;
}

function getDraftThemeName() {
  return els.themeName.value.trim().slice(0, 32);
}

function createTheme(colors, fontScale = 100, radius = 16, spacing = 100) {
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

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `theme-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSavedState(isSaved, label) {
  els.statusDot.classList.toggle("is-active", isSaved);
  els.activeThemeName.textContent = label;
}

function setUnavailable(message) {
  els.siteName.textContent = "Unavailable";
  els.activeThemeName.textContent = "No editable site";
  els.form.querySelectorAll("button, input").forEach((element) => {
    element.disabled = true;
  });
  setMessage(message, true);
}

function setMessage(message, isError = false) {
  els.message.textContent = message;
  els.message.classList.toggle("is-error", isError);
}
