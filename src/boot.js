import "./style.css";
import { DefaultLoadingManager } from "three";
const loading = document.querySelector("#loading");
const detail = document.querySelector("#loading-detail");
const progress = document.querySelector("#loading-progress");
let failed = false;
function recover(message) {
  if (failed) return;
  failed = true;
  loading.classList.remove("hidden");
  loading.classList.add("load-failed");
  loading.querySelector("h2").textContent = "The tower couldn’t open.";
  detail.textContent = message;
  progress.textContent = window.__HEATHROW__?.ready ? "Reload to open a fresh shift." : "Your browser has not started a shift.";
  document.querySelector("#load-retry").hidden = false;
  document.querySelector("#load-retry").focus();
}
DefaultLoadingManager.onProgress = (_url, loaded) => {
  if (!failed) progress.textContent = `${loaded} assets ready`;
};
document.querySelector("#load-retry").onclick = () => location.reload();
window.addEventListener("unhandledrejection", () => {
  if (!window.__HEATHROW__?.ready)
    recover(
      "An airport asset did not finish loading. Check your connection and try again.",
    );
});
document
  .querySelector("#world")
  .addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    window.__HEATHROW__?.stopRendering();
    failed = false;
    recover(
      "The browser lost its graphics connection. Close other graphics-heavy tabs, then reload to start a new shift.",
    );
  });
import("./main.js").catch((error) => {
  recover(
    /WebGL/i.test(error.message)
      ? "This experience needs WebGL 2. Enable hardware acceleration or try a current Chrome, Safari or Firefox browser."
      : "An airport asset did not finish loading. Check your connection and try again.",
  );
  console.error("Heathrow startup failed:", error);
});
