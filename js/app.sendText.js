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
  if (
  assignedPartner &&
  !me.is_admin &&
  them.id !== assignedPartner.id
) {
  alert("This thread is not currently assigned to you.");
  return;
}
  if (blockedPairs.has(pairKey(me.id, them.id))){
    alert("This thread has been disabled by an admin.");
    return;
  }

  const text = textInput.value.trim();
if (!text) return;

if (containsBlockedLink(text)) {
  showSoleNotice(
   "For privacy and safety, links canâ€™t be sent in chat. External links can distort Soleâ€™s compatibility analysis.",
    {
      title: "Link removed from signal",
      type: "warning"
    }
  );

  return;
}

if (text.length > 4000){
  alert("Messages must be under 4,000 characters.");
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
 setResponseStateListening();

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
  if (typeof refreshSidebarProgressFromScoring === "function") {
    await refreshSidebarProgressFromScoring({
      animateFromZero: false
    });
  }

  try {
    await updateConversationStatus();
  } catch (statusError) {
    console.warn("Could not update conversation status after send", statusError);
  }

  await updateSidebarDailyTasks?.();

  window.firstTimeUser?.maybeShowPostSendOverlay?.();
}
}


sendBtn.onclick = sendText;
textInput.addEventListener("keydown", (e) => {
  // On touch devices: Enter should make a newline
  if (isMobile) return;

  // On desktop: Enter sends, Shift+Enter makes a newline
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendText();
  }
});
