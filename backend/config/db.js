const { MongoClient } = require("mongodb");

let db;
let ordersCollection;

async function connectToMongoDB() {
  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
  await client.connect();

  db = client.db("printing_service");
  ordersCollection = db.collection("orders");

  console.log("✅ Connected to MongoDB");
  return { db, ordersCollection };
}

function getOrdersCollection() {
  return ordersCollection;
}

module.exports = { connectToMongoDB, getOrdersCollection };