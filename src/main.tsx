import { createRoot } from "react-dom/client";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// @ts-ignore - CSS-only font imports
import "@fontsource-variable/space-grotesk";
// @ts-ignore - CSS-only font imports
import "@fontsource-variable/jetbrains-mono";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
