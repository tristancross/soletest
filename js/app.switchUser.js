// ====== SWITCH USER ======
if (switchUserBtn) {
  switchUserBtn.onclick = async () => {
    await sb.auth.signOut();
    location.reload();
  };
}
