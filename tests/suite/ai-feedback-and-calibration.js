const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/py1'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[]; const txt=async p=>(await p.locator('main').innerText()); let mode='ok'; const seen=[];
async function mock(ctx){ await ctx.route('https://ai.example.test/**', async route=>{ const rq=route.request();
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(rq.method()==='OPTIONS') return route.fulfill({status:204,headers:cors});
  const body=JSON.parse(rq.postData()); seen.push({headers:rq.headers(),body});
  const user=body.messages.find(m=>m.role==='user').content; const ids=[...user.matchAll(/^- ([a-z0-9-]+): /gm)].map(m=>m[1]);
  let content; if(mode==='bad') content='Sure! Here is my review: great work.'; else if(mode==='test') content='{"scores":{"test":4},"strengths":["ok"],"gaps":[],"nextStep":"none"}';
  else content='```json\n'+JSON.stringify({scores:Object.fromEntries(ids.map(i=>[i,2])),strengths:['Names a global entry point'],gaps:['No numbers for <b>RTO</b> testing'],nextStep:'Add a failover test plan.'})+'\n```';
  route.fulfill({status:200,headers:{...cors,'Content-Type':'application/json'},body:JSON.stringify({choices:[{message:{content}}]})}); }); }
(async()=>{
 let ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200}}); await mock(ctx); let p=ctx.pages()[0]||await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(U+'#/settings');await p.waitForTimeout(1300);
 await p.setInputFiles('#fileWorkspace',__dirname+'/v09-ai-fixture.json');await p.waitForTimeout(1200);
 let t=await txt(p); console.log('1 AI card off:',/AI feedback \(optional\)\nOff/.test(t)||/AI feedback \(optional\)[\s\S]{0,20}Off/.test(t));
 for(const r of ['#/lab/lab-01','#/adr/ADR-001','#/interview/story/STAR-001','#/interview/ex/ex-01/cto','#/interview/wb/wb-01','#/interview/q/iq-42']){await p.goto(U+r);await p.waitForTimeout(300);if(await p.locator('.ai-panel').count())console.log('  LEAK panel visible without key',r);}
 console.log('2 no panels without key: checked');
 await p.goto(U+'#/dashboard');await p.waitForTimeout(400); const before=await p.evaluate(()=>document.querySelector('main').innerText.match(/Architecture judgment[\s\S]{0,260}/)?.[0]); console.log('3 judgment before:',before&&before.replace(/\n/g,' | '));
 await p.goto(U+'#/settings');await p.waitForTimeout(500);
 await p.selectOption('#ai-style','openai');await p.fill('#ai-endpoint','http://ai.example.test/x');await p.fill('#ai-model','test-model');await p.fill('#ai-key','sk-test-SECRET-1234');
 await p.click('#p6-ai-form button[type=submit]');await p.waitForTimeout(400);t=await txt(p);console.log('4 http rejected:',/must use https/.test(t));
 await p.fill('#ai-endpoint','https://ai.example.test/v1/chat/completions');await p.fill('#ai-key','sk-test-SECRET-1234');await p.click('#p6-ai-form button[type=submit]');await p.waitForTimeout(600);t=await txt(p);
 console.log('5 saved:',/Saved on this device/.test(t),'| chip:',/Set up on this device/.test(t),'| key placeholder ends:',await p.locator('#ai-key').getAttribute('placeholder'));
 mode='test';await p.click('[data-action="p6-ai-test"]');await p.waitForTimeout(800);t=await txt(p);console.log('6 test:',(t.match(/Connected[^\n]*|Test failed[^\n]*/)||['?'])[0]);
 console.log('   auth header:',seen[seen.length-1].headers['authorization'],'| model:',seen[seen.length-1].body.model);
 mode='ok';
 for(const r of ['#/adr/ADR-001','#/lab/lab-01','#/interview/story/STAR-001','#/interview/ex/ex-01/cto','#/interview/wb/wb-01','#/interview/q/iq-42']){
   await p.goto(U+r);await p.waitForTimeout(400); const n=await p.locator('.ai-panel').count(); if(!n){console.log('7',r,'NO PANEL');continue;}
   await p.locator('.ai-panel [data-action="p6-ask"]').click();await p.waitForTimeout(900);
   const k=await p.locator('.ai-panel .ai-scores').innerText(); console.log('7',r,'|',k.replace(/\n/g,' '),'| dims rows',await p.locator('.ai-dims tbody tr').count(),'| html escaped',(await p.locator('.ai-panel').innerHTML()).includes('&lt;b&gt;RTO'));
 }
 const lastReq=seen[seen.length-1].body.messages; console.log('8 prompt has reference & answer:',/REFERENCE/.test(lastReq[1].content)&&/LEARNER'S ANSWER/.test(lastReq[1].content),'| system JSON shape:',/"nextStep"/.test(lastReq[0].content));
 await p.goto(U+'#/dashboard');await p.waitForTimeout(400); const after=await p.evaluate(()=>document.querySelector('main').innerText.match(/Architecture judgment[\s\S]{0,260}/)?.[0]); console.log('9 judgment after:',after&&after.replace(/\n/g,' | '));
 await p.goto(U+'#/lab/lab-01');await p.waitForTimeout(400);await p.click('.ai-panel [data-action="p6-dispute"]');await p.waitForTimeout(300);t=await p.locator('.ai-panel').innerText();console.log('10 disputed:',/marked this feedback as wrong/.test(t),'|',(await p.locator('.ai-panel .ai-scores').innerText()).replace(/\n/g,' '));
 mode='bad';await p.goto(U+'#/adr/ADR-001');await p.waitForTimeout(300);const beforeAi=(await p.locator('.ai-panel .ai-scores').innerText()).replace(/\n/g,' ');await p.click('.ai-panel [data-action="p6-ask"]');await p.waitForTimeout(800);t=await p.locator('.ai-panel').innerText();
 console.log('11 bad JSON:',(t.match(/The AI response[^\n]*/)||['no error'])[0],'| kept old:',beforeAi===(await p.locator('.ai-panel .ai-scores').innerText()).replace(/\n/g,' '));
 mode='ok'; await ctx.setOffline(true); await p.click('.ai-panel [data-action="p6-ask"]');await p.waitForTimeout(500);t=await p.locator('.ai-panel').innerText();console.log('12 offline:',(t.match(/You are offline[^\n]*/)||['no msg'])[0]); await ctx.setOffline(false);
 // calibration & confidence
 await p.goto(U+'#/study');await p.waitForTimeout(400);await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(400);
 for(let i=0;i<12;i++){await p.keyboard.press('1');await p.waitForTimeout(120);const c=p.locator('[data-action="conf"][data-v="high"]');if(await c.count())await c.first().click();await p.waitForTimeout(100);await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);}
 await p.goto(U+'#/dashboard');await p.waitForTimeout(500);
 await p.goto(U+'#/calibration');await p.waitForTimeout(500);t=await txt(p);
 console.log('13 calibration:',(t.match(/Overconfidence index\n[^\n]*/)||['?'])[0].replace('\n',' | '),'| index value:',await p.locator('.cal-v').innerText());
 console.log('   rows:',(t.match(/Judgment work[^\n]*/)||[''])[0],'||',(t.match(/Questions: your[^\n]*/)||[''])[0],'| reviews rows',await p.locator('#h-air ~ div tbody tr').count(),'| trend cols',await p.locator('.cal-col').count());
 await p.fill('#out-date',new Date().toISOString().slice(0,10));await p.selectOption('#out-exam','SY0-701');await p.check('input[name="out-res"][value="pass"]');await p.fill('#out-score','790');
 await p.click('#p6-out-form button[type=submit]');await p.waitForTimeout(500);t=await txt(p);
 console.log('14 outcome row:',(t.match(/\d{4}-\d\d-\d\d\tSY0-701[^\n]*/)||[(t.match(/SY0-701\t[^\n]*/)||['?'])[0]])[0],'| evidence:',(t.match(/this is an anecdote[^\n]*/)||[''])[0].slice(0,60));
 // export must not contain key
 await p.goto(U+'#/settings');await p.waitForTimeout(600);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('main [data-action="ws-export"]').first().click()]); const f=__dirname+'/v09p6-ws.json'; await dl.saveAs(f); const raw=fs.readFileSync(f,'utf8');
 console.log('15 export has key:',raw.includes('SECRET'),'| has aiFeedback:',Object.keys(JSON.parse(raw).workspace.aiFeedback||{}).length,'| outcomes:',(JSON.parse(raw).workspace.outcomes||[]).length,'| readinessLog:',(JSON.parse(raw).workspace.readinessLog||[]).length);
 const stateHasKey=await p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cloudwalker');r.onsuccess=()=>{const tx=r.result.transaction('kv');const st=tx.objectStore('kv');const g=st.get('state');g.onsuccess=()=>res(JSON.stringify(g.result).includes('SECRET'));};}));
 console.log('16 state record has key:',stateHasKey);
 await ctx.close();
 ctx=await chromium.launchPersistentContext(dir,{viewport:{width:390,height:900}}); await mock(ctx); p=ctx.pages()[0]||await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(U+'#/adr/ADR-001');await p.waitForTimeout(1600);console.log('17 after reload panel:',await p.locator('.ai-panel').count());
 for(const r of ['#/calibration','#/adr/ADR-001','#/settings','#/lab/lab-01']){await p.goto(U+r);await p.waitForTimeout(500);console.log('18 overflow',r,await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));}
 await p.goto(U+'#/calibration');await p.waitForTimeout(400);await p.screenshot({path:__dirname+'/cal390.png',fullPage:true});
 await p.goto(U+'#/settings');await p.waitForTimeout(500);await p.click('[data-action="p6-ai-remove"]');await p.waitForTimeout(500);
 await p.goto(U+'#/adr/ADR-001');await p.waitForTimeout(400);console.log('19 after remove panel:',await p.locator('.ai-panel').count());
 const left=await p.evaluate(()=>new Promise(res=>{const r=indexedDB.open('cloudwalker');r.onsuccess=()=>{const g=r.result.transaction('kv').objectStore('kv').get('ai:config');g.onsuccess=()=>res(g.result===undefined);};}));console.log('   idb config gone:',left);
 await ctx.close(); console.log('errors:',errs.length?errs:'none');
})();
