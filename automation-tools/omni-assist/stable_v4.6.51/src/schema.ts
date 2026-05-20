/**
 * OmniAssist Project Schema
 * Defines the SaaS configuration layer for pages, sections, and tasks.
 */

import { type PageSignature } from './context';

export type InteractionType = 'view' | 'click' | 'input' | 'select';

export interface ActionNode {
  id: string;
  title: string;
  instruction: string;
  targetQuery: string;
  expectedAction: InteractionType;
  signature?: PageSignature;
  fallbackMessage?: string;
  anchorPath?: string;
  actionValue?: string;
  autoValue?: string; // Payload for "Fill for me" mode
  options?: string[]; // Dropdown options if action is 'select' or 'input' with choices
  isNavigation?: boolean;      // Safely marks if this step triggers a route change
  navigationTimeout?: number; // Configurable wait time (ms)

  // Advanced Select/Interaction Config (v4.6.20)
  triggerQuery?: string; // CSS selector for the actual clickable trigger
  menuQuery?: string;    // CSS selector for the dropdown/menu container
  itemQuery?: string;    // CSS selector for options within the menu
}

export interface TaskConfig {
  id: string;
  name: string;
  description: string;
  sectionQuery?: string; // Query to find the label/header
  containerQuery?: string; // Query to find the precise container to highlight
  interactionTypes: ('guide' | 'fill' | 'skip')[];
  autoPropose?: boolean;
  steps: ActionNode[];
}

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  match: PageSignature;
  suggestedTasks: TaskConfig[];
}

export interface ProjectSchema {
  tenantId: string;
  pages: PageConfig[];
}

/**
 * Example Schema for the Business Request Site
 */
export const BUSINESS_SITE_SCHEMA: ProjectSchema = {
  tenantId: 'vcc-internal',
  pages: [
    {
      id: 'dashboard',
      name: 'Request Dashboard',
      path: '/requests',
      match: {
        logic: 'AND',
        conditions: [
          { type: 'path', value: '/requests', exact: true }
        ]
      },
      suggestedTasks: [
        {
          id: 'task-search',
          name: 'Search Request',
          description: 'Find a specific request by ID or title.',
          interactionTypes: ['guide', 'fill'],
          containerQuery: '.MuiTextField-root, .MuiPaper-root:has(input[placeholder*="Search"])',
          steps: [
            {
              id: 's1',
              title: 'Smart Search',
              instruction: 'Enter your search query to filter the dashboard.',
              targetQuery: 'Search',
              expectedAction: 'input',
              autoValue: ''
            }
          ]
        },
        {
          id: 'task-create',
          name: 'Create New Request',
          description: 'Launch the wizard to submit a new business need.',
          interactionTypes: ['guide', 'skip'],
          steps: [
            {
              id: 'c1',
              title: 'Launch Wizard',
              instruction: 'Click "New Request" to begin.',
              targetQuery: 'New Request',
              expectedAction: 'click',
              isNavigation: true,
              navigationTimeout: 2000,
              anchorPath: '/requests/new'
            }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-0',
      name: 'Business Request Form (Step 0)',
      path: '/requests/new',
      match: {
        logic: 'AND',
        conditions: [
          { type: 'path', value: '/requests/new', exact: true },
          { type: 'element', value: '#step-1-contact-info' }
        ]
      },
      suggestedTasks: [
        {
          id: 'task-contact',
          name: 'Project Contact Info',
          description: 'Fill in the country and contact person details.',
          interactionTypes: ['guide', 'fill', 'skip'],
          autoPropose: false,
          containerQuery: '#step-1-contact-info',
          steps: [
            {
              id: 'w0',
              title: 'Select Country',
              instruction: 'Choose the country of operation.',
              targetQuery: 'text=Country',
              expectedAction: 'select',
              autoValue: 'Singapore',
              options: ['Singapore', 'Vietnam', 'Malaysia', 'Thailand', 'Indonesia'],
              triggerQuery: '.MuiSelect-select, [role="button"]',
              menuQuery: '.MuiMenu-root, [role="listbox"]',
              itemQuery: 'li, [role="option"]'
            },
            {
              id: 'w1',
              title: 'Contact Name',
              instruction: 'Enter the requester name.',
              targetQuery: 'Project Contact Name',
              expectedAction: 'input',
              autoValue: 'TO DUY HUNG'
            },
            {
              id: 'w2',
              title: 'Contact Email',
              instruction: 'Enter a valid professional email.',
              targetQuery: 'Project Contact Email',
              expectedAction: 'input',
              autoValue: 'duyhung.to@stengg.com'
            },
            {
              id: 'w3',
              title: 'Business Area',
              instruction: 'Select the primary business unit.',
              targetQuery: 'text=Business Area',
              expectedAction: 'select',
              autoValue: 'Group HQ',
              options: ['Group HQ', 'Corporate', 'Retail', 'Technology'],
              triggerQuery: '.MuiSelect-select, [role="button"]',
              menuQuery: '.MuiMenu-root, [role="listbox"]',
              itemQuery: 'li, [role="option"]'
            },
            {
              id: 'w4',
              title: 'LOB (Line of Business)',
              instruction: 'Select the specific business line.',
              targetQuery: 'text=LOB',
              expectedAction: 'select',
              autoValue: 'Group HQ',
              options: ['Group HQ', 'Banking', 'Insurance', 'Investment'],
              triggerQuery: '.MuiSelect-select, [role="button"]',
              menuQuery: '.MuiMenu-root, [role="listbox"]',
              itemQuery: 'li, [role="option"]'
            }
          ]
        },
        {
          id: 'task-type',
          name: 'Choose Request Type',
          description: 'Select between Talent Augmentation or Solution Delivery.',
          sectionQuery: 'Request Type',
          containerQuery: '#section-request-type',
          interactionTypes: ['guide'],
          steps: [
            {
              id: 'w5',
              title: 'Request Type',
              instruction: 'Select the desired service model.',
              targetQuery: 'text=Request Type',
              expectedAction: 'select',
              options: ['Talent Augmentation', 'Solution Delivery']
            }
          ]
        },
        {
          id: 'task-cancel',
          name: 'Cancel to My Request',
          description: 'Abort the current wizard and return to dashboard.',
          interactionTypes: ['guide', 'skip'],
          steps: [
            {
              id: 'c0',
              title: 'Cancel',
              instruction: 'Click to discard changes.',
              targetQuery: 'Cancel',
              expectedAction: 'click'
            }
          ]
        },
        {
          id: 'task-next',
          name: 'Continue to Next Step',
          description: 'Proceed to the next section of the wizard.',
          interactionTypes: ['guide', 'skip'],
          steps: [
            {
              id: 'w6',
              title: 'Next Step',
              instruction: 'Click Next to save and continue.',
              targetQuery: 'Next',
              expectedAction: 'click'
            }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-1',
      name: 'Business Request Details',
      path: '/requests/new',
      match: {
        logic: 'AND',
        conditions: [
          { type: 'path', value: '/requests/new', exact: true },
          { type: 'element', value: '#step-2-details' }
        ]
      },
      suggestedTasks: [
        {
          id: 'task-details',
          name: 'Fill Business Request Details',
          description: 'Provide project name, description, and criteria.',
          containerQuery: '#step-2-details',
          interactionTypes: ['guide', 'fill', 'skip'],
          autoPropose: false,
          steps: [
            {
              id: 'd1',
              title: 'Project Title',
              instruction: 'Enter a clear title for the project.',
              targetQuery: 'text=Project Name / Title',
              expectedAction: 'input',
              autoValue: 'Cloud Migration 2026'
            },
            {
              id: 'd2',
              title: 'Description',
              instruction: 'Summarize the project goals.',
              targetQuery: 'text=Project Description / Note',
              expectedAction: 'input',
              autoValue: 'Migrating legacy core banking modules to hybrid cloud infra.'
            },
            {
              id: 'd3',
              title: 'Engagement Criteria',
              instruction: 'Select the primary project driver.',
              targetQuery: 'text=Engagement Criteria',
              expectedAction: 'select',
              autoValue: 'Supported by New Revenue',
              options: ['Insourcing to VCC', 'Supported by New Revenue', 'Generate Savings', 'Offshoring of SG headcount']
            },
            {
              id: 'd4',
              title: 'Expected Start Date',
              instruction: 'Enter the goal start date.',
              targetQuery: 'text=Expected Started Date',
              expectedAction: 'input',
              autoValue: '01/06/2026'
            },
            {
              id: 'd5',
              title: 'Duration',
              instruction: 'Select expected project length.',
              targetQuery: 'text=Duration',
              expectedAction: 'select',
              autoValue: '12 months',
              options: ['12 months', '24 months', '36 months'],
              triggerQuery: '.MuiSelect-select, [role="button"]',
              menuQuery: '.MuiMenu-root, [role="listbox"]',
              itemQuery: 'li, [role="option"]'
            }
          ]
        },
        {
          id: 'task-add-resource',
          name: 'Add New Resource',
          description: 'Click to add a new resource requirement.',
          interactionTypes: ['guide'],
          steps: [
            {
              id: 'a1',
              title: 'Add Resource',
              instruction: 'Click to add a default resource row.',
              targetQuery: 'Add Resource(s)',
              expectedAction: 'click'
            }
          ]
        },
        {
          id: 'task-back',
          name: 'Go Back',
          description: 'Return to the previous step (Contact Info).',
          interactionTypes: ['guide'],
          steps: [
            {
              id: 'a0',
              title: 'Back',
              instruction: 'Click to return to the first section.',
              targetQuery: 'Back',
              expectedAction: 'click'
            }
          ]
        },
        {
          id: 'task-save-draft',
          name: 'Save as Draft',
          description: 'Save your work and finish later.',
          interactionTypes: ['guide'],
          steps: [
            {
              id: 'a2',
              title: 'Save Draft',
              instruction: 'Click to save changes as a draft.',
              targetQuery: 'Save as Draft',
              expectedAction: 'click'
            }
          ]
        },
        {
          id: 'task-submit',
          name: 'Submit Request',
          description: 'Send the official business request.',
          interactionTypes: ['guide', 'skip'],
          steps: [
            {
              id: 'a3',
              title: 'Submit',
              instruction: 'Click to submit the request.',
              targetQuery: 'Submit Request',
              expectedAction: 'click'
            }
          ]
        }
      ]
    }
  ]
};
