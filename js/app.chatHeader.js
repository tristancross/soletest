async function loadPartnerFacts(userId) {
  if (!userId) return [];

  const { data, error } = await sb
    .from("user_chat_facts")
    .select("fact_text")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Could not load partner facts", error);
    return [];
  }

  return (data || [])
    .map(row => String(row.fact_text || "").trim())
    .filter(Boolean);
}

function setChatSubtitleFact(text) {
  chatSubtitle.classList.add("statusChanging");

  setTimeout(() => {
    chatSubtitle.textContent = text || "";
    chatSubtitle.classList.remove("statusChanging");
  }, 160);
}

function stopPartnerFactRotation() {
  if (partnerFactTimer) {
    clearTimeout(partnerFactTimer);
    partnerFactTimer = null;
  }

  partnerFacts = [];
  partnerFactIndex = 0;
}

async function startPartnerFactRotation(userId) {
  stopPartnerFactRotation();

  partnerFacts = await loadPartnerFacts(userId);

  if (!partnerFacts.length) {
    setChatSubtitleFact("Conversational profile still forming");
    return;
  }

  partnerFactIndex = 0;
  setChatSubtitleFact(partnerFacts[partnerFactIndex]);

function scheduleNextFact() {
  const nextDelay = 10000 + Math.random() * 30000; // 30–60 seconds

  partnerFactTimer = window.setTimeout(() => {
    if (!partnerFacts.length) return;

    let nextIndex = Math.floor(Math.random() * partnerFacts.length);

    if (partnerFacts.length > 1) {
      while (nextIndex === partnerFactIndex) {
        nextIndex = Math.floor(Math.random() * partnerFacts.length);
      }
    }

    partnerFactIndex = nextIndex;
    setChatSubtitleFact(partnerFacts[partnerFactIndex]);

    scheduleNextFact();
  }, nextDelay);
}

  if (partnerFacts.length > 1) {
    scheduleNextFact();
  }
}

function getRandomChatVersionThreshold() {
  return 2 + Math.floor(Math.random() * 9); // 2-10
}

function getChatVersionMessageWeight(text = "") {
  const chars = String(text || "").trim().length;

  if (chars >= 1200) return 8;
  if (chars >= 700) return 6;
  if (chars >= 280) return 4;

  return 1;
}

function syncChatModelVersionFromProfile(profile = me) {
  if (!profile) return;

  chatModelVersionNumber = Number(profile.chat_model_version || 1.03);
  chatModelMessagesSinceBump = Number(profile.chat_model_messages_since_bump || 0);
  chatModelMessagesUntilBump = Number(profile.chat_model_messages_until_bump || 3);

  if (!chatModelMessagesUntilBump || chatModelMessagesUntilBump < 2) {
    chatModelMessagesUntilBump = getRandomChatVersionThreshold();
  }

  if (chatModelVersion) {
    chatModelVersion.textContent = chatModelVersionNumber.toFixed(2);
  }
}

function startChatVersionUpdates() {
  syncChatModelVersionFromProfile(me);
}

function flashChatModelVersion() {
  if (!chatModelVersion) return;

  chatModelVersion.classList.add("isUpdating");
  chatModelVersion.textContent = chatModelVersionNumber.toFixed(2);

  window.setTimeout(() => {
    chatModelVersion.classList.remove("isUpdating");
  }, 700);
}

async function maybeAdvanceChatModelVersionAfterUserMessage() {
  if (!me?.id || me.is_admin) return;

  const currentVersion = Number(me.chat_model_version || chatModelVersionNumber || 1.03);
  const currentSince = Number(me.chat_model_messages_since_bump || chatModelMessagesSinceBump || 0);
  const currentThreshold = Number(
    me.chat_model_messages_until_bump ||
    chatModelMessagesUntilBump ||
    getRandomChatVersionThreshold()
  );

  let nextVersion = currentVersion;
const messageWeight = getChatVersionMessageWeight(window.lastSentTextForVersion || "");
let nextSince = currentSince + messageWeight;
  let nextThreshold = currentThreshold;
  let didBump = false;

  if (nextSince >= currentThreshold) {
    const bump = Math.random() > 0.72 ? 0.02 : 0.01;

    nextVersion = Number((currentVersion + bump).toFixed(2));
    nextSince = 0;
    nextThreshold = getRandomChatVersionThreshold();
    didBump = true;
  }

  const payload = {
    chat_model_version: nextVersion,
    chat_model_messages_since_bump: nextSince,
    chat_model_messages_until_bump: nextThreshold
  };

  const { data, error } = await sb
    .from("profiles")
    .update(payload)
    .eq("id", me.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("Could not update chat model version", error);
    return;
  }

  if (data) {
    me = {
      ...me,
      ...data
    };

    applyMe?.();
    syncChatModelVersionFromProfile(me);
  } else {
    me = {
      ...me,
      ...payload
    };

    syncChatModelVersionFromProfile(me);
  }

  if (didBump) {
    flashChatModelVersion();
  }
}