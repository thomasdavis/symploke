# Weave Discovery Algorithm: Problem Statement

## Executive Summary

We are building a system called **Symploke** that discovers meaningful connections ("weaves") between repositories within a user's portfolio. The goal is to surface actionable integration opportunities—places where one repository's capabilities could enhance, complement, or integrate with another repository's needs.

**Current State**: Our vector similarity approach finds textually similar code chunks but fails to identify semantic/functional relationships between repositories.

**Desired State**: An algorithm that discovers meaningful integration opportunities based on understanding what each repository *does*, what it *needs*, and how its capabilities could serve other repositories.

---

## The Core Problem

### What We're Trying to Solve

Given a collection of N repositories belonging to a user or organization, discover meaningful integration opportunities between them. These opportunities should be:

1. **Actionable** - A developer could act on the insight
2. **Non-obvious** - Not something the developer already knows
3. **Valuable** - Would provide real benefit if implemented
4. **Specific** - Points to concrete files/components, not vague "these repos are similar"

### Why This Matters

Developers accumulate repositories over time. Libraries get built, tools get created, patterns emerge—but the connections between them remain invisible. A developer might have:
- A utility library that could benefit their newer projects
- A pattern in one repo that solves a problem in another
- Components that could be factored out and shared
- Tools that could analyze or enhance other codebases

These connections exist but are locked in the developer's memory (if remembered at all).

---

## Current Approach and Its Failures

### What We Built

```
Vector Similarity (pgvector) → File Grouping → LLM Reasoning → Weave Creation
```

1. **Chunk Creation**: Split files into ~1500 character chunks with overlap
2. **Embedding**: Generate OpenAI embeddings for each chunk
3. **Similarity Search**: Find chunk pairs across repos with cosine similarity > 0.85
4. **File Aggregation**: Group by file pairs, require ≥3 matching chunks
5. **LLM Assessment**: Ask if file pairs represent integration opportunity

### What Happened

We ran this on 10 repositories including:
- `thomasdavis/blocks` - A tool for finding drift among factored components
- `tpmjs/tpmjs` - A collection of factored tool components

**Result**: 0 integration opportunities found.

**What it found instead**: Config file matches (postcss.config, .changeset, vitest.config) at 98-100% similarity. Boilerplate. Noise.

### Why It Failed

The algorithm found **textual similarity** but missed **semantic relationships**.

Consider the obvious integration that exists:
- `blocks` can analyze factored components for drift
- `tpmjs` contains factored components (tools)
- **Integration opportunity**: Use `blocks` to analyze `tpmjs` tools for consistency/drift

This relationship is invisible to vector similarity because:
1. The code implementing "drift detection" looks nothing like code implementing "tool definitions"
2. The relationship is **functional/purposive**, not textual
3. You need to understand what each repo *does*, not what its code *looks like*

---

## The Fundamental Insight

**Vector similarity operates on syntax. Integration opportunities exist at the level of semantics.**

The question isn't "which code chunks look similar?" but rather:

1. What does Repository A **provide** (capabilities, exports, tools, patterns)?
2. What does Repository B **need** (problems to solve, gaps, dependencies)?
3. Where do A's provisions match B's needs?

This is a **capability-need matching problem**, not a similarity problem.

---

## What We Have Available

### Data Already Collected

For each repository in a plexus:
- **Files**: Full content, paths, metadata
- **Chunks**: Text segments with embeddings (1536-dim vectors)
- **File metadata**: Language detection, size, modification times
- **Repository metadata**: Name, owner, description, full file tree

### Tools Available

1. **AI SDK (Vercel)**: `generateObject`, `generateText` with structured outputs
2. **pgvector**: Cosine similarity search at scale
3. **LLM Models**: GPT-4o, GPT-4o-mini, Claude for reasoning
4. **Prisma ORM**: Full database access to all entities

### Contextual Data We Could Extract But Don't Yet

- Package.json dependencies and exports
- README content (purpose statements)
- Export statements (what repo provides)
- Import statements (what repo needs)
- Function signatures and interfaces
- JSDoc/TSDoc comments
- Git history (evolution of code)
- GitHub topics and descriptions

---

## Proposed Solution Approaches

### Approach 1: Hierarchical Purpose Understanding

Instead of chunk-level similarity, work top-down:

```
Level 1: Repository Purpose
├── What does this repo do? (from README, package.json description)
├── What problem does it solve?
├── Who is it for?
└── What are its core capabilities?

Level 2: Module/Component Purpose
├── What does each major directory/module do?
├── What does it export?
├── What does it depend on?
└── How does it relate to repo purpose?

Level 3: File Purpose
├── What is this file's role?
├── What interfaces does it define?
├── What does it import/export?
└── Is it a boundary file (entry point, API)?

Level 4: Chunk Semantics (current approach)
└── Only used for drill-down after higher-level match
```

**LLM Prompt for Level 1**:
```
Given this repository's README and package.json, answer:
1. What is the primary purpose of this repository?
2. What capabilities does it provide?
3. What inputs does it require?
4. What outputs does it produce?
5. What problems does it solve?
6. What domain/category does it belong to?
```

Then match repositories where:
- A's capabilities align with B's needs
- A's outputs could be B's inputs
- A and B solve related problems in different ways

### Approach 2: Interface Matching

Analyze the **boundaries** of each repository:

1. **Exports Analysis**: What does this repo expose?
   - Exported functions and their signatures
   - Exported types/interfaces
   - CLI commands
   - API endpoints

2. **Imports Analysis**: What does this repo consume?
   - External dependencies
   - Expected input formats
   - Required configurations

3. **Match exports to imports**: Where could Repo A's exports satisfy Repo B's needs?

Example:
```typescript
// blocks exports
export function findDrift(components: Component[]): DriftReport

// tpmjs has
const tools: Tool[] = [...]  // Tool ≈ Component pattern

// Match: blocks.findDrift could analyze tpmjs.tools
```

### Approach 3: Pattern Recognition

Identify architectural patterns and match them:

1. **Factory Pattern**: Repos that produce similar structured outputs
2. **Consumer Pattern**: Repos that consume certain input types
3. **Utility Pattern**: Repos that provide helper functions
4. **Analysis Pattern**: Repos that analyze/inspect other code
5. **Generation Pattern**: Repos that generate code/content

Create a pattern taxonomy, classify each repo, then match:
- Analyzers → Analyzed (blocks → tpmjs)
- Generators → Consumers
- Utilities → Projects that could use them

### Approach 4: Dependency Graph Analysis

Build a graph of actual and potential dependencies:

1. **Actual Dependencies**: What does package.json already include?
2. **Potential Dependencies**: Based on functionality, what *could* be a dependency?
3. **Missing Connections**: Where are there gaps that another repo fills?

### Approach 5: Semantic Code Search

Instead of similarity, use semantic understanding:

1. Generate a "capability description" for each file/module using LLM
2. Store these descriptions as searchable text
3. Query: "Find code that could analyze React components" → matches blocks
4. Query: "Find collections of reusable components" → matches tpmjs tools
5. Match query results across repos

### Approach 6: Multi-Stage Pipeline

Combine approaches in a pipeline:

```
Stage 1: Repository Classification (LLM)
├── Purpose extraction from README/package.json
├── Capability categorization
├── Pattern identification
└── Output: Repo profiles with capabilities and needs

Stage 2: Candidate Generation (Rule-based + Vector)
├── Match capabilities to needs from Stage 1
├── Find repos in complementary categories
├── Use vector similarity only within matched categories
└── Output: Candidate pairs with hypothesized relationships

Stage 3: Evidence Gathering (Code Analysis)
├── For each candidate pair, find supporting evidence
├── Locate specific files/functions that could integrate
├── Verify interface compatibility
└── Output: Candidate pairs with evidence

Stage 4: Integration Assessment (LLM)
├── Given evidence, assess integration value
├── Generate specific integration description
├── Score confidence and value
└── Output: Final weave recommendations
```

### Approach 7: Recursive Decomposition

Use LLM to recursively understand codebases:

```
1. Summarize entire repository (high-level purpose)
2. Summarize each top-level directory
3. Identify "key files" (entry points, main logic)
4. Deep-analyze key files for capabilities
5. Build capability graph
6. Match capabilities across repos
```

This is expensive but thorough.

---

## The Specific Case: blocks ↔ tpmjs

Let's analyze why this integration should be discovered:

### thomasdavis/blocks
- **Purpose**: Detect drift in factored/templated components
- **Capability**: Analyze a set of components, find inconsistencies
- **Input**: Collection of components following similar patterns
- **Output**: Drift report showing where components diverge
- **Pattern**: Analyzer

### tpmjs/tpmjs
- **Purpose**: Collection of AI/LLM tools
- **Structure**: Multiple tool packages in packages/tools/*
- **Characteristic**: Each tool follows similar factory pattern
- **Pattern**: Factory outputs (factored components)

### The Connection
- blocks analyzes factored components
- tpmjs contains factored components (tools)
- **Integration**: Run blocks on tpmjs/packages/tools to find tool drift

### Why Vector Similarity Missed This

1. The word "drift" doesn't appear in tpmjs
2. The word "tool" doesn't appear in blocks
3. The code structures are completely different
4. The connection is PURPOSE-based, not CODE-based

### What Would Catch This

1. **README Analysis**: blocks says "analyze factored components", tpmjs shows "collection of tools following same pattern"
2. **Structure Analysis**: tpmjs has repeated similar directories (tools/*), blocks looks for repeated similar structures
3. **Pattern Matching**: blocks = Analyzer, tpmjs has Analyzable things

---

## Constraints and Considerations

### Performance
- We have 10 repos with ~6000 total chunks
- LLM calls are expensive; can't analyze everything
- Need efficient candidate generation before expensive analysis

### False Positives
- Current approach finds config files (false positives)
- New approach must avoid "both use React" level connections
- Must find ACTIONABLE integrations, not just similarities

### False Negatives
- Current approach misses real opportunities (false negatives)
- Better to surface more candidates for human review than miss good ones

### Explainability
- Users need to understand WHY a weave is suggested
- Must provide specific evidence (files, functions, patterns)
- Should suggest concrete next steps

### Scalability
- Algorithm should work for 10 repos or 100 repos
- O(n²) comparisons are acceptable at small scale
- May need smarter candidate generation at scale

---

## Questions to Explore

1. **Chunking Strategy**: Should we chunk differently? By function? By class? By export?

2. **Embedding Model**: Would code-specific embeddings (CodeBERT, StarCoder) work better?

3. **Multi-Modal**: Should we combine code embeddings with README embeddings with package.json analysis?

4. **Classification First**: Should we first classify repos into categories, then only compare within/across relevant categories?

5. **Active Learning**: As users accept/reject weave suggestions, can we learn what makes good integrations?

6. **Template Matching**: For factored components specifically, can we detect template patterns and match template-analyzers to template-collections?

7. **Recursive LLM**: Can an LLM recursively explore codebases with tool calls, building understanding incrementally?

8. **Graph Approaches**: Model repos as graphs (files=nodes, imports=edges) and find graph patterns?

---

## Success Criteria

A successful weave discovery algorithm would:

1. **Find blocks ↔ tpmjs**: Identify that blocks can analyze tpmjs tools
2. **Explain why**: "blocks detects drift in factored components; tpmjs/packages/tools contains 15 factored tool components following the same pattern"
3. **Point to evidence**: Specific files in each repo that demonstrate the connection
4. **Suggest action**: "Run blocks analysis on tpmjs/packages/tools directory to find inconsistencies across tool implementations"
5. **Avoid noise**: Not suggest that both repos use TypeScript as an "integration opportunity"

---

## Proposed Next Steps

1. **Implement README + package.json extraction**: Get high-level repo purpose
2. **Build repo profiler**: LLM-based capability/need extraction per repo
3. **Create capability taxonomy**: Categories of what repos do and need
4. **Implement candidate matching**: Rule-based matching of capabilities to needs
5. **Build evidence gatherer**: Find specific files supporting each candidate
6. **Create integration assessor**: LLM-based evaluation with structured output
7. **Test on known cases**: Verify blocks ↔ tpmjs is discovered
8. **Iterate**: Tune based on precision/recall

---

## Appendix: Current Schema

```prisma
model Weave {
  id          String    @id @default(cuid())
  plexusId    String
  sourceRepoId String
  targetRepoId String
  type        WeaveType @default(integration_opportunity)
  score       Float
  title       String
  description String
  metadata    Json?
  createdAt   DateTime  @default(now())
  // ... relations
}

model WeaveDiscoveryRun {
  id          String   @id @default(cuid())
  plexusId    String
  status      String   @default("running")
  config      Json?
  logs        WeaveDiscoveryLog[]
  createdAt   DateTime @default(now())
  completedAt DateTime?
}
```

---

## Appendix: Existing Weave Types

Currently we only have `integration_opportunity`. Future types could include:

- `shared_pattern`: Same pattern used in multiple repos, could be factored
- `dependency_candidate`: Repo A could/should depend on Repo B
- `code_duplication`: Significant code copied between repos
- `api_consumer`: Repo A could consume Repo B's API
- `complementary_tools`: Tools that work together
- `drift_detected`: Factored components have diverged

---

## Appendix: Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Current weave finder | `apps/engine/src/weave/finder.ts` |
| Integration opportunity type | `apps/engine/src/weave/types/integration-opportunity.ts` |
| Similarity queries | `apps/engine/src/weave/similarity.ts` |
| Base weave types | `apps/engine/src/weave/types/base.ts` |
| CLI commands | `apps/engine/src/cli/index.ts` |
| AI completion | `packages/ai/src/completion.ts` |
| Database schema | `packages/db/prisma/schema.prisma` |

---

*Document generated for collaborative problem-solving. Share with other AI models or developers for feedback on approaches.*
