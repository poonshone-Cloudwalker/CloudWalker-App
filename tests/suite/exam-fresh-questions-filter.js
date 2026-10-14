const { chromium } = require('playwright');
const U='__CW_APP__';
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1024,height:1100}});p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto(U+'#/settings');await p.waitForTimeout(1200);await p.setInputFiles('#fileProgress',__dirname+'/prog20.json');await p.waitForTimeout(500);
 await p.goto(U+'#/exam');await p.waitForTimeout(400);await p.selectOption('#x4-exam','SY0-701');await p.waitForTimeout(300);
 const line=async()=>((await p.locator('main').innerText()).match(/\d+ questions eligible\.[^\n]*/)||[''])[0];
 console.log('any:',await line());
 await p.selectOption('#x4-fresh','3650');await p.waitForTimeout(300);console.log('never seen:',await line());
 await b.close();})();
