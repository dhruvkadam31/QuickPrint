// utils/helpers.js
const initializeDefaultVendors = async (vendorsCollection) => {
  try {
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
        shopOpen: true,
        commissionRate: 10,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        vendorId: "VEN002", 
        name: "University Print Station",
        email: "vendor2@quickprint.com",
        password: "admin456",
        address: "456 College Road, Near University Campus",
        phone: "+91 9876543211",
        services: ["Print", "Lamination", "College Pages"],
        isActive: true,
        shopOpen: true,
        commissionRate: 10,
        createdAt: new Date(),
        lastLogin: null
      }
    ];

    for (const vendor of defaultVendors) {
      const existingVendor = await vendorsCollection.findOne({ vendorId: vendor.vendorId });
      if (!existingVendor) {
        await vendorsCollection.insertOne(vendor);
        console.log(`✅ Created vendor: ${vendor.name} (${vendor.vendorId})`);
      } else {
        await vendorsCollection.updateOne(
          { vendorId: vendor.vendorId },
          { $set: { 
            password: vendor.password,
            email: vendor.email,
            isActive: true,
            shopOpen: true 
          }}
        );
        console.log(`✅ Updated vendor: ${vendor.name} (${vendor.vendorId})`);
      }
    }
    
    console.log("✅ Default vendors initialized/updated");
    const vendorCount = await vendorsCollection.countDocuments();
    console.log(`📊 Total vendors in database: ${vendorCount}`);
  } catch (err) {
    console.error("❌ Error initializing vendors:", err);
  }
};

module.exports = {
  initializeDefaultVendors
};