const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const { get, set } = require("./db");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const accessCode = bcrypt.hashSync(process.env.ACCESS_CODE, 10);
const webpush = require("web-push");
const pushKeys = {
	public: process.env.PUBLIC_KEY,
	private: process.env.PRIVATE_KEY,
};
webpush.setVapidDetails("mailto:joshuakeesee1@gmail.com", pushKeys.public, pushKeys.private);
const profiles = require("./profiles.json");
Object.keys(profiles).forEach(p => {
	if (profiles[p].setPassword) {
		profiles[p].password = bcrypt.hashSync(profiles[p].setPassword, 10);
		delete profiles[p].setPassword;
	} else profiles[p].password = bcrypt.hashSync("password", 10);
});
fs.writeFileSync("profiles.json", JSON.stringify(profiles, null, 2));
const ioAuth = require("./io-auth");
const p = "./profiles";
const im = "./images";
const maxMessages = 50;
const online = {}, typing = {};

const setup = () => {
	if (!fs.existsSync(p)) fs.mkdirSync(p);
	if (!fs.existsSync(im)) fs.mkdirSync(im);
	if (!(get("rooms"))) set({
		rooms: {
			"main": {
				name: "Main",
				messages: [],
				allowed: "all",
			},
			"writers": {
				name: "Writers",
				messages: [],
				allowed: "all",
			},
			"disease": {
				name: "\"The Disease\"",
				messages: [],
				allowed: [2, 3, 4, 6],
			},
		},
	});
	if (!get("users")) set({ users: {} });
	Object.keys(get("rooms")).forEach(k => typing[k] = []);
};

setup();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const auth = (req, res, next) => {
	const cancel = ["login", "css", "js", "profiles", "images", "manifest.json", "favicon.png", "sw.js"];
	if (req.user || cancel.includes(req.url.split("/")[1])) return next();
	res.redirect("/login");
};
const getUser = req => {
	const user = req.cookies["user"];
	return profiles[user] ? profiles[user] : null;
};
app.use((req, _next, next) => {
	req.user = getUser(req);
	next();
});
app.use(auth);
app.use(express.static(__dirname + "/public"));
app.use("/profiles", express.static(__dirname + "/profiles"));
app.use("/images", express.static(__dirname + "/images"));
app.get("/", (req, res) => res.redirect("/chat"));
app.get("/chat", (req, res) => res.sendFile(__dirname + "/public/chat.html"));
app.get("/voice", (req, res) => res.sendFile(__dirname + "/public/voice.html"));
app.get("/login", (req, res) => {
	if (req.user) return res.redirect("/chat");
	res.sendFile(__dirname + "/public/login.html");
});
app.post("/login", (req, res) => {
	const username = req.body["name"];
	const password = req.body["password"];
	const ac = req.body["access-code"];
	if (!bcrypt.compareSync(ac, accessCode)) return res.redirect("/login");
	if (!username) return res.redirect("/login");
	if (!profiles[username]) return res.redirect("/login");
	const p = profiles[username].password;
	if (!bcrypt.compareSync(password, p)) return res.redirect("/login");
	res.cookie("user", username, { maxAge: 9999999999999, expires: new Date(Date.now() + 9999999999999) });
	res.redirect("back");
});
app.post("/subscribe", (req, res) => {
	if (!req.user) return res.status(201).json({});
	const subscriptions = get("subscriptions") || {};
	const s = req.body;
	if (!subscriptions[req.user.id]) subscriptions[req.user.id] = [];
	if (!subscriptions[req.user.id].length) subscriptions[req.user.id] = [subscriptions[req.user.id]];
	if (subscriptions[req.user.id].includes(s)) return;
	subscriptions[req.user.id].push(s);
	set({ subscriptions });
	res.status(201).json({});
});
app.post("/message", (req, res) => {
	if (!req.user) return res.status(201).json({});
	const r = req.body;
	req.user.room = r.room;
	sendMessage(r.message, req.user, "chat", true);
});

io.of("chat").use(ioAuth);
io.of("voice").use(ioAuth);

io.of("voice").on("connection", socket => {
	if (!socket.user) return socket.emit("redirect", "/login");
	const curr = "voice";
	if (!online[curr]) online[curr] = {};
	const o = online[curr];
	o[socket.user.id] = { visible: true, room: socket.user.room };

	socket.emit("user", socket.user);
	socket.emit("profiles", profiles);
	const switched = {}, users = get("users") || {};
	Object.keys(o).forEach(id => {
		if (id == socket.user.id) return;
		const user = users[id];
		switched[id] = { camera: user.camera, audio: user.audio };
	});
	io.of(curr).emit("online", o);
	socket.emit("switched", switched);

	socket.on("theme", t => socket.user.theme = t);
	socket.on("visible", v => {
		o[socket.user.id].visible = v;
		io.of(curr).emit("online", o);
	});
	socket.on("camera", c => {
		socket.user.camera = c;
		socket.broadcast.emit("camera", [c, socket.user.id]);
	});
	socket.on("audio", a => socket.user.audio = a);
	socket.on("update person", c => socket.broadcast.emit("update person", [c, socket.user.id]));

	socket.on("disconnect", () => {
		delete o[socket.user.id];
		io.of(curr).emit("online", o);
	});
});

io.of("chat").on("connection", socket => {
	if (!socket.user) return socket.emit("redirect", "/login");
	socket.user.sid = socket.id;
	const users = get("users") || {};
	users[socket.user.id] = socket.user;
	set({ users });
	const curr = "chat";
	if (!online[curr]) online[curr] = {};
	const o = online[curr];
	o[socket.user.id] = { visible: true, room: socket.user.room };

	socket.join(socket.user.room);
	socket.emit("user", socket.user);
	const cr = {};
	const r = get("rooms") || {};
	Object.keys(r).forEach(k => {
		const v = r[k];
		if (socket.user.room == k) v.messages = v.messages.slice(-maxMessages);
		else delete v.messages;
		cr[k] = v;
	});
	socket.emit("rooms", [cr, profiles]);
	socket.emit("typing", typing[socket.user.room]);
	socket.emit("unread", socket.user.unread);
	io.of(curr).emit("online", o);

	socket.on("theme", t => socket.user.theme = t);
	socket.on("visible", v => {
		if (!o[socket.user.id]) o[socket.user.id] = { visible: true, room: socket.user.room };
		o[socket.user.id].visible = v;
		io.of(curr).emit("online", o);
	});
	socket.on("typing", t => {
		if (t && !typing[socket.user.room].includes(socket.user.id)) typing[socket.user.room].push(socket.user.id);
		else if (!t && typing[socket.user.room].includes(socket.user.id)) typing[socket.user.room].splice(typing[socket.user.room].indexOf(socket.user.id), 1);
		io.of(curr).to(socket.user.room).emit("typing", typing[socket.user.room]);
	});

	socket.on("disconnect", () => {
		const users = get("users") || {};
		users[socket.user.id] = socket.user;
		delete o[socket.user.id];
		if (typing[socket.user.room].includes(socket.user.id)) typing[socket.user.room].splice(typing[socket.user.room].indexOf(socket.user.id), 1);
		io.of(curr).to(socket.user.room).emit("typing", typing[socket.user.room]);
		io.of(curr).emit("online", o);
		set({ users });
	});

	socket.on("chat message", message => {
		sendMessage(message, socket.user, curr);
	});

	socket.on("load messages", lm => {
		const rooms = get("rooms");
		const m = rooms[socket.user.room].messages;
		socket.emit("load messages", m.slice(Math.max(0, m.length - lm - maxMessages), Math.max(0, m.length - lm)));
	});

	socket.on("join room", (room, cb) => {
		const rooms = get("rooms");
		if (!rooms[room]) {
			const u = room.split("-").map(e => Number(e));
			if (rooms[u[1] + "-" + u[0]]) room = u[1] + "-" + u[0];
			else if (u[0] == socket.user.id || u[1] == socket.user.id) {
				typing[room] = [];
				rooms[room] = {
					name: room,
					messages: [],
					allowed: u,
				};
				set({ rooms });
			} else return;
		}
		if (!rooms[room].allowed.includes(socket.user.id) && rooms[room].allowed != "all") return;
		if (typing[socket.user.room].includes(socket.user.id)) typing[socket.user.room].splice(typing[socket.user.room].indexOf(socket.user.id), 1);
		socket.leave(socket.user.room);
		io.of(curr).to(socket.user.room).emit("typing", typing[socket.user.room]);
		socket.user.room = room;
		if (!o[socket.user.id]) o[socket.user.id] = { visible: true, room: socket.user.room };
		o[socket.user.id].room = socket.user.room;
		io.of(curr).emit("online", o);
		socket.join(socket.user.room);
		if (socket.user.unread.includes(socket.user.room)) socket.user.unread.splice(socket.user.unread.indexOf(socket.user.room), 1);
		const users = get("users") || {};
		users[socket.user.id] = socket.user;
		set({ users });
		socket.emit("typing", typing[socket.user.room]);
		socket.emit("join room", [rooms[socket.user.room].messages.slice(-maxMessages), room, socket.user.unread]);
	});
});

const upload = file => {
	if (!file.includes("data:")) return file;
	const ext = file.split(";")[0].split("/")[1];
	const length = fs.readdirSync(im).length;
	const name = im + "/" + length + "." + ext;
	fs.writeFileSync(name, Buffer.from(file.split(",")[1], "base64"));
	return name.replace(".", "");
};

const sendMessage = (message, us, curr, p = false) => {
	const o = online["chat"];
	let isImage = false;
	if (!message) return;
	if (message.includes("data:")) {
		message = upload(message);
		isImage = true;
	}
	if (message.length > 250) return;
	const rooms = get("rooms");
	rooms[us.room].messages.push({ message, name: us.name, date: new Date() });
	set({ rooms });
	const users = get("users") || {};
	const subscriptions = get("subscriptions") || {};
	const a = rooms[us.room].allowed == "all" ? Object.keys(users) : rooms[us.room].allowed;
	a.forEach(a => {
		const u = users[a];
		if (!u) return;
		if (subscriptions[u.id] && !o[u.id]?.visible) {
			const n = rooms[us.room].name;
			const payload = JSON.stringify({
				title: `${us.name}${!rooms[n] ? " in " + n : ""}`,
				body: `${!isImage ? message : " sent an image"}`,
				image: isImage ? message : false,
				icon: profiles[us.name].profile,
				tag: us.room,
				actions: [{
					title: "Reply",
					action: "reply",
					type: "text",
				}],
			});
			if (!subscriptions[u.id].length) subscriptions[u.id] = [subscriptions[u.id]];
			subscriptions[u.id].forEach(e => {
				webpush.sendNotification(e, payload);
			});
		}
		if (!o[u.id] || u.id == us.id || u.room == us.room) return;
		if (!u.unread) u.unread = [];
		if (!u.unread.includes(us.room)) {
			u.unread.push(us.room);
		}
		io.of(curr).to(u.sid).emit("unread", u.unread);
	});
	set({ users });
	if (typing[us.room].includes(us.id) && !p) typing[us.room].splice(typing[us.room].indexOf(us.id), 1);
	if (!p) io.of(curr).to(us.room).emit("typing", typing[us.room]);
	io.of(curr).to(us.room).emit("chat message", [message, us, new Date()]);
};

server.listen(3000, () => console.log("Server listening on port 3000"));