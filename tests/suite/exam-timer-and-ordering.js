const { chromium } = require('playwright');
const U='__CW_APP__';
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 const b=await chromium.launch();
 // timer warnings with a fake clock
 let c=await b.newContext({viewport:{width:820,height:1100}}); let p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install(); await p.goto(U+'#/exam'); for(let i=0;i<10;i++){await p.clock.runFor(500); await p.waitForTimeout(100);}
 await p.click('[data-action="p4-kind"][data-v="custom"]');await p.clock.runFor(200);
 await p.fill('#x4-count','10');await p.fill('#x4-min','12');
 await p.click('[data-action="p4-start"]');await p.clock.runFor(500);
 await p.clock.runFor(125*1000); let w=await p.locator('#timeWarn').innerText(); console.log('1 after 2m05s warn:',JSON.stringify(w),'timer',await p.locator('#timer').innerText());
 await p.clock.runFor(5*60*1000); w=await p.locator('#timeWarn').innerText(); console.log('  after 7m05s warn:',JSON.stringify(w),'timer',await p.locator('#timer').innerText());
 await p.clock.runFor(5*60*1000); console.log('  after 12m: route',p.url().split('#')[1]);
 await c.close();
 // mini exam with new formats, exam-like: drag on ordering via touch pointer, change multi answer
 c=await b.newContext({viewport:{width:820,height:1100},hasTouch:true}); p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/exam');await p.waitForTimeout(1200);await p.click('[data-action="p4-samples"][data-v="exam"]');await p.waitForTimeout(400);
 for(let i=0;i<10;i++){ let t=await txt(p);
   if(/Put in order/.test(t)){ const before=await p.locator('.ord-t').allInnerTexts(); const h0=await p.locator('.ord-handle').nth(0).boundingBox(); const h2=await p.locator('.ord-item').nth(2).boundingBox();
     await p.mouse.move(h0.x+5,h0.y+5); await p.mouse.down(); await p.mouse.move(h2.x+40,h2.y+h2.height/2,{steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
     const after=await p.locator('.ord-t').allInnerTexts(); console.log('2 drag moved first item to:',after.indexOf(before[0])+1,'| still editable:',await p.locator('[data-action="p4-ord"]').count()>0);}
   else if(/Choose 2/.test(t)){await p.keyboard.press('1');await p.keyboard.press('2');await p.keyboard.press('2');await p.keyboard.press('3');}
   else if(/Simulation/.test(t)){for(const s of await p.locator('[data-x4pbq]').all()) await s.selectOption({index:1});}
   else await p.keyboard.press('1');
   await p.waitForTimeout(150); if(i<9) {await p.keyboard.press('ArrowRight');await p.waitForTimeout(150);} }
 t=await txt(p); console.log('3 explanations hidden during exam:',!(await p.locator('.explain').count()));
 await p.locator('.run-head [data-action="end-run"]').click();await p.waitForTimeout(300);
 console.log('4 review:',((await txt(p)).match(/\d+ of \d+ answered[^.]*/)||[''])[0]);
 await p.click('[data-action="p4-submit"]');await p.waitForTimeout(500);t=await txt(p);
 console.log('5 results title:',(t.match(/Mini exam: new formats/)||[''])[0],'| score line:',(t.match(/\d+% *\n*Score/)||t.match(/\d+ of 10 correct/)||[''])[0]);
 // phone widths across runner types
 for(const wd of [390,375]){await p.setViewportSize({width:wd,height:900}); await p.goto(U+'#/exam');await p.waitForTimeout(300);let sw=await p.evaluate(()=>document.documentElement.scrollWidth);if(sw>wd)console.log('OVERFLOW exam',wd,sw);
  await p.click('[data-action="p4-samples"][data-v="practice"]');await p.waitForTimeout(300);
  for(let i=0;i<10;i++){sw=await p.evaluate(()=>document.documentElement.scrollWidth);if(sw>wd)console.log('OVERFLOW q',i+1,wd,sw); await p.keyboard.press('ArrowRight');await p.waitForTimeout(120);} 
  await p.locator('[data-action="end-run"]').first().click(); await p.waitForTimeout(200);}
 await p.setViewportSize({width:390,height:900}); await p.goto(U+'#/exam');await p.waitForTimeout(300);await p.click('[data-action="p4-samples"][data-v="practice"]');await p.waitForTimeout(300);
 for(let i=0;i<3;i++){await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);} await p.screenshot({path:'case390.png'});
 console.log('errors',errs); await b.close();
})();
