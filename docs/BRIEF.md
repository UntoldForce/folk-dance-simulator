# Contra Dance Simulator — Project Brief (Phase 0: design before code)
*Written October 26, 2026, from Ryan's voice notes. For use in a separate Claude (Opus) conversation.*

---

## Instructions for Claude (read first)

**Do not write the application yet.** This first conversation is for design. Please:
1. Read this brief and ask me the questions you need answered before building anything (ambiguities, choices that affect the architecture).
2. Propose a **data model** (dancers, positions, formations, figures, timing) and a **coordinate system**.
3. Propose how **figures** are defined as reusable building blocks (start state → end state over N beats, with paths), and show 3 worked examples in pseudocode or a small schema: **allemande right 1½**, **partner swing**, **hey for four**.
4. Propose a **phased build plan** (smallest useful version first), with what each phase delivers and roughly how much code it is.
5. Recommend the technology for a **single self-contained web page** (plain JavaScript + Canvas or SVG, no server, no build step), and say why.

Keep answers compact. I want to agree on the core engine before any tokens go into the interface.

---

## What it is
A web-based tool that **simulates how dancers move during a contra dance** (and eventually square and grid-square dances). You enter a dance as a sequence of figures with their length in measures (or beats), set a tempo, and watch every dancer move as a dot from above. The point is to *see* the dance: whether the timing works, whether people have to move too fast, whether the progression works, what happens at the ends of the line, and whether hands are where they need to be.

Audience: callers and dance writers checking a new dance, and dancers learning one. (A caller friend uses YouTube videos of dances today; a simulator helps most when a dance is new and no video exists.) First, check whether a similar tool already exists, and tell me if one does.

## Core concepts (contra vocabulary, for reference)
- **Roles:** **Larks** (traditionally the left / lead role; also "gents") and **Robins** (the right / follow role; also "ladies"). Gender-free calling is the default. Each role gets a **distinct icon or color**.
- **Formations:** longways sets in **duple improper** (most common), **Becket** (couples on the side, progress on a slide), proper, triple minor later. A **minor set** is hands four (2 couples). A **line** contains many minor sets.
- **Relationships:** partner, neighbor, shadow, next neighbor.
- **Progression:** after each 64-beat time through, couples move one place up or down the line. Some dances have double, triple or even **quintuple progressions** (e.g., "40 Years of Penguin Pam"). The engine must track who meets whom over many times through.
- **End effects:** at the top and bottom of a line, couples sit out a time, swap roles and come back in. The simulation should show this.
- **Timing:** music is in 32-bar tunes (AABB, 8 bars each = 16 beats). Figures take 4, 8 or 16 beats (2, 4 or 8 bars). The dance is 64 beats per time through.

## The figure library (first set)
Standard moves to model, each with a default length and the ability to override it:
- balance, swing (partner/neighbor), allemande right/left (by ½, ¾, 1, 1½), do-si-do, see-saw (left shoulder), gypsy
- circle left/right (¾, all the way), star right/left (with hand position options)
- ladies' chain / robins' chain (with **courtesy turn**), half hey / **hey for four** (full figure-eight loop), right-and-left through, **pull-bys** (right and left)
- long lines forward and back, petronella, California twirl, slice, mad robin, give and take, roll away with a half sashay, box the gnat
- "Up the hall / down the hall" and other Becket and line moves later.

## Timing and speed checks (key feature)
- Set the **tempo** (beats or bars per minute) and the **number of measures** for each figure.
- Example: a hey for four is usually 8 bars (16 beats). Change it to 4 bars and the engine recalculates the path speed.
- The engine computes each dancer's **speed** (feet or meters per second) along their path, and **flags** anything above a comfortable threshold (configurable), so you can see where a dance is rushed.
- It needs a realistic **floor scale**: distance between partners and neighbors, length of a minor set, typical hand-hold distance.

## Hands (stretch goal; please assess feasibility)
- Optionally show each dancer's **right and left hand**: which hand is in use, with whom, and when it must be free.
- Uses: pull-bys, courtesy turns, stars, allemandes, circles.
- Possible checks: a hand needed by two figures at once, a hand-to-hand **transition with no time** to let go, crossing arms, or a **collision or tight squeeze** between dancers. Tell me how practical this is and what simplified version would still be useful.

## Inputs and controls
- **Enter a dance:** a list of figures, each with who does it (partners, neighbors, robins, larks, ones, twos) and its length in beats or bars. A simple text format or a form; propose one.
- **Number of minor sets per line** (1, 2, 3 … N) and **number of lines** (more or fewer).
- **Tempo**, play, pause, step by beat, scrub through time, loop a figure, speed up or slow down.
- Show **timelines** (the A1/A2/B1/B2 parts) under the animation.
- Highlight one couple to follow them through several times.

## Outputs and checks
- The animation, with roles shown by icon or color and optional trails.
- **Progression check:** does each couple end one place along (or the intended number)? Does everyone end where the next time through starts?
- **Speed warnings** per figure and per dancer.
- **End-effect view:** what happens to the couples at the top and bottom.
- Later: export or share a link to a dance.

## Later phases
- **Square dances** (8 dancers in a square) and **grid squares** (several squares side by side, where dancers pass from one square into another; Bob Isaacs of Princeton writes sophisticated ones).
- Triple minors, improper vs. proper variants, contra corners.
- A small library of well-known dances to load.

## Suggested phase order (Claude may revise)
1. **Engine core:** formation (duple improper, 2–4 minor sets), coordinate system, beat clock, and 4 figures (balance, swing, circle left, long lines) with smooth paths. A minimal page that animates them.
2. Progression and end effects.
3. The rest of the basic figure library, plus the dance-entry format.
4. Speed calculations and warnings.
5. Becket formation and the quintuple-progression test case.
6. Hands (simplified model first).
7. Squares and grid squares.

## Constraints
- One self-contained HTML file that opens in a browser.
- Work in small steps: one figure or feature at a time, verified before moving on.
- I'm on a Pro plan with session and weekly limits. Keep each step lean.
