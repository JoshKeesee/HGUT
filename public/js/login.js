let theme = false, user = {};

const switchTheme = (dark = !theme) => {
	theme = dark;
	const d = dark ? "dark" : "light";
	document.body.className = d;
	document.querySelector("form").className = d + "-box";
	document.querySelector("#light-icon").style.opacity = theme ? 0 : 1;
	document.querySelector("#dark-icon").style.opacity = theme ? 1 : 0;
};

if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) switchTheme(true);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches }) => switchTheme(matches));
document.querySelector("#theme").onclick = () => switchTheme();