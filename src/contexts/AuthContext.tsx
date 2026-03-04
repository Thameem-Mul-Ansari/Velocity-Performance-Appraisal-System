import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, employeeId: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('appraise_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, employeeId: string): Promise<boolean> => {
    try {
      // 1. Super Admin Hardcode Override
      if (email.toLowerCase() === 'automation@wedtree.com' && employeeId === 'Prashanti@2026') {
        const adminUser: AuthUser = {
          username: email,
          role: 'super_admin',
          displayName: 'Super Admin',
          teamName: 'All',
          employeeId: 'admin_001'
        };
        setUser(adminUser);
        localStorage.setItem('appraise_user', JSON.stringify(adminUser));
        return true;
      }

      // 2. Standard Employee Login - Using employeeId instead of phone
      const q = query(
        collection(db, 'Employees'),
        where('email', '==', email),
        where('employeeId', '==', employeeId)
      );
      
      const snap = await getDocs(q);

      if (snap.empty) {
        return false;
      }

      const empData = snap.docs[0].data();
      
      const authUser: AuthUser = {
        username: empData.email,
        role: empData.isTeamLead ? 'team_lead' : 'employee',
        displayName: empData.employeeName,
        teamName: empData.team || 'Unassigned',
        employeeId: empData.employeeId || snap.docs[0].id,
      };

      setUser(authUser);
      localStorage.setItem('appraise_user', JSON.stringify(authUser));
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('appraise_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};