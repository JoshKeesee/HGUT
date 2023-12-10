const socket = io(SERVER + "chat", {
  path: "/socket.io",
  transports: ["websocket"],
  query: {
    user: document.cookie,
  },
});
const input = document.querySelector("#chat-input");
const send = document.querySelector("#chat-send");
const addFile = document.querySelector("#add-file");
const loading = document.createElement("div");
loading.id = "loading";
loading.className = "loading";
for (let i = 0; i < 4; i++) loading.appendChild(document.createElement("div"));
const maxMessages = 50;
let user = {},
  profiles = {},
  maxMessagesReached = false,
  currMessages = maxMessages,
  mobile = window.innerWidth < 700,
  online = {},
  rn = [],
  prev = "";

const roomButton = (text, cn, u = true, d) => {
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
  const n = document.createElement("div");
  n.id = "room-name";
  n.innerText = text;
  cr.appendChild(crbg);
  cr.appendChild(n);
  if (u) {
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

socket.on("connect", () => {
  socket.emit("visible", document.visibilityState == "visible");
});
socket.on("typing", (t) => {
  const typing = document.querySelector("#typing");
  if (t.length == 0) return (typing.style = "");
  else typing.style.opacity = 1;
  let text = "";
  t.forEach((id, i) => {
    const u = profiles[Object.keys(profiles).find((e) => profiles[e].id == id)];
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
  typing.innerText =
    t.length == 1 ? text + " is typing..." : text + " are typing...";
});
socket.on("unread", (u) => {
  user.unread = u;
  user.unread.forEach((c) => {
    const d =
      document.querySelector(".c-" + c + " #unread") ||
      document.querySelector(
        ".c-" + c.split("-").reverse().join("-") + " #unread",
      ) ||
      document.querySelector("." + c + " #unread");
    if (d) d.style.display = "block";
  });
});
socket.on("load messages", (messages) => {
  maxMessagesReached = messages.length < maxMessages;
  const cms = document.querySelector("#chat-messages");
  const h = cms.scrollHeight;
  if (document.querySelector("#" + loading.id)) loading.remove();
  const rev = messages.reverse();
  rev.forEach((m, i) => {
    addMessage(
      [m.message, profiles[m.name], m.date, rev[i - 1]],
      false,
      false,
      true,
    );
  });
  if (!maxMessagesReached) cms.insertBefore(loading, cms.firstChild);
  cms.scrollTo({
    top: cms.scrollHeight - h,
    behavior: "auto",
  });
  loadingMessages = false;
});
socket.on("chat message", ([m, u, d, lm, a]) => {
  if (!(a.includes(user.id) || a == "all")) return;
  if (u.room == user.room) addMessage([m, u, d, lm]);
  else createNotification([m, u, u.room]);
});
socket.on("rooms", ([rooms, p]) => {
  loadingMessages = true;
  rn = Object.keys(rooms);
  const vs = Object.values(rooms);
  rn.forEach((r, i) => {
    rns[r] = vs[i].name;
  });
  if (p) {
    profiles = p;
    updateProfiles();
  }
  const cms = document.querySelector("#chat-messages");
  cms.innerHTML = "";
  const crs = document.querySelector("#chat-rooms");
  crs.innerHTML = "";
  crs.appendChild(
    roomButton("Book Link", "", false, () =>
      window.open(
        "https://docs.google.com/document/d/1xsxMONOYieKK_a87PTJwvmgwRZVNxOE4OhxtWc2oz7I/edit",
      ),
    ),
  );
  Object.keys(rooms).forEach((k) => {
    if (!rooms[k].allowed.includes(user.id) && rooms[k].allowed != "all")
      return;
    const r = rooms[k];
    const u = k.split("-");
    const cr = roomButton(r.name, k.replaceAll(" ", "-"));
    if (
      !Object.values(profiles).find((e) => e.id == u[0]) &&
      !Object.values(profiles).find((e) => e.id == u[1])
    )
      crs.appendChild(cr);
    if (user.room == k) {
      if (Object.keys(r.messages).length == 0)
        cms.innerText = "Sorry, no messages here...";
      else
        Object.values(r.messages).forEach((m, i) =>
          addMessage(
            [m.message, profiles[m.name], m.date, r.messages[i - 1]],
            false,
          ),
        );
      const el = cr.querySelector("#chat-room");
      el.style.background = user.theme ? "black" : "white";
      el.querySelector("#chat-room-bg").style.opacity = 1;
      currMessages = r.messages.length;
      maxMessagesReached = currMessages < maxMessages;
      let n = r.name;
      if (Number(n.split("-")[0])) {
        const p = Object.values(profiles).find(
          (e) =>
            (e.id == n.split("-")[0] || e.id == n.split("-")[1]) &&
            e.id != user.id,
        );
        if (p) n = p.name;
      }
      document.querySelector("#chat-name").innerHTML = n;
    }
  });
  if (!maxMessagesReached) cms.insertBefore(loading, cms.firstChild);
  loadingMessages = false;
});
socket.on("profiles", (p) => {
  profiles = p;
  updateProfiles();
});
socket.on("user", (u) => {
  user = u;
  user.visible = document.visibilityState == "visible";
  setTimeout(
    () => switchTheme(user.theme, user.accent ? user.color : null),
    100,
  );
  updateProfiles();
});
socket.on("online", (u) => {
  online = u;
  updateOnline();
});
socket.on("join room", ([messages, r, u]) => {
  loadingMessages = false;
  currMessages = 0;
  user.unread = u;
  input.value = "";
  const cms = document.querySelector("#chat-messages");
  cms.innerHTML = "";
  if (messages.length == 0) cms.innerText = "Sorry, no messages here...";
  else
    messages.forEach((m, i) =>
      addMessage([m.message, profiles[m.name], m.date, messages[i - 1]], false),
    );
  user.room = r;
  maxMessagesReached = currMessages < maxMessages;
  cms.style = "";
  if (!maxMessagesReached) cms.insertBefore(loading, cms.firstChild);
});
socket.on("redirect", (d) => (window.location.href = d));

const switchChat = (el) => {
  const r = user.room.split("-");
  if (
    user.room == el.className.replace("c-", "") ||
    "c-" + r[1] + "-" + r[0] == el.className ||
    loadingMessages
  )
    return;
  const lr =
    document.querySelector(".c-" + user.room) ||
    document.querySelector(".c-" + user.room.split("-").reverse().join("-")) ||
    document.querySelector("." + user.room);
  lr.style = "";
  lr.querySelector("#chat-room-bg").style = "";
  el.style.background = user.theme ? "black" : "white";
  el.querySelector("#chat-room-bg").style.opacity = 1;
  el.querySelector("#unread").style.display = "none";
  const cms = document.querySelector("#chat-messages");
  cms.innerHTML = "";
  cms.appendChild(loading);
  loadingMessages = true;
  input.value = "";
  switchTab(tabs.querySelector("#messages"));
  const cn = document.querySelector("#chat-name");
  cn.innerHTML = "";
  let n = rns[el.className.replace("c-", "")] || el.className.replace("c-", "");
  if (Number(n.split("-")[0])) {
    const p = Object.values(profiles).find(
      (e) =>
        (e.id == n.split("-")[0] || e.id == n.split("-")[1]) && e.id != user.id,
    );
    if (p) n = p.name;
  }
  setTimeout(() => {
    cn.innerHTML = n;
    socket.emit("join room", el.className.replace("c-", ""));
  }, 200);
};

const updateProfiles = () => {
  const crs = document.querySelector("#chat-people");
  crs.innerHTML = "";
  Object.values(profiles)
    .filter((e) => e.name != user.name)
    .map((e) => e.character)
    .sort()
    .forEach((k) => {
      const r =
        profiles[Object.keys(profiles).find((e) => profiles[e].character == k)];
      const cn = rn[r.id + "-" + user.id]
        ? "c-" + r.id + "-" + user.id
        : "c-" + user.id + "-" + r.id;
      const cr = roomButton(
        k,
        cn,
        true,
        user.unread.includes(cn.replace("c-", "")),
      );
      crs.appendChild(cr);
      if (
        user.room == r.id + "-" + user.id ||
        user.room == user.id + "-" + r.id
      ) {
        const el = cr.querySelector("#chat-room");
        el.style.background = user.theme ? "black" : "white";
        el.querySelector("#chat-room-bg").style.opacity = 1;
      }
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
      const r =
        profiles[Object.keys(profiles).find((e) => profiles[e].character == k)];
      if (!Object.keys(online).includes(r.id.toString())) return;
      const bg = document.createElement("div");
      bg.id = "bg";
      bg.style.background = user.theme ? "black" : "white";
      const pc = getProfile(r, true);
      pc.onclick = () =>
        switchChat(
          document.querySelector(
            rn[r.id + "-" + user.id]
              ? ".c-" + r.id + "-" + user.id
              : ".c-" + user.id + "-" + r.id,
          ),
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
            online[id].room == cr.split("-").reverse().join("-")) &&
          id != user.id
        );
      })
      .forEach((k) => {
        const o = online[k];
        const r =
          profiles[Object.keys(profiles).find((e) => profiles[e].id == k)];
        const bg = document.createElement("div");
        bg.id = "bg";
        const pc = getProfile(r, false);
        pc.style.opacity = o.visible ? 1 : 0.5;
        pc.onclick = () =>
          switchChat(
            document.querySelector(
              rn[r.id + "-" + user.id]
                ? ".c-" + r.id + "-" + user.id
                : ".c-" + user.id + "-" + r.id,
            ),
          );
        bg.appendChild(pc);
        onl.appendChild(bg);
      });
  });
};

const switchTheme = (dark = !user.theme, color) => {
  user.theme = dark;
  const d = dark ? "dark" : "light";
  const th = dark ? "black" : "white";
  document.body.className = d;
  document.querySelector("#chat-box").className = d + "-box";
  document
    .querySelectorAll("#online")
    .forEach((o) => (o.className = d + "-box"));
  document
    .querySelectorAll("#profile #info")
    .forEach((b) => (b.style.background = th));
  document.querySelectorAll("#bg").forEach((b) => (b.style.background = th));
  document.querySelector("#light-icon").style.opacity = user.theme ? 0 : 1;
  document.querySelector("#dark-icon").style.opacity = user.theme ? 1 : 0;
  const lr =
    document.querySelector(".c-" + user.room) ||
    document.querySelector(".c-" + user.room?.split("-").reverse().join("-")) ||
    document.querySelector("." + user.room) ||
    null;
  if (lr) lr.style.background = th;
  document
    .querySelector("meta[name=theme-color]")
    .setAttribute(
      "content",
      user.theme
        ? "#000014"
        : user.accent
          ? rgbToHex(toRgba(user.color))
          : rgbToHex("rgb(0, 0, 255)"),
    );
  document
    .querySelectorAll(".loading div")
    .forEach((b) => (b.style.background = user.theme ? "radial-gradient(#fff, transparent)" : "radial-gradient(#000, transparent)"));
  document
    .querySelectorAll("#unread")
    .forEach((b) => (b.style.background = user.theme ? "black" : "white"));
  if (color) {
    const rgb = toRgba(color, 1, true);
    const root = document.querySelector(":root");
    Object.keys(rgb).forEach((k) =>
      root.style.setProperty("--theme-" + k, rgb[k]),
    );
  }
  socket.emit("theme", user.theme);
};

input.onkeydown = (e) => {
  const i = input.value;
  if (!i.replace(/\s/g, "").length) return;
  if (
    e.key != "Enter" ||
    i.length == 0 ||
    i.length > 250 ||
    loadingMessages ||
    !socket.connected
  )
    return;
  socket.emit("chat message", i);
  input.value = "";
};

input.onkeyup = (e) => {
  const i = input.value;
  if (i.length > 0) socket.emit("typing", true);
  else socket.emit("typing", false);
};

send.onclick = (e) => {
  const i = input.value;
  if (!i.replace(/\s/g, "").length) return;
  if (i.length == 0 || i.length > 250 || loadingMessages || !socket.connected)
    return;
  socket.emit("chat message", i);
  input.value = "";
};

addFile.onchange = (e) => {
  const img = e.target.files[0];
  const fr = new FileReader();
  fr.onload = () => socket.emit("chat message", fr.result);
  fr.readAsDataURL(img);
};

document.querySelector("#theme").onclick = () => switchTheme();

document.querySelector("#chat-messages").onscroll = (e) => {
  const t = e.target.scrollTop;
  if (t > 100 || maxMessagesReached || loadingMessages) return;
  loadingMessages = true;
  socket.emit("load messages", currMessages);
};
