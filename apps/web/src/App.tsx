import { useState, useEffect, useRef } from 'react';
import { 
  BeatTheClockTimer, 
  type Difficulty, 
  type ChallengeStatus, 
  type SessionResult, 
  type GeneralStats, 
  type TimeAnalytics, 
  type WeeklyProgress,
  calculateGeneralStats,
  calculateTimeAnalytics,
  calculateWeeklyProgress,
  COACHING_HINTS,
  DEFAULT_TIMES
} from '@leetcode-timer/core';

// Synthesize chime sound using Web Audio API
function playChimeSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(659.25, now, 0.4); // E5
    playTone(987.77, now + 0.1, 0.6); // B5
  } catch (e) {
    console.error('Audio play failed:', e);
  }
}

// Format seconds into HH:MM:SS
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  
  return `${hStr}:${mStr}:${sStr}`;
}

// Roll transition digit component
function AnimatedDigit({ value }: { value: string }) {
  const [prevValue, setPrevValue] = useState(value);
  const [animate, setAnimate] = useState(false);
  const [spinValue, setSpinValue] = useState<string | null>(null);

  // Roll-spin shuffle animation on component mount
  useEffect(() => {
    if (value === ':' || value === ' ' || isNaN(Number(value))) {
      return;
    }
    
    let iterations = 0;
    const maxIterations = 10; // Number of shuffles
    const interval = setInterval(() => {
      setSpinValue(String(Math.floor(Math.random() * 10)));
      iterations++;
      
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setSpinValue(null); // Settle back to standard target value
      }
    }, 60); // Shuffle frequency

    return () => clearInterval(interval);
  }, []);

  // Tick animation on value shift
  useEffect(() => {
    if (value !== prevValue) {
      setAnimate(true);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setAnimate(false);
      }, 220); // Duration
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  if (value === ':' || value === ' ' || isNaN(Number(value))) {
    return <span className="clock-colon">{value}</span>;
  }

  const currentValue = spinValue !== null ? spinValue : value;
  const lastValue = spinValue !== null ? String((Number(spinValue) + 1) % 10) : prevValue;

  return (
    <span className="digit-container">
      <span className={`digit-roll ${animate || spinValue !== null ? 'roll-active' : ''}`}>
        <span className="digit-num">{lastValue}</span>
        <span className="digit-num">{currentValue}</span>
      </span>
    </span>
  );
}

// Convert difficulty keys to display labels
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy Challenge',
  medium: 'Medium Challenge',
  hard: 'Hard Challenge',
  custom: 'Custom Challenge'
};

const DEVELOPER_QUOTES = [
  "Life moves fast. Stay on time and enjoy every moment!",
  "First, solve the problem. Then, write the code.",
  "Premature optimization is the root of all evil.",
  "Make it work, make it right, make it fast.",
  "Simplicity is prerequisite for reliability.",
  "Clean code always looks like it was written by someone who cares."
];

const LogoIconSvg = () => (
  <svg viewBox="0 0 40 40" style={{ width: '22px', height: '22px', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 360) / 12;
      return (
        <line
          key={i}
          x1="20"
          y1="5"
          x2="20"
          y2="11"
          transform={`rotate(${angle} 20 20)`}
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);




export default function App() {
  // Navigation screen
  const [screen, setScreen] = useState<'dashboard' | 'challenge' | 'summary'>('dashboard');
  
  // App-wide settings
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('@leetcode-timer/theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [learningMode, setLearningMode] = useState<boolean>(false);
  const [learningPhase, setLearningPhase] = useState<'none' | 'solve_yourself' | 'get_tips' | 'review_solution' | 'recall_timer'>('none');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [randomQuote, setRandomQuote] = useState<string>(DEVELOPER_QUOTES[0]);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const clearTimerRef = useRef<any>(null);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [liveTime, setLiveTime] = useState<Date>(new Date());

  // Selected difficulty for next challenge
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  // LocalStorage session list
  const [sessions, setSessions] = useState<SessionResult[]>([]);
  
  // Timer state replication for React rendering
  const timerRef = useRef<BeatTheClockTimer>(new BeatTheClockTimer());
  const [timerState, setTimerState] = useState({
    status: 'idle' as ChallengeStatus,
    difficulty: 'medium' as Difficulty,
    durationSeconds: DEFAULT_TIMES.medium,
    remainingSeconds: DEFAULT_TIMES.medium,
    elapsedSeconds: 0,
    currentPhaseIndex: 0,
    hintsUsed: 0,
    pauseCount: 0,
    thinkingSeconds: 0,
    codingSeconds: 0,
    reviewSeconds: 0,
  });

  // active hint dialog
  const [activeHint, setActiveHint] = useState<string>('');

  // active session result for summary screen
  const [activeResult, setActiveResult] = useState<SessionResult | null>(null);

  // Load session history on mount
  useEffect(() => {
    const saved = localStorage.getItem('@leetcode-timer/sessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse sessions from local storage', e);
      }
    }
  }, []);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Dark Theme class and localStorage
  useEffect(() => {
    localStorage.setItem('@leetcode-timer/theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [darkMode]);

  const formatLiveTime = (date: Date, format: '12h' | '24h') => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();

    if (format === '12h') {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = String(hours % 12 || 12).padStart(2, '0');
      return `${weekday}, ${month} ${day} ${year} • ${displayHours}:${minutes}:${seconds} ${ampm}`;
    } else {
      const displayHours = String(hours).padStart(2, '0');
      return `${weekday}, ${month} ${day} ${year} • ${displayHours}:${minutes}:${seconds}`;
    }
  };

  // Update localStorage helper
  const saveSessionsToLocalStorage = (newSessions: SessionResult[]) => {
    setSessions(newSessions);
    localStorage.setItem('@leetcode-timer/sessions', JSON.stringify(newSessions));
  };

  // Sync Timer instances with React state
  useEffect(() => {
    const timer = timerRef.current;
    
    // Subscribe to ticking/state changes
    const unsubscribe = timer.subscribe(() => {
      setTimerState({
        status: timer.status,
        difficulty: timer.difficulty,
        durationSeconds: timer.durationSeconds,
        remainingSeconds: timer.remainingSeconds,
        elapsedSeconds: timer.elapsedSeconds,
        currentPhaseIndex: timer.currentPhaseIndex,
        hintsUsed: timer.hintsUsed,
        pauseCount: timer.pauseCount,
        thinkingSeconds: timer.thinkingSeconds,
        codingSeconds: timer.codingSeconds,
        reviewSeconds: timer.reviewSeconds
      });

      // Handle automatic transition to expiration screen or solution review
      if (timer.status === 'expired') {
        if (learningMode && (learningPhase === 'solve_yourself' || learningPhase === 'get_tips')) {
          setLearningPhase('review_solution');
          setTimeout(() => {
            timer.start('custom', 10); // Start 10-minute solution review timer
          }, 0);
        }
      }
    });

    // Custom coaching alerts
    timer.onCoachingAlert = (emoji, msg) => {
      if (soundOn) {
        playChimeSound();
      }
      // Set the active hint display or flash it
      setActiveHint(`${emoji} ${msg}`);
    };

    return () => {
      unsubscribe();
    };
  }, [soundOn, learningMode, learningPhase]);

  // Compute analytics
  const generalStats: GeneralStats = calculateGeneralStats(sessions);
  const timeAnalytics: TimeAnalytics = calculateTimeAnalytics(sessions);
  const weeklyProgress: WeeklyProgress = calculateWeeklyProgress(sessions);

  // Home Page logic: cycle random quotes
  const rotateQuote = () => {
    const idx = Math.floor(Math.random() * DEVELOPER_QUOTES.length);
    setRandomQuote(DEVELOPER_QUOTES[idx]);
  };

  // 1. START CHALLENGE
  const handleStartChallenge = () => {
    rotateQuote();
    setActiveHint('');
    timerRef.current.start(selectedDifficulty, selectedDifficulty === 'custom' ? customMinutes : undefined);
    
    if (learningMode) {
      setLearningPhase('solve_yourself');
    } else {
      setLearningPhase('none');
    }
    setScreen('challenge');
  };

  // 2. PAUSE & RESUME
  const handlePause = () => {
    timerRef.current.pause();
  };

  const handleResume = () => {
    timerRef.current.resume();
  };

  // 3. COMPLETE
  const handleComplete = () => {
    const result = timerRef.current.complete();
    result.status = 'solved';
    const updated = [result, ...sessions];
    saveSessionsToLocalStorage(updated);
    setActiveResult(result);
    setScreen('summary');
  };

  // 4. GIVE UP / FAIL
  const handleGiveUp = () => {
    const result = timerRef.current.giveUp();
    const updated = [result, ...sessions];
    saveSessionsToLocalStorage(updated);
    setActiveResult(result);
    setScreen('summary');
  };

  // 5. EXPIRED SELECTIONS
  const handleExpiredSolve = (solved: boolean) => {
    const result = timerRef.current.expire(solved);
    const updated = [result, ...sessions];
    saveSessionsToLocalStorage(updated);
    setActiveResult(result);
    setScreen('summary');
  };

  // CONTINUE WITHOUT TIMER (called when user is at 00:00 but selects to continue coding)
  const handleContinueWithoutTimer = () => {
    // We resume timer ticking, but status is set back to running
    // In our timer class, we need to allow ticking below 0 or count up.
    // For simplicity, we just set timerRef.current.status to 'running' and let it tick further down/up
    // Let's modify the class on the fly by overriding its tick or status
    const timer = timerRef.current;
    timer.status = 'running';
    // We set remaining seconds to 99999 (or just let it count down, but since we are continuing,
    // let's set remainingSeconds to 0 and let it count up or remain at 0)
    // Actually, setting status back to 'running' works.
    // Let's make sure it ticks.
    timerRef.current.resume();
  };

  // REQUEST A RANDOM HINT FROM COACH
  const handleRequestHint = () => {
    timerRef.current.incrementHints();
    const randomHint = COACHING_HINTS[Math.floor(Math.random() * COACHING_HINTS.length)];
    setActiveHint(`💡 Coach Tip: ${randomHint}`);
    if (soundOn) {
      playChimeSound();
    }
  };



  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setConfirmClear(false);
      }, 3000);
    } else {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      saveSessionsToLocalStorage([]);
      setConfirmClear(false);
    }
  };

  return (
    <div className={`timespot-container ${focusMode ? 'focus-active' : ''}`}>
      {focusMode && (
        <button 
          className="exit-focus-floating-btn"
          onClick={() => setFocusMode(false)}
          title="Exit Zen Mode"
        >
          👁 Exit Zen Mode
        </button>
      )}
      
      {/* 1. HEADER BAR */}
      <header className="timespot-header">
        <div className="logo-section" onClick={() => { setScreen('dashboard'); setMobileMenuOpen(false); }}>
          <LogoIconSvg />
          <span className="logo-text">Beat The Clock</span>
        </div>
        
        {/* Mobile Hamburger navbar button */}
        <button 
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        <div className={`header-actions ${mobileMenuOpen ? 'open' : ''}`}>
          <button 
            className={`toggle-btn ${soundOn ? 'active' : ''}`}
            onClick={() => { setSoundOn(!soundOn); setMobileMenuOpen(false); }}
            title="Toggle Sound Notifications"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {soundOn ? '🔊 Sound On' : '🔇 Muted'}
          </button>
          <button 
            className={`toggle-btn ${focusMode ? 'active' : ''}`}
            onClick={() => { setFocusMode(!focusMode); setMobileMenuOpen(false); }}
            title="Toggle Zen Mode (Hide distracting headers & details during challenge)"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {focusMode ? '🧘 Zen Mode' : '👁 Focus Mode'}
          </button>
          <button 
            className={`toggle-btn ${darkMode ? 'active' : ''}`}
            onClick={() => { setDarkMode(!darkMode); setMobileMenuOpen(false); }}
            title="Toggle Dark Mode"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {darkMode ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button 
            className={`toggle-btn ${learningMode ? 'active' : ''}`}
            onClick={() => { setLearningMode(!learningMode); setMobileMenuOpen(false); }}
            title="Toggle Learning Mode (Progressive guidance & structured problem solving)"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {learningMode ? '🎓 Learning Mode' : '📚 Standard Mode'}
          </button>
          <a href="#stats" className="action-link" onClick={() => { setScreen('dashboard'); setMobileMenuOpen(false); }}>History</a>
        </div>
      </header>

      {/* 2. MAIN SCREENS */}
      
      {/* SCREEN A: DASHBOARD / HOME */}
      {screen === 'dashboard' && (
        <>
          {/* Main Hero Clock (Idle Clock) */}
          <section className="clock-section">
            <div className="clock-digits">
              {formatTime(
                selectedDifficulty === 'custom' 
                  ? customMinutes * 60 
                  : DEFAULT_TIMES[selectedDifficulty as Exclude<Difficulty, 'custom'>]
              ).split('').map((char, index) => (
                <AnimatedDigit key={`idle-${index}`} value={char} />
              ))}
            </div>
            <div className="clock-meta-bar">
              <div className="meta-left">
                <span>🎯 Target: {selectedDifficulty.toUpperCase()}</span>
                <span>🔥 Streak: {generalStats.streaks.currentStreak} Days</span>
              </div>
              <div className="meta-middle" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                {formatLiveTime(liveTime, timeFormat)}
              </div>
              <div className="meta-right">
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${timeFormat === '12h' ? 'active' : ''}`}
                    onClick={() => setTimeFormat('12h')}
                  >
                    12h
                  </button>
                  <button 
                    className={`toggle-btn ${timeFormat === '24h' ? 'active' : ''}`}
                    onClick={() => setTimeFormat('24h')}
                  >
                    24h
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Details / Recommended Selection Area */}
          <section className="info-section">
            <div className="city-display">
              <span className="city-title">{DIFFICULTY_LABELS[selectedDifficulty]}</span>
              <span className="city-subtitle">
                {selectedDifficulty === 'custom' 
                  ? `Configured to ${customMinutes} Minutes challenge limit` 
                  : `Recommended prep time under interview conditions`
                }
              </span>
            </div>
            
            <div className="quote-display">
              <p>"{randomQuote}"</p>
              <div 
                className="add-city-trigger btn-start-challenge" 
                onClick={handleStartChallenge}
                title={learningMode ? "Start Learning Session" : "Start Challenge"}
              >
                <span>{learningMode ? 'Start Learning Session' : 'Start Challenge'}</span> ➔
              </div>
            </div>
          </section>

          {/* Custom configuration slider (visible only when custom difficulty is active) */}
          {selectedDifficulty === 'custom' && (
            <div className="custom-config-box">
              <div className="custom-config-row">
                <label style={{ fontWeight: 600 }}>Set Challenge Time: {customMinutes} Minutes</label>
                <input 
                  type="range" 
                  min="5" 
                  max="120" 
                  step="5" 
                  value={customMinutes} 
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="input-slider"
                />
              </div>
            </div>
          )}

          {/* Bottom Row Selection Cards */}
          <section className="bottom-cards-row">
            <div 
              className={`timespot-card ${selectedDifficulty === 'easy' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('easy')}
            >
              <div className="card-header">
                <span className="card-title">🟢 EASY</span>
                <span className="card-badge">20M</span>
              </div>
              <div className="card-value">20:00</div>
              <div className="card-footer">
                <div className="footer-status">
                  <span className="status-dot easy"></span>
                  <span>Direct Prep</span>
                </div>
              </div>
            </div>

            <div 
              className={`timespot-card ${selectedDifficulty === 'medium' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('medium')}
            >
              <div className="card-header">
                <span className="card-title">🟡 MEDIUM</span>
                <span className="card-badge">40M</span>
              </div>
              <div className="card-value">40:00</div>
              <div className="card-footer">
                <div className="footer-status">
                  <span className="status-dot medium"></span>
                  <span>Standard Prep</span>
                </div>
              </div>
            </div>

            <div 
              className={`timespot-card ${selectedDifficulty === 'hard' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('hard')}
            >
              <div className="card-header">
                <span className="card-title">🔴 HARD</span>
                <span className="card-badge">60M</span>
              </div>
              <div className="card-value">60:00</div>
              <div className="card-footer">
                <div className="footer-status">
                  <span className="status-dot hard"></span>
                  <span>Advanced Prep</span>
                </div>
              </div>
            </div>

            <div 
              className={`timespot-card ${selectedDifficulty === 'custom' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('custom')}
            >
              <div className="card-header">
                <span className="card-title">⚙️ CUSTOM</span>
                <span className="card-badge">SLIDE</span>
              </div>
              <div className="card-value">{customMinutes}:00</div>
              <div className="card-footer">
                <div className="footer-status">
                  <span className="status-dot custom"></span>
                  <span>Self-paced</span>
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Statistics Section */}
          <section id="stats" className="stats-section" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '30px', marginTop: '20px' }}>
            <div className="stats-header-row">
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>Statistics Dashboard</h2>
              {sessions.length > 0 && (
                <button 
                  onClick={handleClearHistory} 
                  style={{ border: 'none', background: 'transparent', color: 'var(--color-hard)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  {confirmClear ? '⚠️ Confirm Clear?' : 'Clear History'}
                </button>
              )}
            </div>
            
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px', background: 'var(--panel-card-inner)', borderRadius: 'var(--border-radius-medium)' }}>
                <p>No coding challenges attempted yet. Click <strong>"Load Demo Stats"</strong> or start a challenge to see analytics!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="stats-grid-4">
                  <div className="stats-mini-card">
                    <span className="card-title">Total Attempted</span>
                    <span className="stats-mini-val">{generalStats.totalAttempted}</span>
                  </div>
                  <div className="stats-mini-card">
                    <span className="card-title">Solved Rate</span>
                    <span className="stats-mini-val">{generalStats.completionRate}%</span>
                  </div>
                  <span className="stats-mini-card">
                    <span className="card-title">Total Solved</span>
                    <span className="stats-mini-val">{generalStats.totalSolved}</span>
                  </span>
                  <div className="stats-mini-card">
                    <span className="card-title">Longest Streak</span>
                    <span className="stats-mini-val" style={{ color: 'var(--bg-orange)' }}>{generalStats.streaks.longestStreak} Days</span>
                  </div>
                </div>

                <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="summary-card">
                    <span className="summary-title">Difficulty Breakdown</span>
                    <div className="summary-row">
                      <span>🟢 Easy Solved</span>
                      <span className="summary-val">{generalStats.easySolved}</span>
                    </div>
                    <div className="summary-row">
                      <span>🟡 Medium Solved</span>
                      <span className="summary-val">{generalStats.mediumSolved}</span>
                    </div>
                    <div className="summary-row">
                      <span>🔴 Hard Solved</span>
                      <span className="summary-val">{generalStats.hardSolved}</span>
                    </div>
                    <div className="summary-row">
                      <span>⚙️ Custom Solved</span>
                      <span className="summary-val">{generalStats.customSolved}</span>
                    </div>
                  </div>

                  <div className="summary-card">
                    <span className="summary-title">Time Averages (Active Session)</span>
                    <div className="summary-row">
                      <span>🧠 Avg Thinking Time</span>
                      <span className="summary-val">{formatTime(timeAnalytics.avgThinkingTime)}</span>
                    </div>
                    <div className="summary-row">
                      <span>💻 Avg Coding Time</span>
                      <span className="summary-val">{formatTime(timeAnalytics.avgCodingTime)}</span>
                    </div>
                    <div className="summary-row">
                      <span>🧪 Avg Review/Test Time</span>
                      <span className="summary-val">{formatTime(timeAnalytics.avgReviewTime)}</span>
                    </div>
                    <div className="summary-row">
                      <span>⏸ Avg Pause Count</span>
                      <span className="summary-val">{timeAnalytics.avgPauseCount} pauses</span>
                    </div>
                  </div>

                  <div className="summary-card">
                    <span className="summary-title">Weekly Progress</span>
                    <div className="summary-row">
                      <span>Completed This Week</span>
                      <span className="summary-val">{weeklyProgress.challengesCompletedThisWeek}</span>
                    </div>
                    <div className="summary-row">
                      <span>Practice Time</span>
                      <span className="summary-val">{Math.round(weeklyProgress.totalPracticeTimeThisWeek / 60)} mins</span>
                    </div>
                    <div className="summary-row">
                      <span>Weekly Solved</span>
                      <span className="summary-val">{weeklyProgress.solvedThisWeek} solved</span>
                    </div>
                    <div className="summary-row">
                      <span>Improvement Rate</span>
                      <span className="summary-val" style={{ color: weeklyProgress.improvementPercentage >= 0 ? 'var(--color-easy)' : 'var(--color-hard)' }}>
                        {weeklyProgress.improvementPercentage >= 0 ? `+${weeklyProgress.improvementPercentage}%` : `${weeklyProgress.improvementPercentage}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* History list */}
                <div className="summary-card" style={{ gap: '10px' }}>
                  <span className="summary-title">Recent Challenges Log</span>
                  <div className="history-list">
                    {sessions.map(s => (
                      <div key={s.id} className="history-item">
                        <div className="history-left">
                          <span className={`badge-round`} style={{
                            backgroundColor: s.difficulty === 'easy' ? 'var(--color-easy)' : 
                                            s.difficulty === 'medium' ? 'var(--color-medium)' : 
                                            s.difficulty === 'hard' ? 'var(--color-hard)' : 'var(--color-custom)'
                          }}></span>
                          <span style={{ fontWeight: 600 }}>{s.difficulty.toUpperCase()}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="history-right">
                          <span>Elapsed: {formatTime(s.elapsedSeconds)}</span>
                          <span className={`history-status-badge ${s.status}`}>
                            {s.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* SCREEN B: CHALLENGE / TIMER RUNNING */}
      {screen === 'challenge' && (
        <>
           {/* Desktop-only challenge layout */}
          <div className="desktop-clock-layout">
            
            {/* If learningMode is active, show custom Learning Mode Header */}
            {learningMode && (
              <div className="learning-header-banner">
                <span className="learning-badge">🎓 LEARNING MODE</span>
                <span className="learning-phase-title">
                  {learningPhase === 'solve_yourself' && '🔍 Stage 1: Solve Independently'}
                  {learningPhase === 'get_tips' && '💡 Stage 2: Progressive Guidance & Tips'}
                  {learningPhase === 'review_solution' && '📖 Stage 3: Review Solution (Timer Stopped)'}
                  {learningPhase === 'recall_timer' && '⚡ Stage 4: Recall Mode (Implement from Memory)'}
                </span>
              </div>
            )}

            {/* Active Timer Display */}
            <section className="clock-section">
              <div className={`clock-digits ${timerState.status === 'expired' ? 'clock-digits-expired' : ''}`}>
                {formatTime(timerState.remainingSeconds).split('').map((char, index) => (
                  <AnimatedDigit key={`active-${index}`} value={char} />
                ))}
              </div>
              
              <div className="clock-meta-bar">
                <div className="meta-left">
                  <span>🎯 DIFFICULTY: {timerState.difficulty.toUpperCase()}</span>
                  <span>⏱ ELAPSED: {formatTime(timerState.elapsedSeconds)}</span>
                </div>
                <div className="meta-right">
                  <span>⏸ PAUSES: {timerState.pauseCount}</span>
                </div>
              </div>
            </section>

            {learningMode ? (
              <section className="learning-mode-console">
                {learningPhase === 'solve_yourself' && (
                  <div className="learning-card">
                    <h3>Try solving it yourself!</h3>
                    <p>Focus on understanding the problem, identifying patterns, and writing an initial approach. Don't look at references yet.</p>
                    <button className="control-btn btn-primary" onClick={() => setLearningPhase('get_tips')}>
                      💡 I'm Stuck (Get Hints)
                    </button>
                  </div>
                )}

                {learningPhase === 'get_tips' && (
                  <div className="learning-card">
                    <h3>Progressive Hints & Tips</h3>
                    <ul className="learning-hints-list">
                      <li><strong>Hint 1:</strong> Try tracing the example input by hand first. What is the brute-force way?</li>
                      <li><strong>Hint 2:</strong> Look at the time/space constraints. Can we use a Hash Map or sliding window?</li>
                      <li><strong>Hint 3:</strong> Draw the states or write down pseudocode before implementing.</li>
                    </ul>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                      <button className="control-btn btn-danger" onClick={() => {
                        timerRef.current.start('custom', 10);
                        setLearningPhase('review_solution');
                      }}>
                        📖 Still Stuck (Check Solution)
                      </button>
                    </div>
                  </div>
                )}

                {learningPhase === 'review_solution' && (
                  <div className="learning-card" style={{ textAlign: 'center' }}>
                    <h3>Review Solution Independently</h3>
                    <p style={{ margin: '15px 0', fontSize: '0.95rem' }}>
                      Go check the official LeetCode editorial, discussion forums, or other external references by yourself.
                      Use this time to understand the correct approach, time/space complexity, and implementation patterns.
                    </p>
                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px', width: '100%' }}>
                      <p style={{ fontWeight: 600, color: 'var(--color-custom)' }}>Ready to test your recall?</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>We will start a 15-minute recall timer. All references should be closed.</p>
                      <button className="control-btn btn-primary" style={{ marginTop: '15px', marginLeft: 'auto', marginRight: 'auto' }} onClick={() => {
                        timerRef.current.start('custom', 15);
                        setLearningPhase('recall_timer');
                      }}>
                        ⚡ Practice Solution (Recall Timer)
                      </button>
                    </div>
                  </div>
                )}

                {learningPhase === 'recall_timer' && (
                  <div className="learning-card">
                    <h3>Recall Mode: Code from memory</h3>
                    <p>The solution is now hidden. Implement it yourself without looking back. Focus on replicating the logic and cleaning up any edge cases.</p>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                      <button className="control-btn btn-primary" onClick={handleComplete}>
                        🏁 Solved from Memory
                      </button>
                      <button className="control-btn btn-danger" onClick={handleGiveUp}>
                        🏳️ Give Up
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Coaching / Tip Banner */}
                <section className="info-section">
                  {activeHint ? (
                    <div className="coaching-alert-card">
                      <span className="coaching-emoji">📢</span>
                      <div className="coaching-details">
                        <span className="coaching-title">Coach Directive</span>
                        <span className="coaching-body">{activeHint}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="coaching-alert-card" style={{ background: '#f4f4f5', border: '1px solid #e4e4e7' }}>
                      <span className="coaching-emoji" style={{ filter: 'grayscale(1)' }}>🧠</span>
                      <div className="coaching-details">
                        <span className="coaching-title" style={{ color: 'var(--text-secondary)' }}>Coach Status</span>
                        <span className="coaching-body" style={{ color: 'var(--text-secondary)' }}>
                          Listening. Coach alerts trigger automatically as you progress.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="quote-display" style={{ minHeight: '100px' }}>
                    <p>Current coaching messages are focused on guidance, NOT revealing solutions.</p>
                    <div className="add-city-trigger" onClick={handleRequestHint}>
                      <span>💡 Get Coach Hint</span>
                    </div>
                  </div>
                </section>

                {/* Dynamic Stage Selection Cards */}
                <section className="bottom-cards-row">
                  {timerRef.current.phases.map((phase, idx) => (
                    <div 
                      key={phase.name}
                      className={`timespot-card ${timerState.currentPhaseIndex === idx ? 'active' : ''}`}
                      onClick={() => timerRef.current.selectPhase(idx)}
                    >
                      <div className="card-header">
                        <span className="card-title">PHASE {idx + 1}</span>
                        <span className="card-badge">RECOMMENDED</span>
                      </div>
                      <div className="card-value" style={{ fontSize: '1.2rem', marginTop: '10px' }}>
                        {phase.name}
                      </div>
                      <div className="card-footer">
                        <span>Mins: {phase.recommendedRange[0]}-{phase.recommendedRange[1]}</span>
                      </div>
                    </div>
                  ))}
                </section>

                {/* Control Bar */}
                <section className="controls-panel">
                  {timerState.status === 'running' && (
                    <>
                      <button className="control-btn btn-secondary" onClick={handlePause}>
                        ⏸ Pause Timer
                      </button>
                      <button className="control-btn btn-primary" onClick={handleComplete}>
                        🏁 Complete & Solved
                      </button>
                      <button className="control-btn btn-danger" onClick={handleGiveUp}>
                        🏳️ Give Up
                      </button>
                    </>
                  )}

                  {timerState.status === 'paused' && (
                    <>
                      <button className="control-btn btn-primary" onClick={handleResume}>
                        ▶ Resume Timer
                      </button>
                      <button className="control-btn btn-danger" onClick={handleGiveUp}>
                        🏳️ Give Up
                      </button>
                    </>
                  )}

                  {timerState.status === 'expired' && (
                    <div style={{ textAlign: 'center', width: '100%', background: '#fee2e2', padding: '20px', borderRadius: 'var(--border-radius-medium)', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                      <h3 style={{ color: 'var(--color-hard)', fontWeight: 700 }}>⏰ Time's Up! Did you solve the challenge?</h3>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="control-btn btn-primary" onClick={() => handleExpiredSolve(true)}>
                          Yes, Solved
                        </button>
                        <button className="control-btn btn-danger" onClick={() => handleExpiredSolve(false)}>
                          No, Unsolved
                        </button>
                        <button className="control-btn btn-secondary" onClick={handleContinueWithoutTimer}>
                          Continue Without Timer
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          {/* Mobile-only challenge layout (TimeMoto Mockup Style) */}
          <div className="mobile-clock-layout">
            <header className="mobile-clock-header">
              <span className="mobile-logo" onClick={() => setScreen('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <LogoIconSvg /> Beat The Clock
              </span>
              <div className="mobile-hamburger" onClick={() => setScreen('dashboard')} style={{ cursor: 'pointer' }} title="Exit Challenge">
                <span></span>
                <span></span>
              </div>
            </header>
            
            <div className="mobile-sub-header">
              <span className="mobile-sub-title">
                {learningMode ? '🎓 LEARNING SESSION' : '⏱ ACTIVE CHALLENGE'}
              </span>
              <span className="mobile-sub-desc">
                {focusMode ? 'Zen Mode' : 'Focus Mode'} • {timerState.difficulty.toUpperCase()}
              </span>
            </div>

            {/* Circular Dial Timer */}
            <div className="mobile-dial-container">
              <svg className="mobile-dial-svg" viewBox="0 0 200 200">
                {Array.from({ length: 30 }).map((_, index) => {
                  const angle = (index * 360) / 30;
                  const progress = timerState.elapsedSeconds / timerState.durationSeconds;
                  const activeTicksCount = Math.floor(progress * 30);
                  const isActive = index < activeTicksCount;
                  
                  return (
                    <line
                      key={index}
                      x1="100"
                      y1="18"
                      x2="100"
                      y2="30"
                      transform={`rotate(${angle} 100 100)`}
                      stroke={isActive ? '#ff5a2b' : '#e4e4e7'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              
              <div className="mobile-dial-center">
                <span className="mobile-dial-label">Elapsed</span>
                <span className="mobile-dial-time">
                  {formatTime(timerState.elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="mobile-remaining-box">
              <span className="mobile-remaining-label">Remaining</span>
              <span className="mobile-remaining-time">
                {formatTime(timerState.remainingSeconds)}
              </span>
            </div>

            {/* Project dropdown card */}
            <div className="mobile-project-dropdown">
              <span className="mobile-dropdown-label">Project</span>
              <div className="mobile-dropdown-value-row">
                <span className="mobile-dropdown-value">
                  🎯 LeetCode {timerState.difficulty.toUpperCase()}
                </span>
                <span className="mobile-dropdown-arrow">▼</span>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div className="mobile-action-buttons">
              <button 
                className="mobile-btn-break"
                onClick={timerState.status === 'paused' ? handleResume : handlePause}
              >
                {timerState.status === 'paused' ? 'Resume' : 'Break'}
              </button>
              <button 
                className="mobile-btn-clockout"
                onClick={handleComplete}
              >
                Clock out
              </button>
            </div>
            
            {/* Give up challenge option */}
            <div className="mobile-giveup-link" onClick={handleGiveUp}>
              Give up challenge
            </div>
          </div>
        </>
      )}

      {/* SCREEN C: SESSION SUMMARY */}
      {screen === 'summary' && activeResult && (
        <section className="summary-container">
          <div className="summary-header">
            <span className="summary-headline">
              {activeResult.status === 'solved' ? '🎉 Challenge Complete!' : '🏳️ Attempt Recorded'}
            </span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Great effort under technical interview pressure. Here is your session analytics.
            </p>
          </div>

          <div className="summary-grid">
            {/* Left side parameters */}
            <div className="summary-card">
              <span className="summary-title">Summary Metrics</span>
              
              <div className="summary-row">
                <span>Difficulty</span>
                <span className="summary-val" style={{
                  color: activeResult.difficulty === 'easy' ? 'var(--color-easy)' : 
                         activeResult.difficulty === 'medium' ? 'var(--color-medium)' : 
                         activeResult.difficulty === 'hard' ? 'var(--color-hard)' : 'var(--color-custom)'
                }}>{activeResult.difficulty.toUpperCase()}</span>
              </div>
              
              <div className="summary-row">
                <span>Target Limit</span>
                <span className="summary-val">{formatTime(activeResult.durationSeconds)}</span>
              </div>

              <div className="summary-row">
                <span>Total Elapsed</span>
                <span className="summary-val" style={{ color: 'var(--bg-orange)', fontSize: '1.1rem' }}>
                  {formatTime(activeResult.elapsedSeconds)}
                </span>
              </div>

              <div className="summary-row">
                <span>Result Status</span>
                <span className={`summary-val history-status-badge ${activeResult.status}`}>
                  {activeResult.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="summary-row">
                <span>Hints Used</span>
                <span className="summary-val">{activeResult.hintsUsed} hints</span>
              </div>

              <div className="summary-row">
                <span>Pause Count</span>
                <span className="summary-val">{activeResult.pauseCount} pauses</span>
              </div>
            </div>

            {/* Right side phase breakdown chart */}
            <div className="summary-card">
              <span className="summary-title">Phase Time Breakdown</span>
              
              <div className="chart-bar-container">
                <div className="chart-item">
                  <div className="chart-label-row">
                    <span>🧠 Thinking Time</span>
                    <span className="summary-val">{formatTime(activeResult.breakdown.thinkingSeconds)}</span>
                  </div>
                  <div className="chart-bar-outer">
                    <div 
                      className="chart-bar-inner thinking" 
                      style={{ width: `${(activeResult.breakdown.thinkingSeconds / Math.max(1, activeResult.elapsedSeconds)) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="chart-item">
                  <div className="chart-label-row">
                    <span>💻 Coding Time</span>
                    <span className="summary-val">{formatTime(activeResult.breakdown.codingSeconds)}</span>
                  </div>
                  <div className="chart-bar-outer">
                    <div 
                      className="chart-bar-inner coding" 
                      style={{ width: `${(activeResult.breakdown.codingSeconds / Math.max(1, activeResult.elapsedSeconds)) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="chart-item">
                  <div className="chart-label-row">
                    <span>🧪 Testing & Review</span>
                    <span className="summary-val">{formatTime(activeResult.breakdown.reviewSeconds)}</span>
                  </div>
                  <div className="chart-bar-outer">
                    <div 
                      className="chart-bar-inner reviewing" 
                      style={{ width: `${(activeResult.breakdown.reviewSeconds / Math.max(1, activeResult.elapsedSeconds)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                💡 An ideal interview allocates 30% thinking, 50% implementation, and 20% validation.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <button className="control-btn btn-primary" onClick={() => setScreen('dashboard')}>
              Return to Dashboard
            </button>
          </div>
        </section>
      )}

    </div>
  );
}
