const peer = new Peer();
const conn = peer.connect();
const socket = io("/voice");
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
const input = document.querySelector("#chat-input");
const send = document.querySelector("#chat-send");
const chat = document.querySelector("#toggle-chat");
let stream = null;
let user = {}, profiles = {}, switched = {}, mobile = window.innerWidth < 700, online = {}, callList = [];

socket.on("chat message", addMessage);
socket.on("profiles", p => p ? profiles = p : "");
socket.on("user", u => {
	const pec = document.querySelector("#people-container");
	pec.innerHTML = "";
	user = u;
	switchTheme(user.theme, user.accent ? user.color : null);
	addVideo(user, stream);
});
socket.on("online", u => {
	online = u;
	updateOnline();
});
socket.on("camera", ([camera, id]) => {
	switched[id].camera = camera;
	const c = document.querySelector("#video-" + id);
	if (!c) return;
	c.style.display = camera ? "block" : "none";
	c.parentElement.querySelector("div").style.display = camera ? "none" : "block";
});
socket.on("switched", s => switched = s);
socket.on("redirect", d => window.location.href = d);

const addVideo = (p, s) => {
	const pec = document.querySelector("#people-container");
	const person = document.createElement("div");
	person.id = "person";
	person.className = "person-" + p.peerId;
	const video = document.createElement("video");
	video.id = "video-" + p.peerId;
	video.style.display = switched[p.peerId]?.camera ? "block" : "none";
	video.srcObject = s;
	video.onloadedmetadata = () => {
		video.play();
	};
	const pr = getProfile(p, false);
	pr.style.display = switched[p.peerId]?.camera ? "none" : "block";
	person.appendChild(video);
	person.appendChild(pr);
	pec.appendChild(person);
};

const addPerson = p => {
	const call = peer.call(p.peerId, stream);
	call.on("stream", s => {
		if (callList.includes(p.peerId)) return;
		callList.push(p.peerId);
		addVideo(p, s);
	});
};

socket.on("add person", addPerson);
socket.on("remove person", p => {
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
		call.on("stream", s => {
			if (callList.includes(p.peerId)) return;
			callList.push(p.peerId);
			addVideo(p, s);
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
	if (color) {
		const rgb = toRgba(color, 1, true);
		const root = document.querySelector(":root");
		Object.keys(rgb).forEach(k => root.style.setProperty("--theme-" + k, rgb[k]));
	}
	socket.emit("theme", user.theme);
};

(async () => {
	stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	stream.getVideoTracks().forEach(v => v.enabled = false);
	stream.getAudioTracks().forEach(v => v.enabled = false);
})();

const toggleCamera = async (set = !user.camera) => {
	user.camera = set;
	if (user.camera) cam.style.background = "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
	else cam.style = "";
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
	c.parentElement.querySelectorAll("div").forEach(e => e.style.display = user.camera ? "none" : "block");
	socket.emit("camera", user.camera);
};

const toggleAudio = async (set = !user.audio) => {
	user.audio = set;
	if (user.audio) mic.style.background = "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
	else mic.style = "";
	stream.getAudioTracks()[0].enabled = user.audio;
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
	const c = document.querySelector("#main-cont");
	c.classList.toggle("toggled");
};

document.onvisibilitychange = () => socket.emit("visible", document.visibilityState == "visible");

if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) switchTheme(true);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();