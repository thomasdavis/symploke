/**
 * Test fixtures for philosophical profiling
 *
 * Based on the Carmack-Blocks analysis in docs/PRAGMATIC-SEMANTIC-SPACE.md
 */

import type { PhilosophicalProfile } from '../philosophy'
import type { RepoProfile } from '../ontology'

/**
 * Expected philosophical profile for a Carmack-style codebase
 *
 * Characteristics:
 * - Radical simplicity, minimal abstraction
 * - Data-oriented design
 * - Explicit over implicit
 * - Fights complexity at the architecture level
 */
export const CARMACK_PHILOSOPHICAL_PROFILE: PhilosophicalProfile = {
  repoId: 'carmack-style-repo',
  epistemology: 'empirical',
  antagonist: 'complexity',
  cognitiveTransform: 'reveals',
  temporality: 'prevents',
  abstractionLevel: 'architecture',
  philosophyStatement:
    'Good code is honest code that does exactly what is needed and acknowledges when it has drifted from its purpose.',
  coreVirtue: 'honesty',
  confidence: 0.85,
}

/**
 * Expected philosophical profile for thomasdavis/blocks
 *
 * Characteristics:
 * - Drift analyzer for factored components
 * - Finds where copies diverged from patterns
 * - Detects inconsistency at the pattern level
 */
export const BLOCKS_PHILOSOPHICAL_PROFILE: PhilosophicalProfile = {
  repoId: 'blocks-repo',
  epistemology: 'pragmatic',
  antagonist: 'inconsistency',
  cognitiveTransform: 'reveals',
  temporality: 'detects',
  abstractionLevel: 'pattern',
  philosophyStatement:
    'Patterns matter. Consistency matters. Drift happens. Knowing about drift is the first step to deciding what to do about it.',
  coreVirtue: 'consistency',
  confidence: 0.8,
}

/**
 * Mock functional profile for Carmack-style repo
 */
export const CARMACK_REPO_PROFILE: RepoProfile = {
  repoId: 'carmack-style-repo',
  name: 'omega',
  fullName: 'DavinciDreams/omega',
  purpose: 'A minimal, data-oriented game engine focusing on explicit code over abstraction',
  capabilities: ['analyzes', 'optimizes', 'builds'],
  artifacts: {
    produces: ['source_code', 'tools'],
    consumes: ['source_code', 'configurations'],
  },
  domains: ['developer_tools'],
  roles: ['library', 'utility'],
  keywords: ['game-engine', 'data-oriented', 'performance', 'minimal'],
  problemsSolved: [
    'Eliminates unnecessary abstraction',
    'Makes performance characteristics explicit',
    'Reduces complexity in game code',
  ],
  targetUsers: ['game developers', 'performance-focused engineers'],
  readmeExcerpt:
    'A minimal game engine that prioritizes data-oriented design and explicit code over abstraction.',
  packageDescription: 'Minimal data-oriented game engine',
  confidence: 0.8,
}

/**
 * Mock functional profile for blocks repo
 */
export const BLOCKS_REPO_PROFILE: RepoProfile = {
  repoId: 'blocks-repo',
  name: 'blocks',
  fullName: 'thomasdavis/blocks',
  purpose:
    'Analyzes collections of similar components to detect drift from their intended patterns',
  capabilities: ['analyzes', 'detects_drift', 'validates'],
  artifacts: {
    produces: ['reports', 'data'],
    consumes: ['components', 'source_code', 'configurations'],
  },
  domains: ['drift_analysis', 'component_systems'],
  roles: ['analyzer', 'utility'],
  keywords: ['drift', 'consistency', 'components', 'patterns', 'analysis'],
  problemsSolved: [
    'Finds divergence in copied patterns',
    'Identifies inconsistencies across similar components',
    'Surfaces unintentional drift',
  ],
  targetUsers: ['frontend developers', 'component library maintainers'],
  readmeExcerpt:
    'A drift analyzer for factored/templated components that finds where they have diverged from their pattern.',
  packageDescription: 'Component drift analyzer',
  confidence: 0.85,
}

/**
 * Expected match: Carmack + Blocks should match on anti_entropy_alignment
 *
 * Both fight software entropy but at different scales and with different
 * specific targets (complexity vs inconsistency).
 */
export const EXPECTED_CARMACK_BLOCKS_MATCH = {
  matchType: 'anti_entropy_alignment',
  description: 'Both repos fight software entropy in different ways',
  expectedHypothesis:
    /Both fight software entropy.*complexity.*inconsistency.*comprehensive anti-entropy/,
}

/**
 * Additional test profiles for different philosophical stances
 */

// A linter/enforcer repo
export const ENFORCER_PHILOSOPHICAL_PROFILE: PhilosophicalProfile = {
  repoId: 'enforcer-repo',
  epistemology: 'formal',
  antagonist: 'inconsistency',
  cognitiveTransform: 'enforces',
  temporality: 'prevents',
  abstractionLevel: 'pattern',
  philosophyStatement: 'Rules exist to be followed. Deviation from established patterns is a bug.',
  coreVirtue: 'discipline',
  confidence: 0.9,
}

// A generator/scaffolder repo
export const GENERATOR_PHILOSOPHICAL_PROFILE: PhilosophicalProfile = {
  repoId: 'generator-repo',
  epistemology: 'constructive',
  antagonist: 'ambiguity',
  cognitiveTransform: 'generates',
  temporality: 'prevents',
  abstractionLevel: 'pattern',
  philosophyStatement: 'Start right the first time. Generated code is correct code.',
  coreVirtue: 'clarity',
  confidence: 0.85,
}

// A metrics/monitoring repo
export const METRICS_PHILOSOPHICAL_PROFILE: PhilosophicalProfile = {
  repoId: 'metrics-repo',
  epistemology: 'empirical',
  antagonist: 'entropy',
  cognitiveTransform: 'measures',
  temporality: 'detects',
  abstractionLevel: 'data',
  philosophyStatement:
    'What gets measured gets managed. Track everything to understand what is actually happening.',
  coreVirtue: 'truthfulness',
  confidence: 0.8,
}

/**
 * Expected rule firings for test profiles
 */
export const EXPECTED_RULE_FIRINGS = [
  // Carmack + Blocks -> anti_entropy_alignment (complexity + inconsistency)
  {
    source: 'carmack-style-repo',
    target: 'blocks-repo',
    rule: 'anti_entropy_alignment',
  },
  // Blocks + Enforcer -> reveal_enforce_pair (reveals + enforces)
  {
    source: 'blocks-repo',
    target: 'enforcer-repo',
    rule: 'reveal_enforce_pair',
  },
  // Blocks + Enforcer -> shared_antagonist (both fight inconsistency)
  {
    source: 'blocks-repo',
    target: 'enforcer-repo',
    rule: 'shared_antagonist',
  },
  // Carmack + Metrics -> epistemological_kin (both empirical)
  {
    source: 'carmack-style-repo',
    target: 'metrics-repo',
    rule: 'epistemological_kin',
  },
  // Carmack + Metrics -> anti_entropy_alignment (complexity + entropy)
  {
    source: 'carmack-style-repo',
    target: 'metrics-repo',
    rule: 'anti_entropy_alignment',
  },
]
