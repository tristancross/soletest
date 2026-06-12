// ====== HELPERS ======

brandHome.addEventListener("click", () => {
  window.sidebarDashboardUI?.renderMenu?.();
});

function setThreadLoading(isLoading) {
  messagesEl.classList.toggle("threadLoading", isLoading);
}

function syncAppHeightToViewport() {
  const h = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

  document.documentElement.style.setProperty("--app-height", `${h}px`);
}

const chatMetaInner = document.getElementById("chatMetaInner");


function setHeaderSubtitle(text = "") {
  if (!chatSubtitle) return;
  chatSubtitle.textContent = text;
}


document.addEventListener("visibilitychange", async () => {
  if (isCurrentChatActuallyVisible()) {
    await markThreadAsRead(me.id, them.id);
    await renderSidebar(them.id);
    // await updateConversationStatus();
    updateMobileMenuUnreadBadge();
  }
});


function setAuthError(message) {
  authError.textContent = message;
  authError.classList.remove("success");
  authError.classList.add("error");
}

function setAuthSuccess(message) {
  authError.textContent = message;
  authError.classList.remove("error");
  authError.classList.add("success");
}

function clearAuthMessage() {
  authError.textContent = "";
  authError.classList.remove("error", "success");
}

function escapeHtml(s){
  return (s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function initials(name){
  return name.split(" ").filter(Boolean).slice(0,2).map(s => s[0].toUpperCase()).join("");
}
function fmtTime(iso){
  const d = new Date(iso);
  return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function scrollToBottom(){
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function scrollToBottomIfNear(){
  const distance =
    messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;

  if (distance < 120) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}
function threadFilter(aId, bId){
  // (sender=a AND recipient=b) OR (sender=b AND recipient=a)
  return `and(or(and(sender_id.eq.${aId},recipient_id.eq.${bId}),and(sender_id.eq.${bId},recipient_id.eq.${aId})))`;
}

function containsBlockedLink(text = "") {
  const value = String(text).trim();

  // Catches:
  // https://example.com
  // http://example.com
  // www.example.com
  // example.com
  // sub.example.co.uk/path
  // example dot com
  const linkPattern =
    /(?:https?:\/\/|www\.|[a-z0-9-]+\s*(?:\.|\s+dot\s+)\s*(?:com|co|uk|net|org|io|ai|app|dev|gg|me|info|biz|xyz|site|online|shop|store|tv|ly|link|co\.uk)\b)/i;

  return linkPattern.test(value);
}

function showSoleNotice(message, {
  title = "Signal protected",
  type = "warning",
  duration = 4200
} = {}) {
  const existing = document.querySelector(".soleNoticeToast");
  existing?.remove();

  const notice = document.createElement("div");
  notice.className = `soleNoticeToast soleNoticeToast-${type}`;
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");

  notice.innerHTML = `
    <div class="soleNoticeIcon" aria-hidden="true">
      <span></span>
    </div>

    <div class="soleNoticeText">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
    </div>

    <button type="button" class="soleNoticeClose" aria-label="Dismiss notice">
      Ã—
    </button>
  `;

  document.body.appendChild(notice);

  requestAnimationFrame(() => {
    notice.classList.add("isVisible");
  });

  const closeNotice = () => {
    notice.classList.remove("isVisible");
    notice.classList.add("isLeaving");

    window.setTimeout(() => {
      notice.remove();
    }, 220);
  };

  notice.querySelector(".soleNoticeClose")?.addEventListener("click", closeNotice);

  if (duration) {
    window.setTimeout(closeNotice, duration);
  }
}

function setProgressRing(circleEl, percent, animateFromZero = false) {
  if (!circleEl) return;

  const radius = Number(circleEl.getAttribute("r")) || 0;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = (clamped / 100) * circumference;

  if (animateFromZero) {
    circleEl.style.strokeDasharray = `0 ${circumference}`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        circleEl.style.strokeDasharray = `${filled} ${circumference - filled}`;
      });
    });
  } else {
    circleEl.style.strokeDasharray = `${filled} ${circumference - filled}`;
  }
}

function initAccountTray() {
  const account = document.getElementById("soleRailAccount");
  const trigger = account?.querySelector(".soleRailUser");
  const menu = document.getElementById("soleRailAccountMenu");
  const logoutBtn = document.getElementById("soleRailLogoutBtn");

  if (!account || !trigger || !menu) return;
  if (menu.dataset.accountTrayReady === "true") return;

  menu.dataset.accountTrayReady = "true";
  menu.classList.add("soleRailAccountMenuPortalled");
  menu.hidden = true;

  // Move the menu outside .app.soleRedesignApp so it cannot be clipped by overflow:hidden.
  document.body.appendChild(menu);

  function isMobileRail() {
    return window.matchMedia?.("(max-width: 768px)")?.matches;
  }

  function positionMenu() {
    const triggerRect = trigger.getBoundingClientRect();
    const railRect = account.closest(".soleRailNav")?.getBoundingClientRect();

    if (isMobileRail()) {
      const width = Math.min(320, window.innerWidth - 24);
      const left = railRect
        ? Math.max(12, railRect.left + 12)
        : 12;

      menu.style.width = `${width}px`;
      menu.style.left = `${left}px`;
      menu.style.right = "auto";

      // Open upward from the account button.
      menu.style.top = "auto";
      menu.style.bottom = `${Math.max(12, window.innerHeight - triggerRect.top + 10)}px`;
      return;
    }

    const width = 200;
    const gap = 12;

    let left = triggerRect.right + gap;

    // If there is no room to the right, open to the left.
    if (left + width > window.innerWidth - 12) {
      left = triggerRect.left - width - gap;
    }

    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(12, left)}px`;
    menu.style.right = "auto";

    // Align bottom of menu with bottom of avatar button.
    menu.style.top = "auto";
    menu.style.bottom = `${Math.max(12, window.innerHeight - triggerRect.bottom)}px`;
  }

  function openMenu() {
    account.classList.add("open");
    menu.hidden = false;

    positionMenu();

    requestAnimationFrame(() => {
      menu.classList.add("isOpen");
    });

    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
  }

  function closeMenu() {
    account.classList.remove("open");
    menu.classList.remove("isOpen");

    window.removeEventListener("resize", positionMenu);
    window.removeEventListener("scroll", positionMenu, true);

    window.setTimeout(() => {
      if (!menu.classList.contains("isOpen")) {
        menu.hidden = true;
      }
    }, 180);
  }

  function toggleMenu() {
    if (menu.classList.contains("isOpen")) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  trigger.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener("click", e => {
    e.stopPropagation();
  });

  document.addEventListener("click", e => {
    if (account.contains(e.target) || menu.contains(e.target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeMenu();
  });

  logoutBtn?.addEventListener("click", async e => {
    e.preventDefault();
    e.stopPropagation();

    closeMenu();

    await sb.auth.signOut();
    location.reload();
  });
}

function setHudDial(card, percent, options = {}) {
  if (!card) return;

  const {
    animateFromZero = false,
    stagger = false
  } = options;

  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const target = `${(safePercent / 100) * 360}deg`;

  card.dataset.hudDialPercent = safePercent.toFixed(2);

  const cards = ["attraction", "connection", "confidence", "candidates"];
  const cardIndex = Math.max(0, cards.indexOf(card.dataset.progressCard));
  const delay = stagger ? cardIndex * 150 : 0;

  if (animateFromZero) {
    card.dataset.hudDialReady = "true";
    card.style.setProperty("--metric-fill", "0deg");

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.setProperty("--metric-fill", target);
        });
      });
    }, delay);

    return;
  }

  card.dataset.hudDialReady = "true";
  card.style.setProperty("--metric-fill", target);
}
function getCandidateRefinementPercent(currentCandidates, startingCandidates) {
  const current = Math.max(1, Number(currentCandidates) || 1);
  const start = Math.max(1, Number(startingCandidates) || current);

  if (start <= 1) return 100;

  const clampedCurrent = Math.max(1, Math.min(start, current));
  return ((start - clampedCurrent) / (start - 1)) * 100;
}

function fitProgressDialValue(el) {
  if (!el) return;

  const text = (el.textContent || "").trim();

  let fontSize = 14;

  if (text.length >= 6) fontSize = 10;
  else if (text.length >= 5) fontSize = 11;
  else if (text.length >= 4) fontSize = 12;

  el.style.fontSize = `${fontSize}px`;
}

function fitAllProgressDialValues() {
  document
    .querySelectorAll(".progressStat strong")
    .forEach(fitProgressDialValue);
}

window.addEventListener("resize", fitAllProgressDialValues);

function fitProgressDialValue(el) {
  if (!el) return;

  const text = (el.textContent || "").trim();

  let fontSize = 14;

  if (text.length >= 6) {
    fontSize = 10;
  } else if (text.length >= 5) {
    fontSize = 11;
  } else if (text.length >= 4) {
    fontSize = 12;
  }

  el.style.fontSize = `${fontSize}px`;
}

function fitAllProgressDialValues() {
  document
    .querySelectorAll(".progressStat strong")
    .forEach(fitProgressDialValue);
}

window.addEventListener("resize", fitAllProgressDialValues);

window.addEventListener("resize", fitAllProgressDialValues);
window.addEventListener("resize", fitAllProgressDialValues);

function fitAllProgressDialValues() {
  document
    .querySelectorAll(".progressStat strong")
    .forEach(fitProgressDialValue);
}

function formatHudPercent(value, maxDecimals = 2) {
  const number = Math.max(0, Math.min(100, Number(value) || 0));
  const roundedToWhole = Math.round(number);

  if (Math.abs(number - roundedToWhole) < 0.0001) {
    return `${roundedToWhole}%`;
  }

  return `${number.toFixed(maxDecimals)}%`;
}

const soleMetricTextAnimations = new WeakMap();

function getNumberFromMetricText(text) {
  const cleaned = String(text || "").replace(/[^\d.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function animateMetricText(el, toNumber, {
  formatter = value => String(Math.round(value)),
  duration = 700
} = {}) {
  if (!el) return;

  const target = Number(toNumber);
  if (!Number.isFinite(target)) {
    el.textContent = formatter(0);
    return;
  }

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const previousFrame = soleMetricTextAnimations.get(el);
  if (previousFrame) {
    cancelAnimationFrame(previousFrame);
  }

  const fromDataset = Number(el.dataset.metricAnimatedValue);
  const from = Number.isFinite(fromDataset)
    ? fromDataset
    : getNumberFromMetricText(el.textContent);

  if (prefersReducedMotion || Math.abs(from - target) < 0.0001) {
    el.dataset.metricAnimatedValue = String(target);
    el.textContent = formatter(target);
    return;
  }

  const start = performance.now();

  function tick(now) {
    const rawProgress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - rawProgress, 3);
    const current = from + ((target - from) * eased);

    el.textContent = formatter(current);

    if (rawProgress < 1) {
      const frame = requestAnimationFrame(tick);
      soleMetricTextAnimations.set(el, frame);
    } else {
      el.dataset.metricAnimatedValue = String(target);
      el.textContent = formatter(target);
      soleMetricTextAnimations.delete(el);
    }
  }

  const frame = requestAnimationFrame(tick);
  soleMetricTextAnimations.set(el, frame);
}

window.soleAnimateMetricText = animateMetricText;

function updateModuleQuizMetricDock({
  connection = 0,
  attraction = 0,
  confidence = 0,
  candidates = 102437,
  startingCandidates = 102437,
  totalCandidates
} = {}) {
  const dock = document.querySelector(".moduleQuizMetricDock");
  if (!dock) return;

  const candidateValue = Math.max(1, Number(candidates) || 1);

  const candidateStart = Math.max(
    1,
    Number(startingCandidates ?? totalCandidates ?? candidateValue) || candidateValue
  );

  const attractionValue = Math.max(0, Math.min(100, Number(attraction) || 0));
  const connectionValue = Math.max(0, Math.min(100, Number(connection) || 0));
  const confidenceValue = Math.max(0, Math.min(100, Number(confidence) || 0));

  const candidateRefinement = getCandidateRefinementPercent(
    candidateValue,
    candidateStart
  );

  const metrics = {
    attraction: {
      percent: attractionValue,
      number: attractionValue,
      formatter: value => formatHudPercent(value, 2)
    },

    connection: {
      percent: connectionValue,
      number: connectionValue,
      formatter: value => formatHudPercent(value, 2)
    },

    confidence: {
      percent: confidenceValue,
      number: confidenceValue,
      formatter: value => formatHudPercent(value, 2)
    },

    candidates: {
      percent: candidateRefinement,
      number: candidateValue,
      formatter: value => Math.max(1, Math.round(value)).toLocaleString()
    }
  };

  const circumference = 2 * Math.PI * 18;

  Object.entries(metrics).forEach(([key, metric]) => {
    const pill = dock.querySelector(`[data-quiz-metric="${key}"]`);
    if (!pill) return;

    const dash = (metric.percent / 100) * circumference;
    const gap = circumference - dash;
    const finalDisplay = metric.formatter(metric.number);

    pill.dataset.metricValue = finalDisplay;
    pill.dataset.metricPercent = String(metric.percent);

    const fill = pill.querySelector(".moduleQuizMetricFill");
    if (fill) {
      fill.style.strokeDasharray = `${dash} ${gap}`;
    }

    const valueEl = pill.querySelector(".moduleQuizMetricValue");
    if (valueEl) {
      animateMetricText(valueEl, metric.number, {
        formatter: metric.formatter,
        duration: 720
      });
    }

    const legacyStrong = pill.querySelector(".moduleQuizMetricText strong");
    if (legacyStrong) {
      animateMetricText(legacyStrong, metric.number, {
        formatter: metric.formatter,
        duration: 720
      });
    }
  });
}

window.updateModuleQuizMetricDock = updateModuleQuizMetricDock;
function updateSidebarProgress({
  connection = 0,
  chemistry,
  attraction = 0,
  confidence = 0,
  candidates = 102437,
  startingCandidates = 102437,
  totalCandidates,
  animateFromZero = false
} = {}) {
  const connectionValue = Number(connection ?? chemistry ?? 0);
  const attractionValue = Number(attraction) || 0;
  const confidenceValue = Number(confidence) || 0;
  const candidateValue = Math.max(1, Number(candidates) || 1);

  const candidateStart = Math.max(
    1,
    Number(startingCandidates ?? totalCandidates ?? candidateValue) || candidateValue
  );

  const connectionCard = document.querySelector('[data-progress-card="connection"]');
  const attractionCard = document.querySelector('[data-progress-card="attraction"]');
  const confidenceCard = document.querySelector('[data-progress-card="confidence"]');
  const candidateCard = document.querySelector('[data-progress-card="candidates"]');


  const candidateRefinementPercent = getCandidateRefinementPercent(
    candidateValue,
    candidateStart
  );
const dialOptions = {
  animateFromZero,
  stagger: animateFromZero
};

setHudDial(
  document.querySelector('[data-progress-card="connection"]'),
  connectionValue,
  dialOptions
);

setHudDial(
  document.querySelector('[data-progress-card="attraction"]'),
  attractionValue,
  dialOptions
);

setHudDial(
  document.querySelector('[data-progress-card="confidence"]'),
  confidenceValue,
  dialOptions
);

setHudDial(
  document.querySelector('[data-progress-card="candidates"]'),
  getCandidateRefinementPercent(candidateValue, candidateStart),
  dialOptions
);

  const connectionEl = document.getElementById("connectionProgressValue");
  const chemistryFallbackEl = document.getElementById("chemistryProgressValue");
  const attractionEl = document.getElementById("attractionProgressValue");
  const confidenceEl = document.getElementById("confidenceProgressValue");
  const candidateEl = document.getElementById("candidatePoolValue");
  const candidateCountEl = document.getElementById("candidatePoolCount");

if (connectionEl) connectionEl.textContent = formatHudPercent(connectionValue);
if (chemistryFallbackEl) chemistryFallbackEl.textContent = formatHudPercent(connectionValue);
if (attractionEl) attractionEl.textContent = formatHudPercent(attractionValue);
if (confidenceEl) confidenceEl.textContent = formatHudPercent(confidenceValue);

  const formattedCandidates = candidateValue.toLocaleString();

  if (candidateEl) candidateEl.textContent = formattedCandidates;
  if (candidateCountEl) candidateCountEl.textContent = formattedCandidates;

window.signalLayersUI?.update?.({
  attraction: attractionValue,
  connection: connectionValue,
  confidence: confidenceValue,
  candidates: candidateValue,
  startingCandidates: candidateStart
});

updateModuleQuizMetricDock({
  attraction: attractionValue,
  connection: connectionValue,
  confidence: confidenceValue,
  candidates: candidateValue,
  startingCandidates: candidateStart
});

requestAnimationFrame(fitAllProgressDialValues);
}

let responseState = "idle";
let responseStateTimer = null;
let responseThinkingCycleTimer = null;
let responseNeuralRow = null;
let responseNeuralRaf = null;
let previewDraftClearTimeout = null;

const LIVE_DRAFT_CLEAR_MS = 6000;
const ADMIN_LIVE_DRAFT_CLEAR_MS = 900000;
const RESPONSE_LISTENING_DELAY_MS = 6000;
const RESPONSE_TYPING_TIMEOUT_MS = 6000;

const RESPONSE_THINKING_VERBS = [
  "thinking",
  "thinking",
  "thinking",
  "thinking",
  "thinking",
  "reflecting",
  "reflecting",
  "reflecting",
  "reflecting",
  "digesting your message",
  "considering your response",
  "processing conversational context",
  "reviewing recent exchanges",
  "updating their perspective",
  "absorbing relational context",
  "integrating your perspective",
  "adapting to your personality",
  "running a life experience cycle",
  "simulating lived context",
  "clarifying compatibility tests",
  "integrating social memory",
  "thinking of a response",
  "thinking of a response",
  "thinking of a response",
  "thinking of a response",
  "thinking of a response",
  "thinking of a response",
  "reordering their thoughts",
  "trying to articulate themselves",
  "searching for the right words",
  "integrating emotional chat center",
  "recalibrating emotional tone",
  "mapping behavioural patterns",
  "processing social nuance",
  "integrating emotional signals",
 "simulating continuity",
   "modelling interpersonal dynamics",
  "reprocessing interaction patterns",
    "running a life experience cycle",
      "recalibrating emotional tone",
"integrating social memory",
];

function getResponseName() {
  return them?.display_name || "Sole";
}

function clearResponseTimers() {
  clearTimeout(responseStateTimer);
  clearTimeout(responseThinkingCycleTimer);
  responseStateTimer = null;
  responseThinkingCycleTimer = null;
}

function mirrorPreviewDraft(text = "") {
  clearTimeout(previewDraftClearTimeout);

  textInput.value = text;
  textInput.disabled = true;
  autoResizeTextarea();

  if (!text.trim()) return;

  previewDraftClearTimeout = setTimeout(() => {
    textInput.value = "";
    autoResizeTextarea();
  }, 90000);
}

function ensureTypingIndicatorStructure() {
  let textEl = typingIndicator.querySelector(".typingText");

  if (!textEl) {
    typingIndicator.innerHTML = `
      <span class="typingDot"></span>
      <span class="typingText"></span>
    `;

    textEl = typingIndicator.querySelector(".typingText");
  }

  return textEl;
}

function ensureTypingIndicatorStructure() {
  let textEl = typingIndicator.querySelector(".typingText");

  if (!textEl) {
    typingIndicator.innerHTML = `
      <span class="typingDot"></span>
      <span class="typingText"></span>
    `;

    textEl = typingIndicator.querySelector(".typingText");
  }

  return textEl;
}

let typingVerbAnimationToken = 0;
let currentTypingPrefix = "";
let currentTypingVerb = "";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setTypingIndicatorText(text, animateChange = false) {
  typingVerbAnimationToken++;

  currentTypingPrefix = "";
  currentTypingVerb = "";

  typingIndicator.textContent = text;
  typingIndicator.classList.add("show");

  requestAnimationFrame(() => {
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  });
}

async function setTypingIndicatorVerb(prefix, nextVerb, animateChange = true) {
  const token = ++typingVerbAnimationToken;

  typingIndicator.classList.add("show");

  if (!animateChange || currentTypingPrefix !== prefix) {
    currentTypingPrefix = prefix;
    currentTypingVerb = nextVerb;
    typingIndicator.textContent = prefix + nextVerb;
    return;
  }

  const oldVerb = currentTypingVerb || "";

  // animate OUT rightâ€™ left
  for (let i = oldVerb.length; i >= 0; i--) {
    if (token !== typingVerbAnimationToken) return;
    typingIndicator.textContent = prefix + oldVerb.slice(0, i);
    await sleep(28);
  }

  await sleep(100);

  // animate IN left â€™ right
  for (let i = 0; i <= nextVerb.length; i++) {
    if (token !== typingVerbAnimationToken) return;
    typingIndicator.textContent = prefix + nextVerb.slice(0, i);
    await sleep(38);
  }

  currentTypingPrefix = prefix;
  currentTypingVerb = nextVerb;
}

function hideTypingIndicator() {
  typingVerbAnimationToken++;
  currentTypingPrefix = "";
  currentTypingVerb = "";

  typingIndicator.textContent = "";
  typingIndicator.classList.remove("show", "isReacting");
}

function removeResponseNeuralRow() {
  if (!responseNeuralRow) return;

  const row = responseNeuralRow;
  responseNeuralRow = null;

  row.classList.add("isLeaving");

  if (responseNeuralRaf) {
    cancelAnimationFrame(responseNeuralRaf);
    responseNeuralRaf = null;
  }

  setTimeout(() => {
    row.remove();
  }, 520);
}

function cleanupChatRuntimeEffects() {
  clearResponseTimers?.();

  if (responseNeuralRaf) {
    cancelAnimationFrame(responseNeuralRaf);
    responseNeuralRaf = null;
  }

  if (responseNeuralRow) {
    responseNeuralRow.remove?.();
    responseNeuralRow = null;
  }

  if (typeof previewDraftClearTimeout !== "undefined" && previewDraftClearTimeout) {
    clearTimeout(previewDraftClearTimeout);
    previewDraftClearTimeout = null;
  }

  if (typeof liveDraftClearTimeout !== "undefined" && liveDraftClearTimeout) {
    clearTimeout(liveDraftClearTimeout);
    liveDraftClearTimeout = null;
  }

  clearLiveDraft?.();
  hideTypingIndicator?.();
}

window.cleanupChatRuntimeEffects = cleanupChatRuntimeEffects;

function ensureResponseNeuralRow() {
  if (responseNeuralRow) {
    responseNeuralRow.classList.remove("isVisuallyHidden");
    return;
  }

  const row = document.createElement("div");
  row.className = "row them responseNeuralRow";

  const wrap = document.createElement("div");
  wrap.className = "responseNeuralWrap";

  const field = document.createElement("div");
  field.className = "responseNeuralField";

  wrap.appendChild(field);
  row.appendChild(wrap);

  if (typingIndicator?.parentNode === messagesEl) {
    typingIndicator.insertAdjacentElement("afterend", row);
  } else {
    messagesEl.appendChild(row);
  }

  responseNeuralRow = row;
  buildResponseNeuralField(field);

  requestAnimationFrame(() => {
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  });
}

function setResponseStateIdle() {
  clearResponseTimers();
  responseState = "idle";
  hideTypingIndicator();
  removeResponseNeuralRow();
  clearLiveDraft();
}

function setResponseStateListening() {
if ((adminMode && appMode !== "preview") || !them) return;

  clearResponseTimers();
  removeResponseNeuralRow();
  clearLiveDraft();

  responseState = "listening";
  setTypingIndicatorText(`${getResponseName()} is listening`, false);

  responseStateTimer = setTimeout(() => {
    setResponseStateThinking();
  }, RESPONSE_LISTENING_DELAY_MS);
}

function setResponseStateThinking() {
if ((adminMode && appMode !== "preview") || !them) return;

  clearResponseTimers();
  clearLiveDraft();

  responseState = "thinking";

const verb = RESPONSE_THINKING_VERBS[
  Math.floor(Math.random() * RESPONSE_THINKING_VERBS.length)
];

setTypingIndicatorVerb(`${getResponseName()} is `, verb, true);
  ensureResponseNeuralRow();

responseThinkingCycleTimer = setTimeout(() => {
  if (responseState === "thinking") setResponseStateThinking();
}, 10000 + Math.random() * 35000);
}

function setResponseStateReacting() {
if ((adminMode && appMode !== "preview") || !them) return;

  clearResponseTimers();
  removeResponseNeuralRow();

  responseState = "reacting";
  typingIndicator.classList.add("isReacting");
  setTypingIndicatorText(`${getResponseName()} is reacting`);

  responseStateTimer = setTimeout(() => {
    if (responseState === "reacting") {
      clearLiveDraft();
      setResponseStateThinking();
    }
  }, RESPONSE_TYPING_TIMEOUT_MS);
}
function syncResponseStateForLatestMessage(latestMsg, alignAsSenderId) {
  if (!latestMsg || !them) {
    setResponseStateIdle();
    return;
  }

  if (adminMode && appMode !== "preview") {
    setResponseStateIdle();
    return;
  }

  const mine = latestMsg.sender_id === alignAsSenderId;

  if (mine) {
    setResponseStateThinking();
  } else {
    setResponseStateIdle();
  }
}

function buildResponseNeuralField(field) {
const size = 120;
const center = size / 2;
const spacing = 8.25;
const radius = 45;
  const points = [];

  for (let y = -radius; y <= radius; y += spacing) {
    for (let x = -radius; x <= radius; x += spacing) {
      if (Math.sqrt(x * x + y * y) > radius) continue;

      const dot = document.createElement("div");
      dot.className = "responseNeuralDot";
      dot.style.left = `${x + center}px`;
      dot.style.top = `${y + center}px`;

      field.appendChild(dot);
      points.push({ x, y, el: dot });
    }
  }

  let origin = points[Math.floor(Math.random() * points.length)];
  let start = performance.now();
  let coolingDown = false;

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function beginPulse(now) {
    origin = points[Math.floor(Math.random() * points.length)];
    start = now;
    coolingDown = false;
  }

  function animate(now) {
    if (!responseNeuralRow) return;

    const elapsed = now - start;
    const speed = 0.072;
    const waveRadius = elapsed * speed;
    const waveWidth = 10;
    const fadeTail = 24;

    points.forEach(point => {
      const dist = Math.hypot(point.x - origin.x, point.y - origin.y);

      const leading = 1 - smoothstep(waveRadius, waveRadius + waveWidth, dist);
      const trailing = smoothstep(waveRadius - fadeTail, waveRadius, dist);
      const intensity = Math.max(0, Math.min(1, leading * trailing));

      point.el.style.setProperty("--opacity", (0.12 + intensity * 0.82).toFixed(3));
      point.el.style.setProperty("--scale", (1 + intensity * 1.8).toFixed(3));
      point.el.style.setProperty("--glow", intensity.toFixed(3));
    });

    if (waveRadius > radius * 2.3 && !coolingDown) {
      coolingDown = true;
      setTimeout(() => beginPulse(performance.now()), 260);
    }

    responseNeuralRaf = requestAnimationFrame(animate);
  }

  responseNeuralRaf = requestAnimationFrame(animate);
}

async function typeOnText(el, text, speed = 18) {
  el.textContent = "";
  el.classList.add("typewriter");

  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    scrollToBottomIfNear();
    await new Promise(resolve => setTimeout(resolve, speed));
  }

  el.classList.remove("typewriter");
}


async function markThreadAsRead(myId, otherId) {

  const { error } = await sb
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherId)
    .eq("recipient_id", myId)
    .is("read_at", null);

  if (error) console.warn("markThreadAsRead failed", error);

}

async function getUnreadCounts(){

  const { data, error } = await sb
    .from("messages")
    .select("sender_id")
    .eq("recipient_id", me.id)
    .is("read_at", null);

  if (error){
    console.warn(error);
    return new Map();
  }

  const counts = new Map();

  for (const row of data){
    counts.set(
      row.sender_id,
      (counts.get(row.sender_id) || 0) + 1
    );
  }

  return counts;

}

async function latestMessageWasMine() {
  if (!me || !them) return false;

  const { data, error } = await sb
    .from("messages")
    .select("sender_id")
    .or(threadFilter(me.id, them.id))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  return data.sender_id === me.id;
}

function updateDocumentTitle(totalUnread){

  if (totalUnread > 0){
    document.title = `(${totalUnread}) Sole`;
  } else {
    document.title = "Sole";
  }

}

async function renderWelcomePanel() {
  if (ambientStateTimer) {
    clearTimeout(ambientStateTimer);
    ambientStateTimer = null;
  }

  if (subtitleStateTimer) {
    clearInterval(subtitleStateTimer);
    subtitleStateTimer = null;
  }

  reactingUntil = 0;
  lastStatusText = "";
  ambientState = "";

  chatTitle.textContent = "Sole";
  chatSubtitle.textContent = "System console";

await window.dashboardUI.mountWelcomeDashboard({
  messagesEl,
  mainEl,
  sb,
  me,
  escapeHtml
});

  textInput.value = "";
  textInput.style.height = "auto";
  textInput.style.overflowY = "hidden";
  updateSendButton();
  them = null;
  updateNoChatState();
}

async function renderSystemConsole(animateMetrics = false) {
  if (!consoleMessagesEl || !window.dashboardUI?.mountWelcomeDashboard) return;

  await window.dashboardUI.mountWelcomeDashboard({
    messagesEl: consoleMessagesEl,
    mainEl,
    sb,
    me,
    escapeHtml,
    animateMetrics,
    force: true
  });
}

function showSoleAppLoader() {
  const loader = document.getElementById("soleAppLoader");
  if (!loader) return;

  loader.hidden = false;

  requestAnimationFrame(() => {
    loader.classList.add("isVisible");
  });
}

function hideSoleAppLoader() {
  const loader = document.getElementById("soleAppLoader");
  if (!loader) return;

  loader.classList.remove("isVisible");

  window.setTimeout(() => {
    loader.hidden = true;
  }, 200);
}

function autoResizeTextarea() {
  if (!textInput) return;

  const isEmpty = !textInput.value.trim();
  const baseHeight = 24;
  const maxHeight = 180;

  textInput.style.height = baseHeight + "px";

  if (!isEmpty) {
    textInput.style.height = Math.min(textInput.scrollHeight, maxHeight) + "px";
  }

  textInput.style.overflowY = textInput.scrollHeight > maxHeight ? "auto" : "hidden";
}


function updateSendButton(){
  const hasText = textInput.value.trim().length > 0;
  const hasVoicePreview = recordingState === "preview" && !!recordingBlob;
  const hasPendingRecording =
    !!mediaRecorder &&
    (mediaRecorder.state === "recording" || mediaRecorder.state === "paused");

  sendBtn.disabled = !(hasText || hasVoicePreview || hasPendingRecording);
}

function broadcastDraftClearForCurrentThread(){
  if (!channel || !them || adminMode || !me) return;

  channel.send({
    type: "broadcast",
    event: "draft_clear",
    payload: {
      sender: me.id,
      recipient: them.id
    }
  });
}

textInput.addEventListener("blur", () => {
  if (!textInput.value.trim()) {
    broadcastDraftClearForCurrentThread();
  }
});

textInput.addEventListener("focus", () => {
  formatBar.hidden = false;
});

textInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (!document.activeElement.closest("#formatBar")) {
      formatBar.hidden = true;
    }
  }, 120);
});

formatBar.addEventListener("mousedown", (e) => {
  e.preventDefault();
});

function setSelectionAndFocus(start, end) {
  textInput.focus();
  textInput.setSelectionRange(start, end);
}

function wrapSelection(before, after = before) {
  const start = textInput.selectionStart;
  const end = textInput.selectionEnd;
  const value = textInput.value;
  const selected = value.slice(start, end);

  let replacement;
  let newStart;
  let newEnd;

  if (selected.length > 0) {
    replacement = before + selected + after;
    textInput.value = value.slice(0, start) + replacement + value.slice(end);
    newStart = start + before.length;
    newEnd = start + before.length + selected.length;
  } else {
    replacement = before + after;
    textInput.value = value.slice(0, start) + replacement + value.slice(end);
    newStart = start + before.length;
    newEnd = newStart;
  }

  setSelectionAndFocus(newStart, newEnd);
  autoResizeTextarea();
  updateSendButton();
  textInput.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyBulletList() {
  const start = textInput.selectionStart;
  const end = textInput.selectionEnd;
  const value = textInput.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

  const block = value.slice(lineStart, actualLineEnd);
  const lines = block.split("\n");

  const updated = lines.map(line => {
    if (!line.trim()) return line;
    return line.startsWith("- ") ? line : `- ${line}`;
  }).join("\n");

  textInput.value =
    value.slice(0, lineStart) +
    updated +
    value.slice(actualLineEnd);

  setSelectionAndFocus(lineStart, lineStart + updated.length);
  autoResizeTextarea();
  updateSendButton();
  textInput.dispatchEvent(new Event("input", { bubbles: true }));
}

boldBtn.addEventListener("click", () => {
  wrapSelection("*", "*");
});

italicBtn.addEventListener("click", () => {
  wrapSelection("_", "_");
});

underlineBtn.addEventListener("click", () => {
  wrapSelection("++", "++");
});

bulletBtn.addEventListener("click", () => {
  applyBulletList();
});

function formatInlineText(text) {
  let formatted = text
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\+\+(.+?)\+\+/g, "<u>$1</u>");

  formatted = linkifyText(formatted);

  return formatted;
}

function linkifyText(text) {
  return text.replace(
    /\b(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi,
    (match) => {
      const href = match.startsWith("http") ? match : `https://${match}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    }
  );
}

function formatMessageText(text) {
  const escaped = escapeHtml(text || "");
  const normalized = escaped.replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  const hasBullets = lines.some(line => /^-\s+/.test(line));

  // If there are bullets anywhere, keep the simpler line-by-line handling
  if (hasBullets) {
    let html = "";
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = /^-\s+/.test(line);

      if (isBullet) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }

        const itemText = line.replace(/^-\s+/, "");
        html += `<li>${formatInlineText(itemText)}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }

        if (line.trim() === "") {
          html += '<div class="msgParagraphBreak"></div>';
        } else {
          html += `<div>${formatInlineText(line)}</div>`;
        }
      }
    }

    if (inList) html += "</ul>";

    return html;
  }

  // No bullets: treat double newlines as paragraph breaks
  const paragraphs = normalized.split(/\n{2,}/);

  return paragraphs
    .map(paragraph => {
      const htmlParagraph = paragraph
        .split("\n")
        .map(line => formatInlineText(line))
        .join("<br>");

      return `<p>${htmlParagraph}</p>`;
    })
    .join("");
}
