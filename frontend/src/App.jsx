import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// User pages
import UserLogin from "./pages/user/Login";
import Upload from "./pages/user/Upload";
import MyOrders from "./pages/user/MyOrders";

// Vendor pages
import VendorLogin from "./pages/vendor/Login";
import VendorDashboard from "./pages/vendor/Dashboard";
import VendorOrders from "./pages/vendor/Orders";
import VendorPickup from "./pages/vendor/Pickup";
import VendorSettings from "./pages/vendor/Settings";

// Route guards
function UserRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function VendorRoute({ children }) {
  const token = localStorage.getItem("vendorToken");
  return token ? children : <Navigate to="/vendor/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* User Routes */}
      <Route path="/" element={<UserLogin />} />
      <Route path="/upload" element={<UserRoute><Upload /></UserRoute>} />
      <Route path="/my-orders" element={<UserRoute><MyOrders /></UserRoute>} />

      {/* Vendor Routes */}
      <Route path="/vendor/login" element={<VendorLogin />} />
      <Route path="/vendor/dashboard" element={<VendorRoute><VendorDashboard /></VendorRoute>} />
      <Route path="/vendor/orders" element={<VendorRoute><VendorOrders /></VendorRoute>} />
      <Route path="/vendor/pickup" element={<VendorRoute><VendorPickup /></VendorRoute>} />
      <Route path="/vendor/settings" element={<VendorRoute><VendorSettings /></VendorRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
