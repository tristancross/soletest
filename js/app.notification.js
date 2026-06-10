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

    // Android needs a notification channel.
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
          id: Date.now() % 2147483647,
          channelId: "sole_test",
          schedule: {
            at: new Date(Date.now() + 8000)
          }
        }
      ]
    });

    alert("Notification scheduled. Press Home or lock the phone — it should appear in about 8 seconds.");
  } catch (error) {
    console.error("[Sole notification test]", error);
    alert(error?.message || "Could not send notification.");
  }
}