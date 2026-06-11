// SOLE REDESIGN V1
// Small, reversible enhancement layer for the new rail nav + dashboard home.
(function(){
  function qs(sel, root = document){ return root.querySelector(sel); }
  function qsa(sel, root = document){ return Array.from(root.querySelectorAll(sel)); }

function getDisplayName(){
  const globalMe =
    typeof me !== "undefined"
      ? me
      : window.me;

  const profileName =
    globalMe?.display_name ||
    globalMe?.username ||
    "";

  const railAccountName =
    document.querySelector("#soleRailAccountName")?.textContent?.trim() || "";

  const railInitial =
    document.querySelector("#soleRailUserInitial")?.textContent?.trim() || "";

  const storedProfile = (() => {
    try {
      const raw = localStorage.getItem("sole_profile");
      const parsed = raw ? JSON.parse(raw) : null;

      return (
        parsed?.display_name ||
        parsed?.username ||
        parsed?.email ||
        ""
      );
    } catch (_) {
      return "";
    }
  })();

  return (
    profileName ||
    railAccountName ||
    storedProfile ||
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
  if (!pane) return;

  let greeting = qs(".soleDashboardGreeting", pane);

  if (!greeting) {
    greeting = document.createElement("section");
    greeting.className = "soleDashboardGreeting";
    pane.prepend(greeting);
  }

  greeting.innerHTML = `
    <h2>${getTimeGreeting()}, ${escapeHtml(getDisplayName())}!</h2>
  `;
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

    <h3>Your SoleMate</h3>

    <p>
      Each signal sharpens your profile as Sole narrows the field toward
      one connection.
    </p>

<button
  class="soleModuleExplore soleModuleExploreHero"
  type="button"
  data-dashboard-screen="solemate"
  aria-label="Open Solemate"
>
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

         <i class="fa-solid fa-circle-nodes"></i>
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

  const appEl = qs(".app.soleRedesignApp");
  const activeModule = appEl?.dataset?.activeModule || "";

  const isModuleScreen =
    !!activeModule ||
    !!sidebarPane.querySelector(".moduleHero, .moduleSubviewTabs, .betaFeedbackPanel");

  if (isModuleScreen) {
    sidebarPane.querySelector(".soleDailyHero")?.remove();
    sidebarPane.querySelector(".soleModuleTiles")?.remove();
    sidebarPane.querySelector(".soleDashboardGreeting")?.remove();
    sidebarPane.querySelector(".soleDashboardStatusRow")?.remove();
    return;
  }

  enhanceGreeting(sidebarPane);
  insertDailyHero(sidebarPane);
  insertModuleTiles(sidebarPane);
  insertSignalLayers(sidebarPane);
}

function getRailActionForModuleScreen(screen){
  if (screen === "chemistry") return "connection";
  if (screen === "connection") return "connection";
  if (screen === "attraction") return "attraction";
  if (screen === "solemate") return "solemate";
  return null;
}

function setActiveRailItem(action){
  if (!action) return;

  qsa(".soleRailItem").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.soleRail === action);
  });
}

function wait(ms){
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function getSidebarPane(){
  return qs(".sidebarNavPane");
}

function clearModuleTransitionClasses(pane){
  if (!pane) return;

  pane.classList.remove(
    "isModuleHidden",
    "isModuleLoading",
    "isModuleEntering"
  );
}

async function openModule(screen){
  const sidebarPaneEl = getSidebarPane();

  if (!sidebarPaneEl || !window.dashboardUI?.mountSidebarDashboardScreen) return;

  if (window.soleModuleTransitioning) return;
  window.soleModuleTransitioning = true;

  const appEl = qs(".app.soleRedesignApp");

  try {
    clearModuleTransitionClasses(sidebarPaneEl);

    /*
      Fade the current module/home content away first.
      Do NOT show the new module content until it has mounted.
    */
    sidebarPaneEl.classList.add("isModuleHidden");

    await wait(180);

    setActiveRailItem(getRailActionForModuleScreen(screen));

    if (appEl) {
      appEl.dataset.activeModule = screen;
      appEl.dataset.transitionModule = screen;
    }

    sidebarPaneEl.classList.add("isModuleLoading");

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

    await window.updateInsightNotificationDots?.();

    /*
      New content exists now, but is still hidden by .isModuleHidden.
      Remove the veil, then animate the new content in.
    */
    sidebarPaneEl.classList.remove("isModuleLoading");
    sidebarPaneEl.classList.add("isModuleEntering");

    requestAnimationFrame(() => {
      sidebarPaneEl.classList.remove("isModuleHidden");
    });

    window.setTimeout(() => {
      sidebarPaneEl.classList.remove("isModuleEntering");
    }, 560);
  } finally {
    window.soleModuleTransitioning = false;

    if (appEl) {
      delete appEl.dataset.transitionModule;
    }
  }
}

function renderBetaFeedbackScreen(sidebarPaneEl) {
  if (!sidebarPaneEl) return;

  sidebarPaneEl.innerHTML = `
<section class="betaFeedbackPanel moduleHero">
      <div class="betaFeedbackHeader">
        <div class="dashboardEyebrow">Beta feedback</div>
        <h3>Sole Feedback</h3>
        <p>
          Sole is currently in a closed beta test. Use this box for bugs,
          confusing moments, anything that feels broken, or thoughts about how
          you’re finding your chat partner.
        </p>
      </div>

<div class="betaFeedbackCard" id="betaFeedbackCard">
  <div class="betaFeedbackForm" id="betaFeedbackForm">
    <label class="betaFeedbackLabel" for="betaFeedbackText">
      Your feedback
    </label>

    <textarea
      id="betaFeedbackText"
      class="betaFeedbackTextarea"
      placeholder="What did you notice?"
      rows="8"
    ></textarea>

    <div class="betaFeedbackActions">
      <p class="betaFeedbackStatus" id="betaFeedbackStatus" aria-live="polite"></p>

      <button type="button" class="soleModuleExplore betaFeedbackSendBtn" id="betaFeedbackSendBtn">
        <span>Send</span>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </div>

  <div class="betaFeedbackThanks" id="betaFeedbackThanks" hidden>
    <i class="fa-regular fa-circle-check"></i>
    <strong>Thank you — feedback received!</strong>
  </div>
</div>
    </section>
  `;

const cardEl = sidebarPaneEl.querySelector("#betaFeedbackCard");
const formEl = sidebarPaneEl.querySelector("#betaFeedbackForm");
const thanksEl = sidebarPaneEl.querySelector("#betaFeedbackThanks");
const textEl = sidebarPaneEl.querySelector("#betaFeedbackText");
const sendBtn = sidebarPaneEl.querySelector("#betaFeedbackSendBtn");
const statusEl = sidebarPaneEl.querySelector("#betaFeedbackStatus");

  sendBtn?.addEventListener("click", async () => {
    const feedbackText = textEl?.value?.trim();

    if (!feedbackText) {
      statusEl.textContent = "Write a little feedback first.";
      statusEl.dataset.kind = "error";
      return;
    }

    sendBtn.disabled = true;
    statusEl.textContent = "Sending...";
    statusEl.dataset.kind = "";

    const appEl = qs(".app.soleRedesignApp");
    const pageContext = appEl?.dataset?.activeModule || "home";

    const { error } = await sb
      .from("beta_feedback")
      .insert({
        user_id: me.id,
        feedback_text: feedbackText,
        page_context: pageContext,
        user_agent: navigator.userAgent
      });

    if (error) {
      console.warn("Could not submit beta feedback", error);
      statusEl.textContent = "Could not send feedback. Try again in a moment.";
      statusEl.dataset.kind = "error";
      sendBtn.disabled = false;
      return;
    }

textEl.value = "";
statusEl.textContent = "";
statusEl.dataset.kind = "";

cardEl?.classList.add("isSubmitted");
if (formEl) formEl.hidden = true;
if (thanksEl) thanksEl.hidden = false;

window.setTimeout(() => {
  cardEl?.classList.remove("isSubmitted");
  if (thanksEl) thanksEl.hidden = true;
  if (formEl) formEl.hidden = false;
  sendBtn.disabled = false;
  textEl?.focus?.();
}, 10000);
  });
}

async function handleRailClick(target){
  const action = target.closest("[data-sole-rail]")?.dataset.soleRail;
  if (!action) return;

  const historyAction =
    action === "calibration" || action === "chemistry"
      ? "connection"
      : action === "insights"
        ? "solemate"
        : action;

if (
  ["home", "attraction", "connection", "solemate", "feedback"].includes(historyAction) &&
  !window.soleAppHistoryIsApplying?.()
) {
    window.soleAppHistoryPush?.({
      kind: "rail",
      action: historyAction
    });
  }
  if (
    isDesktopLayout?.() &&
    action !== "account" &&
    qs(".app.soleRedesignApp")?.classList.contains("isChatFocus")
  ) {
    setDesktopChatFocus(false);
    localStorage.setItem("sole_desktop_chat_focus", "0");
  }

  setActiveRailItem(action);
if (action === "home") {
  const sidebarPaneEl = getSidebarPane();
  const appEl = qs(".app.soleRedesignApp");

  if (window.soleModuleTransitioning) return;
  window.soleModuleTransitioning = true;

  try {
    clearModuleTransitionClasses(sidebarPaneEl);

    sidebarPaneEl?.classList.add("isModuleHidden");

    await wait(170);

    setActiveRailItem("home");

    if (appEl) {
      delete appEl.dataset.activeModule;
      delete appEl.dataset.transitionModule;
    }

    sidebarPaneEl?.classList.add("isModuleLoading");

    window.sidebarDashboardUI?.renderMenu?.();

    setTimeout(enhanceDashboard, 0);

    await wait(80);

    sidebarPaneEl?.classList.remove("isModuleLoading");
    sidebarPaneEl?.classList.add("isModuleEntering");

    requestAnimationFrame(() => {
      sidebarPaneEl?.classList.remove("isModuleHidden");
    });

    window.setTimeout(() => {
      sidebarPaneEl?.classList.remove("isModuleEntering");
    }, 560);
  } finally {
    window.soleModuleTransitioning = false;
  }

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

if (action === "solemate" || action === "insights") {
  await openModule("solemate");
  return;
}

if (action === "feedback") {
  const sidebarPaneEl = getSidebarPane();
  const appEl = qs(".app.soleRedesignApp");

  if (window.soleModuleTransitioning) return;
  window.soleModuleTransitioning = true;

  try {
    clearModuleTransitionClasses(sidebarPaneEl);
    sidebarPaneEl?.classList.add("isModuleHidden");

    await wait(170);

    setActiveRailItem("feedback");

    if (appEl) {
      appEl.dataset.activeModule = "feedback";
      appEl.dataset.transitionModule = "feedback";
    }

    sidebarPaneEl?.classList.add("isModuleLoading");

    renderBetaFeedbackScreen(sidebarPaneEl);

    await wait(80);

    sidebarPaneEl?.classList.remove("isModuleLoading");
    sidebarPaneEl?.classList.add("isModuleEntering");

    requestAnimationFrame(() => {
      sidebarPaneEl?.classList.remove("isModuleHidden");
    });

    window.setTimeout(() => {
      sidebarPaneEl?.classList.remove("isModuleEntering");
    }, 560);
  } finally {
    window.soleModuleTransitioning = false;

    if (appEl) {
      delete appEl.dataset.transitionModule;
    }
  }

  return;
}

if (action === "account") {
  const account = qs("#soleRailAccount");
  account?.classList.toggle("open");
  return;
}
  }

    function isDesktopLayout(){
    return window.matchMedia("(min-width: 769px)").matches;
  }

  function setDesktopChatFocus(isFocused){
    const appEl = qs(".app.soleRedesignApp");
    const toggleBtn = qs(".soleRailMenuBtn");

    if (!appEl) return;

    appEl.classList.toggle("isChatFocus", !!isFocused);

    if (toggleBtn) {
      toggleBtn.setAttribute("aria-expanded", String(!isFocused));
      toggleBtn.setAttribute(
        "aria-label",
        isFocused ? "Show dashboard" : "Focus chat"
      );
    }
  }

  function bindDesktopChatFocusToggle(){
    const appEl = qs(".app.soleRedesignApp");
    const toggleBtn = qs(".soleRailMenuBtn");

    if (!appEl || !toggleBtn) return;

const storedFocusRaw = localStorage.getItem("sole_desktop_chat_focus");

/* Default desktop login/load to chat focus.
   Still respects the user's later toggle choice once stored. */
const storedFocus = storedFocusRaw === null
  ? true
  : storedFocusRaw === "1";

if (isDesktopLayout()) {
  setDesktopChatFocus(storedFocus);
}

    toggleBtn.addEventListener("click", event => {
      if (!isDesktopLayout()) return;

      event.preventDefault();
      event.stopPropagation();

      const nextFocused = !appEl.classList.contains("isChatFocus");

      setDesktopChatFocus(nextFocused);
      localStorage.setItem("sole_desktop_chat_focus", nextFocused ? "1" : "0");
    });

    window.addEventListener("resize", () => {
      if (!isDesktopLayout()) {
        appEl.classList.remove("isChatFocus");
        return;
      }

const storedFocusRaw = localStorage.getItem("sole_desktop_chat_focus");

const shouldFocus = storedFocusRaw === null
  ? true
  : storedFocusRaw === "1";

setDesktopChatFocus(shouldFocus);
    });
  }

  function bindRail(){
    document.addEventListener("click", event => {
      const target = event.target.closest("[data-sole-rail]");
      if (!target) return;
      handleRailClick(target);
    });
  }

  function insertSignalLayers(sidebarPane) {
  if (!sidebarPane) return;

  const tasksPane = qs(".sidebarTasksPane", sidebarPane);
  if (!tasksPane) return;

  if (qs(".signalLayersCard", sidebarPane)) return;

  let statusRow = qs(".soleDashboardStatusRow", sidebarPane);

  if (!statusRow) {
    statusRow = document.createElement("section");
    statusRow.className = "soleDashboardStatusRow";
    tasksPane.insertAdjacentElement("beforebegin", statusRow);
    statusRow.appendChild(tasksPane);
  }

  const signalCard = document.createElement("section");
  signalCard.className = "signalLayersCard";
  signalCard.setAttribute("aria-label", "Signal layers");

  signalCard.innerHTML = `
    <div class="signalLayersHeader">
      <div>
        <div class="signalLayersEyebrow">Sole Progress</div>
      </div>

<button
  class="signalLayersInfo"
  type="button"
  aria-label="About signal layers"
  data-signal-tooltip-title="Sole Progress"
  data-signal-tooltip-body="Each layer sharpens as Sole learns from your answers and conversation."
>
  i
</button>
    </div>

    <div class="signalLayersBody">
      <div class="signalOrb" data-active-layer="candidates">
        <svg class="signalRings" viewBox="0 0 140 140" aria-hidden="true">
<circle class="signalRingTrack" cx="70" cy="70" r="61" stroke-width="5"></circle>
<circle
  class="signalRingFill"
  data-layer="candidates"
  data-signal-tooltip-title="Candidates"
  data-signal-tooltip-body="Sole is refining the candidate pool, filtering out incompatible candidates and advancing towards the highest quality matches."
  cx="70"
  cy="70"
  r="61"
  stroke-width="5"
></circle>

<circle class="signalRingTrack" cx="70" cy="70" r="49" stroke-width="5"></circle>
<circle
  class="signalRingFill"
  data-layer="confidence"
  data-signal-tooltip-title="Confidence"
  data-signal-tooltip-body="Sole’s certainty in the current matchmaking model, based on your answers, behavior, and available conversational signals."
  cx="70"
  cy="70"
  r="49"
  stroke-width="5"
></circle>

<circle class="signalRingTrack" cx="70" cy="70" r="37" stroke-width="5"></circle>
<circle
  class="signalRingFill"
  data-layer="connection"
  data-signal-tooltip-title="Connection"
  data-signal-tooltip-body="Sole is modelling how you bond, communicate, and build momentum with someone over time."
  cx="70"
  cy="70"
  r="37"
  stroke-width="5"
></circle>

<circle class="signalRingTrack" cx="70" cy="70" r="25" stroke-width="5"></circle>
<circle
  class="signalRingFill"
  data-layer="attraction"
  data-signal-tooltip-title="Attraction"
  data-signal-tooltip-body="Sole is modelling the patterns, preferences, and signals that shape what draws you in."
  cx="70"
  cy="70"
  r="25"
  stroke-width="5"
></circle>
        </svg>

<div class="signalOrbCenter">
  <strong data-signal-center-value>102,437</strong>
  <span data-signal-center-label>Candidates</span>
</div>
      </div>

      </div>
      <div class="signalLayerList">
<button
  class="signalLayerBtn"
  type="button"
  data-signal-layer="attraction"
  data-signal-tooltip-title="Attraction"
  data-signal-tooltip-body="Sole is modelling the patterns, preferences, and signals that shape what draws you in."
  style="--signal-layer-color:#ff4f73"
>
          <i class="signalLayerDot"></i>
          <span>Attraction</span>
          <strong data-signal-value="attraction">0%</strong>
        </button>

<button
  class="signalLayerBtn"
  type="button"
  data-signal-layer="connection"
  data-signal-tooltip-title="Connection"
  data-signal-tooltip-body="Sole is modelling how you bond, communicate, and build momentum with someone over time."
  style="--signal-layer-color:#20aa91"
>
          <i class="signalLayerDot"></i>
          <span>Connection</span>
          <strong data-signal-value="connection">0%</strong>
        </button>

<button
  class="signalLayerBtn"
  type="button"
  data-signal-layer="confidence"
  data-signal-tooltip-title="Confidence"
  data-signal-tooltip-body="Sole's current confidence in its predictive matchmaking model, based on your answers, behavior, and available conversational signals."
  style="--signal-layer-color:#2dcfd0"
>
          <i class="signalLayerDot"></i>
          <span>Confidence</span>
          <strong data-signal-value="confidence">0%</strong>
        </button>

<button
  class="signalLayerBtn isActive"
  type="button"
  data-signal-layer="candidates"
  data-signal-tooltip-title="Candidates"
data-signal-tooltip-body="Sole is refining the candidate pool, filtering out incompatible candidates and advancing towards the highest quality matches."
  style="--signal-layer-color:#d7a928"
>
          <i class="signalLayerDot"></i>
          <span>Candidates</span>
          <strong data-signal-value="candidates">102,437</strong>
        </button>
      </div>


  `;

statusRow.insertAdjacentElement("afterbegin", signalCard);

// bindSignalLayers(signalCard);
syncSignalLayersFromHud();

requestAnimationFrame(() => {
  setSignalLayerActive("candidates");
});
}

// function bindSignalLayers(root) {
//   if (!root) return;

//   root.querySelectorAll("[data-signal-layer]").forEach(btn => {
//     btn.addEventListener("click", () => {
//       setSignalLayerActive(btn.dataset.signalLayer);
//     });
//   });
// }

function setSignalLayerActive(layer, {
  numericValues = null,
  formatters = null,
  animateCenter = false
} = {}) {
  const card = qs(".signalLayersCard");
  if (!card || !layer) return;

  const orb = qs(".signalOrb", card);
  const centerValue = qs("[data-signal-center-value]", card);
  const centerLabel = qs("[data-signal-center-label]", card);
  const valueEl = qs(`[data-signal-value="${layer}"]`, card);
  const labelEl = qs(`[data-signal-layer="${layer}"] span`, card);

  if (orb) {
    orb.dataset.activeLayer = layer;
  }

  if (centerLabel && labelEl) {
    centerLabel.textContent = labelEl.textContent.trim();
  }

  if (centerValue) {
    const hasAnimatedSource =
      animateCenter &&
      numericValues &&
      formatters &&
      typeof numericValues[layer] !== "undefined" &&
      typeof formatters[layer] === "function" &&
      window.soleAnimateMetricText;

    if (hasAnimatedSource) {
      window.soleAnimateMetricText(centerValue, numericValues[layer], {
        formatter: formatters[layer],
        duration: 720
      });
    } else if (valueEl) {
      centerValue.textContent = valueEl.textContent.trim();
    }
  }

  card.querySelectorAll("[data-signal-layer]").forEach(btn => {
    btn.classList.toggle("isActive", btn.dataset.signalLayer === layer);
  });
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-signal-layer], .signalRingFill[data-layer]");
  if (!trigger) return;

  const card = trigger.closest(".signalLayersCard");
  if (!card) return;

  const layer = trigger.dataset.signalLayer || trigger.dataset.layer;
  if (!layer) return;

  setSignalLayerActive(layer);
});

document.addEventListener("pointerover", event => {
  const ring = event.target.closest(".signalRingFill[data-layer]");
  if (!ring) return;

  const card = ring.closest(".signalLayersCard");
  if (!card) return;

  const layer = ring.dataset.layer;
  const btn = card.querySelector(`[data-signal-layer="${layer}"]`);

  if (btn) {
    btn.classList.add("isRingHovered");
  }
});

document.addEventListener("pointerout", event => {
  const ring = event.target.closest(".signalRingFill[data-layer]");
  if (!ring) return;

  const card = ring.closest(".signalLayersCard");
  if (!card) return;

  const layer = ring.dataset.layer;
  const btn = card.querySelector(`[data-signal-layer="${layer}"]`);

  if (btn) {
    btn.classList.remove("isRingHovered");
  }
});

function initSignalLayerTooltips() {
  if (window.__signalLayerTooltipsReady) return;
  window.__signalLayerTooltipsReady = true;

  let tooltip = document.querySelector("[data-global-signal-tooltip]");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "signalTooltip";
    tooltip.setAttribute("data-global-signal-tooltip", "");
    tooltip.hidden = true;

    tooltip.innerHTML = `
      <strong data-signal-tooltip-title></strong>
      <span data-signal-tooltip-body></span>
    `;

    document.body.appendChild(tooltip);
  }

  const titleEl = tooltip.querySelector("[data-signal-tooltip-title]");
  const bodyEl = tooltip.querySelector("[data-signal-tooltip-body]");

  function showTooltip(trigger, event) {
    if (!trigger || !tooltip) return;

    if (titleEl) titleEl.textContent = trigger.dataset.signalTooltipTitle || "";
    if (bodyEl) bodyEl.textContent = trigger.dataset.signalTooltipBody || "";

    tooltip.hidden = false;
    tooltip.classList.add("isVisible");

    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!tooltip || tooltip.hidden) return;

    const offset = 14;
    const rect = tooltip.getBoundingClientRect();

    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + rect.width > window.innerWidth - 12) {
      left = event.clientX - rect.width - offset;
    }

    if (top + rect.height > window.innerHeight - 12) {
      top = event.clientY - rect.height - offset;
    }

    tooltip.style.left = `${Math.max(12, left)}px`;
    tooltip.style.top = `${Math.max(12, top)}px`;
  }

  function hideTooltip() {
    if (!tooltip) return;

    tooltip.hidden = true;
    tooltip.classList.remove("isVisible");
  }

  document.addEventListener("pointermove", event => {
    const trigger = event.target.closest("[data-signal-tooltip-title]");
    if (!trigger) {
      hideTooltip();
      return;
    }

    showTooltip(trigger, event);
  });

  document.addEventListener("pointerleave", hideTooltip);
  document.addEventListener("scroll", hideTooltip, true);
}

function getNumberFromText(text) {
  return Number(String(text || "").replace(/[^\d.]/g, "")) || 0;
}

function setSignalRing(layer, percent, color) {
  const ring = qs(`.signalRingFill[data-layer="${layer}"]`);
  if (!ring) return;

  const radius = Number(ring.getAttribute("r")) || 1;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));

  const dash = circumference * (safePercent / 100);
  const gap = circumference - dash;

  ring.style.setProperty("--signal-dash", dash);
  ring.style.setProperty("--signal-gap", gap);
  ring.style.setProperty("--signal-ring-color", color);
}

function updateSignalLayers({
  attraction = 0,
  connection = 0,
  confidence = 0,
  candidates = 102437,
  startingCandidates = 102437
} = {}) {
  const card = qs(".signalLayersCard");
  if (!card) return;

  const attractionValue = Math.max(0, Math.min(100, Number(attraction) || 0));
  const connectionValue = Math.max(0, Math.min(100, Number(connection) || 0));
  const confidenceValue = Math.max(0, Math.min(100, Number(confidence) || 0));

  const candidateValue = Math.max(1, Number(candidates) || 1);
  const candidateStart = Math.max(1, Number(startingCandidates) || candidateValue);

  const candidatePercent =
    candidateStart <= 1
      ? 100
      : ((candidateStart - Math.min(candidateStart, candidateValue)) / (candidateStart - 1)) * 100;

  const values = {
    attraction: `${formatHudPercent ? formatHudPercent(attractionValue) : `${attractionValue.toFixed(2)}%`}`,
    connection: `${formatHudPercent ? formatHudPercent(connectionValue) : `${connectionValue.toFixed(2)}%`}`,
    confidence: `${formatHudPercent ? formatHudPercent(confidenceValue) : `${confidenceValue.toFixed(2)}%`}`,
    candidates: candidateValue.toLocaleString()
  };

const numericValues = {
  attraction: attractionValue,
  connection: connectionValue,
  confidence: confidenceValue,
  candidates: candidateValue
};

const formatters = {
  attraction: value => formatHudPercent ? formatHudPercent(value) : `${value.toFixed(2)}%`,
  connection: value => formatHudPercent ? formatHudPercent(value) : `${value.toFixed(2)}%`,
  confidence: value => formatHudPercent ? formatHudPercent(value) : `${value.toFixed(2)}%`,
  candidates: value => Math.max(1, Math.round(value)).toLocaleString()
};

Object.entries(values).forEach(([layer, value]) => {
  const el = qs(`[data-signal-value="${layer}"]`, card);
  if (!el) return;

  if (window.soleAnimateMetricText) {
    window.soleAnimateMetricText(el, numericValues[layer], {
      formatter: formatters[layer],
      duration: 720
    });
  } else {
    el.textContent = value;
  }
});

  setSignalRing("attraction", attractionValue, "#ff4f73");
  setSignalRing("connection", connectionValue, "#20aa91");
  setSignalRing("confidence", confidenceValue, "#2dcfd0");
  setSignalRing("candidates", candidatePercent, "#d7a928");

const activeLayer =
  qs(".signalOrb", card)?.dataset.activeLayer ||
  qs(".signalLayerBtn.isActive", card)?.dataset.signalLayer ||
  "candidates";

setSignalLayerActive(activeLayer, {
  numericValues,
  formatters,
  animateCenter: true
});
}

function syncSignalLayersFromHud() {
  const attraction = getNumberFromText(qs("#attractionProgressValue")?.textContent);
  const connection = getNumberFromText(qs("#connectionProgressValue")?.textContent);
  const confidence = getNumberFromText(qs("#confidenceProgressValue")?.textContent);
  const candidates = getNumberFromText(qs("#candidatePoolValue")?.textContent) || 102437;

  updateSignalLayers({
    attraction,
    connection,
    confidence,
    candidates,
    startingCandidates: 102437
  });
}

window.signalLayersUI = {
  update: updateSignalLayers,
  sync: syncSignalLayersFromHud
};

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

window.soleRedesignRefreshGreeting = enhanceGreeting;
window.soleRedesignEnhanceDashboard = enhanceDashboard;

window.soleRedesignNavigate = async function(action) {
  const fakeTarget = {
    closest() {
      return {
        dataset: {
          soleRail: action
        }
      };
    }
  };

  await handleRailClick(fakeTarget);
};

function init(){
  bindDesktopChatFocusToggle();
  bindRail();
  observeSidebar();
  initSignalLayerTooltips();

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
