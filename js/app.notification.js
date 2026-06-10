(function () {
  console.log("[Sole notification test] notification.js loaded");

  function isCapacitorNative() {
    return !!window.Capacitor && window.Capacitor.isNativePlatform?.();
  }

  function getLocalNotifications() {
    return window.Capacitor?.Plugins?.LocalNotifications || null;
  }

  async function sendTestNotification() {
    const LocalNotifications = getLocalNotifications();

    if (!LocalNotifications) {
      alert("LocalNotifications plugin not found. Re-run npm install, npx cap sync, then rebuild the Android app.");
      return;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();

      console.log("[Sole notification test] permission", permission);

      if (permission.display !== "granted") {
        alert("Notification permission was not granted.");
        return;
      }

      if (window.Capacitor?.getPlatform?.() === "android") {
        await LocalNotifications.createChannel({
          id: "sole_test",
          name: "Sole test notifications",
          description: "Test notifications for Sole",
          importance: 5,
          visibility: 1,
          vibration: true
        });
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Sole",
            body: "Test notification from the native wrapper.",
            id: Math.floor(Date.now() / 1000),
            channelId: "sole_test",
            schedule: {
              at: new Date(Date.now() + 8000)
            }
          }
        ]
      });

      alert("Notification scheduled. Press Home or lock the phone — it should appear in about 8 seconds.");
    } catch (error) {
      console.error("[Sole notification test] error", error);
      alert(error?.message || "Could not send notification.");
    }
  }

  function addTestButton() {
    console.log("[Sole notification test] addTestButton called", {
      isNative: isCapacitorNative(),
      hasCapacitor: !!window.Capacitor,
      plugins: window.Capacitor?.Plugins
    });

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