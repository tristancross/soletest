// SOLE REDESIGN V1
// Small, reversible enhancement layer for the new rail nav + dashboard home.
(function(){
  function qs(sel, root = document){ return root.querySelector(sel); }
  function qsa(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

function getDisplayName(){
  const railAccountName =
    document.querySelector("#soleRailAccountName")?.textContent?.trim() || "";

  const railInitial =
    document.querySelector("#soleRailUserInitial")?.textContent?.trim() || "";

  return (
    railAccountName ||
    window.me?.display_name ||
    window.me?.username ||
    railInitial ||
    "User"
  );
}

function getTimeGreeting(){
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

  function enhanceBrand(){
    const brand = qs("#brandHome");
    if (!brand || brand.dataset.redesignEnhanced === "true") return;
    brand.dataset.redesignEnhanced = "true";
    brand.innerHTML = `<span class="soleBrandMark"><span>S</span><span class="soleLogoOrb" aria-hidden="true"></span><span>LE</span></span>`;
  }

function enhanceGreeting(){
  const pane = qs(".sidebarNavPane");
  if (!pane || qs(".soleDashboardGreeting")) return;

  const greeting = document.createElement("section");
  greeting.className = "soleDashboardGreeting";
  greeting.innerHTML = `
    <h2>${getTimeGreeting()}, ${escapeHtml(getDisplayName())}</h2>
    <p>Thoughtful connections start here.</p>
  `;

  pane.prepend(greeting);
}

  function updateProgressLabels(){
    const chemistry = qs('[data-progress-card="chemistry"] .progressStatLabel');
    const candidates = qs('[data-progress-card="candidates"] .progressStatLabel');

    if (chemistry) chemistry.innerHTML = "Based on your values,<br>conversations & behaviour.";
    if (candidates) candidates.innerHTML = "Narrowing the pool<br>toward your one best match.";

    const chemistryCard = qs('[data-progress-card="chemistry"]');
    const candidateCard = qs('[data-progress-card="candidates"]');

    if (chemistryCard && !qs(".soleProgressCardTitle", chemistryCard)) {
      chemistryCard.insertAdjacentHTML("afterbegin", `<div class="soleProgressCardTitle">Compatibility<br>Confidence</div>`);
    }

    if (candidateCard && !qs(".soleProgressCardTitle", candidateCard)) {
      candidateCard.insertAdjacentHTML("afterbegin", `<div class="soleProgressCardTitle">Candidate Refinement</div>`);
    }
  }

function insertDailyHero(sidebarPane){
  if (!sidebarPane || qs(".soleDailyHero", sidebarPane)) return;

  const hero = document.createElement("section");
  hero.className = "soleDailyHero";
hero.innerHTML = `
  <div class="soleDailyHeroContent">

    <h3>Your Solemate</h3>

    <p>
      Each signal sharpens your profile as Sole narrows the field toward
      one connection.
    </p>

<button class="soleModuleExplore soleModuleExploreHero">
  <span>Explore</span>
  <i class="fa-solid fa-arrow-right"></i>
</button>
  </div>

  <div class="solemateOrbit" aria-hidden="true">
    <div class="solemateCrosshair"></div>

    <div class="solemateRing ring5"></div>
    <div class="solemateRing ring4"></div>
    <div class="solemateRing ring3"></div>
    <div class="solemateRing ring2"></div>
    <div class="solemateRing ring1"></div>
    <div class="solemateRing ring0"></div>

    <div class="solemateCore"></div>
  </div>
`;

  const tasks = qs(".sidebarTasksPane", sidebarPane);

  if (tasks) {
    tasks.insertAdjacentElement("beforebegin", hero);
  } else {
    sidebarPane.appendChild(hero);
  }
}

function insertModuleTiles(sidebarPane){
  if (!sidebarPane || qs(".soleModuleTiles", sidebarPane)) return;

  const tiles = document.createElement("section");
  tiles.className = "soleModuleTiles";
tiles.innerHTML = `
  <article class="soleModuleTile attractionCard" data-kind="attraction">
    <div class="soleModuleTileHeader">
      <h4>
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Attraction</span>
      </h4>
    </div>

    <p>Discover what draws you in and sustains desire.</p>

  <button class="soleModuleExplore" type="button" data-dashboard-screen="attraction" aria-label="Open Attraction">
      <span>Explore</span>
      <i class="fa-solid fa-arrow-right"></i>
    </button>

<div class="attractionSky" aria-hidden="true">
  <span class="firework fireworkA"></span>
  <span class="firework fireworkB"></span>
  <span class="firework fireworkC"></span>
</div>
  </article>

    <article class="soleModuleTile connectionCard" data-kind="connection">
    <div class="soleModuleTileHeader">
      <h4>
        <i class="fa-regular fa-heart"></i>
        <span>Connection</span>
      </h4>
    </div>

    <p>Explore how you connect and communicate.</p>

   <button class="soleModuleExplore" type="button" data-dashboard-screen="chemistry" aria-label="Open Connection">
      <span>Explore</span>
      <i class="fa-solid fa-arrow-right"></i>
    </button>

<div class="connectionArt" aria-hidden="true">
  <span class="connectionCircle left"></span>
  <span class="connectionCircle right"></span>
</div>
  </article>
`;

  const tasks = qs(".sidebarTasksPane", sidebarPane);

  if (tasks) {
    tasks.insertAdjacentElement("beforebegin", tiles);
  } else {
    sidebarPane.appendChild(tiles);
  }
}



function enhanceDashboard(){
  const sidebarPane = qs(".sidebarNavPane");
  if (!sidebarPane) return;

  const isModuleScreen = !!sidebarPane.querySelector(".moduleHero, .moduleSubviewTabs");

  if (isModuleScreen) {
    sidebarPane.querySelector(".soleDailyHero")?.remove();
    sidebarPane.querySelector(".soleModuleTiles")?.remove();
    sidebarPane.querySelector(".soleDashboardGreeting")?.remove();
    settleProgressPanel();
    return;
  }

  enhanceGreeting(sidebarPane);
  insertDailyHero(sidebarPane);
  insertModuleTiles(sidebarPane);
  settleProgressPanel();
}

async function openModule(screen){
  const sidebarPaneEl = qs(".sidebarNavPane");
  if (!sidebarPaneEl || !window.dashboardUI?.mountSidebarDashboardScreen) return;

  sidebarPaneEl.querySelector(".soleDailyHero")?.remove();
  sidebarPaneEl.querySelector(".soleModuleTiles")?.remove();
  sidebarPaneEl.querySelector(".soleDashboardGreeting")?.remove();

  await window.dashboardUI.mountSidebarDashboardScreen({
    screen,
    sidebarPaneEl,
    mainEl,
    sb,
    me,
    escapeHtml
  });

  settleProgressPanel();

  await window.updateInsightNotificationDots?.();
}

  async function handleRailClick(target){
    const action = target.closest("[data-sole-rail]")?.dataset.soleRail;
    if (!action) return;

    qsa(".soleRailItem").forEach(btn => btn.classList.toggle("isActive", btn.dataset.soleRail === action));

    if (action === "home") {
      window.sidebarDashboardUI?.renderMenu?.();
      setTimeout(enhanceDashboard, 0);
      return;
    }

    if (action === "connection" || action === "calibration") {
      await openModule("chemistry");
      return;
    }

    if (action === "attraction") {
      await openModule("attraction");
      return;
    }

    if (action === "insights") {
      await openModule("chemistry");
      setTimeout(() => {
        const insightsTab = qs('[data-module-subview-tab="insights"]');
        insightsTab?.click?.();
      }, 80);
      return;
    }

if (action === "settings" || action === "account") {
  const account = qs("#soleRailAccount");
  account?.classList.toggle("open");
  return;
}
  }

  function bindRail(){
    document.addEventListener("click", event => {
      const target = event.target.closest("[data-sole-rail]");
      if (!target) return;
      handleRailClick(target);
    });
  }

  function observeSidebar(){
    const pane = qs(".sidebarNavPane");
    if (!pane) return;

    const obs = new MutationObserver(() => {
      requestAnimationFrame(enhanceDashboard);
    });

    obs.observe(pane, { childList:true, subtree:false });
  }

  function escapeHtml(s){
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function init(){
    bindRail();
    observeSidebar();
    enhanceDashboard();
    setTimeout(enhanceDashboard, 500);
    setTimeout(enhanceDashboard, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

document.addEventListener("click", event => {
  const msgWrap = event.target.closest(".msgWrap");

  document.querySelectorAll(".msgWrap.showMeta").forEach(el => {
    if (el !== msgWrap) el.classList.remove("showMeta");
  });

  if (!msgWrap) return;

  msgWrap.classList.toggle("showMeta");
});