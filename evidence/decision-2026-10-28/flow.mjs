import {chromium} from '../../mirofish-frontend-preview/source/frontend/node_modules/playwright/index.mjs'
import {createServer} from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
const out=path.resolve('deliverables/llm291-decision'),online=process.env.ONLINE==='1',full=process.env.FULL==='1',prefix=online?'online':'production'
const result={checks:[],errors:[]},expected=JSON.parse(fs.readFileSync('agri-llm-demo/mirofish/build-info.json')).fingerprint
const check=(name,passed,detail)=>{result.checks.push({name,passed:!!passed,detail});console.log(name+': '+!!passed);if(!passed)throw Error(name+' '+JSON.stringify(detail))}
const server=createServer((req,res)=>{try{const url=decodeURIComponent(req.url.split('?')[0]);const file=path.join(process.cwd(),url.endsWith('/')?url+'index.html':url);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const base=online?'https://upstardata.github.io/agri-llm-demo/mirofish/':`http://127.0.0.1:${server.address().port}/agri-llm-demo/mirofish/`
let browser
try{
 const build=await(await fetch(base+'build-info.json?check='+expected,{signal:AbortSignal.timeout(25000)})).json()
 check('公开/生产指纹',build.fingerprint===expected,build)
 browser=await chromium.launch();const p=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.on('pageerror',e=>result.errors.push(e.message))
 await p.goto(base);await p.waitForSelector('.pinned-run')
 check('V4入口12推荐25历史',await p.locator('.suggest-card').count()===12&&await p.locator('.pinned-run').count()===25)
 check('无旧分组标签',!(await p.locator('.recommend').innerText()).match(/热门推演主题|相关推演建议/))
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});const layout=await p.evaluate(()=>{const root=document.scrollingElement,a=document.querySelector('.history'),b=document.querySelector('.recommend');a.scrollTop=180;const independent=b.scrollTop===0;b.scrollTop=180;return root.scrollHeight<=innerHeight+1&&root.scrollWidth<=innerWidth+1&&a.scrollTop>0&&b.scrollTop>0&&independent});check('独立滚动 '+width,layout);await p.evaluate(()=>{document.querySelector('.history').scrollTop=0;document.querySelector('.recommend').scrollTop=0});await p.screenshot({path:out+'/'+prefix+'-home-'+width+'.png'})}
 await p.setViewportSize({width:1440,height:1000})
 const manifest=JSON.parse(fs.readFileSync('deliverables/llm291-v4/manifest.json'))
 for(const b of manifest){await p.goto(base+'index.html#/report-standalone/'+b.report_id);await p.waitForSelector(b.reportStyle==='expert'?'.expert-doc':'.report-studio');check('报告 '+b.id,b.reportStyle==='expert'?await p.locator('.doc-part').count()>=5:await p.locator('.kpis>div').count()===4)}
 await p.goto(base+'index.html#/report-standalone/V4-3-8-REPORT?style=data');await p.waitForSelector('.report-studio');await p.locator('.chapters-section').scrollIntoViewIfNeeded();await p.locator('.chapters-section summary').nth(2).click();check('报告参数与边界可查',(await p.locator('.chapter-text').nth(2).innerText()).includes('假设'))
 await p.locator('.report-scroll').evaluate(e=>e.scrollTop=0);await p.screenshot({path:out+'/'+prefix+'-youyang.png'})
 await p.goto(base+'index.html#/report-standalone/V4-6-1-REPORT?style=data');await p.waitForSelector('.report-studio');await p.locator('.chart-section').scrollIntoViewIfNeeded();await p.getByRole('button',{name:'查看数据',exact:true}).click();check('报告保留41个逐日状态',await p.locator('.report-chart tbody tr').count()===41)
 if(full){
  await p.goto(base);check('默认红星经营问题',(await p.locator('textarea').inputValue()).includes('红星应先降价'));await p.getByRole('button',{name:'发送',exact:true}).click();await p.waitForURL(/process\/new/)
  check('从01开始生成',await p.locator('.step-card.active .step-num').innerText()==='01')
  await p.waitForURL(/\/start(?:\?|$)/,{timeout:100000});check('默认发送命中既有V4-6.1',p.url().includes('V4-6-1-SIM'));await p.waitForSelector('.timeline-item',{timeout:15000});await p.waitForTimeout(6000)
  const alignment=await p.evaluate(()=>{const a=[...document.querySelectorAll('.timeline-item.twitter')].at(-1),b=[...document.querySelectorAll('.timeline-item.reddit')].at(-1);return !!a&&!!b&&Math.abs(a.getBoundingClientRect().top-b.getBoundingClientRect().top)<2})
  check('07同一天双侧对齐',alignment);await p.screenshot({path:out+'/'+prefix+'-dual.png'})
  await p.waitForSelector('.status-indicator.completed',{timeout:100000});check('40轮两侧全部160条事件',await p.locator('.timeline-item').count()===160&&(await p.locator('.platform-stats').first().innerText()).includes('40 天'))
  await p.getByRole('button',{name:/开始生成结果报告/}).click();await p.waitForURL(/\/report\//);await p.waitForSelector('.status-indicator.completed',{timeout:100000});check('08完整工具与日志',await p.locator('.result-wrapper').count()>=6&&await p.locator('.console-logs .log-line').count()>0);await p.screenshot({path:out+'/'+prefix+'-report.png'})
 }
 check('无页面异常',!result.errors.length,result.errors)
}catch(e){result.errors.push(e.stack);process.exitCode=1}finally{fs.writeFileSync(out+'/'+prefix+'-smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checks:result.checks.length,errors:result.errors}));await browser?.close();await new Promise(r=>server.close(r))}
