// ====== REALTIME ======
let overrideChannel = null;
let userPresenceChannel = null;

let userInsightsChannel = null;
let solematePortraitChannel = null;
let profileScoringChannel = null;
let userTasksChannel = null;

function getActiveSidebarQuizAssignmentId() {
  const sidebarPaneEl = document.querySelector(".sidebarNavPane");
  const activeQuizEl = sidebarPaneEl?.querySelector("[data-assignment-id]");
  return activeQuizEl?.dataset?.assignmentId || null;
}

async function updateSolemateNotificationDots() {
  if (!me?.id) return;

  const [{ data: traitRows, error: traitError }, { data: portraitRows, error: portraitError }] =
    await Promise.all([
      sb
        .from("user_insights")
        .select("id")
        .eq("user_id", me.id)
        .eq("category", "general")
        .eq("status", "revealed")
        .is("viewed_at", null)
        .limit(1),

      sb
        .from("user_solemate_portraits")
        .select("id")
        .eq("user_id", me.id)
        .eq("status", "revealed")
        .is("viewed_at", null)
        .limit(1)
    ]);

  if (traitError) console.warn("Could not check unread SoleMate traits", traitError);
  if (portraitError) console.warn("Could not check unread SoleMate portrait", portraitError);

  const hasUnreadTraits = !!traitRows?.length;
  const hasUnreadPortrait = !!portraitRows?.length;
  const hasAnyUnreadSolemate = hasUnreadTraits || hasUnreadPortrait;

  document
    .querySelector('.soleRailItem[data-sole-rail="solemate"]')
    ?.classList.toggle("hasUnreadInsight", hasAnyUnreadSolemate);

  document
    .querySelector('.moduleSubviewTab[data-module-subview="traits"]')
    ?.classList.toggle("hasUnreadInsight", hasUnreadTraits);

  document
    .querySelector('.moduleSubviewTab[data-module-subview="portrait"]')
    ?.classList.toggle("hasUnreadInsight", hasUnreadPortrait);
}

async function updateSolemateTraitNotificationDot() {
  await updateSolemateNotificationDots();
}
async function updateSolematePortraitNotificationDot() {
  await updateSolemateNotificationDots();
}



async function subscribeSolematePortraitRealtime(userId) {
  if (solematePortraitChannel) {
    await sb.removeChannel(solematePortraitChannel);
    solematePortraitChannel = null;
  }

  solematePortraitChannel = sb
    .channel(`solemate-portrait:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_solemate_portraits",
        filter: `user_id=eq.${userId}`
      },
      async () => {
     await updateSolemateNotificationDots?.();

        const activeRail = document.querySelector(".soleRailItem.isActive")?.dataset?.soleRail;
        const activeSubview = document.querySelector(".moduleSubviewTab.active")?.dataset?.moduleSubview;

        if (
          activeRail === "solemate" &&
          activeSubview === "portrait" &&
          typeof mountSidebarDashboardScreen === "function"
        ) {
          await mountSidebarDashboardScreen("solemate");
      await updateSolemateNotificationDots?.();
        }
      }
    )
    .subscribe(status => {
      // console.log("[solemate portrait realtime]", status);
    });
}
async function subscribeUserInsightsRealtime(userId) {
  if (userInsightsChannel) {
    await sb.removeChannel(userInsightsChannel);
    userInsightsChannel = null;
  }

  userInsightsChannel = sb
    .channel(`user-insights:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_insights",
        filter: `user_id=eq.${userId}`
      },
async payload => {
  const row = payload.new || payload.old;

  if (row?.category && row.category !== "general") return;

  await updateInsightNotificationDots?.();
await updateSolemateNotificationDots?.();

  const activeRail = document.querySelector(".soleRailItem.isActive")?.dataset?.soleRail;
  const activeSubview = document.querySelector(".moduleSubviewTab.active")?.dataset?.moduleSubview;

  if (
    activeRail === "solemate" &&
    activeSubview === "traits" &&
    typeof mountSidebarDashboardScreen === "function"
  ) {
    await mountSidebarDashboardScreen("solemate");
await updateSolemateNotificationDots?.();
  }
}
    )
    .subscribe(status => {
      // console.log("[user_insights realtime]", status);
    });
}

async function subscribeUserTasksRealtime(userId) {
  if (userTasksChannel) {
    await sb.removeChannel(userTasksChannel);
    userTasksChannel = null;
  }

  if (!userId) return;

  userTasksChannel = sb
    .channel(`user-tasks:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_tasks",
        filter: `user_id=eq.${userId}`
      },
      async payload => {
        // console.log("[user_tasks realtime]", payload.eventType, payload.new || payload.old);

await updateSidebarDailyTasks?.();

if (getActiveSidebarQuizAssignmentId()) {
  return;
}

const activeRail = document.querySelector(".soleRailItem.isActive")?.dataset?.soleRail;

        if (
          activeRail &&
          activeRail !== "home" &&
          activeRail !== "settings" &&
          typeof window.dashboardUI?.mountSidebarDashboardScreen === "function"
        ) {
          const screen = activeRail === "connection" ? "chemistry" : activeRail;
          const sidebarPaneEl = document.querySelector(".sidebarNavPane");

          if (sidebarPaneEl && ["chemistry", "attraction", "solemate"].includes(screen)) {
            await window.dashboardUI.mountSidebarDashboardScreen({
              screen,
              sidebarPaneEl,
              mainEl,
              sb,
              me,
              escapeHtml
            });
          }
        }
      }
    )
    .subscribe(status => {
      // console.log("[user_tasks realtime]", status);
    });
}

async function subscribeProfileScoringRealtime(userId) {
  if (profileScoringChannel) {
    await sb.removeChannel(profileScoringChannel);
    profileScoringChannel = null;
  }

  if (!userId) return;

  profileScoringChannel = sb
    .channel(`profile-scoring:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`
      },
      async payload => {
        // console.log("[profile scoring realtime] profile updated", payload.new);

        if (payload?.new) {
          me = {
            ...me,
            ...payload.new
          };

          applyMe?.();
        }

await refreshSidebarProgressFromScoring?.({
  animateFromZero: false
});

await updateSidebarDailyTasks?.();

if (getActiveSidebarQuizAssignmentId()) {
  return;
}

const activeRail = document.querySelector(".soleRailItem.isActive")?.dataset?.soleRail;

        if (
          activeRail &&
          activeRail !== "home" &&
          activeRail !== "settings" &&
          typeof window.dashboardUI?.mountSidebarDashboardScreen === "function"
        ) {
          const screen =
            activeRail === "connection"
              ? "chemistry"
              : activeRail;

          const sidebarPaneEl = document.querySelector(".sidebarNavPane");

          if (sidebarPaneEl && ["chemistry", "attraction", "solemate"].includes(screen)) {
            await window.dashboardUI.mountSidebarDashboardScreen({
              screen,
              sidebarPaneEl,
              mainEl,
              sb,
              me,
              escapeHtml
            });
          }
        }
      }
    )
    .subscribe(status => {
      // console.log("[profile scoring realtime]", status);
    });
}

async function startUserPresence() {
  if (!me?.id) return;

  if (userPresenceChannel) {
    await sb.removeChannel(userPresenceChannel);
    userPresenceChannel = null;
  }

  userPresenceChannel = sb.channel("sole:user-presence", {
    config: {
      presence: {
        key: me.id
      }
    }
  });

  userPresenceChannel
    .on("presence", { event: "sync" }, () => {
      // no-op for normal users; admin panels read presence separately
    })
    .subscribe(async status => {
      if (status !== "SUBSCRIBED") return;

      await userPresenceChannel.track({
        user_id: me.id,
        display_name: me.display_name || me.username || "User",
        is_admin: !!me.is_admin,
        online_at: new Date().toISOString()
      });
    });
}

async function subscribeInboxRealtime() {
  if (inboxChannel) {
    await sb.removeChannel(inboxChannel);
    inboxChannel = null;
  }

  async function handleInboxMessageChange(payload) {
    const m = payload.new;

    if (!m || m.recipient_id !== me.id) return;
    if (shouldHideMessageForViewer(m, me.id)) return;

    const activeThreadOpen =
      !adminMode &&
      them &&
      (
        (m.sender_id === them.id && m.recipient_id === me.id) ||
        (m.sender_id === me.id && m.recipient_id === them.id)
      );

    if (
      activeThreadOpen &&
      m.sender_id === them.id &&
      isCurrentChatActuallyVisible()
    ) {
      await markCurrentThreadReadIfVisible("incoming realtime message");
    } else {
      await renderSidebar(them?.id);
      updateMobileMenuUnreadBadge?.();
    }

    await updateConversationStatus();
    await updateSidebarDailyTasks();
    await updateInsightNotificationDots();
  }

  inboxChannel = sb
    .channel(`inbox:${me.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `recipient_id=eq.${me.id}`
      },
      handleInboxMessageChange
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `recipient_id=eq.${me.id}`
      },
      handleInboxMessageChange
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

function ensureLiveDraftRow(senderId = null, alignAsSenderId = null) {
  const mine = senderId && alignAsSenderId && senderId === alignAsSenderId;
  const sideClass = mine ? "me" : "them";

  if (liveDraftRow && liveDraftBubble) {
    liveDraftRow.className = `row ${sideClass} liveDraft`;
    return;
  }

  const row = document.createElement("div");
  row.className = `row ${sideClass} liveDraft`;

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

function renderLiveDraft(text, senderId = null, alignAsSenderId = null) {
  const safeText = (text || "").replace(/\r\n/g, "\n");

  if (!safeText.trim()) {
    clearLiveDraft();
    return;
  }

ensureLiveDraftRow(senderId, alignAsSenderId);
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

async function refreshCurrentThreadApprovalRequired(aId, bId) {
  currentThreadApprovalRequired = false;

  if (!sb || !me?.id || !aId || !bId) return false;

  const otherId = me.id === aId
    ? bId
    : me.id === bId
      ? aId
      : null;

  if (!otherId) return false;

  const { data, error } = await sb.rpc("is_message_approval_required", {
    p_other_user_id: otherId
  });

  if (error) {
    console.warn("Could not load message approval setting for thread", error);
    return false;
  }

  currentThreadApprovalRequired = data === true;

  console.log("[approval mode]", {
    me: me?.username || me?.id,
    otherId,
    currentThreadApprovalRequired
  });

  return currentThreadApprovalRequired;
}

async function subscribeRealtime(aId, bId, alignAsSenderId, options = {}) {
await refreshCurrentThreadApprovalRequired(aId, bId);

  const adminObserver = !!options.adminObserver;
  const dmChannelName = `dm:${pairKey(aId, bId)}`;

  if (channel) {
    await sb.removeChannel(channel);
    channel = null;
  }

  function isMessageInThread(m = {}) {
    return (
      (m.sender_id === aId && m.recipient_id === bId) ||
      (m.sender_id === bId && m.recipient_id === aId)
    );
  }

  function isBroadcastInThread(payload = {}) {
    return (
      (payload.sender === aId && payload.recipient === bId) ||
      (payload.sender === bId && payload.recipient === aId)
    );
  }

  function isBroadcastIncomingForCurrentUser(payload = {}) {
    return payload.sender === them?.id && payload.recipient === me?.id;
  }

  function getObservedUserName(senderId) {
    if (senderId === me?.id) {
      return me?.display_name || "This user";
    }

    if (senderId === them?.id) {
      return them?.display_name || "Partner";
    }

    if (senderId === aId) {
      return senderId === alignAsSenderId
        ? me?.display_name || "This user"
        : them?.display_name || "Partner";
    }

    if (senderId === bId) {
      return senderId === alignAsSenderId
        ? me?.display_name || "This user"
        : them?.display_name || "Partner";
    }

    return "User";
  }

function broadcastAllowed(payload = {}) {
  // Admin should still see live typing/drafts, even when approval mode is on.
  if (adminObserver) {
    return isBroadcastInThread(payload);
  }

  // Normal chat partner should not see typing/drafts when approval mode is on.
  if (currentThreadApprovalRequired) {
    return false;
  }

  return isBroadcastIncomingForCurrentUser(payload);
}

  async function settleAfterTypingStops() {
    clearTimeout(typingTimeout);
    reactingUntil = 0;
    updateConversationStatus();
    clearLiveDraft();
    hideTypingIndicator();

    if (adminObserver) return;

    if (await latestMessageWasMine()) {
      setResponseStateThinking();
    } else {
      setResponseStateIdle();
    }
  }

  channel = sb
    .channel(dmChannelName, {
      config: {
        broadcast: { self: false }
      }
    })
    .on(
      "postgres_changes",
   {
    event: "INSERT",
    schema: "public",
    table: "messages"
},
      async (payload) => {
        const m = payload.new;

        if (!isMessageInThread(m)) return;
        if (shouldHideMessageForViewer(m, alignAsSenderId)) return;

        const key = `${m.sender_id}|${m.recipient_id}|${m.text}`;
        const t = recentSends.get(key);

        if (t && (Date.now() - t) < RECENT_WINDOW_MS) {
          recentSends.delete(key);
          return;
        }

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
        } else if (!adminObserver && m.sender_id !== me.id) {
          setResponseStateIdle();
          clearTimeout(typingTimeout);
        }

        let promoted = false;

        if (m.sender_id !== alignAsSenderId) {
          promoted = promoteLiveDraftToMessage(m, alignAsSenderId);
        }

        if (!promoted) {
          await renderMessage(m, alignAsSenderId, shouldAnimate);
        }
        if (adminObserver && m.sender_id === alignAsSenderId) {
  textInput.value = "";
  autoResizeTextarea();
  updateSendButton();
}

        if (
          !adminObserver &&
          isCurrentChatActuallyVisible() &&
          them &&
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

        await renderSidebar(them?.id);
        await updateConversationStatus();
        await updateSidebarDailyTasks();
        await updateInsightNotificationDots();
      }
    )
    .on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "messages"
  },
  async payload => {
    const m = payload.new;

    if (!isMessageInThread(m)) return;
    if (shouldHideMessageForViewer(m, alignAsSenderId)) return;

    // Sender already has their optimistic temp message.
    // This prevents duplicate rendering when admin approves it.
    if (m.sender_id === alignAsSenderId) return;

    const existingRow = messagesEl.querySelector(
      `[data-message-id="${CSS.escape(String(m.id || ""))}"]`
    );

    if (!existingRow) {
      await renderMessage(m, alignAsSenderId, false);
      scrollToBottomIfNear();
    }

    await renderSidebar(them?.id);
    await updateConversationStatus();
    await updateSidebarDailyTasks();
    await updateInsightNotificationDots();
  }
)
.on("broadcast", { event: "message_override_changed" }, async ({ payload }) => {
  if (!broadcastAllowed(payload)) return;

  const wasNearBottom =
    messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 120;

  const handled = await applyMessageOverrideToRenderedMessage(
    payload.message_id,
    alignAsSenderId
  );

  // Fallback for unhide or any edge case where the row is missing.
  if (!handled) {
    await loadThread(aId, bId, alignAsSenderId);
  }

  if (wasNearBottom) {
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }
})
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (!broadcastAllowed(payload)) return;

      if (adminObserver) {
        setTypingIndicatorText(`${getObservedUserName(payload.sender)} is typing…`);
      } else {
        setResponseStateReacting();
      }

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
      if (!broadcastAllowed(payload)) return;
      await settleAfterTypingStops();
    })
    .on("broadcast", { event: "draft_update" }, ({ payload }) => {
      if (!broadcastAllowed(payload)) return;

      if (adminObserver) {
        setTypingIndicatorText(`${getObservedUserName(payload.sender)} is typing…`);
      } else {
        setResponseStateReacting();
      }

      reactingUntil = Date.now() + 4000;
      updateConversationStatus();

if (adminObserver && payload.sender === alignAsSenderId) {
  textInput.value = payload.text || "";
  autoResizeTextarea();
  updateSendButton();
} else {
  renderLiveDraft(payload.text || "", payload.sender, alignAsSenderId);
}

clearTimeout(typingTimeout);
typingTimeout = setTimeout(() => {
  reactingUntil = 0;
  updateConversationStatus();
  hideTypingIndicator();

  if (adminObserver && payload.sender === alignAsSenderId) {
    textInput.value = "";
    autoResizeTextarea();
    updateSendButton();
  } else {
    clearLiveDraft();
  }
}, 4000);
    })
.on("broadcast", { event: "draft_clear" }, async ({ payload }) => {
  if (!broadcastAllowed(payload)) return;

  if (adminObserver && payload.sender === alignAsSenderId) {
    textInput.value = "";
    autoResizeTextarea();
    updateSendButton();
    hideTypingIndicator();
    reactingUntil = 0;
    updateConversationStatus();
    return;
  }

  await settleAfterTypingStops();
})
    .subscribe();
}


async function subscribeMessageOverrideRealtime(aId, bId, alignAsSenderId) {
  if (overrideChannel) {
    await sb.removeChannel(overrideChannel);
    overrideChannel = null;
  }

  overrideChannel = sb
    .channel(`message-overrides:${pairKey(aId, bId)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_overrides" },
      async payload => {
        const override = payload.new || payload.old;
        if (!override?.message_id) return;

        const { data: message, error } = await sb
          .from("messages")
          .select("id, sender_id, recipient_id")
          .eq("id", override.message_id)
          .maybeSingle();

        if (error || !message) return;

        const inThread =
          (message.sender_id === aId && message.recipient_id === bId) ||
          (message.sender_id === bId && message.recipient_id === aId);

        if (!inThread) return;

        const handled = await applyMessageOverrideToRenderedMessage(
          override.message_id,
          alignAsSenderId
        );

        // Only rebuild if the row is missing, e.g. unhide.
        if (!handled) {
          await loadThread(aId, bId, alignAsSenderId);
        }
      }
    )
    .subscribe(status => {
      // console.log("[message_overrides realtime]", status);
    });
}

textInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateSendButton();

  if (!channel || !them || adminMode) return;

  // If this pair is in admin-approval mode, do not leak typing or draft previews.
  // The sender can type normally, but the partner/admin live draft will not receive anything.
  if (currentThreadApprovalRequired) {
    return;
  }

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
  if (lastDraftTextSent !== "") {
    lastDraftTextSent = "";
    lastDraftSentAt = 0;

    channel.send({
      type: "broadcast",
      event: "draft_clear",
      payload: {
        sender: me.id,
        recipient: them.id
      }
    });
  }

  return;
}

const textChanged = rawText !== lastDraftTextSent;
const enoughTimePassed = now - lastDraftSentAt > 90;

if (!textChanged || !enoughTimePassed) return;

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
