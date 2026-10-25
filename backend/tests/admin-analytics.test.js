const test = require("node:test");
const assert = require("node:assert/strict");

test("financial margin calculations: 10% platform margin and 90% vendor payout", () => {
  const grossRevenue = 5000;
  const refundedAmount = 500;
  const netRevenue = Math.max(0, grossRevenue - refundedAmount);

  const platformCommission = +(netRevenue * 0.10).toFixed(2);
  const vendorPayouts = +(netRevenue - platformCommission).toFixed(2);

  assert.equal(netRevenue, 4500);
  assert.equal(platformCommission, 450);
  assert.equal(vendorPayouts, 4050);
  assert.equal(platformCommission + vendorPayouts, netRevenue);
});

test("zero revenue edge case: handles empty database without NaN or division by zero", () => {
  const totalOrders = 0;
  const cancelledCount = 0;
  const cancellationRate = totalOrders > 0
    ? Math.round((cancelledCount / totalOrders) * 100 * 10) / 10
    : 0;

  assert.equal(cancellationRate, 0);

  const grossRevenue = 0;
  const refundedAmount = 0;
  const netRevenue = Math.max(0, grossRevenue - refundedAmount);
  const platformCommission = +(netRevenue * 0.10).toFixed(2);
  const vendorPayouts = +(netRevenue - platformCommission).toFixed(2);

  assert.equal(platformCommission, 0);
  assert.equal(vendorPayouts, 0);
});

test("order status distribution correctly partitions counts across states", () => {
  const orders = [
    { status: "Queued", estimatedPrice: 100 },
    { status: "Printing", estimatedPrice: 150 },
    { status: "Ready", estimatedPrice: 80 },
    { status: "Picked Up", estimatedPrice: 200 },
    { status: "Cancelled", estimatedPrice: 120, refundAmount: 120, paymentStatus: "refunded" },
  ];

  let queued = 0, printing = 0, ready = 0, completed = 0, cancelled = 0, gross = 0, refunds = 0;

  orders.forEach((o) => {
    if (o.status === "Queued") queued++;
    else if (o.status === "Printing") printing++;
    else if (o.status === "Ready") ready++;
    else if (o.status === "Picked Up") completed++;
    else if (o.status === "Cancelled") {
      cancelled++;
      refunds += (o.refundAmount || 0);
    }

    if (o.status !== "Cancelled") {
      gross += o.estimatedPrice;
    }
  });

  assert.equal(queued, 1);
  assert.equal(printing, 1);
  assert.equal(ready, 1);
  assert.equal(completed, 1);
  assert.equal(cancelled, 1);
  assert.equal(queued + printing, 2); // Pipeline count
  assert.equal(gross, 530); // 100 + 150 + 80 + 200
  assert.equal(refunds, 120);

  const net = gross - refunds;
  assert.equal(net, 410);
  assert.equal(+(net * 0.10).toFixed(2), 41);
  assert.equal(+(net * 0.90).toFixed(2), 369);
});
