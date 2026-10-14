const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/prof9b'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[];
async function open(o={}){const ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100},acceptDownloads:true,...o});const p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));return [ctx,p];}
(async()=>{
 let [ctx,p]=await open();
 await p.goto(U+'#/settings');await p.waitForTimeout(1000);
 await p.setInputFiles('#fileBank',__dirname+'/bank_small.json');await p.waitForTimeout(800);
 console.log('bank import:',(await p.locator('main .notice').first().innerText()).replace(/\n+/g,' | ').slice(0,120));
 // answer then close fast (pagehide / visibility flush)
 await p.goto(U+'#/study');await p.waitForTimeout(400);
 await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(300);
 await p.keyboard.press('2');await p.waitForTimeout(150);
 await p.close({runBeforeUnload:true}); await new Promise(r=>setTimeout(r,600)); await ctx.close();   // tab close, < 1.5 s after the answer
 [ctx,p]=await open();
 await p.goto(U+'#/settings');await p.waitForTimeout(1200);
 const m=await p.locator('main').innerText();
 console.log('after fast close:',(m.match(/\d+ answers, \d+ flags/)||[''])[0],'| bank:',(m.match(/[\d,]+ questions loaded across \d+ certifications/)||[''])[0]);
 const back=await p.locator('[data-action="p1-backup-restore"]').count(); console.log('daily backups listed:',back);
 // download a backup
 if(back){const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('[data-action="p1-backup-download"]').first().click()]); const f=__dirname+'/bk.json'; await dl.saveAs(f); const j=JSON.parse(fs.readFileSync(f)); console.log('backup file:',j.format,'v'+j.version);}
 // restore backup with confirm modal
 if(back){await p.locator('[data-action="p1-backup-restore"]').first().click();await p.waitForTimeout(300);await p.locator('#dlg4-ok').click();await p.waitForTimeout(600);console.log('restore status:',(await p.locator('#statusSlot').innerText()).replace(/\n/g,' ').slice(0,120));}
 // delete all
 await p.locator('[data-action="p1-delete-arm"]').click();await p.waitForTimeout(200);
 console.log('delete btn disabled before typing:',await p.locator('#p1DelGo').isDisabled());
 await p.locator('#p1DelType').fill('DELETE');await p.waitForTimeout(100);
 console.log('enabled after typing:',!(await p.locator('#p1DelGo').isDisabled()));
 await Promise.all([p.waitForEvent('load').catch(()=>{}),p.locator('#p1DelGo').click()]);await p.waitForTimeout(1500);
 await p.goto(U+'#/settings');await p.waitForTimeout(1000);
 const m2=await p.locator('main').innerText();
 console.log('after delete:',(m2.match(/\d+ answers, \d+ flags/)||[''])[0],'| bank:',(m2.match(/[\d,]+ questions loaded across \d+ certifications/)||[''])[0],'| backups:',await p.locator('[data-action="p1-backup-restore"]').count(),'| pill:',(await p.locator('.save-pill').first().textContent()).trim());
 await ctx.close();
 // blocked storage
 const b=await chromium.launch(); const c=await b.newContext({viewport:{width:820,height:1100}});
 await c.addInitScript(()=>{ Object.defineProperty(window,'indexedDB',{get(){ return { open(){ throw new DOMException('The operation is insecure.','SecurityError'); } }; }}); });
 const q=await c.newPage(); q.on('pageerror',e=>errs.push('blocked:'+e.message));
 let dialogs=0; q.on('dialog',d=>{dialogs++;d.dismiss();});
 await q.goto(U+'#/dashboard');await q.waitForTimeout(1000);
 console.log('blocked pill:',(await q.locator('.save-pill').first().innerText()).replace(/\n/g,' '));
 await q.goto(U+'#/study');await q.waitForTimeout(300);await q.getByRole('button',{name:'Start session'}).click();await q.waitForTimeout(300);await q.keyboard.press('1');await q.waitForTimeout(200);
 await q.goto(U+'#/settings');await q.waitForTimeout(500);
 console.log('blocked settings notice:',(await q.locator('#p1card .notice').innerText()).replace(/\n+/g,' | ').slice(0,200));
 await q.close({runBeforeUnload:true}); await new Promise(r=>setTimeout(r,800)); console.log('beforeunload prompts when blocked:',dialogs);
 await b.close();
 console.log('errors',errs);
})();
