import { DEFAULT_TIMES, PHASES, getCustomPhases, getCoachingMessage } from './coaching';
export class BeatTheClockTimer {
    id;
    difficulty = 'medium';
    status = 'idle';
    durationSeconds = DEFAULT_TIMES.medium;
    remainingSeconds = DEFAULT_TIMES.medium;
    elapsedSeconds = 0;
    pauseCount = 0;
    hintsUsed = 0;
    // Current active phase
    currentPhaseIndex = 0;
    phases = PHASES.medium;
    // Phase breakdown tracking
    thinkingSeconds = 0;
    codingSeconds = 0;
    reviewSeconds = 0;
    isManualPhase = false;
    intervalId = null;
    lastCoachingMessageText = '';
    // Event listeners
    listeners = [];
    onCoachingAlert;
    constructor() {
        this.id = Math.random().toString(36).substring(2, 11);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    notify() {
        this.listeners.forEach(l => l());
    }
    start(difficulty, customDurationMinutes) {
        this.cleanup();
        this.id = Math.random().toString(36).substring(2, 11);
        this.difficulty = difficulty;
        if (difficulty === 'custom') {
            const minutes = customDurationMinutes || 30;
            this.durationSeconds = minutes * 60;
            this.phases = getCustomPhases(this.durationSeconds);
        }
        else {
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
        // Get initial coaching message
        const msg = getCoachingMessage(this.difficulty, 0, this.durationSeconds);
        this.lastCoachingMessageText = msg.message;
        this.startInterval();
        this.notify();
    }
    pause() {
        if (this.status !== 'running')
            return;
        this.status = 'paused';
        this.pauseCount++;
        this.stopInterval();
        this.notify();
    }
    resume() {
        if (this.status !== 'paused')
            return;
        this.status = 'running';
        this.startInterval();
        this.notify();
    }
    stop() {
        this.cleanup();
        this.status = 'idle';
        this.notify();
    }
    complete() {
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
    expire(solved) {
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
    giveUp() {
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
    selectPhase(index) {
        if (index >= 0 && index < this.phases.length) {
            this.isManualPhase = true;
            this.currentPhaseIndex = index;
            this.notify();
        }
    }
    incrementHints() {
        this.hintsUsed++;
        this.notify();
    }
    startInterval() {
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }
    stopInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    tick() {
        if (this.remainingSeconds <= 1) {
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
            for (let i = 0; i < this.phases.length; i++) {
                const range = this.phases[i].recommendedRange;
                if (elapsedMinutes >= range[0] && elapsedMinutes < range[1]) {
                    targetPhaseIndex = i;
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
    trackTime() {
        const activePhase = this.phases[this.currentPhaseIndex];
        if (activePhase) {
            if (activePhase.key === 'thinkingSeconds') {
                this.thinkingSeconds++;
            }
            else if (activePhase.key === 'codingSeconds') {
                this.codingSeconds++;
            }
            else if (activePhase.key === 'reviewSeconds') {
                this.reviewSeconds++;
            }
        }
    }
    getBreakdown() {
        return {
            thinkingSeconds: this.thinkingSeconds,
            codingSeconds: this.codingSeconds,
            reviewSeconds: this.reviewSeconds
        };
    }
    cleanup() {
        this.stopInterval();
    }
    getCoachingMessage() {
        return getCoachingMessage(this.difficulty, this.elapsedSeconds, this.durationSeconds);
    }
    getActivePhase() {
        return this.phases[this.currentPhaseIndex];
    }
}
