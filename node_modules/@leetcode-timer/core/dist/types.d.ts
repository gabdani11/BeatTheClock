export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';
export type ChallengeStatus = 'idle' | 'running' | 'paused' | 'completed' | 'expired';
export type SessionStatus = 'solved' | 'unsolved' | 'gave_up';
export interface TimeBreakdown {
    thinkingSeconds: number;
    codingSeconds: number;
    reviewSeconds: number;
}
export interface SessionResult {
    id: string;
    difficulty: Difficulty;
    durationSeconds: number;
    elapsedSeconds: number;
    status: SessionStatus;
    date: string;
    hintsUsed: number;
    pauseCount: number;
    breakdown: TimeBreakdown;
    note?: string;
}
export interface Streak {
    currentStreak: number;
    longestStreak: number;
    lastChallengeDate?: string;
}
export interface CoachingMessage {
    timeInSeconds: number;
    message: string;
    emoji: string;
}
export interface ChallengePhase {
    name: string;
    key: keyof TimeBreakdown;
    label: string;
    recommendedRange: [number, number];
}
