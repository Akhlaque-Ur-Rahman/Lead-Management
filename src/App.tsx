import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import { hasPermission } from './types/roles';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { AppShell } from './components/layout/AppShell';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './components/Dashboard';
import { LeadManagement } from './components/LeadManagement';
import { AssignedLeads } from './components/AssignedLeads';
import { Calendar } from './components/CalendarView';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { CompanyManagement } from './components/CompanyManagement';
import { LostLeads } from './components/LostLeads';
import { ConvertedLeads } from './components/ConvertedLeads';
import { Settings } from './components/Settings';
import { HelpPage } from './components/HelpPage';
import { NotFound } from './components/NotFound';
import { Toaster } from './components/ui/sonner';
import { useIsMobile } from './components/ui/use-mobile';
import { cn } from './components/ui/utils';


function DashboardLayout() {
  const { user } = useAuth();
  const { activeTab } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('lms-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  
  const currentTab = activeTab || 'dashboard';
  const showSalesBottomNav = isMobile && user?.role === 'sales_user';

  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <LeadManagement />;
      case 'assigned':
        return <AssignedLeads />;
      case 'calendar':
        return <Calendar />;
      case 'converted':
        return <ConvertedLeads />;
      case 'lost':
        return <LostLeads />;
      case 'reports':
        return <Reports />;
      case 'users':
        if (!user || !hasPermission(user.role, 'MANAGE_USERS')) return <Navigate to="/dashboard" replace />;
        return <UserManagement />;
      case 'companies':
        if (!user || !hasPermission(user.role, 'MANAGE_COMPANIES')) return <Navigate to="/dashboard" replace />;
        return <CompanyManagement />;
      case 'settings':
      case 'subscription':
        if (!user || !hasPermission(user.role, 'MANAGE_SETTINGS')) return <Navigate to="/dashboard" replace />;
        return <Settings />;
      case 'help':
        return <HelpPage />;
      default:
        return <Navigate to="/not-found" replace />;
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          activeTab={currentTab}
          setActiveTab={handleTabChange}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>
      
      <div
        id="main-content"
        className={cn(
          'flex flex-col flex-1 min-w-0 min-h-0 h-full',
          showSalesBottomNav && 'pb-16'
        )}
      >
        <AppShell
          activeTab={currentTab}
          onMenuClick={() => setSidebarOpen(true)}
          onCommandPalette={() => setCommandOpen(true)}
        >
          {renderContent()}
        </AppShell>
      </div>

      <MobileBottomNav />

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <Toaster />
    </div>
  );
}

function LoginWrapper() {
  const { user } = useAuth();
  const location = useLocation();
  
  if (user) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <>
      <Login />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginWrapper />} />
      <Route
        path="/not-found"
        element={
          <ProtectedRoute>
            <NotFound />
            <Toaster />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route 
        path="/:activeTab" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
}
