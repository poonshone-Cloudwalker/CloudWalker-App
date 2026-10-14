const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/px1'; fs.rmSync(dir,{recursive:true,force:true}); const dir2=__dirname+'/px2'; fs.rmSync(dir2,{recursive:true,force:true});
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
const iso=d=>{const x=new Date(Date.now()+d*864e5);return x.toISOString().slice(0,10)};
async function answerAll(p,n){ for(let i=0;i<n;i++){ await p.keyboard.press(String(1+(i%2)));await p.waitForTimeout(150); if(i<n-1){await p.keyboard.press('ArrowRight');await p.waitForTimeout(120);} } }
async function finish(p){ await p.locator('.run-head [data-action="end-run"]').first().click(); await p.waitForTimeout(600); }
(async()=>{
 let ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100}});let p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(U);await p.waitForTimeout(1300);
 await p.locator('input[name="background"][value="pm"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[name="years"][value="10+"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[name="targetRole"][value="architect"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[data-ob="clouds"][value="aws"]').check();await p.click('[data-action="ob-next"]');
 await p.fill('#ob-hours','8');await p.selectOption('#ob-exam','SAA-C03');await p.fill('#ob-date',iso(60));await p.click('[data-action="ob-finish"]');await p.waitForTimeout(800);
 let t=await txt(p); console.log('1 path step0:',/Step 0: Cloud foundations/.test(t));
 await p.goto(U+'#/dashboard');await p.waitForTimeout(500);t=await txt(p);console.log('2 dash foundations card:',/Start with Cloud foundations/.test(t));
 console.log('   nav has Lessons:',await p.locator('#nav a[href="#/lessons"]').count());
 await p.goto(U+'#/lessons');await p.waitForTimeout(500);t=await txt(p);
 console.log('3 lessons index: recommended',/Recommended for you/.test(t),'| default exam',await p.locator('#les-exam').inputValue(),'| rows',await p.locator('.les-row').count(),'| notice',/not exam content/.test(t));
 await p.goto(U+'#/lessons/fnd-2');await p.waitForTimeout(500);t=await txt(p);
 console.log('4 fnd-2: draft',/Draft · generated practice/.test(t),'| decisions rows',await p.locator('.les-dec tbody tr').count(),'| no-link note',/No documentation link has been checked/.test(t),'| terms',await p.locator('.les-article a.chip').count());
 await p.click('[data-action="l5-check"]');await p.waitForTimeout(500);t=await txt(p);
 console.log('5 check:',(t.match(/Question 1 of \d+/)||['?'])[0],'| draft chip',/Draft practice item/.test(t));
 await answerAll(p,5); await finish(p); t=await txt(p);
 console.log('6 result card:',(t.match(/Lesson check: [^\n]*/)||['none'])[0],'|',(t.match(/\d+ of \d+ correct[^\n]*/)||[''])[0],'|',(t.match(/(\d+ missed question[^\n]*|Nothing missed[^\n]*)/)||[''])[0]);
 const missedFnd=(t.match(/(\d+) missed question/)||[0,0])[1];
 await p.goto(U+'#/retention');await p.waitForTimeout(500);t=await txt(p);console.log('7 retention mentions missed:',(t.match(/\d+ (missed|incorrect)[^\n]*/i)||[t.slice(0,120).replace(/\n/g,' ')])[0], '| chrome queue:',await p.locator('.today-chip.hot .tv').first().innerText().catch(()=>'all clear'));
 await p.goto(U+'#/lessons/les-saa-1');await p.waitForTimeout(500);t=await txt(p);
 console.log('8 saa-1: subs',await p.locator('.les-subs li').count(),'| doc links',await p.locator('.les-article a[target=_blank]').count(),'| key terms',await p.locator('.les-article a.chip').count());
 await p.click('[data-action="l5-check"]');await p.waitForTimeout(500);t=await txt(p);console.log('9 check len:',(t.match(/Question 1 of \d+/)||['?'])[0]);
 await answerAll(p,5); await finish(p); t=await txt(p);console.log('10 result:',(t.match(/\d+ of \d+ correct[^\n]*/)||[''])[0],'|',(t.match(/(\d+ missed question[^\n]*|Nothing missed[^\n]*)/)||[''])[0]);
 await p.goto(U+'#/lessons/les-saa-1');await p.waitForTimeout(400);t=await txt(p);console.log('11 your checks:',(t.match(/Your checks\n[^\n]*/)||['none'])[0].replace('\n',' '),'| status chip',(t.match(/Check passed|Check taken · review and retry/)||['?'])[0]);
 // glossary term → lessons
 const href=await p.locator('.les-article a.chip').first().getAttribute('href'); await p.goto(U+href);await p.waitForTimeout(500);t=await txt(p);
 console.log('12 term',href,': lessons card',/Lessons that use this term/.test(t),'| links to saa-1',await p.locator('.les-links a[href="#/lessons/les-saa-1"]').count(),'| equivalents section',/Equivalents on other clouds/.test(t));
 await p.goto(U+'#/content');await p.waitForTimeout(800);t=await txt(p);console.log('13 content lessons:',(t.match(/Lessons \(\d+\)[^\n]*\n?[^\n]*/)||['none'])[0].replace(/\n/g,' '));
 // export, then import into a clean profile
 await p.goto(U+'#/settings');await p.waitForTimeout(800);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('main [data-action="ws-export"]').first().click()]); const f=__dirname+'/v09p5-ws.json'; await dl.saveAs(f);
 const j=JSON.parse(fs.readFileSync(f,'utf8')); console.log('14 export lessons keys:',Object.keys(j.workspace.lessons||{}).join(','),'| version',j.version);
 await ctx.close();
 // reload persistence
 ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100}});p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/lessons/les-saa-1');await p.waitForTimeout(1500);t=await txt(p);console.log('15 after reload checks kept:',/Your checks/.test(t));await ctx.close();
 ctx=await chromium.launchPersistentContext(dir2,{viewport:{width:1180,height:1100}});p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(U+'#/settings');await p.waitForTimeout(1300);await p.setInputFiles('#fileWorkspace',f);await p.waitForTimeout(1200);
 await p.goto(U+'#/lessons/les-saa-1');await p.waitForTimeout(500);t=await txt(p);console.log('16 imported checks:',/Your checks/.test(t));
 await p.goto(U+'#/lessons');await p.waitForTimeout(500);t=await txt(p);console.log('17 technical? recommended shown:',/Recommended for you/.test(t));
 // wide layout overflow and v08 import
 await p.setInputFiles('#fileWorkspace',__dirname+'/v08-workspace.json').catch(()=>{});
 await p.setViewportSize({width:390,height:900});for(const r of ['#/lessons','#/lessons/les-pca-1','#/lessons/fnd-2']){await p.goto(U+r);await p.waitForTimeout(400);const o=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);console.log('18 overflow',r,o);}
 await p.screenshot({path:__dirname+'/les390.png'});
 await p.setViewportSize({width:1180,height:1300});await p.goto(U+'#/lessons/les-az305-2');await p.waitForTimeout(400);await p.screenshot({path:__dirname+'/les1180.png',fullPage:false});
 await ctx.close();
 console.log('errors:',errs.length?errs:'none'); console.log('missedFnd',missedFnd);
})();
