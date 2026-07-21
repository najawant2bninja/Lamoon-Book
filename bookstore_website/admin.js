document.addEventListener('DOMContentLoaded',()=>{ if(!BookApp.requireRole('admin')) return; renderAll(); bindForms(); });
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
  const rows=BookApp.products().map(p=>`<tr><td><strong>${BookApp.escapeHtml(p.title)}</strong><br><span class="helper">${BookApp.escapeHtml(p.author)}</span></td><td>${BookApp.escapeHtml(p.category)}</td><td>${BookApp.formatTHB(p.price)}</td><td><input class="input" style="width:90px" data-stock="${p.id}" type="number" value="${p.stock}"></td><td>${BookApp.statusBadge('product', p.status || BookApp.productStockStatus(p.stock))}</td><td><button class="btn btn-danger btn-small" data-del-product="${p.id}">${BookApp.icon('trash')} ลบ</button></td></tr>`).join('');
  document.getElementById('productTable').innerHTML=`<thead><tr><th>หนังสือ</th><th>หมวด</th><th>ราคา</th><th>สต็อก</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  document.querySelectorAll('[data-stock]').forEach(i=>i.onchange=()=>{
    fetch(`http://localhost:3000/api/products/${i.dataset.stock}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stock:Number(i.value)})}).then(r=>r.json()).then(data=>{if(!data.ok)throw new Error();BookApp.toast('อัปเดตสต็อกแล้ว');renderAll();}).catch(()=>BookApp.toast('ไม่สามารถอัปเดตสต็อกได้'));
  });
  document.querySelectorAll('[data-del-product]').forEach(b=>b.onclick=()=>{BookApp.saveProducts(BookApp.products().filter(p=>p.id!==b.dataset.delProduct));BookApp.toast('ลบสินค้าแล้ว');renderAll();});
}
function renderStaff(){
  const list=BookApp.staff();
  document.getElementById('staffList').innerHTML=list.map(s=>`<article class="card staff-item"><div><strong>${BookApp.escapeHtml(s.name)}</strong><p class="helper">${BookApp.escapeHtml(s.email)}<br>${BookApp.escapeHtml(s.position)}</p></div><button class="btn btn-danger btn-small" data-del-staff="${s.id}">${BookApp.icon('trash')} ลบ</button></article>`).join('');
  document.querySelectorAll('[data-del-staff]').forEach(b=>b.onclick=()=>{BookApp.saveStaff(BookApp.staff().filter(s=>s.id!==b.dataset.delStaff));renderAll();});
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
    const saveProduct=()=>{
      fetch('http://localhost:3000/api/products',{method:'POST',body:fd})
        .then(async res => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.ok) {
            console.error('Add product response failed', { status: res.status, statusText: res.statusText, data });
            const message = data?.message || `${res.status} ${res.statusText}`;
            const detail = data?.error ? ` (${data.error})` : '';
            throw new Error(message + detail);
          }
          return data;
        })
        .then(data=>{
          const savedProduct={
            id:data.id,
            title:fd.get('title'),
            author:fd.get('author'),
            isbn:fd.get('isbn'),
            category:fd.get('category'),
            price:Number(fd.get('price')),
            stock:Number(fd.get('stock')),
            status:BookApp.productStockStatus(Number(fd.get('stock'))),
            cover:data.cover || 'assets/cover/default.jpg',
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
  document.getElementById('staffForm').onsubmit=e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    BookApp.saveStaff([{id:'s'+Date.now(),name:fd.get('name'),email:fd.get('email'),position:fd.get('position'),status:'active'},...BookApp.staff()]);
    e.target.reset();
    BookApp.toast('เพิ่มพนักงานแล้ว');
    renderAll();
  };
}
function drawCharts(){
  const orders=BookApp.orders()||[];
  drawBar(document.getElementById('salesChart'), 'สถานะคำสั่งซื้อ', [orders.filter(o=>o.paymentStatus==='pending').length, orders.filter(o=>o.orderStatus==='packing').length, orders.filter(o=>o.deliveryStatus==='in_transit').length, orders.filter(o=>o.orderStatus==='completed').length], ['รอตรวจ','จัดเตรียม','จัดส่ง','สำเร็จ'], ['#f59e0b','#4f8ef7','#22c55e','#8b5cf6']);
  const cat={}; orders.filter(o=>o.paymentStatus==='approved').forEach(o=>o.items?.forEach(i=>{ const p=BookApp.findProduct(i.id); const c=p?.category||'อื่น ๆ'; cat[c]=(cat[c]||0)+i.qty; }));
  const catLabels=Object.keys(cat).length?Object.keys(cat):['ยังไม่มี'];
  const catValues=Object.values(cat).length?Object.values(cat):[0];
  drawBar(document.getElementById('categoryChart'),'หมวดหมู่ขายได้',catValues,catLabels,['#ff7f50','#4f8ef7','#34d399','#f59e0b','#a78bfa','#14b8a6','#ef4444']);
  const shippingSummary=countsBy(orders,getShippingType);
  const shippingLabels=['ด่วน','ธรรมดา'];
  const shippingValues=[shippingSummary.express||0,shippingSummary.standard||0];
  drawPie(document.getElementById('deliveryChart'),'ประเภทการจัดส่ง',shippingLabels,shippingValues,['#ff5722','#3b82f6']);
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
function drawBar(canvas,_title,values,labels,colors){
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
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
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
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
