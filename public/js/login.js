let theme = false;
const form = document.querySelector("form");

form.onsubmit = async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const r = await fetch(SERVER + "login", {
    method: "POST",
    body: JSON.stringify(Object.fromEntries(data)),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const j = await r.json();
  if (j.error) form.querySelector(".error").textContent = j.error;
  else {
    document.cookie = `user=${j.user}; max-age=9999999999999; expires=${new Date(Date.now() + 9999999999999)};`;
    window.location.href = j.redirect;
  }
};

const switchTheme = (dark = !theme) => {
  theme = dark;
  const d = dark ? "dark" : "light";
  document.body.className = d;
  document.querySelector("form").className = d + "-box";
  document.querySelector("#light-icon").style.opacity = theme ? 0 : 1;
  document.querySelector("#dark-icon").style.opacity = theme ? 1 : 0;
};

if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
)
  switchTheme(true);
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();
