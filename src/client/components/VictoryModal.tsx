import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Flame, RotateCcw, ArrowLeft, Award, Sparkles } from 'lucide-react';

interface VictoryModalProps {
  quizTitle: string;
  totalQuestions: number;
  totalRoundsPlayed: number;
  onRestart: () => void;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  quizTitle,
  totalQuestions,
  totalRoundsPlayed,
  onRestart,
  onExit,
}) => {
  useEffect(() => {
    // Launch celebratory confetti bursts
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#8854c0'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#8854c0'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/50 w-full max-w-lg rounded-3xl p-8 text-center shadow-2xl relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-6 animate-bounce-short">
          <Trophy className="w-12 h-12 text-slate-950 fill-current" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Racha Estricta Completada: 5 / 5
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
          ¡MAESTRÍA ABSOLUTA!
        </h2>

        <p className="text-slate-300 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
          Has superado con éxito <strong className="text-amber-400">5 rondas consecutivas con 100% de aciertos</strong> en "{quizTitle}". El contenido de cada párrafo ha quedado fijado en tu memoria a largo plazo.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Banco Total</span>
            <span className="text-xl font-extrabold text-white">{totalQuestions} preguntas</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Vueltas Totales</span>
            <span className="text-xl font-extrabold text-amber-400">{totalRoundsPlayed} vueltas</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestart}
            className="quiz-button flex-1 py-3.5 px-4 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repasar de nuevo</span>
          </button>
          <button
            onClick={onExit}
            className="quiz-button flex-1 py-3.5 px-4 rounded-xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Pruebas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
