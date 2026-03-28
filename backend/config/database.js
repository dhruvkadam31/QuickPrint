const { MongoClient } = require('mongodb');
const { initializeDefaultVendors } = require('../utils/helpers'); // Add this import

let db;
let ordersCollection;
let vendorsCollection;

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    // ✅ FIRST assign DB + collections
    db = client.db("printing_service");
    ordersCollection = db.collection("orders");
    vendorsCollection = db.collection("vendors");

    // ✅ THEN use it
    

    console.log("✅ Added isOnline field to all vendors");

    // Initialize default vendors
    await initializeDefaultVendors(vendorsCollection);

    return { db, ordersCollection, vendorsCollection };

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

const getCollections = () => ({ ordersCollection, vendorsCollection });

module.exports = { connectToMongoDB, getCollections };