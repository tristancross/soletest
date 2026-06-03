// ====== SIDEBAR ======
async function renderSidebar(activeId){
  const { data: profiles, error } = await sb.from("profiles").select("*").order("display_name");
  const unreadCounts = await getUnreadCounts();
  if (error) return alert(error.message);

  let totalUnread = 0;
  for (const count of unreadCounts.values()) {
    totalUnread += count;
  }
  updateDocumentTitle(totalUnread);
  await updateMobileMenuUnreadBadge();

  userList.innerHTML = "";

  // In normal mode we list non-admin profiles (excluding self).
profiles
  .filter(p => p.id !== me.id && !p.is_admin)
  .filter(p => {
    if (me.is_admin) return true;
    if (!assignedPartner) return true; // testing fallback
    return p.id === assignedPartner.id;
  })
  .filter(p => !blockedPairs.has(pairKey(me.id, p.id)))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "user" + (p.id === activeId ? " active" : "");
div.innerHTML = `
  <div class="userName">${escapeHtml(p.display_name)}</div>
  ${unreadCounts.get(p.id)
    ? `<div class="unreadBadge">${unreadCounts.get(p.id)}</div>`
    : ``}
`;
div.onclick = () => {
  adminMode = false;
  adminControls.hidden = true;
  textInput.disabled = false;
  updateSendButton();
  openChat(p);
};
      userList.appendChild(div);
    });
}
