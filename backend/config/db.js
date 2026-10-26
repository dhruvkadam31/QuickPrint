const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

let db;
let ordersCollection;
let usersCollection;
let vendorsCollection;
let mlDataCollection;

async function seedInitialData() {
  try {


    // Seed default Admin if empty in users
    const adminUser = await usersCollection.findOne({ role: "ADMIN" });
    if (!adminUser) {
      console.log("🌱 Seeding default Admin user into MongoDB...");
      const adminPasswordHash = await bcrypt.hash("admin123", 10);
      await usersCollection.insertOne({
        userId: "ADMIN_001",
        name: "QuickPrint Admin",
        email: "admin@quickprint.com",
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        createdAt: new Date()
      });
      console.log("✅ Admin user seeded successfully.");
    }
  } catch (err) {
    console.error("⚠️ Error seeding initial MongoDB data:", err.message);
  }
}

async function connectToMongoDB() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const client = new MongoClient(mongoUri);
  await client.connect();

  db = client.db("printing_service");
  ordersCollection = db.collection("orders");
  usersCollection = db.collection("users");
  vendorsCollection = db.collection("vendors");
  mlDataCollection = db.collection("ml_data");

  console.log("✅ Connected to MongoDB database: printing_service");

  await seedInitialData();

  return { db, ordersCollection, usersCollection, vendorsCollection, mlDataCollection };
}

function getOrdersCollection() {
  return ordersCollection;
}

function getUsersCollection() {
  return usersCollection;
}

function getVendorsCollection() {
  return vendorsCollection;
}

function getMLDataCollection() {
  return mlDataCollection;
}

function getDb() {
  return db;
}

module.exports = { 
  connectToMongoDB, 
  getOrdersCollection,
  getUsersCollection,
  getVendorsCollection,
  getMLDataCollection,
  getDb
};