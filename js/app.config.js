// ====== CONFIG ======
const SUPABASE_URL = "https://kmnutzpbbvrfizwimcpk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yr1M07ih1yEbqHma0cihdw_t7nDQDbU";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const authScreen = document.getElementById("authScreen");
const authTitle = document.getElementById("authTitle");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");


const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const signupDisplayName = document.getElementById("signupDisplayName");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupPasswordRepeat = document.getElementById("signupPasswordRepeat");

const loginEmail = document.getElementById("loginEmail");
const loginIdentifier = document.getElementById("loginIdentifier");
const loginPassword = document.getElementById("loginPassword");
const authError = document.getElementById("authError");

const formatBar = document.getElementById("formatBar");
const boldBtn = document.getElementById("boldBtn");
const italicBtn = document.getElementById("italicBtn");
const underlineBtn = document.getElementById("underlineBtn");
const bulletBtn = document.getElementById("bulletBtn");

const appEl = document.querySelector(".app");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileSidebarBackdrop = document.getElementById("mobileSidebarBackdrop");
const mainEl = document.querySelector(".main");
const composerEl = document.querySelector(".composer");

const mobileMenuUnreadBadge = document.getElementById("mobileMenuUnreadBadge");
const isMobile = window.matchMedia("(max-width: 768px)").matches;

const createAccountBtn = document.getElementById("createAccountBtn");

const brandHome = document.getElementById("brandHome");

const adminDashboardUser = document.getElementById("adminDashboardUser");
const adminLoadDashboardBtn = document.getElementById("adminLoadDashboardBtn");

let adminScreen = "users";
let adminProfiles = [];
let adminPairings = [];
let adminOverlayOpen = false;
let adminPreviewingUser = null;
let adminActualProfile = null;
let appMode = "participant"; 

function showLoginForm(clearMessage = true) {
  authTitle.textContent = "Log in";
  loginForm.hidden = false;
  signupForm.hidden = true;
  if (clearMessage) clearAuthMessage();
}

function showSignupForm(clearMessage = true) {
  authTitle.textContent = "Sign up";
  loginForm.hidden = true;
  signupForm.hidden = false;
  if (clearMessage) clearAuthMessage();
}

showSignupBtn.onclick = showSignupForm;
showLoginBtn.onclick = showLoginForm;

loginIdentifier.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

loginPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

signupUsername.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupEmail.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

signupPasswordRepeat.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createAccountBtn.click();
});

let currentUser = null;
