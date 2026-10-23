---
name: hack2skill-sutra-evaluation
description: Guide and rigorous engineering checklist to maximize automated evaluation scores on Hack2Skill's Sutra Evaluation Engine across code quality, security, cloud architecture, and prompt engineering.
metadata:
  version: "1.0.0"
  target_engine: "Sutra Automated Evaluation System"
---

# Hack2Skill Sutra Evaluation Optimization Guide

This skill provides an end-to-end framework and checklist for preparing competition entries evaluated by Hack2Skill's automated **Sutra Evaluation Engine**. It details the scoring rubrics, terminal failure traps, and concrete engineering standards extracted from the platform's client-side analysis schemas.

---

## 1. Engine Lifecycle & Status Pipeline

The Sutra Evaluation Engine processes submissions asynchronously through a state machine:

```
[Submission Ingestion]
        │
        ▼
   [Validation] ────────► Terminal Failures:
        │                  • INVALID_LINK (Unreachable repository or broken URL)
        │                  • CODE_NOT_PUBLIC (Private repo or 401/403 HTTP response)
        │                  • INVALID_PROJECT (No recognizable project structure or manifest)
        │                  • DUPLICATE_PROJECT (Plagiarism / duplicate AST hash)
        ▼
    [QUEUE]
        │
        ▼
  [PROCESSING] ────────► AGENT_FAILED (Worker timeout / build crash / retry limit reached)
        │                  ▲
        ▼                  │
    [RETRYING] ────────────┘
        │
        ▼
   [COMPLETED] ────────► Generates Score Breakdown + Sutra HTML Report
```

---

## 2. Hard Failure Traps (Immediate Disqualification)

Before any rubric evaluation begins, the engine runs automated sanity checks. A failure here results in a terminal error and zero points:

| Error State | Primary Cause | Preventive Requirement |
| :--- | :--- | :--- |
| `INVALID_LINK` | URL points to a 404, malformed URL, or local address (`localhost`). | Verify repository link in an incognito window without authentication. |
| `CODE_NOT_PUBLIC` | Repository is private, requires organization SSO, or token auth. | Ensure repository visibility is set to **Public** on GitHub/GitLab. |
| `INVALID_PROJECT` | Missing core manifests, empty repository, or uncompiled archives. | Must include root manifest (`package.json`, `requirements.txt`, `go.mod`, etc.) and a clear `README.md`. |
| `DUPLICATE_PROJECT`| Fingerprint or AST similarity threshold exceeded against existing submissions. | Do not submit unedited template clones or verbatim forks; maintain distinct project authorship and commits. |
| `AGENT_FAILED` | Build script exits with non-zero status or test execution hangs beyond timeout. | Clean dependencies, remove hardcoded local paths, and ensure `npm test` or `pytest` executes and exits cleanly. |

---

## 3. Rubric Breakdown & Optimization Dimensions

The Sutra Engine scores entries across specific review types. Follow the exact standards below for each dimension to maximize points.

---

### A. General Code Evaluation (`CODE_EVALUATION`)

Evaluated by the engine under the standard code assessment module:

#### 1. Code Quality (`quality`)
* **Modular Structure**: Separate code into logical layers (`controllers/`, `services/`, `models/`, `utils/`). Avoid single monolithic files exceeding 500 lines.
* **Static Typing & Conventions**: Use TypeScript with strict null checks or Python with explicit type annotations (`typing`).
* **Linting & Hygiene**: Zero unresolved warnings in ESLint, Ruff, or Golangci-lint. Use standard formatting (`prettier` / `black`).
* **Documentation**: Provide inline JSDoc / docstrings on public API methods, clarifying input schemas and return types.

#### 2. Security (`security`)
* **Zero Hardcoded Secrets**: Never commit API keys, private keys, or passwords. Load all credentials via environment variables (`process.env` / `os.environ`) and supply an `.env.example`.
* **Injection Defense**: Use parameterized queries or typed ORMs (Prisma, SQLAlchemy, Mongoose). Never concatenate raw user input into SQL or shell commands.
* **Dependency Health**: Run `npm audit` or `pip-audit` prior to submission. Pin dependency versions in lockfiles (`package-lock.json`, `poetry.lock`).

#### 3. Efficiency (`efficiency`)
* **Algorithmic Optimal Paths**: Ensure standard data queries avoid $O(N^2)$ nested loops where Map/Set lookups achieve $O(1)$ / $O(N)$.
* **Resource Management**: Implement database connection pooling, stream large file operations instead of loading entire buffers into memory, and close idle sockets/file descriptors.
* **Asset Optimization**: Minify bundle sizes, lazy-load client routes, and use modern compressed formats for media (WebP/AVIF).

#### 4. Testing (`testing`)
* **Test Suite Presence**: Include an automated test runner configured in the root manifest (`npm test`, `pytest`, `cargo test`).
* **Test Coverage**: Supply at least 5–10 unit tests covering core business logic and edge cases.
* **Mocked External I/O**: Mock network calls and external API services (using Jest/pytest-mock) so tests execute offline and quickly in isolated sandbox containers.

#### 5. Accessibility (`accessibility`)
* **Semantic HTML**: Use standard elements (`<header>`, `<nav>`, `<main>`, `<article>`, `<button>`) instead of nested generic `<div>` tags.
* **ARIA & Labels**: Ensure all interactive inputs contain corresponding `<label>` or `aria-label` attributes.
* **Keyboard Navigation**: Ensure tab orders are logical and active focus rings are visible.

#### 6. Service Adoption (`serviceAdoption`)
* When the competition theme requires specific vendor SDKs (e.g., Google Cloud, Firebase, Vertex AI, Gemini API):
  * Import and initialize the official SDK cleanly via dependency manifests.
  * Structure SDK initialization in dedicated service wrappers (`services/geminiService.ts`).

#### 7. Problem Statement Alignment (`problemStatementAlignment`)
* Ensure the project repository title and `README.md` explicitly describe the targeted challenge statement, problem addressed, and user workflow.

---

### B. Cloud Computing & IaC Evaluation (`CLOUD_COMPUTING_EVALUATION`)

Evaluated for cloud architecture and infrastructure hackathons:

* **Cloud Security & IAM (`cloud_security_iam`)**:
  * Apply principle of least privilege in IAM policies (avoid wildcard `*` permissions).
  * Use managed identities / IAM roles rather than permanent access keys.
* **Cost Optimization & FinOps (`cost_optimization_finops`)**:
  * Specify appropriate instance sizes, serverless architectures, or auto-scaling down to zero when idle.
  * Define storage lifecycle rules (e.g., transitioning older objects to cold storage).
* **High Availability & Resilience (`high_availability_resilience`)**:
  * Multi-zone redundancy, stateless compute instances, and database health check probes (`/healthz`).
* **IaC Quality & Maintainability (`iac_quality_maintainability`)**:
  * Clean, modular Infrastructure as Code (Terraform, Pulumi, AWS CDK, or CloudFormation).
  * Variables and outputs properly abstracted with clear descriptions and zero hardcoded IDs.

---

### C. Prompt Wars / Prompt Engineering (`resultPromptAnalysis`)

When the evaluation engine assesses LLM prompts and steering:

* **Intent Clarity (`intentClarity`)**:
  * Write precise system prompts with explicit roles, constraints, input format schemas, and expected output structure (preferably JSON).
* **Context Management (`contextManagement`)**:
  * Provide relevant few-shot exemplars and demarcate context windows using clear XML/Markdown tags (`<context>`, `<instructions>`, `<input>`).
* **Iterative Steering (`iterativeSteering`)**:
  * Demonstrate structured fallback handling, self-correction prompts, or validation chains that detect and repair unexpected outputs.
* **Prompt Efficiency (`promptEfficiency`)**:
  * Avoid redundant boilerplate. Keep token count concise while preserving all necessary instructions and guardrails.

---

## 4. Pre-Submission Checklist

Before submitting the repository URL to Hack2Skill:

- [ ] **Repository Access**: Open repository in an unauthenticated / incognito session and confirm it returns HTTP 200.
- [ ] **Manifest Completeness**: Confirm package manifests and lockfiles exist in the root directory.
- [ ] **Automated Test Run**: Run test commands locally without environment-dependent credentials:
  ```bash
  npm test # or pytest
  ```
- [ ] **Secret Cleanliness**: Run a credential scan (e.g., `git-secrets` or `trufflehog`) to guarantee no API keys were committed.
- [ ] **Documentation**: Ensure `README.md` includes:
  1. Project Summary & Problem Statement Alignment
  2. Architecture Diagram or Flow
  3. Prerequisites & Quickstart Commands
  4. Technology Stack & Service Integrations