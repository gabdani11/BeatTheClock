import { Difficulty, CoachingMessage, ChallengePhase } from './types';
export declare const DEFAULT_TIMES: {
    easy: number;
    medium: number;
    hard: number;
    custom: number;
};
export declare const COACHING_MESSAGES: Record<Exclude<Difficulty, 'custom'>, CoachingMessage[]>;
export declare const PHASES: Record<Exclude<Difficulty, 'custom'>, ChallengePhase[]>;
export declare const COACHING_HINTS: string[];
/**
 * Returns the relevant coaching messages for a custom timer length
 */
export declare function getCustomCoachingMessages(durationSeconds: number): CoachingMessage[];
/**
 * Returns the relevant phases for a custom timer length
 */
export declare function getCustomPhases(durationSeconds: number): ChallengePhase[];
/**
 * Gets the active coaching message based on elapsed seconds
 */
export declare function getCoachingMessage(difficulty: Difficulty, elapsedSeconds: number, durationSeconds: number): CoachingMessage;
