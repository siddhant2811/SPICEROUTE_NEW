
let products = [];

const cart = [];
let selectedProduct = null;
let selectedQuantity = 1;
let activeCategory = "all";
let currentCustomer = null;

const API = "/api";
const TOKEN_KEY = "spiceRouteToken";
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const grid = $("#product-grid");
const searchInput = $("#search-spices");
const customizeModal = $("#customize-modal");
const cartModal = $("#cart-modal");
const packSize = $("#pack-size");
const heatLevel = $("#heat-level");
const instructions = $("#special-instructions");
const customPrice = $("#custom-price");
const quantityDisplay = $("#product-quantity");
const cartItems = $("#cart-items");
const cartTotal = $("#cart-total");

function formatPrice(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function showToast(message, error = false) {
    let toast = $("#spice-toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "spice-toast";
        toast.style.cssText = `
            position:fixed;bottom:25px;left:50%;
            transform:translateX(-50%);padding:14px 24px;
            border-radius:12px;color:white;z-index:20000;
            font-size:14px;box-shadow:0 5px 20px #0003;
            max-width:90%;text-align:center;
        `;
        document.body.appendChild(toast);
    }

    toast.style.background = error ? "#a83232" : "#466b32";
    toast.textContent = message;
    toast.hidden = false;

    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.hidden = true, 3000);
}

// ==================== LOAD PRODUCTS FROM MONGODB ====================

async function loadProducts() {
    try {
        const response = await fetch(`${API}/products`);
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.products)) {
            throw new Error(data.message || "Unable to load products.");
        }

        products = data.products.map(product => ({
            ...product,
            id: product._id,
            productId: product._id
        }));

        renderProducts();
        console.log("Products loaded from MongoDB:", products.length);

    } catch (error) {
        console.error("Product loading error:", error);
        showToast("Could not load products from database. Please refresh.", true);
    }
}

// ==================== CUSTOMER LOGIN AND SIGNUP ====================

function createAuthModal() {
    if ($("#auth-modal")) return;

    const modal = document.createElement("div");
    modal.id = "auth-modal";

    modal.style.cssText = `
        display:none;position:fixed;inset:0;z-index:15000;
        background:#0009;backdrop-filter:blur(5px);
        align-items:center;justify-content:center;padding:15px;
    `;

    modal.innerHTML = `
        <div style="background:#fffaf2;padding:30px;border-radius:20px;
        width:100%;max-width:410px;box-sizing:border-box;
        position:relative;box-shadow:0 15px 50px #0004;">

            <button id="auth-close" style="position:absolute;right:17px;
            top:12px;border:0;background:none;font-size:27px;cursor:pointer;">×</button>

            <div style="text-align:center;font-size:35px;">🌶️</div>
            <h2 id="auth-title" style="text-align:center;color:#713b20;">Welcome Back!</h2>
            <p id="auth-description" style="text-align:center;color:#796c60;">
                Login to continue shopping with Spice Route.
            </p>

            <form id="auth-form">
                <div id="auth-name-box" style="display:none;">
                    <label>Full Name</label>
                    <input id="auth-name" type="text" placeholder="Enter your name"
                    style="width:100%;padding:12px;box-sizing:border-box;
                    border:1px solid #ddcbb8;border-radius:9px;margin:7px 0 13px;">
                </div>

                <label>Email Address</label>
                <input id="auth-email" type="email" required
                placeholder="Enter your email"
                style="width:100%;padding:12px;box-sizing:border-box;
                border:1px solid #ddcbb8;border-radius:9px;margin:7px 0 13px;">

                <label>Password</label>
                <input id="auth-password" type="password" required minlength="6"
                placeholder="Enter your password"
                style="width:100%;padding:12px;box-sizing:border-box;
                border:1px solid #ddcbb8;border-radius:9px;margin:7px 0 13px;">

                <p id="auth-error" style="color:#b52e2e;font-size:13px;"></p>

                <button id="auth-submit" type="submit"
                style="width:100%;padding:14px;background:#974b25;color:white;
                border:0;border-radius:10px;font-weight:bold;cursor:pointer;">
                    Login
                </button>
            </form>

            <p style="text-align:center;color:#796c60;margin-top:20px;">
                <span id="auth-switch-text">New to Spice Route?</span>
                <button id="auth-toggle" style="border:0;background:none;
                color:#974b25;font-weight:bold;cursor:pointer;">Sign Up</button>
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    $("#auth-close").onclick = closeAuth;
    modal.onclick = e => {
        if (e.target === modal) closeAuth();
    };

    $("#auth-toggle").onclick = () => {
        authMode = authMode === "login" ? "signup" : "login";
        updateAuthView();
    };

    $("#auth-form").onsubmit = handleAuth;
}

let authMode = "login";

function updateAuthView() {
    const signup = authMode === "signup";

    $("#auth-title").textContent = signup ? "Create Your Account" : "Welcome Back!";
    $("#auth-description").textContent = signup
        ? "Join Spice Route and enjoy fresh spices."
        : "Login to continue shopping with Spice Route.";

    $("#auth-name-box").style.display = signup ? "block" : "none";
    $("#auth-name").required = signup;
    $("#auth-submit").textContent = signup ? "Create Account" : "Login";

    $("#auth-switch-text").textContent = signup
        ? "Already have an account?" : "New to Spice Route?";

    $("#auth-toggle").textContent = signup ? "Login" : "Sign Up";
    $("#auth-error").textContent = "";
}

function openAuth(mode = "login") {
    authMode = mode;
    updateAuthView();
    $("#auth-modal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeAuth() {
    $("#auth-modal").style.display = "none";
    document.body.style.overflow = "";
}

async function handleAuth(e) {
    e.preventDefault();

    const name = $("#auth-name").value.trim();
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const button = $("#auth-submit");

    button.disabled = true;
    button.textContent = "Please wait...";

    try {
        const endpoint = authMode === "signup" ? "signup" : "login";

        const response = await fetch(`${API}/auth/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
                authMode === "signup"
                    ? { name, email, password }
                    : { email, password }
            )
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Authentication failed.");
        }

        localStorage.setItem(TOKEN_KEY, data.token);
        currentCustomer = data.customer;

        updateLoginButton();
        closeAuth();
        showToast(data.message || "Welcome to Spice Route!");

    } catch (error) {
        $("#auth-error").textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = authMode === "signup" ? "Create Account" : "Login";
    }
}

function updateLoginButton() {
    const button = $("#login-button");
    if (!button) return;

    button.textContent = currentCustomer
        ? currentCustomer.name.split(" ")[0] + " (Logout)"
        : "Login / Sign Up";
}

async function checkCustomer() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        currentCustomer = null;
        updateLoginButton();
        return;
    }

    try {
        const response = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok || !data.success) throw new Error("Login expired");

        currentCustomer = data.customer;
    } catch (error) {
        localStorage.removeItem(TOKEN_KEY);
        currentCustomer = null;
    }

    updateLoginButton();
}

// ==================== PRODUCT DISPLAY ====================

function renderProducts() {
    grid.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";
        card.dataset.category = product.category;
        card.dataset.name = product.name;

        const image = document.createElement("img");
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        image.onerror = () => {
            console.error("Image not found:", product.image);
        };

        const info = document.createElement("div");
        info.className = "product-info";

        const category = document.createElement("span");
        category.className = "product-category";
        category.textContent = {
            ground: "GROUND SPICE",
            whole: "WHOLE SPICE",
            masala: "MASALA BLEND",
            herbs: "HERBS & SEEDS",
            seasoning: "SALT & SEASONING"
        }[product.category] || "SPICE";

        const heading = document.createElement("h3");
        heading.textContent = product.name;

        const description = document.createElement("p");
        description.textContent = product.description;

        const bottom = document.createElement("div");
        bottom.className = "product-bottom";

        const price = document.createElement("strong");
        price.textContent = formatPrice(product.price);

        const small = document.createElement("small");
        small.textContent = " / 100 g";
        price.appendChild(small);

        const button = document.createElement("button");
        button.className = "customize-button";
        button.textContent = "Customize";
        button.onclick = () => openCustomization(product);

        bottom.append(price, button);
        info.append(category, heading, description, bottom);
        card.append(image, info);
        grid.appendChild(card);
    });

    filterProducts();
}

function filterProducts() {
    const query = searchInput.value.trim().toLowerCase();
    let count = 0;

    $$(".product-card").forEach(card => {
        const matchName = card.dataset.name.toLowerCase().includes(query);
        const matchText = card.textContent.toLowerCase().includes(query);
        const matchCategory = activeCategory === "all" ||
            card.dataset.category === activeCategory;

        card.hidden = !(matchName || matchText) || !matchCategory;

        if (!card.hidden) count++;
    });

    $("#no-products").hidden = count > 0;
    $("#product-count").textContent =
        `Showing ${count} of ${products.length} products`;
}

// ==================== CUSTOMIZATION ====================

function openCustomization(product) {
    selectedProduct = product;
    selectedQuantity = 1;

    $("#modal-image").src = product.image;
    $("#modal-image").alt = product.name;
    $("#modal-product-name").textContent = product.name;
    $("#modal-description").textContent = product.description;

    packSize.value = "100";
    quantityDisplay.textContent = "1";
    heatLevel.value = "Not applicable";
    instructions.value = "";

    $$('input[name="addon"]').forEach(i => i.checked = false);
    $$('input[name="grind"]').forEach(i => i.checked = false);

    const defaultGrind = product.category === "whole" ? "Whole" : "Fine powder";
    const grind = $('input[name="grind"][value="' + defaultGrind + '"]');

    if (grind) grind.checked = true;

    heatLevel.disabled = !product.name.toLowerCase().includes("chilli");

    updateCustomPrice();
    customizeModal.hidden = false;
    document.body.style.overflow = "hidden";
}

function closeCustomization() {
    customizeModal.hidden = true;
    document.body.style.overflow = "";
}

function getAddons() {
    return Array.from($$('input[name="addon"]:checked')).map(input => ({
        name: input.value,
        price: Number(input.dataset.price)
    }));
}

function calculatePrice() {
    if (!selectedProduct) return 0;

    const base = selectedProduct.price * Number(packSize.value) / 100;
    const addons = getAddons().reduce((sum, item) => sum + item.price, 0);

    return Math.round(base + addons);
}

function updateCustomPrice() {
    customPrice.textContent = formatPrice(calculatePrice() * selectedQuantity);
}

$("#close-modal").onclick = closeCustomization;

customizeModal.addEventListener("click", e => {
    if (e.target === customizeModal) closeCustomization();
});

$("#quantity-minus").onclick = () => {
    if (selectedQuantity > 1) {
        selectedQuantity--;
        quantityDisplay.textContent = selectedQuantity;
        updateCustomPrice();
    }
};

$("#quantity-plus").onclick = () => {
    if (selectedQuantity < 99) {
        selectedQuantity++;
        quantityDisplay.textContent = selectedQuantity;
        updateCustomPrice();
    }
};

packSize.addEventListener("change", updateCustomPrice);

$$('input[name="addon"]').forEach(input => {
    input.addEventListener("change", updateCustomPrice);
});

$("#add-customized-item").onclick = () => {
    if (!selectedProduct) return;

    const grind = $('input[name="grind"]:checked');

    cart.push({
        id: Date.now() + Math.random(),
        productId: selectedProduct._id,
        name: selectedProduct.name,
        grams: Number(packSize.value),
        grind: grind ? grind.value : "Fine powder",
        heat: heatLevel.value,
        addons: getAddons(),
        instructions: instructions.value.trim(),
        price: calculatePrice(),
        quantity: selectedQuantity
    });

    updateCartCount();
    closeCustomization();
    showToast(selectedProduct.name + " added to your cart!");
};

// ==================== CART ====================

function updateCartCount() {
    $("#cart-count").textContent =
        cart.reduce((sum, item) => sum + item.quantity, 0);
}

function renderCart() {
    cartItems.innerHTML = "";

    if (!cart.length) {
        cartItems.innerHTML =
            '<p class="empty-cart">Your cart is empty. Explore our spices to get started!</p>';
        cartTotal.textContent = formatPrice(0);
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;

        const row = document.createElement("div");
        row.className = "cart-item";

        const heading = document.createElement("h3");
        heading.textContent = item.name;

        const details = document.createElement("p");
        const addons = item.addons.map(a => a.name);

        details.textContent =
            `${item.grams} g · ${item.grind}` +
            (item.heat !== "Not applicable" ? " · " + item.heat : "") +
            (addons.length ? " · " + addons.join(", ") : "") +
            (item.instructions ? " · Note: " + item.instructions : "");

        const bottom = document.createElement("div");
        bottom.className = "cart-item-bottom";

        const price = document.createElement("strong");
        price.textContent =
            `${formatPrice(item.price)} × ${item.quantity} = ${formatPrice(item.price * item.quantity)}`;

        const remove = document.createElement("button");
        remove.className = "remove-item";
        remove.textContent = "Remove";

        remove.onclick = () => {
            const index = cart.findIndex(x => x.id === item.id);
            if (index !== -1) cart.splice(index, 1);
            updateCartCount();
            renderCart();
        };

        bottom.append(price, remove);
        row.append(heading, details, bottom);
        cartItems.appendChild(row);
    });

    cartTotal.textContent = formatPrice(total);
}

$("#open-cart").onclick = () => {
    renderCart();
    cartModal.hidden = false;
    document.body.style.overflow = "hidden";
};

function closeCart() {
    cartModal.hidden = true;
    document.body.style.overflow = "";
}

$("#close-cart").onclick = closeCart;

cartModal.addEventListener("click", e => {
    if (e.target === cartModal) closeCart();
});

// ==================== CATEGORY FILTERS ====================

searchInput.addEventListener("input", filterProducts);

$$(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
        activeCategory = button.dataset.category;

        $$(".filter-button").forEach(b => {
            b.classList.toggle("active", b === button);
        });

        filterProducts();
    });
});

// ==================== LOGIN / LOGOUT ====================

$("#login-button").onclick = () => {
    if (currentCustomer) {
        if (confirm("Do you want to logout?")) {
            localStorage.removeItem(TOKEN_KEY);
            currentCustomer = null;
            updateLoginButton();
            showToast("Logged out successfully.");
        }
    } else {
        openAuth("login");
    }
};

// ==================== CHECKOUT PLACEHOLDER ====================
// The next step adds the full address, COD and UPI checkout interface.
// The current backend requires a delivery address before accepting orders.

$("#checkout-button").onclick = () => {
    if (!cart.length) {
        showToast("Your cart is empty!", true);
        return;
    }

    if (!currentCustomer) {
        closeCart();
        openAuth("login");
        showToast("Please login before checkout.");
        return;
    }

    showToast("Next step: checkout address and payment screen.");
};

// ==================== CLOSE POPUPS ====================

document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        closeCustomization();
        closeCart();
        if ($("#auth-modal")) closeAuth();
    }
});

// ==================== START WEBSITE ====================

createAuthModal();
checkCustomer();
updateCartCount();
loadProducts();
