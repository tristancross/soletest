// ====== MOBILE ======
function isMobileLayout() {
  return window.innerWidth <= 768;
}

function isCurrentChatActuallyVisible() {
  if (document.visibilityState !== "visible") return false;

  if (adminMode || !them) return false;

  if (isMobileLayout() && appEl.classList.contains("mobileSidebarOpen")) {
    return false;
  }

  return true;
}

async function updateInsightNotificationDots() {
  if (!me?.id || !window.dashboardUI?.loadUserInsightsFromSupabase) return;

  let insights = [];

  try {
    insights = await window.dashboardUI.loadUserInsightsFromSupabase(sb, me.id);
  } catch (error) {
    console.warn("Could not load insight notification dots", error);
    return;
  }

  ["chemistry", "attraction"].forEach(category => {
    const hasUnread = insights.some(insight =>
      insight.category === category &&
      (insight.status === "active" || insight.status === "revealed") &&
      !insight.viewed_at
    );

    document
      .querySelectorAll(
        `[data-progress-card="${category}"], [data-module-subview-tab="insights"][data-module-category="${category}"]`
      )
      .forEach(el => {
        el.classList.toggle("hasUnreadInsight", hasUnread);
      });
  });
}

async function updateSidebarDailyTasks() {
const taskCards = document.querySelectorAll(".sidebarTaskCard[data-task-id]");
  const countEl = document.getElementById("sidebarTasksCount");

  if (!taskCards.length || !me) return;

  const taskListEl = document.querySelector(".sidebarTaskList");

let chemistryDone = false;
let attractionDone = false;
let chemistryStarted = false;
let attractionStarted = false;

try {
  const assignments = await window.dashboardUI.loadRuntimeAssignmentsFromSupabase(sb, me);
  const responseState = await window.dashboardUI.loadQuizResponsesFromSupabase?.(sb, me);

const responses = responseState?.responses || {};
const progress = responseState?.progress || {};

  const isModuleComplete = moduleName => {
    const moduleAssignments = assignments.filter(item => {
      const category = String(item.meta?.category || "").toLowerCase();
      return category === moduleName;
    });

    // If there are no active tasks in that module, don't auto-tick it.
    if (!moduleAssignments.length) return false;

const completed = moduleAssignments.every(assignment => {
  return !!responses[assignment.id]?.completed;
});

const started = moduleAssignments.some(assignment => {
  return !!responses[assignment.id] || !!progress[assignment.id];
});

if (moduleName === "chemistry") {
  chemistryStarted = started;
}

if (moduleName === "attraction") {
  attractionStarted = started;
}

return completed;
  };

  chemistryDone = isModuleComplete("chemistry");
  attractionDone = isModuleComplete("attraction");
} catch (error) {
  console.warn("Could not calculate module task completion", error);
}

let replyGoalTask = null;

try {
  const tasks = await window.dashboardUI.loadUserTasksFromSupabase(sb, me.id);
  replyGoalTask = tasks.find(task =>
    task.task_type === "reply_goal" &&
    task.status === "active"
  ) || null;
} catch (error) {
  console.warn("Could not load reply goal task", error);
}

let dayReplyGoal = 50;

try {
  const dayIndex = window.soleExperimentScoring?.getExperimentDayIndex
    ? window.soleExperimentScoring.getExperimentDayIndex(me)
    : 1;

  const dayConfig = window.soleDayConfigs?.getExperimentDayConfigFromCache
    ? window.soleDayConfigs.getExperimentDayConfigFromCache(dayIndex)
    : null;

  dayReplyGoal = Number(dayConfig?.reply_goal || 50);
} catch (error) {
  console.warn("Could not resolve day reply goal", error);
}

const replyTarget = Number(
  replyGoalTask?.target_count ||
  dayReplyGoal ||
  50
);
const replyWindowMinutes = Number(replyGoalTask?.timeframe_minutes || 1440);
const replyStartsAt = replyGoalTask?.starts_at
  ? new Date(replyGoalTask.starts_at)
  : new Date(Date.now() - replyWindowMinutes * 60 * 1000);

  let replyCount = 0;

if (assignedPartner?.id) {
 const sinceIso = replyStartsAt.toISOString();

  const { count, error } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", assignedPartner.id)
    .eq("recipient_id", me.id)
    .gte("created_at", sinceIso);

  if (!error) replyCount = count || 0;
}

  const replyDone = replyCount >= replyTarget;

  const states = {
    chemistry: chemistryDone,
    attraction: attractionDone,
    replies: replyDone
  };

taskCards.forEach(card => {
  const taskId = card.dataset.taskId;
  const isComplete = !!states[taskId];

  card.classList.toggle("isComplete", isComplete);

  const actionEl = card.querySelector(".sidebarTaskAction");

if (actionEl) {
  if (taskId === "chemistry") {
    actionEl.textContent = chemistryDone
      ? "Complete"
      : chemistryStarted
        ? "Continue"
        : "Start";
  }

  if (taskId === "attraction") {
    actionEl.textContent = attractionDone
      ? "Complete"
      : attractionStarted
        ? "Continue"
        : "Start";
  }

if (taskId === "replies") {
  actionEl.innerHTML = isComplete
    ? `<i class="fa-solid fa-check"></i>`
    : "Active";

  actionEl.classList.toggle("isStatus", !isComplete);
}
}
});

  const replyCountEl = document.getElementById("replyTaskCount");
  const replyProgressEl = document.getElementById("replyTaskProgress");

if (replyCountEl) replyCountEl.textContent = Math.min(replyCount, replyTarget);
if (replyProgressEl) replyProgressEl.style.width = `${Math.min(100, (replyCount / replyTarget) * 100)}%`;

const replyTitleEl = document.querySelector('[data-task-id="replies"] .sidebarTaskTitle');
const replyDescEl = document.querySelector('[data-task-id="replies"] .sidebarTaskDesc');

if (replyTitleEl) replyTitleEl.textContent = `Receive ${replyTarget} replies from your partner`;
if (replyDescEl) replyDescEl.textContent = `${Math.min(replyCount, replyTarget)} / ${replyTarget} received`;

  let dbTasks = [];

try {
  dbTasks = await window.dashboardUI.loadUserTasksFromSupabase(sb, me.id);
} catch (error) {
  console.warn("Could not load user tasks", error);
}

taskListEl?.querySelectorAll("[data-db-task-id]").forEach(el => el.remove());

dbTasks
 .filter(task => task.task_type !== "reply_goal")
.filter(task => task.status === "active" || task.status === "completed")
  .forEach(task => {
    const isComplete = task.status === "completed";

    const button = document.createElement("button");
    button.type = "button";
    button.className = `sidebarTaskCard${isComplete ? " isComplete" : ""}`;
    button.dataset.dbTaskId = task.id;

    button.innerHTML = `
      <div class="sidebarTaskIcon general">
        <i class="fa-solid fa-list-check"></i>
      </div>

      <div class="sidebarTaskText">
        <div class="sidebarTaskTitle">${escapeHtml(task.title || "Untitled task")}</div>
        <div class="sidebarTaskDesc">
          ${escapeHtml(task.description || "Assigned task")}
        </div>
      </div>

      <div class="sidebarTaskAction">
        ${isComplete ? "Complete" : "Active"}
      </div>
    `;

    taskListEl?.appendChild(button);

    states[`task_${task.id}`] = isComplete;
  });

  const total = Object.keys(states).length;
  const complete = Object.values(states).filter(Boolean).length;

  if (countEl) countEl.textContent = `${complete} of ${total} completed`;
}

async function updateMobileMenuUnreadBadge() {
  if (!mobileMenuUnreadBadge) return;

  const unreadCounts = await getUnreadCounts();

  let total = 0;

  for (const [senderId, count] of unreadCounts.entries()) {
    if (them && senderId === them.id) continue;
    total += count;
  }

  if (total > 0) {
    mobileMenuUnreadBadge.hidden = false;
    mobileMenuUnreadBadge.textContent = total > 99 ? "99+" : String(total);
  } else {
    mobileMenuUnreadBadge.hidden = true;
    mobileMenuUnreadBadge.textContent = "";
  }
}

function openMobileSidebar() {
  if (!isMobileLayout()) return;
  appEl.classList.add("mobileSidebarOpen");
}

async function closeMobileSidebar() {
  appEl.classList.remove("mobileSidebarOpen");

  if (isCurrentChatActuallyVisible()) {
    await markThreadAsRead(me.id, them.id);
    await renderSidebar(them?.id);
    await updateConversationStatus();
    updateMobileMenuUnreadBadge();
  }
}

function updateNoChatState() {
  const showingDashboardPreview = adminMode && !!adminDashboardProfile;
  const noChat = (!them && !adminMode) || showingDashboardPreview;
  mainEl.classList.toggle("noChatSelected", noChat);
}


let isApplyingSoleHistoryState = false;

function normaliseSoleRailAction(action) {
  if (action === "calibration" || action === "chemistry") return "connection";
  if (action === "insights") return "solemate";

  if (
    action === "home" ||
    action === "attraction" ||
    action === "connection" ||
    action === "solemate"
  ) {
    return action;
  }

  return null;
}

function getSoleHistoryKey(route) {
  if (route?.kind === "mobile" && route.view === "messages") return "messages";
  return normaliseSoleRailAction(route?.action) || "home";
}

function getSoleRouteFromHash() {
  const hash = String(window.location.hash || "").replace("#", "").trim();

  if (hash === "messages") {
    return { kind: "mobile", view: "messages" };
  }

  const action = normaliseSoleRailAction(hash);
  if (action) {
    return { kind: "rail", action };
  }

  return null;
}



function writeSoleHistory(route, options = {}) {
  if (isApplyingSoleHistoryState) return;

  const key = getSoleHistoryKey(route);
  const currentKey = history.state?.soleHistoryKey;

  if (currentKey === key && !options.replace && !options.force) return;

  const state = {
    ...(history.state || {}),
    soleAppHistory: true,
    soleHistoryKey: key,
    soleRoute: route
  };

  const url = options.keepUrl
    ? window.location.href
    : `#${key}`;

  if (options.replace) {
    history.replaceState(state, "", url);
  } else {
    history.pushState(state, "", url);
  }
}

window.soleAppHistoryPush = function(route, options = {}) {
  writeSoleHistory(route, options);
};

window.soleAppHistoryIsApplying = function() {
  return !!isApplyingSoleHistoryState;
};

async function applySoleHistoryRoute(route) {
  const key = getSoleHistoryKey(route);

  isApplyingSoleHistoryState = true;

  try {
    closeMobileRailMenu();

    if (key === "messages") {
      if (isMobileLayout()) {
        setMobileView("messages", { writeHistory: false });
      } else {
        await window.soleRedesignNavigate?.("home");
      }

      return;
    }

    if (isMobileLayout()) {
      setMobileView("home", { writeHistory: false });
    }

    await window.soleRedesignNavigate?.(key);
  } finally {
    isApplyingSoleHistoryState = false;
  }
}

function initSoleAppHistory() {
  if (window.__soleAppHistoryReady) return;
  window.__soleAppHistoryReady = true;

  const initialRoute = getSoleRouteFromHash() || { kind: "rail", action: "home" };

  writeSoleHistory(initialRoute, {
    replace: true,
    keepUrl: true
  });

  window.addEventListener("popstate", event => {
    const route =
      event.state?.soleRoute ||
      getSoleRouteFromHash() ||
      { kind: "rail", action: "home" };

    applySoleHistoryRoute(route);
  });


}

function setMobileView(view, options = {}) {
  if (!isMobileLayout()) return;

  const nextView = view === "messages" ? "messages" : "home";
  const isMessages = nextView === "messages";

  document.body.classList.toggle("mobileViewMessages", isMessages);
  document.body.classList.toggle("mobileViewHome", !isMessages);

  if (isMessages && options.writeHistory !== false) {
    writeSoleHistory({
      kind: "mobile",
      view: "messages"
    });
  }

  if (isMessages && them) {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });

    markThreadAsRead(me.id, them.id)
      .then(() => updateMobileMenuUnreadBadge?.())
      .catch(error => console.warn("Could not mark mobile thread as read", error));
  }
}

function openMobileRailMenu() {
  if (!isMobileLayout()) return;

  document.body.classList.add("mobileMenuOpen");
  document.getElementById("mobileMenuBtnGlobal")?.setAttribute("aria-expanded", "true");
}

function closeMobileRailMenu() {
  document.body.classList.remove("mobileMenuOpen");
  document.getElementById("mobileMenuBtnGlobal")?.setAttribute("aria-expanded", "false");
}

function initMobileTopNavigation() {
  const chatBtn = document.getElementById("mobileChatBtn");
  const menuBtn = document.getElementById("mobileMenuBtnGlobal");
  const oldHeaderMenuBtn = document.getElementById("mobileMenuBtn");
  const scrim = document.getElementById("mobileRailScrim");

  chatBtn?.addEventListener("click", () => {
    setMobileView("messages");
    closeMobileRailMenu();
  });

  menuBtn?.addEventListener("click", () => {
    if (document.body.classList.contains("mobileMenuOpen")) {
      closeMobileRailMenu();
    } else {
      openMobileRailMenu();
    }
  });

  oldHeaderMenuBtn?.addEventListener("click", () => {
    if (document.body.classList.contains("mobileMenuOpen")) {
      closeMobileRailMenu();
    } else {
      openMobileRailMenu();
    }
  });

  scrim?.addEventListener("click", closeMobileRailMenu);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileRailMenu();
  });

document.addEventListener("click", event => {
  const railTarget = event.target.closest("[data-sole-rail]");
  if (!railTarget) return;

  if (isMobileLayout()) {
    const action = railTarget.dataset.soleRail;

    if (action === "home") {
      setMobileView("home", { writeHistory: false });
    } else if (action !== "account" && action !== "settings") {
      setMobileView("home", { writeHistory: false });
    }
  }

  closeMobileRailMenu();
});

window.addEventListener("resize", () => {
  if (!isMobileLayout()) {
    closeMobileRailMenu();
    document.body.classList.remove("mobileViewHome", "mobileViewMessages", "mobileMenuOpen");
    appEl.classList.remove("mobileSidebarOpen");
    return;
  }

  if (
    !document.body.classList.contains("mobileViewHome") &&
    !document.body.classList.contains("mobileViewMessages")
  ) {
    const route = history.state?.soleRoute || getSoleRouteFromHash();

    if (route?.kind === "mobile" && route.view === "messages") {
      setMobileView("messages", { writeHistory: false });
    } else {
      setMobileView("home", { writeHistory: false });
    }
  }
});

initSoleAppHistory();

if (isMobileLayout()) {
  const initialRoute = history.state?.soleRoute || getSoleRouteFromHash();

  if (initialRoute?.kind === "mobile" && initialRoute.view === "messages") {
    setMobileView("messages", { writeHistory: false });
  } else {
    setMobileView("home", { writeHistory: false });
  }
}
}

initMobileTopNavigation();