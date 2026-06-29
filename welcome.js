// JulianXtension — welcome / install page
const params = new URLSearchParams(location.search);
const version = params.get("v");
const isUpdate = params.get("reason") === "update";

const versionEl = document.getElementById("version");
if (versionEl) versionEl.textContent = version ? `v${version}` : "";

const eyebrowEl = document.getElementById("eyebrow");
if (eyebrowEl) eyebrowEl.textContent = isUpdate ? "Updated" : "Installed";

const closeBtn = document.getElementById("closeBtn");
if (closeBtn) closeBtn.addEventListener("click", () => window.close());
