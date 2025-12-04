'use client'

import { Field } from '@symploke/ui/Field/Field'
import { Button } from '@symploke/ui/Button/Button'
import { FormError } from '@symploke/ui/FormError/FormError'
import { useCreatePlexus } from '@/hooks/usePlexus'
import type { FormEvent } from 'react'

export function CreatePlexusForm() {
  const createPlexus = useCreatePlexus()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string

    if (name) {
      createPlexus.mutate({ name })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-plexus-form">
      <Field.Root>
        <Field.Label htmlFor="plexus-name">Plexus Name</Field.Label>
        <Field.Control
          id="plexus-name"
          name="name"
          type="text"
          placeholder="My Team's Plexus"
          required
          autoFocus
        />
      </Field.Root>

      {createPlexus.error && <FormError message={createPlexus.error.message} />}

      <div className="create-plexus-actions">
        <Button type="submit" variant="primary" size="lg" disabled={createPlexus.isPending}>
          {createPlexus.isPending ? 'Creating...' : 'Create Plexus'}
        </Button>
      </div>
    </form>
  )
}
