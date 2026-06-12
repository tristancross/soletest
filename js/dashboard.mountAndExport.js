async function mountWelcomeDashboard({
  messagesEl,
  mainEl,
  sb,
  me,
  escapeHtml,
  animateMetrics = false,
  adminPreview = false,
  adminHome = false
}) {
  const messageCount = await getDailyMessageCount(sb, me);

  let runtimeAssignments = [];
  if (!adminHome) {
    try {
runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me, {
  includeLocked: !!adminPreview,
  includeQuestions: false
});
    } catch (error) {
      console.warn("loadRuntimeAssignmentsFromSupabase failed", error);
      runtimeAssignments = [];
    }
  }

  const responseState = await loadQuizResponsesFromSupabase(
    sb,
    me,
    adminPreview && me?.id ? { userId: me.id } : {}
  );

  saveStoredDashboardResponses(me, responseState.responses);
  saveStoredDashboardProgress(me, responseState.progress);

  const dash = getDashboardState(me, messageCount, runtimeAssignments);

window.cleanupChatRuntimeEffects?.();

  messagesEl.innerHTML = await buildWelcomeMarkup({
    sb,
    me,
    escapeHtml,
    adminPreview,
    adminHome,
    runtimeAssignments
  });

  initDashboardInteractions({
    mainEl,
    messagesEl,
    sb,
    me,
    escapeHtml,
    adminPreview,
    adminHome,
    runtimeAssignments
  });

  if (!adminHome) {
    animateDashboardMetrics(
      {
        remainingCandidates: dash.remainingCandidates,
        confidence: dash.confidence
      },
      animateMetrics
    );
  }
}
function getRankingListValues(listEl) {
  return Array.from(listEl.querySelectorAll(".quizRankingItem"))
    .map(item => item.dataset.rankingValue)
    .filter(Boolean);
}

function updateRankingIndexes(listEl) {
  const items = Array.from(listEl.querySelectorAll(".quizRankingItem"));

  items.forEach((item, index) => {
    const indexEl = item.querySelector(".quizRankingIndex");
    if (indexEl) indexEl.textContent = String(index + 1);

    const upBtn = item.querySelector('[data-ranking-move="up"]');
    const downBtn = item.querySelector('[data-ranking-move="down"]');

    if (upBtn) upBtn.disabled = index === 0;
    if (downBtn) downBtn.disabled = index === items.length - 1;
  });
}

function getRankingAnswer(question, orderedValues) {
  const options = question.config?.options || [];

  return {
    orderedValues,
    orderedLabels: orderedValues.map(value => {
      const option = options.find(item => item.value === value);
      return option?.label || value;
    })
  };
}

function getDragAfterElement(container, y) {
  const draggedItem = container.querySelector(".quizRankingItem.isDragging");

  if (!draggedItem) return null;

  const draggedBox = draggedItem.getBoundingClientRect();
  const draggingUp = y < draggedBox.top + draggedBox.height / 2;

  const draggableElements = [
    ...container.querySelectorAll(".quizRankingItem:not(.isDragging)")
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();

      const triggerPoint = draggingUp
        ? box.top + box.height * 0.85
        : box.top + box.height * 0.1;

      const offset = y - triggerPoint;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function animateRankingReorder(listEl, reorderFn) {
  const items = Array.from(listEl.querySelectorAll(".quizRankingItem"));
  const firstRects = new Map(items.map(item => [item, item.getBoundingClientRect()]));

  reorderFn();

  items.forEach(item => {
    const first = firstRects.get(item);
    const last = item.getBoundingClientRect();
    if (!first) return;

    const dy = first.top - last.top;
    if (!dy) return;

    item.style.transform = `translateY(${dy}px)`;

    requestAnimationFrame(() => {
      item.style.transition = "transform 180ms ease";
      item.style.transform = "";
    });

    item.addEventListener("transitionend", () => {
      item.style.transition = "";
      item.style.transform = "";
    }, { once: true });
  });
}

async function markSolematePortraitViewed(sb, userId) {
  if (!sb || !userId) return;

  const { error } = await sb
    .from("user_solemate_portraits")
    .update({
      viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("status", "revealed")
    .is("viewed_at", null);

  if (error) {
    console.warn("Could not mark SoleMate portrait as viewed", error);
  }
}

function bindRankingQuestion({ messagesEl, sb, me, assignment }) {
  const cardEl = messagesEl.querySelector(
    `[data-assignment-id="${CSS.escape(assignment.id)}"]`
  );

  if (!cardEl) return;

  const currentStep = Number(cardEl.dataset.currentStep || 0);
  const question = assignment.questions?.[currentStep];

  if (!question || question.type !== "ranking") return;

  const listEl = cardEl.querySelector(
    `[data-ranking-list="${CSS.escape(question.id)}"]`
  );

  const submitBtn = cardEl.querySelector(
    `[data-assignment-submit="${CSS.escape(assignment.id)}"]`
  );

  if (!listEl) return;

  async function saveCurrentRankingOrder() {
    const orderedValues = getRankingListValues(listEl);
    const answer = getRankingAnswer(question, orderedValues);
    const mergedAnswers = getMergedAssignmentAnswers(me, assignment);

    await saveAssignmentProgress(sb, me, assignment, {
      currentStep,
      answers: {
        ...mergedAnswers,
        [question.id]: answer
      }
    });

    if (submitBtn) {
      submitBtn.disabled = !canAdvanceQuestion(question, answer);
    }
  }

  const initialAnswer = getRankingAnswer(question, getRankingListValues(listEl));

  if (submitBtn) {
    submitBtn.disabled = !canAdvanceQuestion(question, initialAnswer);
  }

  let draggedItem = null;
  let pointerId = null;

  listEl.querySelectorAll(".quizRankingItem").forEach(item => {
    item.removeAttribute("draggable");

    item.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest(".quizRankingControls")) return;

      draggedItem = item;
      pointerId = event.pointerId;

      item.setPointerCapture(pointerId);
      item.classList.add("isDragging");
      document.body.classList.add("isRankingDragging");

      event.preventDefault();
    });

item.querySelectorAll(".quizRankingBtn").forEach(btn => {
  btn.addEventListener("click", async event => {
    event.stopPropagation();

    const direction = btn.dataset.rankingMove;
    const row = btn.closest(".quizRankingItem");
    if (!row) return;

    animateRankingReorder(listEl, () => {
      if (direction === "up" && row.previousElementSibling) {
        listEl.insertBefore(row, row.previousElementSibling);
      }

      if (direction === "down" && row.nextElementSibling) {
        listEl.insertBefore(row.nextElementSibling, row);
      }
    });

    updateRankingIndexes(listEl);
    await saveCurrentRankingOrder();
  });
});

item.addEventListener("pointermove", event => {
  if (!draggedItem || event.pointerId !== pointerId) return;

  const afterElement = getDragAfterElement(listEl, event.clientY);
  const currentNext = draggedItem.nextElementSibling;

  const shouldMoveToEnd = !afterElement && currentNext;
  const shouldMoveBefore = afterElement && afterElement !== draggedItem && afterElement !== currentNext;

  if (!shouldMoveToEnd && !shouldMoveBefore) return;

  animateRankingReorder(listEl, () => {
    if (!afterElement) {
      listEl.appendChild(draggedItem);
    } else {
      listEl.insertBefore(draggedItem, afterElement);
    }
  });

  updateRankingIndexes(listEl);
});

    item.addEventListener("pointerup", async event => {
      if (!draggedItem || event.pointerId !== pointerId) return;

      draggedItem.classList.remove("isDragging");
      document.body.classList.remove("isRankingDragging");

      try {
        draggedItem.releasePointerCapture(pointerId);
      } catch (error) {}

      draggedItem = null;
      pointerId = null;

      updateRankingIndexes(listEl);
      await saveCurrentRankingOrder();
    });

    item.addEventListener("pointercancel", () => {
      if (draggedItem) draggedItem.classList.remove("isDragging");

      document.body.classList.remove("isRankingDragging");
      draggedItem = null;
      pointerId = null;

      updateRankingIndexes(listEl);
    });
  });
}

function moveArrayItem(arr, fromIndex, toIndex) {
  const copy = [...arr];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, item);
  return copy;
}

function getImageChoiceSelectedLabel(question, value) {
  const match = (question.config.options || []).find(option => option.value === value);
  return match ? match.label : value;
}

function playAssignmentAdvanceTransition(cardEl) {
  return new Promise(resolve => {
    if (!cardEl) {
      resolve();
      return;
    }

    cardEl.classList.add("isExiting");

    setTimeout(() => {
      resolve();
    }, 180);
  });
}

async function refreshWelcomeDashboard({
  mainEl,
  messagesEl,
  sb,
  me,
  escapeHtml,
  animateMetrics = false,
  adminPreview = false,
  adminHome = false,
  force = false
}) {
  if (!force && !mainEl.classList.contains("noChatSelected")) return;

  await mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    animateMetrics,
    adminPreview,
    adminHome
  });
}

function getClampedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function formatSmartPercent(value, maxDecimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0%";

  const roundedToWhole = Math.round(number);

  // Treat values like 42.00000001 as 42%
  if (Math.abs(number - roundedToWhole) < 0.0001) {
    return `${roundedToWhole}%`;
  }

  return `${number.toFixed(maxDecimals)}%`;
}

function animateModuleNumber({ valueEl, from, to, duration = 900, decimals = 2 }) {
  if (!valueEl) return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (reducedMotion || from === to) {
    valueEl.textContent = formatSmartPercent(to, decimals);
    return;
  }

  const start = performance.now();

  function tick(now) {
    const rawProgress = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(rawProgress);
    const current = from + (to - from) * eased;

    valueEl.textContent = formatSmartPercent(current, decimals);

    if (rawProgress < 1) {
      requestAnimationFrame(tick);
    } else {
      valueEl.textContent = formatSmartPercent(to, decimals);
    }
  }

  requestAnimationFrame(tick);
}

function animateQuizInlineProgressTo({ rootEl, userId, assignmentId, targetProgress }) {
  const barEl = rootEl.querySelector(".quizInlineProgressBar");
  if (!barEl) return;

  const target = getClampedPercent(targetProgress);
  const start = getClampedPercent(parseFloat(barEl.style.width || "0"));

  const cacheKey = `${userId || "anonymous"}:${assignmentId || "quiz"}`;

  window.soleQuizInlineProgressCache = window.soleQuizInlineProgressCache || {};
  window.soleQuizInlineProgressCache[cacheKey] = target;

  barEl.dataset.quizProgress = String(target);
  barEl.style.transition = "none";
  barEl.style.width = `${start}%`;

  barEl.getBoundingClientRect();

  requestAnimationFrame(() => {
    barEl.style.transition = "";
    barEl.style.width = `${target}%`;
  });
}

function animateQuizInlineProgress({ rootEl, userId, assignmentId }) {
  const barEl = rootEl.querySelector(".quizInlineProgressBar");
  if (!barEl) return;

  const targetProgress = getClampedPercent(barEl.dataset.quizProgress);
  const cacheKey = `${userId || "anonymous"}:${assignmentId || "quiz"}`;

  window.soleQuizInlineProgressCache = window.soleQuizInlineProgressCache || {};

  const hasPrevious =
    typeof window.soleQuizInlineProgressCache[cacheKey] === "number";

  const previousProgress = hasPrevious
    ? window.soleQuizInlineProgressCache[cacheKey]
    : targetProgress;

  window.soleQuizInlineProgressCache[cacheKey] = targetProgress;

  if (!hasPrevious || previousProgress === targetProgress) {
    barEl.style.width = `${targetProgress}%`;
    return;
  }

  barEl.style.transition = "none";
  barEl.style.width = `${previousProgress}%`;

  barEl.getBoundingClientRect();

  requestAnimationFrame(() => {
    barEl.style.transition = "";
    barEl.style.width = `${targetProgress}%`;
  });
}

function animateModuleHeroProgress({ rootEl, userId, screen }) {
  const moduleRingWrap = rootEl.querySelector(".moduleMiniRing");
  const moduleRing = rootEl.querySelector(".moduleMiniRing .moduleRingFill");
  const valueEl = rootEl.querySelector("[data-module-progress-value]");

  if (!moduleRingWrap || !moduleRing || !valueEl) return;

  const cacheKey = `${userId || "anonymous"}:${screen || "module"}`;

  window.soleModuleHeroProgressCache = window.soleModuleHeroProgressCache || {};

  const targetProgress = getClampedPercent(moduleRingWrap.dataset.moduleProgress);

  const hasPrevious =
    typeof window.soleModuleHeroProgressCache[cacheKey] === "number";

  const previousProgress = hasPrevious
    ? window.soleModuleHeroProgressCache[cacheKey]
    : targetProgress;

  window.soleModuleHeroProgressCache[cacheKey] = targetProgress;

  const radius = Number(moduleRing.getAttribute("r")) || 46;
  const circumference = 2 * Math.PI * radius;

  const startFilled = (previousProgress / 100) * circumference;
  const targetFilled = (targetProgress / 100) * circumference;

  // Make sure the current visible state is the previous value.
  moduleRing.style.strokeDasharray = `${startFilled} ${circumference - startFilled}`;
  valueEl.textContent = formatSmartPercent(previousProgress, 2);

  if (!hasPrevious || previousProgress === targetProgress) {
    moduleRing.style.strokeDasharray = `${targetFilled} ${circumference - targetFilled}`;
    valueEl.textContent = formatSmartPercent(targetProgress, 2);
    return;
  }

  requestAnimationFrame(() => {
    moduleRing.style.strokeDasharray = `${targetFilled} ${circumference - targetFilled}`;

    animateModuleNumber({
      valueEl,
      from: previousProgress,
      to: targetProgress,
      duration: 900,
      decimals: 2
    });
  });
}

function getAssignmentDayIndex(assignment = {}) {
  const raw =
    assignment.day_index ??
    assignment.day_number ??
    assignment.day ??
    assignment.experiment_day ??
    assignment.template_day_index ??
    assignment.template?.day_index ??
    assignment.template?.day_number ??
    assignment.quiz_template?.day_index ??
    assignment.quiz_template?.day_number ??
    assignment.meta?.day_index ??
    assignment.meta?.day_number ??
    assignment.meta?.day ??
    assignment.effect?.day_index ??
    assignment.effect?.day_number ??
    1;

  const num = Math.round(Number(raw) || 1);
  return Math.max(1, Math.min(5, num));
}

function getCurrentExperimentDayForUser(user) {
  if (window.soleExperimentScoring?.getExperimentDayIndex) {
    return window.soleExperimentScoring.getExperimentDayIndex(user);
  }

  const settings = window.soleDayConfigs?.getExperimentSettingsFromCache?.();
  const day = Number(settings?.current_day || 1);

  return Math.max(1, Math.min(5, Math.round(day || 1)));
}

function isAssignmentLockedForUser(assignment, user) {
  return getAssignmentDayIndex(assignment) > getCurrentExperimentDayForUser(user);
}

function renderModuleQuizMetricDock({
  moduleProgress = 0,
  moduleDisplayProgress = 0,
  screen = "",
  formatSmartPercent = value => `${Math.round(value)}%`
} = {}) {
  const clampPercent = value => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, num));
  };

  const circumference = 2 * Math.PI * 18;

  const ring = value => {
    const pct = clampPercent(value);
    const dash = (pct / 100) * circumference;
    const gap = circumference - dash;

    return `${dash} ${gap}`;
  };

  /*
    For now, these use the current module progress as the active signal,
    with neutral placeholder values for the wider model dimensions.

    Later, we can wire these directly to dash.connection, dash.attraction,
    dash.confidence and remainingCandidates if you want them live-live.
  */
  const activeKind = screen === "chemistry" || screen === "connection"
    ? "connection"
    : screen === "attraction"
      ? "attraction"
      : "confidence";

  const metrics = [
    {
      key: "attraction",
      label: "Attraction",
      value: activeKind === "attraction" ? moduleDisplayProgress : 0,
      display: activeKind === "attraction" ? formatSmartPercent(moduleDisplayProgress, 2) : "â€”"
    },
    {
      key: "connection",
      label: "Connection",
      value: activeKind === "connection" ? moduleDisplayProgress : 0,
      display: activeKind === "connection" ? formatSmartPercent(moduleDisplayProgress, 2) : "â€”"
    },
    {
      key: "confidence",
      label: "Confidence",
      value: moduleDisplayProgress,
      display: formatSmartPercent(moduleDisplayProgress, 2)
    },
    {
      key: "candidates",
      label: "Candidates",
      value: moduleProgress,
      display: "Refining"
    }
  ];

  return metrics.map(metric => `
    <article class="moduleQuizMetricPill" data-quiz-metric="${metric.key}">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle class="moduleQuizMetricTrack" cx="22" cy="22" r="18"></circle>
        <circle
          class="moduleQuizMetricFill"
          cx="22"
          cy="22"
          r="18"
          style="stroke-dasharray:${ring(metric.value)}"
        ></circle>
      </svg>

      <div class="moduleQuizMetricText">
        <span>${metric.label}</span>
        <strong>${metric.display}</strong>
      </div>
    </article>
  `).join("");
}

async function mountSidebarDashboardScreen({
  screen,
  sidebarPaneEl,
  mainEl,
  sb,
  me,
  escapeHtml,
  adminPreview = false,
  activeAssignmentId = null
}) {
if (!sidebarPaneEl) return;

if (sb && me?.id) {
  try {
    const { data: freshProfile, error: freshProfileError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", me.id)
      .maybeSingle();

    if (freshProfileError) {
      console.warn("Could not refresh profile for module day state", freshProfileError);
    } else if (freshProfile) {
      me = freshProfile;
    }
  } catch (error) {
    console.warn("Profile refresh failed during module day state", error);
  }
}

const appEl = document.querySelector(".app.soleRedesignApp");

if (appEl) {
  appEl.dataset.activeModule = screen;
}

let activeSubview = screen === "solemate" ? "portrait" : "calibration";

const screenConfig = {
  chemistry: {
    title: "Connection Calibration",
    eyebrow: "Calibration",
    intro: "Personality analysis and compatibility assessment.",
    category: "chemistry",
    progressKey: "connection",
    icon: "fa-solid fa-circle-nodes",
    filter: item => {
      const category = String(item.meta?.category || "").toLowerCase();
      if (!category) return true;
      return category === "chemistry";
    }
  },

  attraction: {
    title: "Attraction Mapping",
    eyebrow: "Mapping",
    intro: "Visual preference mapping and attraction reconstruction.",
    category: "attraction",
    progressKey: "attraction",
    icon: "fa-solid fa-wand-magic-sparkles",
    filter: item => {
      const category = String(item.meta?.category || "").toLowerCase();
      if (!category) return true;
      return category === "attraction";
    }
  },
solemate: {
  title: "Solemate Model",
  eyebrow: "Solemate",
  intro: "Sole is assembling the profile of your highest-probability match.",
  category: "solemate",
  progressKey: "confidence",
  icon: "fa-solid fa-heart-circle-bolt",
  filter: item => {
    const category = String(item.meta?.category || "").toLowerCase();
    return category === "solemate";
  }
}
};

function getQuizHeroProgress(assignment, me){
  const totalSteps = getAssignmentStepTotal(assignment);
  const savedResponse = getAssignmentResponse(me, assignment.id);

  if (savedResponse?.completed) {
    return {
      currentDisplayStep: totalSteps,
      totalSteps,
      progressPercent: 100
    };
  }

  const mergedAnswers = getMergedAssignmentAnswers(me, assignment);
  const savedProgress = getAssignmentProgress(me, assignment.id);

  const currentStep = Math.min(
    savedProgress?.currentStep || 0,
    Math.max(assignment.questions.length - 1, 0)
  );

  const completedSteps = getCompletedStepCount(
    assignment,
    currentStep,
    mergedAnswers
  );

  const currentDisplayStep = Math.min(completedSteps + 1, totalSteps);

  const progressPercent = totalSteps
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  return {
    currentDisplayStep,
    totalSteps,
    progressPercent
  };
}

const config = screenConfig[screen];
if (!config) return;

let liveProgress = 0;
let liveMessageStats = {
  count: 0,
  totalChars: 0,
  averageChars: 0
};

try {
  await window.soleDayConfigs?.loadExperimentSettings?.(sb, {
    force: true
  });
} catch (error) {
  console.warn("Could not refresh experiment settings for module screen", error);
}

let runtimeAssignments = [];

let liveDashboardState = {
  remainingCandidates: window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437,
  confidence: 0,
  connection: 0,
  attraction: 0,
  stage: "Profile forming",
  dayIndex: 1
};

try {
  liveMessageStats = window.getDailyMessageStats
    ? await window.getDailyMessageStats(
        sb,
        me,
        me?.score_baseline_set_at || null
      )
    : { count: 0, totalChars: 0, averageChars: 0 };

runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me, {
  includeLocked: !!adminPreview,
  includeQuestions: true
});

  const responseState = await loadQuizResponsesFromSupabase(sb, me);

  saveStoredDashboardResponses(me, responseState.responses);
  saveStoredDashboardProgress(me, responseState.progress);

  const dash = getDashboardState(
    me,
    liveMessageStats.count || 0,
    runtimeAssignments,
    liveMessageStats
  );

  liveDashboardState = dash;

  liveProgress = Math.max(
    0,
    Math.min(100, Number(dash?.[config.progressKey] || 0))
  );
} catch (error) {
  console.warn("Could not calculate live module progress", error);
}

  function getModuleProgressKey() {
  return screen === "chemistry" ? "connection" : "attraction";
}

function getModuleProgressPercent() {
  return Math.max(
    0,
    Math.min(100, Number(liveProgress || 0))
  );
}

function getModuleHeroMeta() {
  if (screen === "chemistry" || screen === "connection") {
    return {
      eyebrow: "Connection",
      title: "Compatibility model",
      intro: "Sole is building a picture of how you attach, communicate, and sustain intimacy."
    };
  }

  if (screen === "solemate") {
    return {
      eyebrow: "SoleMate",
      title: "Type analysis",
      intro: "Sole is beginning to identify the patterns, tendencies, and relationship archetypes shaping your highest-probability match."
    };
  }

  return {
    eyebrow: "Attraction",
    title: "Preference model",
    intro: "Sole is building a picture of your visual, romantic, and instinctive attraction patterns."
  };
}

if (!runtimeAssignments.length) {
  try {
runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me, {
  includeLocked: true,
  includeQuestions: true
});
  } catch (error) {
    console.warn("Sidebar screen assignments failed", error);
  }
}

let responseState = {
  responses: {},
  progress: {}
};

try {
  responseState = await loadQuizResponsesFromSupabase(sb, me);
  saveStoredDashboardResponses(me, responseState.responses);
  saveStoredDashboardProgress(me, responseState.progress);
} catch (error) {
  console.warn("Sidebar screen quiz responses failed", error);
}

const filteredAssignments = runtimeAssignments.filter(config.filter);

const activeQuizAssignment = activeAssignmentId
  ? filteredAssignments.find(item => item.id === activeAssignmentId) || null
  : null;

const activeQuizProgress = activeQuizAssignment
  ? getQuizHeroProgress(activeQuizAssignment, me)
  : null;

async function renderModuleProfilePanel(activeMatrixId = "") {
  const isConnectionModule = screen === "chemistry";

  const matrixIds = isConnectionModule
    ? [
        "connection_values",
        "connection_attachment",
        "connection_interpersonal"
      ]
    : [
        "attraction_aesthetics",
        "attraction_chemistry",
        "attraction_romance"
      ];

  const selectedMatrixId = matrixIds.includes(activeMatrixId)
    ? activeMatrixId
    : matrixIds[0];

  const switcherItems = matrixIds
    .map(matrixId => {
      const matrix = window.soleMatrixDefinitions?.get?.(matrixId);

      return {
        id: matrixId,
        title: matrix?.title || matrixId
      };
    });

  const matrixState = await window.soleScoring?.loadUserMatrixScoresForMatrix?.(
    sb,
    me.id,
    selectedMatrixId
  );

const matrixMarkup = window.soleMatrixRendering
  ? window.soleMatrixRendering.renderPanel({
      matrixId: selectedMatrixId,
      scores: matrixState?.scores || null,
      confidence: matrixState?.confidence ?? 0,
      escapeHtml,
      escapeAttr,
      switcherItems,
      activeMatrixId: selectedMatrixId
    })
  : "";

  return `
    <div
      class="moduleProfilePanel"
      data-module-profile-panel
      data-active-matrix-id="${escapeAttr(selectedMatrixId)}"
    >

      <div class="moduleProfileMatrixList">
        ${matrixMarkup}
      </div>
    </div>
  `;
}

let moduleInsights = [];

try {
  moduleInsights = await loadUserInsightsFromSupabase(sb, me.id, {
    status: "revealed",
    category: screen === "solemate" ? "general" : config.category
  });
} catch (error) {
  console.warn("Sidebar insights failed", error);
}

window.currentSolematePortrait = null;

if (screen === "solemate") {
  const { data, error } = await sb
    .from("user_solemate_portraits")
    .select("*")
    .eq("user_id", me.id)
    .eq("status", "revealed")
    .maybeSingle();

  if (error) {
    console.warn("SoleMate portrait failed", error);
  } else {
    window.currentSolematePortrait = data || null;
  }
}

function renderModuleCalibrationList() {
  const currentDay = getCurrentExperimentDayForUser(me);

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const dayA = getAssignmentDayIndex(a);
    const dayB = getAssignmentDayIndex(b);

    if (dayA !== dayB) return dayA - dayB;

    const priorityA = Number(a.priority ?? 100);
    const priorityB = Number(b.priority ?? 100);

    if (priorityA !== priorityB) return priorityA - priorityB;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  const firstCurrentAssignment = sortedAssignments.find(assignment => {
    return (
      !isAssignmentLockedForUser(assignment, me) &&
      !getAssignmentResponse(me, assignment.id)?.completed
    );
  });

  const days = [1, 2, 3, 4, 5];

  const renderCalibrationCard = (assignment) => {
    const assignmentDay = getAssignmentDayIndex(assignment);
    const isCompleted = !!getAssignmentResponse(me, assignment.id)?.completed;
    const isLocked = isAssignmentLockedForUser(assignment, me);
    const isCurrent = firstCurrentAssignment?.id === assignment.id;

    const savedProgress = getAssignmentProgress(me, assignment.id);
    const hasProgress = !!savedProgress && !isCompleted && !isLocked;

    const actionLabel = isCompleted
      ? ""
      : isLocked
        ? `Day ${assignmentDay}`
        : hasProgress
          ? "Continue"
          : "Start";

    const cardClasses = [
      "moduleCalibrationTaskCard",
      isCompleted ? "isCompleted" : "",
      isLocked ? "isLocked" : "",
      isCurrent ? "isCurrent" : ""
    ].filter(Boolean).join(" ");

    return `
      <article
        class="${cardClasses}"
        data-module-calibration-card="${escapeAttr(assignment.id)}"
        data-assignment-day="${escapeAttr(assignmentDay)}"
        ${isCurrent ? `data-current-module-assignment="true"` : ""}
      >
        <div class="moduleCalibrationTaskMain">
          <div class="moduleCalibrationTaskIcon">
            <i class="${escapeAttr(
              isLocked
                ? "fa-solid fa-lock"
                : isCompleted
                  ? "fa-solid fa-check"
                  : (config.icon || "fa-solid fa-circle-dot")
            )}"></i>
          </div>

          <div class="moduleCalibrationTaskText">
            <h4>${escapeHtml(assignment.title || "Untitled calibration")}</h4>
            <p>
              ${
                isLocked
                  ? `Unlocks on Day ${escapeHtml(String(assignmentDay))}. You are currently on Day ${escapeHtml(String(currentDay))}.`
                  : escapeHtml(assignment.description || assignment.prompt || "Additional signal mapping required.")
              }
            </p>
          </div>
        </div>

        <div class="moduleCalibrationTaskAction">
          ${
            isCompleted
              ? `<span class="moduleCalibrationTaskTick"></span>`
              : isLocked
                ? `
                  <span class="moduleCalibrationTaskLocked">
                    ${escapeHtml(actionLabel)}
                  </span>
                `
                : `
                  <button
                    type="button"
                 class="moduleCalibrationTaskStart ${hasProgress ? "isContinue" : "isStart"}"
                    data-start-module-assignment="${escapeAttr(assignment.id)}"
                  >
                    ${escapeHtml(actionLabel)}
                  </button>
                `
          }
        </div>
      </article>
    `;
  };

  const daySections = days.map(dayNumber => {
    const dayAssignments = sortedAssignments.filter(assignment => {
      return getAssignmentDayIndex(assignment) === dayNumber;
    });

    if (!dayAssignments.length) return "";

    const dayCompleted = dayAssignments.filter(assignment => {
      return !!getAssignmentResponse(me, assignment.id)?.completed;
    }).length;

    const isFutureDay = dayNumber > currentDay;
    const isCurrentDay = dayNumber === currentDay;
    const isPastDay = dayNumber < currentDay;

    const statusLabel = isFutureDay
      ? "Locked"
      : isCurrentDay
        ? "Current"
        : isPastDay
          ? "Previous"
          : "";

    return `
      <section
        class="moduleCalibrationDaySection ${isFutureDay ? "isFutureDay" : ""} ${isCurrentDay ? "isCurrentDay" : ""}"
        data-module-day-section="${escapeAttr(dayNumber)}"
      >
        <div class="moduleCalibrationDayHeader">
          <div>
            <div class="dashboardEyebrow moduleCalibrationSectionEyebrow">
              Day ${escapeHtml(String(dayNumber))}
            </div>
            <div class="moduleCalibrationDayMeta">
              ${escapeHtml(String(dayCompleted))} of ${escapeHtml(String(dayAssignments.length))} complete
            </div>
          </div>

          <span class="moduleCalibrationDayPill">
            ${escapeHtml(statusLabel)}
          </span>
        </div>

        <div class="moduleCalibrationDayCards">
          ${dayAssignments.map(renderCalibrationCard).join("")}
        </div>
      </section>
    `;
  }).join("");

  return `
    <div class="moduleCalibrationList moduleCalibrationPath">
      ${
        daySections ||
        `
          <div class="sidebarEmptyState">
            <div class="dashboardEyebrow">No calibration tasks</div>
            <p>No ${escapeHtml(config.title)} tasks are currently assigned.</p>
          </div>
        `
      }
    </div>
  `;
}


let activeProfileMatrixId = "";
let profileMarkup = await renderModuleProfilePanel(activeProfileMatrixId);

function soleClamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function soleFormatPercent(value, decimals = 1) {
  const n = soleClamp(value);
  const whole = Math.round(n);

  if (Math.abs(n - whole) < 0.001) {
    return `${whole}%`;
  }

  return `${n.toFixed(decimals)}%`;
}

function soleFormatCandidates(value) {
  return Math.max(1, Math.round(Number(value) || 1)).toLocaleString();
}

function getSolemateDimensions() {
  const attraction = soleClamp(liveDashboardState.attraction);
  const connection = soleClamp(liveDashboardState.connection);
  const confidence = soleClamp(liveDashboardState.confidence);
  const messageSignal = soleClamp((liveMessageStats.count || 0) * 1.25);

  const dimensions = [
    {
      id: "physical_attraction",
      label: "Physical Attraction",
      confidence: Math.min(attraction, attraction * 0.82 + confidence * 0.18),
      weight: 26,
      copy: "Refined using attraction thresholds and preference signals."
    },
    {
      id: "attachment_style",
      label: "Attachment Style",
      confidence: connection * 0.52 + confidence * 0.28 + messageSignal * 0.20,
      weight: 11,
      copy: "Refined around closeness, reassurance, independence, and repair."
    },
    {
      id: "rapport",
      label: "Rapport",
      confidence: connection * 0.42 + confidence * 0.25 + messageSignal * 0.33,
      weight: 15,
      copy: "Refined around conversational rhythm, ease, humour, and response style."
    },
    {
      id: "shared_values",
      label: "Shared Values",
      confidence: connection * 0.60 + confidence * 0.32 + attraction * 0.08,
      weight: 13,
      copy: "Refined around priorities, convictions, and non-negotiables."
    },
    {
      id: "personality_alignment",
      label: "Personality Alignment",
      confidence: connection * 0.44 + attraction * 0.22 + confidence * 0.34,
      weight: 11,
      copy: "Refined around temperament, social energy, and everyday compatibility."
    },
    {
      id: "emotional_harmony",
      label: "Emotional Harmony",
      confidence: connection * 0.48 + confidence * 0.38 + messageSignal * 0.14,
      weight: 10,
      copy: "Refined around emotional steadiness, sensitivity, and conflict recovery."
    },
    {
      id: "lifestyle_compatibility",
      label: "Lifestyle Compatibility",
      confidence: connection * 0.34 + confidence * 0.42 + attraction * 0.08 + messageSignal * 0.16,
      weight: 8,
      copy: "Refined around routines, pace, habits, and the practical shape of daily life."
    },
    {
      id: "future_longevity",
      label: "Future Longevity",
      confidence: Math.min(
        connection,
        confidence * 0.46 + connection * 0.36 + Math.min(attraction, connection) * 0.18
      ),
      weight: 8,
      copy: "Refined around long-term stability, trajectory, and sustained fit."
    }
  ];

  return dimensions.map(item => ({
    ...item,
    confidence: soleClamp(item.confidence)
  }));
}

function getSolemateRefinementModel(dimensions) {
  const startingCandidates =
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437;

  const remainingCandidates = Math.max(
    1,
    Math.round(Number(liveDashboardState.remainingCandidates) || startingCandidates)
  );

  const totalRefined = Math.max(0, startingCandidates - remainingCandidates);
  const overallConfidence = soleClamp(liveDashboardState.confidence);
  const stage = overallConfidence / 100;

  const weighted = dimensions.map((item, index) => {
    let stageMultiplier = 1;

    if (item.id === "physical_attraction") {
      stageMultiplier = 1.35 - stage * 0.18;
    }

    if (item.id === "rapport" || item.id === "personality_alignment") {
      stageMultiplier = 1.12 - stage * 0.10;
    }

    if (
      item.id === "emotional_harmony" ||
      item.id === "lifestyle_compatibility" ||
      item.id === "future_longevity"
    ) {
      stageMultiplier = 0.70 + stage * 0.72;
    }

    const stableVariance = [
      1.04,
      0.96,
      1.08,
      1.01,
      0.94,
      1.03,
      0.98,
      1.06
    ][index] || 1;

    return {
      ...item,
      refinedWeight:
        item.weight *
        stageMultiplier *
        stableVariance *
        (0.42 + item.confidence / 100)
    };
  });

  const totalWeight = weighted.reduce((sum, item) => {
    return sum + item.refinedWeight;
  }, 0) || 1;

  let allocated = 0;

  const distributed = weighted.map((item, index) => {
    const isLast = index === weighted.length - 1;

    const refined = isLast
      ? Math.max(0, totalRefined - allocated)
      : Math.round(totalRefined * (item.refinedWeight / totalWeight));

    allocated += refined;

    return {
      ...item,
      candidatesRefined: refined
    };
  });

  return {
    startingCandidates,
    remainingCandidates,
    totalRefined,
    dimensions: distributed
  };
}

function renderSolematePortrait() {
  const portrait = window.currentSolematePortrait || null;

  const title = portrait?.title || "The outline is forming";
  const eyebrow = portrait?.eyebrow || "Solemate portrait";
  const bodyHtml = portrait?.body_html || `
    <p>
      Sole is beginning to assemble the profile of the person most likely to fit you.
      At this stage, the model is still broad: it can identify early patterns in attraction,
      communication, and emotional fit, but it is not yet confident enough to describe your
      highest-probability match with precision.
    </p>
  `;

  const note = portrait?.note || `
    This portrait becomes more specific as Sole gathers stronger attraction,
    connection, and conversational signals.
  `;

return `
  <section
    class="solematePortraitPanel ${portrait && !portrait.viewed_at ? "isUnread isNewlyUnlocked" : ""}"
    data-solemate-portrait="${escapeAttr(portrait?.id || "")}"
  >
    ${portrait && !portrait.viewed_at ? `<span class="insightUnreadDot"></span>` : ""}

    <div class="solematePortraitInner">

      <div class="solematePortraitKicker">
        ${escapeHtml(eyebrow)}
      </div>

      <h3>
        ${escapeHtml(title)}
      </h3>

      <div class="solematePortraitBody">
        ${bodyHtml}
      </div>

      <div class="solematePortraitNote">
        ${escapeHtml(note.trim())}
      </div>

    </div>
  </section>
`;
}

function renderSolemateTraits() {
  const fallbackTraits = [
    {
      eyebrow: "Type Trait",
      title: "Slow-burn trust",
      body: "You may be most compatible with people who build closeness gradually rather than forcing intensity early.",
      iconClass: "fa-solid fa-seedling"
    },
    {
      eyebrow: "Type Trait",
      title: "Playful rapport",
      body: "Sole is watching for conversational rhythm: humour, ease, and small moments of mutual escalation.",
      iconClass: "fa-solid fa-wand-magic-sparkles"
    },
    {
      eyebrow: "Type Trait",
      title: "Low-drama attachment",
      body: "Early signals suggest a preference for warmth and consistency over uncertainty, pursuit, or emotional volatility.",
      iconClass: "fa-solid fa-heart-circle-check"
    }
  ];

  const cards = moduleInsights.length
    ? moduleInsights.map(insight => {
        const iconClass = insight.icon_class || "fa-solid fa-sparkles";

        return `
          <div
            class="insightCard soleTraitUnlockCard ${insight.viewed_at ? "" : "isUnread isNewlyUnlocked"}"
            data-insight-card="${escapeAttr(insight.id)}"
          >
            <div class="soleTraitCardMain">
              <div class="soleTraitContent">
                <div class="soleTraitHeader">
          <div class="soleTraitIcon" aria-hidden="true">
                <i class="${escapeAttr(iconClass)}"></i>
              </div>
                        <div class="soleHeaderCopy" aria-hidden="true">
                        <div class="dashboardEyebrow">
                          ${escapeHtml(insight.eyebrow || "SoleMate trait")}
                        </div>
        
                        <div class="insightTitleRow">
                        
                          ${!insight.viewed_at ? `<span class="insightUnreadDot"></span>` : ""}
                          <h4>${escapeHtml(insight.title || "Untitled trait")}</h4>
                          <span class="insightExpandIcon">â€º</span>
                        </div>
                                </div>

                </div>

                <div class="insightBody">
                  ${insight.body_html || ""}
                </div>
              </div>


            </div>
          </div>
        `;
      })
    : fallbackTraits.map(trait => `
        <div class="insightCard soleTraitUnlockCard isOpen">
          <div class="soleTraitCardMain">
            <div class="soleTraitContent">
              <div class="dashboardEyebrow">${escapeHtml(trait.eyebrow)}</div>

              <div class="insightTitleRow">
                <h4>${escapeHtml(trait.title)}</h4>
              </div>

              <div class="insightBody">
                <p>${escapeHtml(trait.body)}</p>
              </div>
            </div>

            <div class="soleTraitIcon" aria-hidden="true">
              <i class="${escapeAttr(trait.iconClass)}"></i>
            </div>
          </div>
        </div>
      `);

  return `
    <section class="insightsPanel solemateTraitsPanel">
      ${cards.join("")}
    </section>
  `;
}

function renderSolemateModel() {
  const dimensions = getSolemateDimensions();
  const refinement = getSolemateRefinementModel(dimensions);

  const confidence = soleClamp(liveDashboardState.confidence);
  const refinedPercent = refinement.startingCandidates
    ? soleClamp((refinement.totalRefined / refinement.startingCandidates) * 100)
    : 0;

  const cx = 250;
  const cy = 250;

  const confidenceBaseRadius = 74;
  const confidenceTravelRadius = 92;

  const labelRadius = 222;
  const nodeRadius = 198 - refinedPercent * 0.64;

  const points = refinement.dimensions.map((item, index) => {
    const angle = -90 + index * 45;
    const rad = angle * Math.PI / 180;

    const radarRadius =
      confidenceBaseRadius + (item.confidence / 100) * confidenceTravelRadius;

    return {
      ...item,
      angle,
      radarX: cx + Math.cos(rad) * radarRadius,
      radarY: cy + Math.sin(rad) * radarRadius,
      labelX: cx + Math.cos(rad) * labelRadius,
      labelY: cy + Math.sin(rad) * labelRadius,
      nodeX: cx + Math.cos(rad) * nodeRadius,
      nodeY: cy + Math.sin(rad) * nodeRadius
    };
  });

  const polygonPoints = points.map(item => {
    return `${item.radarX.toFixed(2)},${item.radarY.toFixed(2)}`;
  }).join(" ");

  const labels = points.map(item => `
    <div
      class="solemateAxisLabel"
      style="--x:${(item.labelX / 500) * 100}%; --y:${(item.labelY / 500) * 100}%;"
    >
      <strong>${escapeHtml(item.label)}</strong>
      <span>${soleFormatPercent(item.confidence, 1)}</span>
    </div>
  `).join("");

  const confidenceNodes = points.map(item => `
    <circle
      class="solemateConfidenceNode"
      cx="${item.radarX.toFixed(2)}"
      cy="${item.radarY.toFixed(2)}"
      r="5"
      data-solemate-tooltip-title="${escapeAttr(item.label)}"
      data-solemate-tooltip-body="${escapeAttr(`Confidence: ${soleFormatPercent(item.confidence, 1)}`)}"
    ></circle>
  `).join("");

  const nodes = points.map(item => `
    <circle
      class="solemateRefinementNode"
      cx="${item.nodeX.toFixed(2)}"
      cy="${item.nodeY.toFixed(2)}"
      r="6"
      data-solemate-tooltip-title="${escapeAttr(item.label)}"
      data-solemate-tooltip-body="${escapeAttr(`Candidates filtered: ${soleFormatCandidates(item.candidatesRefined)}
${item.copy}`)}"
    ></circle>
  `).join("");

  const spokes = points.map(item => `
    <line
      class="solemateSpoke"
      x1="${cx}"
      y1="${cy}"
      x2="${item.labelX.toFixed(2)}"
      y2="${item.labelY.toFixed(2)}"
    />
  `).join("");

  return `
    <section class="solemateModelPanel">
      <div class="solemateModelHeader">
        <p>
          Dimension percentages represent Soleâ€™s confidence in each part of your
          highest-probability match profile.
        </p>

        <div class="solemateModelKey" aria-label="Solemate model key">
          <div class="solemateModelKeyItem">
            <span class="solemateKeyDot confidence"></span>
            <span>Confidence</span>
          </div>

          <div class="solemateModelKeyItem">
            <span class="solemateKeyDot refinement"></span>
            <span>Candidate refinement</span>
          </div>
        </div>
      </div>

      <div class="solemateChartWrap">
        <svg class="solemateChartSvg" viewBox="0 0 500 500" aria-label="Solemate model">
          <defs>
            <radialGradient id="solemateFillGradient" cx="50%" cy="45%" r="58%">
              <stop offset="0%" stop-color="rgba(255,255,255,.72)" />
              <stop offset="45%" stop-color="rgba(255,145,119,.34)" />
              <stop offset="100%" stop-color="rgba(255,112,91,.18)" />
            </radialGradient>
          </defs>

          <circle class="solemateCoreBoundary" cx="250" cy="250" r="74"></circle>
          <circle class="solemateGridCircle" cx="250" cy="250" r="108"></circle>
          <circle class="solemateGridCircle" cx="250" cy="250" r="142"></circle>
          <circle class="solemateGridCircle" cx="250" cy="250" r="166"></circle>
          <circle class="solemateOuterGuide" cx="250" cy="250" r="206"></circle>

          ${spokes}

          <polygon class="solemateConfidenceFill" points="${polygonPoints}"></polygon>
          <polyline class="solemateConfidenceStroke" points="${polygonPoints} ${points[0].radarX.toFixed(2)},${points[0].radarY.toFixed(2)}"></polyline>

          <circle
            class="solemateActiveOrbit"
            cx="250"
            cy="250"
            r="${nodeRadius.toFixed(2)}"
          ></circle>

          ${confidenceNodes}
          ${nodes}
        </svg>

        ${labels}

        <div class="solemateCandidateCore">
          <strong>${soleFormatCandidates(refinement.remainingCandidates)}</strong>
          <span>SoleMate pool</span>
        </div>
      </div>

      <div class="solemateModelHint">
        Hover a refinement point to see how many candidates that dimension has filtered.
      </div>

      <div class="solemateTooltip" data-solemate-tooltip hidden>
        <strong data-solemate-tooltip-title></strong>
        <div data-solemate-tooltip-body></div>
      </div>
    </section>
  `;
}

function bindSolemateTooltips() {
  const tooltip = subviewContentEl.querySelector("[data-solemate-tooltip]");
  if (!tooltip) return;

  const titleEl = tooltip.querySelector("[data-solemate-tooltip-title]");
  const bodyEl = tooltip.querySelector("[data-solemate-tooltip-body]");

  subviewContentEl
    .querySelectorAll("[data-solemate-tooltip-title]")
    .forEach(node => {
      if (node === titleEl) return;

      node.addEventListener("mouseenter", () => {
        titleEl.textContent = node.dataset.solemateTooltipTitle || "";
        bodyEl.textContent = node.dataset.solemateTooltipBody || "";

        tooltip.hidden = false;
        tooltip.style.display = "block";
      });

      node.addEventListener("mousemove", event => {
        const containerRect = subviewContentEl.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = event.clientX - containerRect.left + 16;
        let top = event.clientY - containerRect.top + 16;

        const maxLeft = containerRect.width - tooltipRect.width - 14;
        const maxTop = containerRect.height - tooltipRect.height - 14;

        if (left > maxLeft) {
          left = event.clientX - containerRect.left - tooltipRect.width - 16;
        }

        if (top > maxTop) {
          top = event.clientY - containerRect.top - tooltipRect.height - 16;
        }

        tooltip.style.left = `${Math.max(14, left)}px`;
        tooltip.style.top = `${Math.max(14, top)}px`;
      });

      node.addEventListener("mouseleave", () => {
        tooltip.hidden = true;
        tooltip.style.display = "none";
      });
    });
}

async function renderSubviewContent() {

if (screen === "solemate") {
  if (activeSubview === "portrait") {
    return renderSolematePortrait();
  }

  if (activeSubview === "traits") {
    return renderSolemateTraits();
  }

  if (activeSubview === "model") {
    return renderSolemateModel();
  }
}

  if (activeQuizAssignment) {
    return await renderAssignments(me, [activeQuizAssignment], escapeHtml, {
      adminPreview: false,
      sb
    });
  }

  if (activeSubview === "insights") {
    return `
      <div class="insightsPanel">
        ${
          moduleInsights.length
            ? moduleInsights.map(insight => {
                const date = new Date(insight.created_at);

const formattedDate = `${date.toLocaleTimeString([], {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
})}, ${date.toLocaleDateString([], {
  day: "2-digit",
  month: "short"
}).toUpperCase()}`;

                return `
                  <div class="insightCard ${insight.viewed_at ? "" : "isUnread"}" data-insight-card="${escapeAttr(insight.id)}">
                    <div class="dashboardEyebrow">
                     ${escapeHtml(insight.eyebrow || `${config.eyebrow} insight`)}
                    </div>

                    <div class="insightMeta">
                      ${escapeHtml(formattedDate)}
                    </div>

<div class="insightTitleRow">
  ${!insight.viewed_at ? `<span class="insightUnreadDot"></span>` : ""}
  <h4>${escapeHtml(insight.title || "Untitled insight")}</h4>
  <span class="insightExpandIcon">Ã¢â‚¬Âº</span>
</div>

<div class="insightBody">
  ${insight.body_html || ""}
</div>
                  </div>
                `;
              }).join("")
            : `
                <div class="insightCard">
                  <div class="dashboardEyebrow">Emerging Pattern</div>
                  <h4>Analysis pending</h4>
                  <p>
                    ${escapeHtml(config.title)} insights will appear here once your responses have been reviewed.
                  </p>
                </div>
              `
        }
      </div>
    `;
  }

    if (activeSubview === "profile") {
    return profileMarkup;
  }

return renderModuleCalibrationList();
}

const moduleProgress = getModuleProgressPercent();
const moduleMeta = getModuleHeroMeta();

const moduleProgressCacheKey = `${me?.id || "anonymous"}:${screen || "module"}`;

window.soleModuleHeroProgressCache = window.soleModuleHeroProgressCache || {};

const moduleDisplayProgress =
  typeof window.soleModuleHeroProgressCache[moduleProgressCacheKey] === "number"
    ? window.soleModuleHeroProgressCache[moduleProgressCacheKey]
    : moduleProgress;

const quizProgressCacheKey = activeQuizAssignment
  ? `${me?.id || "anonymous"}:${activeQuizAssignment.id || "quiz"}`
  : "";

window.soleQuizInlineProgressCache = window.soleQuizInlineProgressCache || {};

const quizDisplayProgress =
  activeQuizAssignment &&
  typeof window.soleQuizInlineProgressCache[quizProgressCacheKey] === "number"
    ? window.soleQuizInlineProgressCache[quizProgressCacheKey]
    : activeQuizProgress?.progressPercent || 0;

function renderActiveQuizMetricDock() {
  const localMetricState = liveDashboardState || {};
  const startingPool =
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437;

  const localHasSignal =
    Number(localMetricState.attraction) > 0 ||
    Number(localMetricState.connection) > 0 ||
    Number(localMetricState.confidence) > 0 ||
    Number(localMetricState.remainingCandidates) < startingPool ||
    Number(localMetricState.candidates) < startingPool;

  const metricState = localHasSignal
    ? localMetricState
    : (
        window.getLatestSoleMetricSnapshot?.(localMetricState) ||
        localMetricState
      );

  const startingCandidates =
    Math.max(
      1,
      Number(metricState.startingCandidates) ||
      window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL ||
      102437
    );

  const remainingCandidates = Math.max(
    1,
    Math.round(
      Number(metricState.remainingCandidates ?? metricState.candidates) ||
      startingCandidates
    )
  );

  const candidateRefinement = startingCandidates
    ? Math.max(
        0,
        Math.min(
          100,
          ((startingCandidates - remainingCandidates) / startingCandidates) * 100
        )
      )
    : 0;

  const clampMetric = value => Math.max(0, Math.min(100, Number(value || 0)));

  const metrics = [
    {
      key: "attraction",
      label: "Attraction",
      value: clampMetric(metricState.attraction),
      display: formatSmartPercent(metricState.attraction || 0, 2)
    },
    {
      key: "connection",
      label: "Connection",
      value: clampMetric(metricState.connection),
      display: formatSmartPercent(metricState.connection || 0, 2)
    },
    {
      key: "confidence",
      label: "Confidence",
      value: clampMetric(metricState.confidence),
      display: formatSmartPercent(metricState.confidence || 0, 2)
    },
    {
      key: "candidates",
      label: "Candidates",
      value: candidateRefinement,
      display: remainingCandidates.toLocaleString()
    }
  ];

  const circumference = 2 * Math.PI * 18;

  window.soleQuizMetricDockEntrySeen = window.soleQuizMetricDockEntrySeen || {};

const dockEntryKey = [
  me?.id || "anonymous",
  screen || "module",
  activeQuizAssignment?.id || "quiz"
].join(":");

const shouldAnimateDockEntry = !window.soleQuizMetricDockEntrySeen[dockEntryKey];

window.soleQuizMetricDockEntrySeen[dockEntryKey] = true;

return `
  <div class="moduleQuizMetricDock${shouldAnimateDockEntry ? " isEntering" : ""}" aria-label="Sole model status">
      ${metrics.map(metric => {
        const dash = (metric.value / 100) * circumference;
        const gap = circumference - dash;

        return `
          <article
            class="moduleQuizMetricPill"
            data-quiz-metric="${metric.key}"
            data-metric-value="${escapeAttr(String(metric.display))}"
            data-metric-percent="${escapeAttr(String(metric.value))}"
          >
            <div class="moduleQuizMetricDial">
              <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle class="moduleQuizMetricTrack" cx="22" cy="22" r="18"></circle>
                <circle
                  class="moduleQuizMetricFill"
                  cx="22"
                  cy="22"
                  r="18"
                  style="stroke-dasharray:${dash} ${gap}"
                ></circle>
              </svg>

              <strong class="moduleQuizMetricValue">${metric.display}</strong>
            </div>

            <div class="moduleQuizMetricText">
              <span>${metric.label}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}
const subviewHtml = await renderSubviewContent();

sidebarPaneEl.innerHTML = `
<div class="moduleHero">
<div class="moduleHeroTop">
  <button class="sidebarBackBtn" type="button" data-sidebar-back>
    <i class="fa-solid fa-arrow-left"></i>
  </button>
</div>

  <div class="moduleHeroMain">
<div class="moduleHeroCopy">
<div class="moduleHeroEyebrow">
  ${escapeHtml(
    activeQuizAssignment
      ? (screen === "chemistry" ? "Connection" : "Attraction")
      : moduleMeta.title
  )}
</div>

<h2>
  ${escapeHtml(activeQuizAssignment ? activeQuizAssignment.title : moduleMeta.eyebrow)}
</h2>

<p>
  ${escapeHtml(activeQuizAssignment ? (activeQuizAssignment.prompt || "") : moduleMeta.intro)}
</p>

${
  activeQuizAssignment && activeQuizProgress
    ? `
<div class="moduleQuizProgress">
  <div class="quizStepMeta">
    <span>${activeQuizProgress.currentDisplayStep} of ${activeQuizProgress.totalSteps}</span>
    <span>${activeQuizProgress.progressPercent}%</span>
  </div>

  <div class="quizInlineProgress">
<div
  class="quizInlineProgressBar"
  data-quiz-progress="${activeQuizProgress.progressPercent}"
  style="width:${quizDisplayProgress}%"
></div>
  </div>
</div>
    `
    : screen === "solemate"
      ? `
        <div class="moduleSubviewTabs solemateTabs">
          <button
            class="moduleSubviewTab ${activeSubview === "portrait" ? "active" : ""}"
            data-module-subview="portrait"
            type="button"
          >
            Portrait
          </button>

          <button
            class="moduleSubviewTab ${activeSubview === "traits" ? "active" : ""}"
            data-module-subview="traits"
            type="button"
          >
            Traits
          </button>

          <button
            class="moduleSubviewTab ${activeSubview === "model" ? "active" : ""}"
            data-module-subview="model"
            type="button"
          >
            SoleMate
          </button>
        </div>
      `
      : `
        <div class="moduleSubviewTabs">
          <button
            class="moduleSubviewTab ${activeSubview === "calibration" ? "active" : ""}"
            data-module-subview="calibration"
            type="button"
          >
            Calibration
          </button>

          <button
            class="moduleSubviewTab ${activeSubview === "profile" ? "active" : ""}"
            data-module-subview="profile"
            type="button"
          >
            Profile
          </button>
        </div>
      `
}
</div>

${
  activeQuizAssignment
    ? ``
    : `
      <div class="moduleHeroProgressCard" aria-label="${escapeAttr(moduleMeta.eyebrow)} progress">
        <button class="sidebarInfoBtn moduleHeroInfoBtn" type="button" data-sidebar-info title="About this module">
          <i class="fa-solid fa-info"></i>
        </button>

        <div class="moduleMiniRing" data-module-progress="${moduleProgress}">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="moduleRingTrack" cx="60" cy="60" r="46"></circle>
            <circle
              class="moduleRingFill"
              cx="60"
              cy="60"
              r="46"
              style="stroke-dasharray:${((moduleDisplayProgress / 100) * (2 * Math.PI * 46))} ${(2 * Math.PI * 46) - ((moduleDisplayProgress / 100) * (2 * Math.PI * 46))}"
            />
          </svg>

          <div class="moduleMiniRingInner">
            <strong data-module-progress-value>${formatSmartPercent(moduleDisplayProgress, 2)}</strong>
          </div>
        </div>

        <div class="moduleHeroProgressLabel">calibrated</div>
      </div>
    `
}
  </div>
</div>

<div class="moduleSubviewContent" id="moduleSubviewContent">
  ${subviewHtml}
</div>

${activeQuizAssignment ? renderActiveQuizMetricDock() : ""}

`;

const subviewContentEl = sidebarPaneEl.querySelector("#moduleSubviewContent");

subviewContentEl?.addEventListener("click", async event => {
  const continueBtn = event.target.closest("[data-completed-quiz-continue]");
  if (!continueBtn) return;

  await mountSidebarDashboardScreen({
    screen,
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    activeAssignmentId: null
  });
});

async function renderActiveModuleAssignment(assignment) {
  subviewContentEl.innerHTML = await renderAssignments(me, [assignment], escapeHtml, {
    adminPreview: false,
    sb
  });

  initAssignmentInteractions({
    assignment,
    mainEl,
    messagesEl: sidebarPaneEl,
    sb,
    me,
    escapeHtml,
    adminPreview: false,
    onRefresh: async () => {
      await renderActiveModuleAssignment(assignment);
    }
  });

  bindRankingQuestion({
  messagesEl: sidebarPaneEl,
  sb,
  me,
  assignment
});

  window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);
  window.soleMatrixRendering?.animateMatrices?.(sidebarPaneEl);
}

function scrollCurrentModuleAssignmentIntoView() {
  const currentCard = subviewContentEl.querySelector(
    "[data-current-module-assignment='true']"
  );

  if (!currentCard) return;

  window.setTimeout(() => {
    currentCard.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, 180);
}

function bindCalibrationCards() {
  subviewContentEl.querySelectorAll("[data-module-calibration-card]").forEach(card => {
    card.addEventListener("click", async () => {
      const assignmentId = card.dataset.moduleCalibrationCard;
const assignment = filteredAssignments.find(item => item.id === assignmentId);

if (!assignment) return;
if (isAssignmentLockedForUser(assignment, me)) return;
if (getAssignmentResponse(me, assignment.id)?.completed) return;

activeAssignmentId = assignment.id;
activeSubview = "calibration";

await mountSidebarDashboardScreen({
  screen,
  sidebarPaneEl,
  mainEl,
  sb,
  me,
  escapeHtml,
  activeAssignmentId: assignment.id
});

    });
  });
}

function bindMatrixSwitcher() {
  const profilePanel = subviewContentEl.querySelector("[data-module-profile-panel]");
  if (!profilePanel) return;

  const switcherBtn = profilePanel.querySelector("[data-matrix-switcher-button]");
  const switcherMenu = profilePanel.querySelector("[data-matrix-switcher-menu]");

  if (switcherBtn && switcherMenu) {
    switcherBtn.addEventListener("click", event => {
      event.stopPropagation();
      switcherMenu.hidden = !switcherMenu.hidden;
    });
  }

  profilePanel.querySelectorAll("[data-switch-matrix-id]").forEach(option => {
    option.addEventListener("click", async event => {
      event.stopPropagation();

      const matrixId = option.dataset.switchMatrixId;
      if (!matrixId) return;

      subviewContentEl.innerHTML = await renderModuleProfilePanel(matrixId);

      bindMatrixSwitcher();
      window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);
    });
  });

  document.addEventListener(
    "click",
    () => {
      const openMenu = subviewContentEl.querySelector("[data-matrix-switcher-menu]");
      if (openMenu) openMenu.hidden = true;
    },
    { once: true }
  );
}

function getUserScoreAdjustments(me) {
  return {
    connectionDelta: Number(me?.score_connection_delta || 0),
    attractionDelta: Number(me?.score_attraction_delta || 0),
    confidenceDelta: Number(me?.score_confidence_delta || 0),
    candidatePoolDelta: Number(me?.score_candidate_pool_delta || 0)
  };
}

function bindInsightCards() {
  subviewContentEl.querySelectorAll("[data-insight-card]").forEach(card => {
    card.addEventListener("click", async () => {
      card.classList.toggle("isOpen");
      card.classList.remove("isUnread");

      await sb
        .from("user_insights")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", card.dataset.insightCard)
        .is("viewed_at", null);

      await updateInsightNotificationDots?.();
      await updateSolemateTraitNotificationDot?.();
      await updateSolematePortraitNotificationDot?.();
    });
  });
}

async function bindSolematePortraitCard() {
  const card = document.querySelector("[data-solemate-portrait]");
  if (!card || !me?.id) return;

  card.addEventListener("click", async () => {
    const portraitId = card.dataset.solematePortrait;
    if (!portraitId || !card.classList.contains("isUnread")) return;

    const { error } = await sb
      .from("user_solemate_portraits")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", portraitId)
      .eq("user_id", me.id);

  if (error) {
  console.error("Portrait viewed update failed", error);
  return;
}

    card.classList.remove("isUnread");
    card.querySelector(".insightUnreadDot")?.remove();

    await updateSolematePortraitNotificationDot?.();
  });
}

bindInsightCards();
await bindSolematePortraitCard();
bindCalibrationCards();
bindMatrixSwitcher();
bindSolemateTooltips();

window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);

window.soleMatrixRendering?.bindSwitchers?.({
  rootEl: sidebarPaneEl,
  sb,
  me,
  escapeHtml,
  escapeAttr
});

const quizMetricDock = sidebarPaneEl.querySelector(".moduleQuizMetricDock.isEntering");

if (quizMetricDock) {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      quizMetricDock.classList.remove("isEntering");
    }, 520);
  });
}

await updateInsightNotificationDots?.();
await updateSolemateTraitNotificationDot?.();
await updateSolematePortraitNotificationDot?.();

if (!activeQuizAssignment && activeSubview === "calibration") {
  scrollCurrentModuleAssignmentIntoView();
}


if (activeQuizAssignment) {
  initAssignmentInteractions({
    assignment: activeQuizAssignment,
    mainEl,
    messagesEl: sidebarPaneEl,
    sb,
    me,
    escapeHtml,
    adminPreview: false,
onRefresh: async () => {
  await mountSidebarDashboardScreen({
    screen,
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    activeAssignmentId: activeQuizAssignment.id
  });
},

onProgressChange: async () => {
  const dash = getDashboardState(
    me,
    liveMessageStats.count || 0,
    runtimeAssignments,
    liveMessageStats
  );

  liveDashboardState = dash;

  window.rememberLatestSoleMetricSnapshot?.({
  attraction: dash.attraction,
  connection: dash.connection,
  confidence: dash.confidence,
  candidates: dash.remainingCandidates,
  startingCandidates:
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437
});

  const startingCandidates =
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437;

  window.updateModuleQuizMetricDock?.({
    attraction: dash.attraction,
    connection: dash.connection,
    confidence: dash.confidence,
    candidates: dash.remainingCandidates,
    startingCandidates
  });

  window.updateSidebarProgress?.({
    attraction: dash.attraction,
    connection: dash.connection,
    confidence: dash.confidence,
    candidates: dash.remainingCandidates,
    startingCandidates
  });
},

onOptimisticAdvance: ({ nextStep, answers }) => {
  const totalSteps = getAssignmentStepTotal(activeQuizAssignment);

  const completedSteps = getCompletedStepCount(
    activeQuizAssignment,
    nextStep,
    answers
  );

  const nextProgress = totalSteps
    ? Math.round((completedSteps / totalSteps) * 100)
    : 0;

  animateQuizInlineProgressTo({
    rootEl: sidebarPaneEl,
    userId: me?.id,
    assignmentId: activeQuizAssignment.id,
    targetProgress: nextProgress
  });
}
  });

  bindRankingQuestion({
    messagesEl: sidebarPaneEl,
    sb,
    me,
    assignment: activeQuizAssignment
  });
}

sidebarPaneEl.querySelectorAll("[data-module-subview]").forEach(btn => {
btn.addEventListener("click", async () => {
    activeSubview = btn.dataset.moduleSubview;

    sidebarPaneEl.querySelectorAll("[data-module-subview]").forEach(el => {
      el.classList.toggle("active", el.dataset.moduleSubview === activeSubview);
    });

subviewContentEl.innerHTML = await renderSubviewContent();

bindInsightCards();
await bindSolematePortraitCard();
bindCalibrationCards();
bindMatrixSwitcher();
bindSolemateTooltips();
window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);

const quizMetricDock = sidebarPaneEl.querySelector(".moduleQuizMetricDock.isEntering");

if (quizMetricDock) {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      quizMetricDock.classList.remove("isEntering");
    }, 520);
  });
}

await updateInsightNotificationDots?.();
await updateSolemateTraitNotificationDot?.();
await updateSolematePortraitNotificationDot?.();

if (activeSubview === "calibration") {
  scrollCurrentModuleAssignmentIntoView();
}


  });
});

animateModuleHeroProgress({
  rootEl: sidebarPaneEl,
  userId: me?.id,
  screen
});

if (activeQuizAssignment) {
  animateQuizInlineProgress({
    rootEl: sidebarPaneEl,
    userId: me?.id,
    assignmentId: activeQuizAssignment.id
  });
}

async function refreshLiveSolemateModel() {
  if (screen !== "solemate") return;
  if (!sidebarPaneEl.isConnected) return;

  const stillOnSolemate = !!sidebarPaneEl.querySelector(".moduleSubviewTabs.solemateTabs");

  if (!stillOnSolemate) {
    if (window.soleSidebarModuleRefreshTimer) {
      clearInterval(window.soleSidebarModuleRefreshTimer);
      window.soleSidebarModuleRefreshTimer = null;
    }
    return;
  }

  const previousConfidence = Number(liveDashboardState.confidence || 0);
  const previousCandidates = Number(liveDashboardState.remainingCandidates || 0);

  try {
    liveMessageStats = window.getDailyMessageStats
      ? await window.getDailyMessageStats(
          sb,
          me,
          me?.score_baseline_set_at || null
        )
      : { count: 0, totalChars: 0, averageChars: 0 };

    const dash = getDashboardState(
      me,
      liveMessageStats.count || 0,
      runtimeAssignments,
      liveMessageStats
    );

    liveDashboardState = dash;

    liveProgress = Math.max(
      0,
      Math.min(100, Number(dash?.[config.progressKey] || 0))
    );

    const nextConfidence = Number(liveDashboardState.confidence || 0);
    const nextCandidates = Number(liveDashboardState.remainingCandidates || 0);

    const hasChanged =
      Math.abs(nextConfidence - previousConfidence) > 0.001 ||
      nextCandidates !== previousCandidates;

    if (!hasChanged) return;

    const moduleRingWrap = sidebarPaneEl.querySelector(".moduleMiniRing");
    if (moduleRingWrap) {
      moduleRingWrap.dataset.moduleProgress = String(liveProgress);
    }

    animateModuleHeroProgress({
      rootEl: sidebarPaneEl,
      userId: me?.id,
      screen
    });

    if (activeQuizAssignment) {
  animateQuizInlineProgress({
    rootEl: sidebarPaneEl,
    userId: me?.id,
    assignmentId: activeQuizAssignment.id
  });
}

    subviewContentEl.innerHTML = await renderSubviewContent();

    bindInsightCards();
    bindCalibrationCards();
    bindMatrixSwitcher();
    bindSolemateTooltips();
    window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);
  } catch (error) {
    console.warn("Could not refresh live Solemate model", error);
  }
}

if (screen === "solemate") {
  window.soleSidebarModuleRefreshTimer = window.setInterval(
    refreshLiveSolemateModel,
    2500
  );
}

sidebarPaneEl.querySelector("[data-sidebar-info]")?.addEventListener("click", () => {
  alert(`${config.title}\n\n${config.intro}`);
});

sidebarPaneEl.querySelector("[data-sidebar-back]")?.addEventListener("click", async () => {
  if (activeQuizAssignment) {
    await mountSidebarDashboardScreen({
      screen,
      sidebarPaneEl,
      mainEl,
      sb,
      me,
      escapeHtml,
      activeAssignmentId: null
    });
    return;
  }

  window.sidebarDashboardUI?.renderMenu?.();
});

}

async function mountAdminUserTasks({
  mountEl,
  sb,
  me,
  user,
  escapeHtml,
  escapeAttr
}) {
  if (!mountEl || !user?.id) return;

  let tasks = [];

  try {
    tasks = await loadUserTasksFromSupabase(sb, user.id);
  } catch (error) {
    mountEl.innerHTML = `<div class="adminQuizError">${escapeHtml(error?.message || "Could not load tasks.")}</div>`;
    return;
  }

  mountEl.innerHTML = `
    <div class="adminQuizBuilder" data-admin-task-builder>
      <div class="adminQuizFieldRow">
        <div class="adminQuizField">
          <label>Task title</label>
          <input type="text" data-task-field="title" placeholder="Ask your partner about their childhood" />
        </div>

        <div class="adminQuizField">
          <label>Task type</label>
          <select data-task-field="taskType">
            <option value="manual">Manual</option>
            <option value="reply_goal">Reply goal</option>
          </select>
        </div>

        <div class="adminQuizField">
          <label>Status</label>
          <select data-task-field="status">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div class="adminQuizField">
        <label>Description</label>
        <textarea rows="3" data-task-field="description" placeholder="Optional supporting detail"></textarea>
      </div>

      <div class="adminQuizFieldRow">
      <div class="adminQuizField">
  <label>Icon</label>
  <input
    type="text"
    data-insight-field="iconClass"
    placeholder="fa-solid fa-person-walking-luggage"
  />
</div>
        <div class="adminQuizField">
          <label>Category</label>
          <select data-task-field="category">
            <option value="general">SoleMate</option>
            <option value="chemistry">Connection</option>
            <option value="attraction">Attraction</option>
          </select>
        </div>

        <div class="adminQuizField">
          <label>Target replies</label>
          <input type="number" min="1" data-task-field="targetCount" placeholder="50" />
        </div>

        <div class="adminQuizField">
          <label>Timeframe minutes</label>
          <input type="number" min="1" data-task-field="timeframeMinutes" placeholder="1440" />
        </div>
      </div>

      <div class="adminQuizActions">
        <button type="button" class="btn" data-save-task>Save task</button>
      </div>
    </div>

    <div class="adminUserOverrideList">
      ${tasks.length ? tasks.map(task => `
        <article class="adminUserOverrideRow">
          <div>
            <strong>${escapeHtml(task.title || "Untitled task")}</strong>
            <div class="muted">
                           ${escapeHtml(task.task_type)} Ã‚Â· ${escapeHtml(task.status)}
            </div>
          </div>

          <div class="adminUserActions">
            ${task.status !== "completed" ? `
              <button class="btn btnGhost" data-complete-task="${escapeAttr(task.id)}">Mark complete</button>
            ` : ""}
            <button class="btn btnGhost" data-edit-task="${escapeAttr(task.id)}">Edit</button>
            <button class="btn btnGhost" data-delete-task="${escapeAttr(task.id)}">Delete</button>
          </div>
        </article>
      `).join("") : `<p class="muted">No tasks yet for ${escapeHtml(user.display_name)}.</p>`}
    </div>
  `;

  let editingTaskId = "";

  const getField = name => mountEl.querySelector(`[data-task-field="${name}"]`);

  mountEl.querySelector("[data-save-task]")?.addEventListener("click", async () => {
    const payload = {
      userId: user.id,
      title: getField("title")?.value?.trim() || "",
      description: getField("description")?.value?.trim() || "",
      taskType: getField("taskType")?.value || "manual",
      category: getField("category")?.value || "general",
      status: getField("status")?.value || "active",
      targetCount: Number(getField("targetCount")?.value || 0) || null,
      timeframeMinutes: Number(getField("timeframeMinutes")?.value || 0) || null
    };

    if (!payload.title) {
      alert("Add a task title.");
      return;
    }

    try {
      if (editingTaskId) {
        await updateUserTaskInSupabase(sb, editingTaskId, payload);
      } else {
        await createUserTaskInSupabase(sb, me, payload);
      }

      await mountAdminUserTasks({ mountEl, sb, me, user, escapeHtml, escapeAttr });
    } catch (error) {
      alert(error?.message || "Could not save task.");
    }
  });

  mountEl.querySelectorAll("[data-edit-task]").forEach(button => {
    button.addEventListener("click", () => {
      const task = tasks.find(item => item.id === button.dataset.editTask);
      if (!task) return;

      editingTaskId = task.id;

      getField("title").value = task.title || "";
      getField("description").value = task.description || "";
      getField("taskType").value = task.task_type || "manual";
      getField("category").value = task.category || "general";
      getField("status").value = task.status || "active";
      getField("targetCount").value = task.target_count || "";
      getField("timeframeMinutes").value = task.timeframe_minutes || "";

      mountEl.querySelector("[data-save-task]").textContent = "Update task";
    });
  });

  mountEl.querySelectorAll("[data-complete-task]").forEach(button => {
    button.addEventListener("click", async () => {
      await completeUserTaskInSupabase(sb, button.dataset.completeTask);
      await mountAdminUserTasks({ mountEl, sb, me, user, escapeHtml, escapeAttr });
    });
  });

  mountEl.querySelectorAll("[data-delete-task]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this task?")) return;
      await deleteUserTaskFromSupabase(sb, button.dataset.deleteTask);
      await mountAdminUserTasks({ mountEl, sb, me, user, escapeHtml, escapeAttr });
    });
  });
}

async function loadUserSolematePortraitFromSupabase(sb, userId) {
  const { data, error } = await sb
    .from("user_solemate_portraits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function saveUserSolematePortraitInSupabase(sb, me, userId, payload) {
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("user_solemate_portraits")
    .upsert(
      {
        user_id: userId,
        eyebrow: payload.eyebrow || "Solemate portrait",
        title: payload.title || "The outline is forming",
        body_html: payload.bodyHtml || "",
        note: payload.note || "",
        status: payload.status || "revealed",
        viewed_at: null,
        created_by: me?.id || null,
        updated_at: now
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function mountAdminUserInsights({
  mountEl,
  sb,
  me,
  user,
  escapeHtml,
  escapeAttr
}) {
  if (!mountEl || !user?.id) return;

  let insights = [];

  try {
    insights = await loadUserInsightsFromSupabase(sb, user.id);
  } catch (error) {
    mountEl.innerHTML = `<div class="adminQuizError">${escapeHtml(error?.message || "Could not load insights.")}</div>`;
    return;
  }

  mountEl.innerHTML = `
    <div class="adminQuizBuilder" data-admin-insight-builder>
      <div class="adminQuizFieldRow">
        <div class="adminQuizField">
          <label>Title</label>
          <input type="text" data-insight-field="title" placeholder="Emerging pattern" />
        </div>

        <div class="adminQuizField">
          <label>Topline</label>
          <input
            type="text"
            data-insight-field="eyebrow"
            placeholder="Mapping insight"
          />
        </div>

        <div class="adminQuizField">
          <label>Font Awesome icon</label>
          <input
            type="text"
            data-insight-field="iconClass"
            placeholder="fa-solid fa-person-walking-luggage"
          />
        </div>

        <div class="adminQuizField">
          <label>Category</label>
          <select data-insight-field="category">
            <option value="general">SoleMate</option>
            <option value="chemistry">Connection</option>
            <option value="attraction">Attraction</option>
          </select>
        </div>

        <div class="adminQuizField">
          <label>Status</label>
          <select data-insight-field="status">
            <option value="draft">Draft</option>
            <option value="revealed">Revealed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div class="adminQuizField">
        <label>Insight body</label>

        <div class="insightEditorToolbar">
          <button type="button" class="btn btnGhost" data-insight-format="bold">Bold</button>
          <button type="button" class="btn btnGhost" data-insight-format="italic">Italic</button>
          <button type="button" class="btn btnGhost" data-insight-format="insertUnorderedList">Bullets</button>
        </div>

        <div
          class="insightRichEditor"
          contenteditable="true"
          data-insight-field="bodyHtml"
        ></div>
      </div>

      <div class="adminQuizActions">
        <button type="button" class="btn" data-save-insight>
          Save insight
        </button>
      </div>
    </div>

    <div class="adminUserOverrideList">
      ${insights.length ? insights.map(insight => `
        <article class="adminUserOverrideRow">
          <div>
            <strong>${escapeHtml(insight.title || "Untitled insight")}</strong>
            <div class="muted">
              ${escapeHtml(insight.category === "general" ? "SoleMate" : insight.category)}
              Â·
              ${escapeHtml(insight.status)}
              ${
                insight.icon_class
                  ? `Â· <i class="${escapeAttr(insight.icon_class)}"></i> ${escapeHtml(insight.icon_class)}`
                  : ""
              }
            </div>
          </div>

          <div class="adminUserActions">
            <button class="btn btnGhost" data-edit-insight="${escapeAttr(insight.id)}">Edit</button>
            <button class="btn btnGhost" data-delete-insight="${escapeAttr(insight.id)}">Delete</button>
          </div>
        </article>
      `).join("") : `<p class="muted">No insights yet for ${escapeHtml(user.display_name)}.</p>`}
    </div>
  `;

  let editingInsightId = "";

  const getField = name => mountEl.querySelector(`[data-insight-field="${name}"]`);

  mountEl.querySelectorAll("[data-insight-format]").forEach(button => {
    button.addEventListener("click", () => {
      document.execCommand(button.dataset.insightFormat, false, null);
      getField("bodyHtml")?.focus();
    });
  });

  mountEl.querySelector("[data-save-insight]")?.addEventListener("click", async () => {
    const payload = {
      userId: user.id,
      title: getField("title")?.value?.trim() || "",
      eyebrow: getField("eyebrow")?.value?.trim() || "",
      iconClass: getField("iconClass")?.value?.trim() || "",
      category: getField("category")?.value || "general",
      status: getField("status")?.value || "draft",
      bodyHtml: getField("bodyHtml")?.innerHTML || ""
    };

    if (!payload.title) {
      alert("Add an insight title.");
      return;
    }

    try {
      if (editingInsightId) {
        await updateUserInsightInSupabase(sb, editingInsightId, payload);
      } else {
        await createUserInsightInSupabase(sb, me, payload);
      }

      await mountAdminUserInsights({ mountEl, sb, me, user, escapeHtml, escapeAttr });
    } catch (error) {
      alert(error?.message || "Could not save insight.");
    }
  });

  mountEl.querySelectorAll("[data-edit-insight]").forEach(button => {
    button.addEventListener("click", () => {
      const insight = insights.find(item => item.id === button.dataset.editInsight);
      if (!insight) return;

      editingInsightId = insight.id;

      getField("title").value = insight.title || "";
      getField("eyebrow").value = insight.eyebrow || "";
      getField("iconClass").value = insight.icon_class || "";
      getField("category").value = insight.category || "general";
      getField("status").value = insight.status || "draft";
      getField("bodyHtml").innerHTML = insight.body_html || "";

      mountEl.querySelector("[data-save-insight]").textContent = "Update insight";
    });
  });

  mountEl.querySelectorAll("[data-delete-insight]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this insight?")) return;

      try {
        await deleteUserInsightFromSupabase(sb, button.dataset.deleteInsight);
        await mountAdminUserInsights({ mountEl, sb, me, user, escapeHtml, escapeAttr });
      } catch (error) {
        alert(error?.message || "Could not delete insight.");
      }
    });
  });
}

async function mountAdminUserPortrait({
  mountEl,
  sb,
  me,
  user,
  escapeHtml
}) {
  if (!mountEl || !user?.id) return;

  let portrait = null;

  try {
    portrait = await loadUserSolematePortraitFromSupabase(sb, user.id);
  } catch (error) {
    mountEl.innerHTML = `<div class="adminQuizError">${escapeHtml(error?.message || "Could not load portrait.")}</div>`;
    return;
  }

  mountEl.innerHTML = `
    <div class="adminQuizBuilder" data-admin-portrait-builder>
      <div class="adminQuizFieldRow">
        <div class="adminQuizField">
          <label>Topline</label>
          <input
            type="text"
            data-portrait-field="eyebrow"
            value="${escapeHtml(portrait?.eyebrow || "Solemate portrait")}"
          />
        </div>

        <div class="adminQuizField">
          <label>Title</label>
          <input
            type="text"
            data-portrait-field="title"
            value="${escapeHtml(portrait?.title || "The outline is forming")}"
          />
        </div>

        <div class="adminQuizField">
          <label>Status</label>
          <select data-portrait-field="status">
            <option value="draft" ${portrait?.status === "draft" ? "selected" : ""}>Draft</option>
            <option value="revealed" ${!portrait || portrait?.status === "revealed" ? "selected" : ""}>Revealed</option>
            <option value="archived" ${portrait?.status === "archived" ? "selected" : ""}>Archived</option>
          </select>
        </div>
      </div>

      <div class="adminQuizField">
        <label>Portrait body</label>

        <div class="insightEditorToolbar">
          <button type="button" class="btn btnGhost" data-portrait-format="bold">Bold</button>
          <button type="button" class="btn btnGhost" data-portrait-format="italic">Italic</button>
          <button type="button" class="btn btnGhost" data-portrait-format="insertUnorderedList">Bullets</button>
        </div>

        <div
          class="insightRichEditor"
          contenteditable="true"
          data-portrait-field="bodyHtml"
        >${portrait?.body_html || ""}</div>
      </div>

      <div class="adminQuizField">
        <label>Small note</label>
        <textarea
          rows="3"
          data-portrait-field="note"
        >${escapeHtml(portrait?.note || "This portrait becomes more specific as Sole gathers stronger attraction, connection, and conversational signals.")}</textarea>
      </div>

      <div class="adminQuizActions">
        <button type="button" class="btn" data-save-portrait>
          Save portrait
        </button>
      </div>
    </div>
  `;

  const getField = name => mountEl.querySelector(`[data-portrait-field="${name}"]`);

  mountEl.querySelectorAll("[data-portrait-format]").forEach(button => {
    button.addEventListener("click", () => {
      document.execCommand(button.dataset.portraitFormat, false, null);
      getField("bodyHtml")?.focus();
    });
  });

  mountEl.querySelector("[data-save-portrait]")?.addEventListener("click", async () => {
    const payload = {
      eyebrow: getField("eyebrow")?.value?.trim() || "",
      title: getField("title")?.value?.trim() || "",
      status: getField("status")?.value || "revealed",
      bodyHtml: getField("bodyHtml")?.innerHTML || "",
      note: getField("note")?.value?.trim() || ""
    };

    if (!payload.title) {
      alert("Add a portrait title.");
      return;
    }

    try {
      await saveUserSolematePortraitInSupabase(sb, me, user.id, payload);
      alert("Portrait saved.");
      await mountAdminUserPortrait({ mountEl, sb, me, user, escapeHtml });
    } catch (error) {
      alert(error?.message || "Could not save portrait.");
    }
  });
}

window.dashboardUI = {
  buildWelcomeMarkup,
  initDashboardInteractions,
  mountWelcomeDashboard,
  refreshWelcomeDashboard,
  renderAdminDashboardHome,
  loadQuizResponsesFromSupabase,
  loadRuntimeAssignmentsFromSupabase,
  loadUserTasksFromSupabase,
  loadUserInsightsFromSupabase,
  mountSidebarDashboardScreen,
  mountAdminUserInsights,
  mountAdminUserTasks,
  loadUserSolematePortraitFromSupabase,
saveUserSolematePortraitInSupabase,
mountAdminUserPortrait,
clearRuntimeAssignmentsCache,
  DASHBOARD_ASSIGNMENTS
};
