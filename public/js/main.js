const SERVER = "https://3sx4nn-3000.csb.app/";
const icon = document.querySelector("#icon");
const cb = document.querySelector("#chat-box");

const devMode = true;

let profiles = {},
  online = {},
  missed = 0,
  loadingMessages = false,
  rns = {},
  user = {};

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

const imageToDataURL = (img) => {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return c.toDataURL();
};

const linkify = (s, sc = false) => {
  const urlPattern =
    /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
  const pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
  const emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;
  const emojiPattern = /\p{Extended_Pictographic}/gu;
  if (s.startsWith("/images/")) {
    const src = (SERVER + s).replace("//images", "/images");
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (!sc) return;
      const cms = document.querySelector("#chat-messages");
      cms.scrollTo(0, cms.scrollHeight);
    };
    return `<img src="${src}">`;
  } else {
    if (s.replace(emojiPattern, "").length == 0)
      return `<p id="emoji" class="${user.settings.emoji ? "" : "disabled"}">${s}</p>`;
    return s
      .replace(urlPattern, "<a target='_blank' href='$&'>$&</a>")
      .replace(pseudoUrlPattern, "$1<a target='_blank' href='http://$2'>$2</a>")
      .replace(
        emailAddressPattern,
        "<a target='_blank' href='mailto:$&'>$&</a>",
      );
  }
};

const getSvg = (id, path, opts = {}) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", id);
  svg.setAttribute("viewBox", "0 0 512 512");
  svg.setAttribute("fill", "currentColor");
  Object.keys(opts).forEach((k) => svg.setAttribute(k, opts[k]));
  svg.innerHTML = `<path d="${path}"/>`;
  return svg;
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
    last = null;
    [].slice.call(e.children).forEach((ee, ii) => {
      const p = ee.querySelector("#profile");
      if (!p) return;
      if (p.className != last || ii == 0) last = p.className;
      else p.style.opacity = 0;
    });
  });
};

const updateEditOnclick = () => {
  const edit = document.querySelectorAll("#edit");
  edit.forEach((e) => {
    e.onclick = () => {
      const cm = e.parentElement.parentElement;
      const m = cm.querySelector("#message");
      const u =
        profiles[cm.querySelector("#profile").className.replace("-", " ")].name;
      const id = m.className.split(" ")[0].replace("m-", "");
      if (u != user.name) return;
      const val = m.innerText;
      m.contentEditable = true;
      m.focus();
      m.onblur = () => {
        m.contentEditable = false;
        if (m.innerText == val || m.innerText.length == 0)
          return (m.innerHTML = linkify(val));
        m.innerHTML = linkify(m.innerText);
        chat.emit("edit", {
          id,
          message: m.innerText,
          profile: u,
          room: user.room,
        });
      };
      m.onkeydown = (e) => {
        if (e.key == "Enter") m.blur();
      };
    };
  });
};

const updateReplyOnclick = () => {
  const reply = document.querySelectorAll("#reply");
  reply.forEach((e) => {
    e.onclick = () => {
      const cm = e.parentElement.parentElement;
      const m = cm.querySelector("#message");
      const myUser =
        cm.querySelector("#profile").className.replace("-", " ") == user.name;
      const id = m.className.split(" ")[0].replace("m-", "");
      const r = cm.cloneNode(true);
      r.querySelector("#profile").remove();
      const pc = getProfile(user, false);
      pc.id = "profile";
      if (!myUser) r.querySelector("#message").before(pc);
      document.querySelector(".r-" + id).appendChild(r);
      const rm = r.querySelector("#message");
      rm.style.background = toRgba(user.color, 0.4);
      rm.contentEditable = true;
      rm.innerText = "";
      rm.focus();
      rm.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
      rm.onblur = () => {
        if (rm.innerText.length == 0) return r.remove();
        rm.contentEditable = false;
        chat.emit("reply", {
          id,
          message: rm.innerText,
          profile: user.name,
          room: user.room,
        });
        r.remove();
      };
      rm.onkeydown = (e) => {
        if (e.key == "Enter") rm.blur();
      };
      updateMessageProfiles();
    };
  });
};

const updateDeleteOnclick = () => {
  const del = document.querySelectorAll("#delete");
  del.forEach((e) => {
    e.onclick = () => {
      const cm = e.parentElement.parentElement;
      const m = cm.querySelector("#message");
      const u =
        profiles[cm.querySelector("#profile").className.replace("-", " ")].name;
      const id = m.className.split(" ")[0].replace("m-", "");
      if (u != user.name) return;
      chat.emit("delete", {
        id,
        profile: u,
        room: user.room,
      });
    };
  });
};

const createReply = (e, prev) => {
  const myUser = e.name == user.name;
  const reply = document.createElement("div");
  reply.id = "reply-m";
  reply.classList.add(myUser ? "right" : "left");
  const p = profiles[e.name];
  const rm = document.createElement("div");
  rm.id = "chat-message";
  rm.class = p.name.replaceAll(" ", "-");
  const rp = getProfile(p, false);
  const rmn = document.createElement("div");
  rmn.id = "name";
  rmn.innerText = myUser ? "" : e.name;
  const rmtime = document.createElement("div");
  rmtime.id = "time";
  rmtime.innerHTML = e.date
    ? new Date(e.date).toLocaleString("en-us", {
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
    : "";
  rmn.appendChild(rmtime);
  const rmm = document.createElement("div");
  rmm.id = "message";
  rmm.classList.add(myUser ? "left" : "right");
  rmm.style.background = toRgba(p.color, 0.4);
  rmm.innerText = linkify(e.message);
  if (prev?.name != e.name) rm.appendChild(rmn);
  if (!myUser) reply.appendChild(rp);
  rm.appendChild(rmm);
  reply.appendChild(rm);
  return reply;
};

const addReplies = (m, mId) => {
  const replies = m.replies || [];
  const myUser = user.name == m.name;
  const cms = document.querySelector("#chat-messages");
  const r = document.createElement("div");
  r.id = "replies";
  r.classList.add("r-" + mId);
  r.classList.add(myUser ? "right" : "left");
  replies.forEach((e, i) => r.appendChild(createReply(e, replies[i - 1])));
  cms.appendChild(r);
  updateMessageProfiles();
};

const addMessage = (
  [message, u, d, lm = null, mId = 0],
  smooth = true,
  scroll = true,
  start = false,
) => {
  if (!user.visible && !loadingMessages) {
    const t = document.title.replace(/\(\d+\)/, "");
    missed++;
    document.title = "(" + missed + ") " + t;
  }
  const myUser = u.name == user.name;
  if (typeof currMessages != "undefined") currMessages++;
  const cms = chat.connected
    ? document.querySelector("#chat-messages")
    : voice.connected
      ? document.querySelector("#voice-chat-messages")
      : null;
  if (!cms) return;
  cms.innerHTML = cms.innerHTML.replace("Sorry, no messages here...", "");
  const atBottom =
    Math.abs(cms.scrollHeight - cms.clientHeight - cms.scrollTop) <= 200;
  const cm = document.createElement("div");
  cm.id = "chat-message";
  const pc = getProfile(u, false);
  const m = document.createElement("div");
  m.id = "message";
  m.classList.add(typeof currMessages != "undefined" ? "m-" + mId : "");
  m.style.background = toRgba(u.color, 0.4);
  let messageText = message;
  if (user.room == "eth")
    messageText = messageText
      .split(" ")
      .map((w) =>
        w.charAt(w.length - 1).replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
          ? w + "eth"
          : w,
      )
      .join(" ");
  m.innerHTML = messageText;
  m.innerHTML = linkify(m.innerText, !start);
  const opts = document.createElement("div");
  opts.id = "options";
  if (myUser) {
    const edit = document.createElement("div");
    edit.id = "edit";
    const editSvg = getSvg(
      "edit-svg",
      "M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152V424c0 48.6 39.4 88 88 88H360c48.6 0 88-39.4 88-88V312c0-13.3-10.7-24-24-24s-24 10.7-24 24V424c0 22.1-17.9 40-40 40H88c-22.1 0-40-17.9-40-40V152c0-22.1 17.9-40 40-40H200c13.3 0 24-10.7 24-24s-10.7-24-24-24H88z",
    );
    edit.appendChild(editSvg);
    if (m.querySelectorAll("img").length == 0) opts.appendChild(edit);
    const del = document.createElement("div");
    del.id = "delete";
    const delSvg = getSvg(
      "delete-svg",
      "M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z",
    );
    del.appendChild(delSvg);
    opts.appendChild(del);
  }
  const reply = document.createElement("div");
  reply.id = "reply";
  const replySvg = getSvg(
    "reply-svg",
    "M205 34.8c11.5 5.1 19 16.6 19 29.2v64H336c97.2 0 176 78.8 176 176c0 113.3-81.5 163.9-100.2 174.1c-2.5 1.4-5.3 1.9-8.1 1.9c-10.9 0-19.7-8.9-19.7-19.7c0-7.5 4.3-14.4 9.8-19.5c9.4-8.8 22.2-26.4 22.2-56.7c0-53-43-96-96-96H224v64c0 12.6-7.4 24.1-19 29.2s-25 3-34.4-5.4l-160-144C3.9 225.7 0 217.1 0 208s3.9-17.7 10.6-23.8l160-144c9.4-8.5 22.9-10.6 34.4-5.4z",
  );
  reply.appendChild(replySvg);
  opts.appendChild(reply);
  cm.appendChild(opts);
  if (!myUser) {
    cm.className = "right";
    m.classList.add("right");
    opts.className = "left";
    cm.appendChild(pc);
  }
  cm.appendChild(m);
  if (myUser) {
    pc.style.display = "none";
    cm.className = "left";
    m.classList.add("left");
    opts.className = "right";
    cm.appendChild(pc);
  }
  const prev = start ? cms.firstChild : cms.lastChild?.previousSibling;
  const ld = lm ? lm.date : null;
  if (
    prev?.className == "u" + u.id &&
    new Date(d).getTime() - new Date(ld).getTime() < 60000
  ) {
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
  updateEditOnclick();
  updateReplyOnclick();
  updateDeleteOnclick();

  if (scroll && !start) {
    cms.scrollTo(0, cms.scrollHeight);
    cm.animate(
      {
        opacity: [0, 1],
        transform: ["scale(0)", "scale(1)"],
      },
      {
        duration: 300,
        easing: "ease-out",
      },
    );
  }
};

document.onvisibilitychange = () => {
  user.visible = document.visibilityState == "visible";
  missed = 0;
  document.title = document.title.replace(/\(\d+\)/, "");
  if (chat.connected) chat.emit("visible", user.visible);
  if (voice.connected) voice.emit("visible", user.visible);
};

const tabs = document.querySelector("#tabs");

tabs
  .querySelectorAll("div.tab")
  .forEach((e) => (e.onclick = () => switchTab(e)));

document.querySelectorAll("#expand").forEach(
  (e) =>
    (e.onclick = () => {
      const h = document.querySelector("#header");
      h.classList.toggle("toggled");
      e.classList.toggle("toggled");
    }),
);

const getCurrentTab = () => {
  const url = new URL(window.location.href);
  return url.searchParams.get("tab") || "messages";
};

const switchTab = async (tab) => {
  if (!tab) return;
  if (tab.id == "theme") return;
  if (tab.id == "logout") return (window.location.href = "logout");
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab.id);
  window.history.pushState({}, "", url);
  tabs
    .querySelectorAll("div.tab")
    .forEach((e) => e.classList.remove("selected"));
  tab.classList.add("selected");
  const c = document.querySelector(".person-" + user.peerId);
  if (c)
    c.querySelectorAll("#video").forEach((e) => {
      e.srcObject.getTracks().forEach((t) => {
        t.enabled = true;
        t.stop();
        e.srcObject.removeTrack(t);
      });
      e.srcObject = null;
    });
  if (stream)
    stream.getTracks().forEach((t) => {
      t.enabled = true;
      t.stop();
      stream.removeTrack(t);
    });
  if (pres)
    pres.getTracks().forEach((t) => {
      t.enabled = true;
      t.stop();
      pres.removeTrack(t);
    });
  stream = null;
  pres = null;
  const pc = document.querySelector("#people-container");
  pc.innerHTML = "";
  pc.appendChild(loading);
  if (tab.id == "voice") {
    chat.disconnect();
    voice.connect();
  } else {
    chat.connect();
    voice.disconnect();
    for (const m in peer.connections)
      peer.connections[m].forEach((c) => c.close());
  }
};

const createNotification = ([m, u, r]) => {
  if (!rns[r]) rns[r] = r;
  const notifications = document.querySelector("#notifications");
  const n = document.createElement("div");
  n.id = "notification";
  const p = getProfile(u, false);
  const cont = document.createElement("div");
  cont.id = "cont";
  const name = document.createElement("div");
  name.id = "n";
  const room = Number(rns[r].split("-")[0]) ? "" : " in <b>" + rns[r] + "</b>";
  name.innerHTML =
    "<b>" + u.name.split(" ")[0] + "</b> sent you a message" + room;
  const message = document.createElement("div");
  message.id = "m";
  message.innerText = m;
  const x = document.createElement("div");
  x.id = "x";
  const xSvg = getSvg("x-svg", "M18 6L6 18M6 6l12 12", {
    fill: "#fff",
    stroke: "#fff",
    viewBox: "0 0 24 24",
    "stroke-width": 2,
    "stroke-linecap": "round",
  });
  x.appendChild(xSvg);
  cont.appendChild(name);
  cont.appendChild(message);
  n.appendChild(p);
  n.appendChild(cont);
  n.appendChild(x);
  n.onclick = (e) => {
    clearNotification(n);
    if (e.target.id == "x") return;
    const lr =
      document.querySelector(".c-" + r) ||
      document.querySelector(".c-" + r.split("-").reverse().join("-")) ||
      document.querySelector("." + r);
    switchChat(lr);
  };
  setTimeout(() => clearNotification(n), 10000);
  notifications.insertBefore(n, notifications.firstChild);
};

const clearNotification = (n) => {
  n.style.opacity = 0;
  n.style.transform = "translateX(100%)";
  n.style.marginBottom = "-60px";
  setTimeout(() => n.remove(), 3000);
};

const init = () => {
  const url = new URL(window.location.href);
  const tab = url.searchParams.get("tab") || "messages";
  switchTab(document.querySelector(`#${tab}`));
};

window.onload = init;
window.onpopstate = init;
if (cb)
  cb.onanimationend = (e) => {
    const cms = document.querySelector("#chat-messages");
    cms.scrollTo(0, cms.scrollHeight);
  };
