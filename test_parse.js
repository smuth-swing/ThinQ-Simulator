const fs = require('fs');
const str = `{
"extracted_info": {
"product": null,
"wifi_ssid": null,
"wifi_password": null,
"ble_on": false,
"connection_method": null
},
"ai_message": "처음이시군요! 환영합니다 🎉 \\n\\n먼저 어떤 제품(예: 세탁기, 에어컨 등)을 연결하실 건가요?"
}`;
try { 
  JSON.parse(str); 
  console.log('parsed!'); 
} catch(e) { 
  console.log(e); 
}
