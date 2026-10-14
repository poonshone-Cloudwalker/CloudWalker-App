const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1180,height:1300}}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/content');await p.waitForTimeout(1300);let t=await txt(p);
 console.log('1 drafts:',(t.match(/Draft · \d+/)||[''])[0]);
 await p.goto(U+'#/exam');await p.waitForTimeout(600);
 for(const code of ['SAA-C03','CDL','AZ-305','SY0-701','AIB-C01']){await p.selectOption('#x4-exam',code);await p.waitForTimeout(300);t=await txt(p);
   const dl=await p.locator('main dl.dstat').innerText(); console.log('2',code,'|',dl.replace(/\n+/g,' ').replace(/Practice setting, not official/g,'[practice]'));}
 // learn mode shuffle consistency
 await p.goto(U+'#/study');await p.waitForTimeout(400);await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(400);
 let consistent=0,shuf=0;
 for(let i=0;i<8;i++){ await p.keyboard.press('2');await p.waitForTimeout(150);
   const line=await p.locator('.explain .result-line').innerText(); const L=(line.match(/answer is ([A-F])/)||line.match(/Correct/)||[])[1];
   const corrKey=await p.locator('.opt.correct .key').innerText(); if(!L || L===corrKey) consistent++; 
   await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);}
 console.log('3 letter consistency', consistent,'/ 8');
 // full simulation SAA
 await p.goto(U+'#/exam');await p.waitForTimeout(300);await p.selectOption('#x4-exam','SAA-C03');await p.waitForTimeout(300);
 await p.click('[data-action="p4-start"]');await p.waitForTimeout(500);t=await txt(p);
 console.log('4 sim header:',(t.match(/Question 1 of \d+/)||[''])[0],'| timer:',await p.locator('#timer').innerText());
 await p.keyboard.press('1');await p.waitForTimeout(150);await p.keyboard.press('2');await p.waitForTimeout(150);
 t=await txt(p);console.log('  changeable:',/You can change it until you submit/.test(t),'| no explanation:',!(await p.locator('.explain').count()));
 await p.keyboard.press('f');await p.waitForTimeout(150);
 for(let i=0;i<4;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);await p.keyboard.press('3');await p.waitForTimeout(100);}
 await p.locator('.run-head [data-action="end-run"]').click();await p.waitForTimeout(300);t=await txt(p);
 console.log('5 review screen:',(t.match(/\d+ of \d+ answered · \d+ unanswered[^.]*· \d+ flagged/)||['none'])[0]);
 await p.click('[data-action="p4-rvf"][data-v="flagged"]');await p.waitForTimeout(200);console.log('  flagged cells:',await p.locator('.rv-cell').count());
 await p.click('[data-action="p4-submit"]');await p.waitForTimeout(600);t=await txt(p);
 console.log('6 report:',(t.match(/Raw score[^\n]*\n?[^\n]*/)||[''])[0].replace(/\n/g,' '),'|',(t.match(/Recommendation: [^\n]*/)||['no rec'])[0]);
 console.log('  scaled:',(await p.locator('.report .kpi').nth(1).innerText()).replace(/\n/g,' ').slice(0,120));
 console.log('  domain rows:',await p.locator('.report tbody tr').count(),'| rule shown:',/Rule: Go = your last 2 full simulations/.test(t));
 // review answers consistency
 await p.click('[data-action="review-last"]');await p.waitForTimeout(400);const line=await p.locator('.explain .result-line').innerText(); const ck=await p.locator('.opt.correct .key').innerText(); console.log('7 review letter ok:',line.includes(ck),line.slice(0,40));
 await p.locator('[data-action="end-run"]').first().click();await p.waitForTimeout(300);
 // new formats practice
 await p.goto(U+'#/exam');await p.waitForTimeout(300);await p.click('[data-action="p4-samples"][data-v="practice"]');await p.waitForTimeout(400);
 for(let i=0;i<10;i++){ t=await txt(p); const type=/Choose 2/.test(t)?'multi':/Put in order/.test(t)?'order':/Simulation: set every field/.test(t)?'pbq':'single';
   if(type==='multi'){await p.keyboard.press('1');await p.keyboard.press('2');await p.click('[data-action="p4-check"]');}
   else if(type==='order'){await p.locator('[data-action="p4-ord"][data-d="1"]').first().click();await p.waitForTimeout(100);await p.click('[data-action="p4-check"]');}
   else if(type==='pbq'){for(const s of await p.locator('[data-x4pbq]').all()){await s.selectOption({index:1});} await p.waitForTimeout(100); await p.click('[data-action="p4-check"]');}
   else {await p.keyboard.press('1');}
   await p.waitForTimeout(250); t=await txt(p);
   const casePanel=await p.locator('.case-panel').isVisible().catch(()=>false);
   console.log('8',i+1,type,'| result:',(t.match(/(Correct\.|Not quite\.)[^\n]{0,70}/)||['?'])[0], casePanel?'| case panel visible':'');
   if(i<9){await p.keyboard.press('ArrowRight');await p.waitForTimeout(200);} }
 await p.screenshot({path:'fmt_last.png'});
 console.log('errors',errs); await b.close();
})();
