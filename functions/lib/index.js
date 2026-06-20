"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderStatusChanged = exports.onOrderAccepted = exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
admin.initializeApp();
// Hardcoded for development, BUT usually you store these in Google Cloud Secret Manager or Firebase env config.
// The frontend will use the test key ID directly.
const RAZORPAY_KEY_ID = 'rzp_test_T3DIONNmFaZFaU';
const RAZORPAY_KEY_SECRET = 'E2b64gGLcqIJpIc0wHVeNhnJ';
const razorpayInstance = new razorpay_1.default({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
});
/**
 * Creates a Razorpay Order ID securely from the backend.
 * Expects the frontend to send the calculated total amount in rupees.
 */
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
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
            amount: Math.round(amountInRupees * 100),
            currency: "INR",
            receipt: receiptId || `rcpt_${Date.now()}`
        };
        const order = await razorpayInstance.orders.create(options);
        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        };
    }
    catch (error) {
        console.error('Error creating Razorpay order:', error);
        throw new functions.https.HttpsError('internal', 'Unable to create Razorpay order', error.message);
    }
});
/**
 * Verifies the Razorpay payment signature.
 */
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
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
            if ((orderData === null || orderData === void 0 ? void 0 : orderData.customerUid) !== context.auth.uid) {
                throw new functions.https.HttpsError('permission-denied', 'You do not have permission to verify this order.');
            }
            const firestoreAmountInPaise = Math.round(parseFloat((orderData === null || orderData === void 0 ? void 0 : orderData.totalAmount) || '0') * 100);
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
        }
        else {
            throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature.');
        }
    }
    catch (error) {
        console.error('Error verifying Razorpay signature:', error);
        throw new functions.https.HttpsError('internal', 'Error verifying signature.', error.message);
    }
});
/**
 * Auto-transitions orders to PREPARING 25 seconds after ACCEPTED.
 */
exports.onOrderAccepted = functions.firestore.document('orders/{orderId}').onUpdate(async (change, context) => {
    var _a;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status !== 'ACCEPTED' && after.status === 'ACCEPTED') {
        // Wait 25 seconds
        await new Promise(resolve => setTimeout(resolve, 25000));
        // Re-fetch to check if still ACCEPTED
        const updatedSnap = await change.after.ref.get();
        if (updatedSnap.exists && ((_a = updatedSnap.data()) === null || _a === void 0 ? void 0 : _a.status) === 'ACCEPTED') {
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
exports.onOrderStatusChanged = functions.firestore.document('orders/{orderId}').onUpdate(async (change, context) => {
    var _a, _b;
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status)
        return;
    const db = admin.firestore();
    // Send to Customer
    const customerUid = after.customerUid;
    if (customerUid) {
        const userSnap = await db.collection('users').doc(customerUid).get();
        const fcmToken = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (fcmToken) {
            let title = "Order Update";
            let body = `Your order status changed to ${after.status}`;
            if (after.status === 'ACCEPTED') {
                title = "Order Accepted! 👨‍🍳";
                body = "The restaurant has accepted your order and is preparing it.";
            }
            else if (after.status === 'READY') {
                title = "Order Ready! 🎒";
                body = "Your food is ready and waiting for a delivery partner.";
            }
            else if (after.status === 'OUT_FOR_DELIVERY') {
                title = "Out for Delivery! 🛵";
                body = "Your delivery partner is on the way.";
            }
            else if (after.status === 'DELIVERED') {
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
        const riderToken = (_b = riderSnap.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
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
//# sourceMappingURL=index.js.map