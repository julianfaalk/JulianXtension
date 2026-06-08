// Uninstall survey
chrome.runtime.setUninstallURL("https://docs.google.com/forms/d/e/1FAIpQLSewJf4DzNQpDiemgLskxtiTr8v8jGsRnf2TElorW2gLvkuagg/viewform");

// Settings now live in chrome.storage.sync so they follow you across devices.
// Migrate anything still in local (from older versions) into sync once, without
// clobbering values already synced. Runs on every service-worker start and is
// idempotent; the local copy is left intact as a safety net.
async function migrateLocalToSync() {
  try {
    const local = await chrome.storage.local.get(null);
    if (!local || !Object.keys(local).length) {
      return;
    }
    const synced = await chrome.storage.sync.get(null);
    const toCopy = {};
    for (const [key, value] of Object.entries(local)) {
      if (!(key in synced)) {
        toCopy[key] = value;
      }
    }
    if (Object.keys(toCopy).length) {
      await chrome.storage.sync.set(toCopy);
    }
  } catch (_error) {
    /* sync quota / unavailable — ignore */
  }
}
migrateLocalToSync();

// Open welcome/update page
chrome.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
  const v = chrome.runtime.getManifest().version;

  if (reason === "install") {
    chrome.storage.sync.set({ installTimestamp: Date.now() });
    const params = new URLSearchParams({ v, reason });
    chrome.tabs.create({ url: chrome.runtime.getURL(`welcome.html?${params}`) });
  } else if (reason === "update") {
    // Set installTimestamp for existing users so engagement prompt starts from update
    chrome.storage.sync.get("installTimestamp", ({ installTimestamp }) => {
      if (!installTimestamp) chrome.storage.sync.set({ installTimestamp: Date.now() });
    });

    // Only show update page for major versions (2.0, 3.0, etc.) or 1.3.0
    const major = v.split(".")[0];
    const isMajorBump = previousVersion && major !== previousVersion.split(".")[0];
    const is130 = v === "1.3.0";

    if (isMajorBump || is130) {
      const params = new URLSearchParams({ v, reason });
      params.set("from", previousVersion);
      chrome.tabs.create({ url: chrome.runtime.getURL(`welcome.html?${params}`) });
    }
  }
});
