import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useState } from 'react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Closed by default on mobile
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-cream overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-dark/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full shadow-2xl'}`}>
        <Sidebar isOpen={true} toggle={() => setIsSidebarOpen(false)} isMobile={true} />
      </div>

      {/* Sidebar Desktop */}
      <div className={`hidden md:block transition-all duration-300 ${isDesktopSidebarOpen ? 'w-64' : 'w-20'}`}>
        <Sidebar isOpen={isDesktopSidebarOpen} toggle={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar toggleSidebar={() => {
          // Toggle the appropriate sidebar based on screen size
          if (window.innerWidth < 768) {
            setIsSidebarOpen(!isSidebarOpen);
          } else {
            setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
          }
        }} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-cream/30 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
