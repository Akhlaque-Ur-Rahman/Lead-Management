import { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LeadsProvider } from './components/LeadsContext';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { LeadManagement } from './components/LeadManagement';
import { Calendar } from './components/CalendarView';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { LostLeads } from './components/LostLeads';
import { Settings } from './components/Settings';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <LeadManagement />;
      case 'calendar':
        return <Calendar />;
      case 'lost':
        return <LostLeads />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LeadsProvider>
        <AppContent />
      </LeadsProvider>
    </AuthProvider>
  );
}