// ============================
// ThinQ AI 매니저 - 메인 앱
// ============================

// --- 상태 관리 ---
const state = {
  currentStep: -1,  // -1: 스플래시
  selectedProduct: null,
  wifiSSID: '',
  connected: false
};

let splashTimeout = null;
let searchInterval = null;
let faqTimeout = null;

// --- 제품 데이터 ---
const products = {
  air: [
    { id: 'ac', icon: '❄️', name: '에어컨', model: 'ThinQ 휘센 360', category: 'air' },
    { id: 'purifier', icon: '💨', name: '공기청정기', model: 'ThinQ 퓨리케어', category: 'air' },
    { id: 'dehumid', icon: '💧', name: '제습기', model: 'ThinQ 케어솔루션', category: 'air' }
  ],
  washing: [
    { id: 'washer', icon: '🫧', name: '세탁기', model: 'ThinQ 트롬 워시타워', category: 'washing' },
    { id: 'dryer', icon: '🌀', name: '건조기', model: 'ThinQ 트롬 스타일러', category: 'washing' }
  ],
  kitchen: [
    { id: 'fridge', icon: '🧊', name: '냉장고', model: 'ThinQ 디오스 오브제', category: 'kitchen' },
    { id: 'oven', icon: '♨️', name: '전자레인지', model: 'ThinQ 디오스 오브제', category: 'kitchen' },
    { id: 'dishwasher', icon: '🍽️', name: '식기세척기', model: 'ThinQ 디오스 오브제', category: 'kitchen' }
  ],
  tv: [
    { id: 'oled', icon: '📺', name: 'OLED TV', model: 'ThinQ OLED evo C4', category: 'tv' },
    { id: 'qned', icon: '🖥️', name: 'QNED TV', model: 'ThinQ QNED 4K', category: 'tv' }
  ]
};

// --- AI 응답 데이터 ---
const aiResponses = {
  greet: [
    '안녕하세요! 저는 ThinQ AI 매니저입니다 ✦\n제품 연결을 도와드리겠습니다. 화면의 **시작하기** 버튼을 눌러주세요! 😊',
  ],
  step0: [
    '홈 화면입니다! **"+ 기기 추가"** 버튼을 눌러 새 제품을 등록해 보세요.',
  ],
  step1: [
    "현재 스마트폰의 네트워크 환경을 점검했습니다. 🔍\n\n✅ 스마트폰 Wi-Fi 연결 확인\n✅ 블루투스 활성화 확인\n\n[💡 준비 사항]\n연결하실 제품의 전원 플러그가 콘센트에 확실히 꽂혀 있는지 확인해 주세요. 원활한 연결을 위해 기기를 켜두시는 것이 좋습니다.\n\n준비되셨다면 오른쪽 모바일 화면에서 추가할 제품을 선택해 주세요!"
  ],
  step2: [
    '이제 Wi-Fi 정보를 입력해 주세요.\n\n⚠️ **주의사항:**\n• 2.4GHz 또는 5GHz Wi-Fi를 지원합니다\n• 스마트폰과 동일한 네트워크를 사용해 주세요',
  ],
  step3: [
    '제품을 검색하고 있습니다<span class="anim-dots"><span>.</span><span>.</span><span>.</span></span> 📡\n\n제품이 검색되지 않으면:\n1. 제품 전원이 켜져 있는지 확인\n2. Wi-Fi 공유기 근처에 제품 배치\n3. 제품의 Wi-Fi 연결 모드 활성화',
  ],
  step4: [
    '🎉 축하합니다! 제품 연결이 완료되었습니다!\n\nThinQ 앱에서 이제 언제 어디서나 제품을 제어하고 모니터링할 수 있습니다.',
  ],
  wifi: ['Wi-Fi는 2.4GHz와 5GHz 대역을 모두 지원합니다. 연결이 불안정하면 2.4GHz를 권장드립니다.'],
  error: ['연결 오류 시 제품을 재시작하고 앱을 다시 실행해 보세요. 문제가 지속되면 LG 고객센터(080-023-7777)로 연락해 주세요.'],
  bluetooth: ['일부 제품은 초기 설정 시 Bluetooth를 활용합니다. 스마트폰 블루투스를 켜주세요.'],
  general: ['무엇이든 물어보세요! ThinQ 제품 연결, Wi-Fi 설정, 오류 해결 등 도움드릴게요 😊']
};

// --- 빠른 답변 버튼 데이터 ---
const quickActionsData = {
  '-1': [],
  '0': ['기기 추가 방법', 'Wi-Fi 주의사항', '지원 제품 목록'],
  '1': ['에어컨 연결 방법', '냉장고 연결 방법', 'TV 연결 방법'],
  '2': ['Wi-Fi 비밀번호 오류', '2.4GHz vs 5GHz', 'Bluetooth 연결'],
  '3': ['제품이 안 찾아져요', '오류 해결 방법', '다시 시도하기'],
  '4': ['다른 제품 추가', '제품 제어 방법', '처음으로']
};

// --- DOM 참조 ---
const chatContainer = document.getElementById('chatContainer');
const screenContent = document.getElementById('screenContent');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const quickActions = document.getElementById('quickActions');
const progressIndicator = document.getElementById('progressIndicator');
const stepLabel = document.getElementById('stepLabel');
const guideStepBadge = document.getElementById('guideStepBadge');
const guideContent = document.getElementById('guideContent');
const productCard = document.getElementById('productCard');
const productCardContent = document.getElementById('productCardContent');
const connectionMonitor = document.getElementById('connectionMonitor');
const monitorItems = document.getElementById('monitorItems');

const stepLabels = ['시작', '제품 선택', 'Wi-Fi 설정', '기기 검색', '연결 완료'];

// --- 초기화 ---
function init() {
  createParticles();
  updateClock();
  setInterval(updateClock, 1000);
  showSplash();
  setupEventListeners();
}

// --- 파티클 배경 ---
function createParticles() {
  const container = document.getElementById('bgParticles');
  for (let i = 0; i < 30; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDuration = (8 + Math.random() * 12) + 's';
    span.style.animationDelay = (-Math.random() * 20) + 's';
    container.appendChild(span);
  }
}

// --- 시계 업데이트 ---
function updateClock() {
  const el = document.getElementById('statusTime');
  if (el) {
    const now = new Date();
    el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  }
}

// --- 스플래시 화면 ---
function showSplash() {
  updateProgress();
  screenContent.innerHTML = `
    <div class="screen splash-screen">
      <div class="splash-logo">ThinQ<span>™</span></div>
      <div class="splash-sub">스마트 라이프 플랫폼</div>
      <div class="splash-spinner"></div>
    </div>`;
    
  clearTimeout(splashTimeout);
  splashTimeout = setTimeout(() => {
    addAiMessage(aiResponses.greet[0]);
    showHome();
  }, 1800);
}

// --- 홈 화면 ---
function showHome() {
  state.currentStep = 0;
  updateProgress();
  screenContent.innerHTML = `
    <div class="screen thinq-home">
      
      <div class="thinq-header">
        <div class="thinq-header-title">
          영두 홈 
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="thinq-header-icons">
          <svg class="icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" onclick="showAddMenu()"><path d="M12 5v14M5 12h14"/></svg>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </div>
      </div>

      <div class="thinq-card thinq-up-card">
        <div class="thinq-up-icon">UP</div>
        <div class="thinq-up-content">
          <p>밤에도 정수기를 조용하고 눈부심 없이 사용할 수 있도록 업그레이드 해보세요.</p>
          <button class="thinq-up-btn">더 알아보기</button>
        </div>
      </div>

      <div class="thinq-card thinq-floorplan-card">
        <img src="floorplan.png" class="thinq-floorplan-img" alt="Floorplan">
        <div class="thinq-device-marker">❄️</div>
      </div>

      <div class="thinq-section-title">ThinQ 활용하기</div>

      <div class="thinq-card thinq-use-card">
        <img src="use_card.png" class="thinq-use-img" alt="Use ThinQ">
        <div class="thinq-use-text">등록한 제품의 이름을 바꿔보세요</div>
      </div>

      <div class="thinq-fab">
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#fab-grad)" stroke-width="2.5">
          <defs>
            <linearGradient id="fab-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c8102e" />
              <stop offset="100%" stop-color="#ff4d6d" />
            </linearGradient>
          </defs>
          <path d="M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm-2-8a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
        </svg>
      </div>

      <div class="thinq-bottom-nav">
        <div class="nav-item active">
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>홈</span>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM4 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4zm8 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
          <span>디바이스</span>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <span>케어</span>
        </div>
        <div class="nav-item">
          <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          <span>메뉴</span>
        </div>
      </div>

    </div>`;
  updateGuide(0);
  addAiMessage(aiResponses.step0[0]);
  updateQuickActions();
}

// --- 홈 화면 ---
// (기존 showHome은 위에 정의되어 있음)

// --- 추가 메뉴 (Bottom Sheet) ---
function showAddMenu() {
  let overlay = document.getElementById('addMenuOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'addMenuOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.onclick = (e) => {
      if(e.target === overlay) hideAddMenu();
    };
    
    overlay.innerHTML = `
      <div class="bottom-sheet">
        <div class="bs-handle"></div>
        <div class="bs-title">추가</div>
        
        <div class="bs-card">
          <div class="bs-item" onclick="hideAddMenu(); showProductSelect();">
            <div class="bs-icon"><div class="bs-icon-circle green">+</div></div>
            <div class="bs-text-wrap">
              <div class="bs-name">제품 추가</div>
              <div class="bs-desc">LG와 다양한 브랜드의 제품</div>
            </div>
          </div>
        </div>

        <div class="bs-card">
          <div class="bs-item" onclick="hideAddMenu()">
            <div class="bs-icon orange">▶️</div>
            <div class="bs-text-wrap">
              <div class="bs-name">ThinQ PLAY</div>
              <div class="bs-desc">앱 다운로드와 제품 업그레이드</div>
            </div>
          </div>
        </div>

        <div class="bs-card">
          <div class="bs-item" onclick="hideAddMenu()">
            <div class="bs-icon purple">⏱️</div>
            <div class="bs-text-wrap"><div class="bs-name">루틴 만들기</div></div>
          </div>
          <div class="bs-item" onclick="hideAddMenu()">
            <div class="bs-icon blue-text">🏢</div>
            <div class="bs-text-wrap"><div class="bs-name">우리 단지 연결</div></div>
          </div>
        </div>

        <div class="bs-card">
          <div class="bs-item" onclick="hideAddMenu()">
            <div class="bs-icon gray">👤+</div>
            <div class="bs-text-wrap"><div class="bs-name">멤버 초대</div></div>
          </div>
          <div class="bs-item" onclick="hideAddMenu()">
            <div class="bs-icon blue-text">🏠+</div>
            <div class="bs-text-wrap"><div class="bs-name">새로운 홈 만들기</div></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('phoneScreen').appendChild(overlay);
  }
  
  // 강제 리플로우 후 클래스 추가 (애니메이션 적용)
  void overlay.offsetWidth;
  overlay.classList.add('show');
}

function hideAddMenu() {
  const overlay = document.getElementById('addMenuOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

// --- 제품 선택 화면 ---
function showProductSelect() {
  state.currentStep = 1;
  updateProgress();
  
  const list1 = [
    { id: 'washer', html: '<div class="icon-3d"><div class="ic-washer"></div></div>', name: '세탁기', cat: 'washing' },
    { id: 'dryer', html: '<div class="icon-3d"><div class="ic-dryer"></div></div>', name: '건조기', cat: 'washing' },
    { id: 'fridge', html: '<div class="icon-3d"><div class="ic-fridge-wrap"><div class="ic-fridge-glow"></div><div class="ic-fridge"><div></div><div></div><div></div><div></div></div></div></div>', name: '냉장고', cat: 'kitchen' },
    { id: 'ac', html: '<div class="icon-3d"><div class="ic-ac-wrap"><div class="ic-ac-glow"></div><div class="ic-ac"></div></div></div>', name: '에어컨', cat: 'air' },
    { id: 'oled', html: '<div class="icon-3d"><div class="ic-tv"></div></div>', name: 'TV', cat: 'tv' },
    { id: 'thinqon', html: '<div class="icon-3d"><div class="ic-thinqon-wrap"><div class="ic-thinqon-signal"></div><div class="ic-thinqon"></div></div></div>', name: 'ThinQ ON', cat: 'air' }
  ];

  const list2 = [
    { id: 'humid', html: '<div class="icon-3d"><div class="ic-humid"></div></div>', name: '가습기', cat: 'air' },
    { id: 'dryer2', html: '<div class="icon-3d"><div class="ic-dryer"></div></div>', name: '건조기', cat: 'washing' }
  ];

  const renderGroup = (list) => {
    return `<div class="thinq-product-group">
      ${list.map(p => `
        <div class="thinq-product-item" onclick="selectProduct('${p.id}', '${p.cat}')">
          <div class="thinq-product-icon">${p.html}</div>
          <div class="thinq-product-name">${p.name}</div>
        </div>
      `).join('')}
    </div>`;
  };

  const indices = ['⭐','ㄱ','ㄴ','ㄷ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅎ','C','L','S','T','#'];

  screenContent.innerHTML = `
    <div class="screen thinq-select-screen">
      <div class="thinq-select-header">
        <div class="thinq-nav-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" onclick="showHome()"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" onclick="showHome()"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
        <div class="thinq-select-title">추가할 제품을 선택해주세요.</div>
        <div class="thinq-tabs">
          <div class="thinq-tab active">LG</div>
          <div class="thinq-tab">다른 브랜드</div>
        </div>
      </div>
      
      <div class="thinq-select-body">
        <div class="thinq-search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="제품명 또는 모델명 검색" />
        </div>

        ${renderGroup(list1)}
        ${renderGroup(list2)}
        
        <div style="height: 60px;"></div> <!-- 하단 여백 -->
      </div>

      <div class="thinq-index-bar">
        ${indices.map(idx => `<span class="${idx==='⭐'?'star':''}">${idx}</span>`).join('')}
      </div>

      <div class="thinq-bottom-float">
        Wi-Fi 또는 Bluetooth 기능이 없는 제품 추가
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>`;
    
  updateGuide(1);
  updateQuickActions();
  
  addAiMessage("안녕하세요! 저는 ThinQ 제품 연결을 도와드리는 AI 매니저입니다 😊\n연결할 제품을 선택해 주세요!");
  
  const floatingAi = document.getElementById('floatingAi');
  const floatingAiTooltip = document.getElementById('floatingAiTooltip');
  if (floatingAi && floatingAiTooltip) {
    floatingAi.classList.remove('scanning');
    floatingAiTooltip.classList.remove('expanded');
    floatingAiTooltip.innerHTML = '안녕하세요! 저는 ThinQ 제품<br>연결을 도와드리는 AI<br>매니저입니다 😊<br>연결할 제품을 선택해 주세요!';
  }

  // 사용자 활동이 없을 때 7초 후 FAQ 노출
  clearTimeout(faqTimeout);
  faqTimeout = setTimeout(() => {
    if (state.currentStep === 1) {
      if (floatingAi && floatingAiTooltip) {
        floatingAiTooltip.classList.add('expanded');
        floatingAiTooltip.innerHTML = `
          도움이 필요하신가요?<br>아래 질문을 눌러보세요!
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
            <button class="tooltip-btn" style="background: #f0f4ff; border: 1px solid #d0deff; color: #4364c6; text-align: left; padding: 8px; font-weight: normal; font-size: 12px;" onclick="event.stopPropagation(); handleFaqClick('제품 연결하는 방법을 설명해줘')">💡 제품 연결하는 방법을 설명해줘</button>
            <button class="tooltip-btn" style="background: #f0f4ff; border: 1px solid #d0deff; color: #4364c6; text-align: left; padding: 8px; font-weight: normal; font-size: 12px;" onclick="event.stopPropagation(); handleFaqClick('제품 연결하면 어떤 혜택이 있어?')">🎁 제품 연결하면 어떤 혜택이 있어?</button>
          </div>
        `;
      }
      
      const faqHtml = `
        <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
          <button style="background: #f0f4ff; border: 1px solid #d0deff; border-radius: 8px; padding: 8px; font-size: 13px; color: #4364c6; text-align: left; cursor: pointer;" onclick="event.stopPropagation(); handleFaqClick('제품 연결하는 방법을 설명해줘')">💡 제품 연결하는 방법을 설명해줘</button>
          <button style="background: #f0f4ff; border: 1px solid #d0deff; border-radius: 8px; padding: 8px; font-size: 13px; color: #4364c6; text-align: left; cursor: pointer;" onclick="event.stopPropagation(); handleFaqClick('제품 연결하면 어떤 혜택이 있어?')">🎁 제품 연결하면 어떤 혜택이 있어?</button>
        </div>
      `;
      addAiMessage("도움이 필요하신가요? 궁금한 점을 클릭해 보세요!", faqHtml);
    }
  }, 7000);
}

// --- 제품 선택 후 Wi-Fi 화면 ---
function selectProduct(id, cat) {
  clearTimeout(faqTimeout);
  const p = (products[cat]||[]).find(x=>x.id===id) ||
            Object.values(products).flat().find(x=>x.id===id);
  if (!p) return;
  
  if (id !== 'washer') {
    showNotReadyPopup();
    return;
  }
  
  state.selectedProduct = p;
  showWasherTypesPopup(p);
}

function showNotReadyPopup() {
  let overlay = document.getElementById('notReadyOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'notReadyOverlay';
    overlay.className = 'thinq-alert-modal';
    overlay.onclick = (e) => {
      if(e.target === overlay) hideNotReadyPopup();
    };
    
    overlay.innerHTML = `
      <div class="thinq-alert-content">
        <div class="thinq-alert-icon">🚧</div>
        <div class="thinq-alert-title">아직 준비중이에요</div>
        <div class="thinq-alert-desc">
          <p>아직 준비중이에요.</p>
          <p><strong>통돌이 세탁기</strong>를 체험해 보세요.</p>
        </div>
        <button class="thinq-alert-btn" onclick="hideNotReadyPopup()">확인</button>
      </div>
    `;
    document.getElementById('phoneScreen').appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function hideNotReadyPopup() {
  const overlay = document.getElementById('notReadyOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showWasherTypesPopup(p) {
  let overlay = document.getElementById('washerTypesOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'washerTypesOverlay';
    overlay.className = 'bottom-sheet-overlay';
    overlay.onclick = (e) => {
      if(e.target === overlay) hideWasherTypesPopup();
    };
    
    overlay.innerHTML = `
      <div class="bottom-sheet" style="padding: 0; background: #f2f2f7;">
        <div style="padding: 16px 20px 10px;">
          <div class="bs-handle"></div>
          <div class="bs-title" style="font-size: 18px; text-align: left; margin-bottom: 0;">세탁기</div>
        </div>
        
        <div class="bs-card" style="margin: 0 16px 30px; border-radius: 12px; background: white;">
          <div class="bs-item" onclick="proceedWithWasher('통돌이')">
            <div class="bs-icon" style="font-size: 24px;">💧</div>
            <div class="bs-text-wrap"><div class="bs-name" style="font-size: 15px;">통돌이</div></div>
          </div>
          <div class="bs-item" onclick="proceedWithWasher('트롬')">
            <div class="bs-icon" style="font-size: 24px;">🔘</div>
            <div class="bs-text-wrap"><div class="bs-name" style="font-size: 15px;">트롬</div></div>
          </div>
          <div class="bs-item" onclick="proceedWithWasher('미니워시')">
            <div class="bs-icon" style="font-size: 24px;">🗃️</div>
            <div class="bs-text-wrap"><div class="bs-name" style="font-size: 15px;">미니워시</div></div>
          </div>
          <div class="bs-item" onclick="proceedWithWasher('워시타워')">
            <div class="bs-icon" style="font-size: 24px;">🗼</div>
            <div class="bs-text-wrap"><div class="bs-name" style="font-size: 15px;">워시타워</div></div>
          </div>
          <div class="bs-item" onclick="proceedWithWasher('세탁건조기')">
            <div class="bs-icon" style="font-size: 24px;">🔄</div>
            <div class="bs-text-wrap"><div class="bs-name" style="font-size: 15px;">세탁건조기</div></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('phoneScreen').appendChild(overlay);
  }
  
  void overlay.offsetWidth;
  overlay.classList.add('show');
  
  // 툴팁 일시 숨기기 (expanded 상태 유지)
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) {
    tooltip.style.opacity = '0';
    tooltip.style.pointerEvents = 'none';
  }
}

function hideWasherTypesPopup() {
  const overlay = document.getElementById('washerTypesOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  
  // 툴팁 복구
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) {
    tooltip.style.opacity = '';
    tooltip.style.pointerEvents = '';
  }
}

function proceedWithWasher(subType) {
  hideWasherTypesPopup();
  
  if (subType === '통돌이') {
    const p = state.selectedProduct;
    p.model = 'ThinQ ' + subType;
    showPowerGuideScreen();
  } else {
    showNotReadyPopup();
  }
}

function showPowerGuideScreen() {
  const p = state.selectedProduct;
  
  screenContent.innerHTML = `
    <div class="screen" style="padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; position: absolute; top: 0; left: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center; cursor: pointer;" onclick="showQrScanScreen()">
      <img src="washer_power_ui.png" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" alt="세탁기 전원 켜기 안내">
    </div>
  `;
  
  // AI 아이콘 띄우고 말풍선 다시 표시 (원상복구)
  const floatingAi = document.getElementById('floatingAi');
  if (floatingAi) {
    floatingAi.classList.add('show');
  }
  addAiMessage("제품의 전원이 켜져 있는지 확인해 주세요! 전원을 켠 후 '전원을 켰어요' 버튼을 눌러주세요.");
}

function showQrScanScreen() {
  const p = state.selectedProduct;
  
  let style = document.getElementById('qrScannerStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'qrScannerStyle';
    document.head.appendChild(style);
  }
  style.innerHTML = `
    .qr-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f4f5f7; display: flex; flex-direction: column; z-index: 50; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; }
    .qr-header { width: 100%; display: flex; align-items: center; padding: 20px 20px 10px; justify-content: space-between; box-sizing: border-box; }
    .qr-back-btn, .qr-close-btn { cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 8px; margin: -8px; }
    .qr-title { padding: 10px 20px 30px; font-size: 20px; font-weight: 700; color: #111; letter-spacing: -0.5px; }
    .qr-scanner-container { flex: 1; display: flex; flex-direction: column; position: relative; }
    .qr-scanner-box { margin: 0 20px; height: 400px; background: #666; border-radius: 12px; position: relative; overflow: hidden; }
    .qr-camera-feed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: repeating-linear-gradient(45deg, #7a7a7a, #7a7a7a 3px, #707070 3px, #707070 6px); }
    .qr-frame { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 220px; height: 220px; border: 2px solid rgba(255,255,255,0.1); }
    .qr-corner-tl { top: -2px; left: -2px; border-width: 5px 0 0 5px; border-color: #fff; position: absolute; width: 24px; height: 24px; border-style: solid; }
    .qr-corner-tr { top: -2px; right: -2px; border-width: 5px 5px 0 0; border-color: #fff; position: absolute; width: 24px; height: 24px; border-style: solid; }
    .qr-corner-bl { bottom: -2px; left: -2px; border-width: 0 0 5px 5px; border-color: #fff; position: absolute; width: 24px; height: 24px; border-style: solid; }
    .qr-corner-br { bottom: -2px; right: -2px; border-width: 0 5px 5px 0; border-color: #fff; position: absolute; width: 24px; height: 24px; border-style: solid; }
    .qr-scan-line { width: 100%; height: 2px; background: #fff; position: absolute; top: 0; left: 0; box-shadow: 0 0 8px rgba(255,255,255,0.8); animation: scanLine 2s infinite ease-in-out; }
    @keyframes scanLine { 0% { top: 0; } 50% { top: 218px; } 100% { top: 0; } }
    .qr-flash-btn { position: absolute; bottom: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.85); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); cursor: pointer; }
    .qr-help-text { margin-top: 24px; font-size: 13px; color: #4364c6; text-align: center; cursor: pointer; font-weight: 500; }
    .qr-bottom-btn { margin: auto 20px 30px; background: #dfe5ff; color: #586bc1; border: none; border-radius: 10px; padding: 16px; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; }
    .qr-success-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 10; }
    .qr-success-overlay.show { opacity: 1; }
    .qr-success-icon { width: 50px; height: 50px; background: #4364c6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; margin-bottom: 12px; }
    .qr-success-text { color: #fff; font-size: 16px; font-weight: 600; }
  `;

  screenContent.innerHTML = `
    <div class="qr-screen" id="qrScreen" style="position: relative; z-index: auto;">
      <div class="qr-header">
        <div class="qr-back-btn">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </div>
        <div class="qr-close-btn">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>
      <div class="qr-title">${p.name} QR을 스캔해주세요.</div>
      
      <div class="qr-scanner-container">
        <div class="qr-scanner-box">
          <div class="qr-camera-feed"></div>
          <div class="qr-frame">
            <div class="qr-corner-tl"></div>
            <div class="qr-corner-tr"></div>
            <div class="qr-corner-bl"></div>
            <div class="qr-corner-br"></div>
            <div class="qr-scan-line"></div>
          </div>
          <div class="qr-flash-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#333" stroke-width="2"><path d="M14 2L9 12h5l-4 10 9-11h-5l4-9z"/><line x1="4" y1="4" x2="20" y2="20"/></svg>
          </div>
          <div class="qr-success-overlay" id="qrSuccessOverlay">
            <div class="qr-success-icon">✓</div>
            <div class="qr-success-text">제품 인식 완료</div>
          </div>
        </div>
        <div class="qr-help-text">${p.name} QR 위치를 모르겠어요. ></div>
      </div>
      
      <div class="qr-bottom-btn">QR 없이 추가하기</div>
    </div>
  `;
  
  addAiMessage("QR 스티커는 문을 열면 문 오른쪽 아래에 있어요 😊");

  // 3초 뒤 자동 스캔 완료 시뮬레이션
  setTimeout(() => {
    const overlay = document.getElementById('qrSuccessOverlay');
    if (overlay) overlay.classList.add('show');
    
    addAiMessage("제품의 QR 코드가 성공적으로 스캔되었습니다! 자동으로 제품 연결을 진행합니다 🔄");

    // 인식 완료 후 2초 뒤 다음 연결 화면으로 자동 전환
    setTimeout(() => {
      const qrEl = document.getElementById('qrScreen');
      if (qrEl) qrEl.remove(); // 기존 상태바 및 screenContent 유지를 위해 삭제
      startSearch(); // Wi-Fi 설정 화면 건너뛰고 바로 제품 연결/검색 중 화면으로 전환
    }, 2000);
  }, 3000);
}

function showWifiScreen() {
  const p = state.selectedProduct;
  state.currentStep = 2;
  updateProgress();
  showProductCard(p);
  screenContent.innerHTML = `
    <div class="screen wifi-screen">
      <div class="nav-header">
        <div class="back-btn" onclick="state.selectedProduct.model.includes('통돌이') ? showQrScanScreen() : showProductSelect()">‹</div>
        <div class="nav-title">Wi-Fi 연결 설정</div>
      </div>
      <div class="wifi-illustration">
        <div class="wifi-anim">${p.icon}</div>
        <div class="wifi-title">${p.name} 연결</div>
        <div class="wifi-desc">${p.model}을 ThinQ 앱에 연결하기 위해<br>Wi-Fi 정보를 입력해 주세요</div>
      </div>
      <div class="wifi-input-section">
        <div>
          <div class="input-label">Wi-Fi 네트워크 (SSID)</div>
          <input class="input-field" id="ssidInput" type="text" placeholder="Wi-Fi 이름 입력" />
        </div>
        <div>
          <div class="input-label">비밀번호</div>
          <input class="input-field" id="pwInput" type="password" placeholder="Wi-Fi 비밀번호 입력" />
        </div>
        <button class="primary-btn" id="connectBtn" onclick="startSearch()">제품 검색 시작</button>
      </div>
    </div>`;
  updateGuide(2);
  addAiMessage(aiResponses.step2[0]);
  updateQuickActions();
}

// --- 제품 검색 화면 ---
function startSearch() {
  const ssid = document.getElementById('ssidInput')?.value || 'MyWiFi';
  const pw = document.getElementById('pwInput')?.value;
  if (!ssid.trim()) { alert('Wi-Fi 이름을 입력해 주세요'); return; }
  state.wifiSSID = ssid;
  state.currentStep = 3;
  updateProgress();

  const p = state.selectedProduct;
  const logs = [
    '네트워크 스캔 시작...',
    `"${ssid}" 네트워크 발견 ✓`,
    'Bluetooth LE 스캔 중...',
    `${p.name} 디바이스 발견!`,
    'WPA2 핸드셰이크 진행 중...',
    'IP 주소 할당: 192.168.1.105',
    'ThinQ 서버 인증 중...',
    '연결 완료!'
  ];

  screenContent.innerHTML = `
    <div class="screen" style="padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; position: absolute; top: 0; left: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center;">
      <img src="connecting_ui.png" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" alt="연결 중 화면">
      <div id="searchLog" style="display:none;"></div>
    </div>`;

  updateGuide(3);
  addAiMessage(aiResponses.step3[0]);
  updateQuickActions();
  showConnectionMonitor(ssid);

  clearTimeout(searchInterval);
  searchInterval = setTimeout(() => {
    showDone();
  }, 5000);
}

// --- 완료 화면 ---
function showDone() {
  state.currentStep = 4;
  state.connected = true;
  updateProgress();
  const p = state.selectedProduct;
  screenContent.innerHTML = `
    <div class="screen" style="padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; position: absolute; top: 0; left: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center; cursor: pointer;" onclick="showHome()">
      <img src="done_ui.png" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" alt="연결 완료 화면">
    </div>`;
  updateGuide(4);
  addAiMessage(aiResponses.step4[0]);
  updateQuickActions();
}

// --- 초기화 ---
function reset() {
  clearTimeout(splashTimeout);
  clearTimeout(searchInterval);
  clearTimeout(faqTimeout);

  state.currentStep = -1;
  state.selectedProduct = null;
  state.wifiSSID = '';
  state.connected = false;
  productCard.style.display = 'none';
  connectionMonitor.style.display = 'none';
  
  // 열려있는 오버레이 닫기
  hideAddMenu();
  if (typeof hideWasherTypesPopup === 'function') hideWasherTypesPopup();
  if (typeof hideNotReadyPopup === 'function') hideNotReadyPopup();
  
  const floatingAi = document.getElementById('floatingAi');
  if (floatingAi) {
    let isAiIconOff = false;
    try { isAiIconOff = localStorage.getItem('aiIconOff') === 'true'; } catch(e) {}
    if (isAiIconOff) {
      floatingAi.classList.add('off');
    } else {
      floatingAi.classList.remove('off');
    }
  }

  showSplash();
}

// --- 진행 상태 업데이트 ---
function updateProgress() {
  const step = state.currentStep;
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i < step) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
  });
  stepLabel.textContent = stepLabels[step] || '시작';

  // 플로팅 AI 표시 로직 (제품 선택 화면 1단계부터 표시)
  const floatingAi = document.getElementById('floatingAi');
  const floatingAiTooltip = document.getElementById('floatingAiTooltip');
  if (floatingAi && floatingAiTooltip) {
    floatingAiTooltip.classList.remove('expanded'); // 확장 클래스 초기화
    if (step >= 1) {
      floatingAi.classList.add('show');
      let isAiIconOff = false;
      try { isAiIconOff = localStorage.getItem('aiIconOff') === 'true'; } catch(e) {}
      if (isAiIconOff) {
        floatingAi.classList.add('off');
      } else {
        floatingAi.classList.remove('off');
      }
      if (step === 1) {
        // 제품 선택 화면 진입 시 초기 툴팁은 동적 시나리오에서 변경되므로 여기서 고정값을 주지 않음
      } else if (step === 2) {
        floatingAiTooltip.textContent = 'Wi-Fi 정보를 입력해주세요';
      } else if (step === 3) {
        floatingAiTooltip.textContent = '제품을 찾는 중이에요...';
      } else if (step === 4) {
        floatingAiTooltip.textContent = '연결이 완료되었습니다!';
      }
    } else {
      floatingAi.classList.remove('show');
    }
  }
}

// --- 가이드 패널 업데이트 ---
const guideData = [
  {
    badge: '홈 화면',
    icon: '🏠',
    title: '기기를 추가해 보세요',
    desc: '"기기 추가" 버튼을 눌러 새로운 LG 가전을 ThinQ 앱에 등록하세요.',
    tips: ['홈 화면에서 모든 기기를 관리할 수 있어요', '배너를 클릭해도 기기 추가가 됩니다']
  },
  {
    badge: '제품 선택',
    icon: '📋',
    title: '연결할 제품을 선택하세요',
    desc: '카테고리를 선택하면 해당 제품 목록이 표시됩니다. 연결하려는 제품을 탭 하세요.',
    tips: ['카테고리 탭으로 빠르게 검색', '모델명을 확인하세요']
  },
  {
    badge: 'Wi-Fi 설정',
    icon: '📡',
    title: 'Wi-Fi 정보를 입력하세요',
    desc: '제품을 연결할 Wi-Fi 네트워크 이름과 비밀번호를 입력해 주세요.',
    checklist: ['스마트폰과 같은 Wi-Fi 사용', '비밀번호 대소문자 확인', '2.4GHz 권장']
  },
  {
    badge: '기기 검색',
    icon: '🔍',
    title: '제품을 검색하고 있습니다',
    desc: '주변 LG 기기를 자동으로 탐색합니다. 제품의 전원이 켜져 있어야 합니다.',
    checklist: ['제품 전원 ON 확인', '공유기 근처에 배치', 'Wi-Fi 연결 모드 활성화']
  },
  {
    badge: '완료!',
    icon: '🎉',
    title: '연결이 완료되었습니다',
    desc: 'ThinQ 앱에서 이제 언제 어디서나 제품을 제어하고 에너지 사용량을 확인하세요!',
    tips: ['앱에서 원격 제어 가능', '에너지 리포트 확인', 'AI 절약 모드 사용해보세요']
  }
];

function updateGuide(step) {
  const d = guideData[step];
  if (!d) return;
  guideStepBadge.textContent = d.badge;
  let html = `<div class="guide-item">
    <div class="guide-icon">${d.icon}</div>
    <h4>${d.title}</h4>
    <p>${d.desc}</p>`;
  if (d.tips) {
    html += `<div class="guide-tips">${d.tips.map(t=>`<div class="tip-item"><span class="tip-icon">💡</span><span>${t}</span></div>`).join('')}</div>`;
  }
  if (d.checklist) {
    html += `<div class="checklist">${d.checklist.map(c=>`<div class="check-item"><div class="check-icon todo">○</div><span>${c}</span></div>`).join('')}</div>`;
  }
  html += '</div>';
  guideContent.innerHTML = html;
}

function showProductCard(p) {
  productCard.style.display = 'block';
  productCardContent.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:28px">${p.icon}</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--text)">${p.name}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${p.model}</div>
      </div>
    </div>`;
}

function showConnectionMonitor(ssid) {
  connectionMonitor.style.display = 'block';
  monitorItems.innerHTML = `
    <div class="monitor-item"><span class="monitor-key">Wi-Fi</span><span class="monitor-val ok">${ssid}</span></div>
    <div class="monitor-item"><span class="monitor-key">신호강도</span><span class="monitor-val ok">강함 (-45dBm)</span></div>
    <div class="monitor-item"><span class="monitor-key">프로토콜</span><span class="monitor-val ok">WPA2</span></div>
    <div class="monitor-item"><span class="monitor-key">상태</span><span class="monitor-val warn" id="monConnStatus">연결 중...</span></div>`;
  setTimeout(()=>{
    const el = document.getElementById('monConnStatus');
    if (el) { el.textContent = '연결됨'; el.className = 'monitor-val ok'; }
  }, 4500);
}

// --- 빠른 답변 버튼 ---
function updateQuickActions() {
  const step = Math.max(state.currentStep, 0);
  const actions = quickActionsData[String(step)] || [];
  quickActions.innerHTML = actions.map(a =>
    `<button class="quick-btn" onclick="handleQuickAction('${a}')">${a}</button>`
  ).join('');
}

function handleQuickAction(text) {
  addUserMessage(text);
  let response = aiResponses.general[0];
  if (text.includes('Wi-Fi') || text.includes('비밀번호')) response = aiResponses.wifi[0];
  else if (text.includes('오류') || text.includes('문제') || text.includes('안 찾아')) response = aiResponses.error[0];
  else if (text.includes('Bluetooth') || text.includes('블루투스')) response = aiResponses.bluetooth[0];
  else if (text.includes('처음') || text.includes('초기화')) { response = '처음 화면으로 돌아갑니다!'; setTimeout(reset, 500); }
  else if (text.includes('다른 기기') || text.includes('추가')) { response = '다른 기기를 추가해 보세요!'; setTimeout(reset, 500); }
  setTimeout(() => addAiMessage(response), 300);
}

// --- 채팅 ---
window.handleFaqClick = function(question) {
  const input = document.getElementById('userInput');
  if (input) {
    input.value = question;
    handleUserInput();
  }
};

function addAiMessage(text, buttonsHtml = '') {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg ai';
  typingDiv.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  setTimeout(() => {
    typingDiv.remove();
    const formattedText = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble">${formattedText}${buttonsHtml}</div>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 핸드폰 화면 플로팅 툴팁에도 동일한 내용 표시
    const floatingAi = document.getElementById('floatingAi');
    const tooltip = document.getElementById('floatingAiTooltip');
    
    // 항상 마지막 메시지를 상태에 저장
    state.lastAiTooltipHtml = formattedText + buttonsHtml;

    if (floatingAi && tooltip && floatingAi.classList.contains('show') && !floatingAi.classList.contains('off')) {
      tooltip.style.opacity = '';
      tooltip.style.pointerEvents = '';
      tooltip.classList.add('expanded');
      tooltip.innerHTML = state.lastAiTooltipHtml;
      tooltip.scrollTop = 0; // 스크롤 맨 위로
    }
  }, 800);
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `<div class="msg-avatar user">👤</div><div class="msg-bubble">${text}</div>`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleUserInput() {
  const text = userInput.value.trim();
  if (!text) return;
  addUserMessage(text);
  userInput.value = '';
  const low = text.toLowerCase();
  let response = aiResponses.general[0];
  if (low.includes('wifi') || low.includes('와이파이') || low.includes('비밀번호')) response = aiResponses.wifi[0];
  else if (low.includes('오류') || low.includes('에러') || low.includes('안됨') || low.includes('실패')) response = aiResponses.error[0];
  else if (low.includes('bluetooth') || low.includes('블루투스')) response = aiResponses.bluetooth[0];
  else if (low.includes('qr 스캔 화면 열') || low.includes('qr스캔 화면 열') || low.includes('qr 스캔')) {
    response = '네, QR 스캔 화면으로 이동합니다. 화면에 제품의 QR 코드를 스캔해 주세요.';
    setTimeout(() => {
      if (!state.selectedProduct) {
        state.selectedProduct = products.washing[0];
      }
      showQrScanScreen();
    }, 1500);
  } else if (low.includes('설명') || low.includes('방법') || text.includes('제품 연결하는 방법')) {
    response = `ThinQ 앱에 제품을 연결하는 방법은 매우 간단합니다! 다음 단계에 따라 진행해 주세요:

**1. 준비 단계**
- 스마트폰의 **Wi-Fi**와 **블루투스**를 켜주세요.
- 연결할 가전제품의 전원을 켜주세요.
- 가전제품 근처(약 10m 이내)로 이동해 주세요.

**2. 제품 검색 및 선택**
- 홈 화면 우측 상단의 **'+ 기기 추가'** 버튼을 누른 후 **'제품 추가'**를 선택합니다.
- 앱이 자동으로 주변 기기를 검색합니다. 만약 검색되지 않는다면, 화면 하단에서 연결할 제품군을 직접 선택해 주세요.

**3. 기기 연결**
- 화면의 안내에 따라 기기의 버튼을 눌러 Wi-Fi를 활성화합니다.
- 스마트폰 화면에 나타나는 가이드에 따라 기기를 선택하고, 가정 내 Wi-Fi 네트워크(2.4GHz)를 연결해 줍니다.

**4. 연결 완료**
- 잠시 후 제품 연결이 완료되며, 나만의 기기 이름을 설정할 수 있습니다!

연결할 제품을 선택하시고 화면 안내를 따라주시면, 제가 계속 도와드리겠습니다 😊`;
  } else if (low.includes('혜택')) {
    response = `LG ThinQ 앱에 가전제품을 연결하시면 일상이 훨씬 편리해지는 **다양한 스마트 혜택**을 누리실 수 있습니다! 🎁

**1. 언제 어디서나 원격 제어**
- 외출 중에도 에어컨을 미리 켜서 집을 시원하게 만들거나, 세탁기 작동 상태를 확인하고 원격으로 세탁을 시작할 수 있습니다.

**2. 맞춤형 스마트 알림**
- 세탁이나 건조가 끝났을 때, 냉장고 문이 열려있을 때 등 제품 상태에 대한 실시간 푸시 알림을 스마트폰으로 받을 수 있어 매우 편리합니다.

**3. 스마트 진단 (Smart Diagnosis)**
- 제품에 이상이 생기면 앱이 스스로 문제를 진단하고, 해결 방법이나 서비스 센터 연결을 도와줍니다.

**4. 에너지 모니터링**
- 가전제품별 전력 사용량을 실시간으로 확인하고, 예상 전기요금까지 미리 파악하여 에너지를 절약할 수 있습니다.

지금 바로 연결할 제품을 선택하시고 혜택을 누려보세요!`;
  } else if (low.includes('에어컨') || low.includes('냉장고') || low.includes('tv') || low.includes('세탁')) {
    response = '해당 제품을 선택하시면 단계별로 안내드리겠습니다! 왼쪽 화면에서 제품을 선택해 주세요.';
  }
  setTimeout(() => addAiMessage(response), 400);
}

// --- 이벤트 리스너 ---
function setupEventListeners() {
  sendBtn.addEventListener('click', handleUserInput);
  userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleUserInput(); });
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const s = parseInt(dot.dataset.step);
      if (s <= state.currentStep) {
        if (s === 0) showHome();
        else if (s === 1) showProductSelect();
        else if (s === 4 && state.connected) showDone();
      }
    });
  });

  const floatingAi = document.getElementById('floatingAi');

  if (floatingAi) {
    floatingAi.addEventListener('click', function() {
      // 바운스 효과
      this.style.transform = 'scale(0.9)';
      setTimeout(() => this.style.transform = 'scale(1)', 150);

      // On/Off 토글
      this.classList.toggle('off');
      localStorage.setItem('aiIconOff', this.classList.contains('off'));

      // 켜졌을 때만 입력창 포커스 (왼쪽 패널)
      if (!this.classList.contains('off')) {
        document.getElementById('userInput').focus();
        
        // 다시 켤 때 마지막 말풍선 복원 (현재 화면에서 명시적으로 숨겨둔 경우가 아닐 때만)
        const tooltip = document.getElementById('floatingAiTooltip');
        if (tooltip && state.lastAiTooltipHtml && tooltip.style.opacity !== '0') {
          tooltip.style.opacity = '';
          tooltip.style.pointerEvents = '';
          tooltip.classList.add('expanded');
          tooltip.innerHTML = state.lastAiTooltipHtml;
        }
      }
    });
  }
}

window.handleTooltipYes = function(e) {
  if (e) e.stopPropagation();
  const floatingAi = document.getElementById('floatingAi');
  const tooltip = document.getElementById('floatingAiTooltip');
  
  if (!floatingAi || !tooltip) return;

  // 왼쪽 패널에 사용자 응답 기록
  addUserMessage("예, 준비되었습니다.");
  
  // 다시 스캐닝 모드 진입
  floatingAi.classList.add('scanning');
  tooltip.classList.remove('expanded');
  tooltip.textContent = '재점검 중...';
  
  setTimeout(() => {
    addAiMessage("다시 점검 중입니다... 🔍");
  }, 200);

  // 2초 후 점검 완료 시나리오
  setTimeout(() => {
    if (state.currentStep !== 1) return;
    
    floatingAi.classList.remove('scanning');
    tooltip.textContent = '준비가 되었네요! 제품을 선택해주세요.';
    
    addAiMessage("준비가 완료되었네요! 이제 모바일 화면에서 추가할 제품을 선택해 주세요.");
  }, 2000);
};

// --- 앱 시작 ---
init();
