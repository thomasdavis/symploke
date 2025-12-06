/**
 * Weave Discovery Ontology
 *
 * A shared conceptual vocabulary for describing what repositories DO,
 * not what their code LOOKS LIKE.
 *
 * This ontology enables capability-need matching between repositories.
 */

/**
 * What a repository CAN DO
 */
export const CAPABILITIES = [
  'analyzes', // Inspects/examines other artifacts
  'generates', // Creates new artifacts
  'transforms', // Converts artifacts from one form to another
  'validates', // Checks correctness/conformance
  'orchestrates', // Coordinates multiple tools/processes
  'visualizes', // Renders visual representations
  'aggregates', // Collects/combines multiple sources
  'exposes_api', // Provides programmatic interface
  'wraps', // Wraps other tools/services
  'templates', // Provides templates/scaffolding
  'enforces_schema', // Ensures structure conformance
  'detects_drift', // Finds divergence in patterns
  'builds', // Compiles/packages
  'deploys', // Ships to production
  'tests', // Verifies behavior
  'documents', // Creates documentation
  'monitors', // Observes runtime behavior
  'optimizes', // Improves performance
  'secures', // Adds security measures
  'migrates', // Moves between versions/systems
] as const

export type Capability = (typeof CAPABILITIES)[number]

/**
 * What artifacts a repository PRODUCES or CONSUMES
 */
export const ARTIFACTS = [
  'components', // UI or logical components
  'tools', // Callable tool definitions
  'schemas', // Data structure definitions
  'documents', // Markdown, docs, content
  'configurations', // Config files
  'embeddings', // Vector representations
  'events', // Event streams/messages
  'workflows', // Process definitions
  'source_code', // Raw code files
  'packages', // Distributable bundles
  'apis', // API definitions
  'reports', // Analysis outputs
  'templates', // Scaffolding patterns
  'types', // Type definitions
  'tests', // Test suites
  'data', // Raw data files
  'models', // ML models
  'prompts', // LLM prompts
] as const

export type Artifact = (typeof ARTIFACTS)[number]

/**
 * What domain/problem-space a repository operates in
 */
export const DOMAINS = [
  'llm_tooling', // LLM/AI tool development
  'component_systems', // Component libraries/ecosystems
  'drift_analysis', // Consistency/divergence detection
  'ci_cd', // Build/deploy pipelines
  'web_apps', // Web applications
  'cli_tools', // Command-line interfaces
  'data_processing', // Data pipelines
  'content_generation', // Content creation
  'metadata_extraction', // Parsing/extracting info
  'testing', // Test frameworks
  'documentation', // Doc generation
  'infrastructure', // Cloud/infra management
  'developer_tools', // Dev productivity
  'ui_frameworks', // Frontend frameworks
  'api_services', // Backend services
  'monorepo_tooling', // Multi-package management
] as const

export type Domain = (typeof DOMAINS)[number]

/**
 * What role a repository plays in a workflow
 */
export const ROLES = [
  'producer', // Creates artifacts for others
  'consumer', // Uses artifacts from others
  'analyzer', // Examines other repos/artifacts
  'validator', // Checks other repos/artifacts
  'orchestrator', // Coordinates other repos
  'transformer', // Converts between formats
  'renderer', // Produces visual output
  'compiler', // Builds distributable artifacts
  'library', // Provides reusable code
  'application', // End-user facing app
  'framework', // Foundational structure
  'plugin', // Extends other systems
  'utility', // Helper functions
] as const

export type Role = (typeof ROLES)[number]

/**
 * Types of relationships between repositories
 */
export const RELATIONSHIP_TYPES = [
  'can_analyze', // A can analyze B's artifacts
  'can_consume', // A can use B's outputs
  'can_enhance', // A can improve B's capabilities
  'can_validate', // A can check B's outputs
  'can_orchestrate', // A can coordinate B
  'complements', // A and B serve related purposes
  'shares_patterns', // A and B use similar patterns
  'could_depend_on', // A could benefit from depending on B
  'could_generate_for', // A could generate artifacts for B
] as const

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

/**
 * A repository's conceptual profile
 * This is what we extract from README + package.json
 */
export interface RepoProfile {
  repoId: string
  name: string
  fullName: string

  // Human-readable purpose
  purpose: string

  // Ontology mappings
  capabilities: Capability[]
  artifacts: {
    produces: Artifact[]
    consumes: Artifact[]
  }
  domains: Domain[]
  roles: Role[]

  // Free-form extracted info
  keywords: string[]
  problemsSolved: string[]
  targetUsers: string[]

  // Raw source data
  readmeExcerpt: string
  packageDescription: string

  // Confidence in extraction
  confidence: number
}

/**
 * A potential relationship between two repos
 */
export interface RelationshipCandidate {
  sourceRepo: RepoProfile
  targetRepo: RepoProfile
  relationshipType: RelationshipType
  hypothesis: string
  matchedCapabilities: string[]
  matchedArtifacts: string[]
  confidence: number
}

/**
 * Matching rules for capability-need relationships
 */
export const RELATIONSHIP_RULES: Array<{
  name: string
  description: string
  match: (source: RepoProfile, target: RepoProfile) => boolean
  relationshipType: RelationshipType
}> = [
  {
    name: 'analyzer_to_analyzable',
    description: 'Analyzer can analyze artifacts produced by target',
    match: (source, target) =>
      source.capabilities.includes('analyzes') &&
      source.roles.includes('analyzer') &&
      target.artifacts.produces.some((a) =>
        ['components', 'tools', 'schemas', 'source_code'].includes(a),
      ),
    relationshipType: 'can_analyze',
  },
  {
    name: 'drift_detector_to_patterns',
    description: 'Drift detector can analyze repeated patterns',
    match: (source, target) =>
      source.capabilities.includes('detects_drift') &&
      target.artifacts.produces.some((a) => ['components', 'tools', 'templates'].includes(a)) &&
      target.roles.includes('producer'),
    relationshipType: 'can_analyze',
  },
  {
    name: 'validator_to_schemas',
    description: 'Validator can check schema-producing repos',
    match: (source, target) =>
      source.capabilities.includes('validates') && target.artifacts.produces.includes('schemas'),
    relationshipType: 'can_validate',
  },
  {
    name: 'generator_to_consumer',
    description: 'Generator can create artifacts for consumer',
    match: (source, target) =>
      source.capabilities.includes('generates') &&
      source.artifacts.produces.some((a) => target.artifacts.consumes.includes(a)),
    relationshipType: 'could_generate_for',
  },
  {
    name: 'library_to_application',
    description: 'Library could be used by application',
    match: (source, target) =>
      source.roles.includes('library') &&
      target.roles.includes('application') &&
      source.domains.some((d) => target.domains.includes(d)),
    relationshipType: 'could_depend_on',
  },
  {
    name: 'shared_domain',
    description: 'Repos in same domain with complementary roles',
    match: (source, target) =>
      source.domains.some((d) => target.domains.includes(d)) &&
      source.roles.some((r) => !target.roles.includes(r)),
    relationshipType: 'complements',
  },
  {
    name: 'orchestrator_to_tool',
    description: 'Orchestrator can coordinate tool producers',
    match: (source, target) =>
      source.capabilities.includes('orchestrates') && target.artifacts.produces.includes('tools'),
    relationshipType: 'can_orchestrate',
  },
  {
    name: 'transformer_chain',
    description: 'Transformer output matches another transformer input',
    match: (source, target) =>
      source.capabilities.includes('transforms') &&
      target.capabilities.includes('transforms') &&
      source.artifacts.produces.some((a) => target.artifacts.consumes.includes(a)),
    relationshipType: 'can_consume',
  },
]
