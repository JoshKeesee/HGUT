const scripts = [
  "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.4/socket.io.min.js",
  "https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js",
  // "https://unpkg.com/tone@14.7.77/build/Tone.js",
  "js/animateGrid.js",
  "js/files.js",
  "js/worklet.js",
  "js/status.js",
  "js/main.js",
  "js/voice.js",
  "js/settings.js",
  "js/chat.js",
  "js/camera.js",
  // "js/music.js",
  "js/reg.js",
];

const sync = [0, 1, 6, 7, 8, 9];

const createScript = async (src) => {
  const script = document.createElement("script");
  script.src = src;
  return new Promise((resolve) => {
    const i = scripts.indexOf(src);
    if (sync.includes(i)) script.onload = () => resolve();
    else resolve();
    document.body.appendChild(script);
  });
};

window.onload = async () => {
  const tab = new URL(window.location.href).searchParams.get("tab");
  document
    .querySelectorAll(".tab")
    .forEach((e) => e.classList.remove("selected"));
  const el = document.querySelector("#" + tab);
  if (el) el.classList.add("selected");
  const cache = JSON.parse(localStorage.getItem("cache"));
  const su = document.querySelector("#settings-username"),
    cms = document.querySelector("#chat-messages"),
    root = document.querySelector(":root");
  if (cache) {
    cache.user && (user = cache.user);
    cache.messages &&
      (cms.innerHTML = cache.messages) &&
      cms.scrollTo(0, cms.scrollHeight);
    user.settings?.theme &&
      (document.body.className = user.settings.theme ? "dark" : "light");
    if (user) {
      su.innerHTML = user.name;
      document.querySelector("#settings-born").innerHTML = "Born: " + user.dob;
      document.querySelector("#settings-profile").style.backgroundImage =
        "url(" + user.profile + ")";
    }
  }
  for (const src of scripts) await createScript(src);
  switchTab(document.querySelector("#" + getCurrentTab()));
  if (user.settings?.accent) {
    const rgb = toRgba(user.color, 1, true);
    Object.keys(rgb).forEach((k) => {
      document.body.style.setProperty("--bg-" + k, rgb[k]);
      su.style.setProperty("--bg-" + k, rgb[k]);
      root.style.setProperty("--" + k, rgb[k]);
    });
  }
  document.querySelector("script[src='js/load.js']").remove();
};
