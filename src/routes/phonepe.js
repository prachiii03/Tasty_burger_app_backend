const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware'); // ✅ This is the correct import

const SALT = process.env.PHONEPE_SALT;
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const KEY_INDEX = process.env.PHONEPE_KEY_INDEX || 1;
const PHONEPE_BASE = process.env.PHONEPE_BASE_URL;
const API_PATH = "/pg/v1/pay";

// Generate checksum
function makeChecksum(payloadBase64) {
  const str = payloadBase64 + API_PATH + SALT;
  const sha256 = crypto.createHash("sha256").update(str).digest("hex");
  return sha256 + "###" + KEY_INDEX;
}

// ✅ Create payment - FIXED: Use 'protect' instead of 'authMiddleware'
router.post("/pay", protect, async (req, res) => {
  try {
    const { orderId, amount, mobile, name } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID and amount are required' 
      });
    }

    const merchantTransactionId = "T" + Date.now();

    // Update order with payment details
    await Order.findByIdAndUpdate(orderId, {
      paymentMethod: 'PHONEPE',
      merchantTransactionId
    });

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      name: name || "Food Order",
      amount: Math.round(amount * 100), // Convert to paise
      redirectUrl: `${process.env.FRONTEND_URL}/payment-status?orderId=${orderId}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${process.env.BACKEND_URL}/phonepe/callback`,
      mobileNumber: mobile || "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const checksum = makeChecksum(payloadBase64);

    const response = await axios.post(
      `${PHONEPE_BASE}${API_PATH}`,
      { request: payloadBase64 },
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );

    if (response.data.success) {
      res.json({ 
        success: true, 
        data: response.data.data,
        merchantTransactionId 
      });
    } else {
      throw new Error(response.data.message || 'Payment initiation failed');
    }
  } catch (err) {
    console.error("PhonePe Error:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      message: err.response?.data?.message || err.message 
    });
  }
});

// ✅ Check payment status - FIXED: Use 'protect' instead of 'authMiddleware'
router.post("/check-status", protect, async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;
    
    if (!merchantTransactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Transaction ID is required' 
      });
    }

    const url = `${PHONEPE_BASE}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
    const xVerify = crypto
      .createHash('sha256')
      .update(`/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}${SALT}`)
      .digest('hex') + `###${KEY_INDEX}`;

    const response = await axios.get(url, {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': MERCHANT_ID
      }
    });

    res.json({ 
      success: true, 
      data: response.data 
    });
  } catch (err) {
    console.error("Status check error:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      message: err.response?.data?.message || err.message 
    });
  }
});

// ✅ Handle callback from PhonePe
router.post("/callback", async (req, res) => {
  try {
    console.log("📩 PhonePe Callback Received:", req.body);
    
    const { response } = req.body;
    if (response) {
      const decodedResponse = Buffer.from(response, 'base64').toString('utf8');
      const paymentData = JSON.parse(decodedResponse);
      
      const { merchantTransactionId, transactionId, amount, code } = paymentData.data;
      
      // Find order by merchantTransactionId
      const order = await Order.findOne({ merchantTransactionId });
      
      if (order) {
        if (code === 'PAYMENT_SUCCESS') {
          order.paymentStatus = 'completed';
          order.status = 'processing';
          await order.save();
          console.log(`✅ Payment successful for order: ${order._id}`);
        } else {
          order.paymentStatus = 'failed';
          await order.save();
          console.log(`❌ Payment failed for order: ${order._id}`);
        }
      }
    }

    // Send success response to PhonePe
    res.status(200).json({
      success: true,
      message: "Callback processed successfully"
    });
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Callback processing failed" 
    });
  }
});

module.exports = router;