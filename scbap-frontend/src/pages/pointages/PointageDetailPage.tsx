import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PointageDetailPage() {
  const { id } = useParams();

  return (
    <div className="p-4 sm:p-8 min-h-full bg-surface text-on-surface">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <Link
            to="/pointages"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-fixed"
          >
            <ArrowLeft size={16} /> Retour aux pointages
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Détail du pointage</h1>
        </div>
      </div>

      <div className="rounded-3xl border border-outline-variant bg-white p-6 shadow-sm">
        <p className="text-sm text-on-surface-variant">
          Cette page est en cours de construction. Le pointage sélectionné est <span className="font-semibold">#{id}</span>.
        </p>
      </div>
    </div>
  );
}
