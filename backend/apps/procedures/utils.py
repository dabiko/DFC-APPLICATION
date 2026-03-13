"""
Utility functions for the Procedures app.

Phase C: Quiz grading engine (spec Section 9.2)
Phase D: Version diff engine
Phase E: Branch condition evaluator
Phase F: Training progression logic & assignment creation
"""


# ---------------------------------------------------------------------------
# Phase C: Quiz Grading Engine
# ---------------------------------------------------------------------------

def grade_quiz_attempt(quiz_attempt):
    """
    Grade all responses in a quiz attempt.
    Returns: { score_earned, score_possible, score_percent, passed, passed_all_mandatory }
    """
    score_earned = 0
    score_possible = 0
    all_mandatory_correct = True

    for response in quiz_attempt.responses.select_related('version_question'):
        question = response.version_question
        score_possible += question.points

        is_correct = grade_question(response, question)
        response.is_correct = is_correct

        if is_correct:
            response.points_earned = question.points
            score_earned += question.points
        else:
            response.points_earned = 0
            if question.is_mandatory:
                all_mandatory_correct = False

        response.save()

    score_percent = (score_earned / score_possible * 100) if score_possible > 0 else 0
    passed = (
        score_percent >= quiz_attempt.version_quiz.passing_score_percent
        and all_mandatory_correct
    )

    return {
        'score_earned': score_earned,
        'score_possible': score_possible,
        'score_percent': round(score_percent, 2),
        'passed': passed,
        'passed_all_mandatory': all_mandatory_correct,
    }


def grade_question(response, question):
    """Grade a single question response. Returns True/False/None."""

    if question.question_type == 'multiple_choice':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'multi_select':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'true_false':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'short_answer':
        if question.auto_grade_keywords:
            text = response.text_response.lower()
            return any(kw.lower() in text for kw in question.auto_grade_keywords)
        return None  # Requires manual grading

    elif question.question_type == 'ordering':
        if response.submitted_order is None:
            return False
        correct_order = list(
            question.options.order_by('correct_order').values_list('id', flat=True)
        )
        return [str(x) for x in response.submitted_order] == [str(x) for x in correct_order]

    return False


# ---------------------------------------------------------------------------
# Phase D: Version Diff Engine
# ---------------------------------------------------------------------------

def compute_version_diff(from_version, to_version):
    """Compare two published versions and return structured diff."""

    diff = {
        'from_version': from_version.version_number,
        'to_version': to_version.version_number,
        'metadata_changes': {},
        'step_changes': [],
        'attachment_changes': [],
        'quiz_changes': [],
    }

    # Metadata diff
    for field in ['title', 'description']:
        from_val = getattr(from_version, field)
        to_val = getattr(to_version, field)
        if from_val != to_val:
            diff['metadata_changes'][field] = {'from': from_val, 'to': to_val}

    # Tags diff
    from_tags = set(from_version.tags or [])
    to_tags = set(to_version.tags or [])
    if from_tags != to_tags:
        diff['metadata_changes']['tags'] = {
            'added': list(to_tags - from_tags),
            'removed': list(from_tags - to_tags),
        }

    # Step diff — match by original_step_id
    from_steps = {s.original_step_id: s for s in from_version.steps.all()}
    to_steps = {s.original_step_id: s for s in to_version.steps.all()}

    all_step_ids = set(from_steps.keys()) | set(to_steps.keys())

    for step_id in all_step_ids:
        from_step = from_steps.get(step_id)
        to_step = to_steps.get(step_id)

        if from_step and not to_step:
            diff['step_changes'].append({
                'type': 'removed',
                'step_order': from_step.order,
                'from_step_id': str(from_step.id),
                'step_data': {'title': from_step.title},
            })
        elif to_step and not from_step:
            diff['step_changes'].append({
                'type': 'added',
                'step_order': to_step.order,
                'to_step_id': str(to_step.id),
                'step_data': {'title': to_step.title},
            })
        else:
            changes = {}
            for field in ['title', 'description', 'order', 'branch_condition',
                          'require_manual_open', 'require_media_completion', 'require_quiz_pass',
                          'require_read_content']:
                from_val = getattr(from_step, field)
                to_val = getattr(to_step, field)
                if from_val != to_val:
                    changes[field] = {'from': from_val, 'to': to_val}

            if changes:
                diff['step_changes'].append({
                    'type': 'modified',
                    'step_order': to_step.order,
                    'from_step_id': str(from_step.id),
                    'to_step_id': str(to_step.id),
                    'changes': changes,
                })

    return diff


# ---------------------------------------------------------------------------
# Phase E: Branch Condition Evaluator
# ---------------------------------------------------------------------------

def evaluate_branch_condition(condition, context):
    """
    Evaluate a branch condition against trainee context.

    Args:
        condition: JSON condition dict (or None for always-true)
        context: dict with keys like 'role', 'department', 'job_title',
                 'step_results', 'quiz_scores', etc.

    Returns:
        bool: Whether the condition is satisfied.
    """
    if condition is None:
        return True

    if not isinstance(condition, dict):
        return False

    # Logical operators
    if 'all' in condition:
        return all(evaluate_branch_condition(sub, context) for sub in condition['all'])

    if 'any' in condition:
        return any(evaluate_branch_condition(sub, context) for sub in condition['any'])

    # Leaf condition: { field, operator, value, [step_id] }
    field = condition.get('field')
    operator = condition.get('operator')
    expected = condition.get('value')

    if not field or not operator:
        return False

    # Resolve actual value from context
    if field == 'step_result':
        step_id = condition.get('step_id')
        actual = context.get('step_results', {}).get(str(step_id))
    elif field == 'quiz_score':
        quiz_id = condition.get('quiz_id')
        actual = context.get('quiz_scores', {}).get(str(quiz_id))
    elif field == 'custom_field':
        key = condition.get('key', '')
        actual = context.get('custom_fields', {}).get(key)
    else:
        actual = context.get(field)

    return apply_operator(operator, actual, expected)


def apply_operator(operator, actual, expected):
    """Apply a comparison operator."""
    if actual is None:
        return False

    ops = {
        'eq': lambda a, e: a == e,
        'neq': lambda a, e: a != e,
        'in': lambda a, e: a in e if isinstance(e, list) else False,
        'not_in': lambda a, e: a not in e if isinstance(e, list) else True,
        'gt': lambda a, e: float(a) > float(e),
        'gte': lambda a, e: float(a) >= float(e),
        'lt': lambda a, e: float(a) < float(e),
        'lte': lambda a, e: float(a) <= float(e),
        'contains': lambda a, e: str(e).lower() in str(a).lower(),
    }

    op_func = ops.get(operator)
    if not op_func:
        return False

    try:
        return op_func(actual, expected)
    except (ValueError, TypeError):
        return False


def validate_branch_condition(condition):
    """Validate a branch condition JSON structure. Returns (is_valid, errors)."""
    if condition is None:
        return True, []

    errors = []

    if isinstance(condition, dict):
        if 'all' in condition:
            if not isinstance(condition['all'], list):
                errors.append('"all" must be a list')
            else:
                for sub in condition['all']:
                    valid, sub_errors = validate_branch_condition(sub)
                    errors.extend(sub_errors)

        elif 'any' in condition:
            if not isinstance(condition['any'], list):
                errors.append('"any" must be a list')
            else:
                for sub in condition['any']:
                    valid, sub_errors = validate_branch_condition(sub)
                    errors.extend(sub_errors)

        elif 'field' in condition:
            required = ['field', 'operator', 'value']
            for key in required:
                if key not in condition:
                    errors.append(f'Missing required key: {key}')

            valid_fields = ['role', 'department', 'job_title', 'step_result', 'quiz_score', 'custom_field']
            if condition.get('field') not in valid_fields:
                errors.append(f'Invalid field: {condition.get("field")}')

            valid_operators = ['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains']
            if condition.get('operator') not in valid_operators:
                errors.append(f'Invalid operator: {condition.get("operator")}')

            # Field-specific required keys
            field_val = condition.get('field')
            if field_val == 'step_result' and 'step_id' not in condition:
                errors.append('step_result condition requires "step_id"')
            elif field_val == 'quiz_score' and 'quiz_id' not in condition:
                errors.append('quiz_score condition requires "quiz_id"')
            elif field_val == 'custom_field' and 'key' not in condition:
                errors.append('custom_field condition requires "key"')
        else:
            errors.append('Condition must have "all", "any", or "field" key')
    else:
        errors.append('Condition must be a dict')

    return len(errors) == 0, errors


# ---------------------------------------------------------------------------
# Phase F: Training Progression Logic
# ---------------------------------------------------------------------------

def can_advance_to_next_step(step_completion):
    """
    Check if a trainee can advance past a step.
    Returns (can_advance, blocking_reasons).

    When a quiz gate exists and all attempts are exhausted without passing,
    the trainee is allowed to advance (the step is marked as failed rather
    than blocking them permanently).
    """
    version_step = step_completion.version_step
    reasons = []
    quiz_failed_exhausted = False

    if version_step.require_manual_open and not step_completion.manual_opened_at:
        docs = version_step.attachments.filter(
            attachment_type__in=['document', 'manual']
        )
        if docs.exists():
            doc_names = ', '.join(d.title or d.file_name for d in docs[:3])
            reasons.append(f"You must read the document(s): {doc_names}.")
        else:
            reasons.append("You must read the step content and confirm before continuing.")

    if version_step.require_read_content and not step_completion.content_read_at:
        reasons.append("You must read the step content and confirm before continuing.")

    if version_step.require_media_completion and not step_completion.media_completed_at:
        videos = version_step.attachments.filter(attachment_type='video')
        if videos.exists() or version_step.video_url:
            reasons.append("You must watch the video before continuing.")
        else:
            reasons.append("You must complete the media content before continuing.")

    if version_step.require_quiz_pass:
        quiz = version_step.quizzes.first()
        if quiz:
            quiz_attempts = step_completion.attempt.quiz_attempts.filter(
                version_quiz=quiz, completed_at__isnull=False
            )
            has_passed = quiz_attempts.filter(passed=True).exists()
            if not has_passed:
                attempts_used = quiz_attempts.count()
                max_attempts = quiz.max_attempts
                if max_attempts > 0 and attempts_used >= max_attempts:
                    # All attempts exhausted — allow advancing but flag as failed
                    quiz_failed_exhausted = True
                else:
                    reasons.append("You must pass the quiz before continuing.")

    return (len(reasons) == 0, reasons, quiz_failed_exhausted)


def create_assignments(data, assigned_by, org):
    """
    Create individual ProcedureAssignment records from a bulk request.
    Deduplicates users who appear in multiple targets.
    """
    from .models import ProcedureAssignment, ProcedureVersion
    from apps.users.models import CustomUser
    from apps.permissions.models import UserRole

    version = ProcedureVersion.objects.get(id=data['procedure_version_id'])
    due_date = data['due_date']
    max_training_attempts = data.get('max_training_attempts', 0)
    assignee_ids = set()

    # Direct user assignments
    for user_id in data.get('assignees', []):
        assignee_ids.add(str(user_id))

    # Department-based: all active users in department
    for dept_id in data.get('departments', []):
        dept_users = CustomUser.objects.filter(
            department_id=dept_id, is_active=True, organization=org
        ).values_list('id', flat=True)
        assignee_ids.update(str(uid) for uid in dept_users)

    # Role-based: all users with specified roles
    for role_name in data.get('roles', []):
        role_users = UserRole.objects.filter(
            role__name__iexact=role_name, user__organization=org, user__is_active=True
        ).values_list('user_id', flat=True)
        assignee_ids.update(str(uid) for uid in role_users)

    # Deduplicate: skip users already assigned to this version
    existing = ProcedureAssignment.objects.filter(
        procedure_version=version,
        assignee_id__in=assignee_ids,
        status__in=['assigned', 'in_progress']
    ).values_list('assignee_id', flat=True)
    assignee_ids -= set(str(eid) for eid in existing)

    assignments = []
    for user_id in assignee_ids:
        source = _determine_source(data, user_id)
        assignment = ProcedureAssignment.objects.create(
            organization=org,
            procedure_version=version,
            assignee_id=user_id,
            assigned_by=assigned_by,
            assignment_source=source,
            due_date=due_date,
            max_training_attempts=max_training_attempts,
        )
        assignments.append(assignment)

    return assignments


def _determine_source(data, user_id):
    """Determine the assignment source for a given user."""
    if str(user_id) in [str(uid) for uid in data.get('assignees', [])]:
        return 'direct'
    if data.get('departments'):
        return 'department'
    if data.get('roles'):
        return 'role'
    return 'direct'
