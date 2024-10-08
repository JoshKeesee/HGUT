let user = {},
  profiles = {},
  rooms = {};
const SERVER = "https://9mnzdj-3000.csb.app/";
const appName = document.title.split(" - ")[0];
const chat = io(SERVER + "chat", {
  autoConnect: false,
  reconnection: false,
  forceNew: true,
  closeOnBeforeunload: true,
  extraHeaders: {
    user: document.cookie,
  },
});
const voice = io(SERVER + "voice", {
  autoConnect: false,
  reconnection: false,
  forceNew: true,
  closeOnBeforeunload: true,
  extraHeaders: {
    user: document.cookie,
  },
});
const converter = new showdown.Converter();
const icon = document.querySelector("#icon");
const cb = document.querySelector("#chat-box");
const cms = document.querySelector("#chat-messages");
if (cb)
  cb.onanimationend = () => {
    cms.scrollTop = cms.scrollHeight;
  };

const getDeviceId = () => {
  const id = localStorage.getItem("deviceId");
  if (id) return id;
  const newId = crypto.randomUUID();
  localStorage.setItem("deviceId", newId);
  return newId;
};

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

const loading = document.createElement("div");
loading.id = "loading";
loading.className = "loading";
for (let i = 0; i < 4; i++) loading.appendChild(document.createElement("div"));

let online = {},
  missed = 0,
  loadingMessages = false,
  rns = {},
  lastNotification = null;

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
  const emojiPattern = /\p{Extended_Pictographic}/gu;
  const urlPattern = /((https?:\/\/)[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/g;
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
  if (s.startsWith("<tool-status>")) {
    const m = s.replace("<tool-status>", "").replace("</tool-status>", "").split("|");
    const id = m[0], tn = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const shape = getSvg("shape", "M8 2.5H30C30 2.5 35.5 2.5 35.5 8V30C35.5 30 35.5 35.5 30 35.5H8C8 35.5 2.5 35.5 2.5 30V8C2.5 8 2.5 2.5 8 2.5Z", { width: "25", height: "25", strokeWidth: "1", strokeLinecap: "round", viewBox: "0 0 38 38" });
    const pic = getSvg("pic", "M12.1 2a9.8 9.8 0 0 0-5.4 1.6l6.4 6.4a2.1 2.1 0 0 1 .2 3a2.1 2.1 0 0 1-3-.2L3.7 6.4A9.84 9.84 0 0 0 2 12.1a10.14 10.14 0 0 0 10.1 10.1a10.9 10.9 0 0 0 2.6-.3l6.7 6.7a5 5 0 0 0 7.1-7.1l-6.7-6.7a10.9 10.9 0 0 0 .3-2.6A10 10 0 0 0 12.1 2Zm8 10.1a7.61 7.61 0 0 1-.3 2.1l-.3 1.1l.8.8l6.7 6.7a2.88 2.88 0 0 1 .9 2.1A2.72 2.72 0 0 1 27 27a2.9 2.9 0 0 1-4.2 0l-6.7-6.7l-.8-.8l-1.1.3a7.61 7.61 0 0 1-2.1.3a8.27 8.27 0 0 1-5.7-2.3A7.63 7.63 0 0 1 4 12.1a8.33 8.33 0 0 1 .3-2.2l4.4 4.4a4.14 4.14 0 0 0 5.9.2a4.14 4.14 0 0 0-.2-5.9L10 4.2a6.45 6.45 0 0 1 2-.3a8.27 8.27 0 0 1 5.7 2.3a8.49 8.49 0 0 1 2.4 5.9Z", { width: "1em", height: "1em", fill: "currentColor", viewBox: "0 0 32 32" });
    return `
      <div id="tool-status" class="status-${id} complete">
        <div id="icon">
          ${shape.outerHTML}
          ${pic.outerHTML}
        </div>
        <div id="tool-text">${tn} tool completed</div>
        <div id="loader"></div>
      </div>
    `;
  }
  s = s.replace(/<\s*br[^>]?>/, "\n").replace(/(<([^>]+)>)/g, "") || " ";
  s = s.replace(urlPattern, (m) => {
    if (m.startsWith("http")) return `<a href="${m}" target="_blank">${m}</a>`;
    return `<a href="http://${m}" target="_blank">${m}</a>`;
  });
  s = s.replace(emailPattern, (m) => `<a href="mailto:${m}">${m}</a>`);
  if (s.startsWith("/files/")) {
    const src = (SERVER + s).replace("//files", "/files");
    if (src.includes(".svg+xml")) {
      const randId = "svg-" + crypto.randomUUID();
      fetch(src)
        .then((r) => r.text())
        .then((r) => {
          cms.scrollTop = cms.scrollHeight;
          const svg = document.querySelector(`#${randId}`);
          if (!svg) return;
          svg.innerHTML = r;
          const s = svg.querySelector("svg");
          s.style.width = "100%";
          s.style.height = "auto";
        });
      return `<div id="${randId}"></div>`;
    }
    const ext = src.split(".").pop();
    if (ext == "mp4" || ext == "webm" || ext == "ogg") {
      const v = document.createElement("video");
      v.src = src;
      v.controls = true;
      v.onloadedmetadata = () => {
        if (!sc) return;
        cms.scrollTop = cms.scrollHeight;
      };
      return v.outerHTML;
    } else if (ext == "mp3" || ext == "wav" || ext == "ogg") {
      const a = document.createElement("audio");
      a.src = src;
      a.controls = true;
      a.onloadedmetadata = () => {
        if (!sc) return;
        cms.scrollTop = cms.scrollHeight;
      };
      return a.outerHTML;
    } else if (ext == "pdf") {
      const a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.innerText = "View PDF";
      return a.outerHTML;
    } else if (ext == "png" || ext == "jpg" || ext == "jpeg" || ext == "gif" || ext == "webp") {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        if (!sc) return;
        cms.scrollTop = cms.scrollHeight;
      };
      return `<img src="${src}">`;
    }
  } else {
    if (s.replace(emojiPattern, "").length == 0)
      return `<p id="emoji" class="${
        user.settings.emoji ? "" : "disabled"
      }">${s}</p>`;
    s = converter.makeHtml(s);
    s = s.replace(/<img[^>]*>/g, "");
    s = s.replace(/<video[^>]*>/g, "");
    s = s.replace(/<audio[^>]*>/g, "");
    if (s.includes("@")) {
      Object.keys(profiles).forEach((p) => {
        const u = p.replace(" ", "-");
        if (s.includes("@" + u)) {
          const mention = `<span class="mention" onclick="(${(id) => {
            const r =
              document.querySelector(`.c-${id}-${user.id}`) ||
              document.querySelector(`.c-${user.id}-${id}`);
            if (r) switchChat(r);
          }})(${profiles[p].id})">@${p}</span>`;
          const r = new RegExp("@" + u, "g");
          s = s.replace(r, mention);
        }
      });
    }
    return s;
  }
};

const getSvg = (id, path, opts = {}) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("id", id);
  svg.setAttribute("viewBox", "0 0 512 512");
  svg.setAttribute("fill", "currentColor");
  Object.keys(opts).forEach((k) => svg.setAttribute(k, opts[k]));
  svg.innerHTML = `<path d="${path}" id="${id}-path"/>`;
  return svg;
};

const findProfile = (id, k = "id") => {
  const keys = Object.keys(profiles);
  for (const p in keys)
    if (profiles[keys[p]][k] === id) return profiles[keys[p]];
  return null;
};

const getProfile = (u, info = true) => {
  const pc = document.createElement("div");
  pc.id = "profile";
  pc.className = u.name.replaceAll(" ", "-");
  pc.title = u.name;
  const initials = u.name
    .split(" ")
    .map((e) => e[0])
    .join("");
  if (u.color) pc.style.background = toRgba(u.color, 0.6);
  const initialsDiv = document.createElement("div");
  initialsDiv.id = "initials";
  initialsDiv.innerText = initials;
  initialsDiv.style.display = "none";
  pc.appendChild(initialsDiv);
  const p = document.createElement("img");
  p.src = SERVER + u.profile;
  p.alt = u.name;
  const pError = () =>
    (p.style.display = "none") && (initialsDiv.style.display = "block");
  p.onerror = pError;
  if (!u.profile) pError();
  pc.appendChild(p);
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

const messageOnclick = (e) => {
  let el = e.target;
  const id = el.id;
  if (!id) return;
  const c = id.split("-");
  if (c.length == 2) el = el.parentElement;
  else if (c.length == 3) el = el.parentElement.parentElement;
  if (id.includes("edit")) editOnclick(el);
  else if (id.includes("reply")) replyOnclick(el);
  else if (id.includes("delete")) deleteOnclick(el);
  else if (id.includes("react") && !id.includes("reacts")) reactOnclick(el);
};

if (cms) cms.onclick = messageOnclick;

const editOnclick = (e) => {
  if (e.contentEditable != "inherit") return;
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
    if (e.key == "Enter" || e.key == "Escape") m.blur();
  };
};

const replyOnclick = (e) => {
  if (e.contentEditable != "inherit") return;
  const cm = e.parentElement.parentElement;
  const m = cm.querySelector("#message");
  const id = m.className.split(" ")[0].replace("m-", "");
  const r = createMessage(["", user, new Date(), null, -1], false, true, 0)[0];
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
    if (e.key == "Enter" || e.key == "Escape") rm.blur();
  };
  updateMessageProfiles();
};

const deleteOnclick = (e) => {
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

const reactOnclick = (e) => {
  const cm = e.parentElement.parentElement;
  const m = cm.querySelector("#message");
  const u =
    profiles[cm.querySelector("#profile").className.replace("-", " ")].name;
  const id = m.className.split(" ")[0].replace("m-", "");
  chat.emit("react", {
    id,
    profile: u,
    room: user.room,
  });
  e.remove();
};

const addReplies = (m) => {
  const replies = m.replies || [];
  const myUser = user.name == m.name;
  const cms =
    getCurrentTab() != "voice"
      ? document.querySelector("#chat-messages")
      : document.querySelector("#voice-chat-messages");
  const r = document.createElement("div");
  r.id = "replies";
  r.classList.add("r-" + m.id);
  r.classList.add("u" + profiles[m.name].id);
  r.classList.add(myUser ? "right" : "left");
  replies.forEach((e, i) => {
    const [c, appendEl, appendBefore] = createMessage(
      [e.message, profiles[e.name], e.date, replies[i - 1], m.id],
      false,
      user.name == e.name,
      i,
      false,
      true,
      r,
    );
    if (c.id == "cont") r.appendChild(c);
    else if (appendEl) appendEl.appendChild(c);
    else if (appendBefore) appendEl.insertBefore(c, appendBefore);
  });
  const msg = cms.querySelector(".m-" + m.id);
  msg.parentElement.parentElement.insertBefore(
    r,
    msg.parentElement.nextSibling,
  );
  updateMessageProfiles();
};

const createReacts = (reacts) => {
  const r = document.createElement("div");
  r.id = "reacts";
  r.title = Object.values(reacts)
    .map((e) => e.name || findProfile(e)?.name)
    .join(", ");
  const rt = document.createElement("div");
  rt.id = "reacts-text";
  rt.innerText = reacts.length;
  const e = document.createElement("div");
  e.id = "reacts-emoji";
  e.innerText = "😀";
  r.appendChild(e);
  r.appendChild(rt);
  return r;
};

const createMessage = (
  [message, u, d, lm, mId, reacts = []],
  start,
  myUser,
  currMessages,
  buttons = false,
  reply = false,
  replyDiv = null,
) => {
  const cm = document.createElement("div");
  cm.id = "chat-message";
  if (!reply) cm.classList.add("msg");
  const pc = getProfile(u, false);
  const m = document.createElement("div");
  m.id = "message";
  if (!reply)
    m.classList.add(typeof currMessages != "undefined" ? "m-" + mId : "");
  m.style.background = toRgba(u.color, 0.5);
  m.innerHTML = linkify(message, !start);
  const opts = document.createElement("div");
  opts.id = "options";
  if (buttons) {
    if (myUser) {
      const edit = document.createElement("div");
      edit.id = "edit";
      edit.title = "Edit";
      const editSvg = getSvg(
        "edit-svg",
        "M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152V424c0 48.6 39.4 88 88 88H360c48.6 0 88-39.4 88-88V312c0-13.3-10.7-24-24-24s-24 10.7-24 24V424c0 22.1-17.9 40-40 40H88c-22.1 0-40-17.9-40-40V152c0-22.1 17.9-40 40-40H200c13.3 0 24-10.7 24-24s-10.7-24-24-24H88z",
      );
      edit.appendChild(editSvg);
      if (m.querySelectorAll("img").length == 0) opts.appendChild(edit);
      const del = document.createElement("div");
      del.id = "delete";
      del.title = "Delete";
      const delSvg = getSvg(
        "delete-svg",
        "M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z",
      );
      del.appendChild(delSvg);
      opts.appendChild(del);
    }
    const reply = document.createElement("div");
    reply.id = "reply";
    reply.title = "Reply";
    const replySvg = getSvg(
      "reply-svg",
      "M205 34.8c11.5 5.1 19 16.6 19 29.2v64H336c97.2 0 176 78.8 176 176c0 113.3-81.5 163.9-100.2 174.1c-2.5 1.4-5.3 1.9-8.1 1.9c-10.9 0-19.7-8.9-19.7-19.7c0-7.5 4.3-14.4 9.8-19.5c9.4-8.8 22.2-26.4 22.2-56.7c0-53-43-96-96-96H224v64c0 12.6-7.4 24.1-19 29.2s-25 3-34.4-5.4l-160-144C3.9 225.7 0 217.1 0 208s3.9-17.7 10.6-23.8l160-144c9.4-8.5 22.9-10.6 34.4-5.4z",
    );
    reply.appendChild(replySvg);
    opts.appendChild(reply);
    if (!reacts.some((e) => e == user.id || e.id == user.id)) {
      const react = document.createElement("div");
      react.id = "react";
      react.title = "React";
      const reactSvg = getSvg(
        "react-svg",
        "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866Zm2.023 6.828a.75.75 0 1 0-1.06-1.06 3.75 3.75 0 0 1-5.304 0 .75.75 0 0 0-1.06 1.06 5.25 5.25 0 0 0 7.424 0Z",
        {
          viewBox: "0 0 24 24",
          "clip-rule": "evenodd",
          "fill-rule": "evenodd",
        },
      );
      react.appendChild(reactSvg);
      opts.appendChild(react);
    }
    cm.appendChild(opts);
  }
  if (!myUser) {
    cm.classList.add("right");
    m.classList.add("right");
    opts.className = "left";
    cm.appendChild(pc);
  }
  cm.appendChild(m);
  if (myUser) {
    pc.style.display = "none";
    cm.classList.add("left");
    m.classList.add("left");
    opts.className = "right";
    cm.appendChild(pc);
  }

  if (reacts.length > 0) {
    const r = createReacts(reacts);
    cm.appendChild(r);
  }

  const cont = document.createElement("div");
  cont.id = "cont";
  cont.className = "u" + u.id;

  const cms = reply
    ? replyDiv
    : getCurrentTab() != "voice"
      ? document.querySelector("#chat-messages")
      : document.querySelector("#voice-chat-messages");
  const prev = start ? cms.firstChild : cms.lastChild;
  const ld = lm ? lm.date : null;
  let appendEl = null,
    appendBefore = null,
    contEl = false;
  if (
    prev?.classList.contains("u" + u.id) &&
    new Date(d).getMinutes() - new Date(ld).getMinutes() < 1
  ) {
    appendEl = prev;
    if (start) appendBefore = prev.firstChild.nextSibling;
  } else {
    contEl = true;
    const n = document.createElement("div");
    n.id = "name";
    n.className = myUser ? "right" : "left";
    n.innerText = myUser ? "" : u.name;
    const time = document.createElement("div");
    time.id = "time";
    const month = new Date(d).getMonth() - new Date().getMonth();
    const day = new Date(d).getDate() - new Date().getDate();
    const year = new Date(d).getFullYear() - new Date().getFullYear();
    const o = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    if (month) o.month = "long";
    if (day) o.weekday = "long";
    if (year) o.year = "numeric";
    time.innerHTML = d ? new Date(d).toLocaleString("en-us", o) : "";
    n.appendChild(time);
    cont.appendChild(n);
    cont.appendChild(cm);
    appendEl = cms;
    if (start) appendBefore = cms.firstChild;
  }
  return [contEl ? cont : cm, appendEl, appendBefore];
};

const addMessage = (
  [message, u, d, lm = null, mId = 0, replies = [], reacts = []],
  scroll = true,
  start = false,
) => {
  if (!user.visible && !loadingMessages) {
    const t = document.title.replace(/\(\d+\)/, "");
    missed++;
    document.title = "(" + missed + ") " + t;
  }
  const myUser = u.name == user.name;
  if (start) currMessages++;
  if (getCurrentTab() != "voice") maxMessagesReached = mId == 0;
  const cms =
    getCurrentTab() != "voice"
      ? document.querySelector("#chat-messages")
      : document.querySelector("#voice-chat-messages");
  if (!cms) return;
  cms.innerHTML = cms.innerHTML.replace("Sorry, no messages here...", "");
  const atBottom =
    Math.abs(cms.scrollHeight - cms.clientHeight - cms.scrollTop) <= 200;

  const [c, appendEl, appendBefore] = createMessage(
    [message, u, d, lm, mId, reacts],
    start,
    myUser,
    currMessages,
    getCurrentTab() != "voice",
  );

  if (start) appendEl.insertBefore(c, appendBefore);
  else appendEl.appendChild(c);

  const cm = c.id == "cont" ? c.firstChild.nextSibling : c;
  addReplies({
    m: message,
    name: u.name,
    date: d,
    id: mId,
    replies,
  });

  c.querySelectorAll("pre code").forEach((el) => hljs.highlightBlock(el));

  updateMessageProfiles();

  if (scroll && !start && atBottom) {
    cms.scrollTo({
      top: cms.scrollHeight,
      behavior: "smooth",
    });
    cm.animate(
      {
        opacity: [0, 1],
        transform: ["scale(0)", "scale(1.1)", "scale(1)"],
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
  if (tab.id == "logout") {
    document.cookie = "user=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/";
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab.id);
  const tabId = tab.dataset.id || tab.id;
  document.title =
    appName +
    " - " +
    tabId
      .split(" ")
      .map((e) => e[0].toUpperCase() + e.slice(1))
      .join(" ");
  window.history.replaceState({}, "", url);
  tabs
    .querySelectorAll("div.tab")
    .forEach((e) => e.classList.remove("selected"));
  tab.classList.add("selected");
  const c = document.querySelector(".person-" + user.peerId);
  if (c)
    c.querySelectorAll("#video").forEach((e) => {
      e.srcObject?.getTracks().forEach((t) => {
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
    if (chat.connected) chat.disconnect();
    if (!voice.connected) voice.connect();
    document.querySelector("#voice-chat-messages").innerHTML = "";
    document.querySelector("#chat-messages").innerHTML = "";
  } else {
    if (voice.connected) voice.disconnect();
    if (!chat.connected) chat.connect();
    for (const m in peer.connections)
      peer.connections[m].forEach((c) => c.close());
  }
  if (tab.id == "files" && !filesLoaded) loadFiles();
};

const createNotification = ([m, u, r]) => {
  if (user.settings.dontDisturb) return;
  if (!rns[r]) rns[r] = r;
  const notifications = document.querySelector("#notifications");
  if (new Date().getTime() - lastNotification > 10000) playNotificationSound();
  const n = document.createElement("div");
  n.id = "notification";
  const p = getProfile(u, false);
  const cont = document.createElement("div");
  cont.id = "cont";
  const name = document.createElement("div");
  name.id = "n";
  const room =
    rns[r].replace("-", ",").split(",")[0] >= Object.values(profiles)[0].id
      ? ""
      : " in <b>" + rns[r] + "</b>";
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
    if (e.target.id == "x" || e.target.id == "x-svg") return;
    const lr =
      document.querySelector(".c-" + r) ||
      document.querySelector(
        ".c-" + r.replace("-", ",").split(",").reverse().join("-"),
      ) ||
      document.querySelector("." + r);
    switchTab(tabs.querySelector("#messages"));
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

const playNotificationSound = () => {
  lastNotification = new Date().getTime();
  const s = new Audio(
    SERVER + "sounds/" + user.settings.notificationSound + ".mp3",
  );
  s.play().catch(() => {});
};
