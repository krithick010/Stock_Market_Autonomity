import React from 'react';

export default function LeftSidebar() {
  const navItems = [
    { id: 'trades', icon: '↕', label: 'Trades', active: true },
    { id: 'market', icon: '📊', label: 'Market' },
    { id: 'rewards', icon: '🏆', label: 'Rewards' },
    { id: 'help', icon: '❓', label: 'Help' },
  ];

  return (
    <aside className="olymp-sidebar">
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="online-indicator">
          <span className="dot"></span>
          <span className="text">Online</span>
        </div>
      </div>
    </aside>
  );
}
