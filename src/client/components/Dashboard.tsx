import React from 'react';
import { PlusCircle, BookOpen, Layers, Flame, Sparkles } from 'lucide-react';
import { Quiz } from '../../shared/types.js';
import { QuizCard } from './QuizCard.js';

interface DashboardProps {
  quizzes: Quiz[];
  onOpenCreate: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (id: string, e: React.MouseEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  quizzes,
  onOpenCreate,
  onSelectQuiz,
  onDeleteQuiz,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Método de Estudio Exhaustivo
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Pruebas
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto">
          Desglosa cada párrafo hasta el límite, interroga cada concepto y alcanza la maestría con 5 rondas consecutivas al 100%.
        </p>
      </div>

      {/* Prominent Center Hero Button: "Crear nueva prueba" */}
      <div className="flex justify-center mb-14">
        <button
          onClick={onOpenCreate}
          className="quiz-button group relative inline-flex items-center gap-4 px-8 py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-purple-600/30 transition-all duration-200 border border-purple-400/30"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span>Crear nueva prueba</span>
        </button>
      </div>

      {/* NotebookLM-style Interactive Cards Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Tus Capítulos Guardados
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {quizzes.length}
            </span>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No tienes pruebas creadas todavía</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              Haz clic en el botón superior <strong className="text-purple-300">"Crear nueva prueba"</strong> para subir un capítulo en PDF, Word o pegar tu texto y generar todas las preguntas posibles párrafo por párrafo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onSelect={onSelectQuiz}
                onDelete={onDeleteQuiz}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
