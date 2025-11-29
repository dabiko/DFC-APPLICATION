"""
Celery tasks for ML classification.

Tasks include:
- Document classification on upload
- Model training and retraining
- Batch classification
- SLA monitoring for pending reviews

Phase 1: ML-Powered Classification
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def classify_document_task(self, document_id, classification_target='document_type', auto_apply=True):
    """
    Classify a document using ML.

    Called automatically after document upload/text extraction.

    Args:
        document_id: UUID of the document to classify
        classification_target: What to classify (document_type, confidentiality, etc.)
        auto_apply: Whether to auto-apply high confidence predictions

    Returns:
        dict: Classification result summary
    """
    from apps.documents.models import Document
    from apps.classification.models import MLClassificationModel

    try:
        document = Document.objects.get(id=document_id, is_deleted=False)
        logger.info(f"Starting ML classification for document {document_id}")

        # Check if there's an active model
        active_model = MLClassificationModel.get_active_model(classification_target)
        if not active_model:
            logger.warning(f"No active model for {classification_target}. Skipping classification.")
            return {
                'success': False,
                'document_id': str(document_id),
                'message': f'No active model for {classification_target}'
            }

        # Import ML engine
        from apps.classification.ml_engine import get_ml_engine
        engine = get_ml_engine()

        # Classify document
        prediction = engine.classify_document(
            document=document,
            classification_target=classification_target,
            auto_apply=auto_apply
        )

        logger.info(
            f"Classification complete for {document_id}: "
            f"{prediction.predicted_class} ({prediction.confidence_score:.1%})"
        )

        return {
            'success': True,
            'document_id': str(document_id),
            'prediction_id': prediction.id,
            'predicted_class': prediction.predicted_class,
            'confidence_score': prediction.confidence_score,
            'confidence_level': prediction.confidence_level,
            'review_status': prediction.review_status,
            'auto_applied': prediction.review_status == 'auto_applied'
        }

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'document_id': str(document_id),
            'error': 'Document not found'
        }

    except Exception as e:
        logger.error(f"Classification failed for document {document_id}: {e}", exc_info=True)
        # Retry on transient errors
        self.retry(exc=e)


@shared_task(bind=True, max_retries=1)
def train_model_task(self, classification_target='document_type', algorithm='multinomial_nb', user_id=None, **hyperparameters):
    """
    Train a new ML classification model.

    Can be triggered manually or scheduled for automatic retraining.

    Args:
        classification_target: What to train for
        algorithm: ML algorithm to use
        user_id: ID of user initiating training (optional)
        **hyperparameters: Algorithm-specific parameters

    Returns:
        dict: Training result summary
    """
    from apps.users.models import CustomUser
    from apps.classification.ml_engine import get_ml_engine

    try:
        logger.info(f"Starting model training for {classification_target} using {algorithm}")

        # Get user if provided
        user = None
        if user_id:
            try:
                user = CustomUser.objects.get(id=user_id)
            except CustomUser.DoesNotExist:
                pass

        # Train model
        engine = get_ml_engine()
        model_record = engine.train_model(
            classification_target=classification_target,
            algorithm=algorithm,
            user=user,
            **hyperparameters
        )

        logger.info(
            f"Model training complete: {model_record.name} v{model_record.version} "
            f"(accuracy: {model_record.accuracy:.2%})"
        )

        return {
            'success': True,
            'model_id': model_record.id,
            'model_name': model_record.name,
            'version': model_record.version,
            'accuracy': model_record.accuracy,
            'f1_score': model_record.f1_score,
            'training_samples': model_record.training_samples,
            'training_classes': model_record.training_classes
        }

    except Exception as e:
        logger.error(f"Model training failed: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def check_retrain_needed():
    """
    Check if model retraining is needed based on accumulated feedback.

    Runs on schedule (e.g., daily) to check if:
    - Enough new feedback has accumulated
    - Scheduled retraining time has arrived

    Triggers retraining if conditions are met.
    """
    from apps.classification.models import (
        ClassificationSettings,
        TrainingFeedback,
        MLClassificationModel
    )

    try:
        settings = ClassificationSettings.get_settings()

        if not settings.auto_retrain_enabled:
            logger.info("Auto-retrain is disabled")
            return {'retrain_triggered': False, 'reason': 'disabled'}

        # Check unused feedback count
        unused_feedback = TrainingFeedback.objects.filter(
            used_in_training=False
        ).count()

        if unused_feedback < settings.retrain_threshold:
            logger.info(
                f"Not enough feedback for retraining: {unused_feedback} < {settings.retrain_threshold}"
            )
            return {
                'retrain_triggered': False,
                'reason': 'insufficient_feedback',
                'current': unused_feedback,
                'threshold': settings.retrain_threshold
            }

        # Trigger retraining for each model type with sufficient feedback
        targets_to_retrain = []

        for target in ['document_type', 'confidentiality', 'department']:
            target_feedback = TrainingFeedback.objects.filter(
                classification_target=target,
                used_in_training=False
            ).count()

            if target_feedback >= settings.retrain_threshold // 3:  # Proportional threshold
                targets_to_retrain.append(target)

        # Trigger training tasks
        results = []
        for target in targets_to_retrain:
            result = train_model_task.delay(classification_target=target)
            results.append({
                'target': target,
                'task_id': result.id
            })
            logger.info(f"Triggered retraining for {target}")

        return {
            'retrain_triggered': True,
            'targets': targets_to_retrain,
            'tasks': results
        }

    except Exception as e:
        logger.error(f"Error checking retrain condition: {e}", exc_info=True)
        return {'retrain_triggered': False, 'error': str(e)}


@shared_task
def batch_classify_documents(document_ids, classification_target='document_type', auto_apply=True):
    """
    Classify multiple documents in batch.

    Args:
        document_ids: List of document UUIDs to classify
        classification_target: What to classify
        auto_apply: Whether to auto-apply high confidence predictions

    Returns:
        dict: Batch classification summary
    """
    from apps.documents.models import Document
    from apps.classification.models import MLClassificationModel
    from apps.classification.ml_engine import get_ml_engine

    try:
        logger.info(f"Starting batch classification for {len(document_ids)} documents")

        # Check for active model
        active_model = MLClassificationModel.get_active_model(classification_target)
        if not active_model:
            return {
                'success': False,
                'message': f'No active model for {classification_target}'
            }

        engine = get_ml_engine()
        results = {
            'total': len(document_ids),
            'successful': 0,
            'failed': 0,
            'auto_applied': 0,
            'pending_review': 0,
            'errors': []
        }

        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id, is_deleted=False)
                prediction = engine.classify_document(
                    document=document,
                    classification_target=classification_target,
                    auto_apply=auto_apply
                )

                results['successful'] += 1

                if prediction.review_status == 'auto_applied':
                    results['auto_applied'] += 1
                else:
                    results['pending_review'] += 1

            except Document.DoesNotExist:
                results['failed'] += 1
                results['errors'].append({
                    'document_id': str(doc_id),
                    'error': 'Document not found'
                })

            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'document_id': str(doc_id),
                    'error': str(e)
                })

        logger.info(
            f"Batch classification complete: {results['successful']}/{results['total']} successful, "
            f"{results['auto_applied']} auto-applied"
        )

        results['success'] = True
        return results

    except Exception as e:
        logger.error(f"Batch classification failed: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@shared_task
def send_low_confidence_notification(prediction_id):
    """
    Send notification for low confidence predictions requiring review.

    Args:
        prediction_id: ID of the ClassificationPrediction
    """
    from apps.classification.models import ClassificationPrediction, ClassificationSettings

    try:
        settings = ClassificationSettings.get_settings()
        if not settings.notify_on_low_confidence:
            return {'notified': False, 'reason': 'notifications_disabled'}

        prediction = ClassificationPrediction.objects.select_related(
            'document', 'document__owner'
        ).get(id=prediction_id)

        # Only notify for pending low/medium confidence predictions
        if prediction.review_status != 'pending':
            return {'notified': False, 'reason': 'not_pending'}

        if prediction.confidence_level == 'high':
            return {'notified': False, 'reason': 'high_confidence'}

        # Send notification to document owner
        owner = prediction.document.owner
        if owner and owner.email:
            # TODO: Integrate with actual notification system
            logger.info(
                f"Would send notification to {owner.email} for prediction {prediction_id}: "
                f"{prediction.predicted_class} ({prediction.confidence_score:.1%})"
            )

            return {
                'notified': True,
                'user': owner.email,
                'prediction_id': prediction_id,
                'confidence': prediction.confidence_score
            }

        return {'notified': False, 'reason': 'no_owner_email'}

    except ClassificationPrediction.DoesNotExist:
        logger.error(f"Prediction {prediction_id} not found")
        return {'notified': False, 'error': 'Prediction not found'}

    except Exception as e:
        logger.error(f"Failed to send notification: {e}", exc_info=True)
        return {'notified': False, 'error': str(e)}


@shared_task
def cleanup_old_predictions(days=90):
    """
    Clean up old reviewed predictions to save database space.

    Keeps:
    - All pending predictions
    - Recent predictions (within specified days)
    - Predictions used for training feedback

    Args:
        days: Age threshold for deletion

    Returns:
        dict: Cleanup summary
    """
    from apps.classification.models import ClassificationPrediction
    from datetime import timedelta

    try:
        cutoff_date = timezone.now() - timedelta(days=days)

        # Delete old non-pending predictions that aren't referenced by feedback
        old_predictions = ClassificationPrediction.objects.filter(
            created_at__lt=cutoff_date
        ).exclude(
            review_status='pending'
        ).exclude(
            feedback__isnull=False  # Keep predictions with feedback
        )

        count = old_predictions.count()
        old_predictions.delete()

        logger.info(f"Cleaned up {count} old predictions older than {days} days")

        return {
            'success': True,
            'deleted_count': count,
            'cutoff_date': cutoff_date.isoformat()
        }

    except Exception as e:
        logger.error(f"Prediction cleanup failed: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@shared_task
def generate_classification_report():
    """
    Generate a daily/weekly classification statistics report.

    Collects:
    - Prediction counts by confidence level
    - Auto-apply vs pending review ratios
    - Model accuracy metrics
    - Trending document types

    Returns:
        dict: Classification statistics report
    """
    from apps.classification.ml_engine import get_ml_engine
    from apps.classification.models import (
        ClassificationPrediction,
        MLClassificationModel
    )
    from django.db.models import Count, Avg
    from datetime import timedelta

    try:
        engine = get_ml_engine()
        stats = engine.get_classification_stats()

        # Add time-based stats (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)

        weekly_predictions = ClassificationPrediction.objects.filter(
            created_at__gte=week_ago
        )

        stats['weekly_stats'] = {
            'total_predictions': weekly_predictions.count(),
            'auto_applied': weekly_predictions.filter(review_status='auto_applied').count(),
            'confirmed': weekly_predictions.filter(review_status='confirmed').count(),
            'corrected': weekly_predictions.filter(review_status='corrected').count(),
            'pending': weekly_predictions.filter(review_status='pending').count(),
        }

        # Top predicted classes this week
        top_classes = (
            weekly_predictions
            .values('predicted_class')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        stats['top_predicted_classes'] = list(top_classes)

        # Average confidence by class
        avg_confidence = (
            weekly_predictions
            .values('predicted_class')
            .annotate(avg_confidence=Avg('confidence_score'))
            .order_by('-avg_confidence')[:10]
        )
        stats['avg_confidence_by_class'] = list(avg_confidence)

        logger.info("Classification report generated")

        return {
            'success': True,
            'report_date': timezone.now().isoformat(),
            'stats': stats
        }

    except Exception as e:
        logger.error(f"Failed to generate classification report: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}
