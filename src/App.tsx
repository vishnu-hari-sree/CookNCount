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

type ActiveTab = 'counter' | 'timer' | 'chat' | 'recipes' | 'horoscope' | 'music';

type CookerType = 'pressure' | 'stovetop' | 'electric';

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

// --- Music Feature Types and Data ---
type Song = {
  title: string;
  artist: string;
  src: string;      // Path to audio file in /public/music/
  artwork: string;  // Path to artwork image in /public/art/
};
type MusicCategory = 'melody' | 'rock' | 'normal';

// IMPORTANT: Replace these with your actual file names
const playlists: Record<MusicCategory, Song[]> = {
  melody: [
    { title: "Sahiba", artist: "Aditya Rikhari", src: "/music/melody1.mp3", artwork: "/art/melody1.png" },
    { title: "Jhol", artist: "Annural Khalid", src: "/music/melody2.mp3", artwork: "/art/melody2.png" },
    { title: "Mudal Nee", artist: "Sid Sriram", src: "/music/melody3.mp3", artwork: "/art/melody3.png" },
  ],
  rock: [
    { title: "Badtameez Dil", artist: "Benny Dayal", src: "/music/rock1.mp3", artwork: "/art/rock1.png" },
    { title: "Don Don Don", artist: "Anirudh", src: "/music/rock2.mp3", artwork: "/art/rock2.png" },
  ],
  normal: [
    { title: "City Vibes", artist: "Urban Flow", src: "/music/normal1.mp3", artwork: "/art/normal1.png" },
    { title: "Morning Coffee", artist: "The Casuals", src: "/music/normal2.mp3", artwork: "/art/normal2.png" },
  ],
};


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

  // Recipes State
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

  // Music Player State
  const [musicCategory, setMusicCategory] = useState<MusicCategory | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

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
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);


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

  // Music Player Effects
  useEffect(() => {
    if (isPlaying) {
      musicAudioRef.current?.play().catch(e => console.error("Audio play failed", e));
    } else {
      musicAudioRef.current?.pause();
    }
  }, [isPlaying, currentTrackIndex]); // Re-run when track changes

  useEffect(() => {
    if(musicAudioRef.current) musicAudioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (audio) {
      const setAudioData = () => setDuration(audio.duration);
      const setAudioTime = () => setCurrentTime(audio.currentTime);

      audio.addEventListener("loadedmetadata", setAudioData);
      audio.addEventListener("timeupdate", setAudioTime);

      return () => {
        audio.removeEventListener("loadedmetadata", setAudioData);
        audio.removeEventListener("timeupdate", setAudioTime);
      };
    }
  }, []);

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
    const WHISTLE_FREQ_MIN = 2000;
    const WHISTLE_FREQ_MAX = 8000;
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

  const formatTime = (seconds: number) => {
    const flooredSeconds = Math.floor(seconds);
    if (isNaN(flooredSeconds)) return "00:00";
    const m = String(Math.floor(flooredSeconds / 60)).padStart(2, '0');
    const s = String(flooredSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = chatInput.trim();
    if (!userInput || isLoading) return;

    const newUserMessage: Message = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      // UPDATED: Using relative path
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput }),
      });

      if (!resp.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await resp.json();
      const aiMessage: Message = { sender: 'ai', text: data.reply || "I'm not sure what to say!" };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = { sender: 'ai', text: 'Oops! I had a little trouble connecting. Please check the server and try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const requestRecipeFromAI = async () => {
    setRecipeOutput(null);
    setRecipeError(null);
    setRecipeLoading(true);
    try {
      // UPDATED: Using relative path
      const resp = await fetch('/api/ai-recipe', {
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
      // UPDATED: Using relative path
      const resp = await fetch('/api/dish-horoscope', {
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

  // --- Music Player Functions ---
  const handleCategorySelect = (category: MusicCategory) => {
    setMusicCategory(category);
    const playlist = playlists[category];
    if (playlist.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playlist.length);
    setCurrentTrackIndex(randomIndex);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (!musicCategory || currentTrackIndex === null) return;
    const playlist = playlists[musicCategory];
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!musicCategory || currentTrackIndex === null) return;
    const playlist = playlists[musicCategory];
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  const handleShuffle = () => {
    if(!musicCategory) return;
    handleCategorySelect(musicCategory);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(musicAudioRef.current) {
        musicAudioRef.current.currentTime = parseFloat(e.target.value);
        setCurrentTime(musicAudioRef.current.currentTime);
    }
  };

  const currentTrack = musicCategory && currentTrackIndex !== null ? playlists[musicCategory][currentTrackIndex] : null;

  // --- Render Logic ---
  const renderContent = () => {
    switch (activeTab) {
      case 'music':
        const CATEGORIES: MusicCategory[] = ['melody', 'rock', 'normal'];
        return (
          <div className="feature-content music-player">
            {!musicCategory ? (
              <div className="category-selector">
                <h2>Select a Mood</h2>
                <div className="category-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className="category-card pixel-border"
                      style={{ backgroundImage: `url(${playlists[cat][0].artwork})` }}
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <div className="category-card-overlay"></div>
                      <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              currentTrack && (
                <div className="now-playing-view">
                    <img src={currentTrack.artwork} alt={currentTrack.title} className="album-art pixel-border"/>
                    <div className="track-info">
                        <h3>{currentTrack.title}</h3>
                        <p>{currentTrack.artist}</p>
                    </div>
                    <div className="progress-bar-container">
                        <span>{formatTime(currentTime)}</span>
                        <input type="range" className="progress-bar" min="0" max={duration} value={currentTime} onChange={handleProgressChange} />
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div className="playback-controls">
                        <button className="c-button pixel-border" onClick={handlePrevTrack}>Prev</button>
                        <button className="c-button pixel-border primary" onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
                        <button className="c-button pixel-border" onClick={handleNextTrack}>Next</button>
                    </div>
                    <div className="extra-controls">
                        <button className="c-button pixel-border" onClick={handleShuffle}>Shuffle</button>
                        <div className="volume-control">
                            <span>Vol:</span>
                            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={handleVolumeChange}/>
                        </div>
                    </div>
                    <button className="c-button pixel-border secondary-action" onClick={() => { setIsPlaying(false); setMusicCategory(null); setCurrentTrackIndex(null); }}>Change Mood</button>
                </div>
              )
            )}
          </div>
        );
      case 'counter':
        return (
          <div className="feature-content">
            <h2>Whistle Counter</h2>
            <p className="subtitle">I'll listen for pressure cooker whistles.</p>
            <div className="counter-display">{whistleCount} <span className="target-count">/ {whistleTarget}</span></div>
            <div style={{ width: '100%', maxWidth: 320, height: 80 }}>
              <canvas ref={canvasRef} width="320" height="80" style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="input-group">
              <input id="whistle-target" type="number" min={1} value={whistleTarget} onChange={e => setWhistleTarget(parseInt(e.target.value || '1', 10))} disabled={isListening} className="c-input pixel-border" />
            </div>
            <button onClick={isListening ? stopListening : startListening} className="c-button pixel-border">
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
            <div className="input-group">
              <input type="number" min="0" max="59" value={timerInputMinutes} onChange={e => setTimerInputMinutes(e.target.value)} disabled={isTimerRunning || timeRemaining > 0} className="c-input pixel-border"/>
              <input type="number" min="0" max="59" value={timerInputSeconds} onChange={e => setTimerInputSeconds(e.target.value)} disabled={isTimerRunning || timeRemaining > 0} className="c-input pixel-border"/>
            </div>
            <div className="button-group">
              <button onClick={handleStartTimer} disabled={isTimerRunning || timeRemaining > 0} className="c-button pixel-border primary">Start</button>
              <button onClick={handlePauseTimer} disabled={!isTimerRunning} className="c-button pixel-border">Pause</button>
              <button onClick={handleResetTimer} className="c-button pixel-border">Reset</button>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="feature-content chat-container">
            <div className="chat-body" ref={chatBodyRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message pixel-border ${msg.sender}`}><p>{msg.text}</p></div>
              ))}
              {isLoading && <div className="chat-message pixel-border ai"><p>...</p></div>}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask me anything..." className="c-input pixel-border" disabled={isLoading} />
              <button type="submit" className="c-button pixel-border primary" disabled={isLoading}>Send</button>
            </form>
          </div>
        );
      case 'recipes':
        return (
          <div className="feature-content">
            <h2>AI Recipe Helper</h2>
            <p className="subtitle">Tell me what you have, I'll suggest a recipe.</p>
            <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select value={cookerType} onChange={e => setCookerType(e.target.value as CookerType)} className="c-input pixel-border">
                <option value="pressure">Pressure Cooker</option>
                <option value="stovetop">Stovetop</option>
                <option value="electric">Electric Cooker</option>
              </select>
              <input value={ingredientsInput} onChange={e => setIngredientsInput(e.target.value)} className="c-input pixel-border" placeholder="e.g., potato, onion, tomato" />
              <button onClick={requestRecipeFromAI} disabled={recipeLoading} className="c-button pixel-border primary">
                {recipeLoading ? 'Thinking...' : 'Get Recipe'}
              </button>
              {recipeLoading && <p>Generating your recipe...</p>}
              {recipeError && !recipeLoading && (
                <div className="pixel-border" style={{ padding: '1rem', color: '#ff5555' }}>
                  <strong>Oops!</strong> {recipeError}
                </div>
              )}
              {recipeOutput && !recipeLoading && (
                <div className="pixel-border" style={{ padding: '1.5rem', textAlign: 'left', lineHeight: 1.5 }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: 'var(--secondary-dark)' }}>{recipeOutput.recipe_name}</h3>
                  <p style={{ fontStyle: 'italic', opacity: 0.8 }}>{recipeOutput.description}</p>
                  <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Steps:</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {recipeOutput.steps.map((step, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{step}</li>)}
                  </ol>
                </div>
              )}
            </div>
          </div>
        );
      case 'horoscope':
        return (
          <div className="feature-content">
            <h2>Dish Horoscope</h2>
            <p className="subtitle">Discover your inner dish!</p>
            <div className="input-group" style={{ maxWidth: 480 }}>
              <input
                type="text"
                value={horoscopeName}
                onChange={(e) => setHoroscopeName(e.target.value)}
                placeholder="Enter a name..."
                className="c-input pixel-border"
                disabled={horoscopeLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleGetHoroscope()}
              />
              <button onClick={handleGetHoroscope} className="c-button pixel-border primary" disabled={horoscopeLoading}>
                {horoscopeLoading ? '...' : 'Reveal'}
              </button>
            </div>
            {horoscopeLoading && <p>Finding your soul dish...</p>}
            {horoscopeError && !horoscopeLoading && (
                <div className="pixel-border" style={{ padding: '1rem', color: '#ff5555' }}>
                    <strong>Oops!</strong> {horoscopeError}
                </div>
            )}
            {horoscopeResult && !horoscopeLoading && (
              <div className="pixel-border" style={{ padding: '1.5rem', textAlign: 'left', lineHeight: 1.6, maxWidth: 500 }}>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--secondary-dark)', margin: 0 }}>
                  {horoscopeResult.dishName}
                </h3>
                <p style={{ opacity: 0.7, margin: '0 0 1rem 0' }}>
                  ({horoscopeResult.origin})
                </p>
                <p style={{ margin: '0 0 1rem 0' }}>
                  <strong>Analysis:</strong> {horoscopeResult.dishAnalysis}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Reading:</strong> {horoscopeResult.personalityReading}
                </p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };
  
  const TABS: ActiveTab[] = ['counter', 'timer', 'recipes', 'horoscope', 'music', 'chat'];

  return (
    <div className={isLightTheme ? 'light' : ''}>
      <audio ref={alarmAudioRef} src="/alarm.mp3" preload="auto" />
      <audio ref={musicAudioRef} src={currentTrack?.src} onEnded={handleNextTrack} />

      <div className="main-container">
        <header className="app-header">
          <h1>Cook'n'Count</h1>
          <button onClick={() => setIsLightTheme(prev => !prev)} className="c-button pixel-border" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            {isLightTheme ? 'Dark UI' : 'Light UI'}
          </button>
        </header>

        <nav className="app-nav pixel-border">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`nav-button pixel-border ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <main className="app-content pixel-border">{renderContent()}</main>

      </div>
    </div>
  );
};

export default App;