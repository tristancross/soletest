// LOGIN
loginBtn.onclick = async () => {
  clearAuthMessage();
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const identifier = loginIdentifier.value.trim();
    const password = loginPassword.value;

    if (!identifier || !password) {
      setAuthError("Enter your login details.");
      return;
    }

let email = identifier;

if (!identifier.includes("@")) {
  const usernameLookup = identifier.trim().toLowerCase();

  const { data, error } = await sb.rpc("get_login_email_for_username", {
    input_username: usernameLookup
  });

  if (error || !data || !data.length || !data[0].email) {
    setAuthError("Invalid login details.");
    return;
  }

  email = data[0].email;
}

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    currentUser = data.user;
    authScreen.style.display = "none";
    await initChat();

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Log in";
  }
};

// SIGNUP
createAccountBtn.onclick = async () => {
  clearAuthMessage();
  createAccountBtn.disabled = true;
  createAccountBtn.textContent = "Creating account...";

  try {
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const passwordRepeat = signupPasswordRepeat.value;

    if (!username || !email || !password || !passwordRepeat) {
      setAuthError("Fill in all fields.");
      return;
    }

    if (password !== passwordRepeat) {
      setAuthError("Passwords do not match.");
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
options: {
  data: {
    username: username.toLowerCase(),
    display_name: username
  }
}
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    await sb
      .from("profiles")
.upsert({
  id: data.user.id,
  username: username.toLowerCase(),
  display_name: username,
  email: email
});

    setAuthSuccess("Account created. Check your email to verify your account.");
    showLoginForm(false);

    loginIdentifier.value = email;
    loginPassword.value = "";

  } finally {
    createAccountBtn.disabled = false;
    createAccountBtn.textContent = "Create account";
  }
};
// SHOW PASSWORD TOGGLER
document.querySelectorAll(".togglePassword").forEach(btn => {

  btn.onclick = () => {

    const input = btn.previousElementSibling;

    if (input.type === "password"){
      input.type = "text";
      btn.textContent = "Ã°Å¸â„¢Ë†";
    } else {
      input.type = "password";
      btn.textContent = "Ã°Å¸â€˜Â";
    }

  };

});

// FORGOT PASSWORD
forgotPasswordBtn.onclick = async () => {
  const email = loginIdentifier.value.trim();

  if (!email) {
    setAuthError("Enter your email first.");
    return;
  }

  if (!email.includes("@")) {
    setAuthError("Enter your email address to reset your password.");
    return;
  }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset.html"
  });

  if (error) {
    setAuthError(error.message);
    return;
  }

  setAuthSuccess("Password reset email sent.");
};
