// ====== ADMIN VIEWER ======
function setupAdminUI(){
  adminToggleBtn.onclick = () => toggleAdminMode();
}

function setAppMode(mode) {
  appMode = mode;

  appEl.classList.toggle("isAdminMode", mode === "admin");
  appEl.classList.toggle("isPreviewMode", mode === "preview");
}

async function enterAdminMode(screen = "users") {
  setAppMode("admin");
  adminMode = true;

  closeAdminOverlay();

await loadAdminProfiles();

  renderAdminWorkspace(screen);
}

async function updateAdminUserScoring(userId, patch = {}) {
  if (!adminMode || !userId) return null;

  const existingProfile =
    adminProfiles.find(profile => profile?.id === userId) ||
    (me?.id === userId ? me : null) ||
    (adminDashboardProfile?.id === userId ? adminDashboardProfile : null);

  if (!existingProfile) {
    alert("Could not find this user locally. Refresh and try again.");
    return null;
  }

  const nextProfile = {
    ...existingProfile,
    ...patch
  };

  const nullableNumber = value => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const nullableInt = value => {
    if (value === "" || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : null;
  };

  const numberOrZero = value => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const intOrZero = value => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : 0;
  };

  const rpcPayload = {
    p_user_id: userId,

    p_experiment_day_override: nullableInt(nextProfile.experiment_day_override),

    p_score_connection_delta: numberOrZero(nextProfile.score_connection_delta),
    p_score_attraction_delta: numberOrZero(nextProfile.score_attraction_delta),
    p_score_confidence_delta: numberOrZero(nextProfile.score_confidence_delta),
    p_score_candidate_pool_delta: intOrZero(nextProfile.score_candidate_pool_delta),

    p_score_connection_override: nullableNumber(nextProfile.score_connection_override),
    p_score_attraction_override: nullableNumber(nextProfile.score_attraction_override),
    p_score_confidence_override: nullableNumber(nextProfile.score_confidence_override),
    p_score_candidate_pool_override: nullableInt(nextProfile.score_candidate_pool_override),

    p_score_connection_baseline: numberOrZero(nextProfile.score_connection_baseline),
    p_score_attraction_baseline: numberOrZero(nextProfile.score_attraction_baseline),
    p_score_confidence_baseline: numberOrZero(nextProfile.score_confidence_baseline),
    p_score_candidate_pool_baseline: nullableInt(nextProfile.score_candidate_pool_baseline)
  };

  const { data, error } = await sb.rpc("admin_update_user_scoring", rpcPayload);

  if (error) {
    console.error("admin_update_user_scoring failed", error);
    alert(error.message);
    return null;
  }

  const updatedProfile =
    (Array.isArray(data) ? data[0] : data) ||
    nextProfile;

  adminProfiles = adminProfiles
    .filter(Boolean)
    .map(profile => profile.id === userId ? updatedProfile : profile);

  if (adminDashboardProfile?.id === userId) {
    adminDashboardProfile = updatedProfile;
  }

  if (me?.id === userId) {
    me = updatedProfile;
    applyMe();
  }

  return updatedProfile;
}

async function resetAdminUserScoring(userId) {
  const confirmed = window.confirm(
    "Force this user's visible scores back to the minimum test values?"
  );

  if (!confirmed) return null;

  const startingCandidates =
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437;

  return updateAdminUserScoring(userId, {
    experiment_day_override: 1,

    score_connection_delta: 0,
    score_attraction_delta: 0,
    score_confidence_delta: 0,
    score_candidate_pool_delta: 0,

    score_connection_baseline: 0,
    score_attraction_baseline: 0,
    score_confidence_baseline: 0,
    score_candidate_pool_baseline: startingCandidates,

    score_connection_override: 0,
    score_attraction_override: 0,
    score_confidence_override: 0,
    score_candidate_pool_override: startingCandidates
  });
}

async function clearAdminUserScoreOverrides(userId) {
  const confirmed = window.confirm(
    "Clear hard overrides and let this user continue from their baseline/calculated score?"
  );

  if (!confirmed) return null;

  return updateAdminUserScoring(userId, {
    score_connection_override: null,
    score_attraction_override: null,
    score_confidence_override: null,
    score_candidate_pool_override: null
  });
}

async function setAdminUserBaselineFromCurrent(userId) {
  let profile = adminProfiles.find(item => item?.id === userId);
  if (!profile) return null;

  try {
    const { data: freshProfile, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not refresh profile before setting baseline", error);
    } else if (freshProfile) {
      profile = freshProfile;
    }
  } catch (error) {
    console.warn("Profile refresh failed before setting baseline", error);
  }

let messageCount = 0;
let messageStats = {
  count: 0,
  totalChars: 0,
  averageChars: 0
};
let runtimeAssignments = [];

try {
  messageStats = await window.getDailyMessageStats(
    sb,
    profile,
    profile?.score_baseline_set_at || null
  );

  messageCount = messageStats.count;
} catch (error) {
  console.warn("Could not load admin score message stats", error);
}

  try {
    runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, profile, {
      includeLocked: true
    });
  } catch (error) {
    console.warn("Could not load assignments for baseline", error);
  }

  try {
    const responseState = await loadQuizResponsesFromSupabase(sb, profile, {
      userId: profile.id
    });

    saveStoredDashboardResponses(profile, responseState.responses);
    saveStoredDashboardProgress(profile, responseState.progress);
  } catch (error) {
    console.warn("Could not load quiz responses for baseline", error);
  }

const dash = getDashboardState(
  profile,
  messageCount,
  runtimeAssignments,
  messageStats
);

  const confirmed = window.confirm(
    `Set this user's baseline to their current visible scores?\n\nConnection: ${Number(dash.connection || 0).toFixed(1)}%\nAttraction: ${Number(dash.attraction || 0).toFixed(1)}%\nConfidence: ${Number(dash.confidence || 0).toFixed(1)}%\nCandidates: ${Number(dash.remainingCandidates || 0).toLocaleString()}`
  );

  if (!confirmed) return null;

  return updateAdminUserScoring(userId, {
    score_connection_baseline: Number(dash.connection || 0),
    score_attraction_baseline: Number(dash.attraction || 0),
    score_confidence_baseline: Number(dash.confidence || 0),
    score_candidate_pool_baseline: Math.round(Number(dash.remainingCandidates || 0)),

    score_connection_override: null,
    score_attraction_override: null,
    score_confidence_override: null,
    score_candidate_pool_override: null,

    score_connection_delta: 0,
    score_attraction_delta: 0,
    score_confidence_delta: 0,
    score_candidate_pool_delta: 0
  });
}

async function clearAdminUserBaseline(userId) {
  const confirmed = window.confirm(
    "Clear this user's baseline and return them to normal calculated scoring?"
  );

  if (!confirmed) return null;

  return updateAdminUserScoring(userId, {
    score_connection_baseline: 0,
    score_attraction_baseline: 0,
    score_confidence_baseline: 0,
    score_candidate_pool_baseline: null
  });
}

function renderAdminScoringControls(profile) {
  const automaticDay = window.soleExperimentScoring?.getExperimentDayIndex
    ? window.soleExperimentScoring.getExperimentDayIndex({
        ...profile,
        experiment_day_override: null
      })
    : 1;

  const dayOverride = profile.experiment_day_override ?? "";

return `
  <div class="adminScoreControls" data-admin-score-user="${escapeAttr(profile.id)}">
    <div class="adminScoreControlsTitle">Scoring controls</div>

    <div class="adminScoreSummary" data-admin-score-summary="${escapeAttr(profile.id)}">
      <div>
        <span>Connection</span>
        <strong data-admin-score-value="connection">Loading</strong>
      </div>
      <div>
        <span>Attraction</span>
        <strong data-admin-score-value="attraction">Loading</strong>
      </div>
      <div>
        <span>Confidence</span>
        <strong data-admin-score-value="confidence">Loading</strong>
      </div>
      <div>
        <span>Candidates</span>
        <strong data-admin-score-value="candidates">Loading</strong>
      </div>
    </div>

      <label class="adminScoreField">
        <span>Experiment day</span>
        <select data-score-field="experiment_day_override">
          <option value="" ${dayOverride === "" ? "selected" : ""}>
            Auto — Day ${automaticDay}
          </option>
          ${[1, 2, 3, 4, 5].map(day => `
            <option value="${day}" ${Number(dayOverride) === day ? "selected" : ""}>
              Day ${day}
            </option>
          `).join("")}
        </select>
      </label>

            <div class="adminScoreControlsTitle">Starting point</div>

      <div class="adminScoreGrid">
        <label class="adminScoreField">
          <span>Connection start</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_connection_baseline"
            value="${escapeAttr(profile.score_connection_baseline ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Attraction start</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_attraction_baseline"
            value="${escapeAttr(profile.score_attraction_baseline ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Confidence start</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_confidence_baseline"
            value="${escapeAttr(profile.score_confidence_baseline ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Candidates start</span>
          <input
            type="number"
            step="1"
            data-score-field="score_candidate_pool_baseline"
            value="${escapeAttr(profile.score_candidate_pool_baseline ?? "")}"
            placeholder="Default"
          />
        </label>
      </div>

      <div class="adminScoreControlsTitle">Fine tune</div>

      <div class="adminScoreGrid">
        <label class="adminScoreField">
          <span>Connection +/-</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_connection_delta"
            value="${escapeAttr(profile.score_connection_delta ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Attraction +/-</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_attraction_delta"
            value="${escapeAttr(profile.score_attraction_delta ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Confidence +/-</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_confidence_delta"
            value="${escapeAttr(profile.score_confidence_delta ?? 0)}"
          />
        </label>

        <label class="adminScoreField">
          <span>Candidates +/-</span>
          <input
            type="number"
            step="1"
            data-score-field="score_candidate_pool_delta"
            value="${escapeAttr(profile.score_candidate_pool_delta ?? 0)}"
          />
        </label>
      </div>

            <div class="adminScoreControlsTitle">Hard override</div>

      <div class="adminScoreGrid">
        <label class="adminScoreField">
          <span>Force Connection</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_connection_override"
            value="${escapeAttr(profile.score_connection_override ?? "")}"
            placeholder="Calculated"
          />
        </label>

        <label class="adminScoreField">
          <span>Force Attraction</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_attraction_override"
            value="${escapeAttr(profile.score_attraction_override ?? "")}"
            placeholder="Calculated"
          />
        </label>

        <label class="adminScoreField">
          <span>Force Confidence</span>
          <input
            type="number"
            step="0.1"
            data-score-field="score_confidence_override"
            value="${escapeAttr(profile.score_confidence_override ?? "")}"
            placeholder="Calculated"
          />
        </label>

        <label class="adminScoreField">
          <span>Force Candidates</span>
          <input
            type="number"
            step="1"
            data-score-field="score_candidate_pool_override"
            value="${escapeAttr(profile.score_candidate_pool_override ?? "")}"
            placeholder="Calculated"
          />
        </label>
      </div>

      <div class="adminScoreHint">
        Use negative candidate values to narrow the pool faster, e.g. -5000.
      </div>

      <div class="adminScoreActions">
        <button
          type="button"
          class="btn btnGhost"
      data-admin-save-fine-tune="${escapeAttr(profile.id)}"
        >
         Save fine tune
        </button>

        <button
  type="button"
  class="btn btnGhost"
  data-admin-save-baseline="${escapeAttr(profile.id)}"
>
  Save baseline
</button>

<button
  type="button"
  class="btn btnGhost"
  data-admin-apply-hard-override="${escapeAttr(profile.id)}"
>
  Apply hard override
</button>

        <button
          type="button"
          class="btn btnGhost"
          data-admin-reset-score="${escapeAttr(profile.id)}"
        >
          Reset scoring
        </button>

                <button
          type="button"
          class="btn btnGhost"
          data-admin-clear-score-overrides="${escapeAttr(profile.id)}"
        >
          Clear overrides
        </button>

        <button
          type="button"
          class="btn btnGhost"
          data-admin-set-baseline-current="${escapeAttr(profile.id)}"
        >
          Set baseline from current
        </button>

        <button
          type="button"
          class="btn btnGhost"
          data-admin-clear-baseline="${escapeAttr(profile.id)}"
        >
          Clear baseline
        </button>
      </div>
    </div>
  `;
}

function readAdminScoreFields(wrap, allowedFields) {
  const patch = {};

  const nullableFields = new Set([
    "experiment_day_override",
    "score_connection_override",
    "score_attraction_override",
    "score_confidence_override",
    "score_candidate_pool_override",
    "score_candidate_pool_baseline"
  ]);

  const integerFields = new Set([
    "experiment_day_override",
    "score_candidate_pool_delta",
    "score_candidate_pool_override",
    "score_candidate_pool_baseline"
  ]);

  wrap.querySelectorAll("[data-score-field]").forEach(input => {
    const field = input.dataset.scoreField;

    if (!allowedFields.includes(field)) return;

    const rawValue = input.value;

    if (nullableFields.has(field) && rawValue === "") {
      patch[field] = null;
      return;
    }

    if (integerFields.has(field)) {
      patch[field] = rawValue === "" ? null : Math.round(Number(rawValue) || 0);
      return;
    }

    patch[field] = Number(rawValue) || 0;
  });

  return patch;
}

function getAdminScoreWrap(root, userId) {
  return root.querySelector(`[data-admin-score-user="${CSS.escape(userId)}"]`);
}

function bindAdminScoringControls(root = document) {
  root.querySelectorAll("[data-admin-save-fine-tune]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminSaveFineTune;
      const wrap = getAdminScoreWrap(root, userId);
      if (!wrap) return;

      const patch = readAdminScoreFields(wrap, [
        "experiment_day_override",
        "score_connection_delta",
        "score_attraction_delta",
        "score_confidence_delta",
        "score_candidate_pool_delta"
      ]);

      const updated = await updateAdminUserScoring(userId, patch);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Fine tune saved.");
    });
  });

  root.querySelectorAll("[data-admin-save-baseline]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminSaveBaseline;
      const wrap = getAdminScoreWrap(root, userId);
      if (!wrap) return;

      const patch = readAdminScoreFields(wrap, [
        "experiment_day_override",
        "score_connection_baseline",
        "score_attraction_baseline",
        "score_confidence_baseline",
        "score_candidate_pool_baseline"
      ]);

      const updated = await updateAdminUserScoring(userId, patch);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Baseline saved.");
    });
  });

  root.querySelectorAll("[data-admin-apply-hard-override]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminApplyHardOverride;
      const wrap = getAdminScoreWrap(root, userId);
      if (!wrap) return;

      const patch = readAdminScoreFields(wrap, [
        "experiment_day_override",
        "score_connection_override",
        "score_attraction_override",
        "score_confidence_override",
        "score_candidate_pool_override"
      ]);

      const updated = await updateAdminUserScoring(userId, patch);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Hard override applied.");
    });
  });

  root.querySelectorAll("[data-admin-reset-score]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminResetScore;

      const updated = await resetAdminUserScoring(userId);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Scoring reset.");
    });
  });

  root.querySelectorAll("[data-admin-clear-score-overrides]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminClearScoreOverrides;

      const updated = await clearAdminUserScoreOverrides(userId);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Score overrides cleared.");
    });
  });

  root.querySelectorAll("[data-admin-set-baseline-current]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminSetBaselineCurrent;

      const updated = await setAdminUserBaselineFromCurrent(userId);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Baseline set.");
    });
  });

  root.querySelectorAll("[data-admin-clear-baseline]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.adminClearBaseline;

      const updated = await clearAdminUserBaseline(userId);
      if (!updated) return;

      renderAdminWorkspaceContent("users");
      alert("Baseline cleared.");
    });
  });
}

async function hydrateAdminScoreSummaries(root = document) {
  const summaries = Array.from(root.querySelectorAll("[data-admin-score-summary]"));

  

  await Promise.all(
    summaries.map(async summary => {
      const userId = summary.dataset.adminScoreSummary;
      const profile = adminProfiles.find(item => item?.id === userId);

      if (!profile) return;

    let messageCount = 0;
let messageStats = {
  count: 0,
  totalChars: 0,
  averageChars: 0
};
let runtimeAssignments = [];

try {
  messageStats = await window.getDailyMessageStats(
    sb,
    profile,
    profile?.score_baseline_set_at || null
  );

  messageCount = messageStats.count;
} catch (error) {
  console.warn("Could not load admin score message stats", error);
}

try {
  runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, profile, {
    includeLocked: true
  });
} catch (error) {
  console.warn("Could not load admin score assignments", error);
}

try {
  const responseState = await loadQuizResponsesFromSupabase(sb, profile, {
    userId: profile.id
  });

  saveStoredDashboardResponses(profile, responseState.responses);
  saveStoredDashboardProgress(profile, responseState.progress);
} catch (error) {
  console.warn("Could not load admin score quiz responses", error);
}

const dash = getDashboardState(profile, messageCount, runtimeAssignments, messageStats);

      const connectionEl = summary.querySelector('[data-admin-score-value="connection"]');
      const attractionEl = summary.querySelector('[data-admin-score-value="attraction"]');
      const confidenceEl = summary.querySelector('[data-admin-score-value="confidence"]');
      const candidatesEl = summary.querySelector('[data-admin-score-value="candidates"]');

      if (connectionEl) connectionEl.textContent = `${Number(dash.connection || 0).toFixed(1)}%`;
      if (attractionEl) attractionEl.textContent = `${Number(dash.attraction || 0).toFixed(1)}%`;
      if (confidenceEl) confidenceEl.textContent = `${Number(dash.confidence || 0).toFixed(1)}%`;
      if (candidatesEl) candidatesEl.textContent = Number(dash.remainingCandidates || 0).toLocaleString();
    })
  );
}

async function exitAdminMode() {
  if (adminActualProfile) {
    me = adminActualProfile;
    adminActualProfile = null;
  }

  setAppMode("participant");
  adminMode = false;
  adminPreviewingUser = null;

  clearTimeout(previewDraftClearTimeout);
previewDraftClearTimeout = null;
textInput.value = "";

  assignedPartner = await getAssignedPartner(me.id);

  window.sidebarDashboardUI?.renderMenu?.();

  await renderWelcomePanel();
}

async function enterPreviewMode(profile) {
  adminActualProfile = me;

  setAppMode("preview");
  adminMode = true;
  adminPreviewingUser = profile;

  me = profile;
  assignedPartner = await getAssignedPartner(profile.id);

  closeAdminOverlay();

  window.sidebarDashboardUI?.renderMenu?.();

  await renderPreviewShell(profile);
}

async function toggleAdminMode(){
  const effectiveAdmin = adminActualProfile || me;

  if (!effectiveAdmin?.is_admin) return;

  if (appMode === "admin") {
    await exitAdminMode();
    return;
  }

  if (appMode === "preview") {
    if (adminActualProfile) {
      me = adminActualProfile;
      adminActualProfile = null;
      assignedPartner = await getAssignedPartner(me.id);
    }

    await enterAdminMode(adminScreen || "users");
    return;
  }

  await enterAdminMode("users");
}

function renderAdminWorkspace(screen = "users") {
  adminScreen = screen;

  messagesEl.innerHTML = `
    <div class="adminWorkspaceShell">
      <aside class="adminWorkspaceNav">
        <div class="adminWorkspaceTitle">
          <h2>Admin</h2>
          <p>Control centre</p>
        </div>

        ${["users", "tasks", "pairings", "chats", "insights", "templates"].map(item => `
          <button
            type="button"
            class="adminNavBtn ${screen === item ? "isActive" : ""}"
            data-admin-workspace-screen="${item}"
          >
            ${item[0].toUpperCase() + item.slice(1)}
          </button>
        `).join("")}

        <button type="button" class="adminNavBtn" id="exitAdminModeBtn">
          Exit admin
        </button>
      </aside>

      <main class="adminWorkspaceContent" id="adminWorkspaceContent"></main>
    </div>
  `;

  messagesEl.querySelector("#exitAdminModeBtn")?.addEventListener("click", exitAdminMode);

  messagesEl.querySelectorAll("[data-admin-workspace-screen]").forEach(btn => {
    btn.addEventListener("click", () => {
      renderAdminWorkspace(btn.dataset.adminWorkspaceScreen);
    });
  });

  renderAdminWorkspaceContent(screen);
}

function renderAdminWorkspaceContent(screen) {
  const content = document.getElementById("adminWorkspaceContent");
  if (!content) return;

  if (screen === "users") return renderAdminUsersWorkspace(content);
  if (screen === "tasks") return renderAdminTasksWorkspace(content);
  if (screen === "pairings") return renderAdminPairingsWorkspace(content);
  if (screen === "chats") return renderAdminChatsWorkspace(content);
  if (screen === "insights") return renderAdminInsightsWorkspace(content);
  if (screen === "templates") return renderAdminTemplatesWorkspace(content);
}

function renderAdminUsersWorkspace(content) {
  content.innerHTML = `
    <section class="adminPanel">
      <h3>Users</h3>

      <div class="adminUserList">
        ${adminProfiles.map(profile => {
          const partner = getAdminUserPartner(profile.id);

          return `
            <details class="adminUserAccordion">
              <summary class="adminUserSummary">
                <div>
                  <strong>${escapeHtml(profile.display_name)}</strong>
                  <div class="muted">${escapeHtml(profile.username || profile.email || "")}</div>
                </div>

                <div class="muted">
                  ${partner ? `Paired with ${escapeHtml(partner.display_name)}` : "Not paired"}
                </div>
              </summary>

              <div class="adminUserAccordionBody">
<div class="adminUserStats adminUserStatsGrid">
  <div>
    <span class="muted">Pairing</span>
    <strong>${partner ? escapeHtml(partner.display_name) : "None"}</strong>
  </div>

  <div>
    <span class="muted">Tasks</span>
    <strong data-admin-user-task-count="${escapeAttr(profile.id)}">Loading</strong>
  </div>

  <div>
    <span class="muted">Insights</span>
    <strong data-admin-user-insight-count="${escapeAttr(profile.id)}">Loading</strong>
  </div>

  <div>
    <span class="muted">Quiz responses</span>
    <strong>Available</strong>
  </div>
</div>

${renderAdminScoringControls(profile)}

                <div class="adminUserActions">
                  <button class="btn btnGhost" data-view-as-user="${profile.id}">
                    View as ${escapeHtml(profile.display_name)}
                  </button>

                  <button class="btn btnGhost" data-view-responses="${profile.id}">
                    View responses
                  </button>

                  <button class="btn btnGhost" data-admin-user-tasks="${profile.id}">
                    User tasks
                  </button>

                  <button class="btn btnGhost" data-admin-user-insights="${profile.id}">
                    User insights
                  </button>
                </div>
              </div>
            </details>
          `;
        }).join("")}
      </div>
    </section>
  `;

  adminProfiles.forEach(async profile => {
  try {
    const [tasks, insights] = await Promise.all([
      window.dashboardUI.loadUserTasksFromSupabase?.(sb, profile.id),
      window.dashboardUI.loadUserInsightsFromSupabase?.(sb, profile.id)
    ]);

    const taskCountEl = content.querySelector(
      `[data-admin-user-task-count="${profile.id}"]`
    );

    const insightCountEl = content.querySelector(
      `[data-admin-user-insight-count="${profile.id}"]`
    );

    if (taskCountEl) {
      const activeTasks = (tasks || []).filter(
        task => task.status === "active"
      ).length;

      const completedTasks = (tasks || []).filter(
        task => task.status === "completed"
      ).length;

      taskCountEl.textContent =
        `${activeTasks} active / ${completedTasks} done`;
    }

    if (insightCountEl) {
      const revealed = (insights || []).filter(
        insight => insight.status === "revealed"
      ).length;

      const drafts = (insights || []).filter(
        insight => insight.status === "draft"
      ).length;

      insightCountEl.textContent =
        `${revealed} revealed / ${drafts} draft`;
    }
  } catch (error) {
    console.warn("Could not load user admin stats", profile.id, error);
  }
});

  content.querySelectorAll("[data-view-as-user]").forEach(btn => {
    btn.addEventListener("click", () => {
      const profile = adminProfiles.find(p => p.id === btn.dataset.viewAsUser);
      if (profile) enterPreviewMode(profile);
    });
  });

  content.querySelectorAll("[data-view-responses]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const profile = adminProfiles.find(p => p.id === btn.dataset.viewResponses);
      if (!profile) return;

      setAppMode("preview");
      adminMode = true;
      adminPreviewingUser = profile;

      chatTitle.textContent = `Responses: ${profile.display_name}`;
      chatSubtitle.textContent = "Quiz responses";

      await window.dashboardUI.mountWelcomeDashboard({
        messagesEl,
        mainEl,
        sb,
        me: profile,
        escapeHtml,
        adminPreview: true
      });

      textInput.disabled = true;
      updateSendButton();
    });
  });

  content.querySelectorAll("[data-admin-user-tasks]").forEach(btn => {
  btn.addEventListener("click", () => {
    renderAdminTasksWorkspace(content, btn.dataset.adminUserTasks);
  });
});

content.querySelectorAll("[data-admin-user-insights]").forEach(btn => {
  btn.addEventListener("click", () => {
    renderAdminInsightsWorkspace(content, btn.dataset.adminUserInsights);
  });
});

bindAdminScoringControls(content);
hydrateAdminScoreSummaries(content);
}

function renderAdminTasksWorkspace(content, selectedUserId = "") {
  const selectedUser = adminProfiles.find(p => p.id === selectedUserId) || adminProfiles[0];

  content.innerHTML = `
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Tasks</h3>
          <p class="muted">Create reply goals and manual tasks for individual users.</p>
        </div>
      </div>

      <div class="adminFormRow">
        <select id="adminTaskUserSelect">
         ${adminProfiles.filter(Boolean).map(profile => `
            <option value="${escapeAttr(profile.id)}" ${selectedUser?.id === profile.id ? "selected" : ""}>
              ${escapeHtml(profile.display_name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div id="adminTasksMount"></div>
    </section>
  `;

  const select = content.querySelector("#adminTaskUserSelect");

  select?.addEventListener("change", () => {
    renderAdminTasksWorkspace(content, select.value);
  });

  if (selectedUser) {
    window.dashboardUI.mountAdminUserTasks?.({
      mountEl: content.querySelector("#adminTasksMount"),
      sb,
      me,
      user: selectedUser,
      escapeHtml,
      escapeAttr
    });
  }
}

function renderAdminPairingsWorkspace(content) {
  const pairedIds = new Set();
  const pairedGroups = [];

  adminPairings.forEach(pairing => {
    const userA = adminProfiles.find(p => p.id === pairing.user_a);
    const userB = adminProfiles.find(p => p.id === pairing.user_b);

    if (!userA || !userB) return;

    pairedIds.add(userA.id);
    pairedIds.add(userB.id);

    pairedGroups.push({ pairing, userA, userB });
  });

  const unpairedUsers = adminProfiles.filter(profile => {
    return !pairedIds.has(profile.id);
  });

  content.innerHTML = `
    <section class="adminPanel">
      <h3>Pairings</h3>

      <div class="adminUserList">
        <div class="adminUserSection">
          <h4>Active pairs</h4>

          ${pairedGroups.length
            ? pairedGroups.map(group => `
              <article class="adminPairRow adminUserRow">
                <div>
                  <strong>
                    ${escapeHtml(group.userA.display_name)}
                    ↔
                    ${escapeHtml(group.userB.display_name)}
                  </strong>

                  <div class="muted">
                    ${escapeHtml(group.userA.username || "")}
                    /
                    ${escapeHtml(group.userB.username || "")}
                  </div>
                </div>

                <div class="adminUserActions">
                  <button class="btn btnGhost" data-view-as-user="${group.userA.id}">
                    View as ${escapeHtml(group.userA.display_name)}
                  </button>

                  <button class="btn btnGhost" data-view-as-user="${group.userB.id}">
                    View as ${escapeHtml(group.userB.display_name)}
                  </button>

                  <button
                    class="btn btnGhost"
                    data-open-pair-chat="${group.userA.id}"
                    data-open-pair-chat-b="${group.userB.id}"
                  >
                    Open pair chat
                  </button>

                  <button class="btn btnGhost" data-unpair-user="${group.userA.id}">
                    Unpair
                  </button>
                </div>
              </article>
            `).join("")
            : `<p class="muted">No active pairs.</p>`
          }
        </div>

        <div class="adminUserSection">
          <h4>Unpaired users</h4>

          ${unpairedUsers.length
            ? unpairedUsers.map(profile => `
              <article class="adminUserRow">
                <div>
                  <strong>${escapeHtml(profile.display_name)}</strong>
                  <div class="muted">${escapeHtml(profile.username || profile.email || "")}</div>
                </div>

                <div class="adminUserActions">
                  <select data-pair-select="${profile.id}">
                    <option value="">Pair with...</option>
                    ${unpairedUsers
                      .filter(p => p.id !== profile.id)
                      .map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`)
                      .join("")}
                  </select>

                  <button class="btn btnGhost" data-pair-user="${profile.id}">
                    Pair
                  </button>

                  <button class="btn btnGhost" data-view-as-user="${profile.id}">
                    View as user
                  </button>
                </div>
              </article>
            `).join("")
            : `<p class="muted">No unpaired users.</p>`
          }
        </div>
      </div>
    </section>
  `;

  content.querySelectorAll("[data-view-as-user]").forEach(btn => {
    btn.addEventListener("click", () => {
      const profile = adminProfiles.find(p => p.id === btn.dataset.viewAsUser);
      if (profile) enterPreviewMode(profile);
    });
  });

  content.querySelectorAll("[data-pair-user]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userA = btn.dataset.pairUser;
      const select = content.querySelector(`[data-pair-select="${userA}"]`);
      const userB = select?.value;

      if (!userB) return alert("Choose a user to pair with.");

      await createUserPairing(userA, userB);
      await loadAdminProfiles();
      renderAdminPairingsWorkspace(content);
    });
  });

  content.querySelectorAll("[data-unpair-user]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userA = btn.dataset.unpairUser;
      const partner = getAdminUserPartner(userA);

      if (!partner) return alert("This user is not currently paired.");

      await clearUserPairing(userA, partner.id);
      await loadAdminProfiles();
      renderAdminPairingsWorkspace(content);
    });
  });

  content.querySelectorAll("[data-open-pair-chat]").forEach(btn => {
    btn.addEventListener("click", async () => {
      viewA = btn.dataset.openPairChat;
      viewB = btn.dataset.openPairChatB;

      await loadThread(viewA, viewB, viewA);
      await subscribeRealtime(viewA, viewB, viewA);

      chatTitle.textContent = "Admin chat view";
      chatSubtitle.textContent = "Live pair thread";
      textInput.disabled = false;
      updateSendButton();
    });
  });
}

function renderAdminChatsWorkspace(content) {
  content.innerHTML = `
    <section class="adminPanel">
      <h3>Chats</h3>
      <p class="muted">Open live user threads and inject system messages.</p>
    </section>
  `;
}

function renderAdminInsightsWorkspace(content, selectedUserId = "") {
  const selectedUser = adminProfiles.find(p => p.id === selectedUserId) || adminProfiles[0];

  content.innerHTML = `
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Insights</h3>
          <p class="muted">Create and reveal insight cards for individual users.</p>
        </div>
      </div>

      <div class="adminFormRow">
        <select id="adminInsightUserSelect">
          ${adminProfiles.filter(Boolean).map(profile => `
            <option value="${escapeAttr(profile.id)}" ${selectedUser?.id === profile.id ? "selected" : ""}>
              ${escapeHtml(profile.display_name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div id="adminInsightsMount"></div>
    </section>
  `;

  const select = content.querySelector("#adminInsightUserSelect");

  select?.addEventListener("change", () => {
    renderAdminInsightsWorkspace(content, select.value);
  });

  if (selectedUser) {
    window.dashboardUI.mountAdminUserInsights?.({
      mountEl: content.querySelector("#adminInsightsMount"),
      sb,
      me,
      user: selectedUser,
      escapeHtml,
      escapeAttr
    });
  }
}

async function renderAdminTemplatesWorkspace(content) {
  chatTitle.textContent = "Admin: Templates";
  chatSubtitle.textContent = "Quiz templates";

  content.innerHTML = `
    <section class="adminPanel adminTemplatesPanel">
      <div class="adminPanelHeader">
        <h3>Templates</h3>
        <p class="muted">Create and edit quiz templates.</p>
      </div>

      <div id="adminTemplatesMount"></div>
    </section>
  `;

  const mountEl = document.getElementById("adminTemplatesMount");

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl: mountEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    adminHome: true
  });
}

async function renderPreviewShell(profile) {
  const previewPartner = await getAssignedPartner(profile.id);

  chatTitle.textContent = `Preview: ${profile.display_name}`;
  chatSubtitle.textContent = previewPartner
    ? `Chat with ${previewPartner.display_name}`
    : "Viewing as user";

  messagesEl.innerHTML = `
    <div class="adminPreviewRibbon">
      <strong>Viewing as ${escapeHtml(profile.display_name)}</strong>

      <button type="button" class="btn btnGhost" id="exitPreviewBtn">
        Exit preview
      </button>
    </div>
  `;

  document.getElementById("exitPreviewBtn")?.addEventListener("click", async () => {
    if (adminActualProfile) {
      me = adminActualProfile;
      adminActualProfile = null;
      assignedPartner = await getAssignedPartner(me.id);
    }

    await enterAdminMode(adminScreen || "users");
  });

  if (previewPartner) {
    them = previewPartner;

    await loadThread(profile.id, previewPartner.id, profile.id);
    await subscribeRealtime(profile.id, previewPartner.id, profile.id);

    channel.on("broadcast", { event: "draft_update" }, ({ payload }) => {
  if (payload.sender !== profile.id) return;
  mirrorPreviewDraft(payload.text || "");
});

channel.on("broadcast", { event: "draft_clear" }, ({ payload }) => {
  if (payload.sender !== profile.id) return;
  mirrorPreviewDraft("");
});

    textInput.disabled = true;
    updateSendButton();
    return;
  }

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me: profile,
    escapeHtml,
    adminPreview: true
  });

  textInput.disabled = true;
  updateSendButton();
}

function openAdminOverlay(screen = "users") {
  let overlay = document.getElementById("adminOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "adminOverlay";
    overlay.className = "adminOverlay";
    document.body.appendChild(overlay);
  }

  overlay.hidden = false;
  renderAdminOverlayScreen(screen);
}

function closeAdminOverlay() {
  const overlay = document.getElementById("adminOverlay");
  if (overlay) overlay.hidden = true;
  adminOverlayOpen = false;
}

async function loadAdminThread(){
  if (!adminMode) return;

  viewA = adminA.value;
  viewB = adminB.value;

  if (!viewA || !viewB || viewA === viewB){
    return alert("Pick two different users.");
  }

  adminDashboardProfile = null;

  // Get names for header
  const { data: profs, error } = await sb
    .from("profiles")
    .select("id,display_name")
    .in("id", [viewA, viewB]);

  if (error) return alert(error.message);

  const aName = profs.find(p => p.id === viewA)?.display_name || "A";
  const bName = profs.find(p => p.id === viewB)?.display_name || "B";

  chatTitle.textContent = `ADMIN: ${aName} ↔ ${bName}`;
  chatSubtitle.textContent = "Read-only";

  await loadThread(viewA, viewB, /*alignAs*/ viewA);
  await subscribeRealtime(viewA, viewB, /*alignAs*/ viewA);
  updateSendButton();
  textInput.disabled = false;
}

async function loadAdminDashboard(){
  if (!adminMode) return;

  const userId = adminDashboardUser.value;
  if (!userId) {
    alert("Pick a user.");
    return;
  }

  const { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    alert(error?.message || "Could not load profile.");
    return;
  }

  adminDashboardProfile = profile;
  them = null;
  viewA = null;
  viewB = null;

  chatTitle.textContent = `ADMIN: ${profile.display_name}`;
  chatSubtitle.textContent = "Dashboard preview";

  if (channel) {
    await sb.removeChannel(channel);
    channel = null;
  }

  textInput.disabled = true;
  updateSendButton();

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me: profile,
    escapeHtml,
    adminPreview: true
  });

  updateNoChatState();
  closeMobileSidebar();
}


async function loadAdminProfiles(){
  const [{ data: profiles, error: profilesError }, { data: pairings, error: pairingsError }] =
    await Promise.all([
      sb
        .from("profiles")
        .select("*")
        .eq("is_admin", false)
        .order("display_name"),

      sb
        .from("user_pairings")
        .select("user_a,user_b,is_active,created_at")
        .eq("is_active", true)
    ]);

  if (profilesError) {
    alert(profilesError.message);
    adminProfiles = [];
    return;
  }

  if (pairingsError) {
    console.warn(pairingsError);
  }

  adminProfiles = profiles || [];
  adminPairings = pairings || [];
}

function getAdminUserPairing(profileId) {
  return adminPairings.find(pairing =>
    pairing.user_a === profileId || pairing.user_b === profileId
  );
}

function getAdminUserPartner(profileId) {
  const pairing = getAdminUserPairing(profileId);
  if (!pairing) return null;

  const partnerId = pairing.user_a === profileId
    ? pairing.user_b
    : pairing.user_a;

  return adminProfiles.find(profile => profile.id === partnerId) || null;
}


function renderAdminShell(activeScreen = adminScreen){
  const overlay = document.getElementById("adminOverlay");

  overlay.innerHTML = `
    <div class="adminOverlayPanel">
      <div class="adminOverlayHeader">
        <div>
          <h2>Admin</h2>
          <p>Control centre</p>
        </div>

        <button type="button" class="btn btnGhost" id="closeAdminOverlayBtn">
          Close
        </button>
      </div>

      <div class="adminWorkspaceNav">
        ${["users", "tasks", "pairings", "chats", "insights", "templates"].map(screen => `
          <button
            type="button"
            class="adminNavBtn ${activeScreen === screen ? "isActive" : ""}"
            data-admin-screen="${screen}"
          >
            ${screen[0].toUpperCase() + screen.slice(1)}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  overlay.querySelector("#closeAdminOverlayBtn").onclick = closeAdminOverlay;

  overlay.querySelectorAll("[data-admin-screen]").forEach(btn => {
    btn.addEventListener("click", () => {
      closeAdminOverlay();
      renderAdminPage(btn.dataset.adminScreen);
    });
  });
}

async function renderAdminPage(screen = "users") {
  adminMode = true;
  adminScreen = screen;

  chatTitle.textContent =
    `Admin: ${screen[0].toUpperCase() + screen.slice(1)}`;

  chatSubtitle.textContent = "Control centre";

  textInput.disabled = true;
  updateSendButton();

  if (channel) {
    await sb.removeChannel(channel);
    channel = null;
  }

  them = null;
  viewA = null;
  viewB = null;
  adminDashboardProfile = null;

  updateNoChatState();

  if (!adminProfiles.length) {
    await loadAdminProfiles();
  }

  if (screen === "users") {
    renderAdminUsersPage();
    return;
  }

  if (screen === "tasks") {
    renderAdminTasksScreen();
    return;
  }

  if (screen === "pairings") {
    renderAdminPairingsScreen();
    return;
  }

  if (screen === "chats") {
    renderAdminChatsScreen();
    return;
  }

  if (screen === "insights") {
    renderAdminInsightsScreen();
    return;
  }

  if (screen === "templates") {
    renderAdminTemplatesScreen();
    return;
  }
}

function renderAdminUsersPage() {
  messagesEl.innerHTML = `
    <div class="adminPage">
      <section class="adminPanel">
        <h3>Users</h3>

        <div class="adminUserList">
         ${adminProfiles.filter(Boolean).map(profile => `
            <article class="adminUserRow">
              <div>
                <strong>${escapeHtml(profile.display_name)}</strong>
            <div class="muted">${escapeHtml(profile.username || profile.email || "")}</div>
<div class="muted">
  ${
    getAdminUserPartner(profile.id)
      ? `Paired with ${escapeHtml(getAdminUserPartner(profile.id).display_name)}`
      : `Not paired`
  }
</div>
              </div>

              <div class="adminUserActions">
                <button class="btn btnGhost" data-view-as-user="${profile.id}">
                  View as user
                </button>
                <button class="btn btnGhost" data-admin-user-tasks="${profile.id}">
                  Tasks
                </button>
                <button class="btn btnGhost" data-admin-user-chat="${profile.id}">
                  Open chat
                </button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;

  messagesEl.querySelectorAll("[data-view-as-user]").forEach(btn => {
    btn.addEventListener("click", () => {
      const profile = adminProfiles.find(p => p.id === btn.dataset.viewAsUser);
      if (profile) enterAdminUserPreview(profile);
    });
  });
}

async function renderAdminOverlayScreen(screen = "users"){
  adminScreen = screen;

  if (screen === "users") return renderAdminUsersScreen();
  if (screen === "tasks") return renderAdminTasksScreen();
  if (screen === "pairings") return renderAdminPairingsScreen();
  if (screen === "chats") return renderAdminChatsScreen();
  if (screen === "insights") return renderAdminInsightsScreen();
  if (screen === "templates") return renderAdminTemplatesScreen();
}

function renderAdminUsersScreen(){
  renderAdminShell("users", `
    <section class="adminPanel">
      <h3>Users</h3>

      <div class="adminUserList">
       ${adminProfiles.filter(Boolean).map(profile => `
          <article class="adminUserRow">
            <div>
              <strong>${escapeHtml(profile.display_name)}</strong>
              <div class="muted">${escapeHtml(profile.username || profile.email || "")}</div>
            </div>

            <div class="adminUserActions">
              <button class="btn btnGhost" data-view-as-user="${profile.id}">
                View as user
              </button>
              <button class="btn btnGhost" data-admin-user-tasks="${profile.id}">
                Tasks
              </button>
              <button class="btn btnGhost" data-admin-user-chat="${profile.id}">
                Open chat
              </button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `);

const overlay = document.getElementById("adminOverlay");

overlay.querySelectorAll("[data-view-as-user]").forEach(btn => {
    btn.addEventListener("click", () => {
      const profile = adminProfiles.find(p => p.id === btn.dataset.viewAsUser);
      if (profile) enterAdminUserPreview(profile);
    });
  });

overlay.querySelectorAll("[data-admin-user-tasks]").forEach(btn => {
    btn.addEventListener("click", () => {
      renderAdminTasksScreen(btn.dataset.adminUserTasks);
    });
  });
}

async function enterAdminUserPreview(profile){
  closeAdminOverlay();

  adminMode = true;
  adminPreviewingUser = profile;

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me: profile,
    escapeHtml,
    adminPreview: true
  });

  await renderSidebar(); // later we can make this render as that user too

  chatTitle.textContent = `Preview: ${profile.display_name}`;
  chatSubtitle.textContent = "Viewing as user";
}

function renderAdminTasksScreen(userId = ""){
  const selectedUser = adminProfiles.find(p => p.id === userId);

  renderAdminShell("tasks", `
    <section class="adminPanel">
      <h3>Tasks</h3>
      <p class="muted">
        ${selectedUser
          ? `Managing tasks for ${escapeHtml(selectedUser.display_name)}.`
          : "Assign quizzes, reply goals, uploads, insight unlocks, or custom tasks."
        }
      </p>

      <div class="adminTaskGrid">
        <button class="btn">Assign quiz task</button>
        <button class="btn btnGhost">Assign message goal</button>
        <button class="btn btnGhost">Assign upload task</button>
        <button class="btn btnGhost">Assign insight unlock</button>
      </div>
    </section>
  `);
}

function renderAdminPairingsScreen(){
  renderAdminShell("pairings", `
    <section class="adminPanel">
      <h3>Pairings</h3>

      <div class="adminFormRow">
        <select id="adminPairA">
          ${adminProfiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("")}
        </select>

        <select id="adminPairB">
          ${adminProfiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("")}
        </select>

        <button class="btn" id="adminCreatePairBtn">Create pair</button>
        <button class="btn btnGhost" id="adminClearPairBtn">Clear pair</button>
      </div>
    </section>
  `);

  document.getElementById("adminCreatePairBtn")?.addEventListener("click", async () => {
    await createUserPairing(
      document.getElementById("adminPairA").value,
      document.getElementById("adminPairB").value
    );
  });

  document.getElementById("adminClearPairBtn")?.addEventListener("click", async () => {
    await clearUserPairing(
      document.getElementById("adminPairA").value,
      document.getElementById("adminPairB").value
    );
  });
}

function renderAdminChatsScreen(){
  renderAdminShell("chats", `
    <section class="adminPanel">
      <h3>Chats</h3>

      <div class="adminFormRow">
        <select id="adminChatA">
          ${adminProfiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("")}
        </select>

        <select id="adminChatB">
          ${adminProfiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("")}
        </select>

        <button class="btn" id="adminOpenChatBtn">Open live chat</button>
      </div>
    </section>
  `);

  document.getElementById("adminOpenChatBtn")?.addEventListener("click", async () => {
    viewA = document.getElementById("adminChatA").value;
    viewB = document.getElementById("adminChatB").value;

    if (!viewA || !viewB || viewA === viewB) return alert("Pick two different users.");

    await loadThread(viewA, viewB, viewA);
    await subscribeRealtime(viewA, viewB, viewA);

    chatTitle.textContent = "Admin chat view";
    chatSubtitle.textContent = "Live thread";
    textInput.disabled = false;
    updateSendButton();
  });
}

function renderAdminInsightsScreen(){
  renderAdminShell("insights", `
    <section class="adminPanel">
      <h3>Insights</h3>
      <p class="muted">Later: create insight cards and assign/reveal them to users.</p>
    </section>
  `);
}

async function renderAdminTemplatesScreen(){
  chatTitle.textContent = "Admin";
  chatSubtitle.textContent = "Quiz templates";

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    adminHome: true
  });
}
