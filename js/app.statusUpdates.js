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

  if (!chatModelStatus) return;

  chatModelStatus.classList.add("statusChanging");

  setTimeout(() => {
    chatModelStatus.textContent = text || "";
    chatModelStatus.classList.toggle("statusActive", !!text);
    chatModelStatus.classList.remove("statusChanging");
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
      90000 + Math.random() * 90000;

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
