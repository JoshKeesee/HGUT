const peer = new Peer();
const voice = io(SERVER + "voice", {
  autoConnect: false,
	reconnection: false,
	forceNew: true,
  transports: ["websocket"],
  query: {
    user: document.cookie,
  },
});
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
const chatInput = document.querySelector("#voice-chat-input");
const voiceSend = document.querySelector("#voice-chat-send");
const toggleChat = document.querySelector("#toggle-chat");
const present = document.querySelector("#toggle-presentation");
let stream = null,
  pres = null;
let peerId = null;
let switched = {},
  callList = [],
  gridA = [];
const vidConstraints = {
  width: { min: 1280 },
  height: { min: 720 },
};

peer.on("open", (id) => peerId = id);

const waitForPeerId = () => {
	return new Promise(resolve => {
		if (peerId) return resolve();
		peer.on("open", () => resolve());
	});
};

const us = async () => {
  if (stream) return;
  stream = await navigator.mediaDevices.getUserMedia({
    video: vidConstraints,
    audio: true,
  });
  stream.getVideoTracks().forEach((v) => (v.enabled = false));
  stream.getAudioTracks().forEach((v) => (v.enabled = false));
};

voice.on("chat message", addMessage);
voice.on("profiles", (p) => (p ? (profiles = p) : ""));
voice.on("user", async (u) => {
  user = u;
  user.visible = document.visibilityState == "visible";
  await us();
  const pec = document.querySelector("#people-container");
  pec.innerHTML = "";
  switchTheme(user.theme, user.accent ? user.color : null);
  addVideo(user, stream, true);
  updateVoiceOnline();
});
voice.on("online", (u) => {
  online = u;
  updateVoiceOnline();
});
voice.on("camera", ([camera, id]) => {
  switched[id].camera = camera;
  const c = document.querySelector(".person-" + id);
  c.querySelectorAll("#video").forEach(
    (v) => (v.style.display = camera ? "block" : "none"),
  );
});
voice.on("audio", ([audio, id]) => {
  switched[id].audio = audio;
  const c = document.querySelector(".person-" + id);
  c.querySelectorAll("div.a").forEach(
    (e) => (e.style.display = audio ? "block" : "none"),
  );
  c.querySelectorAll("#muted").forEach(
    (e) => (e.style.display = audio ? "none" : "block"),
  );
});
voice.on("switched", (s) => (switched = s));
voice.on("redirect", (d) => (window.location.href = d));
voice.on("call list", async (c) => {
  await us();
  c.forEach(addPerson);
});

const animateGridItems = (prevPositions, id = null) => {
  const pec = document.querySelector("#people-container");
  const p = pec.getBoundingClientRect();
  Object.keys(prevPositions).forEach((e, i) => {
    const cl = e.split(" ");
    if (e.includes(id) && cl[1] != "big") return;
    const c = document.querySelector("." + cl[0]);
    if (!c) return;
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
	bg.style.background = user.theme ? "#000" : "#fff";
  if (big) bg.classList.add("big");
  const person = document.createElement("div");
  person.id = "person";
  person.classList.add("person-" + id);
  if (self) person.classList.add("self");
  if (pre) person.classList.add("pres");
  const video = document.createElement("video");
  video.id = "video";
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
  m.style.display = switched[p.peerId]?.audio ? "none" : "block";
  const pr = getProfile(p, false);
  const a = s.getAudioTracks().length > 0;
  if (a) {
    const ring = document.createElement("div");
    ring.id = "ring";
    ring.classList.add("a");
    ring.style.display = switched[p.peerId]?.audio ? "block" : "none";
    const vol = document.createElement("div");
    vol.id = "vol";
    vol.classList.add("a");
    vol.style.display = switched[p.peerId]?.audio ? "block" : "none";
    const ac = new AudioContext();
    const sr = ac.createMediaStreamSource(s);
    await ac.audioWorklet.addModule(worklet);
    const node = new AudioWorkletNode(ac, "audio-monitor", {
      parameterData: {
        clipLevel: 0.5,
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
  if (p.peerId == user.peerId) return;
  const call = peer.call(p.peerId, stream, {
    metadata: { pres: false, id: user.peerId },
  });
  call.on("stream", async (s) => {
    if (callList.includes(p.peerId)) return;
    callList.push(p.peerId);
    addVideo(p, s);
  });
};

const removePerson = (p, pre = false) => {
  if (p.peerId == user.peerId && !pre) return;
  const i = p.present ? "pres-" + p.peerId : p.peerId;
  if (callList.includes(i)) callList.splice(callList.indexOf(i), 1);
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

voice.on("remove person", ([u, pres = false]) => removePerson(u, pres));
peer.on("call", (call) => {
  voice.emit("get switched", async (sw) => {
    switched = sw;
    const p = Object.values(profiles).find(
      (e) => e.id == sw[Object.keys(sw).find((k) => k == call.peer)].id,
    );
    p.peerId = call.peer;
    const pre = sw[p.peerId].present ? true : false;
    const id = pre ? "pres-" + p.peerId : p.peerId;
    call.answer(stream);
    call.on("stream", async (s) => {
      if (callList.includes(id)) return;
      callList.push(id);
      addVideo(p, s, false, pre, pre);
    });
    if (pres) peer.call(p.peerId, pres, { metadata: { pres: true, id } });
  });
});

const updateVoiceOnline = () => {
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
        const pc = getProfile(r, true);
        pc.style.opacity = online[k].visible ? 1 : 0.5;
        bg.appendChild(pc);
        o.appendChild(bg);
      }
    });
};

const switchVoiceTheme = (dark = !user.theme, color) => {
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
    .querySelectorAll(".loading div")
    .forEach(
      (b) =>
        (b.style.background = user.theme
          ? "radial-gradient(#fff, transparent)"
          : "radial-gradient(#000, transparent)"),
    );
  
  if (color) {
    const rgb = toRgba(color, 1, true);
    const root = document.querySelector(":root");
    Object.keys(rgb).forEach((k) =>
      root.style.setProperty("--theme-" + k, rgb[k]),
    );
  }
  voice.emit("theme", user.theme);
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
  const c = document.querySelector(".person-" + user.peerId);
  if (user.camera) stream.getVideoTracks().forEach((v) => (v.enabled = true));
  else stream.getVideoTracks().forEach((v) => (v.enabled = false));
  c.querySelectorAll("#video").forEach((v) => {
    v.srcObject = stream;
    v.onmetadataloaded = () => v.play();
    v.style.display = user.camera ? "block" : "none";
  });
  voice.emit("camera", user.camera);
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
  if (user.audio) stream.getAudioTracks().forEach((v) => (v.enabled = true));
  else stream.getAudioTracks().forEach((v) => (v.enabled = false));
  const c = document.querySelector(".person-" + user.peerId);
  if (!c) return;
  c.querySelectorAll("div.a").forEach(
    (e) => (e.style.display = user.audio ? "block" : "none"),
  );
  c.querySelectorAll("#muted").forEach(
    (e) => (e.style.display = user.audio ? "none" : "block"),
  );
  voice.emit("audio", user.audio);
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
    voice.emit("present", user.peerId);
    pres.getVideoTracks()[0].onended = togglePresent;
    for (const e of callList) {
      if (e == peer.id || e.includes("pres")) return;
      const call = peer.call(e, pres, {
        metadata: { pres: true, id: "pres-" + peer.id },
      });
    }
    addVideo(user, pres, false, true, true);
  } else {
    present.style = "";
    if (pres)
      pres.getTracks().forEach((v) => {
        v.stop();
        pres.removeTrack(v);
      });
    for (const key in peer.connections) {
      const c = peer.connections[key];
      c.forEach((v) => {
        if (v.metadata.pres && v.metadata.id == "pres-" + user.peerId)
          v.close();
      });
    }
    removePerson(user, true);
    pres = null;
    voice.emit("present", null);
  }
};

cam.onclick = () => toggleCamera();
mic.onclick = () => toggleAudio();
leave.onclick = () => switchTab(document.querySelector("#messages"));

chatInput.onkeydown = (e) => {
  const i = chatInput.value;
  if (!i.replace(/\s/g, "").length) return;
  if (e.key != "Enter" || i.length == 0 || i.length > 250 || !voice.connected)
    return;
  voice.emit("chat message", i);
  chatInput.value = "";
};

voiceSend.onclick = (e) => {
  const i = chatInput.value;
  if (!i.replace(/\s/g, "").length) return;
  if (i.length == 0 || i.length > 250 || !voice.connected) return;
  voice.emit("chat message", i);
  chatInput.value = "";
};

toggleChat.onclick = () => {
  user.chat = !user.chat;
  if (user.chat)
    toggleChat.style.background =
      "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
  else toggleChat.style = "";
  const c = document.querySelector("#main-cont");
  c.classList.toggle("toggled");
  const ci = document.querySelector("#voice-chat-input");
  if (user.chat) ci.focus();
  else ci.blur();
};

present.onclick = togglePresent;

const updateTime = () => {
	requestAnimationFrame(updateTime);
  const t = document.querySelector("#time");
  t.innerHTML = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
};

updateTime();