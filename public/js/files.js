const grid = document.querySelector("#files-content");
animateCSSGrid.wrapGrid(grid, {
  duration: 1000,
  easing: "anticipate",
  stagger: 100,
});

const loadFiles = () => {
  chat.emit("files", (e) => {
    const files = document.querySelector("#files-content");
    files.innerHTML = "";
    e.forEach((f) => {
      const c = document.createElement("div");
      c.id = "file-cont";
      c.style.backgroundImage = `
        linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5)), url(${SERVER + f.url})
      `;
      let r = roomNames[f.room];
      if (r.includes(user.id))
        r =
          Object.values(profiles).find(
            (p) => p.id == r.replace(user.id, "").replace("-", ""),
          )?.name || r;
      c.innerHTML = f.name + " - " + r;
      files.appendChild(c);
      c.onclick = () => {
        c.classList.toggle("active");
        c.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        // window.open(SERVER + f.url);
      };
    });
  });
};
