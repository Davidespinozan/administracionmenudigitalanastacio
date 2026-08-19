var SUPABASE_URL='https://hqrwjlrqzslkwhwqcmnh.supabase.co';
var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcndqbHJxenNsa3dod3FjbW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDYwMTcsImV4cCI6MjA4Nzg4MjAxN30.tNyO18E7lDNEYH28P_DGxSg9pf1yYysVpJuMwboJOoU';
var sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
var soundOn=false,allOrders=[],allOrdersPrev=[],allLeads=[],allPageViews=[],allPixelEvents=[],knownOrderIds={},viewMode='today',customDate=null,customDateEnd=null,sucursalFilter='all',ordersPage=1,leadsPage=1;
var PAGE_SIZE=30;
// Charts: crear una vez y actualizar datos sin animación — evita el parpadeo de destroy/recreate en cada refresh
var _charts={};
function upsertChart(canvasId,cfg){var c=_charts[canvasId];if(c){c.data.labels=cfg.data.labels;c.data.datasets=cfg.data.datasets;c.update('none');return c;}c=new Chart(document.getElementById(canvasId),cfg);_charts[canvasId]=c;return c;}
function removeChart(canvasId){var c=_charts[canvasId];if(c){c.destroy();delete _charts[canvasId];}}

async function doLogin(){var email=document.getElementById('login-email').value.trim();var pass=document.getElementById('login-pass').value;var err=document.getElementById('login-error');err.style.display='none';if(!email||!pass){err.textContent='Ingresa email y contraseña';err.style.display='block';return;}var btn=document.getElementById('login-btn');btn.disabled=true;btn.textContent='Entrando…';var{data,error}=await sb.auth.signInWithPassword({email:email,password:pass});btn.disabled=false;btn.textContent='Entrar';if(error){err.textContent='Email o contraseña incorrectos';err.style.display='block';return;}showAdmin();}
document.getElementById('login-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
function showAdmin(){document.getElementById('login-screen').style.display='none';document.getElementById('admin-app').style.display='block';document.body.classList.add('logged-in');loadAll();setupRealtime();}
async function doLogout(){await sb.auth.signOut();document.body.classList.remove('logged-in');document.getElementById('admin-app').style.display='none';document.getElementById('login-screen').style.display='flex';document.getElementById('login-pass').value='';}
sb.auth.getSession().then(function(r){if(r.data.session)showAdmin();});
// Si la sesión muere (token revocado o refresh fallido), volver al login en vez de fallar en silencio.
// Ojo: nada de llamadas a Supabase dentro de este callback (deadlock conocido de supabase-js v2).
sb.auth.onAuthStateChange(function(event){if(event==='SIGNED_OUT'){document.body.classList.remove('logged-in');document.getElementById('admin-app').style.display='none';document.getElementById('login-screen').style.display='flex';}});

var notifAudio = new Audio('https://hqrwjlrqzslkwhwqcmnh.supabase.co/storage/v1/object/public/imagenes/mixkit-software-interface-start-2574_najvah.wav');
notifAudio.volume = 0.5;
var ICON_SOUND_ON='<svg class="ico" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
var ICON_SOUND_OFF='<svg class="ico" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
function toggleSound(){soundOn=!soundOn;var b=document.getElementById('sound-toggle');b.innerHTML=soundOn?ICON_SOUND_ON:ICON_SOUND_OFF;b.classList.toggle('on',soundOn);if(soundOn){notifAudio.play().then(function(){notifAudio.pause();notifAudio.currentTime=0;}).catch(function(){});}}
function playNotifSound(){if(!soundOn)return;try{notifAudio.currentTime=0;notifAudio.play();}catch(e){}}
var _toastTimer=null;
function showNotification(m,variant){var t=document.getElementById('notif-toast');t.textContent=m;t.className='notif-toast'+(variant?' '+variant:'')+' show';if(!variant)playNotifSound();if(_toastTimer)clearTimeout(_toastTimer);_toastTimer=setTimeout(function(){t.classList.remove('show');},variant==='error'?6000:4000);}
// Errores de carga en background: avisar máximo una vez por minuto para no hacer spam durante el polling
var _lastErrToastAt=0;
function showError(m){var now=Date.now();if(now-_lastErrToastAt<60000)return;_lastErrToastAt=now;showNotification(m,'error');}
var _cdlgCb=null;
function confirmDialog(title,msg,onYes){document.getElementById('cdlg-title').textContent=title;document.getElementById('cdlg-msg').textContent=msg;_cdlgCb=onYes;document.getElementById('cdlg').classList.add('show');}
function closeCdlg(accepted){var cb=_cdlgCb;_cdlgCb=null;document.getElementById('cdlg').classList.remove('show');if(accepted&&cb)cb();}

// Secciones que viven en la hoja "Más" del bottom-nav móvil
var MORE_TABS=['reports','leads','analytics','visitors','products'];
// El filtro de periodo solo aplica donde de verdad filtra; en Caja/Reportes/Clientes se oculta
var NO_PERIOD_TABS=['caja','reports','clientes'];
function switchTab(tab,el){
document.querySelectorAll('.bnav-item,.side-item,.more-item').forEach(function(t){t.classList.remove('active');});
document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
if(el)el.classList.add('active');
var mB=document.querySelector('.bnav-item[data-tab="'+tab+'"]');if(mB)mB.classList.add('active');
var mS=document.querySelector('.side-item[data-tab="'+tab+'"]');if(mS)mS.classList.add('active');
var mM=document.querySelector('.more-item[data-tab="'+tab+'"]');if(mM)mM.classList.add('active');
var moreBtn=document.getElementById('bnav-more');if(moreBtn)moreBtn.classList.toggle('active',MORE_TABS.indexOf(tab)>-1);
document.getElementById('panel-'+tab).classList.add('active');
var pr=document.getElementById('period-row');if(pr)pr.style.display=NO_PERIOD_TABS.indexOf(tab)>-1?'none':'';
toggleMore(false);
if(tab==='caja'&&!cajaOrders)loadCaja();
if((tab==='reports'||tab==='clientes')&&!histOrders)loadHistory();
window.scrollTo(0,0);}
function toggleMore(show){var s=document.getElementById('more-sheet');if(s)s.classList.toggle('show',!!show);}
function setQuick(m,el){viewMode=m;customDate=null;customDateEnd=null;ordersPage=1;leadsPage=1;document.querySelectorAll('#period-row .seg-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');var di=document.getElementById('custom-date');if(di)di.value='';var de=document.getElementById('custom-date-end');if(de)de.value='';loadAll();}
function setCustomRange(){var di=document.getElementById('custom-date'),de=document.getElementById('custom-date-end');var s=di.value,e=de.value;if(!s&&e){s=e;e='';di.value=s;de.value='';}if(!s)return;if(e&&e<s){var tmp=s;s=e;e=tmp;di.value=s;de.value=e;}viewMode='custom';customDate=s;customDateEnd=e||null;ordersPage=1;leadsPage=1;document.querySelectorAll('#period-row .seg-btn').forEach(function(b){b.classList.remove('active');});loadAll();}
function getCurrentRange(){var n=new Date(),s,e;if(viewMode==='today'){s=new Date(n);s.setHours(0,0,0,0);e=new Date(n);e.setDate(e.getDate()+1);e.setHours(0,0,0,0);}else if(viewMode==='yesterday'){s=new Date(n);s.setDate(s.getDate()-1);s.setHours(0,0,0,0);e=new Date(n);e.setHours(0,0,0,0);}else if(viewMode==='week'){s=new Date(n);var d=s.getDay()||7;s.setDate(s.getDate()-d+1);s.setHours(0,0,0,0);e=new Date(s);e.setDate(e.getDate()+7);}else if(viewMode==='month'){s=new Date(n.getFullYear(),n.getMonth(),1);e=new Date(n.getFullYear(),n.getMonth()+1,1);}else if(viewMode==='custom'&&customDate){var p=customDate.split('-');s=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]),0,0,0,0);var pe=(customDateEnd||customDate).split('-');e=new Date(parseInt(pe[0]),parseInt(pe[1])-1,parseInt(pe[2]),0,0,0,0);e.setDate(e.getDate()+1);}else{s=new Date(n);s.setHours(0,0,0,0);e=new Date(n);e.setDate(e.getDate()+1);e.setHours(0,0,0,0);}return{start:s,end:e};}
// Periodo anterior equivalente: mes calendario previo para "Mes", misma duración desplazada para el resto
function getPrevRange(rng){if(viewMode==='month'){return{start:new Date(rng.start.getFullYear(),rng.start.getMonth()-1,1),end:new Date(rng.start.getFullYear(),rng.start.getMonth(),1)};}var dur=rng.end.getTime()-rng.start.getTime();return{start:new Date(rng.start.getTime()-dur),end:new Date(rng.start.getTime())};}
function filterBySucursal(a){if(sucursalFilter==='all')return a;return a.filter(function(r){return r.sucursal===sucursalFilter;});}
function filterByDate(a){return filterBySucursal(a);}
function renderTablePagination(elId,total,curPage,onChange){var el=document.getElementById(elId);if(!el)return;var pages=Math.ceil(total/PAGE_SIZE);if(pages<=1){el.innerHTML='';return;}var h='';if(curPage>1)h+='<button class="df-btn" onclick="'+onChange+'('+(curPage-1)+')">‹</button>';var maxBtns=7,startP=Math.max(1,curPage-3),endP=Math.min(pages,startP+maxBtns-1);if(endP-startP<maxBtns-1)startP=Math.max(1,endP-maxBtns+1);for(var i=startP;i<=endP;i++){h+='<button class="df-btn'+(i===curPage?' active':'')+'" onclick="'+onChange+'('+i+')">'+i+'</button>';}if(curPage<pages)h+='<button class="df-btn" onclick="'+onChange+'('+(curPage+1)+')">›</button>';el.innerHTML=h;}
function setOrdersPage(p){ordersPage=p;renderOrders();var t=document.getElementById('panel-orders');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}
function setLeadsPage(p){leadsPage=p;renderLeads();var t=document.getElementById('panel-leads');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}

function esc(v){return v==null?'':String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function csvCell(v){var s=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';}
function fTime(d){return new Date(d).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:true});}
function fDate(d){return new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})+' '+fTime(d);}
function fMoney(n){return'$'+Number(n).toLocaleString('es-MX');}
function fPct(n){return Math.round(n)+'%';}
function typeLabel(t){return{domicilio:'Domicilio',recoger:'Recoger',mesa:'Mesa'}[t]||t;}
function statusLabel(s){return{pending:'Pendiente',confirmed:'Confirmado',preparing:'Preparando',ready:'Listo',delivered:'Entregado',cancelled:'Cancelado'}[s]||s;}
function payLabel(m){return m==='stripe'?'Tarjeta':m==='whatsapp'?'WhatsApp':m||'';}
function payBadge(m){if(!m)return'';return'<span class="pay-badge '+esc(m)+'">'+esc(payLabel(m))+'</span>';}
function setBadge(id,count){var el=document.getElementById(id);if(!el)return;el.textContent=count;el.style.display=count>0?'':'none';}

async function loadOrders(rng){var q=sb.from('orders').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).limit(2000);var{data,error}=await q;if(error){console.error('Orders:',JSON.stringify(error));showError('No se pudieron cargar los pedidos. Revisa tu conexión.');return;}allOrders=data||[];allOrders.forEach(function(o){knownOrderIds[o.id]=true;});}
async function loadLeads(rng){var q=sb.from('leads').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).limit(2000);var{data,error}=await q;if(error){console.error('Leads:',JSON.stringify(error));showError('No se pudieron cargar los leads. Revisa tu conexión.');return;}allLeads=data||[];}
async function loadPageViews(rng){var all=[],from=0,size=1000;while(true){var{data,error}=await sb.from('page_views').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).range(from,from+size-1);if(error){console.error('PageViews:',JSON.stringify(error));showError('No se pudieron cargar las visitas. Revisa tu conexión.');allPageViews=[];return;}if(!data||data.length===0)break;all=all.concat(data);if(data.length<size)break;if(all.length>=20000){console.warn('page_views: tope de 20000 filas alcanzado');break;}from+=size;}allPageViews=all;}
async function loadPixelEvents(rng){var all=[],from=0,size=1000;while(true){var{data,error}=await sb.from('pixel_events').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).range(from,from+size-1);if(error){console.error('PixelEvents:',JSON.stringify(error));showError('No se pudieron cargar los eventos de pixel. Revisa tu conexión.');allPixelEvents=[];return;}if(!data||data.length===0)break;all=all.concat(data);if(data.length<size)break;if(all.length>=20000){console.warn('pixel_events: tope de 20000 filas alcanzado');break;}from+=size;}allPixelEvents=all;}
async function loadOrdersPrev(rng){var{data,error}=await sb.from('orders').select('sucursal,status,total').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).limit(2000);if(error){console.error('OrdersPrev:',JSON.stringify(error));allOrdersPrev=[];return;}allOrdersPrev=data||[];}
var _loadSeq=0,_heavyBusy=false,_lastLoadAt=0;
async function loadAll(){_lastLoadAt=Date.now();var seq=++_loadSeq;var rng=getCurrentRange();await Promise.all([loadOrders(rng),loadLeads(rng),loadOrdersPrev(getPrevRange(rng))]);if(seq!==_loadSeq)return;renderDashboard();renderOrders();renderLeads();renderAnalytics();renderProducts();refreshCajaIfLive();loadHeavy(rng,seq);}
async function loadHeavy(rng,seq){if(_heavyBusy)return;_heavyBusy=true;try{await Promise.all([loadPageViews(rng),loadPixelEvents(rng)]);if(seq!==_loadSeq)return;renderDashboard();renderVisitors();}finally{_heavyBusy=false;}}
function renderAll(){renderDashboard();renderOrders();renderLeads();renderVisitors();renderAnalytics();renderProducts();if(cajaOrders)renderCaja();if(histOrders){renderReports();renderClientes();}}

function renderDashboard(){
var orders=filterByDate(allOrders).filter(function(o){return o.status!=='cancelled';});
var pending=filterByDate(allOrders).filter(function(o){return o.status==='pending';});
var totalRev=0,domC=0,recC=0,mesC=0;
orders.forEach(function(o){totalRev+=Number(o.total);if(o.order_type==='domicilio')domC++;else if(o.order_type==='recoger')recC++;else mesC++;});
var n=orders.length;
document.getElementById('s-orders').textContent=n;
document.getElementById('s-revenue').textContent=fMoney(totalRev);
document.getElementById('s-ticket').textContent=n>0?fMoney(Math.round(totalRev/n)):'—';
var prevOrders=filterBySucursal(allOrdersPrev).filter(function(o){return o.status!=='cancelled';});
var prevRev=0;prevOrders.forEach(function(o){prevRev+=Number(o.total);});
var pn=prevOrders.length;
setDelta('s-orders-delta',n,pn);
setDelta('s-revenue-delta',totalRev,prevRev);
setDelta('s-ticket-delta',n>0?totalRev/n:0,pn>0?prevRev/pn:0);
document.getElementById('s-pending').textContent=pending.length;
document.getElementById('s-domicilio').textContent=domC;
document.getElementById('s-recoger').textContent=recC;
document.getElementById('s-mesa').textContent=mesC;
document.getElementById('s-domicilio-pct').textContent=n>0?fPct(domC/n*100):'';
document.getElementById('s-recoger-pct').textContent=n>0?fPct(recC/n*100):'';
document.getElementById('s-mesa-pct').textContent=n>0?fPct(mesC/n*100):'';
var fl=filterByDate(allLeads);
document.getElementById('s-leads').textContent=fl.length;
var leadsAllSuc=filterBySucursal(allLeads);
document.getElementById('s-leads-sub').textContent='de '+leadsAllSuc.length+' total';
setBadge('orders-badge-s',pending.length);setBadge('orders-badge-m',pending.length);
setBadge('leads-badge-s',leadsAllSuc.length);
renderRevenueChart(orders);renderTypesChart(domC,recC,mesC);renderHoursChart(orders);renderFunnel(fl,orders);
}

function renderRevenueChart(orders){var days={};orders.forEach(function(o){var k=new Date(o.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});days[k]=(days[k]||0)+Number(o.total);});var labels=Object.keys(days).reverse().slice(-14);var data=labels.map(function(l){return days[l];});upsertChart('chart-revenue',{type:'bar',data:{labels:labels,datasets:[{data:data,backgroundColor:'rgba(201,162,77,.4)',borderColor:'#C9A24D',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});}

function renderTypesChart(d,r,m){upsertChart('chart-types',{type:'doughnut',data:{labels:['Domicilio','Recoger','Mesa'],datasets:[{data:[d,r,m],backgroundColor:['rgba(37,211,102,.7)','rgba(201,162,77,.7)','rgba(242,107,29,.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#59707a',font:{size:10},padding:12}}}}});}

function renderHoursChart(orders){var hrs=new Array(24).fill(0);orders.forEach(function(o){hrs[new Date(o.created_at).getHours()]++;});var labels=[],data=[];for(var i=10;i<=23;i++){labels.push(i+':00');data.push(hrs[i]);}upsertChart('chart-hours',{type:'line',data:{labels:labels,datasets:[{data:data,borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#3B82F6'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});}

function renderFunnel(leads,orders){var el=document.getElementById('funnel-chart');var oc=orders.length,lc=leads.length;var pv=filterByDate(allPageViews);var ev=pv.length||Math.max(lc*8,oc*15,50);var ec=Math.max(oc*3,lc);var steps=[{label:pv.length?'Visitas reales':'Visitas (est.)',count:ev,color:'var(--blue)'},{label:'Leads',count:lc,color:'var(--purple)'},{label:'Carrito',count:ec,color:'var(--amber)'},{label:'Pedidos',count:oc,color:'var(--green)'}];var mx=Math.max.apply(null,steps.map(function(s){return s.count;}))||1;var h='';steps.forEach(function(s,i){var p=Math.max(s.count/mx*100,8);var cv=i>0&&steps[i-1].count>0?Math.round(s.count/steps[i-1].count*100)+'%':'100%';h+='<div class="funnel-step"><div class="funnel-label">'+s.label+'</div><div class="funnel-count">'+s.count+'</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:'+p+'%;background:'+s.color+'"><span>'+cv+'</span></div></div><div class="funnel-pct">'+cv+'</div></div>';});el.innerHTML=h;}

function renderVisitors(){
var views=filterByDate(allPageViews);
var pxAll=filterByDate(allPixelEvents);
var total=views.length;
var uniqueIps={};var metaC=0;var sources={};
views.forEach(function(v){
if(v.visitor_id)uniqueIps[v.visitor_id]=true;
var src=(v.utm_source||v.referrer_source||'directo').toLowerCase();
if(src.indexOf('facebook')>-1||src.indexOf('instagram')>-1||src.indexOf('fb')>-1||src.indexOf('ig')>-1||src.indexOf('meta')>-1)metaC++;
var srcLabel=src==='directo'?'Directo':src.charAt(0).toUpperCase()+src.slice(1);
sources[srcLabel]=(sources[srcLabel]||0)+1;
});
var addCartC=pxAll.filter(function(e){return e.event_name==='AddToCart';}).length;
var checkoutC=pxAll.filter(function(e){return e.event_name==='InitiateCheckout';}).length;
var purchaseC=pxAll.filter(function(e){return e.event_name==='Purchase';}).length;

document.getElementById('v-total').textContent=total;
document.getElementById('v-total-sub').textContent='de '+filterBySucursal(allPageViews).length+' total';
document.getElementById('v-unique').textContent=Object.keys(uniqueIps).length;
document.getElementById('v-meta').textContent=metaC;
document.getElementById('v-addcart').textContent=addCartC;
document.getElementById('v-checkout').textContent=checkoutC;
document.getElementById('v-purchase').textContent=purchaseC;
setBadge('visitors-badge-s',total);

// Conversion funnel
var rEl=document.getElementById('real-funnel-chart');
var uniqueCart=pxAll.filter(function(e){return e.event_name==='AddToCart';});var ucV={};uniqueCart.forEach(function(e){if(e.visitor_id)ucV[e.visitor_id]=true;});
var uniqueCheck=pxAll.filter(function(e){return e.event_name==='InitiateCheckout';});var uckV={};uniqueCheck.forEach(function(e){if(e.visitor_id)uckV[e.visitor_id]=true;});
var uniquePurch=pxAll.filter(function(e){return e.event_name==='Purchase';});var upV={};uniquePurch.forEach(function(e){if(e.visitor_id)upV[e.visitor_id]=true;});
var rSteps=[{label:'Visitas',count:Object.keys(uniqueIps).length||total,color:'var(--blue)'},{label:'Carrito',count:Object.keys(ucV).length||addCartC,color:'var(--gold)'},{label:'Checkout',count:Object.keys(uckV).length||checkoutC,color:'var(--cta)'},{label:'Compra',count:Object.keys(upV).length||purchaseC,color:'var(--green)'}];
var rMx=Math.max.apply(null,rSteps.map(function(s){return s.count;}))||1;
var rh='';rSteps.forEach(function(s,i){var p=Math.max(s.count/rMx*100,8);var cv=i>0&&rSteps[i-1].count>0?(s.count/rSteps[i-1].count*100).toFixed(1)+'%':'100%';rh+='<div class="funnel-step"><div class="funnel-label">'+s.label+'</div><div class="funnel-count">'+s.count+'</div><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:'+p+'%;background:'+s.color+'"><span>'+cv+'</span></div></div><div class="funnel-pct">'+cv+'</div></div>';});
rEl.innerHTML=rh;

// Visits per day
var days={};views.forEach(function(v){var k=new Date(v.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});days[k]=(days[k]||0)+1;});
var dLabels=Object.keys(days).reverse().slice(-14);var dData=dLabels.map(function(l){return days[l];});
upsertChart('chart-visits-day',{type:'line',data:{labels:dLabels,datasets:[{data:dData,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#2563eb'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});

// Source breakdown
var srcSorted=Object.entries(sources).sort(function(a,b){return b[1]-a[1];});
var srcMax=srcSorted.length>0?srcSorted[0][1]:1;
var srcEl=document.getElementById('source-list-wrap');
var colors=['var(--blue)','var(--green)','var(--purple)','var(--amber)','var(--cta)','var(--red)'];
if(srcSorted.length===0){srcEl.innerHTML='<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div class="empty-text">Sin visitas aún</div></div>';}
else{var sh='<div class="source-list">';srcSorted.slice(0,8).forEach(function(s,i){var pct=Math.max(s[1]/srcMax*100,5);sh+='<div class="source-row"><div class="source-name">'+esc(s[0])+'</div><div class="source-count">'+s[1]+'</div><div class="source-bar-bg"><div class="source-bar-fill" style="width:'+pct+'%;background:'+colors[i%colors.length]+'"></div></div></div>';});sh+='</div>';srcEl.innerHTML=sh;}

// Top products added to cart
var cartProds={};pxAll.filter(function(e){return e.event_name==='AddToCart';}).forEach(function(e){var n=e.event_data&&e.event_data.content_name?e.event_data.content_name:'Desconocido';cartProds[n]=(cartProds[n]||0)+1;});
var cpSorted=Object.entries(cartProds).sort(function(a,b){return b[1]-a[1];});
var cpEl=document.getElementById('top-cart-wrap');
if(cpSorted.length===0){cpEl.innerHTML='<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><div class="empty-text">Sin datos aún</div></div>';}
else{var cpMax=cpSorted[0][1];var cph='<div class="source-list">';cpSorted.slice(0,8).forEach(function(s,i){var pct=Math.max(s[1]/cpMax*100,5);cph+='<div class="source-row"><div class="source-name">'+esc(s[0])+'</div><div class="source-count">'+s[1]+'</div><div class="source-bar-bg"><div class="source-bar-fill" style="width:'+pct+'%;background:'+colors[i%colors.length]+'"></div></div></div>';});cph+='</div>';cpEl.innerHTML=cph;}

// WhatsApp vs Stripe
var methods={};pxAll.filter(function(e){return e.event_name==='InitiateCheckout';}).forEach(function(e){var m=e.event_data&&e.event_data.method?e.event_data.method:'otro';methods[m]=(methods[m]||0)+1;});
var mLabels=Object.keys(methods);var mData=mLabels.map(function(k){return methods[k];});
var mColors=mLabels.map(function(k){return k==='whatsapp'?'rgba(37,211,102,.7)':k==='stripe'?'rgba(99,102,241,.7)':'rgba(201,162,77,.7)';});
if(mLabels.length===0){removeChart('chart-checkout-method');}
else{upsertChart('chart-checkout-method',{type:'doughnut',data:{labels:mLabels.map(function(l){return l.charAt(0).toUpperCase()+l.slice(1);}),datasets:[{data:mData,backgroundColor:mColors,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#59707a',font:{size:10},padding:12}}}}});}

// Scroll depth
var scrollBuckets={'25%':0,'50%':0,'75%':0,'100%':0};
pxAll.filter(function(e){return e.event_name==='ScrollDepth';}).forEach(function(e){var p=e.event_data&&e.event_data.percent?e.event_data.percent+'%':'';if(scrollBuckets.hasOwnProperty(p))scrollBuckets[p]++;});
upsertChart('chart-scroll',{type:'bar',data:{labels:Object.keys(scrollBuckets),datasets:[{data:Object.values(scrollBuckets),backgroundColor:['rgba(37,99,235,.5)','rgba(124,58,237,.5)','rgba(201,162,77,.5)','rgba(5,150,105,.5)'],borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});
}

function renderOrders(){var f=filterByDate(allOrders);var sf=document.getElementById('filter-status').value;var tf=document.getElementById('filter-type').value;if(sf!=='all')f=f.filter(function(o){return o.status===sf;});if(tf!=='all')f=f.filter(function(o){return o.order_type===tf;});
var q=(document.getElementById('filter-search').value||'').trim().toLowerCase();
if(q)f=f.filter(function(o){var hay=(o.customer_name||'')+' '+(o.customer_phone||'')+' '+(o.delivery_address||'');if(o.items&&Array.isArray(o.items))o.items.forEach(function(i){hay+=' '+(i.name||'');});return hay.toLowerCase().indexOf(q)>-1;});
var body=document.getElementById('orders-body');if(f.length===0){body.innerHTML='<tr><td colspan="6"><div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><div class="empty-text">No hay pedidos</div></div></td></tr>';renderTablePagination('orders-pagination',0,1,'setOrdersPage');return;}var totalPg=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(ordersPage>totalPg)ordersPage=totalPg;var pageRows=f.slice((ordersPage-1)*PAGE_SIZE,ordersPage*PAGE_SIZE);var rows='';pageRows.forEach(function(o){var c=esc(o.customer_name)||'—';if(o.customer_phone)c+='<br><small style="color:var(--muted)">'+esc(o.customer_phone)+'</small>';if(o.delivery_address)c+='<br><small style="color:var(--muted)">📍 '+esc(o.delivery_address)+'</small>';if(o.table_number)c+='<br><small style="color:var(--muted)">Mesa '+esc(o.table_number)+'</small>';if(o.pickup_time)c+='<br><small style="color:var(--muted)">⏱ '+esc(o.pickup_time)+'</small>';var it='';if(o.items&&Array.isArray(o.items))it=o.items.map(function(i){return'<strong>'+esc(i.qty)+'x</strong> '+esc(i.name);}).join('<br>');var sts=['pending','confirmed','preparing','ready','delivered','cancelled'];var sel='<select class="status-select" onchange="updateStatus(\''+esc(o.id)+'\',this.value)">';sts.forEach(function(s){sel+='<option value="'+s+'"'+(s===o.status?' selected':'')+'>'+statusLabel(s)+'</option>';});sel+='</select>';var suc=(sucursalFilter==='all'&&o.sucursal)?'<span class="suc-badge suc-'+esc(o.sucursal)+'">'+esc(o.sucursal)+'</span>':'';var pay=payBadge(o.payment_method);rows+='<tr><td style="white-space:nowrap">'+fTime(o.created_at)+'<br><small style="color:var(--muted)">'+new Date(o.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})+'</small></td><td><span class="otype '+esc(o.order_type)+'">'+esc(typeLabel(o.order_type))+'</span>'+suc+pay+'</td><td>'+c+'</td><td><div class="items-list">'+it+'</div></td><td style="white-space:nowrap;font-family:\'Space Grotesk\',sans-serif;font-variant-numeric:tabular-nums;font-weight:700;font-size:.95rem;color:var(--gold)">'+fMoney(o.total)+'</td><td>'+sel+'</td></tr>';});body.innerHTML=rows;renderTablePagination('orders-pagination',f.length,ordersPage,'setOrdersPage');}

function updateStatus(id,st){var o=allOrders.find(function(x){return x.id===id;});if(st==='cancelled'&&o&&o.status!=='cancelled'){renderOrders();confirmDialog('¿Cancelar pedido?','El pedido de '+(o.customer_name||'cliente')+' por '+fMoney(o.total)+' se marcará como cancelado y saldrá de las ventas.',function(){applyStatus(id,st);});return;}applyStatus(id,st);}
async function applyStatus(id,st){var{error}=await sb.from('orders').update({status:st}).eq('id',id);if(error){showNotification('No se pudo actualizar el pedido: '+(error.message||'error de conexión'),'error');renderOrders();return;}var o=allOrders.find(function(x){return x.id===id;});if(o)o.status=st;showNotification('Pedido actualizado a '+statusLabel(st).toLowerCase(),'info');renderAll();}

function renderLeads(){var f=filterByDate(allLeads);var sf=document.getElementById('filter-source').value;if(sf!=='all')f=f.filter(function(l){return l.source===sf;});var body=document.getElementById('leads-body');if(f.length===0){body.innerHTML='<tr><td colspan="5"><div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="empty-text">No hay leads</div></div></td></tr>';renderTablePagination('leads-pagination',0,1,'setLeadsPage');return;}var totalPg=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(leadsPage>totalPg)leadsPage=totalPg;var pageRows=f.slice((leadsPage-1)*PAGE_SIZE,leadsPage*PAGE_SIZE);var rows='';pageRows.forEach(function(l){rows+='<tr><td style="white-space:nowrap">'+fDate(l.created_at)+'</td><td>'+(esc(l.name)||'—')+'</td><td>'+(esc(l.phone)||'—')+'</td><td>'+(esc(l.email)||'—')+'</td><td><span class="otype recoger">'+(esc(l.source)||'bar')+'</span></td></tr>';});body.innerHTML=rows;renderTablePagination('leads-pagination',f.length,leadsPage,'setLeadsPage');}

function renderAnalytics(){var orders=filterByDate(allOrders);var active=orders.filter(function(o){return o.status!=='cancelled';});var cancelled=orders.filter(function(o){return o.status==='cancelled';});var leads=filterByDate(allLeads);var cr=leads.length>0&&active.length>0?Math.round(active.length/leads.length*100):0;document.getElementById('a-conversion').textContent=cr+'%';var phones={};active.forEach(function(o){if(o.customer_phone)phones[o.customer_phone]=(phones[o.customer_phone]||0)+1;});document.getElementById('a-repeat').textContent=Object.values(phones).filter(function(c){return c>=2;}).length;var ti=0;active.forEach(function(o){if(o.items&&Array.isArray(o.items))o.items.forEach(function(i){ti+=(i.qty||1);});});document.getElementById('a-avg-items').textContent=active.length>0?(ti/active.length).toFixed(1):'0';document.getElementById('a-cancel-rate').textContent=orders.length>0?Math.round(cancelled.length/orders.length*100)+'%':'0%';
var wd=[0,0,0,0,0,0,0];var wl=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];active.forEach(function(o){wd[new Date(o.created_at).getDay()]+=Number(o.total);});upsertChart('chart-weekday',{type:'bar',data:{labels:wl,datasets:[{data:wd,backgroundColor:wd.map(function(v,i){return i===5||i===6?'rgba(242,107,29,.5)':'rgba(201,162,77,.4)';}),borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});
var bk={'$0-100':0,'$101-200':0,'$201-300':0,'$301-500':0,'$500+':0};active.forEach(function(o){var t=Number(o.total);if(t<=100)bk['$0-100']++;else if(t<=200)bk['$101-200']++;else if(t<=300)bk['$201-300']++;else if(t<=500)bk['$301-500']++;else bk['$500+']++;});upsertChart('chart-ticket',{type:'bar',data:{labels:Object.keys(bk),datasets:[{data:Object.values(bk),backgroundColor:'rgba(139,92,246,.4)',borderColor:'#8B5CF6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});}

function renderProducts(){var orders=filterByDate(allOrders).filter(function(o){return o.status!=='cancelled';});var items={};orders.forEach(function(o){if(o.items&&Array.isArray(o.items))o.items.forEach(function(i){var k=i.name;if(!items[k])items[k]={name:k,qty:0,revenue:0};items[k].qty+=(i.qty||1);items[k].revenue+=(i.qty||1)*(i.price||0);});});var sorted=Object.values(items).sort(function(a,b){return b.qty-a.qty;});var el=document.getElementById('top-products');if(sorted.length===0){el.innerHTML='<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><div class="empty-text">Sin datos aún</div></div>';return;}var h='';sorted.slice(0,20).forEach(function(it,i){h+='<div class="top-item"><div class="top-rank">'+(i+1)+'</div><div class="top-name">'+esc(it.name)+'</div><div class="top-qty">×'+esc(it.qty)+'</div><div class="top-rev">'+fMoney(it.revenue)+'</div></div>';});el.innerHTML=h;}

// Delta vs periodo anterior: sin dato previo no se muestra nada (mejor vacío que un 0% engañoso)
function setDelta(id,cur,prev){var el=document.getElementById(id);if(!el)return;if(!prev){el.textContent='';return;}var d=Math.round((cur-prev)/prev*100);el.textContent=(d>=0?'▲ +':'▼ ')+d+'% vs anterior';el.style.color=d>=0?'var(--green)':'var(--red)';el.style.opacity='.9';}
function viewSuffix(){return viewMode==='custom'&&customDate?(customDate+(customDateEnd?'_a_'+customDateEnd:'')):viewMode;}
function exportOrders(){var f=filterByDate(allOrders);var csv='Fecha,Sucursal,Tipo,Metodo,Cliente,Telefono,Direccion,Mesa,HoraRecogida,Items,Total,Status\n';f.forEach(function(o){var it=o.items?o.items.map(function(i){return i.qty+'x '+i.name;}).join(' | '):'';csv+=[fDate(o.created_at),o.sucursal,o.order_type,payLabel(o.payment_method),o.customer_name,o.customer_phone,o.delivery_address,o.table_number,o.pickup_time,it,o.total,o.status].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_pedidos_'+viewSuffix()+'.csv');}
function exportLeads(){var f=filterByDate(allLeads);var csv='Fecha,Sucursal,Nombre,Telefono,Email,Fuente\n';f.forEach(function(l){csv+=[fDate(l.created_at),l.sucursal,l.name,l.phone,l.email,l.source].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_leads_'+viewSuffix()+'.csv');}
function downloadCSV(csv,fn){var b=new Blob([csv],{type:'text/csv;charset=utf-8;'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;a.click();}

// ─── CAJA: corte del día ───
var cajaDate=null,cajaOrders=null,_cajaLoading=false;
function cajaToday(){var n=new Date();return n.getFullYear()+'-'+('0'+(n.getMonth()+1)).slice(-2)+'-'+('0'+n.getDate()).slice(-2);}
function setCajaDate(v){if(!v)return;cajaDate=v;cajaOrders=null;loadCaja();}
async function loadCaja(){if(_cajaLoading)return;if(!cajaDate){cajaDate=cajaToday();var di=document.getElementById('caja-date');if(di)di.value=cajaDate;}
_cajaLoading=true;var p=cajaDate.split('-');var s=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));var e=new Date(s);e.setDate(e.getDate()+1);
var r=await sb.from('orders').select('*').gte('created_at',s.toISOString()).lt('created_at',e.toISOString()).order('created_at',{ascending:true}).limit(2000);
_cajaLoading=false;
if(r.error){console.error('Caja:',JSON.stringify(r.error));showError('No se pudo cargar el corte de caja.');return;}
cajaOrders=r.data||[];renderCaja();}
// El corte del día en curso se refresca junto con el polling, pero solo si la pestaña Caja está abierta
function refreshCajaIfLive(){var pc=document.getElementById('panel-caja');if(pc&&pc.classList.contains('active')&&cajaOrders&&cajaDate===cajaToday())loadCaja();}
function renderCaja(){if(!cajaOrders)return;
var all=filterBySucursal(cajaOrders);
var act=all.filter(function(o){return o.status!=='cancelled';});
var canc=all.filter(function(o){return o.status==='cancelled';});
var rev=0;act.forEach(function(o){rev+=Number(o.total);});
var cancRev=0;canc.forEach(function(o){cancRev+=Number(o.total);});
document.getElementById('c-venta').textContent=fMoney(rev);
document.getElementById('c-pedidos').textContent=act.length;
document.getElementById('c-ticket').textContent=act.length>0?fMoney(Math.round(rev/act.length)):'—';
document.getElementById('c-cancelados').textContent=canc.length;
document.getElementById('c-cancelados-monto').textContent=canc.length>0?fMoney(cancRev)+' no cobrados':'';
var tipos={domicilio:{n:0,rev:0},recoger:{n:0,rev:0},mesa:{n:0,rev:0}};
act.forEach(function(o){var t=tipos[o.order_type]||(tipos[o.order_type]={n:0,rev:0});t.n++;t.rev+=Number(o.total);});
var th='<div class="kv-list">';
Object.keys(tipos).forEach(function(k){var t=tipos[k];th+='<div class="kv-row"><span class="kv-k">'+esc(typeLabel(k))+'<span class="kv-sub">'+t.n+' pedido'+(t.n===1?'':'s')+'</span></span><span class="kv-v">'+fMoney(t.rev)+'</span></div>';});
th+='</div>';
// Desglose por método de pago (solo pedidos que lo traen registrado)
var mets={};act.forEach(function(o){if(!o.payment_method)return;if(!mets[o.payment_method])mets[o.payment_method]={n:0,rev:0};mets[o.payment_method].n++;mets[o.payment_method].rev+=Number(o.total);});
var mKeys=Object.keys(mets);
if(mKeys.length>0){th+='<div class="kv-divider">Por método de pago</div><div class="kv-list">';
mKeys.sort(function(a,b){return mets[b].rev-mets[a].rev;}).forEach(function(k){var m=mets[k];th+='<div class="kv-row"><span class="kv-k">'+esc(payLabel(k))+'<span class="kv-sub">'+m.n+' pedido'+(m.n===1?'':'s')+'</span></span><span class="kv-v">'+fMoney(m.rev)+'</span></div>';});
th+='</div>';}
document.getElementById('caja-tipos').innerHTML=th;
var hrs={};act.forEach(function(o){var h=new Date(o.created_at).getHours();hrs[h]=(hrs[h]||0)+Number(o.total);});
var hKeys=Object.keys(hrs).map(Number).sort(function(a,b){return a-b;});
upsertChart('chart-caja-horas',{type:'bar',data:{labels:hKeys.map(function(h){return h+':00';}),datasets:[{data:hKeys.map(function(h){return hrs[h];}),backgroundColor:'rgba(201,162,77,.4)',borderColor:'#C9A24D',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});
var body=document.getElementById('caja-body');
if(all.length===0){body.innerHTML='<tr><td colspan="5"><div class="empty"><div class="empty-text">Sin pedidos este día</div></div></td></tr>';return;}
var rows='';all.forEach(function(o){rows+='<tr><td style="white-space:nowrap">'+fTime(o.created_at)+'</td><td><span class="otype '+esc(o.order_type)+'">'+esc(typeLabel(o.order_type))+'</span></td><td>'+(esc(o.customer_name)||'—')+'</td><td class="num" style="white-space:nowrap;font-weight:700;color:var(--gold)">'+fMoney(o.total)+'</td><td><span class="status '+esc(o.status)+'">'+esc(statusLabel(o.status))+'</span></td></tr>';});
body.innerHTML=rows;}
function exportCaja(){if(!cajaOrders)return;var f=filterBySucursal(cajaOrders);var csv='Hora,Sucursal,Tipo,Metodo,Cliente,Telefono,Items,Total,Status\n';f.forEach(function(o){var it=o.items?o.items.map(function(i){return i.qty+'x '+i.name;}).join(' | '):'';csv+=[fTime(o.created_at),o.sucursal,o.order_type,payLabel(o.payment_method),o.customer_name,o.customer_phone,it,o.total,o.status].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_corte_'+cajaDate+'.csv');}
function printCaja(){window.print();}

// ─── REPORTES: histórico completo desde el primer pedido ───
var histOrders=null,_histLoading=false;
var MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function monthKey(d){var x=new Date(d);return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2);}
function monthLabel(k){var p=k.split('-');return MESES[parseInt(p[1],10)-1]+' '+p[0].slice(2);}
function monthRangeKeys(firstK,lastK){var out=[],p=firstK.split('-'),y=parseInt(p[0],10),m=parseInt(p[1],10),q=lastK.split('-'),ly=parseInt(q[0],10),lm=parseInt(q[1],10);while(y<ly||(y===ly&&m<=lm)){out.push(y+'-'+('0'+m).slice(-2));m++;if(m>12){m=1;y++;}}return out;}
async function loadHistory(force){if(_histLoading)return;if(histOrders&&!force){renderReports();return;}
_histLoading=true;var note=document.getElementById('rep-note');if(note)note.textContent='Cargando histórico completo…';
var all=[],from=0,size=1000;
while(true){var r=await sb.from('orders').select('created_at,total,status,order_type,sucursal,customer_phone,customer_name').order('created_at',{ascending:true}).range(from,from+size-1);
if(r.error){console.error('Historico:',JSON.stringify(r.error));_histLoading=false;if(note)note.textContent='Error al cargar el histórico. Intenta de nuevo.';showError('No se pudo cargar el histórico.');return;}
var data=r.data||[];all=all.concat(data);if(data.length<size)break;if(all.length>=50000){console.warn('histórico: tope de 50000 filas alcanzado');break;}from+=size;}
histOrders=all;_histLoading=false;if(note)note.textContent='';renderReports();renderClientes();}
function renderReports(){if(!histOrders)return;
var act=filterBySucursal(histOrders).filter(function(o){return o.status!=='cancelled';});
var note=document.getElementById('rep-note');
if(act.length===0){if(note)note.textContent='Aún no hay pedidos registrados.';return;}
var total=0;act.forEach(function(o){total+=Number(o.total);});
var n=act.length;
document.getElementById('r-total').textContent=fMoney(total);
document.getElementById('r-desde').textContent='desde '+new Date(act[0].created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
document.getElementById('r-pedidos').textContent=n.toLocaleString('es-MX');
document.getElementById('r-ticket').textContent=fMoney(Math.round(total/n));
var phones={};act.forEach(function(o){if(o.customer_phone)phones[o.customer_phone]=(phones[o.customer_phone]||0)+1;});
document.getElementById('r-clientes').textContent=Object.keys(phones).length.toLocaleString('es-MX');
document.getElementById('r-clientes-sub').textContent=Object.values(phones).filter(function(c){return c>=2;}).length+' repiten';
var byMonth={};act.forEach(function(o){var k=monthKey(o.created_at);if(!byMonth[k])byMonth[k]={rev:0,n:0};byMonth[k].rev+=Number(o.total);byMonth[k].n++;});
var realKeys=Object.keys(byMonth).sort();
var mKeys=monthRangeKeys(realKeys[0],realKeys[realKeys.length-1]);
function mAt(k){return byMonth[k]||{rev:0,n:0};}
var bestM=realKeys[0];realKeys.forEach(function(k){if(byMonth[k].rev>byMonth[bestM].rev)bestM=k;});
document.getElementById('r-best-month').textContent=fMoney(byMonth[bestM].rev);
document.getElementById('r-best-month-sub').textContent=monthLabel(bestM);
var byDay={};act.forEach(function(o){var k=new Date(o.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});byDay[k]=(byDay[k]||0)+Number(o.total);});
var bestD=null;Object.keys(byDay).forEach(function(k){if(bestD===null||byDay[k]>byDay[bestD])bestD=k;});
document.getElementById('r-best-day').textContent=fMoney(byDay[bestD]);
document.getElementById('r-best-day-sub').textContent=bestD;
upsertChart('chart-rep-monthly',{type:'bar',data:{labels:mKeys.map(monthLabel),datasets:[{data:mKeys.map(function(k){return mAt(k).rev;}),backgroundColor:'rgba(201,162,77,.4)',borderColor:'#C9A24D',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});
upsertChart('chart-rep-orders',{type:'line',data:{labels:mKeys.map(monthLabel),datasets:[{data:mKeys.map(function(k){return mAt(k).n;}),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#2563eb'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});
var rows='';
for(var i=mKeys.length-1;i>=0;i--){var k=mKeys[i],m=mAt(k),prev=i>0?mAt(mKeys[i-1]):null;
var dtxt='—',dcol='var(--muted)';
if(prev&&prev.rev>0){var d=Math.round((m.rev-prev.rev)/prev.rev*100);dtxt=(d>=0?'▲ +':'▼ ')+d+'%';dcol=d>=0?'var(--green)':'var(--red)';}
rows+='<tr><td style="font-weight:600;white-space:nowrap">'+monthLabel(k)+'</td><td class="num">'+m.n+'</td><td class="num" style="font-weight:700;color:var(--gold)">'+fMoney(m.rev)+'</td><td class="num">'+(m.n>0?fMoney(Math.round(m.rev/m.n)):'—')+'</td><td class="num" style="font-weight:700;color:'+dcol+'">'+dtxt+'</td></tr>';}
document.getElementById('rep-body').innerHTML=rows;}
// ─── CLIENTES: CRM derivado del histórico de pedidos (solo pedidos con teléfono) ───
var clientesPage=1,clientesSort='gasto';
function setClientesSort(v){clientesSort=v;clientesPage=1;renderClientes();}
function searchClientes(){clientesPage=1;renderClientes();}
function setClientesPage(p){clientesPage=p;renderClientes();var t=document.getElementById('panel-clientes');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}
function waLink(phone){var d=String(phone).replace(/\D/g,'');if(d.length===10)d='52'+d;return'https://wa.me/'+d;}
function buildClientes(){var act=filterBySucursal(histOrders).filter(function(o){return o.status!=='cancelled'&&o.customer_phone;});
var map={};
act.forEach(function(o){var k=o.customer_phone;if(!map[k])map[k]={phone:k,name:'',n:0,total:0,first:o.created_at,last:o.created_at};var c=map[k];c.n++;c.total+=Number(o.total);if(o.customer_name)c.name=o.customer_name;if(o.created_at>c.last)c.last=o.created_at;if(o.created_at<c.first)c.first=o.created_at;});
return Object.values(map);}
function clienteBadge(n){if(n>=4)return'<span class="status delivered">VIP · '+n+'</span>';if(n>=2)return'<span class="status confirmed">Repite · '+n+'</span>';return'<span class="status ready">Nuevo</span>';}
function renderClientes(){if(!histOrders)return;
var list=buildClientes();
var now=Date.now();
document.getElementById('cl-total').textContent=list.length.toLocaleString('es-MX');
var rec=list.filter(function(c){return c.n>=2;});
document.getElementById('cl-recurrentes').textContent=rec.length.toLocaleString('es-MX');
document.getElementById('cl-recurrentes-sub').textContent=list.length>0?fPct(rec.length/list.length*100)+' del total':'';
var inact=list.filter(function(c){return c.n>=2&&(now-new Date(c.last).getTime())>30*864e5;});
document.getElementById('cl-inactivos').textContent=inact.length.toLocaleString('es-MX');
var spend=0;list.forEach(function(c){spend+=c.total;});
document.getElementById('cl-gasto').textContent=list.length>0?fMoney(Math.round(spend/list.length)):'—';
var q=(document.getElementById('cl-search').value||'').trim().toLowerCase();
if(q)list=list.filter(function(c){return(c.name+' '+c.phone).toLowerCase().indexOf(q)>-1;});
if(clientesSort==='pedidos')list.sort(function(a,b){return b.n-a.n||b.total-a.total;});
else if(clientesSort==='reciente')list.sort(function(a,b){return a.last<b.last?1:-1;});
else list.sort(function(a,b){return b.total-a.total;});
var body=document.getElementById('clientes-body');
if(list.length===0){body.innerHTML='<tr><td colspan="6"><div class="empty"><div class="empty-text">'+(q?'Sin resultados para esa búsqueda':'Aún no hay clientes con teléfono registrado')+'</div></div></td></tr>';renderTablePagination('clientes-pagination',0,1,'setClientesPage');return;}
var totalPg=Math.max(1,Math.ceil(list.length/PAGE_SIZE));if(clientesPage>totalPg)clientesPage=totalPg;
var pageRows=list.slice((clientesPage-1)*PAGE_SIZE,clientesPage*PAGE_SIZE);
var rows='';
pageRows.forEach(function(c){
var days=Math.floor((now-new Date(c.last).getTime())/864e5);
var lastTxt=days===0?'hoy':days===1?'ayer':'hace '+days+' días';
var lastCol=days>30?'var(--red)':days>14?'var(--amber)':'var(--muted)';
rows+='<tr><td>'+(esc(c.name)||'—')+'<br><small style="color:var(--muted)">'+esc(c.phone)+'</small></td><td>'+clienteBadge(c.n)+'</td><td class="num" style="white-space:nowrap;font-weight:700;color:var(--gold)">'+fMoney(c.total)+'</td><td class="num">'+fMoney(Math.round(c.total/c.n))+'</td><td style="white-space:nowrap">'+new Date(c.last).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'2-digit'})+'<br><small style="font-weight:600;color:'+lastCol+'">'+lastTxt+'</small></td><td><a class="wa-btn" href="'+esc(waLink(c.phone))+'" target="_blank" rel="noopener" title="Abrir WhatsApp"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></a></td></tr>';});
body.innerHTML=rows;
renderTablePagination('clientes-pagination',list.length,clientesPage,'setClientesPage');}
function exportClientes(){if(!histOrders)return;var list=buildClientes().sort(function(a,b){return b.total-a.total;});var csv='Nombre,Telefono,Pedidos,TotalGastado,TicketPromedio,PrimerPedido,UltimoPedido\n';list.forEach(function(c){csv+=[c.name,c.phone,c.n,c.total,Math.round(c.total/c.n),fDate(c.first),fDate(c.last)].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_clientes.csv');}

function exportMonthly(){if(!histOrders)return;var act=filterBySucursal(histOrders).filter(function(o){return o.status!=='cancelled';});var byMonth={};act.forEach(function(o){var k=monthKey(o.created_at);if(!byMonth[k])byMonth[k]={rev:0,n:0};byMonth[k].rev+=Number(o.total);byMonth[k].n++;});var csv='Mes,Pedidos,Venta,TicketPromedio\n';Object.keys(byMonth).sort().forEach(function(k){var m=byMonth[k];csv+=[k,m.n,m.rev,Math.round(m.rev/m.n)].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_mensual.csv');}

function setupRealtime(){sb.channel('admin-rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},function(p){var rng=getCurrentRange();var when=new Date(p.new.created_at);if(when<rng.start||when>=rng.end)return;if(sucursalFilter!=='all'&&p.new.sucursal!==sucursalFilter){loadAll();return;}var suc=p.new.sucursal?' ['+p.new.sucursal.toUpperCase()+']':'';showNotification('Nuevo pedido'+suc+' — '+typeLabel(p.new.order_type)+' — '+fMoney(p.new.total));loadAll();}).on('postgres_changes',{event:'INSERT',schema:'public',table:'leads'},function(p){var rng=getCurrentRange();var when=new Date(p.new.created_at);if(when<rng.start||when>=rng.end)return;loadAll();}).subscribe();}
// Polling consciente de visibilidad: solo con sesión activa y pestaña visible.
// Realtime ya recarga al instante ante pedidos nuevos; esto es la red de seguridad.
var POLL_MS=30000;
function isLoggedIn(){return document.body.classList.contains('logged-in');}
setInterval(function(){if(!isLoggedIn()||document.hidden)return;if(Date.now()-_lastLoadAt<POLL_MS-2000)return;loadAll();},POLL_MS);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&isLoggedIn()&&Date.now()-_lastLoadAt>5000)loadAll();});

// Banner de conexión: convierte "no pasó nada al hacer click" en una explicación
window.addEventListener('offline',function(){document.body.classList.add('offline');});
window.addEventListener('online',function(){document.body.classList.remove('offline');showNotification('Conexión restablecida','success');if(isLoggedIn())loadAll();});

// Register Service Worker for PWA + auto-update
if ('serviceWorker' in navigator) {
  var swDoReload = false, swRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (swDoReload && !swRefreshing) { swRefreshing = true; window.location.reload(); }
  });
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      reg.update();
      setInterval(function() { reg.update(); }, 60000);
      document.addEventListener('visibilitychange', function() { if (!document.hidden) reg.update(); });
      reg.addEventListener('updatefound', function() {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function() {
          // Nueva versión lista y ya había una activa -> es un update: activar y recargar
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            swDoReload = true;
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function(err) {
      console.log('SW registration failed:', err);
    });
  });
}
