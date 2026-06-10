(function () {
  let hasRegisteredPush = false;

  function isNativeApp() {
    return !!window.Capacitor && window.Capacitor.isNativePlatform?.();
  }

  function getPushNotifications() {
    return window.Capacitor?.Plugins?.PushNotifications || null;
  }

  function getPlatform() {
    try {
      return window.Capacitor?.getPlatform?.() || "native";
    } catch (_) {
      return "native";
    }
  }

  async function savePushToken(tokenValue) {
    if (!window.sb || !window.me?.id || !tokenValue) {
      console.warn("[Sole push] Cannot save token yet", {
        hasSb: !!window.sb,
        userId: window.me?.id || null,
        hasToken: !!tokenValue
      });
      return;
    }

    const { error } = await window.sb
      .from("user_push_tokens")
      .upsert(
        {
          user_id: window.me.id,
          token: tokenValue,
          platform: getPlatform(),
          enabled: true,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "user_id,token"
        }
      );

    if (error) {
      console.error("[Sole push] Failed to save push token", error);
      return;
    }

    console.log("[Sole push] Push token saved");
  }

  async function registerForSolePush() {
    if (hasRegisteredPush) return;
    if (!isNativeApp()) return;

    const PushNotifications = getPushNotifications();

    if (!PushNotifications) {
      console.warn("[Sole push] PushNotifications plugin not found.");
      return;
    }

    hasRegisteredPush = true;

    try {
      PushNotifications.addListener("registration", async token => {
        console.log("[Sole push] Token received");
        await savePushToken(token.value);
      });

      PushNotifications.addListener("registrationError", error => {
        console.error("[Sole push] Registration error", error);
      });

      PushNotifications.addListener("pushNotificationReceived", notification => {
        console.log("[Sole push] Push received", notification);
      });

      PushNotifications.addListener("pushNotificationActionPerformed", action => {
        console.log("[Sole push] Push action", action);

        // Later we can route this straight to Messages.
        // For now, just bring the app into view.
        window.soleMobileViewMessages?.();
      });

      const permission = await PushNotifications.requestPermissions();

      if (permission.receive !== "granted") {
        console.warn("[Sole push] Permission not granted");
        return;
      }

      await PushNotifications.register();
    } catch (error) {
      console.error("[Sole push] Registration failed", error);
    }
  }

  window.solePush = {
    registerForSolePush,
    savePushToken
  };
})();