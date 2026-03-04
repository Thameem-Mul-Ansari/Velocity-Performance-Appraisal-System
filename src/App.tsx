import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

const AppContent = () => {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;