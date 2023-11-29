const peer = new Peer();
const conn = peer.connect();
const socket = io("/voice");
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
const input = document.querySelector("#chat-input");
const send = document.querySelector("#chat-send");
const chat = document.querySelector("#toggle-chat");
const present = document.querySelector("#toggle-presentation");
let stream = null;
let user = {}, profiles = {}, switched = {}, online = {}, callList = [];

const us = async () => {
	stream = await navigator.mediaDevices.getUserMedia({ video: { width: { min: 1280 }, height: { min: 720 } }, audio: true });
	stream.getVideoTracks().forEach(v => v.enabled = false);
	stream.getAudioTracks().forEach(v => v.enabled = false);
};

socket.on("chat message", addMessage);
socket.on("profiles", p => p ? profiles = p : "");
socket.on("user", async u => {
	const pec = document.querySelector("#people-container");
	pec.innerHTML = "";
	await us();
	user = u;
	switchTheme(user.theme, user.accent ? user.color : null);
	if (document.startViewTransition) {
		const transition = document.startViewTransition(() => addVideo(user, stream));
	} else addVideo(user, stream);
	if (user.id != 2) present.remove();
});
socket.on("online", u => {
	online = u;
	updateOnline();
});
socket.on("camera", ([camera, id]) => {
	switched[id].camera = camera;
	const v = document.querySelector("#video-" + id);
	if (!v) return;
	v.style.display = camera ? "block" : "none";
});
socket.on("audio", ([audio, id]) => {
	switched[id].audio = audio;
	const c = document.querySelector(".person-" + id);
	if (!c) return;
	c.querySelectorAll("div.a").forEach(e => e.style.display = audio ? "block" : "none");
	c.querySelectorAll("#muted").forEach(e => e.style.display = audio ? "none" : "block");
});
socket.on("switched", s => switched = s);
socket.on("redirect", d => window.location.href = d);

const addVideo = async (p, s, pres = false) => {
	const pec = document.querySelector("#people-container");
	const person = document.createElement("div");
	person.id = "person";
	person.className = "person-" + p.peerId;
	const video = document.createElement("video");
	video.id = "video-" + p.peerId;
	video.style.display = switched[p.peerId]?.camera || pres ? "block" : "none";
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
				 clipLag: 750
			 }
		 });
		node.port.onmessage = e => {
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
	name.innerText = p.name;
	person.appendChild(name);
	person.appendChild(m);
	const u = performance.now().toString().replace(".", "_") + Math.floor(Math.random() * 1000);
	person.style.viewTransitionName = u;
	pec.insertAdjacentHTML("beforeend", person.outerHTML);
};

const addPerson = p => {
	const call = peer.call(p.peerId, stream);
	call.on("stream", async s => {
		if (callList.includes(p.peerId)) return;
		callList.push(p.peerId);
		if (document.startViewTransition) {
			const transition = document.startViewTransition(() => addVideo(p, s));
		} else addVideo(p, s);
	});
};

socket.on("add person", addPerson);
socket.on("remove person", p => {
	if (p.peerId == user.peerId) return;
	const c = document.querySelectorAll(".person-" + p.peerId);
	c.forEach(e => e.remove());
});
peer.on("open", id => {
	socket.emit("id", id);
});
peer.on("call", call => {
	socket.emit("get switched", sw => {
		switched = sw;
		const p = Object.values(profiles).find(e => e.id == sw[Object.keys(sw).find(k => k == call.peer)].id);
		p.peerId = call.peer;
		call.answer(stream);
		call.on("stream", async s => {
			if (callList.includes(p.peerId)) return;
			callList.push(p.peerId);
			if (document.startViewTransition) {
				const transition = document.startViewTransition(() => addVideo(p, s));
			} else addVideo(p, s);
		});
	});
});

const updateOnline = () => {
	const o = document.querySelector("#online");
	o.innerHTML = "";
	Object.values(profiles).map(e => e.id).forEach(k => {
		const r = profiles[Object.keys(profiles).find(e => profiles[e].id == k)];
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
	document.querySelectorAll("#bg").forEach(b => b.style.background = user.theme ? "black" : "white");
	document.querySelector("meta[name=theme-color]").setAttribute("content", user.theme ? "#000014" : user.accent ? rgbToHex(toRgba(user.color)) : rgbToHex("rgb(0, 0, 255)"));
	document.querySelectorAll(".loading div").forEach(b => b.style.background = user.theme ? "white" : "black");
	document.querySelectorAll("#ring").forEach(b => b.style.borderColor = user.theme ? "#999" : "#fff");
	document.querySelectorAll("#vol").forEach(b => b.style.background = user.theme ? "#999" : "#fff");
	document.querySelectorAll("#meeting-cont #divider").forEach(b => b.style.background = user.theme ? "#fff" : "#000");
	if (color) {
		const rgb = toRgba(color, 1, true);
		const root = document.querySelector(":root");
		Object.keys(rgb).forEach(k => root.style.setProperty("--theme-" + k, rgb[k]));
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
		stream.getVideoTracks().forEach(v => v.enabled = true);
		c.muted = true;
		c.srcObject = stream;
		c.onloadedmetadata = () => c.play();
	} else {
		c.pause();
		c.src = null;
		stream.getVideoTracks().forEach(v => v.enabled = false);
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
	c.querySelectorAll("div.a").forEach(e => e.style.display = user.audio ? "block" : "none");
	c.querySelectorAll("#muted").forEach(e => e.style.display = user.audio ? "none" : "block");
	socket.emit("audio", user.audio);
};

cam.onclick = () => toggleCamera();
mic.onclick = () => toggleAudio();
leave.onclick = () => {
	if (window.opener) window.close();
	else window.location.href = "/chat";
};

input.onkeydown = e => {
	const i = input.value;
	if (!i.replace(/\s/g, "").length) return;
	if (e.key != "Enter" || i.length == 0 || i.length > 250 || !socket.connected) return;
	socket.emit("chat message", i);
	input.value = "";
};

send.onclick = e => {
	const i = input.value;
	if (!i.replace(/\s/g, "").length) return;
	if (i.length == 0 || i.length > 250 || !socket.connected) return;
	socket.emit("chat message", i);
	input.value = "";
};

chat.onclick = () => {
	user.chat = !user.chat;
	if (user.chat) chat.style.background = "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
	else chat.style = "";
	const c = document.querySelector("#main-cont");
	c.classList.toggle("toggled");
	const ci = document.querySelector("#chat-input");
	if (user.chat) ci.focus();
	else ci.blur();
};

present.onclick = async () => {
	user.present = !user.present;
	if (user.present) present.style.background = "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
	else present.style = "";
	const p = await navigator.mediaDevices.getDisplayMedia();
	if (document.startViewTransition) {
		const transition = document.startViewTransition(() => addVideo(user, p, true));
	} else addVideo(user, p, true);
	socket.emit("present", user.present);
};

if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) switchTheme(true);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();

const updateTime = () => {
	setTimeout(updateTime, 1000);
	const t = document.querySelector("#time");
	t.innerHTML = new Date().toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "numeric",
		hour12: true
	});
};

updateTime();