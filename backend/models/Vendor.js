class Vendor {
  constructor(data) {
    this.vendorId = data.vendorId;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.address = data.address;
    this.phone = data.phone;
    this.services = data.services || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.shopOpen = data.shopOpen !== undefined ? data.shopOpen : true;
    this.commissionRate = data.commissionRate || 10;
    this.createdAt = data.createdAt || new Date();
    this.lastLogin = data.lastLogin || null;
  }

  toJSON() {
    return {
      vendorId: this.vendorId,
      name: this.name,
      email: this.email,
      address: this.address,
      phone: this.phone,
      services: this.services,
      isActive: this.isActive,
      shopOpen: this.shopOpen,
      commissionRate: this.commissionRate
    };
  }
}

module.exports = Vendor;