import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Employee } from '../../types';
import { Modal } from '../UI/Modal';
import { Badge } from '../UI/Badge';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { EmptyState } from '../UI/EmptyState';
import { PhotoUpload } from '../UI/PhotoUpload';
import { Plus, Search, Edit2, Users, UploadCloud, Trash2, Settings, Download } from 'lucide-react';

// --- Custom Hook for Responsive Prop Handling ---
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

// --- Injected Responsive CSS ---
const responsiveStyles = `
  .wfm-container { padding: 32px; max-width: 1400px; margin: 0 auto; }
  .wfm-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 16px; }
  .wfm-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .wfm-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
  .wfm-tabs-wrapper { display: flex; background: var(--bg-secondary); padding: 4px; border-radius: 12px; border: 1px solid var(--border); overflow-x: auto; white-space: nowrap; max-width: 100%; -webkit-overflow-scrolling: touch; }
  .wfm-search-wrapper { position: relative; width: 300px; }
  .wfm-table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .wfm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .wfm-grid-configs { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .wfm-action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; flex: 1; white-space: nowrap; }

  @media (max-width: 768px) {
    .wfm-container { padding: 16px; }
    .wfm-header { flex-direction: column; }
    .wfm-actions { width: 100%; }
    .wfm-controls { flex-direction: column-reverse; align-items: stretch; }
    .wfm-search-wrapper { width: 100%; }
    .wfm-grid-2 { grid-template-columns: 1fr; }
    .wfm-grid-configs { grid-template-columns: 1fr; gap: 24px; }
  }
`;

interface ExtendedEmployee extends Omit<Employee, 'teamId' | 'roleId' | 'businessAdminId' | 'businessAdminName'> {
  teamLeadName?: string;
}

const emptyEmployee: Omit<ExtendedEmployee, 'id'> = {
  employeeId: '',
  employeeName: '',
  email: '',
  phoneNumber: '',
  team: '',
  businessUnit: '',
  role: '',
  employeeType: 'Full-Time',      
  employmentType: 'Non-Sales',    
  teamLeaderId: '',
  teamLeadName: '',
  dateOfJoining: '',
  status: 'Active',
  isTeamLead: false,
  isBusinessAdmin: false,
  location: '',
  photoURL: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
  borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)',
  fontSize: '13px', outline: 'none', transition: 'border-color 0.2s',
  boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.02)'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: '5px', display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase',
};

type TabType = 'Employees' | 'Team Leads' | 'System Defaults';

interface TeamConfig { name: string; type: 'Sales' | 'Non-Sales'; roles: string[]; }
interface DefaultsState { teamConfigs: TeamConfig[]; locations: string[]; businessUnits: string[]; }

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const EmployeesTab = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin'; 
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { employees, employeesLoaded, employeesLoading, fetchEmployees, invalidateEmployees } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('Employees');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<ExtendedEmployee | null>(null);
  const [form, setForm] = useState<Omit<ExtendedEmployee, 'id'>>(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [defaults, setDefaults] = useState<DefaultsState>({ teamConfigs: [], locations: [], businessUnits: [] });
  const maxDate = getTodayString(); 

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const [tcSnap, lSnap, bSnap] = await Promise.all([
          getDoc(doc(db, 'defaults', 'teamConfigs')),
          getDoc(doc(db, 'defaults', 'locations')),
          getDoc(doc(db, 'defaults', 'businessUnits'))
        ]);
        setDefaults({
          teamConfigs: tcSnap.exists() ? tcSnap.data().values || [] : [],
          locations: lSnap.exists() ? lSnap.data().values || [] : [],
          businessUnits: bSnap.exists() ? bSnap.data().values || [] : []
        });
      } catch (e) {
        console.error("Error fetching defaults", e);
      }
    };
    fetchDefaults();
  }, []);

  useEffect(() => {
    if (!employeesLoaded && !employeesLoading) {
      fetchEmployees(); 
    }
  }, [employeesLoaded, employeesLoading, fetchEmployees]);

  const handleUpdateDefault = async (type: keyof DefaultsState, newArray: any[]) => {
    try {
      await setDoc(doc(db, 'defaults', type), { values: newArray });
      setDefaults(prev => ({ ...prev, [type]: newArray }));
    } catch (e) {
      alert("Failed to update system defaults.");
    }
  };

  const teamLeadsList = employees.filter(e => e.isTeamLead);

  const formatEmployeeData = (data: any): Omit<ExtendedEmployee, 'id'> => {
    const formatted = { ...data };
    formatted.isTeamLead = String(formatted.isTeamLead).toUpperCase() === 'TRUE';
    if (formatted.isTeamLead && !formatted.teamLeaderId) {
      formatted.teamLeaderId = '';
      formatted.teamLeadName = '';
    }
    return formatted;
  };

  const openAdd = () => {
    setEditEmployee(null);
    setForm({
      ...emptyEmployee,
      team: isAdmin ? '' : (user?.teamName || ''), 
      teamLeaderId: isAdmin ? '' : (user?.employeeId || ''), 
      isTeamLead: activeTab === 'Team Leads',
    });
    setShowModal(true);
  };

  const openEdit = (emp: ExtendedEmployee) => {
    setEditEmployee(emp);
    setForm({ ...emp });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeName.trim() || !form.employeeId.trim()) {
      alert("Employee Name and Employee ID are required.");
      return;
    }
    
    setSaving(true);
    try {
      const finalData = formatEmployeeData(form);
      const docId = finalData.employeeId.trim();

      if (editEmployee?.id && editEmployee.id !== docId) {
        await deleteDoc(doc(db, 'Employees', editEmployee.id));
        
        if (editEmployee.photoURL && editEmployee.photoURL !== finalData.photoURL) {
          try {
            const oldPhotoRef = ref(storage, editEmployee.photoURL);
            await deleteObject(oldPhotoRef);
          } catch (storageErr) {
            console.warn("Could not delete old photo:", storageErr);
          }
        }
      }
      
      await setDoc(doc(db, 'Employees', docId), finalData);
      invalidateEmployees(); 
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Error saving employee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp: ExtendedEmployee) => {
    if (!emp.id) return;
    if (window.confirm(`Are you sure you want to permanently delete ${emp.employeeName} (ID: ${emp.employeeId})? This will also delete their profile photo if one exists.`)) {
      try {
        if (emp.photoURL) {
          try {
            const photoRef = ref(storage, emp.photoURL);
            await deleteObject(photoRef);
          } catch (storageErr) {
            console.warn("Could not delete photo:", storageErr);
          }
        }
        await deleteDoc(doc(db, 'Employees', emp.id));
        invalidateEmployees();
      } catch (err) {
        console.error("Error deleting employee:", err);
        alert("Failed to delete employee. Please try again.");
      }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = "employeeId,employeeName,email,phoneNumber,team,businessUnit,role,employeeType,teamLeaderId,teamLeadName,dateOfJoining,employmentType,status,location,isTeamLead,photoURL";
    const dummyLead = "TL102,Mike Lead,mike@co.com,9999999999,Sales,Corporate,Sales Manager,Full-Time,,,,2024-01-01,Sales,Active,New York,TRUE,";
    const dummyEmp = "EMP103,John Doe,john@co.com,8888888888,Sales,Corporate,Sales Rep,Full-Time,TL102,Mike Lead,2024-02-01,Sales,Active,New York,FALSE,";
    
    const csvContent = `${headers}\n${dummyLead}\n${dummyEmp}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Velocity_Employee_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCSV(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error("CSV must have a header and at least one row.");

        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const rawData: any = { ...emptyEmployee };
          
          headers.forEach((header, index) => {
            if (header && values[index] !== undefined) {
              rawData[header] = values[index];
            }
          });

          if (typeof rawData.isTeamLead === 'string') {
            rawData.isTeamLead = rawData.isTeamLead.toUpperCase() === 'TRUE';
          }

          const finalData = formatEmployeeData(rawData);

          if (finalData.employeeName && finalData.employeeId) {
            const docId = finalData.employeeId;
            await setDoc(doc(db, 'Employees', docId), finalData);
          }
        }
        
        invalidateEmployees(); 
        alert("Bulk upload successful!");
      } catch (err) {
        console.error("Upload error:", err);
        alert("Failed to parse or upload CSV. Please ensure headers match exactly.");
      } finally {
        setUploadingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleTeamLeadChange = (selectedLeadId: string) => {
    const lead = teamLeadsList.find(l => l.employeeId === selectedLeadId || l.id === selectedLeadId);
    if (lead) {
      setForm(f => ({ ...f, teamLeaderId: lead.employeeId || lead.id || '', teamLeadName: lead.employeeName }));
    } else {
      setForm(f => ({ ...f, teamLeaderId: '', teamLeadName: '' }));
    }
  };

  const myRecord = employees.find(e => e.employeeId === user?.employeeId || e.email === user?.username);

  const tabFiltered = employees.filter(e => {
    if (activeTab === 'System Defaults') return false;
    if (isAdmin) {
      if (activeTab === 'Team Leads') return e.isTeamLead === true;
      if (activeTab === 'Employees') return !e.isTeamLead;
    } else {
      if (activeTab === 'Employees') {
        return e.teamLeaderId === user?.employeeId || (myRecord && e.teamLeaderId === myRecord.employeeId);
      }
      if (activeTab === 'Team Leads') {
        if (!myRecord || !myRecord.teamLeaderId) return false;
        return e.employeeId === myRecord.teamLeaderId || e.id === myRecord.teamLeaderId;
      }
    }
    return false;
  });

  const searchFiltered = tabFiltered.filter(e =>
    e.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.role?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const setField = (field: keyof ExtendedEmployee, value: any) => setForm(f => ({ ...f, [field]: value }));

  const tabs: TabType[] = isAdmin ? ['Employees', 'Team Leads', 'System Defaults'] : ['Employees', 'Team Leads'];
  const availableRoles = defaults.teamConfigs.find(t => t.name === form.team)?.roles || [];

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="wfm-container">
        <div className="wfm-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ width: '4px', height: '28px', background: 'var(--gradient-blue)', borderRadius: '4px' }} />
              <h1 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                Workforce Management
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', paddingLeft: '16px' }}>
              Manage employees, hierarchies, and system configurations
            </p>
          </div>

          {activeTab !== 'System Defaults' && (
            <div className="wfm-actions">
              {isAdmin && (
                <>
                  <button className="wfm-action-btn" onClick={handleDownloadTemplate} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                    <Download size={16} /> Template
                  </button>
                  <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleCSVUpload} />
                  <button className="wfm-action-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingCSV} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: uploadingCSV ? 'not-allowed' : 'pointer', opacity: uploadingCSV ? 0.6 : 1 }} onMouseEnter={e => !uploadingCSV && (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => !uploadingCSV && (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                    {uploadingCSV ? <LoadingSpinner size={16} /> : <UploadCloud size={16} />}
                    {uploadingCSV ? 'Uploading...' : 'Bulk Upload'}
                  </button>
                </>
              )}
              
              {(isAdmin || (!isAdmin && activeTab === 'Employees')) && (
                <button className="wfm-action-btn" onClick={openAdd} style={{ background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <Plus size={16} /> Add {activeTab === 'Team Leads' ? 'Team Lead' : 'Employee'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="wfm-controls">
          <div className="wfm-tabs-wrapper">
            {tabs.map(tab => {
              const label = !isAdmin && tab === 'Team Leads' ? 'My Team Lead' : tab;
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: activeTab === tab ? 600 : 500, background: activeTab === tab ? 'var(--bg-primary)' : 'transparent', color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)', boxShadow: activeTab === tab ? '0 2px 8px rgba(15, 23, 42, 0.04)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {tab === 'System Defaults' ? <Settings size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }}/> : null}
                  {label}
                </button>
              );
            })}
          </div>

          {activeTab !== 'System Defaults' && (
            <div className="wfm-search-wrapper">
              <Search size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input placeholder={`Search ${activeTab.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: '38px', background: 'var(--bg-primary)' }} onFocus={e => (e.target.style.borderColor = 'var(--accent)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          )}
        </div>

        {activeTab === 'System Defaults' ? (
          <DefaultsManager defaults={defaults} onUpdate={handleUpdateDefault} />
        ) : (
          <>
            {employeesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><LoadingSpinner size={36} /></div>
            ) : (
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
                    {!isAdmin && activeTab === 'Team Leads' ? 'My Reporting Manager' : `${activeTab} Directory`}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '3px 12px', borderRadius: '999px', border: '1px solid var(--border)' }}>{searchFiltered.length} records</span>
                </div>

                {searchFiltered.length === 0 ? (
                  <div style={{ padding: '24px' }}>
                    <EmptyState icon={<Users size={28} />} title={!isAdmin && activeTab === 'Team Leads' ? 'No reporting manager assigned' : `No ${activeTab.toLowerCase()} found`} description={search ? `No results for "${search}".` : `No records available.`} />
                  </div>
                ) : (
                  <div className="wfm-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                          {['Name', 'ID', 'Department / Team', 'Role', 'Reports To', 'Type', 'Status', 'Actions'].map((h, i) => (
                            <th key={i} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {searchFiltered.map(emp => {
                          const canEdit = isAdmin || (emp.teamLeaderId === user?.employeeId) || (myRecord && emp.teamLeaderId === myRecord.employeeId);
                          return (
                            <tr key={emp.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <td style={{ padding: '14px 20px' }}><EmployeeRowAvatar emp={emp} /></td>
                              <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{emp.employeeId}</td>
                              <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.team}</td>
                              <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.role}</td>
                              <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>{emp.teamLeadName || '-'}</td>
                              <td style={{ padding: '14px 20px' }}>
                                <Badge label={emp.employmentType || ''} variant={String(emp.employmentType).toUpperCase().includes('SALES') ? 'info' : 'default'} />
                              </td>
                              <td style={{ padding: '14px 20px' }}><Badge label={emp.status || ''} variant={emp.status === 'Active' ? 'success' : 'danger'} /></td>
                              <td style={{ padding: '14px 20px' }}>
                                {canEdit ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button onClick={() => openEdit(emp)} style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: '7px', padding: '6px 12px', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)')}>
                                      <Edit2 size={12} /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(emp)} style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', borderRadius: '7px', padding: '6px 12px', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)')} onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)')}>
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Add / Edit Modal - Uses Custom Hook to Pass Dynamic Width */}
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editEmployee ? `Edit ${activeTab === 'Team Leads' ? 'Team Lead' : 'Employee'}` : `Add ${activeTab === 'Team Leads' ? 'Team Lead' : 'Employee'}`} width={isMobile ? (window.innerWidth - 32) : 740}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <PhotoUpload 
              currentPhotoURL={form.photoURL} 
              employeeId={form.employeeId || `temp_${Date.now()}`} 
              name={form.employeeName} 
              onUploaded={url => setField('photoURL', url)} 
              size={90} 
            />
          </div>

          <div className="wfm-grid-2">
            {([
              ['employeeName',  'Full Name', 'text'],
              ['employeeId',    'Employee ID',        'text'],
              ['email',         'Email',              'email'],
              ['phoneNumber',   'Phone Number',       'text'],
              ['dateOfJoining', 'Date of Joining',    'date'],
            ] as [keyof ExtendedEmployee, string, string][]).map(([field, label, type]) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input
                  type={type}
                  value={(form as any)[field] || ''}
                  onChange={e => setField(field, e.target.value)}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  required={field === 'employeeName' || field === 'employeeId'}
                  max={field === 'dateOfJoining' ? maxDate : undefined}
                  disabled={field === 'employeeId' && editEmployee !== null} 
                />
                {field === 'employeeId' && (
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Employee ID cannot be changed after creation
                  </p>
                )}
              </div>
            ))}

            <div>
              <label style={labelStyle}>Department / Team</label>
              <select
                value={form.team}
                onChange={e => {
                  const selectedTeamName = e.target.value;
                  setField('team', selectedTeamName);
                  setField('role', ''); 
                  const matchedConfig = defaults.teamConfigs.find(t => t.name === selectedTeamName);
                  if (matchedConfig) setField('employmentType', matchedConfig.type); 
                }}
                style={inputStyle}
                disabled={!isAdmin}
              >
                <option value="">-- Select Team --</option>
                {defaults.teamConfigs.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setField('role', e.target.value)} style={inputStyle} disabled={!form.team}>
                <option value="">-- Select Role --</option>
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Location</label>
              <select value={form.location} onChange={e => setField('location', e.target.value)} style={inputStyle}>
                <option value="">-- Select Location --</option>
                {defaults.locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Business Unit</label>
              <select value={form.businessUnit} onChange={e => setField('businessUnit', e.target.value)} style={inputStyle} disabled={!isAdmin}>
                <option value="">-- Select Business Unit --</option>
                {defaults.businessUnits.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Assign Reporting Manager</label>
              <select value={form.teamLeaderId} onChange={e => handleTeamLeadChange(e.target.value)} style={inputStyle} disabled={!isAdmin}>
                <option value="">-- Select Manager --</option>
                {teamLeadsList.map(tl => <option key={tl.id} value={tl.employeeId || tl.id}>{tl.employeeName} ({tl.employeeId})</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Employee Type</label>
              <select value={form.employeeType} onChange={e => setField('employeeType', e.target.value)} style={inputStyle}> 
                <option value="Full-Time">Full-Time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Employment Category</label>
              <select value={form.employmentType} onChange={e => setField('employmentType', e.target.value)} style={inputStyle} disabled>
                <option value="Non-Sales">Non-Sales</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
            
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)} style={inputStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setShowModal(false)} style={{ padding: '10px 22px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s', fontWeight: 500 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 28px', background: saving ? 'var(--bg-tertiary)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: saving ? 'var(--text-muted)' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: saving ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.25)', transition: 'all 0.2s' }}>
              {saving ? 'Saving…' : editEmployee ? `Update Details` : `Add Record`}
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
};

/* ─── Top Level Components ─── */
const TeamsRolesManager = ({ defaults, onUpdate }: { defaults: DefaultsState, onUpdate: (type: keyof DefaultsState, newArr: any[]) => void }) => {
  const [newTeam, setNewTeam] = useState('');
  const [newTeamType, setNewTeamType] = useState<'Sales' | 'Non-Sales'>('Non-Sales');
  
  const [roleTeamFilter, setRoleTeamFilter] = useState<'All' | 'Sales' | 'Non-Sales'>('All');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleAddTeam = () => {
    if (!newTeam.trim() || defaults.teamConfigs.find(t => t.name.toLowerCase() === newTeam.trim().toLowerCase())) return;
    onUpdate('teamConfigs', [...defaults.teamConfigs, { name: newTeam.trim(), type: newTeamType, roles: [] }]);
    setNewTeam('');
    setNewTeamType('Non-Sales'); 
  };

  const handleRemoveTeam = (teamName: string) => {
    onUpdate('teamConfigs', defaults.teamConfigs.filter(t => t.name !== teamName));
    if (selectedTeam === teamName) setSelectedTeam('');
  };

  const handleAddRole = () => {
    if (!selectedTeam || !newRole.trim()) return;
    const updated = defaults.teamConfigs.map(t => {
      if (t.name === selectedTeam && !t.roles.includes(newRole.trim())) {
        return { ...t, roles: [...t.roles, newRole.trim()] };
      }
      return t;
    });
    onUpdate('teamConfigs', updated);
    setNewRole('');
  };

  const handleRemoveRole = (teamName: string, roleName: string) => {
    const updated = defaults.teamConfigs.map(t => {
      if (t.name === teamName) return { ...t, roles: t.roles.filter(r => r !== roleName) };
      return t;
    });
    onUpdate('teamConfigs', updated);
  };

  const filteredTeamsForRoles = defaults.teamConfigs.filter(t => {
    if (roleTeamFilter === 'All') return true;
    const tType = t.type || 'Non-Sales'; 
    return tType === roleTeamFilter;
  });

  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)', gridColumn: '1 / -1' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>Teams & Roles Configuration</h3>
      <div className="wfm-grid-configs">
        <div>
          <label style={labelStyle}>1. Create a Team</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="E.g., Engineering"
              value={newTeam}
              onChange={e => setNewTeam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTeam();
                }
              }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select value={newTeamType} onChange={e => setNewTeamType(e.target.value as 'Sales' | 'Non-Sales')} style={{...inputStyle, width: 'auto'}}>
              <option value="Non-Sales">Non-Sales</option>
              <option value="Sales">Sales</option>
            </select>
            <button onClick={handleAddTeam} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}><Plus size={16}/></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
            {defaults.teamConfigs.map(t => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{t.name}</span>
                  <Badge label={t.type || 'Non-Sales'} variant={t.type === 'Sales' ? 'info' : 'default'} />
                </div>
                <button onClick={() => handleRemoveTeam(t.name)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>2. Add Roles to a Team</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <select 
              value={roleTeamFilter} 
              onChange={e => {
                setRoleTeamFilter(e.target.value as any);
                setSelectedTeam(''); 
              }} 
              style={{...inputStyle, width: '130px'}}
            >
              <option value="All">All Types</option>
              <option value="Sales">Sales</option>
              <option value="Non-Sales">Non-Sales</option>
            </select>
            
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{...inputStyle, flex: 1}}>
              <option value="">-- Select Team --</option>
              {filteredTeamsForRoles.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', opacity: selectedTeam ? 1 : 0.5, pointerEvents: selectedTeam ? 'auto' : 'none' }}>
            <input type="text" placeholder="E.g., Frontend Developer" value={newRole} onChange={e => setNewRole(e.target.value)} style={inputStyle} />
            <button onClick={handleAddRole} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}><Plus size={16}/></button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {selectedTeam && defaults.teamConfigs.find(t => t.name === selectedTeam)?.roles.map(r => (
              <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                <button onClick={() => handleRemoveRole(selectedTeam, r)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SimpleListManager = ({ title, type, items, placeholder, onUpdate }: { title: string, type: keyof DefaultsState, items: string[], placeholder: string, onUpdate: (type: keyof DefaultsState, newArr: any[]) => void }) => {
  const [val, setVal] = useState('');
  const handleAdd = () => {
    if (!val.trim() || items.includes(val.trim())) return;
    onUpdate(type, [...items, val.trim()]);
    setVal('');
  };
  return (
    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input type="text" placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)} style={inputStyle} />
        <button onClick={handleAdd} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}><Plus size={16}/></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item}</span>
            <button onClick={() => onUpdate(type, items.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

const DefaultsManager = ({ defaults, onUpdate }: { defaults: DefaultsState, onUpdate: (type: keyof DefaultsState, newArr: any[]) => void }) => {
  return (
    <div className="wfm-grid-2">
      <TeamsRolesManager defaults={defaults} onUpdate={onUpdate} />
      <SimpleListManager title="Locations" type="locations" items={defaults.locations} placeholder="E.g., T.NAGAR - PRASHANTI" onUpdate={onUpdate} />
      <SimpleListManager title="Business Units" type="businessUnits" items={defaults.businessUnits} placeholder="E.g., Corporate" onUpdate={onUpdate} />
    </div>
  );
};

const EmployeeRowAvatar = ({ emp }: { emp: Employee }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(15, 23, 42, 0.05)', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)' }}>
      {emp.photoURL ? <img src={emp.photoURL} alt={emp.employeeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Space Grotesk, sans-serif' }}>{emp.employeeName?.charAt(0)?.toUpperCase() || '?'}</span>}
    </div>
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.employeeName}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.email}</div>
    </div>
  </div>
);