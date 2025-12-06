'use client'

import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '../Dialog/Dialog'
import { Button } from '../Button/Button'
import { Input } from '../Input/Input'
import '@symploke/design/components/add-repo-dialog.css'

type Organization = {
  login: string
  id: number
  avatar_url: string
  description: string
  type: 'User' | 'Organization'
}

type Repository = {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  private: boolean
  language: string | null
  stargazers_count: number
  fork: boolean
  created_at: string | null
  updated_at: string | null
  pushed_at: string | null
}

type SortOption = 'updated' | 'created' | 'name' | 'stars'

type ApiError = Error & {
  code?: string
}

export type AddRepoDialogProps = {
  plexusId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRepoDialog({ plexusId, open, onOpenChange }: AddRepoDialogProps) {
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null)
  const [filterText, setFilterText] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const queryClient = useQueryClient()

  // Fetch organizations
  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['github-organizations'],
    queryFn: async () => {
      const response = await fetch('/api/github/organizations')
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }
      return response.json() as Promise<{ organizations: Organization[] }>
    },
    enabled: open,
  })

  // Fetch repositories for selected org
  const {
    data: reposData,
    isLoading: isLoadingRepos,
    error: reposError,
  } = useQuery({
    queryKey: ['github-repositories', selectedOrg, plexusId],
    queryFn: async () => {
      const params = new URLSearchParams({
        org: selectedOrg,
        plexusId,
      })
      const response = await fetch(`/api/github/repositories?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        const error: ApiError = new Error(
          errorData.error?.message || 'Failed to fetch repositories',
        )
        error.code = errorData.error?.code
        throw error
      }
      return response.json() as Promise<{ repositories: Repository[] }>
    },
    enabled: open && !!selectedOrg,
    retry: false,
  })

  // Filter and sort repositories
  const filteredAndSortedRepos = useMemo(() => {
    if (!reposData?.repositories) return []

    let repos = [...reposData.repositories]

    // Filter by name or description
    if (filterText.trim()) {
      const search = filterText.toLowerCase()
      repos = repos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(search) ||
          repo.full_name.toLowerCase().includes(search) ||
          repo.description?.toLowerCase().includes(search),
      )
    }

    // Sort
    repos.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.pushed_at || 0).getTime() - new Date(a.pushed_at || 0).getTime()
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'stars':
          return b.stargazers_count - a.stargazers_count
        default:
          return 0
      }
    })

    return repos
  }, [reposData?.repositories, filterText, sortBy])

  // Add repository mutation
  const addRepoMutation = useMutation({
    mutationFn: async (githubId: number) => {
      const response = await fetch(`/api/plexus/${plexusId}/repositories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to add repository')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch repos
      queryClient.invalidateQueries({ queryKey: ['plexus-repos', plexusId] })
      // Reset form
      setSelectedOrg('')
      setSelectedRepo(null)
      // Close dialog
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRepo !== null) {
      addRepoMutation.mutate(selectedRepo)
    }
  }

  const handleClose = () => {
    if (!addRepoMutation.isPending) {
      setSelectedOrg('')
      setSelectedRepo(null)
      setFilterText('')
      setSortBy('updated')
      addRepoMutation.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <form onSubmit={handleSubmit} className="add-repo-dialog">
            <Dialog.Title className="dialog-title">Add Repository</Dialog.Title>
            <Dialog.Description className="dialog-description">
              Select a GitHub organization and repository to add to this plexus.
            </Dialog.Description>

            <div className="add-repo-dialog__content">
              {!selectedOrg ? (
                <>
                  <div className="add-repo-dialog__section-label">Select a GitHub organization</div>
                  {isLoadingOrgs ? (
                    <div className="add-repo-dialog__loading">Loading organizations...</div>
                  ) : (
                    <div className="add-repo-dialog__org-list">
                      {orgsData?.organizations.map((org) => (
                        <button
                          key={org.login}
                          type="button"
                          className="add-repo-dialog__org-card"
                          onClick={() => {
                            setSelectedOrg(org.login)
                            setSelectedRepo(null)
                          }}
                          disabled={addRepoMutation.isPending}
                        >
                          <img
                            src={org.avatar_url}
                            alt=""
                            className="add-repo-dialog__org-avatar"
                          />
                          <div className="add-repo-dialog__org-info">
                            <div className="add-repo-dialog__org-name">{org.login}</div>
                            {org.description && (
                              <div className="add-repo-dialog__org-description">
                                {org.description}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="add-repo-dialog__selected-org">
                    <div className="add-repo-dialog__org-card add-repo-dialog__org-card--selected">
                      <img
                        src={
                          orgsData?.organizations.find((o) => o.login === selectedOrg)?.avatar_url
                        }
                        alt=""
                        className="add-repo-dialog__org-avatar"
                      />
                      <div className="add-repo-dialog__org-info">
                        <div className="add-repo-dialog__org-name">{selectedOrg}</div>
                      </div>
                      <button
                        type="button"
                        className="add-repo-dialog__clear-button"
                        onClick={() => {
                          setSelectedOrg('')
                          setSelectedRepo(null)
                        }}
                        disabled={addRepoMutation.isPending}
                        aria-label="Clear selection"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="add-repo-dialog__section-label">Select a repository</div>

                  {reposError && (reposError as ApiError).code === 'NO_INSTALLATION' ? (
                    <div className="add-repo-dialog__install-prompt">
                      <div className="add-repo-dialog__install-message">
                        The Symploke GitHub App is not installed for <strong>{selectedOrg}</strong>.
                        <br />
                        Install it to grant access to repositories.
                        {(reposError as ApiError & { availableInstallations?: string[] })
                          .availableInstallations?.length ? (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                            Available installations:{' '}
                            {(
                              reposError as ApiError & { availableInstallations?: string[] }
                            ).availableInstallations?.join(', ')}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          const appSlug = 'symploke-dev'

                          const state = encodeURIComponent(
                            JSON.stringify({
                              org: selectedOrg,
                              plexusId,
                            }),
                          )

                          const orgData = orgsData?.organizations.find(
                            (o) => o.login === selectedOrg,
                          )

                          const targetId = orgData?.id ? `&target_id=${orgData.id}` : ''
                          const account = orgData?.login ? `&account=${orgData.login}` : ''

                          window.location.href = `https://github.com/apps/${appSlug}/installations/new?state=${state}${targetId}${account}`
                        }}
                      >
                        Install GitHub App
                      </Button>
                    </div>
                  ) : isLoadingRepos ? (
                    <div className="add-repo-dialog__loading">Loading repositories...</div>
                  ) : reposError ? (
                    <div className="add-repo-dialog__error">{(reposError as Error).message}</div>
                  ) : reposData?.repositories.length === 0 ? (
                    <div className="add-repo-dialog__empty">
                      All repositories from this organization have been added.
                    </div>
                  ) : (
                    <>
                      <div className="add-repo-dialog__filters">
                        <Input
                          placeholder="Filter repositories..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="add-repo-dialog__filter-input"
                        />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="add-repo-dialog__sort-select"
                        >
                          <option value="updated">Last updated</option>
                          <option value="created">Date created</option>
                          <option value="name">Name</option>
                          <option value="stars">Stars</option>
                        </select>
                      </div>
                      <div className="add-repo-dialog__repo-count">
                        {filteredAndSortedRepos.length === reposData?.repositories.length
                          ? `${reposData?.repositories.length} repositories`
                          : `${filteredAndSortedRepos.length} of ${reposData?.repositories.length} repositories`}
                      </div>
                      {filteredAndSortedRepos.length === 0 ? (
                        <div className="add-repo-dialog__empty">
                          No repositories match your filter.
                        </div>
                      ) : (
                        <div className="add-repo-dialog__repo-list">
                          {filteredAndSortedRepos.map((repo) => (
                            <button
                              key={repo.id}
                              type="button"
                              className={`add-repo-dialog__repo-card ${
                                selectedRepo === repo.id
                                  ? 'add-repo-dialog__repo-card--selected'
                                  : ''
                              }`}
                              onClick={() => setSelectedRepo(repo.id)}
                              disabled={addRepoMutation.isPending}
                            >
                              <div className="add-repo-dialog__repo-info">
                                <div className="add-repo-dialog__repo-name">{repo.name}</div>
                                {repo.description && (
                                  <div className="add-repo-dialog__repo-description">
                                    {repo.description}
                                  </div>
                                )}
                                <div className="add-repo-dialog__repo-meta">
                                  {repo.language && (
                                    <span className="add-repo-dialog__repo-language">
                                      {repo.language}
                                    </span>
                                  )}
                                  {repo.private && (
                                    <span className="add-repo-dialog__repo-badge">Private</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {addRepoMutation.isError && (
                    <div className="add-repo-dialog__error">
                      {addRepoMutation.error instanceof Error
                        ? addRepoMutation.error.message
                        : 'Failed to add repository'}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="add-repo-dialog__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={addRepoMutation.isPending}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedRepo || addRepoMutation.isPending}
              >
                {addRepoMutation.isPending ? 'Adding...' : 'Add Repository'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
