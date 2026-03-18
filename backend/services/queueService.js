const { getCollections } = require('../config/database');
const { AVG_TIME_PER_ORDER } = require('../config/constants');

const calculateWaitTime = (queueLength) => {
  return queueLength * AVG_TIME_PER_ORDER;
};

const getQueuePosition = async (vendorId) => {
  const { ordersCollection } = getCollections();
  const queueCount = await ordersCollection.countDocuments({
    vendorId,
    status: { $in: ["Queued", "In Progress"] }
  });
  return queueCount + 1;
};

const getVendorQueue = async (vendorId) => {
  const { ordersCollection } = getCollections();
  return await ordersCollection.find({
    vendorId,
    status: { $in: ["Queued", "In Progress"] }
  }).sort({ createdAt: 1 }).toArray();
};

const getOrderQueueDetails = async (orderId) => {
  const { ordersCollection, vendorsCollection } = getCollections();
  
  const order = await ordersCollection.findOne({ orderId });
  if (!order) return null;

  const queueOrders = await getVendorQueue(order.vendorId);
  const position = queueOrders.findIndex(o => o.orderId === orderId) + 1;
  
  const vendor = await vendorsCollection.findOne({ vendorId: order.vendorId });
  const estimatedWaitTime = calculateWaitTime(position - 1);

  return {
    orderId,
    position,
    totalInQueue: queueOrders.length,
    estimatedWaitTime,
    vendorName: vendor?.name,
    ordersAhead: queueOrders.slice(0, position - 1).map(o => ({
      orderId: o.orderId,
      status: o.status,
      serviceType: o.serviceType
    })),
    currentStatus: order.status,
    lastUpdated: new Date()
  };
};

module.exports = {
  calculateWaitTime,
  getQueuePosition,
  getVendorQueue,
  getOrderQueueDetails
};