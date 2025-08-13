const express = require("express");
const router = express.Router();
const { sendOtp, register, login } = require("../controllers/authController");

router.post("/send-otp", sendOtp);
router.post("/register", register);
router.post("/login", login);

module.exports = router;
