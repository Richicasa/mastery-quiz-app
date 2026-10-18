import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  User,
  ShieldCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  LogIn,
  UserPlus,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FluxLines } from './backgrounds/FluxLines.js';
import {
  validateApiKey,
  findRegisteredUser,
  saveRegisteredUser,
  setActiveSession,
  getRegisteredUsers,
  fetchServerUserByUsername,
} from '../api.js';
import { UserProfile } from '../../shared/types.js';
import { playCorrectSound, playIncorrectSound } from '../utils/sound.js';

interface AuthScreenProps {
  onAuthenticated: (profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [existingUser, setExistingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const users = getRegisteredUsers();
    setRegisteredUsers(users);
    if (users.length > 0) {
      // Pre-select most recent user
      handleSelectUser(users[0]);
    }
  }, []);

  const handleSelectUser = (u: UserProfile) => {
    setUsername(u.username);
    setExistingUser(u);
    setApiKey(u.apiKey || '');
    setPassword('');
    setErrorMessage('');
    setStatusMessage('');
  };

  const handleUsernameChange = async (val: string) => {
    setUsername(val);
    setErrorMessage('');
    setStatusMessage('');

    const localFound = findRegisteredUser(val);
    if (localFound) {
      setExistingUser(localFound);
      setApiKey(localFound.apiKey || '');
      return;
    }

    setExistingUser(null);
    setApiKey('');

    // Check server if not in local storage
    if (val.trim().length >= 2) {
      const serverFound = await fetchServerUserByUsername(val);
      if (serverFound) {
        setExistingUser(serverFound);
        setApiKey(serverFound.apiKey || '');
        saveRegisteredUser(serverFound);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    const cleanUsername = username.trim();
    const cleanKey = apiKey.trim();

    if (!cleanUsername) {
      setErrorMessage('Por favor ingresa tu nombre o apodo.');
      return;
    }

    // SCENARIO 1: Existing registered user
    if (existingUser) {
      // If user had a password configured and entered a mismatch
      if (existingUser.password && password && existingUser.password !== password.trim()) {
        playIncorrectSound();
        setErrorMessage('Contraseña incorrecta para este usuario.');
        return;
      }

      // If user updated their API key, re-validate it
      let finalKey = existingUser.apiKey;
      if (cleanKey && cleanKey !== existingUser.apiKey && !cleanKey.includes('•')) {
        try {
          setLoading(true);
          setStatusMessage('Validando nueva clave API con Google Gemini...');
          const val = await validateApiKey(cleanKey);
          if (!val.valid) {
            playIncorrectSound();
            setErrorMessage(val.error || 'La nueva clave API no es válida.');
            setLoading(false);
            return;
          }
          finalKey = cleanKey;
        } catch (err: any) {
          playIncorrectSound();
          setErrorMessage(err.message || 'Error validando la clave API.');
          setLoading(false);
          return;
        }
      }

      const updatedProfile: UserProfile = {
        ...existingUser,
        apiKey: finalKey,
      };

      saveRegisteredUser(updatedProfile);
      setActiveSession(updatedProfile);

      setLoading(true);
      playCorrectSound();
      setStatusMessage(`¡Sesión iniciada con éxito! Bienvenido, ${existingUser.username}.`);

      setTimeout(() => {
        onAuthenticated(updatedProfile);
      }, 700);
      return;
    }

    // SCENARIO 2: First-time user registration
    if (!cleanKey) {
      setErrorMessage(
        'Como es tu primera vez, ingresa tu clave API de Google Gemini para vincularla a tu cuenta.'
      );
      return;
    }

    try {
      setLoading(true);
      setStatusMessage('Validando tu clave con Google Gemini...');

      const val = await validateApiKey(cleanKey);
      if (!val.valid) {
        playIncorrectSound();
        setErrorMessage(
          val.error ||
            'La clave API no pudo ser validada por Google Gemini. Asegúrate de que esté activa en Google AI Studio.'
        );
        setLoading(false);
        return;
      }

      playCorrectSound();
      setStatusMessage(`¡Cuenta creada y conectada! Bienvenido, ${cleanUsername}.`);

      const newProfile: UserProfile = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: cleanUsername,
        apiKey: cleanKey,
        password: password.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      saveRegisteredUser(newProfile);
      setActiveSession(newProfile);

      setTimeout(() => {
        onAuthenticated(newProfile);
      }, 800);
    } catch (err: any) {
      playIncorrectSound();
      setErrorMessage(err.message || 'Error de conexión con Google Gemini.');
      setLoading(false);
    }
  };

  const maskedKeyDisplay = existingUser?.apiKey
    ? existingUser.apiKey.slice(0, 6) + '••••••••••••••••••••••••' + existingUser.apiKey.slice(-4)
    : '';

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#07090e] overflow-hidden">
      {/* FluxLines Background */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
        <FluxLines
          colors={['#ffffff', '#ffffff', '#ffffff']}
          glow={2}
          rimWidth={0.2}
          lineWidth={1}
          flowDirection="down"
          mouseInteraction
          clickSwirl
          speed={0.5}
          scale={1.6}
          turbulence={1}
          fluidity={0.1}
          sharpness={2.5}
          shimmer={1.5}
          mouseStrength={1}
          mouseRadius={0.35}
          intro
          lightMode={false}
        />
      </div>

      {/* Dark tint overlay for crystal-clear readability */}
      <div className="absolute inset-0 bg-slate-950/75 pointer-events-none z-[1]" />

      {/* Auth Card Container */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Header Badge */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-widest shadow-xl shadow-purple-950/50 mb-3 animate-bounce-short">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>MasteryQuiz • Acceso Seguro</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto">
            {existingUser
              ? `Bienvenido de vuelta, ${existingUser.username}. Presiona el botón para entrar a tus pruebas.`
              : `Ingresa tu nombre o apodo y tu clave API de Gemini para habilitar tu cuenta personal.`}
          </p>
        </div>

        {/* Remembered User Chips */}
        {registeredUsers.length > 0 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-center">
            <span className="text-[11px] text-slate-500 font-semibold shrink-0">Cuentas:</span>
            {registeredUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelectUser(u)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  username.toLowerCase() === u.username.toLowerCase()
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-2 ring-purple-400/50'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5'
                }`}
              >
                <User className="w-3 h-3" />
                <span>{u.username}</span>
              </button>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400" />

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input 1: Nombre o Apodo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Nombre o Apodo</span>
                </span>
                {existingUser && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Cuenta Recordada
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="Ej: Richi"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-medium"
              />
            </div>

            {/* Input 2: Clave API de Gemini */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Clave API de Gemini</span>
                </span>
                {existingUser && (
                  <span className="text-[10px] text-purple-400">Vinculada</span>
                )}
              </label>

              <input
                type="text"
                placeholder={existingUser ? maskedKeyDisplay : 'AIzaSy...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />

              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 underline font-semibold"
                >
                  <span>Obtener clave gratis en Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Optional Password toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>{showAdvanced ? 'Ocultar contraseña opcional' : 'Añadir contraseña (opcional)'}</span>
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showAdvanced && (
                <div className="mt-2 animate-fadeIn">
                  <input
                    type="password"
                    placeholder="Contraseña opcional para proteger tu cuenta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="quiz-button w-full py-4 rounded-xl text-base font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 transition duration-150 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : existingUser ? (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar Sesión como {username || 'Usuario'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Conectar y Entrar</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Guarantee notice */}
          <div className="mt-5 pt-4 border-t border-white/5 flex items-start gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Tu sesión e información se mantienen privadas y se ejecutan exclusivamente con tu clave personal.
            </span>
          </div>
        </div>

        <div className="text-center mt-5 text-xs text-slate-400 flex items-center justify-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          <span>Fondo interactivo con ondas fluidas de flujo continuo</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
