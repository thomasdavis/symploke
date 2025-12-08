# Comprehensive Brainstorm: Making Weaves Deliver Real Value

## Executive Summary

Symploke is a platform that helps teams discover meaningful connections between their projects. Currently, it produces generic similarity scores that nobody can act on. We need to transform it into a system that surfaces **specific, actionable opportunities** that make users say "I should do this TODAY."

---

## Part 1: What Symploke Is Trying to Do

### The Vision

Imagine a world where:
- An indie hacker building a resume parser discovers that someone in their network built a JSON schema validator that would save them weeks of work
- A startup realizes that two of their internal tools could share an authentication system instead of building it twice
- An open source maintainer finds a contributor whose project demonstrates exactly the skills they need for their "help wanted" issue
- Two developers working on similar problems find each other and decide to merge efforts instead of duplicating work

**Symploke wants to be the system that makes these discoveries automatic.**

### The Core Concept: Plexuses and Weaves

- **Plexus**: A group of related projects/people (a team, a community, an organization)
- **Weave**: A discovered connection between two projects that represents potential value
- **Glossary**: A structured profile extracted from a repository that enables comparison

### Current User Journey

1. User creates a Plexus (e.g., "My Indie Hacker Friends")
2. Members add their GitHub repositories
3. System extracts a "Glossary" from each repo's README
4. System compares all repo pairs using AI
5. System shows "Weaves" - connections between repos with similarity scores
6. User... does what exactly? (This is the problem)

---

## Part 2: How the Current System Works

### Step 1: Glossary Extraction

We read the README and use GPT-4o to extract a structured profile:

```typescript
interface RepoGlossary {
  // PRACTICAL
  purpose: string           // One-sentence: what problem does this solve?
  features: string[]        // Key capabilities/features
  techStack: string[]       // Languages, frameworks, tools mentioned
  targetUsers: string[]     // Who is this for?
  kpis: string[]            // Metrics, measures, what success looks like
  roadmap: string[]         // Future plans, TODOs, aspirations

  // PHILOSOPHICAL
  values: string[]          // Core beliefs, what it considers "good"
  enemies: string[]         // What it fights against
  aesthetic: string         // Design philosophy, code style preferences

  // META
  confidence: number        // 0-1, based on README quality
  summary: string           // 2-3 sentence overall summary
}
```

**Current Extraction Prompt:**
```
You are analyzing a software repository to create a comprehensive profile.
Extract both PRACTICAL information (what it does, who uses it) and
PHILOSOPHICAL stance (what it values, what it fights against).
```

### Step 2: Pairwise Comparison

For each pair of repos, we send both glossaries to GPT-4o:

```typescript
interface GlossaryComparison {
  narrative: string         // 2-3 sentences explaining relationship
  overallScore: number      // 0-1 alignment score
  complementary: boolean    // Do they complement each other?
  competing: boolean        // Are they in the same space?
  synergies: string[]       // Specific integration opportunities
  tensions: string[]        // Potential conflicts
}
```

**Current Comparison Prompt:**
```
Compare these two repository profiles and assess their alignment.
Consider how they might complement each other or create tensions.
Score from 0 to 1 where 1 means highly aligned/compatible.
```

### Step 3: Display Results

We show a list of weaves sorted by score, with the narrative and synergies/tensions.

---

## Part 3: The Problem - Why Current Output is Useless

### Real Examples of Current Output

**Example 1: tpmjs + symploke (70% match)**
```
"Both repositories use a monorepo approach with strict architecture and
module boundaries. They focus on leveraging AI technologies, though TPMJS
is more about developing AI agents and tools, while Symploke enhances team
collaboration by identifying project connections. Their shared values include
a focus on clear code and type safety, but they operate in related albeit
distinct areas within the development workflow."

Synergies:
- Both use Turborepo for monorepo management
- Both emphasize TypeScript and type safety
- Both have strict module boundary enforcement

Tensions:
- Different primary purposes (AI tools vs team collaboration)
```

**What's wrong with this:**
- "They both use monorepos" - So what? Thousands of projects use monorepos
- "They both care about type safety" - Every TypeScript project does
- "They're related but distinct" - This is meaningless
- The synergies are observations, not opportunities
- There's nothing I can DO with this information

**Example 2: evolving-ai + tpmjs (40% match)**
```
"Both repositories focus on AI agent development but from different angles.
'Evolving-ai' centers on autonomous improvement and dynamic capabilities,
while 'tpmjs' emphasizes structured development with type safety in a monorepo
architecture. They share an emphasis on code quality and structured practices."

Synergies:
- Both focus on AI development
- Both value code quality
- Both have structured approaches

Tensions:
- evolving-ai values autonomy, tpmjs values explicit boundaries
```

**What's wrong with this:**
- It describes differences, not opportunities
- "Both focus on AI development" is too vague to act on
- No specific integration path suggested
- No concrete value proposition

**Example 3: blocks + carmack (50% match)**
```
"Both repositories share a deep commitment to correctness and catching
errors early. While blocks focuses on schema validation at the boundary,
carmack applies similar rigor to code analysis."

Synergies:
- Shared focus on validation
- Both catch errors early
- Both use TypeScript

Tensions:
- Different validation targets (data vs code)
```

**What's wrong with this:**
- Closest to useful but still vague
- "blocks could validate carmack's inputs" - but HOW? What inputs?
- No specific API or integration point identified
- No example of what this would look like in practice

### Root Causes of the Problem

1. **We're extracting the wrong things**: README philosophies don't reveal integration points
2. **We're asking the wrong question**: "How similar are these?" instead of "What could they build together?"
3. **We're scoring the wrong metric**: Similarity ≠ Actionability
4. **We're not being specific enough**: "Could integrate" vs "Here's the API endpoint and here's the consumer"
5. **We're not grounding in reality**: No links to actual code, issues, or existing patterns

---

## Part 4: What "Actionable" Actually Means

### The Actionability Test

A weave is actionable if a user could:
1. **Understand it in 30 seconds**: Clear what the opportunity is
2. **Validate it in 5 minutes**: Check if it's real by looking at the code
3. **Start working on it today**: Know the first concrete step
4. **Estimate the value**: Understand what they'd gain

### Spectrum of Actionability

**Level 0 - Useless (Current State)**
```
"Both projects use TypeScript and value code quality"
```
Action: None. This is a observation, not an opportunity.

**Level 1 - Directional**
```
"Project A's validation library could help Project B's input handling"
```
Action: Vague. Would need to investigate what "help" means.

**Level 2 - Specific**
```
"Project A exposes a validateSchema() function that could validate
Project B's user input JSON before processing"
```
Action: Clear integration point, but need to figure out how to connect them.

**Level 3 - Concrete (Goal State)**
```
"Project A's @blocks/validate package exports validateSchema(schema, data).
Project B currently does manual validation in src/handlers/user.ts:45-67.
Replacing that with validateSchema() would:
- Reduce B's code by ~20 lines
- Add type-safe error messages B currently lacks
- Match the pattern used in [similar successful integration]

To implement:
1. npm install @blocks/validate
2. Import in user.ts
3. Replace lines 45-67 with validateSchema(UserSchema, req.body)

Estimated effort: 30 minutes
Estimated value: Removes a class of runtime errors B currently has
```
Action: Could literally start implementing this right now.

---

## Part 5: Types of Actionable Weaves

### Category 1: Dependency Opportunities

**"A could use B as a library"**

Signals to detect:
- A is reinventing something B already solved
- A has TODO comments about functionality B provides
- A's dependencies overlap with B's exports
- A has open issues B's features would address

Example output:
```
DEPENDENCY OPPORTUNITY: resume → jsonresume-schema

resume/src/parser.ts manually validates resume JSON structure (lines 23-89).
jsonresume-schema exports validateResume() that does exactly this.

Evidence:
- resume's validation code matches jsonresume-schema's approach
- resume has issue #12: "Add better validation error messages"
- jsonresume-schema already has detailed error messages

Action: Replace manual validation with jsonresume-schema
Effort: ~1 hour (swap validation logic)
Value: Better errors, maintained by jsonresume community, less code to maintain
```

### Category 2: API Consumer/Provider

**"A exposes an API that B could consume"**

Signals to detect:
- A has REST/GraphQL endpoints
- B makes HTTP calls to similar services
- A's output format matches B's input needs
- B currently uses a less suitable alternative

Example output:
```
API INTEGRATION: evolving-ai → tpmjs

evolving-ai exposes POST /analyze endpoint that returns code quality scores.
tpmjs runs ESLint but has no AI-powered analysis.

Evidence:
- evolving-ai/src/api/analyze.ts exports code analysis
- tpmjs/tools/lint/index.ts only uses static analysis
- evolving-ai's analysis catches issues ESLint misses (see their README examples)

Action: Add evolving-ai analysis as optional tpmjs lint step
Effort: ~2 hours (add HTTP call, parse response, integrate with lint output)
Value: AI-powered code review for tpmjs users
```

### Category 3: Shared Infrastructure

**"A and B both need X, could share the work"**

Signals to detect:
- Both repos have similar utility functions
- Both have the same dev dependencies
- Both have similar CI/CD setups
- Both are solving the same infrastructure problem

Example output:
```
SHARED INFRASTRUCTURE: tpmjs + symploke

Both repos have nearly identical Turborepo configurations:
- tpmjs/turbo.json (47 lines)
- symploke/turbo.json (52 lines)
- 80% overlap in pipeline definitions

Both also have similar:
- ESLint configs (same rules, different files)
- TypeScript configs (same strict settings)
- GitHub Actions workflows (same patterns)

Action: Extract shared config to a package both can use
Effort: ~4 hours (create config package, update both repos)
Value:
- Maintenance in one place instead of two
- Improvements benefit both projects
- Could publish for others with similar setups
```

### Category 4: Contribution Match

**"A's maintainer has skills B needs"**

Signals to detect:
- A demonstrates expertise B's issues require
- A has solved problems B is struggling with
- A's tech stack matches B's "help wanted" issues
- A's contributor could meaningfully help B

Example output:
```
CONTRIBUTION MATCH: carmack maintainer → blocks

blocks has issue #34: "Need formal verification for schema validation"
carmack is literally a formal verification tool for TypeScript.

Evidence:
- carmack/src/verifier.ts implements the exact pattern blocks needs
- carmack's maintainer has formal methods expertise (based on repo)
- blocks' issue has been open 3 months with no progress

Action: carmack maintainer could contribute verification to blocks
Effort: Medium (would need to understand blocks' codebase)
Value:
- blocks gets formal verification capability
- carmack maintainer gets a real-world use case
- Both projects become more valuable together
```

### Category 5: Data Pipeline

**"A produces data B could consume"**

Signals to detect:
- A outputs structured data (JSON, CSV, etc.)
- B needs input data of similar structure
- A's output schema matches B's input schema
- There's a natural flow from A to B

Example output:
```
DATA PIPELINE: jsonresume → symploke

jsonresume produces structured developer profiles:
{
  skills: ["TypeScript", "React", ...],
  projects: [{ name, description, url, keywords }],
  work: [{ company, position, highlights }]
}

symploke currently only knows about repos, not the people behind them.

Action: Import jsonresume profiles to enrich plexus member data
Effort: ~3 hours (add import, update glossary extraction)
Value:
- Weaves could match people to projects, not just projects to projects
- "Alex knows GraphQL, Project B needs GraphQL help"
- Much more valuable connections
```

### Category 6: Pattern Replication

**"A solved a problem B could solve the same way"**

Signals to detect:
- A and B have similar goals
- A has a working solution
- B is earlier in development
- A's approach would work for B

Example output:
```
PATTERN REPLICATION: symploke's auth → tpmjs

symploke implements NextAuth with GitHub OAuth:
- symploke/src/auth.ts - clean setup
- symploke/src/middleware.ts - route protection
- Works with their Turborepo structure

tpmjs has TODO: "Add authentication for tools dashboard"

Action: Copy symploke's auth pattern to tpmjs
Effort: ~2 hours (copy files, adjust config)
Value: Proven pattern, no need to figure out NextAuth + Turborepo integration
```

### Category 7: Merge Candidates

**"A and B are solving the same problem, should consider merging"**

Signals to detect:
- Very similar purpose statements
- Overlapping feature sets
- Same target users
- Neither has critical mass alone

Example output:
```
MERGE CANDIDATE: resume + jsonresume.org

Both repos:
- Parse and validate resume JSON
- Target the same users (developers wanting structured resumes)
- Have similar feature sets
- Are maintained by solo developers

Differences:
- resume focuses on parsing various formats
- jsonresume.org focuses on the schema standard

Action: Consider merging efforts
Value:
- Combined maintenance effort
- Unified community
- Stronger project with both capabilities
```

---

## Part 6: Better Extraction - What We Should Capture

### Current Extraction (Insufficient)

```typescript
// We only look at README
// We extract vague "values" and "enemies"
// We miss concrete integration points
```

### Proposed Extraction (Comprehensive)

```typescript
interface EnhancedGlossary {
  // === IDENTITY ===
  purpose: string
  problemsSolved: string[]          // Specific problems, not vague
  targetUsers: string[]
  maturityLevel: 'prototype' | 'beta' | 'production' | 'maintained'

  // === TECHNICAL SURFACE ===
  exports: {                        // What this repo provides to others
    packages: string[]              // npm packages published
    apis: ApiEndpoint[]             // REST/GraphQL endpoints
    components: string[]            // Reusable components
    utilities: string[]             // Helper functions
    schemas: string[]               // Data schemas/types
  }

  imports: {                        // What this repo consumes
    dependencies: string[]          // npm dependencies
    apis: string[]                  // External APIs called
    patterns: string[]              // Design patterns used
  }

  techStack: {
    languages: string[]
    frameworks: string[]
    databases: string[]
    infrastructure: string[]
  }

  // === INTEGRATION POINTS ===
  entryPoints: {                    // Where others could connect
    files: string[]                 // Main entry files
    functions: string[]             // Key exported functions
    types: string[]                 // Key exported types
  }

  extensionPoints: {                // Where this repo could be extended
    plugins: boolean
    hooks: boolean
    middleware: boolean
    customTypes: boolean
  }

  // === NEEDS & GAPS ===
  helpWanted: {                     // What this repo needs
    features: string[]              // From issues labeled "help wanted"
    skills: string[]                // Skills needed for open issues
    integrations: string[]          // Desired integrations mentioned
  }

  todos: string[]                   // TODO comments in code
  limitations: string[]             // Known limitations from README

  // === SOCIAL ===
  maintainers: {
    count: number
    activity: 'active' | 'sporadic' | 'dormant'
  }

  community: {
    stars: number
    forks: number
    contributors: number
    hasDiscussions: boolean
  }
}
```

### What Each Field Enables

| Field | Enables |
|-------|---------|
| `exports.packages` | "A could use B's package" |
| `exports.apis` | "A could call B's API" |
| `imports.dependencies` | "A and B share dependencies, could share config" |
| `helpWanted.features` | "B wants X, A already has X" |
| `helpWanted.skills` | "A's maintainer has skills B needs" |
| `todos` | "A has TODO that B solves" |
| `entryPoints` | Specific files to link to in suggestions |
| `extensionPoints` | "A could be extended with B's functionality" |

---

## Part 7: Better Comparison Prompts

### Current Prompt (Produces Generic Output)

```
Compare these two repository profiles and assess their alignment.
Consider how they might complement each other or create tensions.
Score from 0 to 1 where 1 means highly aligned/compatible.
```

**Why it fails:**
- Asks for "alignment" which produces similarity observations
- Doesn't ask for specific opportunities
- Doesn't require concrete actions
- No structure for actionable output

### Proposed Prompt (Produces Actionable Output)

```
You are analyzing two software repositories to find SPECIFIC, ACTIONABLE
opportunities for integration or collaboration.

DO NOT output generic observations like "both use TypeScript" or "both value
code quality." These are useless.

DO output specific opportunities that someone could act on TODAY.

For each opportunity you find, provide:

1. OPPORTUNITY TYPE: (dependency | api-integration | shared-infra |
   contribution-match | data-pipeline | pattern-replication | merge-candidate)

2. SPECIFIC OPPORTUNITY: One sentence describing exactly what could be done.

3. EVIDENCE: Cite specific files, functions, issues, or code that proves
   this opportunity exists. Use the format "repo/path/file.ts:line" or
   "repo#issue-number"

4. CONCRETE ACTION: Step-by-step what someone would do to act on this.
   - Be specific: "npm install X" not "add the dependency"
   - Reference actual files: "modify src/auth.ts" not "update the auth code"

5. EFFORT ESTIMATE: (trivial: <1hr | small: 1-4hr | medium: 1-2 days |
   large: 1+ week)

6. VALUE PROPOSITION: What specific benefit would result? Quantify if possible.
   - "Removes 50 lines of manual validation code"
   - "Adds error messages users have requested in issue #12"
   - "Reduces CI time by ~30% based on similar integrations"

7. SIMILAR PATTERN: Reference a similar successful integration if one exists.

SCORING:
- Score 0.0-0.3: No actionable opportunities found
- Score 0.3-0.5: One vague opportunity that needs investigation
- Score 0.5-0.7: One or more specific opportunities with clear actions
- Score 0.7-0.9: Multiple high-value opportunities with evidence
- Score 0.9-1.0: Obvious integration that should definitely happen

If you cannot find SPECIFIC opportunities with EVIDENCE, output a low score
and explain what additional information would be needed to find opportunities.

Repository A:
[ENHANCED GLOSSARY A]

Repository B:
[ENHANCED GLOSSARY B]
```

---

## Part 8: Technical Implementation Ideas

### Approach 1: Deep README + Code Analysis

**What we'd extract:**
- README content (current)
- Package.json dependencies and exports
- Main entry point file contents
- Type definitions / interfaces
- TODO comments across codebase
- Open issues (especially "help wanted")

**Pros:**
- Richer data for comparison
- Can reference specific code

**Cons:**
- More expensive (more LLM tokens)
- Slower extraction
- Code analysis is noisy

### Approach 2: Multi-Pass Analysis

**Pass 1: Quick Screening**
- Extract basic glossary from README
- Score potential for actionable weave (0-1)
- If < 0.3, skip detailed analysis

**Pass 2: Deep Dive (only for promising pairs)**
- Analyze relevant code files
- Look at issues and TODOs
- Find specific integration points

**Pass 3: Validation**
- Verify suggested integrations are technically feasible
- Check that referenced files/functions actually exist
- Ensure suggestions make sense

**Pros:**
- Cost-effective (deep analysis only when promising)
- Higher quality suggestions

**Cons:**
- More complex pipeline
- Might miss opportunities screened out in Pass 1

### Approach 3: Template-Based Opportunities

Define templates for common opportunity types:

```typescript
const opportunityTemplates = [
  {
    type: 'dependency',
    trigger: (a, b) => a.todos.some(todo =>
      b.exports.packages.some(pkg => todo.includes(pkg.capability))
    ),
    template: "{A} has TODO about {capability}. {B} exports {package} that provides this.",
    evidence: (a, b) => ({
      todoFile: a.todos[matchIndex].file,
      packageName: b.exports.packages[matchIndex].name,
    })
  },
  // ... more templates
]
```

**Pros:**
- Consistent, structured output
- Easier to validate
- Can show evidence systematically

**Cons:**
- Might miss novel opportunity types
- Templates need maintenance

### Approach 4: Comparative Code Search

Instead of comparing glossaries, compare actual code:

1. Embed code chunks from both repos
2. Find similar code patterns
3. Analyze what the similarity means:
   - Same problem, same solution → merge candidate
   - Same problem, different solution → learn from each other
   - A's solution to B's problem → A could contribute to B

**Pros:**
- Grounded in actual code, not README marketing
- Finds technical connections README doesn't mention

**Cons:**
- Expensive (lots of embeddings)
- Similar code doesn't always mean actionable opportunity

---

## Part 9: Success Metrics

### How We'd Know It's Working

**Metric 1: Action Rate**
- What % of weaves result in actual action (PR, issue, discussion)?
- Current estimate: <1%
- Target: >10%

**Metric 2: Time to Action**
- How long from seeing weave to taking action?
- Target: <1 hour for high-score weaves

**Metric 3: Specificity Score**
- Does the weave reference specific files/functions?
- Does it include concrete steps?
- Can action be taken without additional research?

**Metric 4: User Feedback**
- "This is useful" vs "This is obvious/useless"
- Would they pay for this?

**Metric 5: Value Delivered**
- PRs merged that came from weave suggestions
- Code shared between repos
- Collaborations started

---

## Part 10: Open Questions

### Data & Extraction

1. What's the minimum viable data we need to find actionable opportunities?
2. How do we extract "what this repo needs" vs "what it provides"?
3. Should we analyze code, or is README + package.json enough?
4. How do we handle repos with poor/missing READMEs?
5. How do we capture "help wanted" signals beyond GitHub labels?

### Comparison & Matching

6. Should we compare all pairs, or pre-filter based on some criteria?
7. How do we avoid false positives (looks like opportunity but isn't)?
8. How specific should suggestions be? Too specific might be wrong.
9. Should we verify suggestions are technically feasible before showing?
10. How do we handle different programming languages?

### Presentation & UX

11. How do we present opportunities so users actually act on them?
12. Should we notify users of new opportunities, or let them browse?
13. How do we handle opportunities that require both parties to agree?
14. Should we facilitate introductions between maintainers?
15. How do we track whether suggestions were acted upon?

### Scale & Cost

16. How do we keep LLM costs reasonable at scale?
17. Can we cache/reuse analysis when repos don't change?
18. How often should we re-analyze repos for new opportunities?
19. What's the right balance between depth and breadth of analysis?

### Validation

20. How do we test if our suggestions are good before showing users?
21. Can we use historical data (actual integrations) to train better matching?
22. How do we handle suggestions that are technically correct but impractical?

---

## Part 11: Similar Systems to Learn From

### GitHub's "Used By" / "Dependents"
- Shows which repos depend on a package
- Simple but actionable: "X uses your library"
- We could do: "Your library could solve X's problem"

### npm's "Similar Packages"
- Based on keyword/description similarity
- Often useless (too many similar packages)
- We should avoid this pattern

### Libraries.io
- Tracks dependencies across ecosystems
- Could inform "shared dependency" opportunities
- API available for dependency data

### Backstage (Spotify)
- Internal developer portal
- Tracks services and their relationships
- Good model for "what depends on what"

### SourceGraph
- Code search across repos
- Could find "same code pattern" opportunities
- Expensive but powerful

### OpenCollective / GitHub Sponsors
- Shows funding relationships
- Could inform "these projects have shared supporters"

---

## Part 12: What I Want Help With

Please help me think through:

1. **Is the core value proposition sound?**
   - Do developers actually want this?
   - What would make them pay for it?

2. **What data should we extract?**
   - Minimum viable extraction for actionable opportunities
   - How to balance depth vs cost

3. **How should we structure the comparison prompt?**
   - What makes LLMs produce specific vs generic output?
   - How to force evidence-based suggestions

4. **What opportunity types are most valuable?**
   - Which of my 7 categories matter most?
   - Are there types I'm missing?

5. **How do we validate suggestions?**
   - How to avoid technically wrong suggestions?
   - How to avoid impractical suggestions?

6. **What's the UX for acting on suggestions?**
   - How to present opportunities compellingly?
   - How to make action frictionless?

7. **How do we bootstrap this?**
   - Need good suggestions to attract users
   - Need users to validate suggestions
   - Chicken and egg problem

---

## Appendix A: Current System Code References

- Glossary extraction: `apps/engine/src/weave/glossary.ts`
- Glossary comparison: `apps/engine/src/weave/types/glossary-alignment.ts`
- Weave finder: `apps/engine/src/weave/finder.ts`
- UI components: `apps/web/src/app/plexus/[id]/weaves/`

## Appendix B: Example Repos in Test Plexus

| Repo | Description |
|------|-------------|
| tpmjs | Tool package manager for AI agents, Turborepo monorepo |
| symploke | This project - finds connections between repos |
| blocks | Semantic code block extraction and validation |
| carmack | Formal verification for TypeScript |
| evolving-ai | Self-improving AI agent with memory |
| resume | Resume parser and validator |
| jsonresume.org | JSON Resume schema standard |
| blah | Development toolkit and utilities |
| kaleistyleguide | Style guide generator |

## Appendix C: Actual Current Output Examples

[See Part 3 for real examples of current generic output]
