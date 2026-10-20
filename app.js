"use strict";
// Dashboard CEO: đọc data.json (sinh từ Excel bằng tools/excel_to_json.py), tính các chỉ tiêu suy ra và vẽ trang.
// data.json chỉ chứa số gốc; lũy kế, AUM, Δ, bình quân, tổng toàn công ty… đều tính ở đây.
(function(){
const COMPANY='Toàn công ty';
const PKKH_LABELS=['Dormant','Mass','Active Trader','HVT','HNW','UHNW','Block Deal (BD)','Zero','Unclassified','Other'];
const AVG_WINDOW=5;

// ---------- định dạng ----------
const isNum=Number.isFinite;
function fmt(n,d=0){return n===null||n===undefined||Number.isNaN(n)?"—":new Intl.NumberFormat("vi-VN",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function signed(n,d=0,suffix=''){return n===null||n===undefined||Number.isNaN(n)?'—':`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n,d)}${suffix}</span>`}
function pct(n,d=1){return n===null||n===undefined||Number.isNaN(n)?'—':fmt(n,d)+'%'}
function change(n){return n===null||n===undefined?"—":`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n)}</span>`}
function net(n){return n===null||n===undefined?"—":`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n,Math.abs(n)<1?3:0)}</span>`}
const tone=n=>isNum(n)?n>0?'up':n<0?'down':'neutral':'neutral';
const arrow=n=>isNum(n)?n>0?'↑ ':n<0?'↓ ':'':'';
const absFmt=(n,d=0)=>isNum(n)?fmt(Math.abs(n),d):'—';
const plainPct=(n,d=1)=>isNum(n)?(n>0?'+':'')+fmt(n,d)+'%':'—%';
const minusFmt=(n,d=0)=>isNum(n)?(n<0?'−':n>0?'+':'')+fmt(Math.abs(n),d):'—';

// ---------- số học trên chuỗi có ô trống ----------
const sumOf=a=>{const v=(a||[]).filter(isNum);return v.length?v.reduce((x,y)=>x+y,0):null};
const avgOf=a=>{const v=(a||[]).filter(isNum);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null};
const lastOf=a=>a&&a.length?a[a.length-1]:null;
const prevOf=a=>a&&a.length>1?a[a.length-2]:null;
const sub=(a,b)=>isNum(a)&&isNum(b)?a-b:null;
const growth=(changeValue,current)=>isNum(changeValue)&&isNum(current)&&current-changeValue!==0?changeValue/(current-changeValue)*100:null;
const trimTail=a=>{if(!a)return a;let n=a.length;while(n&&!isNum(a[n-1]))n--;return a.slice(0,n)};
const allFinite=a=>Array.isArray(a)&&a.length>0&&a.every(isNum);
const lastN=(a,n)=>{const v=(a||[]).filter(isNum);return v.length>=n?v.slice(-n):null};

// ---------- ngày ----------
const dm=iso=>iso?`${iso.slice(8,10)}/${iso.slice(5,7)}`:'—/—';
const dmy=iso=>iso?`${dm(iso)}/${iso.slice(0,4)}`:'—/—/—';

function showError(message){
 const box=document.createElement('div');box.className='data-error';box.setAttribute('role','alert');
 box.textContent=message;document.body.appendChild(box);
}

// Trang tools/import.html để dữ liệu chưa lưu ở localStorage và mở index.html?preview=1.
function previewData(){
 if(!new URLSearchParams(location.search).has('preview'))return null;
 try{const text=localStorage.getItem('shs-dashboard-preview');return text?JSON.parse(text):null}catch{return null}
}
function showPreviewBanner(raw){
 const bar=document.createElement('div');bar.setAttribute('role','status');
 bar.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:30;padding:8px 16px;border-radius:999px;background:#f26a21;color:#fff;font:600 13px "Segoe UI",Arial,sans-serif;box-shadow:0 6px 20px #1b315040';
 bar.textContent=`XEM TRƯỚC · ${raw.tu_file||'dữ liệu chưa lưu'} · chưa ghi vào data.json`;
 document.body.appendChild(bar);
}

async function boot(){
 let raw=previewData();
 if(raw)showPreviewBanner(raw);
 else try{
  const res=await fetch('data.json',{cache:'no-cache'});
  if(!res.ok)throw new Error('HTTP '+res.status);
  raw=await res.json();
 }catch(err){
  showError(`Không tải được data.json (${err.message}). Chạy trang qua máy chủ tĩnh (ví dụ: python -m http.server) và kiểm tra file data.json ở thư mục gốc.`);
  return;
 }
 let model;
 try{model=buildModel(raw)}catch(err){showError('data.json không đúng định dạng: '+err.message);console.error(err);return}
 renderStatic(model);
 document.documentElement.classList.add('data-ready');
 init(model);
}

// =====================================================================
// Model: data.json (bảng gốc) → các đối tượng phục vụ hiển thị
// =====================================================================
function buildModel(raw){
 const meta=raw.thong_tin||{};
 if(!meta.ngay_bao_cao)throw new Error('thiếu thong_tin.ngay_bao_cao');
 const reportIso=meta.ngay_bao_cao;
 const unitDefs=(raw.don_vi||[]).map(u=>({name:u.ten_don_vi,channel:u.kenh||'MG'}));
 const daily=(raw.ngay||[]).filter(r=>r.ngay<=reportIso&&r.ngay.slice(0,7)===reportIso.slice(0,7));
 const isoDates=[...new Set(daily.map(r=>r.ngay))].sort();
 const cell={};for(const r of daily)(cell[r.don_vi]||(cell[r.don_vi]={}))[r.ngay]=r;
 const col=(unit,field,upTo)=>isoDates.filter(d=>!upTo||d<=upTo).map(d=>{const v=cell[unit]?.[d]?.[field];return isNum(v)?v:null});
 const byUnit=(rows,key='don_vi')=>{const m={};for(const r of rows||[])m[r[key]??'']=r;return m};
 const ky=byUnit(raw.ky),kh=byUnit(raw.kh);

 const seriesOf=unit=>{
  const s={open:col(unit,'kh_mo_moi'),gtgd:col(unit,'gtgd'),fee:col(unit,'phi_net'),share:col(unit,'thi_phan_ngay'),shareAvg:col(unit,'thi_phan_bq_luy_ke'),debt:col(unit,'du_no'),nav:col(unit,'nav'),cash:col(unit,'nap_rut_rong'),market:col(unit,'gtgd_thi_truong')};
  s.aum=s.nav.map((v,i)=>isNum(v)&&isNum(s.debt[i])?v+s.debt[i]:null);
  return s;
 };
 const exchanges=k=>({HOSE:k.thi_phan_hose??null,HNX:k.thi_phan_hnx??null,UPCOM:k.thi_phan_upcom??null});
 const exchangeChanges=k=>({HOSE:sub(k.thi_phan_hose,k.thi_phan_hose_cung_ky),HNX:sub(k.thi_phan_hnx,k.thi_phan_hnx_cung_ky),UPCOM:sub(k.thi_phan_upcom,k.thi_phan_upcom_cung_ky)});
 const debtParts=k=>({margin:k.du_no_margin??null,advance:k.du_no_ung_truoc??null,thirdParty:k.du_no_3_ben??null});

 // ----- nhân sự theo phòng -----
 const deptRows=raw.phong||[];
 const sumField=(rows,f)=>{const v=rows.map(r=>r[f]).filter(isNum);return v.length?v.reduce((a,b)=>a+b,0):null};
 const sumComplete=(rows,f)=>rows.length&&rows.every(r=>isNum(r[f]))?rows.reduce((a,r)=>a+r[f],0):null;
 const staffIso=meta.ngay_chot_nhan_su;
 const resourcesOf=rows=>{
  if(!rows.length)return {};
  const mg=sumField(rows,'so_mg'),ctv=sumField(rows,'so_ctv'),mgPrior=sumComplete(rows,'so_mg_ky_truoc'),ctvPrior=sumComplete(rows,'so_ctv_ky_truoc');
  const feeTotalMg=sumField(rows,'dtpn_mg'),feeTotalCtv=sumField(rows,'dtpn_ctv'),feeTotalUnclassified=sumField(rows,'dtpn_chua_phan_loai');
  return {mg,ctv,other:sumField(rows,'so_khac'),mgPrior,ctvPrior,mgChange:sub(mg,mgPrior),ctvChange:sub(ctv,ctvPrior),feeTotalMg,feeTotalCtv,feeTotalUnclassified,
   feeTotalCombined:sumOf([feeTotalMg,feeTotalCtv,feeTotalUnclassified])};
 };
 const department=r=>{
  const feeMtd=sumOf([r.dtpn_mg,r.dtpn_ctv,r.dtpn_chua_phan_loai]),feeChange=sub(feeMtd,r.dtpn_cung_ky);
  return {id:r.ma_phong,name:r.ten_phong,head:r.truong_phong||null,unassigned:Boolean(r.chua_phan_phong),mg:r.so_mg??null,ctv:r.so_ctv??null,other:r.so_khac??null,
   mgChange:sub(r.so_mg,r.so_mg_ky_truoc),ctvChange:sub(r.so_ctv,r.so_ctv_ky_truoc),feeMtd,feeChange,growthPct:growth(feeChange,feeMtd),debtAvg:r.du_no_bq??null,
   feeTotalMg:r.dtpn_mg??null,feeTotalCtv:r.dtpn_ctv??null,feeAvgMg:r.so_mg>0&&isNum(r.dtpn_mg)?r.dtpn_mg/r.so_mg:null,feeAvgCtv:r.so_ctv>0&&isNum(r.dtpn_ctv)?r.dtpn_ctv/r.so_ctv:null,
   gtgdMtd:r.gtgd_thang??null,nav:r.nav??null,newMtd:r.kh_mo_moi??null,newFunded:r.kh_moi_nop_tien??null,newMatched:r.kh_moi_khop_lenh??null,
   oldCustomers:r.kh_cu??null,oldMatched:r.kh_cu_khop_lenh??null,purchasingPower:r.suc_mua??null};
 };

 // ----- toàn công ty -----
 const cs=seriesOf(COMPANY),ck=ky[COMPANY]||{};
 const gtgdMonth=sumOf(cs.gtgd),feeMonth=sumOf(cs.fee),shareMonth=lastOf(cs.shareAvg);
 const companyResources=resourcesOf(deptRows);
 const openToStaff=sumOf(col(COMPANY,'kh_mo_moi',staffIso));
 const company={
  openMonth:sumOf(cs.open),openDay:lastOf(cs.open),
  gtgdDay:lastOf(cs.gtgd),gtgdChange:sub(lastOf(cs.gtgd),prevOf(cs.gtgd)),gtgdMonth,gtgdMonthChange:sub(gtgdMonth,ck.gtgd_cung_ky),
  feeDay:lastOf(cs.fee),feeChange:sub(lastOf(cs.fee),prevOf(cs.fee)),feeMonth,feeMonthChange:sub(feeMonth,ck.phi_cung_ky),
  shareDay:lastOf(cs.share),shareDayChange:sub(lastOf(cs.share),prevOf(cs.share)),shareMonth,sharePlan:ck.thi_phan_ke_hoach??null,shareMonthChange:sub(shareMonth,ck.thi_phan_cung_ky),
  exchangeShares:exchanges(ck),exchangeChanges:exchangeChanges(ck),
  nav:lastOf(cs.nav),navChange:sub(lastOf(cs.nav),prevOf(cs.nav)),debt:lastOf(cs.debt),debtChange:sub(lastOf(cs.debt),prevOf(cs.debt)),debtStartChange:sub(lastOf(cs.debt),cs.debt[0]),
  aum:lastOf(cs.aum),aumChange:sub(lastOf(cs.aum),prevOf(cs.aum)),debtAvgMonth:avgOf(cs.debt),debtComponents:debtParts(ck),
  cashIn:ck.tien_nap??null,cashOut:ck.tien_rut??null,cashInCount:ck.so_kh_nap??null,cashOutCount:ck.so_kh_rut??null,cashNet:lastOf(cs.cash),cashNetMonth:allFinite(cs.cash)?sumOf(cs.cash):null,
  marketDay:lastOf(cs.market),marketChange:sub(lastOf(cs.market),prevOf(cs.market)),
  resourceBenchmarks:{mg:companyResources.mg,ctv:companyResources.ctv,feeTotalMg:companyResources.feeTotalMg,feeTotalCtv:companyResources.feeTotalCtv,
   feeAvgMg:companyResources.mg>0&&isNum(companyResources.feeTotalMg)?companyResources.feeTotalMg/companyResources.mg:null,
   feeAvgCtv:companyResources.ctv>0&&isNum(companyResources.feeTotalCtv)?companyResources.feeTotalCtv/companyResources.ctv:null,
   newAvgMg:companyResources.mg>0&&isNum(openToStaff)?openToStaff/companyResources.mg:null}
 };
 const unmapped=resourcesOf(deptRows.filter(r=>!r.don_vi));
 const org={snapshot:{mg:companyResources.mg,ctv:companyResources.ctv,other:companyResources.other},prior:{mg:companyResources.mgPrior,ctv:companyResources.ctvPrior},unmapped};

 // ----- đơn vị -----
 const units=unitDefs.map(def=>{
  const s=seriesOf(def.name),k=ky[def.name]||{},rows=deptRows.filter(r=>r.don_vi===def.name);
  const mtd=sumOf(s.gtgd),feeMtd=sumOf(s.fee),fee=lastOf(s.fee),feeChange=sub(feeMtd,k.phi_cung_ky),share=lastOf(s.shareAvg);
  const feeLast=lastN(s.fee,AVG_WINDOW),feeAvg5=feeLast?avgOf(feeLast):null;
  const u={name:def.name,channel:def.channel,
   gtgd:lastOf(s.gtgd),change:sub(lastOf(s.gtgd),prevOf(s.gtgd)),mtd,gtgdMonthChange:sub(mtd,k.gtgd_cung_ky),
   fee,feeMtd,feeChange,growthPct:growth(feeChange,feeMtd),feeAvg5,momentum:feeAvg5>0&&isNum(fee)?(fee/feeAvg5-1)*100:null,
   share,sharePlan:k.thi_phan_ke_hoach??null,shareMonthChange:sub(share,k.thi_phan_cung_ky),exchangeShares:exchanges(k),exchangeShareChanges:exchangeChanges(k),
   debt:lastOf(s.debt),nav:lastOf(s.nav),aum:lastOf(s.aum),debtAvgMonth:avgOf(s.debt),debtComponents:debtParts(k),
   cashIn:k.tien_nap??null,cashOut:k.tien_rut??null,inCount:k.so_kh_nap??null,outCount:k.so_kh_rut??null,net:lastOf(s.cash),
   cashNetMonth:allFinite(s.cash)?sumOf(s.cash):null,internalTransferMonth:k.dieu_chuyen_noi_bo??null,
   gtgdSeries:trimTail(s.gtgd),feeSeries:trimTail(s.fee),openSeries:trimTail(s.open),debtSeries:trimTail(s.debt),navSeries:trimTail(s.nav),aumSeries:trimTail(s.aum),shareDaySeries:trimTail(s.share),
   newMtd:sumOf(s.open),newMtdAt12:sumOf(col(def.name,'kh_mo_moi',staffIso)),feeMtdAtStaff:sumOf(col(def.name,'phi_net',staffIso)),customerCount:kh[def.name]?.tong_kh??null,
   resources:resourcesOf(rows),departments:rows.map(department)};
  u.resources.newAvgMg=u.resources.mg>0&&isNum(u.newMtdAt12)?u.newMtdAt12/u.resources.mg:null;
  return u;
 });

 // ----- KH & luồng KH mới -----
 const khIso=meta.ngay_chot_kh||reportIso;
 const flowOf=(unit,row)=>({total:row?.tong_kh??null,opened:sumOf(col(unit,'kh_mo_moi',khIso)),day:cell[unit]?.[khIso]?.kh_mo_moi??null,
  funded:row?.kh_moi_nop_tien??null,matched:row?.kh_moi_khop_lenh??null,nav:row?.nav_kh_moi??null,debt:row?.du_no_kh_moi??null,gtgd:row?.gtgd_kh_moi??null,fee:row?.phi_kh_moi??null});
 const flowUnits=Object.fromEntries(unitDefs.map(u=>[u.name,flowOf(u.name,kh[u.name])]));
 const flowSum=f=>sumOf(Object.values(flowUnits).map(x=>x[f]));
 const companyFlow=flowOf(COMPANY,null);
 const customerFlow={asOf:dmy(khIso),source:meta.nguon_kh||'dữ liệu KH',units:flowUnits,
  all:{total:flowSum('total'),opened:companyFlow.opened??flowSum('opened'),day:companyFlow.day??flowSum('day'),funded:flowSum('funded'),matched:flowSum('matched'),nav:flowSum('nav'),debt:flowSum('debt'),gtgd:flowSum('gtgd'),fee:flowSum('fee')},
  viaChannel:ch=>sumOf(unitDefs.filter(u=>u.channel===ch).map(u=>flowUnits[u.name].opened))};

 // ----- nhãn A–D -----
 const groupFields={baseCount:'so_kh_chot',count:'so_kh_hien_tai',matchedMtd:'kh_khop_thang',navCurrent:'nav_hien_tai',navPreviousAverage:'nav_bq_thang_truoc',cashCurrent:'tien_mat_hien_tai',cashPreviousAverage:'tien_mat_bq_thang_truoc',gtgdMtd:'gtgd_luy_ke',gtgdPreviousMonth:'gtgd_thang_truoc',feeMtd:'phi_luy_ke',feePreviousMonth:'phi_thang_truoc',matchedWeek:'kh_khop_tuan',gtgdWeek:'gtgd_tuan',feeWeek:'phi_tuan'};
 const centers={};
 for(const r of raw.abcd||[]){
  const c=centers[r.don_vi]||(centers[r.don_vi]={asOf:dmy(meta.ngay_hieu_qua_abcd),groups:{},navNegativeOverlap:null});
  if(r.nhom==='NAV_AM'){c.navNegativeOverlap=r.so_kh_hien_tai??null;continue}
  c.groups[r.nhom]=Object.fromEntries(Object.entries(groupFields).map(([k,f])=>[k,r[f]??null]));
 }
 const centerList=Object.values(centers);
 const cohort={centers,company:centerList.length?{asOf:dmy(meta.ngay_hieu_qua_abcd),navNegativeOverlap:sumOf(centerList.map(c=>c.navNegativeOverlap)),
  groups:Object.fromEntries(['A','B','C','D'].map(g=>[g,Object.fromEntries(Object.keys(groupFields).map(k=>[k,sumOf(centerList.map(c=>c.groups[g]?.[k]))]))]))}:null};

 // ----- PKKH -----
 const pkkhFields={count:'so_kh',matched:'kh_khop_thang',navCurrent:'nav_hien_tai',navPrevious:'nav_bq_thang_truoc',debtCurrent:'du_no_hien_tai',debtPrevious:'du_no_bq_thang_truoc',tradeMtd:'gtgd_luy_ke',tradePrevious:'gtgd_thang_truoc',feeMtd:'phi_luy_ke',feePrevious:'phi_thang_truoc'};
 const pkkhValues={all:{}};
 for(const r of raw.pkkh||[]){
  const item=Object.fromEntries(Object.entries(pkkhFields).map(([k,f])=>[k,r[f]??0]));
  (pkkhValues[r.don_vi]||(pkkhValues[r.don_vi]={}))[r.phan_khuc]=item;
  const total=pkkhValues.all[r.phan_khuc]||(pkkhValues.all[r.phan_khuc]=Object.fromEntries(Object.keys(pkkhFields).map(k=>[k,0])));
  for(const k of Object.keys(pkkhFields))total[k]+=item[k];
 }
 const pkkh={fields:Object.keys(pkkhFields),labels:PKKH_LABELS,values:pkkhValues,
  units:unitDefs.filter(u=>pkkhValues[u.name]).map(u=>({key:u.name,label:u.name})),hasData:(raw.pkkh||[]).length>0};

 // ----- nhãn ngày -----
 const month=Number(reportIso.slice(5,7)),year=Number(reportIso.slice(0,4)),prevMonth=month===1?12:month-1;
 const lastDay=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
 const first=isoDates[0];
 const D={report:dm(reportIso),reportFull:dmy(reportIso),reportDots:reportIso.split('-').reverse().join('.'),reportSpaced:dmy(reportIso).replaceAll('/',' / '),
  first:dm(first),range:`${first?first.slice(8,10):'—'}–${dm(reportIso)}`,rangeFull:`${first?first.slice(8,10):'—'}–${dmy(reportIso)}`,sessions:isoDates.length,
  month,prevMonth,T:'T'+month,Tp:'T'+prevMonth,label:dm(meta.ngay_gan_nhan),labelFull:dmy(meta.ngay_gan_nhan),abcd:dm(meta.ngay_hieu_qua_abcd),
  week:`${meta.abcd_tuan_tu_ngay?meta.abcd_tuan_tu_ngay.slice(8,10):'—'}–${dm(meta.ngay_hieu_qua_abcd)}`,pkkh:dm(meta.ngay_hieu_qua_pkkh),
  staff:dm(staffIso),staffFull:dmy(staffIso),staffPrior:dm(meta.ngay_nhan_su_ky_truoc),kh:dm(khIso),khFull:dmy(khIso),nextLabel:dm(lastDay),monthStart:`01/${String(month).padStart(2,'0')}`};

 return {raw,meta,D,dates:isoDates.map(dm),company,series:cs,units,org,customerFlow,cohort,pkkh};
}

// =====================================================================
// Phần tĩnh của template (các ô "—")
// =====================================================================
function renderStatic(M){
 const {D,company:c,units,meta}=M;
 const $=s=>document.querySelector(s);
 const setHTML=(s,html)=>{const el=$(s);if(el)el.innerHTML=html};
 const setText=(s,text)=>{const el=$(s);if(el)el.textContent=text};
 const avgWindow=a=>{const v=lastN(a,AVG_WINDOW);return v?avgOf(v):null};

 document.title=`SHS | Kết quả tháng & Daily CEO · ${D.reportDots}`;
 document.querySelector('meta[name="description"]')?.setAttribute('content',`Demo báo cáo daily CEO SHS, dữ liệu kinh doanh ${D.reportFull}.`);
 setHTML('.header-meta .date',`<span>Dữ liệu</span> ${D.reportSpaced}`);

 // ----- Kết quả tháng -----
 const shareGap=sub(c.shareMonth,c.sharePlan),targetMax=Math.max(c.sharePlan||0,c.shareMonth||0,.01)*1.1;
 const gtgdAvg=avgWindow(M.series.gtgd),feeAvg=avgWindow(M.series.fee),debtAvg5=avgWindow(M.series.debt);
 const gtgdVsAvg=gtgdAvg>0&&isNum(c.gtgdDay)?(c.gtgdDay/gtgdAvg-1)*100:null,feeVsAvg=feeAvg>0&&isNum(c.feeDay)?(c.feeDay/feeAvg-1)*100:null;
 const marketGrowth=growth(c.marketChange,c.marketDay),gtgdGrowth=growth(c.gtgdMonthChange,c.gtgdMonth),feeGrowth=growth(c.feeMonthChange,c.feeMonth);
 const exchangeRow=e=>`<div class="exchange-row"><span class="exchange-name">${e}</span><strong>${fmt(c.exchangeShares[e],2)}<span>%</span></strong><div class="exchange-comparison"><b class="${tone(c.exchangeChanges[e])}">${arrow(c.exchangeChanges[e])}${absFmt(c.exchangeChanges[e],2)} điểm %</b><small>so tháng trước</small></div></div>`;
 setHTML('.month-section',`<div class="band-heading"><h2 id="month-title">Kết quả tháng ${D.month}</h2><span>${D.rangeFull} · ${D.sessions} phiên có dữ liệu</span></div>
   <div class="executive-grid">
    <article class="executive-card market-hero"><div class="executive-card-title"><h3>Thị phần giao dịch · BQ tháng</h3><span class="priority-label">TOÀN CÔNG TY</span></div><div class="market-hero-grid"><div class="market-total"><div class="hero-value">${fmt(c.shareMonth,2)}<span>%</span></div><div class="hero-gap ${tone(shareGap)}">${minusFmt(shareGap,2)} <span>điểm % so kế hoạch</span></div><div class="hero-prior">${arrow(c.shareMonthChange)}${absFmt(c.shareMonthChange,2)} điểm % so cùng kỳ tháng trước*</div><div class="hero-target" role="img" aria-label="Thị phần tháng ${fmt(c.shareMonth,2)} phần trăm, kế hoạch ${fmt(c.sharePlan,2)} phần trăm"><div class="target-labels"><span>Thực hiện <strong>${pct(c.shareMonth,2)}</strong></span><span>Kế hoạch <strong>${pct(c.sharePlan,2)}</strong></span></div><div class="target-track"><div class="target-fill" style="width:${isNum(c.shareMonth)?(c.shareMonth/targetMax*100).toFixed(2):0}%"></div>${c.sharePlan>0?`<div class="target-marker" style="left:${(c.sharePlan/targetMax*100).toFixed(2)}%"></div>`:''}</div></div></div><div class="exchange-shares"><div class="exchange-heading">THỊ PHẦN TRÊN TỪNG SÀN <span>· BQ tháng</span></div>${['HOSE','HNX','UPCOM'].map(exchangeRow).join('')}</div></div><div class="share-trend"><div class="executive-chart-title"><span>Thị phần giao dịch · ${D.range}</span><span class="share-chart-legend"><span><i class="share-legend-day"></i>Từng ngày</span><span><i class="share-legend-average"></i>BQ lũy kế</span></span></div><div id="share-chart" class="mini-chart" data-mini="share" data-density="share-compact"></div><div id="share-chart-detail" class="chart-detail" aria-live="polite"></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${pct(c.shareDay,2)}</strong></span><span class="${tone(c.shareDayChange)}">${arrow(c.shareDayChange)}${absFmt(c.shareDayChange,2)} điểm % / phiên trước</span></div></article>
    <article class="executive-card trading-primary"><div class="executive-card-title"><h3>Giá trị giao dịch SHS · tháng</h3></div><div class="executive-value">${fmt(c.gtgdMonth)} <span>tỷ đồng</span></div><div class="executive-delta ${tone(c.gtgdMonthChange)}">${arrow(c.gtgdMonthChange)}${absFmt(c.gtgdMonthChange)} tỷ · ${plainPct(gtgdGrowth)} cùng kỳ*</div><div class="executive-trend"><div class="executive-chart-title"><span>Nhịp GTGD theo phiên</span><span>Tỷ đồng</span></div><div id="gtgd-chart" class="mini-chart" data-mini="gtgd" data-density="compact"></div><div id="gtgd-chart-detail" class="chart-detail" aria-live="polite"></div><div class="executive-chart-note"><span>${D.range} · nét đứt: BQ ${AVG_WINDOW} phiên</span><strong>BQ ${fmt(gtgdAvg,1)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${fmt(c.gtgdDay)} tỷ</strong></span><span class="${tone(c.gtgdChange)}">${arrow(c.gtgdChange)}${absFmt(c.gtgdChange)} tỷ / phiên trước*</span><small>So BQ ${AVG_WINDOW} phiên <strong class="${tone(gtgdVsAvg)}">${plainPct(gtgdVsAvg)}</strong> · thị trường hôm nay <strong class="${tone(marketGrowth)}">${plainPct(marketGrowth)}</strong></small></div><div class="fee-support" aria-label="Phí net bổ sung cho giá trị giao dịch"><div class="fee-support-month"><span>Phí net · lũy kế tháng</span><strong>${fmt(isNum(c.feeMonth)?c.feeMonth/1000:null,2)} <small>tỷ đồng</small></strong><span class="${tone(c.feeMonthChange)}">${arrow(c.feeMonthChange)}${absFmt(c.feeMonthChange)} triệu · ${plainPct(feeGrowth)} cùng kỳ*</span></div><div class="fee-support-day"><span>Hôm nay <strong>${fmt(c.feeDay,2)} triệu</strong></span><span class="${tone(c.feeChange)}">${arrow(c.feeChange)}${absFmt(c.feeChange)} triệu / phiên trước*</span><span>So BQ ${AVG_WINDOW} phiên <strong class="${tone(feeVsAvg)}">${plainPct(feeVsAvg)}</strong></span></div></div></article>
    <article class="executive-card debt-primary"><div class="executive-card-title"><h3>Dư nợ · BQ tháng</h3></div><div class="executive-value">${fmt(c.debtAvgMonth)} <span>tỷ đồng</span></div><div class="executive-delta neutral">Bình quân ${D.sessions} phiên có dữ liệu · ${D.range}</div><div class="executive-trend"><div class="executive-chart-title"><span>Dư nợ cuối ngày theo phiên</span><span>Tỷ đồng</span></div><div id="debt-chart" class="mini-chart" data-mini="debt" data-density="compact"></div><div id="debt-chart-detail" class="chart-detail" aria-live="polite"></div><div class="executive-chart-note"><span>${D.range} · nét đứt: BQ ${AVG_WINDOW} phiên</span><strong>BQ ${fmt(debtAvg5)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Cuối ngày <strong>${fmt(c.debt)} tỷ</strong></span><span class="${tone(c.debtChange)}">${arrow(c.debtChange)}${absFmt(c.debtChange)} tỷ / phiên trước*</span><small>So ${D.first} <strong class="${tone(c.debtStartChange)}">${minusFmt(c.debtStartChange)} tỷ</strong></small></div><div class="debt-support"><div class="debt-support-title">Cơ cấu dư nợ cuối ngày · tỷ đồng</div><div class="debt-components"><div><span>Margin thuần</span><strong>${fmt(c.debtComponents.margin)}</strong></div><div><span>Ứng trước</span><strong>${fmt(c.debtComponents.advance)}</strong></div><div><span>Dư nợ 3 bên</span><strong>${fmt(c.debtComponents.thirdParty)}</strong></div></div></div></article>
   </div>`);

 // ----- Đóng góp phí & tài sản -----
 const feeUnits=units.filter(u=>isNum(u.feeMtd));
 const feeDrop=[...units].filter(u=>isNum(u.feeChange)).sort((a,b)=>a.feeChange-b.feeChange);
 const spotlight=feeDrop.length?(feeDrop[0].feeChange<0?feeDrop[0]:feeDrop.at(-1)):null;
 setText('.contribution-header span',`Top ${Math.min(5,feeUnits.length)} · triệu đồng`);
 const jump=$('[data-jump]');
 if(jump){if(spotlight){jump.dataset.jump=spotlight.name;jump.textContent=`${spotlight.name}: phí tháng ${spotlight.feeChange<0?'giảm':'tăng'} ${absFmt(spotlight.feeChange)} triệu cùng kỳ →`}else jump.hidden=true}
 const assetStat=(label,value,delta,spark,sparkLabel,extraClass='')=>`<div class="asset-stat${extraClass}"><div class="asset-stat-copy"><div class="asset-stat-label">${label}</div>${value}${delta}</div><div class="asset-spark" data-spark="${spark}" aria-label="${sparkLabel} ${D.range}"></div></div>`;
 setHTML('.asset-overview',`<div class="band-heading"><h2>Tài sản & dòng tiền</h2><span>Tại ${D.report} · trend ${D.sessions} phiên</span></div><div class="asset-overview-grid">
  ${assetStat('NAV tại ngày báo cáo',`<div class="asset-stat-value">${fmt(c.nav)} <span>tỷ</span></div>`,`<div class="asset-stat-delta ${tone(c.navChange)}">${arrow(c.navChange)}${absFmt(c.navChange)} tỷ / phiên trước</div>`,'nav','Xu hướng NAV cuối ngày')}
  ${assetStat('Nạp / rút ròng · lũy kế tháng',`<div class="asset-stat-value ${tone(c.cashNetMonth)}" id="cash-net-month">${minusFmt(c.cashNetMonth)} <span>tỷ</span></div>`,`<div class="asset-stat-delta">Hôm nay <strong class="${tone(c.cashNet)}">${minusFmt(c.cashNet,Math.abs(c.cashNet)<10?2:0)} tỷ</strong>${isNum(c.cashIn)?` · nạp ${fmt(c.cashIn,2)} / rút ${fmt(c.cashOut,2)}`:''}</div>`,'cash','Xu hướng nạp rút ròng theo từng ngày',' cash-stat')}
  ${assetStat('AUM tại ngày báo cáo',`<div class="asset-stat-value">${fmt(c.aum)} <span>tỷ</span></div>`,`<div class="asset-stat-delta ${tone(c.aumChange)}">${arrow(c.aumChange)}${absFmt(c.aumChange)} tỷ / phiên trước</div>`,'aum','Xu hướng AUM cuối ngày',' secondary-stat')}
  </div><div class="asset-trend-note"><span>Cash-in hôm nay: <strong>${fmt(c.cashInCount)} KH</strong></span></div>`);

 // ----- Biến động nổi bật -----
 const pick=(list,dir)=>{const v=list.filter(x=>isNum(x.value)&&Math.sign(x.value)===dir).sort((a,b)=>dir*(b.value-a.value));return v[0]||null};
 const word=(n,up,down)=>n>0?up:n<0?down:'không đổi';
 const unitMove=(field)=>units.map(u=>({name:u.name,value:u[field]}));
 const navMoves=units.map(u=>({name:u.name,value:sub(lastOf(u.navSeries),prevOf(u.navSeries))}));
 const gtgdLead=pick(unitMove('gtgdMonthChange'),Math.sign(c.gtgdMonthChange)||-1),feeLead=pick(unitMove('feeChange'),Math.sign(c.feeMonthChange)||-1);
 const navDown=pick(navMoves,-1),navUp=pick(navMoves,1),cashLead=pick(unitMove('net'),Math.sign(c.cashNet)||-1);
 const bullets=[
  ['Thị phần · BQ tháng',`${pct(c.shareMonth,2)}, ${word(shareGap,'cao hơn','thấp hơn')} kế hoạch ${absFmt(shareGap,2)} điểm % và ${word(c.shareMonthChange,'cao hơn','thấp hơn')} cùng kỳ tháng trước ${absFmt(c.shareMonthChange,2)} điểm %.`],
  ['GTGD & phí · lũy kế',`GTGD ${word(c.gtgdMonthChange,'tăng','giảm')} ${absFmt(c.gtgdMonthChange)} tỷ${gtgdLead?`; ${gtgdLead.name} ${word(gtgdLead.value,'tăng','giảm')} ${absFmt(gtgdLead.value)} tỷ`:''}. Phí net ${word(c.feeMonthChange,'tăng','giảm')} ${absFmt(c.feeMonthChange)} triệu${feeLead?`; ${feeLead.name} ${word(feeLead.value,'tăng','giảm')} ${absFmt(feeLead.value)} triệu`:''} so cùng kỳ.`],
  ['NAV · cuối ngày',`Toàn công ty ${word(c.navChange,'tăng','giảm')} ${absFmt(c.navChange)} tỷ so phiên trước${navDown?`; ${navDown.name} giảm ${absFmt(navDown.value)} tỷ`:''}${navUp?`${navDown?',':';'} ${navUp.name} tăng ${absFmt(navUp.value)} tỷ`:''}.`],
  ['Dòng tiền · lũy kế',`${word(c.cashNetMonth,'Nạp ròng','Rút ròng')} ${absFmt(c.cashNetMonth)} tỷ; ngày ${D.report.slice(0,2)} ${word(c.cashNet,'nạp ròng','rút ròng')} ${absFmt(c.cashNet)} tỷ${cashLead?`, riêng ${cashLead.name} ${word(cashLead.value,'nạp ròng','rút ròng')} ${absFmt(cashLead.value)} tỷ`:''}.`]
 ];
 setHTML('.executive-summary',`<div class="executive-summary-head"><h2 id="executive-summary-title">Biến động nổi bật - hết ngày ${D.report}</h2><span>${D.rangeFull} · số liệu không gồm tự doanh</span></div><ul class="executive-summary-list">${bullets.map(([t,b])=>`<li><strong>${t}</strong>${b}</li>`).join('')}</ul>`);

 // ----- Tab KH -----
 setHTML('.new-cohort-tag',`KH MỚI · THÁNG ${D.month}`);
 setHTML('.cohort-strip .cohort-stat:nth-child(2) .label',`KH mở mới tháng ${D.month} · tách riêng`);
 setHTML('.cohort-strip .cohort-stat.old .label',`KH cũ hiện tại · mở trước ${D.monthStart}`);
 setHTML('.old-block-header strong',`NHÃN KH CŨ THÁNG ${D.month} · CHỐT ${D.label}`);
 $('.segment-matrix')?.setAttribute('aria-label',`Nhãn A–D gán tại ${D.label}; quy mô hiện tại và hiệu quả tháng ${D.month} theo dữ liệu A–D chốt ${D.abcd}`);
 document.querySelectorAll('.matrix-axis').forEach((el,i)=>el.innerHTML=i===0?`NAV ${D.label} ≥ 10 triệu`:`NAV ${D.label} &lt; 10 triệu · gồm NAV âm`);
 document.querySelectorAll('.matrix-row-label').forEach((el,i)=>el.innerHTML=`${i===0?'Có khớp lệnh':'Không khớp lệnh'}<br>tháng ${D.prevMonth}`);
 const tiles={A:['NAV ≥ 10 triệu · đã khớp',`Tháng ${D.month} có khớp`],B:['NAV &lt; 10 triệu · đã khớp',`Tháng ${D.month} có khớp`],C:['NAV ≥ 10 triệu · chưa khớp',`Tháng ${D.month} tái giao dịch`],D:['NAV &lt; 10 triệu · chưa khớp',`Tháng ${D.month} có khớp`]};
 for(const [key,[title,activation]] of Object.entries(tiles)){
  const tile=$(`[data-segment="${key}"]`);if(!tile)continue;
  tile.querySelector('h3').innerHTML=`${title} tháng ${D.prevMonth}`;
  tile.querySelector('.segment-activation').innerHTML=`${activation} <strong>— KH</strong><span>—% của nhóm</span>`;
 }
 const checks=[
  `<strong>Nhãn gốc tại ${D.label}</strong>A–D theo NAV và khớp lệnh tháng ${D.prevMonth}. NAV âm là nhãn chồng trong A–D; không cộng lần hai.`,
  `<strong>So sánh hai kỳ</strong>NAV, tiền mặt: hiện tại / BQ tháng ${D.prevMonth}. GTGD, phí net: lũy kế ${D.T} / cả ${D.Tp}. Quy mô nhóm hiện tại (chốt ${D.abcd}) có thể khác mốc ${D.label}.`,
  `<strong>Đối soát phạm vi</strong>NAV âm là nhãn chồng trong A–D, không cộng thêm. Tổng nhóm hiện tại có thể khác tổng KH cũ ở dữ liệu KH chốt ${D.kh}; hai nguồn khác ngày chốt.`
 ];
 document.querySelectorAll('.cohort-check').forEach((el,i)=>el.innerHTML=checks[i]||'');
 setText('.segmentation-note',`Nhãn gốc chốt ${D.label}; quy mô và hiệu quả hiển thị tại ${D.abcd}. NAV âm là nhãn chồng; tỷ lệ khớp dùng số KH hiện tại của nhóm. Số “riêng giai đoạn” tính từ ${D.week}.`);

 // ----- Tab phân khúc -----
 setHTML('.pkkh-header',`<div><h2>Phân khúc KH · hiệu suất tháng ${D.month}</h2><p>Nhãn PKKH chốt ${D.label} · hiệu quả ${D.pkkh}</p></div><label for="pkkh-unit-filter">Trung tâm tại ${D.label}<select id="pkkh-unit-filter"><option value="all">Toàn công ty theo PKKH</option></select></label>`);
 setHTML('.pkkh-rule-band span',`Số KH trong từng phân khúc không đổi trong tháng. KH ngoài tệp ${D.label} theo dõi riêng; chuyển nhãn chỉ ghi nhận khi chốt ${D.nextLabel}.`);
 setText('.pkkh-table-panel .pkkh-panel-head span',`Nhãn ${D.label} · hiệu quả ${D.pkkh}`);
 const heads=document.querySelectorAll('.pkkh-performance-table thead th');
 const headText=[null,`KH đầu ${D.T}<br><span>tỷ trọng tệp</span>`,`KH khớp ${D.T}<br><span>tỷ lệ trong nhóm</span>`,`NAV hiện tại<br><span>so BQ ${D.Tp} · tỷ</span>`,`GTGD lũy kế ${D.T}<br><span>so cả ${D.Tp} · tỷ</span>`,`Phí net lũy kế ${D.T}<br><span>so cả ${D.Tp} · triệu</span>`,`Dư nợ hiện tại<br><span>so BQ ${D.Tp} · tỷ</span>`];
 heads.forEach((th,i)=>{if(headText[i])th.innerHTML=headText[i]});
 setText('.pkkh-table-explain',`Nhãn và quy mô đầu tháng giữ cố định. So sánh tháng ${D.month} lũy kế với cả tháng ${D.prevMonth} trên cùng tệp khách hàng; tỷ lệ để “—” khi nền tháng ${D.prevMonth} bằng 0.`);
 const panelHeads=document.querySelectorAll('.pkkh-panels .pkkh-panel-head span');if(panelHeads[0])panelHeads[0].textContent=`7 phân khúc kinh doanh · KH ${D.label}`;
 const quality=$('.pkkh-quality > p');if(quality)quality.textContent=`Quy mô nhãn cố định tại ${D.label}; ngày hiệu quả ${D.pkkh}.`;
 setText('.pkkh-definition-intro',`Các điều kiện dưới đây dùng để tạo nhãn tại ngày ${D.label}. Nhãn đó giữ nguyên trong tháng ${D.month}; “hoặc” nghĩa là chỉ cần đạt một trong hai ngưỡng vòng quay.`);
 setText('.pkkh-definition-foot',`BQ = bình quân; VQ = vòng quay; GTGD = giá trị giao dịch. Nhãn PKKH và trung tâm giữ cố định tại ${D.label} trong tháng ${D.month}.`);

 // ----- Tab đơn vị -----
 setText('.unit-period',`${D.range} · Phí net toàn công ty ${fmt(isNum(c.feeMonth)?c.feeMonth/1000:null,2)} tỷ · Δ cùng kỳ ${minusFmt(c.feeMonthChange)} triệu`);
 const momentumOption=$('#sort option[value="momentum"]');if(momentumOption)momentumOption.textContent=`Hôm nay / BQ ${AVG_WINDOW} phiên`;
 const unitHeads=document.querySelectorAll('.unit-comparison thead th');
 if(unitHeads[1])unitHeads[1].innerHTML=`MG · ${D.staff}<br>SL / Δ so ${D.staffPrior}`;
 if(unitHeads[2])unitHeads[2].innerHTML=`CTV · ${D.staff}<br>SL / Δ so ${D.staffPrior}`;
 if(unitHeads[8])unitHeads[8].innerHTML=`Phí hôm nay / BQ ${AVG_WINDOW} phiên<br>triệu đồng`;
 const um=M.org.unmapped;
 setText('.unit-comparison-note',`MG/CTV: cây nhân sự chốt ${D.staff} so ${D.staffPrior}${isNum(um.mg)||isNum(um.ctv)?`; tổng gồm ${fmt(um.mg)} MG và ${fmt(um.ctv)} CTV chưa gắn trung tâm`:''}. Kinh doanh đến ${D.report}; KH mới chốt ${D.kh}.`);

 // ----- Tab định nghĩa & nguồn -----
 const flow=M.customerFlow.all,cohortCompany=M.cohort.company;
 setHTML('.definitions',`<article><span class="tag">Định nghĩa</span><h3 style="margin-top:10px">Ba mốc phát triển khách hàng</h3><ul><li><strong>Mở mới:</strong> KH hoàn tất mở tài khoản trong kỳ.</li><li><strong>Nộp tiền lần đầu:</strong> KH có lần nộp tiền đầu tiên; có thể đã mở tài khoản từ kỳ trước.</li><li><strong>Giao dịch lần đầu:</strong> KH có lệnh khớp đầu tiên; không tính lệnh đặt chưa khớp.</li></ul><p>Đếm KH duy nhất. Chuyển đơn vị quản lý không tạo KH mới. Tỷ lệ chuyển đổi chỉ tính trên cùng một nhóm KH và cùng cửa sổ theo dõi; luồng KH mới chốt ${D.kh}.</p></article>
  <article><span class="tag">Nhãn cố định theo tháng</span><h3 style="margin-top:10px">Nhãn A–D</h3><p>Với tháng ${D.month}, lấy KH mở trước ${D.monthStart}; NAV chốt ${D.label} và lệnh khớp trong tháng ${D.prevMonth} để gán A–D. NAV ≥ 10 triệu thuộc A/C; NAV &lt; 10 triệu thuộc B/D, bao gồm NAV âm. A/B có khớp tháng ${D.prevMonth}; C/D không khớp. NAV âm là nhãn chồng để theo dõi, không cộng thêm vào A–D.</p><p>Quy mô và hiệu quả hiện tại đo tại ${D.abcd}; tỷ lệ khớp lệnh dùng số KH hiện tại của nhóm.</p></article>
  <article><span class="tag">Phạm vi báo cáo</span><h3 style="margin-top:10px">Giữ phạm vi nguồn</h3><p>Ngày báo cáo kinh doanh ${D.reportFull}. Tất cả số liệu loại trừ tự doanh. Dư nợ bỏ KH có nợ xấu. GTGD gồm chứng chỉ quỹ, ETF, chứng quyền và cổ phiếu.</p><p>Lũy kế tháng = tổng các phiên trong sheet NGAY; cùng kỳ = lũy kế cùng số phiên tháng trước (sheet KY).</p></article>
  <article><span class="tag">Phạm vi chỉ tiêu</span><h3 style="margin-top:10px">Thị phần, NAV và AUM</h3><p>Thị phần giao dịch ngày ${D.report} là ${pct(c.shareDay,2)}, bình quân lũy kế tháng ${pct(c.shareMonth,2)} và kế hoạch ${pct(c.sharePlan,2)} theo nguồn; không tự tính lại từ GTGD ngày vì quy ước hai chiều.</p><p>AUM = NAV + dư nợ cuối ngày: NAV ${fmt(c.nav)} + dư nợ ${fmt(c.debt)} = AUM ${fmt(c.aum)} tỷ.</p></article>`);
 const sources=[
  ['Ngày báo cáo',`${esc(meta.nguon_kinh_doanh||'—')}; ${D.sessions} phiên ${D.range}.`,`Dữ liệu cập nhật từ ${esc(M.raw.tu_file||'data.json')}${M.raw.tao_luc?' lúc '+esc(M.raw.tao_luc.replace('T',' ')):''}.`],
  ['Kết quả toàn công ty',`Thị phần BQ ${pct(c.shareMonth,2)}; GTGD tháng ${fmt(c.gtgdMonth)} tỷ, ngày ${fmt(c.gtgdDay)} tỷ; phí net tháng ${fmt(isNum(c.feeMonth)?c.feeMonth/1000:null,2)} tỷ, ngày ${fmt(c.feeDay,2)} triệu; dư nợ cuối ngày ${fmt(c.debt)} tỷ.`,'Lũy kế và Δ phiên trước tính từ chuỗi phiên; cùng kỳ từ sheet KY.'],
  ['Khách hàng mới',`${fmt(flow.total)} KH hiện tại, ${fmt(flow.opened)} mở mới tháng, ${fmt(flow.day)} mở trong ngày, ${fmt(flow.funded)} đã nộp tiền, ${fmt(flow.matched)} đã khớp lệnh. NAV KH mới ${fmt(flow.nav,2)} tỷ; dư nợ ${fmt(flow.debt,2)} tỷ; GTGD ${fmt(flow.gtgd,2)} tỷ; DTPN ${fmt(flow.fee,2)} triệu.`,`${esc(meta.nguon_kh||'—')} · chốt ${D.kh}. Mở mới lấy từ chuỗi phiên; tổng công ty của các cột còn lại = tổng đơn vị.`],
  ['Tài sản & dòng tiền',`NAV ${fmt(c.nav)} tỷ, dư nợ ${fmt(c.debt)} tỷ, AUM ${fmt(c.aum)} tỷ; nạp ${fmt(c.cashIn,2)} tỷ, rút ${fmt(c.cashOut,2)} tỷ, ròng ${minusFmt(c.cashNet)} tỷ trong ngày; ròng lũy kế ${minusFmt(c.cashNetMonth)} tỷ.`,'Ròng lũy kế = tổng nạp/rút ròng các phiên.'],
  ['Đơn vị',`${units.filter(u=>isNum(u.gtgd)).length}/${units.length} đơn vị có số kinh doanh ngày ${D.report}.`,'GTGD và phí net các đơn vị có thể lệch tổng công ty do phạm vi; không phân bổ chênh lệch.'],
  ['Nhãn và hiệu quả A–D',cohortCompany?`A/B/C/D hiện tại: ${['A','B','C','D'].map(g=>fmt(cohortCompany.groups[g].count)).join(' / ')} KH; đầu tháng: ${['A','B','C','D'].map(g=>fmt(cohortCompany.groups[g].baseCount)).join(' / ')} KH.`:'Chưa có dữ liệu.',`${esc(meta.nguon_abcd||'—')} · nhãn ${D.label}, hiệu quả ${D.abcd}. Toàn công ty = tổng đơn vị.`],
  ['Nhân sự & DTPN MG/CTV',`MG ${fmt(M.org.snapshot.mg)}, CTV ${fmt(M.org.snapshot.ctv)} tại ${D.staff}; DTPN MG ${fmt(c.resourceBenchmarks.feeTotalMg,2)} triệu, CTV ${fmt(c.resourceBenchmarks.feeTotalCtv,2)} triệu.`,`${esc(meta.nguon_nhan_su||'—')}. Đơn vị và toàn công ty = tổng các phòng.`],
  ['Phân khúc PKKH',M.pkkh.hasData?`${fmt(sumOf(Object.values(M.pkkh.values.all).map(v=>v.count)))} KH gắn nhãn tại ${D.label}.`:'Chưa có dữ liệu.',`${esc(meta.nguon_pkkh||'—')} · hiệu quả ${D.pkkh}. Toàn công ty = tổng đơn vị.`]
 ];
 setHTML('.source-table tbody',sources.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join(''));
 setText('.disclosure',`Nguồn: ${[meta.nguon_kinh_doanh,meta.nguon_kh,meta.nguon_abcd,meta.nguon_pkkh,meta.nguon_nhan_su].filter(Boolean).join('; ')}. Các tệp phân nhóm, PKKH và nhân sự giữ ngày chốt riêng như ghi ở trên. “—” là chưa có dữ liệu, không phải 0.`);
}

// =====================================================================
// Phần tương tác (port từ bản inline cũ, thay ngày cứng bằng dữ liệu)
// =====================================================================
function init(M){
const {D,company,units,dates}=M;
const reportSeries=M.series;
const customerFlowInput=M.customerFlow;
const fixedCohort=M.cohort;
const unitAverage=values=>Array.isArray(values)&&values.length&&values.every(isNum)?values.reduce((a,b)=>a+b,0)/values.length:null;

function selectTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));document.querySelectorAll('[role="tabpanel"]').forEach(p=>p.hidden=p.id!==name);document.querySelector('h1').textContent='Kinh doanh toàn công ty';if(name!=='units')document.getElementById('unit-detail').hidden=true;history.replaceState(null,'','#'+name)}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
document.querySelectorAll('[role="tab"]').forEach((b,i,arr)=>b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=arr[(i+(e.key==='ArrowRight'?1:-1)+arr.length)%arr.length];next.focus();selectTab(next.dataset.tab)}}));
function rollingAverage(values,i){if(i<AVG_WINDOW-1)return null;const w=values.slice(i-AVG_WINDOW+1,i+1);return w.every(isNum)?w.reduce((a,b)=>a+b,0)/AVG_WINDOW:null}

// Trục tự co: thay các ngưỡng cố định của bản cũ.
function niceStep(range){const p=Math.pow(10,Math.floor(Math.log10(range||1)));const m=range/p;return (m<=1?1:m<=2?2:m<=5?5:10)*p}
function axisFor(key,values){
 const v=values.filter(isNum);if(!v.length)return {min:0,max:1};
 if(key==='debt'){const lo=Math.min(...v),hi=Math.max(...v),step=niceStep((hi-lo||hi*.02||1)/2);let min=Math.floor(lo/step)*step,max=Math.ceil(hi/step)*step;if(max===min)max=min+step;if((max-min)/step%2)max+=step;return {min,max}}
 const hi=Math.max(...v,0);const step=niceStep(hi*1.05/2||1);return {min:0,max:Math.max(step*2,Math.ceil(hi*1.05/step)*step)};
}
const series={open:{label:'KH mở mới',unit:'KH',values:reportSeries.open},gtgd:{label:'GTGD',unit:'tỷ đồng',values:reportSeries.gtgd},fee:{label:'Phí net',unit:'triệu đồng',values:reportSeries.fee},share:{label:'Thị phần ngày',unit:'%',values:reportSeries.share},debt:{label:'Dư nợ cuối ngày',unit:'tỷ đồng',values:reportSeries.debt}};
function renderMiniChart(el){const key=el.dataset.mini,s=series[key],w=el.clientWidth,count=s.values.length,last=count-1;if(w<120||!count)return;const tv=document.body.classList.contains('tv-mode'),dense=el.dataset.density==='compact',shareDense=el.dataset.density==='share-compact',compact=tv&&key==='open';const h=shareDense?(tv?162:82):dense?(tv?162:118):tv?(compact?88:130):174,left=shareDense?42:dense?44:tv?(compact?44:64):34,right=tv?16:12,top=shareDense?19:dense?(tv?20:23):tv?(compact?20:26):20,bottom=shareDense?(tv?132:60):dense?(tv?132:95):tv?(compact?56:104):137,plotWidth=w-left-right,step=plotWidth/count;const {min,max}=axisFor(key,s.values);const x=i=>left+step*(i+.5),y=v=>bottom-((v-min)/(max-min))*(bottom-top);const averages=s.values.map((_,i)=>rollingAverage(s.values,i));const digits=key==='share'?2:0;let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(s.label)} theo ${count} phiên; chọn cột hoặc điểm để xem giá trị"><title>${esc(s.label)}: ${s.values.map((v,i)=>dates[i]+' '+fmt(v,digits)+' '+s.unit).join('; ')}</title>`;[min,(min+max)/2,max].forEach(v=>{svg+=`<line class="grid-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-6}" y="${y(v)+4}" text-anchor="end">${fmt(v,key==='share'?1:0)}</text>`});const path=s.values.map((v,i)=>isNum(v)?((i&&isNum(s.values[i-1])?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)):'').join(' ');if(key==='share'||key==='debt')svg+=`<path class="day-line" d="${path}"/>`;const finite=s.values.filter(isNum);const maxIndex=s.values.indexOf(Math.max(...finite));s.values.forEach((v,i)=>{const barWidth=Math.min(tv?40:28,step*.56);const label=`${dates[i]} · ${s.label}: ${fmt(v,digits)} ${s.unit}`;svg+=`<g class="data-hit${i===last?' selected':''}" data-index="${i}" role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><rect x="${x(i)-step/2}" y="${top}" width="${step}" height="${bottom-top+21}" fill="transparent"/>`;if(isNum(v)){if(key==='share'||key==='debt')svg+=`<circle class="point" cx="${x(i)}" cy="${y(v)}" r="4"/>`;else svg+=`<rect class="day-bar" x="${x(i)-barWidth/2}" y="${y(v)}" width="${barWidth}" height="${Math.max(0,bottom-y(v))}" rx="3"/>`;if((!dense&&w>=305&&key!=='share')||i===last||i===maxIndex)svg+=`<text class="${i===last?'key-value':''}" x="${x(i)}" y="${tv&&key!=='share'&&averages[i]!==null?Math.min(y(v),y(averages[i]))-12:y(v)-8}" text-anchor="middle">${fmt(v,digits)}${key==='share'?'%':''}</text>`}svg+=`</g><text x="${x(i)}" y="${bottom+(tv?21:19)}" text-anchor="middle">${dates[i].slice(0,2)}</text>`});if(key!=='share')svg+=`<path class="avg-line" d="${averages.map((v,i)=>v===null?'':((i&&averages[i-1]!==null?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1))).join(' ')}"/>`;svg+='</svg>';el.innerHTML=svg;const detail=document.getElementById(el.id+'-detail');const select=i=>{el.querySelectorAll('[data-index]').forEach(g=>{g.classList.toggle('selected',Number(g.dataset.index)===i);g.setAttribute('aria-pressed',String(Number(g.dataset.index)===i))});let text=`${dates[i]} · ${s.label} ${fmt(s.values[i],digits)} ${s.unit}`;if(key!=='share')text+=averages[i]===null?` · Chưa đủ ${AVG_WINDOW} phiên`:` · BQ ${fmt(averages[i],1)} ${s.unit}`;if(detail)detail.textContent=text};el.querySelectorAll('[data-index]').forEach(g=>{g.addEventListener('click',()=>select(Number(g.dataset.index)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(Number(g.dataset.index))}})});select(last)}
function renderShareChart(el){
 const values=series.share.values,averages=reportSeries.shareAvg,w=el.clientWidth,count=values.length,last=count-1;
 if(w<120||!count)return;
 if(!allFinite(values)||!Array.isArray(averages)||averages.length!==count||!averages.every(isNum)){el.innerHTML='<div class="small subtle">Chưa đủ chuỗi thị phần ngày / BQ lũy kế</div>';return}
 const tv=document.body.classList.contains('tv-mode'),h=tv?195:82,left=42,right=tv?16:12,top=19,bottom=tv?165:60,step=(w-left-right)/count;
 const {max}=axisFor('share',[...values,...averages]);
 const x=i=>left+step*(i+.5),y=v=>bottom-v/max*(bottom-top);
 const path=points=>points.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
 const description=values.map((v,i)=>`${dates[i]}: ngày ${fmt(v,2)}%, BQ lũy kế ${fmt(averages[i],2)}%`).join('; ');
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(description)}"><title>${esc(description)}</title>`;
 [0,max/2,max].forEach(v=>{svg+=`<line class="grid-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-6}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}</text>`});
 svg+=`<path class="cumulative-line" d="${path(averages)}"/><path class="day-line" d="${path(values)}"/>`;
 const maxIndex=values.indexOf(Math.max(...values));
 values.forEach((v,i)=>{
  const label=`${dates[i]} · thị phần ngày ${fmt(v,2)}%, BQ lũy kế ${fmt(averages[i],2)}%`;
  svg+=`<g class="data-hit${i===last?' selected':''}" data-index="${i}" role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><rect x="${x(i)-step/2}" y="${top}" width="${step}" height="${bottom-top+21}" fill="transparent"/><circle class="point" cx="${x(i)}" cy="${y(v)}" r="4"/>`;
  if(i===last||i===maxIndex)svg+=`<text class="${i===last?'key-value':''}" x="${x(i)}" y="${y(v)-8}" text-anchor="middle">${fmt(v,2)}%</text>`;
  svg+=`</g><text x="${x(i)}" y="${bottom+(tv?21:19)}" text-anchor="middle">${dates[i].slice(0,2)}</text>`;
 });
 el.innerHTML=svg+'</svg>';
 const detail=document.getElementById(el.id+'-detail');
 const select=i=>{el.querySelectorAll('[data-index]').forEach(g=>{const selected=Number(g.dataset.index)===i;g.classList.toggle('selected',selected);g.setAttribute('aria-pressed',String(selected))});if(detail)detail.textContent=`${dates[i]} · thị phần ngày ${fmt(values[i],2)}% · BQ lũy kế ${fmt(averages[i],2)}%`};
 el.querySelectorAll('[data-index]').forEach(g=>{g.addEventListener('click',()=>select(Number(g.dataset.index)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(Number(g.dataset.index))}})});
 select(last);
}
function renderDailyMiniChart(el){return el.dataset.mini==='share'?renderShareChart(el):renderMiniChart(el)}
fitTVBoard();
const miniCharts=Array.from(document.querySelectorAll('[data-mini]'));const miniObserver=new ResizeObserver(entries=>entries.forEach(e=>renderDailyMiniChart(e.target)));miniCharts.forEach(el=>{renderDailyMiniChart(el);miniObserver.observe(el)});

const assetSeries={nav:{label:'NAV cuối ngày',values:reportSeries.nav,color:'#7890ab'},aum:{label:'AUM cuối ngày',values:reportSeries.aum,color:'#7890ab'},debt:{label:'Dư nợ cuối ngày',values:reportSeries.debt,color:'#7890ab'},cash:{label:'Nạp/rút ròng từng ngày',values:reportSeries.cash,color:'#b36c52'}};
function renderAssetSpark(el){const item=assetSeries[el.dataset.spark];if(!item)return;const values=item.values,w=el.clientWidth,h=el.clientHeight,last=values.length-1;const finite=values.filter(isNum);if(w<40||finite.length<2)return;const left=4,right=w-5,top=6,bottom=h-6,lo=Math.min(...finite),hi=Math.max(...finite),range=hi-lo||1;const x=i=>left+(right-left)*i/last,y=v=>bottom-(v-lo)/range*(bottom-top);const path=values.map((v,i)=>isNum(v)?((i&&isNum(values[i-1])?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)):'').join(' ');let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(item.label)}: ${values.map((v,i)=>dates[i]+' '+fmt(v)+' tỷ').join('; ')}. Mỗi chỉ tiêu dùng thang riêng."><title>${esc(item.label)} · ${values.map((v,i)=>dates[i]+': '+fmt(v)+' tỷ').join('; ')}</title>`;if(el.dataset.spark==='cash'&&lo<0&&hi>0)svg+=`<line x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}" stroke="#d9e1ea" stroke-dasharray="3 3"/>`;if(allFinite(values))svg+=`<path d="${path} L${right} ${bottom} L${left} ${bottom} Z" fill="${item.color}" fill-opacity="0.07"/>`;svg+=`<path d="${path}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${isNum(values[last])?`<circle cx="${x(last)}" cy="${y(values[last])}" r="3" fill="${item.color}"/>`:''}</svg>`;el.innerHTML=svg}
const assetSparks=[...document.querySelectorAll('[data-spark]')];const sparkObserver=new ResizeObserver(entries=>entries.forEach(e=>renderAssetSpark(e.target)));assetSparks.forEach(el=>{renderAssetSpark(el);sparkObserver.observe(el)});

function wireRows(root){root.querySelectorAll('[data-unit]').forEach(b=>b.addEventListener('click',()=>{selectTab('units');showUnit(b.dataset.unit)}))}
const contribution=document.getElementById('contribution-list');
const topFeeUnits=[...units].filter(u=>isNum(u.feeMtd)).sort((a,b)=>b.feeMtd-a.feeMtd).slice(0,5);
const contributionScale=Math.max(250,Math.ceil(Math.max(...topFeeUnits.map(u=>u.feeMtd),0)/250)*250);
document.querySelector('#contribution-summary .contribution-axis .scale').innerHTML=`<span>0</span><span>${fmt(contributionScale/2)}</span><span>${fmt(contributionScale)} triệu</span>`;
contribution.innerHTML=topFeeUnits.map(u=>`<button type="button" class="contribution-row" data-unit="${esc(u.name)}" aria-label="${esc(u.name)}: phí net tháng ${fmt(u.feeMtd)} triệu, tỷ trọng ${fmt(u.feeMtd/company.feeMonth*100,1)}%; mở chi tiết"><span class="contribution-name">${esc(u.name)}</span><span class="contribution-track"><span class="contribution-bar" style="display:block;width:${Math.max(0,Math.min(100,u.feeMtd/contributionScale*100))}%"></span></span><strong class="contribution-value">${fmt(u.feeMtd)}</strong><span class="contribution-pct">${fmt(u.feeMtd/company.feeMonth*100,1)}%</span></button>`).join('');wireRows(contribution);
function rosterCell(current,previous,label){const delta=isNum(current)&&isNum(previous)?current-previous:null;return `<td class="staff-cell" title="${label} ${D.staff}: ${fmt(current)}; chốt ${D.staffPrior}: ${fmt(previous)}; thay đổi: ${delta===null?'—':delta>0?'+'+fmt(delta):fmt(delta)}"><strong>${fmt(current)}</strong> <span class="subtle">/</span> ${signed(delta)}</td>`}
function unitRow(u){const r=u.resources||{};return `<tr><td class="unit-name"><button type="button" data-unit="${esc(u.name)}">${esc(u.name)}</button></td>${rosterCell(r.mg,r.mgPrior,'MG')}${rosterCell(r.ctv,r.ctvPrior,'CTV')}<td>${fmt(u.feeMtd)}</td><td>${signed(u.feeChange)} <span class="subtle">/</span> ${signed(u.growthPct,1,'%')}</td><td>${fmt(u.mtd)}</td><td>${fmt(u.share,2)} / ${fmt(u.sharePlan,2)}</td><td>${fmt(customerFlowInput.units[u.name]?.opened)}</td><td>${fmt(u.fee)} / ${fmt(u.feeAvg5)}</td><td>${signed(u.momentum,1,'%')}</td></tr>`}
function renderUnits(){
 const q=document.getElementById('unit-search').value.trim().toLocaleLowerCase('vi'),sort=document.getElementById('sort').value;
 const list=units.filter(u=>u.name.toLocaleLowerCase('vi').includes(q));
 list.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'vi'):(b[sort]??-Infinity)-(a[sort]??-Infinity));
 const body=document.getElementById('units-body');body.innerHTML=list.length?list.map(unitRow).join(''):'<tr><td colspan="10" class="empty">Không tìm thấy đơn vị phù hợp.</td></tr>';
 if(!q){const avg=unitAverage(lastN(reportSeries.fee,AVG_WINDOW));const fGrowth=growth(company.feeMonthChange,company.feeMonth);const now=M.org.snapshot,prior=M.org.prior;body.innerHTML+=`<tr class="total"><td>Toàn công ty · tổng hợp</td>${rosterCell(now.mg,prior.mg,'MG')}${rosterCell(now.ctv,prior.ctv,'CTV')}<td>${fmt(company.feeMonth)}</td><td>${signed(company.feeMonthChange)} / ${signed(fGrowth,1,'%')}</td><td>${fmt(company.gtgdMonth)}</td><td>${fmt(company.shareMonth,2)} / ${fmt(company.sharePlan,2)}</td><td>${fmt(customerFlowInput.all.opened)}</td><td>${fmt(company.feeDay)} / ${fmt(avg)}</td><td>${signed(avg>0&&isNum(company.feeDay)?(company.feeDay/avg-1)*100:null,1,'%')}</td></tr>`;}
 wireRows(body);
 const feeList=[...list].filter(u=>isNum(u.feeMtd)).sort((a,b)=>b.feeMtd-a.feeMtd);
 const feeRoot=document.getElementById('unit-fee-ranking');
 const feeScale=Math.max(250,Math.ceil(Math.max(...feeList.map(u=>u.feeMtd),0)/250)*250);
 feeRoot.closest('.unit-chart-card').querySelector('.unit-axis-labels').innerHTML=`<span>0</span><span>${fmt(feeScale/2)}</span><span>${fmt(feeScale)} triệu</span>`;
 feeRoot.innerHTML=feeList.length?feeList.map((u,i)=>`<button class="unit-rank-row" type="button" data-unit="${esc(u.name)}" aria-label="${esc(u.name)}, phí tháng ${fmt(u.feeMtd)} triệu, tỷ trọng ${pct(u.feeMtd/company.feeMonth*100)}; mở chi tiết"><span>${esc(u.name)}</span><span class="unit-track"><span class="unit-bar ${i===0?'unit-fee-highlight':''}" style="left:0;width:${Math.max(0,Math.min(100,u.feeMtd/feeScale*100))}%"></span></span><strong class="unit-row-value">${fmt(u.feeMtd)}</strong><span class="unit-row-pct">${pct(u.feeMtd/company.feeMonth*100)}</span></button>`).join(''):'<div class="unit-empty">Chưa có phí tháng cho lựa chọn này.</div>';
 const growthRoot=document.getElementById('unit-growth-ranking');
 const growthList=[...list].filter(u=>isNum(u.feeChange)).sort((a,b)=>b.feeChange-a.feeChange);
 const negativeScale=Math.max(250,Math.ceil(Math.max(...growthList.map(u=>Math.max(0,-u.feeChange)),0)/250)*250);
 const positiveScale=Math.max(250,Math.ceil(Math.max(...growthList.map(u=>Math.max(0,u.feeChange)),0)/250)*250);
 const growthScale=negativeScale+positiveScale;
 const zeroPosition=negativeScale/growthScale*100;
 const growthCard=growthRoot.closest('.unit-chart-card');
 growthCard.style.setProperty('--unit-zero',`${zeroPosition}%`);
 growthCard.querySelector('.unit-axis-labels').innerHTML=`<span>−${fmt(negativeScale)}</span><span class="zero-tick">0</span><span>+${fmt(positiveScale)} triệu</span>`;
 growthRoot.innerHTML=growthList.length?growthList.map(u=>`<button class="unit-rank-row" type="button" data-unit="${esc(u.name)}" aria-label="${esc(u.name)}, tăng giảm phí tháng ${u.feeChange>0?'+':''}${fmt(u.feeChange)} triệu, ${u.growthPct>0?'+':''}${pct(u.growthPct)}; mở chi tiết"><span>${esc(u.name)}</span><span class="unit-track"><span class="unit-zero"></span><span class="unit-bar ${u.feeChange>=0?'positive':'negative'}" style="left:${(negativeScale+Math.min(0,u.feeChange))/growthScale*100}%;width:${Math.abs(u.feeChange)/growthScale*100}%"></span></span><strong class="unit-row-value">${signed(u.feeChange)}</strong><span class="unit-row-pct">${signed(u.growthPct,1,'%')}</span></button>`).join(''):'<div class="unit-empty">Chưa có chênh lệch cùng kỳ cho lựa chọn này.</div>';
 wireRows(feeRoot);wireRows(growthRoot);
}
document.getElementById('unit-search').addEventListener('input',renderUnits);document.getElementById('sort').addEventListener('change',renderUnits);
function unitPerPerson(total,count){return isNum(total)&&isNum(count)&&count>0?total/count:null}
function unitChart(values,label,unit,kind='line',compact=false){
 if(!Array.isArray(values)||values.length<2||!values.every(isNum))return '<div class="small subtle">Chưa có chuỗi dữ liệu</div>';
 const w=360,h=compact?60:110,left=compact?3:16,right=compact?357:337,top=compact?5:20,bottom=compact?55:83;
 const low=kind==='bar'?0:Math.min(...values),high=Math.max(...values),range=high-low||Math.max(Math.abs(high)*.02,1);
 const y=v=>bottom-(v-low)/range*(bottom-top),x=i=>left+(right-left)*i/(values.length-1);
 const path=values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
 const caption=label+' · '+values.map((v,i)=>dates[i]+': '+fmt(v,unit==='%'?2:0)+' '+unit).join('; ');
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(caption)}"><title>${esc(caption)}</title>`;
 if(!compact)svg+=`<line x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}" stroke="#dce5ef"/><line x1="${left}" x2="${right}" y1="${(top+bottom)/2}" y2="${(top+bottom)/2}" stroke="#edf2f7"/>`;
 if(kind==='bar')values.forEach((v,i)=>{const bw=22;svg+=`<rect x="${x(i)-bw/2}" y="${y(v)}" width="${bw}" height="${Math.max(bottom-y(v),1)}" fill="${i===values.length-1?'#ff6b1c':'#cad8e6'}" rx="2"/>`});
 else svg+=`<path d="${path}" fill="none" stroke="${compact?'#839bb6':'#ff6b1c'}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
 const last=values.length-1;
 if(kind==='line')svg+=`<circle cx="${x(last)}" cy="${y(values[last])}" r="3" fill="${compact?'#839bb6':'#ff6b1c'}"/>`;
 if(!compact){
  values.forEach((v,i)=>{svg+=`<text x="${x(i)}" y="103" text-anchor="middle">${dates[i].slice(0,2)}</text>`});
  const hiIndex=values.indexOf(high);
  if(hiIndex!==last)svg+=`<text x="${x(hiIndex)}" y="${y(high)-7}" text-anchor="middle">${fmt(high,unit==='%'?2:0)}${unit==='%'?'%':''}</text>`;
  svg+=`<text class="latest-label" x="${x(last)}" y="${y(values[last])-7}" text-anchor="middle">${fmt(values[last],unit==='%'?2:0)}${unit==='%'?'%':''}</text>`;
 }
 return svg+'</svg>';
}
function unitMetricTable(rows,comparisonLabel='So sánh'){
 return `<table class="unit-metric-table"><thead><tr><th>Chỉ tiêu</th><th>Thực hiện</th><th>${comparisonLabel}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td><strong>${r[1]}</strong>${r[3]?`<small>${r[3]}</small>`:''}</td><td>${r[2]??'—'}</td></tr>`).join('')}</tbody></table>`;
}
function unitDriver(label,value){return `<div class="unit-driver-row"><span>${label}</span><strong>${value}</strong></div>`}
let unitExecutiveObserver;
function renderUnitExecutiveChart(el,u){
 const key=el.dataset.unitChart,values=key==='share'?u.shareDaySeries:key==='gtgd'?u.gtgdSeries:u.debtSeries;
 if(!Array.isArray(values)||!values.length||!values.every(isNum)){el.innerHTML='<div class="small subtle">Chưa có chuỗi dữ liệu</div>';return}
 const width=el.clientWidth;if(width<120)return;
 const tv=document.body.classList.contains('tv-mode'),h=key==='share'?105:108,left=tv?46:36,right=24,top=22,bottom=82,count=values.length,step=(width-left-right)/count;
 const x=i=>left+step*(i+.5),averages=values.map((_,i)=>rollingAverage(values,i));
 const highest=Math.max(...values),lowest=Math.min(...values);
 let lo=0,hi=highest>0?Math.ceil(highest*1.1/Math.pow(10,Math.floor(Math.log10(highest))))*Math.pow(10,Math.floor(Math.log10(highest))):1;
 if(key==='share')hi=Math.max(.1,Math.ceil(highest*1.1*10)/10);
 if(key==='debt'){const scale=highest>0?Math.pow(10,Math.max(0,Math.floor(Math.log10(highest))-1)):1;lo=Math.floor(lowest/scale)*scale;hi=Math.ceil(highest/scale)*scale;if(hi===lo)hi=lo+scale;}
 const y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top),digits=key==='share'?2:0,unit=key==='share'?'%':'tỷ';
 const label=key==='share'?'Thị phần từng ngày':key==='gtgd'?'GTGD từng ngày':'Dư nợ cuối ngày';
 let svg=`<svg viewBox="0 0 ${width} ${h}" role="img" aria-label="${esc(label)}: ${values.map((v,i)=>dates[i]+' '+fmt(v,digits)+' '+unit).join('; ')}"><title>${esc(label)}</title>`;
 [lo,(lo+hi)/2,hi].forEach(v=>{svg+=`<line class="grid-line" x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-6}" y="${y(v)+4}" text-anchor="end">${fmt(v,key==='share'?1:0)}</text>`});
 if(key!=='gtgd')svg+=`<path class="day-line" d="${values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')}"/>`;
 if(key!=='share')svg+=`<path class="avg-line" d="${averages.map((v,i)=>v===null?'':(i===AVG_WINDOW-1?'M':'L')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')}"/>`;
 const maxIndex=values.indexOf(highest);
 values.forEach((v,i)=>{const last=i===count-1;svg+=`<g class="${last?'selected':''}"><title>${dates[i]}: ${fmt(v,digits)} ${unit}</title>`;
  if(key==='gtgd'){const bw=Math.min(36,step*.55);svg+=`<rect class="day-bar" style="fill:${last?'#ff6b1c':'#cad7e5'}" x="${x(i)-bw/2}" y="${y(v)}" width="${bw}" height="${Math.max(0,bottom-y(v))}" rx="2"/>`}
  else svg+=`<circle class="point" cx="${x(i)}" cy="${y(v)}" r="3.5"/>`;
  if(last||i===maxIndex)svg+=`<text class="${last?'key-value':''}" x="${x(i)}" y="${Math.min(y(v),key!=='share'&&averages[i]!==null?y(averages[i]):y(v))-8}" text-anchor="middle">${fmt(v,digits)}${key==='share'?'%':''}</text>`;
  svg+=`</g><text x="${x(i)}" y="102" text-anchor="middle">${dates[i].slice(0,2)}</text>`;
 });el.innerHTML=svg+'</svg>';
}
function unitExecutiveCards(u){
 const ratio=(delta,current)=>isNum(delta)&&isNum(current)&&current-delta!==0?delta/(current-delta)*100:null;
 const variance=(current,previous)=>isNum(current)&&isNum(previous)?current-previous:null;
 const shareLast=lastOf(u.shareDaySeries),sharePrev=prevOf(u.shareDaySeries);
 const shareGap=variance(u.share,u.sharePlan),targetMax=Math.max(u.sharePlan||0,u.share||0,.01)*1.1;
 const gtgdAvg=unitAverage(lastN(u.gtgdSeries,AVG_WINDOW)),debtAvg=unitAverage(lastN(u.debtSeries,AVG_WINDOW));
 const previousFee=prevOf(u.feeSeries),feeDelta=variance(u.fee,previousFee);
 const debtChange=variance(u.debt,prevOf(u.debtSeries)),debtStartChange=variance(u.debt,u.debtSeries?.[0]);
 const tradeGrowth=ratio(u.gtgdMonthChange,u.mtd),dailyTradeGrowth=ratio(u.change,u.gtgd),marketGrowth=ratio(company.marketChange,company.marketDay);
 const exchanges=['HOSE','HNX','UPCOM'],parts=u.debtComponents||{};
 return `<div class="unit-result-grid executive-grid unit-executive-grid">
 <article class="executive-card market-hero"><div class="executive-card-title"><h3>Thị phần giao dịch · BQ tháng</h3><span class="priority-label">ĐƠN VỊ</span></div><div class="market-hero-grid"><div class="market-total"><div class="hero-value">${fmt(u.share,2)}<span>%</span></div><div class="hero-gap ${tone(shareGap)}">${isNum(shareGap)?(shareGap>0?'+':'')+fmt(shareGap,2):'—'} <span>điểm % so kế hoạch</span></div><div class="hero-prior">${arrow(u.shareMonthChange)}${absFmt(u.shareMonthChange,2)} điểm % so cùng kỳ tháng trước</div><div class="hero-target" role="img" aria-label="Thị phần ${pct(u.share,2)}, kế hoạch ${pct(u.sharePlan,2)}"><div class="target-labels"><span>Thực hiện <strong>${pct(u.share,2)}</strong></span><span>Kế hoạch <strong>${pct(u.sharePlan,2)}</strong></span></div><div class="target-track"><div class="target-fill" style="width:${u.sharePlan>0&&isNum(u.share)?u.share/targetMax*100:0}%"></div>${u.sharePlan>0?`<div class="target-marker" style="left:${u.sharePlan/targetMax*100}%"></div>`:''}</div></div></div><div class="exchange-shares"><div class="exchange-heading">THỊ PHẦN TRÊN TỪNG SÀN <span>· BQ tháng</span></div>${exchanges.map(e=>`<div class="exchange-row"><span class="exchange-name">${e}</span><strong>${fmt(u.exchangeShares?.[e],2)}<span>%</span></strong><div class="exchange-comparison"><b>${signed(u.exchangeShareChanges?.[e],2,'%')}</b><small>so tháng trước</small></div></div>`).join('')}</div></div><div class="share-trend"><div class="executive-chart-title"><span>Thị phần giao dịch từng ngày trong tháng</span><span>% · ${D.range}</span></div><div class="mini-chart" data-unit-chart="share"></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${pct(shareLast,2)}</strong></span><span>${arrow(variance(shareLast,sharePrev))}${absFmt(variance(shareLast,sharePrev),2)} điểm % / phiên trước</span></div></article>
 <article class="executive-card trading-primary"><div class="executive-card-title"><h3>Giá trị giao dịch SHS · tháng</h3></div><div class="executive-value">${fmt(u.mtd)} <span>tỷ đồng</span></div><div class="executive-delta ${tone(u.gtgdMonthChange)}">${arrow(u.gtgdMonthChange)}${absFmt(u.gtgdMonthChange)} tỷ · ${signed(tradeGrowth,1,'%')} cùng kỳ</div><div class="executive-trend"><div class="executive-chart-title"><span>Nhịp GTGD theo phiên</span><span>Tỷ đồng</span></div><div class="mini-chart" data-unit-chart="gtgd"></div><div class="executive-chart-note"><span>${D.range} · nét đứt: BQ ${AVG_WINDOW} phiên</span><strong>BQ ${fmt(gtgdAvg,1)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${fmt(u.gtgd)} tỷ</strong></span><span>${arrow(u.change)}${absFmt(u.change)} tỷ · ${signed(dailyTradeGrowth,1,'%')} / phiên trước</span><small>So BQ ${AVG_WINDOW} phiên <strong>${signed(gtgdAvg>0&&isNum(u.gtgd)?(u.gtgd/gtgdAvg-1)*100:null,1,'%')}</strong> · thị trường hôm nay <strong>${signed(marketGrowth,1,'%')}</strong></small></div><div class="fee-support" aria-label="Phí net bổ sung cho giá trị giao dịch"><div class="fee-support-month"><span>Phí net · lũy kế tháng</span><strong>${fmt(isNum(u.feeMtd)?u.feeMtd/1000:null,2)} <small>tỷ đồng</small></strong><span>${arrow(u.feeChange)}${absFmt(u.feeChange)} triệu · ${signed(u.growthPct,1,'%')} cùng kỳ</span></div><div class="fee-support-day"><span>Hôm nay <strong>${fmt(u.fee,2)} triệu</strong></span><span>≈ ${signed(feeDelta)} triệu · ${signed(ratio(feeDelta,u.fee),1,'%')}</span><span>So BQ ${AVG_WINDOW} phiên <strong>${signed(u.momentum,1,'%')}</strong></span></div></div></article>
 <article class="executive-card debt-primary"><div class="executive-card-title"><h3>Dư nợ · BQ tháng</h3></div><div class="executive-value">${fmt(u.debtAvgMonth)} <span>tỷ đồng</span></div><div class="executive-delta neutral">Bình quân ${u.debtSeries?.length||0} phiên có dữ liệu · ${D.range}</div><div class="executive-trend"><div class="executive-chart-title"><span>Dư nợ cuối ngày theo phiên</span><span>Tỷ đồng</span></div><div class="mini-chart" data-unit-chart="debt"></div><div class="executive-chart-note"><span>${D.range} · nét đứt: BQ ${AVG_WINDOW} phiên</span><strong>BQ ${fmt(debtAvg)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Cuối ngày <strong>${fmt(u.debt)} tỷ</strong></span><span>${arrow(debtChange)}${absFmt(debtChange)} tỷ · ${signed(ratio(debtChange,u.debt),1,'%')} / phiên trước</span><small>So ${D.first} <strong>${signed(debtStartChange)} tỷ · ${signed(ratio(debtStartChange,u.debt),1,'%')}</strong></small></div><div class="debt-support"><div class="debt-support-title">Cơ cấu dư nợ cuối ngày · tỷ đồng</div><div class="debt-components"><div><span>Margin thuần</span><strong>${fmt(parts.margin)}</strong></div><div><span>Ứng trước</span><strong>${fmt(parts.advance)}</strong></div><div><span>Dư nợ 3 bên</span><strong>${fmt(parts.thirdParty)}</strong></div></div></div></article></div>`;
}
function unitDepartmentTable(u){
 const departments=u.departments||[];
 return `<div class="table-wrap"><table class="unit-department-table"><thead><tr><th>Phòng</th><th>Trưởng phòng</th><th>MG / CTV<br>người</th><th>DTPN tháng<br>triệu</th><th>Δ cùng kỳ<br>triệu / %</th><th>Dư nợ BQ<br>tỷ</th><th>DTPN BQ/MG<br>triệu/người</th><th>DTPN BQ/CTV<br>triệu/người</th></tr></thead><tbody>${departments.length?departments.map(d=>`<tr class="${d.unassigned?'dept-unassigned':''}"><td><button type="button" class="dept-link" data-department="${esc(d.id)}" aria-expanded="false" aria-controls="unit-department-detail">${esc(d.name)}</button></td><td>${d.head?esc(d.head):'—'}</td><td>${fmt(d.mg)} / ${fmt(d.ctv)}<small>Δ ${D.staffPrior}: ${signed(d.mgChange)} / ${signed(d.ctvChange)}</small></td><td>${fmt(d.feeMtd)}</td><td>${signed(d.feeChange)} / ${signed(d.growthPct,1,'%')}</td><td>${fmt(d.debtAvg)}</td><td>${fmt(d.feeAvgMg,2)}</td><td>${fmt(d.feeAvgCtv,2)}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">Chưa có cơ cấu phòng của đơn vị trong dữ liệu.</td></tr>'}</tbody></table></div>`;
}
function showUnitDepartment(u,id){
 const dept=(u.departments||[]).find(d=>d.id===id);if(!dept)return;
 const panel=document.getElementById('unit-department-detail');
 panel.hidden=false;
 document.querySelectorAll('[data-department]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.department===id)));
 panel.innerHTML=`<div class="detail-head"><div><h4>${esc(dept.name)}</h4><div class="subtle">Trưởng phòng: ${dept.head?esc(dept.head):'—'} · ${esc(u.name)} · chốt ${D.staffFull}</div></div><button type="button" class="unit-close" id="close-department">Đóng phòng</button></div><div class="dept-detail-grid">
 <div><h5>Nguồn lực & kết quả</h5>${unitDriver('MG / CTV',fmt(dept.mg)+' / '+fmt(dept.ctv))}${unitDriver('GTGD tháng · tỷ',fmt(dept.gtgdMtd))}${unitDriver('DTPN tháng · triệu',fmt(dept.feeMtd))}${unitDriver('Dư nợ BQ · tỷ',fmt(dept.debtAvg))}${unitDriver('DTPN BQ/MG · triệu/người',fmt(dept.feeAvgMg,2))}${unitDriver('DTPN BQ/CTV · triệu/người',fmt(dept.feeAvgCtv,2))}</div>
 <div><h5>Phát triển KH mới</h5>${unitDriver('Mở mới tháng · KH',fmt(dept.newMtd))}${unitDriver('Đã nộp tiền · KH / %',fmt(dept.newFunded)+' / '+ratioText(dept.newFunded,dept.newMtd))}${unitDriver('Khớp lần đầu · KH / %',fmt(dept.newMatched)+' / '+ratioText(dept.newMatched,dept.newMtd))}</div>
 <div><h5>KH cũ & tài sản</h5>${unitDriver('Tổng KH cũ',fmt(dept.oldCustomers))}${unitDriver('KH cũ khớp trong tháng',fmt(dept.oldMatched))}${unitDriver('NAV cuối ngày · tỷ',fmt(dept.nav))}${unitDriver('Sức mua khả dụng · tỷ',fmt(dept.purchasingPower))}</div></div>`;
 document.getElementById('close-department').addEventListener('click',()=>{panel.hidden=true;document.querySelectorAll('[data-department]').forEach(b=>b.setAttribute('aria-expanded','false'))});
 panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
const segmentDefs=[
 ['A',`NAV ≥ 10 triệu · đã khớp tháng ${D.prevMonth}`,'Duy trì giao dịch'],
 ['B',`NAV &lt; 10 triệu · đã khớp tháng ${D.prevMonth}`,'Duy trì giao dịch'],
 ['C',`NAV ≥ 10 triệu · chưa khớp tháng ${D.prevMonth}`,'Tái kích hoạt'],
 ['D',`NAV &lt; 10 triệu · chưa khớp tháng ${D.prevMonth}`,'Kích hoạt']
];
function showUnit(name){
 const u=units.find(x=>x.name===name);if(!u)return;
 const pane=document.getElementById('unit-detail');pane.hidden=false;
 const r=u.resources||{},flow=customerFlowInput.units[u.name];
 const benchmarks=company.resourceBenchmarks||{};
 const mgAverage=unitPerPerson(r.feeTotalMg,r.mg),ctvAverage=unitPerPerson(r.feeTotalCtv,r.ctv),newAverage=r.newAvgMg??null;
 const compareAverage=(value,base)=>signed(isNum(value)&&base>0?(value/base-1)*100:null,1,'%');
 const navPrev=prevOf(u.navSeries),navStart=u.navSeries?.[0]??null,aumStart=u.aumSeries?.[0]??null;
 const deltaValue=(current,previous)=>isNum(current)&&isNum(previous)?current-previous:null;
 const unitCohort=fixedCohort.centers?.[u.name];
 const unitGroups=unitCohort?.groups;
 const oldCustomers=isNum(flow?.total)&&isNum(flow?.opened)?flow.total-flow.opened:null;
 const baseGroupCount=unitGroups?segmentDefs.reduce((sum,[key])=>sum+(unitGroups[key]?.baseCount||0),0):null;
 const unitSegmentCards=segmentDefs.map(([key,label,role])=>{
  const g=unitGroups?.[key];
  if(!g)return `<article class="unit-segment"><h4>Nhóm ${key} · ${label}</h4><div class="count">— KH</div><p>Chưa có dữ liệu theo đơn vị.</p></article>`;
  return `<article class="unit-segment"><h4>Nhóm ${key} · ${label}</h4><div class="count">${fmt(g.count)} KH <small>· chốt ${D.label}: ${fmt(g.baseCount)}</small></div><p>${role}: ${fmt(g.matchedMtd)} KH khớp tháng ${D.month} · ${ratioText(g.matchedMtd,g.count)} của nhóm</p><p>NAV hiện tại / BQ tháng ${D.prevMonth}: ${fmt(g.navCurrent,2)} / ${fmt(g.navPreviousAverage,2)} tỷ</p><p>Tiền mặt hiện tại / BQ tháng ${D.prevMonth}: ${fmt(g.cashCurrent,2)} / ${fmt(g.cashPreviousAverage,2)} tỷ</p><p>GTGD lũy kế ${D.T} / cả ${D.Tp}: ${fmt(g.gtgdMtd,2)} / ${fmt(g.gtgdPreviousMonth,2)} tỷ</p><p>Phí net lũy kế ${D.T} / cả ${D.Tp}: ${fmt(g.feeMtd,2)} / ${fmt(g.feePreviousMonth,2)} triệu</p><p>Riêng giai đoạn ${D.week}: ${fmt(g.matchedWeek)} KH khớp · ${fmt(g.gtgdWeek,2)} tỷ GTGD · ${fmt(g.feeWeek,2)} triệu phí</p></article>`;
 }).join('');
 const channelLabel=u.channel==='Digital'?'Digital':u.channel==='Khác'?'Khác':'MG';
 const staffFee=r.feeTotalCombined,feeGap=sub(staffFee,u.feeMtdAtStaff);
 pane.innerHTML=`<div class="unit-detail-header"><div><h3>${esc(u.name)} · chi tiết kinh doanh</h3><div class="source">${D.rangeFull} · ${D.sessions} phiên · MG/CTV và kết quả phòng chốt ${D.staff}</div></div><button class="unit-close" type="button" id="close-detail">Đóng chi tiết</button></div>
 <nav class="unit-detail-nav" aria-label="Nội dung chi tiết trung tâm"><a href="#unit-resources">Nguồn lực</a><a href="#unit-assets">Tài sản & dòng tiền</a><a href="#unit-old-customers">KH cũ</a><a href="#unit-new-customers">KH mới</a><a href="#unit-departments">Các phòng</a></nav>
 ${unitExecutiveCards(u)}
 <div class="unit-driver-grid">
 <article class="unit-driver" id="unit-resources"><h3>1. Nguồn lực & năng suất</h3><div class="period">Nguồn lực & DTPN MG/CTV · chốt ${D.staff}</div>
 ${unitMetricTable([
  ['Số MG',fmt(r.mg),signed(r.mgChange)+' người','theo cây cơ cấu'],
  ['Số CTV',fmt(r.ctv),signed(r.ctvChange)+' người'],
  ['DTPN BQ/MG',fmt(mgAverage,2),compareAverage(mgAverage,benchmarks.feeAvgMg),fmt(r.feeTotalMg,2)+' triệu / '+fmt(r.mg)+' MG · BQ công ty '+fmt(benchmarks.feeAvgMg,2)],
  ['DTPN BQ/CTV',fmt(ctvAverage,2),compareAverage(ctvAverage,benchmarks.feeAvgCtv),fmt(r.feeTotalCtv,2)+' triệu / '+fmt(r.ctv)+' CTV · BQ công ty '+fmt(benchmarks.feeAvgCtv,2)],
  [`KH mở mới BQ/MG · ${D.staff}`,fmt(newAverage,2),compareAverage(newAverage,benchmarks.newAvgMg),fmt(u.newMtdAt12)+` KH mở mới đến ${D.staff} / `+fmt(r.mg)+' MG']
 ],`MG/CTV: Δ ${D.staffPrior}<br>Năng suất: so BQ công ty`)}
 <a class="unit-definition-link" href="#unit-methodology">Định nghĩa DTPN BQ & nguồn số liệu ↓</a></article>
 <article class="unit-driver" id="unit-assets"><h3>2. Tài sản & dòng tiền</h3><div class="period">Tài sản & dòng tiền · ${D.report}</div>
 <div class="unit-asset-line"><div><div class="metric-title">NAV cuối ngày</div><strong>${fmt(u.nav)} tỷ</strong><div class="delta">So ${D.first} ${signed(deltaValue(u.nav,navStart))} tỷ · phiên trước ${signed(deltaValue(u.nav,navPrev))} tỷ</div></div><div class="mini-line">${unitChart(u.navSeries,'NAV cuối ngày','tỷ','line',true)}</div></div>
 <div class="unit-asset-line"><div><div class="metric-title">AUM cuối ngày</div><strong>${fmt(u.aum)} tỷ</strong><div class="delta">So ${D.first} ${signed(deltaValue(u.aum,aumStart))} tỷ</div></div><div class="mini-line">${unitChart(u.aumSeries,'AUM cuối ngày','tỷ','line',true)}</div></div>
 <div class="unit-asset-cash"><div>Nạp / rút ròng tháng<strong>${fmt(u.cashNetMonth)} tỷ</strong><small>Hôm nay ${net(u.net)} tỷ</small></div><div>Điều chuyển nội bộ tháng<strong>${fmt(u.internalTransferMonth)} tỷ</strong><small>Tách khỏi dòng tiền bên ngoài</small></div></div>
 <div class="unit-asset-facts"><div><span>Nạp / rút hôm nay</span><strong>${fmt(u.cashIn,2)} / ${fmt(u.cashOut,2)} tỷ</strong></div><div><span>KH nạp / rút hôm nay</span><strong>${fmt(u.inCount)} / ${fmt(u.outCount)} KH</strong></div></div>
 </article>
  <article class="unit-driver" id="unit-old-customers"><h3>3. Hiệu quả tệp KH cũ</h3><div class="period">Nhãn chốt ${D.label} · hiệu quả đến ${D.abcd}</div>
  <div class="unit-old-summary"><div>KH cũ hiện tại (tổng KH − mở mới tháng)<strong>${fmt(oldCustomers)} KH</strong></div><div>KH trong nhãn đầu tháng<strong>${fmt(baseGroupCount)} KH</strong></div></div>
  <details class="unit-old-groups"><summary>Xem hiệu quả bốn nhóm A–D</summary><div class="unit-segment-grid">${unitSegmentCards}</div></details></article>
  <article class="unit-driver" id="unit-new-customers"><h3>4. Phát triển khách hàng mới</h3><div class="period">Mở mới và chuyển đổi · KH chốt ${customerFlowInput.asOf}</div>
  <div class="unit-old-summary"><div>Mở mới lũy kế tháng<strong>${fmt(flow?.opened)} KH</strong></div><div>Mở mới trong ngày<strong>${fmt(flow?.day)} KH</strong></div></div><div class="unit-new-channels"><span>Kênh <strong>${channelLabel}</strong></span><span>Tổng KH hiện tại <strong>${fmt(flow?.total)} KH</strong></span></div>
  <div class="unit-detail-chart">${unitChart(u.openSeries,'KH mở mới từng ngày','KH')}</div>
  ${unitMetricTable([['KH mới đã nộp tiền',fmt(flow?.funded)+' KH',ratioText(flow?.funded,flow?.opened)],['KH mới đã khớp lệnh',fmt(flow?.matched)+' KH',ratioText(flow?.matched,flow?.opened)]],'% KH mở mới')}
  <div class="unit-cohort-summary"><span>NAV KH mới <strong>${fmt(flow?.nav,2)} tỷ</strong></span><span>Dư nợ KH mới <strong>${fmt(flow?.debt,2)} tỷ</strong></span><span>GTGD KH mới <strong>${fmt(flow?.gtgd,2)} tỷ</strong></span><span>Phí net KH mới <strong>${fmt(flow?.fee,2)} triệu</strong></span></div><div class="unit-cohort-summary"><span>Chưa nộp tiền <strong>${fmt(isNum(flow?.opened)&&isNum(flow?.funded)?flow.opened-flow.funded:null)} KH</strong></span><span>Chưa khớp lệnh <strong>${fmt(isNum(flow?.opened)&&isNum(flow?.matched)?flow.opened-flow.matched:null)} KH</strong></span></div></article></div>
 <section class="unit-driver unit-departments" id="unit-departments"><h3>5. Kết quả & năng suất từng phòng</h3><div class="period">Cơ cấu & hiệu quả phòng · chốt ${D.staff}</div>${unitDepartmentTable(u)}<div class="unit-department-detail" id="unit-department-detail" hidden></div></section>
 <details class="unit-methodology" id="unit-methodology"><summary>Định nghĩa & đối soát số liệu</summary>
 <p>DTPN = doanh thu phí net. DTPN BQ/MG = DTPN MG tháng / số MG; BQ/CTV = DTPN CTV tháng / số CTV. Mẫu số lấy cây cơ cấu tại ${D.staff}. KH mở mới BQ/MG = tổng mở mới đến ${D.staff} / số MG tại ${D.staff}. ${isNum(staffFee)?`Tổng DTPN theo phòng ${fmt(staffFee,2)} triệu (MG ${fmt(r.feeTotalMg,2)}; CTV ${fmt(r.feeTotalCtv,2)}; chưa phân loại ${fmt(r.feeTotalUnclassified,2)}); phí lũy kế theo chuỗi phiên đến ${D.staff} ${fmt(u.feeMtdAtStaff,2)} triệu, chênh ${fmt(feeGap,2)} triệu.`:'Chưa có DTPN MG/CTV theo phòng của đơn vị, giữ —.'} Mẫu số bằng 0 hoặc thiếu thì giữ —.</p>
 <p>Δ nhân sự so ${D.staffPrior} là so mốc kỳ trước, không phải cùng kỳ. ${r.other?'Có thêm '+fmt(r.other)+' người loại khác, không gộp vào MG/CTV.':''} Nhân sự chưa phân phòng giữ riêng; không phân bổ doanh thu trung tâm cho phòng theo số người. Số đơn vị = tổng các phòng.</p>
 <p>Kết quả tháng = tổng các phiên ${D.range}; cùng kỳ = lũy kế cùng số phiên tháng trước. Thị phần BQ tháng lấy BQ lũy kế tại ${D.report}; thị phần từng sàn của đơn vị chỉ hiện khi nguồn có. BQ ${AVG_WINDOW} phiên gồm ngày báo cáo. Dư nợ BQ = bình quân các phiên có dữ liệu. So ${D.first} dùng số cuối ngày ${D.first}, chưa phải số dư đầu tháng.</p>
 <p>KH mới nộp tiền/khớp lệnh đếm độc lập trên tệp mở mới tháng của đơn vị (chốt ${D.kh}). Kênh mở KH theo danh mục đơn vị. Nhãn A–D chốt ${D.label}; quy mô và hiệu quả đến ${D.abcd}. NAV âm là nhãn chồng trong A–D, không cộng thêm. — là chưa có dữ liệu, không phải 0.</p></details>`;
 if(unitExecutiveObserver)unitExecutiveObserver.disconnect();
 unitExecutiveObserver=new ResizeObserver(entries=>entries.forEach(e=>renderUnitExecutiveChart(e.target,u)));
 pane.querySelectorAll('[data-unit-chart]').forEach(el=>{renderUnitExecutiveChart(el,u);unitExecutiveObserver.observe(el)});
 document.getElementById('close-detail').addEventListener('click',()=>{pane.hidden=true});
 pane.querySelectorAll('[data-department]').forEach(b=>b.addEventListener('click',()=>showUnitDepartment(u,b.dataset.department)));
 pane.querySelectorAll('.unit-detail-nav a,.unit-definition-link').forEach(a=>a.addEventListener('click',event=>{
  event.preventDefault();const target=pane.querySelector(a.getAttribute('href'));
  if(target){if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({behavior:'smooth',block:'start'})}
 }));
 pane.scrollTop=0;
 if(!document.body.classList.contains('tv-mode'))pane.scrollIntoView({behavior:'smooth',block:'start'});
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('unit-detail').hidden=true});
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{selectTab('units');document.getElementById('unit-search').value='';renderUnits();if(b.dataset.jump!=='all')showUnit(b.dataset.jump);else document.getElementById('unit-detail').hidden=true}));document.getElementById('all-units').addEventListener('click',()=>{selectTab('units');document.getElementById('unit-search').value='';renderUnits()});document.getElementById('print').addEventListener('click',()=>window.print());
renderUnits();
function fitTVBoard(){
 const board=document.querySelector('.shell');
 if(document.body.classList.contains('tv-mode')){
  const scale=Math.min(window.innerWidth/1920,window.innerHeight/1080);
  board.style.transform=`scale(${scale})`;
  board.style.left=`${Math.max(0,(window.innerWidth-1920*scale)/2)}px`;
  board.style.top=`${Math.max(0,(window.innerHeight-1080*scale)/2)}px`;
 }else{['transform','left','top'].forEach(p=>board.style.removeProperty(p))}
}
function setTVMode(on){
 document.body.classList.toggle('tv-mode',on);
 const button=document.getElementById('tv-toggle');
 button.setAttribute('aria-pressed',String(on));
 button.textContent=on?'Chế độ đọc':'Màn hình TV';
 fitTVBoard();miniCharts.forEach(renderDailyMiniChart);
}
document.getElementById('tv-toggle').addEventListener('click',()=>setTVMode(!document.body.classList.contains('tv-mode')));
document.getElementById('fullscreen').addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement){await document.exitFullscreen()}
  else{setTVMode(true);if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else document.getElementById('fullscreen').textContent='Dùng F11'}
 }catch{document.getElementById('fullscreen').textContent='Dùng F11'}
});
document.addEventListener('fullscreenchange',()=>{document.getElementById('fullscreen').textContent=document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình';fitTVBoard()});
window.addEventListener('resize',fitTVBoard);

// ----- KH & luồng KH mới -----
function customerRatio(n,d){return n===null||n===undefined||!isNum(d)||d<=0?null:n/d*100}
function ratioText(n,d){const r=customerRatio(n,d);return r===null?'—%':fmt(r,2)+'%'}
const cohortStep=(i,title,count,ratio,note)=>`<li class="cohort-step"><span class="step-index">${i}</span><div class="step-content"><h3>${title}</h3><div class="step-result"><strong>${fmt(count)} <small>KH</small></strong><span>${ratio}</span></div><p>${note}</p></div></li>`;
const pendingStep=(opened,funded,matched,note)=>`<li class="cohort-step pending-step"><span class="step-index">4</span><div class="step-content"><h3>Theo dõi KH chưa sử dụng</h3><p>${note}</p><div class="pending-row"><span>Chưa nộp tiền</span><strong>${fmt(isNum(opened)&&isNum(funded)?opened-funded:null)} KH</strong></div><div class="pending-row"><span>Chưa khớp lệnh</span><strong>${fmt(isNum(opened)&&isNum(matched)?opened-matched:null)} KH</strong></div></div></li>`;
function renderCustomerFlow(){
 const p=customerFlowInput.all;
 document.getElementById('cohort-scope-caption').textContent='Chốt '+customerFlowInput.asOf+' · Tệp '+fmt(p.opened)+' KH mới';
 const channels=['MG','Digital','Khác'].map(ch=>[ch,customerFlowInput.viaChannel(ch)]).filter(([,n])=>isNum(n)&&n>0).map(([ch,n])=>`<span class="flow-channel">${ch==='MG'?'Qua MG':ch} <strong>${fmt(n)} KH</strong></span>`).join('');
 document.getElementById('new-customer-flow').innerHTML=cohortStep(1,'Tổng KH mở mới',p.opened,'100%',channels)+cohortStep(2,'KH mới đã nộp tiền',p.funded,ratioText(p.funded,p.opened),'Trong tổng '+fmt(p.opened)+' KH mở mới tháng')+cohortStep(3,'Khớp lệnh lần đầu',p.matched,ratioText(p.matched,p.opened),'Đếm trên tổng '+fmt(p.opened)+' KH mở mới tháng')+pendingStep(p.opened,p.funded,p.matched,'Trạng thái chờ tại bước 2–3');
 document.getElementById('new-customer-flow-foot').textContent='Mốc nộp tiền và khớp lệnh đếm độc lập trên '+fmt(p.opened)+' KH mới; nguồn '+customerFlowInput.source+'.';
}
function renderCustomerStrip(unitName){
 const isCompany=unitName==='all',scope=isCompany?customerFlowInput.all:customerFlowInput.units[unitName];
 const total=scope?.total??null,opened=scope?.opened??null,old=isNum(total)&&isNum(opened)?total-opened:null;
 const show=(id,value)=>{document.getElementById(id).innerHTML=fmt(value)+' <small>KH</small>'};
 show('customer-total-value',total);show('customer-new-value',opened);show('customer-old-value',old);
 document.getElementById('customer-sheet-scope-note').textContent=(isCompany?'Toàn công ty':unitName)+' · KH và luồng mở mới chốt '+customerFlowInput.asOf;
 document.getElementById('customer-total-note').textContent='Số tại '+customerFlowInput.asOf;
 document.getElementById('customer-new-note').textContent=`Mở mới tháng ${D.month} · hôm nay ${fmt(scope?.day??null)} KH`;
 document.getElementById('customer-old-note').textContent=`Tổng KH − mở mới tháng ${D.month} · không dùng làm mẫu số nhãn ${D.label}`;
}
function renderUnitCustomerFlow(u){
 const scope=customerFlowInput.units[u.name],opened=scope?.opened??null,funded=scope?.funded??null,matched=scope?.matched??null;
 document.getElementById('cohort-scope-caption').textContent=u.name+' · chốt '+customerFlowInput.asOf+' · '+fmt(opened)+' KH mở mới';
 const channel=u.channel==='Digital'?'Kênh Digital':u.channel==='Khác'?'Đơn vị khác':'Kênh MG';
 document.getElementById('new-customer-flow').innerHTML=cohortStep(1,'Tổng KH mở mới',opened,opened>0?'100%':'—%',channel+' · '+fmt(scope?.day??null)+' KH hôm nay')+cohortStep(2,'KH mới đã nộp tiền',funded,ratioText(funded,opened),'Trong '+fmt(opened)+' KH mở mới của đơn vị')+cohortStep(3,'Khớp lệnh lần đầu',matched,ratioText(matched,opened),'Trong '+fmt(opened)+' KH mở mới của đơn vị')+pendingStep(opened,funded,matched,'Hai trạng thái đếm độc lập trên tệp mở mới');
 document.getElementById('new-customer-flow-foot').textContent='Nguồn '+customerFlowInput.source+' · '+u.name+'. Mốc nộp tiền và khớp lệnh đếm độc lập trên cùng tệp mở mới của đơn vị.';
}
function renderCustomerGroups(){
 const select=document.getElementById('abcd-unit-filter');
 select.innerHTML='<option value="all">Toàn công ty</option>'+units.map(u=>`<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');
 const compare=(current,previous,kind)=>{
  if(!isNum(current)||!isNum(previous))return {label:'—',tone:''};
  if(previous<0)return {label:'Không tính %',tone:''};if(previous===0)return {label:current>0?'Mới phát sinh':'Không tính %',tone:current>0?'positive':''};
  const value=kind==='attainment'?current/previous*100:(current/previous-1)*100;
  return {label:(kind==='attainment'?'Đạt ':'')+(kind==='change'&&value>0?'+':'')+fmt(value,1)+'%',tone:kind==='change'?(value>0?'positive':value<0?'negative':''):''};
 };
 const metric=(label,current,previous,unit,currentPeriod,previousPeriod,kind)=>{
  const comparison=compare(current,previous,kind);
  return '<div class="cohort-metric"><div class="cohort-metric-head"><b>'+label+'</b><em class="'+comparison.tone+'">'+comparison.label+'</em></div><div class="cohort-metric-pair"><span><strong>'+fmt(current,2)+' '+unit+'</strong><small>'+currentPeriod+'</small></span><span><strong>'+fmt(previous,2)+' '+unit+'</strong><small>'+previousPeriod+'</small></span></div></div>';
 };
 const redraw=()=>{
  const unit=select.value;
  renderCustomerStrip(unit);
  if(unit==='all')renderCustomerFlow();else renderUnitCustomerFlow(units.find(item=>item.name===unit));
  const scope=unit==='all'?fixedCohort.company:fixedCohort.centers?.[unit];
  const groups=scope?.groups||{};
  document.querySelector('.fixed-cohort-status').textContent=scope?.asOf?`Nhãn ${D.label} · quy mô và hiệu quả ${scope.asOf} · NAV âm chồng ${fmt(scope.navNegativeOverlap)} KH`:`${unit==='all'?'Toàn công ty':unit} · đang chờ dữ liệu gán nhãn ${D.label}`;
  for(const key of ['A','B','C','D']){
   const g=groups[key]||{},tile=document.querySelector(`[data-segment="${key}"]`);
   const count=g.count??null,matched=g.matchedMtd??null;
   tile.querySelector('.segment-count').innerHTML=`${fmt(count)} <small>KH tại ${D.abcd} · chốt ${D.label}: ${fmt(g.baseCount)}</small>`;tile.querySelector('.segment-count').setAttribute('title',`Chốt ${D.label}: ${fmt(g.baseCount)} KH; hiện tại: ${fmt(count)} KH`);
   tile.querySelector('.segment-activation strong').textContent=`${fmt(matched)} KH`;
   tile.querySelector('.segment-activation span').textContent=count>0&&matched!==null?`${pct(matched/count*100,1)} của nhóm`:'—% của nhóm';
   const inactiveLastMonth=(key==='C'||key==='D')&&Boolean(scope);
   tile.querySelector('.segment-metrics').innerHTML=[
    metric('NAV',g.navCurrent,g.navPreviousAverage,'tỷ','Hiện tại',`BQ tháng ${D.prevMonth}`,'change'),
    metric('Tiền mặt',g.cashCurrent,g.cashPreviousAverage,'tỷ','Hiện tại',`BQ tháng ${D.prevMonth}`,'change'),
    metric('GTGD',g.gtgdMtd,inactiveLastMonth?(g.gtgdPreviousMonth??0):g.gtgdPreviousMonth,'tỷ',`Lũy kế ${D.T}`,`Cả tháng ${D.prevMonth}`,'attainment'),
    metric('Phí net',g.feeMtd,inactiveLastMonth?(g.feePreviousMonth??0):g.feePreviousMonth,'triệu',`Lũy kế ${D.T}`,`Cả tháng ${D.prevMonth}`,'attainment')
   ].join('');
   tile.querySelector('.segment-watch').innerHTML=`<div class="watch-row"><span>Riêng giai đoạn ${D.week}: <b>${fmt(g.matchedWeek)} KH</b> khớp lệnh</span><strong>${fmt(g.gtgdWeek,2)} tỷ GTGD · ${fmt(g.feeWeek,2)} triệu phí</strong></div>`;
  }
 };
 select.addEventListener('change',redraw);redraw();
}
renderCustomerGroups();

// ----- PKKH -----
const pkkhData=M.pkkh;
const pkkhBusiness=['Dormant','Mass','Active Trader','HVT','HNW','UHNW','Block Deal (BD)'];
const pkkhStatus=['Zero','Unclassified','Other'];
const pkkhEmpty=Object.fromEntries(pkkhData.fields.map(field=>[field,0]));
const pkkhMetric=(unit,label)=>pkkhData.values[unit]?.[label]||pkkhEmpty;
const pkkhSum=unit=>pkkhData.labels.reduce((total,label)=>{const item=pkkhMetric(unit,label);for(const field of pkkhData.fields)total[field]+=item[field];return total},{...pkkhEmpty});
const pkkhBn=value=>fmt(value,Math.abs(value)<10&&value!==0?2:1);
const pkkhShare=(value,total)=>{if(total<=0)return '—';const share=value/total*100;return `${fmt(share,share!==0&&Math.abs(share)<0.01?4:share!==0&&Math.abs(share)<0.1?2:1)}%`};
const pkkhChange=(current,previous)=>{if(previous<=0)return '—';const delta=(current/previous-1)*100;return Math.abs(delta)<0.05?'0,0%':signed(delta,1,'%')};
const pkkhProgress=(current,previous)=>previous>0?fmt(current/previous*100,1)+'%':'—';
const pkkhCell=(main,sub)=>`<span class="pkkh-cell-main">${main}</span><span class="pkkh-cell-sub">${sub}</span>`;
function renderPkkh(){
 const unit=document.getElementById('pkkh-unit-filter').value;
 const selected=unit==='all'?'Toàn công ty':unit;
 const total=pkkhSum(unit);
 document.getElementById('pkkh-overview').innerHTML=`
  <article class="pkkh-kpi"><span>KH gắn nhãn đầu tháng</span><strong>${fmt(total.count)}<small> KH</small></strong><em>${esc(selected)} · nhãn ${D.label} · hiệu quả ${D.pkkh}</em></article>
  <article class="pkkh-kpi"><span>KH khớp lệnh tháng ${D.month}</span><strong>${fmt(total.matched)}<small> KH</small></strong><em>${pkkhShare(total.matched,total.count)} tệp đầu tháng</em></article>
  <article class="pkkh-kpi"><span>NAV hiện tại · ${D.pkkh}</span><strong>${pkkhBn(total.navCurrent)}<small> tỷ</small></strong><em>BQ tháng ${D.prevMonth} ${pkkhBn(total.navPrevious)} tỷ · ${pkkhChange(total.navCurrent,total.navPrevious)}</em></article>
  <article class="pkkh-kpi"><span>GTGD lũy kế tháng ${D.month}</span><strong>${pkkhBn(total.tradeMtd)}<small> tỷ</small></strong><em>Cả tháng ${D.prevMonth} ${pkkhBn(total.tradePrevious)} tỷ · đạt ${pkkhProgress(total.tradeMtd,total.tradePrevious)}</em></article>
  <article class="pkkh-kpi"><span>Phí net lũy kế tháng ${D.month}</span><strong>${fmt(total.feeMtd,1)}<small> triệu</small></strong><em>Cả tháng ${D.prevMonth} ${fmt(total.feePrevious,1)} triệu · đạt ${pkkhProgress(total.feeMtd,total.feePrevious)}</em></article>`;
 const row=(label,item,denominator,first,second)=>`<tr${label&&pkkhStatus.includes(label)?' class="pkkh-data-label"':''}><th scope="row">${esc(label||'Tổng tệp gắn nhãn')}</th>
   <td>${pkkhCell(fmt(item.count)+' KH',first)}</td>
   <td>${pkkhCell(fmt(item.matched)+' KH',second)}</td>
   <td>${pkkhCell(pkkhBn(item.navCurrent)+' tỷ',`BQ ${D.Tp} `+pkkhBn(item.navPrevious)+' · '+pkkhChange(item.navCurrent,item.navPrevious))}</td>
   <td>${pkkhCell(pkkhBn(item.tradeMtd)+' tỷ',`Cả ${D.Tp} `+pkkhBn(item.tradePrevious)+' · đạt '+pkkhProgress(item.tradeMtd,item.tradePrevious))}</td>
   <td>${pkkhCell(fmt(item.feeMtd,1)+' triệu',`Cả ${D.Tp} `+fmt(item.feePrevious,1)+' · đạt '+pkkhProgress(item.feeMtd,item.feePrevious))}</td>
   <td>${pkkhCell(pkkhBn(item.debtCurrent)+' tỷ',`BQ ${D.Tp} `+pkkhBn(item.debtPrevious)+' · '+pkkhChange(item.debtCurrent,item.debtPrevious))}</td></tr>`;
 document.getElementById('pkkh-table-body').innerHTML=pkkhData.labels.map(label=>{const item=pkkhMetric(unit,label);return row(label,item,total.count,pkkhShare(item.count,total.count)+' tệp',pkkhShare(item.matched,item.count)+' trong nhóm')}).join('');
 document.getElementById('pkkh-table-total').innerHTML=row(null,total,total.count,'100% của đơn vị',pkkhShare(total.matched,total.count)+' của tệp');
 const maxCount=Math.max(...pkkhBusiness.map(label=>pkkhMetric(unit,label).count),1);
 document.getElementById('pkkh-business-bars').innerHTML=pkkhBusiness.map(label=>{const item=pkkhMetric(unit,label);return `<div class="pkkh-bar-row"><span>${esc(label)}</span><div class="pkkh-bar-track"><i style="width:${Math.max(item.count/maxCount*100,item.count?2:0)}%"></i></div><strong>${fmt(item.count)}</strong></div>`}).join('');
 document.getElementById('pkkh-status-list').innerHTML=pkkhStatus.map(label=>{const item=pkkhMetric(unit,label);return `<div class="pkkh-status-row"><span>${esc(label)}</span><strong>${fmt(item.count)} KH</strong><small>${pkkhShare(item.count,total.count)}</small></div>`}).join('');
 document.getElementById('pkkh-source-note').textContent=pkkhData.hasData?`Nhãn ${D.label} cố định; hiệu quả tại ${D.pkkh}. Tệp gắn nhãn: ${fmt(total.count)} KH. Toàn công ty = tổng các đơn vị. Số tài sản/giao dịch chỉ thuộc tệp PKKH, không thay tổng toàn hàng.`:'Chưa có dữ liệu PKKH trong data.json.';
}
{
 const selector=document.getElementById('pkkh-unit-filter');
 selector.insertAdjacentHTML('beforeend',pkkhData.units.map(unit=>`<option value="${esc(unit.key)}">${esc(unit.label)}</option>`).join(''));
 selector.addEventListener('change',renderPkkh);
 renderPkkh();
}

const initialTab=location.hash.slice(1);selectTab(['daily','customers','segments','units','data'].includes(initialTab)?initialTab:'daily');
}

boot();
})();
