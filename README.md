# BP 퀴즈

Automotive SPICE 데이터 관리 표준(MGD.2 / MGD.3 / DOP.1 / DOP.2)의 Base Practice(BP)를 암기하기 위한 간격 반복 퀴즈 웹앱입니다. MGD.1은 배경 카드로, 토글로만 포함됩니다.

## 접속

GitHub Pages로 배포되어 있습니다: https://oodmumc3.github.io/bp_quiz/

## 로컬 실행

빌드나 설치가 필요 없습니다. `index.html`을 브라우저로 열면 됩니다.

```bash
open index.html
# 다른 기기(폰 등)에서 확인할 때
python3 -m http.server 8000
```

## 페이지

| 페이지 | 설명 |
|---|---|
| `index.html` | 퀴즈. 정답을 확인한 뒤 맞음/틀림을 고르면 복습 간격이 조정됩니다. |
| `study.html` | 전체 보기. 프로세스별로 정답을 항상 표시하는 참고용 목록입니다. |
| `stats.html` | 통계. 날짜별 맞음/틀림 그래프와 자주 틀리는 카드를 보여줍니다. |

## 복습 방식

라이트너(Leitner) 박스 방식입니다. 맞으면 다음 박스로 올라가고, 틀리면 Box1로 돌아갑니다.

| 박스 | 다음 복습까지 |
|---|---|
| Box1 | 1일 |
| Box2 | 3일 |
| Box3 | 7일 |

진행 상태와 시도 기록은 브라우저 localStorage에만 저장됩니다. 브라우저 데이터를 지우면 함께 사라집니다.

## 카드 수정

카드 원본은 `deck.js`입니다. 카드를 추가하거나 삭제하면 `study.js`의 `PROCESS_META`도 함께 고쳐야 합니다. 자세한 내용은 `CLAUDE.md`를 참고하세요.
