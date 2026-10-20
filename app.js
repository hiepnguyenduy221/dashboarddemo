"use strict";

async function loadDashboardData() {
  const files = {
    reportData: 'data/report.json',
    abcd: 'data/abcd.json',
    pkkhMonthly: 'data/pkkh-monthly.json',
    customerFlowInput: 'data/customer-flow.json',
    editorial: 'data/editorial.json',
  };
  const entries = await Promise.all(Object.entries(files).map(async ([key, filename]) => {
    const response = await fetch(new URL(filename, document.baseURI), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
    return [key, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  data.reportData.fixedCustomerCohort = data.abcd;
  data.reportData.pkkh = data.pkkhMonthly.catalog;
  data.reportData.sourceDates.abcdLabel = data.abcd.company.labelDate;
  data.reportData.sourceDates.abcdPerformance = data.abcd.company.asOf;
  data.reportData.sourceDates.pkkhCompanyPerformance = data.pkkhMonthly.reportDate;
  data.reportData.sourceDates.pkkhCenterPerformance = data.pkkhMonthly.centerReportDate;
  return data;
}

function showDashboardError(error) {
  console.error('Dashboard data load failed:', error);
  const banner = document.createElement('div');
  banner.className = 'data-error';
  banner.setAttribute('role', 'alert');
  banner.textContent = location.protocol === 'file:'
    ? 'Không thể nạp JSON khi mở index.html trực tiếp. Hãy chạy demo bằng máy chủ tĩnh từ thư mục dự án.'
    : 'Không thể nạp dữ liệu dashboard. Hãy kiểm tra các file trong thư mục data và tải lại trang.';
  document.body.prepend(banner);
  document.documentElement.classList.add('data-failed');
}

function initDashboard({ reportData, pkkhMonthly, customerFlowInput, editorial }) {
const company=reportData.company;
const units=reportData.units;
units.forEach(u=>{u.feeAvg5=u.feeSeries?u.feeSeries.slice(-5).reduce((a,b)=>a+b,0)/5:null;u.growthPct=u.feeChange!==null&&u.feeMtd-u.feeChange>0?u.feeChange/(u.feeMtd-u.feeChange)*100:null;u.momentum=u.feeAvg5>0?(u.fee/u.feeAvg5-1)*100:null});
function signed(n,d=0,suffix=''){return n===null||n===undefined?'—':`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n,d)}${suffix}</span>`}
function pct(n,d=1){return n===null||n===undefined?'—':fmt(n,d)+'%'}
const series={open:{label:'KH mở mới',unit:'KH',values:reportData.series.open},gtgd:{label:'GTGD',unit:'tỷ đồng',values:reportData.series.gtgd},fee:{label:'Phí net',unit:'triệu đồng',values:reportData.series.fee},share:{label:'Thị phần ngày',unit:'%',values:reportData.series.share},debt:{label:'Dư nợ cuối ngày',unit:'tỷ đồng',values:reportData.series.debt}};
const dates=reportData.dates;
const viewDates={
 business:reportData.reportDate.slice(0,5),businessFull:reportData.reportDate,
 first:dates[0],period:`${dates[0].slice(0,2)}–${reportData.reportDate.slice(0,5)}`,
 flow:customerFlowInput.asOf.slice(0,5),org:reportData.organizationSource.asOf.slice(0,5),orgFull:reportData.organizationSource.asOf,
 label:reportData.sourceDates.abcdLabel.slice(0,5),abcd:reportData.sourceDates.abcdPerformance.slice(0,5),
 month:Number(reportData.reportDate.slice(3,5)),priorMonth:Number(reportData.sourceDates.abcdLabel.slice(3,5)),
 week:reportData.fixedCustomerCohort.company.weekFrom.slice(0,5)
};
function fmt(n,d=0){return n===null||n===undefined?"—":new Intl.NumberFormat("vi-VN",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function change(n){return n===null?"—":`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n)}</span>`}
function net(n){return n===null?"—":`<span class="${n>0?'up':n<0?'down':'neutral'}">${n>0?'+':''}${fmt(n,Math.abs(n)<1?3:0)}</span>`}
function renderReportHeaderAndDaily(){
 const c=company,s=reportData.series,parts=reportData.reportDate.split('/'),day=parts[0],month=parts[1],year=parts[2];
 const period=`01–${day}/${month}/${year}`,shortPeriod=`01–${day}/${month}`,sessions=dates.length;
 const avg=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
 const last=values=>values.at(-1),prior=values=>values.at(-2);
 const trend=(value,digits=0,unit='')=>`${value>0?'↑':value<0?'↓':'='} ${fmt(Math.abs(value),digits)}${unit}`;
 const tone=value=>value>0?'up':value<0?'down':'neutral';
 const set=(selector,html)=>{const el=document.querySelector(selector);if(!el)throw new Error(`Missing dashboard element: ${selector}`);el.innerHTML=html;return el};
 document.title=`SHS | Kết quả tháng & Daily CEO · ${day}.${month}.${year}`;
 document.querySelector('meta[name="description"]').content=`Demo báo cáo daily CEO SHS, dữ liệu kinh doanh ${reportData.reportDate}.`;
 document.querySelector('.date').innerHTML=`<span>Dữ liệu</span> ${day} / ${month} / ${year}`;
 set('#month-title',`Kết quả tháng ${Number(month)}`);
 set('.month-section > .band-heading > span',`${period} · ${sessions} phiên có dữ liệu`);
 set('.market-hero .hero-value',`${fmt(c.shareMonth,2)}<span>%</span>`);
 const planGap=c.shareMonth-c.sharePlan;
 set('.market-hero .hero-gap',`${planGap<0?'−':'+'}${fmt(Math.abs(planGap),2)} <span>điểm % so kế hoạch</span>`).className=`hero-gap ${tone(planGap)}`;
 set('.market-hero .hero-prior',`${trend(c.shareMonthChangeSource,2,' điểm %')} so cùng kỳ tháng trước*`);
 const target=document.querySelector('.market-hero .hero-target');
 target.setAttribute('aria-label',`Thị phần tháng ${fmt(c.shareMonth,2)} phần trăm, kế hoạch ${fmt(c.sharePlan,2)} phần trăm`);
 const targetValues=target.querySelectorAll('.target-labels strong');
 targetValues[0].textContent=`${fmt(c.shareMonth,2)}%`;targetValues[1].textContent=`${fmt(c.sharePlan,2)}%`;
 target.querySelector('.target-fill').style.width=`${Math.min(c.shareMonth/c.sharePlan*90,90)}%`;
 for(const row of document.querySelectorAll('.exchange-row')){
  const exchange=row.querySelector('.exchange-name').textContent.trim(),value=c.exchangeShares[exchange],delta=c.exchangeChangesSource[exchange];
  row.querySelector('strong').innerHTML=`${fmt(value,2)}<span>%</span>`;
  const comparison=row.querySelector('.exchange-comparison b');comparison.textContent=trend(delta,2,' điểm %');comparison.className=tone(delta);
  row.querySelector('.exchange-comparison small').textContent=c.exchangeComparisonLabel;
 }
 set('.share-trend .executive-chart-title > span:first-child',`Thị phần giao dịch · ${shortPeriod}`);
 set('.market-hero .monthly-daily-footer',`<span>Hôm nay <strong>${fmt(c.shareDay,2)}%</strong></span><span class="${tone(last(s.share)-prior(s.share))}">${trend(last(s.share)-prior(s.share),2,' điểm %')} / phiên trước</span>`);

 const gtgdPct=c.gtgdMonthChange/(c.gtgdMonth-c.gtgdMonthChange)*100;
 set('.trading-primary > .executive-value',`${fmt(c.gtgdMonth)} <span>tỷ đồng</span>`);
 set('.trading-primary > .executive-delta',`${trend(c.gtgdMonthChange,0,' tỷ')} · ${fmt(gtgdPct,1)}% cùng kỳ*`).className=`executive-delta ${tone(c.gtgdMonthChange)}`;
 set('.trading-primary .executive-chart-note',`<span>${shortPeriod} · nét đứt: BQ 5 phiên</span><strong>BQ ${fmt(avg(s.gtgd.slice(-5)),1)} tỷ</strong>`);
 const gtgdAvg5=avg(s.gtgd.slice(-5)),marketPrior=c.marketDay-c.marketChange;
 set('.trading-primary > .monthly-daily-footer',`<span>Hôm nay <strong>${fmt(c.gtgdDay)} tỷ</strong></span><span class="${tone(c.gtgdChange)}">${trend(c.gtgdChange,0,' tỷ')} / phiên trước*</span><small>So BQ 5 phiên <strong class="${tone(c.gtgdDay-gtgdAvg5)}">${fmt((c.gtgdDay/gtgdAvg5-1)*100,1)}%</strong> · thị trường hôm nay <strong class="${tone(c.marketChange)}">${fmt(c.marketChange/marketPrior*100,1)}%</strong></small>`);
 const feePct=c.feeMonthChange/(c.feeMonth-c.feeMonthChange)*100,feeAvg5=avg(s.fee.slice(-5));
 set('.fee-support-month',`<span>Phí net · lũy kế tháng</span><strong>${fmt(c.feeMonth/1000,2)} <small>tỷ đồng</small></strong><span class="${tone(c.feeMonthChange)}">${trend(c.feeMonthChange,0,' triệu')} · ${fmt(feePct,1)}% cùng kỳ*</span>`);
 set('.fee-support-day',`<span>Hôm nay <strong>${fmt(c.feeDay,2)} triệu</strong></span><span class="${tone(c.feeChange)}">${trend(c.feeChange,0,' triệu')} / phiên trước*</span><span>So BQ 5 phiên <strong class="${tone(c.feeDay-feeAvg5)}">${fmt((c.feeDay/feeAvg5-1)*100,1)}%</strong></span>`);

 set('.debt-primary > .executive-value',`${fmt(avg(s.debt))} <span>tỷ đồng</span>`);
 set('.debt-primary > .executive-delta',`Bình quân ${sessions} phiên có dữ liệu · ${shortPeriod}`);
 set('.debt-primary .executive-chart-note',`<span>${shortPeriod} · nét đứt: BQ 5 phiên</span><strong>BQ ${fmt(avg(s.debt.slice(-5)))} tỷ</strong>`);
 set('.debt-primary .monthly-daily-footer',`<span>Cuối ngày <strong>${fmt(c.debt)} tỷ</strong></span><span class="${tone(c.debtChangeSource)}">${trend(c.debtChangeSource,0,' tỷ')} / phiên trước*</span><small>So ${dates[0]} <strong class="${tone(c.debt-s.debt[0])}">${fmt(c.debt-s.debt[0])} tỷ</strong></small>`);
 const components=c.debtComponents;
 document.querySelectorAll('.debt-components strong').forEach((el,i)=>{el.textContent=fmt([components.margin,components.advance,components.thirdParty][i])});
 const debtBreakdown=document.querySelector('#daily .debt-primary .debt-support');
 if(debtBreakdown)debtBreakdown.style.display=[components.margin,components.advance,components.thirdParty].some(Number.isFinite)?'':'none';

 set('.asset-overview > .band-heading > span',`Tại ${day}/${month} · trend ${sessions} phiên`);
 const assetStats=document.querySelectorAll('.asset-overview-grid .asset-stat');
 const nav=assetStats[0],cash=assetStats[1],aum=assetStats[2];
 nav.querySelector('.asset-stat-value').innerHTML=`${fmt(c.nav)} <span>tỷ</span>`;
 nav.querySelector('.asset-stat-delta').textContent=`${trend(c.navChange,0,' tỷ')} / phiên trước`;
 nav.querySelector('.asset-stat-delta').className=`asset-stat-delta ${tone(c.navChange)}`;
 cash.querySelector('.asset-stat-value').innerHTML=`≈ ${c.cashNetMonth<0?'−':''}${fmt(Math.abs(c.cashNetMonth))} <span>tỷ</span>`;
 cash.querySelector('.asset-stat-value').className=`asset-stat-value ${tone(c.cashNetMonth)}`;
 cash.querySelector('.asset-stat-delta').innerHTML=`Hôm nay <strong class="${tone(c.cashNet)}">${fmt(c.cashNet)} tỷ</strong> · số ngày làm tròn`;
 aum.querySelector('.asset-stat-value').innerHTML=`${fmt(c.aum)} <span>tỷ</span>`;
 aum.querySelector('.asset-stat-delta').textContent=`${trend(c.aumChange,0,' tỷ')} / phiên trước`;
 aum.querySelector('.asset-stat-delta').className=`asset-stat-delta ${tone(c.aumChange)}`;
 document.querySelectorAll('.asset-overview [data-spark]').forEach(el=>el.setAttribute('aria-label',`${el.dataset.spark.toUpperCase()} · ${shortPeriod}`));
 set('.asset-trend-note',`<span>Cash-in hôm nay: <strong>${fmt(c.cashInCount)} KH</strong></span>`);
 const lowestFee=units.filter(unit=>Number.isFinite(unit.feeChange)).sort((a,b)=>a.feeChange-b.feeChange)[0];
 const jump=document.querySelector('#contribution-summary [data-jump]');jump.dataset.jump=lowestFee.name;jump.textContent=`${lowestFee.name}: phí tháng ${lowestFee.feeChange<0?'giảm':'tăng'} ${fmt(Math.abs(lowestFee.feeChange))} triệu cùng kỳ →`;
 set('.unit-toolbar .unit-period',`${shortPeriod} · Phí net toàn công ty ${fmt(c.feeMonth/1000,2)} tỷ · Δ cùng kỳ ${fmt(c.feeMonthChange)} triệu`);

 const alerts=editorial.asOf===reportData.reportDate?editorial.executiveAlerts:[];
 const summary=document.querySelector('.executive-summary');summary.hidden=alerts.length===0;
 set('#executive-summary-title',`Biến động nổi bật - hết ngày ${day}/${month}`);
 set('.executive-summary-head > span',`${period} · số liệu không gồm tự doanh`);
 set('.executive-summary-list',alerts.map(item=>`<li><strong>${esc(item.topic)}</strong>${esc(item.text)}</li>`).join(''));
}
renderReportHeaderAndDaily();
function renderSourceAndScopeNotes(){
 const c=company,source=reportData.sourceDates,fixed=reportData.fixedCustomerCohort,groups=fixed.company.groups;
 const short=date=>date?.slice(0,5)||'—',reportShort=short(reportData.reportDate),labelShort=short(source.abcdLabel),abcdShort=short(source.abcdPerformance);
 const month=Number(reportData.reportDate.slice(3,5)),priorMonth=Number(source.abcdLabel.slice(3,5));
 const sourceTable=[
  ['Ngày báo cáo và lịch sử',`${esc(reportData.pdf)}; ${dates.length} phiên 01–${reportShort}. Lịch sử các ngày trước lưu trong thư mục history/.`,'PDF kinh doanh toàn hàng; chuỗi ngày giữ các điểm đã chốt, nối thêm phiên mới.'],
  ['Kết quả toàn công ty',`Thị phần BQ ${fmt(c.shareMonth,2)}%; GTGD tháng ${fmt(c.gtgdMonth)} tỷ, ngày ${fmt(c.gtgdDay)} tỷ; phí net tháng ${fmt(c.feeMonth/1000,2)} tỷ, ngày ${fmt(c.feeDay,2)} triệu; dư nợ cuối ngày ${fmt(c.debt)} tỷ.`,'PDF kinh doanh toàn hàng; phí tháng đổi từ triệu sang tỷ để hiển thị.'],
  ['Khách hàng mới',`Excel luồng KH mới: ${fmt(customerFlowInput.all.total)} KH hiện tại, ${fmt(customerFlowInput.all.opened)} mở mới tháng, ${fmt(customerFlowInput.all.day)} mở trong ngày, ${fmt(customerFlowInput.all.funded)} đã nộp tiền, ${fmt(customerFlowInput.all.matched)} đã khớp lệnh. NAV KH mới ${fmt(customerFlowInput.all.nav,2)} tỷ; dư nợ ${fmt(customerFlowInput.all.debt,2)} tỷ; GTGD ${fmt(customerFlowInput.all.gtgd,2)} tỷ; phí net ${fmt(customerFlowInput.all.fee,2)} triệu.`,'Dùng một tệp Excel cho tab Cơ cấu KH và phần KH mới tại từng đơn vị; không trộn mẫu số PDF nếu phân bổ đơn vị khác.'],
  ['Tài sản & dòng tiền',`NAV ${fmt(c.nav)} tỷ, dư nợ ${fmt(c.debt)} tỷ, AUM ${fmt(c.aum)} tỷ; nạp ${fmt(c.cashIn,2)} tỷ, rút ${fmt(c.cashOutDisplay,2)} tỷ, ròng khoảng ${fmt(c.cashNet)} tỷ trong ngày; ròng lũy kế khoảng ${fmt(c.cashNetMonth)} tỷ.`,'PDF toàn hàng. Ròng lũy kế là tổng các giá trị ròng theo ngày đã làm tròn của chuỗi.'],
  ['Đơn vị',`${reportData.units.filter(unit=>unit.page).length} trang đơn vị cập nhật kết quả đến ${reportShort}; KHTC chỉ có thị phần tháng từ trang toàn hàng.`,'GTGD và phí net đơn vị có thể lệch tổng công ty do phạm vi và làm tròn; không phân bổ chênh lệch.'],
  ['Nhãn và hiệu quả A–D',`Nhãn gốc ${labelShort}; Excel A–D cho quy mô và hiệu quả ${abcdShort}. A/B/C/D hiện tại: ${'ABCD'.split('').map(key=>fmt(groups[key].count)).join(' / ')} KH; đầu tháng: ${'ABCD'.split('').map(key=>fmt(groups[key].baseCount)).join(' / ')} KH.`,'NAV âm là nhãn chồng. Quy mô nhóm hiện tại và đầu tháng khác nhau; so sánh cùng tệp cần đối soát nguồn.'],
  ['Nguồn giữ ngày chốt cũ',`PKKH cấp công ty ${short(source.pkkhCompanyPerformance)}, trung tâm ${short(source.pkkhCenterPerformance)}; nhãn A–D chốt ${labelShort}, hiệu quả ${abcdShort}; cây cơ cấu và doanh thu MG/CTV chốt ${short(source.organization)}.`,'Mỗi khối chỉ cập nhật khi có nguồn tương ứng; không lấy ngày PDF làm ngày chốt cho mọi chỉ tiêu.'],
 ];
 document.querySelector('#data .source-table tbody').innerHTML=sourceTable.map(row=>`<tr><td>${esc(row[0])}</td><td>${row[1]}</td><td>${esc(row[2])}</td></tr>`).join('');
 document.querySelector('#data .definitions').innerHTML=`
 <article><span class="tag">Định nghĩa đề xuất</span><h3 style="margin-top:10px">Ba mốc phát triển khách hàng</h3><ul><li><strong>Mở mới:</strong> KH hoàn tất mở tài khoản trong kỳ.</li><li><strong>Nộp tiền lần đầu:</strong> KH có lần nộp tiền đầu tiên; có thể đã mở tài khoản từ kỳ trước.</li><li><strong>Giao dịch lần đầu:</strong> KH có lệnh khớp đầu tiên; không tính lệnh đặt chưa khớp.</li></ul><p>Đếm KH duy nhất. Chuyển đơn vị quản lý không tạo KH mới. Tỷ lệ chuyển đổi chỉ tính trên cùng một nhóm KH và cùng cửa sổ theo dõi; file chuyển đổi cấp công ty gần nhất chốt ${esc(customerFlowInput.asOf)}.</p></article>
 <article><span class="tag missing">Thiếu số liệu lịch sử KH</span><h3 style="margin-top:10px">Nhãn A–D cố định theo tháng</h3><p>Với tháng ${month}, lấy KH mở trước 01/${String(month).padStart(2,'0')}; NAV chốt cuối phiên tháng ${priorMonth} và lệnh khớp trong tháng ${priorMonth} để gán A–D. NAV ≥ 10 triệu thuộc A/C; NAV &lt; 10 triệu thuộc B/D, bao gồm NAV âm theo tệp gắn nhãn. A/B có khớp tháng trước; C/D không khớp. NAV âm là nhãn chồng để theo dõi, không cộng thêm vào A–D; thiếu NAV cần đối soát riêng.</p><p>Nhãn gốc chốt ${labelShort}. Excel A–D phản ánh quy mô và hiệu quả hiện tại đến ${abcdShort}; riêng B/D có số KH khác mốc chốt. Các tỷ lệ khớp lệnh dùng số KH hiện tại, và không coi hai quy mô là cùng một tệp cố định.</p></article>
 <article><span class="tag">Phạm vi báo cáo gốc</span><h3 style="margin-top:10px">Giữ phạm vi nguồn</h3><p>Ngày báo cáo kinh doanh ${esc(reportData.reportDate)}. Tất cả số liệu loại trừ tự doanh theo ghi chú PDF. Dư nợ bỏ KH có nợ xấu. GTGD gồm chứng chỉ quỹ, ETF, chứng quyền và cổ phiếu.</p><p>“Active” trong nguồn gồm KH có giao dịch hoặc nộp/rút tiền trong ngày. Chỉ tiêu này không được đổi tên thành “KH giao dịch” trong demo.</p></article>
 <article><span class="tag">Phạm vi chỉ tiêu</span><h3 style="margin-top:10px">Thị phần, NAV và AUM</h3><p>Thị phần giao dịch ngày ${reportShort} là ${fmt(c.shareDay,2)}%, bình quân tháng ${fmt(c.shareMonth,2)}% và kế hoạch ${fmt(c.sharePlan,2)}% theo PDF; không tự tính lại từ GTGD ngày vì quy ước hai chiều của nguồn.</p><p>NAV và AUM dùng số công bố cuối ngày: NAV ${fmt(c.nav)} + dư nợ ${fmt(c.debt)} = AUM ${fmt(c.aum)} tỷ. Cơ cấu dư nợ hiển thị theo PDF toàn hàng.</p></article>`;
 document.querySelector('#data .disclosure').textContent=`Nguồn hiện tại: PDF kinh doanh toàn hàng ${reportData.reportDate} và Excel luồng KH mới ${customerFlowInput.asOf}. Các tệp phân nhóm, PKKH và nguồn lực giữ ngày chốt riêng.`;
 const checks=document.querySelectorAll('.cohort-checks .cohort-check');
 checks[0].innerHTML=`<strong>Nhãn gốc tại ${labelShort}</strong>A–D theo NAV và khớp lệnh tháng ${priorMonth}. NAV âm là nhãn chồng trong A–D; không cộng lần hai.`;
 checks[1].innerHTML=`<strong>So sánh hai kỳ</strong>NAV, tiền mặt: hiện tại / BQ tháng ${priorMonth}. GTGD, phí net: lũy kế T${month} / cả T${priorMonth}. Quy mô nhóm theo Excel A–D chốt ${abcdShort} có thay đổi so với ${labelShort}.`;
 checks[2].innerHTML=`<strong>Đối soát phạm vi</strong>NAV âm là nhãn chồng trong A–D, không cộng thêm. Hiệu quả A–D cập nhật ${abcdShort}. Tổng nhóm hiện tại khác tổng KH cũ ở Excel luồng KH mới; hai nguồn chưa đối soát cùng phạm vi.`;
 document.querySelector('.segmentation-note').textContent=`Nhãn gốc chốt ${labelShort}; hiệu quả và quy mô hiển thị tại ${abcdShort} (Excel A–D). NAV âm là nhãn chồng; quy mô B/D đã thay đổi nên tỷ lệ khớp dùng số KH hiện tại. Số giai đoạn trong Excel A–D tính từ ${short(fixed.company.weekFrom)}.`;
 document.querySelector('.segment-matrix').setAttribute('aria-label',`Nhãn A–D gán tại ${labelShort}; quy mô và hiệu quả theo Excel chốt ${abcdShort}`);
 const currentMonth=Number(reportData.reportDate.slice(3,5));
 document.querySelector('.cohort-strip .cohort-stat:nth-child(2) .label').textContent=`KH mở mới tháng ${currentMonth} · tách riêng`;
 document.querySelector('.cohort-strip .cohort-stat.old .label').textContent=`KH cũ hiện tại · mở trước 01/${String(currentMonth).padStart(2,'0')}`;
 document.querySelector('.old-block-header strong').textContent=`NHÃN KH CŨ THÁNG ${currentMonth} · CHỐT ${labelShort}`;
 document.querySelector('.new-cohort-tag').textContent=`KH MỚI · THÁNG ${currentMonth}`;
 const axes=document.querySelectorAll('.segment-matrix .matrix-axis');
 axes[0].textContent=`NAV ${labelShort} ≥ 10 triệu`;axes[1].textContent=`NAV ${labelShort} < 10 triệu · gồm NAV âm`;
 const rowLabels=document.querySelectorAll('.segment-matrix .matrix-row-label');
 rowLabels[0].innerHTML=`Có khớp lệnh<br>tháng ${priorMonth}`;rowLabels[1].innerHTML=`Không khớp lệnh<br>tháng ${priorMonth}`;
 for(const key of 'ABCD'){
  const tile=document.querySelector(`[data-segment="${key}"]`),highNav=key==='A'||key==='C',traded=key==='A'||key==='B';
  tile.querySelector('h3').textContent=`NAV ${highNav?'≥':'<'} 10 triệu · ${traded?'đã':'chưa'} khớp tháng ${priorMonth}`;
  tile.querySelector('.segment-activation').firstChild.textContent=`Tháng ${currentMonth} ${key==='C'?'tái giao dịch':'có khớp'} `;
 }
 document.querySelector('.pkkh-header p').textContent=`Nhãn PKKH chốt ${labelShort} · hiệu quả công ty ${short(source.pkkhCompanyPerformance)}, trung tâm ${short(source.pkkhCenterPerformance)}`;
 document.querySelector('.pkkh-header h2').textContent=`Phân khúc KH · hiệu suất tháng ${currentMonth}`;
 document.querySelector('.pkkh-header label').firstChild.textContent=`Trung tâm tại ${labelShort}`;
 const endOfMonth=new Date(Number(reportData.reportDate.slice(6)),currentMonth,0).getDate();
 document.querySelector('.pkkh-rule-band span').textContent=`Số KH trong từng phân khúc không đổi trong tháng. KH ngoài tệp ${labelShort} theo dõi riêng; chuyển nhãn chỉ ghi nhận khi chốt ${endOfMonth}/${String(currentMonth).padStart(2,'0')}.`;
 document.querySelector('.pkkh-table-panel .pkkh-panel-head span').textContent=`Nhãn ${labelShort} · công ty ${short(source.pkkhCompanyPerformance)}, trung tâm ${short(source.pkkhCenterPerformance)}`;
 document.querySelector('.pkkh-panels .pkkh-panel-head span').textContent=`7 phân khúc kinh doanh · KH ${labelShort}`;
 document.querySelector('.pkkh-definition-intro').textContent=`Các điều kiện dưới đây dùng để tạo nhãn tại ngày ${labelShort}. Nhãn đó giữ nguyên trong tháng ${currentMonth}; “hoặc” nghĩa là chỉ cần đạt một trong hai ngưỡng vòng quay.`;
 document.querySelector('.pkkh-definition-foot').textContent=`BQ = bình quân; VQ = vòng quay; GTGD = giá trị giao dịch. Tệp PKKH giữ nhãn và trung tâm tại ${labelShort} trong tháng ${currentMonth}. Quy tắc gốc có dấu (*) tại Block Deal nhưng ảnh chưa kèm nội dung chú thích.`;
 const pkkhHeads=document.querySelectorAll('.pkkh-performance-table thead th');
 pkkhHeads[1].innerHTML=`KH đầu T${currentMonth}<br><span>tỷ trọng tệp</span>`;
 pkkhHeads[2].innerHTML=`KH khớp T${currentMonth}<br><span>tỷ lệ trong nhóm</span>`;
 pkkhHeads[3].innerHTML=`NAV hiện tại<br><span>so BQ T${priorMonth} · tỷ</span>`;
 pkkhHeads[4].innerHTML=`GTGD lũy kế T${currentMonth}<br><span>so cả T${priorMonth} · tỷ</span>`;
 pkkhHeads[5].innerHTML=`Phí net lũy kế T${currentMonth}<br><span>so cả T${priorMonth} · triệu</span>`;
 pkkhHeads[6].innerHTML=`Dư nợ hiện tại<br><span>so BQ T${priorMonth} · tỷ</span>`;
 const org=reportData.organizationSource;
 document.querySelector('.unit-comparison-note').textContent=`MG/CTV: cây nhân sự chốt ${short(org.asOf)} so cuối tháng ${short(org.referenceDate)}; tổng gồm ${fmt(org.unmappedCounts.mg)} MG và ${fmt(org.unmappedCounts.ctv)} CTV chưa gắn trung tâm. Kinh doanh theo PDF ${reportShort}; KH mới theo Excel ${short(customerFlowInput.asOf)}.`;
 const unitHeads=document.querySelectorAll('.unit-comparison thead th');
 unitHeads[1].innerHTML=`MG · ${short(org.asOf)}<br>SL / Δ so ${short(org.referenceDate)}`;
 unitHeads[2].innerHTML=`CTV · ${short(org.asOf)}<br>SL / Δ so ${short(org.referenceDate)}`;
}
renderSourceAndScopeNotes();
function selectTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));document.querySelectorAll('[role="tabpanel"]').forEach(p=>p.hidden=p.id!==name);document.querySelector('h1').textContent='Kinh doanh toàn công ty';if(name!=='units')document.getElementById('unit-detail').hidden=true;history.replaceState(null,'','#'+name)}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
document.querySelectorAll('[role="tab"]').forEach((b,i,arr)=>b.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=arr[(i+(e.key==='ArrowRight'?1:-1)+arr.length)%arr.length];next.focus();selectTab(next.dataset.tab)}}));
function rollingAverage(values,i){return i<4?null:values.slice(i-4,i+1).reduce((a,b)=>a+b,0)/5}
function renderMiniChart(el){const key=el.dataset.mini,s=series[key],w=el.clientWidth,count=s.values.length,last=count-1;if(w<120)return;const tv=document.body.classList.contains('tv-mode'),dense=el.dataset.density==='compact',shareDense=el.dataset.density==='share-compact',compact=tv&&key==='open';const h=shareDense?(tv?162:82):dense?(tv?162:118):tv?(compact?88:130):174,left=shareDense?42:dense?44:tv?(compact?44:64):34,right=tv?16:12,top=shareDense?19:dense?(tv?20:23):tv?(compact?20:26):20,bottom=shareDense?(tv?132:60):dense?(tv?132:95):tv?(compact?56:104):137,plotWidth=w-left-right,step=plotWidth/count;const min=key==='debt'?12800:0,max=key==='debt'?13300:key==='share'?3:key==='open'?100:1250;const x=i=>left+step*(i+.5),y=v=>bottom-((v-min)/(max-min))*(bottom-top);const averages=s.values.map((_,i)=>rollingAverage(s.values,i));let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(s.label)} theo ${count} phiên; chọn cột hoặc điểm để xem giá trị"><title>${esc(s.label)}: ${s.values.map((v,i)=>dates[i]+' '+fmt(v,key==='share'?2:0)+' '+s.unit).join('; ')}</title>`;[min,(min+max)/2,max].forEach(v=>{svg+=`<line class="grid-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-6}" y="${y(v)+4}" text-anchor="end">${fmt(v,key==='share'?1:0)}</text>`});const path=s.values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');if(key==='share'||key==='debt')svg+=`<path class="day-line" d="${path}"/>`;const maxIndex=s.values.indexOf(Math.max(...s.values));s.values.forEach((v,i)=>{const barWidth=Math.min(tv?40:28,step*.56);const label=`${dates[i]} · ${s.label}: ${fmt(v,key==='share'?2:0)} ${s.unit}`;svg+=`<g class="data-hit${i===last?' selected':''}" data-index="${i}" role="button" tabindex="0" aria-label="${esc(label)}"><title>${esc(label)}</title><rect x="${x(i)-step/2}" y="${top}" width="${step}" height="${bottom-top+21}" fill="transparent"/>`;if(key==='share'||key==='debt')svg+=`<circle class="point" cx="${x(i)}" cy="${y(v)}" r="4"/>`;else svg+=`<rect class="day-bar" x="${x(i)-barWidth/2}" y="${y(v)}" width="${barWidth}" height="${bottom-y(v)}" rx="3"/>`;if((!dense&&w>=305&&key!=='share')||i===last||i===maxIndex)svg+=`<text class="${i===last?'key-value':''}" x="${x(i)}" y="${tv&&key!=='share'&&averages[i]!==null?Math.min(y(v),y(averages[i]))-12:y(v)-8}" text-anchor="middle">${fmt(v,key==='share'?2:0)}${key==='share'?'%':''}</text>`;svg+=`</g><text x="${x(i)}" y="${bottom+(tv?21:19)}" text-anchor="middle">${dates[i].slice(0,2)}</text>`});if(key!=='share')svg+=`<path class="avg-line" d="${averages.map((v,i)=>v===null?'':(i===4?'M':'L')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')}"/>`;svg+='</svg>';el.innerHTML=svg;const detail=document.getElementById(el.id+'-detail');const select=i=>{el.querySelectorAll('[data-index]').forEach(g=>{g.classList.toggle('selected',Number(g.dataset.index)===i);g.setAttribute('aria-pressed',String(Number(g.dataset.index)===i))});let text=`${dates[i]} · ${s.label} ${fmt(s.values[i],key==='share'?2:0)} ${s.unit}`;if(key!=='share')text+=averages[i]===null?' · Chưa đủ 5 phiên':` · BQ ${fmt(averages[i],1)} ${s.unit}`;detail.textContent=text};el.querySelectorAll('[data-index]').forEach(g=>{g.addEventListener('click',()=>select(Number(g.dataset.index)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(Number(g.dataset.index))}})});select(last)}
function renderShareChart(el){
 const values=series.share.values,averages=reportData.series.shareAvg,w=el.clientWidth,count=values.length,last=count-1;
 if(w<120||!count)return;
 if(!Array.isArray(averages)||averages.length!==count||!averages.every(Number.isFinite)){el.innerHTML='<div class="small subtle">Chưa có thị phần BQ lũy kế từ PDF</div>';return}
 const tv=document.body.classList.contains('tv-mode'),h=tv?195:82,left=42,right=tv?16:12,top=19,bottom=tv?165:60,step=(w-left-right)/count;
 const x=i=>left+step*(i+.5),y=v=>bottom-v/3*(bottom-top);
 const path=points=>points.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
 const description=values.map((v,i)=>`${dates[i]}: ngày ${fmt(v,2)}%, BQ lũy kế ${fmt(averages[i],2)}%`).join('; ');
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(description)}"><title>${esc(description)}</title>`;
 [0,1.5,3].forEach(v=>{svg+=`<line class="grid-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-6}" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}</text>`});
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
 const select=i=>{el.querySelectorAll('[data-index]').forEach(g=>{const selected=Number(g.dataset.index)===i;g.classList.toggle('selected',selected);g.setAttribute('aria-pressed',String(selected))});detail.textContent=`${dates[i]} · thị phần ngày ${fmt(values[i],2)}% · BQ lũy kế ${fmt(averages[i],2)}%`};
 el.querySelectorAll('[data-index]').forEach(g=>{g.addEventListener('click',()=>select(Number(g.dataset.index)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(Number(g.dataset.index))}})});
 select(last);
}
function renderDailyMiniChart(el){return el.dataset.mini==='share'?renderShareChart(el):renderMiniChart(el)}
fitTVBoard();
const miniCharts=Array.from(document.querySelectorAll('[data-mini]'));const miniObserver=new ResizeObserver(entries=>entries.forEach(e=>renderDailyMiniChart(e.target)));miniCharts.forEach(el=>{renderDailyMiniChart(el);miniObserver.observe(el)});
const assetSeries={open:{label:'KH mở mới từng ngày',unit:'KH',values:series.open.values,color:'#f26a21'},nav:{label:'NAV cuối ngày',values:reportData.series.nav,color:'#7890ab'},aum:{label:'AUM cuối ngày',values:reportData.series.aum,color:'#7890ab'},debt:{label:'Dư nợ cuối ngày',values:reportData.series.debt,color:'#7890ab'},cash:{label:'Nạp/rút ròng từng ngày',values:reportData.series.cash,color:'#b36c52'}};
function renderAssetSpark(el){const item=assetSeries[el.dataset.spark],w=el.clientWidth,h=el.clientHeight,last=item.values.length-1;if(w<40)return;const left=4,right=w-5,top=6,bottom=h-6,lo=Math.min(...item.values),hi=Math.max(...item.values),range=hi-lo||1;const x=i=>left+(right-left)*i/last,y=v=>bottom-(v-lo)/range*(bottom-top);const path=item.values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(item.label)}: ${item.values.map((v,i)=>dates[i]+' '+fmt(v)+' '+(item.unit||'tỷ')).join('; ')}. Mỗi chỉ tiêu dùng thang riêng; chuỗi làm tròn theo nguồn."><title>${esc(item.label)} · ${item.values.map((v,i)=>dates[i]+': '+fmt(v)+' '+(item.unit||'tỷ')).join('; ')}</title>`;if(el.dataset.spark==='cash')svg+=`<line x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}" stroke="#d9e1ea" stroke-dasharray="3 3"/>`;svg+=`<path d="${path} L${right} ${bottom} L${left} ${bottom} Z" fill="${item.color}" fill-opacity="0.07"/><path d="${path}" fill="none" stroke="${item.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(last)}" cy="${y(item.values[last])}" r="3" fill="${item.color}"/></svg>`;if(el.dataset.spark==='open'){svg=svg.replace('</svg>',item.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="${i===last?3:2}" fill="${item.color}"><title>${dates[i]}: ${fmt(v)} KH mở mới</title></circle>`).join('')+'</svg>')}el.innerHTML=svg}
const assetSparks=[...document.querySelectorAll('[data-spark]')];const sparkObserver=new ResizeObserver(entries=>entries.forEach(e=>renderAssetSpark(e.target)));assetSparks.forEach(el=>{renderAssetSpark(el);sparkObserver.observe(el)});
function row(u,summary=false){let first=`<td class="unit-name"><button type="button" data-unit="${esc(u.name)}">${esc(u.name)}</button></td>`;let cells=summary?`<td>${fmt(u.gtgd)}</td><td>${change(u.change)}</td><td>${fmt(u.gtgd/company.gtgdDay*100,1)}%</td><td>${fmt(u.fee,2)}</td><td>${net(u.net)}</td>`:`<td>${fmt(u.gtgd)}</td><td>${change(u.change)}</td><td>${fmt(u.gtgd/company.gtgdDay*100,1)}%</td><td>${fmt(u.fee,2)}</td><td>${fmt(u.inCount)}</td><td>${fmt(u.cashOut,u.cashOut!==null&&u.cashOut<1?3:2)}</td><td>${fmt(u.share,2)}%</td>`;return '<tr>'+first+cells+'</tr>'}
function wireRows(root){root.querySelectorAll('[data-unit]').forEach(b=>b.addEventListener('click',()=>{selectTab('units');showUnit(b.dataset.unit)}))}
const contribution=document.getElementById('contribution-list');
const topFeeUnits=[...units].filter(u=>u.feeMtd!==null).sort((a,b)=>b.feeMtd-a.feeMtd).slice(0,5);
const contributionScale=Math.max(250,Math.ceil(Math.max(...topFeeUnits.map(u=>u.feeMtd),0)/250)*250);
document.querySelector('#contribution-summary .contribution-axis .scale').innerHTML=`<span>0</span><span>${fmt(contributionScale/2)}</span><span>${fmt(contributionScale)} triệu</span>`;
contribution.innerHTML=topFeeUnits.map(u=>`<button type="button" class="contribution-row" data-unit="${esc(u.name)}" aria-label="${esc(u.name)}: phí net tháng ${fmt(u.feeMtd)} triệu, tỷ trọng ${fmt(u.feeMtd/company.feeMonth*100,1)}%; mở chi tiết"><span class="contribution-name">${esc(u.name)}</span><span class="contribution-track"><span class="contribution-bar" style="display:block;width:${Math.max(0,Math.min(100,u.feeMtd/contributionScale*100))}%"></span></span><strong class="contribution-value">${fmt(u.feeMtd)}</strong><span class="contribution-pct">${fmt(u.feeMtd/company.feeMonth*100,1)}%</span></button>`).join('');wireRows(contribution);
function rosterCell(current,previous,label){const change=Number.isFinite(current)&&Number.isFinite(previous)?current-previous:null;return `<td class="staff-cell" title="${label} ${reportData.organizationSource.asOf}: ${fmt(current)}; chốt ${reportData.organizationSource.referenceDate}: ${fmt(previous)}; thay đổi: ${change===null?'—':change>0?'+'+fmt(change):fmt(change)}"><strong>${fmt(current)}</strong> <span class="subtle">/</span> ${signed(change)}</td>`}
function unitRow(u){const r=u.resources||{};return `<tr><td class="unit-name"><button type="button" data-unit="${esc(u.name)}">${esc(u.name)}</button></td>${rosterCell(r.mg,r.mgPrior,'MG')}${rosterCell(r.ctv,r.ctvPrior,'CTV')}<td>${fmt(u.feeMtd)}</td><td>${signed(u.feeChange)} <span class="subtle">/</span> ${signed(u.growthPct,1,'%')}</td><td>${fmt(u.mtd)}</td><td>${fmt(u.share,2)} / ${fmt(u.sharePlan,2)}</td><td>${fmt(customerFlowInput.units[u.name]?.opened)}</td><td>${fmt(u.fee)} / ${fmt(u.feeAvg5)}</td><td>${signed(u.momentum,1,'%')}</td></tr>`}
function renderUnits(){
 const q=document.getElementById('unit-search').value.trim().toLocaleLowerCase('vi'),sort=document.getElementById('sort').value;
 const list=units.filter(u=>u.name.toLocaleLowerCase('vi').includes(q));
 list.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'vi'):(b[sort]??-Infinity)-(a[sort]??-Infinity));
 const body=document.getElementById('units-body');body.innerHTML=list.length?list.map(unitRow).join(''):'<tr><td colspan="10" class="empty">Không tìm thấy đơn vị phù hợp.</td></tr>';
 if(!q){const avg=unitAverage(reportData.series.fee.slice(-5));const fGrowth=company.feeMonthChange/(company.feeMonth-company.feeMonthChange)*100;const now=reportData.organizationSource.companySnapshotCounts;const prior=reportData.organizationSource.companyPriorSnapshotCounts;body.innerHTML+=`<tr class="total"><td>Toàn công ty · tổng hợp</td>${rosterCell(now.mg,prior.mg,'MG')}${rosterCell(now.ctv,prior.ctv,'CTV')}<td>${fmt(company.feeMonth)}</td><td>${signed(company.feeMonthChange)} / ${signed(fGrowth,1,'%')}</td><td>${fmt(company.gtgdMonth)}</td><td>${fmt(company.shareMonth,2)} / ${fmt(company.sharePlan,2)}</td><td>${fmt(customerFlowInput.all.opened)}</td><td>${fmt(company.feeDay)} / ${fmt(avg)}</td><td>${signed((company.feeDay/avg-1)*100,1,'%')}</td></tr>`;}
 wireRows(body);
 const feeList=[...list].filter(u=>u.feeMtd!==null).sort((a,b)=>b.feeMtd-a.feeMtd);
  const feeRoot=document.getElementById('unit-fee-ranking');
  const feeScale=Math.max(250,Math.ceil(Math.max(...feeList.map(u=>u.feeMtd),0)/250)*250);
  feeRoot.closest('.unit-chart-card').querySelector('.unit-axis-labels').innerHTML=`<span>0</span><span>${fmt(feeScale/2)}</span><span>${fmt(feeScale)} triệu</span>`;
  feeRoot.innerHTML=feeList.length?feeList.map((u,i)=>`<button class="unit-rank-row" type="button" data-unit="${esc(u.name)}" aria-label="${esc(u.name)}, phí tháng ${fmt(u.feeMtd)} triệu, tỷ trọng ${pct(u.feeMtd/company.feeMonth*100)}; mở chi tiết"><span>${esc(u.name)}</span><span class="unit-track"><span class="unit-bar ${i===0?'unit-fee-highlight':''}" style="left:0;width:${Math.max(0,Math.min(100,u.feeMtd/feeScale*100))}%"></span></span><strong class="unit-row-value">${fmt(u.feeMtd)}</strong><span class="unit-row-pct">${pct(u.feeMtd/company.feeMonth*100)}</span></button>`).join(''):'<div class="unit-empty">Chưa có phí tháng cho lựa chọn này.</div>';
 const growthRoot=document.getElementById('unit-growth-ranking');
 const growthList=[...list].filter(u=>u.feeChange!==null).sort((a,b)=>b.feeChange-a.feeChange);
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
function unitPerPerson(total,count){return Number.isFinite(total)&&Number.isFinite(count)&&count>0?total/count:null}
function unitAverage(values){return Array.isArray(values)&&values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0)/values.length:null}
function unitChart(values,label,unit,kind='line',compact=false){
 if(!Array.isArray(values)||values.length<2||!values.every(Number.isFinite))return '<div class="small subtle">Chưa có chuỗi dữ liệu</div>';
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
 if(!Array.isArray(values)||!values.length||!values.every(Number.isFinite)){el.innerHTML='<div class="small subtle">Chưa có chuỗi dữ liệu</div>';return}
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
 if(key!=='share')svg+=`<path class="avg-line" d="${averages.map((v,i)=>v===null?'':(i===4?'M':'L')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ')}"/>`;
 const maxIndex=values.indexOf(highest);
 values.forEach((v,i)=>{const last=i===count-1;svg+=`<g class="${last?'selected':''}"><title>${dates[i]}: ${fmt(v,digits)} ${unit}</title>`;
  if(key==='gtgd'){const bw=Math.min(36,step*.55);svg+=`<rect class="day-bar" style="fill:${last?'#ff6b1c':'#cad7e5'}" x="${x(i)-bw/2}" y="${y(v)}" width="${bw}" height="${Math.max(0,bottom-y(v))}" rx="2"/>`}
  else svg+=`<circle class="point" cx="${x(i)}" cy="${y(v)}" r="3.5"/>`;
  if(last||i===maxIndex)svg+=`<text class="${last?'key-value':''}" x="${x(i)}" y="${Math.min(y(v),key!=='share'&&averages[i]!==null?y(averages[i]):y(v))-8}" text-anchor="middle">${fmt(v,digits)}${key==='share'?'%':''}</text>`;
  svg+=`</g><text x="${x(i)}" y="102" text-anchor="middle">${dates[i].slice(0,2)}</text>`;
 });el.innerHTML=svg+'</svg>';
}
function unitExecutiveCards(u){
 const ratio=(change,current)=>Number.isFinite(change)&&Number.isFinite(current)&&current-change!==0?change/(current-change)*100:null;
 const variance=(current,previous)=>Number.isFinite(current)&&Number.isFinite(previous)?current-previous:null;
 const shareLast=u.shareDaySeries?.at(-1)??null,sharePrev=u.shareDaySeries?.at(-2)??null;
 const shareGap=variance(u.share,u.sharePlan),targetMax=Math.max(u.sharePlan||0,u.share||0,.01)*1.1;
 const arrow=n=>Number.isFinite(n)?n>0?'↑ ':n<0?'↓ ':'' :'';
 const tone=n=>Number.isFinite(n)?n>0?'up':n<0?'down':'neutral':'neutral';
 const gtgdAvg=unitAverage(u.gtgdSeries?.slice(-5)),debtAvg=unitAverage(u.debtSeries?.slice(-5));
 const previousFee=u.feeSeries?.at(-2)??null,feeChange=variance(u.fee,previousFee);
 const debtChange=variance(u.debt,u.debtSeries?.at(-2)),debtStartChange=variance(u.debt,u.debtSeries?.[0]);
 const tradeGrowth=ratio(u.gtgdMonthChange,u.mtd),dailyTradeGrowth=ratio(u.change,u.gtgd),marketGrowth=ratio(company.marketChange,company.marketDay);
 const exchanges=['HOSE','HNX','UPCOM'],parts=u.debtComponents||{};
 return `<div class="unit-result-grid executive-grid unit-executive-grid">
 <article class="executive-card market-hero"><div class="executive-card-title"><h3>Thị phần giao dịch · BQ tháng</h3><span class="priority-label">ĐƠN VỊ</span></div><div class="market-hero-grid"><div class="market-total"><div class="hero-value">${fmt(u.share,2)}<span>%</span></div><div class="hero-gap ${tone(shareGap)}">${Number.isFinite(shareGap)?(shareGap>0?'+':'')+fmt(shareGap,2):'—'} <span>điểm % so kế hoạch</span></div><div class="hero-prior">${arrow(u.shareMonthChange)}${fmt(Math.abs(u.shareMonthChange),2)} điểm % so cùng kỳ tháng trước</div><div class="hero-target" role="img" aria-label="Thị phần ${pct(u.share,2)}, kế hoạch ${pct(u.sharePlan,2)}"><div class="target-labels"><span>Thực hiện <strong>${pct(u.share,2)}</strong></span><span>Kế hoạch <strong>${pct(u.sharePlan,2)}</strong></span></div><div class="target-track"><div class="target-fill" style="width:${u.sharePlan>0?u.share/targetMax*100:0}%"></div>${u.sharePlan>0?`<div class="target-marker" style="left:${u.sharePlan/targetMax*100}%"></div>`:''}</div></div></div><div class="exchange-shares"><div class="exchange-heading">THỊ PHẦN TRÊN TỪNG SÀN <span>· BQ tháng</span></div>${exchanges.map(e=>`<div class="exchange-row"><span class="exchange-name">${e}</span><strong>${fmt(u.exchangeShares?.[e],2)}<span>%</span></strong><div class="exchange-comparison"><b>${signed(u.exchangeShareChanges?.[e],2,'%')}</b><small>so tháng trước</small></div></div>`).join('')}</div></div><div class="share-trend"><div class="executive-chart-title"><span>Thị phần giao dịch từng ngày trong tháng</span><span>% · 01–${reportData.reportDate.slice(0,5)}</span></div><div class="mini-chart" data-unit-chart="share"></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${pct(shareLast,2)}</strong></span><span>${arrow(variance(shareLast,sharePrev))}${fmt(Math.abs(variance(shareLast,sharePrev)),2)} điểm % / phiên trước</span></div></article>
 <article class="executive-card trading-primary"><div class="executive-card-title"><h3>Giá trị giao dịch SHS · tháng</h3></div><div class="executive-value">${fmt(u.mtd)} <span>tỷ đồng</span></div><div class="executive-delta ${tone(u.gtgdMonthChange)}">${arrow(u.gtgdMonthChange)}${fmt(Math.abs(u.gtgdMonthChange))} tỷ · ${signed(tradeGrowth,1,'%')} cùng kỳ</div><div class="executive-trend"><div class="executive-chart-title"><span>Nhịp GTGD theo phiên</span><span>Tỷ đồng</span></div><div class="mini-chart" data-unit-chart="gtgd"></div><div class="executive-chart-note"><span>01–${reportData.reportDate.slice(0,5)} · nét đứt: BQ 5 phiên</span><strong>BQ ${fmt(gtgdAvg,1)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Hôm nay <strong>${fmt(u.gtgd)} tỷ</strong></span><span>${arrow(u.change)}${fmt(Math.abs(u.change))} tỷ · ${signed(dailyTradeGrowth,1,'%')} / phiên trước</span><small>So BQ 5 phiên <strong>${signed(gtgdAvg>0?(u.gtgd/gtgdAvg-1)*100:null,1,'%')}</strong> · thị trường hôm nay <strong>${signed(marketGrowth,1,'%')}</strong></small></div><div class="fee-support" aria-label="Phí net bổ sung cho giá trị giao dịch"><div class="fee-support-month"><span>Phí net · lũy kế tháng</span><strong>${fmt(Number.isFinite(u.feeMtd)?u.feeMtd/1000:null,2)} <small>tỷ đồng</small></strong><span>${arrow(u.feeChange)}${fmt(Math.abs(u.feeChange))} triệu · ${signed(u.growthPct,1,'%')} cùng kỳ</span></div><div class="fee-support-day"><span>Hôm nay <strong>${fmt(u.fee,2)} triệu</strong></span><span>≈ ${signed(feeChange)} triệu · ${signed(ratio(feeChange,u.fee),1,'%')}</span><span>So BQ 5 phiên <strong>${signed(u.momentum,1,'%')}</strong></span></div></div></article>
 <article class="executive-card debt-primary"><div class="executive-card-title"><h3>Dư nợ · BQ tháng</h3></div><div class="executive-value">${fmt(u.debtAvgMonth)} <span>tỷ đồng</span></div><div class="executive-delta neutral">Bình quân ${reportData.dates.length} phiên có dữ liệu · 01–${reportData.reportDate.slice(0,5)}</div><div class="executive-trend"><div class="executive-chart-title"><span>Dư nợ cuối ngày theo phiên</span><span>Tỷ đồng</span></div><div class="mini-chart" data-unit-chart="debt"></div><div class="executive-chart-note"><span>01–${reportData.reportDate.slice(0,5)} · nét đứt: BQ 5 phiên</span><strong>BQ ${fmt(debtAvg)} tỷ</strong></div></div><div class="monthly-daily-footer"><span>Cuối ngày <strong>${fmt(u.debt)} tỷ</strong></span><span>${arrow(debtChange)}${fmt(Math.abs(debtChange))} tỷ · ${signed(ratio(debtChange,u.debt),1,'%')} / phiên trước</span><small>So 01/10 <strong>${signed(debtStartChange)} tỷ · ${signed(ratio(debtStartChange,u.debt),1,'%')}</strong></small></div><div class="debt-support"><div class="debt-support-title">Cơ cấu dư nợ cuối ngày · tỷ đồng</div><div class="debt-components"><div><span>Margin thuần</span><strong>${fmt(parts.margin)}</strong></div><div><span>Ứng trước</span><strong>${fmt(parts.advance)}</strong></div><div><span>Dư nợ 3 bên</span><strong>${fmt(parts.thirdParty)}</strong></div></div></div></article></div>`;
}
function unitDepartmentTable(u){
 const departments=u.departments||[];
 return `<div class="table-wrap"><table class="unit-department-table"><thead><tr><th>Phòng</th><th>Trưởng phòng</th><th>MG / CTV<br>người</th><th>DTPN tháng<br>triệu</th><th>Δ cùng kỳ<br>triệu / %</th><th>Dư nợ BQ<br>tỷ</th><th>DTPN BQ/MG<br>triệu/người</th><th>DTPN BQ/CTV<br>triệu/người</th></tr></thead><tbody>${departments.length?departments.map(d=>`<tr class="${d.unassigned?'dept-unassigned':''}"><td><button type="button" class="dept-link" data-department="${esc(d.id)}" aria-expanded="false" aria-controls="unit-department-detail">${esc(d.name)}</button></td><td>${d.head?esc(d.head):'—'}</td><td>${fmt(d.mg)} / ${fmt(d.ctv)}<small>Δ 30/09: ${signed(d.mgChange)} / ${signed(d.ctvChange)}</small></td><td>${fmt(d.feeMtd)}</td><td>${signed(d.feeChange)} / ${signed(d.growthPct,1,'%')}</td><td>${fmt(d.debtAvg)}</td><td>${fmt(d.feeAvgMg,2)}</td><td>${fmt(d.feeAvgCtv,2)}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">Chưa có cơ cấu phòng của đơn vị trong file nguồn.</td></tr>'}</tbody></table></div>`;
}
function showUnitDepartment(u,id){
 const dept=(u.departments||[]).find(d=>d.id===id);if(!dept)return;
 const panel=document.getElementById('unit-department-detail');
 panel.hidden=false;
 document.querySelectorAll('[data-department]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.department===id)));
 panel.innerHTML=`<div class="detail-head"><div><h4>${esc(dept.name)}</h4><div class="subtle">Trưởng phòng: ${dept.head?esc(dept.head):'—'} · ${esc(u.name)} · chốt 12/10/2026</div></div><button type="button" class="unit-close" id="close-department">Đóng phòng</button></div><div class="dept-detail-grid">
 <div><h5>Nguồn lực & kết quả</h5>${unitDriver('MG / CTV',fmt(dept.mg)+' / '+fmt(dept.ctv))}${unitDriver('GTGD tháng · tỷ',fmt(dept.gtgdMtd))}${unitDriver('DTPN tháng · triệu',fmt(dept.feeMtd))}${unitDriver('Dư nợ BQ · tỷ',fmt(dept.debtAvg))}${unitDriver('DTPN BQ/MG · triệu/người',fmt(dept.feeAvgMg,2))}${unitDriver('DTPN BQ/CTV · triệu/người',fmt(dept.feeAvgCtv,2))}</div>
 <div><h5>Phát triển KH mới</h5>${unitDriver('Mở mới tháng · KH',fmt(dept.newMtd))}${unitDriver('Đã nộp tiền · KH / %',fmt(dept.newFunded)+' / '+ratioText(dept.newFunded,dept.newMtd))}${unitDriver('Khớp lần đầu · KH / %',fmt(dept.newMatched)+' / '+ratioText(dept.newMatched,dept.newMtd))}</div>
 <div><h5>KH cũ & tài sản</h5>${unitDriver('Tổng KH cũ',fmt(dept.oldCustomers))}${unitDriver('KH cũ khớp trong tháng',fmt(dept.oldMatched))}${unitDriver('NAV cuối ngày · tỷ',fmt(dept.nav))}${unitDriver('Sức mua khả dụng · tỷ',fmt(dept.purchasingPower))}</div></div>`;
 document.getElementById('close-department').addEventListener('click',()=>{panel.hidden=true;document.querySelectorAll('[data-department]').forEach(b=>b.setAttribute('aria-expanded','false'))});
 panel.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function showUnit(name){
 const u=units.find(x=>x.name===name);if(!u)return;
 const pane=document.getElementById('unit-detail');pane.hidden=false;
 const r=u.resources||{},flow=customerFlowInput.units[u.name],gtgdAvg5=unitAverage(u.gtgdSeries?.slice(-5));
 const benchmarks=company.resourceBenchmarks||{};
 const mgAverage=unitPerPerson(r.feeTotalMg,r.mg),ctvAverage=unitPerPerson(r.feeTotalCtv,r.ctv),newAverage=r.newAvgMg??null;
 const compareAverage=(value,base)=>signed(Number.isFinite(value)&&base>0?(value/base-1)*100:null,1,'%');
 const shareLast=u.shareDaySeries?.at(-1)??null,sharePrev=u.shareDaySeries?.at(-2)??null;
 const debtPrev=u.debtSeries?.at(-2)??null,debtStart=u.debtSeries?.[0]??null;
 const navPrev=u.navSeries?.at(-2)??null,navStart=u.navSeries?.[0]??null;
 const aumStart=u.aumSeries?.[0]??null;
 const deltaValue=(current,previous)=>Number.isFinite(current)&&Number.isFinite(previous)?current-previous:null;
 const shareAch=u.sharePlan>0?u.share/u.sharePlan*100:null;
 const mgMismatch=false; // Different as-of dates: 13 Oct PDF versus 12 Oct tree.
  const segments=[
   ['A','NAV ≥ 10 triệu · đã khớp tháng 9','Duy trì giao dịch'],
   ['B','NAV &lt; 10 triệu · đã khớp tháng 9','Duy trì giao dịch'],
   ['C','NAV ≥ 10 triệu · chưa khớp tháng 9','Tái kích hoạt'],
   ['D','NAV &lt; 10 triệu · chưa khớp tháng 9','Kích hoạt']
  ];
 const unitCohort=reportData.fixedCustomerCohort?.centers?.[u.name];
 const unitGroups=unitCohort?.groups;
 const oldCustomers=Number.isFinite(u.customerCount)&&Number.isFinite(u.newMtd)?u.customerCount-u.newMtd:null;
 const baseGroupCount=unitGroups?segments.reduce((sum,[key])=>sum+(unitGroups[key]?.baseCount||0),0):null;
 const unitSegmentCards=segments.map(([key,label,role])=>{
  const g=unitGroups?.[key];
  if(!g)return `<article class="unit-segment"><h4>Nhóm ${key} · ${label}</h4><div class="count">— KH</div><p>Chưa có dữ liệu theo đơn vị.</p></article>`;
  return `<article class="unit-segment"><h4>Nhóm ${key} · ${label}</h4><div class="count">${fmt(g.count)} KH <small>· chốt 30/09: ${fmt(g.baseCount)}</small></div><p>${role}: ${fmt(g.matchedMtd)} KH khớp tháng 10 · ${ratioText(g.matchedMtd,g.count)} của nhóm</p><p>NAV hiện tại / BQ tháng 9: ${fmt(g.navCurrent,2)} / ${fmt(g.navPreviousAverage,2)} tỷ</p><p>Tiền mặt hiện tại / BQ tháng 9: ${fmt(g.cashCurrent,2)} / ${fmt(g.cashPreviousAverage,2)} tỷ</p><p>GTGD lũy kế T10 / cả T9: ${fmt(g.gtgdMtd,2)} / ${fmt(g.gtgdPreviousMonth,2)} tỷ</p><p>Phí net lũy kế T10 / cả T9: ${fmt(g.feeMtd,2)} / ${fmt(g.feePreviousMonth,2)} triệu</p><p>Riêng giai đoạn 12–18/10: ${fmt(g.matchedWeek)} KH khớp · ${fmt(g.gtgdWeek,2)} tỷ GTGD · ${fmt(g.feeWeek,2)} triệu phí</p></article>`;
 }).join('');
 pane.innerHTML=`<div class="unit-detail-header"><div><h3>${esc(u.name)} · chi tiết kinh doanh</h3><div class="source">01–${reportData.reportDate} · ${reportData.dates.length} phiên · MG/CTV và kết quả phòng chốt 12/10</div></div><button class="unit-close" type="button" id="close-detail">Đóng chi tiết</button></div>
 <nav class="unit-detail-nav" aria-label="Nội dung chi tiết trung tâm"><a href="#unit-resources">Nguồn lực</a><a href="#unit-assets">Tài sản & dòng tiền</a><a href="#unit-old-customers">KH cũ</a><a href="#unit-new-customers">KH mới</a><a href="#unit-departments">Các phòng</a></nav>
 ${unitExecutiveCards(u)}
 <div class="unit-driver-grid">
 <article class="unit-driver" id="unit-resources"><h3>1. Nguồn lực & năng suất</h3><div class="period">Nguồn lực & DTPN MG/CTV · chốt 12/10</div>
 ${unitMetricTable([
  ['Số MG',fmt(r.mg),signed(r.mgChange)+' người','theo cây cơ cấu'],
  ['Số CTV',fmt(r.ctv),signed(r.ctvChange)+' người'],
  ['DTPN BQ/MG',fmt(mgAverage,2),compareAverage(mgAverage,benchmarks.feeAvgMg),fmt(r.feeTotalMg,2)+' triệu / '+fmt(r.mg)+' MG · BQ công ty '+fmt(benchmarks.feeAvgMg,2)],
  ['DTPN BQ/CTV',fmt(ctvAverage,2),compareAverage(ctvAverage,benchmarks.feeAvgCtv),fmt(r.feeTotalCtv,2)+' triệu / '+fmt(r.ctv)+' CTV · BQ công ty '+fmt(benchmarks.feeAvgCtv,2)],
  ['KH mở mới BQ/MG · 12/10',fmt(newAverage,2),compareAverage(newAverage,benchmarks.newAvgMg),fmt(u.newMtdAt12)+' KH mở mới đến 12/10 / '+fmt(r.mg)+' MG']
 ],'MG/CTV: Δ 30/09<br>Năng suất: so BQ công ty')}
 <a class="unit-definition-link" href="#unit-methodology">${mgMismatch?'Đối soát: PDF '+fmt(u.staff)+' MG / cây cơ cấu '+fmt(r.mg)+' MG. ':' '}Định nghĩa DTPN BQ & nguồn số liệu ↓</a></article>
 <article class="unit-driver" id="unit-assets"><h3>2. Tài sản & dòng tiền</h3><div class="period">Tài sản & dòng tiền · ${u.sourceDate||reportData.reportDate}</div>
 <div class="unit-asset-line"><div><div class="metric-title">NAV cuối ngày</div><strong>${fmt(u.nav)} tỷ</strong><div class="delta">So 01/10 ${signed(deltaValue(u.nav,navStart))} tỷ · phiên trước ${signed(deltaValue(u.nav,navPrev))} tỷ</div></div><div class="mini-line">${unitChart(u.navSeries,'NAV cuối ngày','tỷ','line',true)}</div></div>
 <div class="unit-asset-line"><div><div class="metric-title">AUM cuối ngày</div><strong>${fmt(u.aum)} tỷ</strong><div class="delta">So 01/10 ${signed(deltaValue(u.aum,aumStart))} tỷ</div></div><div class="mini-line">${unitChart(u.aumSeries,'AUM cuối ngày','tỷ','line',true)}</div></div>
 <div class="unit-asset-cash"><div>Nạp / rút ròng tháng<strong>${fmt(u.cashNetMonth)} tỷ</strong><small>Hôm nay ${net(u.net)} tỷ</small></div><div>Điều chuyển nội bộ tháng<strong>${fmt(u.internalTransferMonth)} tỷ</strong><small>Tách khỏi dòng tiền bên ngoài</small></div></div>
 <div class="unit-asset-facts"><div><span>Nạp / rút hôm nay</span><strong>${fmt(u.cashIn,2)} / ${fmt(u.cashOut,2)} tỷ</strong></div><div><span>KH nạp / rút hôm nay</span><strong>${fmt(u.inCount)} / ${fmt(u.outCount)} KH</strong></div></div>
 </article>
  <article class="unit-driver" id="unit-old-customers"><h3>3. Hiệu quả tệp KH cũ</h3><div class="period">Nhãn chốt 30/09 · hiệu quả đến 18/10</div>
  <div class="unit-old-summary"><div>KH cũ hiện tại theo Excel luồng KH mới<strong>${fmt(oldCustomers)} KH</strong></div><div>KH trong nhãn đầu tháng<strong>${fmt(baseGroupCount)} KH</strong></div></div>
  <details class="unit-old-groups"><summary>Xem hiệu quả bốn nhóm A–D</summary><div class="unit-segment-grid">${unitSegmentCards}</div></details></article>
  <article class="unit-driver" id="unit-new-customers"><h3>4. Phát triển khách hàng mới</h3><div class="period">Mở mới và chuyển đổi · Excel luồng KH mới chốt ${customerFlowInput.asOf}</div>
  <div class="unit-old-summary"><div>Mở mới lũy kế tháng<strong>${fmt(flow?.opened)} KH</strong></div><div>Mở mới trong ngày<strong>${fmt(flow?.day)} KH</strong></div></div><div class="unit-new-channels"><span>Kênh <strong>${u.name==='Công ty quản lý'?'Digital':u.name==='KHTC'?'Khác':'MG'}</strong></span><span>Tổng KH hiện tại <strong>${fmt(flow?.total)} KH</strong></span></div>
  <div class="unit-detail-chart">${unitChart(u.openSeries,'KH mở mới từng ngày · Excel chốt ${customerFlowInput.asOf}','KH')}</div>
  ${unitMetricTable([['KH mới đã nộp tiền',fmt(flow?.funded)+' KH',ratioText(flow?.funded,flow?.opened)],['KH mới đã khớp lệnh',fmt(flow?.matched)+' KH',ratioText(flow?.matched,flow?.opened)]],'% KH mở mới')}
  <div class="unit-cohort-summary"><span>NAV KH mới <strong>${fmt(flow?.nav,2)} tỷ</strong></span><span>Dư nợ KH mới <strong>${fmt(flow?.debt,2)} tỷ</strong></span><span>GTGD KH mới <strong>${fmt(flow?.gtgd,2)} tỷ</strong></span><span>Phí net KH mới <strong>${fmt(flow?.fee,2)} triệu</strong></span></div><div class="unit-cohort-summary"><span>Chưa nộp tiền <strong>${fmt(Number.isFinite(flow?.opened)&&Number.isFinite(flow?.funded)?flow.opened-flow.funded:null)} KH</strong></span><span>Chưa khớp lệnh <strong>${fmt(Number.isFinite(flow?.opened)&&Number.isFinite(flow?.matched)?flow.opened-flow.matched:null)} KH</strong></span></div></article></div>
 <section class="unit-driver unit-departments" id="unit-departments"><h3>5. Kết quả & năng suất từng phòng</h3><div class="period">Cơ cấu & hiệu quả phòng · chốt 12/10</div>${unitDepartmentTable(u)}<div class="unit-department-detail" id="unit-department-detail" hidden></div></section>
 <details class="unit-methodology" id="unit-methodology"><summary>Định nghĩa & đối soát số liệu</summary>
 <p>DTPN = doanh thu phí net. DTPN BQ/MG = DTPN MG tháng / số MG; BQ/CTV = DTPN CTV tháng / số CTV. Mẫu số lấy cây cơ cấu tại 12/10. KH mở mới BQ/MG ngày 12/10 = tổng mở mới đến 12/10 / số MG tại 12/10. ${u.revenueSource?'DTPN MG '+fmt(r.feeTotalMg,2)+' triệu; CTV '+fmt(r.feeTotalCtv,2)+' triệu theo DTPN CMG.xlsx. Tổng Excel '+fmt(r.feeTotalCombined,2)+' triệu; số PDF 12/10 '+fmt(u.feeMtdPdfOriginal,2)+' triệu, chênh '+(u.feeSourceDifference===null?'—':fmt(u.feeSourceDifference,2))+' triệu. Box kết quả ưu tiên PDF; bảng nguồn lực/phòng dùng Excel. DTPN BQ công ty dùng '+fmt(benchmarks.mg)+' MG / '+fmt(benchmarks.ctv)+' CTV.':'Chưa có DTPN MG/CTV tách riêng cho đơn vị trong nguồn 12/10, giữ —.'} Mẫu số bằng 0 hoặc thiếu thì giữ —. Tháng 8/9 trong file doanh thu không dùng làm cùng kỳ 01–12/09.</p>
 <p>Cơ cấu: ${esc(reportData.organizationSource.file)} tại 12/10; dùng C_NAME, hoặc R_NAME nếu C_NAME trống. Δ nhân sự so 30/09 là so cuối tháng trước; chưa có số cùng kỳ 12/09. MG trong PDF 16/10 của ${esc(u.name)}: ${fmt(u.staff)}; cây cơ cấu 12/10: ${fmt(r.mg)}; không lấy chênh lệch hai ngày làm biến động nhân sự. ${r.other?'Có thêm '+fmt(r.other)+' người loại OTHER, không gộp vào MG/CTV.':''} Chưa phân phòng được giữ riêng; không phân bổ doanh thu trung tâm cho phòng theo số người.</p>
 <p>Kết quả tháng và phí: PDF ${u.sourceDate||reportData.reportDate} tr.${u.page}. Các điểm lịch sử giữ từ JSON cũ; điểm ngày báo cáo được đọc bằng OCR từ PDF. Chart thị phần ngày dùng tỷ lệ nguồn; GTGD thị trường và đơn vị khác quy ước một/hai chiều nên không tự chia. Chỉ tiêu BQ tháng và kế hoạch giữ số PDF. Thị phần từng sàn và chênh lệch từng sàn của đơn vị chưa có trong nguồn; không dùng số toàn công ty để thay. Cơ cấu dư nợ chi tiết để trống khi OCR không đọc chắc chắn. Biến động phí ngày ước tính từ chuỗi làm tròn; BQ 5 phiên gồm ngày báo cáo. Dư nợ BQ = bình quân ${reportData.dates.length} phiên có dữ liệu. So 01/10 dùng số cuối ngày 01/10, chưa phải số dư đầu tháng.</p>
 <p>KH mới nộp tiền/khớp lệnh thuộc tệp mở mới của trung tâm trong tháng. Excel luồng KH mới chốt ${customerFlowInput.asOf} có ${fmt(customerFlowInput.all.funded)} KH đã nộp và ${fmt(customerFlowInput.all.matched)} KH đã khớp lệnh trên ${fmt(customerFlowInput.all.opened)} KH toàn công ty; mẫu số từng đơn vị dùng chính file này. Công ty quản lý là kênh Digital; các trung tâm kinh doanh còn lại là kênh MG. CSV 02 có nhãn A–D chốt 30/09; Excel A–D có hiệu quả đến 18/10 và quy mô nhóm hiện tại. NAV âm là nhãn chồng trong A–D, không cộng thêm. Số KH chốt và hiện tại của B/D có khác biệt; không diễn giải như cùng một tệp cố định. — là chưa có dữ liệu, không phải 0.</p></details>`;
 if(!Object.values(u.debtComponents||{}).some(Number.isFinite))pane.querySelector('.unit-executive-grid .debt-support')?.remove();
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
 fitTVBoard();miniCharts.forEach(renderMiniChart);
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


function customerRatio(n,d){return n===null||n===undefined||!Number.isFinite(d)||d<=0?null:n/d*100}
function ratioText(n,d){const r=customerRatio(n,d);return r===null?'—%':fmt(r,2)+'%'}
function customerMetrics(){return {...customerFlowInput.all,asOf:customerFlowInput.asOf,source:customerFlowInput.source,viaBroker:Object.entries(customerFlowInput.units).filter(([name])=>name!=='Công ty quản lý'&&name!=='KHTC').reduce((sum,[,unit])=>sum+unit.opened,0),viaDigital:customerFlowInput.units['Công ty quản lý'].opened,viaOther:customerFlowInput.units['KHTC']?.opened||0}}
function renderCustomerFlow(){
 const p=customerMetrics(),date=p.asOf||reportData.newCustomerSupplement.asOf;
 document.getElementById('cohort-scope-caption').textContent='Chốt '+date+' · Tệp '+fmt(p.opened)+' KH mới';
 const step=(i,title,count,ratio,note)=>`<li class="cohort-step"><span class="step-index">${i}</span><div class="step-content"><h3>${title}</h3><div class="step-result"><strong>${fmt(count)} <small>KH</small></strong><span>${ratio}</span></div><p>${note}</p></div></li>`;
 const channels=`<span class="flow-channel">Qua MG <strong>${fmt(p.viaBroker)} KH</strong></span><span class="flow-channel">Digital <strong>${fmt(p.viaDigital)} KH</strong></span>${p.viaOther?`<span class="flow-channel">KHTC / khác <strong>${fmt(p.viaOther)} KH</strong></span>`:''}`;
 document.getElementById('new-customer-flow').innerHTML=step(1,'Tổng KH mở mới',p.opened,'100%',channels)+step(2,'KH mới đã nộp tiền',p.funded,ratioText(p.funded,p.opened),'Trong tổng '+fmt(p.opened)+' KH mở mới tháng')+step(3,'Khớp lệnh lần đầu',p.matched,ratioText(p.matched,p.opened),'Đếm trên tổng '+fmt(p.opened)+' KH mở mới tháng')+`<li class="cohort-step pending-step"><span class="step-index">4</span><div class="step-content"><h3>Theo dõi KH chưa sử dụng</h3><p>Trạng thái chờ tại bước 2–3</p><div class="pending-row"><span>Chưa nộp tiền</span><strong>${fmt(p.opened-p.funded)} KH</strong></div><div class="pending-row"><span>Chưa khớp lệnh</span><strong>${fmt(p.opened-p.matched)} KH</strong></div></div></li>`;
 document.getElementById('new-customer-flow-foot').textContent='Mốc nộp tiền và khớp lệnh đếm độc lập trên '+fmt(p.opened)+' KH mới; nguồn '+p.source+'. Công ty quản lý là kênh Digital.';
}
renderCustomerFlow();













// BEGIN_CUSTOMER_SUPPLEMENT
function renderCustomerStrip(unitName){
 const isCompany=unitName==='all',scope=isCompany?customerFlowInput.all:customerFlowInput.units[unitName];
 const total=scope?.total??null;
 const opened=scope?.opened??null;
 const old=Number.isFinite(total)&&Number.isFinite(opened)?total-opened:null;
 const show=(id,value)=>{document.getElementById(id).innerHTML=fmt(value)+' <small>KH</small>'};
 show('customer-total-value',total);show('customer-new-value',opened);show('customer-old-value',old);
 document.getElementById('customer-sheet-scope-note').textContent=(isCompany?'Toàn công ty':unitName)+' · KH và luồng mở mới chốt '+customerFlowInput.asOf+' · nguồn Excel luồng KH mới';
 document.getElementById('customer-total-note').textContent='Số tại '+customerFlowInput.asOf+' · Excel luồng KH mới';
 document.getElementById('customer-new-note').textContent='Mở mới tháng 10 · hôm nay '+fmt(scope?.day??null)+' KH';
 document.getElementById('customer-old-note').textContent=`Tổng KH − mở mới tháng ${Number(reportData.reportDate.slice(3,5))} · không dùng làm mẫu số nhãn ${reportData.sourceDates.abcdLabel.slice(0,5)}`;
}
function renderUnitCustomerFlow(u){
 const scope=customerFlowInput.units[u.name],opened=scope?.opened??null,funded=scope?.funded??null,matched=scope?.matched??null;
 const step=(i,title,count,ratio,note)=>'<li class="cohort-step"><span class="step-index">'+i+'</span><div class="step-content"><h3>'+title+'</h3><div class="step-result"><strong>'+fmt(count)+' <small>KH</small></strong><span>'+ratio+'</span></div><p>'+note+'</p></div></li>';
 document.getElementById('cohort-scope-caption').textContent='Excel luồng KH mới · '+u.name+' · chốt '+customerFlowInput.asOf+' · '+fmt(opened)+' KH mở mới';
 const channel=u.name==='Công ty quản lý'?'Kênh Digital':u.name==='KHTC'?'Đơn vị khác':'Kênh MG';
 document.getElementById('new-customer-flow').innerHTML=step(1,'Tổng KH mở mới',opened,opened>0?'100%':'—%',channel+' · '+fmt(scope?.day??null)+' KH hôm nay')+step(2,'KH mới đã nộp tiền',funded,ratioText(funded,opened),'Trong '+fmt(opened)+' KH mở mới của đơn vị')+step(3,'Khớp lệnh lần đầu',matched,ratioText(matched,opened),'Trong '+fmt(opened)+' KH mở mới của đơn vị')+'<li class="cohort-step pending-step"><span class="step-index">4</span><div class="step-content"><h3>Theo dõi KH chưa sử dụng</h3><p>Hai trạng thái đếm độc lập trên tệp mở mới</p><div class="pending-row"><span>Chưa nộp tiền</span><strong>'+fmt(Number.isFinite(opened)&&Number.isFinite(funded)?opened-funded:null)+' KH</strong></div><div class="pending-row"><span>Chưa khớp lệnh</span><strong>'+fmt(Number.isFinite(opened)&&Number.isFinite(matched)?opened-matched:null)+' KH</strong></div></div></li>';
 document.getElementById('new-customer-flow-foot').textContent='Nguồn '+customerFlowInput.source+' · '+u.name+'. Mốc nộp tiền và khớp lệnh đếm độc lập trên cùng tệp mở mới của đơn vị.';
}
 function renderCustomerGroups(){
  const select=document.getElementById('abcd-unit-filter');
  const fixed=reportData.fixedCustomerCohort||null;
  select.innerHTML='<option value="all">Toàn công ty</option>'+units.map(u=>`<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');
  const compare=(current,previous,kind)=>{
   if(!Number.isFinite(current)||!Number.isFinite(previous))return {label:'—',tone:''};
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
   const scope=unit==='all'?fixed?.company:fixed?.centers?.[unit];
   const groups=scope?.groups||{};
    const labelDate=reportData.sourceDates.abcdLabel.slice(0,5),performanceDate=scope?.asOf?.slice(0,5),weekStart=reportData.fixedCustomerCohort.company.weekFrom?.slice(0,5);
    const weekRange=weekStart?.slice(3)===performanceDate?.slice(3)?`${weekStart.slice(0,2)}–${performanceDate}`:`${weekStart}–${performanceDate}`;
    document.querySelector('.fixed-cohort-status').textContent=scope?.asOf?`Nhãn ${labelDate} · quy mô và hiệu quả ${scope.asOf} · NAV âm chồng ${fmt(scope.navNegativeOverlap)} KH`:`${unit==='all'?'Toàn công ty':unit} · đang chờ dữ liệu gán nhãn ${labelDate}`;
   for(const key of ['A','B','C','D']){
    const g=groups[key]||{},tile=document.querySelector(`[data-segment="${key}"]`);
    const count=g.count??null,matched=g.matchedMtd??null;
     tile.querySelector('.segment-count').innerHTML=`${fmt(count)} <small>KH tại ${performanceDate} · chốt ${labelDate}: ${fmt(g.baseCount)}</small>`;tile.querySelector('.segment-count').setAttribute('title',`Chốt ${labelDate}: ${fmt(g.baseCount)} KH; hiện tại: ${fmt(count)} KH`);
    tile.querySelector('.segment-activation strong').textContent=`${fmt(matched)} KH`;
    tile.querySelector('.segment-activation span').textContent=count>0&&matched!==null?`${pct(matched/count*100,1)} của nhóm`:'—% của nhóm';
    const inactiveLastMonth=(key==='C'||key==='D')&&Boolean(scope);
    tile.querySelector('.segment-metrics').innerHTML=[
     metric('NAV',g.navCurrent,g.navPreviousAverage,'tỷ','Hiện tại','BQ tháng 9','change'),
     metric('Tiền mặt',g.cashCurrent,g.cashPreviousAverage,'tỷ','Hiện tại','BQ tháng 9','change'),
     metric('GTGD',g.gtgdMtd,inactiveLastMonth?(g.gtgdPreviousMonth??0):g.gtgdPreviousMonth,'tỷ','Lũy kế T10','Cả tháng 9','attainment'),
     metric('Phí net',g.feeMtd,inactiveLastMonth?(g.feePreviousMonth??0):g.feePreviousMonth,'triệu','Lũy kế T10','Cả tháng 9','attainment')
    ].join('');
     tile.querySelector('.segment-watch').innerHTML=`<div class="watch-row"><span>Riêng giai đoạn ${weekRange}: <b>${fmt(g.matchedWeek)} KH</b> khớp lệnh</span><strong>${fmt(g.gtgdWeek,2)} tỷ GTGD · ${fmt(g.feeWeek,2)} triệu phí</strong></div>`;
   }
  };
  select.addEventListener('change',redraw);redraw();
 }
function renderSupplementSources(){
 const table=document.querySelector('.source-table tbody');if(!table)return;
 const r=reportData.revenueSupplement,c=reportData.customerGrouping;
 if(r){const m=r.companyMonths['202610'];table.insertAdjacentHTML('beforeend',`<tr class="supplement-source-row"><td>DTPN MG/CTV và phòng</td><td>${esc(r.file)} · VND · 01–12/10. MG ${fmt(m.mg,2)} triệu; CTV ${fmt(m.ctv,2)} triệu; chưa phân loại ${fmt(m.unclassified,2)} triệu. Tổng ${fmt(m.total,2)} triệu, chênh ${signed(r.differenceAgainstPdf,2)} triệu so PDF 12/10.</td><td>DTPN BQ chia cho số MG/CTV trong cây cơ cấu tại 12/10. Cộng từng dòng phân bổ theo hợp đồng/phòng; ${fmt(r.repeatedPersonMonthKeys)} mã người-tháng xuất hiện nhiều dòng, không có dòng trùng nguyên bản hoặc DTPN dương lặp. Tháng 8/9 không dùng làm cùng kỳ 01–12/09. Phòng KHTC được nối theo D_NAME khi thiếu C_NAME/R_NAME; chưa tự gán phần doanh thu không xác định đơn vị.</td></tr>`)}
 if(c){table.insertAdjacentHTML('beforeend',`<tr class="supplement-source-row"><td>Phân nhóm KH toàn công ty</td><td>${esc(c.file)} · ${fmt(c.total)} mã KH riêng biệt tại 12/10, gồm ${fmt(c.old)} KH cũ và ${fmt(c.new)} KH mới. A/B/C/D: ${['A','B','C','D'].map(g=>fmt(c.groups[g].count)).join(' / ')}; ngoại lệ NAV âm: ${fmt(c.exceptions.count)}. NAV tổng theo file ${fmt(c.companyTotals.nav,2)} tỷ; PDF 12/10 ${fmt(reportData.previousReport.nav,2)} tỷ; chênh ${signed(c.navDifferenceAgainstPdf,2)} tỷ.</td><td>KH NAV âm tách khỏi B/D; A–D ${fmt(c.classifiedOld)} + ngoại lệ ${fmt(c.exceptions.count)} = ${fmt(c.old)} KH cũ. Tiền mặt từng nhóm = tổng TIEN_MAT của KH có TIEN_MAT &gt; 0 trong chính nhóm đó, đổi VND sang tỷ đồng; không cộng số dư âm hoặc bằng 0. Tỷ trọng nhóm dùng mẫu số ${fmt(c.old)}. GTGD/phí net là 30 ngày. Chưa có CUSTID → MG/trung tâm nên chỉ điền cấp công ty. Chỉ đưa số tổng hợp vào HTML, không xuất danh sách mã KH.</td></tr><tr class="supplement-source-row"><td>Ảnh chụp KH mới 12/10 · lịch sử</td><td>287 KH mở mới, 38 KH đã nộp tiền và 39 KH khớp lệnh lần đầu theo tệp tại 12/10. Có 52 KH mới có tiền mặt dương.</td><td>Đây là số lịch sử của 12/10; luồng KH mới hiện tại dùng Excel chốt ${customerFlowInput.asOf}. Mốc nộp tiền và khớp lệnh được đếm độc lập trên cùng tệp mở mới tại từng ngày chốt.</td></tr>`)}
}
 renderCustomerGroups();renderSupplementSources();
 const legacyGroupingRow=[...document.querySelectorAll('.supplement-source-row')].find(row=>row.cells[0]?.textContent==='Phân nhóm KH toàn công ty');
 if(legacyGroupingRow){legacyGroupingRow.cells[0].textContent='Ảnh chụp A–D cũ · lưu lịch sử';legacyGroupingRow.cells[2].textContent='Đây là phân nhóm theo NAV ngày 12/10 và khớp lệnh 30 ngày, không dùng làm nhãn cố định tháng 10. Cần NAV ngày 30/09 và lệnh khớp trong tháng 9 để chạy lại; chỉ sau đó mới đo hiệu quả tháng 10 trên cùng tệp KH.';}

// END_CUSTOMER_SUPPLEMENT
// BEGIN_PKKH_SEGMENTS
// PKKH is independent from A–D. October labels and unit ownership come from 30 September.
const pkkhData=reportData.pkkh;
const pkkhBusiness=['Dormant','Mass','Active Trader','HVT','HNW','UHNW','Block Deal (BD)'];
const pkkhStatus=['Zero','Unclassified','Other'];
const pkkhFields=['count','retained','navPositive','matched','navPrevious','debtPrevious','tradePrevious','feePrevious','navCurrent','debtCurrent','tradeMtd','feeMtd'];
const pkkhEmpty=Object.fromEntries(pkkhFields.map(field=>[field,0]));
const pkkhMetric=(unit,label)=>pkkhMonthly.values[unit]?.[label]||pkkhEmpty;
const pkkhSum=unit=>pkkhData.labels.reduce((total,label)=>{const item=pkkhMetric(unit,label);for(const field of pkkhFields)total[field]+=item[field];return total},{...pkkhEmpty});
const pkkhBn=value=>fmt(value,Math.abs(value)<10&&value!==0?2:1);
const pkkhShare=(value,total)=>{if(total<=0)return '—';const share=value/total*100;return `${fmt(share,share!==0&&Math.abs(share)<0.01?4:share!==0&&Math.abs(share)<0.1?2:1)}%`};
const pkkhChange=(current,previous)=>{if(previous<=0)return '—';const change=(current/previous-1)*100;return Math.abs(change)<0.05?'0,0%':signed(change,1,'%')};
const pkkhProgress=(current,previous)=>previous>0?fmt(current/previous*100,1)+'%':'—';
const pkkhCell=(main,sub,waiting=false)=>`<span class="pkkh-cell-main${waiting?' pkkh-cell-wait':''}">${main}</span><span class="pkkh-cell-sub">${sub}</span>`;
function renderPkkh(){
 const unit=document.getElementById('pkkh-unit-filter').value;
 const selected=unit==='all'?'Toàn công ty':pkkhData.units.find(item=>item.key===unit)?.label||unit;
  const reportDate=(unit==='all'?reportData.sourceDates.pkkhCompanyPerformance:reportData.sourceDates.pkkhCenterPerformance).slice(0,5);
  const labelDate=reportData.sourceDates.abcdLabel.slice(0,5),month=Number(reportData.reportDate.slice(3,5)),priorMonth=Number(reportData.sourceDates.abcdLabel.slice(3,5));
 const total=pkkhSum(unit);
 document.getElementById('pkkh-overview').innerHTML=`
   <article class="pkkh-kpi"><span>KH gắn nhãn đầu tháng</span><strong>${fmt(total.count)}<small> KH</small></strong><em>${esc(selected)} · nhãn ${labelDate} · hiệu quả ${reportDate}</em></article>
   <article class="pkkh-kpi"><span>KH khớp lệnh tháng ${month}</span><strong>${fmt(total.matched)}<small> KH</small></strong><em>${pkkhShare(total.matched,total.count)} tệp đầu tháng</em></article>
   <article class="pkkh-kpi"><span>NAV hiện tại · ${reportDate}</span><strong>${pkkhBn(total.navCurrent)}<small> tỷ</small></strong><em>BQ tháng ${priorMonth} ${pkkhBn(total.navPrevious)} tỷ · ${pkkhChange(total.navCurrent,total.navPrevious)}</em></article>
   <article class="pkkh-kpi"><span>GTGD lũy kế tháng ${month}</span><strong>${pkkhBn(total.tradeMtd)}<small> tỷ</small></strong><em>Cả tháng ${priorMonth} ${pkkhBn(total.tradePrevious)} tỷ · đạt ${pkkhProgress(total.tradeMtd,total.tradePrevious)}</em></article>
   <article class="pkkh-kpi"><span>Phí net lũy kế tháng ${month}</span><strong>${fmt(total.feeMtd,1)}<small> triệu</small></strong><em>Cả tháng ${priorMonth} ${fmt(total.feePrevious,1)} triệu · đạt ${pkkhProgress(total.feeMtd,total.feePrevious)}</em></article>`;
 document.getElementById('pkkh-table-body').innerHTML=pkkhData.labels.map(label=>{
  const item=pkkhMetric(unit,label);
  return `<tr class="${pkkhStatus.includes(label)?'pkkh-data-label':''}"><th scope="row">${esc(label)}</th>
   <td>${pkkhCell(fmt(item.count)+' KH',pkkhShare(item.count,total.count)+' tệp')}</td>
   <td>${pkkhCell(fmt(item.matched)+' KH',pkkhShare(item.matched,item.count)+' trong nhóm')}</td>
   <td>${pkkhCell(pkkhBn(item.navCurrent)+' tỷ','BQ T9 '+pkkhBn(item.navPrevious)+' · '+pkkhChange(item.navCurrent,item.navPrevious))}</td>
   <td>${pkkhCell(pkkhBn(item.tradeMtd)+' tỷ','Cả T9 '+pkkhBn(item.tradePrevious)+' · đạt '+pkkhProgress(item.tradeMtd,item.tradePrevious))}</td>
   <td>${pkkhCell(fmt(item.feeMtd,1)+' triệu','Cả T9 '+fmt(item.feePrevious,1)+' · đạt '+pkkhProgress(item.feeMtd,item.feePrevious))}</td>
   <td>${pkkhCell(pkkhBn(item.debtCurrent)+' tỷ','BQ T9 '+pkkhBn(item.debtPrevious)+' · '+pkkhChange(item.debtCurrent,item.debtPrevious))}</td></tr>`;
 }).join('');
 document.getElementById('pkkh-table-total').innerHTML=`<tr><th scope="row">Tổng tệp gắn nhãn</th><td>${pkkhCell(fmt(total.count)+' KH','100% của đơn vị')}</td><td>${pkkhCell(fmt(total.matched)+' KH',pkkhShare(total.matched,total.count)+' của tệp')}</td><td>${pkkhCell(pkkhBn(total.navCurrent)+' tỷ','BQ T9 '+pkkhBn(total.navPrevious)+' · '+pkkhChange(total.navCurrent,total.navPrevious))}</td><td>${pkkhCell(pkkhBn(total.tradeMtd)+' tỷ','Cả T9 '+pkkhBn(total.tradePrevious)+' · đạt '+pkkhProgress(total.tradeMtd,total.tradePrevious))}</td><td>${pkkhCell(fmt(total.feeMtd,1)+' triệu','Cả T9 '+fmt(total.feePrevious,1)+' · đạt '+pkkhProgress(total.feeMtd,total.feePrevious))}</td><td>${pkkhCell(pkkhBn(total.debtCurrent)+' tỷ','BQ T9 '+pkkhBn(total.debtPrevious)+' · '+pkkhChange(total.debtCurrent,total.debtPrevious))}</td></tr>`;
  for(const id of ['pkkh-table-body','pkkh-table-total']){
   const tableSection=document.getElementById(id);
   tableSection.innerHTML=tableSection.innerHTML.replaceAll('BQ T9',`BQ T${priorMonth}`).replaceAll('Cả T9',`Cả T${priorMonth}`);
  }
  const maxCount=Math.max(...pkkhBusiness.map(label=>pkkhMetric(unit,label).count),1);
 document.getElementById('pkkh-business-bars').innerHTML=pkkhBusiness.map(label=>{const item=pkkhMetric(unit,label);return `<div class="pkkh-bar-row"><span>${esc(label)}</span><div class="pkkh-bar-track"><i style="width:${Math.max(item.count/maxCount*100,item.count?2:0)}%"></i></div><strong>${fmt(item.count)}</strong></div>`}).join('');
 document.getElementById('pkkh-status-list').innerHTML=pkkhStatus.map(label=>{const item=pkkhMetric(unit,label);return `<div class="pkkh-status-row"><span>${esc(label)}</span><strong>${fmt(item.count)} KH</strong><small>${pkkhShare(item.count,total.count)}</small></div>`}).join('');
 document.querySelector('.pkkh-panels .pkkh-panel-head span').textContent=`7 phân khúc kinh doanh · KH ${labelDate}`;
 document.querySelector('.pkkh-quality > p').textContent=`Quy mô nhãn cố định tại ${labelDate}; ngày hiệu quả theo phạm vi chọn ở đầu sheet.`;
  document.getElementById('pkkh-source-note').textContent=`Nhãn ${labelDate} cố định. ${unit==='all'?`Hiệu quả cấp công ty theo Excel PKKH chốt ${reportDate}.`:`Hiệu quả theo trung tâm giữ mốc ${reportDate} để bảo toàn đơn vị gắn nhãn ${labelDate}.`} Tệp gắn nhãn: ${fmt(total.count)} KH. Số tài sản/giao dịch chỉ thuộc tệp PKKH, không thay tổng toàn hàng.`;
  const dailyRoot=document.getElementById('pkkh-daily'),daily=pkkhMonthly.dailySnapshot;
  if(daily?.values?.[unit]){
   const rows=daily.values[unit], fields=['currentCustomers','navPositive','matchedDay','nav','debt','tradeDay','feeDay'];
   const sum=Object.fromEntries(fields.map(field=>[field,pkkhData.labels.reduce((value,label)=>value+(rows[label]?.[field]||0),0)]));
   dailyRoot.hidden=false;
   dailyRoot.innerHTML=`<h3>Ảnh chụp phân khúc ngày ${esc(daily.asOf)} · ${esc(selected)}</h3><div class="pkkh-daily-summary"><span>KH khớp trong ngày <strong>${fmt(sum.matchedDay)}</strong></span><span>GTGD trong ngày <strong>${pkkhBn(sum.tradeDay)} tỷ</strong></span><span>Phí net trong ngày <strong>${fmt(sum.feeDay,1)} triệu</strong></span><span>NAV cuối ngày <strong>${pkkhBn(sum.nav)} tỷ</strong></span><span>Dư nợ cuối ngày <strong>${pkkhBn(sum.debt)} tỷ</strong></span></div><p class="pkkh-daily-scope">CSV ngày có ${fmt(sum.currentCustomers)} KH hiện tại; nhãn đầu tháng có ${fmt(total.count)} KH. Phạm vi hai tệp khác nhau, không dùng số trong ngày để tính tỷ lệ lũy kế ở bảng trên.</p><details><summary>Xem 10 phân khúc trong ngày</summary><div class="pkkh-daily-table"><table><thead><tr><th>Phân khúc</th><th>KH hiện tại</th><th>KH có NAV dương</th><th>KH khớp ngày</th><th>NAV · tỷ</th><th>Dư nợ · tỷ</th><th>GTGD ngày · tỷ</th><th>Phí net ngày · triệu</th></tr></thead><tbody>${pkkhData.labels.map(label=>{const row=rows[label];return `<tr><th>${esc(label)}</th><td>${fmt(row.currentCustomers)}</td><td>${fmt(row.navPositive)}</td><td>${fmt(row.matchedDay)}</td><td>${pkkhBn(row.nav)}</td><td>${pkkhBn(row.debt)}</td><td>${pkkhBn(row.tradeDay)}</td><td>${fmt(row.feeDay,1)}</td></tr>`}).join('')}</tbody></table></div></details>`;
  }else{dailyRoot.hidden=true;dailyRoot.innerHTML='';}
}
if(pkkhData&&pkkhMonthly){
 const selector=document.getElementById('pkkh-unit-filter');
 selector.insertAdjacentHTML('beforeend',pkkhData.units.map(unit=>`<option value="${esc(unit.key)}">${esc(unit.label)}</option>`).join(''));
 selector.addEventListener('change',renderPkkh);
 renderPkkh();
}

// END_PKKH_SEGMENTS
const initialTab=location.hash.slice(1);selectTab(['daily','customers','segments','units','data'].includes(initialTab)?initialTab:'daily');
}

loadDashboardData()
  .then(data => { initDashboard(data); document.documentElement.classList.add('data-ready'); })
  .catch(showDashboardError);
