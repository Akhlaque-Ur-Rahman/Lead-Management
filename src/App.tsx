import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { CompanyProvider } from './components/CompanyContext';
import { LeadsProvider } from './components/LeadsContext';
import { Login } from './components/Login';
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

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Set initial tab to dashboard for all users
  useEffect(() => {
    if (user && !hasRedirected) {
      setActiveTab('dashboard');
      setHasRedirected(true);
    }
  }, [user, hasRedirected]);

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
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
        return <Settings />;
      default:
        return <Dashboard />;
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
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full">
        {renderContent()}
      </main>
      
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-30 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
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

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <LeadsProvider>
          <AppContent />
        </LeadsProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}
