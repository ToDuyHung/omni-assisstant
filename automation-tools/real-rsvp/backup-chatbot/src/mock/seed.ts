
import { v4 as uuidv4 } from 'uuid';
import { Request, Requisition, Candidate, SOW, Notification } from '../types';

export const mockRequests: Request[] = [
    {
        id: 'REQ-2023-001',
        title: 'Frontend Development Support',
        requestType: 'Project Subcontracting',
        status: 'Discover',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        updatedAt: new Date().toISOString(),
        createdBy: 'Hung Nguyen',
        department: 'Engineering',
        projectContact: {
            name: 'Hung Nguyen',
            email: 'hung.nguyen@example.com',
            phone: '+84 909 123 456'
        },
        description: 'Need external resources to accelerate frontend development for the Q1 launch.',
        startDate: '2023-11-01',
        endDate: '2024-04-30',
        budget: 50000
    },
    {
        id: 'REQ-2023-002',
        title: 'QA Automation Team',
        requestType: 'Manpower Outsourcing',
        status: 'Sign-off',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 14 days ago
        updatedAt: new Date().toISOString(),
        createdBy: 'Alice Smith',
        department: 'Quality Assurance',
        projectContact: {
            name: 'Alice Smith',
            email: 'alice.smith@example.com',
            phone: '+1 555 0199'
        },
        description: 'Augmenting the QA team with 3 automation engineers.',
        startDate: '2023-10-15',
        endDate: '2024-10-14',
        budget: 120000
    }
];

export const mockRequisitions: Requisition[] = [
    {
        id: 'JOB-2023-101',
        jobTitle: 'Senior React Developer',
        requestId: 'REQ-2023-001',
        status: 'Open for Hiring',
        hiringManagerId: 'user-hm-01',
        recruiters: ['user-rec-01'],
        quantity: 2,
        description: '<p>We are looking for an experienced <strong>React Developer</strong> to join our team.</p>',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date().toISOString(),
        hiringProcessTemplateId: 'template-std-IT'
    }
];

export const mockCandidates: Candidate[] = [
    {
        id: uuidv4(),
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        requisitionId: 'JOB-2023-101',
        status: 'Interview',
        appliedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        skills: ['React', 'TypeScript', 'Node.js']
    },
    {
        id: uuidv4(),
        name: 'Jane Roe',
        email: 'jane.roe@example.com',
        phone: '987-654-3210',
        requisitionId: 'JOB-2023-101',
        status: 'Screening',
        appliedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        skills: ['React', 'CSS', 'HTML']
    }
];

export const mockSOWs: SOW[] = [
    {
        id: 'SOW-2023-555',
        requestId: 'REQ-2023-002',
        vendorName: 'TechSolutions Inc.',
        periodStart: '2023-10-15',
        periodEnd: '2024-10-14',
        status: 'Pending Review',
        contractValue: 120000,
        currency: 'USD',
        pricingModel: 'Time & Materials',
        signedByVendor: true,
        signedByClient: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
    }
];

export const mockNotifications: Notification[] = [
    {
        id: uuidv4(),
        title: 'Request Approved',
        message: 'Request REQ-2023-001 has been moved to Discover stage.',
        timestamp: new Date().toISOString(),
        read: false,
        link: '/requests/REQ-2023-001',
        type: 'info'
    },
    {
        id: uuidv4(),
        title: 'SOW Approval Needed',
        message: 'SOW-2023-555 requires your approval.',
        timestamp: new Date().toISOString(),
        read: false,
        link: '/sow/SOW-2023-555',
        type: 'action'
    }
];
