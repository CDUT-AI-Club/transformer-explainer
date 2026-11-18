import { launchBrowser } from './browser.mjs';
const b = await launchBrowser();
async function run(base, out){
  const page = await b.newPage({viewport:{width:1700,height:1000}});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-click="generate-btn"]',{timeout:120000});
  const waitIdle=()=>page.waitForFunction(()=>{const x=document.querySelector('[data-click="generate-btn"]');return x&&!x.disabled;},{timeout:300000});
  const box=page.locator('[data-click="text-input"] .text-box');
  const setPrompt=async t=>{await box.click();await page.keyboard.press('Control+A');await page.keyboard.press('Delete');await box.evaluate((el,x)=>{el.innerText=x;el.dispatchEvent(new InputEvent('input',{bubbles:true}));},t);};
  await waitIdle(); await setPrompt('我爱你中'); await waitIdle();
  await page.locator('[data-click="generate-btn"]').click(); await page.waitForTimeout(15000); await waitIdle();
  await setPrompt('高等数');
  await page.locator('[data-click="generate-btn"]').click(); await page.waitForTimeout(20000); await waitIdle();
  await page.screenshot({path:out, clip:{x:0,y:80,width:1700,height:420}});
  const tok = await page.evaluate(()=>Array.from(document.querySelectorAll('.embedding .token-string .label')).map(e=>e.textContent.trim()).join(''));
  const pred = await page.evaluate(()=>{const p=document.querySelector('.editable .predicted');return p?p.innerText.trim():''});
  console.log(base, '-> tokens:', tok, '| chip:', pred);
  await page.close();
}
// Usage: node tests/shot_compare.mjs <oldUrl> <newUrl>
// Serve the pre-fix build and the current build on two ports first.
const OLD = process.argv[2] ?? 'http://127.0.0.1:4174/';
const NEW = process.argv[3] ?? 'http://127.0.0.1:4173/';
await run(OLD, 'docs/bug-before.png');
await run(NEW, 'docs/bug-after.png');
await b.close();
