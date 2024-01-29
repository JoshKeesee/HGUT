const loadFiles = () => {
  chat.emit("files", (e) => {
    const files = document.querySelector("#files-content");
    files.innerHTML = "";
    e.forEach((f) => {
      const c = document.createElement("div");
      c.id = "file-cont";
      c.style.backgroundImage = `url(${SERVER + f.url})`;
      let r = roomNames[f.room];
      if (r.includes(user.id))
        r =
          Object.values(profiles).find(
            (p) => p.id == r.replace(user.id, "").replace("-", ""),
          )?.name || r;
      const name = document.createElement("div");
      name.id = "file-name";
      name.innerHTML = f.name + " - " + r;
      const bg = document.createElement("div");
      bg.id = "file-bg";
      c.appendChild(bg);
      c.appendChild(name);
      files.appendChild(c);
      c.onclick = () => {
        const after = () => {
          c.classList.toggle("active");
          c.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        };
        animateGrid(files, after);
      };
    });
  });
};
