// ====== SOLE SPLASH ======

function hideSoleSplash() {
  const splash = document.getElementById("soleSplash");
  if (!splash) return;

  document.body.classList.remove("isSplashing");
  splash.classList.add("isLeaving");

  window.setTimeout(() => {
    splash.remove();
  }, 1000);
}

function startSoleSplash() {
  const splash = document.getElementById("soleSplash");
  if (!splash) return;

  const minSplashMs = 1600;

  window.setTimeout(() => {
    hideSoleSplash();
  }, minSplashMs);
}

window.soleSplash = {
  start: startSoleSplash,
  hide: hideSoleSplash
};