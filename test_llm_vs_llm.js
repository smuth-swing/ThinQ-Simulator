const fs = require('fs');

// 1. 사용할 Gemini API 키 (방금 테스트하신 키 적용)
const API_KEY = "REMOVED_KEY";
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// 2. agent_knowledge.js에서 ThinQ AI 매니저 시스템 프롬프트 읽어오기
let thinqSystemPrompt = "";
try {
  const content = fs.readFileSync('agent_knowledge.js', 'utf8');
  // 'const SYSTEM_PROMPT = `...`;' 부분 추출
  const match = content.match(/const\s+THINQ_AGENT_KNOWLEDGE\s*=\s*`([\s\S]*?)`;/);
  if (match) thinqSystemPrompt = match[1];
  else throw new Error("THINQ_AGENT_KNOWLEDGE 못 찾음");
} catch(e) {
  console.error("agent_knowledge.js 읽기 실패:", e);
  process.exit(1);
}

// 3. 페르소나(고객) 프롬프트 설정
const customerSystemPrompt = `
당신은 새로운 가전제품(세탁기)을 LG ThinQ 앱에 연결하고 싶은 60대 사용자 '영두' 입니다.
기계나 스마트폰 조작에 서툴지만, 안내원이 시키는 대로 열심히 따라하려고 노력합니다.
안내원(ThinQ AI 매니저)이 질문하거나 안내하면, 그에 맞게 한국어로 짧고 자연스럽게 대답하세요.
한 번에 1~2문장으로만 대답하세요. JSON 형식이나 마크다운 없이 순수 텍스트로만 대답하세요.

처음 시작할 때: "처음 왔어. 제품 연결할래." 와 같이 말하세요.
`;

// 4. API 호출 유틸리티 함수
async function callGemini(systemInstruction, chatHistory, isJson = false) {
  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: chatHistory,
    generationConfig: {
      temperature: 0.7
    }
  };

  if (isJson) {
    body.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// 5. JSON 파싱 유틸리티 (app_v2.js의 로직과 동일)
function parseAiResponse(rawResponse) {
  let responseText = rawResponse;
  let parsedJson = null;

  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let cleanJsonStr = jsonMatch[0];
    let inString = false;
    let sanitizedStr = '';
    for (let i = 0; i < cleanJsonStr.length; i++) {
      let char = cleanJsonStr[i];
      if (char === '"' && (i === 0 || cleanJsonStr[i-1] !== '\\')) inString = !inString;
      if (inString && char === '\n') sanitizedStr += '\\n';
      else if (inString && char === '\r') sanitizedStr += '\\r';
      else if (inString && char === '\t') sanitizedStr += '\\t';
      else sanitizedStr += char;
    }

    try { parsedJson = JSON.parse(sanitizedStr); } 
    catch(e) { }
  }

  if (parsedJson && parsedJson.ai_message) {
    responseText = parsedJson.ai_message;
  } else {
    const msgRegex = /"ai_message"\s*:\s*"([\s\S]*?)"(?:\s*\}|\s*,|\s*$)/;
    const msgMatch = rawResponse.match(msgRegex);
    if (msgMatch && msgMatch[1]) responseText = msgMatch[1];
  }

  if (responseText) responseText = responseText.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  if (responseText.includes('"extracted_info"') || responseText.includes('"ai_message"')) {
    responseText = "앗, 메시지를 처리하는 중에 오류가 발생했습니다.";
  }

  return { text: responseText, json: parsedJson };
}

// 6. 메인 시뮬레이션 루프
async function runSimulation() {
  console.log("==================================================");
  console.log("🤖 LLM vs LLM 연결 시뮬레이터 시작 (ThinQ AI vs 60대 고객)");
  console.log("==================================================\n");

  let customerHistory = []; // 고객 LLM의 대화 컨텍스트
  let aiHistory = [];       // ThinQ AI 매니저의 대화 컨텍스트

  // 고객이 먼저 말을 건넴
  const initialUserMessage = "어이쿠, 나 처음 왔어. 세탁기 좀 폰에 연결해볼래.";
  console.log(`👤 [고객(60대)]: ${initialUserMessage}`);
  
  customerHistory.push({ role: "user", parts: [{ text: "너는 이제 ThinQ AI 매니저와 대화할 거야. 먼저 말을 걸었어." }] });
  customerHistory.push({ role: "model", parts: [{ text: initialUserMessage }] });
  
  aiHistory.push({ role: "user", parts: [{ text: initialUserMessage }] });

  let turn = 1;
  const MAX_TURNS = 6;

  while (turn <= MAX_TURNS) {
    console.log(`\n--- Turn ${turn} ---`);
    console.log("⏳ [ThinQ AI] 응답 생성 중...");
    
    // 1. ThinQ AI 응답 생성
    const fullSystemInstruction = `너는 LG ThinQ 앱 제품 연결을 돕는 친절하고 전문적인 AI 매니저야.
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
    "is_experienced": "사용자가 연결 경험이 있다고 파악되면 true, 처음이거나 모르면 false, 아직 알 수 없으면 null"
  },
  "ai_message": "사용자에게 실제로 보여질 대화 메시지 (줄바꿈이 필요하면 실제 엔터가 아닌 반드시 '\\n' 이스케이프 문자로 출력할 것)"
}

[지식 베이스 가이드]
${thinqSystemPrompt}

[제품 연결 프로세스 및 시나리오 가이드]
- 인사 및 제품 파악: 사용자가 인사를 하거나 연결을 요청할 때, **문장 안에 이미 기기 이름(세탁기, 에어컨 등)이 있다면 절대 어떤 제품인지 다시 묻지 마!** 만약 기기 이름이 없다면 그때만 "어떤 가전제품을 연결하실 건가요?"라고 물어봐.
- 기기 확인 완료: 고객이 기기명이 언급됐다면 "[기기명] 연결을 도와드릴게요. 먼저 스마트폰의 블루투스가 켜져 있는지 확인해주세요." 라고 안내해.
- 추천 요청: 사용자가 "추천" 방식을 물어보면, "블루투스가 켜져 있고 조명이 밝은 환경이므로 [QR 스캔 방식]을 추천합니다. 이 방식으로 진행할까요?" 라고 대답해.
- 방식 확인: 사용자가 "네", "진행", "QR", "수동" 등을 입력하면 "선택하신 방식으로 설정을 준비합니다." 라고 대답해.

[사용자의 현재 상태]
현재 상태: 제품 미선택, 연결 전
`;

    const rawAiResponse = await callGemini(fullSystemInstruction, aiHistory, true);
    const parsedData = parseAiResponse(rawAiResponse);
    
    console.log(`🤖 [ThinQ AI]:\n${parsedData.text}`);
    if (parsedData.json && parsedData.json.extracted_info) {
      console.log(`🔥 [내부 JSON State 추출 결과]:`, parsedData.json.extracted_info);
      
      // 연결 방식이 결정되면 시뮬레이션 성공 종료
      if (parsedData.json.extracted_info.connection_method && parsedData.json.extracted_info.connection_method !== "null") {
        console.log("\n✅ [테스트 성공] AI가 성공적으로 연결 방식(QR 또는 자동)을 추출했습니다!");
        break;
      }
    }

    aiHistory.push({ role: "model", parts: [{ text: rawAiResponse }] });
    customerHistory.push({ role: "user", parts: [{ text: parsedData.text }] });

    console.log("\n⏳ [고객(60대)] 응답 생각 중...");
    await new Promise(r => setTimeout(r, 6000)); // 6초 대기하여 Rate Limit 회피
    
    // 2. 고객(할아버지) 응답 생성
    const customerResponse = await callGemini(customerSystemPrompt, customerHistory);
    console.log(`👤 [고객(60대)]: ${customerResponse}`);
    
    customerHistory.push({ role: "model", parts: [{ text: customerResponse }] });
    aiHistory.push({ role: "user", parts: [{ text: customerResponse }] });
    
    turn++;
    await new Promise(r => setTimeout(r, 6000)); // 다음 턴 전 6초 대기
  }
  
  if (turn > MAX_TURNS) {
    console.log("\n⚠️ [테스트 종료] 최대 턴 수에 도달했습니다. 연결 방식 도출에 실패했거나 대화가 길어졌습니다.");
  }
}

runSimulation();
