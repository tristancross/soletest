// ====== LAUNCH GATE ======
const SOLE_DEFAULT_UNLOCK_AT = "2026-06-13T09:00:00-04:00";

let soleLaunchGateTimer = null;

function getSoleLaunchUnlockDate(profile) {
  const raw = profile?.launch_unlock_at || SOLE_DEFAULT_UNLOCK_AT;
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return new Date(SOLE_DEFAULT_UNLOCK_AT);
  }

  return date;
}

function isSoleLaunchGateActive(profile) {
  if (!profile || profile.is_admin) return false;
  if (profile.launch_block_enabled !== true) return false;

  const unlockAt = getSoleLaunchUnlockDate(profile);
  return Date.now() < unlockAt.getTime();
}

function formatLaunchCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderSoleLaunchGate(profile) {
  const unlockAt = getSoleLaunchUnlockDate(profile);

  clearInterval(soleLaunchGateTimer);

  document.body.classList.remove("isCheckingFirstTimeUser");
  document.body.classList.add("isLaunchGated");

  authScreen.style.display = "none";
  hideSoleAppLoader?.();

  const existing = document.getElementById("soleLaunchGate");
  if (existing) existing.remove();

  const mount = document.createElement("div");
  mount.id = "soleLaunchGate";
  mount.className = "soleLaunchGate";

  mount.innerHTML = `
    <div class="soleLaunchGateCard">
      <div class="soleLaunchGateBrand">
        <span class="soleBrandLetter">Sole</span>
        <span class="soleLogoIcon soleLogoSignal" aria-hidden="true">
          <span class="soleLogoSignalRing ringCandidates"></span>
          <span class="soleLogoSignalRing ringConfidence"></span>
          <span class="soleLogoSignalRing ringConnection"></span>
          <span class="soleLogoSignalRing ringAttraction"></span>
        </span>
      </div>

      <div class="soleLaunchGateEyebrow">Experiment access pending</div>

      <h1>Everything unlocks at<br>June 13, 2026, 9:00am</h1>

      <p>
        Sole is calibrating the live environment. Your account is ready, but the experiment
        will become available at 9:00am EDT.
      </p>

      <div class="soleLaunchCountdown" id="soleLaunchCountdown">--:--:--</div>

      <div class="soleLaunchGateFooter">
        New York time · opens automatically
      </div>
    </div>
  `;

  document.body.appendChild(mount);

function tick() {
  const remaining = unlockAt.getTime() - Date.now();
  const countdownEl = document.getElementById("soleLaunchCountdown");

  if (remaining <= 0) {
    clearInterval(soleLaunchGateTimer);
    soleLaunchGateTimer = null;

    if (countdownEl) {
      countdownEl.textContent = "Opening...";
    }

    const footerEl = mount.querySelector(".soleLaunchGateFooter");
    if (footerEl) {
      footerEl.textContent = "Access unlocked · opening Sole";
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 800);

    return;
  }

  if (countdownEl) {
    countdownEl.textContent = formatLaunchCountdown(remaining);
  }
}

  tick();
  soleLaunchGateTimer = setInterval(tick, 1000);
}

async function setUserLaunchGate({ sb, userId, enabled, unlockAt = SOLE_DEFAULT_UNLOCK_AT }) {
  if (!sb || !userId) throw new Error("Missing Supabase client or user id.");

  const payload = {
    launch_block_enabled: !!enabled,
    launch_unlock_at: enabled ? unlockAt : null,
    launch_block_updated_at: new Date().toISOString(),
    launch_block_updated_by: me?.id || null
  };

  const { data, error } = await sb
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, launch_block_enabled, launch_unlock_at, launch_block_updated_at, launch_block_updated_by")
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("No profile was updated. This is probably an RLS update policy issue on profiles.");
  }

  return data;
}

window.soleLaunchGate = {
  SOLE_DEFAULT_UNLOCK_AT,
  getSoleLaunchUnlockDate,
  isSoleLaunchGateActive,
  renderSoleLaunchGate,
  setUserLaunchGate
};