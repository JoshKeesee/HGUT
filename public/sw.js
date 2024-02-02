const SERVER = "https://wtvd8d-3000.csb.app/";

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener(
  "message",
  (e) => e.data && e.data.type == "SKIP_WAITING" && self.skipWaiting(),
);

self.addEventListener("push", (e) => {
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || "favicon.png",
      image: data.image || false,
      badge: "chat.png",
      actions: data.actions || [],
      tag: data.tag || "main",
    }),
  );
});

self.addEventListener("notificationclick", async (e) => {
  e.notification.close();
  const path = self.location.origin + "/chat";
  if (e.action == "reply") {
    const message = e.reply;
    const room = e.notification.tag;
    const u = await cookieStore.get("user");
    if (!u.value) return;
    const profiles = await (await fetch(SERVER + "p")).json();
    const user = profiles[decodeURI(u.value)];
    fetch(SERVER + "message", {
      method: "POST",
      body: JSON.stringify({
        message,
        room,
        user,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } else e.waitUntil(clients.openWindow(path));
});
