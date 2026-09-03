(() => {
  const config = window.STORE_CONFIG;
  const cart = new Map();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const els = {
    heroTitle: $("#heroTitle"), heroText: $("#heroText"), productGrid: $("#productGrid"),
    searchInput: $("#searchInput"), cartButton: $("#cartButton"), cartCount: $("#cartCount"),
    cartDrawer: $("#cartDrawer"), drawerItems: $("#drawerItems"), drawerTotal: $("#drawerTotal"),
    goCheckout: $("#goCheckout"), cartItems: $("#cartItems"), clearCart: $("#clearCart"),
    subtotal: $("#subtotal"), grandTotal: $("#grandTotal"), fulfilment: $("#fulfilment"),
    locationField: $("#locationField"), location: $("#location"), paymentMethod: $("#paymentMethod"),
    qrPanel: $("#qrPanel"), qrPlaceholder: $("#qrPlaceholder"), qrImage: $("#qrImage"),
    qrAccountName: $("#qrAccountName"), orderForm: $("#orderForm"), submitButton: $("#submitButton"),
    toast: $("#toast")
  };

  const money = (n) => `${config.currency}${Number(n).toFixed(2)}`;
  const escapeHtml = (v) => String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

  function init() {
    els.heroTitle.textContent = config.heroTitle;
    els.heroText.textContent = config.heroText;
    els.qrAccountName.textContent = config.qrAccountName;

    if (config.qrImage) {
      const test = new Image();
      test.onload = () => { els.qrImage.src = config.qrImage; els.qrImage.classList.remove("hidden"); els.qrPlaceholder.classList.add("hidden"); };
      test.src = config.qrImage;
    }

    renderProducts(); renderCart(); toggleFulfilment(); togglePayment(); bindEvents();
  }

  function renderProducts(query = "") {
    const q = query.toLowerCase().trim();
    const rows = config.products.filter(p => `${p.name} ${p.variant} ${p.description}`.toLowerCase().includes(q));
    els.productGrid.innerHTML = rows.length ? rows.map(p => `
      <article class="product-card">
        <div class="product-media">
          ${p.badge ? `<span class="product-badge">${escapeHtml(p.badge)}</span>` : ""}
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="product-body">
          <div><h3>${escapeHtml(p.name)}</h3><p><strong>${escapeHtml(p.variant)}</strong> · ${escapeHtml(p.description)}</p></div>
          <div class="product-meta"><span class="price">${money(p.price)}</span><button class="add-btn" type="button" data-add="${p.id}">+ Add</button></div>
        </div>
      </article>`).join("") : `<div class="empty-cart"><p>Tiada produk dijumpai.</p></div>`;
    $$('[data-add]').forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add)));
  }

  function addToCart(id) {
    const product = config.products.find(p => p.id === id); if (!product) return;
    const existing = cart.get(id); cart.set(id, { product, qty: existing ? existing.qty + 1 : 1 });
    renderCart(); toast(`${product.name} ditambah`);
  }

  function updateQty(id, change) {
    const row = cart.get(id); if (!row) return;
    row.qty += change; if (row.qty <= 0) cart.delete(id); else cart.set(id,row); renderCart();
  }

  function cartRows(){ return [...cart.values()]; }
  function subtotal(){ return cartRows().reduce((s,r)=>s+r.product.price*r.qty,0); }

  function cartMarkup(){
    if (!cart.size) return `<div class="empty-cart"><span>🛒</span><p>Cart masih kosong.</p></div>`;
    return cartRows().map(({product,qty})=>`<div class="cart-row"><div class="cart-info"><strong>${escapeHtml(product.name)} (${escapeHtml(product.variant)})</strong><span>${money(product.price)} × ${qty}</span></div><div class="qty-control"><button type="button" data-minus="${product.id}">−</button><span>${qty}</span><button type="button" data-plus="${product.id}">+</button></div></div>`).join('');
  }

  function renderCart(){
    const m = cartMarkup(); els.cartItems.innerHTML=m; els.drawerItems.innerHTML=m;
    [els.cartItems,els.drawerItems].forEach(c=>{ c.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>updateQty(b.dataset.minus,-1)); c.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>updateQty(b.dataset.plus,1)); });
    const count=cartRows().reduce((s,r)=>s+r.qty,0), total=subtotal();
    els.cartCount.textContent=count; els.subtotal.textContent=money(total); els.grandTotal.textContent=money(total); els.drawerTotal.textContent=money(total);
  }

  function openDrawer(){ els.cartDrawer.classList.add('open'); els.cartDrawer.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeDrawer(){ els.cartDrawer.classList.remove('open'); els.cartDrawer.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function toggleFulfilment(){ const cod=els.fulfilment.value==='COD'; els.locationField.classList.toggle('hidden',!cod); els.location.required=cod; }
  function togglePayment(){ els.qrPanel.classList.toggle('hidden',els.paymentMethod.value!=='DuitNow QR'); }
  function orderId(){ const d=new Date(); return `ORD-${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
  function normalizePhone(p){ p=String(p).replace(/\D/g,''); if(p.startsWith('0')) p='6'+p; if(!p.startsWith('60')) p='60'+p; return p; }
  function validPhone(p){ const d=String(p).replace(/\D/g,''); return d.length>=9 && d.length<=13; }

  function waMessage(order){
    const lines=[`Hi, saya nak confirm order ${order.orderId}.`,``,`Nama: ${order.customerName}`,`Cara terima: ${order.fulfilment}${order.location?` - ${order.location}`:''}`,`Bayaran: ${order.paymentMethod}`,``,`ITEM:`];
    order.items.forEach(i=>lines.push(`- ${i.name} (${i.variant}) x${i.qty} = ${money(i.lineTotal)}`));
    lines.push(``,`Total produk: ${money(order.subtotal)}`,order.fulfilment==='COD'?`Caj COD: akan disahkan seller`:``,order.note?`Nota: ${order.note}`:``, ``, order.paymentMethod==='DuitNow QR'?`Saya akan hantar screenshot resit di sini selepas pembayaran.`:`Payment: Cash.`,``,`Terima kasih.`);
    return lines.filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n');
  }

  async function sendToSheet(order){
    const url=String(config.appsScriptUrl||'').trim();
    if(!url || url.includes('PASTE_APPS_SCRIPT')) throw new Error('Apps Script URL belum diset dalam config.js');
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(order)});
  }

  async function submitOrder(e){
    e.preventDefault(); if(!cart.size){toast('Cart masih kosong');return;}
    const fd=new FormData(els.orderForm); if(fd.get('website')) return;
    const customerName=String(fd.get('customerName')||'').trim(), phone=String(fd.get('phone')||'').trim(), fulfilment=String(fd.get('fulfilment')||''), location=String(fd.get('location')||'').trim(), paymentMethod=String(fd.get('paymentMethod')||''), note=String(fd.get('note')||'').trim();
    if(!validPhone(phone)){toast('No. WhatsApp tidak sah');return;} if(fulfilment==='COD'&&!location){toast('Sila isi lokasi COD');return;}
    const order={orderId:orderId(),createdAtClient:new Date().toISOString(),storeName:config.storeName,customerName,phone:normalizePhone(phone),fulfilment,location,paymentMethod,note,subtotal:Number(subtotal().toFixed(2)),status:'NEW',paymentStatus:paymentMethod==='DuitNow QR'?'PENDING VERIFY':'CASH',items:cartRows().map(({product,qty})=>({productId:product.id,name:product.name,variant:product.variant,unitPrice:Number(product.price),qty,lineTotal:Number((product.price*qty).toFixed(2))}))};
    els.submitButton.disabled=true; els.submitButton.innerHTML='Submitting... <span>→</span>';
    try{await sendToSheet(order); localStorage.setItem(`order_${order.orderId}`,JSON.stringify(order)); toast(`Order ${order.orderId} dihantar`); setTimeout(()=>window.open(`https://wa.me/${config.sellerWhatsApp}?text=${encodeURIComponent(waMessage(order))}`,'_blank'),350); cart.clear();renderCart();els.orderForm.reset();toggleFulfilment();togglePayment();}
    catch(err){console.error(err);toast(err.message||'Gagal submit order');}
    finally{els.submitButton.disabled=false;els.submitButton.innerHTML='Submit order <span>→</span>';}
  }

  function toast(msg){ els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),2200); }
  function bindEvents(){ els.searchInput.addEventListener('input',e=>renderProducts(e.target.value)); els.cartButton.onclick=openDrawer; $$('[data-close-drawer]').forEach(x=>x.onclick=closeDrawer); els.goCheckout.onclick=()=>{closeDrawer();$('#checkout').scrollIntoView({behavior:'smooth'});}; els.clearCart.onclick=()=>{cart.clear();renderCart();}; els.fulfilment.onchange=toggleFulfilment; els.paymentMethod.onchange=togglePayment; els.orderForm.addEventListener('submit',submitOrder); }
  init();
})();
