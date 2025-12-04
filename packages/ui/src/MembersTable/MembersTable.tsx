import { Table } from '../Table/Table'
import type { TableColumn } from '../Table/Table'
import '@symploke/design/components/members-table.css'

export type Member = {
  userId: string
  role: string
  user: {
    name: string | null
    email: string
    image: string | null
  }
}

export type MembersTableProps = {
  members: Member[]
  className?: string
}

const columns: TableColumn<Member>[] = [
  {
    header: 'Name',
    accessor: (member) => (
      <div className="members-table__name-cell">
        {member.user.image && (
          <img
            src={member.user.image}
            alt={member.user.name || 'User avatar'}
            className="members-table__avatar"
          />
        )}
        <span>{member.user.name || 'Unknown'}</span>
      </div>
    ),
  },
  {
    header: 'Email',
    accessor: (member) => member.user.email,
    className: 'members-table__email',
  },
  {
    header: 'Role',
    accessor: (member) => <span className="members-table__role">{member.role}</span>,
  },
]

export function MembersTable({ members, className }: MembersTableProps) {
  return (
    <Table
      columns={columns}
      data={members}
      emptyMessage="No members yet"
      className={className}
      getRowKey={(member) => member.userId}
    />
  )
}
