import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import VendorNavbar from '../../components/vendor/VendorNavbar';
import axios from 'axios';
import './VendorDashboard.css';

const VendorDashboardPage = () => {
const vendor = JSON.parse(localStorage.getItem("vendorData"));
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      orders: 0,
      revenue: 0,
      completed: 0
    },
    queueStats: {
      queued: 0,
      inProgress: 0,
      ready: 0,
      total: 0,
      estimatedWaitTime: 0
    },
    recentOrders: [],
    revenue: {
      today: 0,
      weekly: 0,
      monthly: 0
    },
    shopStatus: vendor?.shopOpen || false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [vendor?.vendorId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor orders
      const ordersResponse = await axios.get(
        `http://localhost:5000/order/user/${vendor.vendorId}`
      );
      
      const orders = ordersResponse.data;
      
      // Calculate today's stats
      const today = new Date().toDateString();
      const todayOrders = orders.filter(order => 
        new Date(order.createdAt).toDateString() === today
      );
      
      const todayCompleted = orders.filter(order => 
        order.status === 'Picked Up' && 
        new Date(order.pickedUpAt).toDateString() === today
      );
      
      const todayRevenue = todayCompleted.reduce(
        (sum, order) => sum + order.estimatedPrice, 0
      );

      // Calculate queue stats
      const queuedOrders = orders.filter(order => order.status === 'Queued');
      const inProgressOrders = orders.filter(order => order.status === 'In Progress');
      const readyOrders = orders.filter(order => order.status === 'Ready');
      
      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setDashboardData({
        todayStats: {
          orders: todayOrders.length,
          revenue: todayRevenue,
          completed: todayCompleted.length
        },
        queueStats: {
          queued: queuedOrders.length,
          inProgress: inProgressOrders.length,
          ready: readyOrders.length,
          total: queuedOrders.length + inProgressOrders.length,
          estimatedWaitTime: (queuedOrders.length + inProgressOrders.length) * 10
        },
        recentOrders,
        revenue: {
          today: todayRevenue,
          weekly: calculateWeeklyRevenue(orders),
          monthly: calculateMonthlyRevenue(orders)
        },
        shopStatus: vendor?.shopOpen
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyRevenue = (orders) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyOrders = orders.filter(order => 
      order.status === 'Picked Up' && 
      new Date(order.pickedUpAt) > weekAgo
    );
    
    return weeklyOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
  };

  const calculateMonthlyRevenue = (orders) => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const monthlyOrders = orders.filter(order => 
      order.status === 'Picked Up' && 
      new Date(order.pickedUpAt) > monthAgo
    );
    
    return monthlyOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
  };

  const toggleShopStatus = async () => {
    try {
      const newStatus = !dashboardData.shopStatus;
      await axios.patch(
        `http://localhost:5000/vendor/${vendor.vendorId}/shop-status`,
        { shopOpen: newStatus }
      );
      
      setDashboardData(prev => ({
        ...prev,
        shopStatus: newStatus
      }));
    } catch (err) {
      console.error('Error toggling shop status:', err);
    }
  };

  if (loading) {
    return (
      <div className="vendor-dashboard">
        <VendorNavbar />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-dashboard">
      <VendorNavbar />
      
      <div className="dashboard-content">
        {/* Header with Shop Status */}
        <div className="dashboard-header">
          <h1>Welcome back, {vendor?.name}!</h1>
          <div className="shop-status-control">
            <span className="status-label">Shop Status:</span>
            <button 
              className={`status-toggle ${dashboardData.shopStatus ? 'open' : 'closed'}`}
              onClick={toggleShopStatus}
            >
              <span className={`status-dot ${dashboardData.shopStatus ? 'open' : 'closed'}`}></span>
              {dashboardData.shopStatus ? 'OPEN' : 'CLOSED'}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={fetchDashboardData}>Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-label">Today's Orders</span>
              <span className="stat-value">{dashboardData.todayStats.orders}</span>
            </div>
          </div>

        

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-label">Completed Today</span>
              <span className="stat-value">{dashboardData.todayStats.completed}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-info">
              <span className="stat-label">In Queue</span>
              <span className="stat-value">{dashboardData.queueStats.total}</span>
            </div>
          </div>
        </div>

        {/* Queue Overview */}
        <div className="queue-overview">
          <h2>Current Queue Status</h2>
          <div className="queue-stats">
            <div className="queue-stat">
              <span className="stat-name">Queued</span>
              <span className="stat-number">{dashboardData.queueStats.queued}</span>
            </div>
            <div className="queue-stat">
              <span className="stat-name">In Progress</span>
              <span className="stat-number">{dashboardData.queueStats.inProgress}</span>
            </div>
            <div className="queue-stat">
              <span className="stat-name">Ready</span>
              <span className="stat-number">{dashboardData.queueStats.ready}</span>
            </div>
            <div className="queue-stat">
              <span className="stat-name">Est. Wait Time</span>
              <span className="stat-number">{dashboardData.queueStats.estimatedWaitTime} min</span>
            </div>
          </div>
        </div>

        {/* Revenue Overview */}
       

        {/* Recent Orders */}
        <div className="recent-orders">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <a href="/vendor/orders" className="view-all">View All →</a>
          </div>
          
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentOrders.map(order => (
                  <tr key={order.orderId}>
                    <td>#{order.orderId.slice(-6)}</td>
                    <td>{order.serviceType}</td>
                    <td>₹{order.estimatedPrice}</td>
                    <td>
                      <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                    <td>
                      <button 
                        className="action-btn"
                        onClick={() => window.location.href = `/vendor/orders?order=${order.orderId}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button 
              className="action-card"
              onClick={() => window.location.href = '/vendor/queue'}
            >
              <span className="action-icon">👀</span>
              <span className="action-name">View Queue</span>
            </button>
            <button 
              className="action-card"
              onClick={() => window.location.href = '/vendor/orders'}
            >
              <span className="action-icon">📋</span>
              <span className="action-name">Manage Orders</span>
            </button>
            <button 
              className="action-card"
              onClick={() => window.location.href = '/vendor/revenue'}
            >
              <span className="action-icon">💰</span>
              <span className="action-name">Revenue Report</span>
            </button>
            <button 
              className="action-card"
              onClick={() => window.location.href = '/vendor/settings'}
            >
              <span className="action-icon">⚙️</span>
              <span className="action-name">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardPage;