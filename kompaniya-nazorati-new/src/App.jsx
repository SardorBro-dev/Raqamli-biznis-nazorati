import { useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

import "./App.css";

import {
  LoginPage,
  RegisterPage,
  RecoverAccountPage,
} from "./pages/AuthFlow";
import OwnerDashboard from "./pages/OwnerDashboard";
import SolarSystemBackground from "./components/SolarSystemBackground";
import UzbekistanClock from "./components/UzbekistanClock";
import LanguageSelector from "./components/LanguageSelector";
import ColorThemeSelector from "./components/ColorThemeSelector";
import TariffPage from "./pages/TariffPage";
import MonetizationPage from "./pages/Monetization";
import CreateCompanyFlow from "./pages/CreateCompanyFlow";
import CompanyPanel from "./pages/CompanyPanel";
import EmployeePanel from "./pages/EmployeePanel";
import MeetingRoom from "./pages/MeetingRoom";
import { useLanguage } from "./utils/language";
import BackgroundSettings, { CustomBackground } from "./components/BackgroundSettings";
import CompanyLogo from "./components/CompanyLogo";
import BubbleBackground from "./components/BubbleBackground";
import { authApi } from "./services/api";
import { clearSession, getCurrentSession } from "./utils/storage";

function SessionGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const session = getCurrentSession();
      if (!session?.token || ["/", "/register", "/recover-account", "/forgot-password"].includes(location.pathname)) return;
      try {
        await authApi.getProfile(session.token);
      } catch (error) {
        if (error.code !== "API_UNAVAILABLE") {
          clearSession();
          navigate("/", { replace: true });
        }
      }
    };

    checkSession();
    const intervalId = window.setInterval(checkSession, 3000);
    return () => window.clearInterval(intervalId);
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  useLanguage();
  const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

  return (
    <Router>
      <SessionGuard />
      <SolarSystemBackground />
      <CustomBackground />
      <BubbleBackground />
      <div className="global-utility-dock">
        <div className="utility-header-brand">
          <CompanyLogo className="utility-header-logo" />
          <strong>Raqamli biznes nazorati</strong>
        </div>
        <LanguageSelector />
        <UzbekistanClock />
        <ColorThemeSelector />
        <BackgroundSettings />
      </div>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recover-account" element={<RecoverAccountPage />} />
        <Route path="/forgot-password" element={<RecoverAccountPage />} />
        <Route path="/dashboard" element={<OwnerDashboard />} />
        <Route path="/tariffs" element={<TariffPage />} />
        <Route path="/monetization" element={<MonetizationPage />} />
        <Route path="/create-company" element={<CreateCompanyFlow />} />
        <Route path="/company-panel" element={<CompanyPanel />} />
        <Route path="/employee-panel" element={<EmployeePanel />} />
        <Route path="/meeting-room" element={<MeetingRoom />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;