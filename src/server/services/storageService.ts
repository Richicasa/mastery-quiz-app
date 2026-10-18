import fs from 'fs/promises';
import path from 'path';
import { Quiz, QuizStats, UserProfile } from '../../shared/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'quizzes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as UserProfile[];
  } catch {
    return [];
  }
}

export async function findUserByUsername(username: string): Promise<UserProfile | null> {
  const users = await getAllUsers();
  const clean = username.trim().toLowerCase();
  return users.find((u) => u.username.trim().toLowerCase() === clean) || null;
}

export async function saveUser(profile: UserProfile): Promise<UserProfile> {
  await ensureDataFile();
  const users = await getAllUsers();
  const clean = profile.username.trim().toLowerCase();
  const index = users.findIndex((u) => u.username.trim().toLowerCase() === clean);

  if (index >= 0) {
    users[index] = { ...users[index], ...profile };
  } else {
    users.unshift(profile);
  }

  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  return profile;
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
