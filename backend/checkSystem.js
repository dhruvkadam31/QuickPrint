require('dotenv').config();
const { MongoClient } = require('mongodb');
const axios = require('axios');

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017";

const runCheck = async () => {
  console.log("🚀 FULL SYSTEM DIAGNOSTIC STARTED\n");

  try {
    // =========================
    // 1️⃣ DB CONNECTION
    // =========================
    const client = new MongoClient(URI);
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db("printing_service");
    const vendorsCollection = db.collection("vendors");

    // =========================
    // 2️⃣ FETCH RAW DB DATA
    // =========================
    const vendors = await vendorsCollection.find({}).toArray();

    console.log("\n📦 RAW DB VENDORS:", vendors.length);

    vendors.forEach(v => {
      console.log("\n----------------------------");
      console.log("🏪", v.vendorId, "-", v.name);
      console.log("shopOpen:", v.shopOpen);
      console.log("isOnline:", v.isOnline);
      console.log("isActive:", v.isActive);
    });

    // =========================
    // 3️⃣ EXPECTED LOGIC
    // =========================
    const expectedVisible = vendors.filter(v =>
      v.isActive && v.shopOpen && v.isOnline
    );

    console.log("\n🎯 EXPECTED VISIBLE VENDORS:", expectedVisible.length);
    expectedVisible.forEach(v =>
      console.log("👉", v.vendorId)
    );

    // =========================
    // 4️⃣ API CHECK
    // =========================
    console.log("\n🌐 Calling API: /vendor");

    const res = await axios.get("http://localhost:5000/vendor");

    if (!res.data.success) {
      console.log("❌ API failed");
      return;
    }

    const apiVendors = res.data.vendors;

    console.log("\n📡 API RETURNED:", apiVendors.length);
    apiVendors.forEach(v =>
      console.log("👉", v.vendorId)
    );

    // =========================
    // 5️⃣ COMPARE DB vs API
    // =========================
    const expectedIds = expectedVisible.map(v => v.vendorId).sort();
    const apiIds = apiVendors.map(v => v.vendorId).sort();

    console.log("\n🔍 COMPARISON:");

    console.log("Expected:", expectedIds);
    console.log("API:", apiIds);

    const mismatch =
      JSON.stringify(expectedIds) !== JSON.stringify(apiIds);

    if (mismatch) {
      console.log("\n❌ PROBLEM FOUND:");
      console.log("👉 API is NOT following DB logic");

      console.log("\n💡 Possible causes:");
      console.log("- Wrong filter in getAllVendors()");
      console.log("- isOnline not updated correctly");
      console.log("- Old cached data");
    } else {
      console.log("\n✅ API is working correctly");
    }

    // =========================
    // 6️⃣ FINAL DIAGNOSIS
    // =========================
    console.log("\n🧠 FINAL DIAGNOSIS:");

    if (expectedVisible.length === vendors.length) {
      console.log("👉 ALL vendors are marked ONLINE");
      console.log("👉 Root issue = isOnline never becoming false");
    }

    if (vendors.some(v => v.isOnline === undefined)) {
      console.log("👉 Some vendors missing isOnline field");
    }

    console.log("\n✅ CHECK COMPLETE\n");

    await client.close();

  } catch (err) {
    console.error("❌ SYSTEM CHECK FAILED:", err.message);
  }
};

runCheck();