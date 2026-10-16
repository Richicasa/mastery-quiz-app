import React, { useState, useEffect } from 'react';
import { X, User, Key, Check, Loader2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../../shared/types.js';
import { validateApiKey, setUserProfile } from '../api.js';
import { playCorrectSound, playIncorrectSound } from '../utils/sound.js';

interface ProfileModalProps {
  isOpen: boolean;
  userProfile: UserProfile | null;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  userProfile,
  onClose,
  onProfileUpdated,
}) => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (userProfile && isOpen) {
      setUsername(userProfile.username);
      setApiKey(userProfile.apiKey);
      setErrorMessage('');
      setSavedSuccess(false);
    }
  }, [userProfile, isOpen]);

  if (!isOpen || !userProfile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    const cleanKey = apiKey.trim();

    if (!cleanUsername) {
      setErrorMessage('El nombre o apodo no puede estar vacío.');
      return;
    }

    if (!cleanKey) {
      setErrorMessage('La clave API no puede estar vacía.');
      return;
    }

    try {
      setVerifying(true);
      // Validate key if it was modified
      if (cleanKey !== userProfile.apiKey) {
        const val = await validateApiKey(cleanKey);
        if (!val.valid) {
          playIncorrectSound();
          setErrorMessage(val.error || 'La nueva clave API no pudo ser validada por Gemini.');
          setVerifying(false);
          return;
        }
      }

      playCorrectSound();
      const updated: UserProfile = {
        ...userProfile,
        username: cleanUsername,
        apiKey: cleanKey,
      };

      setUserProfile(updated);
      setSavedSuccess(true);
      onProfileUpdated(updated);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      playIncorrectSound();
      setErrorMessage(err.message || 'Error al actualizar el perfil.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-purple-600/30">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Tu Cuenta y Clave Gemini</h3>
            <p className="text-xs text-slate-400">Personaliza tu perfil y gestiona tu cuota</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-950/70 border border-red-700/80 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Nombre o Apodo</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={verifying}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini API Key</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={verifying}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 underline font-medium"
            >
              <span>Generar o revisar clave en Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Tus pruebas quedan vinculadas únicamente a tu perfil en este navegador.</span>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="quiz-button px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 transition disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>¡Actualizado!</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
