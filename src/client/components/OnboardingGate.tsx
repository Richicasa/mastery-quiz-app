import React, { useState } from 'react';
import {
  Sparkles,
  Key,
  User,
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
} from 'lucide-react';
import { validateApiKey, setUserProfile } from '../api.js';
import { UserProfile } from '../../shared/types.js';
import { playCorrectSound, playIncorrectSound } from '../utils/sound.js';

interface OnboardingGateProps {
  onUnlocked: (profile: UserProfile) => void;
}

export const OnboardingGate: React.FC<OnboardingGateProps> = ({ onUnlocked }) => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    const cleanKey = apiKey.trim();

    if (!cleanUsername) {
      setErrorMessage('Por favor introduce tu nombre o apodo para identificar tu cuenta.');
      return;
    }

    if (!cleanKey) {
      setErrorMessage('Por favor introduce tu clave de Google Gemini API.');
      return;
    }

    try {
      setVerifying(true);

      // Real-time verification with Google Gemini API
      const result = await validateApiKey(cleanKey);

      if (!result.valid) {
        playIncorrectSound();
        setErrorMessage(
          result.error ||
            'La clave API no es válida o Google la rechazó. Verifica que esté activa en Google AI Studio.'
        );
        setVerifying(false);
        return;
      }

      // Valid connection confirmed!
      playCorrectSound();
      setSuccess(true);

      const profile: UserProfile = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: cleanUsername,
        apiKey: cleanKey,
        createdAt: new Date().toISOString(),
      };

      setUserProfile(profile);

      setTimeout(() => {
        onUnlocked(profile);
      }, 1000);
    } catch (err: any) {
      playIncorrectSound();
      setErrorMessage(
        err.message || 'Error de conexión intentando verificar la clave con Google Gemini.'
      );
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-purple-900/20 mb-4 animate-bounce-short">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>MasteryQuiz • InfiLoop 5/5</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Bienvenido al Estudio Exhaustivo
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Antes de comenzar, ingresa tu apodo y tu clave de API para crear tu cuenta privada y desbloquear la plataforma.
          </p>
        </div>

        {/* Main Glass Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 text-left relative overflow-hidden">
          {/* Subtle top edge gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400" />

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-950/70 border border-red-700/80 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="block font-bold mb-0.5">Error de Validación:</strong>
                {errorMessage}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <strong className="block font-bold">¡Clave y Cuenta Verificadas!</strong>
                <span className="text-xs text-emerald-300">Desbloqueando tu panel de estudio personalizado...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input 1: Nombre o Apodo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>¿Cuál es tu nombre o apodo?</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ej: Richi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={verifying || success}
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 pl-1">
                Tus pruebas, estadísticas y rachas quedarán guardadas exclusivamente bajo este perfil.
              </p>
            </div>

            {/* Input 2: Clave API de Gemini */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tu Clave API de Google Gemini</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={verifying || success}
                  className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 underline font-semibold transition"
                >
                  <span>Conseguir clave gratuita en Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong>Conexión Directa y Privada:</strong> Tu clave se almacena únicamente en tu navegador y se usa exclusivamente para tus consultas con Gemini.
              </span>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={verifying || success}
              className="quiz-button w-full py-4 rounded-xl text-base font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 transition duration-150 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verificando conexión real con Gemini...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span>¡Bienvenido, {username}!</span>
                </>
              ) : (
                <>
                  <span>Verificar y Desbloquear Plataforma</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
          <BrainCircuit className="w-4 h-4 text-slate-600" />
          <span>Generador exhaustivo por párrafos + Calificador semántico IA</span>
        </div>
      </div>
    </div>
  );
};
