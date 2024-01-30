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
  const f = await navigator.serviceWorker.getRegistrations();
  f.forEach((r) => r.unregister());

  const r = await navigator.serviceWorker.register("../sw.js", {
    scope: "/chat",
  });
};

const getNotifications = async (p) => {
  await navigator.serviceWorker.ready;

  if (p != "granted") return;

  const subscription = await register.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
      endpoint: "/chat",
    })
    .catch(() => {});

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
      res(Notification.permission == "granted");
    });
  });
};

register();
