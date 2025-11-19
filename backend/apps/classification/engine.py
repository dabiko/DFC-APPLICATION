"""
Classification engine for automatic document categorization.

This module implements the rule matching and action execution logic
for the automated classification system.
"""
import logging
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


class ClassificationEngine:
    """
    Engine for matching classification rules and applying actions.

    Provides static methods for:
    - Checking if documents match rule conditions
    - Applying rule actions to documents
    - Full document classification workflow
    """

    @staticmethod
    def matches_conditions(document, conditions):
        """
        Check if document matches all rule conditions.

        All conditions must match for the rule to apply (AND logic).
        Within list-based conditions (e.g., keywords), ANY match is sufficient (OR logic).

        Args:
            document: Document instance to check
            conditions: Dictionary of conditions from ClassificationRule

        Returns:
            bool: True if all conditions match, False otherwise

        Supported Conditions:
            - filename_contains: List of keywords to search in filename (case-insensitive)
            - content_contains: List of keywords to search in extracted text
            - file_type: Exact MIME type match
            - document_type: Exact document type match
            - min_file_size_mb: Minimum file size in MB
            - max_file_size_mb: Maximum file size in MB
            - department_id: Specific department ID
        """
        try:
            # Check filename contains keywords
            if 'filename_contains' in conditions:
                keywords = conditions['filename_contains']
                if not isinstance(keywords, list):
                    keywords = [keywords]

                # At least one keyword must be in filename
                if not any(kw.lower() in document.file_name.lower() for kw in keywords):
                    logger.debug(
                        f"Document {document.id} filename '{document.file_name}' "
                        f"does not contain any of: {keywords}"
                    )
                    return False

            # Check content contains keywords
            if 'content_contains' in conditions:
                keywords = conditions['content_contains']
                if not isinstance(keywords, list):
                    keywords = [keywords]

                # Document must have extracted text
                if not document.extracted_text:
                    logger.debug(
                        f"Document {document.id} has no extracted text, "
                        f"cannot match content_contains"
                    )
                    return False

                # At least one keyword must be in content
                extracted_lower = document.extracted_text.lower()
                if not any(kw.lower() in extracted_lower for kw in keywords):
                    logger.debug(
                        f"Document {document.id} content does not contain "
                        f"any of: {keywords}"
                    )
                    return False

            # Check file type (exact match)
            if 'file_type' in conditions:
                if document.file_type != conditions['file_type']:
                    logger.debug(
                        f"Document {document.id} file type '{document.file_type}' "
                        f"does not match required '{conditions['file_type']}'"
                    )
                    return False

            # Check document type (exact match)
            if 'document_type' in conditions:
                if document.document_type != conditions['document_type']:
                    logger.debug(
                        f"Document {document.id} type '{document.document_type}' "
                        f"does not match required '{conditions['document_type']}'"
                    )
                    return False

            # Check minimum file size
            if 'min_file_size_mb' in conditions:
                min_size_bytes = conditions['min_file_size_mb'] * 1024 * 1024
                if document.file_size < min_size_bytes:
                    logger.debug(
                        f"Document {document.id} size {document.file_size} bytes "
                        f"is below minimum {min_size_bytes} bytes"
                    )
                    return False

            # Check maximum file size
            if 'max_file_size_mb' in conditions:
                max_size_bytes = conditions['max_file_size_mb'] * 1024 * 1024
                if document.file_size > max_size_bytes:
                    logger.debug(
                        f"Document {document.id} size {document.file_size} bytes "
                        f"exceeds maximum {max_size_bytes} bytes"
                    )
                    return False

            # Check department
            if 'department_id' in conditions:
                if not document.department or document.department.id != conditions['department_id']:
                    logger.debug(
                        f"Document {document.id} department does not match "
                        f"required department ID {conditions['department_id']}"
                    )
                    return False

            # All conditions matched
            return True

        except Exception as e:
            logger.error(f"Error matching conditions for document {document.id}: {e}", exc_info=True)
            return False

    @staticmethod
    def apply_actions(document, actions, rule):
        """
        Apply rule actions to document.

        Args:
            document: Document instance to modify
            actions: Dictionary of actions from ClassificationRule
            rule: ClassificationRule instance (for logging)

        Returns:
            dict: Summary of applied actions with success status

        Actions:
            - move_to_folder: Move document to specified folder UUID
            - set_document_type: Change document type
            - add_tags: Add tags to document (creates if needed)
            - set_confidentiality: Set confidentiality level
            - assign_to_department: Assign to department ID
        """
        from apps.folders.models import Folder
        from apps.documents.models import Tag, DocumentTag
        from apps.users.models import Department

        applied_actions = {}
        changed = False

        try:
            # Move to folder
            if 'move_to_folder' in actions:
                try:
                    folder_id = actions['move_to_folder']
                    folder = Folder.objects.get(id=folder_id, is_deleted=False)

                    old_folder = document.folder
                    document.folder = folder
                    changed = True

                    applied_actions['moved_to_folder'] = {
                        'from': str(old_folder.id) if old_folder else None,
                        'to': str(folder.id),
                        'folder_path': folder.path
                    }

                    logger.info(
                        f"Moved document {document.id} from "
                        f"'{old_folder.path if old_folder else 'None'}' to '{folder.path}'"
                    )

                except Folder.DoesNotExist:
                    logger.error(f"Target folder {folder_id} not found")
                    applied_actions['moved_to_folder'] = {'error': 'Folder not found'}

            # Set document type
            if 'set_document_type' in actions:
                old_type = document.document_type
                new_type = actions['set_document_type']

                document.document_type = new_type
                changed = True

                applied_actions['set_document_type'] = {
                    'from': old_type,
                    'to': new_type
                }

                logger.info(
                    f"Changed document {document.id} type from '{old_type}' to '{new_type}'"
                )

            # Add tags
            if 'add_tags' in actions:
                tag_names = actions['add_tags']
                if not isinstance(tag_names, list):
                    tag_names = [tag_names]

                added_tags = []
                for tag_name in tag_names:
                    try:
                        # Get or create tag
                        tag, tag_created = Tag.objects.get_or_create(
                            name=tag_name.lower().strip()
                        )

                        # Associate tag with document
                        doc_tag, created = DocumentTag.objects.get_or_create(
                            document=document,
                            tag=tag,
                            defaults={'created_by': document.owner}
                        )

                        if created:
                            added_tags.append(tag_name)
                            logger.info(f"Added tag '{tag_name}' to document {document.id}")

                    except Exception as e:
                        logger.error(f"Failed to add tag '{tag_name}': {e}")

                if added_tags:
                    applied_actions['added_tags'] = added_tags

            # Set confidentiality level
            if 'set_confidentiality' in actions:
                old_level = document.confidentiality_level
                new_level = actions['set_confidentiality']

                document.confidentiality_level = new_level
                changed = True

                applied_actions['set_confidentiality'] = {
                    'from': old_level,
                    'to': new_level
                }

                logger.info(
                    f"Changed document {document.id} confidentiality from "
                    f"'{old_level}' to '{new_level}'"
                )

            # Assign to department
            if 'assign_to_department' in actions:
                try:
                    dept_id = actions['assign_to_department']
                    department = Department.objects.get(id=dept_id)

                    old_dept = document.department
                    document.department = department
                    changed = True

                    applied_actions['assigned_to_department'] = {
                        'from': old_dept.name if old_dept else None,
                        'to': department.name
                    }

                    logger.info(
                        f"Assigned document {document.id} to department '{department.name}'"
                    )

                except Department.DoesNotExist:
                    logger.error(f"Department {dept_id} not found")
                    applied_actions['assigned_to_department'] = {'error': 'Department not found'}

            # Save document if any field was changed
            if changed:
                document.save()
                logger.info(f"Document {document.id} saved with classification changes")

            return {
                'success': True,
                'actions_applied': applied_actions,
                'document_modified': changed
            }

        except Exception as e:
            logger.error(
                f"Error applying actions to document {document.id}: {e}",
                exc_info=True
            )
            return {
                'success': False,
                'error': str(e),
                'actions_applied': applied_actions
            }

    @staticmethod
    @transaction.atomic
    def classify_document(document, triggered_by='auto'):
        """
        Apply all matching classification rules to a document.

        Executes rules in priority order (highest priority first).
        Creates classification log entries for audit trail.

        Args:
            document: Document instance to classify
            triggered_by: How classification was triggered (auto, manual, bulk)

        Returns:
            dict: Summary of classification results
        """
        from apps.classification.models import ClassificationRule, ClassificationLog

        logger.info(f"Starting classification for document {document.id} ({triggered_by})")

        # Get all active rules ordered by priority
        rules = ClassificationRule.objects.filter(is_active=True)

        applied_rules = []
        total_actions = 0

        for rule in rules:
            try:
                # Check if rule conditions match
                if ClassificationEngine.matches_conditions(document, rule.conditions):
                    logger.info(
                        f"Rule '{rule.name}' (ID: {rule.id}) matches document {document.id}"
                    )

                    # Apply rule actions
                    result = ClassificationEngine.apply_actions(document, rule.actions, rule)

                    # Create classification log
                    ClassificationLog.objects.create(
                        rule=rule,
                        document=document,
                        applied_at=timezone.now(),
                        conditions_matched=rule.conditions,
                        actions_applied=result.get('actions_applied', {}),
                        success=result['success'],
                        error_message=result.get('error', ''),
                        triggered_by=triggered_by
                    )

                    if result['success']:
                        applied_rules.append({
                            'rule_id': rule.id,
                            'rule_name': rule.name,
                            'actions': result['actions_applied']
                        })

                        total_actions += len(result['actions_applied'])

                        # Update rule statistics
                        rule.increment_applied_count()

            except Exception as e:
                logger.error(
                    f"Error processing rule '{rule.name}' (ID: {rule.id}): {e}",
                    exc_info=True
                )

                # Log failed classification
                ClassificationLog.objects.create(
                    rule=rule,
                    document=document,
                    applied_at=timezone.now(),
                    conditions_matched={},
                    actions_applied={},
                    success=False,
                    error_message=str(e),
                    triggered_by=triggered_by
                )

        logger.info(
            f"Classification complete for document {document.id}: "
            f"{len(applied_rules)} rules applied, {total_actions} total actions"
        )

        return {
            'success': True,
            'document_id': str(document.id),
            'rules_applied': len(applied_rules),
            'total_actions': total_actions,
            'applied_rules': applied_rules
        }

    @staticmethod
    def test_rule_against_documents(rule, document_queryset=None, limit=100):
        """
        Test a classification rule against documents without applying actions.

        Useful for rule testing and validation before activation.

        Args:
            rule: ClassificationRule instance to test
            document_queryset: Optional queryset of documents to test against
            limit: Maximum number of documents to test

        Returns:
            dict: Test results with matching document IDs
        """
        from apps.documents.models import Document

        if document_queryset is None:
            document_queryset = Document.objects.filter(is_deleted=False)

        documents = document_queryset[:limit]
        matches = []

        for doc in documents:
            if ClassificationEngine.matches_conditions(doc, rule.conditions):
                matches.append({
                    'id': str(doc.id),
                    'title': doc.title,
                    'file_name': doc.file_name,
                    'document_type': doc.document_type,
                    'confidentiality_level': doc.confidentiality_level
                })

        return {
            'rule_id': rule.id,
            'rule_name': rule.name,
            'documents_tested': len(documents),
            'matching_documents': len(matches),
            'matches': matches
        }
