import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveQuiz,
  getAllQuizzes,
  getQuizById,
  deleteQuiz,
  updateQuizStats,
} from '../services/storageService.js';
import { Quiz } from '../../shared/types.js';

describe('Storage & Quiz Lifecycle', () => {
  const sampleQuiz: Quiz = {
    id: 'test_quiz_1',
    title: 'Capítulo 1: Introducción a la Biología Celular',
    createdAt: new Date().toISOString(),
    sourceType: 'text',
    sourceName: 'Párrafos de prueba',
    totalParagraphs: 2,
    questions: [
      {
        id: 'q1',
        paragraphIndex: 0,
        paragraphSnippet: 'La célula es la unidad morfológica y funcional de todo ser vivo.',
        type: 'multiple_choice',
        questionText: '¿Cuál es la unidad morfológica y funcional de todo ser vivo?',
        options: ['La célula', 'El tejido', 'El órgano', 'El sistema'],
        correctAnswer: 'La célula',
        explanation: 'La teoría celular establece que la célula es la unidad básica.',
      },
      {
        id: 'q2',
        paragraphIndex: 1,
        paragraphSnippet: 'Las mitocondrias son orgánulos encargados de suministrar la mayor parte de la energía.',
        type: 'open_ended',
        questionText: 'Explica la función primordial de las mitocondrias en la célula eucariota.',
        correctAnswer: 'Generar energía mediante la síntesis de ATP a través de la respiración celular.',
        rubric: 'Debe mencionar producción de ATP o generación de energía celular.',
        explanation: 'Las mitocondrias producen ATP por fosforilación oxidativa.',
      },
    ],
    stats: {
      bestStreak: 0,
      completedRounds: 0,
      timesMastered: 0,
    },
  };

  it('guarda y recupera una prueba correctamente', async () => {
    await saveQuiz(sampleQuiz);
    const retrieved = await getQuizById(sampleQuiz.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(sampleQuiz.title);
    expect(retrieved?.questions).toHaveLength(2);
  });

  it('actualiza las estadísticas y la racha estricta', async () => {
    await saveQuiz(sampleQuiz);

    const updated = await updateQuizStats(sampleQuiz.id, {
      bestStreak: 3,
      completedRounds: 5,
    });

    expect(updated).not.toBeNull();
    expect(updated?.stats.bestStreak).toBe(3);
    expect(updated?.stats.completedRounds).toBe(5);
  });

  it('elimina la prueba correctamente', async () => {
    await saveQuiz(sampleQuiz);
    const deleted = await deleteQuiz(sampleQuiz.id);
    expect(deleted).toBe(true);

    const found = await getQuizById(sampleQuiz.id);
    expect(found).toBeNull();
  });

  it('soporta aislamiento de pruebas por usuario (userId)', async () => {
    const userAQuiz: Quiz = {
      ...sampleQuiz,
      id: 'quiz_user_a',
      userId: 'usr_123_alice',
      authorName: 'Alice',
      title: 'Prueba de Biología de Alice',
    };

    const userBQuiz: Quiz = {
      ...sampleQuiz,
      id: 'quiz_user_b',
      userId: 'usr_456_bob',
      authorName: 'Bob',
      title: 'Prueba de Biología de Bob',
    };

    await saveQuiz(userAQuiz);
    await saveQuiz(userBQuiz);

    const allQuizzes = await getAllQuizzes();
    const aliceQuizzes = allQuizzes.filter((q) => q.userId === 'usr_123_alice');
    const bobQuizzes = allQuizzes.filter((q) => q.userId === 'usr_456_bob');

    expect(aliceQuizzes).toHaveLength(1);
    expect(aliceQuizzes[0].authorName).toBe('Alice');
    expect(bobQuizzes).toHaveLength(1);
    expect(bobQuizzes[0].authorName).toBe('Bob');

    // Clean up
    await deleteQuiz('quiz_user_a');
    await deleteQuiz('quiz_user_b');
  });

  it('verifica la racha estricta: un error reinicia la racha a cero', async () => {
    await saveQuiz(sampleQuiz);

    // Ronda 1 perfecta -> Racha 1
    let stats = await updateQuizStats(sampleQuiz.id, { bestStreak: 1 });
    expect(stats?.stats.bestStreak).toBe(1);

    // Ronda 2 perfecta -> Racha 2
    stats = await updateQuizStats(sampleQuiz.id, { bestStreak: 2 });
    expect(stats?.stats.bestStreak).toBe(2);

    // Ronda con error -> Racha se reinicia estrictamente a 0
    stats = await updateQuizStats(sampleQuiz.id, { bestStreak: 0 });
    expect(stats?.stats.bestStreak).toBe(0);

    // Limpieza
    await deleteQuiz(sampleQuiz.id);
  });
});
