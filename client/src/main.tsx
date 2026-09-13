import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./styles/theme.css";
import "./styles/scenes.css";
import "./styles/cards.css";
import "./styles/battle.css";
import "./styles/mulligan.css";
import "./styles/collection.css";
import "./styles/rituals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
