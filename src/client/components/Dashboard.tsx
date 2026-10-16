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
  Sparkle,
} from 'lucide-react';
import { Quiz, UserProfile } from '../../shared/types.js';
import { QuizCard } from './QuizCard.js';
import { DitherVeil } from './backgrounds/DitherVeil.js';
import { AeroShards } from './backgrounds/AeroShards.js';
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

  // Calculate metrics
  const totalQuestions = quizzes.reduce((acc, q) => acc + q.questions.length, 0);
  const bestOverallStreak = quizzes.reduce((acc, q) => Math.max(acc, q.stats.bestStreak), 0);
  const totalMastered = quizzes.filter((q) => q.stats.timesMastered > 0).length;

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.sourceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    playClickSound();
    onOpenCreate();
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] w-full overflow-hidden">
      {/* 1. Global Tools Background: AeroShards */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <AeroShards
          shardColor="#896ABD"
          accentColor="#A855F7"
          placement="full"
          material="glass"
          markers="plus"
          count={1300}
          depthOfField={0.75}
          vignette={0.3}
          mouseInteraction
          pulseOnClick
          holdToGather
          lightMode={false}
          shardSize={1}
          spread={1}
          twist={1}
          billow={1}
          speed={1}
          scale={1}
          glow={0.35}
          grain={0.06}
          intro
          mouseStrength={0.6}
          parallax={0.5}
          paused={false}
        />
      </div>

      {/* 2. Main Content Container */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* LEFT SIDE: DitherVeil Face (Occupies entire left side on desktop, responsive card on mobile) */}
          <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0 lg:sticky lg:top-24">
            <div className="w-full h-[320px] sm:h-[420px] lg:h-[calc(100vh-8.5rem)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group bg-[#120f17]">
              <DitherVeil
                src="https://images.unsplash.com/photo-1737071371043-761e02b1ef95?q=80&w=1400&auto=format&fit=crop"
                pattern="floyd"
                pixelSize={2}
                inkColor="#120f17"
                paperColor="#f4f1ea"
                revealRadius={200}
                softness={0.6}
                linger={1}
                fit="contain"
                rimColor="#a78bfa"
                palette="duotone"
                levels={2}
                contrast={1.15}
                brightness={0}
                rim={0}
                reverse={false}
                wander={false}
                clickBurst
              />

              {/* Aesthetic Overlay Label on Left Face Card */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                    Memoria Activa & Foco
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Desglosa cada párrafo al límite. Mueve el cursor sobre la imagen para revelar su textura tramada.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Tools, Hero, Stats & Quizzes Grid */}
          <div className="flex-1 min-w-0 w-full space-y-8">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Estudio de {userProfile?.username || 'Estudiante'}</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
                    Pruebas
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                    Extrae todas las preguntas posibles párrafo por párrafo. La prueba no terminará hasta lograr <strong className="text-amber-400">5 rondas consecutivas al 100%</strong>.
                  </p>
                </div>

                {/* Hero Button: "+ Crear nueva prueba" */}
                <div className="w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleCreateClick}
                    className="quiz-button w-full sm:w-auto group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-purple-600/30 transition-all border border-purple-400/30"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                      <PlusCircle className="w-5 h-5 text-white" />
                    </div>
                    <span>Crear nueva prueba</span>
                  </button>
                </div>
              </div>

              {/* Motivational Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/5">
                <div className="bg-slate-950/70 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-950/70 border border-amber-600/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Flame className="w-4 h-4 fill-current animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Mejor Racha
                    </span>
                    <span className="text-base sm:text-lg font-black text-white">
                      {bestOverallStreak} / 5 <span className="text-[10px] text-amber-400">vueltas</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-600/40 flex items-center justify-center text-purple-400 shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Preguntas
                    </span>
                    <span className="text-base sm:text-lg font-black text-white">
                      {totalQuestions}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/70 border border-indigo-600/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Capítulos
                    </span>
                    <span className="text-base sm:text-lg font-black text-white">
                      {quizzes.length}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-600/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Maestría 5/5
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-400">
                      {totalMastered}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Chapters Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Tus Capítulos Guardados
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800/80 text-purple-300 border border-white/5">
                  {filteredQuizzes.length}
                </span>
              </div>

              {/* Search Bar */}
              {quizzes.length > 0 && (
                <div className="relative w-full sm:w-64">
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

            {/* Chapters Grid */}
            {quizzes.length === 0 ? (
              <div className="text-center py-16 px-6 bg-slate-900/40 backdrop-blur-md border-2 border-dashed border-slate-800 rounded-3xl">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 mx-auto mb-4 shadow-lg shadow-purple-950/20">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No tienes pruebas creadas todavía, {userProfile?.username || 'amigo'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                  Haz clic en <strong className="text-purple-300">"+ Crear nueva prueba"</strong> para subir un capítulo en PDF, Word o pegar el texto.
                </p>
                <button
                  onClick={handleCreateClick}
                  className="quiz-button px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Crear mi primera prueba</span>
                </button>
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No se encontraron capítulos con el término "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
      </div>
    </div>
  );
};
