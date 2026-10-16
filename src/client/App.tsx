import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Dashboard } from './components/Dashboard.js';
import { CreateQuizModal } from './components/CreateQuizModal.js';
import { ApiKeyModal } from './components/ApiKeyModal.js';
import { QuizPlayer } from './components/QuizPlayer.js';
import { fetchAllQuizzes, deleteQuizById, getStoredApiKey } from './api.js';
import { Quiz } from '../shared/types.js';

export const App: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const checkApiKey = () => {
    setHasApiKey(Boolean(getStoredApiKey()));
  };

  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const data = await fetchAllQuizzes();
      setQuizzes(data);
    } catch (err) {
      console.error('Error cargando pruebas:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    checkApiKey();
    loadQuizzes();
  }, []);

  const handleQuizCreated = (newQuiz: Quiz) => {
    setQuizzes((prev) => [newQuiz, ...prev]);
    setIsCreateModalOpen(false);
    // Enter directly into the newly created quiz
    setActiveQuiz(newQuiz);
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar esta prueba?')) return;

    try {
      await deleteQuizById(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (activeQuiz?.id === id) {
        setActiveQuiz(null);
      }
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la prueba');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        hasApiKey={hasApiKey}
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
        onGoHome={() => setActiveQuiz(null)}
      />

      <main className="flex-1">
        {activeQuiz ? (
          <QuizPlayer
            quiz={activeQuiz}
            onExit={() => {
              setActiveQuiz(null);
              loadQuizzes();
            }}
          />
        ) : (
          <Dashboard
            quizzes={quizzes}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onSelectQuiz={(quiz) => setActiveQuiz(quiz)}
            onDeleteQuiz={handleDeleteQuiz}
          />
        )}
      </main>

      {/* Modals */}
      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onQuizCreated={handleQuizCreated}
        onOpenApiKeySettings={() => {
          setIsCreateModalOpen(false);
          setIsApiKeyModalOpen(true);
        }}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={checkApiKey}
      />
    </div>
  );
};

export default App;
