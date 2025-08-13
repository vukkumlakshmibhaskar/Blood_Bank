const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Setup Nodemailer transporter with certificate fix
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Fix: Allow self-signed certs (only for development)
  },
});

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email address is required." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    await db.query("DELETE FROM otps WHERE email = ?", [email]);
    await db.query(
      "INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)",
      [email, otp, expires_at]
    );

    await transporter.sendMail({
      from: `"LifeBlood App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Verification Code for LifeBlood",
      text: `Your one-time password (OTP) is: ${otp}`,
      html: `<b>Your one-time password (OTP) is: ${otp}</b><p>It is valid for 10 minutes.</p>`,
    });

    res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    console.error("Error sending email OTP:", error);
    res.status(500).json({ message: "Failed to send OTP email." });
  }
};

exports.register = async (req, res) => {
  const { email, otp, password, fullName, phoneNumber, address, bloodGroup } =
    req.body;
  try {
    const [rows] = await db.query(
      "SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()",
      [email, otp]
    );
    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid or expired OTP." });

    const [userExists] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (userExists.length > 0)
      return res
        .status(400)
        .json({ message: "User with this email already exists." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const role = email === "admin@app.com" ? "admin" : "user";

    await db.query(
      "INSERT INTO users (email, password, full_name, phone_number, address, blood_group, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, fullName, phoneNumber, address, bloodGroup, role]
    );

    await db.query("DELETE FROM otps WHERE email = ?", [email]);

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials." });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phone_number,
        address: user.address,
        bloodGroup: user.blood_group,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error." });
  }
};
