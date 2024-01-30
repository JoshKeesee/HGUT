importScripts("https://unpkg.com/workbox-sw@7.0.0/build/workbox-sw.js");

const CACHE = "hgut-v1";
const SERVER = "https://3sx4nn-3000.csb.app/";
const denyCache = ["socket.io", "peerjs", "manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener(
  "message",
  (e) => e.data && e.data.type == "SKIP_WAITING" && self.skipWaiting(),
);

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches
      .match(e.request)
      .then((r) => r || fetch(e.request))
      .then((r) =>
        caches.open(CACHE).then((cache) => {
          !denyCache.some(c => e.request.url.includes(c)) && e.request.method != "POST" && cache.put(e.request, r.clone());
          return r;
        }),
      ),
  );
});

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
