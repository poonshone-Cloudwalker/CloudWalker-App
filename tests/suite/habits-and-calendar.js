const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/pz1'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 const ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200},acceptDownloads:true}); const p=ctx.pages()[0]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto(U);await p.waitForTimeout(1200);await p.click('[data-action="ob-skip"]');await p.waitForTimeout(400);
 await p.goto(U+'#/settings');await p.waitForTimeout(500);await p.setInputFiles('#fileWorkspace',__dirname+'/habit-fixture.json');await p.waitForTimeout(1000);
 await p.goto(U+'#/dashboard');await p.waitForTimeout(500);let t=await txt(p);
 console.log('1 dash Today card:',/Today\n/.test(t),'|',(t.match(/Streak: [^\n]*/)||['?'])[0],'|',(t.match(/\d+ cards to go[^\n]*|Goal met today[^\n]*/)||['?'])[0]);
 console.log('   tiles:',(await p.locator('.td-tile').allInnerTexts()).map(x=>x.replace(/\n/g,' / ')).join(' || '));
 console.log('   nav:',(await p.locator('#nav a').evaluateAll(as=>as.map(a=>a.getAttribute('href')))).filter(h=>/today|weekly|install|calibration|lessons/.test(h)).join(','));
 await p.goto(U+'#/today');await p.waitForTimeout(400);t=await txt(p);
 console.log('2 calendar cells:',await p.locator('.cal-d').count(),'| met',await p.locator('.cal-d.met').count(),'| frozen',await p.locator('.cal-d.frz').count(),'| missed',await p.locator('.cal-d.miss').count());
 // answer one to meet goal
 await p.goto(U+'#/study');await p.waitForTimeout(400);await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(400);await p.keyboard.press('1');await p.waitForTimeout(300);
 await p.goto(U+'#/today');await p.waitForTimeout(400);t=await txt(p);console.log('3 after answering:',(t.match(/Goal met today[^\n]*/)||['not met'])[0],'|',(t.match(/Streak: [^\n]*/)||['?'])[0]);
 // goal type minutes + validation
 await p.click('[data-action="p7-goal-type"][data-v="minutes"]');await p.waitForTimeout(300);await p.fill('#p7-goal','999');await p.press('#p7-goal','Tab');await p.waitForTimeout(300);
 console.log('4 minutes goal value kept:',await p.inputValue('#p7-goal'),'|',(await txt(p)).match(/\d+ minutes to go[^\n]*/)?.[0]);
 await p.fill('#p7-goal','15');await p.press('#p7-goal','Tab');await p.waitForTimeout(300);console.log('   set 15:',(await txt(p)).match(/\d+ minutes to go[^\n]*/)?.[0]);
 // ics
 await p.fill('#p7-time','07:30');await p.press('#p7-time','Tab');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p7-ics"]')]);const f=__dirname+'/plan.ics';await dl.saveAs(f);const ics=fs.readFileSync(f,'utf8');
 const lines=ics.split('\r\n');console.log('5 ics:',dl.suggestedFilename(),'| CRLF only:',!/[^\r]\n/.test(ics),'| max octets',Math.max(...lines.map(l=>Buffer.byteLength(l))),'| events',(ics.match(/BEGIN:VEVENT/g)||[]).length,'|',lines.find(l=>l.startsWith('DTSTART:')),'|',lines.find(l=>l.startsWith('RRULE')),'| alarm',/BEGIN:VALARM/.test(ics));
 // weekly review
 await p.goto(U+'#/weekly');await p.waitForTimeout(400);t=await txt(p);console.log('6 weekly:',(t.match(/Weekly review\n[^\n]*/)||['?'])[0].replace('\n',' | '),'| trend cols',await p.locator('.wk-col').count(),'| suggestion:',(t.match(/One thing to change next week\n[^\n]*/)||['?'])[0].split('\n')[1]);
 await p.click('[data-action="p7-wk"][data-v="1"]');await p.waitForTimeout(300);t=await txt(p);console.log('   last week:',(t.match(/Weekly review\n[^\n]*/)||['?'])[0].split('\n')[1],'| weakest:',(t.match(/Weakest domain\n[^\n]*/)||['?'])[0].split('\n')[1]);
 await p.fill('#p7-note','Two morning blocks before work.');await p.waitForTimeout(200);
 const [dm]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p7-wk-md"]')]);const md=fs.readFileSync(await dm.path(),'utf8');console.log('7 md:',dm.suggestedFilename(),'| has table',/\| Week of \| Answers/.test(md),'| note',/My note: Two morning/.test(md));
 // install page on file://
 await p.goto(U+'#/install');await p.waitForTimeout(400);t=await txt(p);console.log('8 install file:',(t.match(/Opened as a file|Ready for offline use|not found/)||['?'])[0],'| explains:',/Browsers do not let a file install itself/.test(t));
 const [ds]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p7-sw-dl"]')]);console.log('   sw download:',ds.suggestedFilename(),fs.readFileSync(await ds.path(),'utf8')===fs.readFileSync('/mnt/user-data/outputs/cloudwalker-sw.js','utf8'));
 for(const r of ['#/today','#/weekly','#/install','#/dashboard']){await p.setViewportSize({width:390,height:900});await p.goto(U+r);await p.waitForTimeout(400);console.log('9 overflow',r,await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));}
 await p.goto(U+'#/today');await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/today390.png',fullPage:true});
 await ctx.close(); console.log('errors:',errs.length?errs:'none');
})();
