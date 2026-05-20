import type { ProjectSchema } from './schema';

export const BUSINESS_SITE_SCHEMA: ProjectSchema = {
  version: '9.3',
  projectId: 'business-site-001',
  projectName: 'Business Site Assistant',
  pages: [
    {
      id: 'dashboard',
      name: 'Request Dashboard',
      path: '/requests',
      tasks: [
        {
          id: 'search-request',
          title: 'Search Request',
          description: 'Search for projects by title or status.',
          category: 'form',
          steps: [
            { id: 's1', title: 'Smart Search', instruction: 'Type your search query.', targetQuery: 'text=Search', expectedAction: 'input', autoValue: 'Project A' }
          ]
        },
        {
          id: 'create-new-request',
          title: 'Create New Request',
          description: 'Start a new project request.',
          category: 'navigation',
          steps: [
            { id: 'nr1', title: 'Click Create', instruction: 'Click the New Request button.', targetQuery: 'text=New Request', expectedAction: 'click' }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-0',
      name: 'Project Contact Info',
      path: '/requests/new',
      signature: {
        logic: 'AND',
        conditions: [{ type: 'text', value: 'Project Contact Info' }]
      },
      tasks: [
        {
          id: 'select-country',
          title: 'Select Country',
          description: 'Choose the project country.',
          category: 'form',
          steps: [
            {
              id: 'sc1',
              title: 'Select Country',
              instruction: 'Choose Singapore.',
              targetQuery: 'text=Country',
              expectedAction: 'select',
              autoValue: 'Singapore',
              options: ['Singapore', 'Vietnam', 'Malaysia', 'Thailand', 'Indonesia'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Country' }
            }
          ]
        },
        {
          id: 'type-name',
          title: 'Type Project Contact Name',
          description: 'Enter the contact person name.',
          category: 'form',
          steps: [
            {
              id: 'tn1',
              title: 'Fill Name',
              instruction: 'Enter contact name.',
              targetQuery: 'text=Project Contact Name',
              expectedAction: 'input',
              autoValue: 'John Doe',
              locators: { role: 'input', context: 'Project Contact Info', semantic: 'Project Contact Name' }
            }
          ]
        },
        {
          id: 'type-email',
          title: 'Type Project Contact Email',
          description: 'Enter the contact person email.',
          category: 'form',
          steps: [
            {
              id: 'te1',
              title: 'Fill Email',
              instruction: 'Enter contact email.',
              targetQuery: 'text=Project Contact Email',
              expectedAction: 'input',
              autoValue: 'john@example.com',
              locators: { role: 'input', context: 'Project Contact Info', semantic: 'Project Contact Email' }
            }
          ]
        },
        {
          id: 'select-business-area',
          title: 'Select Business Area',
          description: 'Choose the business area.',
          category: 'form',
          steps: [
            {
              id: 'sba1',
              title: 'Select Area',
              instruction: 'Select your business area.',
              targetQuery: 'text=Business Area',
              expectedAction: 'select',
              autoValue: 'Corporate',
              options: ['Group HQ', 'Corporate', 'Retail', 'Technology'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Business Area' }
            }
          ]
        },
        {
          id: 'select-lob',
          title: 'Select LOB',
          description: 'Choose the Line of Business.',
          category: 'form',
          steps: [
            {
              id: 'sl1',
              title: 'Select LOB',
              instruction: 'Select your Line of Business.',
              targetQuery: 'text=LOB',
              expectedAction: 'select',
              autoValue: 'Banking',
              options: ['Group HQ', 'Banking', 'Insurance', 'Investment'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'LOB' }
            }
          ]
        },
        {
          id: 'select-talent-augmentation',
          title: 'Select Talent Augmentation',
          description: 'Select Talent Augmentation request type.',
          category: 'form',
          steps: [
            {
              id: 'sta1',
              title: 'Select Talent Augmentation',
              instruction: 'Click Talent Augmentation.',
              targetQuery: 'text=Talent Augmentation',
              expectedAction: 'click',
              locators: { role: 'any', context: 'request type', semantic: 'talent augmentation' }
            }
          ]
        },
        {
          id: 'ssd0',
          title: 'Select Solution Delivery',
          description: 'Select solution delivery type.',
          category: 'navigation',
          steps: [
            {
              id: 'ssd1',
              title: 'Select Solution Delivery',
              instruction: 'Click Solution Delivery.',
              targetQuery: 'text=Solution Delivery',
              expectedAction: 'click',
              locators: { role: 'any', context: 'request type', semantic: 'solution delivery' }
            }
          ]
        },
        {
          id: 'click-next',
          title: 'Click Next',
          description: 'Proceed to the next step.',
          category: 'navigation',
          steps: [
            { id: 'nx1', title: 'Click Next', instruction: 'Click the Next button.', targetQuery: 'id=btn-wizard-next', expectedAction: 'click', locators: { role: 'button', semantic: 'Next' } }
          ]
        },
        {
          id: 'click-cancel',
          title: 'Click Cancel',
          description: 'Discard changes and go back to dashboard.',
          category: 'navigation',
          steps: [
            { id: 'ccan0', title: 'Cancel', instruction: 'Click the Cancel button.', targetQuery: 'text=Cancel', expectedAction: 'click', locators: { role: 'button', semantic: 'Cancel' } }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-1',
      name: 'Business Request Detail',
      path: '/requests/new',
      signature: {
        logic: 'AND',
        conditions: [{ type: 'text', value: 'Business Request Detail' }]
      },
      tasks: [
        {
          id: 'type-project-name',
          title: 'Type Project Name',
          description: 'Enter the project name.',
          category: 'form',
          steps: [
            { 
              id: 'tpn1', 
              title: 'Fill Project Name', 
              instruction: 'Enter project name.', 
              targetQuery: 'text=Name / Title', 
              expectedAction: 'input', 
              autoValue: 'AI Assistant Integration',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Name / Title' }
            }
          ]
        },
        {
          id: 'type-project-desc',
          title: 'Type Project Description',
          description: 'Enter project details.',
          category: 'form',
          steps: [
            { 
              id: 'tpd1', 
              title: 'Fill Description', 
              instruction: 'Enter description.', 
              targetQuery: 'text=Description', 
              expectedAction: 'input', 
              autoValue: 'Integrating Omni Assistant for business automation.',
              locators: { role: 'textarea', context: 'Business Request Detail', semantic: 'Description' }
            }
          ]
        },
        {
          id: 'select-insourcing',
          title: 'Select Insourcing to VCC',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'si1',
              title: 'Select Insourcing',
              instruction: 'Click Insourcing to VCC.',
              targetQuery: 'text=Insourcing to VCC',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Insourcing to VCC' }
            }
          ]
        },
        {
          id: 'select-new-revenue',
          title: 'Select Supported by New Revenue',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'snr1',
              title: 'Select New Revenue',
              instruction: 'Click Supported by New Revenue.',
              targetQuery: 'text=Supported by New Revenue',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Supported by New Revenue' }
            }
          ]
        },
        {
          id: 'select-generate-savings',
          title: 'Select Generate Savings',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'sgs1',
              title: 'Select Savings',
              instruction: 'Click Generate Savings.',
              targetQuery: 'text=Generate Savings',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Generate Savings' }
            }
          ]
        },
        {
          id: 'select-offshoring',
          title: 'Select Offshoring of SG headcount',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'sos1',
              title: 'Select Offshoring',
              instruction: 'Click Offshoring of SG headcount.',
              targetQuery: 'text=Offshoring of SG headcount',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Offshoring of SG headcount' }
            }
          ]
        },
        {
          id: 'select-duration',
          title: 'Select Duration',
          description: 'Choose project duration.',
          category: 'form',
          steps: [
            { 
              id: 'sdur1', 
              title: 'Select Duration', 
              instruction: 'Choose duration.', 
              targetQuery: 'text=Duration', 
              expectedAction: 'select', 
              autoValue: '12 months', 
              options: ['12 months', '24 months', '36 months'],
              locators: { role: 'combobox', context: 'Business Request Detail', semantic: 'Duration' }
            }
          ]
        },
        {
          id: 'select-start-date',
          title: 'Select Expected Started Date',
          description: 'Pick the start date.',
          category: 'form',
          steps: [
            { 
              id: 'ssd1', 
              title: 'Pick Date', 
              instruction: 'Click and type date.', 
              targetQuery: 'text=Expected Started Date', 
              expectedAction: 'input', 
              autoValue: '01/06/2026',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Expected Started Date' }
            }
          ]
        },
        {
          id: 'click-back',
          title: 'Click Back',
          description: 'Go back to step 0.',
          category: 'navigation',
          steps: [
            { id: 'cb1', title: 'Click Back', instruction: 'Click the Back button.', targetQuery: 'text=Back', expectedAction: 'click', locators: { role: 'button', semantic: 'Back' } }
          ]
        },
        {
          id: 'click-save-draft',
          title: 'Click Save as Draft',
          description: 'Save the current progress.',
          category: 'navigation',
          steps: [
            { id: 'csd1', title: 'Save Draft', instruction: 'Click Save as Draft.', targetQuery: 'text=Save as Draft', expectedAction: 'click', locators: { role: 'button', semantic: 'Save as Draft' } }
          ]
        },
        {
          id: 'click-add-resource',
          title: 'Click Add Resource(s)',
          description: 'Add resources to the project.',
          category: 'form',
          steps: [
            { 
              id: 'car1', 
              title: 'Add Resource(s)', 
              instruction: 'Click Add Resource(s).', 
              targetQuery: 'text=Add Resource(s)', 
              expectedAction: 'click', 
              locators: { role: 'button', context: 'business request detail', semantic: 'Add Resource(s)' } 
            }
          ]
        },
        {
          id: 'click-submit',
          title: 'Click Submit Request',
          description: 'Submit the final request.',
          category: 'navigation',
          steps: [
            { id: 'csub1', title: 'Submit Request', instruction: 'Click Submit Request.', targetQuery: 'id=btn-wizard-submit', expectedAction: 'click', locators: { role: 'button', semantic: 'Submit Request' } }
          ]
        }
      ]
    }
  ]
};
