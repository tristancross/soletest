// ====== LOAD + RENDER THREAD ======
function renderThreadLoadingState() {
  messagesEl.innerHTML = `
    <div class="messagesLoadingState" role="status" aria-live="polite">
      <span class="messagesLoadingSpinner" aria-hidden="true"></span>
      <span>Loading conversation</span>
    </div>
  `;

  messagesEl.appendChild(typingIndicator);
  hideTypingIndicator();
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

  if (previewDraftClearTimeout) {
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

async function loadThread(aId, bId, alignAsSenderId){
  renderThreadLoadingState();

  lastRendered = null;
  lastRenderedWrap = null;

  const filter = threadFilter(aId, bId);
  const { data: msgs, error } = await sb
    .from("messages")
    .select("*")
    .or(filter)
    .order("created_at", { ascending: true });

  if (error) {
    messagesEl.innerHTML = "";
    messagesEl.appendChild(typingIndicator);
    hideTypingIndicator();
    alert(error.message);
    return;
  }

  const rawMessages = msgs || [];
  const overrides = await loadMessageOverrides(
    rawMessages
      .map(message => message.id)
      .filter(Boolean)
  );

  const resolvedMessages = rawMessages
    .map(message => resolveMessageForViewer(message, overrides, alignAsSenderId))
    .filter(message => !message.hidden_for_viewer);

  // IMPORTANT:
  // Loading is done. Clear the loading pill before rendering messages.
  messagesEl.innerHTML = "";
  messagesEl.appendChild(typingIndicator);
  hideTypingIndicator();

  for (const m of resolvedMessages) {
    await renderMessage(m, alignAsSenderId, false);
  }

  syncResponseStateForLatestMessage(
    resolvedMessages[resolvedMessages.length - 1],
    alignAsSenderId
  );

  requestAnimationFrame(() => {
    scrollToBottom();
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  });
}

async function renderMessage(m, alignAsSenderId, animate = false){
  if (m.hidden_for_viewer) return;

const displayText = m.display_text ?? m.text ?? "";
  const mine = m.sender_id === alignAsSenderId;

if (m.message_type === "voice"){

  const row = document.createElement("div");
  row.className = "row " + (mine ? "me" : "them");
  row.dataset.messageId = m.id || "";

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
  row.dataset.messageId = m.id || "";

  const wrap = document.createElement("div");
  wrap.className = "systemMessage";

wrap.innerHTML = `
  <div class="systemLabel">SOLE</div>
  <div class="systemText">${formatMessageText(displayText)}</div>
`;

  row.appendChild(wrap);

  if (typingIndicator.parentNode === messagesEl) {
    messagesEl.insertBefore(row, typingIndicator);
  } else {
    messagesEl.appendChild(row);
  }

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
  row.dataset.messageId = m.id || "";

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

bubble.innerHTML = formatMessageText(displayText);

  lastRendered = m;
  lastRenderedWrap = wrap;
}

async function loadMessageOverrides(messageIds = []) {
  if (!messageIds.length) return [];

  const uniqueIds = [...new Set(messageIds.filter(Boolean))];

  // Supabase turns `.in()` into a GET URL.
  // Big arrays can create a URL so long that PostgREST rejects it.
  const chunkSize = 75;
  const allOverrides = [];

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);

    const { data, error } = await sb
      .from("message_overrides")
      .select("*")
      .in("message_id", chunk);

    if (error) {
      console.warn("Could not load message override chunk", {
        error,
        chunkStart: i,
        chunkSize: chunk.length
      });
      continue;
    }

    allOverrides.push(...(data || []));
  }

  return allOverrides;
}

function shouldHideMessageForViewer(message, viewerId) {
  const visibleToUserId =
    message.visible_to_user_id ||
    message.system_visible_to_user_id ||
    null;

  // null means visible to both users.
  if (!visibleToUserId) return false;

  return visibleToUserId !== viewerId;
}

function resolveMessageForViewer(message, overrides = [], viewerId) {
if (shouldHideMessageForViewer(message, viewerId)) {
    return {
      ...message,
      display_text: "",
      hidden_for_viewer: true
    };
  }

  const viewerSpecific = overrides.find(item =>
    item.message_id === message.id &&
    item.viewer_id === viewerId
  );

  const globalOverride = overrides.find(item =>
    item.message_id === message.id &&
    item.viewer_id === null
  );

  const override = viewerSpecific || globalOverride;

  if (!override) {
    return {
      ...message,
      display_text: message.text,
      hidden_for_viewer: false
    };
  }

  if (override.is_hidden) {
    return {
      ...message,
      display_text: "",
      hidden_for_viewer: true
    };
  }

  return {
    ...message,
    display_text: override.replacement_text ?? message.text,
    hidden_for_viewer: false
  };
}

async function applyMessageOverrideToRenderedMessage(messageId, alignAsSenderId) {
  if (!messageId) return false;

  const existingRow = messagesEl.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`
  );

  const { data: message, error } = await sb
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !message) {
    console.warn("Could not load moderated message", error);
    return false;
  }

  const overrides = await loadMessageOverrides([messageId]);
  const resolved = resolveMessageForViewer(message, overrides, alignAsSenderId);

  // Hidden for this viewer: remove just this row.
if (resolved.hidden_for_viewer) {
  if (!existingRow) {
    return false;
  }

  existingRow.remove();

  lastRendered = null;
  lastRenderedWrap = null;

  return true;
}
  // If the message is currently missing, it was probably just unhidden.
  // Rebuilding only on unhide is acceptable and avoids tricky chronological reinsertion.
  if (!existingRow) {
    return false;
  }

  const displayText = resolved.display_text ?? resolved.text ?? "";

  if (resolved.is_system) {
    const systemText = existingRow.querySelector(".systemText");
    if (systemText) {
      systemText.innerHTML = formatMessageText(displayText);
      existingRow.classList.add("messageOverrideFlash");
      setTimeout(() => existingRow.classList.remove("messageOverrideFlash"), 700);
      return true;
    }
  }

  if (resolved.message_type === "voice") {
    // For now, voice messages are only affected by hide/unhide.
    return true;
  }

  const bubble = existingRow.querySelector(".bubble");
  if (bubble) {
    bubble.innerHTML = formatMessageText(displayText);
    existingRow.classList.add("messageOverrideFlash");
    setTimeout(() => existingRow.classList.remove("messageOverrideFlash"), 700);
    return true;
  }

  return false;
}