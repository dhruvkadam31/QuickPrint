// src/components/VendorStatus.js
import React from 'react';

const VendorStatus = ({ vendor, isSelected, onClick }) => {
  return (
    <div 
      className="vendor-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: 8,
        border: `1px solid ${isSelected ? '#007bff' : '#dee2e6'}`,
        backgroundColor: isSelected ? '#f8f9ff' : 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '8px'
      }}
      onClick={onClick}
    >
      {/* Vendor Details - Left Side */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h5 style={{ margin: 0, color: '#343a40' }}>{vendor.name}</h5>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 12,
              fontSize: '0.75em',
              fontWeight: 600,
              backgroundColor: vendor.shopOpen ? '#d4edda' : '#f8d7da',
              color: vendor.shopOpen ? '#155724' : '#721c24'
            }}
          >
            {vendor.shopOpen ? '🟢 OPEN' : '🔴 CLOSED'}
          </span>
        </div>
        
        <div style={{ display: 'grid', gap: 4, fontSize: '0.9em', color: '#6c757d' }}>
          <div>📍 {vendor.address}</div>
          <div>📞 {vendor.phone}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span>🖨️ Services: {vendor.services.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Queue & Wait Time - Right Side */}
      <div style={{ textAlign: 'right', minWidth: 120 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.85em', color: '#6c757d' }}>Current Queue</div>
          <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#007bff' }}>
            {vendor.currentQueue} orders
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.85em', color: '#6c757d' }}>Wait Time</div>
          <div style={{ fontSize: '1em', fontWeight: 600, color: '#28a745' }}>
            ~{vendor.estimatedWaitTime} mins
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorStatus;