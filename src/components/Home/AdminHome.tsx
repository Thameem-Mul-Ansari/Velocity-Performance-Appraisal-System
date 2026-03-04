import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, UserCheck, Building2, TrendingUp, Award, 
  Star, BarChart3, Target, Trophy, MapPin, SlidersHorizontal
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useData } from '../../contexts/DataContext';
import { StatCard } from '../UI/StatCard';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { Badge } from '../UI/Badge';

// --- INJECTED RESPONSIVE CSS ---
const responsiveStyles = `
  .admin-container { padding: clamp(16px, 4vw, 32px); max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif; }
  .admin-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: clamp(8px, 2vw, 12px); margin-bottom: clamp(20px, 4vw, 32px); }
  
  /* Filters */
  .filter-toggle-btn { display: none; padding: 12px 16px; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 10px; font-size: 14px; font-weight: 600; color: var(--text-primary); cursor: pointer; width: 100%; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .filters-wrapper { display: flex; flex-direction: row; gap: clamp(12px, 2vw, 16px); margin-bottom: 24px; padding: clamp(12px, 3vw, 16px); background: var(--bg-secondary); border-radius: 12px; border: 1px solid var(--border); align-items: center; }
  .filter-label { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-right: 8px; margin-bottom: 0; }
  
  /* Progress Card */
  .progress-card { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 16px; padding: clamp(16px, 4vw, 24px); margin-bottom: 20px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02); }
  .progress-header { display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 0; }
  .progress-footer { display: flex; flex-direction: row; justify-content: space-between; margin-top: 12px; font-size: 13px; color: var(--text-muted); font-weight: 500; gap: 0; }
  
  /* Charts Grid */
  .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .chart-card { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 16px; display: flex; flex-direction: column; height: 400px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02); }
  .chart-card-inner { padding: clamp(16px, 4vw, 24px); flex: 1; display: flex; flex-direction: column; }
  
  /* Chart Bars */
  .chart-bars-wrapper { display: flex; align-items: flex-end; gap: 16px; flex: 1; overflow-x: auto; padding-bottom: 8px; }
  .chart-bar-col { flex: 1 0 auto; min-width: 60px; display: flex; flex-direction: column; align-items: center; gap: 10px; height: 100%; }
  .chart-bar-score { font-size: 12px; font-weight: 700; color: #0f172a; }
  .chart-bar-track { position: relative; width: 100%; max-width: 48px; height: 100%; background: #f1f5f9; border-radius: 6px; overflow: hidden; display: flex; align-items: flex-end; }
  .chart-bar-label { font-size: 11px; color: #64748b; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-weight: 500; }
  
  /* Top Performers */
  .performers-header { padding: clamp(16px, 3vw, 20px) clamp(20px, 4vw, 24px); border-bottom: 1px solid var(--border); display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 0; background: #f8fafc; border-radius: 16px 16px 0 0; }
  .performer-row { display: flex; align-items: center; gap: clamp(8px, 2vw, 12px); padding: clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px); border-radius: 12px; transition: transform 0.2s, box-shadow 0.2s; flex-wrap: nowrap; cursor: default; }
  .performer-avatar { width: 36px; height: 36px; border-radius: 50%; background: #e2e8f0; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
  .performer-name { font-size: 14px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .performer-meta { font-size: 11px; color: #64748b; display: flex; flex-direction: row; gap: 6px; align-items: center; }
  .performer-score { font-size: 16px; font-weight: 800; color: #2563eb; display: flex; align-items: center; gap: 2px; font-family: 'Space Grotesk', sans-serif; }
  
  /* Table */
  .table-card { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 16px; padding: clamp(16px, 4vw, 24px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02); }
  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -4px; padding: 0 4px; }
  .admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }

  /* --- MEDIA QUERIES --- */
  @media (max-width: 900px) {
    .charts-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 768px) {
    .filter-toggle-btn { display: flex; }
    .filters-wrapper { flex-direction: column; align-items: stretch; display: none; }
    .filters-wrapper.show { display: flex; }
    .filter-label { margin-right: 0; margin-bottom: 8px; }
  }

  @media (max-width: 480px) {
    .progress-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    .progress-footer { flex-direction: column; gap: 4px; }
    
    .chart-card { height: 350px; }
    .chart-bars-wrapper { gap: 8px; }
    .chart-bar-col { min-width: 50px; }
    .chart-bar-score { font-size: 11px; }
    .chart-bar-track { max-width: 36px; }
    .chart-bar-label { font-size: 10px; }
    
    .performers-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .performer-row { flex-wrap: wrap; }
    .performer-avatar { width: 30px; height: 30px; font-size: 12px; }
    .performer-name { font-size: 13px; }
    .performer-score { font-size: 14px; }
  }
  
  @media (max-width: 350px) {
    .performer-meta { flex-direction: column; gap: 2px; align-items: flex-start; }
    .performer-meta-dot { display: none; }
  }
`;

// --- DATA NORMALIZATION HELPERS ---
const getEmpCategory = (emp: any) => {
  const typeStr = String(emp?.employmentType || '').toUpperCase();
  if (typeStr.includes('NON')) return 'Non-Sales';
  if (typeStr.includes('SALES')) return 'Sales';
  return 'Non-Sales'; // Fallback
};

const isActive = (emp: any) => String(emp?.status || '').toUpperCase() === 'ACTIVE';

export const AdminHome = () => {
  const { employees, employeesLoaded, employeesLoading, fetchEmployees } = useData();
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  
  // Filters
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedBusinessUnitFilter, setSelectedBusinessUnitFilter] = useState<string>('All');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    if (!employeesLoaded && !employeesLoading) {
      fetchEmployees();
    }
  }, [employeesLoaded, employeesLoading, fetchEmployees]);
  
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setSubsLoading(true);
      try {
        const snap = await getDocs(collection(db, 'Submissions'));
        const cycles = snap.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a, b) => b.year.localeCompare(a.year));
        
        if (cycles.length > 0) {
          const latestCycleId = cycles[0].id;
          
          const teamsSnap = await getDocs(collection(db, 'Submissions', latestCycleId, 'teams'));
          let flatSubs: any[] = [];
          
          teamsSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.submissions) {
              flatSubs.push(...data.submissions.map((s: any) => ({
                ...s,
                teamId: doc.id,
                teamName: data.teamName || s.teamName
              })));
            }
          });
          
          setSubmissions(flatSubs);
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setSubsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  // ============================================================================
  // 1. GLOBAL STAT CARD CALCULATIONS (DYNAMIC UNIQUE LEAD CHECK)
  // ============================================================================
  const totalBusinessAdmins = 1; // Hardcoded Super Admin
  
  // Extract a Set of ALL unique teamLeaderIds assigned to employees
  const uniqueTeamLeadIds = new Set(
    employees
      .map(e => e.teamLeaderId)
      .filter(id => id && String(id).trim() !== '')
  );

  // Filter employees into precise buckets based strictly on real reporting hierarchy
  const actualTeamLeads = employees.filter(e => uniqueTeamLeadIds.has(String(e.employeeId)));
  const regularEmployees = employees.filter(e => !uniqueTeamLeadIds.has(String(e.employeeId)));

  const teamMap = new Map<string, any[]>();

  employees.forEach(emp => {
    if (!emp.team) return;

    if (!teamMap.has(emp.team)) {
      teamMap.set(emp.team, []);
    }

    teamMap.get(emp.team)!.push(emp);
  });

  const totalTeams = teamMap.size;

  let salesTeams = 0;
  let nonSalesTeams = 0;

  teamMap.forEach(teamEmployees => {
    const teamType = getEmpCategory(teamEmployees[0]); // team type based on first employee

    if (teamType === 'Sales') salesTeams++;
    else nonSalesTeams++;
  });

  // True Team Leads
  const tlTotal = actualTeamLeads.length;
  const tlSales = actualTeamLeads.filter(e => getEmpCategory(e) === 'Sales').length;
  const tlNonSales = actualTeamLeads.filter(e => getEmpCategory(e) === 'Non-Sales').length;

  // True Regular Employees (Total Employees = All - Team Leads)
  const empTotal = regularEmployees.length;
  const empSales = regularEmployees.filter(e => getEmpCategory(e) === 'Sales').length;
  const empNonSales = regularEmployees.filter(e => getEmpCategory(e) === 'Non-Sales').length;

  const totalBusinessUnits = new Set(employees.filter(e => e.businessUnit).map(e => e.businessUnit)).size;
  const totalLocations = new Set(employees.filter(e => e.location).map(e => e.location)).size;

  // --- 2. FILTER DROPDOWN OPTIONS ---
  const uniqueTeams = ['All', ...Array.from(new Set(employees.map(e => e.team).filter(Boolean)))].sort();
  const uniqueTypes = ['All', 'Sales', 'Non-Sales'];
  const uniqueBusinessUnits = ['All', ...Array.from(new Set(employees.map(e => e.businessUnit).filter(Boolean)))].sort();

  // --- 3. DYNAMIC DATA PROCESSING (Reacts to Filters) ---
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (selectedTeamFilter !== 'All' && emp.team !== selectedTeamFilter) return false;
      if (selectedTypeFilter !== 'All' && getEmpCategory(emp) !== selectedTypeFilter) return false;
      if (selectedBusinessUnitFilter !== 'All' && emp.businessUnit !== selectedBusinessUnitFilter) return false;
      return true;
    });
  }, [employees, selectedTeamFilter, selectedTypeFilter, selectedBusinessUnitFilter]);

  const filteredCompletedSubs = useMemo(() => {
    return submissions.filter(sub => {
      if (sub.status !== 'Completed' && !(sub.totalScore && sub.totalScore > 0)) return false;

      const emp = employees.find(e => String(e.employeeId) === String(sub.employeeId));
      const tName = emp?.team || sub.teamName;
      const tType = emp ? getEmpCategory(emp) : getEmpCategory(sub);
      const tBU = emp?.businessUnit || 'Not Assigned';
      
      if (selectedTeamFilter !== 'All' && tName !== selectedTeamFilter) return false;
      if (selectedTypeFilter !== 'All' && tType !== selectedTypeFilter) return false;
      if (selectedBusinessUnitFilter !== 'All' && tBU !== selectedBusinessUnitFilter) return false;
      return true;
    });
  }, [submissions, employees, selectedTeamFilter, selectedTypeFilter, selectedBusinessUnitFilter]);

  // Build the accurate Team List from the filtered employees array
  const filteredTeamsList = useMemo(() => {
    const teamNames = Array.from(new Set(filteredEmployees.map(e => e.team).filter(Boolean)));
    
    return teamNames.map(teamName => {
      const teamEmps = filteredEmployees.filter(e => e.team === teamName);
      
      const type = getEmpCategory(teamEmps[0]) || 'Non-Sales';
      const businessUnit = teamEmps.find(e => e.businessUnit)?.businessUnit || 'Not Assigned';
      
      const salesCount = teamEmps.filter(e => getEmpCategory(e) === 'Sales').length;
      const nonSalesCount = teamEmps.filter(e => getEmpCategory(e) === 'Non-Sales').length;
      
      const teamLeadCount = teamEmps.filter(e => uniqueTeamLeadIds.has(String(e.employeeId))).length;
      
      const teamSubs = filteredCompletedSubs.filter(s => {
        const subEmp = employees.find(e => String(e.employeeId) === String(s.employeeId));
        return (subEmp?.team === teamName) || (s.teamName === teamName);
      });
      
      const avgScore = teamSubs.length > 0 ? teamSubs.reduce((acc, curr) => acc + (curr.totalScore || 0), 0) / teamSubs.length : 0;

      return {
        name: teamName,
        type,
        businessUnit,
        employeeCount: teamEmps.length,
        salesCount,
        nonSalesCount,
        teamLeadCount,
        avgScore
      };
    }).sort((a, b) => b.employeeCount - a.employeeCount);
  }, [filteredEmployees, filteredCompletedSubs, employees, uniqueTeamLeadIds]);

  // Expected count = active employees inside the currently filtered view
  const filteredExpectedCount = filteredEmployees.filter(e => isActive(e)).length;
  const completionRate = filteredExpectedCount > 0 ? Math.min((filteredCompletedSubs.length / filteredExpectedCount) * 100, 100) : 0;

  // Chart Data
  const chartTeamAverages = [...filteredTeamsList]
    .filter(t => t.avgScore > 0)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  // Top Rated Employees
  const topEmployees = [...filteredCompletedSubs]
    .map(sub => {
      const employee = employees.find(e => String(e.employeeId) === String(sub.employeeId));
      return {
        ...sub,
        employeeCategory: employee ? getEmpCategory(employee) : getEmpCategory(sub),
        team: employee?.team || sub.teamName,
      };
    })
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .slice(0, 10);

  const selectStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '160px',
    boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.02)',
    width: '100%'
  };

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="admin-container">
        
        {/* Header */}
        <div style={{ marginBottom: 'clamp(20px, 4vw, 32px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: 'clamp(20px, 4vw, 28px)', background: '#2563eb', borderRadius: '4px' }} />
            <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: '#0f172a' }}>
              Super Admin Overview
            </h1>
          </div>
          <p style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#64748b', paddingLeft: '16px' }}>
            Workforce distribution and real-time appraisal analytics
          </p>
        </div>

        {employeesLoading && !employeesLoaded ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
            <LoadingSpinner size={36} />
          </div>
        ) : (
          <>
            {/* STATS GRID */}
            <div className="admin-stats-grid">
              <StatCard title="Super Admins" value={totalBusinessAdmins} icon={<UserCheck size={16} />} accentColor="#475569" size="small" />
              <StatCard title="Total Teams" value={totalTeams} subtitle={`Sales: ${salesTeams} | Non-Sales: ${nonSalesTeams}`} icon={<Building2 size={16} />} accentColor="#0284C7" size="small" />
              <StatCard title="Team Leads" value={tlTotal} subtitle={`Sales: ${tlSales} | Non-Sales: ${tlNonSales}`} icon={<Award size={16} />} accentColor="#2563EB" size="small" />
              <StatCard title="Employees" value={empTotal} subtitle={`Sales: ${empSales} | Non-Sales: ${empNonSales}`} icon={<Users size={16} />} accentColor="#16A34A" size="small" />
              <StatCard title="Business Units" value={totalBusinessUnits} icon={<TrendingUp size={16} />} accentColor="#D97706" size="small" />
              <StatCard title="Locations" value={totalLocations} icon={<MapPin size={16} />} accentColor="#7C3AED" size="small" />
            </div>

            {/* Filters Section */}
            <button 
              className="filter-toggle-btn"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} />
                Filter Dashboards
              </span>
              <span>{showMobileFilters ? '▲' : '▼'}</span>
            </button>

            <div className={`filters-wrapper ${showMobileFilters ? 'show' : ''}`}>
              <div className="filter-label">
                <SlidersHorizontal size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }}/>
                Filter Dashboards:
              </div>
              
              <select value={selectedTeamFilter} onChange={e => setSelectedTeamFilter(e.target.value)} style={selectStyle}>
                {uniqueTeams.map(team => <option key={team} value={team}>{team === 'All' ? 'All Teams' : team}</option>)}
              </select>

              <select value={selectedTypeFilter} onChange={e => setSelectedTypeFilter(e.target.value)} style={selectStyle}>
                {uniqueTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Roles' : type}</option>)}
              </select>

              <select value={selectedBusinessUnitFilter} onChange={e => setSelectedBusinessUnitFilter(e.target.value)} style={selectStyle}>
                {uniqueBusinessUnits.map(unit => <option key={unit} value={unit}>{unit === 'All' ? 'All Business Units' : unit}</option>)}
              </select>
            </div>

            {/* ================= ANALYTICS SECTION ================= */}
            
            {/* Row 1: Full Width Appraisal Completion */}
            <div className="progress-card">
              <div className="progress-header">
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Target size={18} color="#2563eb" /> Appraisal Completion Progress
                </h3>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', fontFamily: 'Space Grotesk, sans-serif' }}>
                  {completionRate.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${completionRate}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)', transition: 'width 1s ease-in-out' }} />
              </div>
              <div className="progress-footer">
                <span>{filteredCompletedSubs.length} Completed</span>
                <span>{filteredExpectedCount} Expected Submissions</span>
              </div>
            </div>

            {/* Row 2: Grid (Average Score + Top Employees) */}
            <div className="charts-grid">
              
              {/* Left: Average Score by Team */}
              <div className="chart-card">
                <div className="chart-card-inner">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} color="#2563eb" /> Average Score by Team
                  </h3>
                  
                  {subsLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner size={24} /></div>
                  ) : chartTeamAverages.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No metrics available</div>
                  ) : (
                    <div className="chart-bars-wrapper">
                      {chartTeamAverages.map((team, idx) => (
                        <div key={team.name} className="chart-bar-col">
                          <div className="chart-bar-score">{team.avgScore.toFixed(1)}</div>
                          <div className="chart-bar-track">
                            <div style={{ 
                              width: '100%', 
                              height: `${(team.avgScore / 5) * 100}%`, 
                              background: idx === 0 ? 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)' : '#93c5fd', 
                              transition: 'height 1s ease-out', 
                              borderRadius: '6px 6px 0 0' 
                            }} />
                          </div>
                          <span className="chart-bar-label">
                            {team.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Top Rated Employees */}
              <div className="chart-card">
                <div className="performers-header">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Trophy size={18} color="#d97706" /> Top Rated Performers
                  </h3>
                  <Badge label="Leaderboard" variant="info" size="small" />
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 3vw, 16px)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {subsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner size={24} /></div>
                  ) : topEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '14px' }}>No completed appraisals yet</div>
                  ) : (
                    topEmployees.map((emp, index) => (
                      <div 
                        key={index} 
                        className="performer-row"
                        style={{ 
                          background: index < 3 ? '#fffbeb' : '#fff', 
                          border: `1px solid ${index < 3 ? '#fde68a' : 'var(--border)'}` 
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <div style={{ width: '28px', fontSize: '16px', fontWeight: 800, color: index === 0 ? '#d97706' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#cbd5e1', textAlign: 'center' }}>
                          #{index + 1}
                        </div>
                        <div className="performer-avatar">
                          {emp.employeeName?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="performer-name">{emp.employeeName}</div>
                          <div className="performer-meta">
                            <span>{emp.employeeCategory}</span>
                            <span className="performer-meta-dot">•</span>
                            <span>{emp.team}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="performer-score">
                            {emp.totalScore?.toFixed(2)}/5 <Star size={12} fill="#2563eb" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Row 3: Teams Overview Table */}
            <div className="table-card">
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#2563eb" /> Teams Overview
              </h3>
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Name</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Unit</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Non-Sales</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeamsList.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                          No teams match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTeamsList.map(team => (
                        <tr key={team.name} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{team.name}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <Badge label={team.type || 'N/A'} variant={team.type === 'Sales' ? 'info' : 'default'} size="small" />
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{team.businessUnit}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{team.employeeCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#2563eb', fontWeight: 500 }}>{team.salesCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#7C3AED', fontWeight: 500 }}>{team.nonSalesCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#D97706', fontWeight: 500 }}>{team.teamLeadCount}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: team.avgScore >= 4.0 ? '#16A34A' : team.avgScore >= 3.0 ? '#D97706' : '#DC2626' }}>
                            {team.avgScore ? team.avgScore.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
