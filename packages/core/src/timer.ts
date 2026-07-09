import { Difficulty, ChallengeStatus, ChallengePhase, TimeBreakdown, SessionResult } from './types';
import { DEFAULT_TIMES, PHASES, getCustomPhases, getCoachingMessage } from './coaching';

export class BeatTheClockTimer {
  public id: string;
  public difficulty: Difficulty = 'medium';
  public status: ChallengeStatus = 'idle';
  public durationSeconds: number = DEFAULT_TIMES.medium;
  public remainingSeconds: number = DEFAULT_TIMES.medium;
  public elapsedSeconds: number = 0;
  public pauseCount: number = 0;
  public hintsUsed: number = 0;
  
  // Current active phase
  public currentPhaseIndex: number = 0;
  public phases: ChallengePhase[] = PHASES.medium;
  
  // Phase breakdown tracking
  public thinkingSeconds: number = 0;
  public codingSeconds: number = 0;
  public reviewSeconds: number = 0;
  public isManualPhase: boolean = false;

  private intervalId: any = null;
  private lastCoachingMessageText: string = '';
  private lastResumeTime: number = 0;
  private accumulatedElapsedMs: number = 0;
  
  // Event listeners
  private listeners: (() => void)[] = [];
  public onCoachingAlert?: (emoji: string, msg: string) => void;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 11);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public start(difficulty: Difficulty, customDurationMinutes?: number) {
    this.cleanup();
    this.id = Math.random().toString(36).substring(2, 11);
    this.difficulty = difficulty;
    
    if (difficulty === 'custom') {
      const minutes = customDurationMinutes || 30;
      this.durationSeconds = minutes * 60;
      this.phases = getCustomPhases(this.durationSeconds);
    } else {
      this.durationSeconds = DEFAULT_TIMES[difficulty];
      this.phases = PHASES[difficulty];
    }

    this.remainingSeconds = this.durationSeconds;
    this.elapsedSeconds = 0;
    this.pauseCount = 0;
    this.hintsUsed = 0;
    this.currentPhaseIndex = 0;
    this.thinkingSeconds = 0;
    this.codingSeconds = 0;
    this.reviewSeconds = 0;
    this.isManualPhase = false;
    this.status = 'running';
    this.accumulatedElapsedMs = 0;
    this.lastResumeTime = Date.now();

    // Get initial coaching message
    const msg = getCoachingMessage(this.difficulty, 0, this.durationSeconds);
    this.lastCoachingMessageText = msg.message;

    this.startInterval();
    this.notify();
  }

  public pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.pauseCount++;
    this.accumulatedElapsedMs += Date.now() - this.lastResumeTime;
    this.stopInterval();
    this.notify();
  }

  public resume() {
    if (this.status !== 'paused') return;
    this.status = 'running';
    this.lastResumeTime = Date.now();
    this.startInterval();
    this.notify();
  }

  public stop() {
    this.cleanup();
    this.status = 'idle';
    this.notify();
  }

  public complete(): SessionResult {
    this.cleanup();
    const finalStatus = this.status;
    this.status = 'completed';
    this.notify();

    return {
      id: this.id,
      difficulty: this.difficulty,
      durationSeconds: this.durationSeconds,
      elapsedSeconds: this.elapsedSeconds,
      status: 'solved', // Assuming solved when user manually clicks complete
      date: new Date().toISOString(),
      hintsUsed: this.hintsUsed,
      pauseCount: this.pauseCount,
      breakdown: this.getBreakdown()
    };
  }

  public expire(solved: boolean): SessionResult {
    this.cleanup();
    this.status = 'completed';
    this.notify();

    return {
      id: this.id,
      difficulty: this.difficulty,
      durationSeconds: this.durationSeconds,
      elapsedSeconds: this.elapsedSeconds,
      status: solved ? 'solved' : 'unsolved',
      date: new Date().toISOString(),
      hintsUsed: this.hintsUsed,
      pauseCount: this.pauseCount,
      breakdown: this.getBreakdown()
    };
  }

  public giveUp(): SessionResult {
    this.cleanup();
    this.status = 'completed';
    this.notify();

    return {
      id: this.id,
      difficulty: this.difficulty,
      durationSeconds: this.durationSeconds,
      elapsedSeconds: this.elapsedSeconds,
      status: 'gave_up',
      date: new Date().toISOString(),
      hintsUsed: this.hintsUsed,
      pauseCount: this.pauseCount,
      breakdown: this.getBreakdown()
    };
  }

  public selectPhase(index: number) {
    if (index >= 0 && index < this.phases.length) {
      this.isManualPhase = true;
      this.currentPhaseIndex = index;
      this.notify();
    }
  }

  public incrementHints() {
    this.hintsUsed++;
    this.notify();
  }

  private startInterval() {
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getAbsoluteElapsedSeconds(): number {
    if (this.status === 'running') {
      return Math.floor((this.accumulatedElapsedMs + (Date.now() - this.lastResumeTime)) / 1000);
    }
    return Math.floor(this.accumulatedElapsedMs / 1000);
  }

  public sync() {
    this.tick();
  }

  private tick() {
    const totalElapsed = this.getAbsoluteElapsedSeconds();
    const secondsToAdvance = totalElapsed - this.elapsedSeconds;

    if (secondsToAdvance <= 0) {
      return;
    }

    for (let i = 0; i < secondsToAdvance; i++) {
      if (this.remainingSeconds <= 0) {
        this.status = 'expired';
        this.stopInterval();
        this.notify();
        return;
      }

      if (this.remainingSeconds === 1) {
        this.remainingSeconds = 0;
        this.elapsedSeconds++;
        this.trackTime();
        this.status = 'expired';
        this.stopInterval();
        this.notify();
        return;
      }

      this.remainingSeconds--;
      this.elapsedSeconds++;
      this.trackTime();

      // Check if we should update phase automatically based on elapsed time (in minutes)
      if (!this.isManualPhase) {
        const elapsedMinutes = Math.floor(this.elapsedSeconds / 60);
        let targetPhaseIndex = 0;
        for (let j = 0; j < this.phases.length; j++) {
          const range = this.phases[j].recommendedRange;
          if (elapsedMinutes >= range[0] && elapsedMinutes < range[1]) {
            targetPhaseIndex = j;
          }
        }
        // If the elapsed time has exceeded the recommended range, lock to the last phase
        if (elapsedMinutes >= this.phases[this.phases.length - 1].recommendedRange[1]) {
          targetPhaseIndex = this.phases.length - 1;
        }

        if (targetPhaseIndex !== this.currentPhaseIndex) {
          this.currentPhaseIndex = targetPhaseIndex;
        }
      }
    }

    // Check for coaching message alert
    const coachingMsg = getCoachingMessage(this.difficulty, this.elapsedSeconds, this.durationSeconds);
    if (coachingMsg.message !== this.lastCoachingMessageText) {
      this.lastCoachingMessageText = coachingMsg.message;
      if (this.onCoachingAlert) {
        this.onCoachingAlert(coachingMsg.emoji, coachingMsg.message);
      }
    }

    this.notify();
  }

  private trackTime() {
    const activePhase = this.phases[this.currentPhaseIndex];
    if (activePhase) {
      if (activePhase.key === 'thinkingSeconds') {
        this.thinkingSeconds++;
      } else if (activePhase.key === 'codingSeconds') {
        this.codingSeconds++;
      } else if (activePhase.key === 'reviewSeconds') {
        this.reviewSeconds++;
      }
    }
  }

  private getBreakdown(): TimeBreakdown {
    return {
      thinkingSeconds: this.thinkingSeconds,
      codingSeconds: this.codingSeconds,
      reviewSeconds: this.reviewSeconds
    };
  }

  private cleanup() {
    if (this.status === 'running') {
      this.tick();
    }
    this.stopInterval();
  }

  public getCoachingMessage() {
    return getCoachingMessage(this.difficulty, this.elapsedSeconds, this.durationSeconds);
  }

  public getActivePhase() {
    return this.phases[this.currentPhaseIndex];
  }
}
