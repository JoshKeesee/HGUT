importScripts("https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js");

const VERSION = "v1";
const CACHE = "hgut" + VERSION;
const offlineFallbackPage = "offline.html";
const icon = "favicon.png";

self.addEventListener("message", e => {
	if (e.data && e.data.type == "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", async e => {
	e.waitUntil(
		caches.open(CACHE)
			.then((cache) => cache.add(offlineFallbackPage))
	);
});

if (workbox.navigationPreload.isSupported()) workbox.navigationPreload.enable();

self.addEventListener("fetch", e => {
	if (e.request.mode == "navigate") {
		e.respondWith((async () => {
			try {
				const preloadResp = await e.preloadResponse;
				if (preloadResp) return preloadResp;
				const networkResp = await fetch(e.request);
				return networkResp;
			} catch (error) {
				const cache = await caches.open(CACHE);
				const cachedResp = await cache.match(offlineFallbackPage);
				return cachedResp;
			}
		})());
	}
});

self.addEventListener("push", e => {
	const data = e.data.json();
	self.registration.showNotification(
		data.title, {
		body: data.body,
		icon: data.icon || icon,
		image: data.image || false,
		badge: "chat.png",
		actions: data.actions || [],
		tag: data.tag || "main",
	});
});

self.addEventListener("notificationclick", e => {
	e.notification.close();
	const path = self.location.origin + "/chat";
	if (e.action == "reply") {
		const message = e.reply;
		const room = e.notification.tag;
		fetch("/message", {
			method: "POST",
			body: JSON.stringify({
				message,
				room,
			}),
			headers: {
				"Content-Type": "application/json",
			},
		});
	} else e.waitUntil(clients.openWindow(path));
});