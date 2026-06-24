const fs = require('fs');
const str = "{\n\"a\": \"line1\nline2\"\n}";
try {
  JSON.parse(str);
  console.log('SUCCESS');
} catch(e) {
  console.log('ERROR: ' + e.message);
}
