// ====== FIRST TIME USER JOURNEY ======

const firstTimeUserMount = document.getElementById("firstTimeUserMount");
const FIRST_TIME_POST_SEND_KEY = "sole_first_time_post_send_overlay";

const FIRST_TIME_PARTNER_QUALITIES = [
  "Kindness",
  "Curiosity",
  "Independence",
  "Optimism",
  "Creativity",
  "Realism",
  "Warmth",
  "Passion",
  "Honesty",
  "Ambition",
  "Intimacy",
  "Playfulness",
  "Self-awareness",
  "Loyalty",
  "Empathy",
  "Stability",
  "Vulnerability",
  "Resilience",
  "Generosity",
  "Open-mindedness",
  "Strength",
  "Shared humor",
  "Shared values",
  "Shared life goals",
];

const firstTimeState = {
  step: 0,
  answers: {
    name: "",
    dateOfBirth: "",
    singleFor: {
      months: 0,
      years: 0
    },
    everFeltLove: "",
    idealPartnerMustHave: [],
    whoAreYouLookingFor: "",
    hopingFeelsDifferent: ""
  }
};

function needsFirstTimeUserJourney(profile) {
  if (!profile || profile.is_admin) return false;
  return !profile.onboarding_completed_at;
}

function firstTimeEscape(value) {
  if (typeof escapeHtml === "function") return escapeHtml(value);

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstTimeEscapeAttr(value) {
  if (typeof escapeAttr === "function") return escapeAttr(value);
  return firstTimeEscape(value);
}

function slugifyUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "user";
}

async function generateUniqueUsername(name) {
  const base = slugifyUsername(name);

  const { data, error } = await sb
    .from("profiles")
    .select("id, username")
    .ilike("username", `${base}%`);

  if (error) {
    console.warn("[firstTimeUser] username check failed", error);
    return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const taken = new Set(
    (data || [])
      .filter(row => row.id !== me.id)
      .map(row => String(row.username || "").toLowerCase())
  );

  if (!taken.has(base)) return base;

  for (let i = 2; i <= 99; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getAgeFromDateOfBirth(dateString) {
  if (!dateString) return null;

  const dob = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function buildOnboardingAnswersText(answers) {
  const qualities = answers.idealPartnerMustHave?.length
    ? answers.idealPartnerMustHave.join(", ")
    : "Not answered";

  return [
    `Name: ${answers.name || "Not answered"}`,
    `Single for: ${Number(answers.singleFor?.years || 0)} years, ${Number(answers.singleFor?.months || 0)} months`,
    `Ever felt love: ${answers.everFeltLove || "Not answered"}`,
    `Ideal partner must have: ${qualities}`,
    `Who are you looking for: ${answers.whoAreYouLookingFor || "Not answered"}`,
    `Hoping feels different this time: ${answers.hopingFeelsDifferent || "Not answered"}`
  ].join("\n");
}

function showFirstTimeUserOverlay() {
  document.body.classList.add("isFirstTimeUserActive");

  if (firstTimeUserMount) {
    firstTimeUserMount.hidden = false;
  }
}

function hideFirstTimeUserOverlay() {
  document.body.classList.remove("isFirstTimeUserActive");
  document.body.classList.remove("isFirstTimeChatShellVisible");
  document.body.classList.remove("isFirstTimeChatShellClear");

  if (firstTimeUserMount) {
    firstTimeUserMount.hidden = true;
    firstTimeUserMount.innerHTML = "";
  }
}

function revealFirstTimeChatShellBehindOverlay() {
  document.body.classList.add("isFirstTimeChatShellVisible");
}

function hideFirstTimeChatShellBehindOverlay() {
  document.body.classList.remove("isFirstTimeChatShellVisible");
}

function getFirstTimePostSendStorageKey() {
  return `${FIRST_TIME_POST_SEND_KEY}:${me?.id || "unknown"}`;
}

function queueFirstTimePostSendOverlay(kind) {
  if (!me?.id) return;
  localStorage.setItem(getFirstTimePostSendStorageKey(), kind);
}

function clearFirstTimePostSendOverlay() {
  if (!me?.id) return;
  localStorage.removeItem(getFirstTimePostSendStorageKey());
}

function getQueuedFirstTimePostSendOverlay() {
  if (!me?.id) return "";
  return localStorage.getItem(getFirstTimePostSendStorageKey()) || "";
}

function setFirstTimeChrome() {
  const chatShellVisible = document.body.classList.contains("isFirstTimeChatShellVisible");

  if (chatTitle && !chatShellVisible) {
    chatTitle.textContent = "Sole";
  }

  if (typeof setHeaderSubtitle === "function") {
    setHeaderSubtitle("First signal");
  }

  if (textInput) {
    textInput.disabled = true;
  }

  if (typeof updateSendButton === "function") {
    updateSendButton();
  }

  if (typeof hideTypingIndicator === "function") {
    hideTypingIndicator();
  }
}

function renderFirstTimeShell(innerHtml) {
  setFirstTimeChrome();

  if (!firstTimeUserMount) return;

  firstTimeUserMount.hidden = false;
  firstTimeUserMount.innerHTML = `
    <section class="firstTimeUserScreen">
      <article class="firstTimeUserCard">
        ${innerHtml}
      </article>
    </section>
  `;
}

function firstTimeProgress() {
  return `
    <div class="firstTimeUserProgress">
      First signal ${firstTimeState.step + 1} / 5
    </div>
  `;
}

function renderFirstTimeButton(label = "Continue", attrs = "") {
  return `
  <div class="firstTimeUserBtnHolder"> 
    <button type="button" class="firstTimeUserBtn" ${attrs}>
      ${firstTimeEscape(label)}
    </button>
    </div>
  `;
}

function renderFirstTimeError(message = "") {
  const safe = firstTimeEscape(message);

  return `
    <p class="firstTimeUserError" data-first-time-error ${safe ? "" : "hidden"}>
      ${safe}
    </p>
  `;
}

function setFirstTimeError(message) {
  const el = firstTimeUserMount?.querySelector("[data-first-time-error]");
  if (!el) return;

  el.textContent = message || "";
  el.hidden = !message;
}

function goFirstTimeStep(index) {
  firstTimeState.step = index;

  const renderers = [
    renderFirstTimeLove,
    renderFirstTimeSingleFor,
    renderFirstTimeQualities,
    renderFirstTimeLookingFor,
    renderFirstTimeDifferent
  ];

  const render = renderers[index];

  if (typeof render === "function") {
    render();
  }
}

function renderFirstTimeName() {
  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Initial calibration</div>
    <h2>What should Sole call you?</h2>

    <input
      class="firstTimeUserInput"
      id="firstTimeNameInput"
      type="text"
      autocomplete="given-name"
      placeholder="First name"
      value="${firstTimeEscapeAttr(firstTimeState.answers.name)}"
    />

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-name-next")}
  `);

  const input = document.getElementById("firstTimeNameInput");

  input?.focus();

  firstTimeUserMount.querySelector("[data-first-time-name-next]")?.addEventListener("click", () => {
    const name = input.value.trim();

    if (!name) {
      setFirstTimeError("Enter the name you want Sole to use.");
      return;
    }

    firstTimeState.answers.name = name;
    goFirstTimeStep(1);
  });
}

function renderFirstTimeDateOfBirth() {
  const existing = firstTimeState.answers.dateOfBirth || "";
  const [yyyy = "", mm = "", dd = ""] = existing ? existing.split("-") : [];

  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Life stage</div>
    <h2>When were you born?</h2>

    <div class="firstTimeDobGrid">
      <label>
        <span>Day</span>
        <input
          class="firstTimeUserInput"
          id="firstTimeDobDay"
          type="text"
          inputmode="numeric"
          maxlength="2"
          placeholder="DD"
          value="${firstTimeEscapeAttr(dd)}"
        />
      </label>

      <label>
        <span>Month</span>
        <input
          class="firstTimeUserInput"
          id="firstTimeDobMonth"
          type="text"
          inputmode="numeric"
          maxlength="2"
          placeholder="MM"
          value="${firstTimeEscapeAttr(mm)}"
        />
      </label>

      <label>
        <span>Year</span>
        <input
          class="firstTimeUserInput"
          id="firstTimeDobYear"
          type="text"
          inputmode="numeric"
          maxlength="4"
          placeholder="YYYY"
          value="${firstTimeEscapeAttr(yyyy)}"
        />
      </label>
    </div>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-dob-next")}
  `);

  const dayInput = document.getElementById("firstTimeDobDay");
  const monthInput = document.getElementById("firstTimeDobMonth");
  const yearInput = document.getElementById("firstTimeDobYear");

  dayInput?.focus();

  [dayInput, monthInput, yearInput].forEach((input, index, all) => {
    input?.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");

      if (input.value.length >= input.maxLength && all[index + 1]) {
        all[index + 1].focus();
      }
    });
  });

  firstTimeUserMount.querySelector("[data-first-time-dob-next]")?.addEventListener("click", () => {
    const day = Number.parseInt(dayInput.value, 10);
    const month = Number.parseInt(monthInput.value, 10);
    const year = Number.parseInt(yearInput.value, 10);

    if (!day || !month || !year) {
      setFirstTimeError("Enter your full date of birth.");
      return;
    }

    if (year < 1900 || year > new Date().getFullYear()) {
      setFirstTimeError("Check the year and try again.");
      return;
    }

    const dob = new Date(year, month - 1, day);

    const isValidDate =
      dob.getFullYear() === year &&
      dob.getMonth() === month - 1 &&
      dob.getDate() === day;

    if (!isValidDate) {
      setFirstTimeError("Enter a valid date.");
      return;
    }

    const yyyyString = String(year).padStart(4, "0");
    const mmString = String(month).padStart(2, "0");
    const ddString = String(day).padStart(2, "0");

    const value = `${yyyyString}-${mmString}-${ddString}`;
    const age = getAgeFromDateOfBirth(value);

    if (age < 18) {
      setFirstTimeError("You must be 18 or over to use Sole.");
      return;
    }

    if (age > 120) {
      setFirstTimeError("Check the year and try again.");
      return;
    }

    firstTimeState.answers.dateOfBirth = value;
    goFirstTimeStep(2);
  });
}

function renderFirstTimeSingleFor() {
  const years = String(firstTimeState.answers.singleFor.years || 0).padStart(2, "0");
  const months = String(firstTimeState.answers.singleFor.months || 0).padStart(2, "0");

  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Relationship context</div>
    <h2>How long have you been single?</h2>

    <div class="firstTimeDurationInput">
      <label>
        <input
          id="firstTimeSingleYears"
          type="number"
          min="0"
          max="99"
          inputmode="numeric"
          value="${firstTimeEscapeAttr(years)}"
        />
        <span>years</span>
      </label>

      <label>
        <input
          id="firstTimeSingleMonths"
          type="number"
          min="0"
          max="11"
          inputmode="numeric"
          value="${firstTimeEscapeAttr(months)}"
        />
        <span>months</span>
      </label>
    </div>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-single-next")}
  `);

  const yearsInput = document.getElementById("firstTimeSingleYears");
  const monthsInput = document.getElementById("firstTimeSingleMonths");

  firstTimeUserMount.querySelector("[data-first-time-single-next]")?.addEventListener("click", () => {
    const yearsValue = Math.max(0, Math.min(99, Number.parseInt(yearsInput.value || "0", 10)));
    const monthsValue = Math.max(0, Math.min(11, Number.parseInt(monthsInput.value || "0", 10)));

    if (Number.isNaN(yearsValue) || Number.isNaN(monthsValue)) {
      setFirstTimeError("Enter years and months as numbers.");
      return;
    }

    firstTimeState.answers.singleFor = {
      years: yearsValue,
      months: monthsValue
    };

    goFirstTimeStep(2);
  });
}

function renderFirstTimeLove() {
  const options = ["Yes", "No", "Maybe", "I don’t know"];

  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Emotional history</div>
    <h2>Have you ever been in love?</h2>

    <div class="firstTimeOptionList">
      ${options.map(option => `
        <button
          type="button"
          class="firstTimeOptionBtn${firstTimeState.answers.everFeltLove === option ? " isSelected" : ""}"
          data-first-time-love="${firstTimeEscapeAttr(option)}"
        >
          ${firstTimeEscape(option)}
        </button>
      `).join("")}
    </div>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-love-next")}
  `);

  firstTimeUserMount.querySelectorAll("[data-first-time-love]").forEach(btn => {
    btn.addEventListener("click", () => {
      firstTimeState.answers.everFeltLove = btn.dataset.firstTimeLove;

      firstTimeUserMount.querySelectorAll("[data-first-time-love]").forEach(item => {
        item.classList.toggle("isSelected", item === btn);
      });

      setFirstTimeError("");
    });
  });

  firstTimeUserMount.querySelector("[data-first-time-love-next]")?.addEventListener("click", () => {
    if (!firstTimeState.answers.everFeltLove) {
      setFirstTimeError("Choose one answer.");
      return;
    }

    goFirstTimeStep(1);
  });
}

function renderFirstTimeQualities() {
  const selected = new Set(firstTimeState.answers.idealPartnerMustHave || []);

  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Partner signal</div>
    <h2>Choose three things your ideal partner must have.</h2>


    <div class="firstTimeChipGrid">
      ${FIRST_TIME_PARTNER_QUALITIES.map(option => `
        <button
          type="button"
          class="firstTimeChip${selected.has(option) ? " isSelected" : ""}"
          data-first-time-quality="${firstTimeEscapeAttr(option)}"
        >
          ${firstTimeEscape(option)}
        </button>
      `).join("")}
    </div>

    <div class="firstTimeSelectionCount" data-quality-count>
      ${selected.size} / 3 selected
    </div>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-quality-next")}
  `);

  function refreshCount() {
    const countEl = firstTimeUserMount.querySelector("[data-quality-count]");
    if (countEl) {
      countEl.textContent = `${firstTimeState.answers.idealPartnerMustHave.length} / 3 selected`;
    }
  }

  firstTimeUserMount.querySelectorAll("[data-first-time-quality]").forEach(btn => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.firstTimeQuality;
      const list = firstTimeState.answers.idealPartnerMustHave;

      if (list.includes(value)) {
        firstTimeState.answers.idealPartnerMustHave = list.filter(item => item !== value);
        btn.classList.remove("isSelected");
        refreshCount();
        return;
      }

      if (list.length >= 3) {
        setFirstTimeError("Choose exactly three.");
        return;
      }

      firstTimeState.answers.idealPartnerMustHave = [...list, value];
      btn.classList.add("isSelected");
      setFirstTimeError("");
      refreshCount();
    });
  });

  firstTimeUserMount.querySelector("[data-first-time-quality-next]")?.addEventListener("click", () => {
    if (firstTimeState.answers.idealPartnerMustHave.length !== 3) {
      setFirstTimeError("Choose exactly three.");
      return;
    }

    goFirstTimeStep(3);
  });
}

function renderFirstTimeLookingFor() {
  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Intent</div>
    <h2>Who are you looking for?</h2>

    <textarea
      class="firstTimeUserTextarea"
      id="firstTimeLookingForInput"
      placeholder="Write as much or as little as you like."
      rows="5"
    >${firstTimeEscape(firstTimeState.answers.whoAreYouLookingFor)}</textarea>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Continue", "data-first-time-looking-next")}
  `);

  const input = document.getElementById("firstTimeLookingForInput");
  input?.focus();

  firstTimeUserMount.querySelector("[data-first-time-looking-next]")?.addEventListener("click", () => {
    const value = input.value.trim();

    if (!value) {
      setFirstTimeError("Write a short answer before continuing.");
      return;
    }

    firstTimeState.answers.whoAreYouLookingFor = value;
    goFirstTimeStep(4);
  });
}

function renderFirstTimeDifferent() {
  renderFirstTimeShell(`
    ${firstTimeProgress()}
    <div class="firstTimeUserEyebrow">Pattern break</div>
    <h2>What are you hoping feels different this time?</h2>

    <textarea
      class="firstTimeUserTextarea"
      id="firstTimeDifferentInput"
      placeholder="For example: more honest, less anxious, more exciting, calmer, easier..."
      rows="5"
    >${firstTimeEscape(firstTimeState.answers.hopingFeelsDifferent)}</textarea>

    ${renderFirstTimeError()}

    ${renderFirstTimeButton("Build Sole", "data-first-time-complete")}
  `);

  const input = document.getElementById("firstTimeDifferentInput");
  input?.focus();

  firstTimeUserMount.querySelector("[data-first-time-complete]")?.addEventListener("click", async () => {
    const value = input.value.trim();

    if (!value) {
      setFirstTimeError("Write a short answer before continuing.");
      return;
    }

    firstTimeState.answers.hopingFeelsDifferent = value;

    await completeFirstTimeUserJourney();
  });
}

function getFirstTimePartnerName() {
  return (
    assignedPartner?.display_name ||
    assignedPartner?.username ||
    "your chat partner"
  );
}

function forceFirstTimeMobileMessagesView() {
  if (typeof isMobileLayout === "function" && isMobileLayout()) {
    if (typeof setMobileView === "function") {
      setMobileView("messages", { writeHistory: false });
    } else {
      document.body.classList.add("mobileViewMessages");
      document.body.classList.remove("mobileViewHome");
    }

    closeMobileRailMenu?.();
  }
}

function forceFirstTimeChatFocus() {
  const appEl = document.querySelector(".app.soleRedesignApp");
  if (!appEl) return;

  appEl.classList.add("isChatFocus");
  document.body.classList.add("isChatFocus");

  localStorage.setItem("sole_desktop_chat_focus", "1");

  const toggleBtn = document.querySelector(".soleRailMenuBtn");
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("aria-label", "Show dashboard");
  }
}

function disableFirstTimeComposer(placeholder = "Conversation locked") {
  if (!textInput) return;

  textInput.disabled = true;
  textInput.placeholder = placeholder;

  if (typeof updateSendButton === "function") {
    updateSendButton();
  }
}

function enableFirstTimeComposer(placeholder = "Say something you would actually say") {
  if (!textInput) return;

  textInput.disabled = false;
  textInput.placeholder = placeholder;

  autoResizeTextarea?.();
  updateSendButton?.();
  textInput.focus();
}

async function markFirstTimeJourneyComplete() {
  if (!me?.id || me?.onboarding_completed_at) return;

  const { data, error } = await sb
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString()
    })
    .eq("id", me.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[firstTimeUser] could not mark onboarding complete", error);
    return;
  }

  if (data) {
    me = data;
    applyMe?.();
  }
}

async function prepareFirstTimeChatShell() {
  forceFirstTimeChatFocus();
  forceFirstTimeMobileMessagesView();

  if (typeof renderSidebar === "function") {
    await renderSidebar();
  }

  forceFirstTimeMobileMessagesView();

  if (typeof updateSidebarDailyTasks === "function") {
    await updateSidebarDailyTasks();
  }

  if (typeof updateInsightNotificationDots === "function") {
    await updateInsightNotificationDots();
  }

  them = assignedPartner || null;

  chatTitle.textContent = "Sole";
  chatMetaInner?.classList?.add("is-active");

  if (typeof setHeaderSubtitle === "function") {
    setHeaderSubtitle("Conversational profile still forming");
  } else if (chatSubtitle) {
    chatSubtitle.textContent = "Conversational profile still forming";
  }

  if (chatModelVersion) {
    chatModelVersion.textContent = "1.17";
  }

  messagesEl.innerHTML = `
    <div class="firstTimeChatDormant" aria-hidden="true"></div>
  `;

  hideTypingIndicator?.();
  disableFirstTimeComposer("Ask anything");
}

function blurFirstTimeChatShell() {
  document.body.classList.remove("isFirstTimeChatShellClear");
}

function unblurFirstTimeChatShell() {
  document.body.classList.add("isFirstTimeChatShellClear");
}

async function getFirstTimePartnerFirstMessage() {
  if (!assignedPartner?.id || !me?.id) return null;

  const { data, error } = await sb
    .from("messages")
    .select("*")
    .eq("sender_id", assignedPartner.id)
    .eq("recipient_id", me.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[firstTimeUser] could not check partner first message", error);
    return null;
  }

  return data || null;
}

function renderFirstTimeStage({
  eyebrow = "Sole",
  title = "",
  body = "",
  button = "Continue",
  onNext
}) {
  const bodyParts = Array.isArray(body)
    ? body
    : (body ? [body] : []);

  renderFirstTimeShell(`
    <div class="firstTimeUserEyebrow">${firstTimeEscape(eyebrow)}</div>
    <h2>${firstTimeEscape(title)}</h2>

    ${
      bodyParts.length
        ? bodyParts.map(part => `
          <p class="firstTimeUserSubcopy">${firstTimeEscape(part)}</p>
        `).join("")
        : ""
    }

    ${renderFirstTimeButton(button, "data-first-time-stage-next")}
  `);

  firstTimeUserMount
    ?.querySelector("[data-first-time-stage-next]")
    ?.addEventListener("click", async () => {
      await onNext?.();
    });
}

function renderFirstTimePartnerReveal({ onNext }) {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeShell(`
    <div class="firstTimeUserEyebrow">Chat partner assigned</div>
    <h2>You’re speaking to ${firstTimeEscape(partnerName)}.</h2>
    <p class="firstTimeUserSubcopy">
      Their conversational profile is still forming.
    </p>
    ${renderFirstTimeButton("Continue", "data-first-time-reveal-next")}
  `);

  chatTitle.textContent = partnerName;

  if (typeof setHeaderSubtitle === "function") {
    setHeaderSubtitle("Conversational profile still forming");
  } else if (chatSubtitle) {
    chatSubtitle.textContent = "Conversational profile still forming";
  }

  firstTimeUserMount
    ?.querySelector("[data-first-time-reveal-next]")
    ?.addEventListener("click", async () => {
      await onNext?.();
    });
}

async function renderFirstTimeBuildSequence() {
  const buildSteps = [
    "Reading first signal…",
    "Mapping relationship context…",
    "Estimating conversational rhythm…",
    "Building response latency…",
    "Constructing persistent life model…",
    "Assigning internal memories…",
    "Reducing artificial helpfulness…",
    "Testing emotional ambiguity…",
    "Finalising chat partner…"
  ];

  renderFirstTimeShell(`
    <div class="firstTimeUserEyebrow">Building Sole</div>
    <h2>Building Sole</h2>

    <div class="firstTimeBuildOrb" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>

    <p class="firstTimeBuildLine" data-first-time-build-line>
      ${firstTimeEscape(buildSteps[0])}
    </p>

    <div class="firstTimeBuildProgress" aria-hidden="true">
      <div data-first-time-build-progress></div>
    </div>

    <div class="firstTimeBuildPercent" data-first-time-build-percent>
      0%
    </div>
  `);

  const lineEl = firstTimeUserMount?.querySelector("[data-first-time-build-line]");
  const progressEl = firstTimeUserMount?.querySelector("[data-first-time-build-progress]");
  const percentEl = firstTimeUserMount?.querySelector("[data-first-time-build-percent]");

  const duration = 14500;
  const startedAt = performance.now();

  return new Promise(resolve => {
    function tick(now) {
      const elapsed = now - startedAt;
      const rawProgress = Math.min(1, elapsed / duration);

      // Slightly eased so it feels more like a machine thinking.
      const easedProgress = 1 - Math.pow(1 - rawProgress, 2.2);
      const percent = Math.min(100, Math.round(easedProgress * 100));

      const stepIndex = Math.min(
        buildSteps.length - 1,
        Math.floor(rawProgress * buildSteps.length)
      );

      if (lineEl) {
        lineEl.textContent = rawProgress >= 0.98
          ? "Simulation ready."
          : buildSteps[stepIndex];
      }

      if (progressEl) {
        progressEl.style.width = `${percent}%`;
      }

      if (percentEl) {
        percentEl.textContent = `${percent}%`;
      }

      if (rawProgress < 1) {
        requestAnimationFrame(tick);
      } else {
        window.setTimeout(resolve, 750);
      }
    }

    requestAnimationFrame(tick);
  });
}

async function completeFirstTimeUserJourney() {
const answers = firstTimeState.answers;

answers.name = me?.display_name || me?.username || "User";
delete answers.dateOfBirth;

const answersText = buildOnboardingAnswersText(answers);

const payload = {
  single_years: Number(answers.singleFor.years || 0),
  single_months: Number(answers.singleFor.months || 0),
  onboarding_answers: answers,
  onboarding_answers_text: answersText
};

  const savePromise = sb
    .from("profiles")
    .update(payload)
    .eq("id", me.id)
    .select("*")
    .maybeSingle();

  await renderFirstTimeBuildSequence();

  const { data, error } = await savePromise;

  if (error) {
    console.error("[firstTimeUser] save failed", error);

    renderFirstTimeShell(`
      <div class="firstTimeUserEyebrow">Signal interrupted</div>
      <h2>Something went wrong.</h2>
      <p class="firstTimeUserSubcopy">${firstTimeEscape(error.message || "Could not save first signal.")}</p>
      ${renderFirstTimeButton("Try again", "data-first-time-retry")}
    `);

    firstTimeUserMount
      ?.querySelector("[data-first-time-retry]")
      ?.addEventListener("click", () => {
goFirstTimeStep(4);
      });

    return;
  }

  if (data) {
    me = data;
    applyMe?.();
  }

  await startFirstTimeChatIntro();
}

async function startFirstTimeChatIntro() {
  renderFirstTimeStage({
    eyebrow: "Chat environment",
    title: "Welcome to Sole.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroOne
  });
}

function renderFirstTimeChatIntroOne() {
  renderFirstTimeStage({
    eyebrow: "How Sole works",
    title: "Dating apps usually match people based on what they say they want in a partner.",
    body: "Sole will help you discover what you actually want.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroTwo
  });
}

function renderFirstTimeChatIntroTwo() {
  renderFirstTimeStage({
    eyebrow: "Simulated environment",
    title: "Before introducing you to a real match",
    body: "We place you in a simulated environment with a chat partner for five days.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroThree
  });
}

function renderFirstTimeChatIntroThree() {
  renderFirstTimeStage({
    eyebrow: "First signal",
    title: "The goal is not to test you. It is to understand you.",
    body: "Sole analyzes your communication style, interests, instincts, humor, curiosity and underlying desires to find you the highest quality match. Your SoleMate.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroFour
  });
}

async function renderFirstTimeChatIntroFour() {
  await prepareFirstTimeChatShell();
  revealFirstTimeChatShellBehindOverlay();
  blurFirstTimeChatShell();

  renderFirstTimeStage({
    eyebrow: "Simulation",
    title: "You are about to meet your chat partner.",
    body: "They are not a real person.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroFive
  });
}

function renderFirstTimeChatIntroFive() {
  const partnerName = getFirstTimePartnerName();

  unblurFirstTimeChatShell();

  if (chatTitle) {
    chatTitle.textContent = partnerName;
  }

  if (typeof setHeaderSubtitle === "function") {
    setHeaderSubtitle("Conversational profile still forming");
  } else if (chatSubtitle) {
    chatSubtitle.textContent = "Conversational profile still forming";
  }

  renderFirstTimeStage({
    eyebrow: "Conversational model",
    title: `${partnerName} has been designed to behave less like an assistant and more like a real person inside a dating app.`,
    button: "Continue",
    onNext: renderFirstTimeChatIntroSix
  });
}

function renderFirstTimeChatIntroSix() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Conversation signal",
    title: `${partnerName} may pause, misunderstand, change mood, get distracted, or take time to reply.`,
    button: "Continue",
    onNext: renderFirstTimeChatIntroSeven
  });
}

function renderFirstTimeChatIntroSeven() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Simulation model",
    title: `As far as ${partnerName} is concerned, they are a real person, living a real life.`,
    body: "We built their personality model according to your initial responses and the attributes we’ve found to be the most effective in determining long-term compatibility in a partner.",
    button: "Continue",
    onNext: renderFirstTimeChatIntroEight
  });
}

function renderFirstTimeChatIntroEight() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Natural conversation",
    title: `Interact with ${partnerName} however you would a real person.`,
    body: [
      "The aim is to talk to them naturally.",
      `Try not to think of ${partnerName} only as a chatbot. We want to analyze how you connect with, understand and build bonds with human beings.`
    ],
    button: "Continue",
    onNext: renderFirstTimeChatIntroNine
  });
}

function renderFirstTimeChatIntroNine() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Clean signal",
    title: "To keep the simulation useful, stay inside the world of Sole.",
    body: [
      `Try not to give ${partnerName} anything that could identify you elsewhere — full names, social handles, phone numbers, addresses, or anything easily searchable.`,
      `Sole works best when ${partnerName} gets to know the real you through conversation, not your digital footprint.`
    ],
    button: "Continue",
    onNext: renderFirstTimeChatIntroTen
  });
}

function renderFirstTimeChatIntroTen() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Evolution",
    title: `${partnerName} will evolve with you as you learn about each other and yourselves.`,
    button: "Continue",
    onNext: renderFirstTimeBranch
  });
}

async function renderFirstTimeBranch() {
  const partnerMessage = await getFirstTimePartnerFirstMessage();

  if (partnerMessage) {
    renderFirstTimePartnerStartedBranch();
  } else {
    renderFirstTimeUserStartsBranch();
  }
}

function renderFirstTimeUserStartsBranch() {
  renderFirstTimeStage({
    eyebrow: "Start chat",
    title: "Make the first move.",
    body: "Try an opener you would use on someone you had just matched with.",
    button: "Start chat",
    onNext: async () => {
      queueFirstTimePostSendOverlay("first-move");

      await markFirstTimeJourneyComplete();
      hideFirstTimeUserOverlay?.();
       forceFirstTimeMobileMessagesView();

if (assignedPartner && !blockedPairs.has(pairKey(me.id, assignedPartner.id))) {
  await openChat(assignedPartner);

  // If the simulated partner has not messaged yet, the thread may be empty.
  // Make sure we do not leave the loading state visible.
  if (messagesEl && !messagesEl.querySelector(".message")) {
    messagesEl.innerHTML = `
      <div class="firstTimeEmptyChatState">
        <div class="firstTimeUserEyebrow">Conversation ready</div>
        <p>Make the first move.</p>
      </div>
    `;
  }

  enableFirstTimeComposer("Say something you would actually say");
} else {
  await renderWelcomePanel();
}
    }
  });
}

function renderFirstTimePartnerStartedBranch() {
  const partnerName = getFirstTimePartnerName();

  renderFirstTimeStage({
    eyebrow: "Message received",
    title: `${partnerName} has already made the first move.`,
    body: "Their first message is waiting.",
    button: "Reveal message",
    onNext: async () => {
      queueFirstTimePostSendOverlay("reply");

      await markFirstTimeJourneyComplete();
      hideFirstTimeUserOverlay?.();
       forceFirstTimeMobileMessagesView();

      if (assignedPartner && !blockedPairs.has(pairKey(me.id, assignedPartner.id))) {
        await openChat(assignedPartner);
        enableFirstTimeComposer("Reply naturally. Don’t overthink it.");
      } else {
        await renderWelcomePanel();
      }
    }
  });
}

function renderFirstTimePostSendOverlay(kind) {
  const partnerName = getFirstTimePartnerName();

  showFirstTimeUserOverlay();
  revealFirstTimeChatShellBehindOverlay();
  forceFirstTimeMobileMessagesView();
  disableFirstTimeComposer("Conversation continuing");

  if (kind === "reply") {
    renderFirstTimeStage({
      eyebrow: "Reply sent",
      title: "From here, the conversation will continue in its own rhythm.",
      body: [
        `${partnerName} is not designed to reply the moment you do.`,
        "They have a persistent, linear life inside the simulation. They do not exist only when you are looking at the screen.",
        "They may come back quickly, or they may take time.",
        "Check back later to see where the conversation takes you."
      ],
      button: "Continue",
      onNext: () => {
        clearFirstTimePostSendOverlay();
        hideFirstTimeUserOverlay();
        enableFirstTimeComposer("Reply naturally. Don’t overthink it.");
      }
    });

    return;
  }

  renderFirstTimeStage({
    eyebrow: "Message sent",
    title: `${partnerName} is not designed to reply the moment you do.`,
    body: [
      "They have a persistent, linear life inside the simulation. They do not exist only when you are looking at the screen.",
      "They may come back quickly, or they may take time.",
      "Check back later to see where the conversation takes you."
    ],
    button: "Continue",
    onNext: () => {
      clearFirstTimePostSendOverlay();
      hideFirstTimeUserOverlay();
      enableFirstTimeComposer("Say something you would actually say");
    }
  });
}

function maybeShowFirstTimePostSendOverlay() {
  const kind = getQueuedFirstTimePostSendOverlay();

  if (!kind) return false;

  renderFirstTimePostSendOverlay(kind);
  return true;
}

async function runFirstTimeUserJourneyIfNeeded() {
  if (!needsFirstTimeUserJourney(me)) {
    document.body.classList.remove("isCheckingFirstTimeUser");
    return false;
  }

  firstTimeState.step = 0;

  firstTimeState.answers = {
    name: me?.display_name && !String(me.display_name).includes("@") ? me.display_name : "",
    dateOfBirth: me?.date_of_birth || "",
    singleFor: {
      years: Number(me?.single_years || 0),
      months: Number(me?.single_months || 0)
    },
    everFeltLove: me?.onboarding_answers?.everFeltLove || "",
    idealPartnerMustHave: me?.onboarding_answers?.idealPartnerMustHave || [],
    whoAreYouLookingFor: me?.onboarding_answers?.whoAreYouLookingFor || "",
    hopingFeelsDifferent: me?.onboarding_answers?.hopingFeelsDifferent || ""
  };

document.body.classList.remove("isCheckingFirstTimeUser");
showFirstTimeUserOverlay();
goFirstTimeStep(0);
return true;
}

window.firstTimeUser = {
  needsFirstTimeUserJourney,
  runIfNeeded: runFirstTimeUserJourneyIfNeeded,
  buildOnboardingAnswersText,
  maybeShowPostSendOverlay: maybeShowFirstTimePostSendOverlay
};