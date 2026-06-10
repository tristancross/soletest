(function () {
  function isNativeApp() {
    return !!window.Capacitor && window.Capacitor.isNativePlatform?.();
  }

  function getPushNotifications() {
    return window.Capacitor?.Plugins?.PushNotifications || null;
  }

  async function registerForPush() {
    const PushNotifications = getPushNotifications();

    if (!PushNotifications) {
      alert("PushNotifications plugin not found. Did you rebuild the native app after npx cap sync?");
      return;
    }

    try {
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive !== "granted") {
        alert("Push permission not granted.");
        return;
      }

      PushNotifications.addListener("registration", token => {
        console.log("[Sole push token]", token.value);
        alert("Push token received:\n\n" + token.value.slice(0, 42) + "...");
      });

      PushNotifications.addListener("registrationError", error => {
        console.error("[Sole push registration error]", error);
        alert("Push registration error: " + JSON.stringify(error));
      });

      PushNotifications.addListener("pushNotificationReceived", notification => {
        console.log("[Sole push received]", notification);
        alert("Push received: " + (notification.title || "Untitled"));
      });

      PushNotifications.addListener("pushNotificationActionPerformed", action => {
        console.log("[Sole push action]", action);
      });

      await PushNotifications.register();
    } catch (error) {
      console.error("[Sole push test failed]", error);
      alert(error?.message || "Push test failed.");
    }
  }

  function addPushTestButton() {
    if (!isNativeApp()) return;
    if (document.getElementById("solePushTestBtn")) return;

    const btn = document.createElement("button");
    btn.id = "solePushTestBtn";
    btn.type = "button";
    btn.textContent = "Get push token";

    btn.style.position = "fixed";
    btn.style.left = "16px";
    btn.style.bottom = "124px";
    btn.style.zIndex = "999999";
    btn.style.border = "1px solid rgba(0,0,0,.12)";
    btn.style.borderRadius = "999px";
    btn.style.padding = "10px 14px";
    btn.style.background = "#111";
    btn.style.color = "#fff";
    btn.style.font = "14px system-ui, sans-serif";
    btn.style.boxShadow = "0 10px 30px rgba(0,0,0,.18)";

    btn.addEventListener("click", registerForPush);
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addPushTestButton);
  } else {
    addPushTestButton();
  }
})();