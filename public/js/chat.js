const input = document.querySelector("#chat-input");
const send = document.querySelector("#chat-send");
const addImg = document.querySelector("#add-img"),
  addVideo = document.querySelector("#add-video"),
  addAudio = document.querySelector("#add-audio"),
  addPdf = document.querySelector("#add-pdf");
const sd = document.querySelector("#scroll-down");
const initMessages = 20,
  messagesPerLoad = 10,
  ml = 1000;
let maxMessagesReached = false,
  currMessages = initMessages,
  mobile = window.innerWidth < 700,
  rn = [],
  roomNames = {},
  prev = "";

const roomButton = (text, cn, un = true, d, p = false) => {
  const crc = document.createElement("div");
  crc.id = "chat-room-container";
  const o = document.createElement("div");
  o.id = "online";
  const cr = document.createElement("div");
  cr.id = "chat-room";
  cr.className = cn;
  cr.onclick = typeof d == "function" ? d : () => switchChat(cr);
  const crbg = document.createElement("div");
  crbg.id = "chat-room-bg";
  const id = parseInt(
    cn
      .replace("c-", "")
      .replace("-", ",")
      .split(",")
      .find((e) => e != user.id)
  );
  const u = findProfile(id);
  if (p) {
    const profile = getProfile(u);
    cr.appendChild(profile);
  }
  const n = document.createElement("div");
  n.id = "room-name";
  n.innerText = text;
  cr.appendChild(crbg);
  cr.appendChild(n);
  if (u?.tags?.length > 0) {
    u.tags.forEach((t) => {
      const tag = document.createElement("div");
      tag.id = "tag";
      tag.style.color = t.color;
      const tagSvg = getSvg("tag-svg", "M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z");
      tagSvg.setAttribute("viewBox", "0 0 24 24");
      const tagText = document.createElement("span");
      tagText.innerText = t.name;
      tag.appendChild(tagSvg);
      tag.appendChild(tagText);
      cr.appendChild(tag);
    });
  }
  if (un) {
    const unread = document.createElement("div");
    unread.id = "unread";
    const dot = document.createElement("span");
    dot.id = "dot";
    const ping = document.createElement("span");
    ping.id = "ping";
    unread.appendChild(ping);
    unread.appendChild(dot);
    cr.appendChild(unread);
    if (typeof d != "undefined") unread.style.display = d ? "block" : "none";
    else unread.style.display = user.unread.includes(cn) ? "block" : "none";
  }
  crc.appendChild(o);
  crc.appendChild(cr);
  return crc;
};

chat.on("connect", () => {
  createStatus("Connected", "success");
  chat.emit("visible", document.visibilityState == "visible");
});
chat.on("disconnect", () => {
  const t = getCurrentTab();
  if (t == "voice") return;
  createStatus("Disconnected", "error");
  const i = (msg = true) => {
    if (getCurrentTab() == "voice") return;
    if (chat.connected) return (currMessages = initMessages);
    if (msg) createStatus("Reconnecting...", "info");
    chat.connect();
    setTimeout(() => i(), 10000);
  };
  i(false);
});
chat.on("typing", (t) => {
  const typing = document.querySelector("#typing");
  if (t.length == 0) return (typing.style = "");
  else typing.style.opacity = 1;
  let text = "";
  t.forEach((id, i) => {
    const u = findProfile(id);
    const n = u.name.split(" ")[0];
    text +=
      i == 0
        ? n
        : i == t.length - 1 && t.length == 2
        ? " and " + n
        : i == t.length - 1
        ? ", and " + n
        : ", " + n;
  });
  typing.innerText = t.length == 1 ? text + " is typing" : text + " are typing";
});
chat.on("unread", (u) => {
  user.unread = u;
  user.unread.forEach((c) => {
    const d =
      document.querySelector(".c-" + c + " #unread") ||
      document.querySelector(
        ".c-" + c.replace("-", ",").split(",").reverse().join("-") + " #unread"
      ) ||
      document.querySelector("." + c + " #unread");
    if (d) d.style.display = "block";
  });
});
chat.on("load messages", ([messages, start = true]) => {
  loadMessages(messages, start);
});
chat.on("chat message", async ([m, u, d, lm, a, mId]) => {
  if (!(a.includes(user.id) || a == "all")) return;
  let messageText = m;
  if (u.room == user.room) addMessage([m, u, d, lm, mId]);
  if (u.room != user.room || getCurrentTab() != "messages")
    createNotification([messageText, u, u.room]);
});
chat.on("ai error", (error) => {
  let e = "An error with the AI has occurred";
  if (typeof error == "object")
    e = "AI Error: " + error.response?.candidates[0]?.finishReason;
  else if (typeof error == "string") e = error;
  createStatus(e, "error");
});
chat.on("tool status", ([id, s]) => {
  const t = document.querySelector("#tool-status.status-" + id);
  if (!t) return;
  t.querySelector("#tool-text").innerHTML = s;
  if (s.includes("completed")) t.classList.add("complete");
  else t.classList.remove("complete");
});
chat.on("clear", (u) => {
  cms.innerHTML = "Sorry, no messages here...";
  currMessages = 0;
  maxMessagesReached = true;
  sd.classList.remove("active");
  createStatus("Messages cleared by " + u.name, "info");
});
chat.on("cancel clear", () =>
  createStatus("An error occurred while clearing messages", "error")
);
chat.on("edit", ({ id, message }) => {
  const m = document.querySelector(".m-" + id);
  if (!m) return;
  m.innerHTML = linkify(message);
  updateMessageProfiles();
});
chat.on("reply", ({ id, message, user: u, prev, date, i }) => {
  const r = document.querySelector(".r-" + id);
  if (!r) return;
  const [c, appendEl, appendBefore] = createMessage(
    [message, u, date, prev, id],
    false,
    u.name == user.name,
    i,
    false,
    true,
    r
  );
  if (c.id == "cont") r.appendChild(c);
  else if (appendEl) appendEl.appendChild(c);
  else if (appendBefore) appendEl.insertBefore(c, appendBefore);
  const cm = c.id == "cont" ? c.querySelector("#chat-message") : c;
  cm.animate(
    {
      opacity: [0, 1],
      transform: ["scale(0)", "scale(1)"],
    },
    {
      duration: 300,
      easing: "ease-out",
    }
  );
});
chat.on("delete", ({ id }) => {
  const m = document.querySelector(".m-" + id);
  if (!m) return;
  const r = document.querySelector(".r-" + id);
  if (r) r.remove();
  if ([].slice.call(m.parentElement.parentElement.children).length <= 3)
    m.parentElement.parentElement.remove();
  else m.parentElement.remove();
  updateMessageProfiles();
  const cm = document.querySelector("#chat-messages");
  if (cm.children.length == 0) cm.innerText = "Sorry, no messages here...";
  for (let i = id; i < currMessages; i++) {
    const m = document.querySelector(".m-" + i);
    if (m) {
      m.classList.remove("m-" + i);
      m.classList.add("m-" + (i - 1));
    } else break;
    const r = document.querySelector(".r-" + i);
    if (r) {
      r.classList.remove("r-" + i);
      r.classList.add("r-" + (i - 1));
    }
  }
});
chat.on("react", ({ id, reactions, user: u, type, message }) => {
  const m = document.querySelector(".m-" + id)?.parentElement;
  if (!m) return;
  const r = m.querySelector("#reacts");
  if (r) r.querySelector("#react-text").innerText = reactions.length;
  else {
    const r = createReacts(reactions);
    m.appendChild(r);
  }
});
chat.on("online", (u) => {
  online = u;
  updateOnline();
});
chat.on("join room", ([m, r, u]) => {
  loadingMessages = false;
  currMessages = 0;
  user.unread = u;
  input.value = "";
  user.room = r;
  loadMessages(m, false);
});
chat.on("person joined", (u) => {
  createStatus(u.name + " joined", "person", u);
});
chat.on("update profile", (u) => {
  profiles[u.name] = u;
  const pics = document.querySelectorAll("." + u.name.replaceAll(" ", "-"));
  pics.forEach((p) => {
    const i = p.querySelector("img");
    const ic = i.cloneNode(true);
    ic.src = SERVER + u.profile;
    i.parentNode.replaceChild(ic, i);
  });
  createStatus(u.name + " updated their profile", "person", u);
});
chat.on("redirect", (d) => (window.location.href = d));

const switchChat = (el) => {
  const r = user.room.replace("-", ",").split(",");
  if (
    user.room == el.className.replace("c-", "") ||
    "c-" + r[1] + "-" + r[0] == el.className ||
    loadingMessages
  )
    return;
  const lr =
    document.querySelector(".c-" + user.room) ||
    document.querySelector(
      ".c-" + user.room.replace("-", ",").split(",").reverse().join("-")
    ) ||
    document.querySelector("." + user.room);
  lr.style = "";
  lr.querySelector("#chat-room-bg").style = "";
  el.querySelector("#chat-room-bg").style.opacity = 1;
  el.querySelector("#unread").style.display = "none";
  cms.innerHTML = "";
  cms.appendChild(loading);
  loadingMessages = true;
  input.value = "";
  switchTab(tabs.querySelector("#messages"));
  const cn = document.querySelector("#chat-name");
  cn.innerHTML = "";
  let n = rns[el.className.replace("c-", "")] || el.className.replace("c-", "");
  if (n.replace("-", ",").split(",")[0] >= Object.values(profiles)[0].id) {
    const p = Object.values(profiles).find(
      (e) =>
        (e.id == n.replace("-", ",").split(",")[0] ||
          e.id == n.replace("-", ",").split(",")[1]) &&
        e.id != user.id
    );
    if (p) n = p.name;
  }
  cn.innerHTML = n;
  chat.emit("join room", el.className.replace("c-", ""), initMessages);
};

const updateProfiles = () => {
  const crs = document.querySelector("#chat-people");
  crs.innerHTML = "";
  Object.values(profiles)
    .filter((e) => e.name != user.name)
    .map((e) => e.character)
    .sort()
    .forEach((k) => {
      const r = findProfile(k, "character");
      const cn = rn[r.id + "-" + user.id]
        ? "c-" + r.id + "-" + user.id
        : "c-" + user.id + "-" + r.id;
      const cr = roomButton(
        k,
        cn,
        true,
        user.unread.includes(cn.replace("c-", "")),
        true
      );
      crs.appendChild(cr);
      if (
        user.room == r.id + "-" + user.id ||
        user.room == user.id + "-" + r.id
      )
        updateRoomName(cr);
    });
  const sub = document.querySelector("#submenu-mention");
  sub.innerHTML = "";
  Object.values(profiles)
    .map((e) => e.character)
    .forEach((k) => {
      const r = findProfile(k, "character");
      const o = document.createElement("div");
      o.classList.add("option");
      o.innerText = r.name;
      o.dataset.value = r.name.replace(" ", "-");
      o.onclick = () => {
        input.innerHTML = "@" + o.dataset.value;
        input.focus();
        input.click();
      };
      sub.appendChild(o);
    });
};

const updateOnline = () => {
  const o = document.querySelector("#online");
  o.innerHTML = "";
  Object.values(profiles)
    .filter((e) => e.id != user.id)
    .map((e) => e.character)
    .sort()
    .forEach((k) => {
      const r = findProfile(k, "character");
      if (!Object.keys(online).includes(r.id.toString())) return;
      const bg = document.createElement("div");
      bg.id = "bg";
      const pc = getProfile(r, true);
      pc.onclick = () =>
        switchChat(
          document.querySelector(
            rn[r.id + "-" + user.id]
              ? ".c-" + r.id + "-" + user.id
              : ".c-" + user.id + "-" + r.id
          )
        );
      pc.style.opacity = online[r.id].visible ? 1 : 0.5;
      bg.appendChild(pc);
      o.appendChild(bg);
    });
  const crc = document.querySelectorAll("#chat-room-container");
  crc.forEach((c) => {
    const onl = c.querySelector("#online");
    onl.innerHTML = "";
    Object.keys(online)
      .filter((id) => {
        const cr = c.querySelector("#chat-room").className.replace("c-", "");
        return (
          (online[id].room == cr ||
            online[id].room ==
              cr.replace("-", ",").split(",").reverse().join("-")) &&
          id != user.id
        );
      })
      .forEach((k) => {
        const o = online[k];
        const r = findProfile(k);
        const bg = document.createElement("div");
        bg.id = "bg";
        const pc = getProfile(r, false);
        pc.style.opacity = o.visible ? 1 : 0.5;
        pc.onclick = () =>
          switchChat(
            document.querySelector(
              rn[r.id + "-" + user.id]
                ? ".c-" + r.id + "-" + user.id
                : ".c-" + user.id + "-" + r.id
            )
          );
        bg.appendChild(pc);
        onl.appendChild(bg);
      });
  });
};

const switchTheme = (dark = !user.settings.theme, color) => {
  user.settings.theme = dark;
  document.body.className = dark ? "dark" : "light";
  const lr =
    !user.room || getCurrentTab() == "voice"
      ? null
      : document.querySelector(".c-" + user.room) ||
        document.querySelector(
          ".c-" + user.room?.replace("-", ",").split(",").reverse().join("-")
        ) ||
        document.querySelector("." + user.room) ||
        null;
  if (lr) lr.style.background = dark ? "#000" : "#fff";
  if (color) {
    const rgb = toRgba(color, 1, true);
    const su = document.querySelector("#settings-username");
    Object.keys(rgb).forEach((k) => {
      document.body.style.setProperty("--bg-" + k, rgb[k]);
      su.style.setProperty("--bg-" + k, rgb[k]);
      document.querySelector(":root").style.setProperty("--" + k, rgb[k]);
    });
  }
  updateSettings();
  chat.emit("settings", user.settings);
  document.querySelector("link[href*='highlight.js']")?.remove();
  const link = document.createElement("link");
  const theme = dark ? "github-dark" : "github";
  link.rel = "stylesheet";
  link.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${theme}.min.css`;
  document.querySelector("head").append(link);
};

const setCursor = (el, pos) => {
  const range = document.createRange();
  const sel = window.getSelection();
  range.setStart(el.childNodes[0], pos);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  el.focus();
};

input.onkeydown = (e) => {
  const i = input.innerHTML;
  if (e.key == "Enter") e.preventDefault();
  if (i.length > ml) {
    e.preventDefault();
    input.innerHTML = i.slice(0, ml);
    setCursor(input, ml);
  }
  if (!i.replace(/\s/g, "").length) return;
  if (
    e.key != "Enter" ||
    i.length == 0 ||
    i.length > ml ||
    loadingMessages ||
    !chat.connected ||
    e.shiftKey
  )
    return;
  chat.emit("chat message", i);
  input.innerHTML = "";
};

input.onkeyup = (e) => {
  const i = input.innerHTML;
  if (i.length > 0) chat.emit("typing", true);
  else chat.emit("typing", false);
  if (i.length > ml) {
    e.preventDefault();
    input.innerHTML = i.slice(0, ml);
    setCursor(input, ml);
  }
};

input.onpaste = (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData("text/plain");
  input.innerHTML += text;
  input.innerHTML = input.innerHTML.slice(0, 1000);
  setCursor(input, input.innerHTML.length);
};

send.onclick = (e) => {
  const i = input.innerHTML;
  if (!i.replace(/\s/g, "").length) return;
  if (!i.replace(/<\s*br[^>]?>/, "\n").replace(/(<([^>]+)>)/g, "").length)
    return;
  if (i.length == 0 || i.length > ml || loadingMessages || !chat.connected)
    return;
  chat.emit("chat message", i);
  input.innerHTML = "";
};

const uploadFile = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fileSize = file.size / 1024 / 1024;
  if (fileSize < 0.5) chat.emit("upload", [file, file.type]);
  else {
    const chunkSize = 0.5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const fr = new FileReader();
    const name = Date.now();
    const ext = file.name.split(".").pop();
    fr.onload = (e) => {
      const chunks = [];
      for (let i = 0; i < totalChunks; i++)
        chunks.push(e.target.result.slice(i * chunkSize, (i + 1) * chunkSize));
      chunks.forEach((c, i) =>
        chat.emit("upload chunk", [c, name, ext, i, totalChunks])
      );
    };
    fr.readAsArrayBuffer(file);
  }
};

addImg.onchange = uploadFile;
addVideo.onchange = uploadFile;
addAudio.onchange = uploadFile;
addPdf.onchange = uploadFile;

document.querySelector("div[data-value='camera']").onclick = () => initCamera();
document.querySelector("#theme").onclick = () => switchTheme();

const updateScroll = () => {
  const t = cms.scrollTop;
  if (cms.scrollHeight - t - cms.clientHeight > 100 + 50)
    sd.classList.add("active");
  else sd.classList.remove("active");
  if (t > 10 || maxMessagesReached || loadingMessages) return;
  loadingMessages = true;
  chat.emit("load messages", currMessages, messagesPerLoad);
};

cms.onscroll = updateScroll;

sd.onclick = () => {
  cms.scrollTop = cms.scrollHeight;
  sd.classList.remove("active");
};

const loadMessages = (messages, start = true) => {
  loadingMessages = true;
  if (!start) currMessages = messages.length;
  if (cms.querySelector("#loading"))
    cms.removeChild(cms.querySelector("#loading"));
  if (!start) cms.innerHTML = "";
  const h = cms.scrollHeight;
  const rev = start ? messages.reverse() : messages;
  rev.forEach((m, i) => {
    addMessage(
      [
        m.message,
        profiles[m.name],
        m.date,
        rev[i - 1],
        m.id,
        m.replies,
        m.reactions,
      ],
      false,
      start
    );
  });
  maxMessagesReached = !messages[0] || messages[0].id == 0;
  if (!maxMessagesReached) cms.insertBefore(loading, cms.firstChild);
  if (!start && messages.length == 0)
    cms.innerHTML = "Sorry, no messages here...";
  if (!start) cms.scrollTop = cms.scrollHeight;
  else cms.scrollTop = cms.scrollHeight - h;
  loadingMessages = false;
};

const updateRoomName = (cr) => {
  const el = cr.querySelector("#chat-room");
  el.querySelector("#chat-room-bg").style.opacity = 1;
  const cn = el.className.replace("c-", "");
  let n = roomNames[el.className.replace("c-", "")];
  if (n?.split("-")[0] >= Object.values(profiles)[0].id) {
    const p = Object.values(profiles).find(
      (e) =>
        (e.id == n.replace("-", ",").split(",")[0] ||
          e.id == n.replace("-", ",").split(",")[1]) &&
        e.id != user.id
    );
    if (p) n = p.name;
  }
  document.querySelector("#chat-name").innerHTML = n;
};

const updateRooms = () => {
  loadingMessages = true;
  rn = Object.keys(rooms);
  rn.forEach((r) => (roomNames[r] = rooms[r].name));
  const vs = Object.values(rooms);
  rn.forEach((r, i) => {
    rns[r] = vs[i].name;
  });
  const crs = document.querySelector("#chat-rooms");
  crs.innerHTML = "";
  crs.appendChild(
    roomButton("Book Link", "", false, () =>
      window.open(
        "https://docs.google.com/document/d/1xsxMONOYieKK_a87PTJwvmgwRZVNxOE4OhxtWc2oz7I/edit"
      )
    )
  );
  Object.keys(rooms).forEach((k) => {
    if (!rooms[k].allowed.includes(user.id) && rooms[k].allowed != "all")
      return;
    const r = rooms[k];
    const u = k.replace("-", ",").split(",");
    const cr = roomButton(
      r.name,
      k.replaceAll(" ", "-"),
      true,
      user.unread.includes(k)
    );
    if (
      !Object.values(profiles).find((e) => e.id == u[0]) &&
      !Object.values(profiles).find((e) => e.id == u[1])
    )
      crs.appendChild(cr);
    if (user.room == k) updateRoomName(cr);
  });
};

const updateUser = () => {
  user.visible = document.visibilityState == "visible";
  setEmojis();
  updateSettings();
  updateRooms();
  updateProfiles();
  switchTheme(user.settings.theme, user.settings.accent ? user.color : null);
  if (user.settings.dontDisturb) createStatus("Do not disturb enabled", "info");
};

window.onbeforeunload = () => {
  const cache = {
    user,
    messages: cms.innerHTML,
    rooms,
  };
  localStorage.setItem("cache", JSON.stringify(cache));
};

const getData = async () => {
  let r, d;
  if (typeof user != "number") {
    r = await fetch(SERVER + "p");
    d = await r.json();
    profiles = d;
  }
  const name = document.cookie
    .split(";")
    .find((e) => e.includes("user="))
    .split("=")[1]
    .replace(/%20/g, " ");
  if (!name) return window.location.reload();
  const id = profiles[name]?.id;
  user = typeof id == "number" ? id : user;
  r = await fetch(SERVER + "user-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ user }),
  });
  d = await r.json();
  return d;
};

getData().then((d) => {
  if (d.error) return;
  user = d.user;
  profiles = d.profiles;
  rooms = d.rooms;
  switchTab(document.querySelector("#" + getCurrentTab()));
  updateUser();
});
