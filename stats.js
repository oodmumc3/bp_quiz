const LOG_KEY = "bpquiz_log_v1";

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function cardLabel(id) {
  const c = DECK.find(d => d.id === id);
  return c ? c.proc + " " + c.bp : id;
}

function groupByDate(log) {
  const map = {};
  log.forEach(e => {
    if (!map[e.date]) map[e.date] = { correct: 0, wrong: 0 };
    if (e.correct) map[e.date].correct++; else map[e.date].wrong++;
  });
  return Object.keys(map).sort().map(date => Object.assign({ date: date }, map[date]));
}

function worstCards(log, limit) {
  const map = {};
  log.forEach(e => {
    if (!map[e.id]) map[e.id] = { total: 0, wrong: 0 };
    map[e.id].total++;
    if (!e.correct) map[e.id].wrong++;
  });
  return Object.keys(map)
    .map(id => ({ id: id, label: cardLabel(id), total: map[id].total, wrong: map[id].wrong }))
    .filter(x => x.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || b.total - a.total)
    .slice(0, limit);
}

function renderSummary(log) {
  const total = log.length;
  const correct = log.filter(e => e.correct).length;
  const rate = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById("summary").textContent =
    total ? ("총 " + total + "회 시도 · 정답 " + correct + "회 (" + rate + "%)") : "아직 기록이 없습니다. 퀴즈를 먼저 풀어보세요.";
}

function renderChart(byDate) {
  const el = document.getElementById("chart");
  if (byDate.length === 0) {
    el.innerHTML = '<div class="empty">그래프를 그릴 기록이 없습니다.</div>';
    return;
  }
  const barW = 28, gap = 14, padTop = 10, padBottom = 34, maxH = 140;
  const maxTotal = Math.max.apply(null, byDate.map(d => d.correct + d.wrong));
  const svgW = byDate.length * (barW + gap) + gap;
  const svgH = padTop + maxH + padBottom;

  let bars = "";
  byDate.forEach((d, i) => {
    const x = gap + i * (barW + gap);
    const total = d.correct + d.wrong;
    const scale = maxTotal ? maxH / maxTotal : 0;
    const wrongH = d.wrong * scale;
    const correctH = d.correct * scale;
    const wrongY = padTop + (maxH - wrongH);
    const correctY = wrongY - correctH;
    if (d.wrong > 0) {
      bars += '<rect x="' + x + '" y="' + wrongY + '" width="' + barW + '" height="' + wrongH + '" fill="#e07a6f" rx="2" />';
    }
    if (d.correct > 0) {
      bars += '<rect x="' + x + '" y="' + correctY + '" width="' + barW + '" height="' + correctH + '" fill="#6fae6f" rx="2" />';
    }
    const label = d.date.slice(5);
    bars += '<text x="' + (x + barW / 2) + '" y="' + (padTop + maxH + 16) + '" font-size="10" text-anchor="middle" fill="currentColor">' + label + '</text>';
    bars += '<text x="' + (x + barW / 2) + '" y="' + (padTop + maxH + 28) + '" font-size="10" text-anchor="middle" fill="currentColor">' + total + '</text>';
  });

  el.innerHTML = '<svg width="' + svgW + '" height="' + svgH + '" viewBox="0 0 ' + svgW + ' ' + svgH + '">' + bars + '</svg>';
}

function renderWorst(list) {
  const el = document.getElementById("worstList");
  if (list.length === 0) {
    el.innerHTML = '<div class="empty">아직 틀린 기록이 없습니다.</div>';
    return;
  }
  let html = "";
  list.forEach(w => {
    html += '<div class="worst-row"><span>' + w.label + '</span><span class="wcount">' + w.wrong + '회 틀림 / ' + w.total + '회 시도</span></div>';
  });
  el.innerHTML = html;
}

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("기록을 전부 지울까요? (박스 진행 상태는 유지됩니다)")) {
    localStorage.removeItem(LOG_KEY);
    location.reload();
  }
});

const log = loadLog();
renderSummary(log);
renderChart(groupByDate(log));
renderWorst(worstCards(log, 8));
