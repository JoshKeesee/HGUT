const socket = io("/voice");
const cam = document.querySelector("#toggle-cam");
const mic = document.querySelector("#toggle-mic");
const leave = document.querySelector("#leave-voice");
let stream = null;
let user = {}, profiles = {}, switched = {}, mobile = window.innerWidth < 700, online = {}, recordTime = 500;

const getProfile = (u, info = true) => {
	const pc = document.createElement("div");
	pc.id = "profile";
	pc.className = u.name.replaceAll(" ", "-");
	if (u.color) pc.style.background = toRgba(u.color, 0.5);
	if (u.profile) {
		const p = document.createElement("img");
		p.src = u.profile;
		pc.appendChild(p);
	} else {
		pc.innerText = u.name.split(" ").map(e => e[0]).join("");
	}
	if (info) {
		const i = document.createElement("div");
		i.id = "info";
		i.style.background = user.theme ? "black" : "white";
		const cont = document.createElement("div");
		cont.id = "info-container";
		const name = document.createElement("div");
		name.id = "name";
		name.innerText = u.name;
		const character = document.createElement("div");
		character.id = "character";
		character.innerText = u.character;
		const born = document.createElement("div");
		born.id = "character";
		born.innerText = "Born on " + u.dob;
		i.appendChild(pc.cloneNode(true));
		cont.appendChild(name);
		cont.appendChild(character);
		cont.appendChild(born);
		i.appendChild(cont);
		pc.appendChild(i);
	}
	return pc;
};

socket.on("profiles", p => p ? profiles = p : "");
socket.on("user", u => {
	user = u;
	switchTheme(user.theme, user.accent ? user.color : null);
});
socket.on("online", u => {
	online = u;
	updateOnline(true);
	if (!stream) updateStream();
});
socket.on("camera", ([camera, id]) => {
	switched[id].camera = camera;
	const c = document.querySelector("#video-" + id);
	c.style.display = camera ? "block" : "none";
	c.parentElement.querySelector("div").style.display = camera ? "none" : "block";
});
socket.on("update person", ([chunks, id]) => {
	const blob = new Blob(chunks);
	const src = URL.createObjectURL(blob);
	const c = document.createElement("video");
	c.id = "video-" + id;
	c.src = src;
	c.style.display = switched[id].camera ? "block" : "none";
	c.onloadedmetadata = () => {
		document.querySelector(".person-" + id).replaceChild(c, document.querySelector("#video-" + id));
		c.play();
	};
});
socket.on("switched", s => {
	switched = s;
	Object.keys(switched).forEach(k => {
		const ss = s[k];
		const u = profiles[Object.keys(profiles).find(e => profiles[e].id == k)];
		const c = document.querySelector("#video-" + u.id);
		c.style.display = ss.camera ? "block" : "none";
		c.parentElement.querySelector("div").style.display = ss.camera ? "none" : "block";
	});
});
socket.on("redirect", d => window.location.href = d);

const record = () => {
	const mr = new MediaRecorder(stream);
	mr.start();
	mr.ondataavailable = e => {
		record();
		if (user.camera || user.audio) socket.emit("update person", [e.data]);
	};
	setTimeout(() => mr.stop(), recordTime);
};

const updateOnline = (update = true) => {
	const o = document.querySelector("#online");
	o.innerHTML = "";
	const pec = document.querySelector("#people-container");
	if (update) pec.innerHTML = "";
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

		if (update) {
			const person = document.createElement("div");
			person.id = "person";
			person.className = "person-" + k;
			const video = document.createElement("video");
			video.id = "video-" + k;
			video.style.display = switched[k]?.camera ? "block" : "none";
			person.appendChild(video);
			person.appendChild(getProfile(r));
			pec.appendChild(person);
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
	if (color) {
		const rgb = toRgba(color, 1, true);
		const root = document.querySelector(":root");
		Object.keys(rgb).forEach(k => root.style.setProperty("--theme-" + k, rgb[k]));
	}
	socket.emit("theme", user.theme);
};

const updateStream = async () => {
	stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	stream.getAudioTracks()[0].enabled = false;
	record();
};

const toggleCamera = async (set = !user.camera) => {
	user.camera = set;
	if (user.camera) cam.style.background = "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.9)";
	else cam.style = "";
	const c = document.querySelector("#video-" + user.id);
	if (user.camera) {
		const s = await navigator.mediaDevices.getUserMedia({ video: true });
		stream.addTrack(s.getVideoTracks()[0]);
		c.muted = true;
		c.srcObject = stream;
		c.onloadedmetadata = () => c.play();
	} else {
		c.pause();
		c.srcObject = null;
		stream.getVideoTracks().forEach(v => {
			v.stop();
			stream.removeTrack(v);
		});
	}
	c.style.display = user.camera ? "block" : "none";
	c.parentElement.querySelector("div").style.display = user.camera ? "none" : "block";
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

document.onvisibilitychange = () => socket.emit("visible", document.visibilityState == "visible");

if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) switchTheme(true);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();