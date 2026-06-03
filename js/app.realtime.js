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
await updateSidebarDailyTasks();
await updateInsightNotificationDots();
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
  messagesEl.insertBefore(row, responseNeuralRow || typingIndicator.nextSibling);
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
 }, appMode === "preview" || appMode === "admin"
  ? ADMIN_LIVE_DRAFT_CLEAR_MS
  : LIVE_DRAFT_CLEAR_MS
);
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

if (appMode === "preview") {
  if (m.sender_id === alignAsSenderId) {
    setResponseStateListening();

    setTimeout(() => {
      if (appMode === "preview") {
        setResponseStateThinking();
      }
    }, RESPONSE_LISTENING_DELAY_MS);
  } else {
    setResponseStateIdle();
  }

  clearTimeout(typingTimeout);
} else if (m.sender_id !== me.id) {
  setResponseStateIdle();
  clearTimeout(typingTimeout);
}

let promoted = false;

if (m.sender_id !== me.id) {
  promoted = promoteLiveDraftToMessage(m, alignAsSenderId);
}

if (!promoted) {
  await renderMessage(m, alignAsSenderId, shouldAnimate);
}



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
await updateSidebarDailyTasks();
await updateInsightNotificationDots();
  }
)
.on("broadcast", { event: "typing" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

setResponseStateReacting();

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

hideTypingIndicator();

    requestAnimationFrame(() => {
      scrollToBottomIfNear();
    });
  }, 4000);
})
.on("broadcast", { event: "stop_typing" }, async ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  clearTimeout(typingTimeout);
  reactingUntil = 0;
  updateConversationStatus();

  clearLiveDraft();

  if (await latestMessageWasMine()) {
    setResponseStateThinking();
  } else {
    setResponseStateIdle();
  }
})
.on("broadcast", { event: "draft_update" }, ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

setResponseStateReacting();

  reactingUntil = Date.now() + 4000;
  updateConversationStatus();

  renderLiveDraft(payload.text || "");

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    reactingUntil = 0;
    updateConversationStatus();
   hideTypingIndicator();
    clearLiveDraft();
  }, 4000);
})
.on("broadcast", { event: "draft_clear" }, async ({ payload }) => {
  if (payload.sender !== them?.id) return;
  if (payload.recipient !== me.id) return;

  clearTimeout(typingTimeout);
  reactingUntil = 0;
  updateConversationStatus();

  clearLiveDraft();

  if (await latestMessageWasMine()) {
    setResponseStateThinking();
  } else {
    setResponseStateIdle();
  }
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
