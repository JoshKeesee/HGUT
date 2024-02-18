const scripts = [
  "https://cdn.socket.io/4.7.2/socket.io.min.js",
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
  for (const src of scripts) await createScript(src);
  switchTab(document.querySelector("#" + getCurrentTab()));
  document.querySelector("script[src='js/load.js']").remove();
};
