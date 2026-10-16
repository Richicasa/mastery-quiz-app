import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Check, ShieldCheck } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../api.js';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeySaved }) => {
  const [key, setKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKey(getStoredApiKey());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(key);
    setSavedSuccess(true);
    onKeySaved();
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Clave API de Gemini</h3>
            <p className="text-xs text-slate-400">Tu clave se guarda exclusivamente en tu navegador</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          Para que la extracción exhaustiva por párrafo y la calificación de respuestas abiertas funcionen en tu cuenta sin intermediarios, introduce tu clave de Google Gemini.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition font-mono"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 underline font-medium"
            >
              Obtener clave gratuita en Google AI Studio
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Seguridad garantizada: Tu clave viaja cifrada directamente desde tu navegador en la cabecera `x-gemini-key`.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡Guardada!</span>
                </>
              ) : (
                'Guardar Clave'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
