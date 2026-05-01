import { RestoreAppView } from "./App.ts";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing root element.");
}

const app = new RestoreAppView(container);
void app.init();
