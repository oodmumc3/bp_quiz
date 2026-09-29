// 프로세스별 BP를 고정 순서로 묶어서 보여주기 위한 그룹 정의.
// 그룹 경계는 assessment/study/01_skeleton.md에서 정리한 패턴과 동일하다.
const PROCESS_META = [
  {
    proc: "MGD.2",
    title: "Requirements for data management and data quality",
    purposeId: "M2-P",
    groups: [
      { label: "짓기", ids: ["M2-1", "M2-2", "M2-3"] },
      { label: "검증", ids: ["M2-4"] },
      { label: "연결", ids: ["M2-5"] },
      { label: "알리기", ids: ["M2-6"] },
    ],
  },
  {
    proc: "MGD.3",
    title: "Data management system and data flows",
    purposeId: "M3-P",
    groups: [
      { label: "틀", ids: ["M3-1", "M3-2"] },
      { label: "지점", ids: ["M3-3", "M3-4", "M3-5"] },
      { label: "데이터 자체", ids: ["M3-6", "M3-7"] },
      { label: "마무리", ids: ["M3-8", "M3-9"] },
    ],
  },
  {
    proc: "DOP.1",
    title: "Data integration and deployment",
    purposeId: "D1-P",
    groups: [
      { label: "방법", ids: ["D1-1"] },
      { label: "품질기준 고르기", ids: ["D1-2"] },
      { label: "실행", ids: ["D1-3", "D1-4"] },
      { label: "사람 준비", ids: ["D1-5"] },
      { label: "배포", ids: ["D1-6"] },
    ],
  },
  {
    proc: "DOP.2",
    title: "Data operations and optimization",
    purposeId: "D2-P",
    groups: [
      { label: "방법", ids: ["D2-1"] },
      { label: "모니터링 3종 + 품질 수행", ids: ["D2-2", "D2-3", "D2-4", "D2-5"] },
      { label: "목적 확인", ids: ["D2-6"] },
    ],
  },
  {
    proc: "MGD.1",
    title: "Data management scope and business case (배경, 퀴즈 제외)",
    purposeId: "M1-P",
    bg: true,
    groups: [
      { label: null, ids: ["M1-1", "M1-2", "M1-3", "M1-4"] },
    ],
  },
];

function findCard(id) {
  return DECK.find(c => c.id === id);
}

function renderStudy() {
  const nav = document.getElementById("jumpNav");
  const main = document.getElementById("studyMain");
  let navHtml = "";
  let mainHtml = "";

  PROCESS_META.forEach(meta => {
    navHtml += '<a href="#' + meta.proc + '">' + meta.proc + (meta.bg ? " (배경)" : "") + '</a>';

    const purpose = findCard(meta.purposeId);
    mainHtml += '<section id="' + meta.proc + '" class="proc-section' + (meta.bg ? ' bg' : '') + '">';
    mainHtml += '<h2>' + meta.proc + '<span class="proc-title">' + meta.title + '</span></h2>';
    mainHtml += '<div class="purpose">Purpose: ' + purpose.short + '</div>';

    meta.groups.forEach(g => {
      mainHtml += '<div class="group">';
      if (g.label) mainHtml += '<div class="group-label">[ ' + g.label + ' ]</div>';
      g.ids.forEach(id => {
        const c = findCard(id);
        mainHtml += '<div class="bp-row"><span class="bp-num">' + c.bp + '</span><span class="bp-text">' + c.short + '</span></div>';
        if (c.why) {
          mainHtml += '<div class="bp-why">왜? ' + c.why + '</div>';
        }
      });
      mainHtml += '</div>';
    });

    mainHtml += '</section>';
  });

  nav.innerHTML = navHtml;
  main.innerHTML = mainHtml;
}

renderStudy();
