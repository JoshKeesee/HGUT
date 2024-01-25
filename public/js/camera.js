const cameraCont = document.querySelector("#camera");
const video = document.querySelector("#camera video");
const canvas = document.querySelector("#camera canvas");
const ctx = canvas.getContext("2d");
const cameraTake = document.querySelector("#camera-take");
const cameraCancel = document.querySelector("#camera-cancel");
const darken = document.querySelector("#darken");

const initCamera = () => {
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "environment",
      },
      audio: false,
    })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
      cameraCont.classList.add("toggled");
    })
    .catch(() => {});
};

const cancelCamera = () => {
  cameraCont.classList.remove("toggled");
  video.srcObject
    .getTracks()
    .forEach((t) => t.stop() && video.srcObject.removeTrack(t));
  video.pause();
  video.srcObject = null;
  video.load();
};

cameraTake.addEventListener("click", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  cameraCont.classList.add("hidden");
  chat.emit("chat message", canvas.toDataURL());
  cancelCamera();
});
cameraCancel.addEventListener("click", cancelCamera);
darken.addEventListener("click", cancelCamera);
