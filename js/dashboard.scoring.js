const MATRIX_BASELINE_SCORE = 50;
const MATRIX_BASELINE_EVIDENCE = 4;

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function scale7ToSignalScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return 50;

  // 1 -> 0, 4 -> 50, 7 -> 100
  return clampScore(((numeric - 1) / 6) * 100);
}

function invertSignalIfNeeded(signalScore, weight) {
  return Number(weight) < 0
    ? 100 - signalScore
    : signalScore;
}

function getAnswerSignalForQuestion(question, answer) {
  if (!question || !answer) return null;

  if (question.type === "scale7") {
    return scale7ToSignalScore(answer.value);
  }

  if (question.type === "slider") {
    return clampScore(answer.value);
  }

  return null;
}

function normaliseScoringRules(scoring) {
  if (Array.isArray(scoring)) return scoring;
  return [];
}

function getQuestionScoringRules(question, answer) {
  const scoring = question.scoring || question.config?.scoring || [];

  if (!answer) return [];

  if (Array.isArray(scoring)) {
    return scoring;
  }

  if (!scoring || typeof scoring !== "object") {
    return [];
  }

  if (scoring.byValue && question.type === "singleSelect") {
    return normaliseScoringRules(scoring.byValue[answer.value]);
  }

  if (scoring.byValue && question.type === "imageChoice") {
    return normaliseScoringRules(scoring.byValue[answer.value]);
  }

  if (scoring.byValue && question.type === "multiSelect") {
    const selectedValues = Array.isArray(answer.values) ? answer.values : [];

    return selectedValues.flatMap(value =>
      normaliseScoringRules(scoring.byValue[value])
    );
  }

  if (scoring.byValue && question.type === "ranking") {
    const orderedValues = Array.isArray(answer.orderedValues)
      ? answer.orderedValues
      : [];

    const rankMultiplier = Array.isArray(scoring.rankMultiplier)
      ? scoring.rankMultiplier
      : [];

    return orderedValues.flatMap((value, index) => {
      const multiplier = Number(rankMultiplier[index] ?? 1);
      const rules = normaliseScoringRules(scoring.byValue[value]);

      return rules.map(rule => ({
        ...rule,
        weight: Number(rule.weight || 0) * multiplier
      }));
    });
  }

  if (scoring.byValue && question.type === "swipeDeck") {
  const decisions = Array.isArray(answer.decisions)
    ? answer.decisions
    : [];

  const directionMultiplier =
    scoring.directionMultiplier || {
      like: 1,
      reject: -0.35
    };

  return decisions.flatMap(decision => {
    const rules = normaliseScoringRules(
      scoring.byValue[decision.value]
    );

    const multiplier = Number(
      directionMultiplier[decision.direction] ?? 0
    );

    return rules.map(rule => ({
      ...rule,
      weight: Number(rule.weight || 0) * multiplier
    }));
  });
}

  return [];
}

function getOptionBasedSignalScore(rule) {
  const weight = Number(rule?.weight || 0);

  if (!Number.isFinite(weight) || weight === 0) {
    return null;
  }

  return weight >= 0 ? 75 : 25;
}

function calculateScoringSignalsForAssignment(assignment, answers = {}) {
  const signals = [];

  const questions = Array.isArray(assignment?.questions)
    ? assignment.questions
    : [];

  questions.forEach(question => {
    const answer = answers[question.id];
    if (!answer) return;

    const scoringRules = getQuestionScoringRules(question, answer);
    if (!scoringRules.length) return;

    const isScaleLikeQuestion =
      question.type === "scale7" ||
      question.type === "slider";

    const baseSignalScore = isScaleLikeQuestion
      ? getAnswerSignalForQuestion(question, answer)
      : null;

    scoringRules.forEach(rule => {
      const key = rule.key;
      const weight = Number(rule.weight || 0);

      if (!key || !Number.isFinite(weight) || weight === 0) return;

      const signalScore = isScaleLikeQuestion
        ? invertSignalIfNeeded(baseSignalScore, weight)
        : getOptionBasedSignalScore(rule);

      if (signalScore === null) return;

      signals.push({
        axisKey: key,
        signalScore,
        evidence: Math.abs(weight),
        rawWeight: weight,
        questionId: question.id
      });
    });
  });

  return signals;
}

function mergeMatrixScore({
  oldScore = MATRIX_BASELINE_SCORE,
  oldEvidence = MATRIX_BASELINE_EVIDENCE,
  signalScore = MATRIX_BASELINE_SCORE,
  signalEvidence = 0
}) {
  const safeOldEvidence = Math.max(0, Number(oldEvidence) || 0);
  const safeSignalEvidence = Math.max(0, Number(signalEvidence) || 0);

  if (!safeSignalEvidence) {
    return {
      score: clampScore(oldScore),
      evidence: safeOldEvidence
    };
  }

  const nextEvidence = safeOldEvidence + safeSignalEvidence;

  const nextScore =
    ((clampScore(oldScore) * safeOldEvidence) +
      (clampScore(signalScore) * safeSignalEvidence)) /
    nextEvidence;

  return {
    score: clampScore(nextScore),
    evidence: nextEvidence
  };
}

async function loadUserMatrixScores(sb, userId) {
  if (!sb || !userId) return {};

  const { data, error } = await sb
    .from("user_matrix_scores")
    .select("axis_key, score, evidence, updated_at")
    .eq("user_id", userId);

  if (error) {
    console.warn("loadUserMatrixScores failed", error);
    return {};
  }

  return Object.fromEntries(
    (data || []).map(row => [
      row.axis_key,
      {
        score: Number(row.score ?? MATRIX_BASELINE_SCORE),
        evidence: Number(row.evidence ?? MATRIX_BASELINE_EVIDENCE),
        updatedAt: row.updated_at || null
      }
    ])
  );
}

async function loadUserMatrixScoresForMatrix(sb, userId, matrixId) {
  const matrix = window.soleMatrixDefinitions?.get?.(matrixId);
  if (!matrix) {
    return {
      scores: {},
      confidence: 0
    };
  }

  const allScores = await loadUserMatrixScores(sb, userId);

  const scores = {};
  let totalEvidence = 0;

  matrix.axes.forEach(axis => {
    const row = allScores[axis.key];

    scores[axis.key] = row
      ? Number(row.score ?? MATRIX_BASELINE_SCORE)
      : MATRIX_BASELINE_SCORE;

    totalEvidence += row
      ? Number(row.evidence ?? MATRIX_BASELINE_EVIDENCE)
      : MATRIX_BASELINE_EVIDENCE;
  });

  const averageEvidence = matrix.axes.length
    ? totalEvidence / matrix.axes.length
    : 0;

  // This is intentionally arbitrary/soft for now.
  // Evidence 4 = around baseline, Evidence 24+ = highly calibrated.
  const confidence = clampScore((averageEvidence / 24) * 100);

  return {
    scores,
    confidence
  };
}

async function applyAssignmentScoringToUserMatrix(sb, me, assignment, answers = {}) {
  if (!sb || !me?.id || !assignment) return;

  const signals = calculateScoringSignalsForAssignment(assignment, answers);
  if (!signals.length) return;

  const existingScores = await loadUserMatrixScores(sb, me.id);
  const updatesByAxis = new Map();

  signals.forEach(signal => {
    const current =
      updatesByAxis.get(signal.axisKey) ||
      existingScores[signal.axisKey] ||
      {
        score: MATRIX_BASELINE_SCORE,
        evidence: MATRIX_BASELINE_EVIDENCE
      };

    const next = mergeMatrixScore({
      oldScore: current.score,
      oldEvidence: current.evidence,
      signalScore: signal.signalScore,
      signalEvidence: signal.evidence
    });

    updatesByAxis.set(signal.axisKey, next);
  });

  const nowIso = new Date().toISOString();

  const rows = Array.from(updatesByAxis.entries()).map(([axisKey, value]) => ({
    user_id: me.id,
    axis_key: axisKey,
    score: value.score,
    evidence: value.evidence,
    updated_at: nowIso
  }));

  const { error } = await sb
    .from("user_matrix_scores")
    .upsert(rows, {
      onConflict: "user_id,axis_key"
    });

  if (error) {
    console.warn("applyAssignmentScoringToUserMatrix failed", error);
    throw error;
  }
}

window.soleScoring = {
  baselineScore: MATRIX_BASELINE_SCORE,
  baselineEvidence: MATRIX_BASELINE_EVIDENCE,
  scale7ToSignalScore,
  calculateScoringSignalsForAssignment,
  mergeMatrixScore,
  loadUserMatrixScores,
  loadUserMatrixScoresForMatrix,
  applyAssignmentScoringToUserMatrix
};