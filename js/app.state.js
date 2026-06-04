// ====== STATE ======
let me = null;        // selected profile
let them = null;      // selected chat partner (normal mode)
let viewA = null;     // admin: user A
let viewB = null;     // admin: user B
let channel = null;   // realtime channel
let inboxChannel = null;
let adminMode = false;
let blockedPairs = new Set();
let lastRendered = null;
let lastRenderedWrap = null;
let adminDashboardProfile = null;
let assignedPartner = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimerInterval = null;
let recordingBlob = null;
let recordingDurationSeconds = 0;
let previewAudioUrl = null;
let recordingState = "idle"; 
let pausedElapsedMs = 0;
let pauseStartedAt = null;
let typingTimeout;
let liveDraftRow = null;
let liveDraftBubble = null;
let liveDraftClearTimeout = null;
let lastDraftSentAt = 0;
let lastDraftTextSent = "";
let liveDraftText = "";
let partnerFacts = [];
let partnerFactIndex = 0;
let partnerFactTimer = null;

let chatVersionTimer = null;
let chatModelVersionNumber = 1.03;

const recordingTimerEl = document.getElementById("recordingTimer");

const micBtn = document.getElementById("micBtn");
// Prevent showing your own optimistic message twice
const recentSends = new Map(); // key -> timestamp (ms)
const RECENT_WINDOW_MS = 7000;
