const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");

router.get("/me", authenticate, authController.getMe);

module.exports = router;
