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

await startUserPresence();
await subscribeSolematePortraitRealtime(me.id);
await subscribeUserInsightsRealtime(me.id);
await subscribeUserTasksRealtime(me.id);
if (typeof subscribeProfileScoringRealtime === "function") {
  await subscribeProfileScoringRealtime(me.id);
} else {
  console.warn("subscribeProfileScoringRealtime is not loaded");
}
await updateSolematePortraitNotificationDot?.();
await updateSolemateTraitNotificationDot?.();

setupSidebarDashboardScreens();
initAccountTray();

try {
  await window.soleDayConfigs?.loadExperimentDayConfigs?.(sb, {
    force: true
  });

  await window.soleDayConfigs?.loadExperimentSettings?.(sb, {
    force: true
  });
} catch (error) {
  console.warn("Could not preload experiment day settings", error);
}

await refreshSidebarProgressFromScoring({
  animateFromZero: true
});


await refreshBlockedPairs();

assignedPartner = await getAssignedPartner(me.id);

setupAdminUI();

if (me.is_admin) {
  await renderSidebar();
  await updateSidebarDailyTasks();
  await updateInsightNotificationDots();

  await enterAdminMode("users");
} else {
  const handledFirstTimeUser = await window.firstTimeUser?.runIfNeeded?.();

  if (handledFirstTimeUser) {
    return;
  }

  await renderSidebar();
  await updateSidebarDailyTasks();
  await updateInsightNotificationDots();

  if (typeof setChatFocusMode === "function") {
    setChatFocusMode(true);
  } else {
    document.body.classList.add("isChatFocus");
  }

  if (assignedPartner && !blockedPairs.has(pairKey(me.id, assignedPartner.id))) {
    await openChat(assignedPartner);
  } else {
    await renderWelcomePanel();
  }
}

  await subscribeInboxRealtime();
  autoResizeTextarea();
  updateSendButton();
  updateNoChatState();
}
