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

stopPartnerFactRotation();

  reactingUntil = 0;
  lastStatusText = "";
  ambientState = "";

  viewA = null;
  viewB = null;

messagesEl.innerHTML = `
  <div class="messagesLoadingState" role="status" aria-live="polite">
    <span class="messagesLoadingSpinner" aria-hidden="true"></span>
    <span>Loading conversation</span>
  </div>
`;

clearChatSubtitleStatus();

them = nextProfile;

chatTitle.textContent =
  them.display_name ||
  them.username ||
  "Conversational Model";

chatMetaInner?.classList?.add("is-active");

startChatVersionUpdates();

await loadThread(me.id, nextProfile.id, me.id);

await startPartnerFactRotation(them.id);
await markThreadAsRead(me.id, them.id);
await renderSidebar(them.id);
await subscribeRealtime(me.id, them.id, me.id);
await subscribeMessageOverrideRealtime(me.id, them.id, me.id);

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

function initMobileNavigation() {
  const menuToggle = document.getElementById("mobileMenuToggle");
  const scrim = document.getElementById("mobileRailScrim");
  const dockButtons = document.querySelectorAll(".mobileDockBtn");

  function openMenu() {
    document.body.classList.add("mobileMenuOpen");
    menuToggle?.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    document.body.classList.remove("mobileMenuOpen");
    menuToggle?.setAttribute("aria-expanded", "false");
  }

  menuToggle?.addEventListener("click", () => {
    if (document.body.classList.contains("mobileMenuOpen")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  scrim?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll(".soleRailNav a, .soleRailNav button, .rail a, .rail button").forEach((item) => {
    item.addEventListener("click", closeMenu);
  });

  dockButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.id === "mobileMenuToggle") return;

      dockButtons.forEach((btn) => btn.classList.remove("isActive"));
      button.classList.add("isActive");

      const destination = button.dataset.mobileGo;

      if (destination === "home") {
        document.body.classList.remove("mobileViewMessages");
        document.body.classList.add("mobileViewHome");

        document.querySelector('[data-screen="home"]')?.click();
        document.querySelector('[data-nav="home"]')?.click();
      }

      if (destination === "messages") {
        document.body.classList.remove("mobileViewHome");
        document.body.classList.add("mobileViewMessages");

        document.querySelector('[data-screen="chat"]')?.click();
        document.querySelector('[data-nav="chat"]')?.click();
        document.querySelector('[data-screen="messages"]')?.click();
        document.querySelector('[data-nav="messages"]')?.click();
      }

      closeMenu();
    });
  });
}

document.addEventListener("DOMContentLoaded", initMobileNavigation);