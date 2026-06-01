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

function getAnsweredQuestionCount(me, assignment) {
  const mergedAnswers = getMergedAssignmentAnswers(me, assignment);

  return (assignment.questions || []).reduce((count, question) => {
    const answer = mergedAnswers[question.id];
    return count + (doesAnswerCountTowardProgress(question, answer) ? 1 : 0);
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

async function getDailyMessageCount(sb, me) {
  if (!me?.id) return 0;

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

function getMessageSignalScore(messageCount) {
  const count = Math.max(0, Number(messageCount) || 0);

const tier1 = Math.min(count, 50) * 0.55;
const tier2 = Math.min(Math.max(count - 50, 0), 70) * 0.35;
const tier3 = Math.min(Math.max(count - 120, 0), 80) * 0.18;
const tier4 = Math.max(count - 200, 0) * 0.03;

  const rawScore = tier1 + tier2 + tier3 + tier4;

  // Normalise
  return Math.min(100, rawScore / 1.15);
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
  // v1 simple version: days since signup
  const createdAt = me?.created_at ? new Date(me.created_at).getTime() : Date.now();
  const daysElapsed = Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000));
  return Math.min(5, Math.max(1, daysElapsed + 1));
}

function getStageCaps(dayIndex) {
  const caps = {
    1: { maxConfidence: 45, minCandidates: 6000, stage: "Baseline compatibility calibration" },
    2: { maxConfidence: 60, minCandidates: 2500, stage: "Initial compatibility filtering" },
    3: { maxConfidence: 75, minCandidates: 800, stage: "Conversational style mapping" },
    4: { maxConfidence: 88, minCandidates: 80, stage: "Behavioural alignment in progress" },
    5: { maxConfidence: 99, minCandidates: 1, stage: "Final compatibility resolution" }
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

function getBaseDashboardState(messageCount, me, assignments = []) {
  const messageScore = getMessageSignalScore(messageCount);  
  const quizScore = getQuizSignalScore(me, assignments);      
  const dayIndex = getExperimentDayIndex(me);
  const caps = getStageCaps(dayIndex);

  // Weight messages more than quizzes, but keep quizzes meaningful
  const totalProgress = Math.min(
    100,
    (messageScore * 0.8) + (quizScore * 0.2)
  );

  const normalized = totalProgress / 100;
  const eased = easeOutQuad(normalized);

  // Confidence starts low and grows steadily
  let confidence = 24 + (eased * 75);

  // Candidate pool collapses non-linearly
  let remainingCandidates =
    1 + Math.round((DEFAULT_CANDIDATE_POOL - 1) * Math.pow(1 - normalized, 2.35));

  // Apply day caps
  confidence = Math.min(confidence, caps.maxConfidence);
  remainingCandidates = Math.max(remainingCandidates, caps.minCandidates);

  return {
    remainingCandidates,
    confidence,
    stage: caps.stage
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

function getDashboardState(me, messageCount, assignments = []) {
  const storedState = getStoredDashboardState(me);
  const base = getBaseDashboardState(messageCount, me, assignments);
  const enhanced = applyAssignmentEffects(me, base, assignments);

  const merged = {
    ...enhanced,
    ...(storedState || {})
  };

  const dayIndex = getExperimentDayIndex(me);
  const caps = getStageCaps(dayIndex);

  return {
    remainingCandidates: Math.max(
      caps.minCandidates,
      Math.round(Math.max(1, Number(merged.remainingCandidates)))
    ),
    confidence: Math.min(
      caps.maxConfidence,
      Math.min(99.9, Number(merged.confidence))
    ),
    stage: merged.stage || enhanced.stage
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
