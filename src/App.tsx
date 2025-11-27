import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from './components/AuthContext';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
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
import { Toaster } from './components/ui/sonner';


function DashboardLayout() {
  const { activeTab } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Default to dashboard if no tab specified (though route config handles this)
  const currentTab = activeTab || 'dashboard';

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
        return <UserManagement />;
      case 'companies':
        return <CompanyManagement />;
      case 'settings':
      case 'subscription':
        return <Settings />;
      default:
        // If tab not found, redirect to dashboard
        return <Navigate to="/dashboard" replace />;
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar activeTab={currentTab} setActiveTab={handleTabChange} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full relative">
        {renderContent()}
      </main>
      
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-primary text-primary-foreground p-2 rounded-md shadow-lg hover:bg-primary/90 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      
      <Toaster />
    </div>
  );
}

function LoginWrapper() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Redirect to dashboard if already logged in
  if (user) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route 
        path="/:activeTab" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
