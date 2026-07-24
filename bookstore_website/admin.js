const CHART_TIME_ZONE='Asia/Bangkok';
const CHART_FILTER_KEYS=['orderStatus','category','delivery'];
const CHART_FILTER_META={
  orderStatus:{title:'สถานะคำสั่งซื้อ',subtitleId:'orderStatusChartSubtitle',canvasId:'salesChart'},
  category:{title:'หมวดหมู่ขายได้',subtitleId:'categoryChartSubtitle',canvasId:'categoryChart'},
  delivery:{title:'ประเภทการจัดส่ง',subtitleId:'deliveryChartSubtitle',canvasId:'deliveryChart'}
};
const CHART_DATE_PARTS_FORMATTER=new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn',{
  timeZone:CHART_TIME_ZONE,
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
});
const chartFilterState={};
let chartResizeTimer=null;
let chartResizeBound=false;
let chartDataCache=null;
const PRODUCT_COVER_TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const PRODUCT_COVER_EXTENSIONS=new Set(['.jpg','.jpeg','.png','.webp','.gif']);

function isSupportedProductCover(file){
  if(!file||!file.name) return true;
  const name=String(file.name).toLowerCase();
  const dotIndex=name.lastIndexOf('.');
  const extension=dotIndex>=0?name.slice(dotIndex):'';
  return PRODUCT_COVER_TYPES.has(String(file.type||'').toLowerCase())&&PRODUCT_COVER_EXTENSIONS.has(extension);
}

document.addEventListener('DOMContentLoaded',()=>{
  if(!BookApp.requireRole('admin')) return;
  initializeChartFilters();
  renderAll();
  bindForms();
  bindChartResize();
});
function renderAll(){ renderKpis(); renderLowStock(); renderProducts(); renderStaff(); renderApprovals(); drawCharts(); }
function renderKpis(){
  const p=BookApp.products(), o=BookApp.orders();
  const sales=o.filter(x=>x.paymentStatus==='approved').reduce((s,x)=>s+x.total,0);
  document.getElementById('adminKpis').innerHTML=`
    <div class="kpi"><div class="kpi-icon">${BookApp.icon('lineChart')}</div><div><strong>${BookApp.formatTHB(sales)}</strong><span>ยอดขายที่อนุมัติ</span></div></div>
    <div class="kpi"><div class="kpi-icon">${BookApp.icon('cart')}</div><div><strong>${o.length}</strong><span>คำสั่งซื้อ</span></div></div>
    <div class="kpi"><div class="kpi-icon">${BookApp.icon('books')}</div><div><strong>${p.length}</strong><span>สินค้า</span></div></div>
    <div class="kpi"><div class="kpi-icon">${BookApp.icon('alert')}</div><div><strong>${p.filter(x=>x.stock<100).length}</strong><span>ใกล้หมด</span></div></div>`;
}
function renderLowStock(){
  const items=BookApp.products().filter(p=>p.stock<100).sort((a,b)=>a.stock-b.stock);
  document.getElementById('lowStock').innerHTML=items.length?items.map(p=>`<div class="low-item"><div><strong>${BookApp.escapeHtml(p.title)}</strong><p class="helper">${BookApp.escapeHtml(p.category)}</p></div><span class="badge red">${p.stock} เล่ม</span></div>`).join(''):`<div class="empty-state"><div class="icon">${BookApp.icon('check')}</div><h3>ไม่มีสินค้าใกล้หมด</h3></div>`;
}
function renderProducts(){
  const rows=BookApp.products().map(p=>`<tr><td><strong>${BookApp.escapeHtml(p.title)}</strong><br><span class="helper">${BookApp.escapeHtml(p.author)}</span></td><td>${BookApp.escapeHtml(p.category)}</td><td>${BookApp.formatTHB(p.price)}</td><td><input class="input" style="width:90px" data-stock="${p.id}" type="number" inputmode="numeric" min="0" step="1" value="${p.stock}"></td><td>${BookApp.statusBadge('product', p.status || BookApp.productStockStatus(p.stock))}</td><td><button class="btn btn-danger btn-small" data-del-product="${p.id}">${BookApp.icon('trash')} ลบ</button></td></tr>`).join('');
  document.getElementById('productTable').innerHTML=`<thead><tr><th>หนังสือ</th><th>หมวด</th><th>ราคา</th><th>สต็อก</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  document.querySelectorAll('[data-stock]').forEach(i=>i.onchange=()=>{
    const stock=Number(i.value);
    if(!Number.isSafeInteger(stock)||stock<0){
      BookApp.toast('สต็อกต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      renderProducts();
      return;
    }
    BookApp.apiRequest('PATCH',`/products/${encodeURIComponent(i.dataset.stock)}`,{stock})
      .then(data=>{if(!data?.ok)throw new Error(data?.message||'ไม่สามารถอัปเดตสต็อกได้');BookApp.toast('อัปเดตสต็อกแล้ว');renderAll();})
      .catch(error=>BookApp.toast(error.message||'ไม่สามารถอัปเดตสต็อกได้'));
  });
  document.querySelectorAll('[data-del-product]').forEach(b=>b.onclick=async()=>{
    if(!window.confirm('ยืนยันการลบสินค้านี้ออกจากฐานข้อมูลหรือไม่?')) return;
    b.disabled=true;
    const result=await BookApp.apiRequest('DELETE',`/products/${encodeURIComponent(b.dataset.delProduct)}`);
    BookApp.toast(result.message||(result.ok?'ลบสินค้าแล้ว':'ไม่สามารถลบสินค้าได้'));
    if(result.ok) renderAll(); else b.disabled=false;
  });
}
function renderStaff(){
  const list=BookApp.staff();
  document.getElementById('staffList').innerHTML=list.length?list.map(s=>{
    const isActive=s.status!=='inactive';
    return `<article class="card staff-item"><div><strong>${BookApp.escapeHtml(s.name)}</strong><p class="helper">${BookApp.escapeHtml(s.email)}${s.phone?`<br>${BookApp.escapeHtml(s.phone)}`:''}<br><span class="badge ${isActive?'green':'red'}">${isActive?'ใช้งานอยู่':'ปิดใช้งาน'}</span></p></div>${isActive?`<button class="btn btn-danger btn-small" data-del-staff="${s.id}">${BookApp.icon('trash')} ปิดใช้งาน</button>`:`<button class="btn btn-secondary btn-small" data-enable-staff="${s.id}">เปิดใช้งาน</button>`}</article>`;
  }).join(''):'<div class="empty-state"><h3>ยังไม่มีพนักงาน</h3></div>';
  document.querySelectorAll('[data-del-staff]').forEach(b=>b.onclick=async()=>{
    const person=list.find(s=>String(s.id)===String(b.dataset.delStaff));
    if(!window.confirm(`ยืนยันปิดใช้งานบัญชี ${person?.name||'พนักงานคนนี้'} หรือไม่?`)) return;
    b.disabled=true;
    const result=await BookApp.deleteStaff(b.dataset.delStaff);
    BookApp.toast(result.message|| (result.ok?'ปิดใช้งานพนักงานแล้ว':'ไม่สามารถปิดใช้งานพนักงานได้'));
    if(result.ok) renderAll(); else b.disabled=false;
  });
  document.querySelectorAll('[data-enable-staff]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;
    const result=await BookApp.setStaffStatus(b.dataset.enableStaff,'active');
    BookApp.toast(result.message|| (result.ok?'เปิดใช้งานพนักงานแล้ว':'ไม่สามารถเปิดใช้งานพนักงานได้'));
    if(result.ok) renderAll(); else b.disabled=false;
  });
}
function renderApprovals(){
  const rows=BookApp.orders().map(o=>`<tr><td><strong>${o.id}</strong><br><span class="helper">${BookApp.dateTH(o.createdAt)}</span></td><td>${BookApp.escapeHtml(o.customerName)}</td><td>${BookApp.formatTHB(o.total)}</td><td>${BookApp.statusBadge('payment',o.paymentStatus)}</td><td>${BookApp.escapeHtml(o.staffName)}</td><td>${BookApp.statusBadge('order',o.orderStatus)}</td></tr>`).join('');
  document.getElementById('approvalTable').innerHTML=`<thead><tr><th>คำสั่งซื้อ</th><th>ลูกค้า</th><th>ยอดเงิน</th><th>ชำระเงิน</th><th>ผู้อนุมัติ</th><th>สถานะ</th></tr></thead><tbody>${rows || '<tr><td colspan="6">ยังไม่มีคำสั่งซื้อ</td></tr>'}</tbody>`;
}
function bindForms(){
  const coverInput=document.querySelector('[name="coverFile"]');
  const coverPreview=document.getElementById('coverPreview');
  const previewWrap=document.querySelector('.image-preview-wrap');
  const resetPreview=()=>{
    if(coverPreview){
      coverPreview.src='';
      coverPreview.hidden=true;
    }
    if(previewWrap){
      previewWrap.style.display='none';
    }
  };
  if(previewWrap){
    previewWrap.style.display='none';
  }
  if(coverInput){
    coverInput.onchange=()=>{
      const file=coverInput.files?.[0];
      if(file){
        if(!isSupportedProductCover(file)){
          coverInput.value='';
          resetPreview();
          BookApp.toast('รองรับรูปปกเฉพาะ JPG, PNG, WebP หรือ GIF');
          return;
        }
        const reader=new FileReader();
        reader.onload=()=>{
          if(coverPreview){
            coverPreview.src=reader.result;
            coverPreview.hidden=false;
          }
          if(previewWrap){
            previewWrap.style.display='flex';
          }
        };
        reader.readAsDataURL(file);
      } else {
        resetPreview();
      }
    };
  }
  document.getElementById('productForm').onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const file=fd.get('coverFile');
    const price=Number(fd.get('price'));
    const stock=Number(fd.get('stock'));
    if(!Number.isFinite(price)||price<=0){
      BookApp.toast('ราคาต้องเป็นตัวเลขมากกว่า 0');
      return;
    }
    if(!Number.isSafeInteger(stock)||stock<0){
      BookApp.toast('สต็อกต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      return;
    }
    if(file?.name&&!isSupportedProductCover(file)){
      BookApp.toast('รองรับรูปปกเฉพาะ JPG, PNG, WebP หรือ GIF');
      return;
    }
    const saveProduct=()=>{
      BookApp.apiRequest('POST','/products',fd)
        .then(data => {
          if (!data?.ok) throw new Error(data?.message || 'ไม่สามารถเพิ่มสินค้าได้');
          return data;
        })
        .then(data=>{
          const savedProduct={
            id:data.id,
            title:fd.get('title'),
            author:fd.get('author'),
            isbn:fd.get('isbn'),
            category:fd.get('category'),
            price,
            stock,
            status:BookApp.productStockStatus(stock),
            cover:data.cover || 'assets/cover/default.svg',
            rating:4.5,
            sold:0,
            desc:fd.get('desc') || 'รายละเอียดหนังสือที่เพิ่มโดยผู้ดูแลระบบ'
          };
          console.log('Saved product', savedProduct);
          BookApp.saveProducts([savedProduct,...BookApp.products()]);
          e.target.reset();
          resetPreview();
          BookApp.toast('เพิ่มสินค้าแล้ว');
          renderAll();
        })
        .catch(error=>{
          console.error('Add product failed', error);
          BookApp.toast(`ไม่สามารถเพิ่มสินค้าได้: ${error.message}`);
        });
    };
    saveProduct();
  };
  document.getElementById('staffForm').onsubmit=async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const name=String(fd.get('name')||'').trim();
    const email=String(fd.get('email')||'').trim();
    const phone=String(fd.get('phone')||'').replace(/\D/g,'');
    const password=String(fd.get('password')||'');
    const confirmPassword=String(fd.get('confirmPassword')||'');
    if(!name||!email||!password){BookApp.toast('กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ครบ');return;}
    if(password.length<8){BookApp.toast('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');return;}
    if(password!==confirmPassword){BookApp.toast('รหัสผ่านและการยืนยันไม่ตรงกัน');return;}
    if(phone&&!/^\d{10}$/.test(phone)){BookApp.toast('เบอร์โทรต้องเป็นตัวเลข 10 หลัก');return;}
    const submit=e.target.querySelector('[type="submit"]');
    submit.disabled=true;
    const result=await BookApp.createStaff({name,email,phone,password});
    BookApp.toast(result.message||(result.ok?'เพิ่มพนักงานแล้ว':'ไม่สามารถเพิ่มพนักงานได้'));
    if(result.ok){e.target.reset();renderAll();}
    submit.disabled=false;
  };
  const staffPhone=document.querySelector('#staffForm [name="phone"]');
  staffPhone?.addEventListener('input',()=>{staffPhone.value=staffPhone.value.replace(/\D/g,'').slice(0,10);});
}
function chartDateParts(value){
  const date=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(date.getTime())) return null;
  const values={};
  CHART_DATE_PARTS_FORMATTER.formatToParts(date).forEach(part=>{
    if(part.type==='year'||part.type==='month'||part.type==='day') values[part.type]=part.value;
  });
  return values.year&&values.month&&values.day?values:null;
}
function chartPeriodDefaults(){
  const current=chartDateParts(new Date());
  return {
    day:`${current.year}-${current.month}-${current.day}`,
    month:`${current.year}-${current.month}`,
    year:current.year
  };
}
function isValidChartPeriodValue(mode,value){
  const text=String(value||'').trim();
  const defaults=chartPeriodDefaults();
  if(mode==='all') return true;
  if(mode==='year') return /^\d{4}$/.test(text)&&Number(text)>=2000&&Number(text)<=Number(defaults.year);
  if(mode==='month'){
    const match=text.match(/^(\d{4})-(\d{2})$/);
    return Boolean(match&&Number(match[1])>=2000&&Number(match[2])>=1&&Number(match[2])<=12&&text<=defaults.month);
  }
  if(mode==='day'){
    const match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return false;
    const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
    const parsed=new Date(Date.UTC(year,month-1,day));
    return year>=2000&&text<=defaults.day&&parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day;
  }
  return false;
}
function configureChartPeriodInput(key,mode){
  const input=document.querySelector(`[data-chart-period-value="${key}"]`);
  const state=chartFilterState[key];
  if(!input||!state) return;
  state.mode=['all','day','month','year'].includes(mode)?mode:'all';
  input.hidden=state.mode==='all';
  input.disabled=state.mode==='all';
  input.closest('.chart-filter-controls')?.classList.toggle('no-period-value',state.mode==='all');
  input.removeAttribute('min');
  input.removeAttribute('max');
  input.removeAttribute('step');
  input.removeAttribute('placeholder');
  input.removeAttribute('title');
  if(state.mode==='all') return;
  const defaults=chartPeriodDefaults();
  input.type=state.mode==='year'?'number':state.mode==='day'?'date':'month';
  if(state.mode==='year'){
    input.min='2000';
    input.max=defaults.year;
    input.step='1';
    input.placeholder='ค.ศ.';
    input.title='กรอกปี ค.ศ.';
  }else{
    input.max=defaults[state.mode];
  }
  input.value=state[state.mode]||defaults[state.mode];
  input.setAttribute('aria-label',`เลือก${state.mode==='day'?'วัน':state.mode==='month'?'เดือน':'ปี ค.ศ.'}ของกราฟ${CHART_FILTER_META[key].title}`);
}
function initializeChartFilters(){
  const defaults=chartPeriodDefaults();
  CHART_FILTER_KEYS.forEach(key=>{
    const select=document.querySelector(`[data-chart-period="${key}"]`);
    const input=document.querySelector(`[data-chart-period-value="${key}"]`);
    if(!select||!input) return;
    chartFilterState[key]={mode:select.value||'all',...defaults};
    select.setAttribute('aria-controls',CHART_FILTER_META[key].canvasId);
    input.setAttribute('aria-controls',CHART_FILTER_META[key].canvasId);
    configureChartPeriodInput(key,chartFilterState[key].mode);
    select.addEventListener('change',()=>{
      configureChartPeriodInput(key,select.value);
      drawCharts(true);
    });
    input.addEventListener('change',()=>{
      const state=chartFilterState[key];
      const value=String(input.value||'').trim();
      if(!isValidChartPeriodValue(state.mode,value)){
        input.value=state[state.mode]||chartPeriodDefaults()[state.mode];
        BookApp.toast('กรุณาเลือกช่วงเวลาให้ถูกต้อง');
        return;
      }
      state[state.mode]=value;
      drawCharts(true);
    });
  });
}
function getChartFilter(key){
  const state=chartFilterState[key];
  if(!state) return {mode:'all',value:''};
  return {mode:state.mode,value:state.mode==='all'?'':state[state.mode]};
}
function filterOrdersByPeriod(orders,filter){
  const list=Array.isArray(orders)?orders:[];
  if(!filter||filter.mode==='all') return list;
  if(!isValidChartPeriodValue(filter.mode,filter.value)) return [];
  return list.filter(order=>{
    const parts=chartDateParts(order?.createdAt);
    if(!parts) return false;
    const key=filter.mode==='day'
      ?`${parts.year}-${parts.month}-${parts.day}`
      :filter.mode==='month'
        ?`${parts.year}-${parts.month}`
        :parts.year;
    return key===String(filter.value);
  });
}
function chartPeriodLabel(filter){
  if(!filter||filter.mode==='all') return 'ข้อมูลทั้งหมด';
  const values=String(filter.value).split('-').map(Number);
  const year=values[0],month=values[1]||1,day=values[2]||1;
  const date=new Date(Date.UTC(year,month-1,day,12));
  const options=filter.mode==='day'
    ?{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}
    :filter.mode==='month'
      ?{month:'long',year:'numeric',timeZone:'UTC'}
      :{year:'numeric',timeZone:'UTC'};
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory-nu-latn',options).format(date);
}
function updateChartSummary(key,filter,count,noun='คำสั่งซื้อ'){
  const meta=CHART_FILTER_META[key];
  const subtitle=document.getElementById(meta.subtitleId);
  if(!subtitle) return;
  subtitle.setAttribute('aria-live','polite');
  subtitle.textContent=`วันที่สร้าง: ${chartPeriodLabel(filter)} · ${count} ${noun}`;
}
function updateChartAriaLabel(key,filter,labels,values){
  const canvas=document.getElementById(CHART_FILTER_META[key].canvasId);
  if(!canvas) return;
  const details=labels.map((label,index)=>`${label} ${values[index]||0}`).join(', ');
  canvas.setAttribute('aria-label',`${CHART_FILTER_META[key].title} ${chartPeriodLabel(filter)}: ${details}`);
}
function bindChartResize(){
  if(chartResizeBound) return;
  chartResizeBound=true;
  window.addEventListener('resize',()=>{
    window.clearTimeout(chartResizeTimer);
    chartResizeTimer=window.setTimeout(()=>drawCharts(true),160);
  });
}
function drawCharts(useCachedData=false){
  if(!useCachedData||!chartDataCache){
    chartDataCache={
      orders:BookApp.orders()||[],
      products:BookApp.products()||[]
    };
  }
  const {orders,products}=chartDataCache;

  const orderStatusFilter=getChartFilter('orderStatus');
  const orderStatusOrders=filterOrdersByPeriod(orders,orderStatusFilter);
  const orderStatusLabels=['รอตรวจ','จัดเตรียม','จัดส่ง','สำเร็จ','ยกเลิก'];
  const orderStatusValues=[
    orderStatusOrders.filter(o=>o.paymentStatus==='pending').length,
    orderStatusOrders.filter(o=>o.orderStatus==='packing').length,
    orderStatusOrders.filter(o=>o.deliveryStatus==='in_transit').length,
    orderStatusOrders.filter(o=>o.orderStatus==='completed').length,
    orderStatusOrders.filter(o=>o.orderStatus==='cancelled').length
  ];
  updateChartSummary('orderStatus',orderStatusFilter,orderStatusValues.reduce((sum,value)=>sum+value,0));
  updateChartAriaLabel('orderStatus',orderStatusFilter,orderStatusLabels,orderStatusValues);
  drawBar(document.getElementById('salesChart'),'สถานะคำสั่งซื้อ',orderStatusValues,orderStatusLabels,['#f59e0b','#4f8ef7','#22c55e','#8b5cf6','#ef4444']);

  const categoryFilter=getChartFilter('category');
  const categoryOrders=filterOrdersByPeriod(orders,categoryFilter).filter(o=>o.paymentStatus==='approved');
  const productById=new Map(products.map(product=>[String(product.id),product]));
  const categoryCounts=new Map();
  categoryOrders.forEach(o=>o.items?.forEach(i=>{
    const p=productById.get(String(i.id));
    const c=p?.category||'อื่น ๆ';
    categoryCounts.set(c,(categoryCounts.get(c)||0)+(Number(i.qty)||0));
  }));
  const catLabels=categoryCounts.size?[...categoryCounts.keys()]:['ยังไม่มี'];
  const catValues=categoryCounts.size?[...categoryCounts.values()]:[0];
  updateChartSummary('category',categoryFilter,catValues.reduce((sum,value)=>sum+value,0),'เล่มที่ชำระแล้ว');
  updateChartAriaLabel('category',categoryFilter,catLabels,catValues);
  drawBar(document.getElementById('categoryChart'),'หมวดหมู่ขายได้',catValues,catLabels,['#ff7f50','#4f8ef7','#34d399','#f59e0b','#a78bfa','#14b8a6','#ef4444']);

  const deliveryFilter=getChartFilter('delivery');
  const deliveryOrders=filterOrdersByPeriod(orders,deliveryFilter);
  const shippingSummary=countsBy(deliveryOrders,getShippingType);
  const shippingLabels=['ด่วน','ธรรมดา'];
  const shippingValues=[shippingSummary.express||0,shippingSummary.standard||0];
  if(shippingSummary.unknown){
    shippingLabels.push('อื่น ๆ');
    shippingValues.push(shippingSummary.unknown);
  }
  updateChartSummary('delivery',deliveryFilter,shippingValues.reduce((sum,value)=>sum+value,0));
  updateChartAriaLabel('delivery',deliveryFilter,shippingLabels,shippingValues);
  drawPie(document.getElementById('deliveryChart'),'ประเภทการจัดส่ง',shippingLabels,shippingValues,['#ff5722','#3b82f6','#94a3b8']);
}
function countsBy(items, keyFn){
  return items.reduce((acc,item)=>{ const key=keyFn(item); acc[key]=(acc[key]||0)+1; return acc; },{});
}
function getShippingType(order){
  const methodId=String(order.shippingMethod?.id??order.shippingMethodId??'').trim().toLowerCase();
  const methodName=String(order.shippingMethod?.name??order.shippingMethodName??'').trim().toLowerCase();
  if(methodId==='2'||methodId==='express'||methodName.includes('express')||methodName.includes('ด่วน')) return 'express';
  if(methodId==='1'||methodId==='standard'||methodName.includes('standard')||methodName.includes('มาตรฐาน')||methodName.includes('ธรรมดา')) return 'standard';
  return 'unknown';
}
function getChartScale(values){
  const dataMax=Math.max(...values.map(value=>Number(value)||0),0);
  if(dataMax<=4){
    return {max:Math.max(1,Math.ceil(dataMax)),step:1};
  }
  const roughStep=dataMax/4;
  const magnitude=10**Math.floor(Math.log10(roughStep));
  const normalizedStep=roughStep/magnitude;
  const multiplier=normalizedStep<=1?1:normalizedStep<=2?2:normalizedStep<=5?5:10;
  const step=multiplier*magnitude;
  return {max:Math.ceil(dataMax/step)*step,step};
}
function canvasLabelLines(ctx,label,maxWidth,maxLines=2){
  const characters=Array.from(String(label));
  const lines=[];
  let line='';
  let index=0;
  while(index<characters.length&&lines.length<maxLines){
    const candidate=line+characters[index];
    if(line&&ctx.measureText(candidate).width>maxWidth){
      lines.push(line);
      line='';
      continue;
    }
    line=candidate;
    index+=1;
  }
  if(line&&lines.length<maxLines) lines.push(line);
  if(index<characters.length){
    const lastIndex=Math.max(0,lines.length-1);
    let lastLine=lines[lastIndex]||'';
    while(lastLine&&ctx.measureText(lastLine+'…').width>maxWidth){
      lastLine=Array.from(lastLine).slice(0,-1).join('');
    }
    lines[lastIndex]=lastLine+'…';
  }
  return lines;
}
function prepareChartCanvas(canvas,minHeight,ratio){
  const cssWidth=Math.max(1,Math.round(canvas.clientWidth||canvas.getBoundingClientRect().width||Number(canvas.getAttribute('width'))||560));
  const cssHeight=Math.max(minHeight,Math.round(cssWidth*ratio));
  const pixelRatio=Math.min(Math.max(Number(window.devicePixelRatio)||1,1),2);
  canvas.style.height=`${cssHeight}px`;
  canvas.width=Math.round(cssWidth*pixelRatio);
  canvas.height=Math.round(cssHeight*pixelRatio);
  const ctx=canvas.getContext('2d');
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  return {ctx,w:cssWidth,h:cssHeight};
}
function drawBar(canvas,_title,values,labels,colors){
  canvas.style.minWidth=`${Math.max(320,78+values.length*68)}px`;
  const {ctx,w,h}=prepareChartCanvas(canvas,260,.54);
  const padding={top:30,right:24,bottom:74,left:54};
  const chartW=w-padding.left-padding.right;
  const chartH=h-padding.top-padding.bottom;
  const scale=getChartScale(values);
  const tickCount=Math.round(scale.max/scale.step);
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#fffbf3');
  bg.addColorStop(1,'#fff8ed');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#ead9bd';
  ctx.lineWidth=1;
  for(let i=0;i<=tickCount;i++){
    const value=i*scale.step;
    const y=padding.top+chartH-(value/scale.max)*chartH;
    ctx.beginPath(); ctx.moveTo(padding.left,y); ctx.lineTo(w-padding.right,y); ctx.stroke();
    ctx.fillStyle='#8b7355'; ctx.font='13px sans-serif'; ctx.textAlign='right'; ctx.fillText(String(value),padding.left-12,y+4);
  }
  ctx.strokeStyle='#a0826a'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(padding.left,padding.top); ctx.lineTo(padding.left,padding.top+chartH); ctx.lineTo(w-padding.right,padding.top+chartH); ctx.stroke();
  const barStep=chartW/values.length;
  const barW=Math.min(76,Math.max(28,barStep*0.52));
  values.forEach((v,i)=>{
    const x=padding.left+(i+0.5)*barStep;
    const bh=(v/scale.max)*chartH;
    const y=padding.top+chartH-bh;
    const color=colors[i%colors.length]||'#df7a2a';
    if(bh>0){
      ctx.shadowColor='rgba(75,43,24,0.14)'; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
      ctx.fillStyle=color;
      ctx.beginPath(); ctx.roundRect(x-barW/2,y,barW,bh,8); ctx.fill();
    }
    ctx.shadowColor='transparent';
    ctx.fillStyle='#4b2b18'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center'; ctx.fillText(String(v),x,Math.max(18,y-10));
    ctx.fillStyle='#6f5d4f'; ctx.font='13px sans-serif';
    const labelLines=canvasLabelLines(ctx,labels[i],Math.max(42,barStep-14));
    labelLines.forEach((line,lineIdx)=>{
      ctx.fillText(line,x,h-padding.bottom+22+lineIdx*16);
    });
  });
}
function drawPie(canvas,_title,labels,values,colors){
  const {ctx,w,h}=prepareChartCanvas(canvas,300,.46);
  const radius=Math.min(w,h)/3.05;
  const centerX=w/2;
  const centerY=h/2;
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#fffbf3');
  bg.addColorStop(1,'#fff8ed');
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  const total=values.reduce((sum,v)=>sum+v,0);
  let startAngle=-Math.PI/2;
  if(total>0){
    values.forEach((value,index)=>{
      const slice=(value/total)*(Math.PI*2);
      const midAngle=startAngle+slice/2;
      ctx.beginPath();
      ctx.moveTo(centerX,centerY);
      ctx.arc(centerX,centerY,radius,startAngle,startAngle+slice);
      ctx.closePath();
      ctx.fillStyle=colors[index%colors.length]||'#df7a2a';
      ctx.shadowColor='rgba(0,0,0,0.12)'; ctx.shadowBlur=8; ctx.shadowOffsetX=2; ctx.shadowOffsetY=3;
      ctx.fill();
      ctx.shadowColor='transparent';
      const pct=Math.round((value/total)*100);
      if(pct>5){
        const textX=centerX+Math.cos(midAngle)*(radius*0.68);
        const textY=centerY+Math.sin(midAngle)*(radius*0.68);
        ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='center'; ctx.fillText(pct+'%',textX,textY+4);
      }
      startAngle+=slice;
    });
    ctx.beginPath();
    ctx.arc(centerX,centerY,radius*0.58,0,Math.PI*2);
    ctx.fillStyle='#fffbf3';
    ctx.fill();
    ctx.fillStyle='#4b2b18'; ctx.font='bold 18px sans-serif'; ctx.textAlign='center'; ctx.fillText(String(total),centerX,centerY-2);
    ctx.font='12px sans-serif'; ctx.fillStyle='#8b7355'; ctx.fillText('รวมทั้งหมด',centerX,centerY+14);
  } else {
    ctx.beginPath(); ctx.arc(centerX,centerY,radius,0,Math.PI*2); ctx.fillStyle='#f3e7d4'; ctx.fill();
    ctx.strokeStyle='#d9c4a0'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#7d6b5e'; ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.fillText('ยังไม่มีข้อมูล',centerX,centerY);
  }
  const legend=document.getElementById('deliveryLegend');
  if(legend){
    legend.innerHTML=labels.map((label,index)=>`<div class="legend-item"><span class="legend-swatch" style="background:${colors[index%colors.length]||'#df7a2a'}"></span><span>${label}</span><span style="color:#a0826a;margin-left:auto">${values[index]||0} รายการ</span></div>`).join('');
  }
}
