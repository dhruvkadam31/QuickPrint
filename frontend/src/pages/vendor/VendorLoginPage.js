import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './VendorLogin.css';

const VendorLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { vendorLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await vendorLogin(email, password);
    
    if (result.success) {
      navigate('/vendor/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="vendor-login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <span className="logo-icon">🖨️</span>
            <span className="logo-text">QuickPrint Vendor</span>
          </div>
          <h2>Vendor Portal</h2>
          <p>Sign in to manage your print shop</p>
        </div>

        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">📧</span>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@quickprint.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔒</span>
              Password
            </label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
            </label>
            <a href="/vendor/forgot-password" className="forgot-password">
              Forgot Password?
            </a>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Signing in...
              </>
            ) : (
              <>
                <span>🔐</span>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="demo-credentials">
          <p>Demo Credentials:</p>
          <div className="credentials-list">
            <div className="credential-item">
              <span className="vendor-name">City Center Print Hub</span>
              <span className="vendor-email">vendor1@quickprint.com</span>
              <span className="vendor-pass">admin123</span>
            </div>
            <div className="credential-item">
              <span className="vendor-name">University Print Station</span>
              <span className="vendor-email">vendor2@quickprint.com</span>
              <span className="vendor-pass">admin456</span>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>
            <span>🔒 Secure login</span>
            <span>•</span>
            <span>24/7 Support</span>
          </p>
        </div>
      </div>

      <div className="login-decoration">
        <div className="decoration-content">
          <h2>Manage Your Print Shop Efficiently</h2>
          <div className="feature-list">
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Real-time Dashboard</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔄</span>
              <span>Queue Management</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💰</span>
              <span>Revenue Analytics</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🖨️</span>
              <span>Print Job Control</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLoginPage;