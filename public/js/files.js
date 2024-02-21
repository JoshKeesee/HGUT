let filesLoaded = false;

const loadFiles = (a) => {
  const fr = a?.target?.id == "files-refresh";
  chat.emit("files", (f) => {
    if (fr) createStatus("Files refreshed", "success");
    filesLoaded = true;
    const files = document.querySelector("#files-content");
    files.innerHTML = "";
    const e = f.reverse();
    if (!e.length) return (files.innerHTML = "No files found");
    let li = null;
    e.forEach((f, i) => {
      const c = document.createElement("div");
      c.id = "file-cont";
      c.style.backgroundImage = `url(${SERVER + f.url})`;
      if (Math.floor(Math.random() * 5) == 0 && (i - li > 3 || !li)) {
        c.classList.add("active");
        li = i;
      }
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

document.querySelector("#files-refresh").onclick = loadFiles;
