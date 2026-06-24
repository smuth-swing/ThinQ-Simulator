const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('index_v3.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously' });
dom.window.localStorage = { getItem:()=>null, setItem:()=>{} };
try {
  dom.window.eval(fs.readFileSync('agent_knowledge.js', 'utf8'));
  dom.window.eval(fs.readFileSync('app_v3.js', 'utf8'));
  console.log('OK');
} catch (e) {
  console.error('ERROR:', e);
}
process.exit(0);
