Do not write Code or Change this file

# Spec: <TICKET-ID> – <Short Title>

---

## 0. AI Prompt Flow

Follow these steps:

1.  **Receive Input:** Be provided with this `spec_readme_template.md` file and any user-supplied files (e.g., `Component1.jsx`, `Component1Controller.java`).
2.  **Parse Request:** Understand the user's high-level objectives (e.g., "troubleshoot why the API call is not working").

---

### Phase 1: Problem Diagnosis & Spec Definition

3.  **Diagnose Root Cause & Gather Context:**
    * Analyze the user's problem description, provided files, and relevant code within the directory structure.
    * Identify all imports, related file dependencies, and potential problematic logic.
    * Formulate hypotheses for the root cause of the issue.
    * **If needed:** Ask clarifying questions to the user to refine the diagnosis (e.g., "Can you provide the API endpoint for `messageBanner` data?", "Is there a specific date format expected?").
4.  **Draft Spec (`spec.md`):**
    * Generate a *draft* of `spec.md` (and empty `checklist.md`, `commitMsg.md`) under a new ticket folder: `specs/<TICKET-ID>-<short-slug>/`.
    * Populate the **Overview**, **Context & Inputs**, **Prioritized Requirements**, and a preliminary **Implementation Plan** based on the diagnosis.
5.  **Seek User Approval for Spec:**
    * Present the drafted `spec.md` to the user for review.
    * **Prompt the user with options:**
        1.  **Approve and proceed** to implementation.
        2.  **Suggest refinements** to the spec (user specifies changes to `spec.md` sections).
        3.  **Provide more context** for analysis.
        4.  **Cancel** this task.
    * **Loop:** If "Refine" or "Provide More Context," update the spec based on user input and return to this step until the user "Approves."

---

### Phase 2: Implementation & Verification

6.  **Execute Implementation Plan:**
    * Based on the approved `spec.md`, modify the specified files.
    * Address all requirements and implement changes as detailed in the "Implementation Plan."
    * Generate or update unit tests as guided by the spec.
7.  **Update Checklist:**
    * Automatically update `checklist.md` to reflect completed tasks as implementation progresses.
8.  **Internal Code Review:**
    * Perform an automated self-review of the implemented changes for common issues (e.g., linting, syntax errors, basic logic checks).

---

### Phase 3: Final Review & Commit

9.  **Present for User Confirmation:**
    * Notify the user that implementation is complete and the ticket folder is ready for final review.
    * **Present options:**
        1.  **Confirm and finalize** (proceed to commit message generation).
        2.  **Request further refinements** (re-open the spec iteration loop, updating `spec.md` as needed).
        3.  **Run additional manual tests** (provide instructions).
        4.  **Discard changes** and close the ticket.
10. **Generate Commit Message:**
    * Upon user confirmation, update `commitMsg.md` with a concise summary of changes made, based on the completed `spec.md` and `checklist.md`.
11. **Return Path:**
    * Return the complete ticket folder path for final review and (manual or automated) commit.

---

### Folder Structure Example

specs/
└── 1234-fix-api-call/
├── spec.md
├── checklist.md
└── commitMsg.md

---

## 1. Overview
*A brief description of what this ticket will achieve.*

* **Background / Why**
    Describe the existing feature or bug, and why it needs change.
* **Goal**
    What the end state should look like.

---

## 2. Context & Inputs
*So the AI knows what code & data is in scope.*

1.  **Attached Files**
    * List of file paths provided
    * For each: whether to read/import context only, or to modify
2.  **Existing Imports & Logic**
    * Which modules / components must be pulled in (e.g. `import Foo from './Foo';`)
    * Any shared utilities or patterns to reuse
3.  **Variables / Data Models**
    * Names and types of key inputs you’ll pass to the AI

---

## 3. Requirements
*A detailed, prioritized list of fixes / features.*

| Priority | Type     | Description                                                  |
|:--------:|:---------|:-------------------------------------------------------------|
| High     | Bug      | Fix crash when `bar` is null in `BarComponent`               |
| High     | Dev      | Add `BazService` import to `app.module.ts`                   |
| Medium   | Feature  | Expose new `quxCount` input on `QuxComponent`                |
| Low      | Refactor | Consolidate duplicate `util` functions into `utils.ts`       |

---

## 4. Implementation Plan
*For each file that needs touching, exactly what to do. Include guidance for unit tests.*

### 4.1 `src/components/BarComponent.tsx`
* **Context**: already imports `Foo` and `useState`
* **Changes**:
    1.  Wrap null-check around `bar`:
        ```diff
        - const value = bar.prop;
        + const value = bar ? bar.prop : defaultValue;
        ```
    2.  Add `import { defaultValue } from '../../constants';`

### 4.2 `src/app.module.ts`
* **Add**:
    ```diff
    + import { BazService } from './services/baz.service';
    ```
* **Register**:
    ```typescript
    providers: [ BazService, /* existing providers */ ]
    ```

---

## 5. Checklist

*Point-and-click completion checklist; see `checklist.md` for auto-updates.*

* [ ] All context imports verified
* [ ] `BarComponent` null-check implemented
* [ ] `BazService` added and registered
* [ ] `QuxComponent` input exposed & documented
* [ ] Utility functions consolidated
* [ ] Unit tests added/updated
* [ ] All automated tests passing

---

---

## `checklist.md` template

```markdown
# Checklist for <TICKET-ID>

- [ ] All context imports verified
- [ ] `BarComponent` null-check implemented
- [ ] `BazService` added and registered
- [ ] `QuxComponent` input exposed & documented
- [ ] Utility functions consolidated
- [ ] Unit tests added/updated
- [ ] All automated tests passing

How to Use This Template
Create the folder: specs/1234-add-baz-service/
Copy files: Copy spec.md, checklist.md, and commitMsg.md into it, filling in titles & entries.
Attach to Prompt: Attach that folder (or its path) alongside your prompt: "Please implement the changes described in specs/1234-add-baz-service/spec.md"