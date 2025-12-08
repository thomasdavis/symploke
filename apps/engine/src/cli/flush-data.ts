#!/usr/bin/env node
import 'dotenv/config'
import { db } from '@symploke/db'

const plexusId = process.argv[2]

if (!plexusId) {
  console.error('Usage: flush-data.ts <plexus-id>')
  process.exit(1)
}

async function main() {
  console.log(`Flushing data for plexus: ${plexusId}`)

  // Delete weaves
  const weaves = await db.weave.deleteMany({ where: { plexusId } })
  console.log('Deleted weaves:', weaves.count)

  // Delete discovery runs
  const runs = await db.weaveDiscoveryRun.deleteMany({ where: { plexusId } })
  console.log('Deleted discovery runs:', runs.count)

  // Delete glossaries for repos in this plexus
  const repos = await db.repo.findMany({ where: { plexusId }, select: { id: true } })
  const repoIds = repos.map((r) => r.id)
  const glossaries = await db.repoGlossary.deleteMany({ where: { repoId: { in: repoIds } } })
  console.log('Deleted glossaries:', glossaries.count)

  console.log('Done flushing!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
