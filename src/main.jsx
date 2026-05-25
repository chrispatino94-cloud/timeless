import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Timeless from "./Timeless.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Timeless />
  </StrictMode>
);
