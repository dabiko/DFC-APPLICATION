# Branch Conditions Guide — Procedure Builder

## What Branch Conditions Do

Branch conditions make a procedure **adaptive** — instead of every trainee going through the same steps in order, the system **shows or hides steps based on who the trainee is and what they've done so far**.

## The Structure: AND/OR Logic Trees

Conditions use a nested tree structure with two logical operators:

- **ALL (AND)** — every condition must be true for the step to show
- **ANY (OR)** — at least one condition must be true

These can be nested up to 2 levels deep. For example:

```
ALL of:
  ├─ role equals "Manager"
  └─ ANY of:
       ├─ department equals "Compliance"
       └─ department equals "Risk"
```

This means: "Show this step only to Managers who are in either Compliance or Risk."

## Available Condition Fields

| Field | What it checks | Example |
|-------|---------------|---------|
| **role** | Trainee's RBAC role | `role equals "admin"` |
| **department** | Trainee's department | `department in ["Compliance", "Audit"]` |
| **step_completed** | Whether a previous step was completed | `step_completed(Step 3) equals true` |
| **quiz_score** | Score on a specific quiz | `quiz_score(Quiz 1) >= 80` |
| **quiz_passed** | Whether a quiz was passed | `quiz_passed(Quiz 1) equals true` |
| **time_elapsed** | Minutes spent in training | `time_elapsed >= 30` |
| **attempt_count** | Number of training attempts | `attempt_count >= 2` |
| **assignment_source** | How they were assigned | `assignment_source equals "recertification"` |
| **custom_field** | Extensible field for anything else | `custom_field("region") equals "EMEA"` |

## Supported Operators

| Operator | Meaning | Used with |
|----------|---------|-----------|
| `eq` | Equals | All fields |
| `neq` | Not equals | All fields |
| `in` | Is one of (list) | role, department, assignment_source |
| `not_in` | Is not one of (list) | role, department |
| `gt` | Greater than | quiz_score, time_elapsed, attempt_count |
| `gte` | Greater than or equal | quiz_score, time_elapsed, attempt_count |
| `lt` | Less than | quiz_score, time_elapsed, attempt_count |
| `lte` | Less than or equal | quiz_score, time_elapsed, attempt_count |
| `contains` | Contains text | custom_field |

## Real-World Examples for CCC PLC

### 1. Role-Based Paths

**Procedure: Anti-Money Laundering (AML) Training**

- Steps 1-4: Everyone (AML basics)
- Step 5: `role in ["manager", "admin"]` — Escalation procedures (managers only)
- Step 6: `department equals "Compliance"` — Regulatory reporting (compliance team only)
- Step 7: Everyone (final assessment)

Result: A compliance manager sees all 7 steps. A regular member in Accounting sees only steps 1-4 and 7.

### 2. Performance-Based Branching

**Procedure: KYC Document Verification**

- Step 1: KYC fundamentals
- Step 2: Quiz on fundamentals
- Step 3: `quiz_score(Step 2 Quiz) >= 80` — Advanced verification techniques (only if they scored well)
- Step 4: `quiz_passed(Step 2 Quiz) equals false` — Remedial training (only if they failed)
- Step 5: Final assessment

Result: Trainees who understand the basics skip remedial content. Those who struggle get extra help.

### 3. Conditional Compliance Requirements

**Procedure: New Employee Onboarding**

- Steps 1-3: Everyone (company policies)
- Step 4: `department equals "IT"` — Cybersecurity protocols
- Step 5: `department in ["Accounting", "Audit"]` — Financial controls training
- Step 6: `assignment_source equals "recertification"` — What's changed since last year (only for returning staff)
- Step 7: Everyone (sign-off)

### 4. Progressive Difficulty

**Procedure: Regulatory Compliance Certification**

- Step 1: Introduction
- Step 2: Basic regulations quiz
- Step 3: `quiz_score(Step 2) >= 90` — Skip to advanced topics
- Step 4: `quiz_score(Step 2) < 90` — Intermediate review material
- Step 5: Advanced assessment

## How It Works During Training

1. **Training starts** — the system builds a trainee context with their role, department, and empty result containers
2. **Each step is evaluated** — if the branch condition returns `true`, status = `not_started` (visible). If `false`, status = `skipped` (hidden)
3. **As training progresses** — completing steps and submitting quizzes updates the context dynamically
4. **Steps can become visible later** — if a quiz score triggers a branch condition on a later step, that step appears after the quiz is submitted

## When to Use vs. Not Use

**Use branch conditions when:**

- Different roles need different content within the same procedure
- You want performance-based paths (remedial vs. advanced)
- Recertification trainees should skip what hasn't changed
- Compliance requirements differ by department

**Don't use them when:**

- Every trainee should see every step (just leave branch condition empty — `null` means always show)
- The procedure is simple and linear
- You'd end up with more conditions than steps (probably better to create separate procedures)

## Technical Reference

### Trainee Context (built at training start)

```json
{
  "role": ["manager"],
  "department": "compliance",
  "job_title": "Compliance Officer",
  "step_results": {},
  "quiz_scores": {},
  "custom_fields": {}
}
```

- `step_results` — populated as steps are completed
- `quiz_scores` — populated as quizzes are submitted
- `custom_fields` — extensible for future use

### Condition JSON Format

```json
{
  "all": [
    { "field": "role", "operator": "eq", "value": "manager" },
    {
      "any": [
        { "field": "department", "operator": "eq", "value": "compliance" },
        { "field": "quiz_score", "operator": "gte", "value": 80, "quiz_id": "uuid-here" }
      ]
    }
  ]
}
```

### Key Rule

A step with **no branch condition** (`null`) is always shown to everyone. Branch conditions are optional — only add them when you need conditional paths.

---

**Last Updated:** 2026-03-17
