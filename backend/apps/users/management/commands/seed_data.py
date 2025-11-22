"""
Management command to populate the database with seed data for development.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.users.models import Department, CustomUser
from apps.organizations.models import Organization, OrganizationMember
from apps.folders.models import Folder, FolderTemplate
from apps.documents.models import Tag
from apps.retention.models import RetentionPolicy


class Command(BaseCommand):
    help = 'Populate database with seed data for development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            self.clear_data()

        self.stdout.write(self.style.SUCCESS('Starting data seeding...'))

        with transaction.atomic():
            # Create organization
            self.stdout.write('Creating organization...')
            organization = self.create_organization()
            self.stdout.write(self.style.SUCCESS(f'✓ Created organization: {organization.name}'))

            # Create departments
            self.stdout.write('Creating departments...')
            departments = self.create_departments(organization)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(departments)} departments'))

            # Create users
            self.stdout.write('Creating users...')
            users = self.create_users(departments, organization)
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(users)} users'))

            # Create retention policies
            self.stdout.write('Creating retention policies...')
            policies = self.create_retention_policies(users[0])
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(policies)} retention policies'))

            # Create tags
            self.stdout.write('Creating tags...')
            tags = self.create_tags(users[0])
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(tags)} tags'))

            # Create root folders
            self.stdout.write('Creating folder structure...')
            folders = self.create_folder_structure(users[0])
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(folders)} folders'))

            # Create folder templates
            self.stdout.write('Creating folder templates...')
            templates = self.create_folder_templates(users[0])
            self.stdout.write(self.style.SUCCESS(f'✓ Created {len(templates)} folder templates'))

        self.stdout.write(self.style.SUCCESS('\n✓ Data seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS('\nTest Users Created:'))
        self.stdout.write('Admin: admin@cccplc.net / password: admin123')
        self.stdout.write('Manager: john.doe@cccplc.net / password: manager123')
        self.stdout.write('Staff: jane.smith@cccplc.net / password: staff123')

    def clear_data(self):
        """Clear existing seed data"""
        CustomUser.objects.filter(email__endswith='@cccplc.net').delete()
        Department.objects.filter(organization__domain='cccplc.net').delete()
        Organization.objects.filter(domain='cccplc.net').delete()
        Folder.objects.all().delete()
        FolderTemplate.objects.all().delete()
        Tag.objects.all().delete()
        RetentionPolicy.objects.all().delete()

    def create_organization(self):
        """Create test organization"""
        organization, created = Organization.objects.get_or_create(
            domain='cccplc.net',
            defaults={
                'name': 'CCC PLC Financial Services',
                'registration_number': 'RC123456',
                'tax_id': 'TAX-987654',
                'industry': 'Financial Services',
                'country': 'Nigeria',
                'subscription_plan': 'professional',
                'subscription_status': 'active',
                'max_users': 50,
                'max_storage_gb': 500,
                'max_documents': 50000,
                'is_active': True,
            }
        )
        return organization

    def create_departments(self, organization):
        """Create organization departments"""
        departments = []

        # Main departments
        dept_data = [
            {'name': 'Executive Management', 'code': 'EXEC'},
            {'name': 'Engagements', 'code': 'ENG'},
            {'name': 'Accounting', 'code': 'ACC'},
            {'name': 'Information Technology', 'code': 'IT'},
            {'name': 'Compliance', 'code': 'COMP'},
            {'name': 'Risk Management', 'code': 'RISK'},
            {'name': 'Audit', 'code': 'AUDIT'},
        ]

        for data in dept_data:
            dept, created = Department.objects.get_or_create(
                code=data['code'],
                organization=organization,
                defaults={'name': data['name']}
            )
            departments.append(dept)

        return departments

    def create_users(self, departments, organization):
        """Create test users"""
        users = []

        # Admin user
        admin = CustomUser.objects.create_user(
            username='admin',
            email='admin@cccplc.net',
            password='admin123',
            employee_id='EMP001',
            first_name='Admin',
            last_name='User',
            department=departments[0],  # Executive Management
            organization=organization,
            is_staff=True,
            is_superuser=True,
            phone_number='+1234567890',
        )
        users.append(admin)

        # Create organization membership for admin
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=admin,
            defaults={'role': 'owner'}
        )

        # Manager user
        manager = CustomUser.objects.create_user(
            username='john.doe',
            email='john.doe@cccplc.net',
            password='manager123',
            employee_id='EMP002',
            first_name='John',
            last_name='Doe',
            department=departments[1],  # Engagements
            organization=organization,
            is_staff=True,
            phone_number='+1234567891',
        )
        users.append(manager)
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=manager,
            defaults={'role': 'manager'}
        )

        # Regular staff user
        staff = CustomUser.objects.create_user(
            username='jane.smith',
            email='jane.smith@cccplc.net',
            password='staff123',
            employee_id='EMP003',
            first_name='Jane',
            last_name='Smith',
            department=departments[2],  # Accounting
            organization=organization,
            is_staff=False,
            phone_number='+1234567892',
        )
        users.append(staff)
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=staff,
            defaults={'role': 'member'}
        )

        # IT user
        it_user = CustomUser.objects.create_user(
            username='mike.tech',
            email='mike.tech@cccplc.net',
            password='it123',
            employee_id='EMP004',
            first_name='Mike',
            last_name='Tech',
            department=departments[3],  # IT
            organization=organization,
            is_staff=True,
            phone_number='+1234567893',
        )
        users.append(it_user)
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=it_user,
            defaults={'role': 'admin'}
        )

        # Compliance user
        compliance_user = CustomUser.objects.create_user(
            username='sarah.comply',
            email='sarah.comply@cccplc.net',
            password='comply123',
            employee_id='EMP005',
            first_name='Sarah',
            last_name='Comply',
            department=departments[4],  # Compliance
            organization=organization,
            is_staff=True,
            phone_number='+1234567894',
        )
        users.append(compliance_user)
        OrganizationMember.objects.get_or_create(
            organization=organization,
            user=compliance_user,
            defaults={'role': 'member'}
        )

        return users

    def create_retention_policies(self, creator):
        """Create retention policies"""
        policies = []

        policy_data = [
            {
                'name': 'Financial Records - 7 Years',
                'description': 'Standard retention for financial documents',
                'retention_period_years': 7,
                'applies_to_document_type': 'Invoice',
            },
            {
                'name': 'KYC Documents - 5 Years',
                'description': 'Customer identification documents',
                'retention_period_years': 5,
                'applies_to_document_type': 'KYC Record',
            },
            {
                'name': 'Contracts - 10 Years',
                'description': 'Legal contracts and agreements',
                'retention_period_years': 10,
                'applies_to_document_type': 'Contract',
            },
            {
                'name': 'General Documents - 3 Years',
                'description': 'General business documents',
                'retention_period_years': 3,
                'applies_to_document_type': 'Report',
            },
        ]

        for data in policy_data:
            policy, created = RetentionPolicy.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'retention_period_years': data['retention_period_years'],
                    'applies_to_document_type': data['applies_to_document_type'],
                    'auto_delete': False,
                    'is_active': True,
                    'created_by': creator,
                }
            )
            policies.append(policy)

        return policies

    def create_tags(self, creator):
        """Create document tags"""
        tags = []

        tag_data = [
            {'name': 'Urgent', 'color': '#FF0000', 'category': 'Priority'},
            {'name': 'Confidential', 'color': '#FF6B6B', 'category': 'Security'},
            {'name': 'Financial', 'color': '#4ECDC4', 'category': 'Type'},
            {'name': 'Legal', 'color': '#95E1D3', 'category': 'Type'},
            {'name': 'KYC', 'color': '#F38181', 'category': 'Type'},
            {'name': 'Approved', 'color': '#51CF66', 'category': 'Status'},
            {'name': 'Pending Review', 'color': '#FFD93D', 'category': 'Status'},
            {'name': 'Archived', 'color': '#6C5CE7', 'category': 'Status'},
        ]

        for data in tag_data:
            tag, created = Tag.objects.get_or_create(
                name=data['name'],
                defaults={
                    'color': data['color'],
                    'category': data['category'],
                    'created_by': creator,
                }
            )
            tags.append(tag)

        return tags

    def create_folder_structure(self, creator):
        """Create folder hierarchy"""
        folders = []

        # Root folders by department
        root_folders = [
            {
                'name': 'Customer Records',
                'description': 'Customer identification and KYC documents',
                'confidentiality_level': 'HIGHLY_CONFIDENTIAL',
            },
            {
                'name': 'Accounts and Transactions',
                'description': 'Account statements and transaction records',
                'confidentiality_level': 'CONFIDENTIAL',
            },
            {
                'name': 'Loans and Credit',
                'description': 'Loan applications and credit documents',
                'confidentiality_level': 'CONFIDENTIAL',
            },
            {
                'name': 'Compliance Documents',
                'description': 'Regulatory and compliance records',
                'confidentiality_level': 'CONFIDENTIAL',
            },
            {
                'name': 'Internal Operations',
                'description': 'Internal business operations',
                'confidentiality_level': 'INTERNAL',
            },
        ]

        for data in root_folders:
            folder = Folder.objects.create(
                name=data['name'],
                description=data['description'],
                confidentiality_level=data['confidentiality_level'],
                owner=creator,
                created_by=creator,
                department=creator.department,
            )
            folders.append(folder)

            # Create subfolders for Customer Records
            if folder.name == 'Customer Records':
                subfolders = ['Profile', 'Identification', 'Financial Info', 'Communications']
                for subfolder_name in subfolders:
                    subfolder = Folder.objects.create(
                        name=subfolder_name,
                        parent=folder,
                        confidentiality_level=folder.confidentiality_level,
                        owner=creator,
                        created_by=creator,
                        department=creator.department,
                    )
                    folders.append(subfolder)

            # Create subfolders for Accounts and Transactions
            if folder.name == 'Accounts and Transactions':
                subfolders = ['Statements', 'Transaction History', 'Reports']
                for subfolder_name in subfolders:
                    subfolder = Folder.objects.create(
                        name=subfolder_name,
                        parent=folder,
                        confidentiality_level=folder.confidentiality_level,
                        owner=creator,
                        created_by=creator,
                        department=creator.department,
                    )
                    folders.append(subfolder)

        return folders

    def create_folder_templates(self, creator):
        """Create folder templates"""
        templates = []

        template_data = [
            {
                'name': 'New Client Onboarding',
                'description': 'Standard folder structure for new clients',
                'structure': {
                    'Client Files': {
                        'KYC Documents': {},
                        'Contracts': {},
                        'Financial Records': {},
                        'Correspondence': {},
                    }
                },
            },
            {
                'name': 'Project Folder',
                'description': 'Standard project folder structure',
                'structure': {
                    'Project Documents': {
                        'Planning': {},
                        'Execution': {},
                        'Deliverables': {},
                        'Reports': {},
                    }
                },
            },
            {
                'name': 'Employee File',
                'description': 'Standard employee documentation structure',
                'structure': {
                    'Employee Records': {
                        'Personal Information': {},
                        'Employment Documents': {},
                        'Performance Reviews': {},
                        'Training Records': {},
                    }
                },
            },
        ]

        for data in template_data:
            template, created = FolderTemplate.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'structure': data['structure'],
                    'created_by': creator,
                    'is_active': True,
                }
            )
            templates.append(template)

        return templates
