(() => {
  if (window.__juliansXtensionLoaded) {
    return;
  }

  window.__juliansXtensionLoaded = true;

  const STYLE_ID = "juliansxtension-style";
  const STORAGE_KEY = "siteThemes";
  const MESSAGE_TYPES = {
    ping: "JULIANS_XTENSION_PING",
    setColor: "JULIANS_XTENSION_SET_COLOR",
    clearColor: "JULIANS_XTENSION_CLEAR_COLOR"
  };
  const host = normalizeHost(window.location.hostname);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") {
      return false;
    }

    if (message.type === MESSAGE_TYPES.ping) {
      sendResponse({ ok: true });
      return true;
    }

    if (message.host && normalizeHost(message.host) !== host) {
      sendResponse({ ok: false });
      return true;
    }

    if (message.type === MESSAGE_TYPES.setColor) {
      const color = normalizeColor(message.color);
      if (!color) {
        sendResponse({ ok: false });
        return true;
      }

      applyColor(color);
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === MESSAGE_TYPES.clearColor) {
      clearColor();
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }

    const nextThemes = changes[STORAGE_KEY].newValue || {};
    const theme = normalizeTheme(nextThemes[host]);
    if (theme) {
      applyColor(theme.color);
    } else {
      clearColor();
    }
  });

  loadStoredColor();

  async function loadStoredColor() {
    try {
      const result = await chrome.storage.sync.get({ [STORAGE_KEY]: {} });
      const theme = normalizeTheme(result[STORAGE_KEY]?.[host]);

      if (theme) {
        applyColor(theme.color);
      }
    } catch (_error) {
      clearColor();
    }
  }

  function applyColor(color) {
    const rgb = hexToRgb(color);
    const contrast = getReadableTextColor(rgb);
    const style = getOrCreateStyle();

    style.textContent = `
:root {
  --jxt-colorizer-main: ${color};
  --jxt-colorizer-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};
  --jxt-colorizer-soft: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12);
  --jxt-colorizer-medium: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24);
  --jxt-colorizer-strong: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.84);
  --jxt-colorizer-contrast: ${contrast};
  accent-color: var(--jxt-colorizer-main) !important;
}

a[href],
a:visited,
[role="link"] {
  color: var(--jxt-colorizer-main) !important;
}

button:not(:disabled):hover,
[role="button"]:not([aria-disabled="true"]):hover {
  box-shadow: inset 0 0 0 999px var(--jxt-colorizer-soft);
}

button[type="submit"]:not(:disabled),
input[type="submit"]:not(:disabled),
[role="button"][data-testid*="tweetButton" i],
[role="button"][data-testid="SideNav_NewTweet_Button"] {
  background-color: var(--jxt-colorizer-main) !important;
  border-color: var(--jxt-colorizer-main) !important;
  color: var(--jxt-colorizer-contrast) !important;
}

button[type="submit"]:not(:disabled) *,
input[type="submit"]:not(:disabled) *,
[role="button"][data-testid*="tweetButton" i] *,
[role="button"][data-testid="SideNav_NewTweet_Button"] * {
  color: var(--jxt-colorizer-contrast) !important;
}

input:focus,
textarea:focus,
select:focus,
[contenteditable="true"]:focus {
  border-color: var(--jxt-colorizer-main) !important;
  outline: 2px solid var(--jxt-colorizer-main) !important;
  outline-offset: 2px !important;
}

[role="tab"][aria-selected="true"],
[role="tab"][aria-selected="true"] *,
[aria-current="page"],
[aria-current="page"] *,
[data-state="active"],
[data-active="true"] {
  border-color: var(--jxt-colorizer-main) !important;
  color: var(--jxt-colorizer-main) !important;
}

[role="tab"][aria-selected="true"] div,
[role="tab"][aria-selected="true"] span:last-child {
  border-color: var(--jxt-colorizer-main) !important;
}

[aria-pressed="true"] {
  border-color: var(--jxt-colorizer-main) !important;
  color: var(--jxt-colorizer-main) !important;
}

[style*="color: rgb(29, 155, 240)"],
[style*="color:rgb(29,155,240)"],
[style*="fill: rgb(29, 155, 240)"],
[style*="fill:rgb(29,155,240)"] {
  color: var(--jxt-colorizer-main) !important;
  fill: var(--jxt-colorizer-main) !important;
}

[style*="background-color: rgb(29, 155, 240)"],
[style*="background-color:rgb(29,155,240)"] {
  background-color: var(--jxt-colorizer-main) !important;
}

[style*="border-color: rgb(29, 155, 240)"],
[style*="border-color:rgb(29,155,240)"] {
  border-color: var(--jxt-colorizer-main) !important;
}

progress,
meter {
  accent-color: var(--jxt-colorizer-main) !important;
}

::selection {
  background: var(--jxt-colorizer-medium) !important;
  color: var(--jxt-colorizer-contrast) !important;
}
`;
    document.documentElement.dataset.juliansXtensionActive = "true";
  }

  function clearColor() {
    document.getElementById(STYLE_ID)?.remove();
    delete document.documentElement.dataset.juliansXtensionActive;
  }

  function getOrCreateStyle() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
      return existing;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.dataset.owner = "JuliansXtension";
    (document.head || document.documentElement).append(style);
    return style;
  }

  function normalizeHost(hostname) {
    return String(hostname || "").replace(/^www\./i, "").toLowerCase();
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

  function hexToRgb(color) {
    const value = color.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function getReadableTextColor({ r, g, b }) {
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.56 ? "#0b0f14" : "#ffffff";
  }
})();
