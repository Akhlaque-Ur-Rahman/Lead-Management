import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { CompanyProvider } from "./components/CompanyContext";
import { AuthProvider } from "./components/AuthContext";
import { LeadsProvider } from "./components/LeadsContext";
import { StrictMode } from "react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <CompanyProvider>
        <AuthProvider>
          <LeadsProvider>
            <App />
          </LeadsProvider>
        </AuthProvider>
      </CompanyProvider>
    </BrowserRouter>
  </StrictMode>
);