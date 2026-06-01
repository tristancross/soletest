// ====== INIT CHAT ======
async function initChat() {
syncAppHeightToViewport();

window.addEventListener("resize", syncAppHeightToViewport);
// window.addEventListener("resize", fitAllProgressDialValues);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncAppHeightToViewport);
  window.visualViewport.addEventListener("scroll", syncAppHeightToViewport);
}

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
  setupSidebarDashboardScreens();
  initAccountTray();
updateSidebarProgress({
  chemistry: 40,
  attraction: 12,
  candidates: 98341,
  animateFromZero: true
});


await refreshBlockedPairs();
await renderSidebar();
setupAdminUI();

assignedPartner = await getAssignedPartner(me.id);

await updateSidebarDailyTasks();
await updateInsightNotificationDots();

if (me.is_admin) {
  await enterAdminMode("users");
} else if (assignedPartner && !blockedPairs.has(pairKey(me.id, assignedPartner.id))) {
  await openChat(assignedPartner);
} else {
  await renderWelcomePanel();
}

  await subscribeInboxRealtime();
  autoResizeTextarea();
  updateSendButton();
  updateNoChatState();
}
