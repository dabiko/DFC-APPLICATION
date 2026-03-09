# Procedure Management and Training Functionality

## Overview

This specification defines how to create, review, publish, assign, deliver, and audit procedures for internal training. The design uses modular functionality with strict workflow, evidence tracking, and security controls.

## Lifecycle States

- `Draft`
- `In Review`
- `Approved`
- `Published`
- `Retired`

Rules:

- Only `Approved` versions can be `Published`.
- `Published` versions are immutable snapshots.
- Older `Published` versions remain readable for audit.

## Functional Modules

### 1. Authoring Module

Capabilities:

- Create procedure metadata:
  - `Procedure Title` (required)
  - `Procedure Description` (required)
  - `Parent Procedure` (optional)
  - `Tags` (optional)
- Add, edit, delete, and reorder steps.
- Define step fields:
  - `Step Title`
  - `Step Description`
  - `Step Order`
  - `Estimated Duration` (optional)
  - `Manual` attachment binding
- Upload and bind manuals to specific step versions.
- Save as `Draft` and submit to `In Review`.
- Compare versions with diff for:
  - Step text changes
  - Attachment changes

Critical controls:

- Step dependency and branching support:
  - Example: show `Step 3` only if condition X is true.
- Version linkage is immutable once published.

### 2. Review and Publish Module

Capabilities:

- Reviewer comment threads per step.
- Approve/reject decisions with mandatory reason.
- Publish action creates immutable version snapshot.
- Archived published versions remain available for audit and rollback reference.

Critical controls:

- Lifecycle enforcement: `Draft -> In Review -> Approved -> Published -> Retired`.
- `Effective From` and `Expires On` fields required for published versions.
- Auto-reminders for upcoming expiry and re-certification cycle.

### 3. Training Delivery Module

Capabilities:

- Sequential training player with:
  - Progress bar
  - Next/Previous navigation
  - Resume from last step
- Step-level completion events:
  - `started`
  - `viewed`
  - `completed`
- Optional progression gates:
  - Must open manual
  - Must watch all content
  - Must pass quiz/checkpoint before advancing

Critical controls:

- Knowledge checks supported at step level and end-of-procedure level.
- Pass criteria configurable (minimum score, mandatory questions, max attempts).

### 4. Assignment and Tracking Module

Capabilities:

- Assign procedures by:
  - User
  - Team
  - Role
  - Department
- Mandatory due date per assignment.
- Reminder cadence support:
  - `7d`
  - `3d`
  - `1d`
  - `Overdue`
- Dashboard metrics:
  - Completion percentage
  - Overdue percentage
  - Average completion time
  - Pass rate

Critical controls:

- Track assignment date, due date, and overdue status per assignee.
- Re-certification assignments auto-generated for expiring procedures.

### 5. Evidence, File Control, and Security Module

Training evidence model:

- Track per attempt:
  - Attempt count
  - Time spent per step
  - Pass/fail outcome
  - Score
- Capture timestamps for:
  - Start
  - Step completion
  - Final completion

Manual/document controls:

- Enforce allowed file type list.
- Enforce maximum file size.

- Support preview for allowed formats.
- Preserve immutable file linkage to the exact published step version.

Tenant and access security:

- Scope data by tenant and/or department in multi-org environments.
- Enforce strict visibility boundaries across teams.
- Apply role and tenant checks to every read/write endpoint.

## Roles and Permissions

- `Creator`: create/edit drafts, manage steps, submit for review.
- `Reviewer`: comment, approve, reject with reason.
- `Admin`: assign procedures, configure reminders, manage lifecycle transitions.
- `Trainee`: consume assigned training, complete checkpoints.
- `Compliance Auditor`: read-only access to versions, logs, and evidence exports.

## Compliance and Audit Requirements

- Every lifecycle transition is logged with actor and timestamp.
- Every version includes changelog and approver metadata.
- Every training attempt is exportable with evidence fields.
- Audit exports support compliance reviews and historical verification.

## Updated User Stories

1. As a `Creator`, I want to create and save procedure drafts so I can iteratively build training content.
2. As a `Creator`, I want to reorder and conditionally branch steps so the training flow matches real-world scenarios.
3. As a `Creator`, I want manuals linked to step versions so trainees always see the correct document for that version.
4. As a `Reviewer`, I want per-step comment threads so feedback is specific and actionable.
5. As a `Reviewer`, I want to approve or reject with mandatory reason so publishing decisions are auditable.
6. As an `Admin`, I want only approved versions to be published so uncontrolled content cannot reach trainees.
7. As an `Admin`, I want effective and expiry dates so certification validity is controlled.
8. As an `Admin`, I want assignment by user/team/role/department with due dates so training obligations are measurable.
9. As a `Trainee`, I want to resume training from my last completed step so I do not lose progress.
10. As a `Trainee`, I want quiz/checkpoint gates so I can validate understanding before completion.
11. As an `Admin`, I want reminder cadences and overdue tracking so completion rates improve.
12. As a `Compliance Auditor`, I want immutable version history and attempt evidence exports so compliance can be proven.

## Example Use Case

Procedure: `New Employee Onboarding`

Steps:

1. Welcome and Orientation (`welcome.pdf`)
2. IT Setup (`setup.docx`)
3. HR Policies (`hr_policies.pptx`)
4. Loan Application Procedure (shown only if role requires loan processing)
5. Account Opening Procedure

Parent Procedure: `Human Resources Operations`
