const publicKey = "BJVqvnCWx0flqmuHgSv0OQ6VRl-FRTgRKzByVlMf-4iyFStJlJMSn6G90e0LNICbHaGzx5gwRDLttMZ2xDVhRxk";

const registerSw = async p => {
	const register = await navigator.serviceWorker.register("../sw.js", {
		scope: "/chat",
	});

	navigator.serviceWorker.ready.then(r => r.update());
	
	if (p != "granted") return;

	const subscription = await register.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: publicKey,
		endpoint: "/chat",
	});

	await fetch("/subscribe", {
		method: "POST",
		body: JSON.stringify(subscription),
		headers: {
			"Content-Type": "application/json"
		}
	});
};

Notification.requestPermission().then(registerSw);