import type { Page } from '@playwright/test';

export const MOCK_COMPANY_ID = 'company-1';
export const MOCK_USER_ID = 'user-admin';

export const mockUser = {
  id: MOCK_USER_ID,
  name: 'Test Admin',
  email: 'admin@test.com',
  role: 'company_admin',
  roleId: 3,
  companyId: MOCK_COMPANY_ID,
  createdAt: '2024-01-01T00:00:00.000Z',
  isActive: true,
};

export const mockLeads = [
  {
    id: 'lead-1',
    companyId: MOCK_COMPANY_ID,
    cin: 'U12345AB1234PLC123456',
    companyName: 'Acme Corp',
    status: 'Hot',
    isAssigned: true,
    assignedTo: MOCK_USER_ID,
    assignedAt: '2024-06-01T00:00:00.000Z',
    directors: [
      {
        id: 'dir-1',
        din: '12345678',
        firstName: 'John',
        lastName: 'Doe',
        mobile: '9876543210',
        email: 'john@acme.com',
        followUps: [
          {
            id: 'fu-1',
            date: new Date().toISOString().slice(0, 10),
            time: '10:00',
            remark: 'Initial call',
            createdBy: MOCK_USER_ID,
            createdAt: new Date().toISOString(),
            talkedTo: 'John Doe',
            followUpStatus: 'Hot',
            status: 'active',
          },
        ],
      },
    ],
    createdAt: '2024-05-01T00:00:00.000Z',
  },
  {
    id: 'lead-2',
    companyId: MOCK_COMPANY_ID,
    cin: 'U67890CD5678PLC654321',
    companyName: 'Beta Industries',
    status: 'Warm',
    isAssigned: false,
    assignedTo: null,
    directors: [
      {
        id: 'dir-2',
        din: '87654321',
        firstName: 'Jane',
        lastName: 'Smith',
        mobile: '9123456780',
        email: 'jane@beta.com',
        followUps: [],
      },
    ],
    createdAt: '2024-05-15T00:00:00.000Z',
  },
];

const mockCompany = {
  id: MOCK_COMPANY_ID,
  companyId: MOCK_COMPANY_ID,
  name: 'Test Company',
  companyNameCustom: 'Test Company',
  email: 'contact@test.com',
  phone: '1234567890',
  address: 'Test Address',
  createdAt: '2024-01-01T00:00:00.000Z',
  isActive: true,
  subscriptionPlan: 'professional',
  maxUsers: 50,
};

export async function setupMockApi(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/auth/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: mockUser }),
      });
    }

    if (path === '/api/users') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ users: [mockUser] }),
      });
    }

    if (path === '/api/config/branding' || path === '/api/config/branding/public') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ systemName: 'Lead Management Test', logoUrl: null }),
      });
    }

    if (path === '/api/config/plan-pricing') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          planPricing: {
            prices: { basic: 99, professional: 299, enterprise: 999, custom: 0 },
            maxUsers: { basic: 10, professional: 50, enterprise: 200, custom: 0 },
          },
        }),
      });
    }

    if (path === `/api/companies/${MOCK_COMPANY_ID}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ company: mockCompany }),
      });
    }

    if (path === '/api/companies') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ companies: [mockCompany] }),
      });
    }

    if (path === `/api/config/field-config/${MOCK_COMPANY_ID}`) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fieldConfigs: null }),
      });
    }

    if (path === '/api/leads' || path.startsWith('/api/leads/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: mockLeads }),
      });
    }

    if (path === '/api/events') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    });
  });
}

export async function injectMockSession(page: Page) {
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem('lms_auth_token', token);
      localStorage.setItem('lms_user_session', JSON.stringify(user));
    },
    { user: mockUser, token: 'mock-test-token' }
  );
}

export async function setupAuthenticatedPage(page: Page) {
  await setupMockApi(page);
  await injectMockSession(page);
}
