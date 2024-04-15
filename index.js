const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");

const SERVER = "https://2ms7px-3000.csb.app/";
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

const waitForProfiles = () => {
  return new Promise((resolve) => {
    const int = setInterval(() => {
      if (Object.keys(profiles).length > 0) {
        clearInterval(int);
        resolve();
      }
    });
  });
};

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const auth = (req, res, next) => {
  const cancel = [
    "login",
    "css",
    "js",
    "manifest.json",
    "favicon.png",
    "big_icon.png",
    "sw.js",
    "Product-Sans.woff2",
  ];
  if (req.user || cancel.includes(req.url.split("/")[1])) return next();
  res.redirect("/login");
};
app.use(async (req, res, next) => {
  await waitForProfiles();
  req.user = profiles[req.cookies["user"]];
  auth(req, res, next);
});
app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => res.redirect("/chat"));
app.get("/chat", (req, res) => res.sendFile(__dirname + "/public/chat.html"));
app.get("/login", (req, res) => {
  if (req.user) return res.redirect("/chat");
  res.sendFile(__dirname + "/public/login.html");
});
app.post("/login", async (req, res) => {
  profiles = {};
  getProfiles();
  await waitForProfiles();
  const username = req.body["name"];
  const password = req.body["password"];
  const ac = req.body["access-code"];
  if (!username) return res.json({ error: "Please enter a username" });
  if (!password) return res.json({ error: "Please enter a password" });
  if (!ac) return res.json({ error: "Please enter an access code" });
  if (!bcrypt.compareSync(ac, accessCode))
    return res.json({ error: "Invalid access code" });
  if (!profiles[username]) return res.json({ error: "Invalid username" });
  if (profiles[username].id < 0) return res.json({ error: "Invalid username" });
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

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
