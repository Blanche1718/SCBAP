import { Construction } from "lucide-react";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 p-6 text-center text-on-surface-variant">
      <Construction size={36} className="mb-4 opacity-20" />
      <h2 className="text-lg font-bold text-on-surface">{title}</h2>
      <p className="text-sm mt-1 opacity-60">Module en cours de développement</p>
    </div>
  );
}
