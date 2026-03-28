import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null); // 'user' or 'vendor'

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('user');
    const storedVendor = localStorage.getItem('vendor');
    const storedUserType = localStorage.getItem('userType');

    if (storedUser && storedUserType === 'user') {
      setUser(JSON.parse(storedUser));
      setUserType('user');
    } else if (storedVendor && storedUserType === 'vendor') {
      setVendor(JSON.parse(storedVendor));
      setUserType('vendor');
    }
    setLoading(false);
  }, []);

  // User login
  const userLogin = async (email, password) => {
    try {
      // Replace with your actual user login endpoint
      const response = await axios.post('http://localhost:5000/user/login', {
        email,
        password
      });
      
      const userData = response.data.user;
      setUser(userData);
      setUserType('user');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userType', 'user');
      return { success: true, data: userData };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Vendor login
  const vendorLogin = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:5000/vendor/login', {
        email,
        password
      });
      
      const vendorData = response.data.vendor;
      setVendor(vendorData);
      setUserType('vendor');
      localStorage.setItem('vendor', JSON.stringify(vendorData));
      localStorage.setItem('userType', 'vendor');
      return { success: true, data: vendorData };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setVendor(null);
    setUserType(null);
    localStorage.removeItem('user');
    localStorage.removeItem('vendor');
    localStorage.removeItem('userType');
  };

  const value = {
    user,
    vendor,
    userType,
    loading,
    userLogin,
    vendorLogin,
    logout,
    isAuthenticated: !!(user || vendor),
    isVendor: !!vendor,
    isUser: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};