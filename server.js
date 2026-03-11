import dns from 'dns';
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dns.setServers(['8.8.8.8', '8.8.4.4']); // Forces Google DNS

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"]
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.log("MongoDB connection error:", err.message));

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    mobile: String,
    password: String,
    balance: { type: Number, default: 10000 },
    creditScore: { type: Number, default: 750 }
});

const User = mongoose.model("User", userSchema);

// Signup route
app.post("/signup", async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            mobile,
            password: hashedPassword
        });

        await user.save();
        res.status(201).json({ success: true, message: "User created successfully" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
});

// Login route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(400).json({ success: false, message: "Incorrect password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({
            success: true,
            token,
            user: {
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                balance: user.balance,
                creditScore: user.creditScore
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Dashboard route
app.get("/dashboard", async (req, res) => {
    try {

        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        res.json({
            success: true,
            balance: user.balance,
            creditScore: user.creditScore,
            name: user.name,
            email: user.email,
            mobile: user.mobile
        });

    } catch (err) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});

// Middleware to verify token - Reuse this for all protected routes
const authenticate = (req, res, next) => {

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    console.log("AUTH HEADER:", req.headers.authorization)

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch {
        res.status(400).json({ success: false, message: "Invalid Token" });
    }
};
// Deposit Route
app.post("/deposit", authenticate, async (req, res) => {
    const { amount } = req.body;
    
    // Basic validation to ensure amount is a positive number
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid deposit amount" });
    }

    try {
        const user = await User.findById(req.user.id);
        
        // Add the amount to current balance
        user.balance += parseInt(amount);
        await user.save();
        
        res.json({ success: true, balance: user.balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
// Withdraw Route
app.post("/withdraw", authenticate, async (req, res) => {
    const amount = parseInt(req.body.amount);
    try {
        const user = await User.findById(req.user.id);
        if (user.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient balance" });
        }
        user.balance -= amount;
        await user.save();
        res.json({ success: true, balance: user.balance });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));