"""
Management command to generate seed data for procedures and training.
Run after: python manage.py seed_data
"""

from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.organizations.models import Organization
from apps.users.models import CustomUser, Department
from apps.procedures.models import (
    Procedure, ProcedureStep, StepAttachment,
    ProcedureVersion, ProcedureVersionStep, VersionStepAttachment,
    Quiz, Question, AnswerOption,
    VersionQuiz, VersionQuestion, VersionAnswerOption,
    ProcedureAssignment, TrainingAttempt, StepCompletion,
    QuizAttempt, QuestionResponse,
    ProcedureAuditLog,
)


class Command(BaseCommand):
    help = 'Generate seed data for procedures and training'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing procedure data before seeding',
        )

    def handle(self, *args, **options):
        org = Organization.objects.first()
        if not org:
            self.stderr.write(self.style.ERROR(
                'No organization found. Run `python manage.py seed_data` first.'
            ))
            return

        admin = CustomUser.objects.filter(is_staff=True, organization=org).first()
        if not admin:
            self.stderr.write(self.style.ERROR('No staff user found.'))
            return

        departments = Department.objects.filter(organization=org)
        users = CustomUser.objects.filter(organization=org, is_active=True)

        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing procedure data...'))
            Procedure.objects.filter(organization=org).delete()

        with transaction.atomic():
            self.stdout.write('Creating procedures...')

            # 1. New Employee Onboarding (Published, v2)
            proc1 = self._create_procedure(
                org, admin,
                title='New Employee Onboarding',
                description='Complete onboarding procedure for new hires at CCC PLC covering '
                            'orientation, IT setup, HR policies, and role-specific training.',
                department=self._get_dept(departments, 'HR'),
                tags=['onboarding', 'hr', 'mandatory'],
            )
            self._create_onboarding_steps(proc1, admin)
            self._create_onboarding_quiz(proc1)
            v1 = self._publish_procedure(proc1, admin, version_number=1, changelog='Initial version')
            self._add_step(proc1, 'Security Awareness', 'Annual security awareness requirements.', 6, 20)
            v2 = self._publish_procedure(proc1, admin, version_number=2, changelog='Added security awareness step')
            self.stdout.write(self.style.SUCCESS(f'  ✓ {proc1.title} (v{proc1.current_version})'))

            # 2. AML Compliance Training (Published, v1)
            proc2 = self._create_procedure(
                org, admin,
                title='AML Compliance Training',
                description='Anti-money laundering awareness and regulatory procedures. '
                            'Covers suspicious transaction reporting and KYC requirements.',
                department=self._get_dept(departments, 'Compliance'),
                tags=['compliance', 'aml', 'mandatory', 'regulatory'],
            )
            self._create_aml_steps(proc2, admin)
            self._create_aml_quiz(proc2)
            v_aml = self._publish_procedure(proc2, admin, version_number=1, changelog='Initial AML training')
            self.stdout.write(self.style.SUCCESS(f'  ✓ {proc2.title} (v{proc2.current_version})'))

            # 3. Loan Processing Procedure (Published, v1)
            proc3 = self._create_procedure(
                org, admin,
                title='Loan Application Processing',
                description='Step-by-step guide for processing loan applications including '
                            'document verification, credit assessment, and approval workflow.',
                department=self._get_dept(departments, 'Engagements'),
                tags=['loans', 'credit', 'processing'],
            )
            self._create_loan_steps(proc3, admin)
            v_loan = self._publish_procedure(proc3, admin, version_number=1, changelog='Initial loan processing guide')
            self.stdout.write(self.style.SUCCESS(f'  ✓ {proc3.title} (v{proc3.current_version})'))

            # 4. Risk Assessment Protocol (In Review)
            proc4 = self._create_procedure(
                org, admin,
                title='Risk Assessment Protocol',
                description='Comprehensive risk assessment methodology for financial products.',
                department=self._get_dept(departments, 'Risk'),
                tags=['risk', 'assessment'],
                state=Procedure.State.IN_REVIEW,
            )
            self._add_step(proc4, 'Risk Identification', 'Identify potential risks.', 1, 30)
            self._add_step(proc4, 'Risk Analysis', 'Analyse and quantify identified risks.', 2, 45)
            self._add_step(proc4, 'Mitigation Planning', 'Develop risk mitigation strategies.', 3, 30)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {proc4.title} (in review)'))

            # 5. Data Privacy Guidelines (Draft)
            proc5 = self._create_procedure(
                org, admin,
                title='GDPR Data Privacy Guidelines',
                description='Data handling procedures compliant with GDPR and local regulations.',
                department=self._get_dept(departments, 'IT'),
                tags=['gdpr', 'privacy', 'data-protection'],
            )
            self._add_step(proc5, 'Data Classification', 'Classify data sensitivity levels.', 1, 15)
            self._add_step(proc5, 'Processing Principles', 'Review GDPR processing principles.', 2, 20)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {proc5.title} (draft)'))

            # Create assignments and training data
            self.stdout.write('Creating assignments and training data...')
            trainees = list(users.exclude(id=admin.id)[:5])

            if trainees and v2:
                self._create_training_data(org, admin, trainees, v2, proc1)
            if trainees and v_aml:
                self._create_aml_assignments(org, admin, trainees, v_aml)

            # Create audit log entries
            self.stdout.write('Creating audit log entries...')
            self._create_audit_entries(org, admin, proc1, v2)

        self.stdout.write(self.style.SUCCESS(
            '\nProcedure seed data created successfully!'
        ))

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _get_dept(self, departments, name_part):
        return departments.filter(name__icontains=name_part).first() or departments.first()

    def _create_procedure(self, org, admin, title, description, department, tags, state=Procedure.State.DRAFT):
        return Procedure.objects.create(
            organization=org,
            title=title,
            description=description,
            state=state,
            current_version=0,
            created_by=admin,
            department=department,
            tags=tags,
        )

    def _add_step(self, procedure, title, description, order, duration):
        return ProcedureStep.objects.create(
            procedure=procedure,
            title=title,
            description=description,
            order=order,
            estimated_duration_minutes=duration,
        )

    def _create_onboarding_steps(self, proc, admin):
        steps_data = [
            ('Welcome and Orientation', 'Welcome to CCC PLC. This covers our mission, values, and organizational structure.', 15, False, False, False, None),
            ('IT Equipment Setup', 'Setting up your workstation, email, VPN, and security credentials.', 30, True, False, False, None),
            ('HR Policies Review', 'Review of employee handbook, leave policies, and code of conduct.', 45, True, False, False, None),
            ('Loan Application Procedure', 'Loan processing workflow — only for roles involved in lending.', 60, False, True, False,
             {'field': 'role', 'operator': 'in', 'value': ['loan_officer', 'credit_analyst']}),
            ('Account Opening Procedure', 'Standard account opening workflow and compliance checks.', 30, False, False, True, None),
        ]
        for i, (title, desc, dur, manual, media, quiz, branch) in enumerate(steps_data, 1):
            ProcedureStep.objects.create(
                procedure=proc, title=title, description=desc, order=i,
                estimated_duration_minutes=dur,
                require_manual_open=manual, require_media_completion=media,
                require_quiz_pass=quiz, branch_condition=branch,
            )

    def _create_onboarding_quiz(self, proc):
        step5 = proc.steps.get(order=5)
        quiz = Quiz.objects.create(
            procedure=proc, step=step5, quiz_type='step_level',
            title='Account Opening Knowledge Check',
            description='Test your understanding of the account opening process.',
            passing_score_percent=80, max_attempts=3, time_limit_minutes=10,
            shuffle_questions=True, show_correct_answers_after=True,
        )
        q1 = Question.objects.create(
            quiz=quiz, question_type='multiple_choice', order=1, points=10, is_mandatory=True,
            text='What is the first step in account opening?',
            explanation='Customer identification is always the first step per KYC regulations.',
        )
        AnswerOption.objects.create(question=q1, text='Customer Identification', is_correct=True, order=1)
        AnswerOption.objects.create(question=q1, text='Deposit Collection', is_correct=False, order=2)
        AnswerOption.objects.create(question=q1, text='Card Issuance', is_correct=False, order=3)

        q2 = Question.objects.create(
            quiz=quiz, question_type='true_false', order=2, points=5, is_mandatory=False,
            text='A customer can open an account without a valid ID.',
            explanation='Valid ID is mandatory per regulatory requirements.',
        )
        AnswerOption.objects.create(question=q2, text='True', is_correct=False, order=1)
        AnswerOption.objects.create(question=q2, text='False', is_correct=True, order=2)

    def _create_aml_steps(self, proc, admin):
        steps_data = [
            ('AML Overview', 'Introduction to anti-money laundering concepts and regulations.', 20),
            ('Customer Due Diligence', 'CDD requirements and risk-based approach.', 30),
            ('Suspicious Transaction Reporting', 'How to identify and report suspicious transactions.', 25),
            ('Sanctions Screening', 'Understanding sanctions lists and screening procedures.', 20),
        ]
        for i, (title, desc, dur) in enumerate(steps_data, 1):
            ProcedureStep.objects.create(
                procedure=proc, title=title, description=desc, order=i,
                estimated_duration_minutes=dur,
            )

    def _create_aml_quiz(self, proc):
        quiz = Quiz.objects.create(
            procedure=proc, step=None, quiz_type='end_of_procedure',
            title='AML Final Assessment',
            description='Comprehensive assessment of AML knowledge.',
            passing_score_percent=70, max_attempts=2, time_limit_minutes=20,
        )
        q1 = Question.objects.create(
            quiz=quiz, question_type='multi_select', order=1, points=10, is_mandatory=True,
            text='Which of the following are red flags for money laundering? (Select all)',
        )
        AnswerOption.objects.create(question=q1, text='Unusual cash transactions', is_correct=True, order=1)
        AnswerOption.objects.create(question=q1, text='Frequent large wire transfers', is_correct=True, order=2)
        AnswerOption.objects.create(question=q1, text='Regular salary deposits', is_correct=False, order=3)
        AnswerOption.objects.create(question=q1, text='Structuring deposits below reporting thresholds', is_correct=True, order=4)

        q2 = Question.objects.create(
            quiz=quiz, question_type='short_answer', order=2, points=5,
            text='Briefly describe the purpose of Customer Due Diligence.',
            auto_grade_keywords=['identify', 'verify', 'risk', 'customer'],
        )

    def _create_loan_steps(self, proc, admin):
        steps_data = [
            ('Application Receipt', 'Receive and log the loan application.', 10),
            ('Document Verification', 'Verify all supporting documents.', 30),
            ('Credit Assessment', 'Perform credit check and risk scoring.', 45),
            ('Approval Decision', 'Manager review and approval/rejection.', 20),
            ('Disbursement', 'Process approved loan disbursement.', 15),
        ]
        for i, (title, desc, dur) in enumerate(steps_data, 1):
            ProcedureStep.objects.create(
                procedure=proc, title=title, description=desc, order=i,
                estimated_duration_minutes=dur,
            )

    def _publish_procedure(self, proc, admin, version_number, changelog=''):
        today = date.today()
        proc.state = Procedure.State.PUBLISHED
        proc.current_version = version_number
        proc.save(update_fields=['state', 'current_version', 'updated_at'])

        version = ProcedureVersion.objects.create(
            procedure=proc, version_number=version_number,
            title=proc.title, description=proc.description, tags=proc.tags,
            published_by=admin, approved_by=admin,
            effective_from=today, expires_on=today + timedelta(days=365),
            changelog=changelog,
        )

        # Snapshot steps
        for step in proc.steps.all().order_by('order'):
            vs = ProcedureVersionStep.objects.create(
                version=version, original_step_id=step.id,
                title=step.title, description=step.description, order=step.order,
                estimated_duration_minutes=step.estimated_duration_minutes,
                branch_condition=step.branch_condition,
                require_manual_open=step.require_manual_open,
                require_media_completion=step.require_media_completion,
                require_quiz_pass=step.require_quiz_pass,
            )
            # Snapshot attachments
            for att in step.attachments.all():
                VersionStepAttachment.objects.create(
                    version_step=vs, original_attachment_id=att.id,
                    attachment_type=att.attachment_type, title=att.title,
                    file=att.file, file_name=att.file_name, file_size=att.file_size,
                    file_extension=att.file_extension, mime_type=att.mime_type,
                    checksum_sha256=att.checksum_sha256, order=att.order,
                )

        # Snapshot quizzes
        for quiz in proc.quizzes.all():
            step_match = None
            if quiz.step:
                step_match = version.steps.filter(original_step_id=quiz.step_id).first()

            vq = VersionQuiz.objects.create(
                version=version, version_step=step_match, original_quiz_id=quiz.id,
                quiz_type=quiz.quiz_type, title=quiz.title, description=quiz.description,
                passing_score_percent=quiz.passing_score_percent,
                max_attempts=quiz.max_attempts, time_limit_minutes=quiz.time_limit_minutes,
                shuffle_questions=quiz.shuffle_questions, shuffle_answers=quiz.shuffle_answers,
                show_correct_answers_after=quiz.show_correct_answers_after,
            )
            for question in quiz.questions.all():
                vquestion = VersionQuestion.objects.create(
                    version_quiz=vq, original_question_id=question.id,
                    question_type=question.question_type, text=question.text,
                    explanation=question.explanation, order=question.order,
                    points=question.points, is_mandatory=question.is_mandatory,
                    auto_grade_keywords=question.auto_grade_keywords,
                )
                for option in question.options.all():
                    VersionAnswerOption.objects.create(
                        version_question=vquestion, original_option_id=option.id,
                        text=option.text, is_correct=option.is_correct,
                        correct_order=option.correct_order, order=option.order,
                    )

        return version

    def _create_training_data(self, org, admin, trainees, version, proc):
        """Create sample assignments and training attempts for onboarding."""
        now = timezone.now()
        today = date.today()
        version_steps = list(version.steps.all().order_by('order'))

        for i, trainee in enumerate(trainees[:3]):
            # Create assignment
            if i == 0:
                # Completed assignment
                assignment = ProcedureAssignment.objects.create(
                    organization=org, procedure_version=version, assignee=trainee,
                    assigned_by=admin, due_date=today + timedelta(days=14),
                    status='completed', completed_at=now - timedelta(days=2),
                    completion_score=92,
                )
                attempt = TrainingAttempt.objects.create(
                    assignment=assignment, attempt_number=1,
                    status='passed', total_steps=len(version_steps),
                    steps_completed=len(version_steps), total_score=92,
                    passed_all_mandatory=True, completed_at=now - timedelta(days=2),
                )
                for vs in version_steps:
                    StepCompletion.objects.create(
                        attempt=attempt, version_step=vs, status='completed',
                        started_at=now - timedelta(days=3),
                        completed_at=now - timedelta(days=2),
                    )
            elif i == 1:
                # In-progress assignment
                assignment = ProcedureAssignment.objects.create(
                    organization=org, procedure_version=version, assignee=trainee,
                    assigned_by=admin, due_date=today + timedelta(days=7),
                    status='in_progress',
                )
                attempt = TrainingAttempt.objects.create(
                    assignment=assignment, attempt_number=1,
                    status='in_progress', total_steps=len(version_steps),
                    steps_completed=2,
                )
                for vs in version_steps[:2]:
                    StepCompletion.objects.create(
                        attempt=attempt, version_step=vs, status='completed',
                        started_at=now - timedelta(days=1),
                        completed_at=now - timedelta(hours=12),
                    )
                if len(version_steps) > 2:
                    StepCompletion.objects.create(
                        attempt=attempt, version_step=version_steps[2],
                        status='started', started_at=now - timedelta(hours=1),
                    )
            else:
                # Overdue assignment
                ProcedureAssignment.objects.create(
                    organization=org, procedure_version=version, assignee=trainee,
                    assigned_by=admin, due_date=today - timedelta(days=3),
                    status='overdue',
                )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {min(3, len(trainees))} onboarding assignments'))

    def _create_aml_assignments(self, org, admin, trainees, version):
        today = date.today()
        for trainee in trainees[:2]:
            ProcedureAssignment.objects.create(
                organization=org, procedure_version=version, assignee=trainee,
                assigned_by=admin, due_date=today + timedelta(days=30),
                status='assigned',
            )
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {min(2, len(trainees))} AML assignments'))

    def _create_audit_entries(self, org, admin, proc, version):
        entries = [
            (ProcedureAuditLog.Action.CREATED, {'title': proc.title}),
            (ProcedureAuditLog.Action.STEP_ADDED, {'step_title': 'Welcome and Orientation'}),
            (ProcedureAuditLog.Action.PUBLISHED, {'version': version.version_number if version else 1}),
            (ProcedureAuditLog.Action.ASSIGNED, {'assignee_count': 3}),
        ]
        for action, detail in entries:
            ProcedureAuditLog.objects.create(
                organization=org, action=action, actor=admin,
                procedure=proc, version=version, detail=detail,
            )
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(entries)} audit log entries'))
