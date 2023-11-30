const SERVER = "https://3sx4nn-3000.csb.app/";
const icon = document.querySelector("#icon");

let missed = 0,
  loadingMessages = false;

const toRgba = (hex, alpha, obj) => {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  if (obj) return { r, g, b };
  else if (alpha) return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  else return "rgb(" + r + ", " + g + ", " + b + ")";
};

const rgbToHex = (rgb) =>
  "#" +
  rgb
    .replace("rgb(", "")
    .replace(")", "")
    .split(", ")
    .map((x) => {
      x = user.theme ? Math.max(x - 235, 0) : Math.min(x + 230, 255);
      const hex = Number(x).toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    })
    .join("");

icon.onclick = () => (window.location.href = "/");

const linkify = (s, scroll = false, smooth = false, start = false) => {
  const urlPattern =
    /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
  const pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  const emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
  const emojiPattern = /\p{Extended_Pictographic}/gu;
  if (s.startsWith("/images/"))
    return `<img src="${
      SERVER + s
    }" onload="const cms = document.getElementById('#chat-messages'); if (${
      scroll && smooth
    }) cms.scrollTo({ top: cms.scrollHeight, behavior: 'smooth' })">`;
  if (s.replace(emojiPattern, "").length == 0) return `<p id="emoji">${s}</p>`;
  return s
    .replace(urlPattern, "<a target='_blank' href='$&'>$&</a>")
    .replace(pseudoUrlPattern, "$1<a target='_blank' href='http://$2'>$2</a>")
    .replace(emailAddressPattern, "<a target='_blank' href='mailto:$&'>$&</a>");
};

const getProfile = (u, info = true) => {
  const pc = document.createElement("div");
  pc.id = "profile";
  pc.className = u.name.replaceAll(" ", "-");
  if (u.color) pc.style.background = toRgba(u.color, 0.6);
  if (u.profile) {
    const p = document.createElement("img");
    p.src = SERVER + u.profile;
    pc.appendChild(p);
  } else {
    pc.innerText = u.name
      .split(" ")
      .map((e) => e[0])
      .join("");
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

const updateMessageProfiles = () => {
  const cms = document.querySelector("#chat-messages");
  let last;
  [].slice.call(cms.children).forEach((e, i) => {
    [].slice.call(e.children).forEach((ee, ii) => {
      const p = ee.querySelector("#profile");
      if (!p) return;
      if (p.className != last || ii == 0) last = p.className;
      else p.style.opacity = 0;
    });
  });
};

const addMessage = (
  [message, u, d],
  smooth = true,
  scroll = true,
  start = false,
) => {
  if (!user.visible && !loadingMessages) {
    let t = document.title.replace(/\(\d+\)/, "");
    missed++;
    document.title = "(" + missed + ") " + t;
  }
  const myUser = u.name == user.name;
  if (typeof currMessages != "undefined") currMessages++;
  const cms = document.querySelector("#chat-messages");
  cms.innerHTML = cms.innerHTML.replace("Sorry, no messages here...", "");
  const atBottom =
    Math.abs(cms.scrollHeight - cms.clientHeight - cms.scrollTop) <= 150;
  const cm = document.createElement("div");
  cm.id = "chat-message";
  const pc = getProfile(u, false);
  const m = document.createElement("div");
  m.id = "message";
  m.style.background = toRgba(u.color, 0.4);
  m.innerHTML = message;
  m.innerHTML = linkify(m.innerText, smooth, scroll, start);
  if (!myUser) {
    m.className = "right";
    cm.appendChild(pc);
  }
  cm.appendChild(m);
  if (myUser) {
    pc.style.display = "none";
    m.className = "left";
    cm.appendChild(pc);
  }
  const prev = start ? cms.firstChild : cms.lastChild;
  if (prev?.className == "u" + u.id) {
    if (start) prev.insertBefore(cm, prev.children[1]);
    else prev.appendChild(cm);
  } else {
    const cont = document.createElement("div");
    cont.id = "cont";
    cont.className = "u" + u.id;
    const n = document.createElement("div");
    n.id = "name";
    n.className = myUser ? "right" : "left";
    n.innerText = myUser ? "" : u.name;
    const time = document.createElement("div");
    time.id = "time";
    time.innerHTML = d
      ? new Date(d).toLocaleString("en-us", {
          weekday: "long",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        })
      : "";
    n.appendChild(time);
    cont.appendChild(n);
    cont.appendChild(cm);
    cms.appendChild(cont);
    if (start) cms.insertBefore(cont, cms.firstChild);
    else cms.appendChild(cont);
  }
  updateMessageProfiles();
  if (!start && atBottom)
    cms.scrollTo({
      top: cms.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  if (smooth && scroll)
    cm.animate(
      [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
      {
        duration: 500,
        easing: "ease",
      },
    );
};

document.onvisibilitychange = () => {
  user.visible = document.visibilityState == "visible";
  const p =
    window.location.pathname == "/chat"
      ? " - Chat"
      : window.location.pathname == "/voice"
        ? " - Voice Chat"
        : "";
  missed = 0;
  document.title = "HGUT" + p;
  socket.emit("visible", user.visible);
};
