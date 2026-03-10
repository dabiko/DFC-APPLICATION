"""
Shared test helpers and fixtures for procedure tests.
"""

from datetime import date, timedelta
from apps.organizations.models import Organization
from apps.users.models import CustomUser, Department
from apps.procedures.models import (
    Procedure, ProcedureStep,
    ProcedureVersion, ProcedureVersionStep,
    Quiz, Question, AnswerOption,
    VersionQuiz, VersionQuestion, VersionAnswerOption,
    ProcedureAssignment, TrainingAttempt, StepCompletion,
    QuizAttempt, QuestionResponse,
)


class ProcedureTestMixin:
    """Mixin providing common setup and factory methods for procedure tests."""

    _user_counter = 0

    def setUp(self):
        super().setUp()
        self.org = Organization.objects.create(
            name='Test Org', domain='testorg.com', slug='testorg',
        )
        self.department = Department.objects.create(
            name='Test Department', organization=self.org,
        )
        self.admin = self.create_user('admin@test.com', is_staff=True)

    def create_user(self, email, is_staff=False):
        ProcedureTestMixin._user_counter += 1
        username = email.split('@')[0].replace('.', '_') + f'_{ProcedureTestMixin._user_counter}'
        return CustomUser.objects.create_user(
            username=username,
            email=email,
            password='testpass123',
            employee_id=f'EMP{ProcedureTestMixin._user_counter:05d}',
            first_name=email.split('@')[0].title(),
            last_name='User',
            organization=self.org,
            department=self.department,
            is_staff=is_staff,
        )

    def create_procedure(self, title='Test Procedure', **kwargs):
        defaults = dict(
            organization=self.org,
            title=title,
            description='Test description',
            created_by=self.admin,
            department=self.department,
        )
        defaults.update(kwargs)
        return Procedure.objects.create(**defaults)

    def create_published_procedure(self, title='Published Procedure', num_steps=3):
        """Create a procedure with steps and a published version."""
        proc = self.create_procedure(title=title)
        steps = []
        for i in range(1, num_steps + 1):
            steps.append(ProcedureStep.objects.create(
                procedure=proc, title=f'Step {i}', order=i,
                estimated_duration_minutes=10,
            ))

        version = ProcedureVersion.objects.create(
            procedure=proc, version_number=1,
            title=proc.title, description=proc.description,
            published_by=self.admin, approved_by=self.admin,
            effective_from=date.today(),
            expires_on=date.today() + timedelta(days=365),
        )
        proc.state = Procedure.State.PUBLISHED
        proc.current_version = 1
        proc.save()

        for step in steps:
            ProcedureVersionStep.objects.create(
                version=version, original_step_id=step.id,
                title=step.title, description=step.description, order=step.order,
                estimated_duration_minutes=step.estimated_duration_minutes,
            )

        return version

    def create_quiz_with_questions(self, proc, step=None):
        """Create a quiz with sample questions and options."""
        quiz_type = 'step_level' if step else 'end_of_procedure'
        quiz = Quiz.objects.create(
            procedure=proc, step=step, quiz_type=quiz_type,
            title='Test Quiz', passing_score_percent=80, max_attempts=3,
        )
        # Multiple choice
        q1 = Question.objects.create(
            quiz=quiz, question_type='multiple_choice',
            text='What is 2+2?', order=1, points=10, is_mandatory=True,
        )
        AnswerOption.objects.create(question=q1, text='4', is_correct=True, order=1)
        AnswerOption.objects.create(question=q1, text='5', is_correct=False, order=2)

        # True/False
        q2 = Question.objects.create(
            quiz=quiz, question_type='true_false',
            text='The sky is blue.', order=2, points=5,
        )
        AnswerOption.objects.create(question=q2, text='True', is_correct=True, order=1)
        AnswerOption.objects.create(question=q2, text='False', is_correct=False, order=2)

        # Short answer
        q3 = Question.objects.create(
            quiz=quiz, question_type='short_answer',
            text='Describe compliance.', order=3, points=5,
            auto_grade_keywords=['rules', 'regulations', 'adherence'],
        )

        return quiz

    def create_versioned_quiz(self, version, version_step=None):
        """Create a versioned quiz with questions for testing grading."""
        vq = VersionQuiz.objects.create(
            version=version, version_step=version_step,
            original_quiz_id='00000000-0000-0000-0000-000000000000',
            quiz_type='step_level' if version_step else 'end_of_procedure',
            title='Test Quiz', passing_score_percent=80, max_attempts=3,
            shuffle_questions=False, shuffle_answers=False,
            show_correct_answers_after=True,
        )

        vq1 = VersionQuestion.objects.create(
            version_quiz=vq,
            original_question_id='00000000-0000-0000-0000-000000000001',
            question_type='multiple_choice', text='Q1', order=1,
            points=10, is_mandatory=True,
        )
        correct_opt = VersionAnswerOption.objects.create(
            version_question=vq1,
            original_option_id='00000000-0000-0000-0000-000000000010',
            text='Correct', is_correct=True, order=1,
        )
        wrong_opt = VersionAnswerOption.objects.create(
            version_question=vq1,
            original_option_id='00000000-0000-0000-0000-000000000011',
            text='Wrong', is_correct=False, order=2,
        )

        vq2 = VersionQuestion.objects.create(
            version_quiz=vq,
            original_question_id='00000000-0000-0000-0000-000000000002',
            question_type='true_false', text='Q2', order=2,
            points=5, is_mandatory=False,
        )
        true_opt = VersionAnswerOption.objects.create(
            version_question=vq2,
            original_option_id='00000000-0000-0000-0000-000000000020',
            text='True', is_correct=True, order=1,
        )
        false_opt = VersionAnswerOption.objects.create(
            version_question=vq2,
            original_option_id='00000000-0000-0000-0000-000000000021',
            text='False', is_correct=False, order=2,
        )

        return vq

    def create_assignment_with_attempt(self, version, trainee=None):
        """Create an assignment with a training attempt."""
        if trainee is None:
            trainee = self.create_user('trainee@test.com')

        assignment = ProcedureAssignment.objects.create(
            organization=self.org,
            procedure_version=version,
            assignee=trainee,
            assigned_by=self.admin,
            due_date=date.today() + timedelta(days=14),
        )
        attempt = TrainingAttempt.objects.create(
            assignment=assignment, attempt_number=1,
            total_steps=version.steps.count(),
        )
        return assignment, attempt
