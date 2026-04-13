import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import DossiersPage from "./pages/dossiers/DossiersPage";
import DossierDetailPage from "./pages/dossiers/DossierDetailPage";
import { PlaceholderPage } from "./pages/Placeholder";
import BeneficiairesPage from "./pages/beneficiaires/BeneficiairesPage";
import BeneficiaireDetailPage from "./pages/beneficiaires/BeneficiaireDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dossiers" element={<DossiersPage />} />
          <Route path="dossiers/:id" element={<DossierDetailPage />} />
          <Route path="beneficiaires" element={<BeneficiairesPage />} />
          <Route path="beneficiaires/:id" element={<BeneficiaireDetailPage />} />
          <Route path="pointages" element={<PlaceholderPage title="Pointages" />} />
          <Route path="surveillance" element={<PlaceholderPage title="Surveillance GPS" />} />
          <Route path="alertes" element={<PlaceholderPage title="Alertes" />} />
          <Route path="rapports" element={<PlaceholderPage title="Rapports" />} />
          <Route path="administration" element={<PlaceholderPage title="Administration" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
