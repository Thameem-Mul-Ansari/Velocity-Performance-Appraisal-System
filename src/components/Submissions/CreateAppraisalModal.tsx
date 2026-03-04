import React, { useState, useEffect, useMemo } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../UI/Modal';
import { Calendar, Users, CheckCircle, Search, FileText } from 'lucide-react';
import { AppraisalForm } from '../../types';

// --- INJECTED RESPONSIVE CSS ---
const responsiveStyles = `
  .create-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .create-modal-filters { display: flex; gap: 8px; align-items: center; }
  
  @media (max-width: 600px) {
    .create-modal-grid { grid-template-columns: 1fr; }
    .create-modal-filters { flex-direction: column; align-items: stretch; width: 100%; }
    .create-modal-filters > div, .create-modal-filters > select, .create-modal-filters > button { width: 100%; }
  }
`;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  forms: AppraisalForm[];
}

const getDynamicYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(String);
};

export const CreateAppraisalModal = ({ open, onClose, onCreated, forms }: Props) => {
  const { user } = useAuth();
  const { employees, fetchEmployees } = useData();

  const YEARS = useMemo(() => getDynamicYears(), []);
  
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [includeTeamLeads, setIncludeTeamLeads] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  const [assignedForms, setAssignedForms] = useState({
    Sales: '',
    'Non-Sales': '',
    'Team Lead': ''
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allTeamLeads = useMemo(() => {
    return employees.filter(e => {
      const isLead = e.isTeamLead === true || String(e.isTeamLead).toLowerCase() === 'true';
      const isActive = e.status?.toLowerCase() === 'active';
      return isLead && isActive;
    });
  }, [employees]);

  const filteredLeads = useMemo(() => {
    return allTeamLeads.filter(lead => {
      if (searchQuery && !lead.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      const typeStr = String(lead?.employmentType || '').toUpperCase();
      const isNonSales = typeStr.includes('NON');
      const empCategory = isNonSales ? 'Non-Sales' : (typeStr.includes('SALES') ? 'Sales' : 'Non-Sales');
      
      if (filterType !== 'All' && empCategory !== filterType) return false;
      return true;
    });
  }, [allTeamLeads, searchQuery, filterType]);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      setSelectedLeads([]);
      setSearchQuery('');
      setFilterType('All');
      setError('');
      setIncludeTeamLeads(true);
      
      setAssignedForms({
        Sales: forms.find(f => f.employeeType === 'Sales')?.id || '',
        'Non-Sales': forms.find(f => f.employeeType === 'Non-Sales')?.id || '',
        'Team Lead': forms.find(f => f.employeeType === 'Team Lead')?.id || ''
      });
    }
  }, [open, fetchEmployees, forms]);

  const toggleLead = (leadId: string) =>
    setSelectedLeads(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);

  const selectAll = () => {
    if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]); 
    else setSelectedLeads(filteredLeads.map(l => l.employeeId || l.id || '')); 
  };

  const handleCreate = async () => {
    if (!year) { setError('Please select a year.'); return; }
    if (!assignedForms.Sales) { setError('Please select a form template for Sales employees.'); return; }
    if (!assignedForms['Non-Sales']) { setError('Please select a form template for Non-Sales employees.'); return; }
    
    if (includeTeamLeads) {
      if (!assignedForms['Team Lead']) { setError('Please select a self-appraisal template for Team Leads.'); return; }
      if (selectedLeads.length === 0) { setError('Please select at least one Team Lead.'); return; }
    }
    
    setError('');
    setSaving(true);

    try {
      const cycleId = `appraisal_${year}`;
      
      await setDoc(doc(db, 'Submissions', cycleId), {
        year,
        createdBy: user?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
        assignedLeads: includeTeamLeads ? selectedLeads : [], 
        assignedForms: {
          Sales: assignedForms.Sales,
          'Non-Sales': assignedForms['Non-Sales'],
          'Team Lead': includeTeamLeads ? assignedForms['Team Lead'] : null
        }
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create cycle. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: '6px', display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  const allSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;

  return (
    <>
      <style>{responsiveStyles}</style>
      <Modal open={open} onClose={onClose} title="Create Appraisal Cycle" width={680}>
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={12} /> Appraisal Year
            </span>
          </label>
          <select value={year} onChange={e => setYear(e.target.value)} style={{...selectStyle, maxWidth: '200px'}}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* --- FORM MAPPING SECTION --- */}
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <FileText size={16} color="var(--accent)" /> Map Employee Templates
          </h4>
          <div className="create-modal-grid">
            <div>
              <label style={labelStyle}>Sales Employees Form</label>
              <select value={assignedForms.Sales} onChange={e => setAssignedForms(p => ({...p, Sales: e.target.value}))} style={selectStyle}>
                <option value="">-- Select Template --</option>
                {forms.filter(f => f.employeeType === 'Sales').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Non-Sales Employees Form</label>
              <select value={assignedForms['Non-Sales']} onChange={e => setAssignedForms(p => ({...p, 'Non-Sales': e.target.value}))} style={selectStyle}>
                <option value="">-- Select Template --</option>
                {forms.filter(f => f.employeeType === 'Non-Sales').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* --- TEAM LEAD SELF APPRAISAL SECTION --- */}
        <div style={{ marginBottom: '24px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ background: includeTeamLeads ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-secondary)', padding: '16px', borderBottom: includeTeamLeads ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="checkbox" 
              id="includeLeads"
              checked={includeTeamLeads} 
              onChange={(e) => setIncludeTeamLeads(e.target.checked)} 
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <label htmlFor="includeLeads" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
              Send Self-Appraisal to Team Leads
            </label>
          </div>

          {includeTeamLeads && (
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Team Lead Self-Appraisal Form</label>
                <select value={assignedForms['Team Lead']} onChange={e => setAssignedForms(p => ({...p, 'Team Lead': e.target.value}))} style={{...selectStyle, width: '100%'}}>
                  <option value="">-- Select Team Lead Template --</option>
                  {forms.filter(f => f.employeeType === 'Team Lead').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={12} /> Assign Team Leads
                  </span>
                </label>
                
                <div className="create-modal-filters">
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 10px', flex: 1, minWidth: '150px' }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input 
                      type="text" 
                      placeholder="Search leads..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '100%', padding: '4px 8px', outline: 'none', fontSize: '12px' }}
                    />
                  </div>
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)} 
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', fontSize: '12px', outline: 'none', flexShrink: 0 }}
                  >
                    <option value="All">All Types</option>
                    <option value="Sales">Sales</option>
                    <option value="Non-Sales">Non-Sales</option>
                  </select>
                  {filteredLeads.length > 0 && (
                    <button onClick={selectAll} style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', color: allSelected ? 'var(--text-secondary)' : 'var(--accent)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', flexShrink: 0 }}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
              </div>

              <div className="create-modal-grid" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredLeads.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No Team Leads match your search/filters.
                  </div>
                ) : (
                  filteredLeads.map(lead => {
                    const leadId = lead.employeeId || lead.id || '';
                    const selected = selectedLeads.includes(leadId);
                    
                    const typeStr = String(lead?.employmentType || '').toUpperCase();
                    const isNonSales = typeStr.includes('NON');
                    const empCategory = isNonSales ? 'Non-Sales' : (typeStr.includes('SALES') ? 'Sales' : 'Non-Sales');

                    return (
                      <div 
                        key={leadId} onClick={() => toggleLead(leadId)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: selected ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-primary)', border: `1px solid ${selected ? 'rgba(37, 99, 235, 0.3)' : 'var(--border)'}`, borderRadius: '10px', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0, background: selected ? 'var(--accent)' : 'var(--bg-tertiary)', border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected && <CheckCircle size={11} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.employeeName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empCategory} • {lead.team}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || (includeTeamLeads && selectedLeads.length === 0)} style={{ padding: '10px 26px', background: (saving || (includeTeamLeads && selectedLeads.length === 0)) ? 'var(--bg-tertiary)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: (saving || (includeTeamLeads && selectedLeads.length === 0)) ? 'var(--text-muted)' : '#fff', cursor: (saving || (includeTeamLeads && selectedLeads.length === 0)) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
            {saving ? 'Creating…' : 'Create Cycle'}
          </button>
        </div>
      </Modal>
    </>
  );
};