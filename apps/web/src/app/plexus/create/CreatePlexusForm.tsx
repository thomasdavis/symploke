'use client'

import { Field } from '@symploke/ui/Field/Field'
import { Button } from '@symploke/ui/Button/Button'
import { createPlexus } from './actions'

export function CreatePlexusForm() {
  return (
    <form action={createPlexus} className="create-plexus-form">
      <Field.Root>
        <Field.Label>Plexus Name</Field.Label>
        <Field.Control
          name="name"
          type="text"
          placeholder="My Team's Plexus"
          required
          autoFocus
        />
      </Field.Root>

      <div className="create-plexus-actions">
        <Button type="submit" variant="primary" size="lg">
          Create Plexus
        </Button>
      </div>
    </form>
  )
}
