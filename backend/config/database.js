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
    
    db = client.db("printing_service");
    ordersCollection = db.collection("orders");
    vendorsCollection = db.collection("vendors");
    
    // Initialize default vendors
    await initializeDefaultVendors(vendorsCollection); // This line was causing the error
    
    return { db, ordersCollection, vendorsCollection };
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

const getCollections = () => ({ ordersCollection, vendorsCollection });

module.exports = { connectToMongoDB, getCollections };