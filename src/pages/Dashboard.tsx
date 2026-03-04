import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminHome } from '../components/Home/AdminHome';
import { TeamLeadHome } from '../components/Home/TeamLeadHome';
import { SubmissionsTab } from '../components/Submissions/SubmissionsTab';
import { EmployeesTab } from '../components/Employees/EmployeesTab';
import { Navbar } from '../components/Layout/NavBar';

type Tab = 'home' | 'submissions' | 'employees';

export const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return user?.role === 'super_admin' ? <AdminHome /> : <TeamLeadHome />;
      case 'submissions':
        return <SubmissionsTab />;
      case 'employees':
        return <EmployeesTab />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{ animation: 'fadeIn 0.2s ease' }}>{renderContent()}</main>
    </div>
  );
};