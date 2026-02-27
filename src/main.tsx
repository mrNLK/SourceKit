import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global unhandled promise rejection handler
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  // Show a toast-style notification for unhandled errors
  const container = document.getElementById("global-error-toast");
  if (container) {
    container.textContent = "Something went wrong. Please try again.";
    container.style.display = "block";
    setTimeout(() => { container.style.display = "none"; }, 5000);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
