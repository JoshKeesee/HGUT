const peer = new Peer();
const socket = io(SERVER + "voice", {
  transports: ["websocket"],
  query: {
    user: document.cookie,
  },
});
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
const input = document.querySelector("#chat-input");
const send = document.querySelector("#chat-send");
const chat = document.querySelector("#toggle-chat");
const present = document.querySelector("#toggle-presentation");
let stream = null,
  pres = null;
let user = {},
  profiles = {},
  switched = {},
  online = {},
  callList = [],
  gridA = [];
const vidConstraints = {
  width: { min: 1280 },
  height: { min: 720 },
};

const us = async () => {
  stream = await navigator.mediaDevices.getUserMedia({
    video: vidConstraints,
    audio: true,
  });
  stream.getVideoTracks().forEach((v) => (v.enabled = false));
  stream.getAudioTracks().forEach((v) => (v.enabled = false));
};

socket.on("chat message", addMessage);
socket.on("profiles", (p) => (p ? (profiles = p) : ""));
socket.on("user", async (u) => {
  user = u;
  const pec = document.querySelector("#people-container");
  pec.innerHTML = "";
  await us();
  switchTheme(user.theme, user.accent ? user.color : null);
  addVideo(user, stream, true);
  if (user.id != 2) present.remove();
  updateOnline();
});
socket.on("online", (u) => {
  online = u;
  updateOnline();
});
socket.on("camera", ([camera, id]) => {
  switched[id].camera = camera;
  const v = document.querySelector("#video-" + id);
  if (!v) return;
  v.style.display = camera ? "block" : "none";
  if (camera) v.querySelector("video").play();
  else v.querySelector("video").pause();
});
socket.on("audio", ([audio, id]) => {
  switched[id].audio = audio;
  const c = document.querySelector(".person-" + id);
  if (!c) return;
  c.querySelectorAll("div.a").forEach(
    (e) => (e.style.display = audio ? "block" : "none"),
  );
  c.querySelectorAll("#muted").forEach(
    (e) => (e.style.display = audio ? "none" : "block"),
  );
});
socket.on("switched", (s) => (switched = s));
socket.on("redirect", (d) => (window.location.href = d));

const animateGridItems = (prevPositions, id = null) => {
  const pec = document.querySelector("#people-container");
  const p = pec.getBoundingClientRect();
  Object.keys(prevPositions).forEach((e, i) => {
    if (e.includes(id)) return;
    const c = document.querySelector("." + e);
    const prev = prevPositions[e];
    const pos = c.getBoundingClientRect();
    if (
      Math.floor(prev.left) == Math.floor(pos.left) &&
      Math.floor(prev.top) == Math.floor(pos.top) &&
      Math.floor(prev.width) == Math.floor(pos.width) &&
      Math.floor(prev.height) == Math.floor(pos.height)
    )
      return;
    c.style.transition = "none";
    c.style.transform = `translate(${prev.left - p.left}px, ${
      prev.top - p.top
    }px)`;
    c.style.width = prev.width + "px";
    c.style.height = prev.height + "px";
    setTimeout(() => {
      c.style = "";
    }, i * 50);
  });
};

const addVideo = async (p, s, self = false, big = false, pre = false) => {
  const pec = document.querySelector("#people-container");
  const prevPositions = {};
  [].slice.call(pec.children).forEach((c) => {
    prevPositions[c.className] = c.getBoundingClientRect();
  });
  const id = pre ? "pres-" + p.peerId : p.peerId;
  const bg = document.createElement("div");
  bg.id = "bg";
  bg.classList.add("bg-" + id);
  if (big) bg.classList.add("big");
  const person = document.createElement("div");
  person.id = "person";
  person.classList.add("person-" + id);
  if (self) person.classList.add("self");
  if (pre) person.classList.add("pres");
  const video = document.createElement("video");
  video.id = "video-" + id;
  video.style.display = switched[id]?.camera || pre ? "block" : "none";
  video.srcObject = s;
  if (p.peerId == user.peerId) video.muted = true;
  video.onloadedmetadata = () => video.play();
  const m = document.createElement("div");
  m.id = "muted";
  m.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512" fill="currentColor">
			<path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L472.1 344.7c15.2-26 23.9-56.3 23.9-88.7V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 21.2-5.1 41.1-14.2 58.7L416 300.8V96c0-53-43-96-96-96s-96 43-96 96v54.3L38.8 5.1zM344 430.4c20.4-2.8 39.7-9.1 57.3-18.2l-43.1-33.9C346.1 382 333.3 384 320 384c-70.7 0-128-57.3-128-128v-8.7L144.7 210c-.5 1.9-.7 3.9-.7 6v40c0 89.1 66.2 162.7 152 174.4V464H248c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H344V430.4z"/>
		</svg>
 `;
  m.style.display = switched[p.peerId]?.audio ? "block" : "none";
  const pr = getProfile(p, false);
  const a = s.getAudioTracks().length > 0;
  if (a) {
    const ring = document.createElement("div");
    ring.id = "ring";
    ring.className = "a";
    ring.style.display = switched[p.peerId]?.audio ? "block" : "none";
    const vol = document.createElement("div");
    vol.id = "vol";
    vol.className = "a";
    vol.style.display = switched[p.peerId]?.audio ? "block" : "none";
    const ac = new AudioContext();
    const sr = ac.createMediaStreamSource(s);
    await ac.audioWorklet.addModule(worklet);
    const node = new AudioWorkletNode(ac, "audio-monitor", {
      parameterData: {
        clipLevel: 0,
        averaging: 0.98,
        clipLag: 750,
      },
    });
    node.port.onmessage = (e) => {
      const av = 1 + e.data.volume[0].value * 8;
      vol.style.transform = `scale(${Math.max(Math.min(av, 2.2), 1)})`;
    };
    sr.connect(node).connect(ac.destination);
    person.appendChild(ring);
    person.appendChild(vol);
  }
  person.appendChild(video);
  person.appendChild(pr);
  const name = document.createElement("div");
  name.id = "name";
  name.innerText = p.peerId == user.peerId ? "You" : p.name;
  person.appendChild(name);
  person.appendChild(m);
  bg.appendChild(person);
  pec.appendChild(bg);
  animateGridItems(prevPositions, user.peerId);
};

const addPerson = (p) => {
  const call = peer.call(p.peerId, stream);
  call.on("stream", async (s) => {
    socket.emit("get switched", (sw) => {
      switched = sw;
      if (callList.includes(p.peerId)) return;
      callList.push(p.peerId);
      addVideo(p, s);
    });
  });
};

const removePerson = (p, pre = false) => {
  if (p.peerId == user.peerId && !pre) return;
  const prevPositions = {};
  const pec = document.querySelector("#people-container");
  [].slice.call(pec.children).forEach((c) => {
    prevPositions[c.className] = c.getBoundingClientRect();
  });
  const id = pre ? "pres-" + p.peerId : p.peerId;
  const c = document.querySelectorAll(".person-" + id);
  c.forEach((e) => e.parentElement.remove());
  animateGridItems(prevPositions, p.peerId);
};

socket.on("add person", addPerson);
socket.on("remove person", removePerson);
peer.on("open", (id) => {
  user.peerId = id;
  socket.emit("id", id);
});
socket.on("disconnect", () => {
  const reload = confirm("You have been disconnected. Reload?");
  if (reload) window.location.reload();
  else leave.click();
});
peer.on("call", (call) => {
  socket.emit("get switched", async (sw) => {
    switched = sw;
    const p = Object.values(profiles).find(
      (e) => e.id == sw[Object.keys(sw).find((k) => k == call.peer)].id,
    );
    p.peerId = call.peer;
    const pre = sw[p.peerId].present ? true : false;
    call.answer(stream);
    call.on("stream", async (s) => {
      if (callList.includes(p.peerId) && !pre) return;
      callList.push(p.peerId);
      addVideo(p, s, false, pre, pre);
    });
  });
});

const updateOnline = () => {
  const o = document.querySelector("#online");
  o.innerHTML = "";
  Object.values(profiles)
    .map((e) => e.id)
    .forEach((k) => {
      const r =
        profiles[Object.keys(profiles).find((e) => profiles[e].id == k)];
      if (!Object.keys(online).includes(k.toString())) return;
      if (k != user.id) {
        const bg = document.createElement("div");
        bg.id = "bg";
        bg.style.background = user.theme ? "black" : "white";
        const pc = getProfile(r);
        pc.style.opacity = online[k].visible ? 1 : 0.5;
        bg.appendChild(pc);
        o.appendChild(bg);
      }
    });
};

const switchTheme = (dark = !user.theme, color) => {
  user.theme = dark;
  const d = dark ? "dark" : "light";
  document.body.className = d;
  document.querySelector("#online").className = d + "-box";
  document.querySelector("#light-icon").style.opacity = user.theme ? 0 : 1;
  document.querySelector("#dark-icon").style.opacity = user.theme ? 1 : 0;
  document
    .querySelectorAll("#bg")
    .forEach((b) => (b.style.background = user.theme ? "black" : "white"));
  document
    .querySelector("meta[name=theme-color]")
    .setAttribute(
      "content",
      user.theme
        ? "#000014"
        : user.accent
          ? rgbToHex(toRgba(user.color))
          : rgbToHex("rgb(0, 0, 255)"),
    );
  document
    .querySelectorAll(".loading div")
    .forEach((b) => (b.style.background = user.theme ? "white" : "black"));
  document
    .querySelectorAll("#ring")
    .forEach((b) => (b.style.borderColor = user.theme ? "#999" : "#fff"));
  document
    .querySelectorAll("#vol")
    .forEach((b) => (b.style.background = user.theme ? "#999" : "#fff"));
  document
    .querySelectorAll("#meeting-cont #divider")
    .forEach((b) => (b.style.background = user.theme ? "#fff" : "#000"));
  if (color) {
    const rgb = toRgba(color, 1, true);
    const root = document.querySelector(":root");
    Object.keys(rgb).forEach((k) =>
      root.style.setProperty("--theme-" + k, rgb[k]),
    );
  }
  socket.emit("theme", user.theme);
};

const toggleCamera = async (set = !user.camera) => {
  user.camera = set;
  if (user.camera) {
    cam.classList.remove("toggled");
    cam.querySelector("svg.on").style.display = "block";
    cam.querySelector("svg.off").style.display = "none";
  } else {
    cam.classList.add("toggled");
    cam.querySelector("svg.on").style.display = "none";
    cam.querySelector("svg.off").style.display = "block";
  }
  const c = document.querySelector("#video-" + user.peerId);
  if (user.camera) {
    c.play();
    stream.getVideoTracks().forEach((v) => (v.enabled = true));
  } else {
    c.pause();
    stream.getVideoTracks().forEach((v) => (v.enabled = false));
  }
  c.style.display = user.camera ? "block" : "none";
  socket.emit("camera", user.camera);
};

const toggleAudio = async (set = !user.audio) => {
  user.audio = set;
  if (user.audio) {
    mic.classList.remove("toggled");
    mic.querySelector("svg.on").style.display = "block";
    mic.querySelector("svg.off").style.display = "none";
  } else {
    mic.classList.add("toggled");
    mic.querySelector("svg.on").style.display = "none";
    mic.querySelector("svg.off").style.display = "block";
  }
  stream.getAudioTracks()[0].enabled = user.audio;
  const c = document.querySelector(".person-" + user.peerId);
  if (!c) return;
  c.querySelectorAll("div.a").forEach(
    (e) => (e.style.display = user.audio ? "block" : "none"),
  );
  c.querySelectorAll("#muted").forEach(
    (e) => (e.style.display = user.audio ? "none" : "block"),
  );
  socket.emit("audio", user.audio);
};

const togglePresent = async () => {
  user.present = !user.present;
  if (user.present) {
    present.style.background =
      "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
    try {
      pres = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch (e) {
      return togglePresent();
    }
    socket.emit("present", user.peerId);
    pres.getVideoTracks()[0].onended = togglePresent;
    for (const e of callList) {
      if (e == peer.id) return;
      const call = peer.call(e, pres);
    }
    addVideo(user, pres, false, true, true);
  } else {
    present.style = "";
    if (pres) pres.getTracks().forEach((v) => v.stop());
    removePerson(user, true);
    pres = null;
    socket.emit("present", null);
  }
};

cam.onclick = () => toggleCamera();
mic.onclick = () => toggleAudio();
leave.onclick = () => {
  if (window.opener) window.close();
  else window.location.href = "/chat";
};

input.onkeydown = (e) => {
  const i = input.value;
  if (!i.replace(/\s/g, "").length) return;
  if (e.key != "Enter" || i.length == 0 || i.length > 250 || !socket.connected)
    return;
  socket.emit("chat message", i);
  input.value = "";
};

send.onclick = (e) => {
  const i = input.value;
  if (!i.replace(/\s/g, "").length) return;
  if (i.length == 0 || i.length > 250 || !socket.connected) return;
  socket.emit("chat message", i);
  input.value = "";
};

chat.onclick = () => {
  user.chat = !user.chat;
  if (user.chat)
    chat.style.background =
      "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
  else chat.style = "";
  const c = document.querySelector("#main-cont");
  c.classList.toggle("toggled");
  const ci = document.querySelector("#chat-input");
  if (user.chat) ci.focus();
  else ci.blur();
};

present.onclick = togglePresent;

if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
)
  switchTheme(true);
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();

const updateTime = () => {
  setTimeout(updateTime, 1000);
  const t = document.querySelector("#time");
  t.innerHTML = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

updateTime();
