const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const options = {
  runScripts: "dangerously",
  resources: "usable"
};

JSDOM.fromFile("index_v3.html", options).then(dom => {
  dom.window.document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired.");
    setTimeout(() => {
      console.log("screenContent innerHTML length:", dom.window.document.getElementById('screenContent').innerHTML.length);
      console.log("currentStep:", dom.window.state ? dom.window.state.currentStep : 'undefined state');
      console.log("Errors:", dom.window.__errors || "None");
      process.exit(0);
    }, 2000);
  });
  
  // Catch unhandled errors in JSDOM
  dom.window.addEventListener("error", event => {
    console.error("JSDOM Error Name:", event.error.name);
    console.error("JSDOM Error Message:", event.error.message);
    console.error("JSDOM Error Stack:", event.error.stack);
    dom.window.__errors = event.error;
  });
}).catch(err => {
  console.error("Setup Error:", err);
});
