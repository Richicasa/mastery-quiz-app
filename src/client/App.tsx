import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { Dashboard } from './components/Dashboard.js';
import { CreateQuizModal } from './components/CreateQuizModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { OnboardingGate } from './components/OnboardingGate.js';
import { QuizPlayer } from './components/QuizPlayer.js';
import { fetchAllQuizzes, deleteQuizById, getUserProfile, clearUserProfile } from './api.js';
import { Quiz, UserProfile } from '../shared/types.js';

export const App: React.FC = () => {
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Initialize and check user profile on mount
  useEffect(() => {
    const profile = getUserProfile();
    setUserProfileState(profile);
    if (profile) {
      loadQuizzes();
    }
  }, []);

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

  const handleProfileUnlocked = (profile: UserProfile) => {
    setUserProfileState(profile);
    loadQuizzes();
  };

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión y cambiar de perfil?')) {
      clearUserProfile();
      setUserProfileState(null);
      setActiveQuiz(null);
      setQuizzes([]);
    }
  };

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

  // If user has not configured their name and API key, BLOCK everything and show the Onboarding Gate!
  if (!userProfile) {
    return <OnboardingGate onUnlocked={handleProfileUnlocked} />;
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      <Navbar
        userProfile={userProfile}
        onOpenSettings={() => setIsProfileModalOpen(true)}
        onGoHome={() => setActiveQuiz(null)}
        onLogout={handleLogout}
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
            userProfile={userProfile}
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
          setIsProfileModalOpen(true);
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        userProfile={userProfile}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updated) => {
          setUserProfileState(updated);
          loadQuizzes();
        }}
      />
    </div>
  );
};

export default App;
