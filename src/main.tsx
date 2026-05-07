import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Pause CSS animations (the live ticker marquee, primarily) when the tab
// goes to the background. Saves CPU on idle browser tabs.
function syncVisibilityClass(): void {
  document.documentElement.classList.toggle("is-hidden", document.hidden);
}
syncVisibilityClass();
document.addEventListener("visibilitychange", syncVisibilityClass);
