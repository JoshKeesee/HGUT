const settingToggles = document.querySelectorAll(".settings-toggle");
const settingForms = document.querySelectorAll(".settings-form");
const dropdowns = document.querySelectorAll(".dropdown");
const settingUser = document.querySelector("#settings-user");

settingToggles.forEach((t) => {
  t.addEventListener("click", async () => {
    const s = t.dataset.setting;
    const n = s == "notifications";
    if (!n) user.settings[s] = !t.classList.contains("active");
    else user.settings[s][getDeviceId()] = !t.classList.contains("active");
    if (s == "theme" || s == "accent")
      switchTheme(
        user.settings.theme,
        user.settings.accent ? user.color : "#0000ff",
      );
    if (s == "emoji")
      document.querySelectorAll("#emoji").forEach((e) => {
        e.classList.toggle("disabled", !user.settings.emoji);
      });
    if (s == "dontDisturb" && user.settings[s])
      createStatus("Do not disturb enabled", "info");
    t.classList.toggle(
      "active",
      n ? user.settings[s][getDeviceId()] : user.settings[s],
    );
    chat.emit("settings", user.settings);
  });
});

settingForms.forEach((f) => {
  f.querySelectorAll("#settings-show-password").forEach((p) => {
    p.addEventListener("click", () => {
      const i = f.querySelector("#settings-new-password");
      i.type = i.type == "password" ? "text" : "password";
    });
  });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const s = f.dataset.setting;
    const sub = f.querySelector(".submit");
    if (sub.disabled) return;
    if (s == "password") {
      const o = f.querySelector("#settings-old-password").value;
      const n = f.querySelector("#settings-new-password").value;
      if (!o) return createStatus("Enter your old password", "error");
      if (!n) return createStatus("Enter a new password", "error");
      if (o == n)
        return createStatus("New password can't be the same", "error");
      if (n.length < 6)
        return createStatus("Password must be at least 6 characters", "error");
      if (n.length > 50)
        return createStatus(
          "Password can't be longer than 50 characters",
          "error",
        );
      if (n.match(/\s/))
        return createStatus("Password can't contain spaces", "error");
      sub.disabled = true;
      const c = setTimeout(() => {
        createStatus("Error: request timed out", "error");
        sub.disabled = false;
      }, 5000);
      chat.emit("password", [o, n], (success) => {
        if (!success) return createStatus("An error occurred", "error");
        createStatus("Password updated", "success");
        f.reset();
        clearTimeout(c);
      });
    }
  });
});

dropdowns.forEach((d) => {
  const a = d.classList.contains("up");
  const opts = d.querySelectorAll(".option");
  opts.forEach((o) => {
    if (o.parentElement.classList.contains("submenu")) return;
    o.addEventListener("click", () => {
      opts.forEach((o) => o.classList.remove("selected"));
      if (!a) {
        o.classList.add("selected");
        const c = d.querySelector(".current");
        c.innerText = o.innerText;
        c.dataset.value = o.dataset.value;
      }
      if (o.classList.contains("has-submenu")) {
        const sub = d.querySelector(`#submenu-${o.dataset.value}`);
        sub.classList.toggle("active");
        if (sub.classList.contains("active"))
          opts.forEach((o) => o.classList.add("hidden"));
        else opts.forEach((o) => o.classList.remove("hidden"));
      } else d.querySelector(".options").classList.remove("active");
    });
  });
  d.addEventListener("click", (e) => {
    if (
      d.querySelector(".select").contains(e.target) &&
      !e.target.classList.contains("options") &&
      !e.target.classList.contains("option")
    ) {
      d.querySelector(".options").classList.toggle("active");
      d.querySelector(".options .option.selected")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      d.querySelectorAll(".submenu").forEach((s) =>
        s.classList.remove("active"),
      );
      opts.forEach((o) => o.classList.remove("hidden"));
    }
  });
  window.addEventListener("click", (e) => {
    if (!d.contains(e.target))
      d.querySelector(".options").classList.remove("active");
  });
});

const createEmoji = (e, d) => {
  const emoji = document.createElement("div");
  emoji.className = "emoji";
  emoji.innerText = e;
  emoji.onclick = () => {
    const a = emojiAnimations[emojis.indexOf(e)];
    if (a) {
      emoji.innerText = "";
      const em = document.createElement("div");
      em.className = "emoji-animation";
      em.style.animationName = "emoji-" + a;
      em.style.animationDuration = a == "tada" ? "2s" : "1s";
      em.style.animationIterationCount = a == "tada" ? "1" : "2";
      em.style.animationTimingFunction = "ease-in-out";
      em.innerText = e;
      em.addEventListener("animationend", () => em.style = "");
      emoji.appendChild(em);
    }
  };
  const del = document.createElement("div");
  del.className = "delete";
  const delSvg = getSvg("x-svg", "M18 6L6 18M6 6l12 12", {
    fill: "#fff",
    stroke: "#fff",
    viewBox: "0 0 24 24",
    "stroke-width": 2,
    "stroke-linecap": "round",
  });
  del.appendChild(delSvg);
  del.onclick = () => {
    chat.emit("remove emoji", e, (emojis) => {
      user.emojis = emojis;
      const addEmoji = document.querySelector(".add-emoji");
      addEmoji.disabled = user.emojis.length >= maxCustomEmojis;
      emoji.remove();
      createStatus("Emoji deleted", "success");
      setEmojis();
    });
  };
  if (d) emoji.appendChild(del);
  return emoji;
};

const updateSettings = () => {
  settingUser.querySelector("#settings-username").innerText = user.name;
  settingUser.querySelector("#settings-born").innerText = "Born: " + user.dob;
  const p = settingUser.querySelector("#settings-profile");
  p.innerHTML = "";
  const pr = getProfile(user);
  const edit = document.createElement("div");
  edit.id = "edit-profile";
  edit.onclick = () => {
    const selectImg = document.createElement("input");
    selectImg.type = "file";
    selectImg.accept = "image/*";
    selectImg.onchange = (e) => {
      const reader = new FileReader();
      reader.onload = () => {
        pr.src = reader.result;
        chat.emit("profile", pr.src, () =>
          createStatus("Profile picture updated", "success"),
        );
      };
      reader.readAsDataURL(e.target.files[0]);
      selectImg.remove();
    };
    selectImg.click();
  };
  const editSvg = getSvg(
    "edit-svg",
    "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    {
      fill: "none",
      stroke: "#fff",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      viewBox: "0 0 24 24",
    },
  );
  edit.appendChild(editSvg);
  pr.appendChild(edit);
  p.appendChild(pr);
  Object.keys(user.settings || {}).forEach((k) => {
    const t = document.querySelector(`.settings-toggle[data-setting="${k}"]`);
    if (t) t.classList.toggle("active", user.settings[k]);
    else {
      const d = document.querySelector(`.dropdown[data-setting="${k}"]`);
      if (!d) return;
      d.querySelector(".current").innerText = user.settings[k].replaceAll(
        "-",
        " ",
      );
      if (k == "notificationSound") {
        chat.emit("get sounds", (sounds) => {
          d.querySelector(".options").innerHTML = "";
          sounds.forEach((s) => {
            const opt = document.createElement("div");
            opt.className = "option";
            opt.innerText = s.replaceAll("-", " ");
            opt.dataset.value = s;
            if (s == user.settings[k]) opt.classList.add("selected");
            opt.addEventListener("click", () => {
              user.settings[k] = s;
              const c = d.querySelector(".current");
              c.innerText = s.replaceAll("-", " ");
              c.dataset.value = s;
              d.querySelector(".options").classList.remove("active");
              d.querySelectorAll(".option").forEach((o) =>
                o.classList.remove("selected"),
              );
              opt.classList.add("selected");
              playNotificationSound();
              chat.emit("settings", user.settings);
            });
            d.querySelector(".options").appendChild(opt);
          });
        });
      }
    }
  });
  if (!user.emojis) user.emojis = [];
  const emojiCont = document.querySelector(".custom-emojis");
  emojiCont.innerHTML = "";
  emojis.forEach((e) => {
    emojiCont.appendChild(createEmoji(e, user.emojis.includes(e)));
  });
  const addEmoji = document.querySelector(".add-emoji");
  addEmoji.disabled = user.emojis.length >= maxCustomEmojis;
  const emojiInput = document.querySelector("#custom-emoji-input");
  const emojiClick = (e) => {
    if (e.key && e.key != "Enter") return;
    const emoji = emojiInput.value;
    const ep = /[\p{Emoji}]/gu;
    if (!emoji) return;
    if (user.emojis.length >= maxCustomEmojis)
      return createStatus("You can't add more emojis", "error");
    if (user.emojis.includes(emoji))
      return createStatus("You already have this emoji", "error");
    if (emojis.includes(emoji))
      return createStatus("You can't add a default emoji", "error");
    if (!emoji.match(ep)) return createStatus("Invalid emoji", "error");
    if (emoji.match(ep).length > 1)
      return createStatus("Only one emoji allowed", "error");
    chat.emit("add emoji", emoji, (emojis) => {
      user.emojis = emojis;
      emojiCont.appendChild(createEmoji(emoji, true));
      emojiInput.value = "";
      addEmoji.disabled = user.emojis.length >= maxCustomEmojis;
      createStatus("Emoji added", "success");
      setEmojis();
    });
  };
  addEmoji.onclick = emojiClick;
  emojiInput.onkeyup = emojiClick;
};

document
  .querySelector(".settings-button.logout")
  .addEventListener("click", () =>
    switchTab(document.querySelector("#logout")),
  );
