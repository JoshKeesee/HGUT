const publicKey =
  "BJVqvnCWx0flqmuHgSv0OQ6VRl-FRTgRKzByVlMf-4iyFStJlJMSn6G90e0LNICbHaGzx5gwRDLttMZ2xDVhRxk";

const getDeviceId = () => {
  const id = localStorage.getItem("deviceId");
  if (id) return id;
  const newId = crypto.randomUUID();
  localStorage.setItem("deviceId", newId);
  return newId;
};

const register = async () => {
  if (navigator.onLine) {
    const f = await navigator.serviceWorker.getRegistrations();
    for (const r of f) await r.unregister();

    const r = await navigator.serviceWorker.register("../sw.js", {
      scope: "/chat",
    });
  }
};

const getNotifications = async (p) => {
  await navigator.serviceWorker.ready;

  if (p != "granted") return createStatus("Notifications disabled", "info");

  const register = await navigator.serviceWorker.getRegistration("/chat");
  await register.update();

  const subscription = await register.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
      endpoint: "/chat",
    })
    .catch(() => createStatus("Enabling notifications failed", "error"));

  await fetch(SERVER + "subscribe", {
    method: "POST",
    body: JSON.stringify({
      subscription,
      user: decodeURI(
        document.cookie
          .split(";")
          .find((c) => c.includes("user="))
          .split("=")[1],
      ),
      deviceId: getDeviceId(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const askNotification = async () => {
  const f = getNotifications.bind(null, Notification.permission);
  return new Promise((res) => {
    Notification.requestPermission().then(() => {
      f();
      const r = Notification.permission == "granted";
      if (r) createStatus("Notifications enabled!", "success");
      else createStatus("Notification permission denied", "info");
      res(r);
    });
  });
};

register();
