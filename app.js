// app.js - E-Commerce Core Logic and View Routing

(function() {
  // Global State
  let cart = JSON.parse(localStorage.getItem('ebazar_cart')) || [];
  let appliedCoupon = JSON.parse(localStorage.getItem('ebazar_coupon')) || null;
  let activeProductImages = []; // Temporary store for base64 uploaded product images in Admin modal

  // Bangla Digit Map Helper
  const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBanglaNum(num) {
    if (num === undefined || num === null) return '';
    return num.toString().replace(/\d/g, d => bnNums[d]);
  }

  // Convert Bangla numbers to English digits for calculations/parsing
  function toEnglishNum(bnStr) {
    const bnToEnMap = { '০':0, '১':1, '২':2, '৩':3, '৪':4, '৫':5, '৬':6, '৭':7, '৮':8, '৯':9 };
    return bnStr.replace(/[০-৯]/g, d => bnToEnMap[d]);
  }

  // Set Theme Variable Overrides on Startup
  function updateThemeColors() {
    const settings = DB.getSettings();
    const styleEl = document.getElementById('dynamic-theme-style');
    if (styleEl) {
      styleEl.innerHTML = `
        :root {
          --primary-color: ${settings.themeColor || '#0f766e'};
          --accent-color: ${settings.accentColor || '#e11d48'};
        }
      `;
    }
    
    // Header Site title/tagline updates
    document.getElementById('site-title-nav').innerText = settings.siteName || 'আমার বাজার';
    document.getElementById('site-tagline-nav').innerText = settings.siteTagline || 'আপনার আস্থার অনলাইন শপ';
    document.getElementById('footer-site-name').innerText = settings.siteName || 'আমার বাজার';
    document.getElementById('footer-site-tagline').innerText = settings.siteTagline || 'আপনার আস্থার অনলাইন শপ';
    document.getElementById('copyright-site-name').innerText = settings.siteName || 'আমার বাজার';
    document.getElementById('admin-sidebar-site-name').innerText = settings.siteName || 'আমার বাজার';
    
    // Hotline phone
    document.getElementById('header-hotline-phone').innerText = settings.contactPhone || '01700000000';
    
    // Logo Initial Update
    const logoIcon = document.getElementById('site-logo-icon');
    if (logoIcon) {
      logoIcon.innerText = (settings.siteName || 'আমার বাজার')[0];
    }
  }

  // Handle Light/Dark Mode toggle
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      
      const themeIcon = themeToggleBtn.querySelector('i');
      if (themeIcon) {
        if (newTheme === 'dark') {
          themeIcon.setAttribute('data-lucide', 'moon');
        } else {
          themeIcon.setAttribute('data-lucide', 'sun');
        }
        lucide.createIcons();
      }
    });
  }

  // Navigation router
  function navigate(path) {
    window.location.hash = path;
  }
  window.navigate = navigate;

  function handleRoute() {
    const hash = window.location.hash || '#/';
    
    // Shell Toggles (Admin vs Customer Storefront)
    const storefrontShell = document.getElementById('storefront-shell');
    const adminShell = document.getElementById('admin-shell');
    
    // Close suggestions and cart drawer when navigating
    closeCartDrawer();
    const suggestDropdown = document.getElementById('search-suggestions-dropdown');
    if (suggestDropdown) suggestDropdown.style.display = 'none';

    if (hash.startsWith('#/admin')) {
      storefrontShell.style.display = 'none';
      adminShell.style.display = 'grid';
      renderAdminView(hash);
    } else {
      storefrontShell.style.display = 'block';
      adminShell.style.display = 'none';
      renderStorefrontView(hash);
    }
    
    // Reset active nav items
    document.querySelectorAll('.nav-link-item').forEach(el => el.classList.remove('active'));
    if (hash === '#/') document.getElementById('nav-link-home')?.classList.add('active');
    if (hash.startsWith('#/shop')) document.getElementById('nav-link-shop')?.classList.add('active');
    if (hash.startsWith('#/track')) document.getElementById('nav-link-track')?.classList.add('active');
    if (hash.startsWith('#/contact')) document.getElementById('nav-link-contact')?.classList.add('active');

    lucide.createIcons();
  }

  // ==========================================
  // CUSTOMER STOREFRONT PAGES RENDERING
  // ==========================================
  
  function renderStorefrontView(hash) {
    const contentArea = document.getElementById('main-content-area');
    
    if (hash === '#/' || hash === '') {
      renderHomePage(contentArea);
    } else if (hash.startsWith('#/shop')) {
      renderShopPage(contentArea);
    } else if (hash.startsWith('#/product/')) {
      const prodId = hash.split('#/product/')[1];
      renderProductDetailPage(contentArea, prodId);
    } else if (hash === '#/checkout') {
      renderCheckoutPage(contentArea);
    } else if (hash.startsWith('#/track')) {
      renderTrackingPage(contentArea);
    } else if (hash === '#/contact') {
      renderContactPage(contentArea);
    } else {
      contentArea.innerHTML = `<div style="text-align:center; padding:50px;"><h2>৪০০ - পেইজটি পাওয়া যায়নি!</h2></div>`;
    }
  }

  // Home Page
  function renderHomePage(container) {
    const products = DB.getProducts();
    const categories = DB.getCategories();
    
    // Featured products
    const featuredProds = products.filter(p => p.featured && p.stock > 0).slice(0, 4);
    // Hot Deals
    const hotDeals = products.filter(p => p.hotDeal && p.stock > 0).slice(0, 4);

    let categoryCardsHtml = categories.map(cat => `
      <div class="category-card" onclick="navigate('/shop?cat=${cat.id}')">
        <span class="category-icon">${cat.icon || '📦'}</span>
        <h4>${cat.name}</h4>
      </div>
    `).join('');

    let hotDealsHtml = hotDeals.map(prod => renderProductCard(prod)).join('');
    let featuredHtml = featuredProds.map(prod => renderProductCard(prod)).join('');

    container.innerHTML = `
      <!-- Hero Banner -->
      <section class="hero">
        <div class="hero-slider">
          <div class="hero-bg-graphic"></div>
          <div class="hero-bg-graphic-2"></div>
          <div class="hero-content">
            <span class="hero-tag">🎉 বিশেষ অফার চলছে</span>
            <h2>সেরা দামে সেরা পণ্য <br>কিনুন এখন অনলাইনে!</h2>
            <p>আমাদের কাছে পাচ্ছেন আসল পণ্যের নিশ্চিয়তা এবং দেশব্যাপী ক্যাশ অন ডেলিভারি সুবিধা।</p>
            <div class="hero-actions">
              <button class="btn btn-primary" onclick="navigate('/shop')">এখনই কিনুন <i data-lucide="shopping-bag"></i></button>
              <button class="btn btn-secondary" onclick="navigate('/shop?filter=deals')">অফার দেখুন</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Category Section -->
      <section style="margin: 40px 0;">
        <div class="section-title">
          <h3>ক্যাটাগরি সমূহ</h3>
        </div>
        <div class="category-grid">
          ${categoryCardsHtml}
        </div>
      </section>

      <!-- Hot Deals / Flash Sale -->
      ${hotDeals.length > 0 ? `
      <section style="margin: 40px 0;">
        <div class="section-title">
          <h3>হট ডিল / ফ্ল্যাশ সেল 🔥</h3>
          <a href="#/shop?filter=deals" onclick="navigate('/shop?filter=deals')">সবগুলো দেখুন <i data-lucide="arrow-right"></i></a>
        </div>
        <div class="products-grid">
          ${hotDealsHtml}
        </div>
      </section>
      ` : ''}

      <!-- Popular / Featured Products -->
      <section style="margin: 40px 0;">
        <div class="section-title">
          <h3>জনপ্রিয় পণ্যসমূহ 🌟</h3>
          <a href="#/shop" onclick="navigate('/shop')">সব পণ্য দেখুন <i data-lucide="arrow-right"></i></a>
        </div>
        <div class="products-grid">
          ${featuredHtml}
        </div>
      </section>

      <!-- Trust Badges -->
      <section class="trust-badges">
        <div class="trust-badge-card">
          <div class="trust-badge-icon"><i data-lucide="truck"></i></div>
          <div class="trust-badge-info">
            <h4>সারা দেশে ক্যাশ অন ডেলিভারি</h4>
            <p>পণ্য হাতে পেয়ে টাকা পরিশোধ করার সুবিধা</p>
          </div>
        </div>
        <div class="trust-badge-card">
          <div class="trust-badge-icon"><i data-lucide="shield-check"></i></div>
          <div class="trust-badge-info">
            <h4>১০০% অরিজিনাল প্রোডাক্ট</h4>
            <p>খাঁটি পণ্যের শতভাগ নিশ্চিয়তা</p>
          </div>
        </div>
        <div class="trust-badge-card">
          <div class="trust-badge-icon"><i data-lucide="clock"></i></div>
          <div class="trust-badge-info">
            <h4>দ্রুত ডেলিভারি সুবিধা</h4>
            <p>অর্ডার পাওয়ার দ্রুততম সময়ে নিশ্চিত ডেলিভারি</p>
          </div>
        </div>
      </section>
    `;
  }

  // Product Card Renderer helper
  function renderProductCard(prod) {
    const discountBadge = prod.discountBadge ? `<span class="discount-tag">${prod.discountBadge} ছাড়</span>` : '';
    const oldPriceHtml = prod.oldPrice ? `<span class="old-price">৳${toBanglaNum(prod.oldPrice)}</span>` : '';
    
    // Check stock status
    const buyButton = prod.stock > 0 
      ? `<button class="btn-card-buy" onclick="buyNow('${prod.id}')"><i data-lucide="zap"></i> অর্ডার করুন</button>`
      : `<button class="btn-card-buy" style="background-color:#94a3b8; cursor:not-allowed;" disabled>স্টক আউট</button>`;
      
    const cartButton = prod.stock > 0
      ? `<button class="btn-card-cart" onclick="addToCart('${prod.id}')"><i data-lucide="shopping-cart"></i> কার্ট</button>`
      : `<button class="btn-card-cart" style="cursor:not-allowed;" disabled>স্টক নেই</button>`;

    return `
      <div class="product-card">
        ${discountBadge}
        <div class="product-image-wrap" onclick="navigate('/product/${prod.id}')">
          <img src="${prod.images && prod.images.length > 0 ? prod.images[0] : 'https://placehold.co/400x300'}" alt="${prod.name}" class="product-card-img" onerror="this.src='https://placehold.co/400x300'">
        </div>
        
        <div class="product-info">
          <span class="product-card-cat">${getCategoryName(prod.categoryId)}</span>
          <h4 class="product-card-title" onclick="navigate('/product/${prod.id}')">${prod.name}</h4>
          
          <div class="product-card-price-row">
            <span class="current-price">৳${toBanglaNum(prod.sellingPrice)}</span>
            ${oldPriceHtml}
          </div>
          
          <div class="product-card-actions">
            ${cartButton}
            ${buyButton}
          </div>
        </div>
      </div>
    `;
  }

  function getCategoryName(catId) {
    const cats = DB.getCategories();
    const found = cats.find(c => c.id === catId);
    return found ? found.name : 'অন্যান্য';
  }

  // Shop / Catalog page
  function renderShopPage(container) {
    const categories = DB.getCategories();
    let products = DB.getProducts();

    // Parse Search queries/Filters from url
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const filterCat = params.get('cat') || '';
    const filterDeals = params.get('filter') === 'deals';
    
    // Sort logic
    const sortBy = params.get('sort') || 'newest';

    // Filters inputs state
    let selectedCats = filterCat ? [filterCat] : [];
    let inStockOnly = false;
    let maxPriceLimit = Math.max(...products.map(p => p.sellingPrice), 5000);
    let selectedMaxPrice = maxPriceLimit;

    function applyFilters() {
      let filtered = products;

      // Category filter
      if (selectedCats.length > 0) {
        filtered = filtered.filter(p => selectedCats.includes(p.categoryId));
      }

      // Deals filter
      if (filterDeals) {
        filtered = filtered.filter(p => p.hotDeal);
      }

      // Stock status filter
      if (inStockOnly) {
        filtered = filtered.filter(p => p.stock > 0);
      }

      // Price limit filter
      filtered = filtered.filter(p => p.sellingPrice <= selectedMaxPrice);

      // Sorting
      if (sortBy === 'price-low') {
        filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
      } else if (sortBy === 'price-high') {
        filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
      } else if (sortBy === 'popular') {
        filtered.sort((a, b) => (b.reviews ? b.reviews.length : 0) - (a.reviews ? a.reviews.length : 0));
      } else {
        // newest first (reverse of seed data ids / created dates)
        filtered.sort((a, b) => b.id.localeCompare(a.id));
      }

      // Render product grid list
      const grid = document.getElementById('shop-products-grid');
      const resultsCounter = document.getElementById('results-counter');
      if (grid) {
        if (filtered.length > 0) {
          grid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
        } else {
          grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-tertiary);">
              <i data-lucide="alert-circle" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
              <p>কোনো পণ্য পাওয়া যায়নি! অনুগ্রহ করে অন্য ক্যাটাগরি বা দাম সিলেক্ট করুন।</p>
            </div>
          `;
        }
        lucide.createIcons();
      }
      
      if (resultsCounter) {
        resultsCounter.innerText = `মোট পণ্য পাওয়া গেছে: ${toBanglaNum(filtered.length)} টি`;
      }
    }

    // Main layout
    container.innerHTML = `
      <div class="shop-layout">
        <!-- Sidebar Filter -->
        <aside class="sidebar-filter">
          <div class="filter-group">
            <h4 class="filter-title">ক্যাটাগরি সমূহ</h4>
            <ul class="filter-list">
              ${categories.map(cat => `
                <li class="filter-item">
                  <label>
                    <input type="checkbox" class="cat-filter-checkbox" value="${cat.id}" ${selectedCats.includes(cat.id) ? 'checked' : ''}>
                    <span>${cat.name}</span>
                  </label>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="filter-group">
            <h4 class="filter-title">দামের রেঞ্জ</h4>
            <div class="price-range-wrap">
              <input type="range" class="price-slider" id="price-limit-slider" min="0" max="${maxPriceLimit}" value="${selectedMaxPrice}">
              <div class="price-values">
                <span>৳০</span>
                <span id="price-slider-value-indicator">৳${toBanglaNum(selectedMaxPrice)}</span>
              </div>
            </div>
          </div>

          <div class="filter-group">
            <h4 class="filter-title">স্টক স্ট্যাটাস</h4>
            <ul class="filter-list">
              <li class="filter-item">
                <label>
                  <input type="checkbox" id="stock-filter-checkbox">
                  <span>শুধুমাত্র স্টকে আছে</span>
                </label>
              </li>
            </ul>
          </div>
        </aside>

        <!-- Product Grid & Shop Main Content -->
        <section>
          <div class="shop-header">
            <div class="results-count" id="results-counter">মোট পণ্য: ০ টি</div>
            
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:13.5px; font-weight:700;">সর্ট করুন:</span>
              <select class="sort-select" id="shop-sorting-select">
                <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>নতুন পণ্য</option>
                <option value="price-low" ${sortBy === 'price-low' ? 'selected' : ''}>দাম: কম থেকে বেশি</option>
                <option value="price-high" ${sortBy === 'price-high' ? 'selected' : ''}>দাম: বেশি থেকে কম</option>
                <option value="popular" ${sortBy === 'popular' ? 'selected' : ''}>জনপ্রিয় পণ্য</option>
              </select>
            </div>
          </div>

          <div class="products-grid" id="shop-products-grid">
            <!-- Populated dynamically by applyFilters -->
          </div>
        </section>
      </div>
    `;

    // Event listeners inside shop page
    document.querySelectorAll('.cat-filter-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        if (e.target.checked) {
          selectedCats.push(e.target.value);
        } else {
          selectedCats = selectedCats.filter(id => id !== e.target.value);
        }
        applyFilters();
      });
    });

    const priceSlider = document.getElementById('price-limit-slider');
    const priceIndicator = document.getElementById('price-slider-value-indicator');
    if (priceSlider) {
      priceSlider.addEventListener('input', e => {
        selectedMaxPrice = parseInt(e.target.value);
        if (priceIndicator) priceIndicator.innerText = `৳${toBanglaNum(selectedMaxPrice)}`;
        applyFilters();
      });
    }

    const stockCheckbox = document.getElementById('stock-filter-checkbox');
    if (stockCheckbox) {
      stockCheckbox.addEventListener('change', e => {
        inStockOnly = e.target.checked;
        applyFilters();
      });
    }

    const sortSelect = document.getElementById('shop-sorting-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        const urlHash = window.location.hash.split('?')[0];
        const paramsMap = new URLSearchParams(window.location.hash.split('?')[1] || '');
        paramsMap.set('sort', e.target.value);
        navigate(urlHash.replace('#', '') + '?' + paramsMap.toString());
      });
    }

    // Initial load
    applyFilters();
  }

  // Product detail view page
  function renderProductDetailPage(container, prodId) {
    const products = DB.getProducts();
    const prod = products.find(p => p.id === prodId);
    
    if (!prod) {
      container.innerHTML = `<div style="text-align:center; padding:50px;"><h2>পণ্যটি খুঁজে পাওয়া যায়নি!</h2></div>`;
      return;
    }

    let activeImage = prod.images && prod.images.length > 0 ? prod.images[0] : 'https://placehold.co/400x300';
    let selectedQty = 1;
    let selectedVariant = null;

    // Render gallery thumbnails
    const thumbnailsHtml = prod.images && prod.images.length > 1 ? prod.images.map((img, idx) => `
      <img src="${img}" class="gallery-thumb-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" alt="থাম্বনেল">
    `).join('') : '';

    // Variant selector
    let variantHtml = '';
    if (prod.variants) {
      variantHtml = `
        <div class="variant-picker">
          <div class="variant-picker-label">${prod.variants.name} নির্বাচন করুন:</div>
          <div class="variant-options-list">
            ${prod.variants.options.map((opt, idx) => `
              <button class="variant-opt-btn" data-variant="${opt}">${opt}</button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Reviews list
    let reviewsHtml = '';
    if (prod.reviews && prod.reviews.length > 0) {
      reviewsHtml = prod.reviews.map(rev => {
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
        return `
          <div class="review-item">
            <div class="review-meta">
              <span class="reviewer-name">${rev.name}</span>
              <span class="review-date">${toBanglaNum(rev.date)}</span>
            </div>
            <div class="review-stars">${stars}</div>
            <div class="review-comment">${rev.comment}</div>
          </div>
        `;
      }).join('');
    } else {
      reviewsHtml = `<p style="color:var(--text-tertiary); font-size:13.5px;">এখনো কোনো রিভিউ দেওয়া হয়নি।</p>`;
    }

    container.innerHTML = `
      <div class="product-detail-layout">
        <!-- Gallery -->
        <div class="product-gallery">
          <div class="main-preview-wrap" id="detail-main-preview">
            <img src="${activeImage}" class="main-preview-img" id="detail-main-img" alt="${prod.name}">
          </div>
          <div class="gallery-thumbs" id="detail-thumbs-container">
            ${thumbnailsHtml}
          </div>
        </div>

        <!-- Specifications & Buy Panel -->
        <div class="product-specs">
          <span class="product-specs-cat">${getCategoryName(prod.categoryId)}</span>
          <h2 class="product-specs-title">${prod.name}</h2>
          
          <div class="product-detail-price-row">
            <span class="current-price">৳${toBanglaNum(prod.sellingPrice)}</span>
            ${prod.oldPrice ? `<span class="old-price">৳${toBanglaNum(prod.oldPrice)}</span>` : ''}
            ${prod.discountBadge ? `<span class="discount-tag" style="position:static; margin-left:12px;">${prod.discountBadge} ছাড়</span>` : ''}
          </div>

          <div class="product-meta-item">
            <span class="product-meta-label">স্ট্যাটাস:</span>
            ${prod.stock > 0 
              ? `<span class="stock-badge">স্টকে আছে (${toBanglaNum(prod.stock)} টি)</span>` 
              : `<span class="stock-badge out">স্টক আউট</span>`
            }
          </div>

          ${variantHtml}

          <!-- Quantity Control & Action Buttons -->
          <div class="buy-panel">
            <div class="detail-qty-control">
              <button class="detail-qty-btn" id="qty-minus-btn">-</button>
              <span class="detail-qty-val" id="qty-val-display">১</span>
              <button class="detail-qty-btn" id="qty-plus-btn">+</button>
            </div>

            ${prod.stock > 0 
              ? `
              <button class="btn btn-primary btn-detail-cart" id="detail-add-cart-btn"><i data-lucide="shopping-cart"></i> কার্টে রাখুন</button>
              <button class="btn btn-primary btn-detail-buy" id="detail-buy-now-btn"><i data-lucide="zap"></i> এখনই অর্ডার করুন</button>
              `
              : `
              <button class="btn btn-primary btn-detail-buy" style="background-color:#94a3b8; cursor:not-allowed;" disabled>স্টক আউট</button>
              `
            }
          </div>

          <div class="product-desc-section">
            <h4 class="desc-title">পণ্যের বিবরণ:</h4>
            <div class="desc-content">${prod.description || 'বিবরণ নেই।'}</div>
          </div>
        </div>
      </div>

      <!-- Customer Reviews Section -->
      <div class="reviews-container" style="background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 40px; box-shadow: var(--shadow-sm);">
        <div class="review-header-row">
          <h3 style="font-size:18px; font-weight:700;">গ্রাহকের প্রতিক্রিয়া ও রিভিউ (${toBanglaNum(prod.reviews ? prod.reviews.length : 0)})</h3>
          <button class="btn btn-secondary" id="open-add-review-modal" style="font-size:13px; padding: 8px 16px; border-color:var(--border-color); color:var(--text-primary);">রিভিউ লিখুন</button>
        </div>
        <div class="reviews-list-wrap">
          ${reviewsHtml}
        </div>
      </div>
    `;

    // Zoom initialization
    const mainWrap = document.getElementById('detail-main-preview');
    const mainImg = document.getElementById('detail-main-img');
    if (mainWrap && mainImg) {
      mainWrap.addEventListener('mousemove', e => {
        const rect = mainWrap.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        mainImg.style.transformOrigin = `${x}% ${y}%`;
      });
      mainWrap.addEventListener('mouseleave', () => {
        mainImg.style.transformOrigin = 'center center';
      });
    }

    // Thumbnail switching
    const thumbsWrap = document.getElementById('detail-thumbs-container');
    if (thumbsWrap) {
      thumbsWrap.addEventListener('click', e => {
        if (e.target.classList.contains('gallery-thumb-item')) {
          document.querySelectorAll('.gallery-thumb-item').forEach(el => el.classList.remove('active'));
          e.target.classList.add('active');
          const idx = parseInt(e.target.getAttribute('data-idx'));
          mainImg.src = prod.images[idx];
        }
      });
    }

    // Quantity selector actions
    const qtyDisplay = document.getElementById('qty-val-display');
    document.getElementById('qty-plus-btn')?.addEventListener('click', () => {
      if (selectedQty < prod.stock) {
        selectedQty++;
        if (qtyDisplay) qtyDisplay.innerText = toBanglaNum(selectedQty);
      } else {
        alert('দুঃখিত, পর্যাপ্ত স্টক নেই!');
      }
    });

    document.getElementById('qty-minus-btn')?.addEventListener('click', () => {
      if (selectedQty > 1) {
        selectedQty--;
        if (qtyDisplay) qtyDisplay.innerText = toBanglaNum(selectedQty);
      }
    });

    // Variant selections
    document.querySelectorAll('.variant-opt-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.variant-opt-btn').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');
        selectedVariant = e.target.getAttribute('data-variant');
      });
    });

    // Add to cart Action
    document.getElementById('detail-add-cart-btn')?.addEventListener('click', () => {
      if (prod.variants && !selectedVariant) {
        alert(`অনুগ্রহ করে ${prod.variants.name} নির্বাচন করুন!`);
        return;
      }
      addToCart(prod.id, selectedQty, selectedVariant);
    });

    // Buy now Action
    document.getElementById('detail-buy-now-btn')?.addEventListener('click', () => {
      if (prod.variants && !selectedVariant) {
        alert(`অনুগ্রহ করে ${prod.variants.name} নির্বাচন করুন!`);
        return;
      }
      // Add and redirect
      addToCart(prod.id, selectedQty, selectedVariant, false);
      navigate('/checkout');
    });

    // Add review modal triggering
    document.getElementById('open-add-review-modal')?.addEventListener('click', () => {
      openAddReviewModal(prod.id);
    });

    lucide.createIcons();
  }

  // Add review modal popup
  function openAddReviewModal(productId) {
    const modal = document.getElementById('global-modal-overlay');
    const content = document.getElementById('global-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <h3>রিভিউ প্রদান করুন</h3>
        <button class="btn-close-drawer" onclick="closeGlobalModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <form id="write-review-form" class="form-grid">
          <div class="form-group">
            <label class="form-label">আপনার নাম:</label>
            <input type="text" class="form-input" id="rev-user-name" required placeholder="নাম লিখুন">
          </div>
          <div class="form-group">
            <label class="form-label">রেটিং (১ - ৫):</label>
            <select class="form-select" id="rev-user-rating">
              <option value="5">★★★★★ (৫/৫)</option>
              <option value="4">★★★★☆ (৪/৫)</option>
              <option value="3">★★★☆☆ (৩/৫)</option>
              <option value="2">★★☆☆☆ (২/৫)</option>
              <option value="1">★☆☆☆☆ (১/৫)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">মন্তব্য:</label>
            <textarea class="form-textarea" id="rev-user-comment" required placeholder="পণ্যটি কেমন লেগেছে লিখুন..."></textarea>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeGlobalModal()">বন্ধ করুন</button>
        <button class="btn btn-primary" id="save-review-btn">দাখিল করুন</button>
      </div>
    `;

    modal.style.display = 'flex';
    lucide.createIcons();

    document.getElementById('save-review-btn')?.addEventListener('click', () => {
      const name = document.getElementById('rev-user-name').value.trim();
      const rating = parseInt(document.getElementById('rev-user-rating').value);
      const comment = document.getElementById('rev-user-comment').value.trim();

      if (!name || !comment) {
        alert('দয়া করে সব তথ্য পূরণ করুন!');
        return;
      }

      // Add to product reviews list
      const products = DB.getProducts();
      const prodIdx = products.findIndex(p => p.id === productId);
      if (prodIdx > -1) {
        if (!products[prodIdx].reviews) products[prodIdx].reviews = [];
        products[prodIdx].reviews.unshift({
          name: name,
          rating: rating,
          comment: comment,
          date: new Date().toISOString().split('T')[0]
        });
        DB.saveProducts(products);
        alert('আপনার রিভিউ জমা নেওয়া হয়েছে!');
        closeGlobalModal();
        renderProductDetailPage(document.getElementById('main-content-area'), productId);
      }
    });
  }

  // ==========================================
  // CART DRAWER & OPERATIONS
  // ==========================================
  
  function openCartDrawer() {
    document.getElementById('cart-overlay-shadow').style.display = 'block';
    document.getElementById('cart-drawer-panel').classList.add('open');
    renderCartDrawerList();
  }
  window.openCartDrawer = openCartDrawer;

  function closeCartDrawer() {
    document.getElementById('cart-overlay-shadow').style.display = 'none';
    document.getElementById('cart-drawer-panel').classList.remove('open');
  }
  window.closeCartDrawer = closeCartDrawer;

  function addToCart(productId, qty = 1, variant = null, notify = true) {
    const products = DB.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIdx = cart.findIndex(item => item.productId === productId && item.variant === variant);
    
    if (existingIdx > -1) {
      if (cart[existingIdx].quantity + qty > prod.stock) {
        alert(`দুঃখিত, আর স্টক নেই! স্টকে আছে সর্বোচ্চ ${toBanglaNum(prod.stock)} টি।`);
        return;
      }
      cart[existingIdx].quantity += qty;
    } else {
      if (qty > prod.stock) {
        alert(`দুঃখিত, আর স্টক নেই!`);
        return;
      }
      cart.push({
        productId: productId,
        productName: prod.name,
        price: prod.sellingPrice,
        buyingPrice: prod.buyingPrice,
        quantity: qty,
        variant: variant,
        image: prod.images && prod.images.length > 0 ? prod.images[0] : 'https://placehold.co/400x300'
      });
    }

    localStorage.setItem('ebazar_cart', JSON.stringify(cart));
    updateCartIconBadge();
    
    if (notify) {
      alert('পণ্যটি কার্টে যোগ করা হয়েছে!');
      openCartDrawer();
    }
  }
  window.addToCart = addToCart;

  function updateCartIconBadge() {
    const badge = document.getElementById('cart-counter-badge');
    if (badge) {
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      badge.innerText = toBanglaNum(count);
    }
  }

  function changeCartQty(index, offset) {
    const products = DB.getProducts();
    const item = cart[index];
    const prod = products.find(p => p.id === item.productId);
    
    if (prod) {
      const newQty = item.quantity + offset;
      if (newQty <= 0) {
        cart.splice(index, 1);
      } else if (newQty > prod.stock) {
        alert('দুঃখিত, পর্যাপ্ত স্টক নেই!');
        return;
      } else {
        item.quantity = newQty;
      }
      localStorage.setItem('ebazar_cart', JSON.stringify(cart));
      updateCartIconBadge();
      renderCartDrawerList();
    }
  }
  window.changeCartQty = changeCartQty;

  function removeCartItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('ebazar_cart', JSON.stringify(cart));
    updateCartIconBadge();
    renderCartDrawerList();
  }
  window.removeCartItem = removeCartItem;

  function applyCoupon() {
    const input = document.getElementById('coupon-code-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
      alert('দয়া করে কুপন কোড প্রবেশ করুন!');
      return;
    }

    // Seeded coupon: DESH20 (20% off), SAVE10 (10% off), FREE70 (৳70 off)
    if (code === 'DESH20') {
      appliedCoupon = { code: 'DESH20', type: 'percent', value: 20 };
      alert('অভিনন্দন! ২০% ডিসকাউন্ট কুপন সফলভাবে প্রয়োগ করা হয়েছে।');
    } else if (code === 'SAVE10') {
      appliedCoupon = { code: 'SAVE10', type: 'percent', value: 10 };
      alert('অভিনন্দন! ১০% ডিসকাউন্ট কুপন সফলভাবে প্রয়োগ করা হয়েছে।');
    } else if (code === 'FREE70') {
      appliedCoupon = { code: 'FREE70', type: 'flat', value: 70 };
      alert('অভিনন্দন! ৳৭০ ফ্ল্যাট ডিসকাউন্ট কুপন সফলভাবে প্রয়োগ করা হয়েছে।');
    } else {
      alert('দুঃখিত, কুপনটি অবৈধ বা মেয়াদোত্তীর্ণ!');
      return;
    }

    localStorage.setItem('ebazar_coupon', JSON.stringify(appliedCoupon));
    renderCartDrawerList();
  }
  window.applyCoupon = applyCoupon;

  function calculateCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function calculateDiscount(subtotal) {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percent') {
      return Math.round(subtotal * (appliedCoupon.value / 100));
    } else if (appliedCoupon.type === 'flat') {
      return appliedCoupon.value;
    }
    return 0;
  }

  function renderCartDrawerList() {
    const wrap = document.getElementById('cart-items-list-wrap');
    if (!wrap) return;

    if (cart.length === 0) {
      wrap.innerHTML = `
        <div class="cart-empty-view">
          <div class="cart-empty-icon"><i data-lucide="shopping-cart"></i></div>
          <p>আপনার কার্টটি সম্পূর্ণ খালি!</p>
          <button class="btn btn-primary" onclick="closeCartDrawer(); navigate('/shop')">শপিং শুরু করুন</button>
        </div>
      `;
      document.getElementById('cart-footer-qty').innerText = '০ টি';
      document.getElementById('cart-footer-discount').innerText = '৳ ০';
      document.getElementById('cart-footer-total').innerText = '৳ ০';
      lucide.createIcons();
      return;
    }

    let listHtml = cart.map((item, idx) => {
      const varHtml = item.variant ? `<div class="cart-item-variant">${item.variant}</div>` : '';
      return `
        <div class="cart-item">
          <img src="${item.image}" class="cart-item-img" alt="${item.productName}" onerror="this.src='https://placehold.co/100x100'">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.productName}</h4>
            ${varHtml}
            <div class="cart-item-price-row">
              <div class="cart-item-qty">
                <button class="cart-qty-btn" onclick="changeCartQty(${idx}, -1)">-</button>
                <span class="cart-qty-val">${toBanglaNum(item.quantity)}</span>
                <button class="cart-qty-btn" onclick="changeCartQty(${idx}, 1)">+</button>
              </div>
              <span class="cart-item-price">৳${toBanglaNum(item.price * item.quantity)}</span>
              <button class="cart-item-remove" onclick="removeCartItem(${idx})"><i data-lucide="trash-2" style="width:16px; height:16px;"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = listHtml;

    // Cart calculations
    const subtotal = calculateCartSubtotal();
    const discount = calculateDiscount(subtotal);
    const total = subtotal - discount;

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-footer-qty').innerText = `${toBanglaNum(totalQty)} টি`;
    document.getElementById('cart-footer-discount').innerText = `৳ ${toBanglaNum(discount)}`;
    document.getElementById('cart-footer-total').innerText = `৳ ${toBanglaNum(total)}`;

    // Prefill coupon input if applied
    const couponInput = document.getElementById('coupon-code-input');
    if (couponInput && appliedCoupon) {
      couponInput.value = appliedCoupon.code;
    }

    lucide.createIcons();
  }

  function proceedToCheckoutPage() {
    if (cart.length === 0) {
      alert('অর্ডার করার জন্য অনুগ্রহ করে কার্টে অন্তত একটি পণ্য যোগ করুন!');
      return;
    }
    closeCartDrawer();
    navigate('/checkout');
  }
  window.proceedToCheckoutPage = proceedToCheckoutPage;

  function buyNow(productId) {
    addToCart(productId, 1, null, false);
    navigate('/checkout');
  }
  window.buyNow = buyNow;

  // ==========================================
  // CHECKOUT PAGE & FORM HANDLER
  // ==========================================
  function renderCheckoutPage(container) {
    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:60px 20px;">
          <i data-lucide="shopping-cart" style="width:56px; height:56px; color:var(--text-tertiary); margin-bottom:16px;"></i>
          <h2>আপনার শপিং কার্ট খালি!</h2>
          <p style="margin: 12px 0 24px;">অর্ডার করার পূর্বে অনুগ্রহ করে পণ্য নির্বাচন করুন।</p>
          <button class="btn btn-primary" onclick="navigate('/shop')">পণ্য তালিকায় যান</button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    const settings = DB.getSettings();
    const subtotal = calculateCartSubtotal();
    const discount = calculateDiscount(subtotal);
    
    // Delivery area selection configurations
    let deliveryArea = 'inside'; // default inside
    let shippingCharge = settings.deliveryInside || 70;

    // Check if free shipping threshold is met
    if (settings.freeShippingThreshold && subtotal >= settings.freeShippingThreshold) {
      shippingCharge = 0;
    }

    function calculateFinalBill() {
      let shipCharge = shippingCharge;
      if (settings.freeShippingThreshold && subtotal >= settings.freeShippingThreshold) {
        shipCharge = 0;
      }
      return subtotal - discount + shipCharge;
    }

    // Payment variables
    let selectedPayment = 'cod';

    container.innerHTML = `
      <div class="checkout-layout">
        <!-- Billing Details Form -->
        <div class="checkout-card">
          <h3 class="checkout-title"><i data-lucide="user-check"></i> গ্রাহকের বিবরণ ও শিপিং তথ্য</h3>
          
          <form id="checkout-order-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">গ্রাহকের নাম (Full Name): <span style="color:var(--accent-color)">*</span></label>
              <input type="text" class="form-input" id="billing-fullname" required placeholder="আপনার সম্পূর্ণ নাম লিখুন">
            </div>

            <div class="form-group">
              <label class="form-label">মোবাইল নাম্বার (Phone Number): <span style="color:var(--accent-color)">*</span></label>
              <input type="tel" class="form-input" id="billing-phone" required placeholder="১১ ডিজিটের সচল মোবাইল নাম্বার (যেমন: 01711XXXXXX)">
            </div>

            <div class="form-group">
              <label class="form-label">সম্পূর্ণ ঠিকানা (Delivery Address): <span style="color:var(--accent-color)">*</span></label>
              <textarea class="form-textarea" id="billing-address" required placeholder="গ্রাম/রাস্তা, থানা, জেলা সহ সম্পূর্ণ ঠিকানা লিখুন"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">ডেলিভারি এরিয়া (Delivery Area):</label>
              <div class="checkout-options-grid">
                <div class="delivery-opt-card active" id="delivery-inside-card">
                  <input type="radio" name="delivery_area" class="opt-radio" checked value="inside">
                  <div class="opt-info">
                    <h4>ঢাকার ভিতরে</h4>
                    <p>ডেলিভারি চার্জ: ৳${toBanglaNum(settings.deliveryInside || 70)}</p>
                  </div>
                </div>
                
                <div class="delivery-opt-card" id="delivery-outside-card">
                  <input type="radio" name="delivery_area" class="opt-radio" value="outside">
                  <div class="opt-info">
                    <h4>ঢাকার বাইরে</h4>
                    <p>ডেলিভারি চার্জ: ৳${toBanglaNum(settings.deliveryOutside || 130)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">পেমেন্ট মেথড (Payment Method):</label>
              <div class="checkout-options-grid">
                <div class="payment-opt-card active" id="payment-cod-card">
                  <input type="radio" name="payment_method" class="opt-radio" checked value="cod">
                  <div class="opt-info">
                    <h4>ক্যাশ অন ডেলিভারি</h4>
                    <p>পণ্য হাতে পেয়ে পেমেন্ট করুন</p>
                  </div>
                </div>
                
                <div class="payment-opt-card" id="payment-bkash-card">
                  <input type="radio" name="payment_method" class="opt-radio" value="mobile">
                  <div class="opt-info">
                    <h4>বিকাশ / নগদ / রকেট</h4>
                    <p>মোবাইল ব্যাংকিং ডামি পেমেন্ট</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dummy mobile payment parameters input layout -->
            <div id="dummy-payment-fields" style="display:none; padding:16px; border:1px dashed var(--primary-color); border-radius:var(--radius-md); background-color:var(--bg-primary);">
              <h4 style="font-size:13.5px; font-weight:700; color:var(--primary-color); margin-bottom:10px;">ডামি মোবাইল পেমেন্ট গেটওয়ে</h4>
              <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">নিচের যেকোনো নাম্বারে সেন্ডমানি করে ট্রানজেকশন আইডি দিন:</p>
              <div style="font-size:13px; font-weight:700; margin-bottom:12px;">বিকাশ/নগদ (পার্সোনাল): 01700000000</div>
              
              <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label class="form-label" style="font-size:12px;">সেন্ডার নাম্বার (Sender Phone):</label>
                  <input type="text" class="form-input" id="dummy-pay-sender" placeholder="০১৭xxxxxxxx">
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size:12px;">ট্রানজেকশন আইডি (TxID):</label>
                  <input type="text" class="form-input" id="dummy-pay-txid" placeholder="TRX98421A">
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Order Summary Side Panel -->
        <div class="checkout-card" style="height: fit-content;">
          <h3 class="checkout-title"><i data-lucide="shopping-basket"></i> অর্ডার বিবরণী (Summary)</h3>
          
          <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:20px;">
            ${cart.map(item => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13.5px;">
                <div style="max-width:70%;">
                  <span style="font-weight:700;">${item.productName}</span>
                  ${item.variant ? `<br><small style="color:var(--text-secondary)">${item.variant}</small>` : ''}
                  <br><small style="color:var(--text-tertiary)">৳${toBanglaNum(item.price)} × ${toBanglaNum(item.quantity)}</small>
                </div>
                <span style="font-weight:700; color:var(--primary-color);">৳${toBanglaNum(item.price * item.quantity)}</span>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; flex-direction:column; gap:10px; font-size:14px; margin-bottom:20px; border-bottom:1px dashed var(--border-color); padding-bottom:16px;">
            <div style="display:flex; justify-content:space-between;">
              <span>সাবটোটাল:</span>
              <span>৳${toBanglaNum(subtotal)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--accent-color)">
              <span>ডিসকাউন্ট:</span>
              <span>- ৳${toBanglaNum(discount)}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>শিপিং চার্জ:</span>
              <span id="checkout-shipping-cost">৳${toBanglaNum(shippingCharge)}</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:24px;">
            <span>সর্বমোট বিল:</span>
            <span id="checkout-total-bill" style="color:var(--primary-color)">৳${toBanglaNum(calculateFinalBill())}</span>
          </div>

          <button class="btn btn-primary" id="checkout-confirm-order-btn" style="width:100%; padding:14px; font-size:16px;"><i data-lucide="check-circle-2"></i> অর্ডার কনফার্ম করুন</button>
        </div>
      </div>
    `;

    // Event hooks delivery area
    const insideCard = document.getElementById('delivery-inside-card');
    const outsideCard = document.getElementById('delivery-outside-card');
    const shipCostDisplay = document.getElementById('checkout-shipping-cost');
    const totalBillDisplay = document.getElementById('checkout-total-bill');

    function updateShipping(area) {
      deliveryArea = area;
      if (area === 'inside') {
        insideCard.classList.add('active');
        outsideCard.classList.remove('active');
        insideCard.querySelector('input').checked = true;
        shippingCharge = settings.deliveryInside || 70;
      } else {
        outsideCard.classList.add('active');
        insideCard.classList.remove('active');
        outsideCard.querySelector('input').checked = true;
        shippingCharge = settings.deliveryOutside || 130;
      }
      
      const sub = calculateCartSubtotal();
      if (settings.freeShippingThreshold && sub >= settings.freeShippingThreshold) {
        shippingCharge = 0;
      }
      
      if (shipCostDisplay) shipCostDisplay.innerText = `৳${toBanglaNum(shippingCharge)}`;
      if (totalBillDisplay) totalBillDisplay.innerText = `৳${toBanglaNum(calculateFinalBill())}`;
    }

    insideCard?.addEventListener('click', () => updateShipping('inside'));
    outsideCard?.addEventListener('click', () => updateShipping('outside'));

    // Payment hooks
    const codCard = document.getElementById('payment-cod-card');
    const bkashCard = document.getElementById('payment-bkash-card');
    const dummyFields = document.getElementById('dummy-payment-fields');

    codCard?.addEventListener('click', () => {
      selectedPayment = 'cod';
      codCard.classList.add('active');
      bkashCard.classList.remove('active');
      codCard.querySelector('input').checked = true;
      if (dummyFields) dummyFields.style.display = 'none';
    });

    bkashCard?.addEventListener('click', () => {
      selectedPayment = 'bkash';
      bkashCard.classList.add('active');
      codCard.classList.remove('active');
      bkashCard.querySelector('input').checked = true;
      if (dummyFields) dummyFields.style.display = 'block';
    });

    // Confirm order execution
    document.getElementById('checkout-confirm-order-btn')?.addEventListener('click', () => {
      const name = document.getElementById('billing-fullname').value.trim();
      const phone = document.getElementById('billing-phone').value.trim();
      const address = document.getElementById('billing-address').value.trim();

      if (!name || !phone || !address) {
        alert('অনুগ্রহ করে তারকাচিহ্নিত (*) সব শিপিং তথ্য পূরণ করুন!');
        return;
      }

      // 11 digit bangla/english phone validation
      const cleanedPhone = toEnglishNum(phone);
      const phonePattern = /^01[3-9]\d{8}$/;
      if (!phonePattern.test(cleanedPhone)) {
        alert('দুঃখিত, মোবাইল নাম্বারটি সঠিক নয়! ১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01711223344)।');
        return;
      }

      // Check transaction for bkash dummy payment
      if (selectedPayment === 'bkash') {
        const sender = document.getElementById('dummy-pay-sender').value.trim();
        const txid = document.getElementById('dummy-pay-txid').value.trim();
        if (!sender || !txid) {
          alert('অনুগ্রহ করে মোবাইল পেমেন্টের সেন্ডার নাম্বার ও ট্রানজেকশন আইডি প্রদান করুন!');
          return;
        }
      }

      // Decrease stock
      const products = DB.getProducts();
      let hasStockErrors = false;
      let stockErrorMessage = 'দুঃখিত, নিচের পণ্যগুলোর পর্যাপ্ত স্টক নেই:\n';

      cart.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (prod.stock < item.quantity) {
            hasStockErrors = true;
            stockErrorMessage += `- ${prod.name} (স্টকে আছে মাত্র ${toBanglaNum(prod.stock)} টি)\n`;
          }
        }
      });

      if (hasStockErrors) {
        alert(stockErrorMessage);
        return;
      }

      // Complete order confirmation logic
      cart.forEach(item => {
        const prodIdx = products.findIndex(p => p.id === item.productId);
        if (prodIdx > -1) {
          products[prodIdx].stock -= item.quantity;
        }
      });
      DB.saveProducts(products); // Write decreased stock

      // Generate Order ID ORD-XXXXX
      const orderCodeNum = Math.floor(10000 + Math.random() * 90000);
      const orderId = `ORD-${orderCodeNum}`;

      // Save order
      const orders = DB.getOrders();
      const newOrder = {
        id: orderId,
        phone: cleanedPhone,
        name: name,
        address: address,
        deliveryArea: deliveryArea,
        deliveryCharge: shippingCharge,
        paymentMethod: selectedPayment,
        paymentDetails: selectedPayment === 'bkash' ? {
          sender: document.getElementById('dummy-pay-sender').value.trim(),
          txid: document.getElementById('dummy-pay-txid').value.trim()
        } : null,
        status: 'pending', // initial status
        items: [...cart],
        total: calculateFinalBill(),
        createdAt: new Date().toISOString()
      };
      
      orders.unshift(newOrder); // Add to beginning of orders list
      DB.saveOrders(orders);

      // Clear Cart
      cart = [];
      localStorage.removeItem('ebazar_cart');
      appliedCoupon = null;
      localStorage.removeItem('ebazar_coupon');
      updateCartIconBadge();

      alert(`অভিনন্দন! আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে। আপনার অর্ডার আইডি: ${orderId}`);
      
      // Navigate to tracking
      navigate(`/track?id=${orderId}&phone=${cleanedPhone}`);
    });

    lucide.createIcons();
  }

  // ==========================================
  // ORDER TRACKING PAGE
  // ==========================================
  function renderTrackingPage(container) {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const paramId = params.get('id') || '';
    const paramPhone = params.get('phone') || '';

    container.innerHTML = `
      <div class="track-layout">
        <i data-lucide="map-pin" style="width:48px; height:48px; color:var(--primary-color); margin-bottom:16px;"></i>
        <h2 style="font-size:24px; font-weight:800;">আপনার অর্ডার ট্র্যাক করুন</h2>
        <p style="color:var(--text-secondary); margin-bottom:20px;">অর্ডার আইডি এবং মোবাইল নাম্বার দিয়ে লাইভ স্ট্যাটাস দেখুন</p>
        
        <div class="track-form-row">
          <input type="text" class="form-input" id="track-order-id" placeholder="অর্ডার আইডি (যেমন: ORD-78421)" value="${paramId}" style="flex:1.2;">
          <input type="text" class="form-input" id="track-phone" placeholder="মোবাইল নাম্বার" value="${paramPhone}" style="flex:1;">
          <button class="btn btn-primary" id="track-submit-btn" style="padding:12px 24px;">ট্র্যাক করুন</button>
        </div>

        <div class="track-timeline-wrap" id="track-result-wrap">
          <!-- Dynamically populated tracking result -->
        </div>
      </div>
    `;

    function performTracking() {
      const orderId = document.getElementById('track-order-id').value.trim().toUpperCase();
      const phoneInput = document.getElementById('track-phone').value.trim();
      const resultWrap = document.getElementById('track-result-wrap');
      
      if (!orderId || !phoneInput) {
        alert('অনুগ্রহ করে অর্ডার আইডি ও ফোন নম্বর দিন!');
        return;
      }

      const phone = toEnglishNum(phoneInput);
      const orders = DB.getOrders();
      const order = orders.find(o => o.id === orderId && o.phone === phone);

      if (!order) {
        resultWrap.style.display = 'block';
        resultWrap.innerHTML = `
          <div style="text-align:center; padding:30px; color:var(--accent-color); font-weight:700;">
            <i data-lucide="alert-triangle" style="width:32px; height:32px; margin-bottom:10px;"></i>
            <p>দুঃখিত! অর্ডার আইডি অথবা ফোন নাম্বারটি সঠিক নয়। আবার চেষ্টা করুন।</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      // Display results and timeline progress
      resultWrap.style.display = 'block';
      
      let statusStep = 1; // pending
      if (order.status === 'processing') statusStep = 2;
      if (order.status === 'shipped') statusStep = 3;
      if (order.status === 'delivered') statusStep = 4;
      if (order.status === 'cancelled') statusStep = -1;

      // Status text bn maps
      const statusBn = {
        pending: 'অর্ডার গ্রহণ করা হয়েছে',
        processing: 'প্রসেসিং করা হচ্ছে',
        shipped: 'কুরিয়ারে পাঠানো হয়েছে',
        delivered: 'ডেলিভারি সম্পন্ন',
        cancelled: 'অর্ডার বাতিল করা হয়েছে'
      };

      const dateStr = new Date(order.createdAt).toLocaleString('bn-BD');

      resultWrap.innerHTML = `
        <div class="track-details-card">
          <div class="track-details-row">
            <span style="font-weight:700">গ্রাহক:</span>
            <span>${order.name}</span>
          </div>
          <div class="track-details-row">
            <span style="font-weight:700">ঠিকানা:</span>
            <span>${order.address}</span>
          </div>
          <div class="track-details-row">
            <span style="font-weight:700">তারিখ ও সময়:</span>
            <span>${toBanglaNum(dateStr)}</span>
          </div>
          <div class="track-details-row">
            <span style="font-weight:700">টোটাল বিল:</span>
            <span style="color:var(--primary-color); font-weight:700">৳${toBanglaNum(order.total)}</span>
          </div>
        </div>

        <ul class="timeline">
          <li class="timeline-step ${statusStep >= 1 ? 'completed' : (statusStep === -1 && order.status === 'cancelled' ? '' : 'active')}">
            <div class="timeline-bullet"></div>
            <div class="timeline-info">
              <h4>অর্ডার গ্রহণ করা হয়েছে</h4>
              <p>আপনার অর্ডারটি সিস্টেমে নথিভুক্ত করা হয়েছে।</p>
            </div>
          </li>
          
          <li class="timeline-step ${statusStep >= 2 ? 'completed' : (statusStep === 1 ? 'active' : '')} ${statusStep === -1 ? 'no-print' : ''}" style="${statusStep === -1 ? 'display:none;' : ''}">
            <div class="timeline-bullet"></div>
            <div class="timeline-info">
              <h4>প্রসেসিং হচ্ছে</h4>
              <p>আমাদের টিম পণ্যগুলো প্রস্তুত করছে।</p>
            </div>
          </li>
          
          <li class="timeline-step ${statusStep >= 3 ? 'completed' : (statusStep === 2 ? 'active' : '')} ${statusStep === -1 ? 'no-print' : ''}" style="${statusStep === -1 ? 'display:none;' : ''}">
            <div class="timeline-bullet"></div>
            <div class="timeline-info">
              <h4>কুরিয়ারে পাঠানো হয়েছে</h4>
              <p>শিপিং পার্টনারকে পণ্য হস্তান্তর করা হয়েছে।</p>
            </div>
          </li>
          
          <li class="timeline-step ${statusStep === 4 ? 'completed' : (statusStep === 3 ? 'active' : '')} ${statusStep === -1 ? 'no-print' : ''}" style="${statusStep === -1 ? 'display:none;' : ''}">
            <div class="timeline-bullet"></div>
            <div class="timeline-info">
              <h4>ডেলিভারি সম্পন্ন</h4>
              <p>পণ্যটি সফলভাবে গ্রাহকের কাছে বুঝিয়ে দেওয়া হয়েছে।</p>
            </div>
          </li>

          <!-- Conditional Cancelled Step -->
          ${statusStep === -1 ? `
          <li class="timeline-step cancelled">
            <div class="timeline-bullet"></div>
            <div class="timeline-info">
              <h4>অর্ডার বাতিল করা হয়েছে</h4>
              <p>দুঃখিত, এই অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।</p>
            </div>
          </li>
          ` : ''}
        </ul>
      `;

      lucide.createIcons();
    }

    document.getElementById('track-submit-btn')?.addEventListener('click', performTracking);
    
    // Auto-trigger if queries exist
    if (paramId && paramPhone) {
      performTracking();
    }

    lucide.createIcons();
  }

  // Contact page
  function renderContactPage(container) {
    const settings = DB.getSettings();
    container.innerHTML = `
      <h2 style="font-size:24px; font-weight:800; margin-bottom:20px;">আমাদের সাথে যোগাযোগ করুন</h2>
      <div class="contact-layout">
        <div class="contact-info-card">
          <div class="contact-item">
            <div class="contact-item-icon"><i data-lucide="phone"></i></div>
            <div class="contact-item-details">
              <h4>ফোন নম্বর</h4>
              <p><a href="tel:${settings.contactPhone || '01700000000'}">${settings.contactPhone || '01700000000'}</a></p>
            </div>
          </div>
          <div class="contact-item">
            <div class="contact-item-icon"><i data-lucide="mail"></i></div>
            <div class="contact-item-details">
              <h4>ইমেইল ঠিকানা</h4>
              <p><a href="mailto:${settings.contactEmail || 'support@amarbazar.com'}">${settings.contactEmail || 'support@amarbazar.com'}</a></p>
            </div>
          </div>
          <div class="contact-item">
            <div class="contact-item-icon"><i data-lucide="facebook"></i></div>
            <div class="contact-item-details">
              <h4>ফেসবুক পেজ</h4>
              <p><a href="${settings.socialFb || '#'}" target="_blank">আমাদের ফেসবুক পেজ</a></p>
            </div>
          </div>
          <div class="contact-item">
            <div class="contact-item-icon"><i data-lucide="map-pin"></i></div>
            <div class="contact-item-details">
              <h4>অফিস ঠিকানা</h4>
              <p>মিরপুর, ঢাকা - ১২১৬, বাংলাদেশ</p>
            </div>
          </div>
        </div>

        <!-- Feedback Form -->
        <div class="checkout-card">
          <h3 class="checkout-title"><i data-lucide="send"></i> একটি মেসেজ পাঠান</h3>
          <form id="contact-feedback-form" class="form-grid" onsubmit="event.preventDefault(); alert('আপনার মেসেজটি সফলভাবে পাঠানো হয়েছে! শীঘ্রই যোগাযোগ করা হবে।'); this.reset();">
            <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:16px;">
              <div class="form-group">
                <label class="form-label">নাম:</label>
                <input type="text" class="form-input" required placeholder="আপনার নাম">
              </div>
              <div class="form-group">
                <label class="form-label">মোবাইল নম্বর:</label>
                <input type="text" class="form-input" required placeholder="মোবাইল নম্বর">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">মেসেজ/জিজ্ঞাসা:</label>
              <textarea class="form-textarea" required placeholder="এখানে লিখুন..."></textarea>
            </div>
            <button class="btn btn-primary" type="submit" style="width:fit-content; padding: 12px 30px;">মেসেজ পাঠান</button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  }


  // ==========================================
  // BACKEND / ADMIN CONTROL PANEL VIEWS
  // ==========================================
  
  function renderAdminView(hash) {
    const adminContent = document.getElementById('admin-content-area');
    const headerTitle = document.getElementById('admin-page-title-heading');
    
    // Sidebar nav state updates
    document.querySelectorAll('.admin-menu-list a').forEach(el => el.classList.remove('active'));

    if (hash === '#/admin') {
      document.getElementById('admin-nav-overview')?.classList.add('active');
      headerTitle.innerText = 'ড্যাশবোর্ড ওভারভিউ ও প্রফিট রিপোর্ট';
      renderAdminOverview(adminContent);
    } else if (hash === '#/admin/products') {
      document.getElementById('admin-nav-products')?.classList.add('active');
      headerTitle.innerText = 'প্রোডাক্ট ম্যানেজমেন্ট';
      renderAdminProducts(adminContent);
    } else if (hash === '#/admin/categories') {
      document.getElementById('admin-nav-categories')?.classList.add('active');
      headerTitle.innerText = 'ক্যাটাগরি ম্যানেজমেন্ট';
      renderAdminCategories(adminContent);
    } else if (hash === '#/admin/orders') {
      document.getElementById('admin-nav-orders')?.classList.add('active');
      headerTitle.innerText = 'অর্ডার লিস্ট ও ইনভয়েস';
      renderAdminOrders(adminContent);
    } else if (hash === '#/admin/shipping') {
      document.getElementById('admin-nav-shipping')?.classList.add('active');
      headerTitle.innerText = 'ডেলিভারি সেটিংস';
      renderAdminShipping(adminContent);
    } else if (hash === '#/admin/users') {
      document.getElementById('admin-nav-users')?.classList.add('active');
      headerTitle.innerText = 'স্টাফ ও কাস্টমার ম্যানেজমেন্ট';
      renderAdminUsers(adminContent);
    } else if (hash === '#/admin/settings') {
      document.getElementById('admin-nav-settings')?.classList.add('active');
      headerTitle.innerText = 'সাইট সেটিংস ও থিম কাস্টমাইজেশন';
      renderAdminSettings(adminContent);
    }
  }

  // KPI calculations and Dashboard overview
  function renderAdminOverview(container) {
    const orders = DB.getOrders();
    const products = DB.getProducts();

    // Calculations
    const totalOrdersCount = orders.length;
    const totalProductsCount = products.length;

    // Filter successful orders for sales calculations: processing + delivered
    const successOrders = orders.filter(o => o.status === 'processing' || o.status === 'delivered');
    const totalSales = successOrders.reduce((sum, o) => sum + o.total, 0);

    // Dynamic Net Profit Logic: Net Profit = Sum[ (sellPrice - buyPrice)*qty ] - delivery charges/coupons (or standard buying cost differences)
    // Profit = [বিক্রয়মূল্য - ক্রয়মূল্য - কুপন ডিসকাউন্ট/অফার]
    let netProfit = 0;
    successOrders.forEach(ord => {
      let orderProfit = 0;
      ord.items.forEach(item => {
        // buyingPrice fallback if not present
        const bPrice = item.buyingPrice || Math.round(item.price * 0.6);
        orderProfit += (item.price - bPrice) * item.quantity;
      });
      // Deduct order-level discounts (if applied)
      // Note: order.total = subtotal - discount + deliveryCharge.
      // So let's calculate discount dynamically from items price
      const subtotal = ord.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountVal = subtotal + ord.deliveryCharge - ord.total;
      
      orderProfit -= (discountVal > 0 ? discountVal : 0);
      netProfit += orderProfit;
    });

    container.innerHTML = `
      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-details">
            <h4>মোট বিক্রি (Total Sales)</h4>
            <div class="kpi-val">৳${toBanglaNum(totalSales)}</div>
          </div>
          <div class="kpi-icon"><i data-lucide="dollar-sign"></i></div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-details">
            <h4>মোট প্রফিট (Net Profit)</h4>
            <div class="kpi-val" style="color:#10b981;">৳${toBanglaNum(netProfit)}</div>
          </div>
          <div class="kpi-icon"><i data-lucide="trending-up"></i></div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-details">
            <h4>মোট অর্ডার সংখ্যা</h4>
            <div class="kpi-val" style="color:var(--accent-color);">${toBanglaNum(totalOrdersCount)}</div>
          </div>
          <div class="kpi-icon"><i data-lucide="shopping-bag"></i></div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-details">
            <h4>মোট প্রোডাক্ট সংখ্যা</h4>
            <div class="kpi-val" style="color:#f59e0b;">${toBanglaNum(totalProductsCount)}</div>
          </div>
          <div class="kpi-icon"><i data-lucide="package"></i></div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid">
        <!-- Sales Performance Graphic -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>দৈনিক ও মাসিক বিক্রয় রিপোর্ট</h3>
            <span style="font-size:12px; color:var(--text-tertiary);">লাইভ ডেটা চার্ট</span>
          </div>
          <div class="chart-container">
            <canvas id="admin-sales-chart-canvas"></canvas>
          </div>
        </div>

        <!-- Stock / Product Distribution -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>ক্যাটাগরি অনুযায়ী প্রোডাক্ট</h3>
          </div>
          <div class="chart-container">
            <canvas id="admin-category-chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="admin-table-card">
        <div class="admin-table-header">
          <h3 class="admin-table-title">সাম্প্রতিক অর্ডার সমূহ</h3>
          <button class="btn btn-primary" onclick="navigate('/admin/orders')" style="font-size:12px; padding:6px 14px;">সব অর্ডার দেখুন</button>
        </div>
        
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>অর্ডার আইডি</th>
                <th>গ্রাহকের নাম</th>
                <th>তারিখ</th>
                <th>টোটাল বিল</th>
                <th>পেমেন্ট</th>
                <th>স্ট্যাটাস</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${renderRecentOrdersRows(orders.slice(0, 5))}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render Charts
    setTimeout(() => {
      initAdminDashboardCharts(successOrders, products);
    }, 100);

    lucide.createIcons();
  }

  function renderRecentOrdersRows(recentOrders) {
    if (recentOrders.length === 0) {
      return `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-tertiary);">কোনো অর্ডার পাওয়া যায়নি!</td></tr>`;
    }

    return recentOrders.map(ord => {
      const dateStr = new Date(ord.createdAt).toLocaleDateString('bn-BD');
      
      // Status badge bn
      const statusMap = {
        pending: 'পেন্ডিং',
        processing: 'প্রসেসিং',
        shipped: 'কুরিয়ারে',
        delivered: 'ডেলিভার্ড',
        cancelled: 'বাতিল'
      };

      const payMap = {
        cod: 'ক্যাশ অন',
        bkash: 'মোবাইল ব্যাংকিং'
      };

      return `
        <tr>
          <td style="font-weight:700;">${ord.id}</td>
          <td>${ord.name}</td>
          <td>${toBanglaNum(dateStr)}</td>
          <td style="font-weight:700; color:var(--primary-color);">৳${toBanglaNum(ord.total)}</td>
          <td>${payMap[ord.paymentMethod] || 'ক্যাশ'}</td>
          <td><span class="status-badge ${ord.status}">${statusMap[ord.status] || 'পেন্ডিং'}</span></td>
          <td>
            <button class="btn-action edit" onclick="navigate('/admin/orders?id=${ord.id}')" title="অর্ডার আপডেট ও ইনভয়েস">
              <i data-lucide="eye" style="width:14px; height:14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Dashboard charts using Chart.js
  function initAdminDashboardCharts(successOrders, products) {
    const salesCanvas = document.getElementById('admin-sales-chart-canvas');
    const catCanvas = document.getElementById('admin-category-chart-canvas');
    if (!salesCanvas || !catCanvas) return;

    // Process last 7 days sales data
    const last7Days = [];
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      last7Days.push(d.toLocaleDateString('bn-BD', { weekday: 'short' }));
      
      const daySales = successOrders
        .filter(o => o.createdAt.split('T')[0] === dateString)
        .reduce((sum, o) => sum + o.total, 0);
      salesData.push(daySales);
    }

    // Chart 1: Sales Chart
    new Chart(salesCanvas, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'দৈনিক বিক্রি (৳)',
          data: salesData,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

    // Process Product category distribution
    const categories = DB.getCategories();
    const catNames = categories.map(c => c.name);
    const catProductCounts = categories.map(c => {
      return products.filter(p => p.categoryId === c.id).length;
    });

    // Chart 2: Category Distribution
    new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: catNames,
        datasets: [{
          data: catProductCounts,
          backgroundColor: [
            '#0f766e',
            '#e11d48',
            '#f59e0b',
            '#2563eb',
            '#8b5cf6'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { family: 'Hind Siliguri' } }
          }
        }
      }
    });
  }

  // Admin Products Manager View
  function renderAdminProducts(container) {
    let products = DB.getProducts();
    const categories = DB.getCategories();

    function renderTableRows(list) {
      if (list.length === 0) {
        return `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-tertiary);">কোনো প্রোডাক্ট পাওয়া যায়নি!</td></tr>`;
      }
      return list.map(prod => `
        <tr>
          <td><img src="${prod.images && prod.images.length > 0 ? prod.images[0] : 'https://placehold.co/50x50'}" class="admin-product-img" onerror="this.src='https://placehold.co/50x50'"></td>
          <td style="font-weight:700; max-width:200px;">${prod.name}</td>
          <td>${getCategoryName(prod.categoryId)}</td>
          <td>৳${toBanglaNum(prod.buyingPrice)}</td>
          <td>৳${toBanglaNum(prod.sellingPrice)}</td>
          <td style="font-weight:700; color: ${prod.stock <= 5 ? '#ef4444' : 'inherit'}">${toBanglaNum(prod.stock)} টি</td>
          <td>
            <div class="admin-actions-cell">
              <button class="btn-action edit" onclick="openProductEditForm('${prod.id}')"><i data-lucide="edit"></i></button>
              <button class="btn-action delete" onclick="deleteProduct('${prod.id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="admin-table-card">
        <div class="admin-table-header">
          <h3 class="admin-table-title">প্রোডাক্ট তালিকা</h3>
          <div style="display:flex; gap:12px;">
            <input type="text" class="admin-search-input" id="admin-prod-search-input" placeholder="পণ্য খুঁজুন...">
            <button class="btn btn-primary" id="admin-add-product-btn" style="font-size:13px; padding: 8px 16px;"><i data-lucide="plus"></i> নতুন প্রোডাক্ট</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ছবি</th>
                <th>পণ্যের নাম</th>
                <th>ক্যাটাগরি</th>
                <th>ক্রয়মূল্য</th>
                <th>বিক্রয়মূল্য</th>
                <th>স্টক</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody id="admin-products-tbody">
              ${renderTableRows(products)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Search filter hook
    const searchInput = document.getElementById('admin-prod-search-input');
    searchInput?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = products.filter(p => p.name.toLowerCase().includes(q));
      document.getElementById('admin-products-tbody').innerHTML = renderTableRows(filtered);
      lucide.createIcons();
    });

    document.getElementById('admin-add-product-btn')?.addEventListener('click', () => {
      openProductEditForm(null); // Add form mode
    });

    lucide.createIcons();
  }

  // Open product insert/update modal dialog
  function openProductEditForm(productId = null) {
    const modal = document.getElementById('global-modal-overlay');
    const content = document.getElementById('global-modal-content');
    if (!modal || !content) return;

    const products = DB.getProducts();
    const categories = DB.getCategories();
    const isEdit = productId !== null;
    const prod = isEdit ? products.find(p => p.id === productId) : null;

    // Reset temporary image store
    activeProductImages = prod ? [...(prod.images || [])] : [];

    content.innerHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যুক্ত করুন'}</h3>
        <button class="btn-close-drawer" onclick="closeGlobalModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <form id="admin-product-crud-form" class="form-grid">
          <div class="form-group">
            <label class="form-label">পণ্যের নাম: <span style="color:var(--accent-color)">*</span></label>
            <input type="text" class="form-input" id="crud-prod-name" required value="${prod ? prod.name : ''}" placeholder="নাম লিখুন">
          </div>

          <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label">ক্যাটাগরি:</label>
              <select class="form-select" id="crud-prod-cat">
                ${categories.map(c => `
                  <option value="${c.id}" ${prod && prod.categoryId === c.id ? 'selected' : ''}>${c.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">স্টক পরিমাণ: <span style="color:var(--accent-color)">*</span></label>
              <input type="number" class="form-input" id="crud-prod-stock" required value="${prod ? prod.stock : 10}">
            </div>
          </div>

          <div class="form-grid" style="grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group">
              <label class="form-label">ক্রয়মূল্য (৳): <span style="color:var(--accent-color)">*</span></label>
              <input type="number" class="form-input" id="crud-prod-buying" required value="${prod ? prod.buyingPrice : ''}" placeholder="প্রফিট হিসাবের জন্য">
            </div>
            <div class="form-group">
              <label class="form-label">বিক্রয়মূল্য (৳): <span style="color:var(--accent-color)">*</span></label>
              <input type="number" class="form-input" id="crud-prod-selling" required value="${prod ? prod.sellingPrice : ''}" placeholder="বিক্রয়মূল্য">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">বিস্তারিত বিবরণ (Description):</label>
            <textarea class="form-textarea" id="crud-prod-desc" placeholder="পণ্যের বিবরণ">${prod ? prod.description : ''}</textarea>
          </div>

          <!-- Variants Configuration inputs -->
          <div class="form-grid" style="grid-template-columns: 1fr 2fr; gap:12px;">
            <div class="form-group">
              <label class="form-label">ভ্যারিয়েন্ট টাইপ:</label>
              <select class="form-select" id="crud-variant-type">
                <option value="none" ${!prod || !prod.variants ? 'selected' : ''}>কোনোটিই নয়</option>
                <option value="color" ${prod && prod.variants && prod.variants.type === 'color' ? 'selected' : ''}>রং (Color)</option>
                <option value="size" ${prod && prod.variants && prod.variants.type === 'size' ? 'selected' : ''}>সাইজ (Size)</option>
                <option value="combo" ${prod && prod.variants && prod.variants.type === 'combo' ? 'selected' : ''}>কম্বো প্যাক (Combo)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">অপশন সমূহ (কমা দিয়ে লিখুন):</label>
              <input type="text" class="form-input" id="crud-variant-options" placeholder="যেমন: লাল, নীল, সবুজ বা M, L, XL" value="${prod && prod.variants ? prod.variants.options.join(', ') : ''}">
            </div>
          </div>

          <!-- Multiple Image uploads -->
          <div class="form-group">
            <label class="form-label">পণ্যের ছবিসমূহ আপলোড:</label>
            <div class="image-upload-wrap" id="crud-image-upload-zone">
              <i data-lucide="image-plus" style="width:32px; height:32px; color:var(--text-tertiary); margin-bottom:8px;"></i>
              <p style="font-size:12px; color:var(--text-secondary)">এখানে ক্লিক করে ছবি নির্বাচন করুন (একাধিক ছবি সাপোর্ট করে)</p>
              <input type="file" id="crud-file-input" multiple accept="image/*" style="display:none;">
            </div>
            <div class="upload-preview-container" id="crud-upload-preview-wrap">
              <!-- Rendered base64 thumbnail previews -->
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeGlobalModal()">বাতিল করুন</button>
        <button class="btn btn-primary" id="save-crud-product-btn">সংরক্ষণ করুন</button>
      </div>
    `;

    modal.style.display = 'flex';
    lucide.createIcons();

    const uploadZone = document.getElementById('crud-image-upload-zone');
    const fileInput = document.getElementById('crud-file-input');
    const previewWrap = document.getElementById('crud-upload-preview-wrap');

    // Trigger upload on click
    uploadZone?.addEventListener('click', () => fileInput?.click());

    function renderUploadedPreviews() {
      if (previewWrap) {
        previewWrap.innerHTML = activeProductImages.map((img, idx) => `
          <div class="upload-thumb-item">
            <img src="${img}" alt="প্রিভিউ">
            <button class="remove-uploaded-thumb" data-idx="${idx}">&times;</button>
          </div>
        `).join('');
      }
    }

    // Initial render if editing
    renderUploadedPreviews();

    // File input selection handler
    fileInput?.addEventListener('change', e => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(evt) {
          activeProductImages.push(evt.target.result);
          renderUploadedPreviews();
        };
        reader.readAsDataURL(file);
      });
    });

    // Remove thumb click handler
    previewWrap?.addEventListener('click', e => {
      if (e.target.classList.contains('remove-uploaded-thumb')) {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        activeProductImages.splice(idx, 1);
        renderUploadedPreviews();
      }
    });

    // Save product
    document.getElementById('save-crud-product-btn')?.addEventListener('click', () => {
      const name = document.getElementById('crud-prod-name').value.trim();
      const catId = document.getElementById('crud-prod-cat').value;
      const stock = parseInt(document.getElementById('crud-prod-stock').value || 0);
      const buying = parseInt(document.getElementById('crud-prod-buying').value || 0);
      const selling = parseInt(document.getElementById('crud-prod-selling').value || 0);
      const desc = document.getElementById('crud-prod-desc').value.trim();
      
      const varType = document.getElementById('crud-variant-type').value;
      const varOptsVal = document.getElementById('crud-variant-options').value.trim();

      if (!name || isNaN(stock) || isNaN(buying) || isNaN(selling)) {
        alert('অনুগ্রহ করে তারকাচিহ্নিত (*) সব ঘর পূরণ করুন!');
        return;
      }

      // Format variant
      let variantsObj = null;
      if (varType !== 'none' && varOptsVal) {
        variantsObj = {
          type: varType,
          name: varType === 'color' ? 'রং' : (varType === 'size' ? 'সাইজ' : 'কম্বো প্যাক'),
          options: varOptsVal.split(',').map(s => s.trim()).filter(s => s.length > 0)
        };
      }

      const productsList = DB.getProducts();

      if (isEdit) {
        const idx = productsList.findIndex(p => p.id === productId);
        if (idx > -1) {
          productsList[idx] = {
            ...productsList[idx],
            name,
            categoryId: catId,
            stock,
            buyingPrice: buying,
            sellingPrice: selling,
            description: desc,
            variants: variantsObj,
            images: activeProductImages.length > 0 ? activeProductImages : productsList[idx].images
          };
        }
      } else {
        // Insert new
        const newId = `prod-${Date.now()}`;
        productsList.push({
          id: newId,
          name,
          categoryId: catId,
          stock,
          buyingPrice: buying,
          sellingPrice: selling,
          description: desc,
          variants: variantsObj,
          images: activeProductImages.length > 0 ? activeProductImages : ['https://placehold.co/400x300'],
          featured: true,
          hotDeal: false,
          reviews: []
        });
      }

      DB.saveProducts(productsList);
      alert('প্রোডাক্ট সফলভাবে সংরক্ষণ করা হয়েছে!');
      closeGlobalModal();
      renderAdminProducts(document.getElementById('admin-content-area'));
    });
  }

  // Delete product confirmation
  function deleteProduct(prodId) {
    if (confirm('আপনি কি নিশ্চিতভাবেই এই পণ্যটি ডিলিট করতে চান?')) {
      const products = DB.getProducts();
      const filtered = products.filter(p => p.id !== prodId);
      DB.saveProducts(filtered);
      alert('পণ্যটি সফলভাবে ডিলিট করা হয়েছে!');
      renderAdminProducts(document.getElementById('admin-content-area'));
    }
  }
  window.deleteProduct = deleteProduct;
  window.openProductEditForm = openProductEditForm;

  // Categories CRUD view
  function renderAdminCategories(container) {
    let categories = DB.getCategories();

    function renderTableRows() {
      if (categories.length === 0) {
        return `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-tertiary);">কোনো ক্যাটাগরি পাওয়া যায়নি!</td></tr>`;
      }
      return categories.map(cat => `
        <tr>
          <td style="font-size:24px; text-align:center; width:60px;">${cat.icon || '📦'}</td>
          <td style="font-weight:700;">${cat.name}</td>
          <td>${cat.slug}</td>
          <td>
            <div class="admin-actions-cell">
              <button class="btn-action edit" onclick="openCategoryModal('${cat.id}')"><i data-lucide="edit"></i></button>
              <button class="btn-action delete" onclick="deleteCategory('${cat.id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="admin-table-card">
        <div class="admin-table-header">
          <h3 class="admin-table-title">ক্যাটাগরি সমূহ</h3>
          <button class="btn btn-primary" onclick="openCategoryModal()"><i data-lucide="plus"></i> নতুন ক্যাটাগরি</button>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="text-align:center">আইকন</th>
                <th>ক্যাটাগরির নাম</th>
                <th>স্লাগ (Slug)</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;

    lucide.createIcons();
  }

  // Open category CRUD dialog
  function openCategoryModal(catId = null) {
    const modal = document.getElementById('global-modal-overlay');
    const content = document.getElementById('global-modal-content');
    if (!modal || !content) return;

    const categories = DB.getCategories();
    const isEdit = catId !== null;
    const cat = isEdit ? categories.find(c => c.id === catId) : null;

    content.innerHTML = `
      <div class="modal-header">
        <h3>${isEdit ? 'ক্যাটাগরি এডিট করুন' : 'নতুন ক্যাটাগরি তৈরি'}</h3>
        <button class="btn-close-drawer" onclick="closeGlobalModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <form class="form-grid">
          <div class="form-group">
            <label class="form-label">ক্যাটাগরির নাম: <span style="color:var(--accent-color)">*</span></label>
            <input type="text" class="form-input" id="crud-cat-name" required value="${cat ? cat.name : ''}" placeholder="যেমন: রূপচর্চা">
          </div>
          <div class="form-group">
            <label class="form-label">স্লাগ (Slug): <span style="color:var(--accent-color)">*</span></label>
            <input type="text" class="form-input" id="crud-cat-slug" required value="${cat ? cat.slug : ''}" placeholder="যেমন: beauty">
          </div>
          <div class="form-group">
            <label class="form-label">আইকন (Emoji):</label>
            <input type="text" class="form-input" id="crud-cat-icon" value="${cat ? cat.icon : '📦'}" placeholder="যেমন: 💄">
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeGlobalModal()">বাতিল</button>
        <button class="btn btn-primary" id="save-crud-cat-btn">সংরক্ষণ</button>
      </div>
    `;

    modal.style.display = 'flex';
    lucide.createIcons();

    document.getElementById('save-crud-cat-btn')?.addEventListener('click', () => {
      const name = document.getElementById('crud-cat-name').value.trim();
      const slug = document.getElementById('crud-cat-slug').value.trim().toLowerCase();
      const icon = document.getElementById('crud-cat-icon').value.trim();

      if (!name || !slug) {
        alert('অনুগ্রহ করে নাম ও স্লাগ দিন!');
        return;
      }

      const cats = DB.getCategories();
      if (isEdit) {
        const idx = cats.findIndex(c => c.id === catId);
        if (idx > -1) {
          cats[idx] = { ...cats[idx], name, slug, icon };
        }
      } else {
        cats.push({
          id: `cat-${Date.now()}`,
          name,
          slug,
          icon
        });
      }

      DB.saveCategories(cats);
      alert('ক্যাটাগরি সংরক্ষিত হয়েছে!');
      closeGlobalModal();
      renderAdminCategories(document.getElementById('admin-content-area'));
    });
  }

  function deleteCategory(catId) {
    if (confirm('আপনি কি ক্যাটাগরি ডিলিট করতে চান? (সতর্কতা: এতে পণ্যের ক্যাটাগরি ওলটপালট হতে পারে)')) {
      const cats = DB.getCategories();
      const filtered = cats.filter(c => c.id !== catId);
      DB.saveCategories(filtered);
      alert('ক্যাটাগরি ডিলিট হয়েছে!');
      renderAdminCategories(document.getElementById('admin-content-area'));
    }
  }
  window.deleteCategory = deleteCategory;
  window.openCategoryModal = openCategoryModal;

  // Order manager view
  function renderAdminOrders(container) {
    const orders = DB.getOrders();

    // Check if URL has a query for a specific order ID (e.g. to show invoice or details)
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const selectedOrderId = params.get('id');

    if (selectedOrderId) {
      renderOrderDetailView(container, selectedOrderId);
      return;
    }

    function renderOrderRows(list) {
      if (list.length === 0) {
        return `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-tertiary);">কোনো অর্ডার পাওয়া যায়নি!</td></tr>`;
      }
      return list.map(ord => {
        const dateStr = new Date(ord.createdAt).toLocaleDateString('bn-BD');
        const statusMap = {
          pending: 'পেন্ডিং',
          processing: 'প্রসেসিং',
          shipped: 'কুরিয়ারে',
          delivered: 'ডেলিভার্ড',
          cancelled: 'বাতিল'
        };

        return `
          <tr>
            <td style="font-weight:700;">${ord.id}</td>
            <td>${ord.name}<br><small style="color:var(--text-tertiary)">${ord.phone}</small></td>
            <td>${toBanglaNum(dateStr)}</td>
            <td style="font-weight:700; color:var(--primary-color);">৳${toBanglaNum(ord.total)}</td>
            <td><span class="status-badge ${ord.status}">${statusMap[ord.status] || 'পেন্ডিং'}</span></td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <select class="sort-select" onchange="changeOrderStatus('${ord.id}', this.value)" style="padding: 4px 8px; font-size:12px;">
                  <option value="pending" ${ord.status === 'pending' ? 'selected' : ''}>পেন্ডিং</option>
                  <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>প্রসেসিং</option>
                  <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>কুরিয়ারে পাঠানো</option>
                  <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>ডেলিভার্ড</option>
                  <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>বাতিল</option>
                </select>
                <button class="btn-action edit" onclick="navigate('/admin/orders?id=${ord.id}')" title="বিস্তারিত ও রশিদ">
                  <i data-lucide="eye" style="width:14px; height:14px;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="admin-table-card">
        <div class="admin-table-header">
          <h3 class="admin-table-title">গ্রাহকদের অর্ডার তালিকা</h3>
          <div style="display:flex; gap:12px;">
            <select class="sort-select" id="admin-order-status-filter">
              <option value="all">সব অর্ডার</option>
              <option value="pending">পেন্ডিং</option>
              <option value="processing">প্রসেসিং</option>
              <option value="shipped">কুরিয়ারে</option>
              <option value="delivered">ডেলিভার্ড</option>
              <option value="cancelled">বাতিল</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>অর্ডার আইডি</th>
                <th>গ্রাহকের বিবরণ</th>
                <th>তারিখ</th>
                <th>টোটাল বিল</th>
                <th>স্ট্যাটাস</th>
                <th>পরিবর্তন ও রশিদ</th>
              </tr>
            </thead>
            <tbody id="admin-orders-tbody">
              ${renderOrderRows(orders)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter status action hook
    document.getElementById('admin-order-status-filter')?.addEventListener('change', e => {
      const val = e.target.value;
      let filtered = orders;
      if (val !== 'all') {
        filtered = orders.filter(o => o.status === val);
      }
      document.getElementById('admin-orders-tbody').innerHTML = renderOrderRows(filtered);
      lucide.createIcons();
    });

    lucide.createIcons();
  }

  function changeOrderStatus(orderId, newStatus) {
    const orders = DB.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx > -1) {
      orders[idx].status = newStatus;
      DB.saveOrders(orders);
      alert(`অর্ডার স্ট্যাটাস সফলভাবে "${newStatus}" করা হয়েছে!`);
      // Reload current screen
      handleRoute();
    }
  }
  window.changeOrderStatus = changeOrderStatus;

  // Order Details & Printable Invoice view
  function renderOrderDetailView(container, orderId) {
    const orders = DB.getOrders();
    const ord = orders.find(o => o.id === orderId);

    if (!ord) {
      container.innerHTML = `<div style="text-align:center; padding:50px;"><h2>অর্ডার আইডি পাওয়া যায়নি!</h2></div>`;
      return;
    }

    const dateStr = new Date(ord.createdAt).toLocaleString('bn-BD');
    const payMap = {
      cod: 'ক্যাশ অন ডেলিভারি (Cash on Delivery)',
      bkash: 'বিকাশ / নগদ / রকেট পেমেন্ট'
    };

    const statusMap = {
      pending: 'অর্ডার পেন্ডিং',
      processing: 'প্রসেসিং হচ্ছে',
      shipped: 'কুরিয়ারে পাঠানো হয়েছে',
      delivered: 'ডেলিভারি সম্পন্ন',
      cancelled: 'বাতিল করা হয়েছে'
    };

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <button class="btn btn-secondary" onclick="navigate('/admin/orders')" style="padding:8px 16px; font-size:12px; border-color:var(--border-color); color:var(--text-primary);">
          <i data-lucide="arrow-left" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> ব্যাক টু লিস্ট
        </button>
      </div>

      <div class="checkout-layout">
        <!-- Order Bill Info & Items -->
        <div class="checkout-card">
          <h3 class="checkout-title"><i data-lucide="file-text"></i> অর্ডার বিবরণী: ${ord.id}</h3>
          
          <div style="font-size:14px; margin-bottom:20px; line-height:1.7;">
            <div><strong>গ্রাহকের নাম:</strong> ${ord.name}</div>
            <div><strong>মোবাইল নাম্বার:</strong> ${ord.phone}</div>
            <div><strong>সম্পূর্ণ ঠিকানা:</strong> ${ord.address}</div>
            <div><strong>তারিখ ও সময়:</strong> ${toBanglaNum(dateStr)}</div>
            <div><strong>পেমেন্ট মেথড:</strong> ${payMap[ord.paymentMethod]}</div>
            ${ord.paymentDetails ? `
              <div style="padding:10px; border:1px dashed var(--primary-color); border-radius:6px; background-color:var(--bg-primary); margin-top:10px; font-size:13px;">
                <strong>সেন্ডার নাম্বার:</strong> ${ord.paymentDetails.sender} <br>
                <strong>TxID:</strong> ${ord.paymentDetails.txid}
              </div>
            ` : ''}
          </div>

          <h4 style="font-size:14px; font-weight:700; margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:16px;">পণ্যের তালিকা:</h4>
          
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${ord.items.map(item => `
              <div style="display:flex; gap:12px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px; background-color:var(--bg-tertiary)">
                <div style="flex-grow:1; font-size:13px;">
                  <div style="font-weight:700;">${item.productName}</div>
                  ${item.variant ? `<span style="font-size:11px; background-color:var(--bg-tertiary); padding:2px 6px; border-radius:4px;">${item.variant}</span>` : ''}
                  <div style="margin-top:4px;">৳${toBanglaNum(item.price)} × ${toBanglaNum(item.quantity)}</div>
                </div>
                <div style="font-weight:700; color:var(--primary-color); font-size:14px;">৳${toBanglaNum(item.price * item.quantity)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Billing Summary & Actions -->
        <div class="checkout-card" style="height:fit-content;">
          <h3 class="checkout-title"><i data-lucide="dollar-sign"></i> পেমেন্ট ও স্ট্যাটাস</h3>
          
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13.5px; border-bottom:1px solid var(--border-color); padding-bottom:16px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between;">
              <span>সাবটোটাল:</span>
              <span>৳${toBanglaNum(ord.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--accent-color)">
              <span>ডিসকাউন্ট:</span>
              <span>- ৳${toBanglaNum(ord.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + ord.deliveryCharge - ord.total)}</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>শিপিং চার্জ:</span>
              <span>৳${toBanglaNum(ord.deliveryCharge)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:800; font-size:16px; border-top:1px dashed var(--border-color); padding-top:10px;">
              <span>মোট বিল:</span>
              <span>৳${toBanglaNum(ord.total)}</span>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label">স্ট্যাটাস পরিবর্তন:</label>
            <select class="form-select" id="detail-order-status-changer">
              <option value="pending" ${ord.status === 'pending' ? 'selected' : ''}>পেন্ডিং</option>
              <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>প্রসেসিং</option>
              <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>কুরিয়ারে পাঠানো</option>
              <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>ডেলিভার্ড</option>
              <option value="cancelled" ${ord.status === 'cancelled' ? 'selected' : ''}>বাতিল</option>
            </select>
          </div>

          <div style="display:grid; grid-template-columns:1fr; gap:12px;">
            <button class="btn btn-primary" id="detail-order-status-save-btn">স্ট্যাটাস আপডেট করুন</button>
            <button class="btn btn-secondary" onclick="printInvoice('${ord.id}')" style="border-color:var(--primary-color); color:var(--primary-color)"><i data-lucide="printer"></i> বাংলা ইনভয়েস প্রিন্ট</button>
          </div>
        </div>
      </div>
    `;

    // Hook status update
    document.getElementById('detail-order-status-save-btn')?.addEventListener('click', () => {
      const selStatus = document.getElementById('detail-order-status-changer').value;
      changeOrderStatus(ord.id, selStatus);
    });

    lucide.createIcons();
  }

  // Print invoice receipt functionality
  function printInvoice(orderId) {
    const orders = DB.getOrders();
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const settings = DB.getSettings();
    const invoiceArea = document.getElementById('invoice-print-area');
    if (!invoiceArea) return;

    const subtotal = ord.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = subtotal + ord.deliveryCharge - ord.total;
    const dateStr = new Date(ord.createdAt).toLocaleDateString('bn-BD');

    invoiceArea.innerHTML = `
      <div class="invoice-wrapper">
        <div class="invoice-header-row">
          <div>
            <h2 class="invoice-title" style="color:var(--primary-color);">${settings.siteName || 'আমার বাজার'}</h2>
            <p style="font-size:12px; color:#555;">${settings.siteTagline || 'আপনার আস্থার অনলাইন শপ'}</p>
            <p style="font-size:12px; margin-top:6px;">হটলাইন: ${settings.contactPhone} | ইমেইল: ${settings.contactEmail}</p>
          </div>
          <div style="text-align:right;">
            <h3 style="font-size:20px; font-weight:800; color:#333;">ইনভয়েস / রশিদ</h3>
            <p style="font-size:13px; font-weight:700;">আইডি: ${ord.id}</p>
            <p style="font-size:12px;">তারিখ: ${toBanglaNum(dateStr)}</p>
          </div>
        </div>

        <div class="invoice-bill-info">
          <div class="invoice-bill-to">
            <h4>বিল প্রেরক:</h4>
            <p><strong>${settings.siteName || 'আমার বাজার'}</strong></p>
            <p>মিরপুর, ঢাকা, বাংলাদেশ</p>
          </div>
          <div class="invoice-bill-to">
            <h4>ক্রেতার বিবরণ (Bill To):</h4>
            <p><strong>নাম:</strong> ${ord.name}</p>
            <p><strong>মোবাইল:</strong> ${ord.phone}</p>
            <p><strong>ঠিকানা:</strong> ${ord.address}</p>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width:50%">পণ্যের নাম</th>
              <th style="text-align:center; width:15%">মূল্য</th>
              <th style="text-align:center; width:15%">পরিমাণ</th>
              <th style="text-align:right; width:20%">মোট</th>
            </tr>
          </thead>
          <tbody>
            ${ord.items.map(item => `
              <tr>
                <td>
                  <strong>${item.productName}</strong>
                  ${item.variant ? `<br><small style="color:#555">ভ্যারিয়েন্ট: ${item.variant}</small>` : ''}
                </td>
                <td style="text-align:center;">৳${toBanglaNum(item.price)}</td>
                <td style="text-align:center;">${toBanglaNum(item.quantity)}</td>
                <td style="text-align:right; font-weight:700;">৳${toBanglaNum(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="invoice-summary">
          <table class="invoice-summary-table">
            <tr>
              <td>উপ-মোট (Subtotal):</td>
              <td style="text-align:right;">৳${toBanglaNum(subtotal)}</td>
            </tr>
            <tr>
              <td style="color:#e11d48;">ডিসকাউন্ট:</td>
              <td style="text-align:right; color:#e11d48;">- ৳${toBanglaNum(discount)}</td>
            </tr>
            <tr>
              <td>ডেলিভারি চার্জ:</td>
              <td style="text-align:right;">৳${toBanglaNum(ord.deliveryCharge)}</td>
            </tr>
            <tr class="total-row">
              <td style="font-size:15px;">সর্বমোট বিল (Net Pay):</td>
              <td style="text-align:right; font-size:15px;">৳${toBanglaNum(ord.total)}</td>
            </tr>
          </table>
        </div>

        <div class="invoice-footer">
          <p>আমাদের দোকান থেকে কেনাকাটা করার জন্য আপনাকে ধন্যবাদ!</p>
          <p style="margin-top:6px; font-style:italic;">এটি একটি কম্পিউটার জেনারেটেড বিল, কোনো স্বাক্ষরের প্রয়োজন নেই।</p>
        </div>
      </div>
    `;

    // Trigger Print
    setTimeout(() => {
      window.print();
    }, 100);
  }
  window.printInvoice = printInvoice;

  // Admin Shipping configurations view
  function renderAdminShipping(container) {
    const settings = DB.getSettings();

    container.innerHTML = `
      <div class="checkout-card" style="max-width:600px;">
        <h3 class="checkout-title"><i data-lucide="truck"></i> শিপিং ও ডেলিভারি কনফিগারেশন</h3>
        
        <form class="form-grid" id="admin-shipping-settings-form" onsubmit="event.preventDefault();">
          <div class="form-group">
            <label class="form-label">ঢাকার ভিতরে ডেলিভারি চার্জ (৳):</label>
            <input type="number" class="form-input" id="ship-inside" value="${settings.deliveryInside || 70}" required>
          </div>
          <div class="form-group">
            <label class="form-label">ঢাকার বাইরে ডেলিভারি চার্জ (৳):</label>
            <input type="number" class="form-input" id="ship-outside" value="${settings.deliveryOutside || 130}" required>
          </div>
          <div class="form-group">
            <label class="form-label">ফ্রি ডেলিভারি অফারের জন্য ন্যূনতম ক্রয়ের পরিমাণ (৳):</label>
            <input type="number" class="form-input" id="ship-threshold" value="${settings.freeShippingThreshold || 2000}" required placeholder="যেমন: ২০০০">
            <small style="color:var(--text-tertiary)">এই পরিমাণের বেশি কেনাকাটা করলে শিপিং চার্জ অটোমেটিক্যালি ৳০ হয়ে যাবে।</small>
          </div>
          
          <button class="btn btn-primary" id="save-shipping-settings-btn" style="width:fit-content; padding:12px 30px;">কনফিগারেশন সংরক্ষণ করুন</button>
        </form>
      </div>
    `;

    document.getElementById('save-shipping-settings-btn')?.addEventListener('click', () => {
      const inside = parseInt(document.getElementById('ship-inside').value);
      const outside = parseInt(document.getElementById('ship-outside').value);
      const threshold = parseInt(document.getElementById('ship-threshold').value);

      if (isNaN(inside) || isNaN(outside) || isNaN(threshold)) {
        alert('অনুগ্রহ করে সঠিক সংখ্যাসূচক মান প্রবেশ করান!');
        return;
      }

      const currentSettings = DB.getSettings();
      currentSettings.deliveryInside = inside;
      currentSettings.deliveryOutside = outside;
      currentSettings.freeShippingThreshold = threshold;
      
      DB.saveSettings(currentSettings);
      alert('শিপিং কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে!');
    });

    lucide.createIcons();
  }

  // Admin User/Staff Manager View
  function renderAdminUsers(container) {
    const users = DB.getUsers();

    function renderUserRows() {
      return users.map(user => {
        const roleBadgeColor = user.role === 'Admin' ? '#e11d48' : (user.role === 'Manager' ? '#2563eb' : 'inherit');
        return `
          <tr>
            <td style="font-weight:700;">${user.name}</td>
            <td>${user.email}</td>
            <td style="font-weight:700; color:${roleBadgeColor}">${user.role}</td>
            <td><span class="status-badge ${user.status.toLowerCase()}">${user.status === 'Active' ? 'সক্রিয়' : 'ব্লকড'}</span></td>
            <td>
              <div class="admin-actions-cell">
                <select class="sort-select" onchange="changeUserRole('${user.email}', this.value)" style="padding: 4px; font-size:12px;">
                  <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>অ্যাডমিন</option>
                  <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>ম্যানেজার</option>
                  <option value="Customer" ${user.role === 'Customer' ? 'selected' : ''}>গ্রাহক</option>
                </select>
                <button class="btn-action edit" onclick="toggleUserStatus('${user.email}')" title="অ্যাক্টিভ / ব্লক করুন">
                  <i data-lucide="shield-alert" style="width:14px; height:14px;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div class="admin-table-card">
        <div class="admin-table-header">
          <h3 class="admin-table-title">স্টাফ ও গ্রাহক তালিকা</h3>
          <button class="btn btn-primary" id="admin-add-user-btn"><i data-lucide="user-plus"></i> নতুন ইউজার যুক্ত করুন</button>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>নাম</th>
                <th>ইমেইল / ইউজারনেম</th>
                <th>রোল (Role)</th>
                <th>অবস্থা (Status)</th>
                <th>রোল পরিবর্তন ও ব্লক</th>
              </tr>
            </thead>
            <tbody>
              ${renderUserRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('admin-add-user-btn')?.addEventListener('click', () => {
      openAddUserModal();
    });

    lucide.createIcons();
  }

  function changeUserRole(email, newRole) {
    const users = DB.getUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx > -1) {
      users[idx].role = newRole;
      DB.saveUsers(users);
      alert(`রোল সফলভাবে "${newRole}"-এ পরিবর্তিত হয়েছে!`);
      handleRoute();
    }
  }
  window.changeUserRole = changeUserRole;

  function toggleUserStatus(email) {
    const users = DB.getUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx > -1) {
      const current = users[idx].status;
      users[idx].status = current === 'Active' ? 'Blocked' : 'Active';
      DB.saveUsers(users);
      alert(`ইউজার স্ট্যাটাস পরিবর্তন করা হয়েছে!`);
      handleRoute();
    }
  }
  window.toggleUserStatus = toggleUserStatus;

  function openAddUserModal() {
    const modal = document.getElementById('global-modal-overlay');
    const content = document.getElementById('global-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="modal-header">
        <h3>নতুন ইউজার যুক্ত করুন</h3>
        <button class="btn-close-drawer" onclick="closeGlobalModal()"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <form class="form-grid">
          <div class="form-group">
            <label class="form-label">সম্পূর্ণ নাম: <span style="color:var(--accent-color)">*</span></label>
            <input type="text" class="form-input" id="new-user-fullname" required placeholder="নাম">
          </div>
          <div class="form-group">
            <label class="form-label">ইমেইল / ইউজারনেম: <span style="color:var(--accent-color)">*</span></label>
            <input type="email" class="form-input" id="new-user-email" required placeholder="ইমেইল">
          </div>
          <div class="form-group">
            <label class="form-label">পাসওয়ার্ড: <span style="color:var(--accent-color)">*</span></label>
            <input type="password" class="form-input" id="new-user-password" required placeholder="পাসওয়ার্ড">
          </div>
          <div class="form-group">
            <label class="form-label">রোল নির্ধারণ:</label>
            <select class="form-select" id="new-user-role">
              <option value="Customer">গ্রাহক (Customer)</option>
              <option value="Manager">ম্যানেজার (Manager)</option>
              <option value="Admin">অ্যাডমিন (Admin)</option>
            </select>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeGlobalModal()">বাতিল</button>
        <button class="btn btn-primary" id="save-new-user-btn">যোগ করুন</button>
      </div>
    `;

    modal.style.display = 'flex';
    lucide.createIcons();

    document.getElementById('save-new-user-btn')?.addEventListener('click', () => {
      const name = document.getElementById('new-user-fullname').value.trim();
      const email = document.getElementById('new-user-email').value.trim();
      const pass = document.getElementById('new-user-password').value.trim();
      const role = document.getElementById('new-user-role').value;

      if (!name || !email || !pass) {
        alert('অনুগ্রহ করে সব তথ্য দিন!');
        return;
      }

      const users = DB.getUsers();
      if (users.some(u => u.email === email)) {
        alert('দুঃখিত, এই ইমেইল দিয়ে ইতিপূর্বে অ্যাকাউন্ট তৈরি করা হয়েছে!');
        return;
      }

      users.push({ name, email, password: pass, role, status: 'Active' });
      DB.saveUsers(users);
      alert('নতুন ইউজার সফলভাবে যুক্ত করা হয়েছে!');
      closeGlobalModal();
      renderAdminUsers(document.getElementById('admin-content-area'));
    });
  }

  // Site Settings & Color/Theme customization view
  function renderAdminSettings(container) {
    const settings = DB.getSettings();

    container.innerHTML = `
      <div class="checkout-layout">
        <!-- Site configuration form -->
        <div class="checkout-card">
          <h3 class="checkout-title"><i data-lucide="settings"></i> সাইট সেটিংস</h3>
          
          <form class="form-grid" onsubmit="event.preventDefault();">
            <div class="form-group">
              <label class="form-label">সাইটের নাম (Site Title):</label>
              <input type="text" class="form-input" id="setting-site-title" value="${settings.siteName || ''}">
            </div>
            
            <div class="form-group">
              <label class="form-label">সাইট ট্যাগলাইন (Tagline):</label>
              <input type="text" class="form-input" id="setting-site-tagline" value="${settings.siteTagline || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">হটলাইন যোগাযোগ নাম্বার:</label>
              <input type="text" class="form-input" id="setting-site-phone" value="${settings.contactPhone || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">যোগাযোগ ইমেইল:</label>
              <input type="email" class="form-input" id="setting-site-email" value="${settings.contactEmail || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">ফেসবুক সোশ্যাল লিংক:</label>
              <input type="text" class="form-input" id="setting-site-fb" value="${settings.socialFb || ''}">
            </div>
          </form>
        </div>

        <!-- Color/Theme Customization Side Panel -->
        <div class="checkout-card" style="height:fit-content;">
          <h3 class="checkout-title"><i data-lucide="palette"></i> থিম কালার কাস্টমাইজেশন</h3>
          
          <form class="form-grid" onsubmit="event.preventDefault();">
            <div class="form-group">
              <label class="form-label">Primary Theme Color:</label>
              <div class="theme-settings-color-picker">
                <input type="color" class="color-input-field" id="setting-theme-color-picker" value="${settings.themeColor || '#0f766e'}">
                <input type="text" class="color-input-text" id="setting-theme-color-hex" value="${settings.themeColor || '#0f766e'}" readonly>
              </div>
              <small style="color:var(--text-tertiary)">হেডার, প্রধান বাটন এবং সাইটের অ্যাক্টিভ লিঙ্ক সমূহের রং।</small>
            </div>

            <div class="form-group">
              <label class="form-label">Accent Color:</label>
              <div class="theme-settings-color-picker">
                <input type="color" class="color-input-field" id="setting-accent-color-picker" value="${settings.accentColor || '#e11d48'}">
                <input type="text" class="color-input-text" id="setting-accent-color-hex" value="${settings.accentColor || '#e11d48'}" readonly>
              </div>
              <small style="color:var(--text-tertiary)">ডিসকাউন্ট ব্যাজ, অফার বাটন এবং বাতিল স্ট্যাটাসের রং।</small>
            </div>

            <button class="btn btn-primary" id="save-site-settings-btn" style="width:100%; margin-top:20px;">সকল সেটিংস সংরক্ষণ করুন</button>
          </form>
        </div>
      </div>
    `;

    // Colors binding
    const primaryPicker = document.getElementById('setting-theme-color-picker');
    const primaryHex = document.getElementById('setting-theme-color-hex');
    const accentPicker = document.getElementById('setting-accent-color-picker');
    const accentHex = document.getElementById('setting-accent-color-hex');

    primaryPicker?.addEventListener('input', e => {
      primaryHex.value = e.target.value;
    });

    accentPicker?.addEventListener('input', e => {
      accentHex.value = e.target.value;
    });

    // Save site configurations
    document.getElementById('save-site-settings-btn')?.addEventListener('click', () => {
      const siteName = document.getElementById('setting-site-title').value.trim();
      const siteTagline = document.getElementById('setting-site-tagline').value.trim();
      const contactPhone = document.getElementById('setting-site-phone').value.trim();
      const contactEmail = document.getElementById('setting-site-email').value.trim();
      const socialFb = document.getElementById('setting-site-fb').value.trim();

      const themeColor = primaryPicker.value;
      const accentColor = accentPicker.value;

      const currentSettings = DB.getSettings();
      currentSettings.siteName = siteName;
      currentSettings.siteTagline = siteTagline;
      currentSettings.contactPhone = contactPhone;
      currentSettings.contactEmail = contactEmail;
      currentSettings.socialFb = socialFb;
      currentSettings.themeColor = themeColor;
      currentSettings.accentColor = accentColor;

      DB.saveSettings(currentSettings);
      
      // Update UI theme colors dynamically
      updateThemeColors();

      alert('সাইট এবং থিম সেটিংস সফলভাবে সংরক্ষিত ও কার্যকর হয়েছে!');
    });

    lucide.createIcons();
  }


  // ==========================================
  // AUTOCMPLETE SEARCH / LIVE SUGGESTIONS
  // ==========================================
  const searchInput = document.getElementById('live-search-input');
  const suggestionsBox = document.getElementById('search-suggestions-dropdown');

  searchInput?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    
    if (!q) {
      suggestionsBox.style.display = 'none';
      return;
    }

    const products = DB.getProducts();
    // Search by title or description
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

    if (filtered.length === 0) {
      suggestionsBox.innerHTML = `<div class="suggestion-no-results">কোনো মিল পাওয়া যায়নি!</div>`;
      suggestionsBox.style.display = 'block';
      return;
    }

    suggestionsBox.innerHTML = filtered.map(prod => `
      <div class="suggestion-item" data-id="${prod.id}">
        <img src="${prod.images && prod.images.length > 0 ? prod.images[0] : 'https://placehold.co/40x40'}" class="suggestion-img" onerror="this.src='https://placehold.co/40x40'">
        <div class="suggestion-info">
          <h4>${prod.name}</h4>
          <p>৳${toBanglaNum(prod.sellingPrice)}</p>
        </div>
      </div>
    `).join('');

    suggestionsBox.style.display = 'block';
  });

  // Handle click on suggestions items
  suggestionsBox?.addEventListener('click', e => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const prodId = item.getAttribute('data-id');
      if (searchInput) searchInput.value = '';
      suggestionsBox.style.display = 'none';
      navigate(`/product/${prodId}`);
    }
  });

  // Close search suggestions on outer click
  document.addEventListener('click', e => {
    if (suggestionsBox && !e.target.closest('.search-container')) {
      suggestionsBox.style.display = 'none';
    }
  });


  // Global Modals utilities
  function closeGlobalModal() {
    const modal = document.getElementById('global-modal-overlay');
    if (modal) modal.style.display = 'none';
  }
  window.closeGlobalModal = closeGlobalModal;


  // Initialize on window loading
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('DOMContentLoaded', () => {
    updateThemeColors();
    updateCartIconBadge();
    handleRoute();
  });

})();
