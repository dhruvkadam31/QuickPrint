# 🖨️ QuickPrint

A real-time two-sided printing platform connecting users with local print vendors.

---

## 🏗️ Architecture

```
quickprint/
├── frontend/          # Vite + React (User UI + Vendor UI)
└── backend/           # Node.js + Express + MongoDB + Socket.io
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB running locally (`mongod`)
- Firebase project (for user auth)

---

### 1. Clone & Setup

```bash
git clone https://github.com/YOUR_USERNAME/quickprint.git
cd quickprint
```

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Edit `src/firebase.js` with your Firebase project config, then:

```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

### 4. Create a Vendor Account

Use the API or a tool like Postman/Thunder Client:

```bash
POST http://localhost:5000/vendor/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "vendor@test.com",
  "password": "password123",
  "shopName": "QuickPrint Shop",
  "phone": "9999999999"
}
```

Then log in at: `http://localhost:5173/vendor/login`

---

## 📁 Project Structure

### Frontend (`src/`)

```
pages/
  user/
    Login.jsx         # Firebase Sign In / Sign Up
    Upload.jsx        # 4-step: Upload → Config → Vendor → Pay
    MyOrders.jsx      # Real-time order tracking

  vendor/
    Login.jsx         # Backend JWT login
    Dashboard.jsx     # Stats, revenue, recent orders
    Orders.jsx        # Full order management (Queued→Printing→Ready)
    Pickup.jsx        # OTP verification for pickup
    Settings.jsx      # Pricing + shop open/close

components/
  user/UserNavbar.jsx
  vendor/VendorLayout.jsx

services/
  api.js             # All Axios calls (single source of truth)
  socket.js          # Socket.io singleton

contexts/
  AuthContext.jsx    # Firebase auth state

styles/
  global.css         # Full design system
```

### Backend

```
server.js            # Express + Socket.io + MongoDB
models/
  Vendor.js
  Order.js
controllers/
  vendor.controller.js
  order.controller.js
routes/
  vendor.routes.js
  order.routes.js
middleware/
  auth.js            # JWT verification
config/
  multer.js          # File upload config
uploads/             # Uploaded files stored here
```

---

## 🔄 Order Lifecycle

```
Queued → Printing → Ready → Picked Up
```

- **Queued** — Order placed, waiting for vendor
- **Printing** — Vendor clicked "Start Printing"
- **Ready** — Vendor clicked "Mark as Ready", user notified
- **Picked Up** — Vendor verified OTP, order complete

---

## ⚡ Real-time Events (Socket.io)

| Event | Direction | Description |
|---|---|---|
| `vendor-online` | Client→Server | Vendor logged in |
| `vendor-offline` | Client→Server | Vendor logged out |
| `vendor-status-change` | Server→All | Shop open/close |
| `order-created` | Server→All | New order placed |
| `order-updated` | Server→All | Status changed |

---

## 🔐 Auth System

| Role | Method | Storage |
|---|---|---|
| User | Firebase Email/Password | Firebase session |
| Vendor | Backend JWT | `localStorage` |

---

## 💰 Pricing

- Platform commission: **10%** per order
- Vendor earnings: **90%** per order
- Pricing set per vendor in Settings

---

## 🔮 Future Features

- [ ] Razorpay production integration
- [ ] ML page count detection
- [ ] Push notifications (order ready)
- [ ] Admin panel
- [ ] Multi-file PDF merge
- [ ] Smart queue / wait time prediction

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vite, React 18, React Router v6 |
| Styling | Custom CSS (no Tailwind) |
| Auth (User) | Firebase Authentication |
| Auth (Vendor) | JWT + bcrypt |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| File Upload | Multer |
| Notifications | react-hot-toast |
