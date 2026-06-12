// ====== ADMIN VIEWER ======
let adminPairPanelChannel = null;
let adminPairOverridePanelChannel = null;
let adminPairPresenceChannel = null;
let adminPairPanelDraftTimeout = null;
let adminChatsOverviewChannel = null;

async function cleanupAdminPairTranscriptChannels() {
  if (adminPairPanelChannel) {
    await sb.removeChannel(adminPairPanelChannel);
    adminPairPanelChannel = null;
  }

  if (adminPairOverridePanelChannel) {
    await sb.removeChannel(adminPairOverridePanelChannel);
    adminPairOverridePanelChannel = null;
  }

  if (adminPairPresenceChannel) {
    await sb.removeChannel(adminPairPresenceChannel);
    adminPairPresenceChannel = null;
  }

    if (adminChatsOverviewChannel) {
    await sb.removeChannel(adminChatsOverviewChannel);
    adminChatsOverviewChannel = null;
  }

  if (adminPairPanelDraftTimeout) {
    clearTimeout(adminPairPanelDraftTimeout);
    adminPairPanelDraftTimeout = null;
  }
}

async function openAdminFromAnywhere(screen) {
  const effectiveAdmin = adminActualProfile || me;

  if (!effectiveAdmin?.is_admin) {
    console.warn("Admin button clicked, but current profile is not admin", effectiveAdmin);
    return;
  }

  await enterAdminMode(
    screen || (window.matchMedia("(max-width: 768px)").matches ? "chats" : "users")
  );
}

function setupAdminUI() {
  adminToggleBtn.onclick = async () => {
    await openAdminFromAnywhere();
  };

  if (!document.getElementById("mobileAdminQuickBtn")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "mobileAdminQuickBtn";
    btn.className = "mobileAdminQuickBtn";
    btn.innerHTML = `<i class="fa-solid fa-shield-halved"></i><span>Admin</span>`;

    btn.addEventListener("click", async () => {
      await openAdminFromAnywhere("chats");
    });

    document.body.appendChild(btn);
  }

  updateMobileAdminQuickButton();
}

function updateMobileAdminQuickButton() {
  const btn = document.getElementById("mobileAdminQuickBtn");
  if (!btn) return;

  const effectiveAdmin = adminActualProfile || me;
  btn.hidden = !effectiveAdmin?.is_admin || appMode === "admin" || appMode === "preview";
}

function setAppMode(mode) {
  appMode = mode;

  appEl.classList.toggle("isAdminMode", mode === "admin");
  appEl.classList.toggle("isPreviewMode", mode === "preview");

  updateMobileAdminQuickButton();
}

function removeAdminPreviewExitButton() {
  document.getElementById("adminPreviewExitBtn")?.remove();
}

function ensureAdminPreviewExitButton() {
  removeAdminPreviewExitButton();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "adminPreviewExitBtn";
  btn.className = "adminPreviewExitBtn";
  btn.textContent = "Exit preview";

  btn.addEventListener("click", async () => {
    await toggleAdminMode();
  });

  document.body.appendChild(btn);
}

async function broadcastMessageOverrideChanged(userAId, userBId, messageId = "") {
  const moderationChannel = sb.channel(`dm:${pairKey(userAId, userBId)}`, {
    config: {
      broadcast: { self: false }
    }
  });

  await new Promise(resolve => {
    moderationChannel.subscribe(status => {
      if (status === "SUBSCRIBED") resolve();
    });
  });

  const basePayload = {
    message_id: messageId,
    changed_at: new Date().toISOString()
  };

  await moderationChannel.send({
    type: "broadcast",
    event: "message_override_changed",
    payload: {
      ...basePayload,
      sender: userAId,
      recipient: userBId
    }
  });

  await moderationChannel.send({
    type: "broadcast",
    event: "message_override_changed",
    payload: {
      ...basePayload,
      sender: userBId,
      recipient: userAId
    }
  });

  setTimeout(() => {
    sb.removeChannel(moderationChannel);
  }, 500);
}

function forceAdminMobileSurface() {
  document.body.classList.remove(
    "mobileViewHome",
    "mobileViewMessages",
    "isChatFocus",
    "isFirstTimeUserActive",
    "isFirstTimeChatShellVisible",
    "isFirstTimeChatShellClear"
  );

  document.body.classList.add("mobileViewMessages");

  appEl.classList.remove("isChatFocus");

  closeMobileSidebar?.();
}

async function enterAdminMode(screen = "users") {
  try {
    removeAdminPreviewExitButton();

    setAppMode("admin");
    adminMode = true;

    forceAdminMobileSurface();

    closeAdminOverlay();

    textInput.disabled = true;
    updateSendButton?.();

    await loadAdminProfiles();

    await renderAdminWorkspace(screen);

    window.requestAnimationFrame(() => {
      forceAdminMobileSurface();
      updateMobileAdminQuickButton?.();
    });
  } catch (error) {
    console.error("Could not enter admin mode", error);
    alert(error?.message || "Could not open admin mode.");
  }
}

async function bindAdminGlobalDayControls(root = document) {
  const daySelect = root.querySelector("#adminGlobalDaySelect");
  const saveBtn = root.querySelector("#adminSaveGlobalDayBtn");

  if (!daySelect || !saveBtn) return;

  try {
    const settings = await window.soleDayConfigs.loadExperimentSettings(sb, {
      force: true
    });

    daySelect.value = String(settings.current_day || 1);
  } catch (error) {
    console.warn("Could not load global experiment day", error);
    daySelect.value = "1";
  }

  saveBtn.addEventListener("click", async () => {
    const nextDay = Number(daySelect.value || 1);

    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
      await window.soleDayConfigs.saveExperimentCurrentDay(sb, nextDay);
      saveBtn.textContent = "Saved";

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 700);
    } catch (error) {
      console.error("Could not save global experiment day", error);
      alert(error.message || "Could not save global experiment day.");

      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });
}

async function adminClearEditForEveryone(messageId, userAId, userBId) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await sb
    .from("message_overrides")
    .select("id, is_hidden")
    .eq("message_id", messageId)
    .is("viewer_id", null)
    .maybeSingle();

  if (findError) {
    alert(findError.message);
    return;
  }

  if (!existing?.id) return;

  let error;

  if (existing.is_hidden) {
    ({ error } = await sb
      .from("message_overrides")
      .update({
        replacement_text: null,
        updated_at: now
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await sb
      .from("message_overrides")
      .delete()
      .eq("id", existing.id));
  }

  if (error) {
    alert(error.message);
    return;
  }

await refreshAdminPairTranscript(userAId, userBId);
}

async function adminClearEditForRecipient(messageId, recipientId, userAId, userBId) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await sb
    .from("message_overrides")
    .select("id, is_hidden")
    .eq("message_id", messageId)
    .eq("viewer_id", recipientId)
    .maybeSingle();

  if (findError) {
    alert(findError.message);
    return;
  }

  if (!existing?.id) return;

  let error;

  if (existing.is_hidden) {
    ({ error } = await sb
      .from("message_overrides")
      .update({
        replacement_text: null,
        updated_at: now
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await sb
      .from("message_overrides")
      .delete()
      .eq("id", existing.id));
  }

  if (error) {
    alert(error.message);
    return;
  }

  await refreshAdminPairTranscript(userAId, userBId);
  await broadcastMessageOverrideChanged(userAId, userBId, messageId);
}

async function adminEditMessageForEveryone(messageId, replacementText, userAId, userBId) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await sb
    .from("message_overrides")
    .select("id")
    .eq("message_id", messageId)
    .is("viewer_id", null)
    .maybeSingle();

  if (findError) {
    alert(findError.message);
    return;
  }

  let error;

  if (existing?.id) {
    ({ error } = await sb
      .from("message_overrides")
      .update({
        replacement_text: replacementText,
        is_hidden: false,
        updated_at: now
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await sb
      .from("message_overrides")
      .insert({
        message_id: messageId,
        viewer_id: null,
        replacement_text: replacementText,
        is_hidden: false,
        created_by: adminActualProfile?.id || me?.id || null,
        updated_at: now
      }));
  }

  if (error) {
    alert(error.message);
    return;
  }

await refreshAdminPairTranscript(userAId, userBId);
await broadcastMessageOverrideChanged(userAId, userBId, messageId);
}

async function adminToggleHideMessageForEveryone(messageId, shouldHide, userAId, userBId) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await sb
    .from("message_overrides")
    .select("id, replacement_text")
    .eq("message_id", messageId)
    .is("viewer_id", null)
    .maybeSingle();

  if (findError) {
    alert(findError.message);
    return;
  }

  let error;

  if (existing?.id) {
    ({ error } = await sb
      .from("message_overrides")
      .update({
        is_hidden: !!shouldHide,
        updated_at: now
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await sb
      .from("message_overrides")
      .insert({
        message_id: messageId,
        viewer_id: null,
        replacement_text: null,
        is_hidden: !!shouldHide,
        created_by: adminActualProfile?.id || me?.id || null,
        updated_at: now
      }));
  }

  if (error) {
    alert(error.message);
    return;
  }

await refreshAdminPairTranscript(userAId, userBId);
await broadcastMessageOverrideChanged(userAId, userBId, messageId);
}

async function adminToggleHideMessageForRecipient(messageId, recipientId, shouldHide, userAId, userBId) {
  const now = new Date().toISOString();

  const { data: existing, error: findError } = await sb
    .from("message_overrides")
    .select("id, replacement_text")
    .eq("message_id", messageId)
    .eq("viewer_id", recipientId)
    .maybeSingle();

  if (findError) {
    alert(findError.message);
    return;
  }

  let error;

  if (existing?.id) {
    ({ error } = await sb
      .from("message_overrides")
      .update({
        is_hidden: !!shouldHide,
        updated_at: now
      })
      .eq("id", existing.id));
  } else {
    ({ error } = await sb
      .from("message_overrides")
      .insert({
        message_id: messageId,
        viewer_id: recipientId,
        replacement_text: null,
        is_hidden: !!shouldHide,
        created_by: adminActualProfile?.id || me?.id || null,
        updated_at: now
      }));
  }

  if (error) {
    alert(error.message);
    return;
  }

await refreshAdminPairTranscript(userAId, userBId);
await broadcastMessageOverrideChanged(userAId, userBId, messageId);
}

async function adminEditMessageForRecipient(messageId, recipientId, replacementText, userAId, userBId) {
  const { error } = await sb
    .from("message_overrides")
    .upsert(
      {
        message_id: messageId,
        viewer_id: recipientId,
        replacement_text: replacementText,
        is_hidden: false,
        created_by: adminActualProfile?.id || me?.id || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "message_id,viewer_id" }
    );

  if (error) {
    alert(error.message);
    return;
  }

await refreshAdminPairTranscript(userAId, userBId);
await broadcastMessageOverrideChanged(userAId, userBId, messageId);
}

async function refreshAdminPairTranscript(userAId, userBId) {
  const transcriptEl = document.getElementById("adminPairTranscript");
  if (!transcriptEl) return;

  const wasNearBottom =
    transcriptEl.scrollHeight - transcriptEl.scrollTop - transcriptEl.clientHeight < 80;

  const messages = await loadAdminPairTranscript(userAId, userBId);

  transcriptEl.innerHTML = messages.length
    ? messages.map(message => renderAdminTranscriptMessage(message, userAId, userBId)).join("")
    : `<div class="adminResponsesEmpty">No messages yet.</div>`;

  bindAdminTranscriptModerationActions(document, userAId, userBId);

  if (wasNearBottom) {
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }
}

async function subscribeAdminPairOverrideRealtime(userAId, userBId) {
  if (adminPairOverridePanelChannel) {
    await sb.removeChannel(adminPairOverridePanelChannel);
    adminPairOverridePanelChannel = null;
  }

  adminPairOverridePanelChannel = sb
    .channel(`admin-panel-overrides:${pairKey(userAId, userBId)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_overrides" },
      async payload => {
        const override = payload.new || payload.old;
        if (!override?.message_id) return;

        const { data: message, error } = await sb
          .from("messages")
          .select("id, sender_id, recipient_id")
          .eq("id", override.message_id)
          .maybeSingle();

        if (error || !message) return;

        const inThisPair =
          (message.sender_id === userAId && message.recipient_id === userBId) ||
          (message.sender_id === userBId && message.recipient_id === userAId);

        if (!inThisPair) return;

await refreshAdminPairTranscript(userAId, userBId);
await broadcastMessageOverrideChanged(userAId, userBId, messageId);
      }
    )
    .subscribe(status => {
      // console.log("[admin override realtime]", status);
    });
}

async function renderAdminDaysWorkspace(content) {
  content.innerHTML = `
    <section class="adminPanel">
      <h3>Experiment Days</h3>
      <p class="muted">
        Set the global experiment day, configure each dayâ€™s available scoring budget,
        and review which quiz templates are assigned to each day.
      </p>

      <div class="adminDayGlobalControl">
        <div class="adminDayUserControlCopy">
          <div class="dashboardEyebrow">Global experiment day</div>
          <h4>Set current day for everyone</h4>
          <p>
            This controls which experiment day the whole test is currently on.
            User-specific overrides can be added later for exceptions and testing.
          </p>
        </div>

        <div class="adminDayGlobalControlFields">
          <label class="adminScoreField">
            <span>Current day</span>
            <select id="adminGlobalDaySelect">
              <option value="1">Day 1</option>
              <option value="2">Day 2</option>
              <option value="3">Day 3</option>
              <option value="4">Day 4</option>
              <option value="5">Day 5</option>
            </select>
          </label>

          <button type="button" class="btn" id="adminSaveGlobalDayBtn">
            Save global day
          </button>
        </div>
      </div>

      <div id="adminDaysList" class="adminDaysList">
        Loading day configuration...
      </div>
    </section>
  `;

  await bindAdminGlobalDayControls(content);

  const list = content.querySelector("#adminDaysList");
  if (!list) return;

  let configs = [];

  try {
    configs = await window.soleDayConfigs.loadExperimentDayConfigs(sb, {
      force: true
    });
  } catch (error) {
    console.warn("Could not load day configs", error);
    configs = window.soleDayConfigs.getDefaultExperimentDayConfigs();
  }

  let templates = [];

  try {
    templates = await loadQuizTemplatesFromSupabase(sb);
    console.log("DAY TEMPLATE SHAPE", templates[0]);
  } catch (error) {
    console.warn("Could not load templates for day curriculum preview", error);
    templates = [];
  }

  list.innerHTML = configs.map(config => {
    const dayTemplates = getTemplatesForAdminDay(templates, config.day_number);

    const connectionTemplates = dayTemplates.filter(template => {
      return getTemplateModuleName(template) === "connection";
    });

    const attractionTemplates = dayTemplates.filter(template => {
      return getTemplateModuleName(template) === "attraction";
    });

    return `
      <article class="adminDayCard" data-admin-day-card="${config.day_number}">
        <div class="adminDayCardHeader">
          <div>
            <div class="dashboardEyebrow">Day ${config.day_number}</div>
            <input
              class="adminDayTitleInput"
              type="text"
              value="${escapeAttr(config.label || `Day ${config.day_number}`)}"
              data-day-field="label"
            />
          </div>

          <button
            type="button"
            class="btn btnGhost"
            data-save-day-config="${config.day_number}"
          >
            Save day
          </button>
        </div>

        <div class="adminDayGrid">
          <label class="adminScoreField">
            <span>Connection quiz budget</span>
            <input type="number" step="0.1" value="${Number(config.connection_quiz_budget || 0)}" data-day-field="connection_quiz_budget">
          </label>

          <label class="adminScoreField">
            <span>Connection message budget</span>
            <input type="number" step="0.1" value="${Number(config.connection_message_budget || 0)}" data-day-field="connection_message_budget">
          </label>

          <label class="adminScoreField">
            <span>Attraction quiz budget</span>
            <input type="number" step="0.1" value="${Number(config.attraction_quiz_budget || 0)}" data-day-field="attraction_quiz_budget">
          </label>

          <label class="adminScoreField">
            <span>Attraction message budget</span>
            <input type="number" step="0.1" value="${Number(config.attraction_message_budget || 0)}" data-day-field="attraction_message_budget">
          </label>

          <label class="adminScoreField">
  <span>Task confidence budget</span>
  <input
    type="number"
    step="0.1"
    value="${Number(config.task_confidence_budget || 0)}"
    data-day-field="task_confidence_budget"
  >
</label>

<label class="adminScoreField">
  <span>Reply goal</span>
  <input
    type="number"
    step="1"
    value="${Number(config.reply_goal || 50)}"
    data-day-field="reply_goal"
  >
</label>

          <label class="adminScoreField">
            <span>Confidence max</span>
            <input type="number" step="0.1" value="${Number(config.confidence_max || 0)}" data-day-field="confidence_max">
          </label>

          <label class="adminScoreField">
            <span>Connection max</span>
            <input type="number" step="0.1" value="${Number(config.connection_max || 0)}" data-day-field="connection_max">
          </label>

          <label class="adminScoreField">
            <span>Attraction max</span>
            <input type="number" step="0.1" value="${Number(config.attraction_max || 0)}" data-day-field="attraction_max">
          </label>

          <label class="adminScoreField">
            <span>Candidate pool floor</span>
            <input type="number" step="1" value="${Number(config.candidate_pool_min || 1)}" data-day-field="candidate_pool_min">
          </label>
        </div>

        <div class="adminDayCurriculum">
          <div class="adminDayCurriculumColumn">
            <div class="adminDayCurriculumTitle">
              Connection templates
              <span>${connectionTemplates.length}</span>
            </div>
            ${renderAdminDayTemplateList(connectionTemplates)}
          </div>

          <div class="adminDayCurriculumColumn">
            <div class="adminDayCurriculumTitle">
              Attraction templates
              <span>${attractionTemplates.length}</span>
            </div>
            ${renderAdminDayTemplateList(attractionTemplates)}
          </div>
        </div>

        <p class="adminScoreHint">
          For now this is a preview. Next weâ'll make these templates movable between days,
          then the scoring model will read from this curriculum structure.
        </p>
      </article>
    `;
  }).join("");

  bindAdminDayControls(content);
}

function normaliseAdminDayNumber(value) {
  const num = Math.round(Number(value) || 1);
  return Math.max(1, Math.min(5, num));
}

function getTemplateModuleName(template = {}) {
  const raw = String(
    template.category ||
    template.module ||
    template.meta?.category ||
    template.meta?.module ||
    ""
  ).toLowerCase();

  if (raw === "chemistry") return "connection";
  if (raw === "connection") return "connection";
  if (raw === "attraction") return "attraction";

  return raw || "connection";
}

function getTemplateDayNumber(template = {}) {
  return normaliseAdminDayNumber(
    template.day_index ||
    template.day_number ||
    template.day ||
    template.experiment_day ||
    template.meta?.day_index ||
    template.meta?.day_number ||
    template.meta?.day ||
    1
  );
}

function getTemplatesForAdminDay(templates = [], dayNumber) {
  const safeDay = normaliseAdminDayNumber(dayNumber);

  return (templates || []).filter(template => {
    return getTemplateDayNumber(template) === safeDay;
  });
}

function getTemplateQuestionCount(template = {}) {
  const candidates = [
    template.questions,
    template.questions_json,
    template.config?.questions,
    template.content?.questions,
    template.payload?.questions,
    template.data?.questions,
    template.template?.questions,
    template.quiz?.questions,
    template.meta?.questions
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value.length;
  }

  const stringCandidates = [
    template.questions_json,
    template.config_json,
    template.content_json,
    template.payload_json
  ];

  for (const raw of stringCandidates) {
    if (!raw || typeof raw !== "string") continue;

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) return parsed.length;
      if (Array.isArray(parsed?.questions)) return parsed.questions.length;
      if (Array.isArray(parsed?.config?.questions)) return parsed.config.questions.length;
    } catch (error) {
      // Ignore malformed JSON and keep trying.
    }
  }

  const numericCandidates = [
    template.question_count,
    template.questions_count,
    template.total_questions,
    template.meta?.question_count,
    template.meta?.questions_count
  ];

  for (const value of numericCandidates) {
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0) return Math.round(num);
  }

  return 0;
}

function renderAdminDayTemplateList(templates = []) {
  if (!templates.length) {
    return `
      <div class="adminDayTemplateEmpty">
        No templates assigned.
      </div>
    `;
  }

  return `
    <div class="adminDayTemplateList">
      ${templates.map(template => `
        <div class="adminDayTemplateRow">
          <strong>${escapeHtml(template.title || template.name || "Untitled template")}</strong>
          <span>
         ${escapeHtml(String(getTemplateQuestionCount(template)))} questions
          </span>
        </div>
      `).join("")}
    </div>
  `;
}

function bindAdminDayUserControls(root = document) {
  const userSelect = root.querySelector("#adminDayUserSelect");
  const daySelect = root.querySelector("#adminDayOverrideSelect");
  const saveBtn = root.querySelector("#adminSaveUserDayBtn");

  if (!userSelect || !daySelect || !saveBtn) return;

  userSelect.addEventListener("change", () => {
    const userId = userSelect.value;
    const profile = adminProfiles.find(item => item?.id === userId);

    if (!profile) {
      daySelect.value = "";
      return;
    }

    daySelect.value = profile.experiment_day_override
      ? String(profile.experiment_day_override)
      : "";
  });

  saveBtn.addEventListener("click", async () => {
    const userId = userSelect.value;

    if (!userId) {
      alert("Choose a user first.");
      return;
    }

    const rawDay = daySelect.value;
    const dayValue = rawDay ? normaliseAdminDayNumber(rawDay) : null;

    saveBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
      const updatedProfile = await updateAdminUserScoring(userId, {
        experiment_day_override: dayValue
      });

      if (updatedProfile) {
        saveBtn.textContent = "Saved";
      } else {
        saveBtn.textContent = "Not saved";
      }

      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
      }, 700);
    } catch (error) {
      console.error("Could not update user experiment day", error);
      alert(error.message || "Could not update user day.");

      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  });
}

function readAdminDayConfigPatch(card) {
  const patch = {};

  card.querySelectorAll("[data-day-field]").forEach(input => {
    const field = input.dataset.dayField;
    const raw = input.value;

    if (field === "label") {
      patch[field] = raw.trim();
      return;
    }

if (field === "candidate_pool_min") {
  patch[field] = Math.round(Number(raw) || 1);
  return;
}

if (field === "reply_goal") {
  patch[field] = Math.round(Number(raw) || 0);
  return;
}

    patch[field] = Number(raw) || 0;
  });

  return patch;
}

function bindAdminDayControls(root = document) {
  root.querySelectorAll("[data-save-day-config]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const dayNumber = Number(btn.dataset.saveDayConfig);
      const card = root.querySelector(`[data-admin-day-card="${dayNumber}"]`);

      if (!card) return;

      const patch = readAdminDayConfigPatch(card);

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = "Saving...";

      try {
        await window.soleDayConfigs.saveExperimentDayConfig(sb, dayNumber, patch);
        btn.textContent = "Saved";
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 700);
      } catch (error) {
        console.error("Could not save day config", error);
        alert(error.message || "Could not save day config.");
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  });
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
            Auto - Day ${automaticDay}
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
   removeAdminPreviewExitButton();

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

  ensureAdminPreviewExitButton();

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

  await enterAdminMode(window.matchMedia("(max-width: 768px)").matches ? "chats" : "users");
}

async function renderAdminWorkspace(screen = "users") {
  adminScreen = screen;

messagesEl.innerHTML = `
    <div class="adminWorkspaceShell">
      <button type="button" class="adminMobileMenuBtn" id="adminMobileMenuBtn">
        <i class="fa-solid fa-bars"></i>
        <span>Admin menu</span>
      </button>

      <div class="adminMobileNavScrim" id="adminMobileNavScrim" hidden></div>

      <aside class="adminWorkspaceNav" id="adminWorkspaceNav">
        <div class="adminWorkspaceTitle">
          <h2>Admin</h2>
          <p>Control centre</p>
        </div>

${["users", "days", "tasks", "portrait", "facts", "feedback", "pairings", "chats", "insights", "templates", "settings"].map(item => `
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

    const adminMobileMenuBtn = messagesEl.querySelector("#adminMobileMenuBtn");
  const adminMobileNavScrim = messagesEl.querySelector("#adminMobileNavScrim");
  const adminWorkspaceNav = messagesEl.querySelector("#adminWorkspaceNav");

  function closeAdminMobileNav() {
    adminWorkspaceNav?.classList.remove("isOpen");
    adminMobileNavScrim.hidden = true;
  }

  function openAdminMobileNav() {
    adminWorkspaceNav?.classList.add("isOpen");
    adminMobileNavScrim.hidden = false;
  }

  adminMobileMenuBtn?.addEventListener("click", openAdminMobileNav);
  adminMobileNavScrim?.addEventListener("click", closeAdminMobileNav);

  messagesEl.querySelectorAll("[data-admin-workspace-screen]").forEach(btn => {
    btn.addEventListener("click", async () => {
      closeAdminMobileNav();
      await renderAdminWorkspace(btn.dataset.adminWorkspaceScreen);
    });
  });

  await renderAdminWorkspaceContent(screen);
}

async function loadAdminChatFacts() {
  const { data, error } = await sb
    .from("user_chat_facts")
    .select("id,user_id,fact_text,sort_order,is_active,created_at")
    .order("user_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    alert(error.message);
    return [];
  }

  return data || [];
}

async function renderAdminFactsWorkspace(content) {
  const facts = await loadAdminChatFacts();

  const factsByUserId = facts.reduce((acc, fact) => {
    if (!acc[fact.user_id]) acc[fact.user_id] = [];
    acc[fact.user_id].push(fact);
    return acc;
  }, {});

  content.innerHTML = `
    <section class="adminPanel adminFactsPanel">
      <div class="adminWorkspaceTitle">
        <h3>Chat subtitle facts</h3>
        <p>
          Add small factoids for each user. Their match will see these cycling under the chat title.
        </p>
      </div>

      <div class="adminFactsList">
        ${adminProfiles.map(profile => {
          const rows = factsByUserId[profile.id] || [];

          return `
            <article class="adminFactsUserCard">
              <div class="adminFactsUserHeader">
                <div>
                  <h4>${escapeHtml(profile.display_name || profile.username || "Unnamed user")}</h4>
                  <p>${escapeHtml(profile.username || profile.email || "")}</p>
                </div>

                <span>${rows.length} fact${rows.length === 1 ? "" : "s"}</span>
              </div>

              <div class="adminFactsRows">
                ${
                  rows.length
                    ? rows.map(fact => `
                      <div class="adminFactRow" data-fact-row="${fact.id}">
                        <input
                          class="adminFactOrderInput"
                          type="number"
                          value="${Number(fact.sort_order || 0)}"
                          data-fact-order="${fact.id}"
                          aria-label="Sort order"
                        />

                        <input
                          class="adminFactTextInput"
                          type="text"
                          value="${escapeAttr(fact.fact_text || "")}"
                          data-fact-text="${fact.id}"
                          placeholder="e.g. Recently started learning Italian"
                        />

                        <label class="adminFactActiveToggle">
                          <input
                            type="checkbox"
                            data-fact-active="${fact.id}"
                            ${fact.is_active !== false ? "checked" : ""}
                          />
                          <span>Active</span>
                        </label>

                        <button
                          type="button"
                          class="btn btnGhost"
                          data-fact-save="${fact.id}"
                        >
                          Save
                        </button>

                        <button
                          type="button"
                          class="btn btnGhost adminDangerBtn"
                          data-fact-delete="${fact.id}"
                        >
                          Delete
                        </button>
                      </div>
                    `).join("")
                    : `<div class="adminFactsEmpty">No facts added yet.</div>`
                }
              </div>

              <div class="adminFactNewRow">
                <input
                  type="number"
                  value="${rows.length + 1}"
                  data-new-fact-order="${profile.id}"
                  aria-label="New fact sort order"
                />

                <input
                  type="text"
                  data-new-fact-text="${profile.id}"
                  placeholder="Add a new chat subtitle fact..."
                />

                <button
                  type="button"
                  class="btn"
                  data-new-fact-add="${profile.id}"
                >
                  Add fact
                </button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;

  content.querySelectorAll("[data-new-fact-add]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.newFactAdd;
      const textEl = content.querySelector(`[data-new-fact-text="${userId}"]`);
      const orderEl = content.querySelector(`[data-new-fact-order="${userId}"]`);

      const factText = textEl?.value?.trim();
      const sortOrder = Number(orderEl?.value || 0);

      if (!factText) {
        alert("Add some fact text first.");
        return;
      }

const { error } = await sb.from("user_chat_facts").insert({
  user_id: userId,
  fact_text: factText,
  sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  is_active: true,
  updated_at: new Date().toISOString()
});

      if (error) {
        alert(error.message);
        return;
      }

      await renderAdminFactsWorkspace(content);
      refreshPartnerFactsIfNeeded(userId);
    });
  });

  content.querySelectorAll("[data-fact-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const factId = btn.dataset.factSave;

      const textEl = content.querySelector(`[data-fact-text="${factId}"]`);
      const orderEl = content.querySelector(`[data-fact-order="${factId}"]`);
      const activeEl = content.querySelector(`[data-fact-active="${factId}"]`);

      const factText = textEl?.value?.trim();
      const sortOrder = Number(orderEl?.value || 0);

      if (!factText) {
        alert("Fact text cannot be empty.");
        return;
      }

      const { data, error } = await sb
        .from("user_chat_facts")
        .update({
          fact_text: factText,
          sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
          is_active: !!activeEl?.checked,
          updated_at: new Date().toISOString()
        })
        .eq("id", factId)
        .select("user_id")
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      await renderAdminFactsWorkspace(content);
      refreshPartnerFactsIfNeeded(data?.user_id);
    });
  });

  content.querySelectorAll("[data-fact-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const factId = btn.dataset.factDelete;
      const confirmed = window.confirm("Delete this chat subtitle fact?");
      if (!confirmed) return;

      const { data: existing, error: findError } = await sb
        .from("user_chat_facts")
        .select("user_id")
        .eq("id", factId)
        .single();

      if (findError) {
        alert(findError.message);
        return;
      }

      const { error } = await sb
        .from("user_chat_facts")
        .delete()
        .eq("id", factId);

      if (error) {
        alert(error.message);
        return;
      }

      await renderAdminFactsWorkspace(content);
      refreshPartnerFactsIfNeeded(existing?.user_id);
    });
  });
}

function refreshPartnerFactsIfNeeded(userId) {
  if (!userId) return;

  // If admin is currently viewing/chatting with this profile, refresh immediately.
  if (them?.id === userId && typeof startPartnerFactRotation === "function") {
    startPartnerFactRotation(userId);
  }
}

async function renderAdminWorkspaceContent(screen) {
  const content = document.getElementById("adminWorkspaceContent");
  if (!content) return;

  if (screen === "users") return renderAdminUsersWorkspace(content);
  if (screen === "days") return renderAdminDaysWorkspace(content);
if (screen === "tasks") return renderAdminTasksWorkspace(content);
if (screen === "portrait") return await renderAdminPortraitsWorkspace(content);
if (screen === "facts") return await renderAdminFactsWorkspace(content);
if (screen === "feedback") return await renderAdminFeedbackWorkspace(content);
if (screen === "pairings") return renderAdminPairingsWorkspace(content);
  if (screen === "chats") return await renderAdminChatsWorkspace(content);
  if (screen === "insights") return renderAdminInsightsWorkspace(content);
  if (screen === "templates") return renderAdminTemplatesWorkspace(content);
    if (screen === "settings") return await renderAdminSettingsWorkspace(content);
}

async function renderAdminFeedbackWorkspace(content) {
  const { data, error } = await sb
    .from("beta_feedback")
    .select(`
      id,
      user_id,
      feedback_text,
      page_context,
      user_agent,
      created_at,
      profiles:user_id (
        display_name,
        username,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    content.innerHTML = `
      <section class="adminPanel">
        <h3>Feedback</h3>
        <p class="muted">Could not load feedback: ${escapeHtml(error.message)}</p>
      </section>
    `;
    return;
  }

  const rows = data || [];

  content.innerHTML = `
    <section class="adminPanel adminFeedbackPanel">
      <div class="adminWorkspaceTitle">
        <h3>Beta feedback</h3>
        <p>Participant bug reports, experience notes, and chat partner feedback.</p>
      </div>

      ${
        rows.length
          ? `
            <div class="adminFeedbackList">
              ${rows.map(row => {
                const profile = row.profiles || {};
                const name =
                  profile.display_name ||
                  profile.username ||
                  profile.email ||
                  "Unknown user";

                const created = row.created_at
                  ? new Date(row.created_at).toLocaleString()
                  : "";

                return `
                  <article class="adminFeedbackCard">
                    <div class="adminFeedbackMeta">
                      <strong>${escapeHtml(name)}</strong>
                      <span>${escapeHtml(created)}</span>
                      ${
                        row.page_context
                          ? `<em>${escapeHtml(row.page_context)}</em>`
                          : ""
                      }
                    </div>

                    <div class="adminFeedbackText">
                      ${escapeHtml(row.feedback_text)}
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          `
          : `<p class="muted">No feedback submitted yet.</p>`
      }
    </section>
  `;
}

async function renderAdminSettingsWorkspace(content) {
  const settings = await window.soleDayConfigs?.loadExperimentSettings?.(sb, {
    force: true
  });

  const voiceEnabled = settings?.voice_messages_enabled !== false;

  content.innerHTML = `
    <section class="adminPanel adminSettingsPanel">
      <div class="adminWorkspaceTitle">
        <h3>Settings</h3>
        <p>Global controls for the live experiment.</p>
      </div>

      <article class="adminSettingCard">
        <div>
          <h4>Voice memos</h4>
          <p>
            Turn participant voice memo recording on or off. Existing voice messages stay visible.
          </p>
        </div>

        <button
          type="button"
          class="btn ${voiceEnabled ? "btnGhost" : ""}"
          id="adminVoiceMemoToggleBtn"
          data-enabled="${voiceEnabled ? "true" : "false"}"
        >
          ${voiceEnabled ? "Disable voice memos" : "Enable voice memos"}
        </button>
      </article>
    </section>
  `;

  content.querySelector("#adminVoiceMemoToggleBtn")?.addEventListener("click", async event => {
    const btn = event.currentTarget;
    const currentlyEnabled = btn.dataset.enabled === "true";
    const nextEnabled = !currentlyEnabled;

    btn.disabled = true;
    btn.textContent = nextEnabled ? "Enabling..." : "Disabling...";

    try {
      await window.soleDayConfigs?.saveExperimentVoiceMessagesEnabled?.(sb, nextEnabled);

      window.soleVoiceMessages?.applyVoiceMessagesEnabled?.(nextEnabled);

      await renderAdminSettingsWorkspace(content);
    } catch (error) {
      alert(error?.message || "Could not update voice memo setting.");
      btn.disabled = false;
      btn.textContent = currentlyEnabled ? "Disable voice memos" : "Enable voice memos";
    }
  });
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

  <button
    class="btn ${profile.launch_block_enabled ? "" : "btnGhost"}"
    data-admin-launch-gate="${escapeAttr(profile.id)}"
    data-enabled="${profile.launch_block_enabled ? "true" : "false"}"
  >
    ${profile.launch_block_enabled ? "Unlock user now" : "Block until 9am"}
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

    renderAdminResponsesWorkspace(content, profile.id);
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

content.querySelectorAll("[data-admin-launch-gate]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const userId = btn.dataset.adminLaunchGate;
    const currentlyEnabled = btn.dataset.enabled === "true";
    const nextEnabled = !currentlyEnabled;

    btn.disabled = true;
    btn.textContent = nextEnabled ? "Blocking..." : "Unlocking...";

    try {
      await window.soleLaunchGate.setUserLaunchGate({
        sb,
        userId,
        enabled: nextEnabled,
        unlockAt: window.soleLaunchGate.SOLE_DEFAULT_UNLOCK_AT
      });

      await loadAdminProfiles();
      renderAdminUsersWorkspace(content);
    } catch (error) {
      console.error("[launch gate] update failed", error);
      alert(error?.message || "Could not update launch gate.");
      btn.disabled = false;
      btn.textContent = currentlyEnabled ? "Unlock user now" : "Block until 9am";
    }
  });
});

bindAdminScoringControls(content);
hydrateAdminScoreSummaries(content);
}

async function renderAdminResponsesWorkspace(content, selectedUserId = "") {
  const selectedUser =
    adminProfiles.find(profile => profile.id === selectedUserId) ||
    adminProfiles[0];

  content.innerHTML = `
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Quiz responses</h3>
          <p class="muted">
            Review submitted and in-progress quiz answers without entering user preview mode.
          </p>
        </div>

        <button type="button" class="btn btnGhost" data-back-to-admin-users>
          Back to users
        </button>
      </div>

      <div class="adminFormRow">
        <select id="adminResponsesUserSelect">
          ${adminProfiles.filter(Boolean).map(profile => `
            <option
              value="${escapeAttr(profile.id)}"
              ${selectedUser?.id === profile.id ? "selected" : ""}
            >
              ${escapeHtml(profile.display_name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div id="adminResponsesMount" class="adminResponsesMount">
        Loading responses...
      </div>
    </section>
  `;

  content
    .querySelector("[data-back-to-admin-users]")
    ?.addEventListener("click", () => {
      renderAdminUsersWorkspace(content);
    });

  const select = content.querySelector("#adminResponsesUserSelect");

  select?.addEventListener("change", () => {
    renderAdminResponsesWorkspace(content, select.value);
  });

  const mount = content.querySelector("#adminResponsesMount");
  if (!mount || !selectedUser) return;

  try {
    mount.innerHTML = await renderAdminUserResponsesReport(selectedUser);
  } catch (error) {
    console.error("Could not render admin responses report", error);
    mount.innerHTML = `
      <div class="adminResponsesEmpty">
        Could not load responses.
      </div>
    `;
  }
}

function getAdminAnswerSummaryLines(assignment, answers = {}) {
  const lines = [];

  (assignment.questions || []).forEach(question => {
    const answer = answers[question.id];
    if (!answer) return;

    let value = "";

    if (question.type === "multiSelect") {
      value = (answer.labels || answer.values || []).join(", ");
    }

    if (question.type === "slider") {
      const numericValue = Number(answer.value ?? question.config?.defaultValue ?? 50);
      const displayLabel =
        answer.interpretedLabel ||
        getSliderDisplayLabel(question, numericValue);

      value = `${displayLabel}, ${numericValue}%`;
    }

    if (question.type === "scale7") {
      value = getScale7Label(answer.value);
    }

    if (question.type === "singleSelect") {
      value = answer.label || answer.value || "";
    }

    if (question.type === "freeText") {
      value = answer.text || "";
    }

    if (question.type === "ranking") {
      value = (answer.orderedLabels || answer.orderedValues || []).join(" → ");
    }

    if (question.type === "imageChoice") {
      value = answer.label || answer.value || "";
    }

    if (question.type === "swipeDeck") {
      const decisions = Array.isArray(answer.decisions) ? answer.decisions : [];
      const liked = decisions.filter(item => item.direction === "like").length;
      const rejected = decisions.filter(item => item.direction === "reject").length;

      value = `${decisions.length} swipes recorded · ${liked} liked · ${rejected} passed`;
    }

    if (question.type === "fileUpload") {
      value = answer.status === "skipped"
        ? "Skipped"
        : (answer.fileName || "Uploaded file");
    }

    if (!value) return;

    lines.push({
      prompt: question.prompt || "Untitled question",
      value
    });
  });

  return lines;
}

function getAdminAxisLabel(axisKey) {
  const matrixDefinitions = window.soleMatrixDefinitions?.all || {};
  const definitions = Array.isArray(matrixDefinitions)
    ? matrixDefinitions
    : Object.values(matrixDefinitions);

  for (const matrix of definitions) {
    const axis = (matrix.axes || []).find(item => item.key === axisKey);
    if (axis?.label) return axis.label;
  }

  return String(axisKey || "")
    .replace(/^connection_values_/, "")
    .replace(/^connection_attachment_/, "")
    .replace(/^connection_interpersonal_/, "")
    .replace(/^attraction_aesthetics_/, "")
    .replace(/^attraction_chemistry_/, "")
    .replace(/^attraction_romance_/, "")
    .replace(/^connection_/, "")
    .replace(/^attraction_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getAdminScoringDeltaLines(assignment, answers = {}) {
  if (!window.soleScoring?.calculateScoringSignalsForAssignment) {
    return [];
  }

  const signals =
    window.soleScoring.calculateScoringSignalsForAssignment(assignment, answers) || [];

  const byAxis = new Map();

  signals.forEach(signal => {
    const axisKey = signal.axisKey;
    if (!axisKey) return;

    const current = byAxis.get(axisKey) || {
      axisKey,
      evidence: 0,
      weightedTotal: 0
    };

    const evidence = Math.abs(Number(signal.evidence || signal.rawWeight || 0));
    const signalScore = Number(signal.signalScore);

    if (!Number.isFinite(evidence) || !evidence) return;
    if (!Number.isFinite(signalScore)) return;

    current.evidence += evidence;
    current.weightedTotal += signalScore * evidence;

    byAxis.set(axisKey, current);
  });

  return Array.from(byAxis.values())
    .map(item => {
      const averageSignal = item.evidence
        ? item.weightedTotal / item.evidence
        : 50;

      // This is not the exact final stored score delta, because final score depends
      // on existing evidence. It is a readable contribution direction for admins.
      const directionalDelta = averageSignal - 50;

      return {
        axisKey: item.axisKey,
        label: getAdminAxisLabel(item.axisKey),
        delta: directionalDelta,
        evidence: item.evidence
      };
    })
    .filter(item => Math.abs(item.delta) >= 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function renderAdminScoringDeltaList(assignment, answers = {}) {
  const deltas = getAdminScoringDeltaLines(assignment, answers);

  if (!deltas.length) {
    return `
      <div class="adminResponseNoScore">
        No scoring changes from answered questions.
      </div>
    `;
  }

  return `
    <div class="adminResponseScoreList">
      ${deltas.map(item => {
        const sign = item.delta > 0 ? "+" : "";
        const value = `${sign}${item.delta.toFixed(1)}`;

        return `
          <span class="adminResponseScorePill">
            ${escapeHtml(item.label)}:
            <strong>${escapeHtml(value)}</strong>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdminFirstSignalCard(profile) {
  const answersText = String(profile?.onboarding_answers_text || "").trim();
  const answers = profile?.onboarding_answers || {};

  const hasAnswers =
    !!answersText ||
    (answers && typeof answers === "object" && Object.keys(answers).length > 0);

  if (!hasAnswers) {
    return `
      <article class="adminResponseCard adminFirstSignalCard">
        <div class="adminResponseCardHeader">
          <div>
            <div class="dashboardEyebrow">First signal</div>
            <h4>First-time onboarding</h4>
            <p>This user has not completed the first-time onboarding yet.</p>
          </div>
        </div>
      </article>
    `;
  }

  if (answersText) {
    const lines = answersText
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const colonIndex = line.indexOf(":");

        if (colonIndex === -1) {
          return {
            label: "Answer",
            value: line
          };
        }

        return {
          label: line.slice(0, colonIndex).trim(),
          value: line.slice(colonIndex + 1).trim()
        };
      });

    return `
      <article class="adminResponseCard adminFirstSignalCard">
        <div class="adminResponseCardHeader">
          <div>
            <div class="dashboardEyebrow">Completed</div>
            <h4>First-time onboarding</h4>
            <p>Initial signal captured during account setup.</p>
          </div>

          <div class="adminResponseMeta">
            ${
              profile.onboarding_completed_at
                ? escapeHtml(`Completed ${new Date(profile.onboarding_completed_at).toLocaleString()}`)
                : "Completed"
            }
          </div>
        </div>

        <div class="adminResponseLines">
          ${lines.map(line => `
            <div class="adminResponseLine">
              <span>${escapeHtml(line.label)}</span>
              <strong>${escapeHtml(line.value || "Not answered")}</strong>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  const qualities = Array.isArray(answers.idealPartnerMustHave)
    ? answers.idealPartnerMustHave.join(", ")
    : "";

  const rows = [
    ["Name", answers.name],
    ["Date of birth", answers.dateOfBirth],
    [
      "Single for",
      `${Number(answers.singleFor?.years || 0)} years, ${Number(answers.singleFor?.months || 0)} months`
    ],
    ["Ever felt love", answers.everFeltLove],
    ["Ideal partner must have", qualities],
    ["Who are you looking for", answers.whoAreYouLookingFor],
    ["Hoping feels different this time", answers.hopingFeelsDifferent]
  ];

  return `
    <article class="adminResponseCard adminFirstSignalCard">
      <div class="adminResponseCardHeader">
        <div>
          <div class="dashboardEyebrow">Completed</div>
          <h4>First-time onboarding</h4>
          <p>Initial signal captured during account setup.</p>
        </div>

        <div class="adminResponseMeta">
          ${
            profile.onboarding_completed_at
              ? escapeHtml(`Completed ${new Date(profile.onboarding_completed_at).toLocaleString()}`)
              : "Completed"
          }
        </div>
      </div>

      <div class="adminResponseLines">
        ${rows.map(([label, value]) => `
          <div class="adminResponseLine">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || "Not answered")}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

async function renderAdminUserResponsesReport(profile) {
  const [assignments, responseState] = await Promise.all([
    loadRuntimeAssignmentsFromSupabase(sb, profile, {
      includeLocked: true
    }),

    loadQuizResponsesFromSupabase(sb, profile, {
      userId: profile.id
    })
  ]);

  saveStoredDashboardResponses(profile, responseState.responses);
  saveStoredDashboardProgress(profile, responseState.progress);

 const responseCards = [
  renderAdminFirstSignalCard(profile)
];

  (assignments || []).forEach(assignment => {
    const savedResponse = responseState.responses?.[assignment.id] || null;
    const savedProgress = responseState.progress?.[assignment.id] || null;

    const answers = {
      ...(savedProgress?.answers || {}),
      ...(savedResponse?.answers || {})
    };

    if (!Object.keys(answers).length) return;

    const lines = getAdminAnswerSummaryLines(assignment, answers);
    if (!lines.length) return;

    const statusLabel = savedResponse?.completed
      ? "Completed"
      : "In progress";

    const submittedMeta = savedResponse?.submittedAt
      ? `Submitted ${new Date(savedResponse.submittedAt).toLocaleString()}`
      : "No final submission yet";

    responseCards.push(`
      <article class="adminResponseCard">
        <div class="adminResponseCardHeader">
          <div>
            <div class="dashboardEyebrow">
              ${escapeHtml(statusLabel)}
            </div>
            <h4>${escapeHtml(assignment.title || "Untitled quiz")}</h4>
            ${
              assignment.description
                ? `<p>${escapeHtml(assignment.description)}</p>`
                : ""
            }
          </div>

          <div class="adminResponseMeta">
            ${escapeHtml(submittedMeta)}
          </div>
        </div>

        <div class="adminResponseLines">
          ${lines.map(line => `
            <div class="adminResponseLine">
              <span>${escapeHtml(line.prompt)}</span>
              <strong>${escapeHtml(line.value)}</strong>
            </div>
          `).join("")}
        </div>

        <div class="adminResponseScoring">
          <div class="adminResponseScoringTitle">Scoring contribution</div>
          ${renderAdminScoringDeltaList(assignment, answers)}
        </div>
      </article>
    `);
  });

  if (!responseCards.length) {
    return `
      <div class="adminResponsesEmpty">
        No quiz responses or saved progress yet.
      </div>
    `;
  }

  return `
    <div class="adminResponsesList">
      ${responseCards.join("")}
    </div>
  `;
}

async function renderAdminPortraitsWorkspace(content, selectedUserId = "") {
  const selectedUser =
    adminProfiles.find(profile => profile.id === selectedUserId) ||
    adminProfiles[0];

  if (!adminProfiles.length) {
    content.innerHTML = `
      <section class="adminPanel">
        <h3>Portraits</h3>
        <p class="muted">No users found.</p>
      </section>
    `;
    return;
  }

  content.innerHTML = `
    <section class="adminPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Portraits</h3>
          <p class="muted">
            Edit the large SoleMate portrait shown in each user's SoleMate screen.
          </p>
        </div>

        <div class="adminChatsToolbar">
          <label class="adminChatsPairSelectLabel">User</label>

          <select id="adminPortraitUserSelect">
            ${adminProfiles.map(profile => `
              <option
                value="${escapeAttr(profile.id)}"
                ${selectedUser?.id === profile.id ? "selected" : ""}
              >
                ${escapeHtml(profile.display_name || profile.username || "Unnamed user")}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      <div class="adminResponsesMount" id="adminPortraitMount">
        Loading portrait editor...
      </div>
    </section>
  `;

  const select = content.querySelector("#adminPortraitUserSelect");
  const mountEl = content.querySelector("#adminPortraitMount");

  select?.addEventListener("change", async () => {
    await renderAdminPortraitsWorkspace(content, select.value);
  });

  if (!selectedUser || !mountEl) return;

  if (typeof window.dashboardUI?.mountAdminUserPortrait !== "function") {
    mountEl.innerHTML = `
      <div class="adminQuizError">
        Portrait editor function is not available. Check window.dashboardUI export.
      </div>
    `;
    return;
  }

  try {
    await window.dashboardUI.mountAdminUserPortrait({
      mountEl,
      sb,
      me,
      user: selectedUser,
      escapeHtml,
      escapeAttr
    });
  } catch (error) {
    console.error("Could not load portrait editor", error);
    mountEl.innerHTML = `
      <div class="adminQuizError">
        ${escapeHtml(error?.message || "Could not load portrait editor.")}
      </div>
    `;
  }
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

function getAdminProfileName(userId) {
  const profile = adminProfiles.find(item => item?.id === userId);
  return profile?.display_name || "User";
}

function bindAdminSystemComposerFormatting(root = document) {
  const textarea = root.querySelector("#adminSystemMessageText");
  if (!textarea) return;

  function setTextareaSelection(start, end) {
    textarea.focus();
    textarea.setSelectionRange(start, end);
  }

  function wrapAdminSelection(before, after = before) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const selected = value.slice(start, end);
    const replacement = `${before}${selected}${after}`;

    textarea.value =
      value.slice(0, start) +
      replacement +
      value.slice(end);

    setTextareaSelection(
      start + before.length,
      start + before.length + selected.length
    );
  }

  function applyAdminBulletList() {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

    const block = value.slice(lineStart, actualLineEnd);
    const lines = block.split("\n");

    const updated = lines
      .map(line => {
        if (!line.trim()) return line;
        return line.startsWith("- ") ? line : `- ${line}`;
      })
      .join("\n");

    textarea.value =
      value.slice(0, lineStart) +
      updated +
      value.slice(actualLineEnd);

    setTextareaSelection(lineStart, lineStart + updated.length);
  }

  root.querySelectorAll("[data-admin-format]").forEach(btn => {
    btn.addEventListener("click", () => {
      const format = btn.dataset.adminFormat;

      if (format === "bold") wrapAdminSelection("*", "*");
      if (format === "italic") wrapAdminSelection("_", "_");
      if (format === "underline") wrapAdminSelection("++", "++");
      if (format === "bullet") applyAdminBulletList();
    });
  });
}

function getAdminMessageOverrides(message) {
  return Array.isArray(message.admin_overrides)
    ? message.admin_overrides
    : [];
}

function getAdminGlobalOverride(message) {
  return getAdminMessageOverrides(message).find(item => item.viewer_id === null) || null;
}

function getAdminRecipientOverride(message) {
  return getAdminMessageOverrides(message).find(item => item.viewer_id === message.recipient_id) || null;
}

function renderAdminOverrideSummary(message) {
  const overrides = getAdminMessageOverrides(message);
  if (!overrides.length) return "";

  return `
    <div class="adminTranscriptOverridePanel">
      <div class="adminTranscriptOverrideTitle">Moderation view</div>

      ${overrides.map(override => {
        const label = override.viewer_id
          ? `For ${getAdminProfileName(override.viewer_id)} only`
          : "For everyone";

        const parts = [];

        if (override.is_hidden) {
          parts.push(`<span class="adminOverrideBadge isHidden">Hidden</span>`);
        }

        if (override.replacement_text) {
          parts.push(`<span class="adminOverrideBadge isEdited">Edited</span>`);
        }

        return `
          <div class="adminTranscriptOverrideRow">
            <div class="adminTranscriptOverrideMeta">
              <strong>${escapeHtml(label)}</strong>
              ${parts.join("")}
            </div>

            ${
              override.replacement_text
                ? `
                  <div class="adminTranscriptEditedText">
                    ${formatMessageText(override.replacement_text)}
                  </div>
                `
                : ""
            }
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdminTranscriptMessage(message, userAId, userBId) {
  const senderName = message.is_system
    ? "Admin"
    : getAdminProfileName(message.sender_id);

  const sideClass = message.sender_id === userAId ? "fromA" : "fromB";
  const systemClass = message.is_system ? " isSystem" : "";

  const globalOverride = getAdminGlobalOverride(message);
  const recipientOverride = getAdminRecipientOverride(message);

  const globalHidden = !!globalOverride?.is_hidden;
  const recipientHidden = !!recipientOverride?.is_hidden;

  const globalEdited = !!globalOverride?.replacement_text;
  const recipientEdited = !!recipientOverride?.replacement_text;

  const recipientName = getAdminProfileName(message.recipient_id);

  const visibleToName =
    message.visible_to_user_id
      ? getAdminProfileName(message.visible_to_user_id)
      : message.system_visible_to_user_id
        ? getAdminProfileName(message.system_visible_to_user_id)
        : "Both users";

  const systemVisibleToName = message.system_visible_to_user_id
    ? getAdminProfileName(message.system_visible_to_user_id)
    : "Both users";

  const injectedLabel = message.admin_injected_kind
    ? `Admin injected · ${visibleToName}`
    : "";

  const messageId = escapeAttr(message.id || "");
  const recipientId = escapeAttr(message.recipient_id || "");

  const globalActions = `
    <button
      type="button"
      data-admin-edit-message="${messageId}"
    >
      ${message.is_system ? "Edit system note" : "Edit for everyone"}
    </button>

    ${
      globalEdited
        ? `
          <button
            type="button"
            data-admin-clear-edit-everyone="${messageId}"
          >
            ${message.is_system ? "Clear system edit" : "Clear everyone edit"}
          </button>
        `
        : ""
    }

    <button
      type="button"
      data-admin-toggle-hide-everyone="${messageId}"
      data-admin-currently-hidden="${globalHidden ? "true" : "false"}"
    >
      ${
        globalHidden
          ? (message.is_system ? "Unhide system note" : "Unhide for everyone")
          : (message.is_system ? "Hide system note" : "Hide for everyone")
      }
    </button>
  `;

  const recipientActions = message.is_system
    ? ""
    : `
      <button
        type="button"
        data-admin-recipient-edit-message="${messageId}"
        data-admin-recipient-id="${recipientId}"
      >
        Edit for ${escapeHtml(recipientName)}
      </button>

      ${
        recipientEdited
          ? `
            <button
              type="button"
              data-admin-clear-edit-recipient="${messageId}"
              data-admin-recipient-id="${recipientId}"
            >
              Clear ${escapeHtml(recipientName)} edit
            </button>
          `
          : ""
      }

      <button
        type="button"
        data-admin-toggle-hide-recipient="${messageId}"
        data-admin-recipient-id="${recipientId}"
        data-admin-currently-hidden="${recipientHidden ? "true" : "false"}"
      >
        ${
          recipientHidden
            ? `Unhide for ${escapeHtml(recipientName)}`
            : `Hide for ${escapeHtml(recipientName)}`
        }
      </button>
    `;

  return `
    <article
      class="adminTranscriptLine ${sideClass}${systemClass}"
      data-admin-message-id="${messageId}"
    >
      <div class="adminTranscriptLineMeta">
        <strong>${escapeHtml(senderName)}</strong>
        <span>${escapeHtml(fmtTime(message.created_at))}</span>

        ${
          message.is_system
            ? `<em>System note · ${escapeHtml(systemVisibleToName)}</em>`
            : ""
        }

        ${
          injectedLabel
            ? `<em>${escapeHtml(injectedLabel)}</em>`
            : ""
        }
      </div>

      <div class="adminTranscriptLineBody">
        ${formatMessageText(message.text || "")}
      </div>

      ${renderAdminOverrideSummary(message)}

      <div class="adminTranscriptActions">
        ${globalActions}
        ${recipientActions}
      </div>
    </article>
  `;
}

async function loadAdminPairTranscript(userAId, userBId) {
  const { data: messages, error } = await sb
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userAId},recipient_id.eq.${userBId}),and(sender_id.eq.${userBId},recipient_id.eq.${userAId})`
    )
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rawMessages = messages || [];
  const messageIds = rawMessages
    .map(message => message.id)
    .filter(Boolean);

  const overrides = await loadMessageOverrides(messageIds);

  return rawMessages.map(message => ({
    ...message,
    admin_overrides: overrides.filter(override => override.message_id === message.id)
  }));
}

function bindAdminTranscriptModerationActions(root = document, userAId, userBId) {
  root.querySelectorAll("[data-admin-edit-message]:not([data-bound])").forEach(btn => {
    btn.dataset.bound = "true";

    btn.addEventListener("click", async () => {
      const messageId = btn.dataset.adminEditMessage;
      const currentLine = btn.closest(".adminTranscriptLine");
      const currentText =
        currentLine?.querySelector(".adminTranscriptLineBody")?.innerText || "";

    const isSystem = !!btn.closest(".adminTranscriptLine")?.classList.contains("isSystem");

const nextText = prompt(
  isSystem ? "Edit system note:" : "Edit message text for everyone:",
  currentText
);
      if (nextText === null) return;

btn.disabled = true;
await adminEditMessageForEveryone(messageId, nextText, userAId, userBId);
    });
  });

root.querySelectorAll("[data-admin-toggle-hide-everyone]:not([data-bound])").forEach(btn => {
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    const messageId = btn.dataset.adminToggleHideEveryone;
    const currentlyHidden = btn.dataset.adminCurrentlyHidden === "true";

    const confirmed = confirm(
      currentlyHidden
        ? "Unhide this message for everyone?"
        : "Hide this message for everyone?"
    );

    if (!confirmed) return;

    btn.disabled = true;
    await adminToggleHideMessageForEveryone(
      messageId,
      !currentlyHidden,
      userAId,
      userBId
    );
  });
});

root.querySelectorAll("[data-admin-toggle-hide-recipient]:not([data-bound])").forEach(btn => {
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    const messageId = btn.dataset.adminToggleHideRecipient;
    const recipientId = btn.dataset.adminRecipientId;
    const currentlyHidden = btn.dataset.adminCurrentlyHidden === "true";

    const confirmed = confirm(
      currentlyHidden
        ? `Unhide this message for ${getAdminProfileName(recipientId)}?`
        : `Hide this message for ${getAdminProfileName(recipientId)} only?`
    );

    if (!confirmed) return;

    await adminToggleHideMessageForRecipient(
      messageId,
      recipientId,
      !currentlyHidden,
      userAId,
      userBId
    );
  });
});

  root.querySelectorAll("[data-admin-recipient-edit-message]:not([data-bound])").forEach(btn => {
    btn.dataset.bound = "true";

    btn.addEventListener("click", async () => {
      const messageId = btn.dataset.adminRecipientEditMessage;
      const recipientId = btn.dataset.adminRecipientId;

      const currentLine = btn.closest(".adminTranscriptLine");
      const currentText =
        currentLine?.querySelector(".adminTranscriptLineBody")?.innerText || "";

      const nextText = prompt(
        `Edit how ${getAdminProfileName(recipientId)} sees this message:`,
        currentText
      );

      if (nextText === null) return;

      await adminEditMessageForRecipient(messageId, recipientId, nextText, userAId, userBId);
    });
  });

  root.querySelectorAll("[data-admin-clear-edit-everyone]:not([data-bound])").forEach(btn => {
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    const messageId = btn.dataset.adminClearEditEveryone;

    const confirmed = confirm("Clear the edited version for everyone?");
    if (!confirmed) return;

    btn.disabled = true;
    await adminClearEditForEveryone(messageId, userAId, userBId);
  });
});

root.querySelectorAll("[data-admin-clear-edit-recipient]:not([data-bound])").forEach(btn => {
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    const messageId = btn.dataset.adminClearEditRecipient;
    const recipientId = btn.dataset.adminRecipientId;

    const confirmed = confirm(`Clear the edited version for ${getAdminProfileName(recipientId)}?`);
    if (!confirmed) return;

    btn.disabled = true;
    await adminClearEditForRecipient(messageId, recipientId, userAId, userBId);
  });
});
}

function renderAdminTypingDraft(payload, userAId, userBId) {
  const draftEl = document.getElementById("adminPairLiveDraft");
  if (!draftEl) return;

  const text = String(payload?.text || "").trim();

  if (!text) {
    draftEl.hidden = true;
    draftEl.innerHTML = "";
    return;
  }

  const senderName = getAdminProfileName(payload.sender);

  draftEl.hidden = false;
  draftEl.innerHTML = `
    <article class="adminTranscriptLine isDraft">
      <div class="adminTranscriptLineMeta">
        <strong>${escapeHtml(senderName)}</strong>
        <span>typing…</span>
      </div>

      <div class="adminTranscriptLineBody">
        ${formatMessageText(payload.text || "")}
      </div>
    </article>
  `;

  if (adminPairPanelDraftTimeout) {
    clearTimeout(adminPairPanelDraftTimeout);
  }

  adminPairPanelDraftTimeout = setTimeout(() => {
    draftEl.hidden = true;
    draftEl.innerHTML = "";
  }, 4000);

  draftEl.scrollIntoView({ block: "end" });
}

async function subscribeAdminPairPanelRealtime(userAId, userBId) {
  if (adminPairPanelChannel) {
    await sb.removeChannel(adminPairPanelChannel);
    adminPairPanelChannel = null;
  }

  const transcriptEl = document.getElementById("adminPairTranscript");
  if (!transcriptEl) return;

  const isInPair = payload => {
    return (
      (payload.sender === userAId && payload.recipient === userBId) ||
      (payload.sender === userBId && payload.recipient === userAId)
    );
  };

  const isMessageInPair = message => {
    return (
      (message.sender_id === userAId && message.recipient_id === userBId) ||
      (message.sender_id === userBId && message.recipient_id === userAId)
    );
  };

  adminPairPanelChannel = sb
    .channel(`admin-panel-dm:${pairKey(userAId, userBId)}`, {
      config: {
        broadcast: { self: false }
      }
    })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async payload => {
        const message = payload.new;
        if (!isMessageInPair(message)) return;

        await markAdminPairRead(userAId, userBId);

        const draftEl = document.getElementById("adminPairLiveDraft");
        if (draftEl) {
          draftEl.hidden = true;
          draftEl.innerHTML = "";
        }

        transcriptEl.insertAdjacentHTML(
          "beforeend",
          renderAdminTranscriptMessage(message, userAId, userBId)
        );

        bindAdminTranscriptModerationActions(document, userAId, userBId);
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
      }
    )
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!isInPair(payload)) return;

      const draftEl = document.getElementById("adminPairLiveDraft");
      if (!draftEl) return;

      draftEl.hidden = false;
draftEl.innerHTML = `
  <article class="adminTranscriptLine isDraft">
    <div class="adminTranscriptLineMeta">
      <strong>${escapeHtml(getAdminProfileName(payload.sender))}</strong>
      <span>typing…</span>
    </div>
  </article>
`;

      if (adminPairPanelDraftTimeout) {
        clearTimeout(adminPairPanelDraftTimeout);
      }

      adminPairPanelDraftTimeout = setTimeout(() => {
        draftEl.hidden = true;
        draftEl.innerHTML = "";
      }, 4000);
    })
    .on("broadcast", { event: "draft_update" }, ({ payload }) => {
      if (!isInPair(payload)) return;
      renderAdminTypingDraft(payload, userAId, userBId);
    })
    .on("broadcast", { event: "draft_clear" }, ({ payload }) => {
      if (!isInPair(payload)) return;

      const draftEl = document.getElementById("adminPairLiveDraft");
      if (!draftEl) return;

      draftEl.hidden = true;
      draftEl.innerHTML = "";
    })
    .subscribe();
}

async function renderAdminPairChatWorkspace(content, userAId, userBId, options = {}) {
  const backMode = options.backMode || "pairings";
  const userAName = getAdminProfileName(userAId);
  const userBName = getAdminProfileName(userBId);

  content.innerHTML = `
    <section class="adminPanel adminPairTranscriptPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Pair transcript</h3>
          <p class="muted">
            Live conversation between ${escapeHtml(userAName)} and ${escapeHtml(userBName)}.
          </p>
        </div>

        <button type="button" class="btn btnGhost" data-back-to-pairings>
          ${backMode === "chats" ? "Back to chats" : "Back to pairings"}
        </button>
      </div>

      <div class="adminPairTranscriptHeader">
        <span>${escapeHtml(userAName)}</span>
        <span>↔</span>
        <span>${escapeHtml(userBName)}</span>
      </div>

      <div class="adminPairPresenceStrip" id="adminPairPresenceStrip">
  <span class="adminPresencePill isOffline" data-admin-presence-user="${escapeAttr(userAId)}">
    <i></i>
    ${escapeHtml(userAName)}
    <strong>Offline</strong>
  </span>

  <span class="adminPresencePill isOffline" data-admin-presence-user="${escapeAttr(userBId)}">
    <i></i>
    ${escapeHtml(userBName)}
    <strong>Offline</strong>
  </span>
</div>

<div id="adminPairTranscript" class="adminPairTranscript">
  Loading transcript...
</div>

<div id="adminPairLiveDraft" class="adminPairLiveDraft" hidden></div>

<form class="adminSystemComposer" id="adminSystemComposer">
<div>
  <label for="adminSystemMessageText">Admin message</label>
  <p>Send a system note, or send a private message that appears from one user to the other.</p>
</div>

  <div class="adminSystemComposerMain">
    <div class="adminSystemFormatBar" aria-label="Format system message">
      <button type="button" class="adminFormatBtn" data-admin-format="bold" aria-label="Bold">
        <strong>B</strong>
      </button>

      <button type="button" class="adminFormatBtn" data-admin-format="italic" aria-label="Italic">
        <em>I</em>
      </button>

      <button type="button" class="adminFormatBtn" data-admin-format="underline" aria-label="Underline">
        <u>U</u>
      </button>

      <button type="button" class="adminFormatBtn" data-admin-format="bullet" aria-label="Bullet list">
        •
      </button>
    </div>

    <textarea
      id="adminSystemMessageText"
      rows="2"
      placeholder="Write a system note..."
    ></textarea>

<label class="adminSystemAudienceField">
  <span>Mode</span>
  <select id="adminMessageMode">
    <option value="system_both">System note · both users</option>
    <option value="system_a">System note · ${escapeHtml(userAName)} only</option>
    <option value="system_b">System note · ${escapeHtml(userBName)} only</option>
    <option value="as_b_to_a">Message to ${escapeHtml(userAName)} · appears from ${escapeHtml(userBName)}</option>
    <option value="as_a_to_b">Message to ${escapeHtml(userBName)} · appears from ${escapeHtml(userAName)}</option>
  </select>
</label>
  </div>

  <button type="submit" class="btn">
    Send system note
  </button>
</form>
    </section>
  `;

content
  .querySelector("[data-back-to-pairings]")
  ?.addEventListener("click", async () => {
    await cleanupAdminPairTranscriptChannels();

    if (backMode === "chats") {
     await renderAdminWorkspace("chats");
    } else {
      renderAdminPairingsWorkspace(content);
    }
  });

content.querySelector("#adminSystemComposer")?.addEventListener("submit", async event => {
  event.preventDefault();

  const textarea = content.querySelector("#adminSystemMessageText");
  const text = textarea?.value?.trim();

  if (!text) return;

  const submitBtn = content.querySelector("#adminSystemComposer button[type='submit']");
  const originalText = submitBtn?.textContent || "Send message";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
  }

  try {
    const mode = content.querySelector("#adminMessageMode")?.value || "system_both";

    let row = {
      text,
      admin_injected_by: me.id,
      admin_injected_kind: mode
    };

    if (mode === "system_both") {
      row = {
        ...row,
        sender_id: userAId,
        recipient_id: userBId,
        is_system: true,
        visible_to_user_id: null,
        system_visible_to_user_id: null
      };
    }

    if (mode === "system_a") {
      row = {
        ...row,
        sender_id: userBId,
        recipient_id: userAId,
        is_system: true,
        visible_to_user_id: userAId,
        system_visible_to_user_id: userAId
      };
    }

    if (mode === "system_b") {
      row = {
        ...row,
        sender_id: userAId,
        recipient_id: userBId,
        is_system: true,
        visible_to_user_id: userBId,
        system_visible_to_user_id: userBId
      };
    }

    if (mode === "as_b_to_a") {
      row = {
        ...row,
        sender_id: userBId,
        recipient_id: userAId,
        is_system: false,
        visible_to_user_id: userAId,
        system_visible_to_user_id: null
      };
    }

    if (mode === "as_a_to_b") {
      row = {
        ...row,
        sender_id: userAId,
        recipient_id: userBId,
        is_system: false,
        visible_to_user_id: userBId,
        system_visible_to_user_id: null
      };
    }

    const { error } = await sb.from("messages").insert(row);

    if (error) throw error;

    textarea.value = "";

    const messages = await loadAdminPairTranscript(userAId, userBId);
    const transcriptEl = content.querySelector("#adminPairTranscript");

    if (transcriptEl) {
      transcriptEl.innerHTML = messages.length
        ? messages
            .map(message => renderAdminTranscriptMessage(message, userAId, userBId))
            .join("")
        : `<div class="adminResponsesEmpty">No messages yet.</div>`;

      bindAdminTranscriptModerationActions(content, userAId, userBId);
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }
  } catch (error) {
    console.error("Could not send admin message", error);
    alert(error?.message || "Could not send admin message.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
});

bindAdminSystemComposerFormatting(content);
  const transcriptEl = content.querySelector("#adminPairTranscript");

  try {
    const messages = await loadAdminPairTranscript(userAId, userBId);

    transcriptEl.innerHTML = messages.length
      ? messages
          .map(message => renderAdminTranscriptMessage(message, userAId, userBId))
          .join("")
      : `<div class="adminResponsesEmpty">No messages yet.</div>`;

      bindAdminTranscriptModerationActions(content, userAId, userBId);

    transcriptEl.scrollTop = transcriptEl.scrollHeight;

    if (backMode === "chats") {
      await markAdminPairRead(userAId, userBId);
    }

    await subscribeAdminPairPanelRealtime(userAId, userBId);
    await subscribeAdminPairOverrideRealtime(userAId, userBId);
    await subscribeAdminPairPresence(userAId, userBId);
  } catch (error) {
    console.error("Could not load pair transcript", error);
    transcriptEl.innerHTML = `
      <div class="adminResponsesEmpty">
        Could not load transcript.
      </div>
    `;
  }
}

function updateAdminPairPresenceUI(userAId, userBId, onlineIds = new Set()) {
  [userAId, userBId].forEach(userId => {
    const pill = document.querySelector(
      `[data-admin-presence-user="${CSS.escape(userId)}"]`
    );

    if (!pill) return;

    const isOnline = onlineIds.has(userId);

    pill.classList.toggle("isOnline", isOnline);
    pill.classList.toggle("isOffline", !isOnline);

    const strong = pill.querySelector("strong");
    if (strong) {
      strong.textContent = isOnline ? "Online" : "Offline";
    }
  });
}

async function subscribeAdminPairPresence(userAId, userBId) {
  if (adminPairPresenceChannel) {
    await sb.removeChannel(adminPairPresenceChannel);
    adminPairPresenceChannel = null;
  }

  adminPairPresenceChannel = sb.channel("sole:user-presence", {
    config: {
      presence: {
        key: `admin-${me.id}-${userAId}-${userBId}`
      }
    }
  });

  function syncPresence() {
    const state = adminPairPresenceChannel.presenceState();
    const onlineIds = new Set();

    Object.entries(state).forEach(([presenceKey, presences]) => {
      if (!Array.isArray(presences) || !presences.length) return;

      presences.forEach(presence => {
        if (presence?.user_id) {
          onlineIds.add(presence.user_id);
        } else {
          onlineIds.add(presenceKey);
        }
      });
    });

    updateAdminPairPresenceUI(userAId, userBId, onlineIds);
  }

  adminPairPresenceChannel
    .on("presence", { event: "sync" }, syncPresence)
    .on("presence", { event: "join" }, syncPresence)
    .on("presence", { event: "leave" }, syncPresence)
    .subscribe(async status => {
      if (status !== "SUBSCRIBED") return;

      // Track admin too, but UI only checks userA/userB.
      await adminPairPresenceChannel.track({
        user_id: me.id,
        display_name: me.display_name || me.username || "Admin",
        is_admin: true,
        online_at: new Date().toISOString()
      });

      syncPresence();
    });
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
                    &
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
    const userAId = btn.dataset.openPairChat;
    const userBId = btn.dataset.openPairChatB;

    if (!userAId || !userBId) return;

    await renderAdminPairChatWorkspace(content, userAId, userBId);
  });
});
}

function getAdminPairedGroups() {
  return adminPairings
    .map(pairing => {
      const userA = adminProfiles.find(profile => profile.id === pairing.user_a);
      const userB = adminProfiles.find(profile => profile.id === pairing.user_b);

      if (!userA || !userB) return null;

      return {
        pairing,
        userA,
        userB,
        key: `${userA.id}__${userB.id}`,
        label: `${userA.display_name} ↔ ${userB.display_name}`
      };
    })
    .filter(Boolean);
}

function getAdminStablePairIds(userAId, userBId) {
  return [userAId, userBId].sort();
}

function getAdminReadPairKey(userAId, userBId) {
  return getAdminStablePairIds(userAId, userBId).join("__");
}

function formatAdminChatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  const sameDay = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat(undefined, {
    hour: sameDay ? "2-digit" : undefined,
    minute: sameDay ? "2-digit" : undefined,
    month: sameDay ? undefined : "short",
    day: sameDay ? undefined : "numeric"
  }).format(date);
}

function getAdminMessagePreview(message, userA, userB) {
  if (!message) return "No messages yet.";

  if (message.is_system) {
    return `System: ${message.text || ""}`;
  }

  const sender =
    message.sender_id === userA.id
      ? userA
      : message.sender_id === userB.id
        ? userB
        : null;

  const senderName = sender?.display_name || sender?.username || "Unknown";

  return `${senderName}: ${message.text || ""}`;
}

async function markAdminPairRead(userAId, userBId) {
  if (!me?.id || !userAId || !userBId) return;

  const [stableA, stableB] = getAdminStablePairIds(userAId, userBId);
  const now = new Date().toISOString();

  const { error } = await sb
    .from("admin_pair_reads")
    .upsert(
      {
        admin_id: me.id,
        pair_key: getAdminReadPairKey(userAId, userBId),
        user_a: stableA,
        user_b: stableB,
        last_read_at: now,
        updated_at: now
      },
      { onConflict: "admin_id,pair_key" }
    );

  if (error) {
    console.warn("Could not mark admin chat read", error);
  }
}

async function loadAdminChatOverviewRows() {
  const pairs = getAdminPairedGroups();

  const rows = await Promise.all(
    pairs.map(async pair => {
      const userAId = pair.userA.id;
      const userBId = pair.userB.id;
      const pairKeyValue = getAdminReadPairKey(userAId, userBId);

      const [{ data: latest, error: latestError }, { data: readRow, error: readError }] =
        await Promise.all([
          sb
            .from("messages")
          .select("id,sender_id,recipient_id,text,is_system,created_at,visible_to_user_id,admin_injected_by,admin_injected_kind")
            .or(
              `and(sender_id.eq.${userAId},recipient_id.eq.${userBId}),and(sender_id.eq.${userBId},recipient_id.eq.${userAId})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          sb
            .from("admin_pair_reads")
            .select("last_read_at")
            .eq("admin_id", me.id)
            .eq("pair_key", pairKeyValue)
            .maybeSingle()
        ]);

      if (latestError) {
        console.warn("Could not load latest admin chat message", latestError);
      }

      if (readError) {
        console.warn("Could not load admin chat read state", readError);
      }

      const lastReadAt = readRow?.last_read_at || "1970-01-01T00:00:00.000Z";

      let unreadCount = 0;

      if (latest?.created_at && latest.created_at > lastReadAt) {
        const { count, error: countError } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .or(
            `and(sender_id.eq.${userAId},recipient_id.eq.${userBId}),and(sender_id.eq.${userBId},recipient_id.eq.${userAId})`
          )
          .gt("created_at", lastReadAt)
          .or("is_system.is.null,is_system.eq.false");

        if (countError) {
          console.warn("Could not count unread admin chat messages", countError);
        } else {
          unreadCount = count || 0;
        }
      }

      return {
        ...pair,
        pairKey: pairKeyValue,
        latest: latest || null,
        latestAt: latest?.created_at || pair.pairing?.created_at || null,
        unreadCount
      };
    })
  );

  return rows.sort((a, b) => {
    const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
    const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;
    return bTime - aTime;
  });
}

async function subscribeAdminChatsOverview(content) {
  if (adminChatsOverviewChannel) {
    await sb.removeChannel(adminChatsOverviewChannel);
    adminChatsOverviewChannel = null;
  }

  adminChatsOverviewChannel = sb
    .channel(`admin-chats-overview:${me.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async () => {
        if (!content.querySelector("#adminChatsOverviewList")) return;
        await renderAdminChatsWorkspace(content);
      }
    )
    .subscribe();
}

async function renderAdminChatsWorkspace(content) {
  await cleanupAdminPairTranscriptChannels();

  const rows = await loadAdminChatOverviewRows();

  content.innerHTML = `
    <section class="adminPanel adminChatsOverviewPanel">
      <div class="adminPanelHeader">
        <div>
          <h3>Chats</h3>
          <p class="muted">
            Monitor live pair transcripts, inject system notes, and moderate message appearance.
          </p>
        </div>
      </div>

      <div id="adminChatsOverviewList" class="adminChatsOverviewList">
        ${
          rows.length
            ? rows.map(row => {
                const hasUnread = row.unreadCount > 0;

                return `
                  <button
                    type="button"
                    class="adminChatOverviewRow ${hasUnread ? "hasUnread" : ""}"
                    data-open-admin-chat="${escapeAttr(row.userA.id)}"
                    data-open-admin-chat-b="${escapeAttr(row.userB.id)}"
                  >
                    <span class="adminChatAvatar">
                      ${escapeHtml((row.userA.display_name || row.userA.username || "?").slice(0, 1))}
                    </span>

                    <span class="adminChatOverviewMain">
                      <span class="adminChatOverviewTop">
                        <strong>
                          ${escapeHtml(row.userA.display_name || row.userA.username || "User")}
                          ↔
                          ${escapeHtml(row.userB.display_name || row.userB.username || "User")}
                        </strong>

                        <time>
                          ${escapeHtml(formatAdminChatTime(row.latestAt))}
                        </time>
                      </span>

                      <span class="adminChatPreview">
                        ${escapeHtml(getAdminMessagePreview(row.latest, row.userA, row.userB))}
                      </span>
                    </span>

                    ${
                      hasUnread
                        ? `<span class="adminChatUnreadBadge">${row.unreadCount}</span>`
                        : `<span class="adminChatReadSpacer"></span>`
                    }
                  </button>
                `;
              }).join("")
            : `<div class="adminResponsesEmpty">No active pair chats yet.</div>`
        }
      </div>
    </section>
  `;

  content.querySelectorAll("[data-open-admin-chat]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userAId = btn.dataset.openAdminChat;
      const userBId = btn.dataset.openAdminChatB;

      if (!userAId || !userBId) return;

      await renderAdminPairChatWorkspace(content, userAId, userBId, {
        backMode: "chats"
      });
    });
  });

  await subscribeAdminChatsOverview(content);
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
setHeaderSubtitle("Quiz templates");

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
  clearTimeout(previewDraftClearTimeout);
  previewDraftClearTimeout = null;

  clearTimeout(typingTimeout);
  reactingUntil = 0;

  messagesEl.innerHTML = "";
  messagesEl.appendChild(typingIndicator);
  hideTypingIndicator();
  clearLiveDraft?.();
  removeResponseNeuralRow?.();

  const previewPartner = await getAssignedPartner(profile.id);

  chatTitle.textContent = `Preview: ${profile.display_name}`;
  setHeaderSubtitle(
    previewPartner
      ? `Live pair thread with ${previewPartner.display_name}`
      : "Dashboard preview"
  );

  textInput.value = "";
  textInput.disabled = true;
  updateSendButton();

  if (!previewPartner) {
    them = null;
    viewA = null;
    viewB = null;

    if (channel) {
      await sb.removeChannel(channel);
      channel = null;
    }

    await window.dashboardUI.mountWelcomeDashboard({
      messagesEl,
      mainEl,
      sb,
      me: profile,
      escapeHtml,
      adminPreview: true
    });

    return;
  }

  // The observed pair.
  viewA = profile.id;
  viewB = previewPartner.id;

  // Keep this for normal thread alignment:
  // profile appears on the right, partner appears on the left.
  them = previewPartner;

  await loadThread(viewA, viewB, profile.id);

  await subscribeRealtime(viewA, viewB, profile.id, {
    adminObserver: true
  });
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

chatTitle.textContent = `ADMIN: ${aName} → ${bName}`;
setHeaderSubtitle("Live pair thread");

await loadThread(viewA, viewB, /*alignAs*/ viewA);

await subscribeRealtime(viewA, viewB, /*alignAs*/ viewA, {
  adminObserver: true
});

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
setHeaderSubtitle("Dashboard preview");
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

  setHeaderSubtitle("Control centre");

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
setHeaderSubtitle("Viewing as user");
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
   await subscribeRealtime(viewA, viewB, viewA, {
  adminObserver: true
});
    chatTitle.textContent = "Admin chat view";
  setHeaderSubtitle("Live thread");
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
setHeaderSubtitle("Quiz templates");

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    adminHome: true
  });
}
