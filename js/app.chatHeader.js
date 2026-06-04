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
    clearInterval(partnerFactTimer);
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

  partnerFactTimer = setInterval(() => {
    if (!partnerFacts.length) return;

    partnerFactIndex = (partnerFactIndex + 1) % partnerFacts.length;
    setChatSubtitleFact(partnerFacts[partnerFactIndex]);
  }, 6500);
}

function stopChatVersionUpdates() {
  if (chatVersionTimer) {
    clearInterval(chatVersionTimer);
    chatVersionTimer = null;
  }
}

function startChatVersionUpdates() {
  stopChatVersionUpdates();

  if (!chatModelVersion) return;

  chatModelVersion.textContent = chatModelVersionNumber.toFixed(2);

  chatVersionTimer = setInterval(() => {
    const bump = Math.random() > 0.72 ? 0.02 : 0.01;
    chatModelVersionNumber += bump;

    chatModelVersion.classList.add("isUpdating");
    chatModelVersion.textContent = chatModelVersionNumber.toFixed(2);

    setTimeout(() => {
      chatModelVersion.classList.remove("isUpdating");
    }, 700);
  }, 18000 + Math.random() * 26000);
}