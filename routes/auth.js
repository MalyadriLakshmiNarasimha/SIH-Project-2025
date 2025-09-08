const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = "your-secret-key"; // ⚠️ Change in production

// ==================== Middleware ====================
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded; // { id, role }
    next();
  });
}

// ==================== Signup ====================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });

    await newUser.save();
    res.json({ message: "✅ User registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Server error while registering user" });
  }
});

// ==================== Login ====================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ error: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ message: "✅ Login successful", token, role: user.role });
});

// ==================== Profile ====================
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching profile" });
  }
});

// ==================== Doctor Dashboard ====================
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({ error: "Access denied: Doctors only" });
    }

    const doctor = await User.findById(req.user.id).select("-password");
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.json({
      message: "👨‍⚕️ Doctor Dashboard",
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      patientsCount: 12, // Example placeholder (replace with real data later)
      appointments: []   // Future: fetch appointments from DB
    });
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching dashboard" });
  }
});


module.exports = router;
