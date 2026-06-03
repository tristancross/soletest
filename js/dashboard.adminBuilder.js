function formatOptionsForAdminTextarea(options = []) {
  return (options || [])
    .map(option => {
      const value = option.value || "";
      const label = option.label || value;

      if (value && value !== label) {
        return `${value} :: ${label}`;
      }

      return label;
    })
    .join("\n");
}

function parseOptionsFromAdminTextarea(text = "") {
  return String(text || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line.includes("::")) {
        const [rawValue, ...labelParts] = line.split("::");
        const value = rawValue.trim();
        const label = labelParts.join("::").trim();

        return {
          value,
          label: label || value
        };
      }

      const label = line.trim();
      const value = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      return { value, label };
    });
}

function formatScoringForAdminTextarea(scoring) {
  if (!scoring) return "";

  try {
    return JSON.stringify(scoring, null, 2);
  } catch (_) {
    return "";
  }
}

function parseAdminScoringJson(text = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    throw new Error("Invalid scoring JSON.");
  }
}

function renderAdminQuestionBuilder(question, index, escapeHtml) {
const typeOptions = [
  ["singleSelect", "Single select"],
  ["multiSelect", "Multi-select"],
  ["slider", "Slider"],
  ["scale7", "Agree Scale"],
  ["ranking", "Ranking"],
  ["freeText", "Free text"],
  ["imageChoice", "Image choice"],
  ["swipeDeck", "Swipe deck"],
  ["fileUpload", "File upload"]
];
const isOptionBased = ["singleSelect", "multiSelect", "ranking"].includes(question.type);
const isMultiSelect = question.type === "multiSelect";
const isSlider = question.type === "slider";
const isScale7 = question.type === "scale7";
const isFreeText = question.type === "freeText";
  const isImageChoice = question.type === "imageChoice";
  const isSwipeDeck = question.type === "swipeDeck";

  return `
    <div class="adminQuizQuestionCard" data-builder-question-card="${escapeAttr(question.id)}">
      <div class="adminQuizQuestionTop">
<div class="adminQuizQuestionTitle">Question ${index + 1}</div>

<div class="adminQuizQuestionActions">
  <button
    type="button"
    class="btn btnGhost"
    data-builder-move-question="up"
    data-builder-question-id="${escapeAttr(question.id)}"
    ${index === 0 ? "disabled" : ""}
  >
    ↑
  </button>

  <button
    type="button"
    class="btn btnGhost"
    data-builder-move-question="down"
    data-builder-question-id="${escapeAttr(question.id)}"
  >
   ↓
  </button>

  <button
    type="button"
    class="btn btnGhost"
    data-builder-remove-question="${escapeAttr(question.id)}"
  >
    Remove
  </button>
</div>
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
        >${escapeHtml(
  question.optionsText ||
  formatOptionsForAdminTextarea(question.config?.options || question.options || [])
)}</textarea>
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

      ${isScale7 ? `
  <div class="adminQuizFieldRow">
    <div class="adminQuizField">
      <label>Left label</label>
      <input
        type="text"
        value="${escapeAttr(question.scale7MinLabel || "Disagree")}"
        data-builder-field="scale7MinLabel"
        data-builder-question-id="${escapeAttr(question.id)}"
      />
    </div>

    <div class="adminQuizField">
      <label>Centre label</label>
      <input
        type="text"
        value="${escapeAttr(question.scale7MidLabel || "Neutral")}"
        data-builder-field="scale7MidLabel"
        data-builder-question-id="${escapeAttr(question.id)}"
      />
    </div>

    <div class="adminQuizField">
      <label>Right label</label>
      <input
        type="text"
        value="${escapeAttr(question.scale7MaxLabel || "Agree")}"
        data-builder-field="scale7MaxLabel"
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
              max="4000"
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

${isSwipeDeck ? `
  <div class="adminQuizImageChoiceRows">
    ${(question.swipeDeckCards || []).map((card, cardIndex) => `
      <div class="adminQuizImageChoiceRow">
        <div class="adminQuizImageChoicePreviewWrap">
          ${
            card.imageUrl
              ? `<img class="adminQuizImageChoicePreview" src="${escapeAttr(card.imageUrl)}" alt="${escapeAttr(card.label || "")}" />`
              : `<div class="adminQuizImageChoicePreview adminQuizImageChoicePreviewPlaceholder">No image</div>`
          }
        </div>

        <div class="adminQuizImageChoiceInputs">
          <div class="adminQuizField">
            <label>Label</label>
            <input
              type="text"
              value="${escapeAttr(card.label || "")}"
              data-builder-swipe-field="label"
              data-builder-question-id="${escapeAttr(question.id)}"
              data-builder-card-index="${cardIndex}"
            />
          </div>

          <div class="adminQuizField">
            <label>Image URL</label>
            <input
              type="text"
              value="${escapeAttr(card.imageUrl || "")}"
              data-builder-swipe-field="imageUrl"
              data-builder-question-id="${escapeAttr(question.id)}"
              data-builder-card-index="${cardIndex}"
            />
          </div>
        </div>

        <button
          type="button"
          class="btn btnGhost"
          data-builder-remove-swipe-card="${escapeAttr(question.id)}"
          data-builder-card-index="${cardIndex}"
        >
          Remove
        </button>
      </div>
    `).join("")}
  </div>

  <div class="adminQuizActionsInline">
    <button type="button" class="btn btnGhost" data-builder-add-swipe-card="${escapeAttr(question.id)}">
      Add image
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

      <div class="adminQuizField">
  <label>Scoring JSON</label>
  <textarea
    rows="4"
    data-builder-field="scoringText"
    data-builder-question-id="${escapeAttr(question.id)}"
    placeholder='[{"key":"connection_attachment_sensitivity","weight":1}]'
>${escapeHtml(
  question.scoringText ||
  formatScoringForAdminTextarea(question.scoring || question.config?.scoring)
)}</textarea>
  <p class="muted">
    Optional. Each rule should include an axis key and a weight.
  </p>
</div>
    </div>
  `;
}

function renderSavedTemplateList(templates, profiles, escapeHtml) {
  if (!templates.length) {
    return `<div class="adminQuizEmpty">No saved templates yet.</div>`;
  }

  const profilesById = Object.fromEntries(
    (profiles || []).map(profile => [profile.id, profile])
  );

  const renderTemplateCard = template => `
<article
  class="adminQuizTemplateRow"
  draggable="true"
  data-template-drag-id="${escapeAttr(template.id)}"
>
      <div class="adminQuizTemplateMeta">
        <div class="adminQuizTemplateTitle">${escapeHtml(String(template.title ?? ""))}</div>
        <div class="adminQuizTemplateSub">
                   status ${escapeHtml(template.status || "active")} · priority ${escapeHtml(String(template.priority ?? ""))}

        </div>
        <div class="adminQuizTemplateSub">
          target ${escapeHtml(formatAssignmentTargetLabel(template, profilesById))}
        </div>

        <select data-template-day-select="${escapeAttr(template.id)}">
  <option value="1" ${Number(template.day_index || 1) === 1 ? "selected" : ""}>Day 1</option>
  <option value="2" ${Number(template.day_index || 1) === 2 ? "selected" : ""}>Day 2</option>
  <option value="3" ${Number(template.day_index || 1) === 3 ? "selected" : ""}>Day 3</option>
  <option value="4" ${Number(template.day_index || 1) === 4 ? "selected" : ""}>Day 4</option>
  <option value="5" ${Number(template.day_index || 1) === 5 ? "selected" : ""}>Day 5</option>
</select>

        <select data-template-status-select="${escapeAttr(template.id)}">
          <option value="active" ${template.status === "active" ? "selected" : ""}>Active</option>
          <option value="draft" ${template.status === "draft" ? "selected" : ""}>Draft</option>
          <option value="archived" ${template.status === "archived" ? "selected" : ""}>Archived</option>
        </select>
      </div>

      <div class="adminQuizTemplateActions">
      <button
  type="button"
  class="btn btnGhost"
  data-template-overrides="${escapeAttr(template.id)}"
>
  User overrides
</button>
        <button type="button" class="btn btnGhost" data-duplicate-template="${escapeAttr(template.id)}">Duplicate</button>
        <button type="button" class="btn btnGhost" data-edit-template="${escapeAttr(template.id)}">Edit</button>
        <button type="button" class="btn btnGhost adminQuizDeleteBtn" data-delete-template="${escapeAttr(template.id)}">Delete</button>
      </div>
    </article>
  `;

  return `
    <div class="adminTemplateSchedule">
      ${[1, 2, 3, 4, 5].map(day => {
        const dayTemplates = templates.filter(t => Number(t.day_index || 1) === day);
        const chemistry = dayTemplates.filter(t => t.category === "chemistry");
        const attraction = dayTemplates.filter(t => t.category === "attraction");

        return `
          <section class="adminTemplateDay">
           <div class="adminTemplateDayHeader">
  <h4>Day ${day}</h4>

  <div class="adminTemplateDayOverride">
    <span>Set day to</span>

    <select data-template-day-status-override="${day}">
      <option value="">No override</option>
      <option value="active">Active</option>
      <option value="draft">Draft</option>
      <option value="archived">Archived</option>
    </select>
  </div>
</div>

            <div class="adminTemplateDayGrid">
            <div
  class="adminTemplateDropZone"
  data-template-drop-day="${day}"
  data-template-drop-category="chemistry"
>
  <h5>Chemistry</h5>
                ${chemistry.length ? chemistry.map(renderTemplateCard).join("") : `<p class="muted">No chemistry templates.</p>`}
              </div>

<div
  class="adminTemplateDropZone"
  data-template-drop-day="${day}"
  data-template-drop-category="attraction"
>
  <h5>Attraction</h5>
                ${attraction.length ? attraction.map(renderTemplateCard).join("") : `<p class="muted">No attraction templates.</p>`}
              </div>
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

async function updateQuizTemplateScheduleInSupabase(sb, templateId, dayIndex, category) {
  const { error } = await sb
    .from("quiz_templates")
    .update({
      day_index: Number(dayIndex) || 1,
      category,
      updated_at: new Date().toISOString()
    })
    .eq("id", templateId);

  if (error) throw error;
}

async function updateQuizTemplateDayInSupabase(sb, templateId, dayIndex) {
  const { error } = await sb
    .from("quiz_templates")
    .update({
      day_index: Number(dayIndex) || 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", templateId);

  if (error) throw error;
}

async function updateQuizTemplateDayStatusInSupabase(sb, dayIndex, status) {
  const { error } = await sb
    .from("quiz_templates")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("day_index", Number(dayIndex) || 1);

  if (error) throw error;
}

async function updateQuizTemplateStatusInSupabase(sb, templateId, status) {
  const { error } = await sb
    .from("quiz_templates")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", templateId);

  if (error) throw error;
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
  <div>
    <div class="dashboardEyebrow">Admin tools</div>
    <h3>Quiz Template Builder</h3>
  </div>

  <button type="button" class="btn" data-builder-create-new>
    Create new
  </button>
</div>

<div
  class="adminQuizBuilder"
  data-admin-quiz-builder
  data-editing-template-id=""
  hidden
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
  <label>Module</label>
  <select data-builder-root-field="category">
    <option value="chemistry">Connection Calibration</option>
    <option value="attraction">Attraction Mapping</option>
  </select>

  <label>
  <span>Day</span>
  <select data-builder-root-field="dayIndex">
    <option value="1">Day 1</option>
    <option value="2">Day 2</option>
    <option value="3">Day 3</option>
    <option value="4">Day 4</option>
    <option value="5">Day 5</option>
  </select>
</label>
</div>

          <div class="adminQuizField">
            <label>Status</label>
            <select data-builder-root-field="status">
              <option value="active" selected>active</option>
              <option value="draft">draft</option>
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
  <label>Result matrix</label>
  <select data-builder-root-field="matrixId">
    <option value="attraction_aesthetics">Attraction / Aesthetics</option>
    <option value="attraction_chemistry">Attraction / Chemistry</option>
    <option value="attraction_romance">Attraction / Romance</option>
    <option value="connection_values">Connection / Values</option>
    <option value="connection_attachment">Connection / Attachment</option>
    <option value="connection_interpersonal">Connection / Interpersonal</option>
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
  </div>


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

  if (question.type === "swipeDeck") {
  const cards = question.config?.cards || [];
  const decisions = answer?.decisions || [];
  return cards.length > 0 && decisions.length >= cards.length;
}

  return false;
}


function validateAssignmentAnswers(assignment, answers) {
  return assignment.questions.every(question =>
    validateQuestionAnswer(question, answers[question.id])
  );
}

function initAssignmentInteractions({
  assignment,
  mainEl,
  messagesEl,
  sb,
  me,
  escapeHtml,
  adminPreview = false,
  onRefresh = null
}) {
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

const progressPercent = assignment.questions.length
  ? Math.round(((currentStep + 1) / assignment.questions.length) * 100)
  : 0;

const isFinalStep = currentStep === assignment.questions.length - 1;

function updateRankingAnswerFromDom(questionId) {
  const list = messagesEl.querySelector(`[data-ranking-list="${questionId}"]`);
  if (!list) return;

  const orderedValues = [...list.querySelectorAll("[data-ranking-value]")]
    .map(row => row.dataset.rankingValue)
    .filter(Boolean);

  answers[questionId] = { orderedValues };

  list.querySelectorAll(".quizRankingItem").forEach((row, index) => {
    const indexEl = row.querySelector(".quizRankingIndex");
    if (indexEl) indexEl.textContent = String(index + 1);

    const upBtn = row.querySelector('[data-ranking-move="up"]');
    const downBtn = row.querySelector('[data-ranking-move="down"]');

    if (upBtn) upBtn.disabled = index === 0;
    if (downBtn) downBtn.disabled = index === list.children.length - 1;
  });

  updateSubmitState();
}

messagesEl.querySelectorAll(".quizRankingList").forEach(list => {
  let draggedRow = null;

  list.querySelectorAll(".quizRankingItem").forEach(row => {
    row.addEventListener("dragstart", event => {
      draggedRow = row;
      row.classList.add("isDragging");

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.rankingValue || "");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("isDragging");
      list.querySelectorAll(".quizRankingItem").forEach(item => {
        item.classList.remove("isDropTarget");
      });

      draggedRow = null;
      updateRankingAnswerFromDom(list.dataset.rankingList);
    });

    row.addEventListener("dragover", event => {
      event.preventDefault();

      if (!draggedRow || draggedRow === row) return;

      row.classList.add("isDropTarget");

      const rect = row.getBoundingClientRect();
      const isAfter = event.clientY > rect.top + rect.height / 2;

      if (isAfter) {
        row.after(draggedRow);
      } else {
        row.before(draggedRow);
      }
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("isDropTarget");
    });

    row.addEventListener("drop", event => {
      event.preventDefault();

      list.querySelectorAll(".quizRankingItem").forEach(item => {
        item.classList.remove("isDropTarget");
      });

      updateRankingAnswerFromDom(list.dataset.rankingList);
    });
  });
});

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
  <div class="quizRankingHandle" aria-hidden="true"></div>
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

              // rerenderRanking();
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

if (question.type === "swipeDeck") {
  const cards = question.config.cards || [];

  if (!answers[question.id]) {
    answers[question.id] = {
      decisions: [],
      likedValues: [],
      rejectedValues: []
    };
  }

  const makeDecision = direction => {
    const decisions = answers[question.id].decisions || [];
    const currentCard = cards[decisions.length];
    if (!currentCard) return;

    const nextDecision = {
      value: currentCard.value,
      label: currentCard.label,
      imageUrl: currentCard.imageUrl,
      direction
    };

    const nextDecisions = [...decisions, nextDecision];

answers[question.id] = {
  decisions: nextDecisions,
  likedValues: nextDecisions
    .filter(item => item.direction === "like")
    .map(item => item.value),
  rejectedValues: nextDecisions
    .filter(item => item.direction === "reject")
    .map(item => item.value)
};

const progressMetaLabel = document.querySelector(".quizStepMeta span:first-child");
const progressMetaPercent = document.querySelector(".quizStepMeta span:last-child");
const progressBar = document.querySelector(".quizInlineProgressBar");

const totalSteps = getAssignmentStepTotal(assignment);
const completedSteps = getCompletedStepCount(
  assignment,
  currentStep,
  answers
);

const currentDisplayStep = Math.min(completedSteps + 1, totalSteps);

const nextProgressPercent = totalSteps
  ? Math.round((completedSteps / totalSteps) * 100)
  : 0;

if (progressMetaLabel) {
  progressMetaLabel.textContent = `${currentDisplayStep} of ${totalSteps}`;
}

if (progressMetaPercent) {
  progressMetaPercent.textContent = `${nextProgressPercent}%`;
}

if (progressBar) {
  progressBar.style.width = `${nextProgressPercent}%`;
}

saveAssignmentProgress(sb, me, assignment, {
  answers,
  currentStep
}).catch(error => {
  console.warn("Swipe deck autosave failed", error);
});

if (nextDecisions.length >= cards.length) {
  if (!isFinalStep) {
    saveAssignmentProgress(sb, me, assignment, {
      answers,
      currentStep: currentStep + 1
    })
      .then(() => {
        if (onRefresh) return onRefresh();

        return refreshWelcomeDashboard({
          mainEl,
          messagesEl,
          sb,
          me,
          escapeHtml,
          animateMetrics: true,
          adminPreview: false,
          adminHome: false
        });
      })
      .catch(error => {
        console.warn("Swipe deck advance failed", error);
      });

    return;
  }

  saveAssignmentResponse(sb, me, assignment, {
    assignmentId: assignment.id,
    componentType: assignment.type,
    answers
  })
    .then(() => clearAssignmentProgress(sb, me, assignment.id))
    .then(() => {
      if (onRefresh) return onRefresh();

      return refreshWelcomeDashboard({
        mainEl,
        messagesEl,
        sb,
        me,
        escapeHtml,
        animateMetrics: true,
        adminPreview: false,
        adminHome: false
      });
    })
    .catch(error => {
      console.warn("Swipe deck autosubmit failed", error);
    });

  return;
}

rerenderSwipeDeck();
  };

  const rerenderSwipeDeck = () => {
    const blockEl = cardEl.querySelector(
      `[data-question-id="${question.id}"][data-question-type="swipeDeck"]`
    );
    if (!blockEl) return;

    const decisions = answers[question.id].decisions || [];
    const currentIndex = decisions.length;
    const currentCard = cards[currentIndex];
    const done = currentIndex >= cards.length;

    blockEl.innerHTML = `
      <div class="quizLabel">${escapeHtml(question.prompt)}</div>


      ${
        done
          ? `<div class="quizSwipeDone">Swipe deck complete.</div>`
          : `
            <div class="quizSwipeCard" data-swipe-card>
    <img
  class="quizSwipeImage"
  draggable="false"
  src="${escapeAttr(currentCard.imageUrl)}"
  alt="${escapeAttr(currentCard.label)}"
/>
              <div class="quizSwipeCaption">${escapeHtml(currentCard.label)}</div>
            </div>

            <div class="quizSwipeActions">
              <button type="button" class="quizSwipeBtn reject" data-swipe-direction="reject">Pass</button>
              <button type="button" class="quizSwipeBtn like" data-swipe-direction="like">Like</button>
            </div>
          `
      }
    `;

    bindSwipeButtons();
    bindSwipeDrag();
    syncSubmitState();
  };

  const bindSwipeButtons = () => {
    cardEl
      .querySelectorAll(`[data-question-id="${question.id}"] [data-swipe-direction]`)
      .forEach(btn => {
        btn.addEventListener("click", () => {
          makeDecision(btn.dataset.swipeDirection);
        });
      });
  };

const bindSwipeDrag = () => {
  const swipeCard = cardEl.querySelector(
    `[data-question-id="${question.id}"] [data-swipe-card]`
  );
  if (!swipeCard) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let dragging = false;
  let pointerId = null;

  const resetCard = () => {
    swipeCard.style.transition = "transform 180ms ease";
    swipeCard.style.transform = "translateX(0) rotate(0deg)";
  };

  const finishDrag = () => {
    if (!dragging) return;

    dragging = false;

    const threshold = 45;

    if (currentX > threshold) {
      swipeCard.style.transition = "transform 180ms ease, opacity 180ms ease";
      swipeCard.style.transform = "translateX(460px) rotate(20deg)";
      swipeCard.style.opacity = "0";
      setTimeout(() => makeDecision("like"), 140);
      return;
    }

    if (currentX < -threshold) {
      swipeCard.style.transition = "transform 180ms ease, opacity 180ms ease";
      swipeCard.style.transform = "translateX(-460px) rotate(-20deg)";
      swipeCard.style.opacity = "0";
      setTimeout(() => makeDecision("reject"), 140);
      return;
    }

    resetCard();
  };

swipeCard.addEventListener("pointerdown", event => {
  event.preventDefault();

  dragging = true;
  pointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  currentX = 0;

  swipeCard.setPointerCapture?.(pointerId);
  swipeCard.style.transition = "none";
});

  swipeCard.addEventListener("pointermove", event => {
    if (!dragging) return;

    currentX = event.clientX - startX;
    const currentY = event.clientY - startY;
    const rotate = currentX / 14;

    swipeCard.style.transform = `translate(${currentX}px, ${currentY * 0.15}px) rotate(${rotate}deg)`;
  });

  swipeCard.addEventListener("pointerup", finishDrag);
  swipeCard.addEventListener("pointercancel", finishDrag);
  swipeCard.addEventListener("lostpointercapture", finishDrag);
};

rerenderSwipeDeck();
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

if (onRefresh) {
  await onRefresh();
} else {
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
}

      return;
    }

const savedResponsePayload = {
  assignmentId: assignment.id,
  componentType: assignment.type,
  answers,
  completed: true,
  submittedAt: new Date().toISOString()
};

const matrixId = getAssignmentMatrixId(assignment);
const isConnectionMatrix = String(matrixId || "").startsWith("connection_");

const completionMatrixIds = isConnectionMatrix
  ? ["connection_values", "connection_attachment", "connection_interpersonal"]
  : ["attraction_aesthetics", "attraction_chemistry", "attraction_romance"];

const beforeMatrixStates = Object.fromEntries(
  await Promise.all(
    completionMatrixIds.map(async id => {
      const state = await window.soleScoring?.loadUserMatrixScoresForMatrix?.(
        sb,
        me.id,
        id
      );

      return [id, state || null];
    })
  )
);

await saveAssignmentResponse(sb, me, assignment, savedResponsePayload);

await window.soleScoring?.applyAssignmentScoringToUserMatrix?.(
  sb,
  me,
  assignment,
  answers
);

const afterMatrixStates = Object.fromEntries(
  await Promise.all(
    completionMatrixIds.map(async id => {
      const state = await window.soleScoring?.loadUserMatrixScoresForMatrix?.(
        sb,
        me.id,
        id
      );

      return [id, state || null];
    })
  )
);

const beforeMatrixState = beforeMatrixStates[matrixId] || null;
const afterMatrixState = afterMatrixStates[matrixId] || null;

const matrixSiblingStates = Object.fromEntries(
  completionMatrixIds.map(id => [
    id,
    {
      scores: afterMatrixStates[id]?.scores || null,
      startScores: beforeMatrixStates[id]?.scores || null,
      confidence: afterMatrixStates[id]?.confidence ?? 0
    }
  ])
);

await clearAssignmentProgress(sb, me, assignment.id);

const sectionEl = cardEl.closest(".quizPanel");

if (sectionEl) {
  sectionEl.outerHTML = renderCompletedSummary(
    assignment,
    savedResponsePayload,
    escapeHtml,
    {
      adminPreview: false,
      isPartial: false,
      matrixScores: afterMatrixState?.scores || null,
      matrixConfidence: afterMatrixState?.confidence ?? null,
      matrixStartScores: beforeMatrixState?.scores || null,
      matrixSiblingStates
    }
  );

  const finalTotalSteps = getAssignmentStepTotal(assignment);
  const heroProgressEl = messagesEl.querySelector(".moduleQuizProgress");

  if (heroProgressEl) {
    const heroMetaEl = heroProgressEl.querySelector(".quizStepMeta");
    const heroProgressBarEl = heroProgressEl.querySelector(".quizInlineProgressBar");

    if (heroMetaEl) {
      heroMetaEl.innerHTML = `
        <span>${finalTotalSteps} of ${finalTotalSteps}</span>
        <span>100%</span>
      `;
    }

    if (heroProgressBarEl) {
      heroProgressBarEl.style.width = "100%";
    }
  }

  window.soleMatrixRendering?.bindTooltips?.(messagesEl);

window.soleMatrixRendering?.bindSwitchers?.({
  rootEl: messagesEl,
  sb,
  me,
  escapeHtml,
  escapeAttr
});

setTimeout(() => {
  window.soleMatrixRendering?.animateMatrices?.(messagesEl);
}, 650);
}



await updateSidebarDailyTasks?.();
await updateInsightNotificationDots?.();
  });

  const backBtn = cardEl.querySelector(`[data-assignment-back="${assignment.id}"]`);

backBtn?.addEventListener("click", async () => {
  if (currentStep <= 0) return;

  await saveAssignmentProgress(sb, me, assignment, {
    answers,
    currentStep: currentStep - 1
  });

  if (onRefresh) {
    await onRefresh();
    return;
  }

  await refreshWelcomeDashboard({
    mainEl,
    messagesEl,
    sb,
    me,
    escapeHtml,
    animateMetrics: false,
    adminPreview: false,
    adminHome: false
  });
});
}

function getQuestionStepCount(question) {
  if (question?.type === "swipeDeck") {
    return Math.max(question.config?.cards?.length || 0, 1);
  }

  return 1;
}

function getAssignmentStepTotal(assignment) {
  return (assignment.questions || []).reduce((total, question) => {
    return total + getQuestionStepCount(question);
  }, 0);
}

function getCompletedStepCount(assignment, currentStep, answers = {}) {
  let completed = 0;

  (assignment.questions || []).forEach((question, index) => {
    if (index < currentStep) {
      completed += getQuestionStepCount(question);
      return;
    }

    if (index === currentStep && question.type === "swipeDeck") {
      const decisions = answers[question.id]?.decisions || [];
      completed += Math.min(decisions.length, getQuestionStepCount(question));
    }
  });

  return completed;
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


function parseOptionsFromAdminTextarea(text = "") {
  return String(text || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      if (line.includes("::")) {
        const [rawValue, ...labelParts] = line.split("::");
        const value = rawValue.trim();
        const label = labelParts.join("::").trim();

        return {
          value,
          label: label || value
        };
      }

      const label = line.trim();
      const value = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      return { value, label };
    });
}

  function showBuilder() {
  builderEl.hidden = false;
  builderEl.scrollIntoView({ behavior: "smooth", block: "start" });
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
    getRootField("dayIndex").value = "1";
    getRootField("category").value = "chemistry";
    getRootField("status").value = "active";
    getRootField("saveMode").value = "single";
    getRootField("impactWeight").value = "medium";
    getRootField("matrixId").value = "attraction_aesthetics";
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
    getRootField("dayIndex").value = String(template.day_index || 1);
    getRootField("category").value = template.category || "";
    getRootField("status").value = template.status || "active";
    getRootField("saveMode").value = template.save_mode || "single";
    getRootField("impactWeight").value = template.impact_weight || "medium";
    getRootField("matrixId").value =
  template.matrix_id ||
  template.matrixId ||
  template.effect?.matrixId ||
  template.effect?.matrix_id ||
  (
    template.category === "chemistry"
      ? "attraction_chemistry"
      : template.category === "attraction"
        ? "attraction_aesthetics"
        : "connection_attachment"
  );
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
    showBuilder();

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

async function openTemplateOverridesWorkspace(templateId) {
  const template = await loadQuizTemplateDetailFromSupabase(sb, templateId);
  if (!template) {
    setFeedback("Template could not be found.", "error");
    return;
  }

  const [overrides, users] = await Promise.all([
    fetchQuizTemplateOverrides(sb, templateId),
    loadNonAdminProfilesFromSupabase(sb)
  ]);

  const overridesByUser = new Map(
    overrides.map(item => [item.user_id, item])
  );

  messagesEl.innerHTML = `
    <div data-dashboard-feedback class="dashboardFeedback"></div>

    <section class="dashboardPanel">
      <div class="dashboardHeading">
        <div>
          <div class="dashboardEyebrow">Template overrides</div>
          <h3>${escapeHtml(template.title || "Untitled template")}</h3>
        </div>

        <button type="button" class="btn btnGhost" data-back-to-templates>
          Back to templates
        </button>
      </div>

      <div class="adminUserOverrideList">
        ${users.map(user => {
          const override = overridesByUser.get(user.id);

          return `
            <article class="adminUserOverrideRow">
              <div>
                <strong>${escapeHtml(user.display_name || "User")}</strong>
                <div class="muted">
                  ${override ? "Customised" : "Using default template"}
                </div>
              </div>

              <button
                type="button"
                class="btn btnGhost"
                data-edit-user-override="${escapeAttr(user.id)}"
              >
                ${override ? "Edit override" : "Create override"}
              </button>
              ${override ? `
  <button
    type="button"
    class="btn btnGhost"
    data-delete-user-override="${escapeAttr(user.id)}"
  >
    Delete override
  </button>
` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;

  messagesEl.querySelector("[data-back-to-templates]")?.addEventListener("click", async () => {
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
  });

  messagesEl.querySelectorAll("[data-delete-user-override]").forEach(button => {
  button.addEventListener("click", async () => {
    const userId = button.dataset.deleteUserOverride;
    if (!userId) return;

    const confirmed = window.confirm("Delete this user override?");
    if (!confirmed) return;

    try {
      await deleteQuizTemplateOverrideInSupabase(sb, templateId, userId);
      await openTemplateOverridesWorkspace(templateId);
    } catch (error) {
      setFeedback(error?.message || "Could not delete override.", "error");
    }
  });
});

  messagesEl.querySelectorAll("[data-edit-user-override]").forEach(button => {
    button.addEventListener("click", async () => {
      const userId = button.dataset.editUserOverride;
      await openUserOverrideEditor(templateId, userId);
    });
  });
}

function getOverrideOptionsText(question, questionOverride = {}) {
  const config = {
    ...(question.config || {}),
    ...(questionOverride.config || {})
  };

  if (["singleSelect", "multiSelect", "ranking"].includes(question.type)) {
return formatOptionsForAdminTextarea(config.options || []);
  }

  if (question.type === "imageChoice") {
return formatOptionsForAdminTextarea(config.options || []);
  }

  if (question.type === "swipeDeck") {
    return (config.cards || [])
      .map(card => `${card.label || ""}|${card.imageUrl || ""}`)
      .join("\n");
  }

  return "";
}

function buildOverrideConfigFromText(question, rawText) {
  const lines = String(rawText || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  if (["singleSelect", "multiSelect", "ranking"].includes(question.type)) {
return {
  options: parseOptionsFromAdminTextarea(rawText)
};
  }

  if (question.type === "imageChoice") {
    return {
      options: lines.map((line, index) => {
        const [label = "", imageUrl = ""] = line.split("|").map(part => part.trim());

        return {
          value: slugifyOptionValue(label, index),
          label,
          imageUrl
        };
      }).filter(option => option.label)
    };
  }

  if (question.type === "swipeDeck") {
    return {
      cards: lines.map((line, index) => {
        const [label = "", imageUrl = ""] = line.split("|").map(part => part.trim());

        return {
          value: slugifyOptionValue(label || `Image ${index + 1}`, index),
          label: label || `Image ${index + 1}`,
          imageUrl
        };
      }).filter(card => card.imageUrl)
    };
  }

  return null;
}

async function deleteQuizTemplateOverrideInSupabase(sb, templateId, userId) {
  const { error } = await sb
    .from("quiz_template_overrides")
    .delete()
    .eq("template_id", templateId)
    .eq("user_id", userId);

  if (error) throw error;
}

async function openUserOverrideEditor(templateId, userId) {
  const [template, existingOverride, users] = await Promise.all([
    loadQuizTemplateDetailFromSupabase(sb, templateId),
    fetchQuizTemplateOverrideForUser(sb, templateId, userId),
    loadNonAdminProfilesFromSupabase(sb)
  ]);

  if (!template) {
    setFeedback("Template could not be found.", "error");
    return;
  }

const user = users.find(item => item.id === userId);
const overrideJson = existingOverride?.override_json || {};
const questionOverrides = overrideJson.questions || {};
const questions = Array.isArray(template.questions_json) ? template.questions_json : [];

const orderedQuestions = Array.isArray(overrideJson.questionOrder)
  ? [
      ...overrideJson.questionOrder
        .map(id => questions.find(question => question.id === id))
        .filter(Boolean),
      ...questions.filter(question => !overrideJson.questionOrder.includes(question.id))
    ]
  : questions;

let extraQuestionDrafts = Array.isArray(overrideJson.extraQuestions) && overrideJson.extraQuestions.length
  ? overrideJson.extraQuestions.map(hydrateBuilderDraftFromQuestion)
  : [];

  messagesEl.innerHTML = `
    <div data-dashboard-feedback class="dashboardFeedback"></div>

    <section class="dashboardPanel">
      <div class="dashboardHeading">
        <div>
          <div class="dashboardEyebrow">User override</div>
          <h3>${escapeHtml(user?.display_name || "User")}</h3>
          <p class="muted">${escapeHtml(template.title || "Untitled template")}</p>
        </div>

        <button type="button" class="btn btnGhost" data-back-to-overrides>
          Back
        </button>
      </div>

      <div class="adminQuizField">
        <label>Override title</label>
        <input
          type="text"
          data-override-root-field="title"
          value="${escapeAttr(overrideJson.title ?? "")}"
          placeholder="${escapeAttr(template.title || "")}"
        />
      </div>

      <div class="adminQuizField">
        <label>Override prompt</label>
        <input
          type="text"
          data-override-root-field="prompt"
          value="${escapeAttr(overrideJson.prompt ?? "")}"
          placeholder="${escapeAttr(template.prompt || "")}"
        />
      </div>

      <div class="adminQuizField">
        <label>Override description</label>
        <textarea
          rows="3"
          data-override-root-field="description"
          placeholder="${escapeAttr(template.description || "")}"
        >${escapeHtml(overrideJson.description ?? "")}</textarea>
      </div>

      <div class="adminQuizQuestionList">
       ${orderedQuestions.map((question, index) => {
          const questionOverride = questionOverrides[question.id] || {};

          return `
<div class="adminQuizQuestionCard" data-override-base-question-card="${escapeAttr(question.id)}">
  <div class="adminQuizQuestionTop">
   <div class="adminQuizQuestionTitle">Question ${index + 1}</div>

<div class="adminQuizQuestionActions">
  <button
    type="button"
    class="btn btnGhost"
    data-override-move-base-question="up"
    data-override-base-question-id="${escapeAttr(question.id)}"
    ${index === 0 ? "disabled" : ""}
  >
    ↑
  </button>

  <button
    type="button"
    class="btn btnGhost"
    data-override-move-base-question="down"
    data-override-base-question-id="${escapeAttr(question.id)}"
    ${index === orderedQuestions.length - 1 ? "disabled" : ""}
  >
    ↓
  </button>
</div>

    <label class="muted">
      <input
        type="checkbox"
        data-override-hide-question="${escapeAttr(question.id)}"
        ${Array.isArray(overrideJson.hiddenQuestionIds) && overrideJson.hiddenQuestionIds.includes(question.id) ? "checked" : ""}
      />
      Hide for this user
    </label>
  </div>

  <div class="adminQuizField">
    <label>Override question prompt</label>
    <input
      type="text"
      data-override-question-prompt="${escapeAttr(question.id)}"
      value="${escapeAttr(questionOverride.prompt ?? "")}"
      placeholder="${escapeAttr(question.prompt || "")}"
    />
  </div>

  ${["singleSelect", "multiSelect", "ranking", "imageChoice", "swipeDeck"].includes(question.type) ? `
    <div class="adminQuizField">
      <label>
        Override choices
        ${question.type === "imageChoice" || question.type === "swipeDeck"
          ? "<span class='muted'> — one per line as Label|Image URL</span>"
          : "<span class='muted'> — one per line</span>"
        }
      </label>

      <textarea
        rows="5"
        data-override-question-options="${escapeAttr(question.id)}"
      >${escapeHtml(getOverrideOptionsText(question, questionOverride))}</textarea>
    </div>
  ` : ""}
</div>
          `;
        }).join("")}
      </div>

<div class="adminQuizField">
  <label>Extra user-only questions</label>

  <div class="adminQuizQuestionList" data-override-extra-question-list>
    ${
      extraQuestionDrafts.length
        ? extraQuestionDrafts
            .map((question, index) => renderAdminQuestionBuilder(question, index, escapeHtml))
            .join("")
        : `<p class="muted">No extra questions for this user.</p>`
    }
  </div>

  <div class="adminQuizActions">
    <button type="button" class="btn btnGhost" data-override-add-extra-question>
      Add extra question
    </button>
  </div>
</div>

      <div class="adminQuizActions">
        <button type="button" class="btn" data-save-user-override>
          Save override
        </button>
      </div>
    </section>
  `;

  function renumberOverrideBaseQuestions() {
  messagesEl
    .querySelectorAll("[data-override-base-question-card]")
    .forEach((card, index, allCards) => {
      const title = card.querySelector(".adminQuizQuestionTitle");
      if (title) title.textContent = `Question ${index + 1}`;

      const upBtn = card.querySelector('[data-override-move-base-question="up"]');
      const downBtn = card.querySelector('[data-override-move-base-question="down"]');

      if (upBtn) upBtn.disabled = index === 0;
      if (downBtn) downBtn.disabled = index === allCards.length - 1;
    });
}

messagesEl
  .querySelectorAll("[data-override-move-base-question]")
  .forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-override-base-question-card]");
      const direction = button.dataset.overrideMoveBaseQuestion;

      if (!card || !card.parentElement) return;

      if (direction === "up" && card.previousElementSibling) {
        card.parentElement.insertBefore(card, card.previousElementSibling);
      }

      if (direction === "down" && card.nextElementSibling) {
        card.parentElement.insertBefore(card.nextElementSibling, card);
      }

      renumberOverrideBaseQuestions();
    });
  });

  const extraQuestionListEl = messagesEl.querySelector("[data-override-extra-question-list]");

function rerenderExtraQuestionList() {
  if (!extraQuestionListEl) return;

  extraQuestionListEl.innerHTML = extraQuestionDrafts.length
    ? extraQuestionDrafts
        .map((question, index) => renderAdminQuestionBuilder(question, index, escapeHtml))
        .join("")
    : `<p class="muted">No extra questions for this user.</p>`;

  bindExtraQuestionFields();
}

function getExtraDraftById(questionId) {
  return extraQuestionDrafts.find(item => item.id === questionId);
}

function bindExtraQuestionFields() {
  if (!extraQuestionListEl) return;

  extraQuestionListEl
    .querySelectorAll("[data-builder-field]")
    .forEach(input => {
      input.addEventListener("input", handleExtraQuestionFieldChange);
      input.addEventListener("change", handleExtraQuestionFieldChange);
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-remove-question]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const questionId = btn.dataset.builderRemoveQuestion;
        extraQuestionDrafts = extraQuestionDrafts.filter(item => item.id !== questionId);
        rerenderExtraQuestionList();
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-move-question]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const questionId = btn.dataset.builderQuestionId;
        const direction = btn.dataset.builderMoveQuestion;

        const currentIndex = extraQuestionDrafts.findIndex(item => item.id === questionId);
        if (currentIndex === -1) return;

        const nextIndex = direction === "up"
          ? currentIndex - 1
          : currentIndex + 1;

        if (nextIndex < 0 || nextIndex >= extraQuestionDrafts.length) return;

        extraQuestionDrafts = moveArrayItem(extraQuestionDrafts, currentIndex, nextIndex);
        rerenderExtraQuestionList();
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-image-choice-field]")
    .forEach(input => {
      input.addEventListener("input", event => {
        const inputEl = event.target;
        const questionId = inputEl.dataset.builderQuestionId;
        const optionIndex = Number(inputEl.dataset.builderOptionIndex);
        const field = inputEl.dataset.builderImageChoiceField;
        const draft = getExtraDraftById(questionId);

        if (!draft || !Array.isArray(draft.imageChoiceOptions)) return;
        if (!draft.imageChoiceOptions[optionIndex]) return;

        draft.imageChoiceOptions[optionIndex][field] = inputEl.value;
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-add-image-choice-option]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const draft = getExtraDraftById(btn.dataset.builderAddImageChoiceOption);
        if (!draft) return;

        if (!Array.isArray(draft.imageChoiceOptions)) draft.imageChoiceOptions = [];
        if (draft.imageChoiceOptions.length >= ADMIN_BUILDER_MAX_OPTIONS) return;

        draft.imageChoiceOptions.push({
          label: `Option ${draft.imageChoiceOptions.length + 1}`,
          imageUrl: ""
        });

        rerenderExtraQuestionList();
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-remove-image-choice-option]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const draft = getExtraDraftById(btn.dataset.builderRemoveImageChoiceOption);
        const optionIndex = Number(btn.dataset.builderOptionIndex);

        if (!draft || !Array.isArray(draft.imageChoiceOptions)) return;

        draft.imageChoiceOptions.splice(optionIndex, 1);
        rerenderExtraQuestionList();
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-swipe-field]")
    .forEach(input => {
      input.addEventListener("input", event => {
        const inputEl = event.target;
        const questionId = inputEl.dataset.builderQuestionId;
        const cardIndex = Number(inputEl.dataset.builderCardIndex);
        const field = inputEl.dataset.builderSwipeField;
        const draft = getExtraDraftById(questionId);

        if (!draft) return;
        if (!Array.isArray(draft.swipeDeckCards)) draft.swipeDeckCards = [];
        if (!draft.swipeDeckCards[cardIndex]) return;

        draft.swipeDeckCards[cardIndex][field] = inputEl.value;
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-add-swipe-card]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const draft = getExtraDraftById(btn.dataset.builderAddSwipeCard);
        if (!draft) return;

        if (!Array.isArray(draft.swipeDeckCards)) draft.swipeDeckCards = [];
        if (draft.swipeDeckCards.length >= ADMIN_BUILDER_MAX_OPTIONS) return;

        draft.swipeDeckCards.push({
          label: `Image ${draft.swipeDeckCards.length + 1}`,
          imageUrl: ""
        });

        rerenderExtraQuestionList();
      });
    });

  extraQuestionListEl
    .querySelectorAll("[data-builder-remove-swipe-card]")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        const draft = getExtraDraftById(btn.dataset.builderRemoveSwipeCard);
        const cardIndex = Number(btn.dataset.builderCardIndex);

        if (!draft || !Array.isArray(draft.swipeDeckCards)) return;

        draft.swipeDeckCards.splice(cardIndex, 1);

        if (!draft.swipeDeckCards.length) {
          draft.swipeDeckCards.push({ label: "Image 1", imageUrl: "" });
        }

        rerenderExtraQuestionList();
      });
    });
}

function handleExtraQuestionFieldChange(event) {
  const field = event.target.dataset.builderField;
  const questionId = event.target.dataset.builderQuestionId;
  const draft = getExtraDraftById(questionId);
  if (!draft) return;

  draft[field] = event.target.value;

  if (field === "type") {
    draft.optionsText = getDefaultOptionsTextForType(draft.type);

    if (draft.type === "multiSelect") {
      draft.minSelections = 1;
      draft.maxSelections = 2;
    }

    if (draft.type === "scale7") {
  draft.scale7MinLabel = draft.scale7MinLabel || "Disagree";
  draft.scale7MidLabel = draft.scale7MidLabel || "Neutral";
  draft.scale7MaxLabel = draft.scale7MaxLabel || "Agree";
}

    if (draft.type === "imageChoice") {
      draft.imageChoiceOptions = [
        { label: "Option 1", imageUrl: "" },
        { label: "Option 2", imageUrl: "" }
      ];
    }

    if (draft.type === "swipeDeck") {
      draft.swipeDeckCards = [
        { label: "Image 1", imageUrl: "" },
        { label: "Image 2", imageUrl: "" }
      ];
    }

    rerenderExtraQuestionList();
  }
}

messagesEl.querySelector("[data-override-add-extra-question]")?.addEventListener("click", () => {
  extraQuestionDrafts.push(createBuilderQuestionDraft("singleSelect"));
  rerenderExtraQuestionList();
});

  messagesEl.querySelector("[data-back-to-overrides]")?.addEventListener("click", async () => {
    await openTemplateOverridesWorkspace(templateId);
  });

  messagesEl.querySelector("[data-save-user-override]")?.addEventListener("click", async () => {
    const nextOverride = {
      questions: {}
    };

    const title = messagesEl.querySelector('[data-override-root-field="title"]')?.value?.trim();
    const prompt = messagesEl.querySelector('[data-override-root-field="prompt"]')?.value?.trim();
    const description = messagesEl.querySelector('[data-override-root-field="description"]')?.value?.trim();

    if (title) nextOverride.title = title;
    if (prompt) nextOverride.prompt = prompt;
    if (description) nextOverride.description = description;

nextOverride.hiddenQuestionIds = [];

messagesEl.querySelectorAll("[data-override-hide-question]").forEach(input => {
  if (input.checked) {
    nextOverride.hiddenQuestionIds.push(input.dataset.overrideHideQuestion);
  }
});

nextOverride.questionOrder = Array.from(
  messagesEl.querySelectorAll("[data-override-base-question-card]")
).map(card => card.dataset.overrideBaseQuestionCard).filter(Boolean);

questions.forEach(question => {
  const promptInput = messagesEl.querySelector(
    `[data-override-question-prompt="${CSS.escape(question.id)}"]`
  );

  const optionsInput = messagesEl.querySelector(
    `[data-override-question-options="${CSS.escape(question.id)}"]`
  );

  const questionPatch = {};
  const promptValue = promptInput?.value?.trim() || "";
  const configPatch = optionsInput
    ? buildOverrideConfigFromText(question, optionsInput.value)
    : null;

  if (promptValue) questionPatch.prompt = promptValue;
  if (configPatch) questionPatch.config = configPatch;

  if (Object.keys(questionPatch).length) {
    nextOverride.questions[question.id] = questionPatch;
  }
});

for (const draft of extraQuestionDrafts) {
  const validationError = validateBuilderDraft(draft);
  if (validationError) {
    setFeedback(validationError, "error");
    return;
  }
}

nextOverride.extraQuestions = extraQuestionDrafts.map(buildQuestionFromDraft);

    await saveQuizTemplateOverrideInSupabase(sb, templateId, userId, nextOverride);
    setFeedback("Override saved.", "success");

    await openTemplateOverridesWorkspace(templateId);
  });
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
  .querySelectorAll("[data-builder-move-question]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const questionId = btn.dataset.builderQuestionId;
      const direction = btn.dataset.builderMoveQuestion;

      const currentIndex = questionDrafts.findIndex(item => item.id === questionId);
      if (currentIndex === -1) return;

      const nextIndex = direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

      if (nextIndex < 0 || nextIndex >= questionDrafts.length) return;

      questionDrafts = moveArrayItem(questionDrafts, currentIndex, nextIndex);
      rerenderQuestionList();
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

  questionListEl
  .querySelectorAll("[data-builder-swipe-field]")
  .forEach(input => {
    input.addEventListener("input", event => {
      const inputEl = event.target;
      const questionId = inputEl.dataset.builderQuestionId;
      const cardIndex = Number(inputEl.dataset.builderCardIndex);
      const field = inputEl.dataset.builderSwipeField;
      const draft = getDraftById(questionId);

      if (!draft) return;
      if (!Array.isArray(draft.swipeDeckCards)) draft.swipeDeckCards = [];
      if (!draft.swipeDeckCards[cardIndex]) return;

      draft.swipeDeckCards[cardIndex][field] = inputEl.value;

      const rowEl = inputEl.closest(".adminQuizImageChoiceRow");
      if (field === "imageUrl" && rowEl) {
        const previewWrap = rowEl.querySelector(".adminQuizImageChoicePreviewWrap");
        const label = draft.swipeDeckCards[cardIndex].label || "";

        if (previewWrap) {
          previewWrap.innerHTML = inputEl.value
            ? `<img class="adminQuizImageChoicePreview" src="${escapeAttr(inputEl.value)}" alt="${escapeAttr(label)}" />`
            : `<div class="adminQuizImageChoicePreview adminQuizImageChoicePreviewPlaceholder">No image</div>`;
        }
      }
    });
  });

questionListEl
  .querySelectorAll("[data-builder-add-swipe-card]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const questionId = btn.dataset.builderAddSwipeCard;
      const draft = getDraftById(questionId);
      if (!draft) return;

      if (!Array.isArray(draft.swipeDeckCards)) draft.swipeDeckCards = [];

      if (draft.swipeDeckCards.length >= ADMIN_BUILDER_MAX_OPTIONS) return;

      draft.swipeDeckCards.push({
        label: `Image ${draft.swipeDeckCards.length + 1}`,
        imageUrl: ""
      });

      rerenderQuestionList();
    });
  });

questionListEl
  .querySelectorAll("[data-builder-remove-swipe-card]")
  .forEach(btn => {
    btn.addEventListener("click", () => {
      const questionId = btn.dataset.builderRemoveSwipeCard;
      const cardIndex = Number(btn.dataset.builderCardIndex);
      const draft = getDraftById(questionId);
      if (!draft || !Array.isArray(draft.swipeDeckCards)) return;

      draft.swipeDeckCards.splice(cardIndex, 1);

      if (!draft.swipeDeckCards.length) {
        draft.swipeDeckCards.push({ label: "Image 1", imageUrl: "" });
      }

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

  if (draft.type === "scale7") {
  draft.scale7MinLabel = draft.scale7MinLabel || "Disagree";
  draft.scale7MidLabel = draft.scale7MidLabel || "Neutral";
  draft.scale7MaxLabel = draft.scale7MaxLabel || "Agree";
}

  if (draft.type === "imageChoice") {
    draft.imageChoiceOptions = [
      { label: "Option 1", imageUrl: "" },
      { label: "Option 2", imageUrl: "" }
    ];
    draft.optionsText = draft.imageChoiceOptions.map(option => option.label).join("\n");
    draft.optionsImagesText = draft.imageChoiceOptions.map(option => option.imageUrl).join("\n");
  }

  if (draft.type === "swipeDeck") {
  draft.swipeDeckCards = [
    { label: "Image 1", imageUrl: "" },
    { label: "Image 2", imageUrl: "" }
  ];
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

      messagesEl
  .querySelectorAll("[data-template-day-select]")
  .forEach(select => {
    select.addEventListener("change", async () => {
      const templateId = select.dataset.templateDaySelect;
      const dayIndex = select.value;

      if (!templateId || !dayIndex) return;

      try {
        await updateQuizTemplateDayInSupabase(sb, templateId, dayIndex);

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
        setFeedback(error?.message || "Could not update template day.", "error");
      }
    });
  });

messagesEl
  .querySelectorAll("[data-template-day-status-override]")
  .forEach(select => {
    select.addEventListener("change", async () => {
      const dayIndex = select.dataset.templateDayStatusOverride;
      const status = select.value;

      if (!dayIndex || !status) return;

      const confirmed = window.confirm(
        `Set every template on Day ${dayIndex} to ${status}?`
      );

      if (!confirmed) {
        select.value = "";
        return;
      }

      try {
        await updateQuizTemplateDayStatusInSupabase(sb, dayIndex, status);

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
        setFeedback(error?.message || "Could not update day status.", "error");
      }
    });
  });

  let draggedTemplateId = "";

messagesEl.querySelectorAll("[data-template-drag-id]").forEach(card => {
  card.addEventListener("dragstart", event => {
    draggedTemplateId = card.dataset.templateDragId;
    card.classList.add("isDragging");

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTemplateId);
  });

  card.addEventListener("dragend", () => {
    draggedTemplateId = "";
    card.classList.remove("isDragging");

    messagesEl.querySelectorAll(".adminTemplateDropZone").forEach(zone => {
      zone.classList.remove("isDragOver");
    });
  });
});

messagesEl.querySelectorAll(".adminTemplateDropZone").forEach(zone => {
  zone.addEventListener("dragover", event => {
    event.preventDefault();
    zone.classList.add("isDragOver");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("isDragOver");
  });

  zone.addEventListener("drop", async event => {
    event.preventDefault();

    const templateId =
      event.dataTransfer.getData("text/plain") ||
      draggedTemplateId;

    const dayIndex = zone.dataset.templateDropDay;
    const category = zone.dataset.templateDropCategory;

    if (!templateId || !dayIndex || !category) return;

    try {
      await updateQuizTemplateScheduleInSupabase(sb, templateId, dayIndex, category);

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
      setFeedback(error?.message || "Could not move template.", "error");
    }
  });
});

messagesEl
  .querySelectorAll("[data-template-overrides]")
  .forEach(button => {
    button.addEventListener("click", async () => {
      const templateId = button.dataset.templateOverrides;

      if (!templateId) return;

      await openTemplateOverridesWorkspace(templateId);
    });
  });

messagesEl
  .querySelectorAll("[data-template-status-select]")
  .forEach(select => {
    select.addEventListener("change", async () => {
      const templateId = select.dataset.templateStatusSelect;
      const status = select.value;

      if (!templateId || !status) return;

      try {
        await updateQuizTemplateStatusInSupabase(sb, templateId, status);

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
        setFeedback(error?.message || "Could not update template status.", "error");
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

messagesEl
  .querySelector("[data-builder-create-new]")
  ?.addEventListener("click", () => {
    resetBuilderForm();
    showBuilder();
  });

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
          dayIndex: getRootField("dayIndex")?.value || 1,
        category: getRootField("category")?.value?.trim() || "",
        status: getRootField("status")?.value || "active",
impactWeight: getRootField("impactWeight")?.value || "medium",
matrixId: getRootField("matrixId")?.value || "",
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

  window.soleMatrixRendering?.bindTooltips?.(messagesEl);
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

function updateMetricRings(snapshot) {
  const confidenceRing = document.getElementById("topConfidenceRing");
  const candidateRing = document.getElementById("topCandidateRing");
  const topCandidatePool = document.getElementById("topCandidatePool");

  const remainingCandidates = Number(snapshot.remainingCandidates) || 0;

  setMetricRingProgress(confidenceRing, snapshot.confidence);

  // Pool ring represents refinement progress:
  // 0% = full pool remaining, 100% = narrowed to the final candidate.
  const poolRefinementPercent =
    100 - ((remainingCandidates / DEFAULT_CANDIDATE_POOL) * 100);

  setMetricRingProgress(candidateRing, poolRefinementPercent);

  // But the visible text remains the actual candidate count.
  if (topCandidatePool) {
    topCandidatePool.textContent = formatCandidateCount(remainingCandidates);
  }
}

function animateDashboardMetrics(nextSnapshot, shouldAnimate = false) {
  const candidateEls = [
    document.querySelector('[data-metric="candidatePool"]'),
    document.getElementById("topCandidatePool")
  ].filter(Boolean);

  const confidenceEls = [
    document.querySelector('[data-metric="confidence"]'),
    document.getElementById("topCompatibilityConfidence")
  ].filter(Boolean);

  if (!candidateEls.length || !confidenceEls.length) {
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
    candidateEls.forEach(el => {
      animateNumber(
        el,
        previous.remainingCandidates,
        nextSnapshot.remainingCandidates,
        "integer",
        850
      );
    });

    confidenceEls.forEach(el => {
      animateNumber(
        el,
        previous.confidence,
        nextSnapshot.confidence,
        "percent",
        850
      );
    });
  } else {
    candidateEls.forEach(el => {
      el.textContent = formatAnimatedValue(nextSnapshot.remainingCandidates, "integer");
    });

    confidenceEls.forEach(el => {
      el.textContent = formatAnimatedValue(nextSnapshot.confidence, "percent");
    });

updateMetricRings(nextSnapshot);
  }

  updateMetricRings(nextSnapshot);

  lastRenderedMetricSnapshot = {
    remainingCandidates: Number(nextSnapshot.remainingCandidates),
    confidence: Number(nextSnapshot.confidence)
  };
}