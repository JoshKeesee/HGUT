const cInput = document.querySelector("#chat-input");
const vcInput = document.querySelector("#voice-chat-input");
const maxTokens = 5
let lastInput, numTokens = 1;

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
            max_tokens: numTokens,
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
    if (e.key == "Tab") e.preventDefault();
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key == "ArrowLeft" || e.key == "ArrowRight" || e.key == "ArrowUp" || e.key == "ArrowDown" || e.key == "Escape") return el.dataset.predicted = "";
    const cp = window.getSelection().getRangeAt(0).startOffset;
    if (cp < el.innerText.length) return;
    if (e.key == "Enter" || e.key == "Backspace") return;
    if (el.innerText.endsWith(" ") && el.dataset.predicted) el.dataset.predicted = "";
    if (e.key == "Tab") {
        if (!el.dataset.predicted) return;
        el.innerText += el.dataset.predicted.replace(" [TAB]", "");
        setCursor(el, el.innerText.length);
        el.dataset.predicted = "";
        numTokens += 1;
        if (numTokens > maxTokens) numTokens = maxTokens;
    } else if (el.dataset.predicted) {
        if (e.key == el.dataset.predicted[0]) {
            el.dataset.predicted = el.dataset.predicted.slice(1);
            if (el.dataset.predicted != " [TAB]") return;
        }
        el.dataset.predicted = "";
    } else numTokens = 1;
    if (el.innerText.length < 2) return el.dataset.predicted = "";
};

const waitFn = async (e, el) => {
    clearTimeout(lastInput);
    lastInput = setTimeout(async () => {
        if (!user?.settings?.predictText) return el.dataset.predicted = "";
        if (el.dataset.predicted) return;
        let p = await predictText(el.innerText);
        if (!p || !p.trim()) return el.dataset.predicted = "";
        p += " [TAB]";
        el.dataset.predicted = p;
        if (el.innerHTML.endsWith(" ")) el.dataset.predicted = p.trim();
    }, 100);
};

cInput.addEventListener("keydown", (e) => predictFn(e, cInput));
cInput.addEventListener("keyup", (e) => waitFn(e, cInput));
vcInput.addEventListener("keydown", (e) => predictFn(e, vcInput));
vcInput.addEventListener("keyup", (e) => waitFn(e, vcInput));