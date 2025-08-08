import React, { useState, useEffect, useRef } from 'react';

// --- Helper Types ---

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

type ActiveTab = 'counter' | 'timer' | 'chat' | 'recipes' | 'horoscope';

type CookerType = 'pressure' | 'stovetop' | 'electric';

// Type for the structured recipe response
type RecipeResult = {
  recipe_name: string;
  description: string;
  steps: string[];
} | null;

type HoroscopeResult = {
  dishName: string;
  origin: string;
  dishAnalysis: string;
  personalityReading: string;
} | null;


// --- Main App Component ---
const App: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('counter');
  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);

  // Whistle Counter State
  const [whistleTarget, setWhistleTarget] = useState<number>(3);
  const [whistleCount, setWhistleCount] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Timer State
  const [timerInputMinutes, setTimerInputMinutes] = useState<string>('10');
  const [timerInputSeconds, setTimerInputSeconds] = useState<string>('00');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Chatbot State
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Njan Kunjuttan! What can I help you with today?" },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Recipes State - UPDATED to handle structured object
  const [cookerType, setCookerType] = useState<CookerType>('pressure');
  const [ingredientsInput, setIngredientsInput] = useState<string>('');
  const [recipeOutput, setRecipeOutput] = useState<RecipeResult>(null);
  const [recipeLoading, setRecipeLoading] = useState<boolean>(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  // Horoscope State
  const [horoscopeName, setHoroscopeName] = useState<string>('');
  const [horoscopeResult, setHoroscopeResult] = useState<HoroscopeResult>(null);
  const [horoscopeLoading, setHoroscopeLoading] = useState<boolean>(false);
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null);

  // --- Refs ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastWhistleTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);


  // --- Effects ---
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            playAlarm();
            setIsTimerRunning(false);
            if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, timeRemaining]);


  // --- Core Functions ---
  const playAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current.play().catch(err => console.warn('Alarm play error', err));
    }
  };
  const stopAlarm = () => {
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }
  };

  const drawFrequency = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const barWidth = 3;
    const barSpacing = 2;
    const numBars = Math.floor(width / (barWidth + barSpacing));
    const step = Math.floor(bufferLength / numBars);
    const barColor = isLightTheme ? '#0062ff' : '#4f8eff';
    ctx.fillStyle = barColor;
    for (let i = 0; i < numBars; i++) {
        const v = dataArray[i * step] / 255.0;
        const barHeight = v * height;
        const x = i * (barWidth + barSpacing);
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    }
  };

  const detectWhistle = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    const WHISTLE_FREQ_MIN = 5000;
    const WHISTLE_FREQ_MAX = 10000;
    const WHISTLE_THRESHOLD = 180;
    const DEBOUNCE_TIME = 1500;
    const binToFreq = (bin: number) => (bin * audioContextRef.current!.sampleRate) / analyser.fftSize;
    let peakValue = 0;
    for (let i = 0; i < bufferLength; i++) {
      const freq = binToFreq(i);
      if (freq >= WHISTLE_FREQ_MIN && freq <= WHISTLE_FREQ_MAX && dataArray[i] > peakValue) {
        peakValue = dataArray[i];
      }
    }
    drawFrequency();
    if (peakValue > WHISTLE_THRESHOLD && Date.now() - lastWhistleTimeRef.current > DEBOUNCE_TIME) {
      lastWhistleTimeRef.current = Date.now();
      setWhistleCount(prev => {
        const newCount = prev + 1;
        if (newCount >= whistleTarget) {
          playAlarm();
          stopListening();
        }
        return newCount;
      });
    }
    animationFrameRef.current = requestAnimationFrame(detectWhistle);
  };

  const startListening = async () => {
    if (isListening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);
      setWhistleCount(0);
      setIsListening(true);
      lastWhistleTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(detectWhistle);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access the microphone. Please check your browser permissions.');
    }
  };

  const stopListening = () => {
    if (!isListening) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setIsListening(false);
    stopAlarm();
  };

  const handleStartTimer = () => {
    const totalSeconds = (parseInt(timerInputMinutes, 10) || 0) * 60 + (parseInt(timerInputSeconds, 10) || 0);
    if (totalSeconds > 0) {
      setTimeRemaining(totalSeconds);
      setIsTimerRunning(true);
    }
  };
  const handlePauseTimer = () => setIsTimerRunning(false);
  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);
    setTimerInputMinutes('10');
    setTimerInputSeconds('00');
    stopAlarm();
  };
  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    const newUserMessage: Message = { sender: 'user', text: chatInput };
    setMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsLoading(true);
    setTimeout(() => {
      const aiMessage: Message = { sender: 'ai', text: `You asked: "${newUserMessage.text}". For real recipes, please use the Recipes tab.` };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 700);
  };

  // UPDATED to handle structured JSON recipe
  const requestRecipeFromAI = async () => {
    setRecipeOutput(null);
    setRecipeError(null);
    setRecipeLoading(true);
    try {
      const resp = await fetch('http://localhost:3001/api/ai-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cooker: cookerType, ingredients: ingredientsInput.trim() }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${resp.status}`);
      }
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setRecipeOutput(data);
    } catch (err: unknown) {
      console.error('AI recipe error:', err);
      if (err instanceof Error) {
        setRecipeError(err.message);
      } else {
        setRecipeError('An unknown error occurred.');
      }
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleGetHoroscope = async () => {
    if (!horoscopeName.trim()) return;
    setHoroscopeLoading(true);
    setHoroscopeResult(null);
    setHoroscopeError(null);
    try {
      const resp = await fetch('http://localhost:3001/api/dish-horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: horoscopeName }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${resp.status}`);
      }
      const data = await resp.json();
      if(data.error) throw new Error(data.error);
      setHoroscopeResult(data);
    } catch (err: unknown) {
      console.error('Horoscope error:', err);
      if (err instanceof Error) {
        setHoroscopeError(err.message);
      } else {
        setHoroscopeError('An unknown error occurred. Please try again.');
      }
    } finally {
      setHoroscopeLoading(false);
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    switch (activeTab) {
      case 'counter':
        return (
          <div className="feature-content">
            <h2>Whistle Counter</h2>
            <p className="subtitle">I'll listen for pressure cooker whistles.</p>
            <div className="counter-display">
              <span className="current-count">{whistleCount}</span>
              <span className="target-count">/ {whistleTarget}</span>
            </div>
            <div style={{ width: '100%', maxWidth: 320, height: 80 }}>
              <canvas ref={canvasRef} width="320" height="80" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="input-group">
              <label htmlFor="whistle-target" style={{ flexShrink: 0 }}>Target:</label>
              <input id="whistle-target" type="number" min={1} value={whistleTarget} onChange={e => setWhistleTarget(parseInt(e.target.value || '1', 10))} disabled={isListening} className="c-input" />
            </div>
            <button onClick={isListening ? stopListening : startListening} className="c-button primary" style={{ width: '100%', maxWidth: 320 }}>
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
          </div>
        );
      case 'timer':
        return (
          <div className="feature-content">
            <h2>Cooking Timer</h2>
            <p className="subtitle">Set a time and I'll alert you.</p>
            <div className="timer-display">{formatTime(timeRemaining)}</div>
            <div className="input-group timer-inputs" style={{ justifyContent: 'center' }}>
              <input type="number" min="0" max="59" value={timerInputMinutes} onChange={e => setTimerInputMinutes(e.target.value)} disabled={isTimerRunning || timeRemaining > 0} className="c-input" style={{ textAlign: 'center' }}/>
              <span>:</span>
              <input type="number" min="0" max="59" value={timerInputSeconds} onChange={e => setTimerInputSeconds(e.target.value)} disabled={isTimerRunning || timeRemaining > 0} className="c-input" style={{ textAlign: 'center' }}/>
            </div>
            <div className="button-group">
              <button onClick={handleStartTimer} disabled={isTimerRunning || timeRemaining > 0} className="c-button primary">Start</button>
              <button onClick={handlePauseTimer} disabled={!isTimerRunning} className="c-button secondary">Pause</button>
              <button onClick={handleResetTimer} className="c-button secondary">Reset</button>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="feature-content chat-container">
            <div className="chat-header"><h2>Chat with Kunjuttan</h2></div>
            <div className="chat-body" ref={chatBodyRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.sender}`}><p>{msg.text}</p></div>
              ))}
              {isLoading && <div className="chat-message ai"><p>...</p></div>}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask me anything..." className="c-input" disabled={isLoading} />
              <button type="submit" className="c-button primary" disabled={isLoading}>Send</button>
            </form>
          </div>
        );
      case 'recipes':
        return (
          <div className="feature-content">
            <h2>AI Recipe Helper</h2>
            <p className="subtitle">Tell me what you have, I'll suggest a recipe.</p>
            <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label>Cooker Type</label>
                <select value={cookerType} onChange={e => setCookerType(e.target.value as CookerType)} className="c-input">
                  <option value="pressure">Pressure Cooker</option>
                  <option value="stovetop">Stovetop</option>
                  <option value="electric">Electric Cooker</option>
                </select>
              </div>
              <div>
                <label>Ingredients (comma separated)</label>
                <input value={ingredientsInput} onChange={e => setIngredientsInput(e.target.value)} className="c-input" placeholder="e.g., potato, onion, tomato" />
              </div>
              <button onClick={requestRecipeFromAI} disabled={recipeLoading} className="c-button primary">
                {recipeLoading ? 'Thinking...' : 'Get AI Recipe'}
              </button>
              {recipeLoading && <p>Generating your recipe...</p>}
              {recipeError && !recipeLoading && (
                <div style={{ color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '10px', borderRadius: 8 }}>
                    <strong>Oops!</strong> {recipeError}
                </div>
              )}
              {recipeOutput && !recipeLoading && (
                <div style={{ textAlign: 'left', background: isLightTheme ? '#fff' : '#2c3035', padding: '16px', borderRadius: 12, border: `1px solid ${isLightTheme ? '#dde3ea' : '#3a4046'}` }}>
                  <h3 style={{ marginTop: 0, fontSize: 18 }}>{recipeOutput.recipe_name}</h3>
                  <p style={{ fontStyle: 'italic', color: isLightTheme ? '#5f6b7a' : '#a0a7b0' }}>{recipeOutput.description}</p>
                  <h4 style={{ marginBottom: '8px' }}>Steps:</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {recipeOutput.steps.map((step, i) => <li key={i} style={{ marginBottom: '8px' }}>{step}</li>)}
                  </ol>
                </div>
              )}
            </div>
          </div>
        );
      case 'horoscope':
        return (
          <div className="feature-content">
            <h2>Personality Dish Horoscope</h2>
            <p className="subtitle">Discover your inner dish!</p>
            <div className="input-group" style={{ maxWidth: 340 }}>
              <input
                type="text"
                value={horoscopeName}
                onChange={(e) => setHoroscopeName(e.target.value)}
                placeholder="Enter a name..."
                className="c-input"
                disabled={horoscopeLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleGetHoroscope()}
              />
              <button onClick={handleGetHoroscope} className="c-button primary" disabled={horoscopeLoading}>
                {horoscopeLoading ? '...' : 'Reveal'}
              </button>
            </div>
            {horoscopeLoading && <p>Finding your soul dish...</p>}
            {horoscopeError && !horoscopeLoading && (
                <div style={{ marginTop: 20, color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.1)', padding: '10px', borderRadius: 8, width: '100%', maxWidth: 340 }}>
                    <strong>Oops!</strong> {horoscopeError}
                </div>
            )}
            {horoscopeResult && !horoscopeLoading && (
              <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, background: isLightTheme ? '#fff' : '#2c3035', border: `1px solid ${isLightTheme ? '#dde3ea' : '#3a4046'}`, textAlign: 'left', width: '100%', maxWidth: 340, animation: 'fadeIn 0.5s ease-in-out' }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: isLightTheme ? 'var(--primary-light)' : 'var(--primary-dark)' }}>
                  {horoscopeResult.dishName}
                </h3>
                <p style={{ fontSize: 14, color: isLightTheme ? 'var(--text-secondary-light)' : 'var(--text-secondary-dark)', margin: '0 0 16px 0', fontStyle: 'italic' }}>
                  ({horoscopeResult.origin})
                </p>
                <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
                  <strong>Dish Analysis:</strong> {horoscopeResult.dishAnalysis}
                </p>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  <strong>Personality Reading:</strong> {horoscopeResult.personalityReading}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={isLightTheme ? 'light' : ''}>
      <audio ref={alarmAudioRef} src="/alarm.mp3" preload="auto" />
      <div className="main-container">
        <header className="app-header">
          <h1>Cook'n'Count</h1>
          <button onClick={() => setIsLightTheme(prev => !prev)} className="c-button secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
            {isLightTheme ? 'Dark' : 'Light'} UI
          </button>
        </header>
        <nav className="app-nav">
          <button className={`nav-button ${activeTab === 'counter' ? 'active' : ''}`} onClick={() => setActiveTab('counter')}>Counter</button>
          <button className={`nav-button ${activeTab === 'timer' ? 'active' : ''}`} onClick={() => setActiveTab('timer')}>Timer</button>
          <button className={`nav-button ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => setActiveTab('recipes')}>Recipes</button>
          <button className={`nav-button ${activeTab === 'horoscope' ? 'active' : ''}`} onClick={() => setActiveTab('horoscope')}>Horoscope</button>
          <button className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
        </nav>
        <main className="app-content">{renderContent()}</main>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;