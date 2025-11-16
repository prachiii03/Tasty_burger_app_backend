const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');

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

// ✅ Create payment
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
      merchantTransactionId,
      paymentStatus: 'pending' // ✅ Set initial payment status
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

// ✅ Check payment status
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

// ✅ IMPROVED: Handle callback from PhonePe
router.post("/callback", async (req, res) => {
  try {
    console.log("📩 PhonePe Callback Received:", JSON.stringify(req.body, null, 2));
    
    const { response } = req.body;
    
    if (!response) {
      console.error("❌ No response in callback");
      return res.status(400).json({ 
        success: false, 
        message: "No response data received" 
      });
    }

    // Decode the base64 response
    const decodedResponse = Buffer.from(response, 'base64').toString('utf8');
    console.log("🔍 Decoded callback response:", decodedResponse);
    
    const paymentData = JSON.parse(decodedResponse);
    console.log("📊 Parsed payment data:", JSON.stringify(paymentData, null, 2));
    
    const { merchantTransactionId, transactionId, amount, code, state } = paymentData.data;
    
    if (!merchantTransactionId) {
      console.error("❌ No merchantTransactionId in callback");
      return res.status(400).json({ 
        success: false, 
        message: "No transaction ID received" 
      });
    }

    // Find order by merchantTransactionId
    const order = await Order.findOne({ merchantTransactionId });
    
    if (!order) {
      console.error(`❌ Order not found for merchantTransactionId: ${merchantTransactionId}`);
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    console.log(`🔍 Found order: ${order._id}, current payment status: ${order.paymentStatus}`);

    // Update order based on payment status
    let updatedOrder;
    if (code === 'PAYMENT_SUCCESS' || state === 'COMPLETED') {
      updatedOrder = await Order.findByIdAndUpdate(
        order._id,
        {
          paymentStatus: 'completed',
          status: 'confirmed',
          phonepeTransactionId: transactionId,
          isPaid: true,
          paidAt: new Date()
        },
        { new: true }
      );
      
      console.log(`✅ Payment successful for order: ${order._id}`);
      console.log(`💰 Transaction ID: ${transactionId}, Amount: ${amount}`);
      console.log(`📋 Updated order:`, JSON.stringify(updatedOrder, null, 2));
      
    } else if (code === 'PAYMENT_ERROR' || state === 'FAILED') {
      updatedOrder = await Order.findByIdAndUpdate(
        order._id,
        {
          paymentStatus: 'failed',
          status: 'payment_failed'
        },
        { new: true }
      );
      console.log(`❌ Payment failed for order: ${order._id}`);
    } else {
      console.log(`⚠️ Unknown payment status - Code: ${code}, State: ${state}`);
    }

    // Send success response to PhonePe
    res.status(200).json({
      success: true,
      message: "Callback processed successfully",
      code: code || state
    });

  } catch (err) {
    console.error("❌ Callback processing error:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "Callback processing failed",
      error: err.message 
    });
  }
});

// ✅ ENHANCED: Add direct status check endpoint
router.get("/order-status/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // If payment is completed, return full order details
    if (order.paymentStatus === 'completed') {
      return res.json({
        success: true,
        data: {
          _id: order._id,
          paymentStatus: order.paymentStatus,
          status: order.status,
          paymentMethod: order.paymentMethod,
          merchantTransactionId: order.merchantTransactionId,
          totalPrice: order.totalPrice,
          isPaid: order.isPaid,
          paidAt: order.paidAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        paymentStatus: order.paymentStatus,
        status: order.status,
        paymentMethod: order.paymentMethod,
        merchantTransactionId: order.merchantTransactionId
      }
    });
  } catch (err) {
    console.error("Order status check error:", err);
    res.status(500).json({
      success: false,
      message: "Error checking order status"
    });
  }
});

module.exports = router;