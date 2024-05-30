const cInput = document.querySelector("#chat-input");
const vcInput = document.querySelector("#voice-chat-input");

const predictText = async (text) => {
    if (!text) return;
    const response = await fetch(SERVER + "predict-text", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            text,
            max_tokens: 1,
            user: decodeURI(
                document.cookie
                  .split(";")
                  .find((c) => c.includes("user="))
                  .split("=")[1],
            ),
        }),
    });
    const data = await response.json();
    const predicted = data["response"].replaceAll("\n", " ").replaceAll("  ", " ");
    return predicted;
};

const setCursor = (el, pos) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(el.childNodes[0], pos);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
};

const predictFn = async (e, el) => {
    if (!user?.settings?.predictText) return el.dataset.predicted = "";
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.key == "Escape" || e.key == "ArrowLeft" || e.key == "ArrowRight" || e.key == "ArrowUp" || e.key == "ArrowDown") return;
    const cp = window.getSelection().getRangeAt(0).startOffset;
    if (cp < el.innerText.length) return;
    if (e.key == "Enter" || e.key == "Backspace") return;
    if (el.innerText.endsWith(" ") && el.dataset.predicted) el.dataset.predicted = "";
    if (e.key == "Tab") {
        e.preventDefault();
        if (!el.dataset.predicted) return;
        el.innerText += el.dataset.predicted.replace(" [TAB]", "");
        setCursor(el, el.innerText.length);
        el.dataset.predicted = "";
    } else if (el.dataset.predicted) {
        if (e.key == el.dataset.predicted[0]) {
            el.dataset.predicted = el.dataset.predicted.slice(1);
            if (el.dataset.predicted != " [TAB]") return;
        }
        el.dataset.predicted = "";
    }
    const p = await predictText(el.innerText);
    if (!p || !p.trim()) return el.dataset.predicted = "";
    el.dataset.predicted = p + " [TAB]";
};

cInput.addEventListener("keydown", (e) => predictFn(e, cInput));
vcInput.addEventListener("keydown", (e) => predictFn(e, vcInput));