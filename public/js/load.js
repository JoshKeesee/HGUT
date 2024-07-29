const scripts = [
  "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.4/socket.io.min.js",
  "https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js",
  "https://unpkg.com/showdown/dist/showdown.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
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
];

const sync = [0, 1, 2, 3, 8, 9, 10, 11];
window.user = {};

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
      if (user.settings?.accent) {
        const hex = user.color;
        const rgb = {
          r: parseInt(hex.slice(1, 3), 16),
          g: parseInt(hex.slice(3, 5), 16),
          b: parseInt(hex.slice(5, 7), 16),
        };
        Object.keys(rgb).forEach((k) => {
          document.body.style.setProperty("--bg-" + k, rgb[k]);
          su.style.setProperty("--bg-" + k, rgb[k]);
          root.style.setProperty("--" + k, rgb[k]);
        });
      }
    }
  }
  for (const src of scripts) await createScript(src);
  document.querySelector("script[src='js/load.js']").remove();
};
