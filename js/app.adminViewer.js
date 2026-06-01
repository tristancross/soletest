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
          ${adminProfiles.map(profile => `
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
          ${adminProfiles.map(profile => `
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
          ${adminProfiles.map(profile => `
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
        ${adminProfiles.map(profile => `
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
