import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DossiersPage from "./pages/dossiers/DossiersPage";
import DossierDetailPage from "./pages/dossiers/DossierDetailPage";
import { PlaceholderPage } from "./pages/Placeholder";
import BeneficiairesPage from "./pages/beneficiaires/BeneficiairesPage";
import BeneficiaireDetailPage from "./pages/beneficiaires/BeneficiaireDetailPage";
import PointagesPage from "./pages/pointages/PointagesPage";
import PointageDetailPage from "./pages/pointages/PointageDetailPage";
import LoginPage from "./pages/LoginPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireRole } from "./components/auth/RequireRole";
import AdministrationPage from "./pages/admin/AdministrationPage";
import ConfigurationPage from "./pages/ConfigurationPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="beneficiaires" element={<BeneficiairesPage />} />
            <Route path="beneficiaires/:id" element={<BeneficiaireDetailPage />} />
            <Route path="pointages" element={<PointagesPage />} />
            <Route path="pointages/:id" element={<PointageDetailPage />} />
            <Route path="surveillance" element={<PlaceholderPage title="Surveillance GPS" />} />
            <Route path="alertes" element={<PlaceholderPage title="Alertes" />} />
            <Route path="rapports" element={<PlaceholderPage title="Rapports" />} />
            <Route path="configuration" element={<ConfigurationPage />} />
            <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
              <Route path="dossiers" element={<DossiersPage />} />
              <Route path="dossiers/:id" element={<DossierDetailPage />} />
              <Route path="administration" element={<AdministrationPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
