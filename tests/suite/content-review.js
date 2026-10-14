const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/pr3'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 let ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200},acceptDownloads:true});let p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/content');await p.waitForTimeout(1500);let t=await txt(p);
 console.log('1 counts:',(t.match(/(Needs review|No wrong-option explanation|No explanation of the answer|Difficulty inferred|Reported by a learner|Draft|Retired) · \d+/g)||[]).join(' | '));
 console.log('  footer:',/Not affiliated with or endorsed by AWS, Microsoft, Google, CompTIA, or HashiCorp/.test(await p.locator('.app-foot').innerText()));
 // a question with no distractor summary
 await p.click('[data-action="p3-issue"][data-v="no-distractor"]');await p.waitForTimeout(400);
 const firstId=await p.locator('.cr-item .faint').first().innerText(); console.log('2 first no-distractor id:',firstId);
 await p.locator('.cr-item [data-action="open-q"]').first().click();await p.waitForTimeout(500);
 await p.click('[data-action="dlg-reveal"]');await p.waitForTimeout(300);t=await txt(p);
 console.log('  explain:',(t.match(/Why the others are wrong\n[^\n]*/)||[''])[0].replace('\n',' → '));
 console.log('  prov:',(t.match(/Difficulty: [^\n]*/)||[''])[0]);
 // report
 await p.click('main [data-action="p3-report"]');await p.waitForTimeout(300);
 await p.locator('dialog input[value="unclear"]').check();await p.fill('#rp-note','Option B wording is ambiguous');await p.click('#rp-save');await p.waitForTimeout(500);
 await p.goto(U+'#/content');await p.waitForTimeout(500);await p.click('[data-action="p3-issue"][data-v="reported"]');await p.waitForTimeout(300);t=await txt(p);
 console.log('3 reported count / open reports:',(t.match(/Reported by a learner · \d+/)||[''])[0],'|',(t.match(/Open reports \(\d+\)/)||[''])[0]);
 // owner mode: edit -> add per-option rationale + link, save and approve
 await p.locator('[data-action="p3-owner"]').check();await p.waitForTimeout(300);
 await p.goto(U+'#/content/edit/'+firstId);await p.waitForTimeout(400);
 const ci=+(await p.locator('#ce-ci').inputValue());
 for(let i=0;i<4;i++) if(i!==ci) await p.fill('#ce-r'+i,'Reviewer note: option '+'ABCD'[i]+' does not meet the requirement.');
 await p.fill('#ce-links','Official docs | https://docs.example.com/page\nBad link | http://insecure.example.com');
 await p.click('[data-action="p3-save"][data-approve="1"]');await p.waitForTimeout(300);
 console.log('4 bad link rejected:',(await p.locator('#statusSlot').innerText()).slice(0,80));
 await p.fill('#ce-links','Official docs | https://docs.example.com/page');await p.click('[data-action="p3-save"][data-approve="1"]');await p.waitForTimeout(500);
 console.log('  saved:',(await p.locator('#statusSlot').innerText()).slice(0,60));
 // set difficulty on an inferred item & retire another
 await p.click('[data-action="p3-issue"][data-v="inferred-difficulty"]');await p.waitForTimeout(300);
 const idD=await p.locator('.cr-item .faint').first().innerText(); await p.selectOption(`[data-p3diff="${idD}"]`,'hard');await p.waitForTimeout(400);
 const idR=await p.locator('.cr-item .faint').nth(1).innerText(); await p.locator('.cr-item [data-action="p3-retire"]').nth(1).click(); await p.waitForTimeout(400);
 // export files
 const [d1]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p3-export"][data-v="json"]')]); await d1.saveAs(__dirname+'/rev.json');
 const [d2]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p3-export"][data-v="csv"]')]); await d2.saveAs(__dirname+'/rev.csv');
 const rj=JSON.parse(fs.readFileSync(__dirname+'/rev.json')); console.log('5 export json reports:',rj.reports.length,'edits:',Object.keys(rj.edits).length,'items:',rj.items.length,'| csv lines:',fs.readFileSync(__dirname+'/rev.csv','utf8').split('\n').length);
 // measured difficulty
 await p.goto(U+'#/settings');await p.waitForTimeout(400);await p.setInputFiles('#fileProgress',__dirname+'/prog20.json');await p.waitForTimeout(600);
 await p.waitForTimeout(1800); await ctx.close();
 // reopen: edits persisted?
 ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200}});p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/library');await p.waitForTimeout(1200);
 await p.fill('#l-q',firstId);await p.waitForTimeout(700);
 await p.locator('[data-action="open-q"]').first().click();await p.waitForTimeout(400);await p.click('[data-action="dlg-reveal"]');await p.waitForTimeout(300);t=await txt(p);
 console.log('6 after reopen per-option:',/Reviewer note: option/.test(t),'| link:',/Official docs/.test(t),'| reviewed:',(t.match(/Last reviewed: [^·]*/)||[''])[0],'| status:',/· Approved ·/.test(t), '| reported badge:',/Reported \(1 open\)/.test(t));
 await p.goto(U+'#/library');await p.waitForTimeout(400);await p.fill('#l-q',idR);await p.waitForTimeout(700);t=await txt(p);
 console.log('7 retired hidden from library:',/0 of/.test(t), (t.match(/\d+ of [\d,]+ questions/)||[''])[0]);
 await p.goto(U+'#/library');await p.fill('#l-q','comptia-secplus-001');await p.waitForTimeout(700);await p.locator('[data-action="open-q"]').first().click();await p.waitForTimeout(400);await p.click('[data-action="dlg-reveal"]');await p.waitForTimeout(300);t=await txt(p);
 console.log('8 measured:',(t.match(/Difficulty: [^\n]*/)||[''])[0]);
 await p.goto(U+'#/content');await p.waitForTimeout(400);await p.locator('[data-action="p3-owner"]').check();await p.click('[data-action="p3-issue"][data-v="retired"]');await p.waitForTimeout(300);
 console.log('9 retired listed:',await p.locator('.cr-item').count());
 await p.goto(U+'#/about');await p.waitForTimeout(300);t=await txt(p);console.log('10 about:',(t.match(/Built-in practice questions: \d+[^\n]*/)||[''])[0]);
 console.log('   ',(t.match(/Review status: [^.]*\./)||[''])[0]);
 await p.goto(U+'#/privacy');await p.waitForTimeout(300);console.log('11 privacy fontshare disclosed:',/Fontshare/.test(await txt(p)));
 for(const w of [390,375]){await p.setViewportSize({width:w,height:900});for(const r of ['content','content/edit/'+firstId,'about','privacy','library','dashboard']){await p.goto(U+'#/'+r);await p.waitForTimeout(250);const sw=await p.evaluate(()=>document.documentElement.scrollWidth);if(sw>w)console.log('OVERFLOW',w,r,sw);}}
 await ctx.close(); console.log('errors',errs);
})();
