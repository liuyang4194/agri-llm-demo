import {chromium} from '../../mirofish-frontend-preview/source/frontend/node_modules/playwright/index.mjs'
import {createServer as vite} from '../../mirofish-frontend-preview/source/frontend/node_modules/vite/dist/node/index.js'
import vue from '../../mirofish-frontend-preview/source/frontend/node_modules/@vitejs/plugin-vue/dist/index.mjs'
import {createServer} from 'node:http'
import fs from 'node:fs';import path from 'node:path'
const out='deliverables/llm291-current',root=path.resolve('mirofish-frontend-preview/source/frontend'),result={checks:[],errors:[]}
const check=(name,passed,detail)=>{result.checks.push({name,passed:!!passed,detail});console.log(name,!!passed);if(!passed)throw Error(name+JSON.stringify(detail))}
const app=await vite({root,configFile:false,logLevel:'error',plugins:[vue()],resolve:{alias:{'@':path.join(root,'src'),'@locales':path.resolve(root,'../locales')}},server:{host:'127.0.0.1',port:0,hmr:false}});await app.listen()
const outer=createServer((req,res)=>{res.setHeader('Content-Type','text/html');fs.createReadStream('agri-llm-demo-visual-v0810/index.html').pipe(res)});await new Promise(r=>outer.listen(0,'127.0.0.1',r))
const browser=await chromium.launch(),p=await browser.newPage({viewport:{width:1440,height:1000}}),base=app.resolvedUrls.local[0];p.on('pageerror',e=>result.errors.push(e.message))
try{
 await p.goto(base);check('首次默认提示词保留',(await p.locator('textarea').inputValue()).includes('基于导入的农业交易事实'))
 const audit=await p.evaluate(async()=>{const {v4Flows}=await import('/src/data/builtin/mirofish/index.js');return v4Flows.map(b=>({id:b.id,title:b.title,result:b.resultTitle,first:b.reportLogs.find(l=>l.action==='section_complete').details.content,heading:b.outline.sections[0].title,sections:b.outline.sections.length}))})
 check('37套报告先回答母题',audit.length===37&&audit.every(b=>b.heading.includes('直接回答母题')&&b.first.length>100&&b.sections===6),audit.map(b=>b.id))
 await p.goto(base+'#/report/V4-2-1-REPORT');await p.waitForSelector('.workbench-header');
 const layout=await p.locator('.workbench-header').evaluate(e=>{const n=e.querySelector('nav').getBoundingClientRect(),v=e.querySelector('.engine-version').getBoundingClientRect(),t=e.querySelector('.run-topic').getBoundingClientRect();return {left:n.left,below:v.top>=n.bottom,topic:!!e.querySelector('.run-topic').textContent,center:Math.abs((t.left+t.right)/2-innerWidth/2)}})
 check('工作台控件最左、版本紧随、主题居中',layout.left<30&&layout.below&&layout.topic&&layout.center<150,layout)
 await p.screenshot({path:out+'/header.png'})
 await p.goto(base+'#/report-standalone/V4-2-1-REPORT?style=data');await p.waitForSelector('.report-studio');
 check('报告工具栏仅保留独立阅读',await p.locator('.style-toolbar button,.style-toolbar select').count()===0&&await p.locator('.style-toolbar a').count()===1)
 const [popup]=await Promise.all([p.waitForEvent('popup'),p.locator('.style-toolbar a').click()]);await popup.waitForSelector('h1');check('新标签页标题等于报告标题',await popup.title()===await popup.locator('h1').innerText());await popup.close()
 check('ENSO明确气候与产量边界',(await p.locator('.deck').innerText()).includes('不能')|| (await p.locator('.deck').innerText()).includes('不足'))
 await p.locator('.chapters-section summary').first().click();check('ENSO正文引用官方依据',(await p.locator('.chapter-text').first().innerText()).includes('NOAA'))
 await p.screenshot({path:out+'/enso-answer.png'})
 await p.goto(`http://127.0.0.1:${outer.address().port}` ,{timeout:120000});await p.waitForSelector('#sideBody .fcard');await p.evaluate(()=>{V03Store.set({time:'all'});V03Feed.stop()});await p.waitForTimeout(4000)
 check('完整平台名称',await p.title()==='基于时序事件驱动的农业产业大模型平台 · 农链')
 const scroll=await p.evaluate(async()=>{const el=document.querySelector('#sideBody'),samples=[];for(let i=0;i<30;i++){samples.push(el.scrollTop);await new Promise(r=>setTimeout(r,100))}const before=el.scrollTop;V03Fact.receiveFact(V03Data.FACTS[0],{replay:true});const after=el.scrollTop;const a=el.__auto;el.scrollTop=el.scrollHeight-el.clientHeight-1;a.position=el.scrollTop;await new Promise(r=>setTimeout(r,300));const lists=el.querySelectorAll('.fcards'),extent=lists[0].offsetHeight+8;a.position=extent-1;el.scrollTop=a.position;const marker=lists[1].firstElementChild.getBoundingClientRect().top;await new Promise(r=>setTimeout(r,120));return {samples,before,after,cards:new Set([...el.querySelectorAll('.fcard')].map(c=>c.dataset.fid)).size,loopTop:el.scrollTop,max:el.scrollHeight-el.clientHeight,boundaryDelta:Math.abs(el.querySelector('.fcards').firstElementChild.getBoundingClientRect().top-marker)}})
 check('1000条资料预载、播报不归零',scroll.cards===1000&&scroll.before===scroll.after,scroll)
 check('连续滚动且底部循环无停顿',scroll.samples.every((v,i)=>!i||v>scroll.samples[i-1])&&scroll.loopTop<scroll.max-10&&scroll.boundaryDelta<20,scroll)
 const chip=await p.locator('.fcard').first().evaluate(e=>{const a=e.querySelector('.fcard-tag'),b=e.querySelector('.fcard-variety');return {html:e.innerHTML.slice(0,700),tag:a&&getComputedStyle(a).backgroundColor,variety:b&&getComputedStyle(b).borderTopColor}})
 check('分类填色、品种黑色线框',!!chip.tag&&chip.tag!=='rgba(0, 0, 0, 0)'&&!!chip.variety,chip)
 await p.screenshot({path:out+'/facts.png'});await p.setViewportSize({width:390,height:844});await p.screenshot({path:out+'/facts-mobile.png'})
 check('无浏览器脚本异常',!result.errors.length,result.errors)
}catch(e){result.errors.push(e.stack);process.exitCode=1}finally{fs.writeFileSync(out+'/ui-smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors}));await browser.close();await app.close();await new Promise(r=>outer.close(r))}
