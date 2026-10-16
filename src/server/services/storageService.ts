import fs from 'fs/promises';
import path from 'path';
import { Quiz, QuizStats } from '../../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'quizzes.json');

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function getAllQuizzes(): Promise<Quiz[]> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Quiz[];
  } catch {
    return [];
  }
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const quizzes = await getAllQuizzes();
  return quizzes.find((q) => q.id === id) || null;
}

export async function saveQuiz(quiz: Quiz): Promise<Quiz> {
  await ensureDataFile();
  const quizzes = await getAllQuizzes();
  const index = quizzes.findIndex((q) => q.id === quiz.id);

  if (index >= 0) {
    quizzes[index] = quiz;
  } else {
    quizzes.unshift(quiz);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(quizzes, null, 2), 'utf-8');
  return quiz;
}

export async function deleteQuiz(id: string): Promise<boolean> {
  await ensureDataFile();
  const quizzes = await getAllQuizzes();
  const filtered = quizzes.filter((q) => q.id !== id);

  if (filtered.length !== quizzes.length) {
    await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
  return false;
}

export async function updateQuizStats(
  id: string,
  statsUpdate: Partial<QuizStats>
): Promise<Quiz | null> {
  const quiz = await getQuizById(id);
  if (!quiz) return null;

  quiz.stats = {
    ...quiz.stats,
    ...statsUpdate,
    lastPlayedAt: new Date().toISOString(),
  };

  return await saveQuiz(quiz);
}
