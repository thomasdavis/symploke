# Add Repository Feature Design

## Overview

The Add Repository feature allows users to connect their GitHub repositories to a Plexus for code search and analysis. Since users authenticate with GitHub OAuth, they have an access token that allows us to fetch their organizations and repositories.

## User Flow

### Happy Path
1. User clicks "Add Repository" button on the Repositories page
2. Dialog opens with a loading state
3. System fetches user's GitHub organizations (including their personal account)
4. User sees a dropdown/select of available organizations
5. User selects an organization
6. System fetches repositories for that organization
7. User sees a dropdown/select of available repositories (filtered to show only repos not already added)
8. User selects a repository
9. User clicks "Add Repository" button in dialog
10. System creates repository record in database
11. Dialog closes, table refreshes to show new repository
12. Success toast notification appears

### Error Paths
- User not authenticated with GitHub -> Show error message
- Failed to fetch organizations -> Show retry option
- Failed to fetch repositories -> Show retry option
- Repository already exists in plexus -> Show validation error
- Network timeout -> Show retry option

## Technical Architecture

### Component Structure

```
ReposPage
└── PageHeader
    └── Button (Add Repository) -> triggers dialog
└── ReposTable
└── AddRepoDialog
    ├── Dialog (from Base UI)
    ├── OrganizationSelect (Combobox/Select)
    ├── RepositorySelect (Combobox/Select)
    └── Form Actions (Cancel/Add)
```

### State Management

**Local Component State:**
- Dialog open/closed state
- Selected organization
- Selected repository
- Loading states (fetching orgs, fetching repos, submitting)
- Error states

**TanStack Query Queries:**
- `useGitHubOrganizations()` - Fetches user's GitHub orgs
- `useGitHubRepositories(orgName)` - Fetches repos for selected org
- `useAddRepository()` - Mutation to add repo to plexus

### Data Flow

```
User Action -> Dialog Opens -> Fetch GitHub Orgs
                                       ↓
                        Display Orgs -> User Selects Org
                                       ↓
                        Fetch Repos for Org -> Display Repos
                                                      ↓
                                       User Selects Repo -> Submit
                                                              ↓
                                       API Call to Add Repo -> Database Insert
                                                                      ↓
                                                       Dialog Closes -> Table Refreshes
```

## Backend API Endpoints

### 1. GET `/api/github/organizations`
Fetches the authenticated user's GitHub organizations and personal account.

**Request:**
```typescript
GET /api/github/organizations
Headers:
  Cookie: session token
```

**Response:**
```typescript
{
  organizations: [
    {
      login: string          // Organization username (e.g., "vercel")
      id: number             // GitHub org ID
      avatar_url: string     // Organization avatar
      description: string    // Organization description
      type: "Organization" | "User"
    }
  ]
}
```

**Implementation:**
- Get user's GitHub access token from session
- Call GitHub API: `GET https://api.github.com/user/orgs`
- Also fetch user's personal account: `GET https://api.github.com/user`
- Combine both (personal account + orgs) into single array
- Return formatted response

### 2. GET `/api/github/repositories?org={orgLogin}`
Fetches repositories for a specific organization or user.

**Request:**
```typescript
GET /api/github/repositories?org=vercel&plexusId=abc123
Headers:
  Cookie: session token
```

**Query Parameters:**
- `org`: Organization login (required)
- `plexusId`: Current plexus ID (required, for filtering already-added repos)

**Response:**
```typescript
{
  repositories: [
    {
      id: number              // GitHub repo ID
      name: string            // Repository name (e.g., "next.js")
      full_name: string       // Full name (e.g., "vercel/next.js")
      description: string     // Repository description
      html_url: string        // GitHub URL
      private: boolean        // Is private repo
      language: string        // Primary language
      stargazers_count: number
      fork: boolean           // Is it a fork
    }
  ]
}
```

**Implementation:**
- Get user's GitHub access token from session
- Call GitHub API:
  - If org is personal: `GET https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100`
  - If org: `GET https://api.github.com/orgs/{org}/repos?sort=updated&per_page=100`
- Query database for existing repos in this plexus
- Filter out repos that are already added
- Return formatted response

### 3. POST `/api/plexus/[id]/repositories`
Adds a repository to the plexus.

**Request:**
```typescript
POST /api/plexus/abc123/repositories
Headers:
  Cookie: session token
Body:
{
  githubRepoId: number       // GitHub repository ID
  name: string               // Repository name
  fullName: string           // Full repository name (owner/repo)
  url: string                // GitHub URL
  description: string | null
  language: string | null
  isPrivate: boolean
}
```

**Response:**
```typescript
{
  repository: {
    id: string               // Database repo ID
    name: string
    fullName: string
    url: string
    plexusId: string
    githubRepoId: number
    lastIndexed: null
    createdAt: Date
  }
}
```

**Implementation:**
- Validate user has access to plexus (must be member)
- Validate repository doesn't already exist in plexus
- Create repository record in database
- Return created repository
- (Future: Trigger background job to index repository)

## Frontend Components

### AddRepoDialog Component

**Location:** `packages/ui/src/AddRepoDialog/AddRepoDialog.tsx`

**Props:**
```typescript
type AddRepoDialogProps = {
  plexusId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}
```

**Component Structure:**
```typescript
export function AddRepoDialog({ plexusId, open, onOpenChange, onSuccess }: AddRepoDialogProps) {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)

  // Fetch organizations
  const { data: orgsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['github-organizations'],
    queryFn: fetchGitHubOrganizations,
    enabled: open, // Only fetch when dialog is open
  })

  // Fetch repositories for selected org
  const { data: reposData, isLoading: reposLoading, error: reposError } = useQuery({
    queryKey: ['github-repositories', selectedOrg, plexusId],
    queryFn: () => fetchGitHubRepositories(selectedOrg!, plexusId),
    enabled: open && selectedOrg !== null, // Only fetch when org is selected
  })

  // Add repository mutation
  const addRepoMutation = useMutation({
    mutationFn: (data: AddRepoInput) => addRepository(plexusId, data),
    onSuccess: () => {
      onSuccess?.()
      onOpenChange(false)
      // Show success toast
    },
    onError: (error) => {
      // Show error toast
    }
  })

  const handleSubmit = () => {
    if (!selectedRepo) return

    addRepoMutation.mutate({
      githubRepoId: selectedRepo.id,
      name: selectedRepo.name,
      fullName: selectedRepo.full_name,
      url: selectedRepo.html_url,
      description: selectedRepo.description,
      language: selectedRepo.language,
      isPrivate: selectedRepo.private,
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Title>Add Repository</Dialog.Title>
          <Dialog.Description>
            Connect a GitHub repository to this plexus for code search.
          </Dialog.Description>

          <div className="stack">
            {/* Organization Select */}
            <Field.Root>
              <Field.Label>Organization</Field.Label>
              <Select
                value={selectedOrg}
                onValueChange={(value) => {
                  setSelectedOrg(value)
                  setSelectedRepo(null) // Reset repo selection
                }}
                disabled={orgsLoading}
              >
                {orgsLoading && <option>Loading organizations...</option>}
                {orgsError && <option>Error loading organizations</option>}
                {orgsData?.organizations.map((org) => (
                  <option key={org.login} value={org.login}>
                    {org.login} {org.type === 'User' ? '(Personal)' : ''}
                  </option>
                ))}
              </Select>
            </Field.Root>

            {/* Repository Select */}
            <Field.Root>
              <Field.Label>Repository</Field.Label>
              <Select
                value={selectedRepo?.id.toString()}
                onValueChange={(value) => {
                  const repo = reposData?.repositories.find(r => r.id.toString() === value)
                  setSelectedRepo(repo || null)
                }}
                disabled={!selectedOrg || reposLoading}
              >
                {!selectedOrg && <option>Select an organization first</option>}
                {reposLoading && <option>Loading repositories...</option>}
                {reposError && <option>Error loading repositories</option>}
                {reposData?.repositories.length === 0 && (
                  <option>No available repositories</option>
                )}
                {reposData?.repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                    {repo.private ? ' 🔒' : ''}
                    {repo.description ? ` - ${repo.description}` : ''}
                  </option>
                ))}
              </Select>
            </Field.Root>
          </div>

          <Dialog.Actions>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedRepo || addRepoMutation.isPending}
            >
              {addRepoMutation.isPending ? 'Adding...' : 'Add Repository'}
            </Button>
          </Dialog.Actions>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

### API Client Functions

**Location:** `packages/ui/src/AddRepoDialog/api.ts`

```typescript
export type GitHubOrganization = {
  login: string
  id: number
  avatar_url: string
  description: string
  type: 'Organization' | 'User'
}

export type GitHubRepo = {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  private: boolean
  language: string | null
  stargazers_count: number
  fork: boolean
}

export async function fetchGitHubOrganizations(): Promise<{ organizations: GitHubOrganization[] }> {
  const response = await fetch('/api/github/organizations')
  if (!response.ok) throw new Error('Failed to fetch organizations')
  return response.json()
}

export async function fetchGitHubRepositories(
  org: string,
  plexusId: string
): Promise<{ repositories: GitHubRepo[] }> {
  const response = await fetch(`/api/github/repositories?org=${org}&plexusId=${plexusId}`)
  if (!response.ok) throw new Error('Failed to fetch repositories')
  return response.json()
}

export type AddRepoInput = {
  githubRepoId: number
  name: string
  fullName: string
  url: string
  description: string | null
  language: string | null
  isPrivate: boolean
}

export async function addRepository(plexusId: string, data: AddRepoInput) {
  const response = await fetch(`/api/plexus/${plexusId}/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to add repository')
  return response.json()
}
```

## Database Schema Updates

### Repositories Table

The existing `Repo` model likely needs these fields:

```prisma
model Repo {
  id           String   @id @default(cuid())
  name         String
  fullName     String
  url          String
  description  String?
  language     String?
  isPrivate    Boolean  @default(false)
  githubRepoId Int      @unique
  plexusId     String
  plexus       Plexus   @relation(fields: [plexusId], references: [id], onDelete: Cascade)
  lastIndexed  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([plexusId, githubRepoId]) // Prevent duplicate repos in same plexus
  @@index([plexusId])
  @@index([githubRepoId])
}
```

**Key Fields:**
- `githubRepoId`: GitHub's repository ID (for uniqueness)
- `fullName`: Full repository name (e.g., "vercel/next.js")
- `isPrivate`: Whether the repo is private
- `language`: Primary programming language
- `description`: Repository description from GitHub

## GitHub API Integration

### Authentication
- User's GitHub access token is stored in their session after OAuth
- Token is used to authenticate GitHub API requests
- Token should have scopes: `repo` (for private repos) and `read:org`

### API Endpoints Used

**1. Get User's Organizations:**
```
GET https://api.github.com/user/orgs
Headers:
  Authorization: Bearer {access_token}
  Accept: application/vnd.github.v3+json
```

**2. Get User Profile (Personal Account):**
```
GET https://api.github.com/user
Headers:
  Authorization: Bearer {access_token}
  Accept: application/vnd.github.v3+json
```

**3. Get Organization Repositories:**
```
GET https://api.github.com/orgs/{org}/repos?sort=updated&per_page=100
Headers:
  Authorization: Bearer {access_token}
  Accept: application/vnd.github.v3+json
Query Parameters:
  - sort=updated (show recently updated repos first)
  - per_page=100 (show up to 100 repos)
  - page=1 (pagination if needed)
```

**4. Get User Repositories:**
```
GET https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100
Headers:
  Authorization: Bearer {access_token}
  Accept: application/vnd.github.v3+json
Query Parameters:
  - affiliation=owner (only repos user owns)
  - sort=updated
  - per_page=100
```

### Rate Limiting
- GitHub API has rate limits (5000 requests/hour for authenticated users)
- Should cache organization/repo data in TanStack Query
- Consider showing cached data while revalidating

## Edge Cases & Error Handling

### 1. User Not Authenticated with GitHub
- **Detection**: No GitHub access token in session
- **Handling**: Show error message in dialog: "Please connect your GitHub account first"
- **Action**: Provide link to settings/integrations page

### 2. Expired GitHub Token
- **Detection**: GitHub API returns 401 Unauthorized
- **Handling**: Show error message: "Your GitHub connection has expired"
- **Action**: Prompt user to reconnect GitHub

### 3. Insufficient GitHub Permissions
- **Detection**: GitHub API returns 403 Forbidden
- **Handling**: Show error: "You don't have permission to access this organization's repositories"
- **Action**: Skip that org or show with disabled state

### 4. Repository Already Added
- **Detection**: Check `githubRepoId` against existing repos in plexus
- **Handling**: Filter out from repository list OR show as disabled with note
- **UI**: Show "(Already added)" next to repo name

### 5. No Repositories Available
- **Detection**: API returns empty array
- **Handling**: Show message: "No repositories available in this organization"
- **Action**: Allow user to select different org

### 6. Network Errors
- **Detection**: Fetch fails or times out
- **Handling**: Show error message with retry button
- **Action**: Allow user to retry request

### 7. Organization with 100+ Repositories
- **Detection**: API returns 100 repos (max per page)
- **Handling**: Implement pagination or search/filter
- **Alternative**: Use Combobox with search instead of Select

### 8. Private Repositories
- **Detection**: `repo.private === true`
- **Handling**: Show lock icon 🔒 next to repo name
- **Validation**: Ensure user has access before allowing addition

## Security Considerations

### 1. Authorization
- **Verify plexus membership**: User must be a member of the plexus to add repos
- **Role check**: May want to restrict to ADMIN/OWNER roles only
- **Implementation**: Check `PlexusMember` table before allowing addition

### 2. GitHub Token Security
- **Never expose token**: Token stays server-side, never sent to client
- **Secure storage**: Token encrypted in database
- **Token refresh**: Handle token expiration gracefully

### 3. Input Validation
- **Validate plexusId**: Ensure it exists and user has access
- **Validate githubRepoId**: Ensure it's a valid number
- **Sanitize inputs**: Prevent injection attacks
- **Schema validation**: Use Zod schemas

### 4. Rate Limit Protection
- **Cache GitHub API responses**: Use TanStack Query caching
- **Debounce requests**: If implementing search
- **Show loading states**: Prevent duplicate requests

## UI/UX Enhancements

### Loading States
1. Initial organizations load: Show skeleton/spinner in org select
2. Repositories loading: Show spinner in repo select
3. Submit loading: Disable button, show "Adding..." text
4. Success: Show toast, close dialog, refresh table

### Error States
1. Failed to load orgs: Show error message with retry button
2. Failed to load repos: Show error message with retry button
3. Failed to add repo: Show error toast, keep dialog open

### Empty States
1. No organizations: "No organizations found. Please check your GitHub connection."
2. No repositories: "No repositories available in this organization."
3. All repos already added: "All repositories in this organization are already added."

### Accessibility
- Proper ARIA labels on selects
- Keyboard navigation support
- Focus management (focus first select on open)
- Screen reader announcements for loading/error states

## Future Enhancements

### 1. Search/Filter Repositories
- Add search input to filter large repository lists
- Use Combobox instead of Select for better UX
- Debounced search input

### 2. Bulk Add Repositories
- Allow selecting multiple repositories at once
- Show progress indicator for bulk operations
- Handle partial failures gracefully

### 3. Repository Metadata
- Show repository stars, language, last updated
- Show repository size
- Show if repository is archived

### 4. Automatic Indexing
- Trigger background job to index repository after adding
- Show indexing progress/status
- Notify when indexing is complete

### 5. Webhook Integration
- Set up GitHub webhooks for automatic updates
- Listen for push events to trigger re-indexing
- Show real-time sync status

### 6. Repository Removal
- Allow removing repositories from plexus
- Confirmation dialog
- Cascade delete indexed data

## Implementation Checklist

### Phase 1: Backend API
- [ ] Create `GET /api/github/organizations` endpoint
- [ ] Create `GET /api/github/repositories` endpoint
- [ ] Create `POST /api/plexus/[id]/repositories` endpoint
- [ ] Add authorization checks
- [ ] Add input validation with Zod
- [ ] Test with authenticated user

### Phase 2: Frontend Component
- [ ] Create `AddRepoDialog` component
- [ ] Implement organization select
- [ ] Implement repository select
- [ ] Add TanStack Query hooks
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add form validation

### Phase 3: Integration
- [ ] Add dialog to repos page
- [ ] Wire up "Add Repository" button
- [ ] Implement table refresh after adding
- [ ] Add success/error toast notifications
- [ ] Test complete flow

### Phase 4: Polish
- [ ] Add loading skeletons
- [ ] Improve error messages
- [ ] Add empty states
- [ ] Test edge cases
- [ ] Add accessibility features
- [ ] Performance optimization (caching, debouncing)

## Testing Scenarios

1. **Happy path**: Add a repository successfully
2. **No organizations**: User has no GitHub orgs
3. **No repositories**: Organization has no repos
4. **All repos added**: All repos in org already in plexus
5. **Network error**: GitHub API fails
6. **Expired token**: GitHub token is invalid
7. **Duplicate repo**: Try to add same repo twice
8. **Private repo**: Add a private repository
9. **Cancel**: Close dialog without adding
10. **Large org**: Org with 100+ repositories
