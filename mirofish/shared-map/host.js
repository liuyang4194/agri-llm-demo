/* Adapter only: rendering, camera, region colours and globe are shared unchanged. */
(async()=>{
const [china,world]=await Promise.all([fetch('./china.geo.json').then(r=>r.json()),fetch('./world110.geo.json').then(r=>r.json())]);
window.__CHINA_GEO=china;window.__WORLD110=world;window.V03Data={PROV_CENTER:{湖南:[111.73,27.54]}};
let data={objects:[],relations:[]},view='world',hasData=false;const globe=V03Globe.create();
const color=t=>({'产区':'#d97706','市场':'#2f6fd0','供应流向':'#d97706'}[t]||'#578c6b');
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pick(kind,id){const n=data.objects.find(n=>n.id===id);const r=data.relations.find(r=>r.id===id);const e=document.getElementById('selection');e.textContent=n?`${n.name} · ${n.type} · 地名近似定位`:r?`${r.name}：${r.fact||''}`:'';e.style.display=e.textContent?'block':'none';parent.postMessage({type:'agrilink:map-pick',id,kind},location.origin)}
const kit=V03MapKit.create({chartId:'chart',globeId:'globe',globe,chrome:()=>MAP_PALETTE,regionColor:n=>V03Fact.mapRegionColor(n,view==='world'?'L1':'L2'),provinceCenter:n=>n==='湖南'?[111.73,27.54,9.08]:null,
onView(v){view=v;if(hasData)parent.postMessage({type:'agrilink:map-view',view:v},location.origin);document.getElementById('chart').style.visibility=v==='globe'?'hidden':'visible';document.getElementById('globe').style.visibility=v==='globe'?'visible':'hidden';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));},
onStatus(){status()},pick,hit:p=>p.data?.kind?{kind:p.data.kind,id:p.data.id}:null,
tooltip:p=>p.data?.kind==='object'?escape(p.data.name)+'<br>地名近似定位':escape(p.data?.name||p.name).replace(/@[-\d]+$/,''),
globeData:()=>({mode:'relation',...data,colorOf:color,scopeKey:'simulation',keep:data.objects.slice(0,16).map(n=>n.id),limit:100}),
series(v){const index=new Map(data.objects.map(n=>[n.id,n]));const ll=n=>[v==='world'&&n.lng< -25?n.lng+360:n.lng,n.lat];return [
{type:'lines',coordinateSystem:'geo',zlevel:2,lineStyle:{color:'#d97706',width:1.5,opacity:.65,curveness:.16},effect:{show:!matchMedia('(prefers-reduced-motion: reduce)').matches,symbolSize:3,period:5,color:'#d97706'},data:data.relations.filter(r=>index.has(r.from)&&index.has(r.to)).map(r=>({id:r.id,name:r.name,kind:'relation',coords:[ll(index.get(r.from)),ll(index.get(r.to))]}))},
{type:'scatter',coordinateSystem:'geo',zlevel:3,symbolSize:9,label:{show:false},emphasis:{label:{show:true,formatter:'{b}',position:'top',fontSize:11,color:'#22303f',backgroundColor:'#fff',padding:4}},itemStyle:{borderColor:'#fff',borderWidth:1.5},data:data.objects.map(n=>({id:n.id,name:n.name,kind:'object',value:ll(n),itemStyle:{color:color(n.type)}}))}];}});
function status(){document.getElementById('status').textContent=`${V03MapKit.LABEL[view]} · ${data.objects.length} 个地理本体 · ${data.relations.length} 条关系 · 地名近似定位`;window.__mapState={view,objects:data.objects,relations:data.relations,engine:'V03MapKit / V03Globe',targetZoom:kit.camera().tz};}
globe.mount(document.getElementById('canvas'),{pick,zoomEdge:()=>kit.setView('world')});kit.mount();
function apply(msg){hasData=true;data=msg.data||data;if(msg.view&&msg.view!==view)kit.setView(msg.view);else kit.render();status()}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='agrilink:map-data')return;apply(e.data)});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{kit.setView(b.dataset.view);status()});document.getElementById('zoom-in').onclick=()=>kit.zoomBy(1);document.getElementById('zoom-out').onclick=()=>kit.zoomBy(-1);
kit.setView('world');parent.postMessage({type:'agrilink:map-ready'},location.origin);status();
})().catch(e=>{document.getElementById('status').textContent='地图加载失败，请重新打开';console.error(e)});
