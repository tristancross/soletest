// ====== NORMAL CHAT ======
async function openChat(profile){
 setResponseStateIdle();
  if (
  assignedPartner &&
  !me.is_admin &&
  profile.id !== assignedPartner.id
) {
  alert("This model is not currently assigned to you.");
  return;
}
  broadcastDraftClearForCurrentThread();
  clearLiveDraft();
  lastDraftTextSent = "";
  lastDraftSentAt = 0;

  adminDashboardProfile = null;

hideTypingIndicator();

  const nextProfile = profile;

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

  viewA = null;
  viewB = null;

  messagesEl.innerHTML = `
    <div class="messagesLoadingState">
      Loading conversation...
    </div>
  `;

clearChatSubtitleStatus();

them = nextProfile;

await loadThread(me.id, nextProfile.id, me.id);

chatTitle.textContent = them.display_name;
chatSubtitle.textContent = "Running life experience training cycle";

await markThreadAsRead(me.id, them.id);
await renderSidebar(them.id);
await subscribeRealtime(me.id, them.id, me.id);

  startAmbientStateRotation();
  startSubtitleStateLoop();
  updateConversationStatus();

  textInput.disabled = false;
  autoResizeTextarea();
  updateSendButton();
  updateNoChatState();
  closeMobileSidebar();

  scrollToBottom();
}
