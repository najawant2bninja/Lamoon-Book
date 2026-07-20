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
  const resetPreview=()=>{
    if(coverPreview){
      coverPreview.src='';
      coverPreview.hidden=true;
    }
  };
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
    const saveProduct=coverUrl=>{
      const product={id:'b'+Date.now(),title:fd.get('title'),author:fd.get('author'),isbn:fd.get('isbn'),category:fd.get('category'),price:Number(fd.get('price')),stock:Number(fd.get('stock')),status:BookApp.productStockStatus(Number(fd.get('stock'))),cover:'cover-'+((BookApp.products().length%6)+1),coverUrl:coverUrl||'',rating:4.5,sold:0,desc:'รายละเอียดหนังสือที่เพิ่มโดยผู้ดูแลระบบ'};
      fetch('http://localhost:3000/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...product,cover:product.coverUrl})}).catch(()=>BookApp.toast('ไม่สามารถเพิ่มสินค้าได้'));
      e.target.reset();
      resetPreview();
      BookApp.toast('เพิ่มสินค้าแล้ว');
      renderAll();
    };
    if(file && file.size){
      const reader=new FileReader();
      reader.onload=()=>saveProduct(reader.result);
      reader.readAsDataURL(file);
    } else {
      saveProduct('');
    }
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
  const orders=BookApp.orders();
  drawBar(document.getElementById('salesChart'), 'สถานะคำสั่งซื้อ', [orders.filter(o=>o.paymentStatus==='pending').length, orders.filter(o=>o.orderStatus==='packing').length, orders.filter(o=>o.deliveryStatus==='in_transit').length, orders.filter(o=>o.orderStatus==='completed').length], ['รอตรวจ','จัดเตรียม','จัดส่ง','สำเร็จ']);
  const cat={}; orders.filter(o=>o.paymentStatus==='approved').forEach(o=>o.items.forEach(i=>{ const p=BookApp.findProduct(i.id); const c=p?.category||'อื่น ๆ'; cat[c]=(cat[c]||0)+i.qty; }));
  drawBar(document.getElementById('categoryChart'),'หมวดหมู่ขายได้',Object.values(cat).length?Object.values(cat):[0],Object.keys(cat).length?Object.keys(cat):['ยังไม่มี']);
}
function drawBar(canvas,title,values,labels){
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#4b2b18'; ctx.font='bold 18px sans-serif'; ctx.fillText(title,18,28);
  const max=Math.max(...values,1), gap=16, barW=(w-50-gap*(values.length-1))/values.length;
  values.forEach((v,i)=>{
    const bh=(h-82)*(v/max), x=25+i*(barW+gap), y=h-38-bh;
    ctx.fillStyle='#df7a2a'; ctx.fillRect(x,y,barW,bh);
    ctx.fillStyle='#7d6b5e'; ctx.font='12px sans-serif'; ctx.fillText(String(labels[i]).slice(0,9),x,h-14);
    ctx.fillStyle='#4b2b18'; ctx.font='bold 13px sans-serif'; ctx.fillText(String(v),x+barW/2-5,y-6);
  });
}
