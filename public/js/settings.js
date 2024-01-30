const settingToggles = document.querySelectorAll(".settings-toggle");
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
    if (n && user.settings.notifications[getDeviceId()])
      user.settings.notifications[getDeviceId()] = await askNotification();
    if (s == "emoji")
      document.querySelectorAll("#emoji").forEach((e) => {
        e.classList.toggle("disabled", !user.settings.emoji);
      });
    if (s == "dontDisturb" && user.settings[s]) createStatus("Do not disturb enabled", "info");
    t.classList.toggle(
      "active",
      n ? user.settings[s][getDeviceId()] : user.settings[s],
    );
    chat.emit("settings", user.settings);
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
        chat.emit("profile", pr.src, (profile) => {
          user.profile = profile;
          p.querySelector("img").src = SERVER + profile;
          createStatus("Profile picture updated", "success");
        });
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
    if (k == "notifications")
      t.classList.toggle("active", user.settings[k][getDeviceId()] || false);
    else if (t) t.classList.toggle("active", user.settings[k]);
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
};

document
  .querySelector(".settings-button.logout")
  .addEventListener("click", () =>
    switchTab(document.querySelector("#logout")),
  );
