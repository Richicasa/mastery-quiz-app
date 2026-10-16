import React, { useState } from 'react';
import { Sparkles, User, Key, Volume2, VolumeX, LogOut, Check } from 'lucide-react';
import { UserProfile } from '../../shared/types.js';
import { isSoundMuted, setSoundMuted, playClickSound } from '../utils/sound.js';

interface NavbarProps {
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onGoHome: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  onOpenSettings,
  onGoHome,
  onLogout,
}) => {
  const [muted, setMutedState] = useState(isSoundMuted());

  const toggleSound = () => {
    const next = !muted;
    setSoundMuted(next);
    setMutedState(next);
    if (!next) {
      playClickSound();
    }
  };

  const userInitial = userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : 'U';

  return (
    <header className="border-b border-white/10 bg-[#07090e]/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2.5 sm:gap-3.5 group text-left transition shrink-0"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-[1.5px] shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <div className="w-full h-full bg-[#0b0f19] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-xl font-black tracking-tight text-white group-hover:text-purple-200 transition-colors">
                MasteryQuiz
              </span>
              <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 uppercase tracking-wider">
                InfiLoop
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden xs:block sm:block">
              Interrogación Exhaustiva • Racha 5/5
            </p>
          </div>
        </button>

        {/* User Profile & Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Audio toggle button */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl border border-white/5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title={muted ? 'Activar sonido' : 'Silenciar sonido'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* User profile dropdown button */}
          {userProfile && (
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 pl-3 shadow-md">
              <div className="flex items-center gap-2 text-left">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="hidden sm:block">
                  <span className="text-xs font-bold text-white block leading-tight">
                    {userProfile.username}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium block leading-tight">
                    Gemini Conectado
                  </span>
                </div>
              </div>

              <div
                onClick={onOpenSettings}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-xs font-black text-white cursor-pointer hover:opacity-90 shadow-sm"
                title="Configuración de Perfil y Clave API"
              >
                {userInitial}
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/80 transition"
                title="Cambiar usuario o salir"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
