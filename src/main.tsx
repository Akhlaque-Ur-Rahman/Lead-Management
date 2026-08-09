import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/login.css";
import { BrowserRouter } from "react-router-dom";
import { CompanyProvider } from "./components/CompanyContext";
import { AuthProvider } from "./components/AuthContext";
import { LeadsProvider } from "./components/LeadsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { DocumentSeo } from "./components/seo/DocumentSeo";
import { StrictMode } from "react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="lms_theme">
        <AuthProvider>
          <DocumentSeo />
          <CompanyProvider>
            <LeadsProvider>
              <App />
            </LeadsProvider>
          </CompanyProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);