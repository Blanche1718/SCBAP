import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FileBadge2,
  FolderOpen,
  Shield,
} from "lucide-react";

const REPORT_MODULE_CARDS = [
  {
    to: "/rapports/rediges",
    icon: FileBadge2,
    title: "Rapports rédigés",
    description:
      "Consulter les rapports administratifs déjà produits par les agents de l’agence pénitentiaire.",
  },
  {
    to: "/rapports/evaluations",
    icon: ClipboardList,
    title: "Évaluations reçues",
    description:
      "Voir les évaluations soumises par les services externes, avec leur détail complet par bénéficiaire.",
  },
  {
    to: "/rapports/documents",
    icon: FolderOpen,
    title: "Documents reçus",
    description:
      "Retrouver les pièces reçues, qu’elles proviennent de la DAPG ou des téléversements faits dans SCBAP.",
  },
];

export default function RapportsPage() {
  return (
    <div className="min-h-full bg-surface px-4 py-6 sm:px-8">
      <div
        className="mb-8 rounded-[28px] px-6 py-7 text-white shadow-[0_18px_45px_rgba(23,54,46,0.14)]"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(211,227,222,0.15), transparent 28%), linear-gradient(135deg, #17362e 0%, #2e4d44 100%)",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/78">
              <Shield size={13} />
              Centre de rapports
            </div>
            <h1 className="font-[Manrope] text-[32px] font-extrabold leading-tight sm:text-[40px]">
              Rapports, évaluations et documents
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-white/72">
              Cette section centralise les productions internes, les évaluations externes reçues et les documents associés aux bénéficiaires.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {REPORT_MODULE_CARDS.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-[26px] border border-surface-high bg-white p-6 shadow-[0_14px_40px_rgba(23,54,46,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_20px_50px_rgba(23,54,46,0.1)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed text-[#2e4d44]">
              <Icon size={20} />
            </div>
            <h2 className="mt-6 text-xl font-bold text-on-surface">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              {description}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Ouvrir l’interface
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
