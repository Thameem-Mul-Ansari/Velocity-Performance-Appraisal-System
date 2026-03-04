import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, getDoc, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Employee } from '../../types';
import { 
  Plus, Search, ArrowLeft, Settings, 
  Edit, MapPin, Zap, ThumbsUp, Download, User, 
  ChevronDown, ChevronUp, Clock, Trash2
} from 'lucide-react';
import { Badge } from '../UI/Badge';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Modal } from '../UI/Modal';
import { CreateAppraisalModal } from './CreateAppraisalModal';

const getEmpCategory = (emp: any) => {
  const typeStr = String(emp?.employmentType || '').toUpperCase();
  if (typeStr.includes('NON')) return 'Non-Sales';
  if (typeStr.includes('SALES')) return 'Sales';
  return 'Non-Sales'; 
};

const isTeamLead = (emp: any) => emp?.isTeamLead === true || String(emp?.isTeamLead).toUpperCase() === 'TRUE';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface Cycle {
  id: string;
  year: string;
  assignedForms: Record<string, string>;
  createdAt: string;
  assignedLeads: string[];
}
interface TeamData { id: string; teamName: string; submissions: any[]; }
interface QuestionDef { id: string; text: string; weight: number; }
interface AppraisalForm {
  id: string;
  name: string;
  employeeType: 'Sales' | 'Non-Sales' | 'Team Lead';
  questions: QuestionDef[];
  createdAt: string;
}

export const SubmissionsTab = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';
  const { employees, employeesLoaded, fetchEmployees } = useData();

  const [view, setView] = useState<'LIST' | 'FORMS' | 'REVIEW'>('LIST');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [updatingPromo, setUpdatingPromo] = useState<string | null>(null);
  
  // Forms & Cycle Data
  const [forms, setForms] = useState<AppraisalForm[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  
  // Submission Data
  const [flattenedSubmissions, setFlattenedSubmissions] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('All');
  const [filterEmpType, setFilterEmpType] = useState('All'); 

  // UI States
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [tlActiveTab, setTlActiveTab] = useState<'TEAM' | 'SELF'>('TEAM');
  const [adminActiveTab, setAdminActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  
  // Review Flow States
  const [viewingSubmission, setViewingSubmission] = useState<any | null>(null);
  const [reviewMode, setReviewMode] = useState<'SELF' | 'REVIEW'>('REVIEW');
  const [reviewTargetEmployee, setReviewTargetEmployee] = useState<Employee | null>(null);
  const [existingSubForReview, setExistingSubForReview] = useState<any | null>(null);

  useEffect(() => {
    if (!employeesLoaded) fetchEmployees();
  }, [employeesLoaded, fetchEmployees]);

  const fetchCycles = async () => {
    setLoadingCycles(true);
    try {
      const snap = await getDocs(collection(db, 'Submissions'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cycle));
      const sorted = data.sort((a, b) => b.year.localeCompare(a.year));
      setCycles(sorted);
      if (sorted.length > 0) {
        setSelectedCycleId(sorted[0].id); 
      }
    } finally {
      setLoadingCycles(false);
    }
  };

  const fetchForms = async () => {
    try {
      const snap = await getDocs(collection(db, 'Forms'));
      const formsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalForm));
      setForms(formsData);
    } catch (e) {
      console.error("Error fetching forms", e);
    }
  };

  useEffect(() => { 
    fetchCycles(); 
    fetchForms();
  }, []);

  const fetchTeamsData = async () => {
    if (!selectedCycleId) return;
    setLoadingTeams(true);
    try {
      const snap = await getDocs(collection(db, 'Submissions', selectedCycleId, 'teams'));
      const teamsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamData));
      
      setAvailableTeams(Array.from(new Set(teamsData.map(t => t.teamName))));

      let flatSubs: any[] = [];
      teamsData.forEach(team => {
        if (team.submissions) {
          const subsWithTeam = team.submissions.map(s => ({ ...s, teamId: team.id, teamName: team.teamName }));
          flatSubs = [...flatSubs, ...subsWithTeam];
        }
      });
      setFlattenedSubmissions(flatSubs);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeamsData();
  }, [selectedCycleId]);

  // --------------------------------------------------------------------------
  // HIERARCHY LOGIC & HELPER FUNCTIONS
  // --------------------------------------------------------------------------
  const myRecord = employees.find(e => String(e.employeeId) === String(user?.employeeId) || e.email === user?.username);
  const myDirectReports = employees.filter(e => String(e.teamLeaderId) === String(user?.employeeId) || (myRecord && String(e.teamLeaderId) === String(myRecord.employeeId)));
  const mySubmission = flattenedSubmissions.find(s => String(s.employeeId) === String(user?.employeeId) || (myRecord && String(s.employeeId) === String(myRecord.employeeId)));

  const getSubordinates = (managerId: string) => {
    return employees
      .filter(e => String(e.teamLeaderId) === String(managerId))
      .map(emp => {
        const sub = flattenedSubmissions.find(s => String(s.employeeId) === String(emp.employeeId) || String(s.employeeId) === String(emp.id));
        return { ...emp, submission: sub };
      });
  };

  const directReportsWithStatus = useMemo(() => {
    return myDirectReports.map(emp => {
      const sub = flattenedSubmissions.find(s => String(s.employeeId) === String(emp.employeeId) || String(s.employeeId) === String(emp.id));
      return { ...emp, submission: sub };
    }).filter(emp => {
      if (searchQuery && !emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTeam !== 'All' && emp.team !== filterTeam) return false;
      if (filterEmpType !== 'All' && getEmpCategory(emp) !== filterEmpType) return false;
      return true;
    });
  }, [myDirectReports, flattenedSubmissions, searchQuery, filterTeam, filterEmpType]);

  const adminFilteredSubmissions = useMemo(() => {
    return flattenedSubmissions.filter(sub => {
      const isReviewed = sub.isReviewed === true || sub.status === 'Completed'; 
      if (adminActiveTab === 'PENDING' && isReviewed) return false;
      if (adminActiveTab === 'COMPLETED' && !isReviewed) return false;
      if (searchQuery && !sub.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterTeam !== 'All' && sub.teamName !== filterTeam) return false;
      
      const emp = employees.find(e => String(e.employeeId) === String(sub.employeeId));
      const effectiveType = emp ? getEmpCategory(emp) : getEmpCategory(sub);
      
      if (filterEmpType !== 'All' && sub.templateUsed !== filterEmpType && effectiveType !== filterEmpType) return false;
      return true;
    });
  }, [flattenedSubmissions, adminActiveTab, searchQuery, filterTeam, filterEmpType, employees]);

  const normalizedAdminItems = useMemo(() => {
    return adminFilteredSubmissions.map(sub => {
      const emp = employees.find(e => String(e.employeeId) === String(sub.employeeId)) || { 
        id: sub.employeeId,
        employeeId: sub.employeeId,
        employeeName: sub.employeeName,
        employeeType: getEmpCategory(sub),
        team: sub.teamName,
        isTeamLead: sub.isSelfAppraisal,
        teamLeaderId: null 
      };

      return { ...emp, submission: sub };
    });
  }, [adminFilteredSubmissions, employees]);

  // ✅ MOVED HOOKS UP: All useMemo hooks must execute before early returns
  const adminRootItems = useMemo(() => {
    const teamLeads = employees.filter(emp => isTeamLead(emp));
    return teamLeads.map(emp => {
      const sub = flattenedSubmissions.find(
        s => String(s.employeeId) === String(emp.employeeId)
      );
      return {
        ...emp,
        submission: sub || null
      };
    });
  }, [employees, flattenedSubmissions]);

  const listToRender = isAdmin ? adminRootItems : directReportsWithStatus;

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------
  const handleExportCSVAll = () => {
    const dataToExport: any[] = [];
    const baseItems = isAdmin
      ? normalizedAdminItems.filter(emp => {
          const managerExists = normalizedAdminItems.some(
            m => String(m.employeeId) === String(emp.teamLeaderId)
          );
          return !managerExists;
        })
      : directReportsWithStatus;

    const addToList = (items: any[], level: number, managerName: string, path: string[]) => {
      items.forEach(item => {
        const currentPath = [...path, item.employeeName];
        dataToExport.push({ ...item, level, managerName, path: currentPath.join(' > ') });
        const subs = getSubordinates(item.employeeId || item.id);
        if (subs.length > 0) {
          addToList(subs, level + 1, item.employeeName, currentPath);
        }
      });
    };
    addToList(baseItems, 0, isAdmin ? 'Root' : (user?.displayName || ''), []);

    if (dataToExport.length === 0) return alert("No data to download.");

    const headers = [
      'Level', 'Hierarchy Path', 'Employee Name', 'Employee ID', 'Reporting To', 'Team', 'Role Type', 'Is Team Lead', 
      'Status', 'Final Score', 'Reviewed', 'Promoted', 'Submission Date', 'Submission Time', 'Template Used', 'Self Appraisal',
      'Recommendations - Promotion', 'Recommendations - HIPO', 'Recommendations - Correction'
    ];

    const maxQuestions = Math.max(...dataToExport.map(item => item.submission?.answers?.length || 0));
    for (let i = 0; i < maxQuestions; i++) {
      headers.push(
        `Q${i+1} - Question`, `Q${i+1} - Weight (%)`, `Q${i+1} - Self Rating`, 
        `Q${i+1} - Manager Rating`, `Q${i+1} - Self Justification`, `Q${i+1} - Manager Review`
      );
    }

    let csv = headers.join(',') + '\n';
    
    dataToExport.forEach(item => {
      const sub = item.submission;
      
      let submissionDate = 'Not Submitted';
      let submissionTime = '';
      
      if (sub?.submittedAt) {
        const dateObj = new Date(sub.submittedAt);
        submissionDate = dateObj.toLocaleDateString();
        submissionTime = dateObj.toLocaleTimeString();
      }
      
      const row: string[] = [
        String(item.level), 
        `"${item.path}"`, 
        `"${item.employeeName}"`, 
        `"${item.employeeId || ''}"`,
        `"${item.managerName}"`, 
        `"${item.team || sub?.teamName || ''}"`, 
        `"${getEmpCategory(item)}"`,
        isTeamLead(item) ? 'Yes' : 'No', 
        `"${sub?.status || 'Not Started'}"`, 
        sub?.totalScore ? sub.totalScore.toFixed(2) : 'N/A',
        sub?.isReviewed || sub?.status === 'Completed' ? 'Yes' : 'No', 
        sub?.promoted ? 'Yes' : 'No',
        `"${submissionDate}"`,
        `"${submissionTime}"`,
        `"${sub?.templateUsed || ''}"`,
        sub?.isSelfAppraisal ? 'Yes' : 'No', 
        `"${sub?.recommendations?.promotion || 'N/A'}"`,
        `"${sub?.recommendations?.hipo || 'N/A'}"`, 
        `"${sub?.recommendations?.correction || 'N/A'}"`
      ];

      if (sub?.answers) {
        for (let i = 0; i < maxQuestions; i++) {
          const ans = sub.answers[i] || {};
          row.push(
            `"${ans.questionText || ''}"`, 
            String(ans.weightage || ''), 
            String(ans.selfScore || ''),
            String(ans.score || ''), 
            `"${(ans.empReview || '').replace(/"/g, '""')}"`, 
            `"${(ans.leadReview || '').replace(/"/g, '""')}"`
          );
        }
      } else {
        for (let i = 0; i < maxQuestions; i++) row.push('', '', '', '', '', '');
      }

      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Appraisals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleAccordion = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const handlePromote = async (sub: any) => {
    if (!selectedCycleId || !sub.teamId) return;
    setUpdatingPromo(sub.employeeId);
    try {
      const teamRef = doc(db, 'Submissions', selectedCycleId, 'teams', sub.teamId);
      const snap = await getDoc(teamRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatedSubmissions = data.submissions.map((s: any) => {
          if (s.employeeId === sub.employeeId) { return { ...s, promoted: !s.promoted }; }
          return s;
        });
        await updateDoc(teamRef, { submissions: updatedSubmissions });
        await fetchTeamsData(); 
      }
    } catch (error) {
      console.error("Error promoting employee:", error);
      alert("Failed to update promotion status.");
    } finally {
      setUpdatingPromo(null);
    }
  };

  const openAppraisalForm = (mode: 'SELF' | 'REVIEW', empTarget: Employee | null, existingSub: any | null) => {
    setReviewMode(mode);
    setReviewTargetEmployee(empTarget);
    setExistingSubForReview(existingSub);
    setView('REVIEW');
  };

  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '8px', 
    border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? '#2563eb' : '#fff', 
    color: primary ? '#fff' : '#2563eb',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', 
    background: 'var(--bg-primary)', fontSize: '13px', color: 'var(--text-primary)',
    outline: 'none', cursor: 'pointer', minWidth: '130px', flex: '1 1 auto'
  };

  const EmployeeCard = ({ item, isSubordinate = false }: { item: any, isSubordinate?: boolean }) => {
    const sub = item.submission;
    const emp = item;

    const empId = emp.employeeId || emp.id;
    const employeeName = emp.employeeName;
    const employeeType = getEmpCategory(emp);
    const teamName = emp.team || sub?.teamName;
    const isTeamLeadTarget = isTeamLead(emp);

    const isReviewed = sub?.isReviewed || sub?.status === 'Completed';
    const isPendingManager = sub?.status === 'Pending Manager Review';
    const submittedTime = sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Not Started';

    const subordinates = getSubordinates(empId);
    const hasSubordinates = subordinates.length > 0;
    const isExpanded = expandedCards[empId];

    const isDirectManager = String(emp.teamLeaderId) === String(user?.employeeId) || isAdmin;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: isSubordinate ? '12px' : '0' }}>
        <div style={{ 
          background: isSubordinate ? '#f8fafc' : '#fff', 
          border: '1px solid var(--border)', borderRadius: '12px', 
          padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center',
          transition: 'border-color 0.2s', cursor: 'default'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ position: 'relative' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e2e8f0', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
              {employeeName?.charAt(0).toUpperCase()}
            </div>
            {isTeamLeadTarget && <div style={{ position: 'absolute', bottom: -4, right: -4, background: '#fff', borderRadius: '50%', padding: '2px' }}><div style={{ background: '#dbeafe', borderRadius: '50%', padding: '4px', color: '#2563eb' }}><Zap size={10} fill="#2563eb" /></div></div>}
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{employeeName}</h3>
              {isTeamLeadTarget && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}><Zap size={10} fill="#2563eb"/> Lead</span>}
              {sub?.promoted && <Badge label="Promoted" variant="success" />}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#0f172a', fontWeight: 500, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }} />
                {sub?.templateUsed || employeeType}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} color="#64748b"/> {teamName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#64748b' }}>Score:</span> 
                <strong style={{ color: sub?.totalScore >= 4 ? '#2563eb' : 'inherit' }}>{sub?.totalScore?.toFixed(2) || 'N/A'}/5</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                <Clock size={12} /> {submittedTime}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {isAdmin && sub && (
              <button 
                onClick={() => handlePromote(sub)}
                disabled={updatingPromo === sub.employeeId}
                title={sub.promoted ? "Revoke Promotion" : "Promote Employee"}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  border: sub.promoted ? 'none' : '1px solid var(--border)', 
                  background: sub.promoted ? '#16A34A' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: updatingPromo === sub.employeeId ? 'not-allowed' : 'pointer', 
                  color: sub.promoted ? '#fff' : '#16A34A',
                  opacity: updatingPromo === sub.employeeId ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <ThumbsUp size={14} fill={sub.promoted ? "#fff" : "none"} />
              </button>
            )}

            {sub && (
              <button onClick={() => setViewingSubmission(sub)} style={btnStyle(false)}>
                View Details
              </button>
            )}

            {isDirectManager && !isAdmin && (
              <>
                {!sub && !isTeamLeadTarget && (
                  <button onClick={() => openAppraisalForm('REVIEW', emp, null)} style={btnStyle(true)}>
                    Start Review
                  </button>
                )}
                {!sub && isTeamLeadTarget && (
                  <button disabled style={{ ...btnStyle(false), background: '#f1f5f9', color: '#94a3b8', borderColor: '#e2e8f0', cursor: 'not-allowed' }}>
                    Awaiting Self Appr.
                  </button>
                )}
                {sub && isPendingManager && (
                  <button onClick={() => openAppraisalForm('REVIEW', emp, sub)} style={{ ...btnStyle(true), background: '#D97706' }}>
                    Evaluate
                  </button>
                )}
                {sub && !isReviewed && !isPendingManager && !isTeamLeadTarget && (
                  <button onClick={() => openAppraisalForm('REVIEW', emp, sub)} style={btnStyle(true)}>
                    Continue
                  </button>
                )}
              </>
            )}

            {hasSubordinates && (
              <button 
                onClick={() => toggleAccordion(empId)}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>
        </div>

        {isExpanded && hasSubordinates && (
          <div style={{ marginLeft: '12px', paddingLeft: '12px', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {subordinates.map(subItem => (
              <EmployeeCard key={subItem.employeeId} item={subItem} isSubordinate={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ✅ EARLY RETURNS ARE NOW SAFE! Hooks have already been rendered.
  if (view === 'FORMS') return <FormsManager forms={forms} onFormsChange={fetchForms} onBack={() => setView('LIST')} />;
  
  if (view === 'REVIEW' && selectedCycleId) {
    const selectedCycle = cycles.find(c => c.id === selectedCycleId);
    return (
      <AppraisalReviewPage 
        cycleId={selectedCycleId} 
        mode={reviewMode}
        targetEmployee={reviewTargetEmployee}
        existingSubmission={existingSubForReview}
        availableForms={forms}
        assignedForms={selectedCycle?.assignedForms || {}}
        onBack={() => { 
          setView('LIST'); 
          setReviewTargetEmployee(null);
          setExistingSubForReview(null);
          fetchTeamsData(); 
        }} 
      />
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              Appraisal Submissions
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>Select Cycle Year:</span>
              {loadingCycles ? (
                 <LoadingSpinner size={16} />
              ) : (
                <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} style={{...selectStyle, fontSize: '14px', fontWeight: 600, borderColor: '#2563eb', color: '#2563eb'}}>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.year}</option>)}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={{ ...btnStyle(false), background: '#f8fafc', color: '#0f172a', padding: '10px 18px', fontSize: '14px' }} onClick={handleExportCSVAll}>
              <Download size={16} /> Export Data
            </button>
            {isAdmin && (
              <>
                <button style={{...btnStyle(false), padding: '10px 18px', fontSize: '14px'}} onClick={() => setView('FORMS')} onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <Settings size={16} /> Manage Forms
                </button>
                <button style={{...btnStyle(true), padding: '10px 18px', fontSize: '14px'}} onClick={() => setShowCreate(true)} onMouseEnter={e => (e.currentTarget.style.background = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.background = '#2563eb')}>
                  <Plus size={16} /> New Cycle
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {isAdmin ? (
          [
            { id: 'ALL', label: `All Submissions (${flattenedSubmissions.length})` },
            { id: 'PENDING', label: `Pending Review (${flattenedSubmissions.filter(s => !s.isReviewed && s.status !== 'Completed').length})` },
            { id: 'COMPLETED', label: `Completed (${flattenedSubmissions.filter(s => s.isReviewed || s.status === 'Completed').length})` }
          ].map(tab => (
            <div 
              key={tab.id} 
              onClick={() => setAdminActiveTab(tab.id as any)}
              style={{ 
                paddingBottom: '12px', fontSize: '14px', fontWeight: adminActiveTab === tab.id ? 600 : 500,
                color: adminActiveTab === tab.id ? '#2563eb' : '#64748b',
                borderBottom: adminActiveTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </div>
          ))
        ) : (
          [
            { id: 'TEAM', label: `My Team's Appraisals (${myDirectReports.length})` },
            { id: 'SELF', label: `My Self Appraisal` }
          ].map(tab => (
            <div 
              key={tab.id} 
              onClick={() => setTlActiveTab(tab.id as any)}
              style={{ 
                paddingBottom: '12px', fontSize: '14px', fontWeight: tlActiveTab === tab.id ? 600 : 500,
                color: tlActiveTab === tab.id ? '#2563eb' : '#64748b',
                borderBottom: tlActiveTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </div>
          ))
        )}
      </div>

      {/* Search & Filters */}
      {(isAdmin || tlActiveTab === 'TEAM') && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px 16px' }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by employee name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '10px', width: '100%', outline: 'none', fontSize: '13px', color: '#0f172a' }}
            />
          </div>
          
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={selectStyle}>
            <option value="All">All Teams</option>
            {isAdmin
              ? availableTeams.map(t => <option key={t} value={t}>{t}</option>)
              : Array.from(new Set(myDirectReports.map(emp => emp.team))).map(team => <option key={team} value={team}>{team}</option>)
            }
          </select>

          <select value={filterEmpType} onChange={e => setFilterEmpType(e.target.value)} style={selectStyle}>
            <option value="All">All Types</option>
            <option value="Sales">Sales</option>
            <option value="Non-Sales">Non-Sales</option>
          </select>
        </div>
      )}

      {loadingTeams ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><LoadingSpinner size={36} /></div>
      ) : (
        <>
          {(isAdmin || tlActiveTab === 'TEAM') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {listToRender.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>No records found</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Try adjusting your filters or selecting a different cycle.</div>
                </div>
              ) : (
                listToRender.map((item) => <EmployeeCard key={item.id || item.employeeId} item={item} />)
              )}
            </div>
          )}

          {!isAdmin && tlActiveTab === 'SELF' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.02)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <User size={32} color="#2563eb" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>My Self Appraisal</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
                  As a Team Lead, you must fill out your self-justification for this cycle. Once submitted, your reporting manager will evaluate your performance and provide final scores.
                </p>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Status</span>
                    <Badge 
                      label={!mySubmission ? 'Not Started' : (mySubmission.isReviewed ? 'Completed' : mySubmission.status)} 
                      variant={mySubmission?.isReviewed ? 'success' : (!mySubmission ? 'default' : 'warning')} 
                    />
                  </div>
                  {mySubmission?.submittedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Submitted At</span>
                      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{new Date(mySubmission.submittedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {mySubmission?.isReviewed && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Final Score</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>{mySubmission.totalScore?.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {!mySubmission ? (
                  <button onClick={() => openAppraisalForm('SELF', myRecord || null, null)} style={{ ...btnStyle(true), width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px' }}>
                    <Edit size={16} /> Start Self Appraisal
                  </button>
                ) : (
                  <button onClick={() => setViewingSubmission(mySubmission)} style={{ ...btnStyle(false), width: '100%', justifyContent: 'center', padding: '12px', fontSize: '13px' }}>
                    View Submitted Appraisal
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <CreateAppraisalModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchCycles} forms={forms} />
      
      <SubmissionDetailsModal 
        submission={viewingSubmission} 
        onClose={() => setViewingSubmission(null)} 
      />
    </div>
  );
};

// ============================================================================
// SUBMISSION DETAILS MODAL (Read-Only View)
// ============================================================================
const SubmissionDetailsModal = ({ submission, onClose }: { submission: any, onClose: () => void }) => {
  if (!submission) return null;
  const isReviewed = submission.isReviewed === true || submission.status === 'Completed';

  return (
    <Modal open={!!submission} onClose={onClose} title="Appraisal Details" width={800}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700 }}>
            {submission.employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {submission.employeeName}
              {submission.isSelfAppraisal && <Badge label="Self Appraisal" variant="info" />}
              {isReviewed && <Badge label="Completed" variant="success" />}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {submission.templateUsed || submission.employeeType} Template • Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '4px' }}>FINAL SCORE</div>
          <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: !isReviewed && !submission.totalScore ? 'var(--text-muted)' : (submission.totalScore >= 4 ? '#2563eb' : submission.totalScore >= 3 ? 'var(--warning)' : 'var(--danger)') }}>
            {!isReviewed && !submission.totalScore ? 'N/A' : submission.totalScore?.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px', marginBottom: '24px' }}>
        {submission.answers?.map((ans: any, i: number) => (
          <div key={i} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ flex: '1 1 200px' }}>
                <Badge label={`Weight: ${ans.weightage}%`} variant="default" />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', lineHeight: 1.4 }}>
                  {i + 1}. {ans.questionText}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {submission.isSelfAppraisal && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center', minWidth: '110px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>SELF RATING</div>
                    {ans.selfScore ? (
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{ans.selfScore.toFixed(1)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </div>
                )}
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', textAlign: 'center', minWidth: '110px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>{submission.isSelfAppraisal ? 'MANAGER RATING' : 'RATING'}</div>
                  {isReviewed || ans.score ? (
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563eb' }}>{ans.score.toFixed(1)}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>{submission.isSelfAppraisal ? 'SELF JUSTIFICATION' : "EMPLOYEE'S REVIEW"}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ans.empReview || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No comment provided.</span>}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>{submission.isSelfAppraisal ? "MANAGER'S REVIEW" : "LEAD'S REVIEW"}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ans.leadReview || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{!isReviewed ? 'Awaiting Final Review...' : 'No comment provided.'}</span>}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isReviewed && submission.recommendations && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Final Recommendations</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {Object.entries(submission.recommendations).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key === 'hipo' ? 'HIPO' : key}:</span>
                <Badge label={val as string} variant={val === 'Yes' ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ background: '#fff', border: '1px solid var(--border)', padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>
          Close
        </button>
      </div>
    </Modal>
  );
};

const AppraisalReviewPage = ({ 
  cycleId, mode, targetEmployee, existingSubmission, availableForms, assignedForms, onBack 
}: { 
  cycleId: string; mode: 'SELF' | 'REVIEW'; targetEmployee: Employee | null; existingSubmission: any; availableForms: AppraisalForm[]; assignedForms: Record<string, string>; onBack: () => void 
}) => {
  const { user } = useAuth();
  
  const [answers, setAnswers] = useState<Record<string, { score: number; selfScore: number; empReview: string; leadReview: string }>>({});
  const [recommendations, setRecommendations] = useState({ promotion: 'No', hipo: 'No', correction: 'No' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isTargetLead = isTeamLead(targetEmployee);
  const isReviewingTeamLead = mode === 'REVIEW' && isTargetLead;
  
  const empTypeKey = isTargetLead ? 'Team Lead' : getEmpCategory(targetEmployee);
  
  const assignedFormId = assignedForms?.[empTypeKey];
  const activeForm = availableForms.find(f => f.id === assignedFormId) || availableForms.find(f => f.employeeType === empTypeKey) || availableForms[0];
  const activeQuestions = activeForm?.questions || [];

  useEffect(() => {
    setAnswers({});
    setError('');

    if (existingSubmission) {
      const loadedAnswers: any = {};
      existingSubmission.answers.forEach((ans: any, i: number) => {
        const qId = activeQuestions[i]?.id || `q_${i}`;
        loadedAnswers[qId] = { 
          score: ans.score || 0, 
          selfScore: ans.selfScore || 0,
          empReview: ans.empReview || '', 
          leadReview: ans.leadReview || '' 
        };
      });
      setAnswers(loadedAnswers);
      if (existingSubmission.recommendations) {
        setRecommendations(existingSubmission.recommendations);
      }
    }
  }, [existingSubmission, activeForm]);

  const handleSubmit = async () => {
    if (!targetEmployee || !activeQuestions) return;
    
    if (mode === 'REVIEW') {
      const allAnswered = activeQuestions.every(q => answers[q.id]?.score > 0);
      if (!allAnswered) { setError('Please provide a slider rating for all criteria before submitting.'); return; }
    } else if (mode === 'SELF') {
      const allSelfAnswered = activeQuestions.every(q => answers[q.id]?.selfScore > 0);
      if (!allSelfAnswered) { setError('Please provide a self-rating slider value for all criteria before submitting.'); return; }
    }
    
    setSaving(true); setError('');
    try {
      let totalScore = 0;
      const finalAnswers = activeQuestions.map(q => {
        const ans = answers[q.id] || { score: 0, selfScore: 0, empReview: '', leadReview: '' };
        totalScore += (ans.score * (q.weight / 100)); 
        return {
          questionText: q.text || '',
          weightage: q.weight || 0,
          score: ans.score,
          selfScore: ans.selfScore,
          empReview: ans.empReview || '', 
          leadReview: ans.leadReview || '', 
        };
      });

      const safeTeamName = targetEmployee.team || 'Unknown';
      const teamDocId = safeTeamName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '_') || 'Unknown';
      
      const submissionData = {
        employeeId: targetEmployee.employeeId || targetEmployee.id || '',
        employeeName: targetEmployee.employeeName || '',
        employeeType: getEmpCategory(targetEmployee),
        teamName: safeTeamName,
        templateUsed: activeForm?.name || 'Standard Form',
        isSelfAppraisal: mode === 'SELF' || isReviewingTeamLead || false,
        answers: finalAnswers,
        totalScore: mode === 'SELF' ? 0 : totalScore || 0,
        recommendations: mode === 'SELF' ? null : {
          promotion: recommendations.promotion || 'No',
          hipo: recommendations.hipo || 'No',
          correction: recommendations.correction || 'No'
        },
        submittedBy: user?.displayName,
        submittedAt: existingSubmission?.submittedAt || new Date().toISOString(),
        status: mode === 'SELF' ? 'Pending Manager Review' : 'Completed',
        isReviewed: mode === 'REVIEW' || false,
        promoted: existingSubmission?.promoted || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const cleanData = JSON.parse(JSON.stringify(submissionData));
      const teamDocRef = doc(db, 'Submissions', cycleId, 'teams', teamDocId);
      
      const teamDocSnap = await getDoc(teamDocRef);
      if (teamDocSnap.exists()) {
        const currentData = teamDocSnap.data();
        let updatedSubmissions = currentData.submissions || [];
        
        updatedSubmissions = updatedSubmissions.filter((s: any) => String(s.employeeId) !== String(submissionData.employeeId));
        updatedSubmissions.push(cleanData);

        await updateDoc(teamDocRef, { 
          submissions: updatedSubmissions,
          lastUpdated: new Date().toISOString() 
        });
      } else {
        await setDoc(teamDocRef, { 
          teamName: safeTeamName,
          submissions: [cleanData],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }

      onBack();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Submission failed.');
    } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '12px 14px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };

  const ScoreSlider = ({ value, onChange, readOnly = false }: { value: number, onChange?: (val: number) => void, readOnly?: boolean }) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
        <input 
          type="range" 
          min="0" max="5" step="1" 
          value={value} 
          onChange={e => onChange && onChange(parseFloat(e.target.value))}
          disabled={readOnly}
          style={{ flex: 1, accentColor: '#2563eb', cursor: readOnly ? 'default' : 'pointer', opacity: readOnly ? 0.6 : 1 }}
        />
        <div style={{ width: '48px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
          {value.toFixed(2)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>
            {mode === 'SELF' ? 'Self Appraisal Form' : (isReviewingTeamLead ? "Evaluate Team Lead Appraisal" : "Employee Appraisal Form")}
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cycle: {cycleId.replace('appraisal_', '')}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', letterSpacing: '0.06em' }}>TARGET EMPLOYEE</label>
          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {targetEmployee?.employeeName} {mode === 'SELF' ? '(Self)' : ''}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', letterSpacing: '0.06em' }}>ASSIGNED TEMPLATE</label>
          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {activeForm?.name || 'Standard Form'}
          </div>
        </div>
      </div>

      {targetEmployee && activeQuestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '8px',
              color: '#0f172a'
            }}>
              Rating Guide
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))',
              gap: '8px',
              fontSize: '12px',
              color: '#475569'
            }}>
              <div><strong>1</strong> – Poor</div>
              <div><strong>2</strong> – Needs Improvement</div>
              <div><strong>3</strong> – Meets Standards</div>
              <div><strong>4</strong> – Exceeds Expectation</div>
              <div><strong>5</strong> – Role Model</div>
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
            Performance Metrics
          </div>

          {activeQuestions.map((q, index) => (
            <div key={q.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{index + 1}. {q.text}</div>
                <Badge label={`Weight: ${q.weight}%`} variant="info" />
              </div>
              
              <div style={{ padding: '20px' }}>
                {mode === 'SELF' ? (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>MY SELF JUSTIFICATION</label>
                      <textarea 
                        placeholder="Input your self-assessment here. Your reporting manager will score this."
                        value={answers[q.id]?.empReview || ''} 
                        onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], empReview: e.target.value } }))}
                        style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '12px' }}>MY SELF RATING (0-5)</div>
                      <ScoreSlider 
                        value={answers[q.id]?.selfScore || 0} 
                        onChange={(s) => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], selfScore: s } }))} 
                      />
                    </div>
                  </>
                ) : isReviewingTeamLead ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>TEAM LEAD'S SELF JUSTIFICATION</label>
                        <div style={{ ...inputStyle, minHeight: '80px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {answers[q.id]?.empReview || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No self-justification provided.</span>}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>MANAGER'S REVIEW</label>
                        <textarea 
                          placeholder="Input your assessment of the Team Lead..."
                          value={answers[q.id]?.leadReview || ''}
                          onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], leadReview: e.target.value } }))}
                          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', borderColor: '#2563eb', background: 'var(--bg-primary)' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '12px' }}>TEAM LEAD'S SELF RATING</div>
                        <ScoreSlider value={answers[q.id]?.selfScore || 0} readOnly={true} />
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', letterSpacing: '0.05em', marginBottom: '12px' }}>MANAGER RATING (0-5)</div>
                        <ScoreSlider 
                          value={answers[q.id]?.score || 0} 
                          onChange={(s) => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], score: s } }))} 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>EMPLOYEE'S REVIEW / JUSTIFICATION</label>
                        <textarea 
                          placeholder="Input employee's perspective here..."
                          value={answers[q.id]?.empReview || ''}
                          onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], empReview: e.target.value } }))}
                          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>LEAD'S REVIEW / JUSTIFICATION</label>
                        <textarea 
                          placeholder="Input your assessment here..."
                          value={answers[q.id]?.leadReview || ''}
                          onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], leadReview: e.target.value } }))}
                          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', borderColor: '#2563eb', background: 'var(--bg-secondary)' }}
                        />
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '12px' }}>RATING (0-5)</div>
                      <ScoreSlider 
                        value={answers[q.id]?.score || 0} 
                        onChange={(s) => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], score: s } }))} 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {mode === 'REVIEW' && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginTop: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Final Recommendations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {['promotion', 'hipo', 'correction'].map(type => (
                  <div key={type}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>
                      Recommend {type === 'hipo' ? 'as a HIPO' : type}
                    </label>
                    <select 
                      value={(recommendations as any)[type]} 
                      onChange={e => setRecommendations(p => ({ ...p, [type]: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div style={{ padding: '12px', background: 'rgba(220,38,38,0.1)', color: 'var(--danger)', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', paddingBottom: '40px' }}>
            <button onClick={handleSubmit} disabled={saving} style={{
              background: '#2563eb', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s', opacity: saving ? 0.7 : 1
            }}>
              {saving ? 'Saving...' : (mode === 'SELF' ? 'Submit for Manager Review' : 'Finalize & Submit Review')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FormsManager = ({ forms, onFormsChange, onBack }: { forms: AppraisalForm[], onFormsChange: () => void, onBack: () => void }) => {
  const [activeFormId, setActiveFormId] = useState<string | null>(forms[0]?.id || null);
  const [editingForm, setEditingForm] = useState<AppraisalForm | null>(forms[0] || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeFormId) {
      if (activeFormId.startsWith('form_new_')) return; 
      
      const f = forms.find(x => x.id === activeFormId);
      if (f) setEditingForm(f);
    }
  }, [activeFormId, forms]);

  const handleCreateNew = () => {
    const newId = `form_new_${Date.now()}`; 
    const newForm: AppraisalForm = {
      id: newId,
      name: '', 
      employeeType: 'Non-Sales',
      createdAt: new Date().toISOString(),
      questions: [{ id: Date.now().toString(), text: '', weight: 0 }] 
    };
    setEditingForm(newForm);
    setActiveFormId(newForm.id);
  };

  const handleSave = async () => {
    if (!editingForm) return;
    
    if (!editingForm.name.trim()) {
      alert("Please provide a name for this form.");
      return;
    }

    const sum = editingForm.questions.reduce((acc, q) => acc + (Number(q.weight) || 0), 0);
    if (sum !== 100) {
      alert(`Weights must total exactly 100%.\nCurrently it is ${sum}%.`);
      return;
    }

    setSaving(true);
    
    const finalFormToSave = { ...editingForm };
    if (finalFormToSave.id.startsWith('form_new_')) {
      finalFormToSave.id = `form_${Date.now()}`;
    }

    await setDoc(doc(db, 'Forms', finalFormToSave.id), finalFormToSave);
    
    onFormsChange(); 
    setActiveFormId(finalFormToSave.id); 
    setSaving(false);
    alert('Form saved successfully!');
  };

  const handleDelete = async () => {
    if (!editingForm) return;
    if (window.confirm(`Are you sure you want to delete ${editingForm.name || 'this form'}?`)) {
      if (!editingForm.id.startsWith('form_new_')) {
        await deleteDoc(doc(db, 'Forms', editingForm.id));
      }
      onFormsChange();
      setActiveFormId(forms[0]?.id || null);
    }
  };

  const updateQuestion = (index: number, field: keyof QuestionDef, value: any) => {
    if (!editingForm) return;
    const arr = [...editingForm.questions];
    
    if (field === 'weight') {
      let numericValue = value === '' ? 0 : parseInt(value, 10);
      if (isNaN(numericValue)) numericValue = 0;
      arr[index] = { ...arr[index], [field]: numericValue };
    } else {
      arr[index] = { ...arr[index], [field]: value };
    }
    
    setEditingForm({ ...editingForm, questions: arr });
  };

  const addQuestion = () => {
    if (!editingForm) return;
    setEditingForm({ 
      ...editingForm, 
      questions: [...editingForm.questions, { id: Date.now().toString(), text: '', weight: 0 }] 
    });
  };

  const removeQuestion = (index: number) => {
    if (!editingForm) return;
    setEditingForm({ 
      ...editingForm, 
      questions: editingForm.questions.filter((_, idx) => idx !== index) 
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, width: 'fit-content' }}>
        <ArrowLeft size={16} /> Back to Submissions
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
        {/* Sidebar: Form List */}
        <div style={{ flex: '1 1 250px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Forms</h2>
            <button onClick={handleCreateNew} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Plus size={16}/></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeFormId?.startsWith('form_new_') && editingForm && (
              <div 
                onClick={() => setActiveFormId(editingForm.id)}
                style={{ 
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                  background: '#eff6ff', border: `1px solid #2563eb`, borderLeft: '4px solid #2563eb'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>{editingForm.name || 'Unsaved Form...'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type: {editingForm.employeeType}</div>
              </div>
            )}
            
            {forms.map(f => (
              <div 
                key={f.id} 
                onClick={() => setActiveFormId(f.id)}
                style={{ 
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeFormId === f.id ? '#eff6ff' : 'var(--bg-primary)',
                  border: `1px solid ${activeFormId === f.id ? '#2563eb' : 'var(--border)'}`,
                  borderLeft: activeFormId === f.id ? '4px solid #2563eb' : '1px solid var(--border)'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: activeFormId === f.id ? '#2563eb' : 'var(--text-primary)', marginBottom: '4px' }}>{f.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type: {f.employeeType}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Area: Form Editor */}
        <div style={{ flex: '2 1 300px', minWidth: '250px' }}>
          {editingForm ? (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '32px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input 
                    type="text" 
                    value={editingForm.name} 
                    onChange={e => setEditingForm({...editingForm, name: e.target.value})}
                    style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', border: 'none', background: 'transparent', outline: 'none', width: '100%', marginBottom: '8px', padding: '0', borderBottom: '1px dashed transparent' }}
                    placeholder="Enter Form Name..."
                    onFocus={e => e.target.style.borderBottom = '1px dashed #2563eb'}
                    onBlur={e => e.target.style.borderBottom = '1px dashed transparent'}
                  />
                  <select 
                    value={editingForm.employeeType} 
                    onChange={e => setEditingForm({...editingForm, employeeType: e.target.value as 'Sales' | 'Non-Sales' | 'Team Lead'})}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="Sales">Sales Employees</option>
                    <option value="Non-Sales">Non-Sales Employees</option>
                    <option value="Team Lead">Team Leads</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(220,38,38,0.08)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                    {saving ? 'Saving...' : 'Save Form'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Questions</h3>
                <Badge label={`Total Weight: ${editingForm.questions.reduce((a,b)=>a+(Number(b.weight)||0), 0)}%`} variant={editingForm.questions.reduce((a,b)=>a+(Number(b.weight)||0), 0) === 100 ? 'success' : 'danger'} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {editingForm.questions.map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px', flexShrink: 0 }}>
                      {i+1}
                    </div>
                    <textarea 
                      value={q.text} 
                      onChange={e => updateQuestion(i, 'text', e.target.value)} 
                      placeholder="Enter question criteria..."
                      style={{ flex: 1, padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '44px' }} 
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', padding: '0 12px', border: '1px solid var(--border)', borderRadius: '10px', height: '44px' }}>
                        <input 
                          type="text" 
                          value={q.weight === 0 ? '' : q.weight} 
                          placeholder="0"
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            updateQuestion(i, 'weight', val);
                          }} 
                          style={{ width: '40px', background: 'transparent', border: 'none', fontSize: '14px', fontWeight: 600, outline: 'none', textAlign: 'center' }} 
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    </div>
                    <button onClick={() => removeQuestion(i)} style={{ padding: '12px', background: 'rgba(220,38,38,0.05)', color: 'var(--danger)', border: '1px solid transparent', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', height: '44px' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(220,38,38,0.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={addQuestion} style={{ padding: '14px', border: '1px dashed var(--border)', borderRadius: '10px', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '14px', marginTop: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Plus size={16} /> Add Another Question
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '14px', border: '1px dashed var(--border)', borderRadius: '16px', minHeight: '300px' }}>Select a form to edit or create a new one.</div>
          )}
        </div>
      </div>
    </div>
  );
};