import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generatePDFs() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });

  // Full Guide (4 pages)
  console.log('Generating Full Guide...');
  const guidePage = await browser.newPage();
  await guidePage.goto(`file://${join(__dirname, 'beta-v2-guide.html')}`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 3000)); // Wait for fonts
  await guidePage.pdf({
    path: join(__dirname, 'SourceKit_Beta_v2_1_Guide.pdf'),
    format: 'letter',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log('  -> SourceKit_Beta_v2_1_Guide.pdf');

  // TL;DR (1 page)
  console.log('Generating TL;DR...');
  const tldrPage = await browser.newPage();
  await tldrPage.goto(`file://${join(__dirname, 'beta-v2-tldr.html')}`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
  await new Promise(r => setTimeout(r, 3000));
  await tldrPage.pdf({
    path: join(__dirname, 'SourceKit_Beta_v2_1___TL_DR.pdf'),
    format: 'letter',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log('  -> SourceKit_Beta_v2_1___TL_DR.pdf');

  await browser.close();
  console.log('Done! PDFs generated in docs/');
}

generatePDFs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
