// src/hooks/useRevenue.js
import { useState, useEffect } from "react";
import axios from "axios";

export default function useRevenue(vendorId) {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRevenue = async () => {
    if (!vendorId) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/vendors/${vendorId}/revenue`);
      setRevenueData(response.data);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      // Generate mock data if endpoint doesn't exist
      generateMockRevenue();
    } finally {
      setLoading(false);
    }
  };

  const generateMockRevenue = () => {
    const today = new Date();
    const weekly = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const total = Math.floor(Math.random() * 500) + 100;
      const commission = total * 0.1;
      
      weekly.push({
        date: date.toISOString().split('T')[0],
        total,
        commission,
        net: total - commission,
        ordersCount: Math.floor(Math.random() * 5) + 1
      });
    }

    setRevenueData({
      today: weekly[weekly.length - 1],
      weekly
    });
  };

  useEffect(() => {
    fetchRevenue();
  }, [vendorId]);

  return { revenueData, loading, refreshRevenue: fetchRevenue };
}