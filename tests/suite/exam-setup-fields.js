const { chromium } = require('playwright');
const U='__CW_APP__';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:820,height:1100}});p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto(U+'#/exam'); await p.waitForTimeout(1200);
 await p.click('[data-action="p4-kind"][data-v="custom"]'); await p.waitForTimeout(300);
 console.log(await p.evaluate(()=>[...document.querySelectorAll('main input')].map(i=>i.id+'='+i.value).join(' ')));
 await p.fill('#x4-count','10'); await p.waitForTimeout(200); await p.fill('#x4-min','12'); await p.waitForTimeout(200);
 console.log(await p.evaluate(()=>[...document.querySelectorAll('main input')].map(i=>i.id+'='+i.value).join(' ')));
 await b.close();})();
