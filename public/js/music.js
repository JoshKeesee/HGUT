const inst = new Tone.Sampler({
  urls: {
    A0: "A0.mp3",
    C1: "C1.mp3",
    "D#1": "Ds1.mp3",
    "F#1": "Fs1.mp3",
    A1: "A1.mp3",
    C2: "C2.mp3",
    "D#2": "Ds2.mp3",
    "F#2": "Fs2.mp3",
    A2: "A2.mp3",
    C3: "C3.mp3",
    "D#3": "Ds3.mp3",
    "F#3": "Fs3.mp3",
    A3: "A3.mp3",
    C4: "C4.mp3",
    "D#4": "Ds4.mp3",
    "F#4": "Fs4.mp3",
    A4: "A4.mp3",
    C5: "C5.mp3",
    "D#5": "Ds5.mp3",
    "F#5": "Fs5.mp3",
    A5: "A5.mp3",
    C6: "C6.mp3",
    "D#6": "Ds6.mp3",
    "F#6": "Fs6.mp3",
    A6: "A6.mp3",
    C7: "C7.mp3",
    "D#7": "Ds7.mp3",
    "F#7": "Fs7.mp3",
    A7: "A7.mp3",
    C8: "C8.mp3",
  },
  release: 2,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

const keyMap = {
  a: "c",
  w: "c#",
  s: "d",
  e: "d#",
  d: "e",
  f: "f",
  t: "f#",
  g: "g",
  y: "g#",
  h: "a",
  u: "a#",
  j: "b",
  k: "c",
};

const keyColors = [
  "#ff0000",
  "#ff8000",
  "#ffff00",
  "#80ff00",
  "#00ff00",
  "#00ff80",
  "#00ffff",
  "#0080ff",
  "#0000ff",
  "#8000ff",
  "#ff00ff",
  "#ff0080",
];

const down = (e) => {
  if (getCurrentTab() != "music") return;
  const k = e.target;
  const { key, octave, note, index: i } = k.dataset;
  if (octave == currOctave + 1 && km[nn + (i % nn)])
    k.dataset.key = km[nn + (i % nn)];
  k.dataset.note = keyMap[k.dataset.key] + octave;
  if (e.key && currOctave != octave && km.indexOf(key) < nn) return;
  if (!(e.buttons == 1 || e.key)) return;
  k.style.background = keyColors[Object.keys(keyMap).indexOf(key) % nn];
  k.dataset.now = Tone.now();
  inst.triggerAttack(note, k.dataset.now);
  if (!e.dontSend) chat.emit("note start", note);
};
const up = (e) => {
  if (getCurrentTab() != "music") return;
  const k = e.target;
  const { key, octave, note, now } = k.dataset;
  if (e.key && currOctave != octave && km.indexOf(key) < nn) return;
  k.style.background = k.classList.contains("black") ? "#000" : "#fff";
  inst.triggerRelease(note, now);
  if (!e.dontSend) chat.emit("note stop", note);
};

const createKey = (i, l, o = 4) => {
  const k = document.createElement("div");
  k.classList.add("key");
  k.classList.add(keyMap[l].includes("#") ? "black" : "white");
  k.dataset.index = i;
  k.dataset.key = l;
  k.dataset.octave = o;
  k.dataset.note = keyMap[l] + o;
  k.innerHTML = k.dataset.note;
  k.addEventListener("mousedown", down);
  k.addEventListener("mouseup", up);
  k.addEventListener("mouseover", down);
  k.addEventListener("mouseleave", up);
  window.addEventListener(
    "keydown",
    (e) =>
      !(e.key != k.dataset.key || e.repeat) &&
      down({
        target: k,
        key: e.key,
      }),
  );
  window.addEventListener(
    "keyup",
    (e) =>
      !(e.key != k.dataset.key) &&
      up({
        target: k,
        key: e.key,
      }),
  );
  return k;
};

const musCont = document.querySelector("#music-container");
const keys = document.querySelector(".keys");
const km = Object.keys(keyMap);
let octaves = 6,
  startOctave = 1,
  nn = 12,
  currOctave = 4;

const initMusic = () => {
  octaves = Math.max(1, Math.floor(musCont.offsetWidth / 200));
  document
    .querySelector(":root")
    .style.setProperty(
      "--octave-width",
      musCont.offsetWidth / 7 - octaves * 2 + "px",
    );
  document.querySelector(":root").style.setProperty("--octaves", octaves);
  keys.innerHTML = "";
  for (let i = startOctave; i < octaves + startOctave; i++) {
    km.filter((k, j) => j < nn).forEach((k, j) =>
      keys.appendChild(
        createKey(j * (1 + i - startOctave), k, j == km.length - 1 ? i + 1 : i),
      ),
    );
  }
};

Tone.loaded().then(() => {
  chat.on("note start", ([note, u]) => {
    if (getCurrentTab() != "music") return;
    const k = document.querySelector(`div[data-note="${note}"]`);
    down({
      target: k,
      buttons: 1,
      dontSend: true,
    });
  });
  chat.on("note stop", ([note, u]) => {
    if (getCurrentTab() != "music") return;
    const k = document.querySelector(`div[data-note="${note}"]`);
    up({
      target: k,
      buttons: 1,
      dontSend: true,
    });
  });

  initMusic();
  new ResizeObserver(initMusic).observe(musCont);
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key == "z") currOctave--;
    if (e.key == "x") currOctave++;
    currOctave = Math.min(octaves, Math.max(startOctave, currOctave));
  });
});
