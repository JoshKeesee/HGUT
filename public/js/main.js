const icon = document.querySelector("#icon");

const toRgba = (hex, alpha, obj) => {
	const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
	if (obj) return { r, g, b };
	else if (alpha) return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
	else return "rgb(" + r + ", " + g + ", " + b + ")";
};

const rgbToHex = rgb => "#" + rgb.replace("rgb(", "").replace(")", "").split(", ").map(x => {
	x = user.theme ? Math.max(x - 235, 0) : Math.min(x + 230, 255);
	const hex = Number(x).toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}).join("");

icon.onclick = () => window.location.href = "/";