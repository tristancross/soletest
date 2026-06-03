// ====== VOICE MESSAGE ======
const recordingMeta = document.getElementById("recordingMeta");
const recordingPreview = document.getElementById("recordingPreview");
const previewPlayBtn = document.getElementById("previewPlayBtn");
const previewProgress = document.getElementById("previewProgress");
const previewProgressFill = document.getElementById("previewProgressFill");
let previewAudio = null;
const deleteRecordBtn = document.getElementById("deleteRecordBtn");

function getCurrentRecordingDurationSeconds() {
  if (!recordingStartTime) return recordingDurationSeconds || 0;

  let totalMs = Date.now() - recordingStartTime - pausedElapsedMs;

  if (pauseStartedAt) {
    totalMs -= (Date.now() - pauseStartedAt);
  }

  if (totalMs <= 0) return 0;

  return Math.max(1, Math.round(totalMs / 1000));
}

function updateRecordingVisualState() {
  const hasExistingRecording =
    (recordingBlob && recordingDurationSeconds > 0) ||
    (audioChunks.length > 0 && getCurrentRecordingDurationSeconds() > 0);

  // mic goes red only when there's something recorded and we're not actively recording
  micBtn.classList.toggle(
    "hasRecording",
    !isRecording && hasExistingRecording
  );

  // hide the record dot when paused / previewing
  const isPausedPreview = recordingState === "preview";
  const recordDotEl = recordingMeta.querySelector(".recordDot");
  if (recordDotEl) {
    recordDotEl.classList.toggle("hiddenDot", isPausedPreview);
  }

  // make preview play/pause button red in paused/preview state
  if (previewPlayBtn) {
    previewPlayBtn.classList.toggle("isPaused", isPausedPreview);
  }
}

function resetRecordingState() {
  recordingState = "idle";

  recordingMeta.hidden = true;
  recordingPreview.hidden = true;
  deleteRecordBtn.hidden = true;

  textInput.hidden = false;
  micBtn.hidden = false;

  micBtn.classList.remove("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

  recordingTimerEl.hidden = true;
  recordingTimerEl.textContent = "0:00";

  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  previewProgressFill.style.width = "0%";

  audioChunks = [];
  recordingBlob = null;
  recordingDurationSeconds = 0;

  isRecording = false;
  recordingStartTime = null;
  pausedElapsedMs = 0;
  pauseStartedAt = null;

  if (mediaRecorder?.stream) {
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  mediaRecorder = null;

  updateSendButton();
  updateRecordingVisualState();
}

function showPreviewState() {
  recordingState = "preview";

  recordingMeta.hidden = false;
  recordingPreview.hidden = false;
  deleteRecordBtn.hidden = false;

  textInput.hidden = true;
  micBtn.hidden = false;

  micBtn.classList.remove("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

  recordingTimerEl.hidden = false;
  recordingTimerEl.textContent = formatDuration(recordingDurationSeconds);

  if (previewAudio) previewAudio.pause();
  previewAudio = new Audio(previewAudioUrl);

  previewAudio.addEventListener("timeupdate", () => {
    if (!previewAudio.duration) return;
    const pct = (previewAudio.currentTime / previewAudio.duration) * 100;
    previewProgressFill.style.width = pct + "%";
  });

  previewAudio.addEventListener("ended", () => {
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    previewProgressFill.style.width = "0%";
    previewAudio.currentTime = 0;
  });


  updateSendButton();
  updateRecordingVisualState();
}

function buildVoicePreviewFromChunks() {
  if (!audioChunks.length) return;

  recordingBlob = new Blob(audioChunks, { type: "audio/webm" });
  recordingDurationSeconds = getCurrentRecordingDurationSeconds();

  if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
  previewAudioUrl = URL.createObjectURL(recordingBlob);

  showPreviewState();
}

micBtn.onclick = async () => {

  // resume paused recording from preview state
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();

    if (pauseStartedAt) {
      pausedElapsedMs += Date.now() - pauseStartedAt;
      pauseStartedAt = null;
    }

    isRecording = true;
    recordingState = "recording";
    updateRecordingVisualState();

    recordingPreview.hidden = true;
    recordingMeta.hidden = false;
    deleteRecordBtn.hidden = false;

    micBtn.classList.add("recording");
    micBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    previewProgressFill.style.width = "0%";

    startRecordingTimer();
    updateSendButton();
    return;
  }

  updateSendButton();

  // pause active recording and show preview
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    mediaRecorder.requestData();
    pauseStartedAt = Date.now();

    isRecording = false;
    recordingState = "preview";
    updateRecordingVisualState();

    micBtn.classList.remove("recording");
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';

    stopRecordingTimer();

    setTimeout(() => {
      buildVoicePreviewFromChunks();
      updateSendButton();
    }, 50);

    return;
  }
  updateSendButton();

  // start fresh recording
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true });

  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  recordingStartTime = Date.now();
  pausedElapsedMs = 0;
  pauseStartedAt = null;
  recordingState = "recording";

  mediaRecorder.ondataavailable = e => {
    audioChunks.push(e.data);
  };

  mediaRecorder.onstop = async () => {
    const totalMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const duration = Math.floor(totalMs / 1000);

    recordingStartTime = null;

    if (duration > 120){
      alert("Voice messages must be under 2 minutes.");
      resetRecordingState();
      return;
    }

    recordingBlob = new Blob(audioChunks, { type: "audio/webm" });
    recordingDurationSeconds = duration;

    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = URL.createObjectURL(recordingBlob);

    showPreviewState();
  };

  mediaRecorder.start();

  isRecording = true;
  micBtn.classList.add("recording");
  micBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  updateRecordingVisualState();

  startRecordingTimer();

  setTimeout(() => {
    if (isRecording){
      stopRecording();
    }
  }, 120000);

  updateSendButton();
};

function stopRecording(){

  if (!mediaRecorder) return;

  mediaRecorder.stop();

  isRecording = false;
  micBtn.classList.remove("recording");

  stopRecordingTimer();
}

async function sendRecordedVoiceMessage() {
  if (!recordingBlob) return;

  const duration =
    recordingDurationSeconds > 0
      ? recordingDurationSeconds
      : getCurrentRecordingDurationSeconds();

  if (duration > 120) {
    alert("Voice messages must be under 2 minutes.");
    return;
  }

  if (mediaRecorder) {
    mediaRecorder.onstop = null;

    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (_) {}

    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorder = null;
  }

  await uploadVoiceMessage(recordingBlob, duration);

  if (previewAudioUrl) {
    URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = null;
  }

  resetRecordingState();
}

function discardRecording() {
  if (previewAudioUrl) {
    URL.revokeObjectURL(previewAudioUrl);
    previewAudioUrl = null;
  }

  recordingBlob = null;
  recordingDurationSeconds = 0;
  audioChunks = [];
  resetRecordingState();
}

async function uploadVoiceMessage(blob, duration){

  if (!me || !them) return;

  const fileName = `${crypto.randomUUID()}.webm`;
  const path = `${me.id}/${fileName}`;

  const { error: uploadError } = await sb.storage
    .from("voice-notes")
    .upload(path, blob);

  if (uploadError){
    alert(uploadError.message);
    return;
  }

  const { data } = sb.storage
    .from("voice-notes")
    .getPublicUrl(path);

  const audioUrl = data.publicUrl;

  const { error } = await sb
    .from("messages")
    .insert({
      sender_id: me.id,
      recipient_id: them.id,
      message_type: "voice",
      audio_path: audioUrl,
      audio_duration_seconds: duration
    });

  if (error){
    alert(error.message);
  }

}

function formatDuration(seconds){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function startRecordingTimer() {
  recordingMeta.hidden = false;
  recordingPreview.hidden = true;
  deleteRecordBtn.hidden = false;

  textInput.hidden = true;
  micBtn.hidden = false;

  recordingTimerEl.hidden = false;

  if (recordingStartTime) {
    const activeMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const seconds = Math.max(0, Math.floor(activeMs / 1000));
    recordingTimerEl.textContent = formatDuration(seconds);
  }

  clearInterval(recordingTimerInterval);

  recordingTimerInterval = setInterval(() => {
    if (!recordingStartTime) return;

    const activeMs = Date.now() - recordingStartTime - pausedElapsedMs;
    const seconds = Math.max(0, Math.floor(activeMs / 1000));
    recordingTimerEl.textContent = formatDuration(seconds);
  }, 250);
  updateRecordingVisualState();
}

function stopRecordingTimer() {
  clearInterval(recordingTimerInterval);
  recordingTimerInterval = null;
}

deleteRecordBtn.onclick = () => {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  if (mediaRecorder) {
    // Prevent old recorder callbacks from firing after delete
    mediaRecorder.onstop = null;
    mediaRecorder.ondataavailable = null;

    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (_) {}

    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    mediaRecorder = null;
  }

  isRecording = false;
  stopRecordingTimer();

  discardRecording();
  updateRecordingVisualState();
};
previewPlayBtn.onclick = () => {
  if (!previewAudio) return;

  if (previewAudio.paused) {
    previewAudio.play();
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  } else {
    previewAudio.pause();
    previewPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
};

previewProgress.onclick = (e) => {
  if (!previewAudio || !previewAudio.duration) return;

  const rect = previewProgress.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));

  previewAudio.currentTime = ratio * previewAudio.duration;
};
