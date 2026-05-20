
export type Role = 'Hung' | 'Requester' | 'Approver' | 'Recruitment Lead' | 'Hired Manager' | 'Contract Manager' | 'Head of Finance' | 'Authorized Personnel' | 'Invoice PIC';

export type RequestStage = 'Draft' | 'Evaluate' | 'Discover' | 'Fulfill' | 'Sign-off' | 'Closed';

export type RequestType = 'Project Subcontracting' | 'Manpower Outsourcing' | 'Talent Augmentation' | 'Solution Delivery';

export interface Request {
    id: string;
    title: string; // usually "Request for [Service]"
    requestType: RequestType;
    status: RequestStage;
    createdAt: string;
    updatedAt: string;
    createdBy: string; // user name
    department: string;
    projectContact?: {
        name: string;
        email: string;
        phone?: string;
    };
    country?: string;
    businessArea?: string;
    lob?: string;
    description: string;
    // Simplified fields for the wizard
    startDate?: string;
    endDate?: string;
    budget?: number;
    engagementCriteria?: string; // Single selected criteria
    duration?: string; // 12, 24, or 36 months
    expectedLeadTime?: string;
    teamSize?: number;
    resources?: Resource[];
}

export interface Resource {
    id: string; // for key
    role: string;
    seniority: string;
    quantity: number;
    rate: number;
    mandatorySkills: string;
    otherSkills: string;
    jobDescription: string; // or URL
    subtotal: number;
}

export type RequisitionStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Open for Hiring' | 'Closed' | 'Rejected';

export interface Requisition {
    id: string;
    jobTitle: string;
    requestId?: string; // Link to request
    status: RequisitionStatus;
    hiringManagerId: string;
    recruiters: string[];
    quantity: number;
    description: string; // rich text html
    createdAt: string;
    updatedAt: string;
    hiringProcessTemplateId?: string;
}

export type CandidateStatus = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Not Selected';

export interface Candidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    requisitionId: string;
    status: CandidateStatus;
    appliedDate: string;
    resumeUrl?: string; // mock url
    skills: string[];
    rejectionReason?: string;
}

export type SOWStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Sign-off' | 'Active' | 'Cancelled';

export interface SOW {
    id: string; // Serial number
    requestId: string;
    vendorName: string;
    periodStart: string;
    periodEnd: string;
    status: SOWStatus;
    contractValue: number;
    currency: string;
    pricingModel: 'Fixed Price' | 'Time & Materials';
    signedByVendor: boolean;
    signedByClient: boolean;
    createdAt: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link: string; // route to navigate
    type: 'info' | 'action';
}

export interface User {
    id: string;
    name: string;
    avatar?: string;
    currentRole: Role;
}
