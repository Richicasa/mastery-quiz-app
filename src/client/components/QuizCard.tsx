import React from 'react';
import { BookOpen, FileText, Play, Trash2, Flame, Award, Calendar } from 'lucide-react';
import { Quiz } from '../../shared/types.js';

interface QuizCardProps {
  quiz: Quiz;
  onSelect: (quiz: Quiz) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, onSelect, onDelete }) => {
  const formattedDate = new Date(quiz.createdAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isMastered = quiz.stats.timesMastered > 0;

  return (
    <div
      onClick={() => onSelect(quiz)}
      className="notebook-card bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer group flex flex-col justify-between transition-all duration-200 relative overflow-hidden"
    >
      {/* Top ambient highlight on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200 shadow-md">
            {quiz.sourceType === 'document' ? (
              <FileText className="w-6 h-6" />
            ) : (
              <BookOpen className="w-6 h-6" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {isMastered && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400">
                <Award className="w-3.5 h-3.5" />
                Maestría 100%
              </span>
            )}
            <button
              onClick={(e) => onDelete(quiz.id, e)}
              className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition"
              title="Eliminar prueba"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-2">
          {quiz.title}
        </h3>

        <p className="text-xs text-slate-400 flex items-center gap-2 mb-4">
          <span>{quiz.sourceName}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            {formattedDate}
          </span>
        </p>
      </div>

      <div className="pt-4 border-t border-slate-800/80">
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Preguntas</span>
            <span className="text-sm font-bold text-purple-300">{quiz.questions.length} exhaustivas</span>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Párrafos</span>
            <span className="text-sm font-bold text-indigo-300">{quiz.totalParagraphs} analizados</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-950/30 border border-amber-800/40 px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Racha: {quiz.stats.bestStreak} / 5</span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 group-hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar prueba</span>
          </div>
        </div>
      </div>
    </div>
  );
};
