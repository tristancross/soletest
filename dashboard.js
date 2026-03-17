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

function createBuilderQuestionDraft(type = "singleSelect") {
  return {
    id: `q_${Math.random().toString(36).slice(2, 9)}`,
    type,
    prompt: "",
    optionsText: "Option 1\nOption 2",
    optionsImagesText: "",
    imageChoiceColumns: 2,
    imageChoiceOptions: [
  { label: "Option 1", imageUrl: "" },
  { label: "Option 2", imageUrl: "" }
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

  if (draft.type === "singleSelect") {
    const labels = parseBuilderOptionLines(draft.optionsText);
    base.config.options = normaliseOptionLabels(labels);
    return base;
  }

  if (draft.type === "multiSelect") {
    const labels = parseBuilderOptionLines(draft.optionsText);
    const options = normaliseOptionLabels(labels);
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
    const labels = parseBuilderOptionLines(draft.optionsText);
    base.config.options = normaliseOptionLabels(labels);
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

  if (["singleSelect", "multiSelect", "ranking"].includes(draft.type)) {
    draft.optionsText = Array.isArray(question.config?.options)
      ? question.config.options.map(option => option.label || option.value || "").join("\n")
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
    cta_label: payload.ctaLabel || "Save",
    save_mode: payload.saveMode || "single",
    category: payload.category || null,
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
    cta_label: payload.ctaLabel || "Save",
    save_mode: payload.saveMode || "single",
    category: payload.category || null,
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

function mapDbAssignmentToRuntime(row) {
  const template = row.quiz_template;
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
effect: {
  impactWeight: template?.impact_weight || "medium",
  candidateReduction: Number(template?.candidate_reduction ?? 0),
  confidenceIncrease: Number(template?.confidence_increase ?? 0),
  stageLabel: template?.stage_label || ""
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
          impact_weight,
          candidate_reduction,
          confidence_increase,
          stage_label,
          questions_json
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
    .filter(row => includeLocked || row.quiz_template.status !== "locked")
    .filter(isAssignmentLiveNow)
    .filter(row => assignmentTargetsUser(row, me, userTags))
    .map(mapDbAssignmentToRuntime)
    .sort((a, b) => a.priority - b.priority);
}

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
  impactWeight: "medium",
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

  // Normalise to roughly 0–100
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
  // v1 simple version: days since signup, capped 1–5
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
  const messageScore = getMessageSignalScore(messageCount);   // 0–100
  const quizScore = getQuizSignalScore(me, assignments);      // 0–100
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
          ${escapeHtml(getSliderDisplayLabel(question, value))}
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

   if (question.type === "fileUpload") {
  const savedValue = savedAnswers?.[question.id] || null;
    const uploaded = savedValue?.status === "uploaded";
    const skipped = savedValue?.status === "skipped";
    const helperText = String(question.config?.helperText || "").trim();
    const accept = getFileUploadAcceptString(question);

    return `
      <div class="quizUploadBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="fileUpload">
        <div class="quizLabel">${escapeHtml(question.prompt || "")}</div>

        ${helperText ? `<div class="quizHelpText">${escapeHtml(helperText)}</div>` : ""}

        <input
          class="quizFileInput"
          type="file"
          accept="${escapeAttr(accept)}"
          data-file-input="${escapeAttr(question.id)}"
        />

        <div class="quizFileMeta" data-file-meta="${escapeAttr(question.id)}">
          ${
            uploaded
              ? `Uploaded: ${escapeHtml(savedValue.fileName || "file")}`
              : skipped
                ? `Skipped`
                : `No file selected`
          }
        </div>

        ${
          uploaded && savedValue.mimeType?.startsWith("image/") && savedValue.previewUrl
            ? `<img class="quizFilePreviewImage" src="${escapeAttr(savedValue.previewUrl)}" alt="" />`
            : ""
        }

        ${
          uploaded && savedValue.mimeType === "application/pdf"
            ? `<div class="quizFilePdfTag">PDF uploaded</div>`
            : ""
        }

        ${
          question.config?.allowSkip !== false
            ? `
              <div class="quizUploadActions">
                <button
                  type="button"
                  class="quizSkipBtn"
                  data-file-skip="${escapeAttr(question.id)}"
                >
                  Skip
                </button>
              </div>
            `
            : ""
        }
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
  const numericValue = Number(answer.value ?? question.config?.defaultValue ?? 50);
  const displayLabel =
    answer.interpretedLabel ||
    getSliderDisplayLabel(question, numericValue);

  lines.push(`
    <div class="quizCompleteLine">
      ${escapeHtml(question.prompt)}:
      <strong>${escapeHtml(displayLabel)}, ${escapeHtml(`${numericValue}%`)}</strong>
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
  const selectedOption = (question.config?.options || []).find(
    option => option.value === answer.value
  );

  const selectedLabel = answer.label || selectedOption?.label || answer.value || "";
  const selectedImageUrl = selectedOption?.imageUrl || "";

  lines.push(`
    <div class="quizCompleteLine quizCompleteLineImageChoice">
      <div>
        ${escapeHtml(question.prompt)}:
        <strong>${escapeHtml(selectedLabel)}</strong>
      </div>
      ${
        selectedImageUrl
          ? `
            <div class="quizCompleteImageChoiceThumbWrap">
              <img
                class="quizCompleteImageChoiceThumb"
                src="${escapeAttr(selectedImageUrl)}"
                alt="${escapeAttr(selectedLabel)}"
              />
            </div>
          `
          : ""
      }
    </div>
  `);
}

        if (question.type === "fileUpload") {
      if (answer.status === "skipped") {
        lines.push(`
          <div class="quizCompleteLine">
            ${escapeHtml(question.prompt)}:
            <strong>Skipped</strong>
          </div>
        `);
      } else if (answer.status === "uploaded") {
        const fileUrl = answer.signedUrl || "";
        lines.push(`
          <div class="quizCompleteLine">
            ${escapeHtml(question.prompt)}:
            <strong>${escapeHtml(answer.fileName || "Uploaded file")}</strong>
            ${
              fileUrl
                ? ` — <a href="${escapeAttr(fileUrl)}" target="_blank" rel="noopener noreferrer">Open file</a>`
                : ""
            }
          </div>
        `);
      }
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

async function hydrateAnswersWithSignedUrls(sb, answers = {}) {
  const entries = await Promise.all(
    Object.entries(answers).map(async ([questionId, answer]) => {
      if (answer?.status === "uploaded" && answer?.path) {
        const signedUrl = await createQuizUploadSignedUrl(sb, answer);
        return [questionId, { ...answer, signedUrl: signedUrl || "" }];
      }

      return [questionId, answer];
    })
  );

  return Object.fromEntries(entries);
}

async function renderAssignmentCard(assignment, me, escapeHtml, options = {}) {
  const { adminPreview = false, sb = null } = options;

  const savedResponse = getAssignmentResponse(me, assignment.id);
  const savedProgress = getAssignmentProgress(me, assignment.id);
 const mergedAnswers = getMergedAssignmentAnswers(me, assignment);

  if (savedResponse?.completed && assignment.saveMode === "single") {
    const hydratedAnswers = (adminPreview && sb)
      ? await hydrateAnswersWithSignedUrls(sb, savedResponse.answers || {})
      : (savedResponse.answers || {});

    return renderCompletedSummary(
      assignment,
      {
        ...savedResponse,
        answers: hydratedAnswers
      },
      escapeHtml,
      { adminPreview, isPartial: false }
    );
  }

  if (adminPreview && Object.keys(mergedAnswers).length > 0) {
    const hydratedAnswers = sb
      ? await hydrateAnswersWithSignedUrls(sb, mergedAnswers)
      : mergedAnswers;

    return renderCompletedSummary(
      assignment,
      {
        answers: hydratedAnswers,
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
  const mergedAnswers = getMergedAssignmentAnswers(me, assignment);
  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
  if (!questions.length) return false;

  return questions.every(question => {
    const answer = mergedAnswers[question.id];
    return canAdvanceQuestion(question, answer);
  });
}

function getVisibleAssignmentsForUser(me, assignments) {
  const sorted = [...assignments]
    .filter(item => item.status !== "archived" && item.status !== "locked")
    .sort((a, b) => a.priority - b.priority);

  const nextIncomplete = sorted.find(item => !isAssignmentCompleted(me, item));

  if (!nextIncomplete) {
    return [];
  }

  return [nextIncomplete];
}

async function renderAssignments(me, assignments, escapeHtml, options = {}) {
  const { adminPreview = false } = options;

  if (adminPreview) {
    const rendered = await Promise.all(
      assignments.map(item => renderAssignmentCard(item, me, escapeHtml, options))
    );
    return rendered.join("");
  }

  const visibleAssignments = getVisibleAssignmentsForUser(me, assignments);

  if (!visibleAssignments.length) {
    return renderUserCompletionPanel(escapeHtml);
  }

  const rendered = await Promise.all(
    visibleAssignments.map(item => renderAssignmentCard(item, me, escapeHtml, options))
  );

  return rendered.join("");
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



function renderAdminQuestionBuilder(question, index, escapeHtml) {
const typeOptions = [
  ["singleSelect", "Single select"],
  ["multiSelect", "Multi-select"],
  ["slider", "Slider"],
  ["ranking", "Ranking"],
  ["freeText", "Free text"],
  ["imageChoice", "Image choice"],
  ["fileUpload", "File upload"]
];

const isOptionBased = ["singleSelect", "multiSelect", "ranking"].includes(question.type);
  const isMultiSelect = question.type === "multiSelect";
  const isSlider = question.type === "slider";
  const isFreeText = question.type === "freeText";
  const isImageChoice = question.type === "imageChoice";

  return `
    <div class="adminQuizQuestionCard" data-builder-question-card="${escapeAttr(question.id)}">
      <div class="adminQuizQuestionTop">
        <div class="adminQuizQuestionTitle">Question ${index + 1}</div>
        <button
          type="button"
          class="btn btnGhost"
          data-builder-remove-question="${escapeAttr(question.id)}"
        >
          Remove
        </button>
      </div>

      <div class="adminQuizField">
        <label>Question type</label>
        <select data-builder-field="type" data-builder-question-id="${escapeAttr(question.id)}">
          ${typeOptions.map(([value, label]) => `
            <option value="${escapeAttr(value)}" ${question.type === value ? "selected" : ""}>
              ${escapeHtml(label)}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="adminQuizField">
        <label>Prompt</label>
        <input
          type="text"
          value="${escapeAttr(question.prompt || "")}"
          data-builder-field="prompt"
          data-builder-question-id="${escapeAttr(question.id)}"
          placeholder="Enter the question prompt"
        />
      </div>

      ${isOptionBased ? `
        <div class="adminQuizField">
          <label>Options (one per line, 2–10)</label>
          <textarea
            rows="5"
            data-builder-field="optionsText"
            data-builder-question-id="${escapeAttr(question.id)}"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          >${escapeHtml(question.optionsText || "")}</textarea>
        </div>
      ` : ""}

      ${isMultiSelect ? `
        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Min selections</label>
            <input
              type="number"
              min="1"
              max="${ADMIN_BUILDER_MAX_OPTIONS}"
              value="${escapeAttr(question.minSelections ?? 1)}"
              data-builder-field="minSelections"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Max selections</label>
            <input
              type="number"
              min="1"
              max="${ADMIN_BUILDER_MAX_OPTIONS}"
              value="${escapeAttr(question.maxSelections ?? 1)}"
              data-builder-field="maxSelections"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>
        </div>
      ` : ""}

      ${isSlider ? `
        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Min</label>
            <input
              type="number"
              value="${escapeAttr(question.sliderMin ?? 0)}"
              data-builder-field="sliderMin"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Max</label>
            <input
              type="number"
              value="${escapeAttr(question.sliderMax ?? 100)}"
              data-builder-field="sliderMax"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Step</label>
            <input
              type="number"
              value="${escapeAttr(question.sliderStep ?? 1)}"
              data-builder-field="sliderStep"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Default</label>
            <input
              type="number"
              value="${escapeAttr(question.sliderDefaultValue ?? 50)}"
              data-builder-field="sliderDefaultValue"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Left label</label>
            <input
              type="text"
              value="${escapeAttr(question.sliderMinLabel || "")}"
              data-builder-field="sliderMinLabel"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Centre label</label>
            <input
              type="text"
              value="${escapeAttr(question.sliderCenterLabel || "")}"
              data-builder-field="sliderCenterLabel"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Right label</label>
            <input
              type="text"
              value="${escapeAttr(question.sliderMaxLabel || "")}"
              data-builder-field="sliderMaxLabel"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>
        </div>
      ` : ""}
      

      ${isFreeText ? `
        <div class="adminQuizField">
          <label>Placeholder</label>
          <input
            type="text"
            value="${escapeAttr(question.freeTextPlaceholder || "")}"
            data-builder-field="freeTextPlaceholder"
            data-builder-question-id="${escapeAttr(question.id)}"
          />
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Max length</label>
            <input
              type="number"
              min="1"
              max="5000"
              value="${escapeAttr(question.freeTextMaxLength ?? 500)}"
              data-builder-field="freeTextMaxLength"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Rows</label>
            <input
              type="number"
              min="2"
              max="12"
              value="${escapeAttr(question.freeTextRows ?? 4)}"
              data-builder-field="freeTextRows"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>
        </div>
      ` : ""}

${isImageChoice ? `
  <div class="adminQuizFieldRow">
    <div class="adminQuizField">
      <label>Grid columns</label>
      <input
        type="number"
        min="1"
        max="4"
        value="${escapeAttr(question.imageChoiceColumns ?? 2)}"
        data-builder-field="imageChoiceColumns"
        data-builder-question-id="${escapeAttr(question.id)}"
      />
    </div>
  </div>

  <div class="adminQuizImageChoiceRows">
    ${(question.imageChoiceOptions || []).map((option, optionIndex) => `
      <div class="adminQuizImageChoiceRow" data-image-choice-row="${escapeAttr(question.id)}_${optionIndex}">
        <div class="adminQuizImageChoicePreviewWrap">
          ${
            option.imageUrl
              ? `<img
                  class="adminQuizImageChoicePreview"
                  src="${escapeAttr(option.imageUrl)}"
                  alt="${escapeAttr(option.label || "")}"
                />`
              : `<div class="adminQuizImageChoicePreview adminQuizImageChoicePreviewPlaceholder">No image</div>`
          }
        </div>

        <div class="adminQuizImageChoiceInputs">
          <div class="adminQuizField">
            <label>Caption</label>
            <input
              type="text"
              value="${escapeAttr(option.label || "")}"
              data-builder-image-choice-field="label"
              data-builder-question-id="${escapeAttr(question.id)}"
              data-builder-option-index="${optionIndex}"
            />
          </div>

          <div class="adminQuizField">
            <label>Image URL</label>
            <input
              type="text"
              value="${escapeAttr(option.imageUrl || "")}"
              data-builder-image-choice-field="imageUrl"
              data-builder-question-id="${escapeAttr(question.id)}"
              data-builder-option-index="${optionIndex}"
            />
          </div>
        </div>

        <button
          type="button"
          class="btn btnGhost"
          data-builder-remove-image-choice-option="${escapeAttr(question.id)}"
          data-builder-option-index="${optionIndex}"
        >
          Remove
        </button>
      </div>
    `).join("")}
  </div>

  <div class="adminQuizActionsInline">
    <button
      type="button"
      class="btn btnGhost"
      data-builder-add-image-choice-option="${escapeAttr(question.id)}"
    >
      Add option
    </button>
  </div>
` : ""}


            ${question.type === "fileUpload" ? `
        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Accepted types</label>
            <input
              type="text"
              value="${escapeAttr(question.fileAccept || "image/*,application/pdf")}"
              data-builder-field="fileAccept"
              data-builder-question-id="${escapeAttr(question.id)}"
              placeholder="image/*,application/pdf"
            />
          </div>

          <div class="adminQuizField">
            <label>Max size (MB)</label>
            <input
              type="number"
              min="1"
              max="10"
              value="${escapeAttr(question.fileMaxMb ?? 10)}"
              data-builder-field="fileMaxMb"
              data-builder-question-id="${escapeAttr(question.id)}"
            />
          </div>

          <div class="adminQuizField">
            <label>Allow skip</label>
            <select
              data-builder-field="fileAllowSkip"
              data-builder-question-id="${escapeAttr(question.id)}"
            >
              <option value="true" ${question.fileAllowSkip !== "false" ? "selected" : ""}>Yes</option>
              <option value="false" ${question.fileAllowSkip === "false" ? "selected" : ""}>No</option>
            </select>
          </div>
        </div>

        <div class="adminQuizField">
          <label>Helper text</label>
          <input
            type="text"
            value="${escapeAttr(question.fileHelperText || "Accepted: images or PDF, up to 10 MB.")}"
            data-builder-field="fileHelperText"
            data-builder-question-id="${escapeAttr(question.id)}"
            placeholder="Accepted: images or PDF, up to 10 MB."
          />
        </div>
      ` : ""}
    </div>
  `;
}

function renderSavedTemplateList(templates, profiles, escapeHtml) {
  if (!templates.length) {
    return `
      <div class="adminQuizEmpty">
        No saved templates yet.
      </div>
    `;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map(profile => [profile.id, profile])
  );

  return `
    <div class="adminQuizTemplateList">
      ${templates.map(template => `
        <article class="adminQuizTemplateRow">
          <div class="adminQuizTemplateMeta">
            <div class="adminQuizTemplateTitle">${escapeHtml(String(template.title ?? ""))}</div>
            <div class="adminQuizTemplateSub">
              priority ${escapeHtml(String(template.priority ?? ""))} ·
              confidence +${escapeHtml(String(template.confidence_increase ?? ""))} ·
              pool -${escapeHtml(String(template.candidate_reduction ?? ""))}
            </div>
            <div class="adminQuizTemplateSub">
              target ${escapeHtml(formatAssignmentTargetLabel(template, profilesById))}
            </div>
          </div>

          <div class="adminQuizTemplateActions">
            <button
              type="button"
              class="btn btnGhost"
              data-duplicate-template="${escapeAttr(template.id)}"
            >
              Duplicate
            </button>

            <button
              type="button"
              class="btn btnGhost"
              data-edit-template="${escapeAttr(template.id)}"
            >
              Edit
            </button>

            <button
              type="button"
              class="btn btnGhost adminQuizDeleteBtn"
              data-delete-template="${escapeAttr(template.id)}"
            >
              Delete
            </button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

async function renderAdminDashboardHome({ sb, me, escapeHtml }) {
  let templates = [];
  let profiles = [];
  let tags = [];
  let loadError = "";

  try {
    const [templateRows, profileRows, tagRows] = await Promise.all([
      loadQuizTemplatesFromSupabase(sb),
      loadNonAdminProfilesFromSupabase(sb),
      loadAvailableTagsFromSupabase(sb)
    ]);

    templates = templateRows;
    profiles = profileRows;
    tags = tagRows;
  } catch (error) {
    loadError = error?.message || "Could not load admin data.";
  }

  const starterQuestions = [
    createBuilderQuestionDraft("singleSelect")
  ];

return `
  <div data-dashboard-feedback class="dashboardFeedback"></div>

    <section class="dashboardPanel" aria-label="Admin quiz builder">
      <div class="dashboardHeading">
        <div class="dashboardEyebrow">Admin tools</div>
        <h3>Quiz Template Builder</h3>
      </div>

      <div
        class="adminQuizBuilder"
        data-admin-quiz-builder
        data-editing-template-id=""
      >
        <div class="adminQuizModeRow">
          <div>
            <div class="adminQuizModeEyebrow" data-builder-mode-label>Create mode</div>
            <div class="adminQuizModeTitle" data-builder-mode-title>New template</div>
          </div>
          <button type="button" class="btn btnGhost" data-builder-reset-form hidden>
            Cancel edit
          </button>
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Title</label>
            <input type="text" data-builder-root-field="title" placeholder="Core Values Calibration" />
          </div>

          <div class="adminQuizField">
            <label>CTA label</label>
            <input type="text" data-builder-root-field="ctaLabel" value="Save" />
          </div>
        </div>

        <div class="adminQuizField">
          <label>Prompt</label>
          <input type="text" data-builder-root-field="prompt" placeholder="Help the system refine compatibility filtering." />
        </div>

        <div class="adminQuizField">
          <label>Description</label>
          <textarea rows="3" data-builder-root-field="description" placeholder="Optional longer admin-entered description"></textarea>
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Priority</label>
            <input type="number" data-builder-root-field="priority" value="100" />
          </div>

          <div class="adminQuizField">
            <label>Category</label>
            <input type="text" data-builder-root-field="category" placeholder="calibration" />
          </div>

          <div class="adminQuizField">
            <label>Status</label>
            <select data-builder-root-field="status">
              <option value="active" selected>active</option>
              <option value="locked">locked</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div class="adminQuizField">
            <label>Save mode</label>
            <select data-builder-root-field="saveMode">
              <option value="single" selected>single</option>
            </select>
          </div>
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Impact weight</label>
            <select data-builder-root-field="impactWeight">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div class="adminQuizField">
            <label>Stage label</label>
            <input
              type="text"
              data-builder-root-field="stageLabel"
              placeholder="Signals integrated into compatibility modelling"
            />
          </div>

          <div class="adminQuizField adminQuizAdvancedToggleField">
            <label>Advanced</label>
            <button type="button" class="btn btnGhost" data-builder-toggle-advanced>
              Show overrides
            </button>
          </div>
        </div>

        <div class="adminQuizFieldRow" data-builder-advanced-fields hidden>
          <div class="adminQuizField">
            <label>Custom confidence increase</label>
            <input
              type="number"
              step="0.1"
              data-builder-root-field="confidenceIncrease"
              value="0"
            />
          </div>

          <div class="adminQuizField">
            <label>Custom candidate reduction</label>
            <input
              type="number"
              data-builder-root-field="candidateReduction"
              value="0"
            />
          </div>
        </div>

        <div class="adminQuizFieldRow">
          <div class="adminQuizField">
            <label>Assign to</label>
            <select data-builder-root-field="assignmentMode">
              <option value="all_users" selected>All users</option>
              <option value="specific_users">Specific users</option>
              <option value="tag">Tag</option>
            </select>
          </div>

          <div class="adminQuizField" data-builder-target-tag-wrap hidden>
            <label>Tag</label>
            <input
              type="text"
              list="adminQuizTagList"
              data-builder-root-field="targetTag"
              placeholder="cohort_a"
            />
            <datalist id="adminQuizTagList">
              ${tags.map(tag => `<option value="${escapeAttr(tag)}"></option>`).join("")}
            </datalist>
          </div>
        </div>

        <div class="adminQuizField" data-builder-user-picker-wrap hidden>
          <label>Selected users</label>
          <div class="adminQuizUserPicker" data-builder-user-picker>
            ${profiles.map(profile => `
              <button
                type="button"
                class="adminQuizUserChip"
                data-builder-user-chip="${escapeAttr(profile.id)}"
              >
                ${escapeHtml(profile.display_name)}
              </button>
            `).join("")}
          </div>
          <input type="hidden" data-builder-root-field="targetUserIds" value="" />
        </div>

        <div class="adminQuizQuestionList" data-builder-question-list>
          ${starterQuestions.map((question, index) => renderAdminQuestionBuilder(question, index, escapeHtml)).join("")}
        </div>

        <div class="adminQuizActions">
          <button type="button" class="btn btnGhost" data-builder-add-question>Add question</button>
          <button type="button" class="btn" data-builder-save-template>Save template</button>
        </div>

        <div class="adminQuizFeedback" data-builder-feedback></div>
      </div>
    </section>

    <section class="dashboardPanel" aria-label="Saved templates">
      <div class="dashboardHeading">
        <div class="dashboardEyebrow">Saved templates</div>
        <h3>Existing Quiz Templates</h3>
      </div>

      ${loadError
        ? `<div class="adminQuizError">${escapeHtml(loadError)}</div>`
        : renderSavedTemplateList(templates, profiles, escapeHtml)
      }
    </section>
    ${!loadError && window.manifestUI
  ? await window.manifestUI.renderAdminManifestManager({ sb, profiles, escapeHtml, escapeAttr })
  : ""}
  `;
}

async function buildWelcomeMarkup({
  sb,
  me,
  escapeHtml,
  adminPreview = false,
  adminHome = false,
  runtimeAssignments = []
}) {
  if (adminHome && me?.is_admin && !adminPreview) {
    return renderAdminDashboardHome({ sb, me, escapeHtml });
  }

  const messageCount = await getDailyMessageCount(sb, me);
  const sample = getSampleStrength(messageCount);
  const dash = getDashboardState(me, messageCount, runtimeAssignments);

return `
  <div data-dashboard-feedback class="dashboardFeedback"></div>

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
        <div class="dashValue" data-metric="candidatePool">
          ${formatCandidateCount(dash.remainingCandidates)}
        </div>
        <div class="dashMeta">remaining from ${formatCandidateCount(DEFAULT_CANDIDATE_POOL)} candidates</div>
        <div class="dashNote">${escapeHtml(dash.stage)}</div>
      </article>

      <article class="dashCard">
        <div class="dashLabel">Compatibility Confidence</div>
        <div class="dashValue" data-metric="confidence">
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

${await renderAssignments(me, runtimeAssignments, escapeHtml, { adminPreview, sb })}

${window.manifestUI
  ? await window.manifestUI.renderManifestPanel({ sb, me, escapeHtml, escapeAttr })
  : ""}
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
   submitBtn.disabled = !canAdvanceQuestion(currentQuestion, answers[currentQuestion.id]);
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
        valueEl.textContent = getSliderDisplayLabel(question, Number(inputEl.value));

        inputEl.addEventListener("input", () => {
          const value = Number(inputEl.value);
          const interpretedLabel = getSliderDisplayLabel(question, value);

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

        if (question.type === "fileUpload") {
      const inputEl = cardEl.querySelector(`[data-file-input="${question.id}"]`);
      const metaEl = cardEl.querySelector(`[data-file-meta="${question.id}"]`);
      const skipBtn = cardEl.querySelector(`[data-file-skip="${question.id}"]`);

      if (inputEl) {
        inputEl.addEventListener("change", async () => {
          const file = inputEl.files?.[0];
          if (!file) {
            delete answers[question.id];
            syncSubmitState();
            return;
          }

          const maxBytes = getFileUploadMaxBytes(question);
          const accept = getFileUploadAcceptString(question);

          if (file.size > maxBytes) {
            alert("Files must be 10 MB or smaller.");
            inputEl.value = "";
            return;
          }

          if (!isAcceptedUploadType(file, accept)) {
            alert("Only images and PDFs are allowed.");
            inputEl.value = "";
            return;
          }

          try {
            submitBtn.disabled = true;
            if (metaEl) metaEl.textContent = "Uploading...";

            const uploaded = await uploadQuizFile({
              sb,
              me,
              assignment,
              question,
              file
            });

            const nextAnswer = {
              status: "uploaded",
              skipped: false,
              ...uploaded
            };

            if (file.type.startsWith("image/")) {
              nextAnswer.previewUrl = URL.createObjectURL(file);
            }

            answers[question.id] = nextAnswer;

            if (metaEl) {
              metaEl.textContent = `Uploaded: ${file.name}`;
            }
          } catch (error) {
            console.error("quiz file upload failed", error);
            alert(error?.message || "Upload failed.");
            inputEl.value = "";
            delete answers[question.id];
            if (metaEl) metaEl.textContent = "No file selected";
          }

          syncSubmitState();
        });
      }

      if (skipBtn) {
        skipBtn.addEventListener("click", () => {
          const existing = answers[question.id];
          if (existing?.previewUrl) {
            try {
              URL.revokeObjectURL(existing.previewUrl);
            } catch (_) {}
          }

          if (inputEl) inputEl.value = "";

          answers[question.id] = {
            status: "skipped",
            skipped: true
          };

          if (metaEl) {
            metaEl.textContent = "Skipped";
          }

          syncSubmitState();
        });
      }
    }
  });

  syncSubmitState();

  submitBtn.addEventListener("click", async () => {
   if (!canAdvanceQuestion(currentQuestion, answers[currentQuestion.id])) return;

    await playAssignmentAdvanceTransition(cardEl);

    if (!isFinalStep) {
      const nextStep = currentStep + 1;
await saveAssignmentProgress(sb, me, assignment, {
  answers,
  currentStep: nextStep
});

      await refreshWelcomeDashboard({
        mainEl,
        messagesEl,
        sb,
        me,
        escapeHtml,
        animateMetrics: true,
        adminPreview: false,
        adminHome: false
      });

      return;
    }

await saveAssignmentResponse(sb, me, assignment, {
  assignmentId: assignment.id,
  componentType: assignment.type,
  answers
});

    await clearAssignmentProgress(sb, me, assignment.id);

    await refreshWelcomeDashboard({
      mainEl,
      messagesEl,
      sb,
      me,
      escapeHtml,
      animateMetrics: true,
      adminPreview: false,
      adminHome: false
    });
  });
}

function initAdminQuizBuilderInteractions({ mainEl, messagesEl, sb, me, escapeHtml }) {
  const builderEl = messagesEl.querySelector("[data-admin-quiz-builder]");
  if (!builderEl) return;

  let questionDrafts = Array.from(
    builderEl.querySelectorAll("[data-builder-question-card]")
  ).map(cardEl => {
    const questionId = cardEl.dataset.builderQuestionCard;
    const type = cardEl.querySelector(`[data-builder-field="type"]`)?.value || "singleSelect";

    return {
      ...createBuilderQuestionDraft(type),
      id: questionId,
      type,
      optionsText: getDefaultOptionsTextForType(type)
    };
  });

  let editingTemplateId = "";
  let selectedUserIds = [];

  const questionListEl = builderEl.querySelector("[data-builder-question-list]");
  const feedbackEl = builderEl.querySelector("[data-builder-feedback]");
  const saveBtn = builderEl.querySelector("[data-builder-save-template]");
  const resetBtn = builderEl.querySelector("[data-builder-reset-form]");
  const modeLabelEl = builderEl.querySelector("[data-builder-mode-label]");
  const modeTitleEl = builderEl.querySelector("[data-builder-mode-title]");

  function setFeedback(message, kind = "error") {
    if (!feedbackEl) return;
    feedbackEl.textContent = message || "";
    feedbackEl.dataset.kind = kind;
  }

  function getDraftById(questionId) {
    return questionDrafts.find(item => item.id === questionId);
  }

  function getRootField(name) {
    return builderEl.querySelector(`[data-builder-root-field="${name}"]`);
  }

  function syncSelectedUserIdsField() {
    const field = getRootField("targetUserIds");
    if (field) {
      field.value = selectedUserIds.join(",");
    }
  }

  function renderSelectedUserChips() {
    builderEl
      .querySelectorAll("[data-builder-user-chip]")
      .forEach(chip => {
        chip.classList.toggle(
          "isSelected",
          selectedUserIds.includes(chip.dataset.builderUserChip)
        );
      });

    syncSelectedUserIdsField();
  }

  function updateAssignmentTargetVisibility() {
    const mode = getRootField("assignmentMode")?.value || "all_users";
    const tagWrap = builderEl.querySelector("[data-builder-target-tag-wrap]");
    const userWrap = builderEl.querySelector("[data-builder-user-picker-wrap]");

    if (tagWrap) tagWrap.hidden = mode !== "tag";
    if (userWrap) userWrap.hidden = mode !== "specific_users";
  }

  function updateBuilderModeUI() {
    const isEditing = !!editingTemplateId;

    builderEl.dataset.editingTemplateId = editingTemplateId || "";
    if (saveBtn) saveBtn.textContent = isEditing ? "Update template" : "Save template";
    if (resetBtn) resetBtn.hidden = !isEditing;
    if (modeLabelEl) modeLabelEl.textContent = isEditing ? "Edit mode" : "Create mode";
    if (modeTitleEl) modeTitleEl.textContent = isEditing ? "Editing template" : "New template";
  }

  function resetBuilderForm() {
    editingTemplateId = "";
    selectedUserIds = [];

    getRootField("title").value = "";
    getRootField("ctaLabel").value = "Save";
    getRootField("prompt").value = "";
    getRootField("description").value = "";
    getRootField("priority").value = 100;
    getRootField("category").value = "";
    getRootField("status").value = "active";
    getRootField("saveMode").value = "single";
    getRootField("impactWeight").value = "medium";
    getRootField("confidenceIncrease").value = 0;
    getRootField("candidateReduction").value = 0;
    getRootField("stageLabel").value = "";
    getRootField("assignmentMode").value = "all_users";
    getRootField("targetTag").value = "";

    const advancedFieldsEl = builderEl.querySelector("[data-builder-advanced-fields]");
if (advancedFieldsEl) advancedFieldsEl.hidden = true;

const advancedToggleBtn = builderEl.querySelector("[data-builder-toggle-advanced]");
if (advancedToggleBtn) advancedToggleBtn.textContent = "Show overrides";

    questionDrafts = [createBuilderQuestionDraft("singleSelect")];

    rerenderQuestionList();
    renderSelectedUserChips();
    updateAssignmentTargetVisibility();
    updateBuilderModeUI();
    setFeedback("", "success");
  }

  function populateBuilderFromTemplate(template, { duplicate = false } = {}) {
    const assignmentState = getAssignmentEditorStateFromTemplate(template);

    editingTemplateId = duplicate ? "" : template.id;
    selectedUserIds = [...assignmentState.targetUserIds];

    getRootField("title").value = duplicate
      ? `${template.title || "Untitled"} (Copy)`
      : (template.title || "");
    getRootField("ctaLabel").value = template.cta_label || "Save";
    getRootField("prompt").value = template.prompt || "";
    getRootField("description").value = template.description || "";
    getRootField("priority").value = template.priority ?? 100;
    getRootField("category").value = template.category || "";
    getRootField("status").value = template.status || "active";
    getRootField("saveMode").value = template.save_mode || "single";
    getRootField("impactWeight").value = template.impact_weight || "medium";
    getRootField("confidenceIncrease").value = template.confidence_increase ?? 0;
    getRootField("candidateReduction").value = template.candidate_reduction ?? 0;
    getRootField("stageLabel").value = template.stage_label || "";
    getRootField("assignmentMode").value = assignmentState.mode || "all_users";
    getRootField("targetTag").value = assignmentState.targetTag || "";

    questionDrafts = Array.isArray(template.questions_json) && template.questions_json.length
      ? template.questions_json.map(hydrateBuilderDraftFromQuestion)
      : [createBuilderQuestionDraft("singleSelect")];

    rerenderQuestionList();
    renderSelectedUserChips();
    updateAssignmentTargetVisibility();
    updateBuilderModeUI();
    setFeedback(
      duplicate ? "Template duplicated into builder." : "Template loaded for editing.",
      "success"
    );

        const hasOverrides =
      Number(template.confidence_increase ?? 0) > 0 ||
      Number(template.candidate_reduction ?? 0) > 0;

    const advancedFieldsEl = builderEl.querySelector("[data-builder-advanced-fields]");
    const advancedToggleBtn = builderEl.querySelector("[data-builder-toggle-advanced]");

    if (advancedFieldsEl) advancedFieldsEl.hidden = !hasOverrides;
    if (advancedToggleBtn) {
      advancedToggleBtn.textContent = hasOverrides ? "Hide overrides" : "Show overrides";
    }
  }

  function rerenderQuestionList() {
    questionListEl.innerHTML = questionDrafts
      .map((question, index) => renderAdminQuestionBuilder(question, index, escapeHtml))
      .join("");

    bindQuestionFields();
  }

  function bindQuestionFields() {
    questionListEl
      .querySelectorAll("[data-builder-field]")
      .forEach(input => {
        input.addEventListener("input", handleQuestionFieldChange);
        input.addEventListener("change", handleQuestionFieldChange);
      });

    questionListEl
      .querySelectorAll("[data-builder-remove-question]")
      .forEach(btn => {
        btn.addEventListener("click", () => {
          const questionId = btn.dataset.builderRemoveQuestion;
          questionDrafts = questionDrafts.filter(item => item.id !== questionId);

          if (!questionDrafts.length) {
            questionDrafts = [createBuilderQuestionDraft("singleSelect")];
          }

          rerenderQuestionList();
        });
      });

questionListEl
  .querySelectorAll("[data-builder-image-choice-field]")
  .forEach(input => {
    input.addEventListener("input", event => {
      const inputEl = event.target;
      const questionId = inputEl.dataset.builderQuestionId;
      const optionIndex = Number(inputEl.dataset.builderOptionIndex);
      const field = inputEl.dataset.builderImageChoiceField;
      const draft = getDraftById(questionId);

      if (!draft || !Array.isArray(draft.imageChoiceOptions)) return;
      if (!draft.imageChoiceOptions[optionIndex]) return;

      draft.imageChoiceOptions[optionIndex][field] = inputEl.value;

      draft.optionsText = draft.imageChoiceOptions
        .map(option => option.label || "")
        .join("\n");

      draft.optionsImagesText = draft.imageChoiceOptions
        .map(option => option.imageUrl || "")
        .join("\n");

      const rowEl = inputEl.closest(".adminQuizImageChoiceRow");
      if (!rowEl) return;

      if (field === "imageUrl") {
        const previewWrap = rowEl.querySelector(".adminQuizImageChoicePreviewWrap");
        const label = draft.imageChoiceOptions[optionIndex].label || "";

        if (previewWrap) {
          previewWrap.innerHTML = inputEl.value
            ? `<img
                class="adminQuizImageChoicePreview"
                src="${escapeAttr(inputEl.value)}"
                alt="${escapeAttr(label)}"
              />`
            : `<div class="adminQuizImageChoicePreview adminQuizImageChoicePreviewPlaceholder">No image</div>`;
        }
      }

      if (field === "label") {
        const previewImg = rowEl.querySelector(".adminQuizImageChoicePreview");
        if (previewImg) {
          previewImg.alt = inputEl.value || "";
        }
      }

      const validationError = validateBuilderDraft(draft);
      if (validationError) {
        setFeedback(validationError, "error");
      } else {
        setFeedback("", "success");
      }
    });
  });

  questionListEl
  .querySelectorAll("[data-builder-add-image-choice-option]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const questionId = btn.dataset.builderAddImageChoiceOption;
      const draft = getDraftById(questionId);
      if (!draft) return;

      if (!Array.isArray(draft.imageChoiceOptions)) {
        draft.imageChoiceOptions = [];
      }

      if (draft.imageChoiceOptions.length >= ADMIN_BUILDER_MAX_OPTIONS) return;

      draft.imageChoiceOptions.push({
        label: `Option ${draft.imageChoiceOptions.length + 1}`,
        imageUrl: ""
      });

      draft.optionsText = draft.imageChoiceOptions.map(option => option.label || "").join("\n");
      draft.optionsImagesText = draft.imageChoiceOptions.map(option => option.imageUrl || "").join("\n");

      rerenderQuestionList();
    });
  });

questionListEl
  .querySelectorAll("[data-builder-remove-image-choice-option]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const questionId = btn.dataset.builderRemoveImageChoiceOption;
      const optionIndex = Number(btn.dataset.builderOptionIndex);
      const draft = getDraftById(questionId);
      if (!draft || !Array.isArray(draft.imageChoiceOptions)) return;

      draft.imageChoiceOptions.splice(optionIndex, 1);

      if (draft.imageChoiceOptions.length < ADMIN_BUILDER_MIN_OPTIONS) {
        draft.imageChoiceOptions.push({ label: "", imageUrl: "" });
      }

      draft.optionsText = draft.imageChoiceOptions.map(option => option.label || "").join("\n");
      draft.optionsImagesText = draft.imageChoiceOptions.map(option => option.imageUrl || "").join("\n");

      rerenderQuestionList();
    });
  });
  }

  function handleQuestionFieldChange(event) {
    const field = event.target.dataset.builderField;
    const questionId = event.target.dataset.builderQuestionId;
    const draft = getDraftById(questionId);
    if (!draft) return;

    draft[field] = event.target.value;

if (field === "type") {
  draft.optionsText = getDefaultOptionsTextForType(draft.type);

  if (draft.type === "multiSelect") {
    draft.minSelections = 1;
    draft.maxSelections = 2;
  }

  if (draft.type === "imageChoice") {
    draft.imageChoiceOptions = [
      { label: "Option 1", imageUrl: "" },
      { label: "Option 2", imageUrl: "" }
    ];
    draft.optionsText = draft.imageChoiceOptions.map(option => option.label).join("\n");
    draft.optionsImagesText = draft.imageChoiceOptions.map(option => option.imageUrl).join("\n");
  }

  rerenderQuestionList();
  return;
}

    const validationError = validateBuilderDraft(draft);
    if (validationError) {
      setFeedback(validationError, "error");
    } else {
      setFeedback("", "success");
    }


  }

  function bindUserChipActions() {
    builderEl
      .querySelectorAll("[data-builder-user-chip]")
      .forEach(chip => {
        chip.addEventListener("click", () => {
          const userId = chip.dataset.builderUserChip;
          if (!userId) return;

          if (selectedUserIds.includes(userId)) {
            selectedUserIds = selectedUserIds.filter(id => id !== userId);
          } else {
            selectedUserIds = [...selectedUserIds, userId];
          }

          renderSelectedUserChips();
        });
      });
  }

  function bindTemplateRowActions() {
    messagesEl
      .querySelectorAll("[data-edit-template]")
      .forEach(btn => {
        btn.addEventListener("click", async () => {
          const templateId = btn.dataset.editTemplate;
          if (!templateId) return;

          try {
            const template = await loadQuizTemplateDetailFromSupabase(sb, templateId);
            if (!template) {
              setFeedback("Template could not be found.", "error");
              return;
            }

            populateBuilderFromTemplate(template, { duplicate: false });
            builderEl.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (error) {
            setFeedback(error?.message || "Could not load template.", "error");
          }
        });
      });

    messagesEl
      .querySelectorAll("[data-duplicate-template]")
      .forEach(btn => {
        btn.addEventListener("click", async () => {
          const templateId = btn.dataset.duplicateTemplate;
          if (!templateId) return;

          try {
            const template = await loadQuizTemplateDetailFromSupabase(sb, templateId);
            if (!template) {
              setFeedback("Template could not be found.", "error");
              return;
            }

            populateBuilderFromTemplate(template, { duplicate: true });
            builderEl.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (error) {
            setFeedback(error?.message || "Could not duplicate template.", "error");
          }
        });
      });

    messagesEl
      .querySelectorAll("[data-delete-template]")
      .forEach(btn => {
        btn.addEventListener("click", async () => {
          const templateId = btn.dataset.deleteTemplate;
          if (!templateId) return;

          const confirmed = window.confirm("Delete this template? This will also remove its assignments.");
          if (!confirmed) return;

          try {
            await deleteQuizTemplateFromSupabase(sb, templateId);

            if (editingTemplateId === templateId) {
              editingTemplateId = "";
            }

            await mountWelcomeDashboard({
              messagesEl,
              mainEl,
              sb,
              me,
              escapeHtml,
              animateMetrics: false,
              adminPreview: false,
              adminHome: true
            });
          } catch (error) {
            setFeedback(error?.message || "Could not delete template.", "error");
          }
        });
      });
  }

    builderEl
    .querySelector("[data-builder-toggle-advanced]")
    ?.addEventListener("click", () => {
      const advancedFieldsEl = builderEl.querySelector("[data-builder-advanced-fields]");
      const toggleBtn = builderEl.querySelector("[data-builder-toggle-advanced]");
      if (!advancedFieldsEl || !toggleBtn) return;

      advancedFieldsEl.hidden = !advancedFieldsEl.hidden;
      toggleBtn.textContent = advancedFieldsEl.hidden ? "Show overrides" : "Hide overrides";
    });

  bindQuestionFields();
  bindUserChipActions();
  bindTemplateRowActions();
  renderSelectedUserChips();
  updateAssignmentTargetVisibility();
  updateBuilderModeUI();

  getRootField("assignmentMode")
    ?.addEventListener("change", updateAssignmentTargetVisibility);

  resetBtn?.addEventListener("click", () => {
    resetBuilderForm();
  });

  builderEl
    .querySelector("[data-builder-add-question]")
    ?.addEventListener("click", () => {
      questionDrafts.push(createBuilderQuestionDraft("singleSelect"));
      rerenderQuestionList();
    });

  builderEl
    .querySelector("[data-builder-save-template]")
    ?.addEventListener("click", async () => {
      setFeedback("");

      const assignmentMode = getRootField("assignmentMode")?.value || "all_users";
      const targetTag = getRootField("targetTag")?.value?.trim() || "";

      const root = {
        title: getRootField("title")?.value?.trim() || "",
        prompt: getRootField("prompt")?.value?.trim() || "",
        description: getRootField("description")?.value?.trim() || "",
        ctaLabel: getRootField("ctaLabel")?.value?.trim() || "Save",
        priority: getRootField("priority")?.value || 100,
        category: getRootField("category")?.value?.trim() || "",
        status: getRootField("status")?.value || "active",
        saveMode: getRootField("saveMode")?.value || "single",
        impactWeight: getRootField("impactWeight")?.value || "medium",
        confidenceIncrease: getRootField("confidenceIncrease")?.value || 0,
        candidateReduction: getRootField("candidateReduction")?.value || 0,
        stageLabel: getRootField("stageLabel")?.value?.trim() || "",
        assignment: {
          mode: assignmentMode,
          targetUserIds: [...selectedUserIds],
          targetTag
        }
      };

      if (assignmentMode === "specific_users" && !selectedUserIds.length) {
        setFeedback("Select at least one user.", "error");
        return;
      }

      if (assignmentMode === "tag" && !targetTag) {
        setFeedback("Enter a tag for tag-based assignment.", "error");
        return;
      }

      for (const draft of questionDrafts) {
        const validationError = validateBuilderDraft(draft);
        if (validationError) {
          setFeedback(validationError, "error");
          return;
        }
      }

      const questions = questionDrafts.map(buildQuestionFromDraft);

      const payload = {
        ...root,
        questions
      };

      const payloadError = validateQuizTemplatePayload(payload);
      if (payloadError) {
        setFeedback(payloadError, "error");
        return;
      }

      try {
        if (editingTemplateId) {
          await updateQuizTemplateInSupabase(sb, me, editingTemplateId, payload);
          setFeedback("Quiz template updated.", "success");
        } else {
          await createQuizTemplateInSupabase(sb, me, payload);
          setFeedback("Quiz template saved.", "success");
        }

        await mountWelcomeDashboard({
          messagesEl,
          mainEl,
          sb,
          me,
          escapeHtml,
          animateMetrics: false,
          adminPreview: false,
          adminHome: true
        });
      } catch (error) {
        setFeedback(error?.message || "Could not save template.", "error");
      }
    });
}



function initDashboardInteractions({
  mainEl,
  messagesEl,
  sb,
  me,
  escapeHtml,
  adminPreview = false,
  adminHome = false,
  runtimeAssignments = []
}) {
if (adminHome && me?.is_admin && !adminPreview) {
  initAdminQuizBuilderInteractions({
    mainEl,
    messagesEl,
    sb,
    me,
    escapeHtml
  });

  if (window.manifestUI?.bindManifestManagerActions) {
    window.manifestUI.bindManifestManagerActions({
      messagesEl,
      mainEl,
      sb,
      me,
      escapeHtml,
      mountWelcomeDashboard,
      setFeedback
    });
  }

  return;
}

  if (window.manifestUI) {
  window.manifestUI.bindManifestManagerActions({
    messagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    mountWelcomeDashboard,
    setFeedback
  });
}

  runtimeAssignments.forEach(assignment => {
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
    return `${Number(value || 0).toFixed(2)}%`;
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
  adminPreview = false,
  adminHome = false
}) {
  const messageCount = await getDailyMessageCount(sb, me);

  let runtimeAssignments = [];
  if (!adminHome) {
    try {
      runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me, {
        includeLocked: !!adminPreview
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
  adminHome = false
}) {
  if (!mainEl.classList.contains("noChatSelected")) return;

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

window.dashboardUI = {
  buildWelcomeMarkup,
  initDashboardInteractions,
  mountWelcomeDashboard,
  refreshWelcomeDashboard,
  renderAdminDashboardHome,
  loadRuntimeAssignmentsFromSupabase,
  DASHBOARD_ASSIGNMENTS
};