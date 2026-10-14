const { chromium } = require('playwright'); const fs=require('fs'); const crypto=require('crypto');
const U='__CW_APP__';
const dir=__dirname+'/pa1'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 let ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200},acceptDownloads:true}); let p=ctx.pages()[0]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await ctx.route('https://packs.example.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:fs.readFileSync(__dirname+'/demo-pack-v2.json','utf8')}));
 await p.goto(U);await p.waitForTimeout(1200);await p.click('[data-action="ob-skip"]');await p.waitForTimeout(300);
 // sha256 parity
 const samples=['','abc','é漢字🙂',JSON.stringify({a:[1,2,{b:'x'}]}),'x'.repeat(1000)];
 const got=await p.evaluate(s=>s.map(x=>window.CloudWalker.sha256(x)),samples); console.log('1 sha256 parity:',got.every((g,i)=>g===crypto.createHash('sha256').update(samples[i]).digest('hex')));
 // tampered
 await p.goto(U+'#/packs');await p.waitForTimeout(400);
 let [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-file"]')]);await fc.setFiles(__dirname+'/demo-pack-tampered.json');await p.waitForTimeout(500);
 let t=await txt(p);console.log('2 tampered:',(t.match(/Checksum does not match[^\n]*/)||['none'])[0].slice(0,60),'| merge button:',await p.locator('[data-action="p8-merge"]').count());
 await p.click('[data-action="p8-cancel"]');
 [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-file"]')]);await fc.setFiles(__dirname+'/demo-pack.json');await p.waitForTimeout(600);t=await txt(p);
 console.log('3 preview chip:',await p.locator('.pk-preview .chip').innerText(),'| rows:',(await p.locator('.pk-preview tbody tr').allInnerTexts()).map(x=>x.replace(/\t/g,' ')).join(' | '));
 await p.locator('.pk-preview details').first().click();
 console.log('   rejected reasons:',(await p.locator('.pk-preview').innerText()).match(/cw-pack-q-0002: [^\n]*/)?.[0], '|', (await p.locator('.pk-preview').innerText()).match(/BAD-001[^\n]*/)?.[0]?.slice(0,90));
 await p.click('[data-action="p8-merge"]');await p.waitForTimeout(600);t=await txt(p);console.log('4 merged:',(t.match(/Demo pack[^\n]*\n?[^\n]*/)||['?'])[0].replace(/\n/g,' '),'|',(t.match(/\d+ questions, \d+ lessons[^\n]*/)||['?'])[0]);
 await p.goto(U+'#/lessons/les-pack-demo');await p.waitForTimeout(400);t=await txt(p);console.log('5 lesson:',/How content packs stay trustworthy/.test(t),'| link:',await p.locator('.les-article a[target=_blank]').count());
 await p.goto(U+'#/lab/lab-99');await p.waitForTimeout(400);t=await txt(p);console.log('6 lab:',/Pack demo: static site/.test(t));
 await p.goto(U+'#/content');await p.waitForTimeout(600);t=await txt(p);console.log('7 content:',(t.match(/Draft · \d+/)||[''])[0],(t.match(/Retired · \d+/)||[''])[0]);
 await p.goto(U+'#/path');await p.waitForTimeout(300);
 // reload persistence
 await ctx.close(); ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1200},acceptDownloads:true}); p=ctx.pages()[0]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await ctx.route('https://packs.example.test/**',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:fs.readFileSync(__dirname+'/demo-pack-v2.json','utf8')}));
 await p.goto(U+'#/lessons/les-pack-demo');await p.waitForTimeout(1500);t=await txt(p);console.log('8 after reload lesson:',/How content packs stay trustworthy/.test(t));
 await p.goto(U+'#/content');await p.waitForTimeout(600);t=await txt(p);console.log('   retired kept:',(t.match(/Retired · \d+/)||[''])[0]);
 // URL update v2
 await p.goto(U+'#/packs');await p.waitForTimeout(400);await p.fill('#pk-url','https://packs.example.test/pack.json');await p.click('[data-action="p8-check"]');await p.waitForTimeout(800);
 console.log('9 url v2 rows:',(await p.locator('.pk-preview tbody tr').allInnerTexts()).map(x=>x.replace(/\t/g,' ')).join(' | '));
 await p.click('[data-action="p8-merge"]');await p.waitForTimeout(500);console.log('   installed:',(await p.locator('#h-pk-i ~ div tbody tr').first().innerText()).replace(/\s+/g,' '));
 [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-file"]')]);await fc.setFiles(__dirname+'/demo-pack.json');await p.waitForTimeout(500);console.log('10 older version refused:',(await p.locator('.pk-preview').innerText()).match(/older than the installed[^\n]*/)?.[0]);
 await p.click('[data-action="p8-cancel"]');
 // contributor flow
 let [d1]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p8-tpl"][data-v="csv"]')]);const csvp=__dirname+'/tpl.csv';await d1.saveAs(csvp);
 [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-validate"]')]);await fc.setFiles(csvp);await p.waitForTimeout(500);
 console.log('11 csv report:',(await p.locator('.pk-report').innerText()).split('\n')[0]);
 const bad=fs.readFileSync(csvp,'utf8').trim()+'\r\ncw-sample-q-0002,SAA-C03,1. Design Secure Architectures,,Q?,a,b,,,,,Z,,,,,,,,,,,,,generated-practice,approved,,,\r\n';fs.writeFileSync(__dirname+'/tpl-bad.csv',bad);
 [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-validate"]')]);await fc.setFiles(__dirname+'/tpl-bad.csv');await p.waitForTimeout(500);
 console.log('12 bad csv:',(await p.locator('.pk-report').innerText()).split('\n').slice(0,2).join(' | ').slice(0,260));
 let [d2]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p8-report"]')]);console.log('   report md:',/## Errors/.test(fs.readFileSync(await d2.path(),'utf8')));
 await p.fill('#pk-id','team-pack');await p.fill('#pk-ver','1.0.0');
 let [d3]=await Promise.all([p.waitForEvent('download'),p.click('[data-action="p8-build"]')]);const bp=__dirname+'/built.json';await d3.saveAs(bp);
 [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('[data-action="p8-file"]')]);await fc.setFiles(bp);await p.waitForTimeout(500);
 console.log('13 built pack preview:',await p.locator('.pk-preview .chip').innerText(),'|',(await p.locator('.pk-preview tbody tr').first().innerText()).replace(/\t/g,' '));
 // sync layer
 const s=await p.evaluate(()=>{const S=window.CloudWalker.sync;const ch=S.collectChanges(0);const tables=[...new Set(ch.map(c=>c.table))];return {n:ch.length,tables,act:S.active.status().state,remote:S.adapters.remote.status().state,allTables:S.tables.length};});
 console.log('14 sync collect:',s.n,'records',s.tables.join(','),'| active',s.act,'| remote',s.remote,'| tables',s.allTables);
 const ap=await p.evaluate(()=>{const S=window.CloudWalker.sync;const now=Date.now();
   const r1=S.applyChanges([{table:'exam_outcomes',id:'OUT-001',updatedAt:now,deletedAt:null,data:{id:'OUT-001',date:'2026-10-01',exam:'SAA-C03',result:'pass',score:'',notes:'',t:now,updated:now}}],0);
   const r2=S.applyChanges([{table:'exam_outcomes',id:'OUT-001',updatedAt:now-5000,deletedAt:null,data:{id:'OUT-001',date:'2026-10-01',exam:'SAA-C03',result:'fail',t:now-5000,updated:now-5000}}],now-100000);
   const r3=S.applyChanges([{table:'nope',id:'x',updatedAt:1}]);
   return [r1,r2,r3];}); console.log('15 apply LWW:',JSON.stringify(ap));
 let rem; try{ rem=await p.evaluate(()=>window.CloudWalker.sync.adapters.remote.pull(0).then(()=>'resolved',e=>e.message)); }catch(e){rem=e.message} console.log('16 remote stub:',rem);
 await p.goto(U+'#/settings');await p.waitForTimeout(500);t=await txt(p);console.log('17 sync card:',(t.match(/Sync\n[^\n]*\n[^\n]*/)||['?'])[0].replace(/\n/g,' | ').slice(0,160),'| conflict items',await p.locator('[data-action="p8-conf"]').count());
 if(await p.locator('[data-action="p8-conf"]').count()){await p.locator('[data-action="p8-conf"][data-v="mine"]').first().click();await p.waitForTimeout(300);console.log('   after resolve:',await p.locator('[data-action="p8-conf"]').count());}
 await p.goto(U+'#/calibration');await p.waitForTimeout(300);console.log('   outcome visible:',/OUT|SAA-C03\tPassed/.test(await txt(p)));
 await p.setViewportSize({width:390,height:900});for(const r of ['#/packs','#/settings']){await p.goto(U+r);await p.waitForTimeout(400);console.log('18 overflow',r,await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));}
 await ctx.close(); console.log('errors:',errs.length?errs:'none');
})();
