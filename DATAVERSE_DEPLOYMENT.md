# Connecting to Dataverse & Deploying as a Power Platform Solution

## Overview

This document covers three things:

1. **Dataverse data layer** — replacing the Zustand mock store with real Dataverse Web API calls
2. **Authentication** — wiring up Azure AD via MSAL so the app knows who the user is
3. **Solution packaging & deployment** — shipping this as a PCF control or Custom Page inside a Power Platform solution, and removing demo mode

---

## 1. Dataverse Table Schema

Create the following tables in your Dataverse environment. The column internal names below match what the API calls will reference.

### LeaveType (lookup table)
| Display Name | Internal Name | Type | Notes |
|---|---|---|---|
| Name | `cr_name` | Text | Required. One of: Vacation, Sick, Personal, Bereavement, FMLA, Unpaid |
| Max Days Per Year | `cr_maxdays` | Whole Number | |
| Color Hex | `cr_colorhex` | Text | e.g. `#3b82f6` |

### LeaveRequest
| Display Name | Internal Name | Type | Notes |
|---|---|---|---|
| Employee | `cr_employee` | Lookup → SystemUser | |
| Leave Type | `cr_leavetype` | Lookup → cr_leavetype | |
| Start Date | `cr_startdate` | Date Only | |
| End Date | `cr_enddate` | Date Only | |
| Total Days | `cr_totaldays` | Whole Number | Auto-calculated, read-only |
| Status | `cr_status` | Choice | Draft, Submitted, Approved, Denied, Withdrawn |
| Comments | `cr_comments` | Multiline Text | |
| Submitted On | `cr_submittedon` | Date Only | |
| Reviewed By | `cr_reviewedby` | Lookup → SystemUser | |
| Reviewer Comments | `cr_reviewercomments` | Multiline Text | |
| Reviewed On | `cr_reviewedon` | Date Only | |

### LeaveBalance
| Display Name | Internal Name | Type | Notes |
|---|---|---|---|
| Employee | `cr_employee` | Lookup → SystemUser | |
| Leave Type | `cr_leavetype` | Lookup → cr_leavetype | |
| Available Days | `cr_availabledays` | Whole Number | |
| Used Days | `cr_useddays` | Whole Number | |
| Year | `cr_year` | Whole Number | |

> **Tip:** Use the publisher prefix that matches your solution publisher (e.g. `cr_` or `contoso_`). Be consistent — it shows up in every API call.

---

## 2. Authentication with MSAL

Install the Microsoft Authentication Library:

```bash
npm install @azure/msal-browser @azure/msal-react
```

### Register an App in Azure AD

1. Go to **Azure Portal → Azure Active Directory → App Registrations → New Registration**
2. Set redirect URI to `http://localhost:5173` (dev) and your production URL
3. Under **API Permissions**, add:
   - `Dynamics CRM → user_impersonation` (for Dataverse access)
   - `Microsoft Graph → User.Read` (to resolve manager relationships from AAD)
4. Copy the **Client ID** and **Tenant ID**

### Environment Variables

Create a `.env` file (never commit this):

```env
VITE_AAD_CLIENT_ID=your-client-id-here
VITE_AAD_TENANT_ID=your-tenant-id-here
VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com
```

### MSAL Configuration

Create `src/auth/msalConfig.ts`:

```ts
import { PublicClientApplication, Configuration } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: 'sessionStorage' },
};

export const dataverseScopes = [
  `${import.meta.env.VITE_DATAVERSE_URL}/.default`,
];

export const msalInstance = new PublicClientApplication(msalConfig);
```

Wrap your app in `main.tsx`:

```tsx
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './auth/msalConfig';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MsalProvider>
  </StrictMode>
);
```

---

## 3. Dataverse API Layer

Replace `src/data/mockData.ts` calls with a real API service. Install a helper:

```bash
npm install axios
```

Create `src/api/dataverseClient.ts`:

```ts
import axios from 'axios';
import { msalInstance, dataverseScopes } from '../auth/msalConfig';

const BASE = `${import.meta.env.VITE_DATAVERSE_URL}/api/data/v9.2`;

async function getToken() {
  const accounts = msalInstance.getAllAccounts();
  const result = await msalInstance.acquireTokenSilent({
    scopes: dataverseScopes,
    account: accounts[0],
  });
  return result.accessToken;
}

export const dvClient = axios.create({ baseURL: BASE });

dvClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  config.headers.Authorization = `Bearer ${token}`;
  config.headers['OData-MaxVersion'] = '4.0';
  config.headers['OData-Version'] = '4.0';
  config.headers['Content-Type'] = 'application/json';
  return config;
});
```

Create `src/api/leaveApi.ts`:

```ts
import { dvClient } from './dataverseClient';
import type { LeaveRequest, LeaveBalance, LeaveType } from '../types';

// ── Leave Types ──────────────────────────────────────────────────────────────

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const { data } = await dvClient.get(
    `/cr_leavetypes?$select=cr_leavetypeid,cr_name,cr_maxdays,cr_colorhex`
  );
  return data.value.map((row: any) => ({
    id: row.cr_leavetypeid,
    name: row.cr_name,
    maxDays: row.cr_maxdays,
    color: row.cr_colorhex ?? '#3b82f6',
  }));
}

// ── Leave Balances ────────────────────────────────────────────────────────────

export async function fetchBalancesForUser(userId: string): Promise<LeaveBalance[]> {
  const { data } = await dvClient.get(
    `/cr_leavebalances?$filter=_cr_employee_value eq '${userId}'` +
    `&$select=cr_leavebalanceid,cr_availabledays,cr_useddays,cr_year` +
    `&$expand=cr_leavetype($select=cr_leavetypeid,cr_name)`
  );
  return data.value.map((row: any) => ({
    id: row.cr_leavebalanceid,
    employeeId: userId,
    leaveTypeId: row.cr_leavetype.cr_leavetypeid,
    leaveTypeName: row.cr_leavetype.cr_name,
    availableDays: row.cr_availabledays,
    usedDays: row.cr_useddays,
    year: row.cr_year,
  }));
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function fetchRequestsForUser(userId: string): Promise<LeaveRequest[]> {
  const { data } = await dvClient.get(
    `/cr_leaverequests?$filter=_cr_employee_value eq '${userId}'` +
    `&$select=cr_leaverequestid,cr_startdate,cr_enddate,cr_totaldays,` +
    `cr_status,cr_comments,cr_submittedon,cr_reviewercomments,cr_reviewedon` +
    `&$expand=cr_leavetype($select=cr_leavetypeid,cr_name),` +
    `cr_reviewedby($select=fullname)` +
    `&$orderby=cr_submittedon desc`
  );
  return data.value.map(mapRequest);
}

export async function fetchAllRequests(): Promise<LeaveRequest[]> {
  const { data } = await dvClient.get(
    `/cr_leaverequests?$select=cr_leaverequestid,cr_startdate,cr_enddate,` +
    `cr_totaldays,cr_status,cr_comments,cr_submittedon,cr_reviewercomments,cr_reviewedon` +
    `&$expand=cr_employee($select=systemuserid,fullname),` +
    `cr_leavetype($select=cr_leavetypeid,cr_name),` +
    `cr_reviewedby($select=fullname)` +
    `&$orderby=cr_submittedon desc`
  );
  return data.value.map(mapRequest);
}

function mapRequest(row: any): LeaveRequest {
  return {
    id: row.cr_leaverequestid,
    employeeId: row._cr_employee_value,
    employeeName: row.cr_employee?.fullname ?? '',
    leaveTypeId: row.cr_leavetype?.cr_leavetypeid ?? '',
    leaveTypeName: row.cr_leavetype?.cr_name ?? '',
    startDate: row.cr_startdate,
    endDate: row.cr_enddate,
    totalDays: row.cr_totaldays,
    status: row.cr_status,
    comments: row.cr_comments ?? '',
    submittedOn: row.cr_submittedon,
    reviewedBy: row.cr_reviewedby?.fullname,
    reviewerComments: row.cr_reviewercomments,
    reviewedOn: row.cr_reviewedon,
  };
}

export async function createRequest(payload: Omit<LeaveRequest, 'id'>): Promise<string> {
  const body = {
    'cr_employee@odata.bind': `/systemusers(${payload.employeeId})`,
    'cr_leavetype@odata.bind': `/cr_leavetypes(${payload.leaveTypeId})`,
    cr_startdate: payload.startDate,
    cr_enddate: payload.endDate,
    cr_totaldays: payload.totalDays,
    cr_status: payload.status,
    cr_comments: payload.comments,
    cr_submittedon: payload.submittedOn,
  };
  const { headers } = await dvClient.post(`/cr_leaverequests`, body);
  // Dataverse returns the new record URL in OData-EntityId header
  const id = headers['odata-entityid']?.match(/\(([^)]+)\)/)?.[1];
  return id ?? '';
}

export async function updateRequest(id: string, updates: Record<string, any>): Promise<void> {
  await dvClient.patch(`/cr_leaverequests(${id})`, updates);
}
```

### Updating the Store

Replace the hardcoded `LEAVE_REQUESTS` / `LEAVE_BALANCES` initial values with `useEffect` calls that hydrate from the API. Use React Query (`@tanstack/react-query`) to simplify loading/error states:

```bash
npm install @tanstack/react-query
```

```ts
// Example query hook
import { useQuery } from '@tanstack/react-query';
import { fetchRequestsForUser } from '../api/leaveApi';

export function useMyRequests(userId: string) {
  return useQuery({
    queryKey: ['requests', userId],
    queryFn: () => fetchRequestsForUser(userId),
  });
}
```

---

## 4. Resolving the Current User & Manager

When running inside Power Apps or as a standalone app authenticated via AAD, resolve the current user from the Dataverse `/WhoAmI` endpoint and look up their manager from Microsoft Graph:

```ts
// Get the logged-in Dataverse user
export async function getWhoAmI() {
  const { data } = await dvClient.get(`/WhoAmI`);
  return data.UserId as string; // Dataverse SystemUser GUID
}

// Get manager email from Microsoft Graph
export async function getManagerEmail(aadUserId: string, graphToken: string) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${aadUserId}/manager`,
    { headers: { Authorization: `Bearer ${graphToken}` } }
  );
  const data = await res.json();
  return data.mail as string;
}
```

---

## 5. Removing Demo Mode

Once real auth is in place, the user-switcher in the Sidebar should be removed entirely.

1. Delete the "Demo: Switch User" block from `src/components/layout/Sidebar.tsx`
2. Replace `useLeaveStore().currentUser` initial value with the result of `getWhoAmI()` — hydrate it on app load before rendering routes
3. Remove `src/data/mockData.ts` (or keep it only for local `dev` mode behind `import.meta.env.DEV`)
4. The `setCurrentUser` store action can be removed; role is now derived from the Dataverse user's security role

Example guard in `main.tsx` before rendering the app:

```tsx
async function bootstrap() {
  await msalInstance.initialize();
  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    await msalInstance.loginRedirect({ scopes: dataverseScopes });
    return;
  }

  const userId = await getWhoAmI();
  useLeaveStore.setState({ currentUser: await fetchCurrentUser(userId) });

  createRoot(document.getElementById('root')!).render(/* ... */);
}

bootstrap();
```

---

## 6. Deployment Options

### Option A — PCF Control (Recommended for Model-Driven Apps)

Wrap the Vite app as a Power Apps Component Framework (PCF) control. This is the best fit for embedding in a Model-Driven app or a custom page.

```bash
npm install -g microsoft-powerapps-cli
pac pcf init --namespace Contoso --name SmartLeaveManager --template field
```

Build the React app and copy the output into the PCF `css/` and bundle:

```bash
npm run build
# Copy dist/assets/* into the PCF project, reference them in ControlManifest.xml
```

Key `ControlManifest.Input.xml` entries:

```xml
<control namespace="Contoso" constructor="SmartLeaveManager"
         version="1.0.0" display-name-key="SmartLeaveManager"
         description-key="SmartLeaveManager_Desc" control-type="standard">
  <resources>
    <code path="index.ts" order="1" />
    <css path="css/index.css" order="1" />
  </resources>
</control>
```

### Option B — Custom Page in a Model-Driven App

Custom Pages are Canvas apps that can be surfaced inside a Model-Driven app. You can host this React app inside an iframe or use the `@microsoft/power-apps` SDK (already installed) to communicate with the host app.

The `power.config.json` already in this project suggests this path. Run:

```bash
pac canvas pack --sources src/ --msapp SmartLeaveManager.msapp
```

### Option C — Azure Static Web Apps (Standalone)

For a fully standalone deployment outside Power Platform:

```bash
# Build
npm run build

# Deploy with Azure CLI
az staticwebapp create \
  --name smart-leave-manager \
  --resource-group my-rg \
  --source . \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

Set environment variables in the Azure portal under **Configuration → Application settings**.

---

## 7. Power Platform Solution Packaging

1. Create a new **Unmanaged Solution** in Power Apps maker portal
2. Add the three Dataverse tables (LeaveRequest, LeaveBalance, LeaveType)
3. Add the PCF control or Canvas app
4. Add the Power Automate flow for approval notifications
5. Export as **Managed** for production deployment

```bash
# Export solution via PAC CLI
pac solution export --path ./solution --name SmartLeaveManager --managed
```

To import into another environment:

```bash
pac solution import --path ./solution/SmartLeaveManager_managed.zip
```

---

## 8. Pre-deployment Checklist

- [ ] Azure AD app registration created with correct redirect URIs
- [ ] Dataverse tables created with correct publisher prefix
- [ ] `.env` file populated (never committed to git — add to `.gitignore`)
- [ ] Security roles configured: Employee, Manager, HR Admin map to Dataverse roles
- [ ] Power Automate approval flow imported and connection references updated
- [ ] Demo user-switcher removed from Sidebar
- [ ] `mockData.ts` imports removed or gated behind `import.meta.env.DEV`
- [ ] `VITE_DATAVERSE_URL` set to production org URL in deployment pipeline
- [ ] CORS policy on Dataverse org allows the app's origin (handled automatically for PCF/Canvas deployments)
