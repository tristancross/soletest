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

function setupSidebarDashboardScreens() {
  const sidebarPaneEl = document.querySelector(".sidebarNavPane");
  if (!sidebarPaneEl) return;

  const defaultMenuMarkup = sidebarPaneEl.innerHTML;

window.sidebarDashboardUI = {
  renderMenu() {
    sidebarPaneEl.innerHTML = defaultMenuMarkup;
    bindSidebarModuleButtons();
bindProgressHoverLinks();

    requestAnimationFrame(() => {
updateSidebarProgress({
  connection: 78,
  attraction: 65,
  confidence: 82,
  candidates: 98341,
  totalCandidates: 102341
});

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

if (screen === "chemistry" || screen === "attraction") {
  await window.dashboardUI.mountSidebarDashboardScreen({
    screen,
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml
  });

  await updateInsightNotificationDots();
}
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
