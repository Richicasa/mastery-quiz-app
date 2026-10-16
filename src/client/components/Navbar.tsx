import React from 'react';
import { Key, Sparkles, BookOpen, Flame } from 'lucide-react';

interface NavbarProps {
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onGoHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ hasApiKey, onOpenSettings, onGoHome }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={onGoHome}
          className="flex items-center gap-3 group text-left transition"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-200 to-white bg-clip-text text-transparent">
              MasteryQuiz
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
              InfiLoop 5/5
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition border ${
              hasApiKey
                ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                : 'bg-amber-950/50 border-amber-600/60 text-amber-300 hover:bg-amber-900/60 animate-pulse'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{hasApiKey ? 'Gemini API Activa' : 'Configurar API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
