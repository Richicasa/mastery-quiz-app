import React, { useState } from 'react';
import {
  PlusCircle,
  BookOpen,
  Layers,
  Flame,
  Sparkles,
  Trophy,
  Brain,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Quiz, UserProfile } from '../../shared/types.js';
import { QuizCard } from './QuizCard.js';
import { playClickSound } from '../utils/sound.js';

interface DashboardProps {
  userProfile: UserProfile | null;
  quizzes: Quiz[];
  onOpenCreate: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string, e: React.MouseEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  userProfile,
  quizzes,
  onOpenCreate,
  onSelectQuiz,
  onDeleteQuiz,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate user aggregate metrics for motivational display
  const totalQuestions = quizzes.reduce((acc, q) => acc + q.questions.length, 0);
  const bestOverallStreak = quizzes.reduce((acc, q) => Math.max(acc, q.stats.bestStreak), 0);
  const totalMastered = quizzes.filter((q) => q.stats.timesMastered > 0).length;

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.sourceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    playClickSound();
    onOpenCreate();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Personalized Welcome Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900/90 to-indigo-950/60 border border-white/10 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Espacio de Estudio de {userProfile?.username || 'Estudiante'}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
              Pruebas
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Desglosa cada párrafo hasta el límite con interrogación exhaustiva. Supera el bucle de maestría con <strong className="text-amber-400">5 rondas consecutivas al 100%</strong>.
            </p>
          </div>

          {/* Centered Hero Button: "+ Crear nueva prueba" */}
          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={handleCreateClick}
              className="quiz-button w-full md:w-auto group relative inline-flex items-center justify-center gap-3.5 px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base sm:text-lg shadow-xl shadow-purple-600/30 transition-all border border-purple-300/30"
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300 shadow-sm">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <span>Crear nueva prueba</span>
            </button>
          </div>
        </div>

        {/* Motivational Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-white/5">
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-600/40 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Mejor Racha
              </span>
              <span className="text-lg sm:text-xl font-black text-white">
                {bestOverallStreak} / 5 <span className="text-xs font-bold text-amber-400">vueltas</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-600/40 flex items-center justify-center text-purple-400 shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Preguntas Totales
              </span>
              <span className="text-lg sm:text-xl font-black text-white">
                {totalQuestions}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-600/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Capítulos
              </span>
              <span className="text-lg sm:text-xl font-black text-white">
                {quizzes.length}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                Masterizados
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                {totalMastered}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Grid Section (NotebookLM Style) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Tus Capítulos Guardados
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800/80 text-purple-300 border border-white/5">
              {filteredQuizzes.length}
            </span>
          </div>

          {/* Search bar */}
          {quizzes.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar capítulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              />
            </div>
          )}
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-20 px-6 bg-slate-900/40 backdrop-blur-sm border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="w-20 h-20 rounded-3xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center text-purple-400 mx-auto mb-5 shadow-xl shadow-purple-950/20">
              <Sparkles className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">
              ¡Aún no has generado ninguna prueba, {userProfile?.username || 'amigo'}!
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Haz clic en el botón <strong className="text-purple-300">"+ Crear nueva prueba"</strong> para subir un capítulo en PDF, Word o pegar el texto. Gemini interrogará cada párrafo sin dejar escapar ningún concepto.
            </p>
            <button
              onClick={handleCreateClick}
              className="quiz-button px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear mi primera prueba</span>
            </button>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No se encontraron capítulos que coincidan con "{searchQuery}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onSelect={(selected) => {
                  playClickSound();
                  onSelectQuiz(selected);
                }}
                onDelete={(id, e) => {
                  playClickSound();
                  onDeleteQuiz(id, e);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
