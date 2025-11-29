"""
ML Classification Engine for document classification.

This module implements the machine learning pipeline for:
- Feature extraction from documents (TF-IDF, metadata features)
- Model training with scikit-learn
- Prediction with confidence scoring
- Three-tier confidence routing (High/Medium/Low)
- Self-learning from user feedback

Phase 1: ML-Powered Classification
"""
import os
import pickle
import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any

from django.conf import settings
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)

# ML imports - wrapped in try/except for graceful degradation
try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.svm import LinearSVC
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        confusion_matrix,
        classification_report
    )
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("scikit-learn not installed. ML classification disabled.")


class MLClassificationEngine:
    """
    Machine Learning engine for document classification.

    Provides:
    - Feature extraction from document text and metadata
    - Model training with multiple algorithm options
    - Prediction with confidence scores
    - Three-tier confidence routing
    """

    # Model storage directory
    MODELS_DIR = os.path.join(settings.BASE_DIR, 'ml_models')

    # Supported algorithms
    ALGORITHMS = {
        'multinomial_nb': MultinomialNB if ML_AVAILABLE else None,
        'random_forest': RandomForestClassifier if ML_AVAILABLE else None,
        'svm': LinearSVC if ML_AVAILABLE else None,
    }

    def __init__(self):
        """Initialize the ML engine."""
        if not ML_AVAILABLE:
            raise RuntimeError("scikit-learn is not installed. Please install it with: pip install scikit-learn")

        # Ensure models directory exists
        os.makedirs(self.MODELS_DIR, exist_ok=True)

    @staticmethod
    def extract_features(document, settings_obj=None) -> str:
        """
        Extract text features from a document for ML classification.

        Combines:
        - Extracted text content
        - Filename (optional)
        - File type (optional)

        Args:
            document: Document model instance
            settings_obj: ClassificationSettings instance (optional)

        Returns:
            Combined feature string for vectorization
        """
        from apps.classification.models import ClassificationSettings

        if settings_obj is None:
            settings_obj = ClassificationSettings.get_settings()

        features = []

        # Add extracted text content
        if document.extracted_text:
            text = document.extracted_text[:settings_obj.max_text_length]
            features.append(text)

        # Add filename
        if settings_obj.include_filename and document.file_name:
            # Extract meaningful parts from filename
            filename_parts = document.file_name.replace('_', ' ').replace('-', ' ')
            features.append(filename_parts)

        # Add file type
        if settings_obj.include_file_type and document.file_type:
            features.append(document.file_type)

        return ' '.join(features)

    def prepare_training_data(
        self,
        classification_target: str = 'document_type',
        min_samples_per_class: int = 5
    ) -> Tuple[List[str], List[str], List[str]]:
        """
        Prepare training data from existing documents and feedback.

        Sources:
        1. Documents with confirmed classifications
        2. User feedback/corrections
        3. Rule-based classification logs

        Args:
            classification_target: Which field to train for
            min_samples_per_class: Minimum samples required per class

        Returns:
            Tuple of (texts, labels, document_ids)
        """
        from apps.documents.models import Document
        from apps.classification.models import TrainingFeedback, ClassificationLog

        texts = []
        labels = []
        doc_ids = []

        # 1. Get documents with known classifications
        if classification_target == 'document_type':
            documents = Document.objects.filter(
                is_deleted=False,
                document_type__isnull=False
            ).exclude(document_type='').exclude(document_type='UNCLASSIFIED')

            for doc in documents:
                text = self.extract_features(doc)
                if text.strip():
                    texts.append(text)
                    labels.append(doc.document_type)
                    doc_ids.append(str(doc.id))

        elif classification_target == 'confidentiality':
            documents = Document.objects.filter(
                is_deleted=False,
                confidentiality_level__isnull=False
            ).exclude(confidentiality_level='')

            for doc in documents:
                text = self.extract_features(doc)
                if text.strip():
                    texts.append(text)
                    labels.append(doc.confidentiality_level)
                    doc_ids.append(str(doc.id))

        # 2. Add training feedback (user corrections)
        feedback = TrainingFeedback.objects.filter(
            classification_target=classification_target,
            used_in_training=False
        ).select_related('document')

        for fb in feedback:
            if fb.document and not fb.document.is_deleted:
                text = fb.feature_text or self.extract_features(fb.document)
                if text.strip():
                    texts.append(text)
                    labels.append(fb.corrected_class)
                    doc_ids.append(str(fb.document.id))

        # 3. Filter out classes with too few samples
        from collections import Counter
        label_counts = Counter(labels)

        filtered_texts = []
        filtered_labels = []
        filtered_ids = []

        for text, label, doc_id in zip(texts, labels, doc_ids):
            if label_counts[label] >= min_samples_per_class:
                filtered_texts.append(text)
                filtered_labels.append(label)
                filtered_ids.append(doc_id)

        logger.info(
            f"Prepared {len(filtered_texts)} training samples for {classification_target}. "
            f"Classes: {dict(Counter(filtered_labels))}"
        )

        return filtered_texts, filtered_labels, filtered_ids

    def train_model(
        self,
        classification_target: str = 'document_type',
        algorithm: str = 'multinomial_nb',
        test_size: float = 0.2,
        user=None,
        **hyperparameters
    ) -> 'MLClassificationModel':
        """
        Train a new ML classification model.

        Args:
            classification_target: What to classify (document_type, confidentiality, etc.)
            algorithm: ML algorithm to use
            test_size: Fraction of data to use for testing
            user: User initiating the training
            **hyperparameters: Algorithm-specific hyperparameters

        Returns:
            MLClassificationModel instance with trained model
        """
        from apps.classification.models import (
            MLClassificationModel,
            TrainingFeedback,
            ClassificationSettings
        )

        logger.info(f"Starting model training for {classification_target} using {algorithm}")

        # Create model record
        version = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_record = MLClassificationModel.objects.create(
            name=f"{classification_target.replace('_', ' ').title()} Classifier",
            model_type=classification_target,
            version=version,
            status=MLClassificationModel.ModelStatus.TRAINING,
            algorithm=algorithm,
            hyperparameters=hyperparameters,
            training_started_at=timezone.now(),
            created_by=user
        )

        try:
            # Prepare training data
            texts, labels, doc_ids = self.prepare_training_data(
                classification_target=classification_target
            )

            settings_obj = ClassificationSettings.get_settings()
            if len(texts) < settings_obj.min_training_samples:
                raise ValueError(
                    f"Insufficient training data: {len(texts)} samples. "
                    f"Minimum required: {settings_obj.min_training_samples}"
                )

            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                texts, labels, test_size=test_size, random_state=42, stratify=labels
            )

            # Create vectorizer
            vectorizer = TfidfVectorizer(
                max_features=hyperparameters.get('max_features', 5000),
                ngram_range=tuple(hyperparameters.get('ngram_range', [1, 2])),
                stop_words='english',
                lowercase=True,
                strip_accents='unicode'
            )

            # Create classifier
            AlgorithmClass = self.ALGORITHMS.get(algorithm)
            if AlgorithmClass is None:
                raise ValueError(f"Unknown algorithm: {algorithm}")

            if algorithm == 'multinomial_nb':
                classifier = AlgorithmClass(
                    alpha=hyperparameters.get('alpha', 1.0)
                )
            elif algorithm == 'random_forest':
                classifier = AlgorithmClass(
                    n_estimators=hyperparameters.get('n_estimators', 100),
                    max_depth=hyperparameters.get('max_depth', None),
                    n_jobs=-1,
                    random_state=42
                )
            elif algorithm == 'svm':
                classifier = AlgorithmClass(
                    C=hyperparameters.get('C', 1.0),
                    max_iter=hyperparameters.get('max_iter', 1000),
                    random_state=42
                )
            else:
                classifier = AlgorithmClass()

            # Train
            X_train_vec = vectorizer.fit_transform(X_train)
            classifier.fit(X_train_vec, y_train)

            # Evaluate
            X_test_vec = vectorizer.transform(X_test)
            y_pred = classifier.predict(X_test_vec)

            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

            # Get unique classes
            classes = list(set(labels))

            # Confusion matrix
            cm = confusion_matrix(y_test, y_pred, labels=classes)
            cm_dict = {
                'labels': classes,
                'matrix': cm.tolist()
            }

            # Classification report
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

            # Save model and vectorizer
            model_filename = f"model_{classification_target}_{version}.pkl"
            vectorizer_filename = f"vectorizer_{classification_target}_{version}.pkl"

            model_path = os.path.join(self.MODELS_DIR, model_filename)
            vectorizer_path = os.path.join(self.MODELS_DIR, vectorizer_filename)

            with open(model_path, 'wb') as f:
                pickle.dump(classifier, f)

            with open(vectorizer_path, 'wb') as f:
                pickle.dump(vectorizer, f)

            # Update model record
            training_end = timezone.now()
            model_record.model_file_path = model_path
            model_record.vectorizer_file_path = vectorizer_path
            model_record.training_samples = len(texts)
            model_record.training_classes = classes
            model_record.training_completed_at = training_end
            model_record.training_duration_seconds = (
                training_end - model_record.training_started_at
            ).total_seconds()
            model_record.accuracy = accuracy
            model_record.precision = precision
            model_record.recall = recall
            model_record.f1_score = f1
            model_record.confusion_matrix = cm_dict
            model_record.classification_report = report
            model_record.status = MLClassificationModel.ModelStatus.READY
            model_record.feature_config = {
                'max_features': hyperparameters.get('max_features', 5000),
                'ngram_range': hyperparameters.get('ngram_range', [1, 2]),
            }
            model_record.save()

            # Mark training feedback as used
            TrainingFeedback.objects.filter(
                classification_target=classification_target,
                used_in_training=False
            ).update(used_in_training=True, trained_model=model_record)

            logger.info(
                f"Model training complete. Accuracy: {accuracy:.2%}, "
                f"F1: {f1:.2%}, Samples: {len(texts)}"
            )

            return model_record

        except Exception as e:
            logger.error(f"Model training failed: {e}", exc_info=True)
            model_record.status = MLClassificationModel.ModelStatus.FAILED
            model_record.save()
            raise

    def load_model(self, model_record: 'MLClassificationModel') -> Tuple[Any, Any]:
        """
        Load a trained model and vectorizer from disk.

        Args:
            model_record: MLClassificationModel instance

        Returns:
            Tuple of (classifier, vectorizer)
        """
        if not model_record.model_file_path or not model_record.vectorizer_file_path:
            raise ValueError("Model files not available")

        with open(model_record.model_file_path, 'rb') as f:
            classifier = pickle.load(f)

        with open(model_record.vectorizer_file_path, 'rb') as f:
            vectorizer = pickle.load(f)

        return classifier, vectorizer

    def predict(
        self,
        document,
        classification_target: str = 'document_type',
        model_record: 'MLClassificationModel' = None
    ) -> Dict[str, Any]:
        """
        Make a prediction for a document.

        Args:
            document: Document instance to classify
            classification_target: What to predict
            model_record: Specific model to use (defaults to active model)

        Returns:
            Dict with prediction details:
            {
                'predicted_class': str,
                'confidence_score': float,
                'confidence_level': str,
                'class_probabilities': dict,
                'model_id': int
            }
        """
        from apps.classification.models import MLClassificationModel, ClassificationSettings

        # Get model
        if model_record is None:
            model_record = MLClassificationModel.get_active_model(classification_target)

        if model_record is None:
            raise ValueError(f"No active model for {classification_target}")

        # Load model
        classifier, vectorizer = self.load_model(model_record)

        # Extract features
        text = self.extract_features(document)

        if not text.strip():
            raise ValueError("Document has no extractable text for classification")

        # Vectorize
        X = vectorizer.transform([text])

        # Predict
        predicted_class = classifier.predict(X)[0]

        # Get probabilities (if available)
        if hasattr(classifier, 'predict_proba'):
            probabilities = classifier.predict_proba(X)[0]
            classes = classifier.classes_
            class_probs = {cls: float(prob) for cls, prob in zip(classes, probabilities)}
            confidence_score = max(probabilities)
        else:
            # For classifiers without predict_proba (e.g., LinearSVC)
            decision = classifier.decision_function(X)[0]
            # Convert decision function to pseudo-probabilities using softmax
            if len(decision.shape) == 0:
                # Binary classification
                confidence_score = 1 / (1 + np.exp(-abs(float(decision))))
                class_probs = {predicted_class: confidence_score}
            else:
                exp_decision = np.exp(decision - np.max(decision))
                probabilities = exp_decision / exp_decision.sum()
                classes = classifier.classes_
                class_probs = {cls: float(prob) for cls, prob in zip(classes, probabilities)}
                confidence_score = max(probabilities)

        # Determine confidence level
        settings_obj = ClassificationSettings.get_settings()
        if confidence_score >= settings_obj.high_confidence_threshold:
            confidence_level = 'high'
        elif confidence_score >= settings_obj.medium_confidence_threshold:
            confidence_level = 'medium'
        else:
            confidence_level = 'low'

        return {
            'predicted_class': predicted_class,
            'confidence_score': confidence_score,
            'confidence_level': confidence_level,
            'class_probabilities': class_probs,
            'model_id': model_record.id,
            'model_version': model_record.version,
            'feature_snapshot': {
                'text_length': len(text),
                'filename': document.file_name,
                'file_type': document.file_type
            }
        }

    @transaction.atomic
    def classify_document(
        self,
        document,
        classification_target: str = 'document_type',
        auto_apply: bool = True
    ) -> 'ClassificationPrediction':
        """
        Classify a document and optionally auto-apply the result.

        Implements the three-tier confidence system:
        - High (>95%): Auto-apply if enabled
        - Medium (85-95%): Create pending prediction for review
        - Low (<85%): Create pending prediction requiring manual review

        Args:
            document: Document to classify
            classification_target: What to predict
            auto_apply: Whether to auto-apply high confidence predictions

        Returns:
            ClassificationPrediction instance
        """
        from apps.classification.models import (
            ClassificationPrediction,
            ClassificationSettings,
            MLClassificationModel
        )

        settings_obj = ClassificationSettings.get_settings()

        # Make prediction
        result = self.predict(document, classification_target)

        # Determine review status and whether to apply
        should_apply = False
        review_status = ClassificationPrediction.ReviewStatus.PENDING

        if auto_apply and settings_obj.auto_apply_enabled:
            if result['confidence_level'] == 'high':
                # Check if auto-apply is enabled for this target
                if classification_target == 'document_type' and settings_obj.auto_apply_document_type:
                    should_apply = True
                    review_status = ClassificationPrediction.ReviewStatus.AUTO_APPLIED
                elif classification_target == 'confidentiality' and settings_obj.auto_apply_confidentiality:
                    should_apply = True
                    review_status = ClassificationPrediction.ReviewStatus.AUTO_APPLIED
                elif classification_target == 'department' and settings_obj.auto_apply_department:
                    should_apply = True
                    review_status = ClassificationPrediction.ReviewStatus.AUTO_APPLIED

        # Apply classification if appropriate
        actions_applied = {}
        if should_apply:
            if classification_target == 'document_type':
                old_type = document.document_type
                document.document_type = result['predicted_class']
                document.save(update_fields=['document_type', 'updated_at'])
                actions_applied['set_document_type'] = {
                    'from': old_type,
                    'to': result['predicted_class']
                }
            elif classification_target == 'confidentiality':
                old_level = document.confidentiality_level
                document.confidentiality_level = result['predicted_class']
                document.save(update_fields=['confidentiality_level', 'updated_at'])
                actions_applied['set_confidentiality'] = {
                    'from': old_level,
                    'to': result['predicted_class']
                }

            logger.info(
                f"Auto-applied {classification_target}={result['predicted_class']} "
                f"to document {document.id} (confidence: {result['confidence_score']:.1%})"
            )

        # Create prediction record
        model_record = MLClassificationModel.objects.get(id=result['model_id'])
        prediction = ClassificationPrediction.objects.create(
            document=document,
            model=model_record,
            predicted_class=result['predicted_class'],
            confidence_score=result['confidence_score'],
            confidence_level=result['confidence_level'],
            class_probabilities=result['class_probabilities'],
            review_status=review_status,
            actions_applied=actions_applied,
            feature_snapshot=result['feature_snapshot']
        )

        # Update model usage stats
        model_record.increment_predictions()

        return prediction

    def get_review_queue(
        self,
        classification_target: str = None,
        confidence_level: str = None,
        limit: int = 50
    ) -> List['ClassificationPrediction']:
        """
        Get predictions pending review.

        Args:
            classification_target: Filter by target type
            confidence_level: Filter by confidence level
            limit: Maximum items to return

        Returns:
            List of ClassificationPrediction instances
        """
        from apps.classification.models import ClassificationPrediction

        queryset = ClassificationPrediction.objects.filter(
            review_status=ClassificationPrediction.ReviewStatus.PENDING
        ).select_related('document', 'model')

        if classification_target:
            queryset = queryset.filter(model__model_type=classification_target)

        if confidence_level:
            queryset = queryset.filter(confidence_level=confidence_level)

        return list(queryset.order_by('-created_at')[:limit])

    def get_classification_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the ML classification system.

        Returns:
            Dict with various statistics
        """
        from apps.classification.models import (
            MLClassificationModel,
            ClassificationPrediction,
            TrainingFeedback
        )
        from django.db.models import Count, Avg

        # Model stats
        active_models = MLClassificationModel.objects.filter(
            status=MLClassificationModel.ModelStatus.ACTIVE
        ).count()

        total_models = MLClassificationModel.objects.count()

        # Prediction stats
        total_predictions = ClassificationPrediction.objects.count()

        predictions_by_status = dict(
            ClassificationPrediction.objects.values('review_status')
            .annotate(count=Count('id'))
            .values_list('review_status', 'count')
        )

        predictions_by_confidence = dict(
            ClassificationPrediction.objects.values('confidence_level')
            .annotate(count=Count('id'))
            .values_list('confidence_level', 'count')
        )

        # Accuracy stats
        confirmed = ClassificationPrediction.objects.filter(
            review_status=ClassificationPrediction.ReviewStatus.CONFIRMED
        ).count()

        corrected = ClassificationPrediction.objects.filter(
            review_status=ClassificationPrediction.ReviewStatus.CORRECTED
        ).count()

        if confirmed + corrected > 0:
            production_accuracy = confirmed / (confirmed + corrected)
        else:
            production_accuracy = None

        # Pending review count
        pending_review = ClassificationPrediction.objects.filter(
            review_status=ClassificationPrediction.ReviewStatus.PENDING
        ).count()

        # Training feedback stats
        unused_feedback = TrainingFeedback.objects.filter(
            used_in_training=False
        ).count()

        return {
            'active_models': active_models,
            'total_models': total_models,
            'total_predictions': total_predictions,
            'predictions_by_status': predictions_by_status,
            'predictions_by_confidence': predictions_by_confidence,
            'production_accuracy': production_accuracy,
            'confirmed_predictions': confirmed,
            'corrected_predictions': corrected,
            'pending_review': pending_review,
            'unused_feedback': unused_feedback
        }


# Singleton instance
_ml_engine = None


def get_ml_engine() -> MLClassificationEngine:
    """Get or create the ML engine singleton."""
    global _ml_engine
    if _ml_engine is None:
        _ml_engine = MLClassificationEngine()
    return _ml_engine
