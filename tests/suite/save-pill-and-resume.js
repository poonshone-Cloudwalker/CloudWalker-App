const { chromium } = require('playwright');
const U='__CW_APP__';
const dir=__dirname+'/prof9'; require('fs').rmSync(dir,{recursive:true,force:true});
const errs=[];
async function open(){const ctx=await chromium.launchPersistentContext(dir,{viewport:{width:820,height:1100},acceptDownloads:true});const p=ctx.pages()[0]||await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));return [ctx,p];}
const pill=async p=>(await p.locator('.topbar .save-pill').innerText().catch(()=>'' )) || await p.locator('.save-pill').first().textContent();
(async()=>{
 let [ctx,p]=await open();
 await p.goto(U+'#/dashboard');await p.waitForTimeout(1200);
 console.log('1 fresh pill:',(await p.locator('.save-pill').first().textContent()).trim());
 // start study session and answer 3
 await p.goto(U+'#/study');await p.waitForTimeout(500);
 await p.getByRole('button',{name:'Start session'}).click();await p.waitForTimeout(500);
 for(let i=0;i<3;i++){await p.keyboard.press('1');await p.waitForTimeout(250);await p.keyboard.press('Enter');await p.waitForTimeout(250);}
 await p.keyboard.press('f');await p.waitForTimeout(300);
 await p.waitForTimeout(2200);
 console.log('2 pill after answers:',(await p.locator('.save-pill').first().textContent()).trim());
 const runInfo=await p.locator('main').innerText(); console.log('   run shows:',(runInfo.match(/Question \d+ of \d+/)||[''])[0]);
 await ctx.close();
 [ctx,p]=await open();
 await p.goto(U+'#/run');await p.waitForTimeout(1500);
 const t2=await p.locator('main').innerText(); console.log('3 after reopen on #/run:',(t2.match(/Question \d+ of \d+/)||['no runner'])[0]);
 await p.goto(U+'#/dashboard');await p.waitForTimeout(600);
 console.log('4 resume banner:',await p.locator('.resume-banner').count(), (await p.locator('.resume-banner').innerText().catch(()=>'')).replace(/\n/g,' '));
 await p.goto(U+'#/settings');await p.waitForTimeout(1200);
 const st=await p.locator('#p1card').innerText(); console.log('5 settings card:',st.replace(/\n+/g,' | ').slice(0,700));
 const qp=await p.locator('main').innerText(); console.log('   quiz progress line:',(qp.match(/\d+ answers, \d+ flags[^.]*\./)||[''])[0]);
 await ctx.close();
 console.log('errors',errs);
})();
