let lastRenderedMetricSnapshot = null;
const DEFAULT_CANDIDATE_POOL = 20341;

const ADMIN_BUILDER_MAX_OPTIONS = 10;
const ADMIN_BUILDER_MIN_OPTIONS = 2;

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugifyTemplateValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function slugifyOptionValue(label, index = 0) {
  const slug = String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || `option_${index + 1}`;
}

function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Failed to read storage", key, e);
    return fallback;
  }
}

function setFeedback(message = "", type = "info") {
  const el = document.querySelector("[data-dashboard-feedback]");
  if (!el) return;

  el.textContent = message;

  el.classList.remove("is-error", "is-success", "is-info");

  if (type === "error") el.classList.add("is-error");
  if (type === "success") el.classList.add("is-success");
  if (type === "info") el.classList.add("is-info");
}

function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to write storage", key, e);
  }
}

function getDashboardStorageKey(me, suffix) {
  return me?.id ? `sole_${suffix}_${me.id}` : `sole_${suffix}`;
}

function makeUniqueOptionValue(label, usedValues = new Set()) {
  const base = slugifyTemplateValue(label) || "option";
  let next = base;
  let counter = 2;

  while (usedValues.has(next)) {
    next = `${base}_${counter}`;
    counter += 1;
  }

  usedValues.add(next);
  return next;
}

function normaliseOptionLabels(labels = []) {
  const used = new Set();

  return labels
    .map(label => String(label || "").trim())
    .filter(Boolean)
    .map(label => ({
      value: makeUniqueOptionValue(label, used),
      label
    }));
}

async function saveQuizTemplateOverrideInSupabase(
  sb,
  templateId,
  userId,
  overrideJson
) {
  const payload = {
    template_id: templateId,
    user_id: userId,
    override_json: overrideJson,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await sb
    .from("quiz_template_overrides")
    .upsert(payload, {
      onConflict: "template_id,user_id"
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function fetchQuizTemplateOverrideForUser(sb, templateId, userId) {
  const { data, error } = await sb
    .from("quiz_template_overrides")
    .select("*")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function fetchQuizTemplateOverrides(sb, templateId) {
  const { data, error } = await sb
    .from("quiz_template_overrides")
    .select(`
      *,
      user:profiles(*)
    `)
    .eq("template_id", templateId);

  if (error) throw error;

  return data || [];
}

async function createQuizUploadSignedUrl(sb, answer, expiresIn = 60 * 10) {
  const bucket = answer?.bucket || "quiz-uploads";
  const path = answer?.path;

  if (!path) return null;

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.warn("createQuizUploadSignedUrl failed", error);
    return null;
  }

  return data?.signedUrl || null;
}

function hasScoringRules(scoring) {
  if (Array.isArray(scoring)) {
    return scoring.length > 0;
  }

  if (scoring && typeof scoring === "object") {
    return Object.keys(scoring).length > 0;
  }

  return false;
}

function parseScoringRules(rawText) {
  const text = String(rawText || "").trim();

  if (!text) return [];

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Scoring JSON is not valid JSON.");
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map(rule => ({
        key: String(rule?.key || "").trim(),
        weight: Number(rule?.weight)
      }))
      .filter(rule =>
        rule.key &&
        Number.isFinite(rule.weight) &&
        rule.weight !== 0
      );
  }

  // New object-based scoring:
  // {
  //   byValue: { ... },
  //   rankMultiplier: [...]
  // }
  if (parsed && typeof parsed === "object") {
    return parsed;
  }

  throw new Error(
    "Scoring JSON must be an array or scoring object."
  );
}

function createBuilderQuestionDraft(type = "singleSelect") {
  return {
    id: `q_${Math.random().toString(36).slice(2, 9)}`,
    type,
    prompt: "",

       scoringText: "",

    optionsText: "Option 1\nOption 2",
    optionsImagesText: "",

    imageChoiceColumns: 2,

    imageChoiceOptions: [
      { label: "Option 1", imageUrl: "" },
      { label: "Option 2", imageUrl: "" }
    ],

    swipeDeckCards: [
      { label: "Image 1", imageUrl: "" },
      { label: "Image 2", imageUrl: "" }
    ],

    minSelections: 1,
    maxSelections: 1,

    sliderMin: 0,
    sliderMax: 100,
    sliderStep: 1,
    sliderDefaultValue: 50,

    sliderMinLabel: "Low",
    sliderCenterLabel: "Balanced",
    sliderMaxLabel: "High",

    scale7MinLabel: "Disagree",
scale7MidLabel: "Neutral",
scale7MaxLabel: "Agree",

    freeTextPlaceholder: "",
    freeTextMaxLength: 500,
    freeTextRows: 4,

    fileAccept: "image/*,application/pdf",
    fileMaxMb: 10,
    fileAllowSkip: "true",
    fileHelperText: "Accepted: images or PDF, up to 10 MB."
  };
}

function getDefaultOptionsTextForType(type) {
  if (type === "multiSelect") return "Option 1\nOption 2\nOption 3";
  if (type === "ranking") return "Option 1\nOption 2\nOption 3";
  return "Option 1\nOption 2";
}

function parseBuilderOptionLines(rawText) {
  return String(rawText || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function clampBuilderNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}


function getFileUploadAcceptString(question) {
  return String(question?.config?.accept || "image/*,application/pdf").trim() || "image/*,application/pdf";
}

function getFileUploadMaxBytes(question) {
  const fallback = 10 * 1024 * 1024;
  const value = Number(question?.config?.maxBytes ?? fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, fallback);
}

function isAcceptedUploadType(file, acceptString = "image/*,application/pdf") {
  const accepted = String(acceptString || "")
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  if (!accepted.length) return true;

  return accepted.some(rule => {
    if (rule === "image/*") return file.type.startsWith("image/");
    return file.type === rule;
  });
}

async function uploadQuizFile({ sb, me, assignment, question, file }) {
  const safeName = String(file.name || "upload")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-120);

  const fileName = `${crypto.randomUUID()}-${safeName}`;
  const path = `${me.id}/${assignment.id}/${question.id}/${fileName}`;

  const { error: uploadError } = await sb.storage
    .from("quiz-uploads")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    throw uploadError;
  }

  return {
    bucket: "quiz-uploads",
    path,
    fileName: file.name,
    mimeType: file.type,
    size: file.size
  };
}

function canAdvanceQuestion(question, answer) {
  if (question?.type === "fileUpload") {
    return answer?.status === "uploaded" || answer?.status === "skipped";
  }

  return validateQuestionAnswer(question, answer);
}

function doesAnswerCountTowardProgress(question, answer) {
  if (question?.type === "fileUpload") {
    return answer?.status === "uploaded";
  }

  return validateQuestionAnswer(question, answer);
}

function buildQuestionFromDraft(draft) {
  const base = {
    id: draft.id || `q_${Math.random().toString(36).slice(2, 9)}`,
    type: draft.type,
    prompt: String(draft.prompt || "").trim(),
    config: {}
  };

  const scoring = parseScoringRules(draft.scoringText);

  if (hasScoringRules(scoring)) {
    base.scoring = scoring;
  }

  if (draft.type === "singleSelect") {
base.config.options = parseOptionsFromAdminTextarea(draft.optionsText);
return base;
  }

  if (draft.type === "multiSelect") {
const options = parseOptionsFromAdminTextarea(draft.optionsText);
const optionCount = options.length;

    base.config.options = options;
    base.config.minSelections = clampBuilderNumber(
      draft.minSelections,
      1,
      optionCount,
      Math.min(1, optionCount) || 1
    );
    base.config.maxSelections = clampBuilderNumber(
      draft.maxSelections,
      base.config.minSelections,
      optionCount,
      optionCount
    );

    return base;
  }

  if (draft.type === "ranking") {
base.config.options = parseOptionsFromAdminTextarea(draft.optionsText);
return base;
  }

  if (draft.type === "slider") {
    const min = Number(draft.sliderMin ?? 0);
    const max = Number(draft.sliderMax ?? 100);
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 100;

    base.config.min = safeMin;
    base.config.max = safeMax;
    base.config.step = Number(draft.sliderStep ?? 1) || 1;
    base.config.defaultValue = clampBuilderNumber(
      draft.sliderDefaultValue,
      safeMin,
      safeMax,
      Math.round((safeMin + safeMax) / 2)
    );
    base.config.minLabel = String(draft.sliderMinLabel || "").trim() || "Low";
    base.config.centerLabel = String(draft.sliderCenterLabel || "").trim() || "Balanced";
    base.config.maxLabel = String(draft.sliderMaxLabel || "").trim() || "High";
    return base;
  }

  if (draft.type === "scale7") {
    base.config.minLabel = String(draft.scale7MinLabel || "").trim() || "Disagree";
    base.config.midLabel = String(draft.scale7MidLabel || "").trim() || "Neutral";
    base.config.maxLabel = String(draft.scale7MaxLabel || "").trim() || "Agree";
    return base;
  }

  if (draft.type === "freeText") {
    base.config.placeholder = String(draft.freeTextPlaceholder || "");
    base.config.maxLength = clampBuilderNumber(draft.freeTextMaxLength, 1, 5000, 500);
    base.config.rows = clampBuilderNumber(draft.freeTextRows, 2, 12, 4);
    return base;
  }

  if (draft.type === "imageChoice") {
    const rowOptions = Array.isArray(draft.imageChoiceOptions)
      ? draft.imageChoiceOptions
      : [];

    const cleaned = rowOptions
      .map((option, index) => ({
        label: String(option?.label || "").trim(),
        imageUrl: String(option?.imageUrl || "").trim(),
        index
      }))
      .filter(option => option.label);

    base.config.columns = clampBuilderNumber(
      Number(draft.imageChoiceColumns || 2),
      1,
      4,
      2
    );

    base.config.options = cleaned.map((option, index) => ({
      value: slugifyOptionValue(option.label, index),
      label: option.label,
      imageUrl: option.imageUrl
    }));

    return base;
  }

  if (draft.type === "swipeDeck") {
    const cards = Array.isArray(draft.swipeDeckCards)
      ? draft.swipeDeckCards
      : [];

    const cleaned = cards
      .map((card, index) => ({
        label: String(card?.label || `Image ${index + 1}`).trim(),
        imageUrl: String(card?.imageUrl || "").trim(),
        index
      }))
      .filter(card => card.imageUrl);

    base.config.cards = cleaned.map((card, index) => ({
      value: slugifyOptionValue(card.label, index),
      label: card.label,
      imageUrl: card.imageUrl
    }));

    return base;
  }

  if (draft.type === "fileUpload") {
    base.config.accept = String(draft.fileAccept || "image/*,application/pdf").trim() || "image/*,application/pdf";
    base.config.maxBytes = clampBuilderNumber(
      Number(draft.fileMaxMb || 10) * 1024 * 1024,
      1 * 1024 * 1024,
      10 * 1024 * 1024,
      10 * 1024 * 1024
    );
    base.config.allowSkip = String(draft.fileAllowSkip) !== "false";
    base.config.helperText = String(draft.fileHelperText || "").trim() || "Accepted: images or PDF, up to 10 MB.";
    return base;
  }

  return base;
}
function validateBuilderDraft(draft) {
  if (!String(draft.prompt || "").trim()) {
    return "Each question needs a prompt.";
  }

  try {
  parseScoringRules(draft.scoringText);
} catch (error) {
  return error.message;
}

  if (["singleSelect", "multiSelect", "ranking"].includes(draft.type)) {
    const labels = parseBuilderOptionLines(draft.optionsText);

    if (labels.length < ADMIN_BUILDER_MIN_OPTIONS) {
      return `Option-based questions need at least ${ADMIN_BUILDER_MIN_OPTIONS} options.`;
    }

    if (labels.length > ADMIN_BUILDER_MAX_OPTIONS) {
      return `Option-based questions can have at most ${ADMIN_BUILDER_MAX_OPTIONS} options.`;
    }

    if (draft.type === "multiSelect") {
      const minSelections = Number(draft.minSelections);
      const maxSelections = Number(draft.maxSelections);

      if (!Number.isFinite(minSelections) || minSelections < 1) {
        return "Multi-select questions need a valid minimum selection count.";
      }

      if (!Number.isFinite(maxSelections) || maxSelections < minSelections) {
        return "Multi-select max selections must be greater than or equal to min selections.";
      }

      if (maxSelections > labels.length) {
        return "Multi-select max selections cannot exceed the number of options.";
      }
    }
  }

  if (draft.type === "imageChoice") {
    const options = Array.isArray(draft.imageChoiceOptions)
      ? draft.imageChoiceOptions.map(option => String(option?.label || "").trim()).filter(Boolean)
      : [];

    if (options.length < ADMIN_BUILDER_MIN_OPTIONS) {
      return `Image choice questions need at least ${ADMIN_BUILDER_MIN_OPTIONS} options.`;
    }

    if (options.length > ADMIN_BUILDER_MAX_OPTIONS) {
      return `Image choice questions can have at most ${ADMIN_BUILDER_MAX_OPTIONS} options.`;
    }
  }

  if (draft.type === "swipeDeck") {
  const cards = Array.isArray(draft.swipeDeckCards)
    ? draft.swipeDeckCards.filter(card => String(card?.imageUrl || "").trim())
    : [];

  if (cards.length < 1) {
    return "Swipe deck questions need at least one image URL.";
  }

  if (cards.length > ADMIN_BUILDER_MAX_OPTIONS) {
    return `Swipe deck questions can have at most ${ADMIN_BUILDER_MAX_OPTIONS} images.`;
  }
}

  return null;
}

function validateQuizTemplatePayload(payload) {
  if (!String(payload.title || "").trim()) return "Quiz title is required.";
  if (!Array.isArray(payload.questions) || !payload.questions.length) {
    return "Add at least one question.";
  }

  for (const question of payload.questions) {
    if (!String(question.prompt || "").trim()) {
      return "Every question needs a prompt.";
    }

    if (["singleSelect", "multiSelect", "ranking", "imageChoice"].includes(question.type)) {
      const optionCount = Array.isArray(question.config?.options) ? question.config.options.length : 0;
      if (optionCount < ADMIN_BUILDER_MIN_OPTIONS) {
        return "Option-based questions must have at least 2 options.";
      }
    }

    if (question.type === "swipeDeck") {
  const cardCount = Array.isArray(question.config?.cards)
    ? question.config.cards.length
    : 0;

  if (cardCount < 1) {
    return "Swipe deck questions must have at least one image.";
  }
}
  }

  return null;
}

async function loadQuizTemplatesFromSupabase(sb) {
  const { data, error } = await sb
    .from("quiz_templates")
    .select(`
      *,
      quiz_assignments (
        id,
        assignment_mode,
        target_tag,
        target_user_id,
        is_active,
        created_at
      )
    `)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function loadNonAdminProfilesFromSupabase(sb) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name")
    .eq("is_admin", false)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadAvailableTagsFromSupabase(sb) {
  const { data, error } = await sb
    .from("user_tags")
    .select("tag");

  if (error) throw error;

  const uniqueTags = [...new Set((data || []).map(row => row.tag).filter(Boolean))];
  return uniqueTags.sort((a, b) => a.localeCompare(b));
}

async function loadQuizTemplateDetailFromSupabase(sb, templateId) {
  const { data, error } = await sb
    .from("quiz_templates")
    .select(`
      *,
      quiz_assignments (
        id,
        assignment_mode,
        target_tag,
        target_user_id,
        is_active,
        created_at
      )
    `)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadQuizResponsesFromSupabase(sb, me, options = {}) {
  if (!sb || !me?.id) return { responses: {}, progress: {} };

  let query = sb
    .from("quiz_responses")
    .select(`
      id,
      assignment_id,
      quiz_template_id,
      user_id,
      answers_json,
      progress_json,
      completed,
      submitted_at,
      updated_at,
      created_at
    `);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  } else {
    query = query.eq("user_id", me.id);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.warn("loadQuizResponsesFromSupabase failed", error);
    return { responses: {}, progress: {} };
  }

  const responses = {};
  const progress = {};

  for (const row of data || []) {
    const assignmentId = row.assignment_id;
    if (!assignmentId) continue;

    if (row.completed) {
      responses[assignmentId] = {
        id: row.id,
        assignmentId: row.assignment_id,
        templateId: row.quiz_template_id,
        userId: row.user_id,
        answers: row.answers_json || {},
        progress: row.progress_json || {},
        completed: true,
        submittedAt: row.submitted_at || null,
        updatedAt: row.updated_at || null,
        createdAt: row.created_at || null
      };
    } else {
      progress[assignmentId] = {
        id: row.id,
        assignmentId: row.assignment_id,
        templateId: row.quiz_template_id,
        userId: row.user_id,
        answers: (row.progress_json && row.progress_json.answers) || row.answers_json || {},
        currentStep: Number(row.progress_json?.currentStep || 0),
        updatedAt: row.updated_at || null,
        createdAt: row.created_at || null
      };
    }
  }

  return { responses, progress };
}

async function upsertQuizResponseToSupabase(sb, me, assignment, payload = {}) {
  if (!sb || !me?.id || !assignment?.id) return null;

  const completed = !!payload.completed;
  const nowIso = new Date().toISOString();

  const row = {
    assignment_id: assignment.id,
    quiz_template_id: assignment.templateId || null,
    user_id: me.id,
    answers_json: payload.answers || {},
    progress_json: payload.progress || {},
    completed,
    submitted_at: completed ? (payload.submittedAt || nowIso) : null,
    updated_at: nowIso
  };

  const { data, error } = await sb
    .from("quiz_responses")
    .upsert(row, { onConflict: "assignment_id,user_id" })
    .select(`
      id,
      assignment_id,
      quiz_template_id,
      user_id,
      answers_json,
      progress_json,
      completed,
      submitted_at,
      updated_at,
      created_at
    `)
    .single();

  if (error) {
    console.warn("upsertQuizResponseToSupabase failed", error);
    throw error;
  }

  return data;
}

async function deleteQuizResponseProgressFromSupabase(sb, me, assignmentId) {
  if (!sb || !me?.id || !assignmentId) return;

  const { error } = await sb
    .from("quiz_responses")
    .delete()
    .eq("assignment_id", assignmentId)
    .eq("user_id", me.id)
    .eq("completed", false);

  if (error) {
    console.warn("deleteQuizResponseProgressFromSupabase failed", error);
  }
}


function formatAssignmentTargetLabel(template, profilesById = {}) {
  const assignments = Array.isArray(template?.quiz_assignments)
    ? template.quiz_assignments.filter(row => row.is_active)
    : [];

  if (!assignments.length) return "Unassigned";

  if (assignments.some(row => row.assignment_mode === "all_users")) {
    return "All users";
  }

  const specificUsers = assignments
    .filter(row => row.assignment_mode === "specific_user")
    .map(row => profilesById[row.target_user_id]?.display_name || row.target_user_id || null)
    .filter(Boolean);

  if (specificUsers.length) {
    return specificUsers.join(", ");
  }

  const tagAssignment = assignments.find(row => row.assignment_mode === "tag");
  if (tagAssignment?.target_tag) {
    return `Tag: ${tagAssignment.target_tag}`;
  }

  return "Unassigned";
}

function hydrateBuilderDraftFromQuestion(question) {
  const draft = createBuilderQuestionDraft(question.type);
  draft.id = question.id || draft.id;
  draft.type = question.type || "singleSelect";
  draft.prompt = question.prompt || "";

draft.scoringText = question.scoring
  ? JSON.stringify(question.scoring, null, 2)
  : "";

  if (["singleSelect", "multiSelect", "ranking"].includes(draft.type)) {
draft.optionsText = Array.isArray(question.config?.options)
  ? formatOptionsForAdminTextarea(question.config.options)
  : getDefaultOptionsTextForType(draft.type);
  }

  if (draft.type === "multiSelect") {
    draft.minSelections = Number(question.config?.minSelections ?? 1);
    draft.maxSelections = Number(question.config?.maxSelections ?? 2);
  }

  if (draft.type === "slider") {
    draft.sliderMin = Number(question.config?.min ?? 0);
    draft.sliderMax = Number(question.config?.max ?? 100);
    draft.sliderStep = Number(question.config?.step ?? 1);
    draft.sliderDefaultValue = Number(question.config?.defaultValue ?? 50);
    draft.sliderMinLabel = question.config?.minLabel || "Low";
    draft.sliderCenterLabel = question.config?.centerLabel || "Balanced";
    draft.sliderMaxLabel = question.config?.maxLabel || "High";
  }

  if (draft.type === "scale7") {
  draft.scale7MinLabel = question.config?.minLabel || "Disagree";
  draft.scale7MidLabel = question.config?.midLabel || "Neutral";
  draft.scale7MaxLabel = question.config?.maxLabel || "Agree";
}

  if (draft.type === "freeText") {
    draft.freeTextPlaceholder = question.config?.placeholder || "";
    draft.freeTextMaxLength = Number(question.config?.maxLength ?? 500);
    draft.freeTextRows = Number(question.config?.rows ?? 4);
  }

if (draft.type === "imageChoice") {
  const options = Array.isArray(question.config?.options) ? question.config.options : [];
  draft.imageChoiceOptions = options.length
    ? options.map(option => ({
        label: option.label || option.value || "",
        imageUrl: option.imageUrl || ""
      }))
    : [
        { label: "Option 1", imageUrl: "" },
        { label: "Option 2", imageUrl: "" }
      ];

  draft.optionsText = draft.imageChoiceOptions.map(option => option.label).join("\n");
  draft.optionsImagesText = draft.imageChoiceOptions.map(option => option.imageUrl).join("\n");
  draft.imageChoiceColumns = question.config?.columns ?? 2;
}

if (draft.type === "swipeDeck") {
  const cards = Array.isArray(question.config?.cards)
    ? question.config.cards
    : [];

  draft.swipeDeckCards = cards.length
    ? cards.map(card => ({
        label: card.label || card.value || "",
        imageUrl: card.imageUrl || ""
      }))
    : [
        { label: "Image 1", imageUrl: "" },
        { label: "Image 2", imageUrl: "" }
      ];
}

if (draft.type === "fileUpload") {
  draft.fileAccept = question.config?.accept || "image/*,application/pdf";
  draft.fileMaxMb = Math.round(Number(question.config?.maxBytes ?? (10 * 1024 * 1024)) / 1024 / 1024);
  draft.fileAllowSkip = question.config?.allowSkip === false ? "false" : "true";
  draft.fileHelperText = question.config?.helperText || "Accepted: images or PDF, up to 10 MB.";
}


  return draft;
}

function getAssignmentEditorStateFromTemplate(template) {
  const assignments = Array.isArray(template?.quiz_assignments)
    ? template.quiz_assignments.filter(row => row.is_active)
    : [];

  if (!assignments.length) {
    return {
      mode: "all_users",
      targetUserIds: [],
      targetTag: ""
    };
  }

  if (assignments.some(row => row.assignment_mode === "all_users")) {
    return {
      mode: "all_users",
      targetUserIds: [],
      targetTag: ""
    };
  }

  const specificUsers = assignments
    .filter(row => row.assignment_mode === "specific_user")
    .map(row => row.target_user_id)
    .filter(Boolean);

  if (specificUsers.length) {
    return {
      mode: "specific_users",
      targetUserIds: specificUsers,
      targetTag: ""
    };
  }

  const tagAssignment = assignments.find(row => row.assignment_mode === "tag");

  if (tagAssignment?.target_tag) {
    return {
      mode: "tag",
      targetUserIds: [],
      targetTag: tagAssignment.target_tag
    };
  }

  return {
    mode: "all_users",
    targetUserIds: [],
    targetTag: ""
  };
}

async function createQuizTemplateInSupabase(sb, me, payload) {
  const baseSlug = slugifyTemplateValue(payload.title) || "quiz_template";
  const slug = `${baseSlug}_${Date.now()}`;

  const insertPayload = {
    slug,
    title: payload.title,
    prompt: payload.prompt,
    description: payload.description,
status: payload.status || "active",
priority: Number(payload.priority) || 100,
day_index: Number(payload.dayIndex) || 1,
cta_label: payload.ctaLabel || "Save",
    save_mode: payload.saveMode || "single",
category: payload.category || null,
matrix_id: payload.matrixId || null,
impact_weight: payload.impactWeight || "medium",
candidate_reduction: Number(payload.candidateReduction) || 0,
confidence_increase: Number(payload.confidenceIncrease) || 0,
stage_label: payload.stageLabel || null,
questions_json: payload.questions,
created_by: me?.id || null
  };

  const { data: template, error } = await sb
    .from("quiz_templates")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;

  await saveTemplateAssignmentToSupabase(sb, me, template.id, payload.assignment || {
    mode: "all_users"
  });

  return template;
}

async function updateQuizTemplateInSupabase(sb, me, templateId, payload) {
  const updatePayload = {
    title: payload.title,
    prompt: payload.prompt,
    description: payload.description,
status: payload.status || "active",
priority: Number(payload.priority) || 100,
day_index: Number(payload.dayIndex) || 1,
cta_label: payload.ctaLabel || "Save",
    save_mode: payload.saveMode || "single",
category: payload.category || null,
matrix_id: payload.matrixId || null,
impact_weight: payload.impactWeight || "medium",
candidate_reduction: Number(payload.candidateReduction) || 0,
confidence_increase: Number(payload.confidenceIncrease) || 0,
stage_label: payload.stageLabel || null,
questions_json: payload.questions,
updated_at: new Date().toISOString()
  };

  const { data: template, error } = await sb
    .from("quiz_templates")
    .update(updatePayload)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) throw error;

  await saveTemplateAssignmentToSupabase(sb, me, templateId, payload.assignment || {
    mode: "all_users"
  });

  return template;
}

function getPrimaryAssignmentForTemplate(template) {
  const assignments = Array.isArray(template?.quiz_assignments)
    ? [...template.quiz_assignments].sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      })
    : [];

  return assignments[0] || null;
}

async function saveTemplateAssignmentToSupabase(sb, me, templateId, assignment) {
  const mode = assignment?.mode || "all_users";

  const { data: existingAssignments, error: existingError } = await sb
    .from("quiz_assignments")
    .select("id")
    .eq("quiz_template_id", templateId);

  if (existingError) throw existingError;

  const existingIds = (existingAssignments || []).map(row => row.id);

  if (existingIds.length) {
    const { error: deleteError } = await sb
      .from("quiz_assignments")
      .delete()
      .in("id", existingIds);

    if (deleteError) throw deleteError;
  }

  let insertRows = [];

  if (mode === "all_users") {
    insertRows = [{
      quiz_template_id: templateId,
      assignment_mode: "all_users",
      is_active: true,
      created_by: me?.id || null,
      target_tag: null,
      target_user_id: null
    }];
  }

  if (mode === "specific_users") {
    const userIds = Array.isArray(assignment.targetUserIds)
      ? assignment.targetUserIds.filter(Boolean)
      : [];

    if (!userIds.length) {
      throw new Error("Select at least one user.");
    }

    insertRows = userIds.map(userId => ({
      quiz_template_id: templateId,
      assignment_mode: "specific_user",
      is_active: true,
      created_by: me?.id || null,
      target_tag: null,
      target_user_id: userId
    }));
  }

  if (mode === "tag") {
    if (!assignment.targetTag) {
      throw new Error("Enter a tag for tag-based assignment.");
    }

    insertRows = [{
      quiz_template_id: templateId,
      assignment_mode: "tag",
      is_active: true,
      created_by: me?.id || null,
      target_tag: assignment.targetTag,
      target_user_id: null
    }];
  }

  const { error: insertError } = await sb
    .from("quiz_assignments")
    .insert(insertRows);

  if (insertError) throw insertError;
}

async function deleteQuizTemplateFromSupabase(sb, templateId) {
  const { error } = await sb
    .from("quiz_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw error;
}

async function loadUserInsightsFromSupabase(sb, userId, options = {}) {
  if (!sb || !userId) return [];

  let query = sb
    .from("user_insights")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function createUserInsightInSupabase(sb, me, payload) {
  const { data, error } = await sb
    .from("user_insights")
    .insert({
      user_id: payload.userId,
title: payload.title,
eyebrow: payload.eyebrow || null,
body_html: payload.bodyHtml || "",
      category: payload.category || "general",
      status: payload.status || "draft",
      eyebrow: payload.eyebrow || null,
      created_by: me?.id || null
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function updateUserInsightInSupabase(sb, insightId, payload) {
  const { data, error } = await sb
    .from("user_insights")
    .update({
title: payload.title,
eyebrow: payload.eyebrow || null,
body_html: payload.bodyHtml || "",
      category: payload.category || "general",
      status: payload.status || "draft",
      eyebrow: payload.eyebrow || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", insightId)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

async function deleteUserInsightFromSupabase(sb, insightId) {
  const { error } = await sb
    .from("user_insights")
    .delete()
    .eq("id", insightId);

  if (error) throw error;
}

async function loadUserTasksFromSupabase(sb, userId) {
  const { data, error } = await sb
    .from("user_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function createUserTaskInSupabase(sb, me, payload) {
  const { data, error } = await sb
    .from("user_tasks")
    .insert({
      user_id: payload.userId,
      title: payload.title,
      description: payload.description || "",
      task_type: payload.taskType || "manual",
      category: payload.category || "general",
      status: payload.status || "active",
      target_count: payload.targetCount || null,
      timeframe_minutes: payload.timeframeMinutes || null,
      starts_at: payload.startsAt || new Date().toISOString(),
      created_by: me?.id || null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function updateUserTaskInSupabase(sb, taskId, payload) {
  const { data, error } = await sb
    .from("user_tasks")
    .update({
      title: payload.title,
      description: payload.description || "",
      task_type: payload.taskType || "manual",
      category: payload.category || "general",
      status: payload.status || "active",
      target_count: payload.targetCount || null,
      timeframe_minutes: payload.timeframeMinutes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function completeUserTaskInSupabase(sb, taskId) {
  const { error } = await sb
    .from("user_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", taskId);

  if (error) throw error;
}

async function deleteUserTaskFromSupabase(sb, taskId) {
  const { error } = await sb
    .from("user_tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
}

async function loadUserTagsFromSupabase(sb, me) {
  if (!me?.id) return [];

  const { data, error } = await sb
    .from("user_tags")
    .select("tag")
    .eq("user_id", me.id);

  if (error) {
    console.warn("loadUserTagsFromSupabase failed", error);
    return [];
  }

  return (data || []).map(row => row.tag).filter(Boolean);
}

function isAssignmentLiveNow(row) {
  const now = Date.now();

  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return false;
  }

  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    return false;
  }

  return !!row.is_active;
}

function assignmentTargetsUser(row, me, userTags = []) {
  if (!row || !me?.id) return false;

  if (row.assignment_mode === "all_users") return true;
  if (row.assignment_mode === "specific_user") {
    return row.target_user_id === me.id;
  }
  if (row.assignment_mode === "tag") {
    return !!row.target_tag && userTags.includes(row.target_tag);
  }

  return false;
}

function applyTemplateOverride(template, overrideJson = {}) {
  const baseQuestions = Array.isArray(template?.questions_json)
    ? template.questions_json
    : [];

  const questionOverrides = overrideJson.questions || {};
  const hiddenQuestionIds = new Set(overrideJson.hiddenQuestionIds || []);
  const extraQuestions = Array.isArray(overrideJson.extraQuestions)
    ? overrideJson.extraQuestions
    : [];

const orderedBaseQuestions = Array.isArray(overrideJson.questionOrder)
  ? [
      ...overrideJson.questionOrder
        .map(id => baseQuestions.find(question => question.id === id))
        .filter(Boolean),
      ...baseQuestions.filter(question => !overrideJson.questionOrder.includes(question.id))
    ]
  : baseQuestions;

const patchedQuestions = orderedBaseQuestions
  .filter(question => !hiddenQuestionIds.has(question.id))
  .map(question => {
      const override = questionOverrides[question.id] || {};

      return {
        ...question,
        ...override,
        config: {
          ...(question.config || {}),
          ...(override.config || {})
        }
      };
    });

  return {
    ...template,
    title: overrideJson.title ?? template.title,
    prompt: overrideJson.prompt ?? template.prompt,
    description: overrideJson.description ?? template.description,
    questions_json: [
      ...patchedQuestions,
      ...extraQuestions
    ]
  };
}

function mapDbAssignmentToRuntime(row) {
  const template = row.rendered_template || row.quiz_template;
  const questions = Array.isArray(template?.questions_json) ? template.questions_json : [];



  return {
    
    id: row.id,
    templateId: template?.id || null,
    type: "assessmentCard",
    title: template?.title || "Untitled quiz",
    prompt: template?.prompt || "",
    description: template?.description || "",
    status: template?.status || "active",
    priority: Number(template?.priority ?? 100),
    ctaLabel: template?.cta_label || "Save",
    saveMode: template?.save_mode || "single",
matrixId: template?.matrix_id || null,
matrix_id: template?.matrix_id || null,

effect: {
  impactWeight: template?.impact_weight || "medium",
  candidateReduction: Number(template?.candidate_reduction ?? 0),
  confidenceIncrease: Number(template?.confidence_increase ?? 0),
  stageLabel: template?.stage_label || "",
  matrixId: template?.matrix_id || "",
  matrix_id: template?.matrix_id || ""
},
    meta: {
      category: template?.category || null,
      assignedBy: row.created_by || "admin",
      assignedAt: row.created_at || null,
      assignmentMode: row.assignment_mode
    },
    questions
  };
}
async function loadRuntimeAssignmentsFromSupabase(sb, me, options = {}) {
  const { includeLocked = false } = options;

  const [userTags, assignmentResult] = await Promise.all([
    loadUserTagsFromSupabase(sb, me),
    sb
      .from("quiz_assignments")
      .select(`
        id,
        quiz_template_id,
        assignment_mode,
        target_tag,
        target_user_id,
        is_active,
        starts_at,
        ends_at,
        created_by,
        created_at,
quiz_template:quiz_template_id (
  id,
  slug,
  title,
  prompt,
  description,
  status,
  priority,
  cta_label,
  save_mode,
category,
matrix_id,
impact_weight,
candidate_reduction,
confidence_increase,
stage_label,
questions_json,
  quiz_template_overrides (
    id,
    template_id,
    user_id,
    override_json
  )
)
      `)
      .order("created_at", { ascending: false })
  ]);

  if (assignmentResult.error) {
    throw assignmentResult.error;
  }

  const rows = assignmentResult.data || [];

  return rows
    .filter(row => row.quiz_template)
    .filter(row => includeLocked || row.quiz_template.status !== "archived")
    .filter(row => includeLocked || row.quiz_template.status !== "draft")
    .filter(isAssignmentLiveNow)
    .filter(row => assignmentTargetsUser(row, me, userTags))
.map(row => {
  const overrides = row.quiz_template?.quiz_template_overrides || [];
  const override = overrides.find(item => item.user_id === me.id) || null;

  return {
    ...row,
    rendered_template: override
      ? applyTemplateOverride(row.quiz_template, override.override_json || {})
      : row.quiz_template
  };
})
.map(mapDbAssignmentToRuntime)
.sort((a, b) => a.priority - b.priority);
}
