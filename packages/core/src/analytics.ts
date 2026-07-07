import { SessionResult, Streak } from './types';

// Helper to get local date string YYYY-MM-DD
export function getLocalDateString(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateStreaks(sessions: SessionResult[]): Streak {
  const solvedDates = Array.from(
    new Set(
      sessions
        .filter(s => s.status === 'solved')
        .map(s => getLocalDateString(s.date))
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

  if (solvedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const todayStr = getLocalDateString(new Date().toISOString());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000).toISOString());

  // Determine if current streak is active (must have solved something today or yesterday)
  const hasSolvedRecently = solvedDates[0] === todayStr || solvedDates[0] === yesterdayStr;
  
  let currentStreak = 0;
  if (hasSolvedRecently) {
    currentStreak = 1;
    let expectedDate = new Date(solvedDates[0]);
    
    for (let i = 1; i < solvedDates.length; i++) {
      // Subtract 1 day
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedStr = getLocalDateString(expectedDate.toISOString());
      
      if (solvedDates[i] === expectedStr) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  if (solvedDates.length > 0) {
    let tempStreak = 1;
    let prevDate = new Date(solvedDates[0]);
    longestStreak = 1;

    for (let i = 1; i < solvedDates.length; i++) {
      const currDate = new Date(solvedDates[i]);
      const diffTime = prevDate.getTime() - currDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1; // reset
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = currDate;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastChallengeDate: solvedDates[0]
  };
}

export interface GeneralStats {
  totalAttempted: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  customSolved: number;
  completionRate: number; // percentage (0-100)
  totalCodingHours: number;
  averageSolveTime: number; // in seconds
  streaks: Streak;
}

export interface TimeAnalytics {
  avgThinkingTime: number; // in seconds
  avgCodingTime: number; // in seconds
  avgReviewTime: number; // in seconds
  avgPauseCount: number;
  fastestSolve: number | null; // in seconds
  slowestSolve: number | null; // in seconds
}

export interface WeeklyProgress {
  challengesCompletedThisWeek: number;
  totalPracticeTimeThisWeek: number; // seconds
  solvedThisWeek: number;
  improvementPercentage: number; // percentage comparison with last week's solve speed or volume
}

export function calculateGeneralStats(sessions: SessionResult[]): GeneralStats {
  const totalAttempted = sessions.length;
  const solvedSessions = sessions.filter(s => s.status === 'solved');
  const totalSolved = solvedSessions.length;

  const easySolved = solvedSessions.filter(s => s.difficulty === 'easy').length;
  const mediumSolved = solvedSessions.filter(s => s.difficulty === 'medium').length;
  const hardSolved = solvedSessions.filter(s => s.difficulty === 'hard').length;
  const customSolved = solvedSessions.filter(s => s.difficulty === 'custom').length;

  const completionRate = totalAttempted > 0 ? (totalSolved / totalAttempted) * 100 : 0;
  
  const totalCodingSeconds = sessions.reduce((acc, curr) => acc + curr.elapsedSeconds, 0);
  const totalCodingHours = Number((totalCodingSeconds / 3600).toFixed(2));

  const averageSolveTime = solvedSessions.length > 0 
    ? Math.round(solvedSessions.reduce((acc, curr) => acc + curr.elapsedSeconds, 0) / solvedSessions.length)
    : 0;

  const streaks = calculateStreaks(sessions);

  return {
    totalAttempted,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    customSolved,
    completionRate: Math.round(completionRate),
    totalCodingHours,
    averageSolveTime,
    streaks
  };
}

export function calculateTimeAnalytics(sessions: SessionResult[]): TimeAnalytics {
  const solved = sessions.filter(s => s.status === 'solved');
  const total = sessions.length;

  if (total === 0) {
    return {
      avgThinkingTime: 0,
      avgCodingTime: 0,
      avgReviewTime: 0,
      avgPauseCount: 0,
      fastestSolve: null,
      slowestSolve: null
    };
  }

  const avgThinkingTime = Math.round(
    sessions.reduce((acc, curr) => acc + curr.breakdown.thinkingSeconds, 0) / total
  );
  const avgCodingTime = Math.round(
    sessions.reduce((acc, curr) => acc + curr.breakdown.codingSeconds, 0) / total
  );
  const avgReviewTime = Math.round(
    sessions.reduce((acc, curr) => acc + curr.breakdown.reviewSeconds, 0) / total
  );
  const avgPauseCount = Number(
    (sessions.reduce((acc, curr) => acc + curr.pauseCount, 0) / total).toFixed(1)
  );

  let fastestSolve: number | null = null;
  let slowestSolve: number | null = null;

  if (solved.length > 0) {
    const times = solved.map(s => s.elapsedSeconds);
    fastestSolve = Math.min(...times);
    slowestSolve = Math.max(...times);
  }

  return {
    avgThinkingTime,
    avgCodingTime,
    avgReviewTime,
    avgPauseCount,
    fastestSolve,
    slowestSolve
  };
}

export function calculateWeeklyProgress(sessions: SessionResult[]): WeeklyProgress {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const thisWeekSessions = sessions.filter(s => new Date(s.date).getTime() >= oneWeekAgo);
  const lastWeekSessions = sessions.filter(s => {
    const t = new Date(s.date).getTime();
    return t >= twoWeeksAgo && t < oneWeekAgo;
  });

  const challengesCompletedThisWeek = thisWeekSessions.length;
  const totalPracticeTimeThisWeek = thisWeekSessions.reduce((acc, curr) => acc + curr.elapsedSeconds, 0);
  const solvedThisWeek = thisWeekSessions.filter(s => s.status === 'solved').length;

  const solvedLastWeek = lastWeekSessions.filter(s => s.status === 'solved').length;

  // Improvement = percentage change in solved count
  let improvementPercentage = 0;
  if (solvedLastWeek > 0) {
    improvementPercentage = Math.round(((solvedThisWeek - solvedLastWeek) / solvedLastWeek) * 100);
  } else if (solvedThisWeek > 0) {
    improvementPercentage = 100; // From 0 to something
  }

  return {
    challengesCompletedThisWeek,
    totalPracticeTimeThisWeek,
    solvedThisWeek,
    improvementPercentage
  };
}
