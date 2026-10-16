import React from 'react';
import { BookOpen, FileText, Play, Trash2, Flame, Award, Calendar, User } from 'lucide-react';
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
  });

  const isMastered = quiz.stats.timesMastered > 0;

  return (
    <div
      onClick={() => onSelect(quiz)}
      className="notebook-card bg-slate-900/80 backdrop-blur-md border border-white/10 hover:border-purple-500/50 rounded-3xl p-6 cursor-pointer group flex flex-col justify-between transition-all duration-200 relative overflow-hidden shadow-lg shadow-black/20 hover:shadow-purple-950/30"
    >
      {/* Top ambient highlight on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/70 border border-purple-700/50 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200 shadow-md">
            {quiz.sourceType === 'document' ? (
              <FileText className="w-6 h-6" />
            ) : (
              <BookOpen className="w-6 h-6" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isMastered && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-600/60 text-emerald-300">
                <Award className="w-3.5 h-3.5" />
                Maestría 5/5
              </span>
            )}
            <button
              onClick={(e) => onDelete(quiz.id, e)}
              className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-slate-800 transition"
              title="Eliminar prueba"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-2 leading-snug">
          {quiz.title}
        </h3>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4">
          <span className="truncate max-w-[140px] font-medium">{quiz.sourceName}</span>
          <span>•</span>
          <span className="flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3 text-slate-500" />
            {formattedDate}
          </span>
          {quiz.authorName && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-purple-400 font-semibold truncate max-w-[100px]">
                <User className="w-3 h-3 text-purple-400" />
                {quiz.authorName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="bg-slate-950/70 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">
              Preguntas
            </span>
            <span className="text-base font-black text-purple-300">
              {quiz.questions.length} <span className="text-xs font-semibold text-slate-400">ítems</span>
            </span>
          </div>
          <div className="bg-slate-950/70 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-slate-400 block mb-0.5 font-bold uppercase tracking-wider">
              Párrafos
            </span>
            <span className="text-base font-black text-indigo-300">
              {quiz.totalParagraphs} <span className="text-xs font-semibold text-slate-400">analizados</span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400 bg-amber-950/50 border border-amber-600/40 px-3 py-1.5 rounded-xl">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse fill-current" />
            <span>Racha: {quiz.stats.bestStreak} / 5</span>
          </div>

          <div className="quiz-button inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-purple-600 group-hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
