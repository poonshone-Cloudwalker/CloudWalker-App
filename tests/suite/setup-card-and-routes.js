const { chromium } = require('playwright'); const fs=require('fs');
const U='__CW_APP__';
const errs=[]; const txt=async p=>(await p.locator('main').innerText());
(async()=>{
 const b=await chromium.launch();
 // existing user: import V08 workspace on a fresh profile
 let c=await b.newContext({viewport:{width:820,height:1100}}); let p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'#/settings');await p.waitForTimeout(1000);
 console.log('a direct settings visit not redirected:',p.url().endsWith('#/settings'));
 await p.setInputFiles('#fileWorkspace',__dirname+'/v08-workspace.json');await p.waitForTimeout(800);
 await p.goto(U+'#/dashboard');await p.waitForTimeout(600);let t=await txt(p);
 console.log('b existing user dashboard setup card:',/Make CloudWalker yours/.test(t));
 await p.click('[data-action="p2-later"]');await p.waitForTimeout(400);t=await txt(p);
 console.log('c after Not now card gone:',!/Make CloudWalker yours/.test(t));
 await p.goto(U+'#/interview/stories');await p.waitForTimeout(400);t=await txt(p);
 console.log('d no background seeds heading:',(t.match(/From your [^\n]*/)||[''])[0],'| hint:',/Set your background/.test(t));
 await p.goto(U+'#/path');await p.waitForTimeout(400);t=await txt(p);
 console.log('e path without setup:',(t.match(/Tell us where you are headed|For a [^\n]*/)||[''])[0]);
 await c.close();
 // skip
 c=await b.newContext({viewport:{width:820,height:1100}}); p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U);await p.waitForTimeout(1000);await p.click('[data-action="ob-skip"]');await p.waitForTimeout(500);
 console.log('f skip ->',p.url().split('#')[1],'| status:',(await p.locator('#statusSlot').innerText()).slice(0,60));
 // widths & dark mode on new routes
 for(const w of [820,390,375]){await p.setViewportSize({width:w,height:900});for(const r of ['welcome','path','plan','career/profile','interview/stories','dashboard','interview/q/iq-42']){await p.goto(U+'#/'+r);await p.waitForTimeout(250);const sw=await p.evaluate(()=>document.documentElement.scrollWidth);if(sw>w)console.log('OVERFLOW',w,r,sw);}}
 await p.setViewportSize({width:390,height:900});await p.click('[data-action="ob-skip"]').catch(()=>{});
 await p.evaluate(()=>{location.hash='#/welcome'});await p.waitForTimeout(400);
 await p.evaluate(()=>document.documentElement.dataset.theme='dark');await p.screenshot({path:'welcome390dark.png'});
 await c.close();
 // path for a novice changer, no cloud chosen, security role
 c=await b.newContext({viewport:{width:1100,height:1200}}); p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U);await p.waitForTimeout(900);
 await p.locator('input[name="background"][value="changer"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[name="years"][value="0-1"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[name="targetRole"][value="security"]').check();await p.click('[data-action="ob-next"]');
 await p.locator('input[data-ob="clouds"][value="unsure"]').check();await p.click('[data-action="ob-next"]');
 await p.click('[data-action="ob-finish"]');await p.waitForTimeout(600);t=await txt(p);
 for(const s of await p.locator('main section.card').allInnerTexts()) { const head=s.split('\n')[0]; if(['AWS','Microsoft Azure','Google Cloud'].includes(head)) console.log('g',head,'→',s.split('\n').filter(l=>/^(AWS Certified|Microsoft|Google Cloud |CompTIA|Designing|Security exam)/.test(l)).join(' > ')); }
 await p.screenshot({path:'path1100.png',fullPage:false});
 await c.close(); await b.close();
 console.log('errors',errs);
})();
