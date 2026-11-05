# Agent instruction audit

Audited 2026-10-30 on local branch `lane/agents`, source commit `86249fb5ab488eda90a4949896148c00fe7d8013`.

Scope: first-party AGENTS.md, CLAUDE.md, .cursor/rules, .github/copilot-instructions.md, and CONTRIBUTING.md, in that priority; legacy .cursorrules also checked. Dependency/vendor/build outputs are excluded. VERIFIED means the stated local fact or policy is supported at the level described; it does not claim a full build, runtime test, external-service check, or completed release process. CONFLICT identifies a concrete mismatch. Procedural policies are distinguished from implemented features. No full builds, installs, account access, servers, or external changes were needed.

Resolution pass 2026-10-30 on `agents-fix`: the single branch-policy conflict is resolved in `AGENTS.md:3`. Current checkout evidence replaces the stale lane/agents observation. Remaining VERIFIED entries describe the original audit, not additional actions in this pass.

Instruction inventory before this audit: only `AGENTS.md`; no CLAUDE.md, Cursor rules, Copilot instructions, or CONTRIBUTING.md.

| Status | Claim and source | Evidence |
| --- | --- | --- |
| RESOLVED | Work on `portfolio-triage` (`AGENTS.md:3`, before correction). | Changed `AGENTS.md:3` to the current local `agents-fix` branch for this documentation task. Rechecked `git branch --show-current`: `agents-fix`; `git symbolic-ref HEAD`: `refs/heads/agents-fix`; `.git/HEAD:1` records the same ref. This is a workflow/checkout conflict, not application behavior; no code change is needed. |
| VERIFIED | Work only here; no push/PR/deploy/cloud accounts/Railway contact (`AGENTS.md:3`). | Workflow policy consistent with this task; `git status --short` was empty at entry. Only the two authorized audit files are changed. No such external action was taken. |
| VERIFIED | Assistant runs needed dependency resolution without another runner-choice question (`AGENTS.md:4`). | Process policy matches the task's DOWNLOADS instruction; this audit needed no dependency resolution. |
| VERIFIED | Do not create, print, or commit secrets; placeholders for runtime configuration (`AGENTS.md:5`). | Process policy. No environment files/configuration values were read, and no runtime configuration was created. Audit evidence uses paths and source references only. This is not a whole-repo secret scan. |
| VERIFIED | Skip sandbox headless Chrome; lead owns screenshots (`AGENTS.md:6`). | Process policy; no browser or screenshot process started. Existing `portfolio-shots/live-signin.png` and `portfolio-shots/live-signup.png` are tracked (git ls-files). |
| VERIFIED | Record local start command, port and screenshot paths in PORTFOLIO_REPORT.md (`AGENTS.md:6`). | `test -f PORTFOLIO_REPORT.md` and `test -d portfolio-shots` pass. This is a reporting policy for runtime validation; this audit starts no app and leaves the existing report untouched. |
| VERIFIED | Keep README.md unchanged (`AGENTS.md:7`). | `test -f README.md` passes; only AGENTS.md and CONFLICTS.md are staged for this audit. |
| VERIFIED | Stop servers started for validation (`AGENTS.md:7`). | Process policy; zero servers started. |

No build/test/lint/run command or protected-test claim appears in this instruction doc.

## Cyclops fixes resolution

Dan explicitly requested a replacement setup README for `cyclops-fixes`. This supersedes the prior README preservation rule; AGENTS.md now records the task-specific instruction. The old audit remains historical. Migration/schema, service signature and runtime configuration conflicts found by Cyclops are listed with current validation in REPORT.md.
