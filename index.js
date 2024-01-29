const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const ejs = require("ejs");

const uglify = require("uglify-js");
const fs = require("fs");
const path = require("path");

app.engine("html", ejs.renderFile);

const prod = process.env.NODE_ENV == "production";

if (prod) {
  const p = path.join(__dirname, "public");
  let min = "";

  const files = [
    "js/worklet.js",
    "js/main.js",
    "js/reg.js",
    "js/voice.js",
    "js/music.js",
    "js/files.js",
    "js/settings.js",
    "js/camera.js",
    "js/chat.js",
    "js/animateGrid.js",
  ];

  for (const file of files) min += fs.readFileSync(path.join(p, file), "utf8");

  const uglified = uglify.minify(min);
  fs.writeFileSync(path.join(p, "min.js"), uglified.code);
}

const SERVER = "https://3sx4nn-3000.csb.app/";
let profiles = {},
  accessCode = null;

const getProfiles = () => {
  fetch(SERVER + "p", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
    })
    .catch((e) => getProfiles());
};

getProfiles();

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
    "Product-Sans.woff2",
  ];
  if (req.user || cancel.includes(req.url.split("/")[1])) return next();
  res.redirect("/login");
};
const getUserData = async (req) => {
  const user = req.cookies["user"];
  return new Promise((res) => {
    if (!profiles[user]) return res({});
    fetch(SERVER + "user-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        user: profiles[user].id,
      }),
    })
      .then((r) => r.json())
      .then((r) => res(r))
      .catch(() => res({ error: true }));
  });
};
app.use(async (req, res, next) => {
  await waitForProfiles;
  let u = { error: true };
  while (u.error) u = await getUserData(req);
  req.user = u.user;
  req.userData = u;
  req.userData.tab = req.query.tab || "messages";
  req.userData.production = prod;
  auth(req, res, next);
});
app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.redirect("/chat"));
app.get("/chat", (req, res) =>
  res.render(__dirname + "/public/chat.html", req.userData),
);
app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/chat");
  res.sendFile(__dirname + "/public/login.html");
});
app.post("/login", (req, res) => {
  const username = req.body["name"];
  const password = req.body["password"];
  const ac = req.body["access-code"];
  if (!username) return res.json({ error: "Please enter a username" });
  if (!password) return res.json({ error: "Please enter a password" });
  if (!ac) return res.json({ error: "Please enter an access code" });
  if (!bcrypt.compareSync(ac, accessCode))
    return res.json({ error: "Invalid access code" });
  if (!profiles[username]) return res.json({ error: "Invalid username" });
  const p = profiles[username].password;
  if (!bcrypt.compareSync(password, p))
    return res.json({ error: "Invalid password" });
  res.cookie("user", username, {
    maxAge: 9999999999999,
    expires: new Date(Date.now() + 9999999999999),
  });
  res.json({ success: true, redirect: "/chat" });
});
app.get("/logout", (req, res) => {
  res.clearCookie("user");
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
