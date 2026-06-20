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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, firestore_order_id } = data;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !firestore_order_id) {
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
      // Payment signature is valid. Now verify the amount and update Firestore securely.
      const db = admin.firestore();
      const orderRef = db.collection('orders').doc(firestore_order_id);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found in database.');
      }
      
      const orderData = orderDoc.data();
      
      // Ownership validation
      if (orderData?.customerUid !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'You do not have permission to verify this order.');
      }
      
      const firestoreAmountInPaise = Math.round(parseFloat(orderData?.totalAmount || '0') * 100);
      const rzpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);
      
      if (rzpOrder.amount !== firestoreAmountInPaise) {
        console.error(`Amount mismatch. Razorpay: ${rzpOrder.amount}, Firestore: ${firestoreAmountInPaise}`);
        throw new functions.https.HttpsError('invalid-argument', 'Payment amount mismatch. Potential fraud detected.');
      }
      
      await orderRef.update({
         status: 'PLACED',
         paymentStatus: 'PAID',
         razorpayPaymentId: razorpay_payment_id,
         razorpayOrderId: razorpay_order_id,
         updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true, message: "Payment verified securely." };
    } else {
      throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature.');
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay signature:', error);
    throw new functions.https.HttpsError('internal', 'Error verifying signature.', error.message);
  }
});

/**
 * Razorpay Webhook (True Failsafe)
 * Razorpay calls this securely in the background when a payment is captured.
 */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // Razorpay sends the signature in the headers
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = 'anjani_secret_webhook_123'; // The user should set this in Razorpay Dashboard

  if (!signature) {
    res.status(400).send('Missing signature');
    return;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Webhook signature mismatch!');
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body.event;
    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = req.body.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      
      // We need to find the Firestore order that matches this Razorpay order ID.
      // Since we stored the receipt ID as the firestore order ID in createRazorpayOrder...
      const receiptId = req.body.payload.order?.entity?.receipt;

      if (receiptId) {
        const db = admin.firestore();
        const orderRef = db.collection('orders').doc(receiptId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          const data = orderSnap.data();
          if (data?.status === 'PAYMENT_PENDING') {
            await orderRef.update({
              status: 'PLACED',
              paymentStatus: 'PAID',
              razorpayPaymentId: paymentId,
              razorpayOrderId: orderId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Webhook successfully fulfilled order ${receiptId}`);
          }
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
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
