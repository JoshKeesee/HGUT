const settingToggles = document.querySelectorAll(".settings-toggle");
const settingUser = document.querySelector("#settings-user");

settingToggles.forEach(t => {
    t.addEventListener("click", async () => {
        const s = t.dataset.setting;
        user.settings[s] = !t.classList.contains("active");
        if (
            s == "theme" ||
            s == "accent"
        ) switchTheme(user.settings.theme, user.settings.accent ? user.color : "#0000ff");
        if (s == "notifications" && user.settings.notifications) user.settings.notifications = await askNotification();
        if (s == "emoji") document.querySelectorAll("#emoji").forEach(e => {
            e.classList.toggle("disabled", !user.settings.emoji);
        });
        t.classList.toggle("active", user.settings[s]);
        chat.emit("settings", user.settings);
    });
});

const updateSettings = () => {
    settingUser.querySelector("#settings-username").innerText = user.name;
    settingUser.querySelector("#settings-born").innerText = user.dob;
    const p = settingUser.querySelector("#settings-profile");
    p.innerHTML = "";
    p.appendChild(getProfile(user));
    Object.keys(user.settings || {}).forEach(k => {
        const t = document.querySelector(`.settings-toggle[data-setting="${k}"]`);
        if (t) t.classList.toggle("active", user.settings[k]);
    });
};

document.querySelector(".settings-button.logout").addEventListener("click", () => switchTab(document.querySelector("#logout")));