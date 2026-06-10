(function () {
  function isCapacitorNative() {
    return !!window.Capacitor && window.Capacitor.isNativePlatform?.();
  }

  function getLocalNotifications() {
    return window.Capacitor?.Plugins?.LocalNotifications || null;
  }

  async function sendTestNotification() {
    const LocalNotifications = getLocalNotifications();

    if (!LocalNotifications) {
      alert("LocalNotifications plugin not found. Did you run npm install + npx cap sync + rebuild the app?");
      return;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();

      if (permission.display !== "granted") {
        alert("Notification permission was not granted.");
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Sole",
            body: "Test notification from the native wrapper.",
            id: Date.now() % 2147483647,
            schedule: {
              at: new Date(Date.now() + 3000)
            },
            smallIcon: "ic_stat_icon_config_sample",
            channelId: "sole_test"
          }
        ]
      });

      alert("Notification scheduled. It should appear in 3 seconds.");
    } catch (error) {
      console.error("[Sole notification test]", error);
      alert(error?.message || "Could not send notification.");
    }
  }

  function addTestButton() {
    if (!isCapacitorNative()) return;
    if (document.getElementById("soleNotificationTestBtn")) return;

    const btn = document.createElement("button");
    btn.id = "soleNotificationTestBtn";
    btn.type = "button";
    btn.textContent = "Test notification";

    btn.style.position = "fixed";
    btn.style.left = "16px";
    btn.style.bottom = "74px";
    btn.style.zIndex = "999999";
    btn.style.border = "1px solid rgba(0,0,0,.12)";
    btn.style.borderRadius = "999px";
    btn.style.padding = "10px 14px";
    btn.style.background = "#111";
    btn.style.color = "#fff";
    btn.style.font = "14px system-ui, sans-serif";
    btn.style.boxShadow = "0 10px 30px rgba(0,0,0,.18)";

    btn.addEventListener("click", sendTestNotification);

    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addTestButton);
  } else {
    addTestButton();
  }
})();