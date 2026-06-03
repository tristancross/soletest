// ====== BOOT ======
async function checkSession() {
  const { data } = await sb.auth.getSession();

  if (data.session) {
    currentUser = data.session.user;
    authScreen.style.display = "none";
    await initChat();
  } else {
    showLoginForm(false);
  }
}

(async function init() {
  authScreen.style.display = "grid";
  await checkSession();
})(); 



function applyMe(){
  const displayName = me?.display_name || me?.username || "User";

  const railInitial = document.getElementById("soleRailUserInitial");
  const railAccountName = document.getElementById("soleRailAccountName");

  if (railInitial) {
    railInitial.textContent = displayName.trim().slice(0, 1).toUpperCase() || "U";
  }

  if (railAccountName) {
    railAccountName.textContent = displayName;
  }

  adminToggleBtn.hidden = !me.is_admin;
  adminControls.hidden = true;
}

async function refreshSidebarProgressFromScoring({
  animateFromZero = false
} = {}) {
  const startingCandidates =
    window.soleExperimentScoring?.DEFAULT_CANDIDATE_POOL || 102437;


    

    try {
  if (me?.id) {
    const { data: freshProfile, error: freshProfileError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", me.id)
      .maybeSingle();

    if (freshProfileError) {
      console.warn("Could not refresh profile for scoring", freshProfileError);
    } else if (freshProfile) {
      me = freshProfile;
      applyMe();
    }
  }
} catch (error) {
  console.warn("Profile refresh failed during sidebar scoring", error);
}

  if (!me || !sb || !window.soleExperimentScoring) {
    updateSidebarProgress({
      connection: 0,
      attraction: 0,
      confidence: 0,
      candidates: startingCandidates,
      totalCandidates: startingCandidates,
      animateFromZero
    });
    return;
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
    me,
    me?.score_baseline_set_at || null
  );

  messageCount = messageStats.count;
} catch (error) {
  console.warn("Could not load daily message stats for sidebar scoring", error);
}

try {
 runtimeAssignments = await loadRuntimeAssignmentsFromSupabase(sb, me, {
  includeLocked: true
});
} catch (error) {
  console.warn("Could not load assignments for sidebar scoring", error);
}

try {
  const responseState = await loadQuizResponsesFromSupabase(sb, me);

  saveStoredDashboardResponses(me, responseState.responses);
  saveStoredDashboardProgress(me, responseState.progress);
} catch (error) {
  console.warn("Could not load quiz responses for sidebar scoring", error);
}

const dash = getDashboardState(me, messageCount, runtimeAssignments, messageStats);

  updateSidebarProgress({
    connection: dash.connection,
    attraction: dash.attraction,
    confidence: dash.confidence,
    candidates: dash.remainingCandidates,
    totalCandidates: startingCandidates,
    startingCandidates,
    animateFromZero
  });
}

function setupSidebarDashboardScreens() {
  const sidebarPaneEl = document.querySelector(".sidebarNavPane");
  if (!sidebarPaneEl) return;

  const defaultMenuMarkup = sidebarPaneEl.innerHTML;

window.sidebarDashboardUI = {
  renderMenu() {
    const appEl = document.querySelector(".app.soleRedesignApp");

    if (appEl) {
      delete appEl.dataset.activeModule;
    }

    sidebarPaneEl.innerHTML = defaultMenuMarkup;
    bindSidebarModuleButtons();
    bindProgressHoverLinks();

    requestAnimationFrame(async () => {
      await refreshSidebarProgressFromScoring();

      updateSidebarDailyTasks();
      updateInsightNotificationDots();
    });
  }
};

function bindSidebarModuleButtons() {
  sidebarPaneEl
    .querySelectorAll("[data-dashboard-screen]")
    .forEach(btn => {
      btn.addEventListener("click", async () => {
        const screen = btn.dataset.dashboardScreen;

        if (!["chemistry", "attraction", "solemate"].includes(screen)) return;

        const railAction =
          screen === "chemistry"
            ? "connection"
            : screen;

        document.querySelectorAll(".soleRailItem").forEach(btn => {
          btn.classList.toggle("isActive", btn.dataset.soleRail === railAction);
        });

        await window.dashboardUI.mountSidebarDashboardScreen({
          screen,
          sidebarPaneEl,
          mainEl,
          sb,
          me,
          escapeHtml
        });

        await updateInsightNotificationDots();
      });
    });
}

 bindSidebarModuleButtons();
bindProgressHoverLinks();
}

function bindProgressHoverLinks() {
  const sidebarPaneEl = document.querySelector(".sidebarNavPane");
  if (!sidebarPaneEl) return;

  const ring = sidebarPaneEl.querySelector(".dualProgressRing");
  if (!ring) return;

  const chemistryCard = sidebarPaneEl.querySelector('[data-progress-card="chemistry"]');
  const attractionCard = sidebarPaneEl.querySelector('[data-progress-card="attraction"]');

  const chemistryRing = sidebarPaneEl.querySelector(".ringFillChemistry");
  const attractionRing = sidebarPaneEl.querySelector(".ringFillAttraction");

  chemistryCard?.addEventListener("mouseenter", () => {
    ring.classList.add("chemistryHover");
  });

  chemistryCard?.addEventListener("mouseleave", () => {
    ring.classList.remove("chemistryHover");
  });

  attractionCard?.addEventListener("mouseenter", () => {
    ring.classList.add("attractionHover");
  });

  attractionCard?.addEventListener("mouseleave", () => {
    ring.classList.remove("attractionHover");
  });

  chemistryRing?.addEventListener("mouseenter", () => {
    chemistryCard?.classList.add("isLinkedHover");
  });

  chemistryRing?.addEventListener("mouseleave", () => {
    chemistryCard?.classList.remove("isLinkedHover");
  });

  attractionRing?.addEventListener("mouseenter", () => {
    attractionCard?.classList.add("isLinkedHover");
  });

  attractionRing?.addEventListener("mouseleave", () => {
    attractionCard?.classList.remove("isLinkedHover");
  });

chemistryCard?.addEventListener("click", async () => {
  await window.dashboardUI.mountSidebarDashboardScreen({
    screen: "chemistry",
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml
  });

  await updateInsightNotificationDots();
});

attractionCard?.addEventListener("click", async () => {
  await window.dashboardUI.mountSidebarDashboardScreen({
    screen: "attraction",
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml
  });

  await updateInsightNotificationDots();
});
}
