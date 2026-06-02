/* dashboard.userScoring.js
   Central 5-day experiment scoring model for Sole.

   This file handles:
   - experiment day caps
   - believable candidate pool narrowing
   - confidence pacing
   - diminishing returns
   - future manual boosts / adjustments

   It does NOT directly update the UI yet.
*/

const SOLE_EXPERIMENT_TOTAL_DAYS = 5;
const SOLE_DEFAULT_CANDIDATE_POOL = 102437;

const SOLE_DAY_CAPS = {
  1: {
    day: 1,
    confidenceMin: 0,
    confidenceMax: 46,
    connectionMax: 48,
    attractionMax: 48,
    candidatePoolMin: 42000,
    stage: "Baseline compatibility calibration"
  },

  2: {
    day: 2,
    confidenceMin: 0,
    confidenceMax: 62,
    connectionMax: 64,
    attractionMax: 64,
    candidatePoolMin: 14500,
    stage: "Initial compatibility filtering"
  },

  3: {
    day: 3,
    confidenceMin: 0,
    confidenceMax: 78,
    connectionMax: 80,
    attractionMax: 78,
    candidatePoolMin: 2400,
    stage: "Conversational style mapping"
  },

  4: {
    day: 4,
    confidenceMin: 0,
    confidenceMax: 90,
    connectionMax: 92,
    attractionMax: 90,
    candidatePoolMin: 83,
    stage: "Behavioural alignment in progress"
  },

  5: {
    day: 5,
    confidenceMin: 0,
    confidenceMax: 100,
    connectionMax: 96,
    attractionMax: 96,
    candidatePoolMin: 1,
    stage: "Final compatibility resolution"
  }
};

const SOLE_SCORE_BUDGETS = {
  1: {
    connection: {
      quiz: 28,
      messages: 15,
      tasks: 5
    },
    attraction: {
      quiz: 28,
      messages: 10,
      tasks: 5
    }
  },

  2: {
    connection: {
      quiz: 38,
      messages: 11,
      tasks: 10
    },
    attraction: {
      quiz: 35,
      messages: 10,
      tasks: 9
    }
  },

  3: {
    connection: {
      quiz: 48,
      messages: 9,
      tasks: 12
    },
    attraction: {
      quiz: 49,
      messages: 8,
      tasks: 10
    }
  },

  4: {
    connection: {
      quiz: 58,
      messages: 7,
      tasks: 17
    },
    attraction: {
      quiz: 59,
      messages: 6,
      tasks: 14
    }
  },

  5: {
    connection: {
      quiz: 72,
      messages: 6,
      tasks: 22
    },
    attraction: {
      quiz: 73,
      messages: 5,
      tasks: 22
    }
  }
};

function soleGetScoreBudget(dayIndex) {
  return SOLE_SCORE_BUDGETS[dayIndex] || SOLE_SCORE_BUDGETS[1];
}

function soleSignalToBudgetPoints(signal, budget) {
  return soleClamp(signal, 0, 100) / 100 * Number(budget || 0);
}

function soleClamp(value, min = 0, max = 100) {
  const num = Number(value);

  if (!Number.isFinite(num)) return min;

  return Math.max(min, Math.min(max, num));
}

function soleRound(value, decimals = 0) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(Number(value || 0) * multiplier) / multiplier;
}

function soleGetDayCaps(dayIndex) {
  const day = soleClamp(Math.round(Number(dayIndex) || 1), 1, SOLE_EXPERIMENT_TOTAL_DAYS);
  return SOLE_DAY_CAPS[day] || SOLE_DAY_CAPS[SOLE_EXPERIMENT_TOTAL_DAYS];
}

function soleEaseOutQuad(t) {
  const clamped = soleClamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 2);
}

function soleDiminishingReturns(value, target) {
  const numericValue = Math.max(0, Number(value) || 0);
  const numericTarget = Math.max(1, Number(target) || 1);

  return soleClamp(1 - Math.exp(-numericValue / numericTarget), 0, 1);
}

function soleResolveExperimentDayFromUser(user, now = new Date()) {
  const manualDay =
    user?.experiment_day_override ??
    user?.experimentDayOverride;

  if (
    manualDay !== null &&
    manualDay !== undefined &&
    manualDay !== ""
  ) {
    return soleClamp(
      Math.round(Number(manualDay)),
      1,
      SOLE_EXPERIMENT_TOTAL_DAYS
    );
  }

  const startedAt =
    user?.experiment_starts_at ||
    user?.experimentStartedAt ||
    user?.created_at ||
    user?.createdAt;

  if (!startedAt) return 1;

  const startDate = new Date(startedAt);
  const nowDate = new Date(now);

  if (Number.isNaN(startDate.getTime())) return 1;

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.floor((nowDate - startDate) / msPerDay);

  return soleClamp(daysElapsed + 1, 1, SOLE_EXPERIMENT_TOTAL_DAYS);
}

function soleGetExperimentDayIndex(user, now = new Date()) {
  return soleResolveExperimentDayFromUser(user, now);
}

function soleGetMessageSignal({
  sentCount = 0,
  receivedCount = 0,
  totalMessages,
  averageMessageLength = 0,
  activeSessions = 1
} = {}) {
  const sent = Math.max(0, Number(sentCount) || 0);
  const received = Math.max(0, Number(receivedCount) || 0);
  const total = Math.max(0, Number(totalMessages ?? sent + received) || 0);

  const volumeSignal = soleDiminishingReturns(total, 80);

  const balanceRatio =
    total <= 0
      ? 0
      : Math.min(sent, received) / Math.max(sent, received, 1);

  const balanceSignal = soleClamp(balanceRatio, 0, 1);

  const lengthSignal = soleDiminishingReturns(averageMessageLength, 180);
  const sessionSignal = soleDiminishingReturns(activeSessions, 4);

  return soleClamp(
    (
      volumeSignal * 0.42 +
      balanceSignal * 0.28 +
      lengthSignal * 0.15 +
      sessionSignal * 0.15
    ) * 100
  );
}

function soleGetQuizSignal({
  completed = 0,
  available = 0,
  completionFraction
} = {}) {
  if (Number.isFinite(Number(completionFraction))) {
    return soleClamp(Number(completionFraction) * 100);
  }

  const completedCount = Math.max(0, Number(completed) || 0);
  const availableCount = Math.max(1, Number(available) || 1);

  return soleClamp((completedCount / availableCount) * 100);
}

function soleApplyAdjustments(score, adjustments = {}) {
  return {
    connection: Number(score.connection || 0) + Number(adjustments.connectionDelta || 0),
    attraction: Number(score.attraction || 0) + Number(adjustments.attractionDelta || 0),
    confidence: Number(score.confidence || 0) + Number(adjustments.confidenceDelta || 0),
    candidates:
      Number(score.candidates || SOLE_DEFAULT_CANDIDATE_POOL) +
      Number(adjustments.candidatePoolDelta || 0)
  };
}

function soleCalculateCandidatePool({
  progress = 0,
  dayIndex = 1,
  startingCandidates = SOLE_DEFAULT_CANDIDATE_POOL
} = {}) {
  const caps = soleGetDayCaps(dayIndex);
  const normalized = soleClamp(progress, 0, 100) / 100;

  const remaining =
    1 +
    Math.round(
      (startingCandidates - 1) *
      Math.pow(1 - normalized, 2.35)
    );

  return Math.max(caps.candidatePoolMin, remaining);
}

function soleCalculateExperimentScore({
  user,
  dayIndex,
  messageSignal = 0,
  connectionQuizSignal = 0,
  attractionQuizSignal = 0,
  taskSignal = 0,
  adjustments = {},
  baselines = {},
  startingCandidates = SOLE_DEFAULT_CANDIDATE_POOL
} = {}) {
  const resolvedDayIndex = dayIndex || soleGetExperimentDayIndex(user);
  const caps = soleGetDayCaps(resolvedDayIndex);
  const budget = soleGetScoreBudget(resolvedDayIndex);

  const connectionBaseline = Number(baselines.connection || 0);
  const attractionBaseline = Number(baselines.attraction || 0);
  const confidenceBaseline = Number(baselines.confidence || 0);

  const candidateBaseline =
    Number.isFinite(Number(baselines.candidates)) && Number(baselines.candidates) > 0
      ? Number(baselines.candidates)
      : startingCandidates;

  /**
   * Score lanes:
   * - quizzes are the main engine
   * - messages are a capped reserve, more generous early
   * - tasks are a chunky uplift lane
   */
  const connectionQuizPoints = soleSignalToBudgetPoints(
    connectionQuizSignal,
    budget.connection.quiz
  );

  const connectionMessagePoints = soleSignalToBudgetPoints(
    messageSignal,
    budget.connection.messages
  );

  const connectionTaskPoints = soleSignalToBudgetPoints(
    taskSignal,
    budget.connection.tasks
  );

  const attractionQuizPoints = soleSignalToBudgetPoints(
    attractionQuizSignal,
    budget.attraction.quiz
  );

  const attractionMessagePoints = soleSignalToBudgetPoints(
    messageSignal,
    budget.attraction.messages
  );

  const attractionTaskPoints = soleSignalToBudgetPoints(
    taskSignal,
    budget.attraction.tasks
  );

  const connectionProgress =
    connectionQuizPoints +
    connectionMessagePoints +
    connectionTaskPoints;

  const attractionProgress =
    attractionQuizPoints +
    attractionMessagePoints +
    attractionTaskPoints;

  const connectionBeforeCaps =
    connectionBaseline +
    connectionProgress +
    Number(adjustments.connectionDelta || 0);

  const attractionBeforeCaps =
    attractionBaseline +
    attractionProgress +
    Number(adjustments.attractionDelta || 0);

  const connection = soleClamp(
    connectionBeforeCaps,
    0,
    caps.connectionMax
  );

  const attraction = soleClamp(
    attractionBeforeCaps,
    0,
    caps.attractionMax
  );

  /**
   * Confidence should rise best when Connection and Attraction rise together.
   * It is deliberately tied to the weaker side, so lopsided scores do not
   * create fake certainty.
   */
  const connectionGrowth = Math.max(0, connection - connectionBaseline);
  const attractionGrowth = Math.max(0, attraction - attractionBaseline);

  const averageGrowth = (connectionGrowth + attractionGrowth) / 2;
  const balancedGrowth = Math.min(connectionGrowth, attractionGrowth);

  const confidenceGrowth =
    averageGrowth * 0.45 +
    balancedGrowth * 0.55;

  const confidenceBeforeCaps =
    confidenceBaseline +
    confidenceGrowth +
    Number(adjustments.confidenceDelta || 0);

  const confidence = soleClamp(
    confidenceBeforeCaps,
    0,
    caps.confidenceMax
  );

  /**
   * Candidate narrowing should be hardest.
   * It depends on Connection, Attraction and Confidence, then applies
   * a conservative curve so the pool only collapses late.
   */
  const averageSignal = (connection + attraction) / 2;
  const balancedSignal = Math.min(connection, attraction);

  const matchCertainty =
    connection * 0.28 +
    attraction * 0.28 +
    confidence * 0.44;

  const balanceRatio =
    averageSignal > 0
      ? balancedSignal / averageSignal
      : 0;

  const balanceFactor = 0.72 + balanceRatio * 0.28;

const candidateProgress = Math.pow(
  soleClamp((matchCertainty / 100) * balanceFactor, 0, 1),
  1.45
);

  const calculatedCandidates =
    1 +
    Math.round(
      (candidateBaseline - 1) *
      (1 - candidateProgress)
    );

  const candidates = Math.max(
    caps.candidatePoolMin,
    Math.round(
      Math.max(
        1,
        calculatedCandidates + Number(adjustments.candidatePoolDelta || 0)
      )
    )
  );

  return {
    dayIndex: resolvedDayIndex,
    totalDays: SOLE_EXPERIMENT_TOTAL_DAYS,

    connection: soleRound(connection, 1),
    attraction: soleRound(attraction, 1),
    confidence: soleRound(confidence, 1),
    candidates,

    raw: {
      connection: soleRound(connectionProgress, 2),
      attraction: soleRound(attractionProgress, 2),
      confidence: soleRound(confidenceGrowth, 2),
      candidateProgress: soleRound(candidateProgress * 100, 2),

      breakdown: {
        connection: {
          baseline: soleRound(connectionBaseline, 1),
          quiz: soleRound(connectionQuizPoints, 2),
          messages: soleRound(connectionMessagePoints, 2),
          tasks: soleRound(connectionTaskPoints, 2),
          delta: Number(adjustments.connectionDelta || 0)
        },

        attraction: {
          baseline: soleRound(attractionBaseline, 1),
          quiz: soleRound(attractionQuizPoints, 2),
          messages: soleRound(attractionMessagePoints, 2),
          tasks: soleRound(attractionTaskPoints, 2),
          delta: Number(adjustments.attractionDelta || 0)
        },

        confidence: {
          baseline: soleRound(confidenceBaseline, 1),
          growth: soleRound(confidenceGrowth, 2),
          delta: Number(adjustments.confidenceDelta || 0)
        },

        candidates: {
          baseline: Math.round(candidateBaseline),
          progress: soleRound(candidateProgress * 100, 2),
          delta: Number(adjustments.candidatePoolDelta || 0)
        }
      }
    },

    caps,
    budget,
    stage: caps.stage,
    startingCandidates
  };
}

function soleFormatCandidateCount(value) {
  return Number(value || 0).toLocaleString();
}

window.soleExperimentScoring = {
  TOTAL_DAYS: SOLE_EXPERIMENT_TOTAL_DAYS,
  DEFAULT_CANDIDATE_POOL: SOLE_DEFAULT_CANDIDATE_POOL,
  DAY_CAPS: SOLE_DAY_CAPS,

  clamp: soleClamp,
  round: soleRound,
  getDayCaps: soleGetDayCaps,
  resolveExperimentDayFromUser: soleResolveExperimentDayFromUser,
  getExperimentDayIndex: soleGetExperimentDayIndex,
  diminishingReturns: soleDiminishingReturns,

  getMessageSignal: soleGetMessageSignal,
  getQuizSignal: soleGetQuizSignal,
  calculateCandidatePool: soleCalculateCandidatePool,
  calculateExperimentScore: soleCalculateExperimentScore,

  formatCandidateCount: soleFormatCandidateCount
};