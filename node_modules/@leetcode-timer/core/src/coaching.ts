import { Difficulty, CoachingMessage, ChallengePhase } from './types';

export const DEFAULT_TIMES = {
  easy: 20 * 60, // 20 minutes in seconds
  medium: 40 * 60, // 40 minutes in seconds
  hard: 60 * 60, // 60 minutes in seconds
  custom: 30 * 60, // Default custom is 30 mins
};

export const COACHING_MESSAGES: Record<Exclude<Difficulty, 'custom'>, CoachingMessage[]> = {
  easy: [
    { timeInSeconds: 0, emoji: '📖', message: 'Read the problem carefully before thinking about code.' },
    { timeInSeconds: 2 * 60, emoji: '✍️', message: 'Understand the input, output, and constraints.' },
    { timeInSeconds: 5 * 60, emoji: '🧠', message: 'Think about the simplest brute-force solution.' },
    { timeInSeconds: 8 * 60, emoji: '📈', message: 'Can the algorithm be optimized?' },
    { timeInSeconds: 12 * 60, emoji: '💻', message: 'Begin implementing your solution.' },
    { timeInSeconds: 16 * 60, emoji: '🧪', message: 'Test with edge cases (e.g. empty lists, single items, boundaries).' },
    { timeInSeconds: 19 * 60, emoji: '✅', message: 'Review your solution before submitting.' }
  ],
  medium: [
    { timeInSeconds: 0, emoji: '📖', message: 'Read every detail of the problem carefully.' },
    { timeInSeconds: 5 * 60, emoji: '🔍', message: 'Identify the algorithm or data structure (e.g. Map, Two Pointers).' },
    { timeInSeconds: 10 * 60, emoji: '🧠', message: 'Write down the brute-force idea first.' },
    { timeInSeconds: 15 * 60, emoji: '⚡', message: 'Think about optimization opportunities (Time/Space trade-offs).' },
    { timeInSeconds: 20 * 60, emoji: '💻', message: 'Start coding only if your approach is clear.' },
    { timeInSeconds: 30 * 60, emoji: '🧪', message: 'Test edge cases and verify correctness.' },
    { timeInSeconds: 35 * 60, emoji: '🔍', message: 'Check for bugs and optimize further if possible.' },
    { timeInSeconds: 39 * 60, emoji: '🚀', message: 'Final review before submission.' }
  ],
  hard: [
    { timeInSeconds: 0, emoji: '📖', message: 'Fully understand the problem before coding.' },
    { timeInSeconds: 8 * 60, emoji: '✍️', message: 'Break the problem into smaller pieces/sub-tasks.' },
    { timeInSeconds: 15 * 60, emoji: '🧠', message: 'Write a brute-force approach first.' },
    { timeInSeconds: 25 * 60, emoji: '🔄', message: 'Search for optimization opportunities.' },
    { timeInSeconds: 35 * 60, emoji: '📊', message: 'Analyze Time and Space Complexity.' },
    { timeInSeconds: 45 * 60, emoji: '💻', message: 'Finish implementing your solution.' },
    { timeInSeconds: 55 * 60, emoji: '🧪', message: 'Test every edge case carefully.' },
    { timeInSeconds: 59 * 60, emoji: '✅', message: 'Perform one final review before submitting.' }
  ]
};

// Phases definition for time tracking
export const PHASES: Record<Exclude<Difficulty, 'custom'>, ChallengePhase[]> = {
  easy: [
    { name: 'Understand', key: 'thinkingSeconds', label: '📖 Understand', recommendedRange: [0, 5] },
    { name: 'Plan & Optimize', key: 'thinkingSeconds', label: '🧠 Plan & Optimize', recommendedRange: [5, 12] },
    { name: 'Code', key: 'codingSeconds', label: '💻 Code', recommendedRange: [12, 16] },
    { name: 'Test & Review', key: 'reviewSeconds', label: '🧪 Test & Review', recommendedRange: [16, 20] }
  ],
  medium: [
    { name: 'Understand', key: 'thinkingSeconds', label: '📖 Understand', recommendedRange: [0, 10] },
    { name: 'Plan & Optimize', key: 'thinkingSeconds', label: '🧠 Plan & Optimize', recommendedRange: [10, 20] },
    { name: 'Code', key: 'codingSeconds', label: '💻 Code', recommendedRange: [20, 30] },
    { name: 'Test & Review', key: 'reviewSeconds', label: '🧪 Test & Review', recommendedRange: [30, 40] }
  ],
  hard: [
    { name: 'Understand', key: 'thinkingSeconds', label: '📖 Understand', recommendedRange: [0, 15] },
    { name: 'Plan & Optimize', key: 'thinkingSeconds', label: '🧠 Plan & Optimize', recommendedRange: [15, 45] },
    { name: 'Code', key: 'codingSeconds', label: '💻 Code', recommendedRange: [45, 55] },
    { name: 'Test & Review', key: 'reviewSeconds', label: '🧪 Test & Review', recommendedRange: [55, 60] }
  ]
};

export const COACHING_HINTS = [
  'Have you identified the problem pattern? (e.g. sliding window, DFS, binary search)',
  'Can this be solved with less memory? (e.g. in-place modifications instead of auxiliary structures)',
  'Think about the brute-force solution first - how bad is it?',
  'What data structure fits this problem? (e.g. stack, queue, priority queue, hash set)',
  'Can you reduce repeated work by caching results? (e.g. memoization, dynamic programming)',
  'Have you considered edge cases? (empty inputs, negative numbers, extreme values, duplicates)',
  'What is your algorithm\'s current Time and Space Complexity? Can you prove it?',
  'If you are stuck, try dry-running a small example manually on paper/comments step-by-step.'
];

/**
 * Returns the relevant coaching messages for a custom timer length
 */
export function getCustomCoachingMessages(durationSeconds: number): CoachingMessage[] {
  const percentMap = [
    { pct: 0.0, emoji: '📖', message: 'Read the problem and understand requirements.' },
    { pct: 0.1, emoji: '✍️', message: 'Check input/output constraints and identify patterns.' },
    { pct: 0.25, emoji: '🧠', message: 'Think of brute force and optimization opportunities.' },
    { pct: 0.5, emoji: '💻', message: 'Start writing code once your plan is clear.' },
    { pct: 0.8, emoji: '🧪', message: 'Test with edge cases and optimize memory/speed.' },
    { pct: 0.95, emoji: '✅', message: 'Perform a final review and dry-run code.' }
  ];

  return percentMap.map(item => ({
    timeInSeconds: Math.floor(item.pct * durationSeconds),
    emoji: item.emoji,
    message: item.message
  }));
}

/**
 * Returns the relevant phases for a custom timer length
 */
export function getCustomPhases(durationSeconds: number): ChallengePhase[] {
  const mins = durationSeconds / 60;
  return [
    { name: 'Understand', key: 'thinkingSeconds', label: '📖 Understand', recommendedRange: [0, Math.floor(mins * 0.25)] },
    { name: 'Plan & Optimize', key: 'thinkingSeconds', label: '🧠 Plan & Optimize', recommendedRange: [Math.floor(mins * 0.25), Math.floor(mins * 0.5)] },
    { name: 'Code', key: 'codingSeconds', label: '💻 Code', recommendedRange: [Math.floor(mins * 0.5), Math.floor(mins * 0.8)] },
    { name: 'Test & Review', key: 'reviewSeconds', label: '🧪 Test & Review', recommendedRange: [Math.floor(mins * 0.8), mins] }
  ];
}

/**
 * Gets the active coaching message based on elapsed seconds
 */
export function getCoachingMessage(difficulty: Difficulty, elapsedSeconds: number, durationSeconds: number): CoachingMessage {
  const messages = difficulty === 'custom' 
    ? getCustomCoachingMessages(durationSeconds) 
    : COACHING_MESSAGES[difficulty];

  // Find the message with the highest trigger time that is less than or equal to elapsedSeconds
  let activeMessage = messages[0];
  for (const msg of messages) {
    if (elapsedSeconds >= msg.timeInSeconds) {
      activeMessage = msg;
    } else {
      break;
    }
  }
  return activeMessage;
}
