const fs = require('fs');
let code = fs.readFileSync('app_v2.js', 'utf8');

const oldLogic = code.substring(
  code.indexOf('function selectProduct(id, cat) {'),
  code.indexOf('// --- 제품 검색 화면 ---')
);

const newLogic = \unction selectProduct(id, cat) {
  const p = (products[cat]||[]).find(x=>x.id===id) ||
            Object.values(products).flat().find(x=>x.id===id);
  if (!p) return;
  state.selectedProduct = p;
  showProductCard(p);

  addAiMessage(\\를 선택하셨습니다.\\n네트워크 환경을 확인합니다... 🔍\);
  
  const floatingAi = document.getElementById('floatingAi');
  const tooltip = document.getElementById('floatingAiTooltip');
  if (floatingAi && tooltip) {
    floatingAi.classList.add('scanning');
    tooltip.style.display = '';
    tooltip.textContent = '환경 확인 중...';
  }
  
  const screenEl = document.getElementById('screenContent');
  screenEl.innerHTML = \\\
    <div class="screen wifi-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
      <div style="font-size:40px; margin-bottom:20px;">🔄</div>
      <h3>네트워크 환경 점검 중...</h3>
      <p style="color:#666; font-size:14px; text-align:center;">Wi-Fi 및 블루투스 상태를<br>확인하고 있습니다.</p>
    </div>
  \\\;

  setTimeout(() => {
    if (floatingAi) floatingAi.classList.remove('scanning');
    if (tooltip) {
      tooltip.classList.add('expanded');
      tooltip.innerHTML = \\\<strong>⚠️ 블루투스가 꺼져 있어요.</strong><br>스마트폰의 블루투스를 켜주세요.<div style="text-align:right; margin-top:10px;"><button class="tooltip-btn" onclick="handleBleTurnedOn('\')">켰어요</button></div>\\\;
    }
    addAiMessage(\\\⚠️ **블루투스(BLE)가 꺼져 있어요.**\\n스마트폰의 블루투스를 켜주세요.\\\);
    
    screenEl.innerHTML = \\\
      <div class="screen wifi-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
        <div style="font-size:40px; margin-bottom:20px;">⚠️</div>
        <h3>블루투스 꺼짐</h3>
        <p style="color:#666; font-size:14px; text-align:center;">원활한 연결을 위해 블루투스를 켜주세요.</p>
      </div>
    \\\;
  }, 2500);
}

window.handleBleTurnedOn = function(cat) {
  const tooltip = document.getElementById('floatingAiTooltip');
  if (tooltip) {
    tooltip.classList.remove('expanded');
    tooltip.textContent = '확인 완료!';
  }
  
  // 블루투스 확인 완료 후, 사용자가 화면과 상호작용하도록 자판을 내립니다.
  hideKeyboard();
  
  addUserMessage("블루투스를 켰어요.");
  addAiMessage("확인되었습니다!\\n다음으로 제품 연결 방법을 선택해 주세요.");
  
  state.currentStep = 2; // Wi-Fi 및 연결방법 단계
  updateProgress();
  
  const screenEl = document.getElementById('screenContent');
  if (cat === 'tv') {
    screenEl.innerHTML = \\\
      <div class="screen wifi-screen">
        <div class="nav-header">
          <div class="back-btn" onclick="showProductSelect()">←</div>
          <div class="nav-title">연결 방법 선택</div>
        </div>
        <div style="padding:20px;">
          <div style="text-align:center; font-size:40px; margin:20px 0;">📺</div>
          <h3 style="margin-bottom:20px; text-align:center;">TV 연결 방법 선택</h3>
          <button class="primary-btn" style="margin-bottom:12px; background:#fff; color:#111; border:1px solid #ddd;" onclick="showWifiScreen()">TV 화면의 PIN 번호 입력</button>
          <button class="primary-btn" style="background:#fff; color:#111; border:1px solid #ddd;" onclick="showWifiScreen()">동일한 Wi-Fi로 자동 찾기</button>
        </div>
      </div>
    \\\;
  } else {
    screenEl.innerHTML = \\\
      <div class="screen wifi-screen">
        <div class="nav-header">
          <div class="back-btn" onclick="showProductSelect()">←</div>
          <div class="nav-title">연결 방법 선택</div>
        </div>
        <div style="padding:20px;">
          <div style="text-align:center; font-size:40px; margin:20px 0;">📱</div>
          <h3 style="margin-bottom:20px; text-align:center;">가전 연결 방법 선택</h3>
          <button class="primary-btn" style="margin-bottom:12px; background:#fff; color:#111; border:1px solid #ddd;" onclick="showWifiScreen()">제품에 부착된 QR 스캔</button>
          <button class="primary-btn" style="background:#fff; color:#111; border:1px solid #ddd;" onclick="showWifiScreen()">수동으로 제품 찾기</button>
        </div>
      </div>
    \\\;
  }
  updateGuide(2);
};

window.showWifiScreen = function() {
  const p = state.selectedProduct;
  const screenEl = document.getElementById('screenContent');
  screenEl.innerHTML = \\\
    <div class="screen wifi-screen">
      <div class="nav-header">
        <div class="back-btn" onclick="showProductSelect()">←</div>
        <div class="nav-title">Wi-Fi 설정</div>
      </div>
      <div class="wifi-illustration">
        <div class="wifi-anim">\</div>
        <div class="wifi-title">\ 연결</div>
        <div class="wifi-desc">\를 ThinQ 앱에 등록하기 위해<br>Wi-Fi 정보를 입력해 주세요</div>
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
    </div>\\\;
  addAiMessage("연결 방식을 선택하셨군요.\\n이제 제품을 등록할 Wi-Fi 네트워크 정보를 입력해 주세요.");
}

\;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('app_v2.js', code, 'utf8');
