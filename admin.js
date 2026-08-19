var SUPABASE_URL='https://hqrwjlrqzslkwhwqcmnh.supabase.co';
var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcndqbHJxenNsa3dod3FjbW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDYwMTcsImV4cCI6MjA4Nzg4MjAxN30.tNyO18E7lDNEYH28P_DGxSg9pf1yYysVpJuMwboJOoU';
var sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
var soundOn=false,allOrders=[],allLeads=[],allPageViews=[],allPixelEvents=[],knownOrderIds={},viewMode='today',customDate=null,sucursalFilter='all',ordersPage=1,leadsPage=1;
var PAGE_SIZE=30;
var chartRevenue,chartTypes,chartHours,chartWeekday,chartTicket,chartVisitsDay,chartCheckoutMethod,chartScroll;

async function doLogin(){var email=document.getElementById('login-email').value.trim();var pass=document.getElementById('login-pass').value;var err=document.getElementById('login-error');err.style.display='none';if(!email||!pass){err.textContent='Ingresa email y contraseña';err.style.display='block';return;}var{data,error}=await sb.auth.signInWithPassword({email:email,password:pass});if(error){err.textContent='Email o contraseña incorrectos';err.style.display='block';return;}showAdmin();}
document.getElementById('login-pass').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
function showAdmin(){document.getElementById('login-screen').style.display='none';document.getElementById('admin-app').style.display='block';document.body.classList.add('logged-in');loadAll();setupRealtime();}
async function doLogout(){await sb.auth.signOut();document.body.classList.remove('logged-in');document.getElementById('admin-app').style.display='none';document.getElementById('login-screen').style.display='flex';document.getElementById('login-pass').value='';}
sb.auth.getSession().then(function(r){if(r.data.session)showAdmin();});

var notifAudio = new Audio('https://hqrwjlrqzslkwhwqcmnh.supabase.co/storage/v1/object/public/imagenes/mixkit-software-interface-start-2574_najvah.wav');
notifAudio.volume = 0.5;
var ICON_SOUND_ON='<svg class="ico" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
var ICON_SOUND_OFF='<svg class="ico" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
function toggleSound(){soundOn=!soundOn;var b=document.getElementById('sound-toggle');b.innerHTML=soundOn?ICON_SOUND_ON:ICON_SOUND_OFF;b.classList.toggle('on',soundOn);if(soundOn){notifAudio.play().then(function(){notifAudio.pause();notifAudio.currentTime=0;}).catch(function(){});}}
function playNotifSound(){if(!soundOn)return;try{notifAudio.currentTime=0;notifAudio.play();}catch(e){}}
function showNotification(m){var t=document.getElementById('notif-toast');t.textContent=m;t.classList.add('show');playNotifSound();setTimeout(function(){t.classList.remove('show');},4000);}

function switchTab(tab,el){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});document.querySelectorAll('.bnav-item').forEach(function(t){t.classList.remove('active');});document.querySelectorAll('.side-item').forEach(function(t){t.classList.remove('active');});document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});el.classList.add('active');var match=document.querySelector('.bnav-item[data-tab="'+tab+'"]');if(match)match.classList.add('active');var matchTop=document.querySelector('.tab[data-tab="'+tab+'"]');if(matchTop)matchTop.classList.add('active');var matchSide=document.querySelector('.side-item[data-tab="'+tab+'"]');if(matchSide)matchSide.classList.add('active');document.getElementById('panel-'+tab).classList.add('active');window.scrollTo(0,0);}
function setQuick(m,el){viewMode=m;customDate=null;ordersPage=1;leadsPage=1;document.querySelectorAll('#period-row .df-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');var di=document.getElementById('custom-date');if(di)di.value='';loadAll();}
function setCustomDate(v){if(!v)return;viewMode='custom';customDate=v;ordersPage=1;leadsPage=1;document.querySelectorAll('#period-row .df-btn').forEach(function(b){b.classList.remove('active');});loadAll();}
function setSucursal(s,el){sucursalFilter=s;ordersPage=1;leadsPage=1;el.parentElement.querySelectorAll('.df-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');renderAll();}
function getCurrentRange(){var n=new Date(),s,e;if(viewMode==='today'){s=new Date(n);s.setHours(0,0,0,0);e=new Date(n);e.setDate(e.getDate()+1);e.setHours(0,0,0,0);}else if(viewMode==='yesterday'){s=new Date(n);s.setDate(s.getDate()-1);s.setHours(0,0,0,0);e=new Date(n);e.setHours(0,0,0,0);}else if(viewMode==='week'){s=new Date(n);var d=s.getDay()||7;s.setDate(s.getDate()-d+1);s.setHours(0,0,0,0);e=new Date(s);e.setDate(e.getDate()+7);}else if(viewMode==='month'){s=new Date(n.getFullYear(),n.getMonth(),1);e=new Date(n.getFullYear(),n.getMonth()+1,1);}else if(viewMode==='custom'&&customDate){var p=customDate.split('-');s=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]),0,0,0,0);e=new Date(s);e.setDate(e.getDate()+1);}else{s=new Date(n);s.setHours(0,0,0,0);e=new Date(n);e.setDate(e.getDate()+1);e.setHours(0,0,0,0);}return{start:s,end:e};}
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

async function loadOrders(rng){var q=sb.from('orders').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).limit(2000);var{data,error}=await q;if(error){console.error('Orders:',JSON.stringify(error));return;}allOrders=data||[];allOrders.forEach(function(o){knownOrderIds[o.id]=true;});}
async function loadLeads(rng){var q=sb.from('leads').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).limit(2000);var{data,error}=await q;if(error){console.error('Leads:',JSON.stringify(error));return;}allLeads=data||[];}
async function loadPageViews(rng){var all=[],from=0,size=1000;while(true){var{data,error}=await sb.from('page_views').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).range(from,from+size-1);if(error){console.error('PageViews:',JSON.stringify(error));allPageViews=[];return;}if(!data||data.length===0)break;all=all.concat(data);if(data.length<size)break;if(all.length>=20000){console.warn('page_views: tope de 20000 filas alcanzado');break;}from+=size;}allPageViews=all;}
async function loadPixelEvents(rng){var all=[],from=0,size=1000;while(true){var{data,error}=await sb.from('pixel_events').select('*').gte('created_at',rng.start.toISOString()).lt('created_at',rng.end.toISOString()).order('created_at',{ascending:false}).range(from,from+size-1);if(error){console.error('PixelEvents:',JSON.stringify(error));allPixelEvents=[];return;}if(!data||data.length===0)break;all=all.concat(data);if(data.length<size)break;if(all.length>=20000){console.warn('pixel_events: tope de 20000 filas alcanzado');break;}from+=size;}allPixelEvents=all;}
var _loadSeq=0,_heavyBusy=false,_lastLoadAt=0;
async function loadAll(){_lastLoadAt=Date.now();var seq=++_loadSeq;var rng=getCurrentRange();await Promise.all([loadOrders(rng),loadLeads(rng)]);if(seq!==_loadSeq)return;renderDashboard();renderOrders();renderLeads();renderAnalytics();renderProducts();loadHeavy(rng,seq);}
async function loadHeavy(rng,seq){if(_heavyBusy)return;_heavyBusy=true;try{await Promise.all([loadPageViews(rng),loadPixelEvents(rng)]);if(seq!==_loadSeq)return;renderDashboard();renderVisitors();}finally{_heavyBusy=false;}}
function renderAll(){renderDashboard();renderOrders();renderLeads();renderVisitors();renderAnalytics();renderProducts();}

function renderDashboard(){
var orders=filterByDate(allOrders).filter(function(o){return o.status!=='cancelled';});
var pending=filterByDate(allOrders).filter(function(o){return o.status==='pending';});
var totalRev=0,domC=0,recC=0,mesC=0;
orders.forEach(function(o){totalRev+=Number(o.total);if(o.order_type==='domicilio')domC++;else if(o.order_type==='recoger')recC++;else mesC++;});
var n=orders.length;
document.getElementById('s-orders').textContent=n;
document.getElementById('s-revenue').textContent=fMoney(totalRev);
document.getElementById('s-ticket').textContent=n>0?fMoney(Math.round(totalRev/n)):'—';
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
var badge=document.getElementById('orders-badge');if(pending.length>0){badge.textContent=pending.length;badge.style.display='';}else badge.style.display='none';var badgeS=document.getElementById('orders-badge-s');if(badgeS){if(pending.length>0){badgeS.textContent=pending.length;badgeS.style.display='';}else badgeS.style.display='none';}
var badgeM=document.getElementById('orders-badge-m');if(badgeM){if(pending.length>0){badgeM.textContent=pending.length;badgeM.style.display='';}else badgeM.style.display='none';}
var lb=document.getElementById('leads-badge');lb.textContent=leadsAllSuc.length;lb.style.display=leadsAllSuc.length>0?'':'none';var lbS=document.getElementById('leads-badge-s');if(lbS){lbS.textContent=leadsAllSuc.length;lbS.style.display=leadsAllSuc.length>0?'':'none';}
renderRevenueChart(orders);renderTypesChart(domC,recC,mesC);renderHoursChart(orders);renderFunnel(fl,orders);
}

function renderRevenueChart(orders){var days={};orders.forEach(function(o){var k=new Date(o.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});days[k]=(days[k]||0)+Number(o.total);});var labels=Object.keys(days).reverse().slice(-14);var data=labels.map(function(l){return days[l];});var ctx=document.getElementById('chart-revenue');if(chartRevenue)chartRevenue.destroy();chartRevenue=new Chart(ctx,{type:'bar',data:{labels:labels,datasets:[{data:data,backgroundColor:'rgba(201,162,77,.4)',borderColor:'#C9A24D',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});}

function renderTypesChart(d,r,m){var ctx=document.getElementById('chart-types');if(chartTypes)chartTypes.destroy();chartTypes=new Chart(ctx,{type:'doughnut',data:{labels:['Domicilio','Recoger','Mesa'],datasets:[{data:[d,r,m],backgroundColor:['rgba(37,211,102,.7)','rgba(201,162,77,.7)','rgba(242,107,29,.7)'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#59707a',font:{size:10},padding:12}}}}});}

function renderHoursChart(orders){var hrs=new Array(24).fill(0);orders.forEach(function(o){hrs[new Date(o.created_at).getHours()]++;});var labels=[],data=[];for(var i=10;i<=23;i++){labels.push(i+':00');data.push(hrs[i]);}var ctx=document.getElementById('chart-hours');if(chartHours)chartHours.destroy();chartHours=new Chart(ctx,{type:'line',data:{labels:labels,datasets:[{data:data,borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#3B82F6'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});}

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
var vb=document.getElementById('visitors-badge');vb.textContent=total;vb.style.display=total>0?'':'none';var vbS=document.getElementById('visitors-badge-s');if(vbS){vbS.textContent=total;vbS.style.display=total>0?'':'none';}

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
var c1=document.getElementById('chart-visits-day');
if(chartVisitsDay)chartVisitsDay.destroy();
chartVisitsDay=new Chart(c1,{type:'line',data:{labels:dLabels,datasets:[{data:dData,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.1)',fill:true,tension:.4,pointRadius:3,pointBackgroundColor:'#2563eb'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});

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
var c3=document.getElementById('chart-checkout-method');
if(chartCheckoutMethod){chartCheckoutMethod.destroy();chartCheckoutMethod=null;}
if(mLabels.length>0){chartCheckoutMethod=new Chart(c3,{type:'doughnut',data:{labels:mLabels.map(function(l){return l.charAt(0).toUpperCase()+l.slice(1);}),datasets:[{data:mData,backgroundColor:mColors,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#59707a',font:{size:10},padding:12}}}}});}

// Scroll depth
var scrollBuckets={'25%':0,'50%':0,'75%':0,'100%':0};
pxAll.filter(function(e){return e.event_name==='ScrollDepth';}).forEach(function(e){var p=e.event_data&&e.event_data.percent?e.event_data.percent+'%':'';if(scrollBuckets.hasOwnProperty(p))scrollBuckets[p]++;});
var c4=document.getElementById('chart-scroll');
if(chartScroll)chartScroll.destroy();
chartScroll=new Chart(c4,{type:'bar',data:{labels:Object.keys(scrollBuckets),datasets:[{data:Object.values(scrollBuckets),backgroundColor:['rgba(37,99,235,.5)','rgba(124,58,237,.5)','rgba(201,162,77,.5)','rgba(5,150,105,.5)'],borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});
}

function renderOrders(){var f=filterByDate(allOrders);var sf=document.getElementById('filter-status').value;var tf=document.getElementById('filter-type').value;if(sf!=='all')f=f.filter(function(o){return o.status===sf;});if(tf!=='all')f=f.filter(function(o){return o.order_type===tf;});var body=document.getElementById('orders-body');if(f.length===0){body.innerHTML='<tr><td colspan="6"><div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><div class="empty-text">No hay pedidos</div></div></td></tr>';renderTablePagination('orders-pagination',0,1,'setOrdersPage');return;}var totalPg=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(ordersPage>totalPg)ordersPage=totalPg;var pageRows=f.slice((ordersPage-1)*PAGE_SIZE,ordersPage*PAGE_SIZE);var rows='';pageRows.forEach(function(o){var c=esc(o.customer_name)||'—';if(o.customer_phone)c+='<br><small style="color:var(--muted)">'+esc(o.customer_phone)+'</small>';if(o.delivery_address)c+='<br><small style="color:var(--muted)">📍 '+esc(o.delivery_address)+'</small>';if(o.table_number)c+='<br><small style="color:var(--muted)">Mesa '+esc(o.table_number)+'</small>';if(o.pickup_time)c+='<br><small style="color:var(--muted)">⏱ '+esc(o.pickup_time)+'</small>';var it='';if(o.items&&Array.isArray(o.items))it=o.items.map(function(i){return'<strong>'+esc(i.qty)+'x</strong> '+esc(i.name);}).join('<br>');var sts=['pending','confirmed','preparing','ready','delivered','cancelled'];var sel='<select class="status-select" onchange="updateStatus(\''+esc(o.id)+'\',this.value)">';sts.forEach(function(s){sel+='<option value="'+s+'"'+(s===o.status?' selected':'')+'>'+statusLabel(s)+'</option>';});sel+='</select>';var suc=(sucursalFilter==='all'&&o.sucursal)?'<span class="suc-badge suc-'+esc(o.sucursal)+'">'+esc(o.sucursal)+'</span>':'';rows+='<tr><td style="white-space:nowrap">'+fTime(o.created_at)+'<br><small style="color:var(--muted)">'+new Date(o.created_at).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})+'</small></td><td><span class="otype '+esc(o.order_type)+'">'+esc(typeLabel(o.order_type))+'</span>'+suc+'</td><td>'+c+'</td><td><div class="items-list">'+it+'</div></td><td style="white-space:nowrap;font-family:\'Space Grotesk\',sans-serif;font-variant-numeric:tabular-nums;font-weight:700;font-size:.95rem;color:var(--gold)">'+fMoney(o.total)+'</td><td>'+sel+'</td></tr>';});body.innerHTML=rows;renderTablePagination('orders-pagination',f.length,ordersPage,'setOrdersPage');}

async function updateStatus(id,st){var{error}=await sb.from('orders').update({status:st}).eq('id',id);if(error){alert('Error');return;}var o=allOrders.find(function(x){return x.id===id;});if(o)o.status=st;renderAll();}

function renderLeads(){var f=filterByDate(allLeads);var sf=document.getElementById('filter-source').value;if(sf!=='all')f=f.filter(function(l){return l.source===sf;});var body=document.getElementById('leads-body');if(f.length===0){body.innerHTML='<tr><td colspan="5"><div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="empty-text">No hay leads</div></div></td></tr>';renderTablePagination('leads-pagination',0,1,'setLeadsPage');return;}var totalPg=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(leadsPage>totalPg)leadsPage=totalPg;var pageRows=f.slice((leadsPage-1)*PAGE_SIZE,leadsPage*PAGE_SIZE);var rows='';pageRows.forEach(function(l){rows+='<tr><td style="white-space:nowrap">'+fDate(l.created_at)+'</td><td>'+(esc(l.name)||'—')+'</td><td>'+(esc(l.phone)||'—')+'</td><td>'+(esc(l.email)||'—')+'</td><td><span class="otype recoger">'+(esc(l.source)||'bar')+'</span></td></tr>';});body.innerHTML=rows;renderTablePagination('leads-pagination',f.length,leadsPage,'setLeadsPage');}

function renderAnalytics(){var orders=filterByDate(allOrders);var active=orders.filter(function(o){return o.status!=='cancelled';});var cancelled=orders.filter(function(o){return o.status==='cancelled';});var leads=filterByDate(allLeads);var cr=leads.length>0&&active.length>0?Math.round(active.length/leads.length*100):0;document.getElementById('a-conversion').textContent=cr+'%';var phones={};active.forEach(function(o){if(o.customer_phone)phones[o.customer_phone]=(phones[o.customer_phone]||0)+1;});document.getElementById('a-repeat').textContent=Object.values(phones).filter(function(c){return c>=2;}).length;var ti=0;active.forEach(function(o){if(o.items&&Array.isArray(o.items))o.items.forEach(function(i){ti+=(i.qty||1);});});document.getElementById('a-avg-items').textContent=active.length>0?(ti/active.length).toFixed(1):'0';document.getElementById('a-cancel-rate').textContent=orders.length>0?Math.round(cancelled.length/orders.length*100)+'%':'0%';
var wd=[0,0,0,0,0,0,0];var wl=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];active.forEach(function(o){wd[new Date(o.created_at).getDay()]+=Number(o.total);});var c1=document.getElementById('chart-weekday');if(chartWeekday)chartWeekday.destroy();chartWeekday=new Chart(c1,{type:'bar',data:{labels:wl,datasets:[{data:wd,backgroundColor:wd.map(function(v,i){return i===5||i===6?'rgba(242,107,29,.5)':'rgba(201,162,77,.4)';}),borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},callback:function(v){return'$'+v.toLocaleString();}},grid:{color:'rgba(8,20,27,.06)'}}}}});
var bk={'$0-100':0,'$101-200':0,'$201-300':0,'$301-500':0,'$500+':0};active.forEach(function(o){var t=Number(o.total);if(t<=100)bk['$0-100']++;else if(t<=200)bk['$101-200']++;else if(t<=300)bk['$201-300']++;else if(t<=500)bk['$301-500']++;else bk['$500+']++;});var c2=document.getElementById('chart-ticket');if(chartTicket)chartTicket.destroy();chartTicket=new Chart(c2,{type:'bar',data:{labels:Object.keys(bk),datasets:[{data:Object.values(bk),backgroundColor:'rgba(139,92,246,.4)',borderColor:'#8B5CF6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#59707a',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#59707a',font:{size:9},stepSize:1},grid:{color:'rgba(8,20,27,.06)'}}}}});}

function renderProducts(){var orders=filterByDate(allOrders).filter(function(o){return o.status!=='cancelled';});var items={};orders.forEach(function(o){if(o.items&&Array.isArray(o.items))o.items.forEach(function(i){var k=i.name;if(!items[k])items[k]={name:k,qty:0,revenue:0};items[k].qty+=(i.qty||1);items[k].revenue+=(i.qty||1)*(i.price||0);});});var sorted=Object.values(items).sort(function(a,b){return b.qty-a.qty;});var el=document.getElementById('top-products');if(sorted.length===0){el.innerHTML='<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><div class="empty-text">Sin datos aún</div></div>';return;}var h='';sorted.slice(0,20).forEach(function(it,i){h+='<div class="top-item"><div class="top-rank">'+(i+1)+'</div><div class="top-name">'+esc(it.name)+'</div><div class="top-qty">×'+esc(it.qty)+'</div><div class="top-rev">'+fMoney(it.revenue)+'</div></div>';});el.innerHTML=h;}

function viewSuffix(){return viewMode==='custom'&&customDate?customDate:viewMode;}
function exportOrders(){var f=filterByDate(allOrders);var csv='Fecha,Sucursal,Tipo,Cliente,Telefono,Direccion,Mesa,HoraRecogida,Items,Total,Status\n';f.forEach(function(o){var it=o.items?o.items.map(function(i){return i.qty+'x '+i.name;}).join(' | '):'';csv+=[fDate(o.created_at),o.sucursal,o.order_type,o.customer_name,o.customer_phone,o.delivery_address,o.table_number,o.pickup_time,it,o.total,o.status].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_pedidos_'+viewSuffix()+'_'+sucursalFilter+'.csv');}
function exportLeads(){var f=filterByDate(allLeads);var csv='Fecha,Sucursal,Nombre,Telefono,Email,Fuente\n';f.forEach(function(l){csv+=[fDate(l.created_at),l.sucursal,l.name,l.phone,l.email,l.source].map(csvCell).join(',')+'\n';});downloadCSV(csv,'anastacio_leads_'+viewSuffix()+'_'+sucursalFilter+'.csv');}
function downloadCSV(csv,fn){var b=new Blob([csv],{type:'text/csv;charset=utf-8;'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;a.click();}

function setupRealtime(){sb.channel('admin-rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},function(p){var rng=getCurrentRange();var when=new Date(p.new.created_at);if(when<rng.start||when>=rng.end)return;if(sucursalFilter!=='all'&&p.new.sucursal!==sucursalFilter){loadAll();return;}var suc=p.new.sucursal?' ['+p.new.sucursal.toUpperCase()+']':'';showNotification('Nuevo pedido'+suc+' — '+typeLabel(p.new.order_type)+' — '+fMoney(p.new.total));loadAll();}).on('postgres_changes',{event:'INSERT',schema:'public',table:'leads'},function(p){var rng=getCurrentRange();var when=new Date(p.new.created_at);if(when<rng.start||when>=rng.end)return;loadAll();}).subscribe();}
// Polling consciente de visibilidad: solo con sesión activa y pestaña visible.
// Realtime ya recarga al instante ante pedidos nuevos; esto es la red de seguridad.
var POLL_MS=30000;
function isLoggedIn(){return document.body.classList.contains('logged-in');}
setInterval(function(){if(!isLoggedIn()||document.hidden)return;if(Date.now()-_lastLoadAt<POLL_MS-2000)return;loadAll();},POLL_MS);
document.addEventListener('visibilitychange',function(){if(!document.hidden&&isLoggedIn()&&Date.now()-_lastLoadAt>5000)loadAll();});

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
