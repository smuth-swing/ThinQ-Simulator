const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Convert absolute GitHub Pages URLs back to local relative paths for local testing
    // By intercepting requests
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('https://smuth-swing.github.io/ThinQ-Simulator/')) {
        const localPath = 'file:///' + __dirname.replace(/\\/g, '/') + '/' + url.split('/').pop().split('?')[0];
        request.continue({ url: localPath });
      } else {
        request.continue();
      }
    });

    await page.goto(`file:///${__dirname.replace(/\\/g, '/')}/index_v3.html`, { waitUntil: 'networkidle0' });
    
    // Take a screenshot
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot taken: screenshot.png');
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err);
  }
})();
