const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");

const SERVER = "https://3sx4nn-3000.csb.app/";
const accessCode = bcrypt.hashSync(process.env.ACCESS_CODE, 10);
let profiles = {};

fetch(SERVER + "p")
  .then((r) => r.json())
  .then((r) => (profiles = r));

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
app.use((req, res, next) => {
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
