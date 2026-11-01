
const ordersAPI = "/api";
const ordersTokenKey = "spiceRouteToken";

function getOrdersToken() {
    return localStorage.getItem(ordersTokenKey);
}

// ADD MY ORDERS BUTTON BESIDE CART
function addOrdersButton() {
    const nav = document.querySelector(".navbar nav");

    if (!nav || document.getElementById("my-orders-button")) return;

    const button = document.createElement("button");
    button.id = "my-orders-button";
    button.type = "button";
    button.textContent = "My Orders";

    button.style.cssText = `
        background:#f5b942;
        color:#3b1b10;
        border:none;
        padding:10px 18px;
        border-radius:8px;
        cursor:pointer;
        font-size:14px;
        font-weight:600;
        margin-left:10px;
    `;

    button.onclick = openMyOrders;
    nav.appendChild(button);
}

// CREATE MY ORDERS MODAL
function createOrdersModal() {
    if (document.getElementById("my-orders-modal")) return;

    const modal = document.createElement("div");
    modal.id = "my-orders-modal";

    modal.style.cssText = `
        display:none;
        position:fixed;
        inset:0;
        background:rgba(0,0,0,0.65);
        z-index:10000;
        justify-content:center;
        align-items:center;
        padding:15px;
    `;

    modal.innerHTML = `
        <div style="
            background:#fffaf0;
            width:100%;
            max-width:750px;
            max-height:85vh;
            overflow-y:auto;
            padding:25px;
            border-radius:15px;
            color:#4b2e1e;
            position:relative;
        ">

            <button id="close-orders-modal" style="
                position:absolute;
                right:18px;
                top:15px;
                border:none;
                background:none;
                font-size:25px;
                cursor:pointer;
                color:#4b2e1e;
            ">&times;</button>

            <h2 style="margin-top:5px;">My Orders 🛍️</h2>

            <p style="color:#777;">
                View your Spice Route order history.
            </p>

            <div id="orders-list" style="margin-top:20px;">
                Loading your orders...
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("close-orders-modal").onclick = () => {
        modal.style.display = "none";
    };

    modal.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };
}

// OPEN MY ORDERS
async function openMyOrders() {
    const modal = document.getElementById("my-orders-modal");
    const list = document.getElementById("orders-list");

    modal.style.display = "flex";

    const token = getOrdersToken();

    if (!token) {
        list.innerHTML = `
            <p>Please login to view your orders.</p>
            <button id="orders-login-button" style="
                background:#8b4513;
                color:white;
                border:none;
                padding:10px 18px;
                border-radius:6px;
                cursor:pointer;
            ">Login</button>
        `;

        document.getElementById("orders-login-button").onclick = () => {
            modal.style.display = "none";
            document.getElementById("login-button")?.click();
        };

        return;
    }

    list.innerHTML = "<p>Loading your orders...</p>";

    try {
        const response = await fetch(`${ordersAPI}/orders`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to load orders.");
        }

        const orders = data.orders || data;

        if (!Array.isArray(orders) || orders.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:35px 10px;">
                    <h3>No orders yet!</h3>
                    <p>Your Spice Route orders will appear here.</p>
                </div>
            `;
            return;
        }

        window.spiceRouteOrders = orders;

        list.innerHTML = orders.map(order => {
            const orderId = order._id || order.id;
            const items = order.items || [];
            const address = order.shippingAddress || {};
            const total = order.total ?? order.totalAmount ?? 0;

            const date = order.createdAt
                ? new Date(order.createdAt).toLocaleString("en-IN")
                : "Date unavailable";

            return `
                <div style="
                    background:white;
                    border:1px solid #eadbc8;
                    border-radius:12px;
                    padding:18px;
                    margin-bottom:18px;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        flex-wrap:wrap;
                        gap:10px;
                    ">
                        <div>
                            <strong>
                                Order #${escapeOrderText(String(orderId).slice(-8))}
                            </strong>

                            <p style="font-size:13px;color:#777;margin:5px 0;">
                                ${escapeOrderText(date)}
                            </p>
                        </div>

                        <strong style="color:#a0522d;">
                            ₹${Number(total).toFixed(2)}
                        </strong>
                    </div>

                    <hr style="border:0;border-top:1px solid #eee;margin:12px 0;">

                    <strong>Items</strong>

                    <div style="margin-top:8px;">
                        ${items.map(item => `
                            <p style="margin:6px 0;font-size:14px;">
                                ${escapeOrderText(item.name || "Spice")}
                                — ${escapeOrderText(String(item.grams || ""))}g
                                × ${Number(item.quantity || 1)}
                            </p>
                        `).join("")}
                    </div>

                    <p style="margin:12px 0 5px;">
                        <strong>Order Status:</strong>
                        ${escapeOrderText(order.status || "Pending")}
                    </p>

                    <p style="margin:5px 0;">
                        <strong>Payment:</strong>
                        ${escapeOrderText(order.paymentStatus || "Pending")}
                    </p>

                    <p style="margin:5px 0;">
                        <strong>Payment Method:</strong>
                        ${escapeOrderText(order.paymentMethod || "Not available")}
                    </p>

                    <p style="font-size:13px;color:#777;margin-top:12px;">
                        Delivery:
                        ${escapeOrderText(address.address || "Address unavailable")},
                        ${escapeOrderText(address.pincode || "")}
                    </p>

                    <button
                        onclick="printOrderInvoice('${escapeOrderText(String(orderId))}')"
                        style="
                            background:#8b4513;
                            color:white;
                            border:none;
                            padding:10px 16px;
                            border-radius:6px;
                            cursor:pointer;
                            margin-top:10px;
                        "
                    >
                        Print Invoice
                    </button>

                </div>
            `;
        }).join("");

    } catch (error) {
        list.innerHTML = `
            <p style="color:#b00020;">
                ${escapeOrderText(error.message)}
            </p>

            <button onclick="openMyOrders()" style="
                background:#8b4513;
                color:white;
                border:none;
                padding:9px 15px;
                border-radius:6px;
                cursor:pointer;
            ">
                Try Again
            </button>
        `;
    }
}

// PROTECT TEXT DISPLAY
function escapeOrderText(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// PRINT ORDER INVOICE
function printOrderInvoice(orderId) {
    const orders = window.spiceRouteOrders || [];

    const order = orders.find(item =>
        String(item._id || item.id) === orderId
    );

    if (!order) {
        alert("Order details not found. Please refresh your orders.");
        return;
    }

    const items = order.items || [];
    const address = order.shippingAddress || {};

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Please allow pop-ups to print your invoice.");
        return;
    }

    const itemRows = items.map(item => `
        <tr>
            <td>${escapeOrderText(item.name || "Spice")}</td>
            <td>${escapeOrderText(String(item.grams || ""))}g</td>
            <td>${Number(item.quantity || 1)}</td>
        </tr>
    `).join("");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Spice Route Invoice</title>

            <style>
                body {
                    font-family:Arial,sans-serif;
                    padding:35px;
                    color:#333;
                }

                h1 {
                    color:#8b4513;
                }

                table {
                    width:100%;
                    border-collapse:collapse;
                    margin-top:20px;
                }

                th,td {
                    border:1px solid #ddd;
                    padding:12px;
                    text-align:left;
                }

                th {
                    background:#f5e8d8;
                }

                .details {
                    margin-top:25px;
                    line-height:1.8;
                }

                .total {
                    font-size:20px;
                    font-weight:bold;
                    margin-top:20px;
                }
            </style>
        </head>

        <body>

            <h1>SPICE ROUTE</h1>

            <p>Fresh Spices, Delivered to Your Doorstep</p>

            <hr>

            <h2>Order Invoice</h2>

            <p>
                <strong>Order ID:</strong>
                ${escapeOrderText(orderId)}
            </p>

            <p>
                <strong>Date:</strong>
                ${escapeOrderText(order.createdAt
                    ? new Date(order.createdAt).toLocaleString("en-IN")
                    : "Not available")}
            </p>

            <div class="details">
                <h3>Delivery Details</h3>

                <p>
                    ${escapeOrderText(address.name || "")}<br>
                    ${escapeOrderText(address.phone || "")}<br>
                    ${escapeOrderText(address.address || "")}<br>
                    ${escapeOrderText(address.pincode || "")}
                </p>
            </div>

            <h3>Order Items</h3>

            <table>
                <tr>
                    <th>Product</th>
                    <th>Weight</th>
                    <th>Quantity</th>
                </tr>

                ${itemRows}
            </table>

            <p class="total">
                Total Amount: ₹${Number(
                    order.total ?? order.totalAmount ?? 0
                ).toFixed(2)}
            </p>

            <p>
                <strong>Order Status:</strong>
                ${escapeOrderText(order.status || "Pending")}
            </p>

            <p>
                <strong>Payment Status:</strong>
                ${escapeOrderText(order.paymentStatus || "Pending")}
            </p>

            <hr>

            <p>Thank you for shopping with Spice Route!</p>

        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

// INITIALIZE ORDERS FEATURE
document.addEventListener("DOMContentLoaded", () => {
    createOrdersModal();
    addOrdersButton();
});



