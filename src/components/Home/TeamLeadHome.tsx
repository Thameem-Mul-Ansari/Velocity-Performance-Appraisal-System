import { useEffect, useState, useMemo } from 'react';
import { Users, Clock, ClipboardList, Target, Trophy, Star, BarChart3, Building2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { StatCard } from '../UI/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { LoadingSpinner } from '../UI/LoadingSpinner';

// --- INJECTED RESPONSIVE CSS ---
const responsiveStyles = `
  .tl-container { padding: clamp(16px, 4vw, 32px); max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif; }
  .tl-header { margin-bottom: clamp(24px, 4vw, 32px); }
  .tl-header-title { font-size: clamp(20px, 5vw, 26px); font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: #0f172a; margin: 0; }
  .tl-header-sub { font-size: clamp(12px, 3vw, 14px); color: #64748b; padding-left: 16px; margin-top: 4px; }
  
  .tl-alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-size: 14px; font-weight: 500; color: #92400e; }
  
  .tl-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: clamp(12px, 2vw, 16px); margin-bottom: clamp(24px, 4vw, 32px); }
  
  .tl-layout { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
  .tl-col-left { flex: 1 1 min(100%, 600px); display: flex; flex-direction: column; gap: 24px; min-width: 0; }
  .tl-col-right { flex: 1 1 min(100%, 350px); background: #fff; border: 1px solid var(--border); border-radius: 16px; display: flex; flex-direction: column; height: 540px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02); min-width: 0; }
  
  .tl-card { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: clamp(16px, 4vw, 24px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02); }
  .tl-card-title { font-size: 16px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; margin: 0; }
  
  .tl-progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .tl-progress-val { font-size: clamp(20px, 4vw, 24px); font-weight: 800; color: #2563eb; font-family: 'Space Grotesk', sans-serif; }
  .tl-progress-track { width: 100%; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
  .tl-progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%); transition: width 1s ease-in-out; }
  .tl-progress-footer { display: flex; justify-content: space-between; margin-top: 8px; font-size: clamp(11px, 3vw, 13px); color: #64748b; font-weight: 500; }
  
  .tl-chart-wrapper { display: flex; align-items: flex-end; justify-content: space-around; gap: clamp(8px, 2vw, 16px); height: 220px; padding-top: 20px; }
  .tl-chart-col { flex: 1; max-width: 80px; display: flex; flex-direction: column; align-items: center; gap: 10px; height: 100%; }
  .tl-chart-count { font-size: clamp(12px, 3vw, 14px); font-weight: 700; color: #0f172a; }
  .tl-chart-bar-bg { position: relative; width: 100%; max-width: 60px; height: 100%; background: #f1f5f9; border-radius: 6px; overflow: hidden; display: flex; align-items: flex-end; }
  .tl-chart-label { font-size: clamp(10px, 2.5vw, 12px); color: #64748b; text-align: center; font-weight: 600; white-space: nowrap; }
  
  .tl-performers-header { padding: clamp(16px, 3vw, 20px) clamp(16px, 4vw, 24px); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 16px 16px 0 0; }
  .tl-performers-badge { font-size: 12px; background: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 100px; font-weight: 600; white-space: nowrap; }
  .tl-performers-list { flex: 1; overflow-y: auto; padding: clamp(12px, 3vw, 16px); display: flex; flex-direction: column; gap: 8px; }
  
  .tl-performer-row { display: flex; align-items: center; gap: clamp(8px, 2vw, 12px); padding: clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px); border-radius: 12px; transition: transform 0.2s, box-shadow 0.2s; cursor: default; flex-wrap: nowrap; }
  .tl-performer-rank { width: 28px; font-size: 16px; font-weight: 800; text-align: center; flex-shrink: 0; }
  .tl-performer-avatar { width: clamp(32px, 8vw, 40px); height: clamp(32px, 8vw, 40px); border-radius: 50%; background: #e2e8f0; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: clamp(14px, 4vw, 16px); font-weight: 700; flex-shrink: 0; }
  .tl-performer-info { flex: 1; min-width: 0; }
  .tl-performer-name { font-size: clamp(13px, 3.5vw, 14px); font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-performer-role { font-size: clamp(11px, 3vw, 12px); color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-performer-score { font-size: clamp(14px, 4vw, 16px); font-weight: 800; color: #2563eb; display: flex; align-items: center; gap: 2px; font-family: 'Space Grotesk', sans-serif; flex-shrink: 0; }

  @media (max-width: 480px) {
    .tl-progress-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .tl-col-right { height: 450px; }
    .tl-performer-row { flex-wrap: wrap; }
  }
`;

const getEmpCategory = (emp: any) => {
  const typeStr = String(emp?.employmentType || '').toUpperCase();
  if (typeStr.includes('NON')) return 'Non-Sales';
  if (typeStr.includes('SALES')) return 'Sales';
  return 'Non-Sales';
};

const isActive = (emp: any) => String(emp?.status || '').toUpperCase() === 'ACTIVE';
const isTeamLead = (emp: any) => emp?.isTeamLead === true || String(emp?.isTeamLead).toUpperCase() === 'TRUE';

export const TeamLeadHome = () => {
  const { user } = useAuth();
  const { employees, employeesLoaded, employeesLoading, fetchEmployees } = useData();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [cycleName, setCycleName] = useState('');
  const [isSelfAppraisalRequired, setIsSelfAppraisalRequired] = useState(false);

  const myRecord = useMemo(() => 
    employees.find(e => String(e.employeeId) === String(user?.employeeId) || e.email === user?.username),
    [employees, user]
  );
  
  const myDirectReports = useMemo(() => 
    employees.filter(e => String(e.teamLeaderId) === String(user?.employeeId) || 
      (myRecord && String(e.teamLeaderId) === String(myRecord.employeeId))),
    [employees, user, myRecord]
  );

  const activeDirectReports = useMemo(() => 
    myDirectReports.filter(e => isActive(e)), 
    [myDirectReports]
  );

  useEffect(() => {
    if (!employeesLoaded) fetchEmployees();
  }, [fetchEmployees, employeesLoaded]);

  useEffect(() => {
    const fetchTeamAnalytics = async () => {
      if (!employeesLoaded) return;
      
      setSubsLoading(true);
      
      try {
        const snap = await getDocs(collection(db, 'Submissions'));
        const cycles = snap.docs.map(d => ({ id: d.id, ...d.data() as any }))
          .sort((a, b) => b.year.localeCompare(a.year));
        
        if (cycles.length > 0) {
          const latestCycle = cycles[0];
          setCycleName(latestCycle.year);
          
          const assignedLeads = latestCycle.assignedLeads || [];
          setIsSelfAppraisalRequired(assignedLeads.includes(String(user?.employeeId)));
          
          const teamsSnap = await getDocs(collection(db, 'Submissions', latestCycle.id, 'teams'));
          
          const myReportIds = new Set([
            ...myDirectReports.map(emp => String(emp.employeeId)),
            String(user?.employeeId)
          ]);

          let directReportSubs: any[] = [];

          teamsSnap.docs.forEach(teamDoc => {
            const data = teamDoc.data();
            if (data.submissions) {
              const matchingSubs = data.submissions.filter((s: any) => 
                myReportIds.has(String(s.employeeId))
              );
              directReportSubs.push(...matchingSubs);
            }
          });
          
          setSubmissions(directReportSubs);
        }
      } catch (error) {
        console.error("Error fetching team analytics:", error);
      } finally {
        setSubsLoading(false);
      }
    };

    fetchTeamAnalytics();
  }, [employeesLoaded, myDirectReports, user]);

  const businessUnit = myRecord?.businessUnit || 'Not Assigned';
  
  const { pendingCount, completedCount, completedDirectSubs } = useMemo(() => {
    let pCount = 0;
    let cCount = 0;
    const cList: any[] = [];

    // Check Direct Reports ONLY
    activeDirectReports.forEach(emp => {
      const sub = submissions.find(s => String(s.employeeId) === String(emp.employeeId));
      const isDone = sub && (sub.isReviewed || sub.status === 'Completed' || (sub.totalScore && sub.totalScore > 0));
      const empIsLead = isTeamLead(emp);

      if (isDone) {
        cCount++;
        cList.push(sub);
      } else {
        if (!empIsLead || sub) {
          pCount++;
        }
      }
    });

    return { pendingCount: pCount, completedCount: cCount, completedDirectSubs: cList };
  }, [submissions, activeDirectReports]);
  
  const expectedSubmissions = activeDirectReports.length;
  const completionRate = expectedSubmissions > 0 ? Math.min((completedCount / expectedSubmissions) * 100, 100) : 0;

  const scoreDist = useMemo(() => {
    const dist = [
      { label: '4.5+', count: 0, color: '#16A34A' },
      { label: '4.0-4.49', count: 0, color: '#2563EB' },
      { label: '3.0-3.99', count: 0, color: '#D97706' },
      { label: '<3.0', count: 0, color: '#DC2626' }
    ];

    completedDirectSubs.forEach(s => {
      if (s.totalScore >= 4.5) dist[0].count++;
      else if (s.totalScore >= 4.0) dist[1].count++;
      else if (s.totalScore >= 3.0) dist[2].count++;
      else dist[3].count++;
    });

    return dist;
  }, [completedDirectSubs]);

  const maxDistCount = useMemo(() => 
    Math.max(...scoreDist.map(d => d.count), 1),
    [scoreDist]
  );

  const topEmployees = useMemo(() => 
    [...completedDirectSubs]
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, 10),
    [completedDirectSubs]
  );

  const employeeMap = useMemo(() => {
    const map = new Map();
    myDirectReports.forEach(emp => {
      map.set(String(emp.employeeId), emp);
    });
    return map;
  }, [myDirectReports]);

  if (employeesLoading && !employeesLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <LoadingSpinner size={36} />
      </div>
    );
  }

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="tl-container">
        
        <div className="tl-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: 'clamp(20px, 4vw, 28px)', background: '#2563eb', borderRadius: '4px' }} />
            <h1 className="tl-header-title">Team Dashboard</h1>
          </div>
          <p className="tl-header-sub">
            {myRecord?.team || user?.teamName || 'My Team'} · {cycleName ? `Appraisal Cycle ${cycleName}` : 'Performance Overview'}
          </p>
        </div>

        {isSelfAppraisalRequired && (
          <div className="tl-alert">
            ⚠ Your self appraisal is pending for this cycle.
          </div>
        )}

        <div className="tl-stats-grid">
          <StatCard title="Team Members" value={activeDirectReports.length} icon={<Users size={19} />} accentColor="#2563EB" />
          <StatCard title="Business Unit" value={businessUnit} icon={<Building2 size={19} />} accentColor="#0284C7"/>
          <StatCard title="Pending Reviews" value={pendingCount} icon={<Clock size={19} />} accentColor="#D97706" />
          <StatCard title="Completed" value={completedCount} icon={<ClipboardList size={19} />} accentColor="#16A34A" />
        </div>

        <div className="tl-layout">
          
          <div className="tl-col-left">
            
            <div className="tl-card">
              <div className="tl-progress-header">
                <h3 className="tl-card-title">
                  <Target size={18} color="#2563eb" /> Team Appraisal Progress
                </h3>
                <span className="tl-progress-val">
                  {completionRate.toFixed(1)}%
                </span>
              </div>
              <div className="tl-progress-track">
                <div className="tl-progress-fill" style={{ width: `${completionRate}%` }} />
              </div>
              <div className="tl-progress-footer">
                <span>{completedCount} Completed</span>
                <span>{expectedSubmissions} Expected</span>
              </div>
            </div>

            <div className="tl-card">
              <h3 className="tl-card-title" style={{ marginBottom: '24px' }}>
                <BarChart3 size={18} color="#2563eb" /> Score Distribution
              </h3>
              
              {subsLoading ? (
                 <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size={24} /></div>
              ) : completedDirectSubs.length === 0 ? (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>Not enough data to display chart.</div>
              ) : (
                <div className="tl-chart-wrapper">
                  {scoreDist.map((dist) => {
                    const heightPct = (dist.count / maxDistCount) * 100;
                    return (
                      <div key={dist.label} className="tl-chart-col">
                        <div className="tl-chart-count">{dist.count}</div>
                        <div className="tl-chart-bar-bg">
                          <div 
                            style={{ 
                              width: '100%', 
                              height: `${heightPct}%`, 
                              background: dist.color, 
                              transition: 'height 1s ease-out',
                              borderRadius: '6px 6px 0 0'
                            }} 
                          />
                        </div>
                        <span className="tl-chart-label">
                          {dist.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="tl-col-right">
            <div className="tl-performers-header">
              <h3 className="tl-card-title">
                <Trophy size={18} color="#d97706" /> Top Performers
              </h3>
              <span className="tl-performers-badge">My Team</span>
            </div>
            
            <div className="tl-performers-list">
              {subsLoading ? (
                 <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner size={24} /></div>
              ) : topEmployees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '14px' }}>No completed appraisals yet.</div>
              ) : (
                topEmployees.map((emp, index) => {
                  const empObj = employeeMap.get(String(emp.employeeId));

                  return (
                    <div key={index} 
                      className="tl-performer-row"
                      style={{ 
                        background: index < 3 ? '#fffbeb' : '#fff', 
                        border: `1px solid ${index < 3 ? '#fde68a' : 'var(--border)'}`, 
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div className="tl-performer-rank" style={{ color: index === 0 ? '#d97706' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#cbd5e1' }}>
                        #{index + 1}
                      </div>
                      
                      <div className="tl-performer-avatar">
                        {emp.employeeName?.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="tl-performer-info">
                        <div className="tl-performer-name">
                          {emp.employeeName}
                        </div>
                        <div className="tl-performer-role">
                          {empObj ? getEmpCategory(empObj) : emp.employeeType}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div className="tl-performer-score">
                          {emp.totalScore?.toFixed(2)}/5 <Star size={12} fill="#2563eb" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};