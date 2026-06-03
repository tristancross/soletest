async function loadManifestImageForUser(sb, userId) {
  if (!sb || !userId) return null;

  const { data, error } = await sb
    .from("user_manifest_images")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("loadManifestImageForUser failed", error);
    return null;
  }

  return data || null;
}

async function createManifestSignedUrl(sb, row, expiresIn = 60 * 10) {
  if (!sb || !row?.image_path) return null;

  const bucket = row.image_bucket || "manifest-images";

  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(row.image_path, expiresIn);

  if (error) {
    console.warn("createManifestSignedUrl failed", error);
    return null;
  }

  return data?.signedUrl || null;
}

async function deleteManifestImage(sb, userId) {
  if (!sb || !userId) throw new Error("Missing user id.");

  const { data: existingRow, error: existingError } = await sb
    .from("user_manifest_images")
    .select("image_path, image_bucket")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingRow?.image_path) {
    const { error: removeError } = await sb.storage
      .from(existingRow.image_bucket || "manifest-images")
      .remove([existingRow.image_path]);

    if (removeError) {
      console.warn("Could not remove manifest image file", removeError);
    }
  }

  const { error: deleteError } = await sb
    .from("user_manifest_images")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;
}

async function uploadManifestImage({ sb, userId, file }) {
  if (!sb || !userId || !file) throw new Error("Missing upload data.");

  if (!file.type?.startsWith("image/")) {
    throw new Error("Manifest image must be an image file.");
  }

  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Manifest image must be 10 MB or smaller.");
  }

  const { data: existingRow, error: existingError } = await sb
    .from("user_manifest_images")
    .select("image_path, image_bucket")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  const safeName = String(file.name || "manifest")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-120);

  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await sb.storage
    .from("manifest-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: savedRow, error: upsertError } = await sb
    .from("user_manifest_images")
    .upsert(
      {
        user_id: userId,
        image_path: path,
        image_bucket: "manifest-images",
        is_enabled: true,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (upsertError) throw upsertError;

  const oldPath = existingRow?.image_path;
  const oldBucket = existingRow?.image_bucket || "manifest-images";

  if (oldPath && oldPath !== path) {
    const { error: removeError } = await sb.storage
      .from(oldBucket)
      .remove([oldPath]);

    if (removeError) {
      console.warn("Could not remove old manifest image", removeError);
    }
  }

  return savedRow;
}
async function setManifestImageEnabled(sb, userId, isEnabled) {
  const { error } = await sb
    .from("user_manifest_images")
    .update({
      is_enabled: !!isEnabled,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (error) throw error;
}

async function loadManifestImagesForUsers(sb) {
  const { data, error } = await sb
    .from("user_manifest_images")
    .select("*");

  if (error) {
    console.warn("loadManifestImagesForUsers failed", error);
    return [];
  }

  return data || [];
}

function getManifestEffectProfile() {
  return {
    blur: 8 + Math.random() * 18,           
    jitter: 8 + Math.random() * 24,       
    ghostOpacity: 0.08 + Math.random() * 0.28,
    scale: 1.01 + Math.random() * 0.08,
    overlayOpacity: 0.05 + Math.random() * 0.2
  };
}

function getManifestRenderVariant(profile) {
  const rand = amount => (Math.random() * 2 - 1) * amount;

  return {
    blur: profile.blur,
    tx: rand(profile.jitter),
    ty: rand(profile.jitter * 0.8),
    rotate: rand(profile.jitter * 0.18),
    ghostTx: rand(profile.jitter * 1.6),
    ghostTy: rand(profile.jitter * 1.25),
    ghostOpacity: profile.ghostOpacity,
    scale: profile.scale,
    overlayOpacity: profile.overlayOpacity || 0
  };
}

async function renderManifestPanel({ sb, me, escapeHtml, escapeAttr }) {
  const row = await loadManifestImageForUser(sb, me?.id);
if (!row) return "";

  const signedUrl = await createManifestSignedUrl(sb, row);
  if (!signedUrl) return "";

const warpEnabled = row.is_enabled !== false;

const profile = warpEnabled
  ? getManifestEffectProfile(me)
  : { blur: 0, jitter: 0, ghostOpacity: 0, scale: 1 };

const variant = warpEnabled
  ? getManifestRenderVariant(profile)
  : {
      blur: 0,
      tx: 0,
      ty: 0,
      rotate: 0,
      ghostTx: 0,
      ghostTy: 0,
      ghostOpacity: 0,
      scale: 1
    };

  return `
    <section class="manifestPanel" aria-label="Manifestation technology">
      <div class="quizPanelHeader">
        <div class="dashboardEyebrow">Manifestation Technology</div>
        <h3>Visual Compatibility Reconstruction</h3>
        <p class="quizIntro">
          The model is refining your latent attraction profile. Visual match fidelity will increase as additional behavioural signals are processed.
        </p>
      </div>

<div
  class="manifestImageWrap${warpEnabled ? " isWarped" : ""}"
  style="
    --manifest-blur:${variant.blur}px;
    --manifest-tx:${variant.tx}px;
    --manifest-ty:${variant.ty}px;
    --manifest-rotate:${variant.rotate}deg;
    --manifest-ghost-tx:${variant.ghostTx}px;
    --manifest-ghost-ty:${variant.ghostTy}px;
    --manifest-ghost-opacity:${variant.ghostOpacity};
    --manifest-scale:${variant.scale};
    --manifest-overlay-opacity:${variant.overlayOpacity || 0};
  "
>
        <img
          class="manifestImage manifestImageBase"
          src="${escapeAttr(signedUrl)}"
          alt="Manifestation result"
          draggable="false"
        />
        <img
          class="manifestImage manifestImageGhost"
          src="${escapeAttr(signedUrl)}"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <div class="manifestNoise" aria-hidden="true"></div>
      </div>

      <div class="quizCompleteHint">
        Reconstruction in progress. Additional interaction may improve visual convergence.
      </div>
    </section>
  `;
}

async function renderAdminManifestManager({ sb, profiles, escapeHtml, escapeAttr }) {
  const manifestRows = await loadManifestImagesForUsers(sb);
  const manifestByUserId = Object.fromEntries(
    manifestRows.map(row => [row.user_id, row])
  );

  const rowsHtml = await Promise.all(
    profiles.map(async profile => {
      const manifest = manifestByUserId[profile.id] || null;
      const previewUrl = manifest ? await createManifestSignedUrl(sb, manifest) : null;

      return `
        <article class="adminManifestRow">
          <div class="adminManifestMeta">
            <div class="adminManifestName">${escapeHtml(profile.display_name || "Unnamed user")}</div>
            <div class="adminManifestStatus">
              ${
                manifest
    ? (manifest.is_enabled === false ? "Image uploaded Â· warp off" : "Image uploaded Â· warp on")
  : "No image uploaded"
              }
            </div>
          </div>

          <div class="adminManifestPreviewWrap">
            ${
              previewUrl
                ? `<img class="adminManifestPreview" src="${escapeAttr(previewUrl)}" alt="${escapeAttr(profile.display_name || "")}" />`
                : `<div class="adminManifestPreview adminManifestPreviewPlaceholder">No image</div>`
            }
          </div>

          <div class="adminManifestControls">
            <input
              type="file"
              accept="image/*"
              data-manifest-file-input="${escapeAttr(profile.id)}"
            />

            <div class="adminManifestButtons">
              <button
                type="button"
                class="btn btnGhost"
                data-manifest-upload="${escapeAttr(profile.id)}"
              >
                Upload image
              </button>

              ${
                manifest
                  ? `
                    <button
                      type="button"
                      class="btn btnGhost"
                      data-manifest-toggle="${escapeAttr(profile.id)}"
                      data-manifest-enabled="${manifest.is_enabled === false ? "false" : "true"}"
                    >
                    ${manifest.is_enabled === false ? "Enable warp" : "Disable warp"}
                    </button>
                  `
                  : ""
              }
              ${
  manifest
    ? `
      <button
        type="button"
        class="btn btnGhost"
        data-manifest-delete="${escapeAttr(profile.id)}"
      >
        Delete
      </button>
    `
    : ""
}
            </div>
          </div>
        </article>
      `;
    })
  );

  return `
    <section class="dashboardPanel" aria-label="Manifest manager">
      <div class="dashboardHeading">
        <div class="dashboardEyebrow">Manifestation technology</div>
        <h3>User Manifest Images</h3>
      </div>

      <div class="adminManifestList">
        ${rowsHtml.join("")}
      </div>
    </section>
  `;
}

function bindManifestManagerActions({ messagesEl, mainEl, sb, me, escapeHtml, mountWelcomeDashboard, setFeedback }) {
messagesEl
  .querySelectorAll("[data-manifest-upload]")
  .forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.manifestUpload;
      const inputEl = messagesEl.querySelector(`[data-manifest-file-input="${userId}"]`);
      const file = inputEl?.files?.[0];

      console.log("[manifest] upload click", {
        userId,
        hasInput: !!inputEl,
        hasFile: !!file,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size
      });

      if (!userId || !file) {
        console.warn("[manifest] no file selected");
        setFeedback("Choose an image before uploading.", "error");
        alert("Choose an image before uploading.");
        return;
      }

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Uploading...";

      try {
        const result = await uploadManifestImage({ sb, userId, file });
        console.log("[manifest] upload success", result);

        setFeedback("Manifest image uploaded.", "success");
        // alert("Manifest image uploaded.");

        await mountWelcomeDashboard({
          messagesEl,
          mainEl,
          sb,
          me,
          escapeHtml,
          animateMetrics: false,
          adminPreview: false,
          adminHome: true
        });
      } catch (error) {
        console.error("[manifest] upload failed", error);
        setFeedback(error?.message || "Could not upload manifest image.", "error");
        alert(error?.message || "Could not upload manifest image.");
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  messagesEl
    .querySelectorAll("[data-manifest-toggle]")
    .forEach(btn => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.manifestToggle;
        const currentEnabled = btn.dataset.manifestEnabled === "true";

        try {
          await setManifestImageEnabled(sb, userId, !currentEnabled);
          setFeedback("Manifest image updated.", "success");

          await mountWelcomeDashboard({
            messagesEl,
            mainEl,
            sb,
            me,
            escapeHtml,
            animateMetrics: false,
            adminPreview: false,
            adminHome: true
          });
        } catch (error) {
          setFeedback(error?.message || "Could not update manifest image.", "error");
        }
      });
    });

    messagesEl
  .querySelectorAll("[data-manifest-delete]")
  .forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.manifestDelete;
      const confirmed = window.confirm("Delete this manifest image?");
      if (!confirmed) return;

      try {
        await deleteManifestImage(sb, userId);
        setFeedback("Manifest image deleted.", "success");

        await mountWelcomeDashboard({
          messagesEl,
          mainEl,
          sb,
          me,
          escapeHtml,
          animateMetrics: false,
          adminPreview: false,
          adminHome: true
        });
      } catch (error) {
        setFeedback(error?.message || "Could not delete manifest image.", "error");
      }
    });
  });
}

window.manifestUI = {
  loadManifestImageForUser,
  createManifestSignedUrl,
  deleteManifestImage,
  uploadManifestImage,
  setManifestImageEnabled,
  loadManifestImagesForUsers,
  getManifestEffectProfile,
  getManifestRenderVariant,
  renderManifestPanel,
  renderAdminManifestManager,
  bindManifestManagerActions
};



