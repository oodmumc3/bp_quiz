const STORAGE_KEY = "bpquiz_v1";
const LOG_KEY = "bpquiz_log_v1";
const INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7 };

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCardState(state, id) {
  return state[id] || { box: 1, nextDue: todayStr() };
}

function logAttempt(id, correct) {
  let log;
  try {
    log = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch (e) {
    log = [];
  }
  log.push({ date: todayStr(), id: id, correct: correct });
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

let state = loadState();
let includeBg = false;
let queue = [];
let current = null;
let revealed = false;
let sessionSeen = 0;
let sessionTotal = 0;

const els = {
  boxCounts: document.getElementById("boxCounts"),
  dueCount: document.getElementById("dueCount"),
  cardArea: document.getElementById("cardArea"),
  includeBgToggle: document.getElementById("includeBgToggle"),
  reshuffleBtn: document.getElementById("reshuffleBtn"),
  reviewAllBtn: document.getElementById("reviewAllBtn"),
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function activeDeck() {
  return DECK.filter(c => includeBg || !c.bg);
}

function buildQueue(forceAll) {
  const today = todayStr();
  const pool = activeDeck().filter(c => {
    if (forceAll) return true;
    const s = getCardState(state, c.id);
    return s.nextDue <= today;
  });
  queue = shuffle(pool);
  sessionTotal = queue.length;
  sessionSeen = 0;
  nextCard();
}

function renderBoxCounts() {
  const deck = activeDeck();
  const counts = { 1: 0, 2: 0, 3: 0 };
  deck.forEach(c => {
    const s = getCardState(state, c.id);
    counts[s.box] = (counts[s.box] || 0) + 1;
  });
  els.boxCounts.textContent =
    "Box1 " + counts[1] + " · Box2 " + counts[2] + " · Box3 " + counts[3] + " (총 " + deck.length + "장)";
  const today = todayStr();
  const dueNow = deck.filter(c => getCardState(state, c.id).nextDue <= today).length;
  els.dueCount.textContent = "오늘 복습 대상: " + dueNow + "장";
}

function nextCard() {
  revealed = false;
  if (queue.length === 0) {
    renderEmpty();
    renderBoxCounts();
    return;
  }
  current = queue.shift();
  sessionSeen++;
  renderCard();
}

function renderEmpty() {
  els.cardArea.innerHTML =
    '<div class="empty">오늘 복습할 카드가 없습니다.<br>전부 아직 다음 복습일이 안 됐거나, 배경 카드가 꺼져 있습니다.</div>' +
    '<div class="progress">이번 세션: ' + sessionSeen + " / " + sessionTotal + '</div>';
}

function renderCard() {
  const c = current;
  let html = '<div class="progress">이번 세션: ' + sessionSeen + " / " + sessionTotal + '</div>';
  html += '<div class="proc">' + c.proc + (c.bg ? ' <span class="tag">배경</span>' : '') + '</div>';
  html += '<div class="bp">' + c.bp + '?</div>';

  if (!revealed) {
    html += '<button id="revealBtn" class="primary">정답 보기</button>';
  } else {
    html += '<div class="answer">' + c.short + '</div>';
    if (c.why) {
      html += '<div class="why">왜? ' + c.why + '</div>';
    }
    html += '<div class="grade-row">' +
      '<button id="wrongBtn" class="grade wrong">틀림</button>' +
      '<button id="rightBtn" class="grade right">맞음</button>' +
      '</div>';
  }
  els.cardArea.innerHTML = html;

  if (!revealed) {
    document.getElementById("revealBtn").addEventListener("click", () => {
      revealed = true;
      renderCard();
    });
  } else {
    document.getElementById("wrongBtn").addEventListener("click", () => grade(false));
    document.getElementById("rightBtn").addEventListener("click", () => grade(true));
  }
}

function grade(correct) {
  const s = getCardState(state, current.id);
  const newBox = correct ? Math.min(s.box + 1, 3) : 1;
  state[current.id] = { box: newBox, nextDue: addDays(todayStr(), INTERVAL_DAYS[newBox]) };
  saveState(state);
  logAttempt(current.id, correct);
  renderBoxCounts();
  nextCard();
}

els.includeBgToggle.addEventListener("change", () => {
  includeBg = els.includeBgToggle.checked;
  renderBoxCounts();
  buildQueue(false);
});

els.reshuffleBtn.addEventListener("click", () => buildQueue(false));
els.reviewAllBtn.addEventListener("click", () => buildQueue(true));

renderBoxCounts();
buildQueue(false);
