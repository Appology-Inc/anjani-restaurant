/**
 * @fileoverview Main Express API entry point for Anjani Razorpay Server.
 * Handles Razorpay order creation and payment verification securely, 
 * updating the Firestore database upon successful payment.
 */

const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin securely from Environment Variables
// This ensures that the backend can update Firestore securely.
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error);
  }
}

// Initialize Razorpay client with API keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret'
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Health check endpoint.
 * @name get/api/health
 * @function
 * @param {express.Request} req - Express request object.
 * @param {express.Response} res - Express response object.
 */
// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Anjani Finance Server is running securely.' });
});

/**
 * Creates a Razorpay order before initiating payment.
 * Payment Flow Step 1: Client calls this to generate a Razorpay order ID.
 * @name post/api/createOrder
 * @function
 * @async
 * @param {express.Request} req - Express request object containing amount and receipt.
 * @param {express.Response} res - Express response object.
 */
// Endpoint 1: Create Order
app.post('/api/createOrder', async (req, res) => {
  try {
    const { amount, receipt } = req.body; 
    
    // Convert amount to paise as Razorpay expects the smallest currency unit
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    // Make an API call to Razorpay to create the order
    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ error: 'Failed to generate Razorpay order' });
    }

    // Return the generated order details including the key
    res.status(200).json({
      ...order,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy'
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verifies the Razorpay payment signature after successful payment.
 * Payment Flow Step 2: Client sends signature details received from Razorpay.
 * We verify the signature securely on the backend to prevent tampering.
 * If valid, the Firestore database is updated to reflect the PAID status.
 * @name post/api/verifyPayment
 * @function
 * @async
 * @param {express.Request} req - Express request object containing signature details.
 * @param {express.Response} res - Express response object.
 */
// Endpoint 2: Verify Payment
app.post('/api/verifyPayment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, firestore_order_id } = req.body;
    
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
    
    // Signature Verification Logic:
    // Generate an HMAC-SHA256 hash using the razorpay_order_id and razorpay_payment_id separated by '|'
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const expectedSignature = hmac.digest('hex');

    // Compare the expected signature with the one received from Razorpay
    if (expectedSignature === razorpay_signature) {
      // Payment is completely valid and authentic
      
      // Update the database securely from the backend
      // This prevents clients from spoofing payment success directly in Firestore
      if (firestore_order_id && admin.apps.length > 0) {
         const db = admin.firestore();
         await db.collection('orders').doc(firestore_order_id).update({
            status: 'PLACED',
            paymentStatus: 'PAID',
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
         });
      }

      res.status(200).json({ success: true, message: "Payment verified and order updated" });
    } else {
      res.status(400).json({ success: false, error: "Invalid signature. Potential fraud attempt." });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
