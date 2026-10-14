const { chromium } = require('playwright');
const U='__CW_APP__';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:820,height:1180}});p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto(U+'#/exam');await p.waitForTimeout(1200);await p.click('[data-action="p4-samples"][data-v="practice"]');await p.waitForTimeout(300);
 for(let i=0;i<3;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);}
 console.log('panel visible at 820:',await p.locator('.case-panel').isVisible(), 'sw', await p.evaluate(()=>document.documentElement.scrollWidth));
 await p.screenshot({path:'case820.png'}); await b.close();})();
