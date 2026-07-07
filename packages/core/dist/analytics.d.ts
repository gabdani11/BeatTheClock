import { SessionResult, Streak } from './types';
export declare function getLocalDateString(dateStr: string): string;
export declare function calculateStreaks(sessions: SessionResult[]): Streak;
export interface GeneralStats {
    totalAttempted: number;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    customSolved: number;
    completionRate: number;
    totalCodingHours: number;
    averageSolveTime: number;
    streaks: Streak;
}
export interface TimeAnalytics {
    avgThinkingTime: number;
    avgCodingTime: number;
    avgReviewTime: number;
    avgPauseCount: number;
    fastestSolve: number | null;
    slowestSolve: number | null;
}
export interface WeeklyProgress {
    challengesCompletedThisWeek: number;
    totalPracticeTimeThisWeek: number;
    solvedThisWeek: number;
    improvementPercentage: number;
}
export declare function calculateGeneralStats(sessions: SessionResult[]): GeneralStats;
export declare function calculateTimeAnalytics(sessions: SessionResult[]): TimeAnalytics;
export declare function calculateWeeklyProgress(sessions: SessionResult[]): WeeklyProgress;
