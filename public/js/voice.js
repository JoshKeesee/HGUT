const peer = new Peer();
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
const chatInput = document.querySelector("#voice-chat-input");
const voiceSend = document.querySelector("#voice-chat-send");
const toggleChat = document.querySelector("#toggle-chat");
const present = document.querySelector("#toggle-presentation");
const toggleEmoji = document.querySelector("#toggle-emojis");
const emojiReactions = document.querySelector("#emoji-reactions");
let emojis = [];
const maxCustomEmojis = 6;
const emojiAnimations = [
  "bounce",
  "spin",
  "zoom",
  "slide",
  "slide",
  "grow",
  "shake",
  "wobble",
  "tada",
  "jello",
];
const setEmojis = () => {
  emojis = [
    "😁",
    "😃",
    "😂",
    "👍",
    "👎",
    "😲",
    "😴",
    "😭",
    "😡",
    "🦶",
    ...(user.emojis || []),
  ];
  const ec = document.querySelector("#emoji-cont");
  ec.innerHTML = "";
  for (const e of emojis) {
    const emoji = document.createElement("div");
    emoji.classList.add("emoji");
    emoji.innerText = e;
    ec.appendChild(emoji);
    emoji.onclick = () => {
      voice.emit("react emoji", emoji.innerText);
      createEmojiReaction(emoji.innerText, user.name);
    };
  }
};
setEmojis();
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
const audConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 44100,
};

const createEmptyAudioTrack = () => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const dst = oscillator.connect(ctx.createMediaStreamDestination());
  oscillator.start();
  const track = dst.stream.getAudioTracks()[0];
  return Object.assign(track);
};

const createEmptyVideoTrack = () => {
  const canvas = Object.assign(document.createElement("canvas"), {
    width: 1,
    height: 1,
  });
  canvas.getContext("2d").fillRect(0, 0, 1, 1);
  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];
  return Object.assign(track);
};

peer.on("open", (id) => (peerId = id));

const peerConnect = () => {
  return new Promise((res) => {
    if (peerId) return res();
    peer.on("open", (id) => {
      peerId = id;
      res();
    });
  });
};

const getTrack = async (type, constraints) => {
  const s = await navigator.mediaDevices
    .getUserMedia({
      [type]: constraints,
    })
    .catch((e) => console.error(e));
  return s?.getTracks()[0];
};

const us = async () => {
  if (stream) return;
  await navigator.mediaDevices
    .getUserMedia({
      video: vidConstraints,
      audio: audConstraints,
    })
    .catch(() => {});
  const vt =
    (await getTrack("video", vidConstraints)) || createEmptyVideoTrack();
  const at =
    (await getTrack("audio", audConstraints)) || createEmptyAudioTrack();
  stream = new MediaStream([vt, at]);
  stream.getTracks().forEach((t) => (t.enabled = false));
};

voice.on("connect", async () => {
  createStatus("Connected", "success");
  await peerConnect();
  await us();
  user.peerId = peerId;
  voice.emit("id", user.peerId);
});
voice.on("disconnect", () => {
  const t = getCurrentTab();
  if (t != "voice") return;
  createStatus("Disconnected", "error");
  const i = (msg = true) => {
    if (getCurrentTab() != "voice") return;
    if (voice.connected) return (currMessages = maxMessages);
    if (msg) createStatus("Reconnecting...", "info");
    voice.connect();
    setTimeout(() => i(), 10000);
  };
  i(false);
});
voice.on("chat message", ([msg, u, d]) => {
  const vcm = document.querySelector("#voice-chat-messages");
  const id = vcm.querySelectorAll("#chat-message").length;
  const l = vcm.querySelectorAll("#chat-message")[id - 1];
  const ld = l ? l.parentElement.querySelector("#time").innerText : null;
  const lastDate = new Date();
  if (ld) {
    const t = ld.split(" ").find((e) => e.includes(":"));
    const h = parseInt(t.split(":")[0]);
    const m = parseInt(t.split(":")[1]);
    const ldt = ld.split(" ").find((e) => e.includes("M")) == "AM" ? h * 60 + m : h * 60 + m + 720;
    lastDate.setHours(Math.floor(ldt / 60));
    lastDate.setMinutes(ldt % 60);
    lastDate.setSeconds(0);
    lastDate.setMilliseconds(0);
  }
  const lm = l ? { date: lastDate } : null;
  addMessage([msg, u, d, lm, id]);
});
voice.on("profiles", (p) => (p ? (profiles = p) : ""));
voice.on("user", async (u) => {
  user = u;
  user.visible = document.visibilityState == "visible";
  await us();
  const pec = document.querySelector("#people-container");
  pec.innerHTML = "";
  switchTheme(user.settings.theme, user.settings.accent ? user.color : null);
  addNewVideo(user, stream, true);
  updateVoiceOnline();
});
voice.on("online", (u) => {
  online = u;
  updateVoiceOnline();
});
voice.on("person joined", (u) => {
  createStatus(u.name + " joined", "person", u);
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

const addNewVideo = async (p, s, self = false, big = false, pre = false) => {
  const pec = document.querySelector("#people-container");
  const after = async () => {
    const id = pre ? "pres-" + p.peerId : p.peerId;
    const bg = document.createElement("div");
    bg.id = "bg";
    bg.classList.add("bg-" + id);
    if (big) bg.classList.add("big");
    const person = document.createElement("div");
    person.id = "person";
    person.classList.add("person-" + id);
    person.style.background = p.peerId == user.peerId && !user.settings.accent ? "" : toRgba(p.color, 0.4);
    if (self) person.classList.add("self");
    if (pre) person.classList.add("pres");
    const video = document.createElement("video");
    video.id = "video";
    video.style.display = switched[id]?.camera || pre ? "block" : "none";
    video.muted = true;
    video.onloadedmetadata = () => {
      const i = () => video.play().catch(() => setTimeout(i, 1000));
      i();
    };
    video.srcObject = s;
    const audio = document.createElement("audio");
    audio.id = "audio";
    audio.style.display = "none";
    if (s.getAudioTracks()[0]) {
      audio.onloadedmetadata = () => {
        const i = () => audio.play().catch(() => setTimeout(i, 1000));
        i();
      };
      if (p.peerId == user.peerId) audio.muted = true;
      audio.srcObject = new MediaStream([s.getAudioTracks()[0]]);
    }
    const m = document.createElement("div");
    m.id = "muted";
    m.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512" fill="currentColor">
			<path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L472.1 344.7c15.2-26 23.9-56.3 23.9-88.7V216c0-13.3-10.7-24-24-24s-24 10.7-24 24v40c0 21.2-5.1 41.1-14.2 58.7L416 300.8V96c0-53-43-96-96-96s-96 43-96 96v54.3L38.8 5.1zM344 430.4c20.4-2.8 39.7-9.1 57.3-18.2l-43.1-33.9C346.1 382 333.3 384 320 384c-70.7 0-128-57.3-128-128v-8.7L144.7 210c-.5 1.9-.7 3.9-.7 6v40c0 89.1 66.2 162.7 152 174.4V464H248c-13.3 0-24 10.7-24 24s10.7 24 24 24h72 72c13.3 0 24-10.7 24-24s-10.7-24-24-24H344V430.4z"/>
		</svg>
 `;
    m.style.display = switched[p.peerId]?.audio ? "none" : "block";
    const pr = getProfile(p, false);
    const a = s?.getAudioTracks().length > 0;
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
    if (!pre) person.appendChild(audio);
    person.appendChild(pr);
    const name = document.createElement("div");
    name.id = "name";
    name.innerText = p.peerId == user.peerId ? p.name + " (You)" : p.name;
    person.appendChild(name);
    person.appendChild(m);
    bg.appendChild(person);
    pec.appendChild(bg);
  };
  animateGrid(pec, after, {
    sync: true,
  });
};

const addPerson = (p) => {
  if (p.peerId == user.peerId) return;
  const call = peer.call(p.peerId, stream, {
    metadata: { pres: false, id: user.peerId },
  });
  call.on("stream", async (s) => {
    if (callList.includes(p.peerId)) return;
    callList.push(p.peerId);
    addNewVideo(p, s);
  });
};

const removePerson = (p, pre = false) => {
  if (p.peerId == user.peerId && !pre) return;
  const pec = document.querySelector("#people-container");
  const after = () => {
    const i = p.present ? "pres-" + p.peerId : p.peerId;
    if (callList.includes(i)) callList.splice(callList.indexOf(i), 1);
    const id = pre ? "pres-" + p.peerId : p.peerId;
    const c = document.querySelectorAll(".person-" + id);
    c.forEach((e) => e?.parentElement.remove());
  };
  animateGrid(pec, after);
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
      addNewVideo(p, s, false, pre, pre);
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
      const r = findProfile(k);
      if (!Object.keys(online).includes(k.toString())) return;
      if (k != user.id) {
        const bg = document.createElement("div");
        bg.id = "bg";
        const pc = getProfile(r, true);
        pc.style.opacity = online[k].visible ? 1 : 0.5;
        bg.appendChild(pc);
        o.appendChild(bg);
      }
    });
};

const toggleCamera = async (set = !user.camera) => {
  const s = await navigator.mediaDevices
    .getUserMedia({ video: true })
    .catch((e) => {
      console.error(e);
      if (e.name == "NotAllowedError") return e;
    });
  if (s instanceof Error) return createStatus("Camera access denied", "error");
  if (!s) createStatus("Camera not found", "error");
  user.camera = stream && s ? set : false;
  if (user.camera) {
    cam.classList.remove("toggled");
    cam.querySelector("svg.on").style.display = "block";
    cam.querySelector("svg.off").style.display = "none";
    stream.getVideoTracks().forEach((v) => (v.enabled = true));
  } else {
    cam.classList.add("toggled");
    cam.querySelector("svg.on").style.display = "none";
    cam.querySelector("svg.off").style.display = "block";
    stream.getVideoTracks().forEach((v) => (v.enabled = false));
  }
  const c = document.querySelector(".person-" + user.peerId);
  c.querySelectorAll("#video").forEach((v) => {
    if (!user.camera) v.srcObject = null;
    else {
      v.srcObject = stream;
      v.onmetadataloaded = () => v.play();
    }
    v.style.display = user.camera ? "block" : "none";
  });
  voice.emit("camera", user.camera);
};

const toggleAudio = async (set = !user.audio) => {
  const s = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch((e) => {
      console.error(e);
      if (e.name == "NotAllowedError") return e;
    });
  if (s instanceof Error)
    return createStatus("Microphone access denied", "error");
  if (!s) return createStatus("Microphone not found", "error");
  user.audio = stream && s ? set : false;
  if (user.audio) {
    mic.classList.remove("toggled");
    mic.querySelector("svg.on").style.display = "block";
    mic.querySelector("svg.off").style.display = "none";
    stream.getAudioTracks().forEach((v) => (v.enabled = true));
  } else {
    mic.classList.add("toggled");
    mic.querySelector("svg.on").style.display = "none";
    mic.querySelector("svg.off").style.display = "block";
    stream.getAudioTracks().forEach((v) => (v.enabled = false));
  }
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
    present.style.background = "rgba(var(--r), var(--g), var(--b), 0.9)";
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
    addNewVideo(user, pres, false, true, true);
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
  const i = chatInput.innerHTML,
    ml = 1000;
  if (e.key == "Enter") e.preventDefault();
  if (i.length > ml) {
    e.preventDefault();
    chatInput.innerHTML = i.slice(0, ml);
  }
  if (!i.replace(/\s/g, "").length) return;
  if (
    e.key != "Enter" ||
    i.length == 0 ||
    i.length > 250 ||
    !voice.connected ||
    e.shiftKey
  )
    return;
  voice.emit("chat message", i);
  chatInput.innerHTML = "";
};

chatInput.onpaste = (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  chatInput.innerHTML += text;
  chatInput.innerHTML = chatInput.innerHTML.slice(0, 1000);
};

toggleChat.onclick = () => {
  const pec = document.querySelector("#people-container"),
    c = document.querySelector("#main-cont"),
    ci = document.querySelector("#voice-chat-input");
  let t;
  animateGrid(
    pec,
    () => {
      c.getAnimations().forEach((a) => a.cancel());
      toggleChat.classList.toggle("toggled");
      t = toggleChat.classList.contains("toggled");
      if (t) {
        toggleChat.style.background = "rgba(var(--r), var(--g), var(--b), 0.9)";
        c.classList.add("toggled");
        ci.focus();
      } else {
        toggleChat.style = "";
        c.classList.remove("toggled");
        ci.blur();
      }
    },
    {},
    () => {
      const n = [
        "100% 0",
        window.innerWidth > 700 ? "calc(100% - 300px) 300px" : "0 100%",
      ];
      c.animate(
        { gridTemplateColumns: t ? n : n.reverse() },
        { duration: 200, easing: "ease" },
      );
    },
  );
};

present.onclick = togglePresent;

toggleEmoji.onclick = () => {
  const pec = document.querySelector("#people-container");
  let t;
  const a = () => {
    emojiReactions.getAnimations().forEach((a) => a.cancel());
    toggleEmoji.classList.toggle("toggled");
    t = toggleEmoji.classList.contains("toggled");
    if (t) {
      toggleEmoji.style.background = "rgba(var(--r), var(--g), var(--b), 0.9)";
      emojiReactions.classList.remove("closed");
    } else {
      toggleEmoji.style = "";
      emojiReactions.classList.add("closed");
    }
  };
  animateGrid(pec, a, {}, () => {
    const n = ["0", "55px"];
    emojiReactions.animate(
      { height: t ? n : n.reverse() },
      { duration: 200, easing: "ease" },
    );
  });
};

const createEmojiReaction = (emoji, u) => {
  const a = emojiAnimations[emojis.indexOf(emoji)];
  const d = Math.random() * (6 - 2) + 2,
    fs = Math.floor(Math.random() * (70 - 40) + 40);
  const e = document.createElement("div");
  e.classList.add("emoji-react");
  e.style.left = `clamp(0%, ${Math.floor(Math.random() * 100)}%, calc(100% - ${
    fs * 1.5
  }px))`;
  e.style.animationDuration = d + "s";
  const em = document.createElement("div");
  em.style.fontSize = fs + "px";
  em.innerText = emoji;
  if (a) {
    em.style.animationName = "emoji-" + a;
    em.style.animationDuration = Math.random() * (4 - 1) + 1 + "s";
    em.style.animationIterationCount = "infinite";
    em.style.animationTimingFunction = "ease-in-out";
  }
  const n = document.createElement("div");
  n.classList.add("name");
  n.innerText = u;
  e.appendChild(em);
  e.appendChild(n);
  setTimeout(() => e.remove(), d * 1000);
  document.querySelector("#emoji-display").appendChild(e);
};

voice.on("react emoji", ([e, u]) => createEmojiReaction(e, u));

const updateTime = () => {
  setTimeout(updateTime, 1000);
  const t = document.querySelectorAll("#voice-time");
  t.forEach(
    (t) =>
      (t.innerHTML = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })),
  );
};

updateTime();
