let theme = false, user = {};

const switchTheme = (dark = !theme) => {
	theme = dark;
	const d = dark ? "dark" : "light";
	document.body.className = d;
	document.querySelector("form").className = d + "-box";
	document.querySelector("meta[name=theme-color]").setAttribute("content", user.theme ? "#000014" : user.accent ? rgbToHex(toRgba(user.color)) : rgbToHex("rgb(0, 0, 255)"));
};

if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) switchTheme(true);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();