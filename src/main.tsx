import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import { ImportProvider } from "./context/ImportContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SessionProvider>
      <ImportProvider>
        <App />
      </ImportProvider>
    </SessionProvider>
  </React.StrictMode>,
);
