// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getUserProfile } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getUserProfile();
      setUser({ ...res.data.user, uid: res.data.user._id }); // Add uid for compatibility with existing code
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("userToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
