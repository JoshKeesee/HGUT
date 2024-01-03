const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");

const SERVER = "https://3sx4nn-3000.csb.app/";
let profiles = {}, accessCode = null;

fetch(SERVER + "p", {
	method: "POST",
	headers: {
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		passwords: true,
		accessCode: true,
	}),
})
  .then((r) => r.json())
  .then((r) => {
		profiles = r.profiles;
		accessCode = r.accessCode;
	});

const waitForProfiles = new Promise((resolve) => {
	const int = setInterval(() => {
		if (Object.keys(profiles).length > 0) {
			clearInterval(int);
			resolve();
		}
	});
});

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const auth = (req, res, next) => {
  const cancel = [
    "login",
    "css",
    "js",
    "profiles",
    "images",
    "manifest.json",
    "favicon.png",
    "big_icon.png",
    "sw.js",
  ];
  if (req.user || cancel.includes(req.url.split("/")[1])) return next();
  res.redirect("/login");
};
const getUser = (req) => {
  const user = req.cookies["user"];
  return profiles[user] ? profiles[user] : null;
};
app.use(async (req, res, next) => {
	await waitForProfiles;
  req.user = getUser(req);
	auth(req, res, next);
});
app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.redirect("/chat"));
app.get("/chat", (req, res) => res.sendFile(__dirname + "/public/chat.html"));
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
  res.cookie("user", username, {
    maxAge: 9999999999999,
    expires: new Date(Date.now() + 9999999999999),
  });
  res.redirect("back");
});
app.get("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
