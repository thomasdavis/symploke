# Glossary Alignment Weave Type

## Overview

The Glossary Alignment weave type discovers connections between repositories through AI-powered profile comparison. It extracts a "glossary" (hybrid profile) from each repository's README and uses AI to generate a narrative comparison explaining their relationship.

**Key Features:**
- **README-based**: Extracts profile from README only (no code parsing needed)
- **Hybrid dimensions**: Mix of practical (features, tech stack) and philosophical (values, enemies)
- **AI comparison**: Narrative-based comparison with synergies and tensions

---

## What is a Glossary?

A Glossary is a repository's **profile** - both what it does (practical) and what it believes (philosophical). It captures information that code embeddings cannot find.

### Glossary Schema

```typescript
interface RepoGlossaryData {
  // PRACTICAL
  purpose: string              // One-sentence: what problem does this solve?
  features: string[]           // Key capabilities/features
  techStack: string[]          // Languages, frameworks, tools mentioned
  targetUsers: string[]        // Who is this for?
  kpis: string[]               // Metrics, measures, what success looks like
  roadmap: string[]            // Future plans, TODOs, aspirations

  // PHILOSOPHICAL
  values: string[]             // Core beliefs, virtues, what it considers "good"
  enemies: string[]            // What it fights against, defines itself against
  aesthetic: string            // Design philosophy, code style preferences

  // META
  confidence: number           // 0-1, based on README quality
  summary: string              // 2-3 sentence overall summary
}
```

---

## How Glossary Extraction Works

### Input: README Only

The extractor uses only the README file:
1. Finds README.md (or variants like readme.md, Readme.md)
2. Truncates to 8000 characters if too long
3. Sends to GPT-4o for structured extraction

### Minimum Content Threshold

If README is missing or < 100 characters, the repository is marked as `UNGLOSSABLE`:

> "README is too short (X chars). Cannot extract meaningful profile."

### CLI Commands

```bash
# Extract glossary for a single repo
pnpm engine extract-glossary --repo-id <id>

# Extract glossaries for all repos in a plexus
pnpm engine extract-glossary --plexus-id <id>

# Force re-extraction (even if glossary exists)
pnpm engine extract-glossary --repo-id <id> --force

# View a glossary
pnpm engine glossary --repo-id <id>
```

### Glossary Statuses

- `PENDING` - Not yet extracted
- `EXTRACTING` - Currently being processed
- `COMPLETE` - Successfully extracted
- `UNGLOSSABLE` - README missing or too short
- `FAILED` - Extraction error

---

## AI-Powered Comparison

The system uses AI to compare glossaries and generate narrative insights.

### Comparison Process

1. Load both repositories' glossaries
2. Build a comparison prompt with both profiles
3. Send to GPT-4o for structured analysis
4. Extract narrative, score, and insights

### Comparison Output

```typescript
interface GlossaryComparison {
  narrative: string           // 2-3 sentences explaining relationship
  overallScore: number        // 0-1 alignment score
  complementary: boolean      // Do they complement each other?
  competing: boolean          // Are they in the same space?
  synergies: string[]         // Specific integration opportunities
  tensions: string[]          // Potential conflicts
}
```

### Score Guidelines

- **0.0-0.2**: Completely unrelated domains
- **0.2-0.4**: Some philosophical overlap but different focus
- **0.4-0.6**: Meaningful connection, potential for integration
- **0.6-0.8**: Strong alignment, natural partners
- **0.8-1.0**: Nearly identical purpose/values

### Threshold

A weave is created if `overallScore >= 0.25` (25%).

---

## Weave Metadata

Glossary alignment weaves store rich metadata:

```typescript
interface GlossaryAlignmentMetadata {
  // AI-generated narrative
  narrative: string
  overallScore: number
  complementary: boolean
  competing: boolean
  synergies: string[]
  tensions: string[]

  // Source info
  sourceGlossaryId: string
  targetGlossaryId: string
  sourceSummary: string
  targetSummary: string
}
```

---

## Title Generation

Weave titles are generated based on relationship type:

1. **Complementary + synergies**: `"blocks + carmack: Shared validation"`
2. **Competing**: `"blocks & carmack: Same arena"`
3. **Complementary (no specific synergy)**: `"blocks & carmack: Complementary tools"`
4. **Default**: `"blocks & carmack: Kindred spirits"`

---

## Example Output

**blocks glossary:**
```json
{
  "purpose": "Language-agnostic schema validation and semantic code blocks",
  "features": ["Schema validation", "Code block extraction", "Multi-language support"],
  "techStack": ["TypeScript", "Zod", "Tree-sitter"],
  "targetUsers": ["Developers building code analysis tools"],
  "kpis": ["Validation accuracy", "Parse performance"],
  "roadmap": ["More language support", "Better error messages"],
  "values": ["Correctness", "Reliability", "Type safety"],
  "enemies": ["Runtime errors", "Unvalidated input", "Magic strings"],
  "aesthetic": "Strict, explicit, defense-in-depth",
  "confidence": 0.85,
  "summary": "A validation-first toolkit for working with code that refuses to trust anything."
}
```

**Comparison result:**
```
Title: blocks + carmack: Shared validation
Score: 52%

Narrative: blocks and carmack share a deep commitment to correctness and catching
errors early. While blocks focuses on schema validation at the boundary, carmack
applies similar rigor to code analysis. They could integrate: blocks validating
inputs before carmack analyzes them.

Complementary: true
Competing: false

Synergies:
- blocks can validate inputs before carmack processes them
- Shared type definitions could reduce duplication
- Both benefit from strict TypeScript usage

Tensions:
- blocks is strict about types while carmack is more exploratory
```

---

## Files

- `apps/engine/src/weave/glossary.ts` - Glossary extraction
- `apps/engine/src/weave/types/glossary-alignment.ts` - AI comparison
- `apps/engine/src/weave/types/base.ts` - `GlossaryAlignmentMetadata` type
- `apps/web/.../glossary/GlossaryDetailClient.tsx` - Profile UI
- `apps/web/.../weaves/[weaveId]/WeaveDetailClient.tsx` - Narrative comparison UI

---

## When to Use Glossary Alignment

Use glossary alignment when you want to find:

1. **Complementary tools** - Repos that work well together
2. **Shared values** - Repos with similar beliefs about good software
3. **Shared enemies** - Repos fighting the same problems
4. **Integration opportunities** - Specific ways repos could integrate

This is especially useful for:
- Finding repos to contribute to (value alignment = easier onboarding)
- Identifying potential integrations
- Understanding if repos would work well together
