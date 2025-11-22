// Simple product data and UI for demo
const products = [
  {id:1,title:'Wireless Headphones',price:59.99,category:'Electronics',image:'./images/headphones.jpg',desc:'Comfortable wireless headphones with long battery life.'},
  {id:2,title:'Stylish Sunglass',price:399.99,category:'Fashion',image:'./images/StylishSunglass.jpg',desc:'Stylish Sunglass.'},
  {id:3,title:'Black Tea',price:79.99,category:'Grocery',image:'./images/blacktea.jpg',desc:'black tea barista-style coffee at home.'},
  {id:4,title:'Running Shoes',price:89.99,category:'Footwear',image:'./images/shoes.jpg',desc:'Lightweight running shoes.'},
  {id:5,title:'Bluetooth Speaker',price:29.99,category:'Electronics',image:'./images/bluetoothSpeaker.jpg',desc:'Portable speaker with rich sound.'},
  {id:6,title:'Laptop',price:899.99,category:'Electronics',image:'./images/laptop.jpg',desc:'Powerful laptop for work and play.'},
  {id:7,title:'Cookbook',price:19.99,category:'Books',image:'./images/cookbook.jpg',desc:'Delicious recipes for every day.'},
  {id:8,title:'Sneakers',price:24.99,category:'Footwear',image:'./images/sneakers.jpg',desc:'Durable and comfortable sneakers.'},
  {id:9,title:'Backpack',price:49.99,category:'Accessories',image:'./images/backpack.jpg',desc:'Durable backpack for travel.'},
  {id:10,title:'Fitness Tracker',price:69.99,category:'Fitness',image:'./images/fitnesstracker.jpg',desc:'Track steps, sleep and workouts.'}
];

// Available local images in the `image` folder (detected from workspace):
const availableImages = [
  'blacktea.webp',
  'Denim Jacket.webp',
  'Leather Backpack.webp',
  'bluetoothSpeaker.webp',
  'sneakers.webp',
  'headphones.jpg',
  'cookbook.jpg',
  'laptop.jpg',
  'fitnesstracker.webp',
  'shoes.jpg',
  'StylishSunglass.webp'
];

function normalizeName(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,' '); }

function findBestImageForTitle(title){
  const t = normalizeName(title);
  const tokens = t.split(' ').filter(Boolean);
  // try to match by any token appearing in filename
  for(const fname of availableImages){
    const nf = normalizeName(fname);
    for(const token of tokens){
      if(token.length < 3) continue; // skip tiny words
      if(nf.includes(token)) return fname;
      // handle plural/singular rough match
      if(token.endsWith('s') && nf.includes(token.slice(0,-1))) return fname;
      if((token+'s') && nf.includes(token+'s')) return fname;
    }
  }
  return null;
}

// Assign best matching local image (from ./image/) when available, otherwise keep existing or fallback
products.forEach(p => {
  const match = findBestImageForTitle(p.title);
  if(match) p.image = `./image/${match}`;
});

// cart stored as array of {id,title,price,qty}
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const productsEl = document.getElementById('products');
const cartCountEl = document.getElementById('cartCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryListEl = document.getElementById('categoryList');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

let activeCategory = 'All';

function getCategories(){
  const cats = new Set(products.map(p=>p.category || 'Uncategorized'));
  return ['All', ...Array.from(cats)];
}

function renderCategories(){
  if(!categoryListEl) return;
  const cats = getCategories();
  categoryListEl.innerHTML = '';
  cats.forEach(cat => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.dataset.cat = cat;
    btn.className = 'cat-btn';
    if(cat===activeCategory) btn.classList.add('active');
    btn.addEventListener('click', ()=>{
      activeCategory = cat;
      // update active styles
      document.querySelectorAll('#categoryList .cat-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
    li.appendChild(btn);
    categoryListEl.appendChild(li);
  });
}

function applyFilters(){
  const q = searchInput.value.trim().toLowerCase();
  let filtered = products.slice();
  if(activeCategory && activeCategory !== 'All'){
    filtered = filtered.filter(p=> (p.category||'Uncategorized') === activeCategory);
  }
  if(q){
    filtered = filtered.filter(p=> p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }
  renderProducts(filtered);
}

function updateCartUI(){
  const totalQty = cart.reduce((s,i)=>s+(i.qty||0),0);
  cartCountEl.textContent = totalQty;
  localStorage.setItem('cart', JSON.stringify(cart));
}

function renderProducts(list = products){
  productsEl.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <div>
        <div class="product-title">${p.title}</div>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <div class="card-actions">
          <button class="btn btn-buy" data-id="${p.id}">Add to Cart</button>
          <button class="btn btn-details" data-id="${p.id}">Details</button>
        </div>
      </div>
    `;
    productsEl.appendChild(card);
  });
}

function addToCart(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const existing = cart.find(i=>i.id===p.id);
  if(existing){ existing.qty = (existing.qty||1) + 1; }
  else { cart.push({id:p.id,title:p.title,price:p.price,qty:1}); }
  updateCartUI();
  renderCart();
}

// CART UI and checkout
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const cartModalClose = document.getElementById('cartModalClose');
const cartBody = document.getElementById('cartBody');
// Auth elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const accountArea = document.getElementById('accountArea');
const authModal = document.getElementById('authModal');
const authModalClose = document.getElementById('authModalClose');
const authTabLogin = document.getElementById('authTabLogin');
const authTabRegister = document.getElementById('authTabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Users (stored in localStorage as 'users') and current user id in 'currentUser'
function getUsers(){ return JSON.parse(localStorage.getItem('users')||'[]'); }
function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); }
function getCurrentUser(){ const id = localStorage.getItem('currentUser'); if(!id) return null; return getUsers().find(x=>String(x.id)===String(id)) || null; }
function setCurrentUser(user){ if(!user) localStorage.removeItem('currentUser'); else localStorage.setItem('currentUser', String(user.id)); }

function renderAuthUI(){
  const user = getCurrentUser();
  if(user){
    accountArea.innerHTML = `Hello, ${user.name}<br><strong>Account & Lists</strong>`;
    loginBtn.classList.add('hidden');
    registerBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    accountArea.innerHTML = `Hello, Guest<br><strong>Account & Lists</strong>`;
    loginBtn.classList.remove('hidden');
    registerBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

function openAuth(tab='login'){
  if(!authModal) return;
  authModal.classList.remove('hidden');
  if(tab==='register'){
    authTabLogin.classList.remove('active'); authTabRegister.classList.add('active');
    loginForm.classList.add('hidden'); registerForm.classList.remove('hidden');
  } else {
    authTabRegister.classList.remove('active'); authTabLogin.classList.add('active');
    registerForm.classList.add('hidden'); loginForm.classList.remove('hidden');
  }
}

function closeAuth(){ if(!authModal) return; authModal.classList.add('hidden'); }

function emailExists(email){ return getUsers().some(u=>u.email.toLowerCase()===String(email).toLowerCase()); }

function registerUser(data){
  const name = String(data.get('name')||'').trim();
  const email = String(data.get('email')||'').trim().toLowerCase();
  const password = String(data.get('password')||'');
  if(!name || !email || password.length < 4){ alert('Please fill valid name, email and a password (min 4 chars).'); return; }
  if(emailExists(email)){ alert('An account with that email already exists. Try signing in.'); return; }
  const users = getUsers();
  const user = {id:Date.now(),name,email,password:btoa(password)}; // simple encoding for demo only
  users.push(user); saveUsers(users);
  setCurrentUser(user);
  renderAuthUI();
  closeAuth();
  alert('Account created and signed in.');
}

function loginUser(data){
  const email = String(data.get('email')||'').trim().toLowerCase();
  const password = String(data.get('password')||'');
  const users = getUsers();
  const user = users.find(u=>u.email.toLowerCase()===email && u.password===btoa(password));
  if(!user){ alert('Invalid credentials.'); return; }
  setCurrentUser(user);
  renderAuthUI();
  closeAuth();
  alert(`Welcome back, ${user.name}`);
}

function logoutUser(){ setCurrentUser(null); renderAuthUI(); alert('Signed out'); }

function openCart(){
  renderCart();
  cartModal.classList.remove('hidden');
}

function closeCart(){ cartModal.classList.add('hidden'); }

function changeQty(id, delta){
  const item = cart.find(i=>i.id===id); if(!item) return;
  item.qty = (item.qty||1) + delta;
  if(item.qty <= 0){ cart = cart.filter(i=>i.id!==id); }
  updateCartUI();
  renderCart();
}

function removeItem(id){ cart = cart.filter(i=>i.id!==id); updateCartUI(); renderCart(); }

function calcTotals(){
  const subtotal = cart.reduce((s,i)=>s + (i.price * (i.qty||0)),0);
  const shipping = subtotal > 0 ? 5.00 : 0;
  const total = subtotal + shipping;
  return {subtotal,shipping,total};
}

function renderCart(){
  if(!cartBody) return;
  if(cart.length===0){
    cartBody.innerHTML = `<p>Your cart is empty.</p>`;
    return;
  }
  const lines = cart.map(i=>{
    const p = products.find(x=>x.id===i.id) || {};
    return `
      <div class="cart-item" data-id="${i.id}">
        <img src="${p.image||''}" alt="${i.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/84x64?text=No+Image'">
        <div class="meta">
          <h4>${i.title}</h4>
          <div>$${i.price.toFixed(2)} each</div>
        </div>
        <div>
          <div class="qty-controls">
            <button data-action="dec" data-id="${i.id}">-</button>
            <div>${i.qty}</div>
            <button data-action="inc" data-id="${i.id}">+</button>
          </div>
          <div style="margin-top:8px;text-align:right">
            <button data-action="remove" data-id="${i.id}">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  const totals = calcTotals();
  cartBody.innerHTML = `
    <div class="cart-list">${lines}</div>
    <div class="cart-summary">
      <div>
        <div>Subtotal: $${totals.subtotal.toFixed(2)}</div>
        <div>Shipping: $${totals.shipping.toFixed(2)}</div>
        <div style="font-weight:700">Total: $${totals.total.toFixed(2)}</div>
      </div>
      <div>
        <button id="btnCheckout" class="btn btn-checkout">Proceed to Checkout</button>
      </div>
    </div>
  `;
}

// Cart event delegation
if(cartBody){
  cartBody.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if(action==='inc') changeQty(id, 1);
    if(action==='dec') changeQty(id, -1);
    if(action==='remove') removeItem(id);
    if(btn.id==='btnCheckout') showCheckoutForm();
  });
}

// Show checkout form inside cart modal
function showCheckoutForm(){
  const totals = calcTotals();
  cartBody.innerHTML = `
    <h3>Checkout</h3>
    <div style="display:flex;gap:12px;flex-direction:column">
      <form id="checkoutForm" class="checkout-form">
        <input name="name" placeholder="Full name" class="full" required>
        <input name="email" placeholder="Email" required>
        <input name="address" placeholder="Address" class="full" required>
        <input name="city" placeholder="City" required>
        <input name="zip" placeholder="ZIP / Postal" required>
        <input name="card" placeholder="Card number (fake)" class="full" required>
        <button type="submit" class="btn btn-checkout full">Pay $${totals.total.toFixed(2)}</button>
      </form>
    </div>
  `;
  const form = document.getElementById('checkoutForm');
  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    processPayment(new FormData(form));
  });
}

function processPayment(formData){
  // Very small, fake validation
  const name = formData.get('name') || '';
  const card = formData.get('card') || '';
  if(name.trim().length < 2){ alert('Please enter your name'); return; }
  if(card.replace(/\s+/g,'').length < 6){ alert('Please enter a valid card number (demo)'); return; }
  // simulate processing
  cartBody.innerHTML = `<p>Processing payment...</p>`;
  setTimeout(()=>{
    // save the order locally
    const totals = calcTotals();
    const order = {id:Date.now(),items:cart,totals,customer:{name:formData.get('name'),email:formData.get('email'),address:formData.get('address')},created:new Date().toISOString()};
    const orders = JSON.parse(localStorage.getItem('orders')||'[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    // clear cart
    cart = [];
    updateCartUI();
    cartBody.innerHTML = `<div class="order-success"><h3>Thank you — order placed</h3><p>Order #${order.id}</p></div>`;
  }, 1200);
}

function showDetails(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  modalBody.innerHTML = `
    <h2>${p.title}</h2>
    <img src="${p.image}" alt="${p.title}" style="max-width:100%;height:200px;object-fit:contain;margin-bottom:10px" onerror="this.onerror=null;this.src='https://via.placeholder.com/600x400?text=No+Image'">
    <p>${p.desc}</p>
    <p style="font-weight:700">$${p.price.toFixed(2)}</p>
    <button id="modalAdd" class="btn btn-buy">Add to Cart</button>
  `;
  document.getElementById('modalAdd').addEventListener('click', ()=>{ addToCart(id); closeModal(); });
  modal.classList.remove('hidden');
}

function closeModal(){ modal.classList.add('hidden'); }

// Event delegation for product buttons
productsEl.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = Number(btn.getAttribute('data-id'));
  if(btn.classList.contains('btn-buy')) addToCart(id);
  if(btn.classList.contains('btn-details')) showDetails(id);
});

// Hook cart button
if(cartBtn) cartBtn.addEventListener('click', openCart);
if(cartModalClose) cartModalClose.addEventListener('click', closeCart);
if(cartModal) cartModal.addEventListener('click', (e)=>{ if(e.target===cartModal) closeCart(); });

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

searchBtn.addEventListener('click', ()=>{ applyFilters(); });
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') applyFilters(); });

function performSearch(){
  const q = searchInput.value.trim().toLowerCase();
  if(!q){ renderProducts(); return; }
  const filtered = products.filter(p=>p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  renderProducts(filtered);
}

// Init
// Init
renderCategories();
updateCartUI();
renderProducts();

// Auth event wiring
if(loginBtn) loginBtn.addEventListener('click', ()=>openAuth('login'));
if(registerBtn) registerBtn.addEventListener('click', ()=>openAuth('register'));
if(logoutBtn) logoutBtn.addEventListener('click', ()=>logoutUser());
if(authModalClose) authModalClose.addEventListener('click', closeAuth);
if(authTabLogin) authTabLogin.addEventListener('click', ()=>openAuth('login'));
if(authTabRegister) authTabRegister.addEventListener('click', ()=>openAuth('register'));
if(loginForm) loginForm.addEventListener('submit', (e)=>{ e.preventDefault(); loginUser(new FormData(loginForm)); });
if(registerForm) registerForm.addEventListener('submit', (e)=>{ e.preventDefault(); registerUser(new FormData(registerForm)); });

// render initial auth UI
renderAuthUI();
