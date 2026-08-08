const rounds = [
  {
    text: "The cat sat on the",
    options: [[" mat", 52], [" floor", 25], [" chair", 15], [" moon", 8]]
  },
  {
    text: "The cat sat on the mat",
    options: [[".", 68], [" and", 14], [",", 11], [" because", 7]]
  },
  {
    text: "The cat sat on the mat.",
    options: [[" It", 43], [" The", 31], [" Then", 17], ["\n", 9]]
  },
  {
    text: "The cat sat on the mat. It",
    options: [[" was", 46], [" looked", 29], [" purred", 16], [" had", 9]]
  }
];

const textElement = document.querySelector("#generated-text");
const optionsElement = document.querySelector("#token-options");
const stepElement = document.querySelector("#step-count");
const dotsElement = document.querySelector("#step-dots");
const statusElement = document.querySelector("#demo-status");
const nextButton = document.querySelector("#next-token");
const resetButton = document.querySelector("#reset-demo");

let roundIndex = 0;
let latestToken = "";

function visibleToken(token) {
  if (token === "\n") return "newline";
  if (token.startsWith(" ")) return token.slice(1);
  return token;
}

function renderText(text, highlightedToken) {
  textElement.replaceChildren();
  if (!highlightedToken) {
    textElement.textContent = text;
    return;
  }

  const prefix = text.slice(0, -highlightedToken.length);
  textElement.append(document.createTextNode(prefix));
  const token = document.createElement("span");
  token.className = "new-token";
  token.textContent = highlightedToken;
  textElement.append(token);
}

function render() {
  const round = rounds[roundIndex];
  renderText(round.text, latestToken);
  stepElement.textContent = `${roundIndex + 1} / ${rounds.length}`;
  dotsElement.replaceChildren();
  rounds.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = `step-dot${index === roundIndex ? " is-active" : ""}${index < roundIndex ? " is-done" : ""}`;
    dotsElement.append(dot);
  });
  optionsElement.replaceChildren();

  round.options.forEach(([token, probability], index) => {
    const row = document.createElement("div");
    row.className = `token-option${index === 0 ? " is-likely" : ""}`;
    row.innerHTML = `
      <span class="token-name">
        <span class="token-space"></span>
        <span class="token-label"></span>
        <span class="top-choice"></span>
      </span>
      <span class="probability-track"><span class="probability-fill"></span></span>
      <span class="probability-value">${probability}%</span>
    `;
    row.querySelector(".token-label").textContent = visibleToken(token);
    row.querySelector(".token-space").textContent = token.startsWith(" ") ? "space +" : "token";
    row.querySelector(".top-choice").textContent = index === 0 ? "most likely" : "";
    row.querySelector(".probability-fill").style.width = `${probability}%`;
    optionsElement.append(row);
  });

  nextButton.disabled = false;
  nextButton.innerHTML = "<span>Choose the most likely</span><span aria-hidden=\"true\">→</span>";
}

function chooseNextToken() {
  const chosenToken = rounds[roundIndex].options[0][0];
  statusElement.textContent = `Chosen token: ${visibleToken(chosenToken)}`;

  if (roundIndex === rounds.length - 1) {
    renderText(`${rounds[roundIndex].text}${chosenToken}`, chosenToken);
    nextButton.disabled = true;
    nextButton.innerHTML = "<span>Sequence complete</span><span aria-hidden=\"true\">✓</span>";
    return;
  }

  roundIndex += 1;
  latestToken = chosenToken;
  render();
}

function reset() {
  roundIndex = 0;
  latestToken = "";
  statusElement.textContent = "";
  render();
}

nextButton.addEventListener("click", chooseNextToken);
resetButton.addEventListener("click", reset);
render();
