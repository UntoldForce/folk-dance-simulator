# Folk Dance Simulator — working notes for Claude

Read `docs/DESIGN.md` first; it holds the agreed decisions. The original brief is `docs/BRIEF.md`.

## Ground rules
- One self-contained HTML file, plain JavaScript, Canvas 2D. No server, no build step, no frameworks.
- Meters and beats internally. Dances are entered in The Caller's Box layout (beats in brackets).
- The engine never touches the page, so it can be tested headlessly with Node.
- Work in small steps. Test each step before pushing it.

## Workflow with Ryan
- Ryan is a contra dancer and not a programmer. Explain in plain language; avoid jargon.
- One branch per phase. Push after every verified step.
- After each step: publish a preview link, say what changed, and name 2–3 things to look at.
- At the end of a phase: open a pull request with a plain-language summary. Ryan merges it.

## Layout
- `index.html` is the whole app. The `<script id="engine">` block is the engine; `tests/run.js` loads it in Node.
- Lines marked `<!--wrap-->` are the document wrapper; `tools/preview.sh` strips them to publish a preview.
- Test dances live in `dances/`.
