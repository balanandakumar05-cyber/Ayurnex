import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Global tokens + reset first; App.jsx imports App.css (components/layout) after it.
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);