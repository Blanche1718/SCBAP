import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DossiersPage from "./pages/dossiers/DossiersPage";
import DossierDetailPage from "./pages/dossiers/DossierDetailPage";
import BeneficiairesPage from "./pages/beneficiaires/BeneficiairesPage";
import BeneficiaireDetailPage from "./pages/beneficiaires/BeneficiaireDetailPage";
import PointagesPage from "./pages/pointages/PointagesPage";
import PointageDetailPage from "./pages/pointages/PointageDetailPage";
import LoginPage from "./pages/LoginPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireRole } from "./components/auth/RequireRole";
import AdministrationPage from "./pages/admin/AdministrationPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import GpsMapPage from "./pages/surveillance/GpsMapPage";
import AlertesPage from "./pages/alertes/AlertesPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ServicesPage from "./pages/services/ServicesPage";
import ServiceDetailPage from "./pages/services/ServiceDetailPage";
import PortalLandingPage from "./pages/portal/PortalLandingPage";
import PortalEvaluationPage from "./pages/portal/PortalEvaluationPage";
import PortalEvaluationSuccessPage from "./pages/portal/PortalEvaluationSuccessPage";
import RapportsPage from "./pages/rapports/RapportsPage";
import RapportsRedigesPage from "./pages/rapports/RapportsRedigesPage";
import RapportsEvaluationsPage from "./pages/rapports/RapportsEvaluationsPage";
import RapportsDocumentsPage from "./pages/rapports/RapportsDocumentsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/portail" element={<PortalLandingPage />} />
      <Route path="/portail/evaluation" element={<PortalEvaluationPage />} />
      <Route path="/portail/evaluation/success" element={<PortalEvaluationSuccessPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="beneficiaires" element={<BeneficiairesPage />} />
          <Route path="beneficiaires/:id" element={<BeneficiaireDetailPage />} />
          <Route path="pointages" element={<PointagesPage />} />
          <Route path="pointages/:id" element={<PointageDetailPage />} />
          <Route path="surveillance" element={<GpsMapPage />} />
          <Route path="alertes" element={<AlertesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route path="rapports" element={<RapportsPage />} />
          <Route path="rapports/rediges" element={<RapportsRedigesPage />} />
          <Route path="rapports/evaluations" element={<RapportsEvaluationsPage />} />
          <Route path="rapports/documents" element={<RapportsDocumentsPage />} />
          <Route path="configuration" element={<ConfigurationPage />} />
          <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
            <Route path="dossiers" element={<DossiersPage />} />
            <Route path="dossiers/:id" element={<DossierDetailPage />} />
            <Route path="administration" element={<AdministrationPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
