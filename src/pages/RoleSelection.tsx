import { User, Activity } from 'lucide-react';

interface Props {
  onSelect: (role: 'staff' | 'patient') => void;
}

export default function RoleSelection({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 flex flex-col items-center p-6 font-sans">
      <div className="w-full max-w-md pt-8 pb-12">
        <h1 className="text-sm font-bold text-blue-600/80 uppercase tracking-widest text-center">
          Communication Radiologique
        </h1>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">
        <button
          onClick={() => onSelect('staff')}
          className="w-full bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center transition-all active:scale-[0.98] group"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Console Radiologue</h2>
          <p className="text-slate-500">Contrôlez l'affichage et envoyez les instructions.</p>
        </button>

        <button
          onClick={() => onSelect('patient')}
          className="w-full bg-white hover:border-teal-300 hover:shadow-lg hover:shadow-teal-500/10 border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center transition-all active:scale-[0.98] group"
        >
          <div className="w-16 h-16 bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Écran Patient</h2>
          <p className="text-slate-500">Affichez les instructions dans la salle d'examen.</p>
        </button>
      </div>

      <div className="mt-auto pt-12 pb-6 text-center">
        <p className="text-sm text-slate-400">
          Astuce : Pour installer cette application sur votre tablette sans l'interface AI Studio, cliquez sur le bouton "Share" en haut à droite, copiez le lien "Shared URL", ouvrez-le dans un nouvel onglet, puis choisissez "Ajouter à l'écran d'accueil".
        </p>
      </div>
    </div>
  );
}
