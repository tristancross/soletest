// ====== ADMIN BLOCK ======
function pairKey(aId, bId){
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

async function refreshBlockedPairs(){
  const { data, error } = await sb.from("blocked_threads").select("user_a,user_b");
  if (error) { console.warn(error); return; }
  blockedPairs = new Set(data.map(r => pairKey(r.user_a, r.user_b)));
}

async function getAssignedPartner(userId) {
  const { data, error } = await sb
    .from("user_pairings")
    .select("user_a,user_b")
    .eq("is_active", true)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.warn("getAssignedPartner failed", error);
    return null;
  }

  if (!data) return null;

  const partnerId = data.user_a === userId ? data.user_b : data.user_a;

  const tableName = me?.is_admin ? "profiles" : "paired_profile_public";
  const columns = me?.is_admin
    ? "*"
    : "id, display_name, username";

  const { data: partner, error: partnerError } = await sb
    .from(tableName)
    .select(columns)
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerError) {
    console.warn("Could not load assigned partner", partnerError);
    return null;
  }

  return partner || null;
}

async function createUserPairing(userA, userB) {
  if (!userA || !userB || userA === userB) {
    alert("Pick two different users.");
    return;
  }

  const { error: deactivateError } = await sb
    .from("user_pairings")
    .update({ is_active: false })
    .eq("is_active", true)
    .or(`user_a.eq.${userA},user_b.eq.${userA},user_a.eq.${userB},user_b.eq.${userB}`);

  if (deactivateError) {
    alert(deactivateError.message);
    return;
  }

  const { error } = await sb
    .from("user_pairings")
    .insert({
      user_a: userA,
      user_b: userB,
      created_by: me.id,
      is_active: true
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Pair created.");
}

async function clearUserPairing(userA, userB) {
  if (!userA || !userB || userA === userB) {
    alert("Pick two different users.");
    return;
  }

  const { error } = await sb
    .from("user_pairings")
    .update({ is_active: false })
    .eq("is_active", true)
    .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Pair cleared.");
}

const adminBlockBtn = document.getElementById("adminBlockBtn");
const adminUnblockBtn = document.getElementById("adminUnblockBtn");
const pairUserA = document.getElementById("pairUserA");
const pairUserB = document.getElementById("pairUserB");
const createPairBtn = document.getElementById("createPairBtn");
const clearPairBtn = document.getElementById("clearPairBtn");

adminBlockBtn.onclick = async () => {
  const a = adminA.value, b = adminB.value;
  if (!a || !b || a === b) return alert("Pick two different users.");

  const { error } = await sb.from("blocked_threads").insert({
    user_a: a,
    user_b: b,
    created_by: me.id
  });
  if (error) return alert(error.message);

  await refreshBlockedPairs();
  await renderSidebar(them?.id);
  alert("Blocked.");
};

adminUnblockBtn.onclick = async () => {
  const a = adminA.value, b = adminB.value;
  if (!a || !b || a === b) return alert("Pick two different users.");

  const { error } = await sb
    .from("blocked_threads")
    .delete()
    .eq("user_a", a).eq("user_b", b);

  // if you inserted as (b,a) previously, also try the reverse:
  if (error) {
    const { error: error2 } = await sb
      .from("blocked_threads")
      .delete()
      .eq("user_a", b).eq("user_b", a);
    if (error2) return alert(error2.message);
  }

  await refreshBlockedPairs();
  await renderSidebar(them?.id);
  alert("Unblocked.");
};

createPairBtn.onclick = async () => {
  await createUserPairing(pairUserA.value, pairUserB.value);
};

clearPairBtn.onclick = async () => {
  await clearUserPairing(pairUserA.value, pairUserB.value);
};
