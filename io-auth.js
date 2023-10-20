const cookie = require("cookie");
const db = require("@jkeesee/json-db");
const profiles = require("./profiles.json");

module.exports = (socket, next) => {
	const h = socket.handshake.headers;
	if (!h.cookie) return next();
	const username = cookie.parse(h.cookie)["user"];
	if (username) {
		const users = db.get("users") || {};
		const r = db.get("rooms") || {};
		const u = users[profiles[username].id];
		socket.user = {
			...profiles[username],
			room: u?.room || Object.keys(r)[0],
			unread: u.unread?.length > 0 ? u.unread : [],
			theme: typeof u?.theme != "undefined" ? u.theme : false,
			menu: typeof u?.menu != "undefined" ? u.menu : true,
			camera: false,
			audio: false,
		};
	}
	next();
}