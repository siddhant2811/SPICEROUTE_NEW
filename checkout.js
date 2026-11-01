
const checkoutAPI = "/api";
const checkoutToken = "spiceRouteToken";

function checkoutPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN");
}

function createCheckoutModal() {
    if (document.getElementById("checkout-modal")) return;

    const modal = document.createElement("div");
    modal.id = "checkout-modal";

    modal.style.cssText = `
        display:none;position:fixed;inset:0;z-index:18000;
        background:rgba(0,0,0,.65);padding:15px;
        align-items:center;justify-content:center;
        overflow-y:auto;
    `;

    modal.innerHTML = `
        <div style="background:#fffaf2;width:100%;max-width:560px;
        max-height:90vh;overflow-y:auto;padding:25px;
        border-radius:18px;box-sizing:border-box;color:#422719;">

            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;color:#713b20;">Checkout</h2>
                <button id="checkout-close" style="border:0;background:none;
                font-size:27px;cursor:pointer;">×</button>
            </div>

            <p style="color:#796c60;">Enter your delivery details.</p>

            <form id="checkout-form">

                <label>Full Name</label>
                <input id="delivery-name" required
                style="width:100%;padding:12px;margin:7px 0 14px;
                box-sizing:border-box;border:1px solid #ddcbb8;border-radius:8px;">

                <label>Phone Number</label>
                <input id="delivery-phone" type="tel" required
                pattern="[6-9][0-9]{9}" maxlength="10"
                placeholder="10-digit mobile number"
                style="width:100%;padding:12px;margin:7px 0 14px;
                box-sizing:border-box;border:1px solid #ddcbb8;border-radius:8px;">

                <label>Complete Delivery Address</label>
                <textarea id="delivery-address" required rows="3"
                placeholder="House number, street, area, city"
                style="width:100%;padding:12px;margin:7px 0 14px;
                box-sizing:border-box;border:1px solid #ddcbb8;border-radius:8px;"></textarea>

                <label>PIN Code</label>
                <input id="delivery-pincode" type="text" required
                pattern="[1-9][0-9]{5}" maxlength="6"
                placeholder="6-digit PIN code"
                style="width:100%;padding:12px;margin:7px 0 14px;
                box-sizing:border-box;border:1px solid #ddcbb8;border-radius:8px;">

                <h3>Payment Method</h3>

                <label style="display:block;margin:12px 0;">
                    <input type="radio" name="payment-method" value="COD" checked>
                    Cash on Delivery
                </label>

                <label style="display:block;margin:12px 0;">
                    <input type="radio" name="payment-method" value="UPI Demo">
                    UPI Demo Payment
                </label>

                <div style="background:#f1e4d4;padding:16px;
                border-radius:12px;margin:18px 0;">

                    <h3 style="margin-top:0;">Order Summary</h3>

                    <div id="checkout-items"></div>

                    <hr>

                    <p>Subtotal:
                        <strong id="checkout-subtotal"></strong>
                    </p>

                    <p>GST (5%):
                        <strong id="checkout-gst"></strong>
                    </p>

                    <p>Delivery:
                        <strong id="checkout-delivery"></strong>
                    </p>

                    <h3 style="color:#974b25;">
                        Total: <span id="checkout-total"></span>
                    </h3>
                </div>

                <p id="checkout-error" style="color:#b52e2e;"></p>

                <button id="place-order-button" type="submit"
                style="width:100%;padding:15px;background:#974b25;
                color:white;border:0;border-radius:10px;
                font-weight:bold;font-size:16px;cursor:pointer;">
                    Place Order
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("checkout-close").onclick = closeCheckout;

    modal.addEventListener("click", e => {
        if (e.target === modal) closeCheckout();
    });

    document.getElementById("checkout-form").onsubmit = submitCheckout;
}

function closeCheckout() {
    const modal = document.getElementById("checkout-modal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
}

function calculateCheckoutTotal() {
    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const gst = Math.round(subtotal * 0.05);
    const delivery = subtotal >= 999 ? 0 : 50;
    const total = subtotal + gst + delivery;

    return { subtotal, gst, delivery, total };
}

function updateCheckoutSummary() {
    const itemsBox = document.getElementById("checkout-items");
    itemsBox.innerHTML = "";

    cart.forEach(item => {
        const line = document.createElement("p");
        line.textContent =
            `${item.name} (${item.grams} g) × ${item.quantity}`;
        itemsBox.appendChild(line);
    });

    const totals = calculateCheckoutTotal();

    document.getElementById("checkout-subtotal").textContent =
        checkoutPrice(totals.subtotal);

    document.getElementById("checkout-gst").textContent =
        checkoutPrice(totals.gst);

    document.getElementById("checkout-delivery").textContent =
        totals.delivery === 0 ? "FREE" : checkoutPrice(totals.delivery);

    document.getElementById("checkout-total").textContent =
        checkoutPrice(totals.total);
}

function openCheckout() {
    if (!cart.length) {
        showToast("Your cart is empty!", true);
        return;
    }

    if (!currentCustomer) {
        closeCart();
        openAuth("login");
        showToast("Please login before checkout.", true);
        return;
    }

    document.getElementById("delivery-name").value =
        currentCustomer.name || "";

    updateCheckoutSummary();

    document.getElementById("checkout-error").textContent = "";
    document.getElementById("checkout-modal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function submitCheckout(e) {
    e.preventDefault();

    const button = document.getElementById("place-order-button");
    const errorBox = document.getElementById("checkout-error");

    const paymentMethod = document.querySelector(
        'input[name="payment-method"]:checked'
    ).value;

    const shippingAddress = {
        name: document.getElementById("delivery-name").value.trim(),
        phone: document.getElementById("delivery-phone").value.trim(),
        address: document.getElementById("delivery-address").value.trim(),
        pincode: document.getElementById("delivery-pincode").value.trim()
    };

    const token = localStorage.getItem(checkoutToken);

    if (!token) {
        closeCheckout();
        openAuth("login");
        showToast("Please login again.", true);
        return;
    }

    const orderItems = cart.map(item => ({
        productId: item.productId,
        name: item.name,
        grams: item.grams,
        grind: item.grind,
        heat: item.heat,
        addons: item.addons.map(addon => addon.name),
        instructions: item.instructions,
        quantity: item.quantity
    }));

    button.disabled = true;
    button.textContent = "Placing order...";
    errorBox.textContent = "";

    try {
        const response = await fetch(`${checkoutAPI}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                items: orderItems,
                shippingAddress,
                paymentMethod
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Order could not be placed.");
        }

        const totals = calculateCheckoutTotal();

        if (paymentMethod === "UPI Demo") {
            showUPIDemo(data.order, totals.total);
        } else {
            showOrderSuccess(data.order, "Cash on Delivery");
        }

        cart.length = 0;
        updateCartCount();
        renderCart();
        closeCheckout();
        closeCart();

    } catch (error) {
        errorBox.textContent = error.message;
    } finally {
        button.disabled = false;
        button.textContent = "Place Order";
    }
}

function showOrderSuccess(order, paymentMethod) {
    const box = document.createElement("div");

    box.style.cssText = `
        position:fixed;inset:0;background:#0009;z-index:22000;
        display:flex;align-items:center;justify-content:center;padding:15px;
    `;

    box.innerHTML = `
        <div style="background:#fffaf2;padding:30px;border-radius:18px;
        max-width:420px;width:100%;text-align:center;color:#422719;">
            <div style="font-size:48px;">✅</div>
            <h2 style="color:#713b20;">Order Placed!</h2>
            <p>Your Spice Route order has been received.</p>
            <p>Order ID: ${order._id || order.orderId || "Created"}</p>
            <p>Payment: ${paymentMethod}</p>
            <p>Status: Pending</p>
            <button id="success-close" style="width:100%;padding:13px;
            background:#974b25;color:white;border:0;border-radius:9px;
            cursor:pointer;">Continue Shopping</button>
        </div>
    `;

    document.body.appendChild(box);

    document.getElementById("success-close").onclick = () => box.remove();
}

function showUPIDemo(order, total) {
    const box = document.createElement("div");

    box.style.cssText = `
        position:fixed;inset:0;background:#000b;z-index:23000;
        display:flex;align-items:center;justify-content:center;
        padding:15px;overflow-y:auto;
    `;

    box.innerHTML = `
        <div style="background:#fffaf2;padding:28px;border-radius:18px;
        max-width:420px;width:100%;text-align:center;color:#422719;
        max-height:90vh;overflow-y:auto;box-sizing:border-box;">

            <div style="font-size:42px;">📱</div>
            <h2 style="color:#713b20;">UPI Payment</h2>

            <h2 style="color:#974b25;">${checkoutPrice(total)}</h2>

            <div style="background:#f1e4d4;padding:18px;border-radius:12px;">

                <img src="images/QR.png.jpeg"
                     alt="Spice Route UPI QR Code"
                     style="width:220px;height:220px;max-width:100%;
                     object-fit:contain;background:white;
                     padding:8px;border-radius:10px;">

                <p style="font-weight:bold;margin-bottom:5px;">
                    Scan QR Code to Pay
                </p>

                <p style="font-size:13px;color:#796c60;">
                    Open any UPI app and scan the QR code.
                </p>
            </div>

            <p style="font-weight:bold;">
                Order ID: ${order._id || order.orderId || "Created"}
            </p>

            <p style="color:#a83232;font-size:13px;">
                Your payment will remain pending until it is verified.
            </p>

            <button id="demo-payment-done" style="width:100%;
            padding:13px;background:#974b25;color:white;border:0;
            border-radius:9px;cursor:pointer;">
                Done
            </button>

            <button id="demo-payment-close" style="width:100%;
            padding:12px;margin-top:9px;background:#eee;
            border:0;border-radius:9px;cursor:pointer;">
                Close
            </button>
        </div>
    `;

    const qrImage = box.querySelector("img");

    qrImage.onerror = function () {
        this.alt = "QR image not found. Check images/QR.png.jpeg";
        this.style.display = "none";
        this.insertAdjacentHTML(
            "afterend",
            '<p style="color:#b52e2e;">QR image not found. Please check the image filename and folder.</p>'
        );
    };

    document.body.appendChild(box);

    document.getElementById("demo-payment-done").onclick = () => {
        box.remove();
        showOrderSuccess(order, "UPI — awaiting payment verification");
    };

    document.getElementById("demo-payment-close").onclick = () => {
        box.remove();
    };
}

// Checkout button
document.getElementById("checkout-button").onclick = openCheckout;

createCheckoutModal();
