const st = document.querySelector("#status");

const createStatus = (text, type, u = null) => {
  const s = document.createElement("div");
  s.classList.add("status");
  s.classList.add(type);
  if (type == "person") {
    if (u.name == user.name) return;
    const profile = getProfile(u);
    s.appendChild(profile);
    const n = document.createElement("div");
    n.innerText = text;
    s.appendChild(n);
  } else s.innerHTML = text;
  st.appendChild(s);
  setTimeout(() => st.removeChild(s), 5000);
};

window.addEventListener("offline", () => createStatus("Offline", "error"));
window.addEventListener("online", () => createStatus("Online", "success"));
