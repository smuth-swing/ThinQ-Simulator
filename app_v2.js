// ============================
// ThinQ AI 매니저 - 메인 앱
// ============================

// --- 상태 관리 ---
const state = {
  currentStep: -1,  // -1: 스플래시
  selectedProduct: null,
  wifiSSID: '',
  connected: false,
  firstTimeStep: 0  // 0: 아님, 1~4: 준비사항 단계
};

const APP_STATE_STORAGE_KEY = 'thinq_app_state_v1';

function saveAppState() {
  try {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch(e) {}
}

function loadAppState() {
  try {
    const saved = localStorage.getItem(APP_STATE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch(e) { return null; }
}

function clearAppState() {
  try { localStorage.removeItem(APP_STATE_STORAGE_KEY); } catch(e) {}
}

let splashTimeout = null;
let searchInterval = null;

// --- 타이밍 상수 (매직넘버 제거) ---
const TIMING = {
  SPLASH_DURATION: 1800,       // 스플래시 화면 표시 시간
  ENV_CHECK_DELAY: 2500,       // 네트워크 환경 점검 시간
  BLE_CHECK_DELAY: 2500,       // 블루투스 확인 지연
  QR_TRANSITION: 3000,         // QR 스캔 화면 전환 대기
  SEARCH_TRANSITION: 1500,     // 기기 검색 화면 전환 대기
  SEARCH_LOG_INTERVAL: 800,    // 검색 로그 출력 간격
  SEARCH_COMPLETE: 3000,       // 검색 완료 후 다음 화면 전환
  TYPING_DISPLAY: 800,         // 타이핑 인디케이터 표시 시간
  RECOMMEND_DELAY: 1500,       // 추천 결과 표시 지연
  AI_RESPONSE_TRANSITION: 3000, // AI 응답 후 화면 전환
  CONN_STATUS_DELAY: 4500,     // 연결 상태 표시 지연
  KEYBOARD_INIT: 500,          // 키보드 초기화 지연
  QR_SCAN_DURATION: 2500,      // QR 스캔 시뮬레이션 시간
  QR_SUCCESS_DELAY: 1500,      // QR 인식 후 전환 대기
  SELECT_PRODUCT_DELAY: 1000,  // 제품 선택 후 전환 대기
};

// --- 제한값 상수 ---
const LIMITS = {
  MAX_GEMINI_HISTORY: 10,      // Gemini 대화 이력 최대 보존 수
  MAX_STORED_MESSAGES: 100,    // localStorage 채팅 기록 최대 수
};

// --- 제품명 → 제품 정보 매핑 유틸리티 ---
const PRODUCT_MAP = [
  { keywords: ['에어컨', 'ac'], id: 'ac', cat: 'air' },
  { keywords: ['세탁', '워시'], id: 'washer', cat: 'washing' },
  { keywords: ['건조'], id: 'dryer', cat: 'washing' },
  { keywords: ['냉장', '디오스'], id: 'fridge', cat: 'kitchen' },
  { keywords: ['tv', '티비', 'oled', 'qned'], id: 'oled', cat: 'tv' },
  { keywords: ['공기', '청정'], id: 'purifier', cat: 'air' },
];

function resolveProduct(keyword) {
  const low = keyword.toLowerCase();
  const match = PRODUCT_MAP.find(m => m.keywords.some(k => low.includes(k)));
  if (!match) return null;
  return {
    product: Object.values(products).flat().find(x => x.id === match.id),
    id: match.id,
    cat: match.cat
  };
}

// --- Wi-Fi 정보 저장소 (localStorage 기반) ---
const WIFI_STORAGE_KEY = 'thinq_wifi_info_v1';

function saveWifiInfo(ssid, password) {
  try {
    localStorage.setItem(WIFI_STORAGE_KEY, JSON.stringify({ ssid, password, savedAt: Date.now() }));
  } catch(e) {}
}

function loadWifiInfo() {
  try {
    const saved = localStorage.getItem(WIFI_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch(e) { return null; }
}

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
    '제품을 검색하고 있습니다! 📡\n\n제품이 검색되지 않으면:\n1. 제품 전원이 켜져 있는지 확인\n2. Wi-Fi 공유기 근처에 제품 배치\n3. 제품의 Wi-Fi 연결 모드 활성화',
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

// --- 채팅 이력 저장소 (localStorage 기반) ---
const CHAT_STORAGE_KEY = 'thinq_chat_history_v1';
const GEMINI_HISTORY_KEY = 'thinq_gemini_history_v1';

// 채팅 UI 기록을 localStorage에 저장
function saveChatToStorage(role, text) {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    saved.push({ role, text, time: Date.now() });
    // 최대 100개 유지
    if (saved.length > 100) saved.splice(0, saved.length - 100);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(saved));
  } catch(e) {}
}

// localStorage에서 채팅 UI 복원
function restoreChatFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    if (saved.length === 0) return false;
    
    saved.forEach(item => {
      const formattedText = item.text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      const div = document.createElement('div');
      div.className = `chat-msg ${item.role}`;
      if (item.role === 'ai') {
        div.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble">${formattedText}</div>`;
      } else {
        div.innerHTML = `<div class="msg-avatar user">👤</div><div class="msg-bubble">${formattedText}</div>`;
      }
      // 타임스탬프 표시 (선택적)
      chatContainer.appendChild(div);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Gemini 대화 이력도 복원
    const geminiSaved = localStorage.getItem(GEMINI_HISTORY_KEY);
    if (geminiSaved) chatHistory = JSON.parse(geminiSaved);
    
    return true;
  } catch(e) { return false; }
}

// 채팅 이력 완전 삭제
function clearChatStorage() {
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(GEMINI_HISTORY_KEY);
  } catch(e) {}
  clearAppState();
}

// --- 초기화 ---
function init() {
  createParticles();
  updateClock();
  setInterval(updateClock, 1000);
  
  // 이전 대화 복원 시도
  const hasHistory = restoreChatFromStorage();
  const savedState = loadAppState();
  
  if (hasHistory) {
    if (savedState) {
      Object.assign(state, savedState);
    }
    
    // 이어서 합니다 안내 메시지 (저장된 메시지 없이 UI만)
    const resumeDiv = document.createElement('div');
    resumeDiv.className = 'chat-resume-banner';
    resumeDiv.textContent = '─── 이전 대화 이어가기 ───';
    chatContainer.appendChild(resumeDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    restoreScreenByState();
  } else {
    showSplash();
  }
  
  setupEventListeners();
}

function restoreScreenByState() {
  const step = state.currentStep;
  
  // Step 2 이상 진행 시 선택된 기기가 없으면 런타임 에러 방지용 Fallback (Step 1로 이동)
  if (step >= 2 && !state.selectedProduct) {
    state.currentStep = 1;
    showProductSelect(true);
    return;
  }

  if (step === 0) showHome(true);
  else if (step === 1) showProductSelect(true);
  else if (step === 2) {
    if (state.selectedProduct.id === 'washer') {
      showWasherPowerScreen(true);
    } else {
      showWifiScreen(true);
    }
  }
  else if (step === 3) startSearch(true);
  else if (step === 4) showDone(true);
  else showHome(true);
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
  }, TIMING.SPLASH_DURATION);
}

// --- 홈 화면 ---
function showHome(isRestoring = false) {
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
  if (!isRestoring) addAiMessage(aiResponses.step0[0]);
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
function showProductSelect(isRestoring = false) {
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
  
  if (!isRestoring) {
    addAiMessage("환경 확인 중... 🔍");
    
    const floatingAi = document.getElementById('floatingAi');
    const floatingAiTooltip = document.getElementById('floatingAiTooltip');
    if (floatingAi && floatingAiTooltip) {
      floatingAi.classList.add('scanning');
      floatingAiTooltip.classList.remove('expanded');
      floatingAiTooltip.textContent = '환경 확인 중... 🔍';
    }

    setTimeout(() => {
      if (floatingAi) floatingAi.classList.remove('scanning');
      addAiMessage("환경 확인 완료! ✅\n처음 제품 연결을 하시는 거 같은데 맞나요?");
      
      // 말풍선이 뜰 때 자동으로 가상 키보드 활성화
      if (typeof showProductSearchInput === 'function') {
        showProductSearchInput();
      }
    }, 2500);
  } else {
    // 복원 시 처리 (필요에 따라)
    const floatingAi = document.getElementById('floatingAi');
    const floatingAiTooltip = document.getElementById('floatingAiTooltip');
    if (floatingAi && floatingAiTooltip) {
      floatingAi.classList.remove('scanning');
      floatingAiTooltip.classList.remove('expanded');
    }
  }


}

// --- 제품 선택 후 Wi-Fi 화면 ---
function selectProduct(id, cat, isAiFlow = false) {
  const p = (products[cat]||[]).find(x=>x.id===id) ||
            Object.values(products).flat().find(x=>x.id===id);
  if (!p) return;
  
  if (!isAiFlow && id !== 'washer') {
    showNotReadyPopup();
    return;
  }
  state.selectedProduct = p;
  if (isAiFlow) {
    // AI 대화 흐름을 통해 제품이 선택된 경우,
    // 하드코딩된 환경/블루투스 체크 타이머와 툴팁 덮어쓰기 로직을 비활성화하고
    // 우측 가이드 패널에 선택된 제품 카드만 표시하도록 합니다.
    showProductCard(p);
  } else {
    // 제품 카테고리 화면에서 직접 제품을 선택(클릭)한 경우,
    // 대화형 확인 절차를 생략하고 바로 해당 기기의 등록 연결 UI 흐름으로 진입합니다.
    if (id === 'washer') {
      showWasherTypesPopup(p);
    } else {
      showWifiScreen();
    }
  }
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
    showWasherPowerScreen();
  } else {
    showNotReadyPopup();
  }
}

window.showWasherPowerScreen = function(isRestoring = false) {
  state.currentStep = 2; // Wi-Fi 전 단계 혹은 같은 단계로 처리
  updateProgress();
  const screenContent = document.getElementById('screenContent');
  screenContent.innerHTML = `
    <div class="screen" style="padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; position: absolute; top: 0; left: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center;" onclick="showQrScanScreen()">
      <img src="washer_power_ui.png" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" alt="세탁기 전원 켜기 화면">
    </div>`;
    
  if (!isRestoring) addAiMessage("세탁기의 전원을 켜주세요.\n준비되셨다면 화면 하단의 **[전원을 켰어요]** 버튼을 눌러주세요.");
};

window.showQrScanScreen = function() {
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
        <div class="qr-back-btn" onclick="showWasherPowerScreen()">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </div>
        <div class="qr-close-btn" onclick="showHome()">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>
      <div class="qr-title">${p ? p.name : '제품'} QR을 스캔해주세요.</div>
      
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
        <div class="qr-help-text">${p ? p.name : '제품'} QR 위치를 모르겠어요. ></div>
      </div>
      
      <div class="qr-bottom-btn" onclick="document.getElementById('qrScreen').remove(); showWifiScreen();">QR 없이 추가하기</div>
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

window.handleBleTurnedOn = function(cat) {
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) {
    tooltip.classList.remove('expanded');
    tooltip.textContent = '확인 완료!';
  }
  
  addUserMessage("블루투스를 켰어요.");
  
  state.currentStep = 2; // Wi-Fi 및 연결방법 단계
  updateProgress();
  
  if (cat === 'tv') {
    addAiMessage("확인되었습니다!\n다음으로 TV 연결 방법을 선택해 주세요.\n\n**1. PIN 번호 입력**\n**2. 자동 찾기**\n\n원하시는 방식을 자판으로 입력해 주세요.");
  } else {
    addAiMessage("확인되었습니다!\n다음으로 가전 연결 방법을 선택해 주세요.\n\n**1. QR 스캔**\n**2. 수동 찾기**\n\n원하시는 방식을 자판으로 입력해 주세요.");
  }
  
  // 연결 방식 입력 대기 상태로 전환
  state.waitingForConnectionMethod = cat;
  
  updateGuide(2);
};

window.showWifiScreen = function(isRestoring = false) {
  const p = state.selectedProduct;
  const screenEl = document.getElementById('screenContent');
  const savedWifi = loadWifiInfo();
  const ssidVal = savedWifi ? savedWifi.ssid : '';
  const pwVal = savedWifi ? savedWifi.password : '';

  screenEl.innerHTML = `
    <div class="screen wifi-screen">
      <div class="nav-header">
        <div class="back-btn" onclick="showProductSelect()">‹</div>
        <div class="nav-title">Wi-Fi 설정</div>
      </div>
      <div class="wifi-illustration">
        <div class="wifi-anim">${p.icon}</div>
        <div class="wifi-title">${p.name} 연결</div>
        <div class="wifi-desc">${p.model}를 ThinQ 앱에 등록하기 위해<br>Wi-Fi 정보를 입력해 주세요</div>
      </div>
      <div class="wifi-input-section">
        <div>
          <div class="input-label">Wi-Fi 네트워크 (SSID)</div>
          <input class="input-field" id="ssidInput" type="text"
            placeholder="Wi-Fi 이름 입력" value="${ssidVal}" />
        </div>
        <div>
          <div class="input-label">비밀번호</div>
          <input class="input-field" id="pwInput" type="password"
            placeholder="Wi-Fi 비밀번호 입력" value="${pwVal}" />
        </div>
        <button class="primary-btn" id="connectBtn" onclick="startSearch()">제품 검색 시작</button>
      </div>
    </div>`;

  if (!isRestoring) {
    if (savedWifi && savedWifi.ssid) {
      const maskedPw = savedWifi.password ? '*'.repeat(savedWifi.password.length) : '(없음)';
      addAiMessage(`저장된 Wi-Fi 정보를 자동으로 입력해 드렸어요! 📡\n\n**네트워크**: ${savedWifi.ssid}\n**비밀번호**: ${maskedPw}\n\n맞으시면 바로 [제품 검색 시작] 버튼을 눌러주세요!\n다른 Wi-Fi라면 수정 후 진행해 주세요.`);
    } else {
      addAiMessage("연결 방식을 선택하셨군요.\n이제 제품을 등록할 Wi-Fi 네트워크 정보를 입력해 주세요.");
    }
  }
}

// --- 제품 검색 화면 ---
function startSearch(isRestoring = false) {
  const ssid = document.getElementById('ssidInput')?.value || 'MyWiFi';
  const pw = document.getElementById('pwInput')?.value;
  if (!ssid.trim()) { alert('Wi-Fi 이름을 입력해 주세요'); return; }
  state.wifiSSID = ssid;
  state.currentStep = 3;
  updateProgress();

  const p = state.selectedProduct || { name: '제품' };
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
  if (!isRestoring) addAiMessage(aiResponses.step3[0]);
  updateQuickActions();
  showConnectionMonitor(ssid);

  const logEl = document.getElementById('searchLog');
  let i = 0;
  
  clearInterval(searchInterval);
  searchInterval = setInterval(() => {
    if (i < logs.length) {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.innerHTML = `<div class="log-dot"></div><span>${logs[i]}</span>`;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
      i++;
    } else {
      clearInterval(searchInterval);
      setTimeout(showDone, TIMING.SEARCH_COMPLETE);
    }
  }, TIMING.SEARCH_LOG_INTERVAL);
}

// --- 완료 화면 ---
function showDone(isRestoring = false) {
  state.currentStep = 4;
  state.connected = true;
  updateProgress();
  const p = state.selectedProduct;
  const pName = p ? p.name : '제품';
  screenContent.innerHTML = `
    <div class="screen" style="padding: 0; margin: 0; width: 100%; height: 100%; overflow: hidden; background: #fff; position: absolute; top: 0; left: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center;" onclick="showHome()">
      <img src="done_ui.png" style="width: 100%; height: 100%; object-fit: cover; object-position: top center;" alt="연결 완료 화면">
    </div>`;
  updateGuide(4);
  if (!isRestoring) addAiMessage(aiResponses.step4[0]);
  updateQuickActions();
}

// --- 초기화 ---
function reset() {
  clearTimeout(splashTimeout);
  clearInterval(searchInterval);

  state.currentStep = -1;
  state.selectedProduct = null;
  state.wifiSSID = '';
  state.connected = false;
  productCard.style.display = 'none';
  connectionMonitor.style.display = 'none';
  
  // 채팅 이력 지우기
  clearChatStorage();
  if (typeof chatHistory !== 'undefined') {
    chatHistory = [];
  }
  if (chatContainer) {
    chatContainer.innerHTML = '';
  }

  // 열려있는 오버레이 닫기
  hideAddMenu();
  
  const floatingAi = document.getElementById('floatingAi');
  if (floatingAi) floatingAi.classList.remove('off');

  showSplash();
}

// --- 진행 상태 업데이트 ---
function updateProgress() {
  saveAppState();
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
  }, TIMING.CONN_STATUS_DELAY);
}

// --- 빠른 답변 버튼 ---
function updateQuickActions() {
  const step = Math.max(state.currentStep, 0);
  const actions = quickActionsData[String(step)] || [];
  quickActions.innerHTML = actions.map(a =>
    `<button class="quick-btn" onclick="handleQuickAction('${a}')">${a}</button>`
  ).join('');
}

// --- 채팅 대화 기록용 변수 ---
let chatHistory = [];
let fallbackApiKeys = [];
let currentKeyIndex = 0;

async function callGemini(userText, retryCount = 0) {
  if (fallbackApiKeys.length === 0) {
    try {
      const res = await fetch("keys_encoded.txt");
      if (res.ok) {
        const text = await res.text();
        const encodedKeys = text.split('\n').map(k => k.trim()).filter(k => k.length > 0);
        fallbackApiKeys = encodedKeys.map(k => k.split('').reverse().join(''));
      }
    } catch(e) { console.log("Fallback keys load failed", e); }
  }

  const urlParams = new URLSearchParams(window.location.search);
  let API_KEY = urlParams.get('apikey');
  if (!API_KEY) {
    try { API_KEY = localStorage.getItem('GEMINI_API_KEY'); } catch(e) {}
  }
  API_KEY = API_KEY || document.getElementById('apiKeyInput')?.value;
  
  if (retryCount > 0 || (!API_KEY && fallbackApiKeys.length > 0)) {
    API_KEY = fallbackApiKeys[currentKeyIndex % fallbackApiKeys.length];
  }

  if (!API_KEY) {
    return `{"ai_message": "🚨 API 키가 필요합니다. 개발자 도구 콘솔에서 localStorage.setItem('GEMINI_API_KEY', '발급받은키') 를 입력하시거나, v3 버전을 이용해 주세요."}`;
  }
  
  // 새로 작동이 확인된 최신 모델 적용 (3.5 모델 서버 과부하로 인해 임시로 2.5 모델로 변경)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  let currentStateInfo = "현재 홈 화면에 있습니다. 아직 제품을 선택하지 않았습니다.";
  if (state.currentStep === 1) currentStateInfo = "추가할 기기(제품) 카테고리를 선택하는 화면입니다.";
  else if (state.currentStep === 2) currentStateInfo = `현재 Wi-Fi 설정 화면입니다. 연결하려는 기기: ${state.selectedProduct?.name || '미선택'}`;
  else if (state.currentStep === 3) currentStateInfo = `기기를 검색 중입니다. 연결하려는 기기: ${state.selectedProduct?.name || '미선택'}`;
  else if (state.currentStep === 4) currentStateInfo = `기기 연결이 완료되었습니다. 연결된 기기: ${state.selectedProduct?.name || '미선택'}`;

  const savedWifi = loadWifiInfo();
  let wifiStr = "저장된 Wi-Fi 정보 없음";
  if (savedWifi && savedWifi.ssid) {
    wifiStr = `Wi-Fi 이름: ${savedWifi.ssid}, 비밀번호: ${savedWifi.password || '없음'}`;
  }

  const systemInstruction = `너는 LG ThinQ 앱 제품 연결을 돕는 친절하고 전문적인 AI 매니저야.
사용자의 질문에 대해 아래 제공된 [지식 베이스 가이드]를 바탕으로 정확하고 쉽게 답변해줘.

[상태 추출 및 응답 형식 (매우 중요)]
너는 사용자의 문장을 분석하여 반드시 아래와 같은 JSON 형식으로만 응답해야 해. 다른 텍스트는 절대 출력하지 마.
{
  "extracted_info": {
    "product": "사용자가 연결하고자 언급한 기기명(세탁기, 에어컨 등), 없으면 null",
    "wifi_ssid": "사용자가 언급한 와이파이 이름, 없으면 null",
    "wifi_password": "사용자가 언급한 와이파이 비밀번호, 없으면 null",
    "ble_on": "사용자가 블루투스를 켰다고 명시적으로 동의하거나 켰다고 한 경우 true, 아니면 false",
    "connection_method": "사용자가 QR이나 스캔을 언급하면 'qr', 주변검색을 언급하면 'auto', 수동을 언급하면 'manual', 그 외나 없으면 null",
    "is_experienced": "사용자가 이전에 연결해 본 적이 있거나 처음이 아니라고 대답하면 true, 처음이라고 하거나 모르면 false, 아직 알 수 없으면 null",
    "transition_to": "사용자와 대화가 충분히 진행되어 이제 기기 등록/스캔 화면으로 넘어가야 할 시점이라고 판단되면 다음 중 하나를 출력 ('qr_screen' | 'auto_search_screen' | 'manual_wifi_screen'). 아직 대화 중이거나 질문을 던지는 상황이면 무조건 null"
  },
  "ai_message": "사용자에게 실제로 보여질 대화 메시지 (줄바꿈이 필요하면 실제 엔터가 아닌 반드시 '\\n' 이스케이프 문자로 출력할 것)"
}

[지식 베이스 가이드]
${typeof THINQ_AGENT_KNOWLEDGE !== 'undefined' ? THINQ_AGENT_KNOWLEDGE : ''}

[제품 연결 프로세스 및 시나리오 가이드]
- 제품 연결에는 기본적으로 알아야 할 정보들(대상 제품, Wi-Fi 2.4GHz 여부, 기기 전원, 스마트폰 블루투스, 연결 방식)이 있지만, **반드시 정해진 순서대로 기계처럼 물어볼 필요는 없습니다.**
- 고객의 문의 사항과 대화 맥락을 최우선으로 분석하여, 고객의 질문에 먼저 답해주고 자연스럽게 다음 연결 단계로 유도하세요.
- 고객이 한 번에 여러 개를 말했다면(예: "에어컨 연결할건데 전원 켰어") 이미 확인된 항목은 건너뛰고 남은 항목만 진행하세요.
- 기기 이름이 파악되면 다음 확인 사항(블루투스, 전원 등)을 자연스럽게 하나 제안해 주세요. (주의: TV는 5GHz도 지원하므로 2.4GHz 여부를 절대 묻지 마세요.)
- 연결 준비가 되었거나 고객이 방식을 물어보면, "가장 빠르고 편한 [QR 스캔 방식]으로 진행할까요?" 등 방식을 제안하세요. (이때는 질문이므로 transition_to는 null)
- 고객이 방식에 동의하거나 특정 방식("QR 스캔 해줘" 등)을 요구하면, "준비합니다. 잠시 후 자동 이동합니다."라고 답변하며 transition_to 값을 알맞게 지정하세요.
- **[QR 연결 예외 규칙 (매우 중요)]** 사용자가 'QR'이나 '스캔'으로 연결하겠다고 확정하면, 연결할 기기(제품명)가 무엇인지 절대로 묻지 마세요! 즉시 "네, QR 스캔 화면으로 이동합니다."라고 답변하고 transition_to를 "qr_screen"으로 출력하세요.

[사용자의 현재 상태]
${currentStateInfo}

[임시 저장된 고객의 Wi-Fi 정보]
${wifiStr}
(고객이 자신의 와이파이 이름이나 비밀번호를 까먹어서 물어보면 위 정보를 친절하게 알려주세요.)

[답변 규칙]
- 사용자가 질문하면 [지식 베이스 가이드]를 참조하되, **절대로 긴 목록(리스트)을 한 번에 나열하지 마세요.**
- 무조건 순서대로 진행하려 하지 말고, 고객의 문의 사항을 우선적으로 해결하세요.
- 친구와 카카오톡으로 대화하듯, **한 번에 한 가지 주제만** 짧게 답변하세요.
- **[경험자 판단 규칙]** 사용자가 연결 경험이 있는 기존 사용자라면, 전원이나 Wi-Fi 기초 질문을 전부 생략하고 바로 연결 방식을 물어보는 초고속 연결 가이드를 적용하세요.
- **[일상적인 대화 및 인사 대응]** 사용자가 "안녕", "hi" 등 가벼운 인사를 하거나 충분히 의미를 파악할 수 있는 질문을 한 경우에는, 절대 못 알아들은 척하지 말고 자연스럽게 인사를 받아주거나 맥락에 맞게 친절히 답변해 주세요.
- **[오입력 대응 규칙 (매우 중요)]** 고객의 입력이 아래 중 하나에 해당하여 의미 파악이 '아예 불가능한' 경우에만 "말씀하신 내용을 잘 이해하지 못했어요. 다시 한 번 확인해 주시겠어요?"라고 되물어보세요. (단순 인사나 일상 대화는 무조건 정상 처리할 것)
  1) 영문 자판 상태로 잘못 입력한 무의미한 알파벳 나열 (예: "so", "asdf", "dkssud" 등)
  2) 의미를 알 수 없는 자음/모음의 나열 (예: "ㅁㄴㅇㄹ", "ㅎㅎ", "ㅋㅋ" 만 있는 경우 등)`;

  const contents = [...chatHistory, { role: "user", parts: [{ text: userText }] }];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    
    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      chatHistory.push({ role: "user", parts: [{ text: userText }] });
      chatHistory.push({ role: "model", parts: [{ text: responseText }] });
      
      if (chatHistory.length > LIMITS.MAX_GEMINI_HISTORY) chatHistory = chatHistory.slice(chatHistory.length - LIMITS.MAX_GEMINI_HISTORY);
      
      // Gemini 대화 이력 localStorage 동기화
      try { localStorage.setItem(GEMINI_HISTORY_KEY, JSON.stringify(chatHistory)); } catch(e) {}
      
      return responseText;
    }
    
    if (data.error) {
        console.error("Gemini API Error details:", data.error);
        if ((data.error.code === 400 || data.error.code === 403 || data.error.code === 429) && fallbackApiKeys.length > 0 && retryCount < fallbackApiKeys.length) {
            console.log("API Key failed. Switching to next key...");
            
            const existingTyping = document.querySelectorAll('.chat-msg.ai .typing-indicator');
            existingTyping.forEach(el => {
                const parent = el.closest('.chat-msg');
                if (parent) parent.style.display = 'none';
            });

            addAiMessage("🚨 Agent에 오류가 발생하여 자동 수정 중...");
            
            currentKeyIndex++;
            const newKey = fallbackApiKeys[currentKeyIndex % fallbackApiKeys.length];
            try { localStorage.setItem('GEMINI_API_KEY', newKey); } catch(e) {}
            const apiKeyInput = document.getElementById('apiKeyInput');
            if (apiKeyInput) apiKeyInput.value = newKey;
            
            await new Promise(r => setTimeout(r, 2000));
            
            addAiMessage("✅ 수정이 완료되었습니다. 이전 명령을 재수행할게요!");
            
            await new Promise(r => setTimeout(r, 2000));
            
            return await callGemini(userText, retryCount + 1);
        }
        if (data.error.code === 503) {
            return `🚨 서버 지연 (503): 현재 구글 AI 서버에 사용자가 몰려 일시적으로 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요. (키 값 문제는 아닙니다)`;
        }
        return `🚨 API 오류 발생 (${data.error.code}): ${data.error.message}\n\n모델 권한이 없거나 키가 잘못되었을 수 있습니다. 콘솔을 확인해주세요.`;
    }
    return "API 응답을 해석할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Request Failed:", error);
    return `🚨 통신 오류: ${error.message}`;
  }
}

function handleQuickAction(text) {
  if (text.includes('처음') || text.includes('초기화')) { 
    addUserMessage(text);
    addAiMessage('처음 화면으로 돌아갑니다!'); 
    setTimeout(reset, 500); 
    chatHistory = [];
    clearChatStorage(); // localStorage도 함께 초기화
    return;
  }
  if (text.includes('다른 기기') || text.includes('추가')) { 
    addUserMessage(text);
    addAiMessage('다른 기기를 추가해 보세요!'); 
    setTimeout(reset, 500); 
    chatHistory = [];
    clearChatStorage(); // localStorage도 함께 초기화
    return;
  }
  
  // 빠른 답변 버튼 클릭 시에도 Gemini로 질문
  userInput.value = text;
  handleUserInput();
}

// --- 채팅 ---
window.handleFaqClick = function(question) {
  const input = document.getElementById('userInput');
  if (input) {
    input.value = question;
    // Enter 키 이벤트를 직접 발생시키거나 내부 전송 함수 호출
    handleUserInput();
  }
};

function addAiMessage(text, buttonsHtml = '') {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg ai';
  typingDiv.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  const floatingAi = document.getElementById('floatingAi');
  const tooltip = document.getElementById('floatingAiTooltip');
  const isVisible = floatingAi && floatingAi.classList.contains('show');
  
  if (isVisible && tooltip) {
    tooltip.classList.add('expanded');
    tooltip.style.display = ''; // 혹시 숨겨져있다면 다시 표시
    tooltip.innerHTML = '<div class="typing-indicator" style="margin:5px 0"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  }

  setTimeout(() => {
    typingDiv.remove();
    const formattedText = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble">${formattedText}${buttonsHtml}</div>`;
    chatContainer.appendChild(div);
    
    // 메시지 처음부터 보이도록: 해당 메시지 요소의 top이 컨테이너 내에서 보이게 스크롤
    const msgTop = div.offsetTop;
    const containerHeight = chatContainer.clientHeight;
    const msgHeight = div.offsetHeight;
    if (msgHeight > containerHeight * 0.5) {
      chatContainer.scrollTop = msgTop - 12;
    } else {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    if (isVisible && tooltip) {
      // 키보드가 켜져있어도 새로운 AI 메시지가 있으면 툴팁을 표시
      tooltip.style.display = ''; 
      tooltip.classList.add('expanded');
      tooltip.innerHTML = formattedText + buttonsHtml;
      // 툴팁도 항상 처음(맨 위)부터 보이도록
      tooltip.scrollTop = 0;
    }
    
    // localStorage에 저장
    saveChatToStorage('ai', text);
  }, TIMING.TYPING_DISPLAY);
}

function addUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `<div class="msg-avatar user">👤</div><div class="msg-bubble">${text}</div>`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // localStorage에 저장
  saveChatToStorage('user', text);
}

async function handleUserInput() {
  const text = userInput.value.trim();
  if (!text) return;
  addUserMessage(text);
  userInput.value = '';
  

  // 버튼과 입력창 비활성화 (중복 전송 방지)
  sendBtn.disabled = true;
  userInput.disabled = true;
  
  // API 응답 대기용 로딩 표시
  const typingDivId = 'aiTyping_' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg ai';
  typingDiv.id = typingDivId;
  typingDiv.innerHTML = `<div class="msg-avatar ai">✦</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  chatContainer.appendChild(typingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Gemini API 호출 전 FAQ 질문 하드코딩 처리 (빠르고 상세한 답변 제공)
  let rawResponse = '';
  const low = text.toLowerCase();
  
  if (low.includes('설명') || low.includes('방법') || text.includes('제품 연결하는 방법')) {
    rawResponse = `ThinQ 앱에 제품을 연결하는 방법은 매우 간단합니다! 다음 단계에 따라 진행해 주세요:

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
    rawResponse = `LG ThinQ 앱에 가전제품을 연결하시면 일상이 훨씬 편리해지는 **다양한 스마트 혜택**을 누리실 수 있습니다! 🎁

**1. 언제 어디서나 원격 제어**
- 외출 중에도 에어컨을 미리 켜서 집을 시원하게 만들거나, 세탁기 작동 상태를 확인하고 원격으로 세탁을 시작할 수 있습니다.

**2. 맞춤형 스마트 알림**
- 세탁이나 건조가 끝났을 때, 냉장고 문이 열려있을 때 등 제품 상태에 대한 실시간 푸시 알림을 스마트폰으로 받을 수 있어 매우 편리합니다.

**3. 스마트 진단 (Smart Diagnosis)**
- 제품에 이상이 생기면 앱이 스스로 문제를 진단하고, 해결 방법이나 서비스 센터 연결을 도와줍니다.

**4. 에너지 모니터링**
- 가전제품별 전력 사용량을 실시간으로 확인하고, 예상 전기요금까지 미리 파악하여 에너지를 절약할 수 있습니다.

지금 바로 연결할 제품을 선택하시고 혜택을 누려보세요!`;
  } else {
    // Gemini API 호출
    rawResponse = await callGemini(text);
  }

  // 대기용 로딩 제거
  const tEl = document.getElementById(typingDivId);
  if (tEl) tEl.remove();

  // 입력창 다시 활성화
  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();

  window.handleAiResponse(rawResponse, text);
}

window.handleAiResponse = function(rawResponse, userText) {
  // JSON 파싱 시도 (Slot Filling 적용)
  let responseText = rawResponse;
  let parsedJson = null;

  // 1. 순수 텍스트(JSON 아님)인지, JSON인지 판별
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    let cleanJsonStr = jsonMatch[0];
    
    // 2. 완벽한 JSON 파싱을 위해 쌍따옴표 안의 개행문자를 이스케이프(\n) 처리
    let inString = false;
    let sanitizedStr = '';
    for (let i = 0; i < cleanJsonStr.length; i++) {
      let char = cleanJsonStr[i];
      if (char === '"' && (i === 0 || cleanJsonStr[i-1] !== '\\')) {
        inString = !inString;
      }
      if (inString && char === '\n') sanitizedStr += '\\n';
      else if (inString && char === '\r') sanitizedStr += '\\r';
      else if (inString && char === '\t') sanitizedStr += '\\t';
      else sanitizedStr += char;
    }

    try {
      parsedJson = JSON.parse(sanitizedStr);
      
      // 3. 추출된 Slot 데이터가 있다면 앱 State(상태)에 즉시 동기화
      if (parsedJson.extracted_info) {
        const info = parsedJson.extracted_info;
        console.log("🔥 AI Slot Extracted:", info);
        
        if (info.product && !state.selectedProduct) {
          const resolved = resolveProduct(String(info.product));
          if (resolved) {
            state.selectedProduct = resolved.product;
            if (state.currentStep === 1 && typeof selectProduct === 'function') {
              selectProduct(resolved.id, resolved.cat, true);
            }
          }
        }
        
        if (info.wifi_ssid || info.wifi_password) {
          let currentWifi = loadWifiInfo() || {};
          if (info.wifi_ssid && info.wifi_ssid !== "null") currentWifi.ssid = info.wifi_ssid;
          if (info.wifi_password && info.wifi_password !== "null") currentWifi.password = info.wifi_password;
          saveWifiInfo(currentWifi.ssid, currentWifi.password);
        }

        const slotMonitor = document.getElementById('aiSlotMonitor');
        const slotItems = document.getElementById('aiSlotItems');
        if (slotMonitor && slotItems) {
          slotMonitor.style.display = 'block';
          let expStr = "파악 안됨";
          if (info.is_experienced === true) expStr = "<span style='color:green;font-weight:bold'>유경험자 (빠른 연결)</span>";
          else if (info.is_experienced === false) expStr = "처음 (가이드 필요)";

          slotItems.innerHTML = `
            <div style="margin-bottom:4px"><b>대상 기기:</b> ${info.product || '알 수 없음'}</div>
            <div style="margin-bottom:4px"><b>과거 연결 경험:</b> ${expStr}</div>
            <div style="margin-bottom:4px"><b>블루투스 상태:</b> ${info.ble_on ? 'ON (동의)' : '대기중'}</div>
            <div style="margin-bottom:4px"><b>연결 방식:</b> ${info.connection_method || '미결정'}</div>
            <div style="margin-bottom:4px"><b>Wi-Fi SSID:</b> ${info.wifi_ssid || '없음'}</div>
          `;
        }

        if (info.connection_method && info.connection_method !== "null") {
          state.connectionMethod = info.connection_method;
        }

        // AI가 문맥을 파악하여 스스로 화면 전환을 지시한 경우
        if (info.transition_to && info.transition_to !== "null") {
          if (info.transition_to === 'qr_screen') {
            setTimeout(() => { if (typeof hideKeyboard === 'function') hideKeyboard(); showQRScanScreen(); }, TIMING.QR_TRANSITION);
          } else if (info.transition_to === 'auto_search_screen') {
            setTimeout(() => { if (typeof hideKeyboard === 'function') hideKeyboard(); startSearch(); }, TIMING.SEARCH_TRANSITION);
          } else if (info.transition_to === 'manual_wifi_screen') {
            setTimeout(() => { if (typeof hideKeyboard === 'function') hideKeyboard(); showWifiScreen(); }, TIMING.AI_RESPONSE_TRANSITION);
          }
        }
      }
    } catch(e) {
      console.error("JSON parsing failed even after sanitization:", e);
    }
  }

  // 4. 대화 메시지(ai_message) 추출 최강 방어선
  if (parsedJson && parsedJson.ai_message) {
    responseText = parsedJson.ai_message;
  } else {
    const msgRegex = /"ai_message"\s*:\s*"([\s\S]*?)"(?:\s*\}|\s*,|\s*$)/;
    const msgMatch = rawResponse.match(msgRegex);
    if (msgMatch && msgMatch[1]) {
      responseText = msgMatch[1];
    } else {
      const fallbackRegex = /"ai_message"\s*:\s*"([\s\S]*)/;
      const fallbackMatch = rawResponse.match(fallbackRegex);
      if (fallbackMatch && fallbackMatch[1]) {
        let val = fallbackMatch[1];
        if(val.endsWith('"}')) val = val.substring(0, val.length - 2);
        else if(val.endsWith('"')) val = val.substring(0, val.length - 1);
        responseText = val;
      }
    }
  }

  // 5. 최후의 보루: 만약 위 로직들이 모두 실패해서 responseText에 JSON 구조가 그대로 담겨있다면 화면 노출 차단
  if (responseText.includes('"extracted_info"') || responseText.includes('"ai_message"')) {
    responseText = "앗, 메시지를 처리하는 중에 약간의 오류가 있었습니다. 다시 한 번 말씀해주시겠어요? 🥲";
  }

  // 특수 제어문자(이스케이프 되지 않은 엔터 등)를 화면 출력용 줄바꿈 태그로 일괄 변환
  if (responseText) {
    responseText = responseText.replace(/\\n/g, '\n');
  }

  // 결과 출력 (기존 UI 로직 그대로 사용)
  addAiMessage(responseText);
  
  // 구버전 하드코딩 텍스트 매칭 전환 로직 (isTransition) 전면 삭제됨.
  // 오직 AI가 문맥을 파악하여 내보낸 transition_to 값에 의해서만 전환됨.
}

// --- 이벤트 리스너 ---
function setupEventListeners() {
  sendBtn.addEventListener('click', handleUserInput);
  userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleUserInput(); });
  document.getElementById('resetBtn').addEventListener('click', reset);
  
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput) {
    let savedKey = null;
    try { savedKey = localStorage.getItem('GEMINI_API_KEY'); } catch(e) {}
    if (savedKey) apiKeyInput.value = savedKey;
    apiKeyInput.addEventListener('change', (e) => {
      localStorage.setItem('GEMINI_API_KEY', e.target.value.trim());
    });
  }
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
  const floatingAiTooltip = document.getElementById('floatingAiTooltip');

  if (floatingAi) {
    floatingAi.addEventListener('click', function(e) {
      // 이벤트 버블링 방지
      if (e) e.stopPropagation();
      
      // 바운스 효과
      this.style.transform = 'scale(0.9)';
      setTimeout(() => this.style.transform = 'scale(1)', 150);

      // On/Off 토글
      this.classList.toggle('off');

      if (this.classList.contains('off')) {
        // AI가 꺼졌을 때: 가상 키보드 닫기
        if (typeof hideKeyboard === 'function') hideKeyboard();
      } else {
        // AI가 켜졌을 때: 메인 입력창 포커스 (툴팁은 CSS .off 제거로 자동 표시됨)
        document.getElementById('userInput').focus();
      }
    });
  }

  if (floatingAiTooltip) {
    floatingAiTooltip.addEventListener('click', function(e) {
      if (e) e.stopPropagation();
      
      // 제품 선택 단계(Step 1)일 때만 가상 자판 토글
      if (state.currentStep === 1) {
        if (floatingAi && floatingAi.classList.contains('keyboard-active')) {
          if (typeof hideKeyboard === 'function') hideKeyboard();
        } else {
          if (typeof showProductSearchInput === 'function') showProductSearchInput();
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

  // 점검 완료 시나리오
  setTimeout(() => {
    if (state.currentStep !== 1) return;
    
    floatingAi.classList.remove('scanning');
    tooltip.textContent = '준비가 되었네요! 제품을 선택해주세요.';
    
    addAiMessage("준비가 완료되었네요! 이제 모바일 화면에서 추가할 제품을 선택해 주세요.");
  }, TIMING.AI_RESPONSE_TRANSITION);
};

// --- 앱 시작 ---
init();

window.showProductSearchInput = function() {
  const phoneScreen = document.getElementById('phoneScreen');
  if (!phoneScreen) return;
  
  if (document.getElementById('v2ProductInput')) return;

  const container = document.createElement('div');
  container.id = 'v2ProductInput';
  container.className = 'v2-bottom-input-container';
  container.innerHTML = `
    <div class="v2-input-bar-wrap">
      <input type="text" class="v2-bottom-input" id="v2Input" placeholder="예: 에어컨, 냉장고" autofocus readonly />
      <button class="v2-bottom-send" onclick="handleV2Input()">➤</button>
    </div>
    <div class="v2-virtual-keyboard">
      <div class="v2-keyboard-row">
        <div class="v2-key" onclick="typeV2Key('ㅂ')">ㅂ</div><div class="v2-key" onclick="typeV2Key('ㅈ')">ㅈ</div><div class="v2-key" onclick="typeV2Key('ㄷ')">ㄷ</div><div class="v2-key" onclick="typeV2Key('ㄱ')">ㄱ</div><div class="v2-key" onclick="typeV2Key('ㅅ')">ㅅ</div><div class="v2-key" onclick="typeV2Key('ㅛ')">ㅛ</div><div class="v2-key" onclick="typeV2Key('ㅕ')">ㅕ</div><div class="v2-key" onclick="typeV2Key('ㅑ')">ㅑ</div><div class="v2-key" onclick="typeV2Key('ㅐ')">ㅐ</div><div class="v2-key" onclick="typeV2Key('ㅔ')">ㅔ</div>
      </div>
      <div class="v2-keyboard-row" style="padding: 0 16px;">
        <div class="v2-key" onclick="typeV2Key('ㅁ')">ㅁ</div><div class="v2-key" onclick="typeV2Key('ㄴ')">ㄴ</div><div class="v2-key" onclick="typeV2Key('ㅇ')">ㅇ</div><div class="v2-key" onclick="typeV2Key('ㄹ')">ㄹ</div><div class="v2-key" onclick="typeV2Key('ㅎ')">ㅎ</div><div class="v2-key" onclick="typeV2Key('ㅗ')">ㅗ</div><div class="v2-key" onclick="typeV2Key('ㅓ')">ㅓ</div><div class="v2-key" onclick="typeV2Key('ㅏ')">ㅏ</div><div class="v2-key" onclick="typeV2Key('ㅣ')">ㅣ</div>
      </div>
      <div class="v2-keyboard-row">
        <div class="v2-key special" style="max-width:42px;">⇧</div>
        <div class="v2-key" onclick="typeV2Key('ㅋ')">ㅋ</div><div class="v2-key" onclick="typeV2Key('ㅌ')">ㅌ</div><div class="v2-key" onclick="typeV2Key('ㅊ')">ㅊ</div><div class="v2-key" onclick="typeV2Key('ㅍ')">ㅍ</div><div class="v2-key" onclick="typeV2Key('ㅠ')">ㅠ</div><div class="v2-key" onclick="typeV2Key('ㅜ')">ㅜ</div><div class="v2-key" onclick="typeV2Key('ㅡ')">ㅡ</div>
        <div class="v2-key special" style="max-width:42px;" onclick="typeV2Backspace()">⌫</div>
      </div>
      <div class="v2-keyboard-row" style="margin-bottom:0">
        <div class="v2-key special" style="max-width:42px;">123</div>
        <div class="v2-key special" style="max-width:42px;">😀</div>
        <div class="v2-key space" onclick="typeV2Key(' ')">스페이스</div>
        <div class="v2-key return" onclick="handleV2Input()">↵</div>
      </div>
    </div>
  `;
  phoneScreen.appendChild(container);
  
  // 자판 영역 클릭 시 버블링 방지 (바탕화면 클릭으로 인식되는 것 방지)
  container.onclick = function(e) {
    e.stopPropagation();
  };
  
  // 엔터 키 지원 (물리 키보드용)
  const inputEl = document.getElementById('v2Input');
  inputEl.removeAttribute('readonly'); // 물리 키보드도 허용
  inputEl.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleV2Input();
  });

  // 말풍선 숨기고 아이콘 위로 올리기
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) tooltip.style.display = 'none';
  
  const floatingAi = document.getElementById('floatingAi');
  if (floatingAi) {
    floatingAi.classList.add('keyboard-active');
    // 전역 클릭 리스너가 off 클래스를 토글하는 것을 무력화 (항상 켜져있게 유지)
    setTimeout(() => {
      floatingAi.classList.remove('off');
    }, 10);
  }
  
  // 자판 열리고 0.5초 뒤 AI가 먼저 질문 던지기
  setTimeout(async () => {
    if (chatHistory.length === 0) {
      const initMsg = "환경 확인 완료! ✅\n처음 제품 연결을 하시는 거 같은데 맞나요?";
      // addAiMessage는 showProductSelect에서 이미 호출했으므로 여기서는 chatHistory에만 추가
      chatHistory.push({ role: "model", parts: [{ text: initMsg }] });
      try { localStorage.setItem(GEMINI_HISTORY_KEY, JSON.stringify(chatHistory)); } catch(e) {}
    } else {
      const tooltip = document.getElementById('floatingAiTooltip');
      if (floatingAi && tooltip) {
        floatingAi.classList.add('scanning');
        tooltip.textContent = '생각 중...';
      }
      
      const prompt = `[System Alert] 고객이 대화창을 잠시 닫았다가 다시 열었습니다. 지금까지의 대화 맥락과 상태를 파악해서, 고객에게 다음에 해야 할 행동이나 이어서 할 질문을 한 문장으로 자연스럽게 제안해주세요. 
(예: "세탁기 연결을 계속 진행할까요?", "준비되셨다면 1번을 입력해주세요" 등) 
인사말이나 "다시 열었군요" 같은 불필요한 말은 생략하고 바로 본론만 말하세요.`;

      const reply = await callGemini(prompt);
      if (floatingAi) floatingAi.classList.remove('scanning');
      if (tooltip) tooltip.textContent = '답변 완료';
      
      window.handleAiResponse(reply, "대화창 다시 열림");
    }
  }, TIMING.KEYBOARD_INIT);
  
  // 바탕 화면 클릭 시 키보드 내리기 (AI 끄기 없이)
  setTimeout(() => {
    const screenContent = document.getElementById('screenContent');
    if (screenContent) {
      screenContent.onclick = function() {
        hideKeyboard();
      };
    }
  }, 100);
};

window.typeV2Key = function(char) {
  const inputEl = document.getElementById('v2Input');
  if (inputEl) inputEl.value += char;
};

window.typeV2Backspace = function() {
  const inputEl = document.getElementById('v2Input');
  if (inputEl) inputEl.value = inputEl.value.slice(0, -1);
};

window.handleV2Input = async function() {
  const inputEl = document.getElementById('v2Input');
  const val = inputEl.value.trim();
  if (!val) return;
  
  addUserMessage(val);
  inputEl.value = ''; // 입력창 비우기


  // 로딩 표시
  const floatingAi = document.getElementById('floatingAi');
  const tooltip = document.getElementById('floatingAiTooltip');
  if (floatingAi && tooltip) {
    floatingAi.classList.add('scanning');
    tooltip.textContent = '생각 중...';
  }

  const responseText = await callGemini(val);

  if (floatingAi) floatingAi.classList.remove('scanning');
  
  window.handleAiResponse(responseText, val);
};

window.hideKeyboard = function() {
  const container = document.getElementById('v2ProductInput');
  if (container) container.remove();
  
  const floatingAi = document.getElementById('floatingAi');
  if (floatingAi) floatingAi.classList.remove('keyboard-active');
  
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) tooltip.style.display = ''; // 다시 보이게
  
  // 자판이 닫힐 때, 연결 방법까지 모두 선택 완료한 상태라면 최종 Wi-Fi 화면으로 이동
  if (state.readyForWifi) {
    state.readyForWifi = false; // 중복 이동 방지
    if (state.connectionMethod === 'qr') {
      showQRScanScreen();
    } else {
      showWifiScreen();
    }
  }
  
  const screenContent = document.getElementById('screenContent');
  if (screenContent) screenContent.onclick = null;
};

window.showQRScanScreen = function() {
  const phoneScreen = document.getElementById('phoneScreen');
  if (!phoneScreen) return;

  state.currentStep = 2; // 단계 업데이트
  updateProgress();
  updateGuide(2);
  
  let style = document.getElementById('qrScannerStyle');
  if (!style) {
    style = document.createElement('style');
    style.id = 'qrScannerStyle';
    document.head.appendChild(style);
  }
  style.innerHTML = `
    .qr-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #f4f5f7; display: flex; flex-direction: column; z-index: 50; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; }
    .qr-header { width: 100%; display: flex; align-items: center; padding: 40px 20px 10px; justify-content: space-between; box-sizing: border-box; }
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

  const productName = state.selectedProduct?.name || '제품';

  // 기존 화면 덮어쓰기를 방지하고 DOM 요소를 새로 추가
  let qrScreenDiv = document.getElementById('qrScreen');
  if (qrScreenDiv) qrScreenDiv.remove();
  
  phoneScreen.insertAdjacentHTML('beforeend', `
    <div class="qr-screen" id="qrScreen">
      <div class="qr-header">
        <div class="qr-back-btn" onclick="showProductSelect()">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </div>
        <div class="qr-close-btn" onclick="showProductSelect()">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#777" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </div>
      </div>
      <div class="qr-title">${productName} QR을 스캔해주세요.</div>
      
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
        <div class="qr-help-text">${productName} QR 위치를 모르겠어요. ></div>
      </div>
      
      <div class="qr-bottom-btn" onclick="document.getElementById('qrScreen').remove(); showWifiScreen();">QR 없이 추가하기</div>
    </div>
  `);

  // 2.5초 뒤 자동 스캔 완료 시뮬레이션
  setTimeout(() => {
    const overlay = document.getElementById('qrSuccessOverlay');
    if (overlay) overlay.classList.add('show');
    
    // 인식 완료 후 1.5초 뒤 다음 연결 화면으로 자동 전환
    setTimeout(() => {
      const qrEl = document.getElementById('qrScreen');
      if (qrEl) qrEl.remove(); // 기존 상태바 및 screenContent 유지를 위해 삭제
      startSearch(); // Wi-Fi 설정 화면 건너뛰고 바로 제품 연결/검색 중 화면으로 전환
    }, 1500);
  }, 2500);
};
