const API_KEY = "REMOVED_KEY";
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function verifyGemini() {
  const systemInstruction = `너는 LG ThinQ 앱 제품 연결을 돕는 친절하고 전문적인 AI 매니저야.
[상태 추출 및 응답 형식 (매우 중요)]
너는 사용자의 문장을 분석하여 반드시 아래와 같은 JSON 형식으로만 응답해야 해. 다른 텍스트는 절대 출력하지 마.
{
  "extracted_info": {
    "is_experienced": "사용자가 이전에 연결해 본 적이 있거나 처음이 아니라고 대답하면 true, 처음이라고 하거나 모르면 false, 아직 알 수 없으면 null"
  },
  "ai_message": "답변"
}`;

  const chatHistory = [
    { role: "model", parts: [{ text: "처음 제품 연결을 하시는 거 같은데 맞나요?" }] },
    { role: "user", parts: [{ text: "QR 스캔 해줘" }] }
  ];

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: chatHistory,
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

verifyGemini();
