"""
Management command: creates a fully-featured demo procedure for a tech company.
Showcases every step feature: descriptions, learning objectives, key concepts,
example scenarios, video URLs, quizzes with multiple question types, completion
gates, step owners, and reviewers.

Usage:  python manage.py create_demo_procedure
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.organizations.models import Organization
from apps.users.models import CustomUser
from apps.procedures.models import (
    Procedure, ProcedureStep,
    Quiz, Question, AnswerOption,
)


class Command(BaseCommand):
    help = 'Create a fully-featured demo procedure (draft) for testing all step features'

    @transaction.atomic
    def handle(self, *args, **options):
        # --- Resolve org & users ---
        org = Organization.objects.first()
        if not org:
            self.stderr.write('No organization found. Run seed_data first.')
            return

        admin = CustomUser.objects.filter(is_superuser=True, organization=org).first()
        if not admin:
            admin = CustomUser.objects.filter(organization=org).first()

        users = list(CustomUser.objects.filter(organization=org, is_active=True)[:5])
        owner1 = users[1] if len(users) > 1 else admin
        owner2 = users[2] if len(users) > 2 else admin
        reviewer1 = users[3] if len(users) > 3 else admin
        reviewer2 = users[4] if len(users) > 4 else admin

        dept = admin.department

        self.stdout.write('Creating demo procedure...')

        proc = Procedure.objects.create(
            organization=org,
            title='Cloud Infrastructure Security Onboarding',
            description=(
                'A comprehensive onboarding program for new engineers joining the Cloud '
                'Infrastructure team. Covers security fundamentals, access management, '
                'incident response, compliance requirements, and hands-on labs. '
                'All engineers must complete this within their first 30 days.'
            ),
            department=dept,
            state='draft',
            created_by=admin,
            tags=['security', 'onboarding', 'cloud', 'infrastructure', 'compliance'],
        )

        # =====================================================================
        #  STEP 1 — Welcome & Security Culture
        # =====================================================================
        s1 = ProcedureStep.objects.create(
            procedure=proc,
            title='Welcome & Security Culture Overview',
            order=1,
            description=(
                'Welcome to the Cloud Infrastructure Security team!\n\n'
                'In this step you will learn about our company\'s security-first culture, '
                'understand why every engineer is responsible for security, and review the '
                'team charter and communication channels.\n\n'
                'Please read through the materials carefully and watch the introductory '
                'video from our CISO. When you\'re done, mark this step as completed.'
            ),
            estimated_duration_minutes=20,
            learning_objectives=[
                'Understand the company\'s security-first philosophy',
                'Know the key security contacts and escalation paths',
                'Identify the team communication channels (Slack, PagerDuty, Jira)',
                'Understand the shared responsibility model for cloud security',
            ],
            key_concepts=[
                'Defense in Depth — multiple layers of security controls',
                'Least Privilege Principle — minimal access needed for the job',
                'Shared Responsibility Model — what the cloud provider vs. you own',
                'Security Champion Program — every team has a designated champion',
            ],
            example_scenarios=(
                'Scenario 1: You receive a Slack message from someone claiming to be IT '
                'support asking for your AWS credentials. What do you do?\n'
                '→ Never share credentials. Report to #security-incidents and verify with IT.\n\n'
                'Scenario 2: You notice a colleague\'s laptop left unlocked in a meeting room.\n'
                '→ Lock it (Win+L / Cmd+Ctrl+Q) and remind them of the clean desk policy.'
            ),
            video_url='https://www.youtube.com/watch?v=inWWhr5tnEA',
            require_manual_open=True,
            require_media_completion=False,
            require_quiz_pass=False,
            step_owner=owner1,
            reviewer=reviewer1,
        )

        # =====================================================================
        #  STEP 2 — Access Management & IAM
        # =====================================================================
        s2 = ProcedureStep.objects.create(
            procedure=proc,
            title='Access Management & IAM Best Practices',
            order=2,
            description=(
                'This step covers Identity and Access Management (IAM) — the cornerstone '
                'of cloud security. You\'ll learn how we manage access to AWS, GCP, and '
                'internal tools using SSO, MFA, and role-based access control.\n\n'
                'Watch the video walkthrough, then complete the quiz to verify understanding.'
            ),
            estimated_duration_minutes=35,
            learning_objectives=[
                'Configure Multi-Factor Authentication (MFA) on all accounts',
                'Understand IAM roles, policies, and permission boundaries',
                'Use AWS SSO / Google Workspace SSO for access',
                'Request elevated access through the access request portal',
                'Understand service account management and key rotation',
            ],
            key_concepts=[
                'IAM Policy — JSON document defining permissions (Allow/Deny)',
                'Role vs. User — prefer roles over long-lived user credentials',
                'MFA — Time-based One-Time Password (TOTP) or hardware keys',
                'Service Account — non-human identity for automated workloads',
                'Permission Boundary — maximum permissions an IAM entity can have',
            ],
            example_scenarios=(
                'Scenario: You need temporary admin access to an S3 bucket for debugging.\n'
                '→ Submit a request in the Access Portal with justification and time limit.\n'
                '→ Never use the root account. Access is auto-revoked after the window.\n\n'
                'Scenario: A CI/CD pipeline needs to deploy to production.\n'
                '→ Use a service role with deployment-only permissions.\n'
                '→ Never embed access keys in code — use IAM roles for EC2/ECS.'
            ),
            video_url='https://www.youtube.com/watch?v=SXSqhTn2DuE',
            require_manual_open=False,
            require_media_completion=True,
            require_quiz_pass=True,
            step_owner=owner1,
            reviewer=reviewer1,
        )

        # Quiz for Step 2
        q2 = Quiz.objects.create(
            procedure=proc,
            step=s2,
            quiz_type='step_level',
            title='IAM & Access Management Quiz',
            description='Test your understanding of IAM concepts and access management best practices.',
            passing_score_percent=70,
            max_attempts=3,
            time_limit_minutes=10,
            shuffle_questions=True,
            shuffle_answers=True,
            show_correct_answers_after=True,
        )

        # Q1 — Multiple Choice
        q2_q1 = Question.objects.create(
            quiz=q2, text='What is the primary benefit of using IAM roles instead of IAM users for applications?',
            question_type='multiple_choice', order=1, points=10, is_mandatory=True,
            explanation='IAM roles provide temporary credentials that are automatically rotated, eliminating the risk of long-lived access keys being compromised.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q2_q1, text='Roles are easier to create', order=1, is_correct=False),
            AnswerOption(question=q2_q1, text='Roles provide temporary, auto-rotating credentials', order=2, is_correct=True),
            AnswerOption(question=q2_q1, text='Roles don\'t require any permissions', order=3, is_correct=False),
            AnswerOption(question=q2_q1, text='Roles bypass MFA requirements', order=4, is_correct=False),
        ])

        # Q2 — True/False
        q2_q2 = Question.objects.create(
            quiz=q2, text='It is acceptable to share your AWS access keys with a teammate if they need temporary access.',
            question_type='true_false', order=2, points=10, is_mandatory=True,
            explanation='Never share credentials. Use IAM roles, temporary credentials, or the access request portal instead.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q2_q2, text='True', order=1, is_correct=False),
            AnswerOption(question=q2_q2, text='False', order=2, is_correct=True),
        ])

        # Q3 — Multi-Select
        q2_q3 = Question.objects.create(
            quiz=q2, text='Which of the following are valid MFA methods? (Select all that apply)',
            question_type='multi_select', order=3, points=15, is_mandatory=True,
            explanation='TOTP apps, hardware security keys, and SMS are all MFA methods. Passwords alone are not MFA.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q2_q3, text='Authenticator app (TOTP)', order=1, is_correct=True),
            AnswerOption(question=q2_q3, text='Hardware security key (YubiKey)', order=2, is_correct=True),
            AnswerOption(question=q2_q3, text='Password only', order=3, is_correct=False),
            AnswerOption(question=q2_q3, text='SMS verification code', order=4, is_correct=True),
        ])

        # Q4 — Short Answer
        q2_q4 = Question.objects.create(
            quiz=q2, text='What principle states that users should only have the minimum permissions necessary to do their job?',
            question_type='short_answer', order=4, points=10, is_mandatory=False,
            explanation='The Principle of Least Privilege (PoLP) minimizes attack surface by restricting access to only what\'s needed.',
        )
        AnswerOption.objects.create(
            question=q2_q4, text='least privilege', order=1, is_correct=True,
        )

        # =====================================================================
        #  STEP 3 — Network Security & Firewalls
        # =====================================================================
        s3 = ProcedureStep.objects.create(
            procedure=proc,
            title='Network Security & Firewall Configuration',
            order=3,
            description=(
                'Understand how our network is architected for security. This covers VPCs, '
                'security groups, NACLs, and how traffic flows between services.\n\n'
                'You\'ll review our network topology diagram and learn how to configure '
                'security groups correctly.'
            ),
            estimated_duration_minutes=30,
            learning_objectives=[
                'Read and interpret our VPC architecture diagram',
                'Understand the difference between Security Groups and NACLs',
                'Know which ports should be open for standard services',
                'Identify common network misconfigurations that lead to breaches',
            ],
            key_concepts=[
                'VPC — Virtual Private Cloud, an isolated network segment',
                'Security Group — stateful firewall at the instance level',
                'NACL — stateless firewall at the subnet level',
                'Bastion Host — hardened jump server for SSH access',
                'Zero Trust Network — never trust, always verify',
            ],
            example_scenarios=(
                'Scenario: A developer opens port 22 (SSH) to 0.0.0.0/0 for debugging.\n'
                '→ This exposes the instance to the entire internet. Restrict to VPN CIDR.\n'
                '→ Use Session Manager instead of direct SSH when possible.\n\n'
                'Scenario: A microservice needs to talk to the database.\n'
                '→ Security group: allow port 5432 only from the application\'s SG.\n'
                '→ Never allow all traffic (0.0.0.0/0) between services.'
            ),
            video_url='https://www.youtube.com/watch?v=07o-TASvIRA',
            require_manual_open=True,
            require_media_completion=True,
            require_quiz_pass=False,
            step_owner=owner2,
            reviewer=reviewer2,
        )

        # =====================================================================
        #  STEP 4 — Secrets Management
        # =====================================================================
        s4 = ProcedureStep.objects.create(
            procedure=proc,
            title='Secrets Management & Encryption',
            order=4,
            description=(
                'Learn how we handle secrets — API keys, database credentials, TLS certificates, '
                'and encryption keys. This step covers HashiCorp Vault, AWS Secrets Manager, '
                'and our encryption-at-rest policies.\n\n'
                'Complete the quiz to demonstrate your understanding of secrets management.'
            ),
            estimated_duration_minutes=25,
            learning_objectives=[
                'Store and retrieve secrets from HashiCorp Vault',
                'Understand envelope encryption and KMS key hierarchies',
                'Never commit secrets to Git — use pre-commit hooks',
                'Rotate secrets on a defined schedule',
                'Use environment-specific secrets (dev/staging/prod)',
            ],
            key_concepts=[
                'Vault — centralized secrets management with audit logging',
                'KMS — Key Management Service for encryption key lifecycle',
                'Envelope Encryption — encrypt data key with master key',
                'Secret Rotation — automated credential refresh on schedule',
                'Pre-commit Hook — git-secrets prevents committing credentials',
            ],
            example_scenarios=(
                'Scenario: You accidentally committed an API key to a Git repository.\n'
                '→ Immediately rotate the key in the secrets manager.\n'
                '→ Use git-secrets or truffleHog to scan the repo.\n'
                '→ Report the incident to #security-incidents.\n\n'
                'Scenario: A production database password needs to be updated.\n'
                '→ Update in Vault, trigger rotation via the CI/CD pipeline.\n'
                '→ Application auto-refreshes credentials — no manual deployment needed.'
            ),
            video_url='https://www.youtube.com/watch?v=o-YBDTqX_ZU',
            require_manual_open=False,
            require_media_completion=False,
            require_quiz_pass=True,
            step_owner=owner2,
            reviewer=reviewer1,
        )

        # Quiz for Step 4
        q4 = Quiz.objects.create(
            procedure=proc,
            step=s4,
            quiz_type='step_level',
            title='Secrets Management Quiz',
            description='Validate your knowledge of secrets management and encryption practices.',
            passing_score_percent=80,
            max_attempts=2,
            time_limit_minutes=8,
            shuffle_questions=True,
            shuffle_answers=True,
            show_correct_answers_after=True,
        )

        q4_q1 = Question.objects.create(
            quiz=q4, text='Where should application secrets (API keys, DB passwords) be stored?',
            question_type='multiple_choice', order=1, points=10, is_mandatory=True,
            explanation='Secrets must be stored in a secrets manager like Vault or AWS Secrets Manager, never in code.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q4_q1, text='In the application source code', order=1, is_correct=False),
            AnswerOption(question=q4_q1, text='In a .env file committed to Git', order=2, is_correct=False),
            AnswerOption(question=q4_q1, text='In HashiCorp Vault or AWS Secrets Manager', order=3, is_correct=True),
            AnswerOption(question=q4_q1, text='In a shared Google Doc', order=4, is_correct=False),
        ])

        q4_q2 = Question.objects.create(
            quiz=q4, text='You discover an AWS access key in a public GitHub repo. Select all correct immediate actions.',
            question_type='multi_select', order=2, points=15, is_mandatory=True,
            explanation='All three actions must be taken: revoke the key, report the incident, and scan for usage.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q4_q2, text='Immediately revoke/rotate the exposed key', order=1, is_correct=True),
            AnswerOption(question=q4_q2, text='Report to #security-incidents channel', order=2, is_correct=True),
            AnswerOption(question=q4_q2, text='Wait until the next business day to address it', order=3, is_correct=False),
            AnswerOption(question=q4_q2, text='Scan CloudTrail for unauthorized usage of the key', order=4, is_correct=True),
        ])

        q4_q3 = Question.objects.create(
            quiz=q4, text='Encryption at rest is optional for non-production environments.',
            question_type='true_false', order=3, points=10, is_mandatory=True,
            explanation='All environments must have encryption at rest enabled. Test data may still contain sensitive information.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q4_q3, text='True', order=1, is_correct=False),
            AnswerOption(question=q4_q3, text='False', order=2, is_correct=True),
        ])

        # =====================================================================
        #  STEP 5 — Incident Response Procedures
        # =====================================================================
        s5 = ProcedureStep.objects.create(
            procedure=proc,
            title='Security Incident Response',
            order=5,
            description=(
                'When a security incident occurs, every minute counts. This step teaches '
                'the incident response lifecycle: Detection → Triage → Containment → '
                'Eradication → Recovery → Post-Mortem.\n\n'
                'You will review real (anonymized) incident reports, watch the tabletop '
                'exercise video, and take the final assessment.'
            ),
            estimated_duration_minutes=45,
            learning_objectives=[
                'Identify the 6 phases of incident response',
                'Know how to classify incident severity (SEV1-SEV4)',
                'Use the incident response runbook for common attack vectors',
                'Write an effective post-mortem with actionable follow-ups',
                'Understand legal and compliance reporting requirements',
            ],
            key_concepts=[
                'MTTD — Mean Time to Detect an incident',
                'MTTR — Mean Time to Respond/Recover',
                'Severity Classification — SEV1 (critical) to SEV4 (informational)',
                'Chain of Custody — preserving evidence for forensic analysis',
                'Blameless Post-Mortem — focus on systems, not individuals',
                'CIRT — Computer Incident Response Team',
            ],
            example_scenarios=(
                'Scenario: CloudTrail shows an unauthorized AssumeRole call at 3 AM.\n'
                '→ Classify as SEV2 (potential unauthorized access)\n'
                '→ Containment: Revoke the session, disable the compromised role\n'
                '→ Detection: Check CloudTrail for lateral movement\n'
                '→ Eradication: Rotate all credentials the role had access to\n'
                '→ Recovery: Re-enable with corrected permissions\n'
                '→ Post-Mortem: How was the role compromised? Update policies.\n\n'
                'Scenario: A developer reports their laptop was stolen.\n'
                '→ Classify as SEV2 (device with potential access)\n'
                '→ Immediately: Remote wipe, revoke all SSO sessions\n'
                '→ Reset all passwords and MFA tokens\n'
                '→ Check for any unusual activity from the device\'s IP'
            ),
            video_url='https://www.youtube.com/watch?v=UtMMjXOlRQc',
            require_manual_open=True,
            require_media_completion=True,
            require_quiz_pass=True,
            step_owner=owner1,
            reviewer=reviewer2,
        )

        # Quiz for Step 5 — comprehensive final assessment
        q5 = Quiz.objects.create(
            procedure=proc,
            step=s5,
            quiz_type='step_level',
            title='Incident Response Assessment',
            description='Final assessment covering the incident response lifecycle and severity classification.',
            passing_score_percent=75,
            max_attempts=3,
            time_limit_minutes=15,
            shuffle_questions=True,
            shuffle_answers=True,
            show_correct_answers_after=True,
        )

        q5_q1 = Question.objects.create(
            quiz=q5, text='What is the correct order of the incident response lifecycle?',
            question_type='multiple_choice', order=1, points=15, is_mandatory=True,
            explanation='The standard IR lifecycle is: Detection → Triage → Containment → Eradication → Recovery → Post-Mortem.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q5_q1, text='Detection → Containment → Triage → Recovery → Eradication → Post-Mortem', order=1, is_correct=False),
            AnswerOption(question=q5_q1, text='Detection → Triage → Containment → Eradication → Recovery → Post-Mortem', order=2, is_correct=True),
            AnswerOption(question=q5_q1, text='Triage → Detection → Recovery → Containment → Post-Mortem → Eradication', order=3, is_correct=False),
            AnswerOption(question=q5_q1, text='Post-Mortem → Detection → Triage → Containment → Recovery → Eradication', order=4, is_correct=False),
        ])

        q5_q2 = Question.objects.create(
            quiz=q5, text='A production database is returning unauthorized data to unauthenticated API calls. What severity is this?',
            question_type='multiple_choice', order=2, points=10, is_mandatory=True,
            explanation='Data exposure to unauthenticated users is a critical (SEV1) incident requiring immediate response.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q5_q2, text='SEV4 — Informational', order=1, is_correct=False),
            AnswerOption(question=q5_q2, text='SEV3 — Low Impact', order=2, is_correct=False),
            AnswerOption(question=q5_q2, text='SEV2 — Significant Impact', order=3, is_correct=False),
            AnswerOption(question=q5_q2, text='SEV1 — Critical / Data Breach', order=4, is_correct=True),
        ])

        q5_q3 = Question.objects.create(
            quiz=q5, text='Which of these should be included in a blameless post-mortem? (Select all)',
            question_type='multi_select', order=3, points=15, is_mandatory=True,
            explanation='A good post-mortem includes timeline, root cause, impact, and actionable follow-ups — but never blames individuals.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q5_q3, text='Detailed timeline of events', order=1, is_correct=True),
            AnswerOption(question=q5_q3, text='Root cause analysis', order=2, is_correct=True),
            AnswerOption(question=q5_q3, text='Names of people who made mistakes', order=3, is_correct=False),
            AnswerOption(question=q5_q3, text='Actionable follow-up items with owners', order=4, is_correct=True),
            AnswerOption(question=q5_q3, text='Impact assessment (users affected, data scope)', order=5, is_correct=True),
        ])

        q5_q4 = Question.objects.create(
            quiz=q5, text='During a SEV1 incident, you should wait for manager approval before taking containment actions.',
            question_type='true_false', order=4, points=10, is_mandatory=True,
            explanation='During SEV1 incidents, engineers are empowered to take immediate containment actions. Escalate and act simultaneously.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q5_q4, text='True', order=1, is_correct=False),
            AnswerOption(question=q5_q4, text='False', order=2, is_correct=True),
        ])

        q5_q5 = Question.objects.create(
            quiz=q5, text='What does MTTR stand for in incident response?',
            question_type='short_answer', order=5, points=10, is_mandatory=False,
            explanation='MTTR = Mean Time to Respond (or Recover). It measures how quickly the team resolves incidents.',
        )
        AnswerOption.objects.create(
            question=q5_q5, text='mean time to recover', order=1, is_correct=True,
        )

        # =====================================================================
        #  STEP 6 — Compliance & Audit Readiness
        # =====================================================================
        s6 = ProcedureStep.objects.create(
            procedure=proc,
            title='Compliance & Audit Readiness',
            order=6,
            description=(
                'Our infrastructure must comply with SOC 2, ISO 27001, and GDPR. This step '
                'covers what compliance means for your daily work — logging, data handling, '
                'change management, and audit evidence collection.\n\n'
                'This is a reading-intensive step. Take your time with the materials.'
            ),
            estimated_duration_minutes=30,
            learning_objectives=[
                'Understand SOC 2 Type II requirements for cloud infrastructure',
                'Know GDPR implications for data stored in EU regions',
                'Ensure all infrastructure changes are tracked in version control',
                'Maintain audit-ready documentation for your services',
            ],
            key_concepts=[
                'SOC 2 — Service Organization Control for security & availability',
                'ISO 27001 — Information Security Management System standard',
                'GDPR — General Data Protection Regulation (EU data privacy)',
                'Change Management — all changes via PR with approval',
                'Evidence Collection — automated compliance artifacts',
            ],
            example_scenarios=(
                'Scenario: An auditor asks for evidence of access reviews in the past quarter.\n'
                '→ Pull the access review report from the IAM dashboard.\n'
                '→ Show Jira tickets for access changes with approval chains.\n\n'
                'Scenario: A new microservice stores user email addresses.\n'
                '→ This is PII under GDPR — requires a Data Protection Impact Assessment.\n'
                '→ Ensure data encryption, retention policies, and right-to-delete support.'
            ),
            video_url='',
            require_manual_open=True,
            require_media_completion=False,
            require_quiz_pass=False,
            step_owner=owner2,
            reviewer=reviewer2,
        )

        # =====================================================================
        #  STEP 7 — Hands-On Lab: Secure a Service
        # =====================================================================
        s7 = ProcedureStep.objects.create(
            procedure=proc,
            title='Hands-On Lab: Secure a Microservice',
            order=7,
            description=(
                'Time to put it all together! In this lab, you\'ll receive access to a '
                'deliberately insecure microservice and apply everything you\'ve learned:\n\n'
                '• Configure IAM roles with least privilege\n'
                '• Set up security groups to restrict network access\n'
                '• Move hardcoded secrets to Vault\n'
                '• Enable CloudTrail logging and alerting\n'
                '• Write a security review checklist\n\n'
                'This lab has a quiz at the end to verify you completed all tasks correctly.'
            ),
            estimated_duration_minutes=60,
            learning_objectives=[
                'Apply least-privilege IAM policies to a real service',
                'Configure network security (SG + NACLs) for a multi-tier app',
                'Migrate hardcoded credentials to a secrets manager',
                'Set up monitoring and alerting for security events',
                'Document your security decisions in a review checklist',
            ],
            key_concepts=[
                'Infrastructure as Code — Terraform/CloudFormation for reproducible security',
                'Security Review Checklist — standardized review before deployment',
                'Threat Modeling — identify what could go wrong before it does',
                'Shift Left — integrate security early in the development lifecycle',
            ],
            example_scenarios=(
                'Lab Task: The service has DATABASE_URL hardcoded in app.py.\n'
                '→ Create a Vault secret path: secret/myservice/database_url\n'
                '→ Update the app to read from Vault using the hvac library\n'
                '→ Remove the hardcoded value and add .env to .gitignore\n\n'
                'Lab Task: The security group allows inbound from 0.0.0.0/0 on port 443.\n'
                '→ Restrict to the ALB security group only\n'
                '→ Add a NACL rule to deny traffic from known malicious CIDRs'
            ),
            video_url='https://www.youtube.com/watch?v=9TcUypeXjzs',
            require_manual_open=True,
            require_media_completion=True,
            require_quiz_pass=True,
            step_owner=owner1,
            reviewer=reviewer2,
        )

        # Quiz for Step 7 — Lab verification
        q7 = Quiz.objects.create(
            procedure=proc,
            step=s7,
            quiz_type='step_level',
            title='Lab Completion Verification',
            description='Verify that you completed all security hardening tasks in the lab.',
            passing_score_percent=100,
            max_attempts=5,
            time_limit_minutes=10,
            shuffle_questions=False,
            shuffle_answers=False,
            show_correct_answers_after=True,
        )

        q7_q1 = Question.objects.create(
            quiz=q7, text='Did you remove all hardcoded secrets from the application code?',
            question_type='true_false', order=1, points=25, is_mandatory=True,
            explanation='All secrets must be stored in Vault or Secrets Manager, never in code.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q7_q1, text='True', order=1, is_correct=True),
            AnswerOption(question=q7_q1, text='False', order=2, is_correct=False),
        ])

        q7_q2 = Question.objects.create(
            quiz=q7, text='What CIDR range did you restrict the security group inbound rule to?',
            question_type='multiple_choice', order=2, points=25, is_mandatory=True,
            explanation='Traffic should only come from the ALB security group, not from the open internet.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q7_q2, text='0.0.0.0/0 (all traffic)', order=1, is_correct=False),
            AnswerOption(question=q7_q2, text='10.0.0.0/8 (entire VPC)', order=2, is_correct=False),
            AnswerOption(question=q7_q2, text='ALB Security Group ID only', order=3, is_correct=True),
            AnswerOption(question=q7_q2, text='My laptop IP address', order=4, is_correct=False),
        ])

        q7_q3 = Question.objects.create(
            quiz=q7, text='Which monitoring did you enable? (Select all that apply)',
            question_type='multi_select', order=3, points=25, is_mandatory=True,
            explanation='A properly secured service should have CloudTrail logging, CloudWatch alarms, and GuardDuty enabled.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q7_q3, text='CloudTrail API logging', order=1, is_correct=True),
            AnswerOption(question=q7_q3, text='CloudWatch alarms for unauthorized access', order=2, is_correct=True),
            AnswerOption(question=q7_q3, text='GuardDuty threat detection', order=3, is_correct=True),
            AnswerOption(question=q7_q3, text='No monitoring (it\'s just a lab)', order=4, is_correct=False),
        ])

        q7_q4 = Question.objects.create(
            quiz=q7, text='Did you complete and submit the security review checklist?',
            question_type='true_false', order=4, points=25, is_mandatory=True,
            explanation='The security review checklist is mandatory before any service goes to production.',
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q7_q4, text='True', order=1, is_correct=True),
            AnswerOption(question=q7_q4, text='False', order=2, is_correct=False),
        ])

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo procedure created successfully!'
            f'\n  Title:  {proc.title}'
            f'\n  ID:     {proc.id}'
            f'\n  State:  {proc.state}'
            f'\n  Steps:  7'
            f'\n  Quizzes: 4 (Steps 2, 4, 5, 7)'
            f'\n  URL:    /procedures/{proc.id}'
            f'\n'
            f'\n  Step Owners:   {owner1.get_full_name()}, {owner2.get_full_name()}'
            f'\n  Reviewers:     {reviewer1.get_full_name()}, {reviewer2.get_full_name()}'
            f'\n'
            f'\n  Features demonstrated per step:'
            f'\n  Step 1: Description, learning objectives, key concepts, scenarios, video URL, manual-open gate'
            f'\n  Step 2: All content fields + video + quiz (MC, T/F, multi-select, short answer) + media+quiz gates'
            f'\n  Step 3: All content fields + video + manual-open + media gates (no quiz)'
            f'\n  Step 4: All content fields + video + quiz-only gate'
            f'\n  Step 5: Full assessment — all gates enabled, comprehensive quiz'
            f'\n  Step 6: Reading-only step — manual-open gate, no video, no quiz'
            f'\n  Step 7: Hands-on lab — all gates, lab verification quiz (100% pass required)'
        ))
