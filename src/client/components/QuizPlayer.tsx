import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  Loader2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Question, Quiz } from '../../shared/types.js';
import { evaluateOpenQuestion, updateQuizStats } from '../api.js';
import { VictoryModal } from './VictoryModal.js';
import {
  playCorrectSound,
  playIncorrectSound,
  playVictorySound,
  playClickSound,
} from '../utils/sound.js';

interface QuizPlayerProps {
  quiz: Quiz;
  onExit: () => void;
}

// Quizizz-style vibrant color palette for options
const OPTION_COLORS = [
  { bg: 'bg-[#e21b3c]', hover: 'hover:bg-[#c41432]', border: 'border-[#b0102b]', shape: '▲' }, // Red (Triangle)
  { bg: 'bg-[#1368ce]', hover: 'hover:bg-[#0f53a4]', border: 'border-[#0c4384]', shape: '◆' }, // Blue (Diamond)
  { bg: 'bg-[#d89e00]', hover: 'hover:bg-[#b08100]', border: 'border-[#916a00]', shape: '●' }, // Yellow (Circle)
  { bg: 'bg-[#26890c]', hover: 'hover:bg-[#1d6b09]', border: 'border-[#175407]', shape: '■' }, // Green (Square)
];

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onExit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [consecutivePerfectRounds, setConsecutivePerfectRounds] = useState(quiz.stats.bestStreak || 0);

  // Question interaction state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openAnswerInput, setOpenAnswerInput] = useState('');
  const [evaluatingOpenAnswer, setEvaluatingOpenAnswer] = useState(false);
  const [openAnswerEvaluation, setOpenAnswerEvaluation] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [showParagraphContext, setShowParagraphContext] = useState(false);

  // Victory celebration state
  const [showVictory, setShowVictory] = useState(false);
  const [roundNotification, setRoundNotification] = useState<string | null>(null);

  const currentQuestion: Question = quiz.questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // Reset interaction state on each question
  useEffect(() => {
    setSelectedOption(null);
    setOpenAnswerInput('');
    setEvaluatingOpenAnswer(false);
    setOpenAnswerEvaluation(null);
    setHasAnswered(false);
    setIsAnswerCorrect(null);
    setShowParagraphContext(false);
  }, [currentQuestionIndex, currentRound]);

  // Handle Multiple Choice or True/False Option Click
  const handleSelectOption = (option: string) => {
    if (hasAnswered) return;

    setSelectedOption(option);
    setHasAnswered(true);

    const isCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    setIsAnswerCorrect(isCorrect);

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
      setRoundMistakes((prev) => prev + 1);
    }
  };

  // Handle Open-Ended Answer Submission with AI Semantic Evaluation
  const handleEvaluateOpenAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnswered || !openAnswerInput.trim() || evaluatingOpenAnswer) return;

    try {
      setEvaluatingOpenAnswer(true);

      // If it's a fill_blank, perform direct comparison with tolerance, otherwise call AI
      if (currentQuestion.type === 'fill_blank') {
        const cleanUser = openAnswerInput.trim().toLowerCase();
        const cleanCorrect = currentQuestion.correctAnswer.trim().toLowerCase();
        const isCorrect = cleanUser === cleanCorrect || cleanCorrect.includes(cleanUser);

        setIsAnswerCorrect(isCorrect);
        setHasAnswered(true);
        setOpenAnswerEvaluation({
          isCorrect,
          feedback: isCorrect
            ? '¡Palabra clave exacta y correcta!'
            : 'El término introducido no coincide con el concepto clave del párrafo.',
        });

        if (isCorrect) {
          playCorrectSound();
        } else {
          playIncorrectSound();
          setRoundMistakes((prev) => prev + 1);
        }
      } else {
        // Open-ended: AI semantic grading
        const evaluation = await evaluateOpenQuestion(
          currentQuestion.questionText,
          currentQuestion.rubric || currentQuestion.correctAnswer,
          openAnswerInput
        );

        setIsAnswerCorrect(evaluation.isCorrect);
        setHasAnswered(true);
        setOpenAnswerEvaluation(evaluation);

        if (evaluation.isCorrect) {
          playCorrectSound();
        } else {
          playIncorrectSound();
          setRoundMistakes((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error evaluando la respuesta.');
    } finally {
      setEvaluatingOpenAnswer(false);
    }
  };

  // Next Question logic + Infinite Mastery Loop (5 Consecutive 100% Rounds)
  const handleNextQuestion = () => {
    playClickSound();
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Completed the entire chapter bank for this round!
      const totalMistakesThisRound = roundMistakes;

      if (totalMistakesThisRound === 0) {
        // 100% Perfect round!
        const newStreak = consecutivePerfectRounds + 1;
        setConsecutivePerfectRounds(newStreak);

        // Update stats on server
        updateQuizStats(quiz.id, {
          bestStreak: Math.max(quiz.stats.bestStreak, newStreak),
          completedRounds: quiz.stats.completedRounds + 1,
          timesMastered: newStreak >= 5 ? quiz.stats.timesMastered + 1 : quiz.stats.timesMastered,
        }).catch(console.error);

        if (newStreak >= 5) {
          // Final Victory Condition reached!
          playVictorySound();
          setShowVictory(true);
          return;
        }

        // Show brief motivating banner and loop automatically
        playCorrectSound();
        setRoundNotification(`¡Ronda ${currentRound} al 100%! 🔥 Racha estricta: ${newStreak}/5`);
      } else {
        // Had at least one mistake: Strict streak resets to 0!
        setConsecutivePerfectRounds(0);
        playIncorrectSound();
        updateQuizStats(quiz.id, {
          completedRounds: quiz.stats.completedRounds + 1,
        }).catch(console.error);

        setRoundNotification(
          `Vuelta finalizada con ${totalMistakesThisRound} ${
            totalMistakesThisRound === 1 ? 'error' : 'errores'
          }. Racha reiniciada a 0/5. ¡El bucle continúa!`
        );
      }

      // Hide notification after 3 seconds
      setTimeout(() => {
        setRoundNotification(null);
      }, 3500);

      // Loop back automatically without asking
      setCurrentRound((prev) => prev + 1);
      setCurrentQuestionIndex(0);
      setRoundMistakes(0);
    }
  };

  const restartQuiz = () => {
    setShowVictory(false);
    setCurrentQuestionIndex(0);
    setCurrentRound(1);
    setRoundMistakes(0);
    setConsecutivePerfectRounds(0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Victory Modal if 5/5 reached */}
      {showVictory && (
        <VictoryModal
          quizTitle={quiz.title}
          totalQuestions={quiz.questions.length}
          totalRoundsPlayed={currentRound}
          onRestart={restartQuiz}
          onExit={onExit}
        />
      )}

      {/* Top Header & Status Bar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div className="text-center">
            <h2 className="text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
              {quiz.title}
            </h2>
            <span className="text-xs font-semibold text-purple-400">
              Ronda {currentRound} • Pregunta {currentQuestionIndex + 1} de {quiz.questions.length}
            </span>
          </div>

          {/* Strict Streak Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/60 text-amber-300 text-xs sm:text-sm font-extrabold shadow-md">
            <Flame className="w-4 h-4 text-amber-400 fill-current animate-pulse" />
            <span>Racha: {consecutivePerfectRounds} / 5</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden mb-6 border border-slate-800">
          <div
            className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Notification Banner between rounds */}
        {roundNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-purple-950/90 border border-purple-500 text-purple-200 text-sm font-bold text-center animate-bounce-short shadow-xl">
            {roundNotification}
          </div>
        )}
      </div>

      {/* Main Question Arena */}
      <div className="flex-1 flex flex-col justify-center my-4">
        {/* Question Card */}
        <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
              {currentQuestion.type === 'multiple_choice' && 'Opción Múltiple'}
              {currentQuestion.type === 'true_false' && 'Verdadero o Falso'}
              {currentQuestion.type === 'fill_blank' && 'Completar Espacio'}
              {currentQuestion.type === 'open_ended' && 'Pregunta Abierta / Justificación'}
            </span>

            <button
              onClick={() => setShowParagraphContext(!showParagraphContext)}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>{showParagraphContext ? 'Ocultar Párrafo' : 'Ver Párrafo de Origen'}</span>
            </button>
          </div>

          {showParagraphContext && (
            <div className="mb-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed animate-fadeIn">
              <strong className="text-purple-400 block mb-1">
                Párrafo #{currentQuestion.paragraphIndex + 1}:
              </strong>
              "{currentQuestion.paragraphSnippet}"
            </div>
          )}

          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white text-center leading-snug sm:leading-tight">
            {currentQuestion.questionText}
          </h3>
        </div>

        {/* Multiple Choice & True/False Answer Grid (Quizizz Style) */}
        {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(currentQuestion.options || ['Verdadero', 'Falso']).map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              const isSelected = selectedOption === opt;
              const isCanonicalCorrect =
                opt.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

              // Quizizz Dual Color Rule:
              // If answered:
              // - Selected option:
              //   - if correct -> Green
              //   - if wrong -> RED
              // - In same moment, the canonical correct option turns GREEN!
              let dynamicStyle = `${color.bg} ${color.hover} ${color.border} text-white`;

              if (hasAnswered) {
                if (isSelected && isCanonicalCorrect) {
                  // Chosen & Correct -> Bright Green
                  dynamicStyle = 'bg-emerald-600 border-emerald-400 text-white ring-4 ring-emerald-400/50 shadow-emerald-500/50';
                } else if (isSelected && !isCanonicalCorrect) {
                  // Chosen & Incorrect -> Bright RED
                  dynamicStyle = 'bg-red-600 border-red-400 text-white ring-4 ring-red-400/50 animate-shake shadow-red-500/50';
                } else if (!isSelected && isCanonicalCorrect) {
                  // Not chosen but is the correct answer -> Bright GREEN reveal simultaneously!
                  dynamicStyle = 'bg-emerald-600 border-emerald-400 text-white ring-4 ring-emerald-400/50 shadow-emerald-500/50';
                } else {
                  // Other unselected wrong options fade
                  dynamicStyle = 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(opt)}
                  disabled={hasAnswered}
                  className={`quiz-button text-left p-5 sm:p-6 rounded-2xl font-extrabold text-base sm:text-lg border-2 flex items-center justify-between transition-all duration-150 ${dynamicStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-sm font-black shrink-0">
                      {color.shape}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {hasAnswered && (
                    <div>
                      {isCanonicalCorrect && <CheckCircle2 className="w-6 h-6 text-white shrink-0" />}
                      {isSelected && !isCanonicalCorrect && (
                        <XCircle className="w-6 h-6 text-white shrink-0" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Open-Ended & Fill-in-the-blank Form */}
        {(currentQuestion.type === 'open_ended' || currentQuestion.type === 'fill_blank') && (
          <div className="space-y-4">
            <form onSubmit={handleEvaluateOpenAnswer} className="space-y-4">
              <div
                className={`p-4 rounded-2xl border-2 transition ${
                  hasAnswered
                    ? isAnswerCorrect
                      ? 'bg-emerald-950/40 border-emerald-500 text-white'
                      : 'bg-red-950/40 border-red-500 text-white'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                {currentQuestion.type === 'open_ended' ? (
                  <textarea
                    rows={4}
                    placeholder="Escribe tu respuesta o justificación aquí..."
                    value={openAnswerInput}
                    onChange={(e) => setOpenAnswerInput(e.target.value)}
                    disabled={hasAnswered || evaluatingOpenAnswer}
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none text-base leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Escribe la palabra clave faltante..."
                    value={openAnswerInput}
                    onChange={(e) => setOpenAnswerInput(e.target.value)}
                    disabled={hasAnswered || evaluatingOpenAnswer}
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-lg font-bold"
                  />
                )}
              </div>

              {!hasAnswered && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!openAnswerInput.trim() || evaluatingOpenAnswer}
                    className="quiz-button px-6 py-3.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {evaluatingOpenAnswer ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Evaluando con IA...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Comprobar respuesta</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>

            {/* Semantic Feedback for Open-Ended Question */}
            {hasAnswered && openAnswerEvaluation && (
              <div
                className={`p-5 rounded-2xl border-2 animate-fadeIn ${
                  openAnswerEvaluation.isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                    : 'bg-red-950/70 border-red-500/80 text-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {openAnswerEvaluation.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-base mb-1">
                      {openAnswerEvaluation.isCorrect
                        ? '¡Respuesta conceptualmente correcta!'
                        : 'Respuesta incorrecta o incompleta'}
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {openAnswerEvaluation.feedback}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explanation and Next Question Control */}
        {hasAnswered && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 animate-fadeIn">
            <div className="text-xs text-slate-300 max-w-xl">
              <strong className="text-purple-400 block mb-0.5">Contexto del párrafo:</strong>
              {currentQuestion.explanation || 'Revisa el concepto clave para afianzar la memoria activa.'}
            </div>

            <button
              onClick={handleNextQuestion}
              className="quiz-button w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-base bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 shrink-0"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 pt-2">
        <span>Bucle de Maestría Infinito: La prueba solo terminará al completar 5 rondas consecutivas al 100%.</span>
      </div>
    </div>
  );
};
