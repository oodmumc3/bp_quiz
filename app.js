const STORAGE_KEY = "bpquiz_v1";
const LOG_KEY = "bpquiz_log_v1";
const UI_KEY = "bpquiz_ui_v1";
const INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7 };

// 시험일(YYYY-MM-DD). 다음 복습일이 시험 전날을 넘지 않도록 당기고, 화면에 D-day를 표시한다.
// 지난 날짜는 자동으로 무시된다.
const EXAM_DATES = [
  { date: "2026-10-07", label: "사전 검사" },
  { date: "2026-10-15", label: "본 평가" },
];

// 틀린 카드를 같은 세션 안에서 다시 내는 규칙. 다시 푼 결과는 박스와 로그에 반영하지 않는다.
const RETRY_GAP = 3;   // 몇 장 뒤에 다시 낼지
const MAX_RETRIES = 2; // 세션 안에서 다시 내는 최대 횟수

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

function daysBetween(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  return Math.round((new Date(ty, tm - 1, td) - new Date(fy, fm - 1, fd)) / 86400000);
}

// 박스 간격대로 다음 복습일을 정하되, 다가오는 시험 전날보다 늦어지면 전날로 당긴다.
// 시험 전날 당일에는 당기지 않는다(내일이 시험이므로 원래 간격을 그대로 쓴다).
function nextDueFor(today, box) {
  const candidate = addDays(today, INTERVAL_DAYS[box]);
  const upcoming = EXAM_DATES.map(e => e.date).filter(d => d > today).sort()[0];
  if (!upcoming) return candidate;
  const eve = addDays(upcoming, -1);
  return eve > today && eve < candidate ? eve : candidate;
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

const DEFAULT_UI = { scope: "all", order: "shuffle" };

function loadUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY)) || {};
    return {
      scope: typeof saved.scope === "string" ? saved.scope : DEFAULT_UI.scope,
      order: saved.order === "sequential" ? "sequential" : DEFAULT_UI.order,
    };
  } catch (e) {
    return { ...DEFAULT_UI };
  }
}

function saveUi(ui) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch (e) {
    console.warn("화면 설정을 저장하지 못했습니다.", e);
  }
}

let state = loadState();
let ui = loadUi();
let includeBg = false;
let queue = [];          // [{ card, retries }] — retries가 1 이상이면 이번 세션의 재출제
let current = null;
let currentRetries = 0;
let revealed = false;
let sessionSeen = 0;
let sessionTotal = 0;

const els = {
  examInfo: document.getElementById("examInfo"),
  boxCounts: document.getElementById("boxCounts"),
  dueCount: document.getElementById("dueCount"),
  scopeChips: document.getElementById("scopeChips"),
  orderShuffle: document.getElementById("orderShuffle"),
  orderSequential: document.getElementById("orderSequential"),
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

function activeProcs() {
  return activeDeck().map(c => c.proc).filter((p, i, all) => all.indexOf(p) === i);
}

// 저장된 범위가 현재 덱에 없으면(예: 배경 카드를 끈 MGD.1) 전체로 본다.
function effectiveScope() {
  return ui.scope === "all" || activeProcs().includes(ui.scope) ? ui.scope : "all";
}

function scopedDeck() {
  const scope = effectiveScope();
  return activeDeck().filter(c => scope === "all" || c.proc === scope);
}

function isDue(card, today) {
  return getCardState(state, card.id).nextDue <= today;
}

function buildQueue(forceAll) {
  const today = todayStr();
  const pool = scopedDeck().filter(c => forceAll || isDue(c, today));
  const ordered = ui.order === "shuffle" ? shuffle(pool) : pool;
  queue = ordered.map(card => ({ card: card, retries: 0 }));
  sessionTotal = queue.length;
  sessionSeen = 0;
  nextCard();
}

function renderExamInfo() {
  const today = todayStr();
  els.examInfo.textContent = EXAM_DATES
    .filter(e => e.date >= today)
    .map(e => {
      const days = daysBetween(today, e.date);
      return e.label + " " + (days === 0 ? "오늘" : "D-" + days);
    })
    .join(" · ");
}

function renderScopeChips() {
  const today = todayStr();
  const scope = effectiveScope();
  const deck = activeDeck();
  const options = [{ key: "all", label: "전체", cards: deck }].concat(
    activeProcs().map(p => ({ key: p, label: p, cards: deck.filter(c => c.proc === p) }))
  );
  els.scopeChips.innerHTML = options.map(o => {
    const due = o.cards.filter(c => isDue(c, today)).length;
    return '<button id="scope-' + o.key + '" class="chip' + (o.key === scope ? " active" : "") + '">' +
      o.label + " " + due + "</button>";
  }).join("");
  options.forEach(o => {
    document.getElementById("scope-" + o.key).addEventListener("click", () => {
      applyUiChange({ scope: o.key });
      renderScopeChips();
    });
  });
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
  const dueNow = deck.filter(c => isDue(c, today)).length;
  els.dueCount.textContent = "오늘 복습 대상: " + dueNow + "장";
  renderScopeChips();
}

function nextCard() {
  revealed = false;
  if (queue.length === 0) {
    renderEmpty();
    renderBoxCounts();
    return;
  }
  const entry = queue[0];
  queue = queue.slice(1);
  current = entry.card;
  currentRetries = entry.retries;
  if (currentRetries === 0) sessionSeen++;
  renderCard();
}

function renderEmpty() {
  els.cardArea.innerHTML =
    '<div class="empty">오늘 복습할 카드가 없습니다.<br>전부 아직 다음 복습일이 안 됐거나, 배경 카드가 꺼져 있습니다.</div>' +
    '<div class="progress">이번 세션: ' + sessionSeen + " / " + sessionTotal + '</div>';
}

// 정답 공개 후 보여주는 한 줄: 이 BP가 프로세스 흐름의 어디에 있는지. Purpose와 배경 카드는 표시하지 않는다.
function flowHtml(card) {
  const meta = PROCESS_META.find(m => m.proc === card.proc);
  if (!meta || meta.bg || !meta.groups.some(g => g.ids.includes(card.id))) return "";
  const groups = meta.groups.map(g => {
    const isCurrent = g.ids.includes(card.id);
    const bps = g.ids.map(id => {
      const bp = findCard(id).bp;
      return id === card.id ? "▶" + bp : bp;
    }).join(" ");
    return '<span class="flow-group' + (isCurrent ? " current" : "") + '">' +
      (g.label ? g.label + " " : "") + bps + "</span>";
  });
  return '<div class="flow">흐름: ' + groups.join(" → ") + "</div>";
}

function renderCard() {
  const c = current;
  const pending = queue.filter(e => e.retries > 0).length;
  let html = '<div class="progress">이번 세션: ' + sessionSeen + " / " + sessionTotal +
    (pending > 0 ? " · 다시 풀 카드 " + pending + "장" : "") + '</div>';
  html += '<div class="proc">' + c.proc + (c.bg ? ' <span class="tag">배경</span>' : '') +
    (currentRetries > 0 ? ' <span class="tag retry">다시</span>' : '') + '</div>';
  html += '<div class="bp">' + c.bp + '?</div>';

  if (!revealed) {
    html += '<button id="revealBtn" class="primary">정답 보기</button>';
  } else {
    html += '<div class="answer">' + c.short + '</div>';
    if (c.why) {
      html += '<div class="why">왜? ' + c.why + '</div>';
    }
    html += flowHtml(c);
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

// 박스·복습일·시도 로그에 반영하는 것은 세션의 첫 시도뿐이다.
function recordAttempt(correct) {
  const s = getCardState(state, current.id);
  const newBox = correct ? Math.min(s.box + 1, 3) : 1;
  state[current.id] = { box: newBox, nextDue: nextDueFor(todayStr(), newBox) };
  saveState(state);
  logAttempt(current.id, correct);
}

function requeueCurrent() {
  const entry = { card: current, retries: currentRetries + 1 };
  const at = Math.min(RETRY_GAP, queue.length);
  queue = [...queue.slice(0, at), entry, ...queue.slice(at)];
}

function grade(correct) {
  if (currentRetries === 0) recordAttempt(correct);
  if (!correct && currentRetries < MAX_RETRIES) requeueCurrent();
  renderBoxCounts();
  nextCard();
}

function applyUiChange(patch) {
  ui = { ...ui, ...patch };
  saveUi(ui);
  buildQueue(false);
}

els.includeBgToggle.addEventListener("change", () => {
  includeBg = els.includeBgToggle.checked;
  renderBoxCounts();
  buildQueue(false);
});

els.orderShuffle.addEventListener("change", () => applyUiChange({ order: "shuffle" }));
els.orderSequential.addEventListener("change", () => applyUiChange({ order: "sequential" }));

els.reshuffleBtn.addEventListener("click", () => buildQueue(false));
els.reviewAllBtn.addEventListener("click", () => buildQueue(true));

els.orderShuffle.checked = ui.order === "shuffle";
els.orderSequential.checked = ui.order === "sequential";
renderExamInfo();
renderBoxCounts();
buildQueue(false);
