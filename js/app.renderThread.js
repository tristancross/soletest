// ====== LOAD + RENDER THREAD ======
async function loadThread(aId, bId, alignAsSenderId){
  messagesEl.innerHTML = "";
  messagesEl.appendChild(typingIndicator);
hideTypingIndicator();

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
  syncResponseStateForLatestMessage(msgs[msgs.length - 1], alignAsSenderId);

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
