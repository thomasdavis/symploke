# Pragmatic Semantic Space: Carmack, Blocks, and the Philosophy of Code Relationships

## Purpose

This document explores the philosophical connection between John Carmack's programming philosophy and the `thomasdavis/blocks` repository. The goal is to extract insights that can improve Symploke's weave discovery system - specifically, to help an AI understand connections that humans intuitively recognize but struggle to articulate.

---

## Part 1: The Carmack Philosophy

### Core Tenets

John Carmack operates in what we might call a **pragmatic semantic space** - a mode of thinking that combines:

1. **Radical Simplicity**: The best code is code that doesn't exist. Every abstraction has a cost.
2. **Data-Oriented Design**: Think about what data transformations you need, not what objects you have.
3. **Explicit over Implicit**: Make the machine's work visible. Hidden complexity is technical debt.
4. **Empirical Validation**: Theory serves practice. Profile, measure, verify.
5. **Honest Assessment**: If something is ugly or wrong, acknowledge it. Don't paper over problems.

### The Carmack Pattern

Carmack's signature approach can be summarized as:

```
Given a complex system, ask:
1. What is the actual data being transformed?
2. What invariants must hold?
3. Where has complexity crept in that doesn't serve the transformation?
4. What would the "obvious" solution look like to someone with no context?
```

This is fundamentally about **drift detection** - but at the conceptual level. Carmack constantly asks: "How far has this code drifted from its essential purpose?"

---

## Part 2: The Blocks Philosophy

### What Blocks Does

`thomasdavis/blocks` is a drift analyzer for factored/templated components. It examines collections of similar things and finds where they've diverged from their pattern.

### Why This Matters

Most codebases evolve through accretion. A pattern is established, then copied, then modified. Over time:
- Copy #47 has a bug fix that copies #1-46 don't have
- Copy #23 added a feature that should be in all copies
- Copy #12 has a "temporary" workaround that became permanent

Blocks surfaces these inconsistencies - the **drift** from the intended pattern.

### The Blocks Pattern

```
Given a collection of similar artifacts, ask:
1. What is the implicit template they all derive from?
2. Where has each artifact diverged from this template?
3. Which divergences are intentional (features) vs accidental (drift)?
4. What would consistency look like?
```

---

## Part 3: The Philosophical Connection

### Shared Pragmatic Semantic Space

Carmack and Blocks operate in the same conceptual territory:

| Aspect | Carmack | Blocks |
|--------|---------|--------|
| Core Question | "Has this code drifted from its purpose?" | "Has this component drifted from its pattern?" |
| Method | Mental model of essential complexity | Automated comparison to implicit template |
| Enemy | Accidental complexity, cargo culting | Inconsistency, unintentional divergence |
| Goal | Code that does exactly what's needed | Components that follow their intended pattern |
| Worldview | Reality-first, data-oriented | Pattern-first, consistency-oriented |

### The Deeper Connection: Anti-Entropy

Both are fighting **software entropy** - the tendency of code to become increasingly disordered over time.

Carmack fights entropy at the **design level**: refusing to add abstractions that don't pay their weight, questioning every layer of indirection.

Blocks fights entropy at the **implementation level**: detecting when copies of a pattern have diverged in ways that weren't intended.

They're the same battle at different scales:
- Macro: Is the architecture still serving its purpose? (Carmack)
- Micro: Are the instances still following the pattern? (Blocks)

### Schizosophy: The Split Perspective

There's a philosophical concept here that might be called **schizosophy** - the productive tension of holding multiple perspectives simultaneously:

1. **The Platonic View**: There exists an ideal form (the pattern, the essential algorithm)
2. **The Pragmatic View**: Reality is messy, and implementations drift
3. **The Therapeutic View**: Drift isn't evil - but unconscious drift is dangerous

Carmack embodies this in his practice: he holds the ideal in mind while being brutally honest about the messy reality, then works to close the gap without pretending it doesn't exist.

Blocks embodies this in its function: it assumes a pattern exists, measures drift from that pattern, and surfaces the gap - without judgment about whether drift is good or bad.

---

## Part 4: Implications for Weave Discovery

### Current Limitation

The current weave system looks for:
- **Textual similarity**: Code that looks the same (embeddings)
- **Functional relationships**: Analyzer-to-analyzable, producer-to-consumer (ontology)

But it misses **philosophical alignment** - repos that operate in the same conceptual space even when their code and function are completely different.

### The Missing Dimension: Pragmatic Semantic Space

Carmack's personal codebase (hypothetically) and Blocks would have near-zero vector similarity. They solve different problems. But they share:

1. **Epistemological stance**: Empirical, reality-first
2. **Primary concern**: Detecting/preventing drift from essence
3. **Method**: Compare actual to ideal
4. **Output value**: Honest assessment of gaps

### Proposed Enhancement: Philosophical Profiling

Add a new dimension to repository profiling:

```typescript
interface PhilosophicalProfile {
  // What kind of truth does this code seek?
  epistemology: 'empirical' | 'formal' | 'pragmatic' | 'constructive'

  // What is the primary enemy?
  antagonist: 'complexity' | 'inconsistency' | 'ambiguity' | 'rigidity' | 'entropy'

  // What transformation does it perform on understanding?
  cognitiveTransform: 'reveals' | 'enforces' | 'generates' | 'validates' | 'measures'

  // What is the temporal orientation?
  temporality: 'prevents' | 'detects' | 'corrects' | 'documents'

  // What level of abstraction does it operate at?
  abstractionLevel: 'data' | 'pattern' | 'architecture' | 'philosophy'
}
```

### New Relationship Types

```typescript
const PHILOSOPHICAL_RELATIONSHIPS = {
  // Fight the same enemy with different weapons
  shared_antagonist: {
    description: 'Both repos fight the same conceptual enemy (entropy, complexity, etc.)',
    signal: 'Could share strategies, insights, or become complementary tools'
  },

  // Same epistemology, different domain
  epistemological_kin: {
    description: 'Both repos embody the same approach to truth-seeking',
    signal: 'Developers of one would appreciate/benefit from the other'
  },

  // Different abstraction levels, same concern
  vertical_alignment: {
    description: 'Address the same concern at different scales',
    signal: 'Could form a comprehensive solution when combined'
  },

  // Reveals vs Enforces the same pattern
  reveal_enforce_pair: {
    description: 'One reveals what the other enforces (or vice versa)',
    signal: 'Natural pairing for "detect then fix" workflows'
  }
}
```

### Example: Carmack + Blocks Weave

If we could detect philosophical alignment, a Carmack-style codebase and Blocks would match on:

```yaml
relationship: vertical_alignment
reasoning: |
  Both repos fight software entropy but at different scales:
  - Carmack-style: Macro-level, prevents architectural drift through disciplined design
  - Blocks: Micro-level, detects implementation drift through pattern analysis

  A developer who values one almost certainly values the other.
  Together they form a comprehensive anti-entropy strategy:
  1. Design simply (Carmack philosophy)
  2. Detect when implementations drift (Blocks)
  3. Understand whether drift is feature or bug (human judgment)
  4. Correct or accept (informed decision)

integration_opportunity: |
  Blocks could be enhanced to also detect "Carmack violations" -
  places where abstractions exist that don't pay their weight,
  or where the data transformation has been obscured by indirection.

  This would elevate Blocks from "pattern drift detector" to
  "software entropy detector" - a more general and powerful tool.
```

---

## Part 5: The Schizosophy Framework

### What Humans See That Machines Miss

When a human programmer encounters both Carmack's writing and the Blocks codebase, something clicks:

"Ah, these are both about **honesty**. Honest about what the code actually needs to do. Honest about when things have drifted. Honest about the gap between intention and reality."

This recognition happens pre-verbally. The connection is felt before it's articulated.

### Teaching Machines to Feel Connections

To help AI recognize these connections, we need to extract the **invariants of the recognition**:

1. **Both concern gaps**: ideal vs actual, intention vs implementation
2. **Both value measurement**: know the truth, don't assume it
3. **Both enable improvement**: you can't fix what you can't see
4. **Both respect complexity**: real systems are messy, work with that
5. **Both prize simplicity**: but earned simplicity, not naive simplicity

### The Schizosophy Prompt

For LLM-based profiling, add a secondary pass:

```
Beyond what this repository DOES, consider what it BELIEVES:

1. What does this code assume about the nature of software?
   (Is it entropic? Perfectible? Inherently messy? Ideally simple?)

2. What does this code assume about developers?
   (Need guardrails? Can be trusted? Are fallible? Are experts?)

3. What gap does this code address?
   (Ideal vs actual? Intention vs implementation? Known vs unknown?)

4. What virtue does this code embody?
   (Honesty? Consistency? Clarity? Completeness? Simplicity?)

5. What enemy does this code fight?
   (Entropy? Ambiguity? Complexity? Inconsistency? Ignorance?)
```

---

## Part 6: Concrete Recommendations

### 1. Add Philosophical Profiling Stage

After extracting capabilities/artifacts/domains, add:

```typescript
async function extractPhilosophicalProfile(
  repoProfile: RepoProfile
): Promise<PhilosophicalProfile> {
  // Use LLM to analyze README + code patterns
  // Extract epistemology, antagonist, cognitive transform, etc.
}
```

### 2. Implement Schizosophy Matcher

New matching rules that detect philosophical alignment:

```typescript
const SCHIZOSOPHY_RULES: MatchRule[] = [
  {
    name: 'shared_antagonist',
    match: (a, b) => a.antagonist === b.antagonist && a.repoId !== b.repoId,
    confidence: 0.7,
    hypothesis: 'Both repos fight {antagonist} - complementary approaches?'
  },
  {
    name: 'vertical_alignment',
    match: (a, b) =>
      a.antagonist === b.antagonist &&
      a.abstractionLevel !== b.abstractionLevel,
    confidence: 0.8,
    hypothesis: 'Same concern ({antagonist}) at different scales ({a.level} vs {b.level})'
  },
  {
    name: 'reveal_enforce_pair',
    match: (a, b) =>
      (a.cognitiveTransform === 'reveals' && b.cognitiveTransform === 'enforces') ||
      (a.cognitiveTransform === 'enforces' && b.cognitiveTransform === 'reveals'),
    confidence: 0.75,
    hypothesis: 'Reveal + Enforce pair for the same concern'
  }
]
```

### 3. Enhance LLM Assessment Prompt

Add to the assessment prompt:

```
Consider not just functional integration, but philosophical alignment:
- Do these repos fight the same conceptual enemy?
- Would a developer who values one naturally value the other?
- Do they represent the same approach at different scales?
- Together, do they form a more complete solution than either alone?

A philosophically aligned but functionally different pair can be MORE
valuable than a functionally similar pair, because it represents a
coherent worldview applied across different problem spaces.
```

---

## Part 7: The Meta-Insight

### Why This Document Exists

You asked: help me find connections that humans know but haven't articulated.

The Carmack-Blocks connection is an example of **tacit knowledge** - knowledge we have but can't easily explain. By forcing articulation, we can:

1. Teach machines to recognize similar patterns
2. Discover we have even more tacit knowledge to extract
3. Build better tools for connection discovery

### The Recursive Application

This document itself is a drift analysis:
- **Pattern**: Human intuition about code relationships
- **Instance**: The Carmack-Blocks connection
- **Drift**: The gap between intuition and articulation
- **Correction**: This document

By writing it, we've reduced drift between what we know and what we can teach.

That's the Carmack move. That's what Blocks does. And now Symploke can do it too.

---

## Appendix: Key Quotes for Training

### Carmack (paraphrased philosophy)

> "The loaded cost of a line of code is far higher than its production cost. Most code that gets written shouldn't be written at all."

> "Sometimes the elegant solution is a thousand line function that does exactly what's needed."

> "Focus on the data transformations. The code is just instructions for performing them."

### Blocks (implicit philosophy)

The existence of Blocks says:
> "Patterns matter. Consistency matters. Drift happens. Knowing about drift is the first step to deciding what to do about it."

### The Synthesis

> "Good code is honest code. It does what it needs to do, knows what pattern it follows, and acknowledges when it has drifted from either its purpose or its pattern."

---

*This document is designed to be passed to language models to help them understand philosophical connections between repositories that share no textual similarity but operate in the same pragmatic semantic space.*
