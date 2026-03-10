# Procedure & Workflow Testing Guide

**Use Case**: Onboarding a new employee on the company Loan Application Procedure.

This guide walks through every phase of the procedure lifecycle using the UI and API, with exact steps, URLs, and expected results.

---

## Table of Contents

1. [Test Accounts](#1-test-accounts)
2. [Phase 1: Create a Procedure (Author)](#2-phase-1-create-a-procedure-author)
3. [Phase 2: Add Steps to the Procedure](#3-phase-2-add-steps-to-the-procedure)
4. [Phase 3: Submit for Review (Workflow)](#4-phase-3-submit-for-review-workflow)
5. [Phase 4: Review & Approve (Reviewer)](#5-phase-4-review--approve-reviewer)
6. [Phase 5: Publish a Version](#6-phase-5-publish-a-version)
7. [Phase 6: Assign Training](#7-phase-6-assign-training)
8. [Phase 7: Complete Training (Trainee)](#8-phase-7-complete-training-trainee)
9. [Phase 8: Evidence & Audit (Compliance)](#9-phase-8-evidence--audit-compliance)
10. [Phase 9: Versioning & Recertification](#10-phase-9-versioning--recertification)
11. [Workflow Templates (Standalone)](#11-workflow-templates-standalone)
12. [API Quick Reference](#12-api-quick-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Test Accounts

These accounts are created by `python manage.py seed_data`:

| Username         | Password     | Role         | Department           | Use For                     |
|-----------------|-------------|-------------|---------------------|-----------------------------|
| admin@cccplc.net | admin123    | Admin (superuser) | Executive Mgmt  | Create procedures, manage all |
| john.doe@cccplc.net | manager123 | Manager (staff) | Engagements      | Create procedures, review     |
| jane.smith@cccplc.net | staff123  | Staff        | Accounting          | Trainee (complete training)   |
| mike.tech@cccplc.net | it123     | Staff        | IT                  | Trainee (complete training)   |
| sarah.comply@cccplc.net | comply123 | Compliance (staff) | Compliance   | Audit & evidence review       |

### How to Login
1. Open `http://localhost:3000/login`
2. Enter email and password from the table above
3. You'll be redirected to the dashboard

---

## 2. Phase 1: Create a Procedure (Author)

**Login as**: `admin@cccplc.net` (or any admin/manager)

### Via UI
1. Navigate to **Workflows** page (`http://localhost:3000/workflows`)
2. Click the **Procedures** tab
3. Click **"New Procedure"** button
4. Fill in the metadata form:
   - **Title**: `Loan Application Processing`
   - **Description**: `Step-by-step procedure for processing new loan applications, including KYC verification, credit assessment, and disbursement.`
   - **Department**: Select `Engagements` from dropdown
   - **Tags**: Add `loans`, `onboarding`, `compliance`
5. Click **"Create Procedure"**
6. You'll be redirected to `/procedures/{id}/edit`

### Via API (curl)
```bash
# Get auth token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Save the access token, then:
curl -X POST http://localhost:8000/api/v1/procedures/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Loan Application Processing",
    "description": "Step-by-step procedure for processing new loan applications.",
    "department": 23,
    "tags": ["loans", "onboarding", "compliance"]
  }'
```

**Expected**: 201 Created. Response includes `id` (UUID).
**Procedure state**: `draft`

---

## 3. Phase 2: Add Steps to the Procedure

**Login as**: Same author (admin)

### Via UI
1. After creating, you're on the edit page (`/procedures/{id}/edit`)
2. Click the **"Steps"** tab
3. Click **"Add Step"** for each step below:

| # | Title | What to Enter |
|---|-------|---------------|
| 1 | Introduction to Loan Products | Set type to `informational`. Add description text. Toggle `must_view` gate ON. |
| 2 | KYC Verification Process | Set type to `action_required`. Add description. Toggle `must_view` + `must_open_manual` gates ON. Upload a PDF attachment (KYC manual). |
| 3 | Credit Assessment Guidelines | Set type to `informational`. Toggle `must_view` + `must_complete_media` gates ON. |
| 4 | Loan Approval Workflow | Set type to `action_required`. Toggle `requires_quiz` gate ON. |
| 5 | AML Compliance Checks | Set type to `action_required`. Toggle `must_open_manual` + `requires_quiz` ON. |
| 6 | Disbursement & Documentation | Set type to `informational`. Toggle `must_view` gate ON. |

### Via API
```bash
# Add Step 1
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/steps/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Loan Products",
    "step_type": "text",
    "description": "Overview of all loan products offered by CCC PLC...",
    "order": 1,
    "is_mandatory": true,
    "estimated_duration_minutes": 15
  }'

# Repeat for steps 2-6 with appropriate fields...

# Upload attachment to a step
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/steps/{step_id}/attachments/ \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/kyc-manual.pdf" \
  -F "title=KYC Verification Manual"
```

### Adding a Quiz (for Step 4)
```bash
# Create quiz
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/quizzes/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Loan Approval Knowledge Check",
    "quiz_type": "step_level",
    "passing_score_percent": 80,
    "max_attempts": 3,
    "time_limit_minutes": 15,
    "shuffle_questions": true,
    "shuffle_answers": true,
    "show_correct_answers_after": true,
    "step": "{step_4_id}"
  }'

# Add question to quiz
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/quizzes/{quiz_id}/questions/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is the maximum unsecured loan amount?",
    "question_type": "multiple_choice",
    "points": 10,
    "is_mandatory": true,
    "order": 1,
    "options": [
      {"text": "₦1M", "is_correct": false, "order": 1},
      {"text": "₦5M", "is_correct": true, "order": 2},
      {"text": "₦10M", "is_correct": false, "order": 3},
      {"text": "₦20M", "is_correct": false, "order": 4}
    ]
  }'
```

---

## 4. Phase 3: Submit for Review (Workflow)

**Login as**: Same author (admin)

### Via UI
1. On the procedure edit page, click **"Submit for Review"** (purple button, top-right)
2. Select reviewers from the list (e.g., `john.doe@cccplc.net`)
3. Set priority and due days
4. Click submit

### Via API
```bash
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/submit-for-review/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewers": [16],
    "priority": "HIGH",
    "due_days": 5
  }'
```

**Expected**:
- Procedure state changes: `draft` → `in_review`
- A WorkflowInstance is created linking to this procedure
- WorkflowTasks are created for each reviewer
- Reviewers see the task in their "My Tasks" inbox

---

## 5. Phase 4: Review & Approve (Reviewer)

**Login as**: `john.doe@cccplc.net` (the assigned reviewer)

### Via UI
1. Navigate to **Workflows** (`http://localhost:3000/workflows`)
2. Click the **"My Tasks"** tab
3. You should see a pending review task for "Loan Application Processing"
4. Click the task to view details
5. Review the procedure content and steps
6. Add comments on specific steps if needed:
   - Click a step → "Add Comment" → Type feedback
7. Click **"Approve"** (or "Reject" with reason)

### Via API
```bash
# List my tasks
curl http://localhost:8000/api/v1/workflows/tasks/ \
  -H "Authorization: Bearer <JOHN_TOKEN>"

# Approve the task
curl -X POST http://localhost:8000/api/v1/workflows/tasks/{task_id}/take-action/ \
  -H "Authorization: Bearer <JOHN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "comment": "Procedure looks comprehensive. Approved."
  }'
```

**Expected**:
- If approved: Procedure state → `approved`
- If rejected: Procedure state → `draft` (author needs to revise)
- Step comments are visible to the author

---

## 6. Phase 5: Publish a Version

**Login as**: `admin@cccplc.net` (original author)

### Via API
```bash
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/publish/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "effective_from": "2026-03-15",
    "expires_on": "2027-03-15",
    "changelog": "Initial version of Loan Application Processing procedure."
  }'
```

**Expected**:
- Creates an **immutable ProcedureVersion** (Version 1)
- All steps, quizzes, questions, attachments are snapshot-copied into version tables
- Procedure state → `published`
- `current_version` → 1
- The draft procedure can now be edited for future versions without affecting Version 1

### Verify
```bash
# List versions
curl http://localhost:8000/api/v1/procedures/{procedure_id}/versions/ \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 7. Phase 6: Assign Training

**Login as**: `admin@cccplc.net`

### Via API
```bash
# Assign to jane.smith and mike.tech (bulk assignment)
curl -X POST http://localhost:8000/api/v1/procedures/assignments/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "procedure_version_id": "{version_id}",
    "assignees": [18, 19],
    "due_date": "2026-04-10"
  }'

# You can also assign by department or role:
# "departments": [22, 23]   — assigns all active users in those departments
# "roles": ["Manager"]      — assigns all users with that role
```

**Expected**:
- Assignments created with status `assigned`
- Trainees see the assignment on their training page

### Verify Assignments
```bash
curl http://localhost:8000/api/v1/procedures/assignments/ \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 8. Phase 7: Complete Training (Trainee)

**Login as**: `jane.smith@cccplc.net` (the assigned trainee)

### Via UI
1. Navigate to **My Training** (`http://localhost:3000/training`)
2. You should see "Loan Application Processing" assignment
3. Click **"Start Training"**
4. Progress through each step:
   - **Step 1**: Read the content → click "Mark as Viewed" → "Complete Step"
   - **Step 2**: Read content → click "Open Manual" (download/view PDF) → "Complete Step"
   - **Step 3**: Read content → watch video → "Complete Step"
   - **Step 4**: Read content → take quiz → answer questions → submit → must score ≥80%
   - **Step 5**: (may be skipped by branch condition based on role)
   - **Step 6**: Read content → "Complete Step"
5. Click **"Complete Training"**

### Via API (step by step)
```bash
# Login as jane.smith
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "jane.smith", "password": "staff123"}'

# Start training (using assignment ID)
curl -X POST http://localhost:8000/api/v1/procedures/training/{assignment_id}/start_training/ \
  -H "Authorization: Bearer <JANE_TOKEN>"

# Response includes the training attempt with step_completions list.
# Note the attempt_id and each version_step_id.

# Start Step 1
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/start_step/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_step_id": "{step_1_version_id}"}'

# View Step 1 (satisfies must_view gate)
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/view_step/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_step_id": "{step_1_version_id}"}'

# Complete Step 1
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/complete_step/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_step_id": "{step_1_version_id}"}'

# For steps with must_open_manual gate:
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/manual_opened/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_step_id": "{step_2_version_id}"}'

# For steps with must_complete_media gate:
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/media_completed/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_step_id": "{step_3_version_id}"}'

# For steps with quiz:
# Start quiz
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/start_quiz/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"version_quiz_id": "{version_quiz_id}"}'

# Submit quiz answers
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/submit_quiz/ \
  -H "Authorization: Bearer <JANE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "quiz_attempt_id": "{quiz_attempt_id}",
    "responses": [
      {
        "question_id": "{version_question_id}",
        "selected_options": ["{correct_option_id}"]
      }
    ]
  }'

# Complete the entire training
curl -X POST http://localhost:8000/api/v1/procedures/training/{attempt_id}/complete_training/ \
  -H "Authorization: Bearer <JANE_TOKEN>"
```

**Expected**:
- Each step transitions: `not_started` → `started` → `viewed` → `completed`
- Quiz is graded automatically, score calculated
- Training attempt status → `passed` (if all quizzes passed) or `failed`
- Assignment status → `completed` with final score

---

## 9. Phase 8: Evidence & Audit (Compliance)

**Login as**: `sarah.comply@cccplc.net` (compliance auditor) or `admin@cccplc.net`

### View Audit Log
```bash
curl http://localhost:8000/api/v1/procedures/audit-log/ \
  -H "Authorization: Bearer <TOKEN>"
```

**Returns**: Chronological log of all actions:
- `created` — Procedure created
- `submitted_for_review` — Sent to reviewers
- `approved` — Reviewer approved
- `published` — Version published
- `training_started` — Trainee began attempt
- `step_completed` — Trainee completed a step
- `quiz_passed` / `quiz_failed` — Quiz results
- `training_completed` — Training finished

### View Evidence
```bash
curl http://localhost:8000/api/v1/procedures/evidence/ \
  -H "Authorization: Bearer <TOKEN>"
```

### Export Evidence
```bash
# Export as PDF
curl http://localhost:8000/api/v1/procedures/evidence/export/?format=pdf \
  -H "Authorization: Bearer <TOKEN>" -o evidence.pdf

# Export as CSV
curl http://localhost:8000/api/v1/procedures/evidence/export/?format=csv \
  -H "Authorization: Bearer <TOKEN>" -o evidence.csv
```

---

## 10. Phase 9: Versioning & Recertification

When the loan policy changes, the author creates a new version:

### Step 1: Edit the Draft Procedure
The draft procedure can be edited at any time (it doesn't affect published versions):
```bash
# Update procedure
curl -X PATCH http://localhost:8000/api/v1/procedures/{procedure_id}/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated for 2027 loan policy changes."}'

# Add new step, update existing steps, etc.
```

### Step 2: Submit for Review Again
Same flow as Phase 3. State: `published` → `in_review`

### Step 3: Approve and Publish Version 2
```bash
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/publish/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "effective_from": "2027-04-01",
    "expires_on": "2028-04-01",
    "changelog": "Updated credit limits and added new AML requirements."
  }'
```

### Step 4: Compare Versions
```bash
curl "http://localhost:8000/api/v1/procedures/{procedure_id}/versions/diff/?from_version=1&to_version=2" \
  -H "Authorization: Bearer <TOKEN>"
```

### Step 5: Retire Old Version
```bash
curl -X POST http://localhost:8000/api/v1/procedures/{procedure_id}/versions/1/retire/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Superseded by Version 2 with updated loan policies."}'
```

### Step 6: Assign Version 2 to Employees (Recertification)
Create new assignments pointing to the Version 2 `procedure_version` ID.

---

## 11. Workflow Templates (Standalone)

Workflow templates are reusable approval flows that can be applied to documents or procedures.

### Create a Template

**Via UI**:
1. Go to Workflows (`/workflows`) → **Templates** tab
2. Click **"Create Template"**
3. You'll be taken to the Workflow Designer (`/workflows/designer`)
4. Fill in: name, description, category, steps (approval chain), due days

**Via API**:
```bash
curl -X POST http://localhost:8000/api/v1/workflows/templates/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Approval",
    "description": "Standard 2-step approval for documents",
    "category": "APPROVAL",
    "is_active": true,
    "default_priority": "MEDIUM",
    "default_due_days": 5,
    "steps": [
      {"name": "Manager Review", "order": 1, "step_type": "APPROVAL", "required_approvals": 1},
      {"name": "Final Sign-off", "order": 2, "step_type": "APPROVAL", "required_approvals": 1}
    ]
  }'
```

### Start a Workflow from Template
```bash
curl -X POST http://localhost:8000/api/v1/workflows/instances/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "{template_id}",
    "target_id": "{document_or_procedure_id}",
    "target_type": "document",
    "priority": "HIGH",
    "notes": "Urgent approval needed for Q1 report."
  }'
```

---

## 12. API Quick Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login/` | Login (returns JWT tokens) |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token |

### Procedures
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/` | List procedures |
| POST | `/api/v1/procedures/` | Create procedure |
| GET | `/api/v1/procedures/{id}/` | Get procedure detail |
| PATCH | `/api/v1/procedures/{id}/` | Update procedure |
| DELETE | `/api/v1/procedures/{id}/` | Delete procedure |
| POST | `/api/v1/procedures/{id}/submit-for-review/` | Submit for review |
| POST | `/api/v1/procedures/{id}/publish/` | Publish version |

### Steps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/{id}/steps/` | List steps |
| POST | `/api/v1/procedures/{id}/steps/` | Create step |
| PATCH | `/api/v1/procedures/{id}/steps/{step_id}/` | Update step |
| DELETE | `/api/v1/procedures/{id}/steps/{step_id}/` | Delete step |
| POST | `/api/v1/procedures/{id}/steps/{step_id}/attachments/` | Upload attachment |

### Quizzes & Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/{id}/quizzes/` | List quizzes |
| POST | `/api/v1/procedures/{id}/quizzes/` | Create quiz |
| POST | `/api/v1/procedures/{id}/quizzes/{quiz_id}/questions/` | Add question |

### Versions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/{id}/versions/` | List versions |
| GET | `/api/v1/procedures/{id}/versions/{num}/` | Get version detail |
| GET | `/api/v1/procedures/{id}/versions/diff/` | Compare versions |
| POST | `/api/v1/procedures/{id}/versions/{num}/retire/` | Retire version |

### Assignments & Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/assignments/` | List assignments |
| POST | `/api/v1/procedures/assignments/` | Create assignment |
| GET | `/api/v1/procedures/assignments/dashboard/` | Assignment dashboard |
| POST | `/api/v1/procedures/training/{assignment_id}/start_training/` | Start training |
| GET | `/api/v1/procedures/training/{attempt_id}/` | Get attempt state |
| POST | `/api/v1/procedures/training/{attempt_id}/start_step/` | Start step |
| POST | `/api/v1/procedures/training/{attempt_id}/view_step/` | Mark step viewed |
| POST | `/api/v1/procedures/training/{attempt_id}/manual_opened/` | Mark manual opened |
| POST | `/api/v1/procedures/training/{attempt_id}/media_completed/` | Mark media completed |
| POST | `/api/v1/procedures/training/{attempt_id}/complete_step/` | Complete step |
| POST | `/api/v1/procedures/training/{attempt_id}/start_quiz/` | Start quiz |
| POST | `/api/v1/procedures/training/{attempt_id}/submit_quiz/` | Submit quiz |
| POST | `/api/v1/procedures/training/{attempt_id}/complete_training/` | Complete training |

### Evidence & Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/procedures/evidence/` | List evidence |
| GET | `/api/v1/procedures/evidence/export/` | Export evidence |
| GET | `/api/v1/procedures/audit-log/` | View audit log |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workflows/tasks/` | My tasks inbox |
| POST | `/api/v1/workflows/tasks/{id}/take-action/` | Take action (approve/reject) |
| GET | `/api/v1/workflows/templates/` | List templates |
| POST | `/api/v1/workflows/templates/` | Create template |
| POST | `/api/v1/workflows/instances/` | Start workflow |
| GET | `/api/v1/workflows/instances/` | List workflows |

---

## 13. Troubleshooting

### Common Issues

**"Method Not Allowed" on POST /procedures/**
- Cause: URL routing conflict. The `assignment_router` was intercepting the request.
- Fix: Use `SimpleRouter` instead of `DefaultRouter` for the assignment router.

**"department: Incorrect type. Expected pk value, received str."**
- Cause: Department dropdown not loaded (empty Redux store).
- Fix: The form now dispatches `fetchDepartments()` on mount.

**"Assignment not found or not available."**
- Cause: Trying to start training on someone else's assignment. Non-admin users can only start their own.
- Fix: Login as the assigned trainee, or use the admin account.

**Procedure created but redirected to /procedures/undefined/edit**
- Cause: `ProcedureCreateSerializer` didn't include `id` in response fields.
- Fix: Added `id` to the serializer fields.

**ERR_CONTENT_LENGTH_MISMATCH on API calls**
- Cause: Django's `GZipMiddleware` conflicts with the dev server.
- Fix: Disabled `GZipMiddleware` in settings. Use nginx gzip in production.

**Empty procedure list (no crash but no data)**
- Cause: No procedures exist yet, or filter doesn't match.
- Fix: Create procedures or clear filters.

**"Object of type UUID is not JSON serializable" on start_training**
- Cause: User roles returned as UUID objects in trainee_context JSON.
- Fix: Role UUIDs are now stringified before serialization.

**"X step(s) are not yet completed" on complete_training**
- Cause: Steps with quiz have status `quiz_passed` instead of `completed`.
- Fix: `complete_training` now accepts `quiz_passed` as a valid completed status.

**Quiz field name mismatches**
- Use `passing_score_percent` (not `passing_score`), `show_correct_answers_after` (boolean, not string)
- Quiz types: `step_level` or `end_of_procedure` (not `step`)
- Question/option `text` field (not `question_text` or `option_text`)

**Assignment field names**
- Use `procedure_version_id` (UUID), `assignees` (list of integer user IDs), `due_date`
- NOT `procedure_version`, `assignee` (singular)

### Reseed Test Data
If you need a clean slate:
```bash
cd backend
python manage.py seed_data --clear
python manage.py seed_data
python manage.py generate_procedure_seed_data
```

### Swagger API Docs
Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **ReDoc**: `http://localhost:8000/api/redoc/`
- **OpenAPI Schema**: `http://localhost:8000/api/schema/`

---

## Visual Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│                    PROCEDURE LIFECYCLE                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Author (Admin/Manager)                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  CREATE   │───>│ADD STEPS │───>│ SUBMIT FOR REVIEW│   │
│  │  (draft)  │    │ + quizzes│    │   (in_review)    │   │
│  └──────────┘    └──────────┘    └────────┬─────────┘   │
│                                           │              │
│  Reviewer                                 ▼              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  REVIEW: Add comments, Approve or Reject          │   │
│  └──────────┬───────────────────────┬───────────────┘   │
│             │ Rejected              │ Approved           │
│             ▼                       ▼                    │
│    Back to draft              ┌──────────┐              │
│    (author revises)           │ PUBLISH  │              │
│                               │ (v1, v2) │              │
│                               └────┬─────┘              │
│  Admin                             │                     │
│  ┌─────────────────────────────────▼────────────────┐   │
│  │  ASSIGN to employees (with due date)              │   │
│  └─────────────────────────────────┬────────────────┘   │
│                                    │                     │
│  Trainee                           ▼                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  START TRAINING                                    │   │
│  │  ├─ Step 1: View content ✓                         │   │
│  │  ├─ Step 2: View + open manual ✓                   │   │
│  │  ├─ Step 3: View + watch video ✓                   │   │
│  │  ├─ Step 4: View + pass quiz (80%) ✓               │   │
│  │  ├─ Step 5: (skipped by branch condition) ─        │   │
│  │  └─ Step 6: View ✓                                 │   │
│  │                                                    │   │
│  │  COMPLETE TRAINING → Score → Pass/Fail             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Compliance Auditor                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  VIEW AUDIT LOG + EXPORT EVIDENCE (PDF/CSV)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: 2026-03-10
**Applies to**: DFC Application — Procedures & Workflows Module
