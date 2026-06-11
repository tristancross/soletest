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
  const minLabel = question.config?.minLabel || "Disagree";
  const midLabel = question.config?.midLabel || "Neutral";
  const maxLabel = question.config?.maxLabel || "Agree";

  return `
    <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="scale7">
      <div class="quizLabel">${escapeHtml(question.prompt)}</div>

      <div class="quizScaleShell">
<div class="quizScaleRow">

  <div class="quizScaleEdgeLabel disagree">
    ${escapeHtml(minLabel)}
  </div>

        <div class="quizScale7" role="radiogroup" aria-label="${escapeAttr(question.prompt || "Scale question")}">
          ${Array.from({ length: 7 }, (_, i) => {
            const value = i + 1;
            return `
              <button
                type="button"
                class="quizScale7Btn${currentValue === value ? " isSelected" : ""}"
                data-question-id="${escapeAttr(question.id)}"
                data-value="${value}"
                aria-label="${escapeAttr(`${minLabel} to ${maxLabel}: ${value} of 7`)}"
                aria-pressed="${currentValue === value ? "true" : "false"}"
              >
                <span class="quizScale7Number">${value}</span>
              </button>
            `;
          }).join("")}
        </div>

          <div class="quizScaleEdgeLabel agree">
    ${escapeHtml(maxLabel)}
  </div>

</div>

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

  const savedSet = new Set(savedOrder);

  const fullOrder = [
    ...savedOrder.filter(value =>
      options.some(option => option.value === value)
    ),
    ...options
      .map(option => option.value)
      .filter(value => !savedSet.has(value))
  ];

  const orderedOptions = fullOrder
    .map(value => options.find(option => option.value === value))
    .filter(Boolean);

  return `
    <div class="quizBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="ranking">
      <div class="quizLabel">${escapeHtml(question.prompt)}</div>

      <div class="quizRankingList" data-ranking-list="${escapeAttr(question.id)}">
        ${orderedOptions.map((option, index) => `
          <div
            class="quizRankingItem"
            data-ranking-value="${escapeAttr(option.value)}"
            draggable="true"
          >
<div class="quizRankingHandle" aria-hidden="true"></div>

<div class="quizRankingIndex">${index + 1}</div>

<div class="quizRankingText">
  ${escapeHtml(option.label)}
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

  if (question.type === "swipeDeck") {
  const cards = question.config.cards || [];
  const decisions = Array.isArray(savedValue?.decisions)
    ? savedValue.decisions
    : [];

  const currentIndex = Math.min(decisions.length, Math.max(cards.length - 1, 0));
  const currentCard = cards[currentIndex];
  const done = decisions.length >= cards.length;

  return `
    <div class="quizBlock quizSwipeDeckBlock" data-question-id="${escapeAttr(question.id)}" data-question-type="swipeDeck">
      <div class="quizLabel">${escapeHtml(question.prompt)}</div>



      ${
        done
          ? `
            <div class="quizSwipeDone">
              Swipe deck complete.
            </div>
          `
          : `
            <div class="quizSwipeCard" data-swipe-current-card="${escapeAttr(currentCard.value)}">
              <img
                class="quizSwipeImage"
                src="${escapeAttr(currentCard.imageUrl)}"
                alt="${escapeAttr(currentCard.label)}"
              />
              <div class="quizSwipeCaption">${escapeHtml(currentCard.label)}</div>
            </div>

<div class="quizSwipeActions">
  <button
    type="button"
    class="quizSwipeBtn reject"
    data-swipe-direction="reject"
    aria-label="Pass"
    title="Pass"
  >
    <span class="quizSwipeBtnText">Pass</span>
  </button>

  <button
    type="button"
    class="quizSwipeBtn like"
    data-swipe-direction="like"
    aria-label="Like"
    title="Like"
  >
    <span class="quizSwipeBtnText">Like</span>
  </button>
</div>
          `
      }
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

function getAssignmentMatrixId(assignment = {}) {
  const category = String(
    assignment.matrixCategory ||
    assignment.matrix_category ||
    assignment.category ||
    assignment.meta?.category ||
    ""
  ).toLowerCase();

  return (
    assignment.matrixId ||
    assignment.matrix_id ||
    assignment.meta?.matrixId ||
    assignment.meta?.matrix_id ||
    assignment.effect?.matrixId ||
    assignment.effect?.matrix_id ||
    (
      category === "chemistry"
        ? "attraction_chemistry"
        : category === "attraction"
          ? "attraction_aesthetics"
          : "connection_attachment"
    )
  );
}

function renderCompletedSummary(assignment, savedResponse, escapeHtml, options = {}) {
const {
  adminPreview = false,
  isPartial = false,
  matrixScores = null,
  matrixConfidence = null,
  matrixStartScores = null,
  matrixSiblingStates = null
} = options;
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
                  <strong>${escapeHtml((answer.orderedLabels || []).join(" â†’ "))}</strong>
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

if (question.type === "swipeDeck") {
  const decisions = Array.isArray(answer.decisions) ? answer.decisions : [];

  lines.push(`
    <div class="quizCompleteLine quizCompleteSwipeDeck">
      <div>
        ${escapeHtml(question.prompt)}:
        <strong>${decisions.length} swipes recorded</strong>
      </div>

      <div class="quizCompleteSwipeGrid">
        ${decisions.map(decision => `
          <div class="quizCompleteSwipeItem ${decision.direction === "like" ? "isLike" : "isReject"}">
            <img
              class="quizCompleteSwipeThumb"
              src="${escapeAttr(decision.imageUrl || "")}"
              alt="${escapeAttr(decision.label || "")}"
            />
            <div class="quizCompleteSwipeMeta">
              <strong>${escapeHtml(decision.direction === "like" ? "Liked" : "Rejected")}</strong>
              <span>${escapeHtml(decision.label || decision.value || "")}</span>
            </div>
          </div>
        `).join("")}
      </div>
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
   : (assignment.effect?.stageLabel || "Your responses have been integrated into the compatibility model.");

const matrixId = getAssignmentMatrixId(assignment);

const isConnectionMatrix = String(matrixId || "").startsWith("connection_");

const completionMatrixIds = isConnectionMatrix
  ? ["connection_values", "connection_attachment", "connection_interpersonal"]
  : ["attraction_aesthetics", "attraction_chemistry", "attraction_romance"];

const completionSwitcherItems = completionMatrixIds.map(id => {
  const matrix = window.soleMatrixDefinitions?.get?.(id);

  return {
    id,
    title: matrix?.title || id
  };
});

const matrixMarkup = window.soleMatrixRendering
  ? window.soleMatrixRendering.renderPanel({
      matrixId,
      scores: matrixScores,
      startScores: matrixStartScores,
      confidence: matrixConfidence ?? (isPartial ? 34 : 67),
      escapeHtml,
      escapeAttr,
      switcherItems: completionSwitcherItems,
      activeMatrixId: matrixId,
      siblingStates: matrixSiblingStates
    })
  : "";

return `
<section class="quizPanel quizPanelComplete" aria-label="${escapeAttr(assignment.title)}">

    <div class="quizCompleteCard">
      ${adminPreview ? lines.join("") : ""}

      ${!adminPreview ? `
        <div class="quizCompleteLine">
          Calibration complete.
        </div>
      ` : ""}

<div class="quizCompleteHint">
  ${escapeHtml(hint)}
</div>

<div class="quizActions quizCompleteActions">
  <button
    type="button"
    class="quizSubmitBtn"
    data-completed-quiz-continue
  >
    Continue
  </button>
</div>
    </div>

    ${matrixMarkup}
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

const currentAnswer = mergedAnswers?.[currentQuestion?.id];

const totalSteps = getAssignmentStepTotal(assignment);
const completedSteps = getCompletedStepCount(
  assignment,
  currentStep,
  mergedAnswers
);

const currentDisplayStep = Math.min(completedSteps + 1, totalSteps);

const progressPercent = totalSteps
  ? Math.round((completedSteps / totalSteps) * 100)
  : 0;


const isFinalStep = currentStep === assignment.questions.length - 1;
  const buttonLabel = isFinalStep
    ? (assignment.ctaLabel || "Save")
    : "Continue";

  return `
    <section class="quizPanel" aria-label="${escapeAttr(assignment.title)}">

      <div
        class="quizCard quizCardStage"
        data-assignment-id="${escapeAttr(assignment.id)}"
        data-current-step="${currentStep}"
      >


        <div class="quizQuestionMount">
          ${renderQuestionInput(currentQuestion, mergedAnswers, escapeHtml)}
        </div>

<div class="quizActions${
  currentQuestion?.type === "swipeDeck" &&
  !canAdvanceQuestion(currentQuestion, currentAnswer)
    ? " isHidden"
    : ""
}">
  <button
    type="button"
    class="quizBackBtn"
    data-assignment-back="${escapeAttr(assignment.id)}"
    ${currentStep === 0 ? "disabled" : ""}
  >
    Back
  </button>

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

function canAdvanceQuestion(question, answer) {
  if (!question) return false;

  const type = question.type;

  if (!answer) return false;

  if (type === "slider") {
    return Number.isFinite(Number(answer.value));
  }

  if (type === "scale7") {
    const value = Number(answer.value);
    return Number.isFinite(value) && value >= 1 && value <= 7;
  }

  if (type === "singleSelect" || type === "imageChoice") {
    return String(answer.value || "").trim().length > 0;
  }

  if (type === "multiSelect") {
    return Array.isArray(answer.values) && answer.values.length > 0;
  }

  if (type === "freeText") {
    return String(answer.text || "").trim().length > 0;
  }

  if (type === "ranking") {
    const orderedValues = Array.isArray(answer.orderedValues)
      ? answer.orderedValues
      : [];

    const optionCount = Array.isArray(question.config?.options)
      ? question.config.options.length
      : 0;

    return optionCount
      ? orderedValues.length === optionCount
      : orderedValues.length > 0;
  }

  if (type === "swipeDeck") {
    const decisions = Array.isArray(answer.decisions)
      ? answer.decisions
      : [];

    const cards = Array.isArray(question.config?.cards)
      ? question.config.cards
      : [];

    return cards.length
      ? decisions.length >= cards.length
      : decisions.length > 0;
  }

  if (type === "fileUpload") {
    if (answer.status === "uploaded") {
      return !!(answer.path || answer.url || answer.signedUrl);
    }

    return false;
  }

  return Object.keys(answer || {}).length > 0;
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
    <section class="quizPanel" aria-label="Analysis in progress">
      <div class="quizPanelHeader">
        <div class="dashboardEyebrow">Analysis in progress</div>
        <h3>Results being analysed</h3>
        <p class="quizIntro">
          Your responses have been received and are now being processed.
        </p>
      </div>

      <div class="quizCompleteCard analysisPendingCard">


        <div class="quizCompleteLine">
          Check back later for more detailed feedback.
        </div>

        <div class="quizCompleteHint">
          Chemistry signals are being compared against your wider compatibility profile.
        </div>

        <div class="analysisLoaderBar" aria-hidden="true">
  <div class="analysisLoaderTrack">
    <div class="analysisLoaderGlow"></div>
  </div>
</div>
      </div>
    </section>
  `;
}
