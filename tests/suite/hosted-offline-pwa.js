const { chromium } = require('playwright'); const fs=require('fs');
const errs=[];
(async()=>{
 const dir=__dirname+'/pz2'; fs.rmSync(dir,{recursive:true,force:true});
 const ctx=await chromium.launchPersistentContext(dir,{viewport:{width:1024,height:1100},permissions:['notifications']}); const p=ctx.pages()[0]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8731/#/install');await p.waitForTimeout(2500);
 console.log('1 hosted status:',await p.locator('main .card-head .chip').first().innerText());
 const man=await p.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');if(!l)return null;const j=await (await fetch(l.href)).json();return {href:l.href.slice(0,5),name:j.short_name,start:j.start_url,icons:j.icons.map(i=>i.sizes).join(','),display:j.display};});
 console.log('2 manifest:',JSON.stringify(man));
 const cached=await p.evaluate(async()=>{const ks=await caches.keys();const out=[];for(const k of ks){const c=await caches.open(k);out.push(k+':'+(await c.keys()).map(r=>r.url).join(','));}return out;});
 console.log('3 caches:',cached);
 await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500); console.log('4 offline reload title:',await p.title(),'| main has content:',(await p.locator('main').innerText()).length>200);
 await ctx.setOffline(false);
 // notifications: stub and fast clock
 await ctx.close();
 const ctx2=await chromium.launchPersistentContext(dir+'b',{viewport:{width:1024,height:1100},permissions:['notifications']}); const q=ctx2.pages()[0]; q.on('pageerror',e=>errs.push(e.message));
 await q.addInitScript(()=>{ window.__notes=[]; const N=function(t,o){window.__notes.push([t,o&&o.body]);}; N.permission='granted'; N.requestPermission=()=>Promise.resolve('granted'); window.Notification=N; });
 await q.clock.install({time:new Date('2026-10-12T08:00:00')});
 await q.goto('__CW_APP__');await q.clock.runFor(1500);await q.click('[data-action="ob-skip"]');await q.clock.runFor(500);
 await q.goto('__CW_APP__#/today');await q.clock.runFor(500);
 await q.fill('#p7-time','08:01');await q.press('#p7-time','Tab');await q.check('[data-action="p7-remind"]');await q.clock.runFor(500);
 console.log('5 remind checked:',await q.isChecked('[data-action="p7-remind"]'));
 for(let i=0;i<3;i++){await q.mouse.move(10+i,10);await q.clock.runFor(61000);}
 console.log('6 notifications:',JSON.stringify(await q.evaluate(()=>window.__notes)));
 for(let i=0;i<3;i++){await q.clock.runFor(61000);} console.log('   still one per day:',await q.evaluate(()=>window.__notes.length));
 // active minutes
 await q.click('[data-action="p7-goal-type"][data-v="minutes"]');await q.clock.runFor(300);
 for(let i=0;i<8;i++){await q.mouse.move(20+i,30);await q.clock.runFor(30000);}
 await q.goto('__CW_APP__#/today');await q.clock.runFor(500);
 console.log('7 minutes tracked:',(await q.locator('.td-ring').getAttribute('aria-label')));
 await ctx2.close(); console.log('errors:',errs.length?errs:'none');
})();
