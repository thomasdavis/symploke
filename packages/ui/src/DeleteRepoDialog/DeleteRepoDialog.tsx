'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertDialog } from '../AlertDialog/AlertDialog'
import { Button } from '../Button/Button'
import '@symploke/design/components/delete-repo-dialog.css'

export type DeleteRepoDialogProps = {
  plexusId: string
  repoId: string | null
  repoName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRepoDialog({
  plexusId,
  repoId,
  repoName,
  open,
  onOpenChange,
}: DeleteRepoDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async (repoIdToDelete: string) => {
      const response = await fetch(`/api/plexus/${plexusId}/repositories/${repoIdToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to delete repository')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plexus-repos', plexusId] })
      onOpenChange(false)
    },
  })

  const handleDelete = () => {
    if (repoId) {
      deleteMutation.mutate(repoId)
    }
  }

  const handleClose = () => {
    if (!deleteMutation.isPending) {
      deleteMutation.reset()
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleClose}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Popup className="delete-repo-dialog">
          <AlertDialog.Title>Remove Repository</AlertDialog.Title>
          <AlertDialog.Description>
            Are you sure you want to remove <strong>{repoName}</strong> from this plexus? This will
            delete all indexed files, embeddings, and weaves associated with this repository.
          </AlertDialog.Description>

          {deleteMutation.isError && (
            <div className="delete-repo-dialog__error">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Failed to delete repository'}
            </div>
          )}

          <div className="delete-repo-dialog__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove Repository'}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
