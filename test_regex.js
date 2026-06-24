const fs = require('fs');
const str = `{
"extracted_info": {
"product": null,
"wifi_ssid": null,
"wifi_password": null,
"ble_on": false,
"connection_method": null,
"is_experienced": false
},
"ai_message": "처음이시군요! 환영합니다 🎉\n어떤 제품(예: 세탁기, 에어컨 등)을 연결하실 건가요?"
}`;
const msgMatch = str.match(/"ai_message"\s*:\s*"([\s\S]*?)"(?:\s*\}|\s*$)/);
if (msgMatch && msgMatch[1]) {
  console.log('MATCHED: ' + msgMatch[1]);
} else {
  console.log('REGEX FAILED');
}
