import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { collection, getDocs, query, where, Query, DocumentData } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Employee } from '../types';

export type CycleMetadata = {
  id: string;
  year: string;
  teams: string[];
  createdAt: string;
};

export type DataState = {
  employees: Employee[];
  cycles: CycleMetadata[];
  employeesLoaded: boolean;
  cyclesLoaded: boolean;
  employeesLoading: boolean;
  cyclesLoading: boolean;
};

export type FetchEmployeeFilters = {
  teamName?: string;
  reportingManagerId?: string;
};

export type DataContextType = DataState & {
  fetchEmployees: (filters?: FetchEmployeeFilters) => Promise<void>; 
  fetchCycles: () => Promise<void>;
  invalidateEmployees: () => void;
  invalidateCycles: () => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DataState>({
    employees: [],
    cycles: [],
    employeesLoaded: false,
    cyclesLoaded: false,
    employeesLoading: false,
    cyclesLoading: false,
  });

  const employeesFetching = useRef(false);
  const cyclesFetching = useRef(false);

  const fetchEmployees = useCallback(async (filters?: FetchEmployeeFilters) => { 
    if (state.employeesLoaded || employeesFetching.current) return;
    employeesFetching.current = true;
    setState(s => ({ ...s, employeesLoading: true }));
    
    try {
      let q: Query<DocumentData> = collection(db, 'Employees');

      if (filters?.teamName) {
        q = query(q, where('team', '==', filters.teamName));
      } else if (filters?.reportingManagerId) {
        q = query(q, where('reportingManagerId', '==', filters.reportingManagerId));
      }

      const snap = await getDocs(q);
      const employees = snap.docs.map(d => {
        const data = d.data() as Record<string, any>; 
        return { id: d.id, ...data } as Employee;
      });
      
      setState(s => ({ ...s, employees, employeesLoaded: true, employeesLoading: false }));
    } catch (err) {
      console.error('fetchEmployees error:', err);
      setState(s => ({ ...s, employeesLoading: false }));
    } finally {
      employeesFetching.current = false;
    }
  }, [state.employeesLoaded]);

  const fetchCycles = useCallback(async () => {
    if (state.cyclesLoaded || cyclesFetching.current) return;
    cyclesFetching.current = true;
    setState(s => ({ ...s, cyclesLoading: true }));
    
    try {
      const snap = await getDocs(collection(db, 'Submissions'));
      const cycles = snap.docs
        .map(d => {
          const data = d.data() as Record<string, any>; 
          return { id: d.id, ...data } as CycleMetadata;
        })
        .sort((a, b) => b.year.localeCompare(a.year));
        
      setState(s => ({ ...s, cycles, cyclesLoaded: true, cyclesLoading: false }));
    } catch (err) {
      console.error('fetchCycles error:', err);
      setState(s => ({ ...s, cyclesLoading: false }));
    } finally {
      cyclesFetching.current = false;
    }
  }, [state.cyclesLoaded]);

  const invalidateEmployees = useCallback(() => {
    setState(s => ({ ...s, employeesLoaded: false, employees: [] }));
  }, []);

  const invalidateCycles = useCallback(() => {
    setState(s => ({ ...s, cyclesLoaded: false, cycles: [] }));
  }, []);

  return (
    <DataContext.Provider value={{
      ...state,
      fetchEmployees,
      fetchCycles,
      invalidateEmployees,
      invalidateCycles,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};