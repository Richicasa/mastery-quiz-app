export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'open_ended';

export interface Question {
  id: string;
  paragraphIndex: number;
  paragraphSnippet: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // 4 options for multiple_choice, 2 for true_false
  correctAnswer: string; // The canonical answer or option string
  rubric?: string; // Key criteria / concepts needed for open_ended questions
  explanation: string; // Contextual justification
}

export interface QuizStats {
  bestStreak: number;
  completedRounds: number;
  timesMastered: number;
  lastPlayedAt?: string;
}

export interface Quiz {
  id: string;
  userId?: string;
  authorName?: string;
  title: string;
  createdAt: string;
  sourceType: 'document' | 'text';
  sourceName: string;
  totalParagraphs: number;
  questions: Question[];
  stats: QuizStats;
}

export interface UserProfile {
  id: string;
  username: string;
  apiKey: string;
  createdAt: string;
}

export interface ExtractionResult {
  paragraphs: string[];
  totalParagraphs: number;
  detectedTitle?: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
}
