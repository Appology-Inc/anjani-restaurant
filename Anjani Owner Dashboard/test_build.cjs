const puppeteer = require('puppeteer');
const http = require('http');
const handler = require('serve-handler');

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: 'dist'
  });
});

server.listen(3000, async () => {
  console.log('Running at http://localhost:3000');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('response', response => {
    if (!response.ok()) console.log('NETWORK ERROR:', response.url(), response.status());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await browser.close();
  server.close();
});
