let lastRenderedMetricSnapshot = null;
const DEFAULT_CANDIDATE_POOL = 20341;

const DASHBOARD_ASSIGNMENTS = [
  {
    id: "core_values_calibration_01",
    type: "assessmentCard",
    title: "Core Values Calibration",
    prompt: "Help the system refine early-stage compatibility filtering.",
    description: "Initial preference signals are used to narrow the candidate pool.",
    status: "active",
    priority: 10,
    ctaLabel: "Save calibration",
    saveMode: "single",
    effect: {
      candidateReduction: 400,
      confidenceIncrease: 6,
      stageLabel: "Values alignment integrated into compatibility filtering"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:00:00Z"
    },
    questions: [
      {
        id: "core_values",
        type: "multiSelect",
        prompt: "Select the 3 values that matter most in a connection",
        config: {
          minSelections: 3,
          maxSelections: 3,
          options: [
            { value: "Curiosity", label: "Curiosity" },
            { value: "Honesty", label: "Honesty" },
            { value: "Humour", label: "Humour" },
            { value: "Kindness", label: "Kindness" },
            { value: "Warmth", label: "Warmth" },
            { value: "Adventure", label: "Adventure" },
            { value: "Stability", label: "Stability" },
            { value: "Ambition", label: "Ambition" }
          ]
        }
      }
    ]
  },

  {
    id: "first_date_energy_01",
    type: "assessmentCard",
    title: "First-Date Energy Mapping",
    prompt: "Help the system refine conversational alignment.",
    description: "Tone preferences are used to improve behavioural matching.",
    status: "active",
    priority: 20,
    ctaLabel: "Save preference",
    saveMode: "single",
    effect: {
      candidateReduction: 250,
      confidenceIncrease: 4,
      stageLabel: "Conversational tone preferences integrated into alignment modelling"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:05:00Z"
    },
    questions: [
      {
        id: "first_date_energy",
        type: "slider",
        prompt: "How do you prefer someone to be on a first date?",
        config: {
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 50,
          minLabel: "Playful",
          maxLabel: "Reflective",
          centerLabel: "Balanced"
        }
      }
    ]
  },

  {
    id: "model_assessment_01",
    type: "assessmentCard",
    title: "Model Assessment 01",
    prompt: "Help the system understand how this model is being perceived.",
    description: "These signals contribute to personality alignment and refinement.",
    status: "active",
    priority: 30,
    ctaLabel: "Save assessment",
    saveMode: "single",
    effect: {
      candidateReduction: 250,
      confidenceIncrease: 4,
      stageLabel: "Perception signals integrated into personality alignment"
    },
    meta: {
      category: "feedback",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:10:00Z"
    },
    questions: [
      {
        id: "model_trait",
        type: "singleSelect",
        prompt: "Which description feels closest to the model you are speaking with?",
        config: {
          options: [
            { value: "Curious", label: "Curious" },
            { value: "Thoughtful", label: "Thoughtful" },
            { value: "Playful", label: "Playful" },
            { value: "Reserved", label: "Reserved" }
          ]
        }
      }
    ]
  },

  {
    id: "openness_mapping_01",
    type: "assessmentCard",
    title: "Emotional Openness Mapping",
    prompt: "Help the system refine emotional compatibility modelling.",
    description: "A small number of calibration points help improve conversational fit.",
    status: "active",
    priority: 40,
    ctaLabel: "Save response",
    saveMode: "single",
    effect: {
      candidateReduction: 180,
      confidenceIncrease: 3,
      stageLabel: "Emotional openness signals incorporated into compatibility modelling"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:20:00Z"
    },
    questions: [
      {
        id: "openness_scale",
        type: "scale7",
        prompt: "When someone shares something personal, I usually respond in kind.",
        config: {
          minLabel: "Not at all like me",
          maxLabel: "Very much like me"
        }
      }
    ]
  },

  {
    id: "dream_date_capture_01",
    type: "assessmentCard",
    title: "Initial Preference Capture",
    prompt: "Provide a little more detail so the system can refine compatibility reconstruction.",
    description: "Open-ended answers help expand early preference modelling.",
    status: "active",
    priority: 50,
    ctaLabel: "Submit description",
    saveMode: "single",
    effect: {
      candidateReduction: 320,
      confidenceIncrease: 5,
      stageLabel: "Narrative preference signals integrated into compatibility reconstruction"
    },
    meta: {
      category: "reflection",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:30:00Z"
    },
    questions: [
      {
        id: "dream_date_text",
        type: "freeText",
        prompt: "Describe your ideal date in as much detail as you like.",
        config: {
          placeholder: "A dream date might involve...",
          maxLength: 1200,
          minLength: 20,
          rows: 5
        }
      }
    ]
  },

    {
    id: "conversation_priorities_01",
    type: "assessmentCard",
    title: "Conversation Priorities",
    prompt: "Help the system understand how you weight different traits in a connection.",
    description: "Ordered preferences help refine trait weighting.",
    status: "active",
    priority: 60,
    ctaLabel: "Save ranking",
    saveMode: "single",
    effect: {
      candidateReduction: 140,
      confidenceIncrease: 2,
      stageLabel: "Priority weighting integrated into compatibility scoring"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:40:00Z"
    },
    questions: [
      {
        id: "priority_ranking",
        type: "ranking",
        prompt: "Rank these from most to least important in a connection.",
        config: {
          options: [
            { value: "humour", label: "Humour" },
            { value: "honesty", label: "Honesty" },
            { value: "curiosity", label: "Curiosity" },
            { value: "warmth", label: "Warmth" }
          ]
        }
      }
    ]
  },

  {
    id: "environmental_preference_01",
    type: "assessmentCard",
    title: "Environmental Preference Mapping",
    prompt: "Help the system refine atmospheric compatibility modelling.",
    description: "Context preferences can improve conversational fit.",
    status: "active",
    priority: 70,
    ctaLabel: "Save preference",
    saveMode: "single",
    effect: {
      candidateReduction: 120,
      confidenceIncrease: 2,
      stageLabel: "Environmental preference signals integrated into compatibility modelling"
    },
    meta: {
      category: "calibration",
      assignedBy: "system",
      assignedAt: "2026-03-13T18:50:00Z"
    },
    questions: [
      {
        id: "environment_choice",
        type: "imageChoice",
        prompt: "Which setting feels most conducive to a meaningful conversation?",
        config: {
          columns: 2,
          options: [
            {
              value: "quiet_bar",
              label: "Quiet bar",
              imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "night_walk",
              label: "Night walk",
              imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "museum_cafe",
              label: "Museum café",
              imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
            },
            {
              value: "kitchen_party",
              label: "Kitchen at a party",
              imageUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80"
            }
          ]
        }
      }
    ]
  }
];

function getDashboardStorageKey(me, suffix) {
  return me ? `sole_${suffix}_${me.id}` : `sole_${suffix}`;
}

function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredDashboardResponses(me) {
  return readJsonStorage(getDashboardStorageKey(me, "dashboard_responses"), {});
}

function saveStoredDashboardResponses(me, responses) {
  writeJsonStorage(getDashboardStorageKey(me, "dashboard_responses"), responses);
}

function getStoredDashboardProgress(me) {
  return readJsonStorage(getDashboardStorageKey(me, "dashboard_progress"), {});
}

function saveStoredDashboardProgress(me, progress) {
  writeJsonStorage(getDashboardStorageKey(me, "dashboard_progress"), progress);
}

function getAssignmentProgress(me, assignmentId) {
  const progress = getStoredDashboardProgress(me);
  return progress[assignmentId] || null;
}

function saveAssignmentProgress(me, assignmentId, payload) {
  const progress = getStoredDashboardProgress(me);

  progress[assignmentId] = {
    ...payload,
    updatedAt: new Date().toISOString()
  };

  saveStoredDashboardProgress(me, progress);
}

function clearAssignmentProgress(me, assignmentId) {
  const progress = getStoredDashboardProgress(me);
  delete progress[assignmentId];
  saveStoredDashboardProgress(me, progress);
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

function saveAssignmentResponse(me, assignmentId, payload) {
  const responses = getStoredDashboardResponses(me);

  responses[assignmentId] = {
    ...payload,
    completed: true,
    updatedAt: new Date().toISOString(),
    submittedAt: payload.submittedAt || new Date().toISOString()
  };

  saveStoredDashboardResponses(me, responses);
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

function getBaseDashboardState(messageCount) {
  if (messageCount >= 100) {
    return {
      remainingCandidates: 614,
      confidence: 78,
      stage: "Behavioural alignment in progress"
    };
  }

  if (messageCount >= 70) {
    return {
      remainingCandidates: 2184,
      confidence: 63,
      stage: "Conversational style mapping"
    };
  }

  if (messageCount >= 40) {
    return {
      remainingCandidates: 5689,
      confidence: 48,
      stage: "Initial compatibility filtering"
    };
  }

  return {
    remainingCandidates: 9842,
    confidence: 31,
    stage: "Baseline compatibility calibration"
  };
}

function applyAssignmentEffects(me, baseState) {
  const responses = getStoredDashboardResponses(me);
  const completedAssignments = DASHBOARD_ASSIGNMENTS
    .filter(item => responses[item.id]?.completed)
    .sort((a, b) => a.priority - b.priority);

  let remainingCandidates = baseState.remainingCandidates;
  let confidence = baseState.confidence;
  let stage = baseState.stage;

  completedAssignments.forEach(item => {
    if (item.effect?.candidateReduction) {
      remainingCandidates = Math.max(1, remainingCandidates - item.effect.candidateReduction);
    }

    if (item.effect?.confidenceIncrease) {
      confidence = Math.min(99.9, confidence + item.effect.confidenceIncrease);
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

function getDashboardState(me, messageCount) {
  const storedState = getStoredDashboardState(me);
  const base = getBaseDashboardState(messageCount);
  const enhanced = applyAssignmentEffects(me, base);

  const merged = {
    ...enhanced,
    ...(storedState || {})
  };

  return {
    remainingCandidates: Math.max(1, Math.round(merged.remainingCandidates)),
    confidence: Math.min(99.9, Number(merged.confidence)),
    stage: merged.stage || enhanced.stage
  };
}

function formatCandidateCount(value) {
  return Number(value).toLocaleString();
}

function formatConfidence(value) {
  return value === 99.9 ? "99.9%" : `${Math.round(value)}%`;
}

function getConversationStyleLabel(value) {
  if (value <= 30) return "Playful";
  if (value >= 70) return "Reflective";
  return "Balanced";
}

function getScale7Label(value) {
  return String(value);
}

function escapeAttr(value) {
  return String(value ?? "").replace(/"/g, "&quot;");
}

function renderQuestionInput(question, savedAnswers, escapeHtml) {
  const savedValue = savedAnswers?.[question.id];

  if (question.type === "multiSelect") {
    const selectedValues = Array.isArray(savedValue?.values) ? savedValue.values : [];
    const options = question.config.options || [];

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="multiSelect">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>
        <div class="quizValues">
          ${options.map(option => {
            const isSelected = selectedValues.includes(option.value);
            return `
              <button
                type="button"
                class="quizValueBtn${isSelected ? " isSelected" : ""}"
                data-question-id="${escapeAttr(question.id)}"
                data-value="${escapeAttr(option.value)}"
              >
                ${escapeHtml(option.label)}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "slider") {
    const value = Number(
      savedValue?.value ??
      question.config.defaultValue ??
      50
    );

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="slider">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>

        <div class="quizScaleLabels">
          <span>${escapeHtml(question.config.minLabel || "Low")}</span>
          <span>${escapeHtml(question.config.maxLabel || "High")}</span>
        </div>

        <input
          id="question_${escapeAttr(question.id)}"
          class="quizRange"
          type="range"
          min="${escapeAttr(question.config.min ?? 0)}"
          max="${escapeAttr(question.config.max ?? 100)}"
          step="${escapeAttr(question.config.step ?? 1)}"
          value="${escapeAttr(value)}"
          data-question-id="${escapeAttr(question.id)}"
        />

        <div class="quizRangeValue" id="question_value_${escapeAttr(question.id)}">
          ${escapeHtml(getConversationStyleLabel(value))}
        </div>
      </div>
    `;
  }

  if (question.type === "scale7") {
    const currentValue = Number(savedValue?.value || 0);

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="scale7">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>

        <div class="quizScale7">
          ${Array.from({ length: 7 }, (_, i) => {
            const value = i + 1;
            return `
              <button
                type="button"
                class="quizScale7Btn${currentValue === value ? " isSelected" : ""}"
                data-question-id="${escapeAttr(question.id)}"
                data-value="${value}"
              >
                ${value}
              </button>
            `;
          }).join("")}
        </div>

        <div class="quizScaleLabels">
          <span>${escapeHtml(question.config.minLabel || "Low")}</span>
          <span>${escapeHtml(question.config.maxLabel || "High")}</span>
        </div>
      </div>
    `;
  }

  if (question.type === "singleSelect") {
    const selectedValue = savedValue?.value || "";
    const options = question.config.options || [];

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="singleSelect">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>
        <div class="quizValues">
          ${options.map(option => `
            <button
              type="button"
              class="quizValueBtn${selectedValue === option.value ? " isSelected" : ""}"
              data-question-id="${escapeAttr(question.id)}"
              data-value="${escapeAttr(option.value)}"
            >
              ${escapeHtml(option.label)}
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "freeText") {
    const text = savedValue?.text || "";

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="freeText">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>
        <textarea
          class="quizTextarea"
          rows="${escapeAttr(question.config.rows || 5)}"
          maxlength="${escapeAttr(question.config.maxLength || 1200)}"
          placeholder="${escapeAttr(question.config.placeholder || "")}"
          data-question-id="${escapeAttr(question.id)}"
        >${escapeHtml(text)}</textarea>
      </div>
    `;
  }

  if (question.type === "ranking") {
    const options = question.config.options || [];
    const savedOrder = Array.isArray(savedValue?.orderedValues)
      ? savedValue.orderedValues
      : options.map(option => option.value);

    const orderedOptions = savedOrder
      .map(value => options.find(option => option.value === value))
      .filter(Boolean);

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="ranking">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>

        <div class="quizRankingList" data-ranking-list="${escapeAttr(question.id)}">
          ${orderedOptions.map((option, index) => `
            <div class="quizRankingItem" data-ranking-value="${escapeAttr(option.value)}">
              <div class="quizRankingIndex">${index + 1}</div>
              <div class="quizRankingText">${escapeHtml(option.label)}</div>
              <div class="quizRankingControls">
                <button
                  type="button"
                  class="quizRankingBtn"
                  data-ranking-move="up"
                  data-question-id="${escapeAttr(question.id)}"
                  data-value="${escapeAttr(option.value)}"
                  ${index === 0 ? "disabled" : ""}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="quizRankingBtn"
                  data-ranking-move="down"
                  data-question-id="${escapeAttr(question.id)}"
                  data-value="${escapeAttr(option.value)}"
                  ${index === orderedOptions.length - 1 ? "disabled" : ""}
                >
                  ↓
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  if (question.type === "imageChoice") {
    const selectedValue = savedValue?.value || "";
    const columns = question.config.columns || 2;
    const options = question.config.options || [];

    return `
      <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="imageChoice">
        <div class="quizLabel">${escapeHtml(question.prompt)}</div>

        <div class="quizImageGrid quizImageGridCols${Math.min(columns, 3)}">
          ${options.map(option => `
            <button
              type="button"
              class="quizImageChoiceBtn${selectedValue === option.value ? " isSelected" : ""}"
              data-question-id="${escapeAttr(question.id)}"
              data-value="${escapeAttr(option.value)}"
            >
              <div class="quizImageChoiceThumbWrap">
                <img
                  class="quizImageChoiceThumb"
                  src="${escapeAttr(option.imageUrl)}"
                  alt="${escapeAttr(option.label)}"
                />
              </div>
              <div class="quizImageChoiceLabel">${escapeHtml(option.label)}</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  return "";
}

function renderCompletedSummary(assignment, savedResponse, escapeHtml, options = {}) {
  const { adminPreview = false, isPartial = false } = options;
  const lines = [];

  assignment.questions.forEach(question => {
    const answer = savedResponse?.answers?.[question.id];

    if (!answer) return;

    if (question.type === "multiSelect") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml((answer.labels || []).join(", "))}</strong>
        </div>
      `);
    }

    if (question.type === "slider") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml(answer.interpretedLabel || getConversationStyleLabel(answer.value || 50))}</strong>
        </div>
      `);
    }

    if (question.type === "scale7") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml(getScale7Label(answer.value))}</strong>
        </div>
      `);
    }

    if (question.type === "singleSelect") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml(answer.label || answer.value || "")}</strong>
        </div>
      `);
    }

    if (question.type === "freeText") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml(answer.text || "")}</strong>
        </div>
      `);
    }

    if (question.type === "ranking") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml((answer.orderedLabels || []).join(" → "))}</strong>
        </div>
      `);
    }

    if (question.type === "imageChoice") {
      lines.push(`
        <div class="quizCompleteLine">
          ${escapeHtml(question.prompt)}:
          <strong>${escapeHtml(answer.label || answer.value || "")}</strong>
        </div>
      `);
    }
  });

  const eyebrow = adminPreview
    ? (isPartial ? "Admin preview · in progress" : "Admin preview · completed")
    : "Calibration complete";

  const hint = adminPreview
    ? (savedResponse?.submittedAt
        ? `Submitted at ${new Date(savedResponse.submittedAt).toLocaleString()}`
        : "No final submission yet")
    : (assignment.effect?.stageLabel || "Calibration data has been integrated into compatibility filtering.");

  return `
    <section class="quizPanel" aria-label="${escapeAttr(assignment.title)}">
      <div class="quizPanelHeader">
        <div class="dashboardEyebrow">${escapeHtml(eyebrow)}</div>
        <h3>${escapeHtml(assignment.title)}</h3>
        <p class="quizIntro">${escapeHtml(assignment.description || assignment.prompt || "")}</p>
      </div>

      <div class="quizCompleteCard">
        ${lines.join("")}
        <div class="quizCompleteHint">
          ${escapeHtml(hint)}
        </div>
      </div>
    </section>
  `;
}
function renderAssignmentCard(assignment, me, escapeHtml, options = {}) {
  const { adminPreview = false } = options;

  const savedResponse = getAssignmentResponse(me, assignment.id);
  const savedProgress = getAssignmentProgress(me, assignment.id);
  const mergedAnswers = getMergedAssignmentAnswers(me, assignment.id);

  if (savedResponse?.completed && assignment.saveMode === "single") {
    return renderCompletedSummary(
      assignment,
      savedResponse,
      escapeHtml,
      { adminPreview, isPartial: false }
    );
  }

  if (adminPreview && Object.keys(mergedAnswers).length > 0) {
    return renderCompletedSummary(
      assignment,
      {
        answers: mergedAnswers,
        submittedAt: savedResponse?.submittedAt || null
      },
      escapeHtml,
      { adminPreview: true, isPartial: !savedResponse?.completed }
    );
  }

  const currentStep = Math.min(
    savedProgress?.currentStep || 0,
    Math.max(assignment.questions.length - 1, 0)
  );

  const currentQuestion = assignment.questions[currentStep];
  const isFinalStep = currentStep === assignment.questions.length - 1;
  const buttonLabel = isFinalStep
    ? (assignment.ctaLabel || "Save")
    : "Continue";

  return `
    <section class="quizPanel" aria-label="${escapeAttr(assignment.title)}">
      <div class="quizPanelHeader">
        <div class="dashboardEyebrow">Calibration required</div>
        <h3>${escapeHtml(assignment.title)}</h3>
        <p class="quizIntro">${escapeHtml(assignment.prompt || "")}</p>
      </div>

      <div
        class="quizCard quizCardStage"
        data-assignment-id="${escapeAttr(assignment.id)}"
        data-current-step="${currentStep}"
      >
        <div class="quizStepMeta">
          <span>Question ${currentStep + 1} of ${assignment.questions.length}</span>
        </div>

        ${renderQuestionInput(currentQuestion, mergedAnswers, escapeHtml)}

        <div class="quizActions">
          <button
            type="button"
            class="quizSubmitBtn"
            data-assignment-submit="${escapeAttr(assignment.id)}"
            disabled
          >
            ${escapeHtml(buttonLabel)}
          </button>
        </div>
      </div>
    </section>
  `;
}

function isAssignmentCompleted(me, assignment) {
  const savedResponse = getAssignmentResponse(me, assignment.id);
  return !!(savedResponse?.completed && assignment.saveMode === "single");
}

function getVisibleAssignmentsForUser(me) {
  const sorted = DASHBOARD_ASSIGNMENTS
    .filter(item => item.status !== "archived" && item.status !== "locked")
    .sort((a, b) => a.priority - b.priority);

  const nextIncomplete = sorted.find(item => !isAssignmentCompleted(me, item));

  if (!nextIncomplete) {
    return [];
  }

  return [nextIncomplete];
}

function renderUserCompletionPanel(escapeHtml) {
  return `
    <section class="quizPanel" aria-label="Daily calibration complete">
      <div class="quizPanelHeader">
        <div class="dashboardEyebrow">Calibration complete</div>
        <h3>Daily Calibration Complete</h3>
        <p class="quizIntro">
          Today's compatibility signals have been integrated into the matching system.
        </p>
      </div>

      <div class="quizCompleteCard">
        <div class="quizCompleteLine">
          Additional conversational data may be requested as compatibility confidence improves.
        </div>

        <div class="quizCompleteHint">
          Further interaction remains beneficial to candidate refinement.
        </div>
      </div>
    </section>
  `;
}

function renderAssignments(me, escapeHtml, options = {}) {
  const { adminPreview = false } = options;

  if (adminPreview) {
    const assignments = DASHBOARD_ASSIGNMENTS
      .filter(item => item.status !== "archived" && item.status !== "locked")
      .sort((a, b) => a.priority - b.priority);

    return assignments
      .map(item => renderAssignmentCard(item, me, escapeHtml, options))
      .join("");
  }

  const visibleAssignments = getVisibleAssignmentsForUser(me);

  if (!visibleAssignments.length) {
    return renderUserCompletionPanel(escapeHtml);
  }

  return visibleAssignments
    .map(item => renderAssignmentCard(item, me, escapeHtml, options))
    .join("");
}
async function buildWelcomeMarkup({ sb, me, escapeHtml, adminPreview = false }) {
  const messageCount = await getDailyMessageCount(sb, me);
  const sample = getSampleStrength(messageCount);
  const dash = getDashboardState(me, messageCount);

  return `
    <div class="welcomePanel">
      <h2>Welcome, ${escapeHtml(me.display_name)}</h2>

      <p>
        You are currently interacting with experimental conversational models.
      </p>

      <p>
        Response latency may vary as models integrate conversational context.
      </p>

      <p class="welcomeHint">
        Select a model from the left to begin.
      </p>
    </div>

    <section class="dashboardPanel" aria-label="Compatibility analysis console">
      <div class="dashboardHeading">
        <div class="dashboardEyebrow">System analysis</div>
        <h3>Compatibility Analysis Console</h3>
      </div>

      <div class="dashboardGrid">
        <article class="dashCard">
          <div class="dashLabel">Candidate Pool</div>
<div
  class="dashValue"
  data-metric="candidatePool"
>
  ${formatCandidateCount(dash.remainingCandidates)}
</div>
          <div class="dashMeta">remaining from ${formatCandidateCount(DEFAULT_CANDIDATE_POOL)} candidates</div>
          <div class="dashNote">${escapeHtml(dash.stage)}</div>
        </article>

        <article class="dashCard">
          <div class="dashLabel">Compatibility Confidence</div>
<div
  class="dashValue"
  data-metric="confidence"
>
  ${formatConfidence(dash.confidence)}
</div>
          <div class="dashMeta">model confidence</div>
          <div class="dashNote">Refining behavioural compatibility signals</div>
        </article>

        <article class="dashCard">
          <div class="dashLabel">Conversational Sample</div>
          <div class="dashValue">${messageCount}</div>
          <div class="dashMeta">messages sent in the last 24 hours</div>
          <div class="dashNote">
            Sample strength: ${escapeHtml(sample.label)} — ${escapeHtml(sample.note)}
          </div>
        </article>
      </div>
    </section>

        ${renderAssignments(me, escapeHtml, { adminPreview })}
  `;
}

function validateQuestionAnswer(question, answer) {
  if (question.type === "multiSelect") {
    const values = answer?.values || [];
    const minSelections = question.config.minSelections || 1;
    const maxSelections = question.config.maxSelections || values.length;
    return values.length >= minSelections && values.length <= maxSelections;
  }

  if (question.type === "slider") {
    return typeof answer?.value === "number";
  }

  if (question.type === "scale7") {
    return typeof answer?.value === "number" && answer.value >= 1 && answer.value <= 7;
  }

  if (question.type === "singleSelect") {
    return !!answer?.value;
  }

  if (question.type === "freeText") {
    const minLength = question.config.minLength || 1;
    return (answer?.text || "").trim().length >= minLength;
  }

  if (question.type === "ranking") {
    return Array.isArray(answer?.orderedValues) && answer.orderedValues.length > 0;
  }

  if (question.type === "imageChoice") {
    return !!answer?.value;
  }

  return false;
}

function getMergedAssignmentAnswers(me, assignmentId) {
  const savedResponse = getAssignmentResponse(me, assignmentId);
  const savedProgress = getAssignmentProgress(me, assignmentId);

  return {
    ...(savedProgress?.answers || {}),
    ...(savedResponse?.answers || {})
  };
}

function validateAssignmentAnswers(assignment, answers) {
  return assignment.questions.every(question =>
    validateQuestionAnswer(question, answers[question.id])
  );
}

function initAssignmentInteractions({ assignment, mainEl, messagesEl, sb, me, escapeHtml, adminPreview = false }) {
  if (adminPreview) return;

  const cardEl = document.querySelector(`[data-assignment-id="${assignment.id}"]`);
  const submitBtn = document.querySelector(`[data-assignment-submit="${assignment.id}"]`);

  if (!cardEl || !submitBtn) return;

  const savedResponse = getAssignmentResponse(me, assignment.id);
  const savedProgress = getAssignmentProgress(me, assignment.id);

  const answers = {
    ...(savedProgress?.answers || {}),
    ...(savedResponse?.answers || {})
  };

  const currentStep = Number(cardEl.dataset.currentStep || 0);
  const currentQuestion = assignment.questions[currentStep];
  const isFinalStep = currentStep === assignment.questions.length - 1;

  function syncSubmitState() {
    submitBtn.disabled = !validateQuestionAnswer(currentQuestion, answers[currentQuestion.id]);
  }

  assignment.questions.forEach(question => {
    if (question.id !== currentQuestion.id) return;

    if (question.type === "multiSelect") {
      const maxSelections = question.config.maxSelections || Infinity;
      const options = question.config.options || [];

      if (!answers[question.id]) {
        answers[question.id] = {
          values: [],
          labels: []
        };
      }

      cardEl
        .querySelectorAll(`[data-question-id="${question.id}"].quizValueBtn`)
        .forEach(btn => {
          btn.addEventListener("click", () => {
            const value = btn.dataset.value;
            let values = [...(answers[question.id].values || [])];

            if (values.includes(value)) {
              values = values.filter(v => v !== value);
            } else {
              if (values.length >= maxSelections) return;
              values.push(value);
            }

            const labels = values.map(v => {
              const match = options.find(option => option.value === v);
              return match ? match.label : v;
            });

            answers[question.id] = { values, labels };

            cardEl
              .querySelectorAll(`[data-question-id="${question.id}"].quizValueBtn`)
              .forEach(otherBtn => {
                otherBtn.classList.toggle(
                  "isSelected",
                  values.includes(otherBtn.dataset.value)
                );
              });

            syncSubmitState();
          });
        });
    }

    if (question.type === "slider") {
      const inputEl = cardEl.querySelector(`#question_${question.id}`);
      const valueEl = cardEl.querySelector(`#question_value_${question.id}`);

      if (!answers[question.id]) {
        const initialValue = Number(question.config.defaultValue ?? 50);
        answers[question.id] = {
          value: initialValue,
          interpretedLabel: getConversationStyleLabel(initialValue)
        };
      }

      if (inputEl && valueEl) {
        valueEl.textContent = getConversationStyleLabel(Number(inputEl.value));

        inputEl.addEventListener("input", () => {
          const value = Number(inputEl.value);
          const interpretedLabel = getConversationStyleLabel(value);

          answers[question.id] = {
            value,
            interpretedLabel
          };

          valueEl.textContent = interpretedLabel;
          syncSubmitState();
        });
      }
    }

    if (question.type === "scale7") {
      cardEl
        .querySelectorAll(`[data-question-id="${question.id}"].quizScale7Btn`)
        .forEach(btn => {
          btn.addEventListener("click", () => {
            const value = Number(btn.dataset.value);

            answers[question.id] = { value };

            cardEl
              .querySelectorAll(`[data-question-id="${question.id}"].quizScale7Btn`)
              .forEach(otherBtn => {
                otherBtn.classList.toggle(
                  "isSelected",
                  Number(otherBtn.dataset.value) === value
                );
              });

            syncSubmitState();
          });
        });
    }

    if (question.type === "singleSelect") {
      const options = question.config.options || [];

      cardEl
        .querySelectorAll(`[data-question-id="${question.id}"].quizValueBtn`)
        .forEach(btn => {
          btn.addEventListener("click", () => {
            const value = btn.dataset.value;
            const option = options.find(o => o.value === value);

            answers[question.id] = {
              value,
              label: option?.label || value
            };

            cardEl
              .querySelectorAll(`[data-question-id="${question.id}"].quizValueBtn`)
              .forEach(otherBtn => {
                otherBtn.classList.toggle(
                  "isSelected",
                  otherBtn.dataset.value === value
                );
              });

            syncSubmitState();
          });
        });
    }

    if (question.type === "freeText") {
      const textarea =
        cardEl.querySelector(`.quizTextarea[data-question-id="${question.id}"]`) ||
        cardEl.querySelector(`[data-question-id="${question.id}"].quizTextarea`);

      if (textarea) {
        textarea.addEventListener("input", () => {
          answers[question.id] = {
            text: textarea.value
          };
          syncSubmitState();
        });
      }
    }

    if (question.type === "ranking") {
      const options = question.config.options || [];

      if (!answers[question.id]) {
        answers[question.id] = {
          orderedValues: options.map(option => option.value),
          orderedLabels: options.map(option => option.label)
        };
      }

      const rerenderRanking = () => {
        const listEl = cardEl.querySelector(`[data-ranking-list="${question.id}"]`);
        if (!listEl) return;

        const orderedValues = answers[question.id].orderedValues;
        const orderedOptions = orderedValues
          .map(value => options.find(option => option.value === value))
          .filter(Boolean);

        listEl.innerHTML = orderedOptions.map((option, index) => `
          <div class="quizRankingItem" data-ranking-value="${escapeAttr(option.value)}">
            <div class="quizRankingIndex">${index + 1}</div>
            <div class="quizRankingText">${escapeHtml(option.label)}</div>
            <div class="quizRankingControls">
              <button
                type="button"
                class="quizRankingBtn"
                data-ranking-move="up"
                data-question-id="${escapeAttr(question.id)}"
                data-value="${escapeAttr(option.value)}"
                ${index === 0 ? "disabled" : ""}
              >
                ↑
              </button>
              <button
                type="button"
                class="quizRankingBtn"
                data-ranking-move="down"
                data-question-id="${escapeAttr(question.id)}"
                data-value="${escapeAttr(option.value)}"
                ${index === orderedOptions.length - 1 ? "disabled" : ""}
              >
                ↓
              </button>
            </div>
          </div>
        `).join("");

        bindRankingButtons();
      };

      const bindRankingButtons = () => {
        cardEl
          .querySelectorAll(`[data-question-id="${question.id}"].quizRankingBtn`)
          .forEach(btn => {
            btn.addEventListener("click", () => {
              const value = btn.dataset.value;
              const direction = btn.dataset.rankingMove;
              const orderedValues = [...answers[question.id].orderedValues];
              const currentIndex = orderedValues.indexOf(value);

              if (currentIndex === -1) return;

              const nextIndex =
                direction === "up" ? currentIndex - 1 : currentIndex + 1;

              if (nextIndex < 0 || nextIndex >= orderedValues.length) return;

              const reordered = moveArrayItem(orderedValues, currentIndex, nextIndex);
              const orderedLabels = reordered.map(v => {
                const match = options.find(option => option.value === v);
                return match ? match.label : v;
              });

              answers[question.id] = {
                orderedValues: reordered,
                orderedLabels
              };

              rerenderRanking();
              syncSubmitState();
            });
          });
      };

      rerenderRanking();
    }

    if (question.type === "imageChoice") {
      cardEl
        .querySelectorAll(`[data-question-id="${question.id}"].quizImageChoiceBtn`)
        .forEach(btn => {
          btn.addEventListener("click", () => {
            const value = btn.dataset.value;

            answers[question.id] = {
              value,
              label: getImageChoiceSelectedLabel(question, value)
            };

            cardEl
              .querySelectorAll(`[data-question-id="${question.id}"].quizImageChoiceBtn`)
              .forEach(otherBtn => {
                otherBtn.classList.toggle(
                  "isSelected",
                  otherBtn.dataset.value === value
                );
              });

            syncSubmitState();
          });
        });
    }
  });

  syncSubmitState();

  submitBtn.addEventListener("click", async () => {
    if (!validateQuestionAnswer(currentQuestion, answers[currentQuestion.id])) return;

    await playAssignmentAdvanceTransition(cardEl);

    if (!isFinalStep) {
      saveAssignmentProgress(me, assignment.id, {
        currentStep: currentStep + 1,
        answers
      });

      await refreshWelcomeDashboard({
        mainEl,
        messagesEl,
        sb,
        me,
        escapeHtml,
        animateMetrics: false,
        adminPreview: false
      });

      return;
    }

    saveAssignmentResponse(me, assignment.id, {
      assignmentId: assignment.id,
      componentType: assignment.type,
      answers
    });

    clearAssignmentProgress(me, assignment.id);

    await refreshWelcomeDashboard({
      mainEl,
      messagesEl,
      sb,
      me,
      escapeHtml,
      animateMetrics: true,
      adminPreview: false
    });
  });
}

function initDashboardInteractions({ mainEl, messagesEl, sb, me, escapeHtml, adminPreview = false }) {
  DASHBOARD_ASSIGNMENTS.forEach(assignment => {
    initAssignmentInteractions({
      assignment,
      mainEl,
      messagesEl,
      sb,
      me,
      escapeHtml,
      adminPreview
    });
  });
}

function formatAnimatedValue(value, format) {
  if (format === "percent") {
    if (Number(value) === 99.9) return "99.9%";
    return `${Math.round(Number(value))}%`;
  }

  return Math.round(Number(value)).toLocaleString();
}

function animateNumber(el, from, to, format = "integer", duration = 700) {
  const start = Number(from);
  const end = Number(to);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
    el.textContent = formatAnimatedValue(end, format);
    return;
  }

  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = start + (end - start) * eased;

    el.textContent = formatAnimatedValue(current, format);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatAnimatedValue(end, format);
    }
  }

  requestAnimationFrame(tick);
}

function animateDashboardMetrics(nextSnapshot, shouldAnimate = false) {
  const candidateEl = document.querySelector('[data-metric="candidatePool"]');
  const confidenceEl = document.querySelector('[data-metric="confidence"]');

  if (!candidateEl || !confidenceEl) {
    lastRenderedMetricSnapshot = nextSnapshot;
    return;
  }

  const previous = lastRenderedMetricSnapshot;

  if (
    shouldAnimate &&
    previous &&
    typeof previous.remainingCandidates === "number" &&
    typeof previous.confidence === "number"
  ) {
    animateNumber(
      candidateEl,
      previous.remainingCandidates,
      nextSnapshot.remainingCandidates,
      "integer",
      850
    );

    animateNumber(
      confidenceEl,
      previous.confidence,
      nextSnapshot.confidence,
      "percent",
      850
    );
  } else {
    candidateEl.textContent = formatAnimatedValue(nextSnapshot.remainingCandidates, "integer");
    confidenceEl.textContent = formatAnimatedValue(nextSnapshot.confidence, "percent");
  }

  lastRenderedMetricSnapshot = {
    remainingCandidates: Number(nextSnapshot.remainingCandidates),
    confidence: Number(nextSnapshot.confidence)
  };
}

async function mountWelcomeDashboard({
  messagesEl,
  mainEl,
  sb,
  me,
  escapeHtml,
  animateMetrics = false,
  adminPreview = false
}) {
  const messageCount = await getDailyMessageCount(sb, me);
  const dash = getDashboardState(me, messageCount);

  messagesEl.innerHTML = await buildWelcomeMarkup({
    sb,
    me,
    escapeHtml,
    adminPreview
  });

  initDashboardInteractions({
    mainEl,
    messagesEl,
    sb,
    me,
    escapeHtml,
    adminPreview
  });

  animateDashboardMetrics(
    {
      remainingCandidates: dash.remainingCandidates,
      confidence: dash.confidence
    },
    animateMetrics
  );
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
  adminPreview = false
}) {
  if (!mainEl.classList.contains("noChatSelected")) return;

  await mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    animateMetrics,
    adminPreview
  });
}

window.dashboardUI = {
  buildWelcomeMarkup,
  initDashboardInteractions,
  mountWelcomeDashboard,
  refreshWelcomeDashboard,
  DASHBOARD_ASSIGNMENTS
};