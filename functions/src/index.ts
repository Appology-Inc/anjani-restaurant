import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

admin.initializeApp();

// Hardcoded for development, BUT usually you store these in Google Cloud Secret Manager or Firebase env config.
// The frontend will use the test key ID directly.
const RAZORPAY_KEY_ID = 'rzp_test_T3DIONNmFaZFaU';
const RAZORPAY_KEY_SECRET = 'E2b64gGLcqIJpIc0wHVeNhnJ';

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay Order ID securely from the backend.
 * Expects the frontend to send the calculated total amount in rupees.
 */
export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  // 1. Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to create payment.');
  }

  // 2. Validate data
  const { amountInRupees, receiptId } = data;
  if (!amountInRupees || amountInRupees <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid amount is required.');
  }

  // NOTE: Strict Cart Validation would go here in a production environment (fetching items from DB and checking prices).
  
  try {
    const options = {
      amount: Math.round(amountInRupees * 100), // Razorpay expects amount in paise (smallest currency unit)
      currency: "INR",
      receipt: receiptId || `rcpt_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);
    
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create Razorpay order', error.message);
  }
});

/**
 * Verifies the Razorpay payment signature.
 */
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to verify payment.');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing payment verification details.');
  }

  try {
    // Cryptographic verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      // Payment is verified. The frontend will now proceed to finalize the order in Firestore.
      return { success: true };
    } else {
      throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature.');
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay signature:', error);
    throw new functions.https.HttpsError('internal', 'Error verifying signature.', error.message);
  }
});

/**
 * Auto-transitions orders to PREPARING 25 seconds after ACCEPTED.
 */
export const onOrderAccepted = functions.firestore.document('orders/{orderId}').onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();

  if (before.status !== 'ACCEPTED' && after.status === 'ACCEPTED') {
    // Wait 25 seconds
    await new Promise(resolve => setTimeout(resolve, 25000));

    // Re-fetch to check if still ACCEPTED
    const updatedSnap = await change.after.ref.get();
    if (updatedSnap.exists && updatedSnap.data()?.status === 'ACCEPTED') {
      await change.after.ref.update({
        status: 'PREPARING',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Auto-transitioned order ${context.params.orderId} to PREPARING`);
    }
  }
});

/**
 * Send FCM Push Notifications on status change.
 */
export const onOrderStatusChanged = functions.firestore.document('orders/{orderId}').onUpdate(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();

  if (before.status === after.status) return;

  const db = admin.firestore();

  // Send to Customer
  const customerUid = after.customerUid;
  if (customerUid) {
    const userSnap = await db.collection('users').doc(customerUid).get();
    const fcmToken = userSnap.data()?.fcmToken;
    if (fcmToken) {
      let title = "Order Update";
      let body = `Your order status changed to ${after.status}`;
      
      if (after.status === 'ACCEPTED') {
        title = "Order Accepted! 👨‍🍳";
        body = "The restaurant has accepted your order and is preparing it.";
      } else if (after.status === 'READY') {
        title = "Order Ready! 🎒";
        body = "Your food is ready and waiting for a delivery partner.";
      } else if (after.status === 'OUT_FOR_DELIVERY') {
        title = "Out for Delivery! 🛵";
        body = "Your delivery partner is on the way.";
      } else if (after.status === 'DELIVERED') {
        title = "Delivered! 🎉";
        body = "Enjoy your meal from Anjani Kitchen!";
      }

      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: { orderId: context.params.orderId, status: after.status }
      }).catch(e => console.error("FCM Error customer:", e));
    }
  }

  // Send to Rider
  const riderUid = after.riderUid;
  if (riderUid && after.status === 'READY') {
    // Notify the assigned rider that it's ready for pickup
    const riderSnap = await db.collection('users').doc(riderUid).get();
    const riderToken = riderSnap.data()?.fcmToken;
    if (riderToken) {
      await admin.messaging().send({
        token: riderToken,
        notification: {
          title: "Pickup Ready! 🎒",
          body: `Order ${context.params.orderId.slice(-6)} is ready for pickup at the restaurant.`
        },
        data: { orderId: context.params.orderId, type: 'pickup_ready' }
      }).catch(e => console.error("FCM Error rider:", e));
    }
  }
});
