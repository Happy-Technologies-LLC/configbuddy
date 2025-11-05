import React, { useState } from 'react';
import Header from '../common/Header';
import Sidebar, { DRAWER_WIDTH } from '../common/Sidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className="flex min-h-screen">
      <Header onMenuClick={isMobile ? handleDrawerToggle : undefined} />

      {/* Sidebar */}
      {isMobile ? (
        <Sidebar
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
        />
      ) : (
        <Sidebar variant="permanent" />
      )}

      {/* Main Content */}
      <main
        className="flex-1 p-6 mt-16 bg-background min-w-0 overflow-auto"
        style={{ marginLeft: isMobile ? 0 : DRAWER_WIDTH }}
      >
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
