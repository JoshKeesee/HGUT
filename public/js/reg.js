const push = io("/push");
const publicKey = "BJVqvnCWx0flqmuHgSv0OQ6VRl-FRTgRKzByVlMf-4iyFStJlJMSn6G90e0LNICbHaGzx5gwRDLttMZ2xDVhRxk";

const registerSw = async () => {
	const register = await navigator.serviceWorker.register("../sw.js", {
		scope: "/chat",
	});

	if (Notification.permission != "granted") return;
	
	const subscription = await register.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: publicKey,
		endpoint: "/chat",
	});

	push.emit("subscription", subscription);
};

Notification.requestPermission();
if ("serviceWorker" in navigator) registerSw();