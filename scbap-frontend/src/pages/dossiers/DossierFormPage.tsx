import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  User,
  Shield,
  FileText,
} from "lucide-react";
import { useDossier } from "../../hooks/useDossiers";
import { Button } from "../../components/ui";

function FormSection({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white p-4 sm:p-6 border border-surface-low shadow-sm">
      <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-6 pb-3 border-b border-surface-low">
        <Icon size={18} className="text-primary" />
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {children}
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, type = "text", placeholder, required }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
        required={required}
      />
    </div>
  );
}

export default function DossierFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { dossier, loading } = useDossier(id);
  const [formData, setFormData] = useState<any>({ nom: "", prenom: "", sexe: "M" });

  useEffect(() => {
    if (dossier) setFormData(dossier);
  }, [dossier]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to={isEdit ? `/dossiers/${id}` : "/dossiers"} className="flex items-center gap-1.5 text-sm text-on-surface-variant mb-2">
            <ArrowLeft size={14} /> Retour
          </Link>
          <h1 className="text-xl font-bold text-on-surface">
            {isEdit ? "Modifier le dossier" : "Nouveau dossier"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:flex gap-2">
            <X size={16} /> Annuler
          </Button>
          <Button onClick={() => {}} className="gap-2">
            <Save size={16} /> Enregistrer
          </Button>
        </div>
      </div>

      <form className="space-y-6">
        <FormSection title="État civil" icon={User}>
          <InputField label="Nom" name="nom" value={formData.nom} onChange={handleChange} required />
          <InputField label="Prénom" name="prenom" value={formData.prenom} onChange={handleChange} required />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sexe</label>
            <select name="sexe" value={formData.sexe} onChange={handleChange} className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface text-sm">
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <InputField label="Date de naissance" name="dateNaissance" type="date" value={formData.dateNaissance?.split('T')[0]} onChange={handleChange} />
          <InputField label="Lieu de naissance" name="lieuNaissance" value={formData.lieuNaissance} onChange={handleChange} />
          <InputField label="Nationalité" name="nationalite" value={formData.nationalite} onChange={handleChange} />
        </FormSection>

        <FormSection title="Cadre Judiciaire" icon={Shield}>
          <InputField label="Numéro de dossier" name="numeroDossier" value={formData.numeroDossier} onChange={handleChange} required />
          <InputField label="N° Mandat de dépôt" name="numeroMandatDepot" value={formData.numeroMandatDepot} onChange={handleChange} />
          <InputField label="Date de fin de peine" name="dateFinPeine" type="date" value={formData.dateFinPeine?.split('T')[0]} onChange={handleChange} />
        </FormSection>

        <FormSection title="Notes" icon={FileText}>
          <div className="col-span-full space-y-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Observations</label>
            <textarea name="observations" value={formData.observations || ""} onChange={handleChange} rows={3} className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface text-sm" />
          </div>
        </FormSection>

        <div className="flex sm:hidden pt-4 pb-8">
          <Button onClick={() => {}} className="w-full py-4 h-auto text-lg shadow-lg gap-2">
            <Save size={20} />
            Enregistrer le dossier
          </Button>
        </div>
      </form>
    </div>
  );
}