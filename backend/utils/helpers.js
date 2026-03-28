// utils/helpers.js
const initializeDefaultVendors = async (vendorsCollection) => {
  try {
    const existingVendors = await vendorsCollection.find().toArray();

    if (existingVendors.length === 0) {
      const defaultVendors = [
        {
          vendorId: "VEN001",
          name: "City Center Print Hub",
          email: "vendor1@quickprint.com",
          password: "admin123",
          address: "123 Main Street, City Center",
          phone: "+91 9876543210",
          services: ["Print", "Lamination", "Photo Binding"],
          isActive: true,
          shopOpen: false,
          isOnline: false,
          createdAt: new Date(),
        },
        {
          vendorId: "VEN002",
          name: "University Print Station",
          email: "vendor2@quickprint.com",
          password: "admin456",
          address: "456 College Road",
          phone: "+91 9876543211",
          services: ["Print", "Lamination", "College Pages"],
          isActive: true,
          shopOpen: false,
          isOnline: false,
          createdAt: new Date(),
        }
      ];

      await vendorsCollection.insertMany(defaultVendors);
      console.log("✅ Default vendors inserted");
    } else {
      console.log("ℹ️ Vendors already exist");
    }

  } catch (err) {
    console.error("❌ Error initializing vendors:", err);
  }
};

module.exports = {
  initializeDefaultVendors
};