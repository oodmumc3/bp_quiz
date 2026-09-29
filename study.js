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
