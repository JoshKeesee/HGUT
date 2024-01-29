const animateGridItem = (
  g,
  c,
  n,
  p,
  i,
  { duration = 500, stagger = 0, easing = "ease" },
) => {
  if (p.x == n.x && p.y == n.y && p.width == n.width && p.height == n.height)
    maxI++;
  c.style.position = "absolute";
  c.style.top = p.y - g.y + "px";
  c.style.left = p.x - g.x + "px";
  c.style.width = p.width + "px";
  c.style.height = p.height + "px";
  setTimeout(
    () => {
      c.style.position = "";
      c.style.top = "";
      c.style.left = "";
      c.style.width = "";
      c.style.height = "";
      c.animate(
        [
          {
            position: "absolute",
            top: p.y - g.y + "px",
            left: p.x - g.x + "px",
            width: p.width + "px",
            height: p.height + "px",
          },
          {
            position: "absolute",
            top: n.y - g.y + "px",
            left: n.x - g.x + "px",
            width: n.width + "px",
            height: n.height + "px",
          },
        ],
        {
          duration,
          easing,
        },
      );
    },
    (i - maxI) * stagger,
  );
};

const animateGrid = async (grid, after, opts = {}) => {
  const prevFilePositions = [],
    nextFilePositions = [];
  let children = [...grid.children];
  const origNum = children.length;
  children.forEach((c, i) => {
    const n = c.getBoundingClientRect();
    prevFilePositions[i] = {
      width: n.width.toFixed(0),
      height: n.height.toFixed(0),
      x: n.x.toFixed(0),
      y: n.y.toFixed(0),
    };
  });
  if (opts.sync) await after();
  else after();
  children = [...grid.children];
  if (children.length > origNum) {
    for (let i = origNum; i < children.length; i++) {
      const c = children[i];
      const n = c.getBoundingClientRect();
      prevFilePositions[i] = nextFilePositions[i] = {
        width: n.width.toFixed(0),
        height: n.height.toFixed(0),
        x: n.x.toFixed(0),
        y: n.y.toFixed(0),
      };
    }
  }
  children.forEach((c, i) => {
    const n = c.getBoundingClientRect();
    nextFilePositions[i] = {
      width: n.width.toFixed(0),
      height: n.height.toFixed(0),
      x: n.x.toFixed(0),
      y: n.y.toFixed(0),
    };
  });
  const g = grid.getBoundingClientRect();
  maxI = 0;
  [...grid.children].forEach((c, i) => {
    const n = nextFilePositions[i];
    const p = prevFilePositions[i];
    animateGridItem(g, c, n, p, i, opts);
  });
};
