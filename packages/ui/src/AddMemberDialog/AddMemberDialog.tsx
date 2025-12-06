'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '../Button/Button'
import { Dialog } from '../Dialog/Dialog'
import { Input } from '../Input/Input'
import '@symploke/design/components/add-member-dialog.css'

type User = {
  id: string
  name: string | null
  email: string
  image: string | null
}

type Role = 'OWNER' | 'ADMIN' | 'MEMBER'

export type AddMemberDialogProps = {
  plexusId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({ plexusId, open, onOpenChange }: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER')
  const queryClient = useQueryClient()

  // Search users
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users-search', searchQuery, plexusId],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        plexusId,
      })
      const response = await fetch(`/api/users/search?${params}`)
      if (!response.ok) {
        throw new Error('Failed to search users')
      }
      return response.json() as Promise<{ users: User[] }>
    },
    enabled: open,
  })

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return []
    return usersData.users
  }, [usersData?.users])

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const response = await fetch(`/api/plexus/${plexusId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to add member')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidate members query
      queryClient.invalidateQueries({ queryKey: ['plexus-members', plexusId] })
      // Reset form
      setSelectedUser(null)
      setSelectedRole('MEMBER')
      setSearchQuery('')
      // Close dialog
      onOpenChange(false)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUser) {
      addMemberMutation.mutate({ userId: selectedUser.id, role: selectedRole })
    }
  }

  const handleClose = () => {
    if (!addMemberMutation.isPending) {
      setSelectedUser(null)
      setSelectedRole('MEMBER')
      setSearchQuery('')
      addMemberMutation.reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup className="dialog-popup">
          <form onSubmit={handleSubmit} className="add-member-dialog">
            <Dialog.Title className="dialog-title">Add Member</Dialog.Title>
            <Dialog.Description className="dialog-description">
              Search for a user to add to this plexus.
            </Dialog.Description>

            <div className="add-member-dialog__content">
              {!selectedUser ? (
                <>
                  <div className="add-member-dialog__search">
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {isLoadingUsers ? (
                    <div className="add-member-dialog__loading">Searching...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="add-member-dialog__empty">
                      {searchQuery ? 'No users found' : 'Type to search for users'}
                    </div>
                  ) : (
                    <div className="add-member-dialog__user-list">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="add-member-dialog__user-card"
                          onClick={() => setSelectedUser(user)}
                          disabled={addMemberMutation.isPending}
                        >
                          {user.image ? (
                            <img
                              src={user.image}
                              alt=""
                              className="add-member-dialog__user-avatar"
                            />
                          ) : (
                            <div className="add-member-dialog__user-avatar add-member-dialog__user-avatar--placeholder">
                              {(user.name ?? user.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="add-member-dialog__user-info">
                            <div className="add-member-dialog__user-name">
                              {user.name || 'Unknown'}
                            </div>
                            <div className="add-member-dialog__user-email">{user.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="add-member-dialog__selected-user">
                    <div className="add-member-dialog__user-card add-member-dialog__user-card--selected">
                      {selectedUser.image ? (
                        <img
                          src={selectedUser.image}
                          alt=""
                          className="add-member-dialog__user-avatar"
                        />
                      ) : (
                        <div className="add-member-dialog__user-avatar add-member-dialog__user-avatar--placeholder">
                          {(selectedUser.name ?? selectedUser.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="add-member-dialog__user-info">
                        <div className="add-member-dialog__user-name">
                          {selectedUser.name || 'Unknown'}
                        </div>
                        <div className="add-member-dialog__user-email">{selectedUser.email}</div>
                      </div>
                      <button
                        type="button"
                        className="add-member-dialog__clear-button"
                        onClick={() => setSelectedUser(null)}
                        disabled={addMemberMutation.isPending}
                        aria-label="Clear selection"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="add-member-dialog__role-section">
                    <label className="add-member-dialog__label">Role</label>
                    <div className="add-member-dialog__role-options">
                      <button
                        type="button"
                        className={`add-member-dialog__role-option ${
                          selectedRole === 'MEMBER'
                            ? 'add-member-dialog__role-option--selected'
                            : ''
                        }`}
                        onClick={() => setSelectedRole('MEMBER')}
                        disabled={addMemberMutation.isPending}
                      >
                        <div className="add-member-dialog__role-name">Member</div>
                        <div className="add-member-dialog__role-description">
                          Can view and contribute
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`add-member-dialog__role-option ${
                          selectedRole === 'ADMIN' ? 'add-member-dialog__role-option--selected' : ''
                        }`}
                        onClick={() => setSelectedRole('ADMIN')}
                        disabled={addMemberMutation.isPending}
                      >
                        <div className="add-member-dialog__role-name">Admin</div>
                        <div className="add-member-dialog__role-description">
                          Can manage members and settings
                        </div>
                      </button>
                    </div>
                  </div>

                  {addMemberMutation.isError && (
                    <div className="add-member-dialog__error">
                      {addMemberMutation.error instanceof Error
                        ? addMemberMutation.error.message
                        : 'Failed to add member'}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="add-member-dialog__actions">
              <Button
                type="button"
                variant="secondary"
                disabled={addMemberMutation.isPending}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedUser || addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
