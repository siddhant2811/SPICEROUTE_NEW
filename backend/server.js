
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "..")));

// ==================== DEFAULT PRODUCTS ====================

const defaultProducts = [
    { name: "Kashmiri Red Chilli Powder", price: 80, category: "ground", description: "Vibrant red chilli powder for colour and gentle heat.", image: "images/kashmiri-red-chilli-powder.jpg", stock: 100 },
    { name: "Turmeric (Haldi)", price: 60, category: "ground", description: "Golden turmeric with an earthy flavour.", image: "images/turmeric-haldi.jpg", stock: 100 },
    { name: "Coriander Powder", price: 50, category: "ground", description: "Aromatic coriander powder for curries and vegetables.", image: "images/coriander-powder.jpg", stock: 100 },
    { name: "Amchur (Dry Mango Powder)", price: 70, category: "ground", description: "Tangy dried mango powder for a fresh, sour flavour.", image: "images/amchur-dry-mango-powder.jpg", stock: 100 },
    { name: "Cumin Seeds (Jeera)", price: 70, category: "herbs", description: "Earthy cumin seeds for tempering and spice blends.", image: "images/cumin-seeds-jeera.jpg", stock: 100 },
    { name: "Green Cardamom", price: 180, category: "whole", description: "Fragrant green pods for chai, biryani and desserts.", image: "images/green-cardamom.jpg", stock: 100 },
    { name: "Black Pepper", price: 110, category: "whole", description: "Bold peppercorns with a sharp, warming flavour.", image: "images/black-pepper.jpg", stock: 100 },
    { name: "Cloves (Laung)", price: 130, category: "whole", description: "Richly aromatic cloves for chai and savoury dishes.", image: "images/cloves-laung.jpg", stock: 100 },
    { name: "Cinnamon Sticks (Dalchini)", price: 95, category: "whole", description: "Sweet and woody cinnamon sticks for cooking and tea.", image: "images/cinnamon-sticks-dalchini.jpg", stock: 100 },
    { name: "Garam Masala", price: 90, category: "masala", description: "A warming Indian spice blend for everyday cooking.", image: "images/garam-masala.jpg", stock: 100 },
    { name: "Chai Masala", price: 85, category: "masala", description: "A fragrant blend for a comforting cup of masala chai.", image: "images/chai-masala.jpg", stock: 100 },
    { name: "Biryani Masala", price: 100, category: "masala", description: "An aromatic blend for flavourful biryani.", image: "images/biryani-masala.jpg", stock: 100 },
    { name: "Sambar Masala", price: 75, category: "masala", description: "A traditional South Indian blend for sambar.", image: "images/sambar-masala.jpg", stock: 100 },
    { name: "Chole Masala", price: 80, category: "masala", description: "A bold, aromatic blend for Punjabi chickpea curry.", image: "images/chole-masala.jpg", stock: 100 },
    { name: "Kasuri Methi", price: 65, category: "herbs", description: "Dried fenugreek leaves with a distinctive aroma.", image: "images/kasuri-methi.jpg", stock: 100 },
    { name: "Fennel Seeds (Saunf)", price: 60, category: "herbs", description: "Sweet, fragrant fennel seeds for cooking and after meals.", image: "images/fennel-seeds-saunf.jpg", stock: 100 },
    { name: "Ajwain (Carom Seeds)", price: 70, category: "herbs", description: "Pungent carom seeds for parathas and savoury snacks.", image: "images/ajwain-carom-seeds.jpg", stock: 100 },
    { name: "Black Salt (Kala Namak)", price: 40, category: "seasoning", description: "Distinctive Indian black salt for chaats and fruit.", image: "images/black-salt-kala-namak.jpg", stock: 100 },
    { name: "Chaat Masala", price: 65, category: "seasoning", description: "A tangy seasoning for fruit, snacks and chaats.", image: "images/chaat-masala.jpg", stock: 100 },
    { name: "Rock Salt (Sendha Namak)", price: 35, category: "seasoning", description: "Natural-looking pink rock salt crystals for seasoning.", image: "images/rock-salt-sendha-namak.jpg", stock: 100 }
];

// ==================== CUSTOMER SCHEMA ====================

const customerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });

const Customer = mongoose.model("Customer", customerSchema);

// ==================== PRODUCT SCHEMA ====================

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "ground" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

// ==================== ORDER SCHEMA ====================

const orderSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    items: { type: Array, required: true },
    shippingAddress: { type: Object, default: {} },
    subtotal: { type: Number, required: true },
    gst: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "UPI Demo" },
    paymentStatus: { type: String, default: "Pending" },
    status: {
        type: String,
        enum: ["Pending", "Accepted", "Rejected", "Shipped", "Delivered"],
        default: "Pending"
    }
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

// ==================== TOKEN FUNCTIONS ====================

function generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// ==================== CUSTOMER AUTHENTICATION ====================

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Please login first." });
    }

    try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);

        if (!decoded.customerId || decoded.role === "admin") {
            return res.status(403).json({ success: false, message: "Customer access required." });
        }

        req.customerId = decoded.customerId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }
}

// ==================== ADMIN AUTHENTICATION ====================

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Admin login required." });
    }

    try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({ success: false, message: "Admin access denied." });
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Admin session expired. Please login again." });
    }
}

// ==================== CUSTOMER SIGNUP ====================

app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please fill in all fields." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must contain at least 6 characters." });
        }

        const existingCustomer = await Customer.findOne({ email: email.toLowerCase().trim() });

        if (existingCustomer) {
            return res.status(409).json({ success: false, message: "This email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const customer = await Customer.create({ name, email, password: hashedPassword });

        const token = generateToken({ customerId: customer._id });

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            token,
            customer: { id: customer._id, name: customer.name, email: customer.email }
        });
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.status(500).json({ success: false, message: "Unable to create account." });
    }
});

// ==================== CUSTOMER LOGIN ====================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please enter email and password." });
        }

        const customer = await Customer.findOne({ email: email.toLowerCase().trim() });

        if (!customer || !(await bcrypt.compare(password, customer.password))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const token = generateToken({ customerId: customer._id });

        res.json({
            success: true,
            message: "Login successful!",
            token,
            customer: { id: customer._id, name: customer.name, email: customer.email }
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ success: false, message: "Unable to login." });
    }
});

// ==================== GET CUSTOMER DETAILS ====================

app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
        const customer = await Customer.findById(req.customerId).select("-password");

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found." });
        }

        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to get customer details." });
    }
});

// ==================== GET PRODUCTS ====================

app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find({ active: true }).sort({ createdAt: 1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to retrieve products." });
    }
});

// ==================== ADD PRODUCT (ADMIN) ====================

app.post("/api/admin/products", authenticateAdmin, async (req, res) => {
    try {
        const { name, category, description, price, image, stock } = req.body;

        if (!name || price === undefined || Number(price) < 0 ||
            !Number.isFinite(Number(price)) ||
            !Number.isInteger(Number(stock)) || Number(stock) < 0) {
            return res.status(400).json({ success: false, message: "Enter a valid product name, price and stock." });
        }

        const product = await Product.create({
            name, category, description,
            price: Number(price),
            image: image || "",
            stock: Number(stock)
        });

        res.status(201).json({ success: true, message: "Product added successfully!", product });
    } catch (error) {
        console.error("Add Product Error:", error.message);
        res.status(500).json({ success: false, message: "Unable to add product." });
    }
});

// ==================== UPDATE PRODUCT (ADMIN) ====================

app.put("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        const allowedFields = ["name", "category", "description", "price", "image", "stock", "active"];
        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        }

        if (updates.price !== undefined) {
            updates.price = Number(updates.price);
            if (!Number.isFinite(updates.price) || updates.price < 0) {
                return res.status(400).json({ success: false, message: "Invalid product price." });
            }
        }

        if (updates.stock !== undefined) {
            updates.stock = Number(updates.stock);
            if (!Number.isInteger(updates.stock) || updates.stock < 0) {
                return res.status(400).json({ success: false, message: "Invalid stock quantity." });
            }
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        res.json({ success: true, message: "Product updated successfully!", product });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to update product." });
    }
});

// ==================== DELETE PRODUCT (ADMIN) ====================

app.delete("/api/admin/products/:id", authenticateAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        res.json({ success: true, message: "Product deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to delete product." });
    }
});

// ==================== ADMIN PRODUCT LIST ====================

app.get("/api/admin/products", authenticateAdmin, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to retrieve admin products." });
    }
});

// ==================== SAVE CUSTOMER ORDER ====================

app.post("/api/orders", authenticate, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Your cart is empty." });
        }

        const pincode = String(shippingAddress?.pincode || "").trim();

        if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone ||
            !shippingAddress.address || !/^[1-9][0-9]{5}$/.test(pincode)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid delivery address and 6-digit pincode."
            });
        }

        let subtotal = 0;
        const verifiedItems = [];

        for (const item of items) {
            const product = item.productId
                ? await Product.findById(item.productId)
                : await Product.findOne({ name: item.name, active: true });

            if (!product || !product.active) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.name || ""} is unavailable.`
                });
            }

            const quantity = Number(item.quantity);
            const grams = Number(item.grams || 100);

            if (!Number.isInteger(quantity) || quantity < 1 ||
                !Number.isFinite(grams) || grams < 1) {
                return res.status(400).json({ success: false, message: "Invalid product quantity or pack size." });
            }

            if (product.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} does not have enough stock.`
                });
            }

            const addonPrices = {
                "Gift packaging": 40,
                "Vacuum seal": 25,
                "Custom label": 30,
                "Sample sachet": 15
            };

            const addons = Array.isArray(item.addons)
                ? item.addons.filter(addon => Object.prototype.hasOwnProperty.call(addonPrices, addon))
                : [];

            const basePrice = Number((product.price * grams / 100).toFixed(2));
            const addonTotal = addons.reduce((sum, addon) => sum + addonPrices[addon], 0);
            const unitPrice = Number((basePrice + addonTotal).toFixed(2));
            const lineTotal = Number((unitPrice * quantity).toFixed(2));

            subtotal += lineTotal;

            verifiedItems.push({
                productId: product._id,
                name: product.name,
                grams,
                quantity,
                grind: item.grind || "Fine powder",
                heat: item.heat || "Not applicable",
                addons,
                instructions: String(item.instructions || "").slice(0, 500),
                price: unitPrice,
                lineTotal
            });
        }

        subtotal = Number(subtotal.toFixed(2));
        const gst = Number((subtotal * 0.05).toFixed(2));
        const deliveryFee = subtotal >= 999 ? 0 : 50;
        const totalAmount = Number((subtotal + gst + deliveryFee).toFixed(2));

        const order = await Order.create({
            customer: req.customerId,
            items: verifiedItems,
            shippingAddress: {
                name: String(shippingAddress.name).trim(),
                phone: String(shippingAddress.phone).trim(),
                address: String(shippingAddress.address).trim(),
                city: String(shippingAddress.city || "").trim(),
                state: String(shippingAddress.state || "").trim(),
                pincode
            },
            subtotal,
            gst,
            deliveryFee,
            totalAmount,
            paymentMethod: paymentMethod || "UPI Demo",
            paymentStatus: "Pending"
        });

        for (const item of verifiedItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }

        res.status(201).json({ success: true, message: "Order placed successfully!", order });
    } catch (error) {
        console.error("Order Error:", error.message);
        res.status(500).json({ success: false, message: "Unable to save order. Please try again." });
    }
});

// ==================== CUSTOMER ORDER HISTORY ====================

app.get("/api/orders", authenticate, async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.customerId }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to retrieve orders." });
    }
});

// ==================== ADMIN LOGIN ====================

app.post("/api/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Admin credentials are not configured in .env."
            });
        }

        if (!email || !password ||
            email.toLowerCase().trim() !== process.env.ADMIN_EMAIL.toLowerCase().trim() ||
            password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: "Invalid admin email or password." });
        }

        const token = generateToken({ role: "admin" });
        res.json({ success: true, message: "Admin login successful!", token });
    } catch (error) {
        res.status(500).json({ success: false, message: "Admin login failed." });
    }
});

// ==================== ADMIN VIEW ALL ORDERS ====================

app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("customer", "name email")
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to retrieve orders." });
    }
});

// ==================== ADMIN UPDATE ORDER STATUS ====================

app.put("/api/admin/orders/:id/status", authenticateAdmin, async (req, res) => {
    try {
        const allowedStatuses = ["Pending", "Accepted", "Rejected", "Shipped", "Delivered"];
        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid order status." });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Order status updated!", order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to update order status." });
    }
});

// ==================== ADMIN UPDATE PAYMENT STATUS ====================

app.put("/api/admin/orders/:id/payment", authenticateAdmin, async (req, res) => {
    try {
        const { paymentStatus } = req.body;

        if (!["Pending", "Paid", "Failed", "Refunded"].includes(paymentStatus)) {
            return res.status(400).json({ success: false, message: "Invalid payment status." });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus }, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Payment status updated!", order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to update payment status." });
    }
});

// ==================== HOME PAGE ====================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ==================== API HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Spice Route API is working" });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error("Please configure MONGO_URI and JWT_SECRET in your .env file.");
    process.exit(1);
}

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected Successfully!");

        const productCount = await Product.countDocuments();

        if (productCount === 0) {
            await Product.insertMany(defaultProducts);
            console.log("20 Spice Route products added to MongoDB!");
        } else {
            console.log(`MongoDB already contains ${productCount} products. Default products were not added again.`);
        }

        app.listen(PORT, () => {
            console.log(`Spice Route running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Server Startup Error:", error.message);
        process.exit(1);
    }
}

startServer();
