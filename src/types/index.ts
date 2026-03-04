export type EmployeeType = 'FULL TIME' | 'CONTRACT' | string; 
export type EmploymentType = 'SALES' | 'NON SALES' | string; 
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | string;
export type UserRole = 'super_admin' | 'team_lead' | 'employee'; 

export interface Employee {
  id?: string;
  employeeId: string;
  employeeName: string;
  email: string;
  phoneNumber: string;
  team: string;
  businessUnit: string;
  role: string;
  employeeType: EmployeeType;
  employmentType: EmploymentType;
  teamLeaderId: string;
  teamLeadName?: string;
  dateOfJoining: string;
  status: EmployeeStatus;
  isTeamLead: boolean;
  isBusinessAdmin: boolean;
  location: string;
  photoURL?: string; 
}

export interface AppraisalQuestion {
  questionId: number;
  category: 'Performance' | 'Behavioral' | 'Quality';
  questionText: string;
  weightage: number;
}

export interface SubmissionAnswer {
  questionId: number;
  questionText: string;
  category: string;
  weightage: number;
  score: number;
  remarks?: string;
}

export interface EmployeeSubmission {
  employeeId: string;
  employeeName: string;
  employeeType: EmployeeType;
  answers: SubmissionAnswer[];
  totalScore: number;
  submittedBy: string;
  submittedAt: string;
  status: 'Draft' | 'Submitted' | 'Pending Admin Review' | 'Completed'; // Updated statuses
  isReviewed?: boolean; // Added for the review flow
  promoted?: boolean;   // Added for the thumbs-up promotion flow
}


export interface QuestionDef {
  id: string;
  text: string;
  weight: number;
}

export interface AppraisalForm {
  id: string;
  name: string;
  employeeType: 'Sales' | 'Non-Sales' | 'Team Lead';
  questions: QuestionDef[];
  createdAt: string;
}

export interface AuthUser {
  username: string;
  role: UserRole;
  displayName: string;
  teamName?: string;
  employeeId: string; // <-- ADDED THIS to fix the TypeScript error
}

export interface AssignedFormsMap {
  Sales: string;
  'Non-Sales': string;
  'Team Lead': string | null;
}

export interface AppraisalCycle {
  id: string;
  year: string;
  createdBy: string;
  createdAt: string;
  assignedLeads: string[];
  assignedForms: AssignedFormsMap;
}