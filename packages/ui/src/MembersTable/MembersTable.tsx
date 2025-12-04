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

export function MembersTable({ members, className }: MembersTableProps) {
  return (
    <div className={`members-table-container ${className || ''}`}>
      <table className="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.length === 0 ? (
            <tr>
              <td colSpan={3} className="members-table__empty">
                No members yet
              </td>
            </tr>
          ) : (
            members.map((member) => (
              <tr key={member.userId}>
                <td>
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
                </td>
                <td className="members-table__email">{member.user.email}</td>
                <td>
                  <span className="members-table__role">{member.role}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
