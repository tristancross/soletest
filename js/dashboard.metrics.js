
const dashboardResponseCache = new Map();
const dashboardProgressCache = new Map();

function getStoredDashboardResponses(me) {
  if (!me?.id) return {};
  return dashboardResponseCache.get(me.id) || {};
}

function saveStoredDashboardResponses(me, responses) {
  if (!me?.id) return;
  dashboardResponseCache.set(me.id, responses || {});
}

function getStoredDashboardProgress(me) {
  if (!me?.id) return {};
  return dashboardProgressCache.get(me.id) || {};
}

function saveStoredDashboardProgress(me, progress) {
  if (!me?.id) return;
  dashboardProgressCache.set(me.id, progress || {});
}

function getAssignmentProgress(me, assignmentId) {
  const progress = getStoredDashboardProgress(me);
  return progress[assignmentId] || null;
}

async function saveAssignmentProgress(sb, me, assignment, payload) {
  const progress = getStoredDashboardProgress(me);

  const nextProgress = {
    ...payload,
    updatedAt: new Date().toISOString()
  };

  progress[assignment.id] = nextProgress;
  saveStoredDashboardProgress(me, progress);

  await upsertQuizResponseToSupabase(sb, me, assignment, {
    answers: payload.answers || {},
    progress: nextProgress,
    completed: false
  });
}

async function clearAssignmentProgress(sb, me, assignmentId) {
  const progress = getStoredDashboardProgress(me);
  delete progress[assignmentId];
  saveStoredDashboardProgress(me, progress);

  await deleteQuizResponseProgressFromSupabase(sb, me, assignmentId);
}

function getStoredDashboardState(me) {
  return readJsonStorage(getDashboardStorageKey(me, "dashboard_state"), {});
}

function saveStoredDashboardState(me, state) {
  writeJsonStorage(getDashboardStorageKey(me, "dashboard_state"), state);
}

function getAssignmentResponse(me, assignmentId) {
  const responses = getStoredDashboardResponses(me);
  return responses[assignmentId] || null;
}

function getMergedAssignmentAnswers(me, assignment) {
  const savedProgress = getAssignmentProgress(me, assignment.id);
  const savedResponse = getAssignmentResponse(me, assignment.id);

  return {
    ...(savedProgress?.answers || {}),
    ...(savedResponse?.answers || {})
  };
}

function getAssignmentQuestions(assignment = {}) {
  return Array.isArray(assignment.questions)
    ? assignment.questions
    : [];
}

function getAssignmentStepTotal(assignment = {}) {
  return Math.max(getAssignmentQuestions(assignment).length, 1);
}

function doesAnswerCountForStep(answer) {
  if (answer === undefined || answer === null) return false;

  if (typeof answer === "string") {
    return answer.trim().length > 0;
  }

  if (typeof answer === "number") {
    return Number.isFinite(answer);
  }

  if (typeof answer === "boolean") {
    return true;
  }

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }

  if (typeof answer === "object") {
    if (answer.status === "uploaded") return !!answer.path || !!answer.url || !!answer.signedUrl;
    if (answer.status === "skipped") return false;

    return Object.keys(answer).some(key => {
      const value = answer[key];

      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;

      return true;
    });
  }

  return false;
}

function getCompletedStepCount(assignment = {}, currentStep = 0, answers = {}) {
  const questions = getAssignmentQuestions(assignment);

  if (!questions.length) return 0;

  return questions.reduce((count, question) => {
    const answer = answers?.[question.id];
    return count + (doesAnswerCountForStep(answer) ? 1 : 0);
  }, 0);
}

function getQuestionProgressFraction(question, answer) {
  if (!question || answer === undefined || answer === null) return 0;

  if (question.type === "swipeDeck") {
    const cards = Array.isArray(question.config?.cards)
      ? question.config.cards
      : [];

    const decisions = Array.isArray(answer?.decisions)
      ? answer.decisions
      : [];

    if (!cards.length) return 0;

    return Math.max(
      0,
      Math.min(1, decisions.length / cards.length)
    );
  }

  return doesAnswerCountTowardProgress(question, answer) ? 1 : 0;
}

function getAnsweredQuestionCount(me, assignment) {
  const mergedAnswers = getMergedAssignmentAnswers(me, assignment);

  return (assignment.questions || []).reduce((count, question) => {
    const answer = mergedAnswers[question.id];
    return count + getQuestionProgressFraction(question, answer);
  }, 0);
}

function getAssignmentProgressFraction(me, assignment) {
  const questionCount = Math.max((assignment.questions || []).length, 1);
  const answeredCount = getAnsweredQuestionCount(me, assignment);
  return Math.min(1, answeredCount / questionCount);
}

async function saveAssignmentResponse(sb, me, assignment, payload) {
  const responses = getStoredDashboardResponses(me);

  const nextResponse = {
    ...payload,
    completed: true,
    updatedAt: new Date().toISOString(),
    submittedAt: payload.submittedAt || new Date().toISOString()
  };

  responses[assignment.id] = nextResponse;
  saveStoredDashboardResponses(me, responses);

  const progress = getStoredDashboardProgress(me);
  delete progress[assignment.id];
  saveStoredDashboardProgress(me, progress);

  await upsertQuizResponseToSupabase(sb, me, assignment, {
    answers: payload.answers || {},
    progress: {},
    completed: true,
    submittedAt: nextResponse.submittedAt
  });
}

function getCompletedAssignmentCount(me) {
  const responses = getStoredDashboardResponses(me);
  return Object.values(responses).filter(r => r && r.completed).length;
}

async function getDailyMessageCount(sb, me, sinceOverride = null) {
  if (!me?.id) return 0;

  const defaultSinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceIso = sinceOverride || defaultSinceIso;

  const { count, error } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", me.id)
    .gte("created_at", sinceIso);

  if (error) {
    console.warn("getDailyMessageCount failed", error);
    return 0;
  }

  return count || 0;
}

async function getDailyMessageStats(sb, me, sinceOverride = null) {
  if (!sb || !me?.id) {
    return {
      count: 0,
      totalChars: 0,
      averageChars: 0
    };
  }

  const defaultSinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceIso = sinceOverride || defaultSinceIso;

  const { data, error } = await sb
    .from("messages")
    .select("text")
    .eq("sender_id", me.id)
    .gte("created_at", sinceIso);

  if (error) {
    console.warn("getDailyMessageStats failed", error);
    return {
      count: 0,
      totalChars: 0,
      averageChars: 0
    };
  }

  const rows = data || [];
  const totalChars = rows.reduce((sum, row) => {
    return sum + String(row.text || "").trim().length;
  }, 0);

  return {
    count: rows.length,
    totalChars,
    averageChars: rows.length ? totalChars / rows.length : 0
  };
}

window.getDailyMessageStats = getDailyMessageStats;

function getMessageLengthMultiplier(messageStats = {}) {
  const totalChars = Number(messageStats.totalChars || 0);
  const averageChars = Number(messageStats.averageChars || 0);

  let multiplier = 1;

  if (totalChars >= 3000) {
    multiplier = 2.6;
  } else if (totalChars >= 1500) {
    multiplier = 2.2;
  } else if (totalChars >= 800) {
    multiplier = 1.8;
  } else if (totalChars >= 300) {
    multiplier = 1.4;
  }

  if (averageChars > 0 && averageChars < 18) {
    multiplier *= 0.75;
  }

  return Math.max(0.75, Math.min(2.8, multiplier));
}

function getMessageSignalScore(messageCount, messageStats = {}) {
  const count = Math.max(0, Number(messageCount) || 0);

  /**
   * Message volume matters, but saturates.
   * The length multiplier lets richer conversation fill the daily message
   * reserve slightly faster, without letting essays break the model.
   */
  const earlySignal = Math.min(count, 10) * 1.2;
  const middleSignal = Math.min(Math.max(count - 10, 0), 40) * 0.55;
  const longTailSignal = Math.max(count - 50, 0) * 0.12;

  const rawSignal = earlySignal + middleSignal + longTailSignal;
  const lengthMultiplier = getMessageLengthMultiplier(messageStats);

  return Math.min(100, rawSignal * lengthMultiplier);
}

function getAnsweredQuestionTotal(me, assignments = []) {
  return assignments.reduce((total, assignment) => {
    return total + getAnsweredQuestionCount(me, assignment);
  }, 0);
}

function getTotalQuestionCount(assignments = []) {
  return assignments.reduce((total, assignment) => {
    return total + (assignment.questions?.length || 0);
  }, 0);
}

function stableHashString(input = "") {
  const text = String(input);
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seedText = "") {
  let seed = stableHashString(seedText);

  seed += 0x6D2B79F5;
  let t = seed;

  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function allocateSeededWeights(items = [], total = 100, seedPrefix = "weights", spread = 0.55) {
  if (!items.length) return new Map();

  const rawWeights = items.map((item, index) => {
    const id = item?.id || item?.template_id || item?.title || index;
    const random = seededRandom(`${seedPrefix}:${id}:${index}`);

    // Around 1.0, but with controlled variation.
    // spread .55 gives roughly 0.725x to 1.275x before normalisation.
    return {
      item,
      raw: 1 + ((random - 0.5) * spread)
    };
  });

  const rawTotal = rawWeights.reduce((sum, item) => sum + item.raw, 0) || 1;

  return new Map(
    rawWeights.map(({ item, raw }) => {
      return [
        item,
        (raw / rawTotal) * total
      ];
    })
  );
}

function normaliseModuleName(value) {
  const category = String(value || "").toLowerCase();

  if (category === "chemistry") return "connection";
  if (category === "connection") return "connection";
  if (category === "attraction") return "attraction";

  return category;
}

function getAssignmentModuleName(assignment) {
  return normaliseModuleName(
    assignment?.meta?.category ||
    assignment?.category ||
    assignment?.module ||
    ""
  );
}

function isAssignmentForModule(assignment, moduleName) {
  const target = normaliseModuleName(moduleName);
  const assignmentModule = getAssignmentModuleName(assignment);

  // If no category exists, keep old permissive behaviour.
  if (!assignmentModule) return true;

  return assignmentModule === target;
}

function getQuestionStableId(question, index) {
  return String(
    question?.id ||
    question?.key ||
    question?.label ||
    question?.prompt ||
    `question_${index}`
  );
}

function getQuizQuestionWeights(assignment, quizWeight, moduleName) {
  const questions = assignment?.questions || [];
  const scoredQuestions = questions.filter(question => !question?.meta?.excludeFromScore);

  const seed = [
    "quiz-question-weights",
    moduleName,
    assignment?.id || assignment?.template_id || assignment?.title || "assignment"
  ].join(":");

  return allocateSeededWeights(
    scoredQuestions.map((question, index) => ({
      ...question,
      __stableScoreId: getQuestionStableId(question, index)
    })),
    quizWeight,
    seed,
    0.7
  );
}

function getBaselineTimeMs(me) {
  const raw = me?.score_baseline_set_at;
  if (!raw) return null;

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function getAssignmentScoreTimestamp(me, assignment) {
  const progress = getAssignmentProgress(me, assignment.id);
  const response = getAssignmentResponse(me, assignment.id);

  const raw =
    progress?.updatedAt ||
    progress?.submittedAt ||
    response?.updatedAt ||
    response?.submittedAt ||
    null;

  if (!raw) return null;

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

function wasAssignmentUpdatedAfterBaseline(me, assignment) {
  const baselineMs = getBaselineTimeMs(me);
  if (!baselineMs) return true;

  const assignmentMs = getAssignmentScoreTimestamp(me, assignment);
  if (!assignmentMs) return false;

  return assignmentMs >= baselineMs;
}

function getAssignmentDayIndexForScoring(assignment = {}) {
  const raw =
    assignment.day_index ??
    assignment.day_number ??
    assignment.day ??
    assignment.experiment_day ??
    assignment.meta?.day_index ??
    assignment.meta?.day_number ??
    assignment.meta?.day ??
    assignment.effect?.day_index ??
    assignment.effect?.day_number ??
    1;

  const num = Math.round(Number(raw) || 1);
  return Math.max(1, Math.min(5, num));
}

function getModuleQuizSignalScore(me, assignments = [], moduleName = "connection") {
const currentDay = getExperimentDayIndex(me);

const moduleAssignments = (assignments || []).filter(assignment => {
  const assignmentDay = getAssignmentDayIndexForScoring(assignment);

  return (
    assignmentDay <= currentDay &&
    isAssignmentForModule(assignment, moduleName)
  );
});

  if (!moduleAssignments.length) return 0;

  /**
   * This makes each quiz worth a slightly different share of the module's
   * quiz lane. Completing all module quizzes still equals 100.
   */
  const quizWeights = allocateSeededWeights(
    moduleAssignments,
    100,
    `module-quiz-weights:${normaliseModuleName(moduleName)}`,
    0.45
  );


const earned = moduleAssignments.reduce((total, assignment) => {
  const quizWeight = quizWeights.get(assignment) || 0;
  const questions = assignment.questions || [];

  if (!questions.length) return total;

  if (!wasAssignmentUpdatedAfterBaseline(me, assignment)) {
    return total;
  }

  const mergedAnswers = getMergedAssignmentAnswers(me, assignment);
    const questionWeights = getQuizQuestionWeights(
      assignment,
      quizWeight,
      moduleName
    );

const earnedForQuiz = Array.from(questionWeights.entries()).reduce(
  (quizTotal, [question, questionWeight]) => {
    const answer = mergedAnswers[question.id];
    const questionProgress = getQuestionProgressFraction(question, answer);

    if (questionProgress <= 0) {
      return quizTotal;
    }

    return quizTotal + (questionWeight * questionProgress);
  },
  0
);

    return total + earnedForQuiz;
  }, 0);

  return Math.max(0, Math.min(100, earned));
}

function getQuizSignalScore(me, assignments = []) {
  const total = assignments.reduce((score, assignment) => {
    const answeredCount = getAnsweredQuestionCount(me, assignment);
    const perQuestionImpact = getAssignmentQuestionImpact(assignment);
    return score + (answeredCount * perQuestionImpact);
  }, 0);

  return Math.min(100, total);
}

function getImpactWeightBudget(weight) {
  if (weight === "low") return 8;
  if (weight === "high") return 22;
  return 14; // medium
}

function getAssignmentQuestionImpact(assignment) {
  const questionCount = Math.max(assignment.questions?.length || 1, 1);
  const totalBudget = getImpactWeightBudget(assignment.effect?.impactWeight || "medium");
  return totalBudget / questionCount;
}

function getExperimentDayIndex(me) {
  if (window.soleExperimentScoring?.getExperimentDayIndex) {
    return window.soleExperimentScoring.getExperimentDayIndex(me);
  }

  if (!me?.created_at) return 1;

  const created = new Date(me.created_at);
  const now = new Date();

  if (Number.isNaN(created.getTime())) return 1;

  const day = Math.floor((now - created) / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(1, Math.min(5, day));
}

function getStageCaps(dayIndex) {
  if (window.soleExperimentScoring?.getDayCaps) {
    const caps = window.soleExperimentScoring.getDayCaps(dayIndex);

    return {
      maxConfidence: caps.confidenceMax,
      minConfidence: caps.confidenceMin,
      maxConnection: caps.connectionMax,
      maxAttraction: caps.attractionMax,
      minCandidates: caps.candidatePoolMin,
      stage: caps.stage
    };
  }

  const caps = {
    1: {
      maxConfidence: 46,
      minConfidence: 0,
      maxConnection: 48,
      maxAttraction: 48,
      minCandidates: 42000,
      stage: "Baseline compatibility calibration"
    },
    2: {
      maxConfidence: 62,
      minConfidence: 0,
      maxConnection: 64,
      maxAttraction: 64,
      minCandidates: 14500,
      stage: "Initial compatibility filtering"
    },
    3: {
      maxConfidence: 78,
      minConfidence: 0,
      maxConnection: 80,
      maxAttraction: 78,
      minCandidates: 2400,
      stage: "Conversational style mapping"
    },
    4: {
      maxConfidence: 90,
      minConfidence: 0,
      maxConnection: 92,
      maxAttraction: 90,
      minCandidates: 83,
      stage: "Behavioural alignment in progress"
    },
    5: {
      maxConfidence: 100,
      minConfidence: 0,
      maxConnection: 96,
      maxAttraction: 96,
      minCandidates: 1,
      stage: "Final compatibility resolution"
    }
  };

  return caps[dayIndex] || caps[5];
}

function easeOutQuad(t) {
  return 1 - Math.pow(1 - t, 2);
}

function getSampleStrength(messageCount) {
  if (messageCount >= 100) {
    return {
      label: "high confidence",
      note: "Behavioural signals stabilising"
    };
  }

  if (messageCount >= 70) {
    return {
      label: "strong",
      note: "Additional sample improving match accuracy"
    };
  }

  if (messageCount >= 40) {
    return {
      label: "moderate",
      note: "Further interaction recommended"
    };
  }

  if (messageCount >= 20) {
    return {
      label: "developing",
      note: "Conversational depth emerging"
    };
  }

  return {
    label: "limited",
    note: "Additional conversation data required"
  };
}

function getTaskSignalScore(me, assignments = []) {
  const eligibleAssignments = (assignments || []).filter(assignment => {
    return wasAssignmentUpdatedAfterBaseline(me, assignment);
  });

  if (!eligibleAssignments.length) return 0;

  const progressValues = eligibleAssignments.map(item =>
    getAssignmentProgressFraction(me, item)
  );

  const total = progressValues.reduce((sum, value) => {
    return sum + Math.max(0, Math.min(1, Number(value) || 0));
  }, 0);

 return Math.max(0, Math.min(100, (total / eligibleAssignments.length) * 100));
}

function getUserScoreOverrides(me) {
  const hasConnectionOverride =
    me?.score_connection_override !== null &&
    me?.score_connection_override !== undefined &&
    me?.score_connection_override !== "";

  const hasAttractionOverride =
    me?.score_attraction_override !== null &&
    me?.score_attraction_override !== undefined &&
    me?.score_attraction_override !== "";

  const hasConfidenceOverride =
    me?.score_confidence_override !== null &&
    me?.score_confidence_override !== undefined &&
    me?.score_confidence_override !== "";

  const hasCandidateOverride =
    me?.score_candidate_pool_override !== null &&
    me?.score_candidate_pool_override !== undefined &&
    me?.score_candidate_pool_override !== "";

  return {
    connection: hasConnectionOverride ? Number(me.score_connection_override) : null,
    attraction: hasAttractionOverride ? Number(me.score_attraction_override) : null,
    confidence: hasConfidenceOverride ? Number(me.score_confidence_override) : null,
    candidates: hasCandidateOverride ? Number(me.score_candidate_pool_override) : null
  };
}

function getUserScoreBaselines(me) {
  const hasCandidateBaseline =
    me?.score_candidate_pool_baseline !== null &&
    me?.score_candidate_pool_baseline !== undefined &&
    me?.score_candidate_pool_baseline !== "";

  return {
    connection: Number(me?.score_connection_baseline || 0),
    attraction: Number(me?.score_attraction_baseline || 0),
    confidence: Number(me?.score_confidence_baseline || 0),
    candidates: hasCandidateBaseline
      ? Math.round(Number(me.score_candidate_pool_baseline))
      : null
  };
}

function getUserScoreAdjustments(me) {
  return {
    connectionDelta: Number(me?.score_connection_delta || 0),
    attractionDelta: Number(me?.score_attraction_delta || 0),
    confidenceDelta: Number(me?.score_confidence_delta || 0),
    candidatePoolDelta: Number(me?.score_candidate_pool_delta || 0)
  };
}

function getBaseDashboardState(messageCount, me, assignments = [], messageStats = {}) {
  const userScoring = window.soleExperimentScoring;

  const messageScore = getMessageSignalScore(messageCount, messageStats);
  const dayIndex = getExperimentDayIndex(me);

  // These functions now handle baseline filtering internally.
  // So: old quiz/task work before score_baseline_set_at is ignored,
  // but new quiz/task work after baseline still counts.
  const connectionQuizSignal = getModuleQuizSignalScore(
    me,
    assignments,
    "connection"
  );

  const attractionQuizSignal = getModuleQuizSignalScore(
    me,
    assignments,
    "attraction"
  );

  const taskSignal = getTaskSignalScore(me, assignments);

  if (userScoring?.calculateExperimentScore) {
    const calculated = userScoring.calculateExperimentScore({
      user: me,
      dayIndex,
      messageSignal: messageScore,
      connectionQuizSignal,
      attractionQuizSignal,
      taskSignal,
      adjustments: getUserScoreAdjustments(me),
      baselines: getUserScoreBaselines(me),
      startingCandidates: DEFAULT_CANDIDATE_POOL
    });

    return {
      remainingCandidates: calculated.candidates,
      confidence: calculated.confidence,
      connection: calculated.connection,
      attraction: calculated.attraction,
      stage: calculated.stage,
      dayIndex: calculated.dayIndex,
      raw: calculated.raw
    };
  }

  const caps = getStageCaps(dayIndex);

  const averageQuizSignal = (connectionQuizSignal + attractionQuizSignal) / 2;

  const totalProgress = Math.min(
    100,
    messageScore * 0.65 +
      averageQuizSignal * 0.30 +
      taskSignal * 0.05
  );

  const normalized = totalProgress / 100;

  let confidence = 24 + easeOutQuad(normalized) * 75;

  let remainingCandidates =
    1 +
    Math.round(
      (DEFAULT_CANDIDATE_POOL - 1) *
        Math.pow(1 - normalized, 2.35)
    );

  confidence = Math.min(confidence, caps.maxConfidence);
  remainingCandidates = Math.max(remainingCandidates, caps.minCandidates);

  return {
    remainingCandidates,
    confidence,
    connection: Math.min(totalProgress, caps.maxConnection || 100),
    attraction: Math.min(totalProgress, caps.maxAttraction || 100),
    stage: caps.stage,
    dayIndex
  };
}
function applyAssignmentEffects(me, baseState, assignments = []) {
  let remainingCandidates = baseState.remainingCandidates;
  let confidence = baseState.confidence;
  let stage = baseState.stage;

  const sortedAssignments = [...assignments].sort((a, b) => a.priority - b.priority);

  sortedAssignments.forEach(item => {
    const fraction = getAssignmentProgressFraction(me, item);

    if (fraction <= 0) return;

    const customConfidence = Number(item.effect?.confidenceIncrease ?? 0);
    const customCandidateReduction = Number(item.effect?.candidateReduction ?? 0);

    if (customConfidence > 0) {
      confidence += customConfidence * fraction;
    }

    if (customCandidateReduction > 0) {
      remainingCandidates -= customCandidateReduction * fraction;
    }

    if (item.effect?.stageLabel) {
      stage = item.effect.stageLabel;
    }
  });

  return {
    remainingCandidates,
    confidence,
    stage
  };
}

function getDashboardState(me, messageCount, assignments = [], messageStats = {}) {
  const base = getBaseDashboardState(messageCount, me, assignments, messageStats);
  const overrides = getUserScoreOverrides(me);

  const dayIndex = getExperimentDayIndex(me);
  const caps = getStageCaps(dayIndex);

  const calculatedConnection = Math.min(
    caps.maxConnection || 100,
    Math.max(0, Number(base.connection) || 0)
  );

  const calculatedAttraction = Math.min(
    caps.maxAttraction || 100,
    Math.max(0, Number(base.attraction) || 0)
  );

  const calculatedConfidence = Math.min(
    caps.maxConfidence || 100,
    Math.max(0, Number(base.confidence) || 0)
  );

  const calculatedCandidates = Math.max(
    caps.minCandidates || 1,
    Math.round(Math.max(1, Number(base.remainingCandidates) || 1))
  );

  const connection =
    overrides.connection !== null
      ? Math.max(0, Math.min(100, Number(overrides.connection) || 0))
      : calculatedConnection;

  const attraction =
    overrides.attraction !== null
      ? Math.max(0, Math.min(100, Number(overrides.attraction) || 0))
      : calculatedAttraction;

  const confidence =
    overrides.confidence !== null
      ? Math.max(0, Math.min(100, Number(overrides.confidence) || 0))
      : calculatedConfidence;

  const remainingCandidates =
    overrides.candidates !== null
      ? Math.max(1, Math.round(Number(overrides.candidates) || 1))
      : calculatedCandidates;

  return {
    remainingCandidates,
    confidence,
    connection,
    attraction,
    stage: base.stage,
    dayIndex
  };
}

function formatCandidateCount(value) {
  return Number(value).toLocaleString();
}

function formatConfidence(value) {
  const num = Number(value) || 0;
  return `${num.toFixed(2)}%`;
}

function setMetricRingProgress(ringEl, percent) {
  if (!ringEl) return;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));

  ringEl.style.strokeDasharray = String(circumference);
  ringEl.style.strokeDashoffset = String(
    circumference - (clamped / 100) * circumference
  );
}

function formatPoolPercent(remainingCandidates) {
  const remaining = Number(remainingCandidates) || 0;
  const percent = (remaining / DEFAULT_CANDIDATE_POOL) * 100;
  return `${percent.toFixed(0)}%`;
}

function getConversationStyleLabel(value) {
  if (value <= 30) return "Playful";
  if (value >= 70) return "Reflective";
  return "Balanced";
}

function getSliderDisplayLabel(question, value) {
  const min = Number(question?.config?.min ?? 0);
  const max = Number(question?.config?.max ?? 100);
  const mid = (min + max) / 2;

  const minLabel = question?.config?.minLabel || "Low";
  const maxLabel = question?.config?.maxLabel || "High";
  const centerLabel = question?.config?.centerLabel || "Balanced";

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return centerLabel;

  const range = max - min;
  const lowerThreshold = min + range * 0.33;
  const upperThreshold = min + range * 0.66;

  if (numericValue <= lowerThreshold) return minLabel;
  if (numericValue >= upperThreshold) return maxLabel;
  return centerLabel;
}

function getScale7Label(value) {
  return String(value);
}

function escapeAttr(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
}
