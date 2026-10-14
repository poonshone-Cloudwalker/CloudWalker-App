const { chromium } = require('playwright'); const fs=require('fs');
const U8='file://'+__dirname+'/v08.html', U9='__CW_APP__';
const errs=[];
(async()=>{
 const b=await chromium.launch();
 // --- make a real V08 workspace file
 let c=await b.newContext({acceptDownloads:true,viewport:{width:820,height:1100}}); let p=await c.newPage(); p.on('pageerror',e=>errs.push('v8:'+e.message));
 await p.goto(U8+'#/study');await p.waitForTimeout(800);
 await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(400);
 for(let i=0;i<4;i++){await p.keyboard.press(String(1+i%4));await p.waitForTimeout(200);await p.keyboard.press('Enter');await p.waitForTimeout(200);}
 await p.goto(U8+'#/adr');await p.waitForTimeout(500);
 await p.locator('[data-action="x-adr-new"]').first().click();await p.waitForTimeout(500);
 const ti=p.locator('input[data-bind*="title"], #adr-title, input[name="title"]').first(); if(await ti.count()){await ti.fill('Use managed Kafka for events');await p.waitForTimeout(300);}
 await p.goto(U8+'#/interview');await p.waitForTimeout(400);
 const sn=p.locator('[data-action="story-new"]').first(); if(await sn.count()){await sn.click();await p.waitForTimeout(400);}
 await p.goto(U8+'#/settings');await p.waitForTimeout(500);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.locator("main [data-action=\"ws-export\"]").first().click()]);
 const f8=__dirname+'/v08-workspace.json'; await dl.saveAs(f8); await c.close();
 const w8=JSON.parse(fs.readFileSync(f8)); console.log('v08 file: version',w8.version,'answers',Object.keys(w8.progress.answers).length,'adrs',w8.workspace.adrs.length,'stories',w8.workspace.interview.stories.length, 'adr keys',Object.keys(w8.workspace.adrs[0]||{}).join(','));
 // --- import into fresh V09
 c=await b.newContext({acceptDownloads:true,viewport:{width:820,height:1100}}); p=await c.newPage(); p.on('pageerror',e=>errs.push('v9:'+e.message));
 await p.goto(U9+'#/settings');await p.waitForTimeout(1200);
 await p.setInputFiles('#fileWorkspace',f8);await p.waitForTimeout(1200);
 const msg=await p.locator('main .notice').first().innerText().catch(()=>'(no notice)'); console.log('import notice:',msg.replace(/\n+/g,' | '));
 const qp=await p.locator('main').innerText(); console.log('progress line:',(qp.match(/\d+ answers, \d+ flags[^.]*\./)||[''])[0]);
 await p.waitForTimeout(2000);
 // reload: imported data persisted?
 await p.reload();await p.waitForTimeout(1500);await p.goto(U9+'#/settings');await p.waitForTimeout(800);
 const qp2=await p.locator('main').innerText(); console.log('after reload:',(qp2.match(/\d+ answers, \d+ flags[^.]*\./)||[''])[0]);
 await p.goto(U9+'#/adr');await p.waitForTimeout(500); console.log('ADR list has ADR-001:',(await p.locator('main').innerText()).includes('ADR-001'));
 // --- export v4
 await p.goto(U9+'#/settings');await p.waitForTimeout(500);
 const [dl2]=await Promise.all([p.waitForEvent('download'),p.locator("main [data-action=\"ws-export\"]").first().click()]);
 const f9=__dirname+'/v09-workspace.json'; await dl2.saveAs(f9); const w9=JSON.parse(fs.readFileSync(f9));
 console.log('v09 export: version',w9.version,'schema',w9.workspace.schemaVersion,'userBank',!!w9.userBank,'adr ids',w9.workspace.adrs.map(a=>a.id).join(','),'answers',Object.keys(w9.progress.answers).length);
 // --- re-import the v4 file into another fresh profile: round trip
 const c3=await b.newContext({viewport:{width:820,height:1100}}); const p3=await c3.newPage(); p3.on('pageerror',e=>errs.push('rt:'+e.message));
 await p3.goto(U9+'#/settings');await p3.waitForTimeout(1000);await p3.setInputFiles('#fileWorkspace',f9);await p3.waitForTimeout(1000);
 console.log('v4 round trip notice:',(await p3.locator('main .notice').first().innerText()).replace(/\n+/g,' | ').slice(0,200));
 // --- newer schema refused
 fs.writeFileSync(__dirname+'/v99.json',JSON.stringify({...w9,version:99}));
 await p3.setInputFiles('#fileWorkspace',__dirname+'/v99.json');await p3.waitForTimeout(800);
 console.log('v99 notice:',(await p3.locator('main .notice').first().innerText()).replace(/\n+/g,' | ').slice(0,220));
 console.log('errors',errs); await b.close();
})();
