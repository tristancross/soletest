// ====== PER-VIEWER NAME ALIASES ======

const SOLE_NAME_ALIASES = [
  {
    viewerUsername: "test",
    realUsername: "test5",
    realName: "Test5",
    aliasName: "David"
  }
];

function escapeAliasRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceNameToken(text, fromName, toName) {
  if (!text || !fromName || !toName || fromName === toName) return text;

  const escaped = escapeAliasRegex(fromName);

  // Avoid replacing inside longer words.
  const regex = new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, "gi");

  return String(text).replace(regex, match => {
    // crude but useful casing preservation
    if (match.toUpperCase() === match) return toName.toUpperCase();
    if (match[0] === match[0]?.toUpperCase()) {
      return toName.charAt(0).toUpperCase() + toName.slice(1);
    }
    return toName.toLowerCase();
  });
}

function getNameAliasForViewer(viewer, target) {
  const viewerUsername = String(viewer?.username || "").toLowerCase();
  const targetUsername = String(target?.username || "").toLowerCase();

  return SOLE_NAME_ALIASES.find(alias =>
    alias.viewerUsername === viewerUsername &&
    alias.realUsername === targetUsername
  ) || null;
}

function displayProfileForViewer(profile, viewer) {
  if (!profile || !viewer) return profile;

  const alias = getNameAliasForViewer(viewer, profile);
  if (!alias) return profile;

  return {
    ...profile,
    display_name: alias.aliasName,
    username: alias.aliasName
  };
}

function renderTextForViewer(text, viewer, otherUser) {
  const alias = getNameAliasForViewer(viewer, otherUser);
  if (!alias) return text;

  return replaceNameToken(text, alias.realName, alias.aliasName);
}

function canonicalizeOutgoingTextForRecipient(text, sender, recipient) {
  const alias = getNameAliasForViewer(sender, recipient);
  if (!alias) return text;

  // Sender may type "David"; store/send as "Test5".
  return replaceNameToken(text, alias.aliasName, alias.realName);
}

window.soleNameAliases = {
  displayProfileForViewer,
  renderTextForViewer,
  canonicalizeOutgoingTextForRecipient
};