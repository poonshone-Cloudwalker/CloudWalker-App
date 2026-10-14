const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const dir=__dirname+'/prof9d'; fs.rmSync(dir,{recursive:true,force:true});
const errs=[];
(async()=>{
 let ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100}});let p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 // ADR typing persists
 await p.goto(U+'#/adr');await p.waitForTimeout(600);
 await p.locator('[data-action="x-adr-new"]').first().click();await p.waitForTimeout(500);
 const inp=p.locator('main input[type="text"], main textarea').first(); await inp.click(); await inp.type('Pick Aurora over self-managed PostgreSQL',{delay:5}); await p.waitForTimeout(300);
 const url=p.url();
 // focus pref
 await p.goto(U+'#/dashboard');await p.waitForTimeout(500);
 const fq=p.locator('#focusQuick'); const v=await fq.locator('option',{hasText:'AIB'}).first().getAttribute('value'); await fq.selectOption(v); await p.waitForTimeout(2000);
 await p.close({runBeforeUnload:true}); await ctx.close();
 ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100}});p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(1200);
 console.log('ADR text after reopen:', await p.locator('main input[type="text"], main textarea').first().inputValue());
 await p.goto(U+'#/study');await p.waitForTimeout(500);console.log('study focus:',await p.locator('select').first().locator('option:checked').innerText());
 // all routes, no errors, phone widths
 const routes=['dashboard','library','study','exam','retention','review','analytics','lab','adr','portfolio','interview','career','outputs','outputs/export','glossary','settings','menu'];
 for(const w of [820,390,375]){await p.setViewportSize({width:w,height:900});for(const r of routes){await p.goto(U+'#/'+r);await p.waitForTimeout(250);const sw=await p.evaluate(()=>document.documentElement.scrollWidth);if(sw>w)console.log('OVERFLOW',w,r,sw);}}
 await p.setViewportSize({width:390,height:900}); await p.goto(U+'#/settings');await p.waitForTimeout(800); await p.screenshot({path:'s390.png'});
 await p.setViewportSize({width:1024,height:900}); await p.goto(U+'#/dashboard');await p.waitForTimeout(500);
 await p.evaluate(()=>{document.documentElement.dataset.theme='dark';}); await p.waitForTimeout(200); await p.screenshot({path:'dark1024.png'});
 // keyboard reach to pill
 await p.evaluate(()=>{document.documentElement.dataset.theme='light';});
 let found=false; for(let i=0;i<120;i++){await p.keyboard.press('Tab'); const a=await p.evaluate(()=>document.activeElement?.className||''); if(/sp-link/.test(a)){found=true;break;}} console.log('pill reachable by Tab:',found);
 console.log('errors',errs); await ctx.close();
})();
