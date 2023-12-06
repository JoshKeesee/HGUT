const publicKey =
  "BJVqvnCWx0flqmuHgSv0OQ6VRl-FRTgRKzByVlMf-4iyFStJlJMSn6G90e0LNICbHaGzx5gwRDLttMZ2xDVhRxk";

const registerSw = async (p) => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const r of registrations) r.unregister();

  const register = await navigator.serviceWorker.register("../sw.js", {
    scope: "/chat",
  });

  if (p != "granted") return;

  const subscription = await register.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
    endpoint: "/chat",
  });

  await fetch(SERVER + "subscribe", {
    method: "POST",
    body: JSON.stringify({
			subscription,
			user: decodeURI(document.cookie.split(";").find(c => c.startsWith("user=")).split("=")[1]),
			mobile: navigator.userAgent.includes("Mobile"),
		}),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

Notification.requestPermission().then(registerSw);
