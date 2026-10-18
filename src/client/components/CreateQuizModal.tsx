import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlignLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { extractText, generateQuiz, getStoredApiKey } from '../api.js';
import { Quiz } from '../../shared/types.js';
import { playCorrectSound, playIncorrectSound } from '../utils/sound.js';

interface CreateQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: Quiz) => void;
  onOpenApiKeySettings: () => void;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  onClose,
  onQuizCreated,
  onOpenApiKeySettings,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setErrorMessage(
        'Necesitas configurar tu clave API de Gemini antes de generar preguntas.'
      );
      return;
    }

    if (activeTab === 'upload' && !file) {
      setErrorMessage('Por favor selecciona un archivo PDF, DOCX o TXT.');
      return;
    }

    if (activeTab === 'paste' && !rawText.trim()) {
      setErrorMessage('Por favor pega el texto del capítulo que deseas estudiar.');
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Extrayendo texto y segmentando párrafos...');

      // Step 1: Extract and segment
      const extraction = await extractText(
        activeTab === 'upload' ? file! : undefined,
        activeTab === 'paste' ? rawText : undefined,
        title
      );

      if (extraction.paragraphs.length === 0) {
        throw new Error('No se detectaron párrafos con contenido suficiente para evaluar.');
      }

      setStatusMessage(
        `Se detectaron ${extraction.totalParagraphs} párrafos. Generando preguntas exhaustivas con Gemini...`
      );

      // Step 2: Generate exhaustive questions
      const finalTitle = title.trim() || extraction.detectedTitle || 'Capítulo de Estudio';
      const createdQuiz = await generateQuiz(
        extraction.paragraphs,
        finalTitle,
        activeTab === 'upload' ? 'document' : 'text',
        activeTab === 'upload' ? file!.name : 'Texto pegado'
      );

      setStatusMessage('¡Preguntas generadas con éxito! Preparando prueba...');
      playCorrectSound();
      setTimeout(() => {
        setLoading(false);
        onQuizCreated(createdQuiz);
      }, 500);
    } catch (err: any) {
      console.error(err);
      playIncorrectSound();
      setErrorMessage(err.message || 'Error al generar la prueba.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Nueva Prueba Exhaustiva
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Crear nueva prueba
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sube o pega un capítulo. Se extraerán todas las preguntas posibles de cada párrafo.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {(errorMessage.toLowerCase().includes('clave api') ||
              errorMessage.toLowerCase().includes('api key') ||
              errorMessage.toLowerCase().includes('gemini') ||
              errorMessage.toLowerCase().includes('quota') ||
              errorMessage.toLowerCase().includes('429')) && (
              <button
                type="button"
                onClick={onOpenApiKeySettings}
                className="shrink-0 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
              >
                Verificar Clave
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Título de la prueba / Capítulo
            </label>
            <input
              type="text"
              placeholder="Ej: Capítulo 4 - Mitosis y Ciclo Celular"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            />
          </div>

          {/* Dos opciones principales como solicitaste: Subir documento y Pegar texto */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Origen del Contenido
            </label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Subir documento</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                disabled={loading}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition ${
                  activeTab === 'paste'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                <span>Pegar texto</span>
              </button>
            </div>
          </div>

          {/* Opción 1: Subir documento */}
          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-950/50 transition">
              <input
                type="file"
                id="chapterFile"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
              <label
                htmlFor="chapterFile"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-950/70 border border-purple-800 flex items-center justify-center text-purple-400">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {file ? (
                      <span className="text-purple-300 font-bold">{file.name}</span>
                    ) : (
                      'Haz clic para seleccionar el documento del capítulo'
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos soportados: PDF, Word (.docx), Texto plano (.txt)
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Opción 2: Pegar texto */}
          {activeTab === 'paste' && (
            <div>
              <textarea
                rows={8}
                placeholder="Pega aquí el texto completo del capítulo o los párrafos que deseas memorizar..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition leading-relaxed font-sans"
              />
              <div className="flex justify-between items-center text-xs text-slate-500 mt-1 px-1">
                <span>Párrafos detectados aproximados: {rawText.split(/\n\s*\n+/).filter(t => t.trim().length > 25).length}</span>
                <span>{rawText.length} caracteres</span>
              </div>
            </div>
          )}

          {/* Estado de carga con barra de progreso */}
          {loading && (
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin shrink-0" />
                <span className="text-sm font-semibold text-purple-200">
                  {statusMessage}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 h-2 rounded-full animate-pulse-fast w-full" />
              </div>
            </div>
          )}

          {/* Botón inferior Generar (como solicitaste) */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="quiz-button px-8 py-3.5 rounded-xl text-base font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 transition flex items-center gap-2.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando preguntas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
