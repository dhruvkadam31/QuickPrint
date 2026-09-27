const admin = require("firebase-admin");

function getFirebaseAuth() {
  if (admin.apps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      throw new Error("Firebase Admin credentials are not configured");
    }
  }

  return admin.auth();
}

module.exports = { getFirebaseAuth };