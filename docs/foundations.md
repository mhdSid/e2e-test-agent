# Foundations — the state machine as source of truth

> Thesis: if we can derive the **state machine** correctly, plan/generate/gate become
> trivially solid — they only ever reason over ground truth. So the entire bet is on
> building that model *principledly*, from the component's own semantics, **never** by
> matching domain vocabulary (`search`, `result`, `errors.`, `filter`).

This document grounds the design in established work so the model rests on a known
canon rather than ad-hoc heuristics.

## The pattern is real (and named)

What we were calling an "RDG" is, in the literature, a **reactive (dependency) graph**:

- **Ritschel, _A Meta Representation for Reactive Dependency Graphs_** (TU Darmstadt,
  Mezini's group, 2017, REScala). Formalises a reactive data-flow graph and — crucially —
  argues a *generic* data-flow graph is insufficient because it "cannot differentiate
  between signals and events, nor clearly identify source elements that can be manually
  triggered." Its Def. 3.4 types vertices into four sets: signals `N_S`, **signal
  sources** `N^s_S`, events `N_E`, **event sources** `N^s_E`. Its contribution —
  *reifying* the implicit reactive graph as an external, inspectable meta-representation —
  is exactly what our `state-machine.json` is.
- **Vue/Solid/MobX reactivity** and **Shiny's "reactive graph"** (Mastering Shiny, ch. 14;
  `reactlog`) are the same structure at runtime: producers (signals/computeds) → consumers.

### The one pivot that defines us

Shiny ch. 14.5 ("Dynamism"): a reactive graph is normally **dynamic** — discovered at
runtime, kept *minimal* for efficiency. A **static** analysis instead connects *every*
conditional dependency (the over-approximation), because a dependency exists wherever a
value is *read*. Shiny treats that over-approximation as waste. **We treat it as the
asset**: every branch Shiny would prune at runtime is a **UI state we must enumerate and
test**. Same graph; their efficiency problem is our coverage goal.

## The canon we stand on

| Concern | Established work | What we take |
|---|---|---|
| Reactive graph + signal/event typing + reification | Ritschel 2017 (REScala); Shiny reactive graph | Type nodes as **signals vs events**; identify **manually-triggerable sources**; reify the graph as data |
| UI **State-Flow Graph** (DOM states + event transitions) | Crawljax / Mesbah et al. | The output shape: states + event-labelled transitions — but built **statically**, not by crawling |
| Static event/model extraction → state model, **edges = tests** | AMOGA (static-dynamic model generation) | Precedent for extracting the model from source, then deriving tests from edges |
| Tests from a model via **coverage criteria** | Model-Based Testing; GraphWalker; FSM coverage survey (arXiv 2203.09604) | The consumer: state/edge/path coverage → test paths (A*/random) |
| Static substrate: control + data dependence | **PDG** (Ferrante, Ottenstein, Warren 1987); **def-use chains**; **program slicing** (Weiser) | Provenance = data-dependence (def-use) typed by root; guards = control-dependence; "what flips a guard" = a backward slice |
| Engineering the graph: DAG hazards + first-class tooling | **REFRAME** (Mijač et al., SoftwareX 2023); reactive-programming survey (Bainomugisha et al. 2013); "Deprecating the Observer pattern" (Maier/Rompf/Odersky) | The graph is a **DAG**: topologically sort it, be **cycle-/glitch-safe**; make it a first-class **analyzable/visualizable** artifact; Vue is a "reactify" framework so its RDG is implicit — reconstruct it via the compiler API (ts-morph ≈ Roslyn) |

## Our model, formally (typed, zero keywords)

Extracted per SFC (and resolved into locally-importable children — the interprocedural /
SDG step):

- **Signals** (continuous state): `ref`/`reactive` (sources), `computed` (derived),
  `defineProps` (prop), `useRoute()` (route), a Pinia store (store). Edges = def-use.
- **Events** (discrete, manually-triggerable — the `N^s` sources): `@event` handlers and
  `v-model` writes and form submit. These are the **actuators**.
- **Guards**: `v-if/else-if/else` conditions — control-dependence; they *read* signals.
- **States**: an over-approximated assignment of guard truth-values; a v-if **chain** is a
  set of mutually-exclusive states (a Crawljax SFG node).
- **Transitions**: an Event that writes a Signal a Guard depends on → can flip a State
  (an SFG edge, labelled by the actuator).
- **Provenance** (replaces `classifyTrigger`): classify a guard by tracing its signal
  **roots** to a source kind — `route | prop | store | user-input | data | unknown`. This
  is taint/def-use typing, computed by graph traversal, not substring matching.
- **Reachability / journey** (the genuinely hard part, a later layer): the sequence of
  Events that satisfies a Guard = a backward slice / an MBT path. This is what turns
  "selector exists in state X" into "here is how to drive the app into state X."

## The two traversals (the actual algorithms)

Static reactivity reduces to two standard graph walks over the DAG — the static duals of
push/pull reactivity (Frère, "Three Reactivity Algorithms"):

- **Provenance = pull / backward slice.** From a guard, walk *up* the dependency edges to
  its signal roots, classify each root, combine → `route | prop | store | user-input |
  data`. (Replaces `classifyTrigger`.)
- **Transitions = push / dirty-mark.** From an actuator's written signal, walk *down* the
  dependency edges; every guard/output reached is a state that actuator can flip. The
  dirty-mark push is order-independent and O(n) — no global topo-sort needed for this step.
  (Replaces `detectSearch`: "filtering" is just the push-set of the `query` actuator
  reaching a `v-for`.)

**Outputs are the observable leaves** — the testid'd DOM bindings (`{{ }}`, `:attr`,
conditional render). They are what a generated test asserts on; a signal→output edge tells
us *what value* to assert, a guard→output edge tells us *in which state*.

**Why static over-approximation is correct here.** A reactive engine treats a conditional
("dynamic") dependency as something to resolve lazily and keep minimal. We do the opposite:
each conditional dependency edge is materialised as a **state split**. The dynamism that
makes runtime engines hard is precisely the state structure we want to enumerate.

## What this kills

Every domain-vocabulary heuristic is replaced by typed signal/event extraction + provenance:

| Dies | Replaced by |
|---|---|
| `classifyTrigger` (`'errors.'`, `'route'`, `'.length'`) | provenance from signal roots |
| `detectSearch` (`['filter','search','query']`, `'result-list'`, `'no-result'`) | a `v-model` writes a signal; a `v-if`/`v-for` transitively reads it → "drive input ⇒ state changes", emergent |
| `VEE_VALIDATE_MARKERS`, `/errors\.(\w+)/` | a field↔error link = the error guard reads the **same signal symbol** the field binds; submit gate = whatever signal sits in `:disabled` |
| `TriggerKind` enum assigned by substring | provenance computed from the graph |

The distinction we hold to: matching the **code's own symbols** through the AST is
structural and allowed; matching **domain words** is what we removed.

## Sources

- Ritschel, _A Meta Representation for Reactive Dependency Graphs_, TU Darmstadt, 2017 (`rdg-master-thesis.pdf`).
- Wickham, _Mastering Shiny_, ch. 14 "The reactive graph" — https://mastering-shiny.org/reactive-graph.html
- Mesbah et al., Crawljax / Crawling AJAX by Inferring UI State Changes — https://github.com/crawljax/crawljax
- AMOGA: A Static-Dynamic Model Generation Strategy for Mobile Apps Testing — https://arxiv.org/pdf/1902.00231
- Test Coverage Criteria for Test Case Generation from FSMs — https://arxiv.org/abs/2203.09604 ; GraphWalker — https://graphwalker.github.io
- Ferrante, Ottenstein, Warren, _The Program Dependence Graph and Its Use in Optimization_, 1987; def-use chains; program slicing (Weiser).
- REFRAME — Mijač, Garcia-Cabot, Strahonja, _SoftwareX_ 24 (2023) 101571 — https://doi.org/10.1016/j.softx.2023.101571 ; reactive-programming survey, Bainomugisha et al., _ACM Comput. Surv._ 2013.
- Frère, _Pushing and Pulling: Three Reactivity Algorithms_ (push / pull / push-pull), 2026.
- reactive-graph (Rust ECS + reactive property streams) — https://github.com/reactive-graph/reactive-graph
