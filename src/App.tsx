// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';

// FIX 1: Add a global declaration for the prefixed AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

// --- Helper Types ---
type Message = {
  sender: 'user' | 'ai';
  text: string;
};

type ActiveTab = 'counter' | 'timer' | 'chat' | 'recipes';

// FIX 2: Create a specific type for cooker options
type CookerType = 'pressure' | 'stovetop' | 'electric';

// --- Main App Component ---
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('counter');

  // --- Theme ---
  const [isLightTheme, setIsLightTheme] = useState<boolean>(false);

  // --- Whistle Counter State & Logic ---
  const [whistleTarget, setWhistleTarget] = useState<number>(3);
  const [whistleCount, setWhistleCount] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastWhistleTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- Timer State & Logic ---
  const [timerInputMinutes, setTimerInputMinutes] = useState<string>('10');
  const [timerInputSeconds, setTimerInputSeconds] = useState<string>('00');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);

  // --- Chatbot State & Logic ---
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Njan Kunjuttan! Endha sahayam vende? Ask me for recipes or whistle counts!" },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  // --- Audio Alarm ---
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Recipes State ---
  const [cookerType, setCookerType] = useState<CookerType>('pressure'); // Use the new type
  const [ingredientsInput, setIngredientsInput] = useState<string>('');
  const [recipeOutput, setRecipeOutput] = useState<string>('');
  const [recipeLoading, setRecipeLoading] = useState<boolean>(false);

  // --- Scroll chat to bottom on new message ---
  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // --- Audio Visualization & Whistle Detection ---
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

    const barWidth = width / bufferLength;
    let x = 0;
    
    // Modern UI uses a different color
    const barColor = isLightTheme ? '#0062ff' : '#4f8eff';

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255.0;
        const barHeight = v * height;
        ctx.fillStyle = barColor;
        // Rounded bars for a softer look
        ctx.fillRect(x, height - barHeight, barWidth, barHeight); 
        x += barWidth + 2; // Add spacing between bars
    }
  };


  const detectWhistle = () => {
    if (!analyserRef.current || !audioContextRef.current) return;
    const analyser = analyserRef.current;
    const audioCtx = audioContextRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = audioCtx.sampleRate;
    const fftSize = analyser.fftSize;
    const WHISTLE_FREQ_MIN = 5000;
    const WHISTLE_FREQ_MAX = 16000;
    const WHISTLE_THRESHOLD = 180;
    const DEBOUNCE_TIME = 1200;

    const binToFreq = (bin: number) => (bin * sampleRate) / fftSize;
    let peakValue = 0;
    for (let i = 0; i < bufferLength; i++) {
      const freq = binToFreq(i);
      if (freq < WHISTLE_FREQ_MIN) continue;
      if (freq > WHISTLE_FREQ_MAX) break;
      if (dataArray[i] > peakValue) {
        peakValue = dataArray[i];
      }
    }

    drawFrequency();

    if (peakValue > WHISTLE_THRESHOLD) {
      const now = Date.now();
      if (now - lastWhistleTimeRef.current > DEBOUNCE_TIME) {
        lastWhistleTimeRef.current = now;
        setWhistleCount(prev => {
          const newCount = prev + 1;
          if (newCount >= whistleTarget) {
            playAlarm();
            stopListening();
          }
          return newCount;
        });
      }
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
      (mediaStreamSourceRef.current.mediaStream as MediaStream).getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    mediaStreamSourceRef.current = null;
    animationFrameRef.current = null;
    setIsListening(false);
  };

  // --- Timer Functions ---
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            playAlarm();
            setIsTimerRunning(false);
            if (timerIntervalRef.current) {
              window.clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, timeRemaining]);

  const handleStartTimer = () => {
    const minutes = parseInt(timerInputMinutes, 10) || 0;
    const seconds = parseInt(timerInputSeconds, 10) || 0;
    const totalSeconds = minutes * 60 + seconds;
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
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // --- Chatbot Functions ---
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

  // --- Play Alarm ---
  const playAlarm = () => {
    if (alarmAudioRef.current) {
      try {
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current.play();
      } catch (err) {
        console.warn('Alarm play error', err);
      }
    }
  };

  // --- Recipe generation (calls backend) ---
  const requestRecipeFromAI = async () => {
    setRecipeOutput('');
    setRecipeLoading(true);
    try {
      const resp = await fetch('http://localhost:3001/api/ai-recipe', { // Assuming local dev server
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cooker: cookerType,
          ingredients: ingredientsInput.trim(),
        }),
      });

      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const data = await resp.json();
      if (data.recipe) {
        setRecipeOutput(data.recipe);
      } else {
        throw new Error('Bad response from server');
      }
    } catch (err) {
      console.error('AI recipe error:', err);
      setRecipeOutput(fallbackRecipe(cookerType, ingredientsInput));
    } finally {
      setRecipeLoading(false);
    }
  };

  const fallbackRecipe = (cooker: string, ingredients: string) => {
    const base = ingredients ? `Using: ${ingredients}. ` : '';
    if (cooker === 'pressure') {
      return `${base}Pressure-cooker Aloo Curry — Wash and cube potatoes. Saute mustard seeds, curry leaves, onions, ginger-garlic paste. Add potatoes, water (1 cup), salt, turmeric. Close lid and cook for 2 whistles on medium heat. Let pressure release, open and simmer 2–3 min with garam masala. Garnish and serve.`;
    }
    if (cooker === 'electric') {
      return `${base}Electric cooker Vegetable Stew — Add chopped veg, 1 cup water, salt, spices. Set 'Cook' mode for 15–20 minutes. Stir and serve.`;
    }
    return `${base}Stovetop Stir-fry — Heat oil, add spices and veg, stir-fry 7–10 minutes. Finish with lemon or garam masala.`;
  };

  // --- Render Functions ---
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
              <input type="number" min="0" max="59" value={timerInputMinutes} onChange={e => setTimerInputMinutes(String(e.target.value).padStart(2, '0'))} disabled={isTimerRunning || timeRemaining > 0} className="c-input" style={{ textAlign: 'center' }}/>
              <span>:</span>
              <input type="number" min="0" max="59" value={timerInputSeconds} onChange={e => setTimerInputSeconds(String(e.target.value).padStart(2, '0'))} disabled={isTimerRunning || timeRemaining > 0} className="c-input" style={{ textAlign: 'center' }}/>
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
                <div key={i} className={`chat-message ${msg.sender}`}>
                  <p>{msg.text}</p>
                </div>
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
              <div className="button-group">
                <button onClick={requestRecipeFromAI} disabled={recipeLoading} className="c-button primary">
                  {recipeLoading ? 'Thinking...' : 'Get AI Recipe'}
                </button>
                <button onClick={() => setRecipeOutput(fallbackRecipe(cookerType, ingredientsInput))} className="c-button secondary">Quick Recipe</button>
              </div>
              <div style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                {recipeOutput && (
                  <>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recipe Suggestion:</h3>
                    <div style={{ background: isLightTheme ? '#fff' : '#2c3035', padding: 12, borderRadius: 8, border: `1px solid ${isLightTheme ? '#dde3ea' : '#3a4046'}` }}>
                      {recipeOutput}
                    </div>
                  </>
                )}
              </div>
            </div>
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
          <button className={`nav-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
          <button className={`nav-button ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => setActiveTab('recipes')}>Recipes</button>
        </nav>
        <main className="app-content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default App;