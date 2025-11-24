const firebaseConfig = {
  apiKey: "AIzaSyCNyXTlDJtZU40ZD-UaztW0ukG5MP1qQo8",
  authDomain: "my-online-store-demo.firebaseapp.com",
  projectId: "my-online-store-demo",
  storageBucket: "my-online-store-demo.firebasestorage.app",
  messagingSenderId: "9599797110",
  appId: "1:9599797110:web:d3df576089348444dbdc57",
  measurementId: "G-W2W59YF9Q0"
};
// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Get the Auth service instance
const auth = app.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// backend endpoint used by processPayment — adjust if your server uses a different port/path
const BACKEND_URL = 'http://localhost:8080/orders';

// small fetch helper with timeout to avoid hanging requests
function fetchWithTimeout(url, opts = {}, timeout = 10000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Network timeout')), timeout))
  ]);
}

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
// wishlist stored as array of product ids
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
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
  // save cart to RTDB for signed-in users
  try{
    const user = auth.currentUser;
    if(user && firebase && firebase.database){
      firebase.database().ref('users/' + user.uid + '/cart').set(cart).catch(err=>console.error('save cart',err));
    }
  }catch(e){}
}

function renderProducts(list = products){
  productsEl.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const isW = wishlist.includes(p.id);
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=No+Image'">
      <div>
        <div class="product-title">${p.title}</div>
        <div class="product-price">$${p.price.toFixed(2)}</div>
        <div class="card-actions">
          <button class="btn btn-buy" data-id="${p.id}">Add to Cart</button>
          <button class="btn btn-details" data-id="${p.id}">Details</button>
          <button class="btn btn-wish" data-wish="${p.id}" aria-pressed="${isW}">${isW? '♥' : '♡'}</button>
        </div>
      </div>
    `;
    productsEl.appendChild(card);
  });
}

// Wishlist functions
const wishBtn = document.getElementById('wishlistBtn');
const wishModal = document.getElementById('wishModal');
const wishModalClose = document.getElementById('wishModalClose');
const wishBody = document.getElementById('wishBody');

function saveWishlist(){
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  // save to firebase for signed-in users
  try{
    const user = auth.currentUser;
    if(user && firebase && firebase.database){
      firebase.database().ref('users/' + user.uid + '/wishlist').set(wishlist).catch(err=>console.error('save wishlist',err));
    }
  }catch(e){/* ignore */}
}

function addToWishlist(id){
  if(!wishlist.includes(id)) wishlist.push(id);
  saveWishlist();
  renderProducts();
  showNotification('Added to wishlist');
}

function removeFromWishlist(id){
  wishlist = wishlist.filter(x=>x!==id);
  saveWishlist();
  renderProducts();
  renderWishlist();
  showNotification('Removed from wishlist');
}

function renderWishlist(){
  if(!wishBody) return;
  if(wishlist.length===0){ wishBody.innerHTML = '<p>Your wishlist is empty.</p>'; return; }
  const lines = wishlist.map(id=>{
    const p = products.find(x=>x.id===id) || {title:'Unknown',image:''};
    return `
      <div class="wish-item" data-id="${id}">
        <img src="${p.image||''}" alt="${p.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/84x64?text=No+Image'">
        <div>
          <div style="font-weight:700">${p.title}</div>
          <div>$${(p.price||0).toFixed(2)}</div>
        </div>
        <div class="wish-actions">
          <button class="btn" data-action="moveCart" data-id="${id}">Add to Cart</button>
          <button class="btn" data-action="removeWish" data-id="${id}">Remove</button>
        </div>
      </div>
    `;
  }).join('');
  wishBody.innerHTML = `<div class="wish-list">${lines}</div>`;
}

// Load wishlist from RTDB for signed-in users
function loadWishlistFromDB(){
  try{
    const user = auth.currentUser;
    if(user && firebase && firebase.database){
      firebase.database().ref('users/' + user.uid + '/wishlist').once('value').then(snap=>{
        const val = snap.val(); if(Array.isArray(val)){ wishlist = val; saveWishlist(); renderProducts(); }
      }).catch(()=>{});
    }
  }catch(e){}
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
const googleSignInBtn = document.getElementById('googleSignInBtn');
// NEW FUNCTION: Handles Google Sign-In using a popup
function signInWithGoogle() {
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            // This function runs if sign-in is successful.
            // The user object is handled by the auth.onAuthStateChanged listener.
            closeAuth(); 
            alert(`Welcome, ${result.user.displayName || 'User'}!`);
        })
        .catch((error) => {
            // Handle Errors here.
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, do nothing
                return;
            }
            alert("Google Sign-In Error: " + error.message);
            console.error(error);
        });
}
// NEW renderAuthUI - Uses the Firebase user object
function renderAuthUI(user){ 
  // user is null if logged out, or contains the user object if logged in
  if(user){
    const userName = user.displayName || user.email;
    accountArea.innerHTML = `Hello, ${userName}<br><strong>Account & Lists</strong>`;
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
// NEW registerUser - Uses Firebase createUserWithEmailAndPassword
function registerUser(data){
  const name = String(data.get('name')||'').trim();
  const email = String(data.get('email')||'').trim();
  const password = String(data.get('password')||'');
  const address = String(data.get('address')||'').trim();
  const city = String(data.get('city')||'').trim();
  const zip = String(data.get('zip')||'').trim();
  const country = String(data.get('country')||'').trim();
  const phone = String(data.get('phone')||'').trim();
  
  if(!name || !email || password.length < 6){ 
      alert('Please fill valid name, email and a password (min 6 chars).'); 
      return; 
  }

  auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Update the user's profile with their display name
          return userCredential.user.updateProfile({
              displayName: name
          });
      })
      .then(() => {
          // Save the user's address/profile to Realtime Database under their uid
          const user = auth.currentUser;
          if(user && firebase && firebase.database){
            try{
              const payload = { name, email, address:{ address, city, zip, country, phone }, created: new Date().toISOString() };
              firebase.database().ref('users/' + user.uid + '/profile').set(payload)
                .then(()=>{ showNotification('Your profile and address were saved.'); })
                .catch(err=>{ console.error('DB save failed',err); showNotification('Saved profile failed (see console).'); });
            }catch(e){ console.error('DB save error',e); }
          }
          // The auth state listener will automatically update the UI
          closeAuth();
          alert('Account created and signed in.');
      })
      .catch((error) => {
          // Firebase provides specific error codes
          alert("Registration Error: " + error.message);
      });
}
// NEW loginUser - Uses Firebase signInWithEmailAndPassword
function loginUser(data){
  const email = String(data.get('email')||'').trim();
  const password = String(data.get('password')||'');
  
  if(!email || !password){ alert('Please enter both email and password.'); return; }

  auth.signInWithEmailAndPassword(email, password)
      .then(() => {
          // The auth state listener will automatically update the UI
          closeAuth();
          // Alert is now handled by the state change observer
      })
      .catch((error) => {
          alert("Login Error: " + error.message);
      });
}
// NEW logoutUser - Uses Firebase signOut
function logoutUser(){ 
    auth.signOut().then(() => {
    // Clear local cart and wishlist when signing out
    cart = [];
    wishlist = [];
    try{ localStorage.removeItem('cart'); localStorage.removeItem('wishlist'); }catch(e){}
    updateCartUI();
    renderProducts();
    try{ renderWishlist(); }catch(e){}
    // Close any open modals
    try{ if(cartModal) cartModal.classList.add('hidden'); }catch(e){}
    try{ if(wishModal) wishModal.classList.add('hidden'); }catch(e){}
    showNotification('Signed out — cart and wishlist cleared');
    }).catch(error => {
        console.error('Logout failed:', error);
    });
}
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
  // also render wishlist button state if needed
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
        <input name="country" placeholder="Country" required>
        <input name="phone" placeholder="Phone number" required>
        <label style="grid-column:1 / -1;display:flex;align-items:center;gap:8px"><input type="checkbox" name="rememberAddress"> Remember Address for future purchases</label>
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

  // Try to prefill saved address if user signed in
  try{
    const user = auth.currentUser;
    if(user && firebase && firebase.database){
      firebase.database().ref('users/' + user.uid + '/savedAddress').once('value').then(snap=>{
        const saved = snap.val();
        if(saved){
          const f = document.getElementById('checkoutForm');
          if(f){
            if(saved.name) f.elements['name'].value = saved.name;
            if(saved.email) f.elements['email'].value = saved.email;
            if(saved.address) f.elements['address'].value = saved.address;
            if(saved.city) f.elements['city'].value = saved.city;
            if(saved.zip) f.elements['zip'].value = saved.zip;
            if(saved.country) f.elements['country'].value = saved.country;
            if(saved.phone) f.elements['phone'].value = saved.phone;
          }
        }
      }).catch(()=>{});
    }
  }catch(e){/* ignore */}
}


function processPayment(formData){
  const name = formData.get('name') || '';
  const card = formData.get('card') || '';

  if(name.trim().length < 2){ alert('Please enter your name'); return; }
  if(card.replace(/\s+/g,'').length < 6){ alert('Please enter a valid card number (demo)'); return; }

  cartBody.innerHTML = `<p>Processing payment...</p>`;

  setTimeout(() => {
    const totals = calcTotals();
    const order = {
      id: Date.now(),
      items: cart,
      totals,
      customer: {
        name: formData.get('name'),
        email: formData.get('email'),
        address: formData.get('address')
      },
      created: new Date().toISOString()
    };

    // Save locally
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    // SEND TO BACKEND API (IMPORTANT PART)
    try {
      const user = auth.currentUser;

      if (user) {
        const backendUrl = "https://uncongregational-severally-angele.ngrok-free.dev/orders?uid=" + user.uid;

        fetch(backendUrl, {
          method: "POST",
          body: JSON.stringify(order),
          headers: {
            "Content-Type": "application/json"
          }
        })
        .then(r => r.text())
        .then(() => {
          console.log("Order sent to backend OK");
          showNotification("Order successfully sent to server.");
        })
        .catch(err => {
          console.error("Backend error:", err);
          showNotification("Order saved locally. Server unreachable.");
        });
      } else {
        showNotification('Order saved locally. Sign in to save online.');
      }
    } catch(e) {
      console.error("Error sending to backend:", e);
    }

    // Remember address?
    const remember = formData.get('rememberAddress');
    if (remember) {
      const addrPayload = {
        name: formData.get('name'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        zip: formData.get('zip'),
        country: formData.get('country'),
        phone: formData.get('phone')
      };

      try {
        const user = auth.currentUser;
        if (user && firebase && firebase.database) {
          firebase.database().ref('users/' + user.uid + '/savedAddress')
            .set(addrPayload)
            .then(() => showNotification('Address saved for future purchases'))
            .catch(err => console.error('save addr', err));
        } else {
          localStorage.setItem('rememberedAddress', JSON.stringify(addrPayload));
          showNotification('Address saved locally.');
        }
      } catch(e) {}
    }

    // Clear cart
    cart = [];
    updateCartUI();

    cartBody.innerHTML = `
      <div class="order-success">
        <h3>Thank you — order placed</h3>
        <p>Order #${order.id}</p>
      </div>`;
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
// Small toast/notification helper
function showNotification(message, timeout = 4000){
  try{
    const id = 'site-toast';
    // create container if missing
    let container = document.getElementById(id);
    if(!container){
      container = document.createElement('div');
      container.id = id;
      container.style.position = 'fixed';
      container.style.top = '16px';
      container.style.right = '16px';
      container.style.zIndex = 1200;
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(()=>{ el.style.opacity = '0'; setTimeout(()=>el.remove(),300); }, timeout);
  }catch(e){ console.log('notify',e); }
}
function closeModal(){ modal.classList.add('hidden'); }
// Event delegation for product buttons
productsEl.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = Number(btn.getAttribute('data-id'));
  if(btn.classList.contains('btn-buy')) addToCart(id);
  if(btn.classList.contains('btn-details')) showDetails(id);
  // wishlist button on product card
  if(btn.hasAttribute('data-wish')){
    const wid = Number(btn.getAttribute('data-wish'));
    if(wishlist.includes(wid)) removeFromWishlist(wid); else addToWishlist(wid);
  }
});
// Hook cart button
if(cartBtn) cartBtn.addEventListener('click', openCart);
if(cartModalClose) cartModalClose.addEventListener('click', closeCart);
if(cartModal) cartModal.addEventListener('click', (e)=>{ if(e.target===cartModal) closeCart(); });
// Hook wishlist button
if(wishBtn) wishBtn.addEventListener('click', ()=>{ renderWishlist(); wishModal.classList.remove('hidden'); });
if(wishModalClose) wishModalClose.addEventListener('click', ()=>{ if(wishModal) wishModal.classList.add('hidden'); });
if(wishModal) wishModal.addEventListener('click', (e)=>{ if(e.target===wishModal) wishModal.classList.add('hidden'); });

// Wishlist modal actions
if(wishBody){
  wishBody.addEventListener('click',(e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const action = btn.dataset.action; const id = Number(btn.dataset.id);
    if(action==='removeWish') removeFromWishlist(id);
    if(action==='moveCart'){ addToCart(id); removeFromWishlist(id); }
  });
}

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

// Firebase Auth State Observer
auth.onAuthStateChanged(user => {
    // This function runs whenever the user signs in or out.
    renderAuthUI(user);
    // load user-specific data
    if(user){
      // load wishlist and cart stored in RTDB
      try{ loadWishlistFromDB(); }catch(e){}
      try{ firebase.database().ref('users/' + user.uid + '/cart').once('value').then(snap=>{ const val = snap.val(); if(Array.isArray(val)){ cart = val; localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI(); renderCart(); } }).catch(()=>{}); }catch(e){}
    }
    // You could also refresh product list or cart here if needed
    // Example: if (user) { loadUserDataFromFirestore(user.uid); }
});

// Auth event wiring
if(loginBtn) loginBtn.addEventListener('click', ()=>openAuth('login'));
if(registerBtn) registerBtn.addEventListener('click', ()=>openAuth('register'));
if(logoutBtn) logoutBtn.addEventListener('click', ()=>logoutUser());
if(authModalClose) authModalClose.addEventListener('click', closeAuth);
if(authTabLogin) authTabLogin.addEventListener('click', ()=>openAuth('login'));
if(authTabRegister) authTabRegister.addEventListener('click', ()=>openAuth('register'));
if(loginForm) loginForm.addEventListener('submit', (e)=>{ e.preventDefault(); loginUser(new FormData(loginForm)); });
if(registerForm) registerForm.addEventListener('submit', (e)=>{ e.preventDefault(); registerUser(new FormData(registerForm)); });
if(googleSignInBtn) googleSignInBtn.addEventListener('click', signInWithGoogle);
// render initial auth UI
renderAuthUI();
