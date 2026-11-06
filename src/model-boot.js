import "./model-viewer.css";
const loading = document.querySelector("#model-loading");
function recover(message) {
  loading.hidden = false;
  loading.classList.add("model-error");
  loading.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "The hangar couldn’t open.";
  const detail = document.createElement("p");
  detail.textContent = message;
  const retry = document.createElement("button");
  retry.textContent = "Try again";
  retry.onclick = () => location.reload();
  loading.append(title, detail, retry);
  retry.focus();
}
document
  .querySelector("#model-world")
  .addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    recover(
      "The browser lost its graphics connection. Reload to reopen the models.",
    );
  });
import("./model-viewer.js").catch((error) => {
  recover(
    /WebGL/i.test(error.message)
      ? "Enable hardware acceleration or try a browser with WebGL 2 support."
      : "A model did not finish loading. Check your connection and try again.",
  );
  console.error("Model hangar startup failed:", error);
});
