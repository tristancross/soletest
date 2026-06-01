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


async function mountSidebarDashboardScreen({
  screen,
  sidebarPaneEl,
  mainEl,
  sb,
  me,
  escapeHtml
}) {
  if (!sidebarPaneEl) return;

  let activeSubview = "calibration";

const screenConfig = {
chemistry: {
  title: "Connection Calibration",
  eyebrow: "Calibration",
  intro: "Personality analysis and compatibility assessment.",
  category: "chemistry",
  progress: 40,
  icon: "fa-solid fa-flask",
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
  progress: 12,
  icon: "fa-regular fa-eye",
  filter: item => {
    const category = String(item.meta?.category || "").toLowerCase();
    if (!category) return true;
    return category === "attraction";
  }
}
};

  const config = screenConfig[screen];
  if (!config) return;

  function getModuleProgressKey() {
  return screen === "chemistry" ? "connection" : "attraction";
}

function getModuleProgressPercent() {
  const progressKey = getModuleProgressKey();

  const valueEl = document.getElementById(`${progressKey}ProgressValue`);
  const fromDom = valueEl?.textContent?.match(/(\d+(?:\.\d+)?)/)?.[1];

  if (fromDom != null) {
    return Math.max(0, Math.min(100, Math.round(Number(fromDom) || 0)));
  }

  return Math.max(0, Math.min(100, Math.round(Number(config.progress || 0))));
}

function getModuleHeroMeta() {
  if (screen === "chemistry") {
    return {
      eyebrow: "Connection",
      title: "Compatibility model",
      intro: "Sole is building a picture of how you attach, communicate, and sustain intimacy."
    };
  }

  return {
    eyebrow: "Attraction",
    title: "Preference model",
    intro: "Sole is building a picture of your visual, romantic, and instinctive attraction patterns."
  };
}

  let runtimeAssignments = [];

  try {
    runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me);
  } catch (error) {
    console.warn("Sidebar screen assignments failed", error);
  }

  const responseState = await loadQuizResponsesFromSupabase(sb, me);
  saveStoredDashboardResponses(me, responseState.responses);
  saveStoredDashboardProgress(me, responseState.progress);

  const filteredAssignments = runtimeAssignments.filter(config.filter);

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
    category: config.category
  });
} catch (error) {
  console.warn("Sidebar insights failed", error);
}

function renderModuleCalibrationList() {
  const completed = filteredAssignments.filter(assignment =>
    getAssignmentResponse(me, assignment.id)?.completed
  );

  const available = filteredAssignments.filter(assignment =>
    !getAssignmentResponse(me, assignment.id)?.completed
  );

const renderCalibrationCard = (assignment, status = "available") => {
  const isCompleted = status === "completed";
  const savedProgress = getAssignmentProgress(me, assignment.id);
  const hasProgress = !!savedProgress && !isCompleted;

  const actionLabel = isCompleted
    ? ""
    : hasProgress
      ? "Continue"
      : "Start";

  return `
    <article
      class="moduleCalibrationTaskCard ${isCompleted ? "isCompleted" : ""}"
      data-module-calibration-card="${escapeAttr(assignment.id)}"
    >
      <div class="moduleCalibrationTaskMain">
        <div class="moduleCalibrationTaskIcon">
          <i class="${escapeAttr(config.icon || "fa-solid fa-circle-dot")}"></i>
        </div>

        <div class="moduleCalibrationTaskText">
          <h4>${escapeHtml(assignment.title || "Untitled calibration")}</h4>
          <p>${escapeHtml(assignment.description || assignment.prompt || "Additional signal mapping required.")}</p>
        </div>
      </div>

      <div class="moduleCalibrationTaskAction">
        ${
          isCompleted
            ? `<span class="moduleCalibrationTaskTick">✓</span>`
            : `
              <button
                type="button"
                class="moduleCalibrationTaskStart"
                data-start-module-assignment="${escapeAttr(assignment.id)}"
              >
                ${escapeHtml(actionLabel)}
              </button>
              <span class="moduleCalibrationTaskArrow">›</span>
            `
        }
      </div>
    </article>
  `;
};

  return `
    <div class="moduleCalibrationList">
      ${
        available.length
          ? `
            <div class="dashboardEyebrow moduleCalibrationSectionEyebrow">Available</div>
            ${available.map(item => renderCalibrationCard(item, "available")).join("")}
          `
          : `
            <div class="sidebarEmptyState">
              <div class="dashboardEyebrow">No calibration tasks required</div>
              <p>No ${escapeHtml(config.title)} tasks are currently available.</p>
            </div>
          `
      }

      ${
        completed.length
          ? `
           <div class="dashboardEyebrow moduleCalibrationSectionEyebrow">Completed</div>
            ${completed.map(item => renderCalibrationCard(item, "completed")).join("")}
          `
          : ""
      }
    </div>
  `;
}


let activeProfileMatrixId = "";
let profileMarkup = await renderModuleProfilePanel(activeProfileMatrixId);

function renderSubviewContent() {
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
  <span class="insightExpandIcon">›</span>
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

sidebarPaneEl.innerHTML = `
<div class="moduleHero moduleHeroMasthead" data-module-kind="${escapeAttr(getModuleProgressKey())}">
  <div class="moduleHeroTop">
    <button class="sidebarBackBtn" type="button" data-sidebar-back>
      <i class="fa-solid fa-arrow-left"></i>
    </button>

    <button class="sidebarInfoBtn" type="button" data-sidebar-info title="About this module">
      <i class="fa-solid fa-info"></i>
    </button>
  </div>

  <div class="moduleHeroMain">
    <div class="moduleHeroCopy">
      <div class="moduleHeroEyebrow">${escapeHtml(moduleMeta.title)}</div>
      <h2>${escapeHtml(moduleMeta.eyebrow)}</h2>
      <p>${escapeHtml(moduleMeta.intro)}</p>
    </div>

    <div class="moduleHeroProgress" aria-label="${escapeAttr(moduleMeta.eyebrow)} calibration progress">
      <div class="moduleHeroProgressText">
        <strong>${moduleProgress}%</strong>
        <span>calibrated</span>
      </div>

      <div class="moduleHeroProgressBar">
        <i style="width:${moduleProgress}%"></i>
      </div>
    </div>
  </div>
</div>

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

<div class="moduleSubviewContent" id="moduleSubviewContent">
  ${renderSubviewContent()}
</div>

`;

const subviewContentEl = sidebarPaneEl.querySelector("#moduleSubviewContent");

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

  window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);
  window.soleMatrixRendering?.animateMatrices?.(sidebarPaneEl);
}

function bindCalibrationCards() {
  subviewContentEl.querySelectorAll("[data-module-calibration-card]").forEach(card => {
    card.addEventListener("click", async () => {
      const assignmentId = card.dataset.moduleCalibrationCard;
      const assignment = filteredAssignments.find(item => item.id === assignmentId);

      if (!assignment) return;
      if (getAssignmentResponse(me, assignment.id)?.completed) return;

      await renderActiveModuleAssignment(assignment);
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
    });
  });
}

bindInsightCards();
bindCalibrationCards();
bindMatrixSwitcher();
window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);

sidebarPaneEl.querySelectorAll("[data-module-subview]").forEach(btn => {
  btn.addEventListener("click", () => {
    activeSubview = btn.dataset.moduleSubview;

    sidebarPaneEl.querySelectorAll("[data-module-subview]").forEach(el => {
      el.classList.toggle("active", el.dataset.moduleSubview === activeSubview);
    });

subviewContentEl.innerHTML = renderSubviewContent();

bindInsightCards();
bindCalibrationCards();
bindMatrixSwitcher();
window.soleMatrixRendering?.bindTooltips?.(sidebarPaneEl);

    if (activeSubview === "calibration") {
      filteredAssignments.forEach(assignment => {
        initAssignmentInteractions({
          assignment,
          mainEl,
          messagesEl: sidebarPaneEl,
          sb,
          me,
          escapeHtml,
          adminPreview: false,
          onRefresh: () => mountSidebarDashboardScreen({
            screen,
            sidebarPaneEl,
            mainEl,
            sb,
            me,
            escapeHtml
          })
        });
      });
    }
  });
});

// const moduleRing = sidebarPaneEl.querySelector(".moduleRingFill");
// const moduleRingWrap = sidebarPaneEl.querySelector(".moduleMiniRing");

// if (moduleRing && moduleRingWrap) {
//   const radius = Number(moduleRing.getAttribute("r")) || 46;
//   const circumference = 2 * Math.PI * radius;
//   const progress = Number(moduleRingWrap.dataset.moduleProgress || 0);
//   const clamped = Math.max(0, Math.min(100, progress));
//   const filled = (clamped / 100) * circumference;

//   moduleRing.style.strokeDasharray = `0 ${circumference}`;

//   requestAnimationFrame(() => {
//     requestAnimationFrame(() => {
//       moduleRing.style.strokeDasharray = `${filled} ${circumference - filled}`;
//     });
//   });
// }

sidebarPaneEl.querySelector("[data-sidebar-info]")?.addEventListener("click", () => {
  alert(`${config.title}\n\n${config.intro}`);
});

  sidebarPaneEl.querySelector("[data-sidebar-back]")?.addEventListener("click", () => {
    window.sidebarDashboardUI?.renderMenu?.();
  });

filteredAssignments.forEach(assignment => {
  initAssignmentInteractions({
    assignment,
    mainEl,
    messagesEl: sidebarPaneEl,
    sb,
    me,
    escapeHtml,
    adminPreview: false,
    onRefresh: () => mountSidebarDashboardScreen({
      screen,
      sidebarPaneEl,
      mainEl,
      sb,
      me,
      escapeHtml
    })
  });
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
          <label>Category</label>
          <select data-task-field="category">
            <option value="general">General</option>
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
                           ${escapeHtml(task.task_type)} · ${escapeHtml(task.status)}
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
          <label>Category</label>
          <select data-insight-field="category">
            <option value="general">General</option>
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
                          ${escapeHtml(insight.category)} · ${escapeHtml(insight.status)}
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
  DASHBOARD_ASSIGNMENTS
};
