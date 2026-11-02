/* In-app help. Tours only explain the UI; they never operate training or Bluetooth. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const support = $('support-card');
  const example = 'https://makecode.microbit.org/#pub:62343-18345-41686-48165';
  support.innerHTML = `
    <summary><span><strong>사용 가이드 및 지원</strong><small>사용법 · 예제 코드 · 문제 해결</small></span><span class="support-chevron" aria-hidden="true">⌄</span></summary>
    <div class="support-content">
      <p class="support-intro">처음이라면 화면 안내부터 시작해보세요. 블루투스 연결 없이 인식하고 전송할 데이터를 먼저 확인할 수 있습니다. 기기를 연결하면 실제 데이터를 전송합니다.</p>
      <div class="support-actions">
        <button type="button" data-tour="all" class="support-primary">사용법 둘러보기 <span aria-hidden="true">→</span></button>
      </div>
      <details class="support-section" id="help-examples"><summary>내 기기에 맞는 예제</summary><div class="support-answer device-examples"><p class="device-intro">표지판을 ID별로 학습하고 사용할 기기에 맞는 예제를 선택해주세요.</p><div class="device-prepare"><span class="prepare-label">공통 준비</span><a href="https://makecode.microbit.org/S49771-77509-50114-72682" target="_blank" rel="noopener noreferrer">블루투스 이름 확인 코드 <span aria-hidden="true">↗</span></a><p>LED에 표시되는 이름(알파벳 소문자 5자리)을 확인한 뒤 사용할 프로젝트 코드를 다운로드하세요.</p><a href="https://boundaryx.io/58/?bmode=view&idx=164575855&category=367m618X50" target="_blank" rel="noopener noreferrer">모델에 학습시킬 표지판 출력하기 <span aria-hidden="true">↗</span></a><p>방향 제어: ID1 좌회전 · ID2 우회전 · ID3 방향 전환 · ID4 정지 · ID5 배경<br>속도 제어: ID1 저속 · ID2 고속 · ID3 정지 · ID4 배경</p><p>방향·속도 제어는 각각 별도 학습 데이터로 사용하세요. 표지판이 없는 배경도 학습해주세요.</p></div><div class="device-example-list"><article class="device-example-card"><div class="device-example-heading"><h4>마이크로비트 기본</h4><span class="device-tag">마이크로비트만 사용</span></div><p>학습한 ID에 따라 원하는 동작을 만들어보세요.</p><div class="device-example-links"><a id="project-example-link" href="https://makecode.microbit.org/#pub:62343-18345-41686-48165" target="_blank" rel="noopener noreferrer">기본 예제 열기 <span aria-hidden="true">↗</span></a><a href="https://makecode.microbit.org/#pub:49143-33953-84842-47904" target="_blank" rel="noopener noreferrer">서보모터 예제 <span aria-hidden="true">↗</span></a></div></article><article class="device-example-card"><div class="device-example-heading"><h4>AI 포니봇</h4><span class="device-tag">포니봇 사용</span></div><p>학습한 표지판의 ID로 AI 포니봇의 방향과 전진 속도를 제어해보세요.</p><div class="device-example-links"><a href="https://makecode.microbit.org/#pub:50600-41629-52677-44642" target="_blank" rel="noopener noreferrer">표지판 · 방향 제어 <span aria-hidden="true">↗</span></a><a href="https://makecode.microbit.org/#pub:67927-00128-80266-02958" target="_blank" rel="noopener noreferrer">표지판 · 속도 제어 <span aria-hidden="true">↗</span></a></div></article><article class="device-example-card"><div class="device-example-heading"><h4>비트런(이족보행로봇)</h4><span class="device-tag">비트런 사용</span></div><p>학습한 표지판의 ID로 비트런의 회전과 전진 속도를 제어해보세요.</p><div class="device-example-links"><a href="https://makecode.microbit.org/#pub:18607-84164-90482-11402" target="_blank" rel="noopener noreferrer">표지판 · 방향 제어 <span aria-hidden="true">↗</span></a><a href="https://makecode.microbit.org/#pub:75260-30296-50194-38112" target="_blank" rel="noopener noreferrer">표지판 · 속도 제어 <span aria-hidden="true">↗</span></a></div></article></div><p class="device-note">ID 번호와 예제 코드의 수신 문자열을 맞춰주세요. 인식 중지 시 stop을 보냅니다. 예제를 다운로드하면 마이크로비트의 기존 코드가 교체됩니다.</p></div></details>
<details class="support-section" id="help-troubleshooting"><summary>문제 해결 <span class="support-meta">증상별 안내</span></summary><div class="support-answer support-faq">
        <details id="help-camera"><summary>카메라가 켜지지 않아요</summary><p>주소창의 사이트 권한에서 카메라 사용을 허용하세요. 다른 앱이 카메라를 사용 중이면 종료하고 다시 시도하세요. 새로고침 전에는 수집한 모델을 다운로드해두세요.</p></details>
        <details id="help-training"><summary>학습 버튼이 비활성화돼요</summary><p>AI 모델 로딩과 카메라 준비가 끝나야 수집할 수 있습니다. 카메라 권한과 인터넷 연결을 확인하고 화면에 영상이 나타나는지 확인하세요.</p></details>
        <details id="help-connection"><summary>블루투스 연결이 안 되거나 기기가 움직이지 않아요</summary><p>마이크로비트 전원과 예제 코드 다운로드 여부를 확인하세요. 다른 브라우저나 앱에 연결되어 있다면 연결을 해제하세요. 기기 선택 창이 열리지 않으면 사용 중인 브라우저의 Web Bluetooth 지원 여부를 확인하세요.</p><p>앱 아래의 ‘전송됨’ 표시와 예제 코드의 수신 문자열을 비교하세요. ID1과 id1은 다릅니다. stop에 대한 정지 동작도 코드에 있어야 합니다.</p></details>
        <details id="help-accuracy"><summary>다른 이미지로 인식돼요</summary><p>각 ID에 서로 다른 대상을 비슷한 개수로 수집하세요. 배경·각도·거리를 조금씩 바꾸어 학습하고 실제 사용할 환경에서도 확인하세요. 화면 전체를 분류하므로 대상이 없어도 학습한 ID 중 하나로 판단할 수 있습니다.</p></details>
        <details id="help-files"><summary>가져오기나 파일 공유가 안 돼요</summary><p>이 이미지 분류 앱에서 다운로드한 JSON 파일을 사용하세요. 핸드포즈 앱의 모델은 가져올 수 없습니다. 파일 공유를 지원하지 않는 환경에서는 모델 다운로드를 사용하고 저장한 파일을 직접 첨부하세요.</p></details>
      </div></details>
      <details class="support-section" id="help-updates"><summary>업데이트 노트 <span class="support-meta">최근 변경</span></summary><div class="support-answer">
        <p class="support-release">2026.11.02 · 표지판 학습과 기기별 예제 구성</p><ul><li>마이크로비트 기본 예제 링크 업데이트</li><li>표지판 출력 자료와 방향·속도 제어별 ID 학습 순서 안내</li><li>AI 포니봇·비트런의 KNN ID 기반 표지판 방향·속도 제어 예제 연결</li><li>마이크로비트 기본·AI 포니봇·비트런(이족보행로봇) 카드 구성 통일</li></ul><p class="support-release">사용 가이드 및 지원 추가</p><ul><li>화면 하이라이트 안내와 예제 코드 바로가기</li><li>앱 안에서 확인하는 문제 해결 및 업데이트 노트</li></ul>
        <p class="support-release">현재 버전의 주요 개선</p><ul><li>ID1부터 자동으로 추가되는 학습 ID</li><li>짧게 눌러 1개 수집, 길게 눌러 연속 수집</li><li>모델 다운로드 · 파일 공유 · 가져오기</li><li>모바일 레이아웃 개선과 핸드포즈 앱의 지원 UI 통일</li><li>인식 중지 시 stop 전송</li></ul>
      </div></details>
      <a class="support-original" href="https://boundaryx.io/ai/?bmode=view&idx=169834596" target="_blank" rel="noopener noreferrer">개념 설명 · 프로젝트 아이디어 보기 ↗</a>
    </div>`;

  const tours = {
    learn: [
      ['#p5-container', '분류할 대상을 카메라에 비춰주세요', '카메라 권한을 허용하고 AI 모델 로딩을 기다리세요. 과일이나 재활용품처럼 구분할 대상을 화면에 비춰주세요.'],
      ['#camera-control-buttons', '촬영 화면을 설정하세요', '좌우 반전과 전후방 전환으로 촬영 화면을 설정하세요. 카메라를 바꾸거나 반전하면 진행 중인 인식이 중지되므로 설정을 마친 뒤 다시 시작하세요.'],
      ['#add-class-btn', '학습 ID를 추가하세요', '이 버튼을 누르면 ID1부터 자동으로 만들어집니다. ID마다 서로 다른 대상을 정해주세요.'],
      ['#class-list', '짧게 누르거나 길게 누르세요', 'ID별 ‘학습하기’를 짧게 누르면 샘플 1개, 길게 누르면 연속으로 수집합니다. 카메라와 AI 모델이 준비되면 사용할 수 있습니다.'],
      ['#add-class-btn', '다른 대상도 학습하세요', 'ID2를 추가해 다른 대상을 수집하세요. 각 ID에 비슷한 개수의 샘플을 모으면 비교하기 좋습니다.'],
      ['#recognition-control-buttons', '인식을 시작하세요', '학습한 뒤 ‘인식 시작’을 누르세요. 마이크로비트가 연결되지 않아도 화면에서 인식 결과를 확인할 수 있습니다.'],
      ['#result-card .data-info-box', '결과를 확인하세요', '대상을 바꾸면서 ID와 신뢰도를 확인하세요. 대상이 사라져도 학습한 ID 중 하나가 나올 수 있습니다. 멈추려면 ‘인식 중지’를 누르세요.']
    ],
    files: [
      ['#download-model-btn', '학습한 모델을 보관하세요', '모델 다운로드로 ID와 이미지 특징 학습 데이터를 JSON 파일에 저장합니다. 원본 카메라 영상은 포함되지 않습니다.'],
      ['#share-model-btn', '파일을 공유하세요', '지원하는 기기에서는 공유 창에서 앱을 선택할 수 있습니다. 공유가 지원되지 않으면 다운로드한 파일을 직접 첨부하세요.'],
      ['#import-model-btn', '이어서 학습하세요', '이 이미지 분류 앱에서 저장한 JSON을 선택하세요. 가져오면 현재 ID와 데이터가 교체되므로 필요한 모델은 먼저 저장하세요.']
    ],
    device: [
      ['#project-example-link', '프로젝트 예제를 완성하세요', '지원 카드에서 이름 확인 코드와 프로젝트 예제를 열 수 있습니다. 마이크로비트 또는 서보모터 예제를 선택하고, 조건문의 ID1·ID2를 학습 ID와 맞춘 뒤 다운로드하세요.'],
      ['#bluetooth-control-buttons', '마이크로비트를 연결하세요', '전원을 켠 뒤 ‘기기 연결’에서 내 장치를 선택하세요. 예제의 블루투스 페어링 설정을 확인하고, 연결이 어렵다면 ‘연결이 안 되나요?’를 참고하세요.'],
      ['#recognition-control-buttons', '인식 결과를 전송하세요', '학습한 뒤 ‘인식 시작’을 누르면 신뢰도가 50%를 초과할 때 인식한 ID가 전송됩니다. ‘인식 중지’를 누르면 stop을 전송합니다.'],
      ['#bluetooth-data-display', '실제 전송 상태를 확인하세요', '이 영역에서 전송 성공 여부를 확인하세요. ‘인식 중지’는 stop을 전송하며, 기기 코드에서 이를 처리해야 멈춥니다. 대상이 사라졌다는 이유만으로 자동 정지하지는 않습니다.']
    ]
  };
  const allSteps = [...tours.learn, ...tours.device, ...tours.files];
  const chapters = [{label:'학습', start:0}, {label:'기기 연결', start:tours.learn.length}, {label:'저장·가져오기', start:tours.learn.length + tours.device.length}];
  const dialog = document.createElement('dialog');
  dialog.id = 'guide-dialog';
  dialog.setAttribute('aria-labelledby', 'guide-title');
  dialog.setAttribute('aria-describedby', 'guide-description');
  dialog.innerHTML = `<div id="guide-spotlight" aria-hidden="true"></div><section id="guide-panel"><div class="guide-topline"><span id="guide-progress"></span><button id="guide-close" type="button" aria-label="화면 안내 종료">닫기 ×</button></div><nav class="guide-chapters" aria-label="안내 구간">${chapters.map((chapter, i) => `<button type="button" data-chapter="${i}" aria-pressed="false">${chapter.label}</button>`).join('')}</nav><div aria-live="polite" aria-atomic="true"><h2 id="guide-title"></h2><p id="guide-description"></p></div><p class="guide-caption">화면 안내입니다. 닫은 뒤 직접 눌러보세요.</p><button id="guide-skip-device" type="button" hidden>기기 연결 건너뛰기 →</button><div class="guide-navigation"><button id="guide-prev" type="button">이전</button><button id="guide-next" type="button">다음</button></div></section>`;
  document.body.appendChild(dialog);
  let steps = [], index = 0, target = null, opener = null, originalScroll = 0, pendingFrame = 0;

  let examplesWereOpen = false;

  function openHelp(section) {
    support.open = true;
    if (section) {
      $('help-troubleshooting').open = true;
      $(section).open = true;
    }
    const heading = (section ? $(section) : support).querySelector('summary');
    heading.scrollIntoView({block: 'center', behavior: 'instant'});
    heading.focus({preventScroll: true});
  }
  document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => openHelp(button.dataset.help || null)));

  function renderStep() {
    const [selector, title, description] = steps[index];
    if (selector === '#project-example-link') $('help-examples').open = true;
    target = document.querySelector(selector);
    const chapterIndex = index < chapters[1].start ? 0 : index < chapters[2].start ? 1 : 2;
    dialog.querySelectorAll('[data-chapter]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === chapterIndex)));
    $('guide-skip-device').hidden = chapterIndex !== 1;
    $('guide-progress').textContent = `${chapters[chapterIndex].label}${chapterIndex === 1 ? ' · 선택' : ''} · ${index + 1} / ${steps.length}`;
    $('guide-title').textContent = title;
    $('guide-description').textContent = description;
    if (selector === '#class-list' && !target.querySelector('.train-btn')) {
      $('guide-title').textContent = 'ID별 학습 버튼이 표시될 자리예요';
      $('guide-description').textContent = 'ID를 추가하면 이곳에 ‘학습하기’ 버튼이 나타납니다. 카메라가 준비되면 짧게 눌러 1개, 길게 눌러 연속 수집할 수 있습니다.';
    }
    $('guide-prev').disabled = index === 0;
    $('guide-next').textContent = index === steps.length - 1 ? '안내 마치기' : '다음';
    if (target) target.scrollIntoView({block: 'center', behavior: 'instant'});
    positionGuide(true);
  }

  function positionGuide(reveal = false) {
    if (!dialog.open) return;
    const panel = $('guide-panel'), spot = $('guide-spotlight');
    const width = window.innerWidth, height = window.innerHeight, gap = 16;
    panel.style.width = Math.min(360, width - 24) + 'px';
    const ph = panel.getBoundingClientRect().height, pw = panel.getBoundingClientRect().width;
    const headerBottom = document.querySelector('header').getBoundingClientRect().bottom;
    let r = target ? target.getBoundingClientRect() : null;
    // Narrow screens reserve the lower area for the explanation. A temporary bottom
    // spacer allows the last control to scroll above it without altering saved data.
    const narrow = width < 700;
    if (reveal && r && narrow) {
      const top = Math.max(12, headerBottom + 16);
      window.scrollBy({top: r.top - top, behavior: 'instant'});
      r = target.getBoundingClientRect();
    }
    let x = width - pw - 12, y = height - ph - 12;
    if (r && !narrow) {
      const candidates = [
        [r.left - pw - gap, Math.max(12, Math.min(r.top, height - ph - 12))],
        [r.right + gap, Math.max(12, Math.min(r.top, height - ph - 12))],
        [Math.max(12, Math.min(r.left, width - pw - 12)), r.bottom + gap],
        [Math.max(12, Math.min(r.left, width - pw - 12)), r.top - ph - gap]
      ];
      const fit = candidates.find(([cx, cy]) => cx >= 12 && cy >= 12 && cx + pw <= width - 12 && cy + ph <= height - 12);
      if (fit) [x,y] = fit;
    }
    panel.style.left = x + 'px'; panel.style.top = Math.max(12, y) + 'px';
    if (r) {
      const top = Math.max(4, r.top - 5), left = Math.max(4, r.left - 5);
      const bottom = Math.min(height - 4, narrow ? y - 12 : height - 4, r.bottom + 5);
      spot.hidden = bottom <= top || r.right <= 0 || r.left >= width;
      Object.assign(spot.style, {left: left + 'px', top: top + 'px', width: Math.max(0, Math.min(width - 4, r.right + 5) - left) + 'px', height: Math.max(0, bottom - top) + 'px'});
    } else spot.hidden = true;
  }
  function startTour(kind, button) {
    if (kind !== 'all') return;
    opener = button; originalScroll = window.scrollY;
    steps = allSteps; index = 0;
    examplesWereOpen = $('help-examples').open;
    document.body.classList.add('guide-active');
    dialog.showModal();
    renderStep();
    $('guide-next').focus({preventScroll:true});
  }
  support.querySelectorAll('[data-tour]').forEach(button => button.addEventListener('click', () => startTour(button.dataset.tour, button)));
  $('guide-prev').addEventListener('click', () => { if (index > 0) { index--; renderStep(); } });
  $('guide-next').addEventListener('click', () => { if (index === steps.length - 1) dialog.close(); else { index++; renderStep(); } });
  dialog.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => { index = chapters[Number(button.dataset.chapter)].start; renderStep(); }));
  $('guide-skip-device').addEventListener('click', () => { index = chapters[2].start; renderStep(); $('guide-next').focus({preventScroll:true}); });
  $('guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('guide-active');
    $('help-examples').open = examplesWereOpen;
    window.scrollTo({top:originalScroll, behavior:'instant'});
    if (opener) opener.focus({preventScroll:true});
  });
  const reposition = () => {
    if (!dialog.open || pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => { pendingFrame = 0; positionGuide(); });
  };
  window.addEventListener('resize', () => { if (dialog.open) renderStep(); });
  window.addEventListener('scroll', reposition, {passive:true});
  if (location.hash === '#support-card') requestAnimationFrame(() => openHelp());
})();



