import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, currentRoute, setRoute }) {
  return (
    <div className="app-container">
      <Sidebar currentRoute={currentRoute} setRoute={setRoute} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
