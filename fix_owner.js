const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// We need a service account. Does the user have one?
// If not, we can't use firebase-admin.
