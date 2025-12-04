'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '../Dialog/Dialog'
import { Button } from '../Button/Button'
import { Select } from '../Select/Select'
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
}

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
              <div className="add-repo-dialog__field">
                <label htmlFor="org-select" className="add-repo-dialog__label">
                  Organization
                </label>
                <Select.Root
                  value={selectedOrg ? [selectedOrg] : []}
                  onValueChange={(value) => {
                    const orgValue = value as string[]
                    setSelectedOrg(orgValue[0] || '')
                    setSelectedRepo(null)
                  }}
                  disabled={isLoadingOrgs || addRepoMutation.isPending}
                >
                  <Select.Trigger id="org-select" className="add-repo-dialog__select-trigger">
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner>
                      <Select.Popup className="add-repo-dialog__select-popup">
                        {isLoadingOrgs ? (
                          <div className="add-repo-dialog__loading">Loading organizations...</div>
                        ) : (
                          orgsData?.organizations.map((org) => (
                            <Select.Item
                              key={org.login}
                              value={org.login}
                              className="add-repo-dialog__select-option"
                            >
                              <Select.ItemText>
                                <div className="add-repo-dialog__org-option">
                                  <img
                                    src={org.avatar_url}
                                    alt=""
                                    className="add-repo-dialog__org-avatar"
                                  />
                                  <div>
                                    <div className="add-repo-dialog__org-name">{org.login}</div>
                                    {org.description && (
                                      <div className="add-repo-dialog__org-description">
                                        {org.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Select.ItemText>
                            </Select.Item>
                          ))
                        )}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>

              {selectedOrg && (
                <div className="add-repo-dialog__field">
                  <label htmlFor="repo-select" className="add-repo-dialog__label">
                    Repository
                  </label>
                  {reposError && (reposError as ApiError).code === 'NO_INSTALLATION' ? (
                    <div className="add-repo-dialog__install-prompt">
                      <div className="add-repo-dialog__install-message">
                        The Symploke GitHub App is not installed for <strong>{selectedOrg}</strong>.
                        <br />
                        Install it to grant access to repositories.
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          window.open(
                            `https://github.com/apps/symploke/installations/new?state=${encodeURIComponent(
                              JSON.stringify({ org: selectedOrg, plexusId }),
                            )}`,
                            '_blank',
                          )
                        }}
                      >
                        Install GitHub App
                      </Button>
                    </div>
                  ) : (
                    <Select.Root
                      value={selectedRepo ? [selectedRepo.toString()] : []}
                      onValueChange={(value) => {
                        const repoValue = value as string[]
                        setSelectedRepo(repoValue[0] ? Number(repoValue[0]) : null)
                      }}
                      disabled={isLoadingRepos || addRepoMutation.isPending}
                    >
                      <Select.Trigger id="repo-select" className="add-repo-dialog__select-trigger">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Positioner>
                          <Select.Popup className="add-repo-dialog__select-popup">
                            {isLoadingRepos ? (
                              <div className="add-repo-dialog__loading">
                                Loading repositories...
                              </div>
                            ) : reposError ? (
                              <div className="add-repo-dialog__error">
                                {(reposError as Error).message}
                              </div>
                            ) : reposData?.repositories.length === 0 ? (
                              <div className="add-repo-dialog__empty">
                                All repositories from this organization have been added.
                              </div>
                            ) : (
                              reposData?.repositories.map((repo) => (
                                <Select.Item
                                  key={repo.id}
                                  value={repo.id.toString()}
                                  className="add-repo-dialog__select-option"
                                >
                                  <Select.ItemText>
                                    <div className="add-repo-dialog__repo-option">
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
                                          <span className="add-repo-dialog__repo-badge">
                                            Private
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </Select.ItemText>
                                </Select.Item>
                              ))
                            )}
                          </Select.Popup>
                        </Select.Positioner>
                      </Select.Portal>
                    </Select.Root>
                  )}
                </div>
              )}

              {addRepoMutation.isError && (
                <div className="add-repo-dialog__error">
                  {addRepoMutation.error instanceof Error
                    ? addRepoMutation.error.message
                    : 'Failed to add repository'}
                </div>
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
