// JulianXtension — welcome / install page
const params = new URLSearchParams(location.search);
const isUpdate = params.get("reason") === "update";

const eyebrowEl = document.getElementById("eyebrow");
if (eyebrowEl) eyebrowEl.textContent = isUpdate ? "Updated" : "Installed";
