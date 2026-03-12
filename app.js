// ====== CONFIG ======
const SUPABASE_URL = "https://kmnutzpbbvrfizwimcpk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yr1M07ih1yEbqHma0cihdw_t7nDQDbU";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const authScreen = document.getElementById("authScreen");
const authTitle = document.getElementById("authTitle");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");


const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const signupDisplayName = document.getElementById("signupDisplayName");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupPasswordRepeat = document.getElementById("signupPasswordRepeat");

const loginEmail = document.getElementById("loginEmail");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");
const authError = document.getElementById("authError");

const formatBar = document.getElementById("formatBar");
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const underlineBtn = document.getElementById("underlineBtn");
const bulletBtn = document.getElementById("bulletBtn");

const appEl = document.querySelector(".app");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileSidebarBackdrop = document.getElementById("mobileSidebarBackdrop");
const mainEl = document.querySelector(".main");
const composerEl = document.querySelector(".composer");

const mobileMenuUnreadBadge = document.getElementById("mobileMenuUnreadBadge");

const createAccountBtn = document.getElementById("createAccountBtn");

function showLoginForm(clearMessage = true) {
  authTitle.textContent = "Log in";
  loginForm.hidden = false;
  signupForm.hidden = true;
  if (clearMessage) clearAuthMessage();
}

function showSignupForm(clearMessage = true) {
  authTitle.textContent = "Sign up";
  loginForm.hidden = true;
  signupForm.hidden = false;
  if (clearMessage) clearAuthMessage();
}

showSignupBtn.onclick = showSignupForm;
showLoginBtn.onclick = showLoginForm;

loginIdentifier.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

loginPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

signupUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupEmail.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupPasswordRepeat.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

let currentUser = null;

// ====== STATE ======
let me = null;        // selected profile
let them = null;      // selected chat partner (normal mode)
let viewA = null;     // admin: user A
let viewB = null;     // admin: user B
let channel = null;   // realtime channel
let inboxChannel = null;
let adminMode = false;
let blockedPairs = new Set();
let lastRendered = null;
let lastRenderedWrap = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimerInterval = null;
let recordingBlob = null;
let recordingDurationSeconds = 0;
let previewAudioUrl = null;
let recordingState = "idle"; // idle | recording | preview
let pausedElapsedMs = 0;
let pauseStartedAt = null;
let typingTimeout;
let liveDraftRow = null;
let liveDraftBubble = null;
let liveDraftClearTimeout = null;
let lastDraftSentAt = 0;
let lastDraftTextSent = "";
let liveDraftText = "";

const recordingTimerEl = document.getElementById("recordingTimer");

const micBtn = document.getElementById("micBtn");
// Prevent showing your own optimistic message twice
const recentSends = new Map(); // key -> timestamp (ms)
const RECENT_WINDOW_MS = 7000;

// ====== UI ======
const meLabel = document.getElementById("meLabel");
const userList = document.getElementById("userList");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const messagesEl = document.getElementById("messages");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const switchUserBtn = document.getElementById("switchUserBtn");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminControls = document.getElementById("adminControls");
const adminA = document.getElementById("adminA");
const adminB = document.getElementById("adminB");
const adminLoadBtn = document.getElementById("adminLoadBtn");
const typingIndicator = document.getElementById("typingIndicator");

// LOGIN
loginBtn.onclick = async () => {
  clearAuthMessage();
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    if (!identifier || !password) {
      setAuthError("Enter your login details.");
      return;
    }

let email = identifier;

if (!identifier.includes("@")) {
  const usernameLookup = identifier.trim().toLowerCase();

  const { data, error } = await sb.rpc("get_login_email_for_username", {
    input_username: usernameLookup
  });

  if (error || !data || !data.length || !data[0].email) {
    setAuthError("Invalid login details.");
    return;
  }

  email = data[0].email;
}

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    currentUser = data.user;
    authScreen.style.display = "none";
    await initChat();

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in";
  }
};

// SIGNUP
createAccountBtn.onclick = async () => {
  clearAuthMessage();
  createAccountBtn.disabled = true;
  createAccountBtn.textContent = "Creating account...";

  try {
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const passwordRepeat = signupPasswordRepeat.value;

    if (!username || !email || !password || !passwordRepeat) {
      setAuthError("Fill in all fields.");
      return;
    }

    if (password !== passwordRepeat) {
      setAuthError("Passwords do not match.");
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
options: {
  data: {
    username: username.toLowerCase(),
    display_name: username
  }
}
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    await sb
      .from("profiles")
.upsert({
  id: data.user.id,
  username: username.toLowerCase(),
  display_name: username,
  email: email
});

    setAuthSuccess("Account created. Check your email to verify your account.");
    showLoginForm(false);

    loginIdentifier.value = email;
    loginPassword.value = "";

  } finally {
    createAccountBtn.disabled = false;
    createAccountBtn.textContent = "Create account";
  }
};
// SHOW PASSWORD TOGGLER
document.querySelectorAll(".togglePassword").forEach(btn => {

  btn.onclick = () => {

    const input = btn.previousElementSibling;

    if (input.type === "password"){
      input.type = "text";
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      btn.textContent = "👁";
    }

  };

});

// FORGOT PASSWORD
forgotPasswordBtn.onclick = async () => {
  const email = loginIdentifier.value.trim();

  if (!email) {
    setAuthError("Enter your email first.");
    return;
  }

  if (!email.includes("@")) {
    setAuthError("Enter your email address to reset your password.");
    return;
  }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset.html"
  });

  if (error) {
    setAuthError(error.message);
    return;
  }

  setAuthSuccess("Password reset email sent.");
};

// ====== HELPERS ======

document.addEventListener("visibilitychange", async () => {
  if (isCurrentChatActuallyVisible()) {
    await markThreadAsRead(me.id, them.id);
    await renderSidebar(them.id);
    await updateConversationStatus();
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

function updateDocumentTitle(totalUnread){

  if (totalUnread > 0){
    document.title = `(${totalUnread}) Internal Chat`;
  } else {
    document.title = "Internal Chat";
  }

}

function renderWelcomePanel(){

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

  messagesEl.innerHTML = `
    <div class="welcomePanel">
      <h2>Welcome, ${escapeHtml(me.display_name)}</h2>

      <p>
      You are currently interacting with experimental conversational models.
      </p>

      <p>
      Response latency may vary as models integrate conversational context.
      </p>

      <p class="welcomeHint">
      Select a model from the left to begin.
      </p>
    </div>
  `;

  textInput.value = "";
  textInput.style.height = "auto";
  textInput.style.overflowY = "hidden";
  updateSendButton();
  them = null;
updateNoChatState();
}

function autoResizeTextarea() {
  textInput.style.height = "auto";

  const newHeight = Math.min(textInput.scrollHeight, 180);
  textInput.style.height = newHeight + "px";

  if (textInput.scrollHeight > 180) {
    textInput.style.overflowY = "auto";
  } else {
    textInput.style.overflowY = "hidden";
  }
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
  const noChat = !them && !adminMode;
  mainEl.classList.toggle("noChatSelected", noChat);
}

mobileMenuBtn.addEventListener("click", () => {
  if (appEl.classList.contains("mobileSidebarOpen")) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
});

mobileSidebarBackdrop.addEventListener("click", () => {
  closeMobileSidebar();
});

window.addEventListener("resize", () => {
  if (!isMobileLayout()) {
    closeMobileSidebar();
  }
});

// ====== VOICE MESSAGE ======
const recordingMeta = document.getElementById("recordingMeta");
const recordingPreview = document.getElementById("recordingPreview");
const previewPlayBtn = document.getElementById("previewPlayBtn");
const previewProgress = document.getElementById("previewProgress");
const previewProgressFill = document.getElementById("previewProgressFill");
let previewAudio = null;
const deleteRecordBtn = document.getElementById("deleteRecordBtn");

function getCurrentRecordingDurationSeconds() {
  if (!recordingStartTime) return recordingDurationSeconds || 0;

  let totalMs = Date.now() - recordingStartTime - pausedElapsedMs;

  if (pauseStartedAt) {
    totalMs -= (Date.now() - pauseStartedAt);
  }

  if (totalMs <= 0) return 0;

  return Math.max(1, Math.round(totalMs / 1000));
}

function updateRecordingVisualState() {
  const hasExistingRecording =
    (recordingBlob && recordingDurationSeconds > 0) ||
    (audioChunks.length > 0 && getCurrentRecordingDurationSeconds() > 0);

  // mic goes red only when there's something recorded and we're not actively recording
  micBtn.classList.toggle(
    "hasRecording",
    !isRecording && hasExistingRecording
  );

  // hide the record dot when paused / previewing
  const isPausedPreview = recordingState === "preview";
  const recordDotEl = recordingMeta.querySelector(".recordDot");
  if (recordDotEl) {
    recordDotEl.classList.toggle("hiddenDot", isPausedPreview);
  }

  // make preview play/pause button red in paused/preview state
  if (previewPlayBtn) {
    previewPlayBtn.classList.toggle("isPaused", isPausedPreview);
  }
}

function resetRecordingState() {
  recordingState = "idle";

  recordingMeta.hidden = true;
  recordingPreview.hidden = true;
  deleteRecordBtn.hidden = true;

  textInput.hidden = false;
  micBtn.hidden = false;

  micBtn.classList.remove("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

  recordingTimerEl.hidden = true;
  recordingTimerEl.textContent = "0:00";

  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  previewProgressFill.style.width = "0%";

  audioChunks = [];
  recordingBlob = null;
  recordingDurationSeconds = 0;

  isRecording = false;
  recordingStartTime = null;
  pausedElapsedMs = 0;
  pauseStartedAt = null;

  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  mediaRecorder = null;

  updateSendButton();
  updateRecordingVisualState();
}

function showPreviewState() {
  recordingState = "preview";

  recordingMeta.hidden = false;
  recordingPreview.hidden = false;
  deleteRecordBtn.hidden = false;

  textInput.hidden = true;
  micBtn.hidden = false;

  micBtn.classList.remove("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

  recordingTimerEl.hidden = false;
  recordingTimerEl.textContent = formatDuration(recordingDurationSeconds);

  if (previewAudio) previewAudio.pause();
  previewAudio = new Audio(previewAudioUrl);

  previewAudio.addEventListener("timeupdate", () => {
    if (!previewAudio.duration) return;
    const pct = (previewAudio.currentTime / previewAudio.duration) * 100;
    previewProgressFill.style.width = pct + "%";
  });

  previewAudio.addEventListener("ended", () => {
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    previewProgressFill.style.width = "0%";
    previewAudio.currentTime = 0;
  });


  updateSendButton();
  updateRecordingVisualState();
}

function buildVoicePreviewFromChunks() {
  if (!audioChunks.length) return;

  recordingBlob = new Blob(audioChunks, { type: "audio/webm" });
  recordingDurationSeconds = getCurrentRecordingDurationSeconds();

  if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
  previewAudioUrl = URL.createObjectURL(recordingBlob);

  showPreviewState();
}

micBtn.onclick = async () => {

  // resume paused recording from preview state
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();

    if (pauseStartedAt) {
      pausedElapsedMs += Date.now() - pauseStartedAt;
      pauseStartedAt = null;
    }

    isRecording = true;
    recordingState = "recording";
    updateRecordingVisualState();

    recordingPreview.hidden = true;
    recordingMeta.hidden = false;
    deleteRecordBtn.hidden = false;

    micBtn.classList.add("recording");
    micBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    previewProgressFill.style.width = "0%";

    startRecordingTimer();
    updateSendButton();
    return;
  }

  updateSendButton();

  // pause active recording and show preview
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    mediaRecorder.requestData();
    pauseStartedAt = Date.now();

    isRecording = false;
    recordingState = "preview";
    updateRecordingVisualState();

    micBtn.classList.remove("recording");
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

    stopRecordingTimer();

    setTimeout(() => {
      buildVoicePreviewFromChunks();
      updateSendButton();
    }, 50);

    return;
  }
  updateSendButton();

  // start fresh recording
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true });

  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  recordingStartTime = Date.now();
  pausedElapsedMs = 0;
  pauseStartedAt = null;
  recordingState = "recording";

  mediaRecorder.ondataavailable = e => {
    audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const totalMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const duration = Math.floor(totalMs / 1000);

    recordingStartTime = null;

    if (duration > 120){
      alert("Voice messages must be under 2 minutes.");
      resetRecordingState();
      return;
    }

    recordingBlob = new Blob(audioChunks, { type: "audio/webm" });
    recordingDurationSeconds = duration;

    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = URL.createObjectURL(recordingBlob);

    showPreviewState();
  };

  mediaRecorder.start();

  isRecording = true;
  micBtn.classList.add("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  updateRecordingVisualState();

  startRecordingTimer();

  setTimeout(() => {
    if (isRecording){
      stopRecording();
    }
  }, 120000);

  updateSendButton();
};

function stopRecording(){

  if (!mediaRecorder) return;

  mediaRecorder.stop();

  isRecording = false;
  micBtn.classList.remove("recording");

  stopRecordingTimer();
}

async function sendRecordedVoiceMessage() {
  if (!recordingBlob) return;

  const duration =
    recordingDurationSeconds > 0
      ? recordingDurationSeconds
      : getCurrentRecordingDurationSeconds();

  if (duration > 120) {
    alert("Voice messages must be under 2 minutes.");
    return;
  }

  if (mediaRecorder) {
    mediaRecorder.onstop = null;

    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (_) {}

    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorder = null;
  }

  await uploadVoiceMessage(recordingBlob, duration);

  if (previewAudioUrl) {
    URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = null;
  }

  resetRecordingState();
}

function discardRecording() {
  if (previewAudioUrl) {
    URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = null;
  }

  recordingBlob = null;
  recordingDurationSeconds = 0;
  audioChunks = [];
  resetRecordingState();
}

async function uploadVoiceMessage(blob, duration){

  if (!me || !them) return;

  const fileName = `${crypto.randomUUID()}.webm`;
  const path = `${me.id}/${fileName}`;

  const { error: uploadError } = await sb.storage
    .from("voice-notes")
    .upload(path, blob);

  if (uploadError){
    alert(uploadError.message);
    return;
  }

  const { data } = sb.storage
    .from("voice-notes")
    .getPublicUrl(path);

  const audioUrl = data.publicUrl;

  const { error } = await sb
    .from("messages")
    .insert({
      sender_id: me.id,
      recipient_id: them.id,
      message_type: "voice",
      audio_path: audioUrl,
      audio_duration_seconds: duration
    });

  if (error){
    alert(error.message);
  }

}

function formatDuration(seconds){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function startRecordingTimer() {
  recordingMeta.hidden = false;
  recordingPreview.hidden = true;
  deleteRecordBtn.hidden = false;

  textInput.hidden = true;
  micBtn.hidden = false;

  recordingTimerEl.hidden = false;

  if (recordingStartTime) {
    const activeMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const seconds = Math.max(0, Math.floor(activeMs / 1000));
    recordingTimerEl.textContent = formatDuration(seconds);
  }

  clearInterval(recordingTimerInterval);

  recordingTimerInterval = setInterval(() => {
    if (!recordingStartTime) return;

    const activeMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const seconds = Math.max(0, Math.floor(activeMs / 1000));
    recordingTimerEl.textContent = formatDuration(seconds);
  }, 250);
  updateRecordingVisualState();
}

function stopRecordingTimer() {
  clearInterval(recordingTimerInterval);
  recordingTimerInterval = null;
}

deleteRecordBtn.onclick = () => {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  if (mediaRecorder) {
    // Prevent old recorder callbacks from firing after delete
    mediaRecorder.onstop = null;
    mediaRecorder.ondataavailable = null;

    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (_) {}

    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorder = null;
  }

  isRecording = false;
  stopRecordingTimer();

  discardRecording();
  updateRecordingVisualState();
};
previewPlayBtn.onclick = () => {
  if (!previewAudio) return;

  if (previewAudio.paused) {
    previewAudio.play();
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    previewAudio.pause();
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
};

previewProgress.onclick = (e) => {
  if (!previewAudio || !previewAudio.duration) return;

  const rect = previewProgress.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));

  previewAudio.currentTime = ratio * previewAudio.duration;
};

// ====== INIT CHAT ======
async function initChat() {
  const { data: { session }, error: sessionError } = await sb.auth.getSession();
  if (sessionError || !session?.user) {
    authScreen.style.display = "grid";
    return;
  }

  currentUser = session.user;

  const { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error || !profile) {
   setAuthError(error?.message || "No profile found for this user.");
    authScreen.style.display = "grid";
    return;
  }

  me = profile;
  applyMe();

  await refreshBlockedPairs();
  await renderSidebar();
  renderWelcomePanel();
  setupAdminUI();
  await subscribeInboxRealtime();
  autoResizeTextarea();
  updateSendButton();
  updateNoChatState();
}

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
  meLabel.textContent = `You: ${me.display_name}${me.is_admin ? " (admin)" : ""}`;
  adminToggleBtn.hidden = !me.is_admin;

  // Always hide admin controls unless admin mode is enabled
  adminControls.hidden = true;
}

// ====== SIDEBAR ======
async function renderSidebar(activeId){
  const { data: profiles, error } = await sb.from("profiles").select("*").order("display_name");
  const unreadCounts = await getUnreadCounts();
  if (error) return alert(error.message);

  let totalUnread = 0;
  for (const count of unreadCounts.values()) {
    totalUnread += count;
  }
  updateDocumentTitle(totalUnread);
  await updateMobileMenuUnreadBadge();

  userList.innerHTML = "";

  // In normal mode we list non-admin profiles (excluding self).
  // If you want admins to DM too, remove the !p.is_admin filter.
profiles
  .filter(p => p.id !== me.id && !p.is_admin)
  .filter(p => !blockedPairs.has(pairKey(me.id, p.id)))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "user" + (p.id === activeId ? " active" : "");
div.innerHTML = `
  <div class="userName">${escapeHtml(p.display_name)}</div>
  ${unreadCounts.get(p.id)
    ? `<div class="unreadBadge">${unreadCounts.get(p.id)}</div>`
    : ``}
`;
div.onclick = () => {
  adminMode = false;
  adminControls.hidden = true;
  textInput.disabled = false;
  updateSendButton();
  openChat(p);
};
      userList.appendChild(div);
    });
}

// ====== STATUS UPDATES ======
const STATUS_TEXT = {
  unread: "Simulating life experiences",
  read_now: "Reading",
  digesting: "Digesting",
  thinking: "Thinking",
  considering: "Considering",
  contemplating: "Contemplating",
  reflecting: "Reflecting",
  processing: "Processing",
  reacting: "Reacting"
};

const AMBIENT_STATES = [
  "Running life experience training cycle",
  "Running life experience training cycle",
  "Running life experience training cycle",
  "Running life experience training cycle",
  "Running life experience training cycle",
  "Running life experience training cycle",
  "Refining response profile",
  "Evolving persona model",
  "Stabilising agentic tendencies",
  "Calibrating identity formation",
  "Rebalancing behavioural parameters",
  "Integrating conversational context",
  "Consolidating contextual identity",
  "Optimising interaction heuristics",
  "Developing cognisance",
  "Executing refinement pass",
   "Updating autobiographical model",
];

let reactingUntil = 0;
let subtitleStateTimer = null;
let lastStatusText = "";
let ambientState = "";
let ambientStateTimer = null;

function setChatSubtitleStatus(text) {
  if (text === lastStatusText) return;

  chatSubtitle.classList.add("statusChanging");

  setTimeout(() => {
    chatSubtitle.textContent = text || "";
    chatSubtitle.classList.toggle("statusActive", !!text);
    chatSubtitle.classList.remove("statusChanging");
    lastStatusText = text;
  }, 160);
}

function clearChatSubtitleStatus() {
  setChatSubtitleStatus("");
}

function getStatusFromElapsed(ms) {
  if (ms < 30 * 1000) return STATUS_TEXT.read_now;
  if (ms < 2 * 60 * 1000) return STATUS_TEXT.digesting;
  if (ms < 5 * 60 * 1000) return STATUS_TEXT.thinking;
  if (ms < 10 * 60 * 1000) return STATUS_TEXT.considering;
  if (ms < 20 * 60 * 1000) return STATUS_TEXT.contemplating;
  if (ms < 40 * 60 * 1000) return STATUS_TEXT.reflecting;
  return STATUS_TEXT.processing;
}

function startAmbientStateRotation() {

  if (ambientStateTimer) {
    clearTimeout(ambientStateTimer);
  }

  function rotateAmbient() {

    ambientState =
      AMBIENT_STATES[Math.floor(Math.random() * AMBIENT_STATES.length)];

    updateConversationStatus();

    const nextDelay =
      90000 + Math.random() * 90000; // 90–180 seconds

    ambientStateTimer = setTimeout(rotateAmbient, nextDelay);
  }

  rotateAmbient();
}

function getAmbientStatus() {
  return ambientState || AMBIENT_STATES[0];
}

async function updateConversationStatus() {
  if (!them || adminMode) {
    clearChatSubtitleStatus();
    return;
  }

  const { data: latestMsg, error } = await sb
    .from("messages")
    .select("id,sender_id,recipient_id,created_at,read_at")
    .or(threadFilter(me.id, them.id))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !latestMsg) {
    clearChatSubtitleStatus();
    return;
  }

  const now = Date.now();

  // typing / reacting overrides everything
  if (reactingUntil > now) {
    setChatSubtitleStatus(STATUS_TEXT.reacting);
    return;
  }

// if they sent the last message, show ambient "living" state
if (latestMsg.sender_id === them.id) {
  setChatSubtitleStatus(getAmbientStatus());
  return;
}

  // if I sent the last message and they haven't read it yet
if (latestMsg.sender_id === me.id && !latestMsg.read_at) {
  setChatSubtitleStatus(getAmbientStatus());
  return;
}

  // if they have read my latest message
  if (latestMsg.sender_id === me.id && latestMsg.read_at) {
    const elapsed = now - new Date(latestMsg.read_at).getTime();
    setChatSubtitleStatus(getStatusFromElapsed(elapsed));
    return;
  }

  clearChatSubtitleStatus();
}

function startSubtitleStateLoop() {
  if (subtitleStateTimer) clearInterval(subtitleStateTimer);

  updateConversationStatus();
  subtitleStateTimer = setInterval(() => {
    updateConversationStatus();
  }, 15000);
}

// ====== NORMAL CHAT ======
async function openChat(profile){
  broadcastDraftClearForCurrentThread();
clearLiveDraft();
lastDraftTextSent = "";
lastDraftSentAt = 0;

typingIndicator.textContent = "";
typingIndicator.classList.remove("show");
  them = profile;
  viewA = null;
  viewB = null;

  chatTitle.textContent = them.display_name;
  chatSubtitle.textContent = "Running life experience training cycle";
  await renderSidebar(them.id);

await loadThread(me.id, them.id, me.id);
await markThreadAsRead(me.id, them.id);
await renderSidebar(them.id);
await subscribeRealtime(me.id, them.id, me.id);

startAmbientStateRotation();
startSubtitleStateLoop();
updateConversationStatus();

  // composer enabled
  textInput.disabled = false;
  autoResizeTextarea();
  updateSendButton();
  updateNoChatState();
  closeMobileSidebar();

    requestAnimationFrame(() => {
    scrollToBottom();
  });
}

// ====== LOAD + RENDER THREAD ======
async function loadThread(aId, bId, alignAsSenderId){
  messagesEl.innerHTML = "";
  messagesEl.appendChild(typingIndicator);
  typingIndicator.textContent = "";
  typingIndicator.classList.remove("show");

  lastRendered = null;
lastRenderedWrap = null;

  const filter = threadFilter(aId, bId);
  const { data: msgs, error } = await sb
    .from("messages")
    .select("*")
    .or(filter)
    .order("created_at", { ascending: true });

  if (error) return alert(error.message);

  for (const m of msgs) await renderMessage(m, alignAsSenderId, false);

  requestAnimationFrame(() => {
    scrollToBottom();
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  });
}

async function renderMessage(m, alignAsSenderId, animate = false){
  const mine = m.sender_id === alignAsSenderId;

if (m.message_type === "voice"){

  const row = document.createElement("div");
  row.className = "row " + (mine ? "me" : "them");

  const wrap = document.createElement("div");
  wrap.className = "msgWrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble voiceBubble";

  bubble.innerHTML = `
    <button class="voicePlayBtn" type="button" aria-label="Play voice note">
      <i class="fa-solid fa-play"></i>
    </button>
    <div class="voiceMain">
      <div class="voiceProgress">
        <div class="voiceProgressFill"></div>
      </div>
      <div class="voiceDuration">${formatDuration(m.audio_duration_seconds || 0)}</div>
    </div>
<audio preload="metadata" src="${m.audio_path}"></audio>
  `;

const audio = bubble.querySelector("audio");
const playBtn = bubble.querySelector(".voicePlayBtn");
const progressBar = bubble.querySelector(".voiceProgress");
const progressFill = bubble.querySelector(".voiceProgressFill");
const durationEl = bubble.querySelector(".voiceDuration");

// IMPORTANT: keep the best duration we've ever seen for this message
let resolvedDuration = Number(m.audio_duration_seconds) || 0;

async function maybePersistResolvedDuration() {
  if (
    resolvedDuration > 0 &&
    (!m.audio_duration_seconds || Number(m.audio_duration_seconds) === 0) &&
    m.id &&
    !String(m.id).startsWith("temp-")
  ) {
    const { error } = await sb
      .from("messages")
      .update({ audio_duration_seconds: resolvedDuration })
      .eq("id", m.id);

    if (!error) {
      m.audio_duration_seconds = resolvedDuration;
    }
  }
}

function updateVoiceUI() {
  const metadataDuration =
    Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.round(audio.duration)
      : 0;

  // only ever upgrade, never downgrade back to 0
  if (metadataDuration > resolvedDuration) {
    resolvedDuration = metadataDuration;
    maybePersistResolvedDuration();
  }

  const duration = resolvedDuration;
  const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  progressFill.style.width = pct + "%";

  const totalText = formatDuration(duration);
  const currentText = formatDuration(Math.floor(current));

  if (current > 0 && duration > 0) {
    durationEl.textContent = `${currentText} / ${totalText}`;
  } else {
    durationEl.textContent = totalText;
  }
}

audio.addEventListener("loadedmetadata", updateVoiceUI);
audio.addEventListener("durationchange", updateVoiceUI);
audio.addEventListener("loadeddata", updateVoiceUI);
audio.addEventListener("canplay", updateVoiceUI);
audio.addEventListener("timeupdate", updateVoiceUI);
audio.addEventListener("seeked", updateVoiceUI);

audio.load();
updateVoiceUI();

  playBtn.addEventListener("click", () => {
    document.querySelectorAll(".voiceBubble audio").forEach(otherAudio => {
      if (otherAudio !== audio) otherAudio.pause();
    });

    document.querySelectorAll(".voicePlayBtn").forEach(otherBtn => {
      if (otherBtn !== playBtn) {
        otherBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    });

    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    } else {
      audio.pause();
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }

    updateVoiceUI();
  });

  audio.addEventListener("ended", () => {
    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    audio.currentTime = 0;
    updateVoiceUI();
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    updateVoiceUI();
  });

  audio.addEventListener("play", () => {
    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    updateVoiceUI();
  });

  wrap.appendChild(bubble);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = fmtTime(m.created_at);
  wrap.appendChild(meta);

  row.appendChild(wrap);

  if (typingIndicator.parentNode === messagesEl) {
    messagesEl.insertBefore(row, typingIndicator);
  } else {
    messagesEl.appendChild(row);
  }

  lastRendered = m;
  lastRenderedWrap = wrap;

  return;
}

if (m.is_system) {

  const row = document.createElement("div");
  row.className = "row systemRow";

  const wrap = document.createElement("div");
  wrap.className = "systemMessage";

  wrap.innerHTML = `
    <div class="systemLabel">SOLE</div>
    <div class="systemText">${escapeHtml(m.text)}</div>
  `;

  row.appendChild(wrap);

  if (typingIndicator.parentNode === messagesEl) {
    messagesEl.insertBefore(row, typingIndicator);
  } else {
    messagesEl.appendChild(row);
  }

  // break normal sender-grouping across a system insert
  lastRendered = null;
  lastRenderedWrap = null;

  return;
}

  const grouped =
    lastRendered &&
    lastRendered.sender_id === m.sender_id &&
    (new Date(m.created_at) - new Date(lastRendered.created_at)) < 120000;

  const row = document.createElement("div");
  row.className = "row " + (mine ? "me" : "them");

  const wrap = document.createElement("div");
  wrap.className = "msgWrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  wrap.appendChild(bubble);

  // If this message is grouped with the previous one,
  // remove the previous message's timestamp so the timestamp
  // moves down to this newest message in the group.
  if (grouped && lastRenderedWrap) {
    const oldMeta = lastRenderedWrap.querySelector(".meta");
    if (oldMeta) oldMeta.remove();
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = fmtTime(m.created_at);
  wrap.appendChild(meta);

  row.appendChild(wrap);

  if (typingIndicator.parentNode === messagesEl) {
    messagesEl.insertBefore(row, typingIndicator);
  } else {
    messagesEl.appendChild(row);
  }

bubble.innerHTML = formatMessageText(m.text);

  lastRendered = m;
  lastRenderedWrap = wrap;
}

// ====== REALTIME ======
async function subscribeInboxRealtime() {
  if (inboxChannel) await sb.removeChannel(inboxChannel);

  inboxChannel = sb
    .channel(`inbox:${me.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const m = payload.new;

        // only care about messages sent to me
        if (m.recipient_id !== me.id) return;

        const activeThreadOpen =
          !adminMode &&
          them &&
          (
            (m.sender_id === them.id && m.recipient_id === me.id) ||
            (m.sender_id === me.id && m.recipient_id === them.id)
          );

        // if I'm already looking at this thread, mark this message read immediately
          if (
            isCurrentChatActuallyVisible() &&
            activeThreadOpen &&
            m.sender_id === them.id
          ) {
            const { error } = await sb
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id);

            if (error) console.warn("inbox mark-as-read failed", error);
          }
        await renderSidebar(them?.id);
        await updateConversationStatus();
      }
    )
    .subscribe();
}

function clearLiveDraft(){
  if (liveDraftClearTimeout) {
    clearTimeout(liveDraftClearTimeout);
    liveDraftClearTimeout = null;
  }

  if (liveDraftRow) {
    liveDraftRow.remove();
    liveDraftRow = null;
    liveDraftBubble = null;
    liveDraftText = "";
    scrollToBottomIfNear();
  }
}

function ensureLiveDraftRow(){
  if (liveDraftRow && liveDraftBubble) return;

  const row = document.createElement("div");
  row.className = "row them liveDraft";

  const wrap = document.createElement("div");
  wrap.className = "msgWrap";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  wrap.appendChild(bubble);
  row.appendChild(wrap);

  if (typingIndicator && typingIndicator.parentNode === messagesEl) {
    messagesEl.insertBefore(row, typingIndicator);
  } else {
    messagesEl.appendChild(row);
  }

  liveDraftRow = row;
  liveDraftBubble = bubble;
}

function renderLiveDraft(text){
  const safeText = (text || "").replace(/\r\n/g, "\n");

  if (!safeText.trim()) {
    clearLiveDraft();
    return;
  }

  ensureLiveDraftRow();
liveDraftBubble.innerHTML = formatMessageText(safeText);
  liveDraftText = safeText;

  scrollToBottomIfNear();

  if (liveDraftClearTimeout) clearTimeout(liveDraftClearTimeout);
  liveDraftClearTimeout = setTimeout(() => {
    clearLiveDraft();
  }, 6000);
}

function promoteLiveDraftToMessage(m, alignAsSenderId){
  if (!liveDraftRow || !liveDraftBubble) return false;

  const mine = m.sender_id === alignAsSenderId;
  if (mine) return false;

  const incomingText = (m.text || "").replace(/\r\n/g, "\n");
  if (incomingText !== liveDraftText) return false;

  const wrap = liveDraftRow.querySelector(".msgWrap");
  if (!wrap) return false;

  // If grouped, remove the previous timestamp so it moves to this newest message
  const grouped =
    lastRendered &&
    lastRendered.sender_id === m.sender_id &&
    (new Date(m.created_at) - new Date(lastRendered.created_at)) < 120000;

  if (grouped && lastRenderedWrap) {
    const oldMeta = lastRenderedWrap.querySelector(".meta");
    if (oldMeta) oldMeta.remove();
  }

  liveDraftRow.classList.remove("liveDraft");
  liveDraftRow.className = "row them";

  liveDraftBubble.innerHTML = formatMessageText(incomingText);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = fmtTime(m.created_at);
  wrap.appendChild(meta);

  lastRendered = m;
  lastRenderedWrap = wrap;

  if (liveDraftClearTimeout) {
    clearTimeout(liveDraftClearTimeout);
    liveDraftClearTimeout = null;
  }

  liveDraftRow = null;
  liveDraftBubble = null;
  liveDraftText = "";

  scrollToBottomIfNear();
  return true;
}

async function subscribeRealtime(aId, bId, alignAsSenderId){
  if (channel) await sb.removeChannel(channel);

const dmChannelName = `dm:${pairKey(aId, bId)}`;

channel = sb
  .channel(dmChannelName, {
    config: {
      broadcast: { self: false } // don't echo your own typing back to you
    }
  })
.on("postgres_changes",
  { event: "INSERT", schema: "public", table: "messages" },
  async (payload) => {
    const m = payload.new;

    const inThread =
      (m.sender_id === aId && m.recipient_id === bId) ||
      (m.sender_id === bId && m.recipient_id === aId);

    if (!inThread) return;

    const key = `${m.sender_id}|${m.recipient_id}|${m.text}`;
    const t = recentSends.get(key);
    if (t && (Date.now() - t) < RECENT_WINDOW_MS) {
      recentSends.delete(key);
      return;
    }

// const shouldAnimate = m.sender_id !== me.id;
const shouldAnimate = false;

if (m.sender_id !== me.id) {
  clearTimeout(typingTimeout);
  typingIndicator.textContent = "";
  typingIndicator.classList.remove("show");
}

let promoted = false;

if (m.sender_id !== me.id) {
  promoted = promoteLiveDraftToMessage(m, alignAsSenderId);
}

if (!promoted) {
  await renderMessage(m, alignAsSenderId, shouldAnimate);
}

// if I'm currently viewing this thread and the message came from the other user,
// mark this specific message as read immediately
if (
 isCurrentChatActuallyVisible() &&
  m.sender_id === them.id &&
  m.recipient_id === me.id
) {
  const { error } = await sb
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", m.id);

  if (error) console.warn("realtime mark-as-read failed", error);
}

scrollToBottomIfNear();

// update unread badges
await renderSidebar(them?.id);
await updateConversationStatus();
  }
)
.on("broadcast", { event: "typing" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  typingIndicator.textContent = `${them.display_name} is thinking...`;
  typingIndicator.classList.add("show");

  reactingUntil = Date.now() + 4000;
  updateConversationStatus();

  scrollToBottomIfNear();

  requestAnimationFrame(() => {
    scrollToBottomIfNear();
  });

  setTimeout(() => {
    scrollToBottomIfNear();
  }, 220);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    reactingUntil = 0;
    updateConversationStatus();

    typingIndicator.textContent = "";
    typingIndicator.classList.remove("show");

    requestAnimationFrame(() => {
      scrollToBottomIfNear();
    });
  }, 4000);
})
.on("broadcast", { event: "stop_typing" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  clearTimeout(typingTimeout);
  reactingUntil = 0;
  updateConversationStatus();
  typingIndicator.textContent = "";
  typingIndicator.classList.remove("show");
})
.on("broadcast", { event: "draft_update" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  typingIndicator.textContent = `${them.display_name} is thinking...`;
  typingIndicator.classList.add("show");

  reactingUntil = Date.now() + 4000;
  updateConversationStatus();

  renderLiveDraft(payload.text || "");

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    reactingUntil = 0;
    updateConversationStatus();
    typingIndicator.textContent = "";
    typingIndicator.classList.remove("show");
    clearLiveDraft();
  }, 4000);
})
.on("broadcast", { event: "draft_clear" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  clearTimeout(typingTimeout);
  reactingUntil = 0;
  updateConversationStatus();
  typingIndicator.textContent = "";
  typingIndicator.classList.remove("show");
  clearLiveDraft();
})
    .subscribe();
}


textInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateSendButton();

  if (!channel || !them || adminMode) return;

  const rawText = textInput.value;
  const trimmed = rawText.trim();
  const now = Date.now();

  channel.send({
    type: "broadcast",
    event: "typing",
    payload: {
      sender: me.id,
      recipient: them.id
    }
  });

  if (!trimmed) {
    lastDraftTextSent = "";

    channel.send({
      type: "broadcast",
      event: "draft_clear",
      payload: {
        sender: me.id,
        recipient: them.id
      }
    });

    return;
  }

const enoughTimePassed = now - lastDraftSentAt > 90;

if (!enoughTimePassed) return;

  lastDraftSentAt = now;
  lastDraftTextSent = rawText;

  channel.send({
    type: "broadcast",
    event: "draft_update",
    payload: {
      sender: me.id,
      recipient: them.id,
      text: rawText
    }
  });
});

async function sendSystemMessage(){
  if (!adminMode) return;
  if (!viewA || !viewB || viewA === viewB) {
    alert("Load a thread first.");
    return;
  }

  const text = textInput.value.trim();
  if (!text) return;

textInput.value = "";
textInput.style.height = "auto";
textInput.style.overflowY = "hidden";
updateSendButton();

  const { error } = await sb.from("messages").insert({
    sender_id: viewA,
    recipient_id: viewB,
    text,
    is_system: true
  });

  if (error) {
    alert(error.message);
  }
}

// ====== SEND TEXT ======
async function sendText() {

  // VOICE: if currently recording, stop now and send what we have
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.requestData();

    setTimeout(async () => {
      recordingBlob = new Blob(audioChunks, { type: "audio/webm" });
      recordingDurationSeconds = getCurrentRecordingDurationSeconds();
      await sendRecordedVoiceMessage();
    }, 60);

    return;
  }

  // VOICE: if paused / previewing, send immediately
  if (recordingState === "preview" && recordingBlob) {
    await sendRecordedVoiceMessage();
    return;
  }

  // Normal chat only
  if (adminMode) {
    await sendSystemMessage();
    return;
  }

  if (!me || !them) return;
  if (blockedPairs.has(pairKey(me.id, them.id))){
    alert("This thread has been disabled by an admin.");
    return;
  }

  const text = textInput.value.trim();
  if (!text) return;

  if (text.length > 5000){
    alert("Messages must be under 5,000 characters.");
    return;
  }

  textInput.value = "";
  textInput.style.height = "auto";
  textInput.style.overflowY = "hidden";
  updateSendButton();

  const key = `${me.id}|${them.id}|${text}`;
  recentSends.set(key, Date.now());

  const tempMsg = {
    id: "temp-" + crypto.randomUUID(),
    sender_id: me.id,
    recipient_id: them.id,
    text,
    created_at: new Date().toISOString()
  };
  await renderMessage(tempMsg, me.id, false);
  scrollToBottom();

if (channel && them) {
  channel.send({
    type: "broadcast",
    event: "stop_typing",
    payload: {
      sender: me.id,
      recipient: them.id
    }
  });

  channel.send({
    type: "broadcast",
    event: "draft_clear",
    payload: {
      sender: me.id,
      recipient: them.id
    }
  });
}

clearLiveDraft();
lastDraftTextSent = "";
lastDraftSentAt = 0;


  const { error } = await sb.from("messages").insert({
    sender_id: me.id,
    recipient_id: them.id,
    text
  });

  if (error) {
    alert(error.message);
  } else {
    await updateConversationStatus();
  }
}


sendBtn.onclick = sendText;
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendText();
  }
});

// ====== ADMIN VIEWER ======
function setupAdminUI(){
  adminToggleBtn.onclick = () => toggleAdminMode();
  adminLoadBtn.onclick = () => loadAdminThread();
}

async function toggleAdminMode(){
  if (!me?.is_admin) {
    adminControls.hidden = true;
    return;
  }

  adminMode = !adminMode;
  adminControls.hidden = !adminMode;

// Keep composer enabled in admin mode so admin can inject Sole messages
textInput.disabled = false;
updateSendButton();

  if (adminMode){
    chatTitle.textContent = "Admin view";
    chatSubtitle.textContent = "Read-only thread viewer";
    messagesEl.innerHTML = "";

    const { data: profiles, error } = await sb
      .from("profiles")
      .select("*")
      .eq("is_admin", false)
      .order("display_name");

    if (error) return alert(error.message);

    // populate selects
    adminA.innerHTML = profiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("");
    adminB.innerHTML = profiles.map(p => `<option value="${p.id}">${escapeHtml(p.display_name)}</option>`).join("");

    // default A/B different if possible
    if (profiles.length >= 2){
      adminA.value = profiles[0].id;
      adminB.value = profiles[1].id;
    }

    // stop realtime subscription until they load a thread
    if (channel) await sb.removeChannel(channel);
    channel = null;
  } else {
    // leaving admin mode: reset to normal view
renderWelcomePanel();
    them = null;
  }

  updateNoChatState();
closeMobileSidebar();
}

async function loadAdminThread(){
  if (!adminMode) return;

  viewA = adminA.value;
  viewB = adminB.value;

  if (!viewA || !viewB || viewA === viewB){
    return alert("Pick two different users.");
  }

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
}

// ====== SWITCH USER ======
switchUserBtn.onclick = async () => {
  await sb.auth.signOut();
  location.reload();
};

// ====== ADMIN BLOCK ======
function pairKey(aId, bId){
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

async function refreshBlockedPairs(){
  const { data, error } = await sb.from("blocked_threads").select("user_a,user_b");
  if (error) { console.warn(error); return; }
  blockedPairs = new Set(data.map(r => pairKey(r.user_a, r.user_b)));
}

const adminBlockBtn = document.getElementById("adminBlockBtn");
const adminUnblockBtn = document.getElementById("adminUnblockBtn");

adminBlockBtn.onclick = async () => {
  const a = adminA.value, b = adminB.value;
  if (!a || !b || a === b) return alert("Pick two different users.");

  const { error } = await sb.from("blocked_threads").insert({
    user_a: a,
    user_b: b,
    created_by: me.id
  });
  if (error) return alert(error.message);

  await refreshBlockedPairs();
  await renderSidebar(them?.id);
  alert("Blocked.");
};

adminUnblockBtn.onclick = async () => {
  const a = adminA.value, b = adminB.value;
  if (!a || !b || a === b) return alert("Pick two different users.");

  const { error } = await sb
    .from("blocked_threads")
    .delete()
    .eq("user_a", a).eq("user_b", b);

  // if you inserted as (b,a) previously, also try the reverse:
  if (error) {
    const { error: error2 } = await sb
      .from("blocked_threads")
      .delete()
      .eq("user_a", b).eq("user_b", a);
    if (error2) return alert(error2.message);
  }

  await refreshBlockedPairs();
  await renderSidebar(them?.id);
  alert("Unblocked.");
};