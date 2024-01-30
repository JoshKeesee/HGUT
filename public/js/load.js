const scripts = [
  "https://cdn.socket.io/4.7.2/socket.io.min.js",
  "js/reg.js",
  "js/main.js",
  "js/settings.js",
  "js/chat.js",
  "js/camera.js",
  "https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js",
  "js/worklet.js",
  "js/voice.js",
  "js/animateGrid.js",
  "js/files.js",
  "https://unpkg.com/tone@14.7.77/build/Tone.js",
  "js/music.js",
  "js/status.js",
];

const createScript = async (src) => {
  const script = document.createElement("script");
  script.src = src;
  return new Promise((resolve) => {
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
};

window.onload = async () => {
  for (const src of scripts) await createScript(src);
  switchTab(document.querySelector("#" + getCurrentTab()));
  document.querySelector("script[src='js/load.js']").remove();
};
