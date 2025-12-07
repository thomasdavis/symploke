#!/usr/bin/env node
import 'dotenv/config'
import { db } from '@symploke/db'
import { profileRepository } from '../weave/profiler.js'
import { findCandidateRelationships, assessRelationship } from '../weave/matcher.js'
import { extractPhilosophicalProfiles, findPhilosophicalMatches } from '../weave/philosophy.js'
import * as fs from 'node:fs'

const BLOCKS_ID = 'cmitkus9a00052uhbovqo6na6'
const CARMACK_ID = 'cmiurzv860001l204f294s90e'
const LOG_FILE = 'weave-pair-log.json'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: unknown
}

const logs: LogEntry[] = []

function log(level: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined ? { data } : {}),
  }
  logs.push(entry)
  console.log(`[${level}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
}

async function main() {
  log('info', 'Starting weave discovery between blocks and carmack')

  // Get repos
  const blocks = await db.repo.findUnique({
    where: { id: BLOCKS_ID },
    include: { plexus: true },
  })

  const carmack = await db.repo.findUnique({
    where: { id: CARMACK_ID },
    include: { plexus: true },
  })

  if (!blocks || !carmack) {
    log('error', 'Could not find repos', { blocks: !!blocks, carmack: !!carmack })
    process.exit(1)
  }

  log('info', 'Found repos', {
    blocks: blocks.fullName,
    carmack: carmack.fullName,
  })

  // Profile both repos
  log('info', 'Profiling blocks...')
  const blocksProfile = await profileRepository(BLOCKS_ID)
  log('info', 'Blocks profile', blocksProfile)

  log('info', 'Profiling carmack...')
  const carmackProfile = await profileRepository(CARMACK_ID)
  log('info', 'Carmack profile', carmackProfile)

  if (!blocksProfile || !carmackProfile) {
    log('error', 'Could not profile repos')
    process.exit(1)
  }

  const profiles = [blocksProfile, carmackProfile]

  // Find functional candidates
  log('info', 'Finding functional relationship candidates...')
  const candidates = findCandidateRelationships(profiles)
  log('info', 'Candidates found', { count: candidates.length, candidates })

  // Assess each candidate
  for (const candidate of candidates) {
    log('info', 'Assessing candidate', {
      source: candidate.sourceRepo.fullName,
      target: candidate.targetRepo.fullName,
      relationshipType: candidate.relationshipType,
      hypothesis: candidate.hypothesis,
    })

    const assessment = await assessRelationship(candidate)
    log('info', 'Assessment result', assessment)
  }

  // Extract philosophical profiles
  log('info', 'Extracting philosophical profiles...')
  const philosophicalProfiles = await extractPhilosophicalProfiles(profiles)
  for (const philProfile of philosophicalProfiles) {
    log('info', 'Philosophical profile', philProfile)
  }

  // Find philosophical matches
  if (philosophicalProfiles.length >= 2) {
    log('info', 'Finding philosophical (schizosophy) matches...')
    const philosophicalMatches = findPhilosophicalMatches(philosophicalProfiles)
    log('info', 'Philosophical matches found', {
      count: philosophicalMatches.length,
      matches: philosophicalMatches,
    })
  }

  // Write logs to file
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2))
  log('info', `Logs written to ${LOG_FILE}`)

  console.log('\n=== Summary ===')
  console.log(`Profiles created: 2`)
  console.log(`Functional candidates found: ${candidates.length}`)
  console.log(`Philosophical profiles extracted: ${philosophicalProfiles.length}`)
  console.log(`Log file: ${LOG_FILE}`)
}

main().catch((err) => {
  log('error', 'Fatal error', { error: err.message, stack: err.stack })
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2))
  process.exit(1)
})
