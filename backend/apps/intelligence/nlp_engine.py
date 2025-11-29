"""
NLP Engine for Document Intelligence

This module provides the core NLP processing capabilities:
- Named Entity Recognition (NER)
- Table Extraction
- Document Summarization
- Key-Value Pair Extraction

Uses a combination of:
- spaCy for NER and text processing
- regex patterns for structured data extraction
- extractive summarization algorithms
- camelot/tabula for table extraction from PDFs
"""
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes for Extraction Results
# =============================================================================

@dataclass
class ExtractedEntityResult:
    """Result from entity extraction."""
    entity_type: str
    value: str
    normalized_value: str = ''
    start_position: int = 0
    end_position: int = 0
    page_number: int = 0
    context: str = ''
    confidence_score: float = 0.8
    extraction_method: str = 'nlp'


@dataclass
class ExtractedTableResult:
    """Result from table extraction."""
    table_number: int
    headers: List[str] = field(default_factory=list)
    rows: List[List[str]] = field(default_factory=list)
    page_number: int = 0
    title: str = ''
    confidence_score: float = 0.8
    table_type: str = 'generic'
    raw_html: str = ''
    raw_markdown: str = ''
    has_merged_cells: bool = False


@dataclass
class KeyValueResult:
    """Result from key-value extraction."""
    key: str
    value: str
    normalized_key: str = ''
    normalized_value: str = ''
    value_type: str = 'text'
    page_number: int = 0
    confidence_score: float = 0.8
    group_name: str = ''
    group_order: int = 0


@dataclass
class SummaryResult:
    """Result from document summarization."""
    summary_text: str
    summary_type: str = 'STANDARD'
    key_points: List[str] = field(default_factory=list)
    topics: List[str] = field(default_factory=list)
    sentiment: str = 'neutral'
    sentiment_score: float = 0.0
    word_count: int = 0
    compression_ratio: float = 0.0


# =============================================================================
# NLP Engine Class
# =============================================================================

class NLPEngine:
    """
    Main NLP processing engine for document intelligence.

    Usage:
        engine = NLPEngine()

        # Extract entities
        entities = engine.extract_entities(text)

        # Extract key-value pairs
        kvs = engine.extract_key_values(text)

        # Generate summary
        summary = engine.summarize(text, summary_type='STANDARD')
    """

    # Common patterns for entity extraction
    PATTERNS = {
        'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'PHONE': r'(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}',
        'MONEY': r'\$[\d,]+(?:\.\d{2})?|\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?)\b',
        'PERCENTAGE': r'\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*percent\b',
        'DATE': r'\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b',
        'ACCOUNT_NUMBER': r'\b(?:Acc(?:ount)?\.?\s*(?:#|No\.?|Number)?:?\s*)(\d{4,20})\b|\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b',
        'REFERENCE': r'\b(?:Ref(?:erence)?\.?\s*(?:#|No\.?|Number)?:?\s*)([A-Z0-9-]{4,20})\b|\b(?:INV|PO|SO|REF|DOC|ID)[-#]?\d{3,15}\b',
    }

    # Common key-value patterns for document extraction
    KEY_VALUE_PATTERNS = [
        # Label: Value format
        (r'([A-Za-z][A-Za-z\s]{2,30}?):\s*([^\n]{1,200})', 'colon'),
        # Label = Value format
        (r'([A-Za-z][A-Za-z\s]{2,30}?)\s*=\s*([^\n]{1,200})', 'equals'),
        # Tabular format (label followed by value on right)
        (r'^([A-Za-z][A-Za-z\s]{2,30}?)\t+(.+?)$', 'tabular'),
    ]

    # Financial document key mappings
    FINANCIAL_KEYS = {
        'invoice number': 'invoice_number',
        'invoice no': 'invoice_number',
        'inv #': 'invoice_number',
        'invoice #': 'invoice_number',
        'invoice date': 'invoice_date',
        'date': 'date',
        'due date': 'due_date',
        'payment due': 'due_date',
        'total': 'total_amount',
        'total amount': 'total_amount',
        'grand total': 'total_amount',
        'subtotal': 'subtotal',
        'sub total': 'subtotal',
        'tax': 'tax_amount',
        'vat': 'tax_amount',
        'discount': 'discount_amount',
        'customer': 'customer_name',
        'bill to': 'customer_name',
        'vendor': 'vendor_name',
        'from': 'vendor_name',
        'po number': 'po_number',
        'purchase order': 'po_number',
        'account number': 'account_number',
        'account no': 'account_number',
    }

    def __init__(self, spacy_model: str = 'en_core_web_sm'):
        """
        Initialize the NLP engine.

        Args:
            spacy_model: spaCy model to use for NER
        """
        self._nlp = None
        self._spacy_model = spacy_model

    @property
    def nlp(self):
        """Lazy load spaCy model."""
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load(self._spacy_model)
            except (ImportError, OSError) as e:
                logger.warning(f"spaCy not available: {e}. Using regex-only extraction.")
                self._nlp = None
        return self._nlp

    # =========================================================================
    # Entity Extraction
    # =========================================================================

    def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None,
        min_confidence: float = 0.6
    ) -> List[ExtractedEntityResult]:
        """
        Extract named entities from text.

        Args:
            text: Input text to process
            entity_types: List of entity types to extract (None = all)
            min_confidence: Minimum confidence threshold

        Returns:
            List of ExtractedEntityResult objects
        """
        entities = []

        # Extract using regex patterns
        regex_entities = self._extract_entities_regex(text, entity_types)
        entities.extend(regex_entities)

        # Extract using spaCy NER if available
        if self.nlp is not None:
            spacy_entities = self._extract_entities_spacy(text, entity_types)
            entities.extend(spacy_entities)

        # Deduplicate and filter by confidence
        entities = self._deduplicate_entities(entities)
        entities = [e for e in entities if e.confidence_score >= min_confidence]

        return entities

    def _extract_entities_regex(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[ExtractedEntityResult]:
        """Extract entities using regex patterns."""
        entities = []

        for entity_type, pattern in self.PATTERNS.items():
            if entity_types and entity_type not in entity_types:
                continue

            for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
                value = match.group()
                normalized = self._normalize_entity(entity_type, value)

                # Get context (50 chars before and after)
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end]

                entities.append(ExtractedEntityResult(
                    entity_type=entity_type,
                    value=value,
                    normalized_value=normalized,
                    start_position=match.start(),
                    end_position=match.end(),
                    context=context,
                    confidence_score=0.85,  # Regex matches are fairly reliable
                    extraction_method='regex'
                ))

        return entities

    def _extract_entities_spacy(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[ExtractedEntityResult]:
        """Extract entities using spaCy NER."""
        entities = []

        # Map spaCy entity types to our types
        spacy_mapping = {
            'PERSON': 'PERSON',
            'ORG': 'ORGANIZATION',
            'GPE': 'LOCATION',
            'LOC': 'LOCATION',
            'DATE': 'DATE',
            'MONEY': 'MONEY',
            'PERCENT': 'PERCENTAGE',
        }

        try:
            doc = self.nlp(text[:100000])  # Limit text length for performance

            for ent in doc.ents:
                entity_type = spacy_mapping.get(ent.label_)
                if entity_type is None:
                    continue

                if entity_types and entity_type not in entity_types:
                    continue

                # Get context
                start = max(0, ent.start_char - 50)
                end = min(len(text), ent.end_char + 50)
                context = text[start:end]

                normalized = self._normalize_entity(entity_type, ent.text)

                entities.append(ExtractedEntityResult(
                    entity_type=entity_type,
                    value=ent.text,
                    normalized_value=normalized,
                    start_position=ent.start_char,
                    end_position=ent.end_char,
                    context=context,
                    confidence_score=0.75,  # spaCy NER confidence
                    extraction_method='spacy'
                ))
        except Exception as e:
            logger.error(f"spaCy entity extraction failed: {e}")

        return entities

    def _normalize_entity(self, entity_type: str, value: str) -> str:
        """Normalize entity value based on type."""
        if entity_type == 'MONEY':
            # Extract numeric value
            cleaned = re.sub(r'[^\d.]', '', value)
            try:
                return str(Decimal(cleaned))
            except Exception:
                return value
        elif entity_type == 'PERCENTAGE':
            cleaned = re.sub(r'[^\d.]', '', value)
            return cleaned
        elif entity_type == 'EMAIL':
            return value.lower()
        elif entity_type == 'PHONE':
            # Remove non-digit characters
            return re.sub(r'\D', '', value)
        elif entity_type == 'DATE':
            # Try to parse and standardize date
            try:
                from dateutil import parser
                parsed = parser.parse(value, fuzzy=True)
                return parsed.strftime('%Y-%m-%d')
            except Exception:
                return value
        return value

    def _deduplicate_entities(
        self,
        entities: List[ExtractedEntityResult]
    ) -> List[ExtractedEntityResult]:
        """Remove duplicate entities, keeping highest confidence."""
        seen = {}
        for entity in entities:
            key = (entity.entity_type, entity.normalized_value or entity.value)
            if key not in seen or entity.confidence_score > seen[key].confidence_score:
                seen[key] = entity
        return list(seen.values())

    # =========================================================================
    # Key-Value Extraction
    # =========================================================================

    def extract_key_values(
        self,
        text: str,
        document_type: Optional[str] = None,
        min_confidence: float = 0.6
    ) -> List[KeyValueResult]:
        """
        Extract key-value pairs from document text.

        Args:
            text: Input text to process
            document_type: Document type for template matching
            min_confidence: Minimum confidence threshold

        Returns:
            List of KeyValueResult objects
        """
        results = []

        # Extract using patterns
        for pattern, method in self.KEY_VALUE_PATTERNS:
            for match in re.finditer(pattern, text, re.MULTILINE | re.IGNORECASE):
                key = match.group(1).strip()
                value = match.group(2).strip()

                # Skip if key or value is too long or empty
                if not key or not value or len(key) > 50 or len(value) > 500:
                    continue

                # Normalize key
                normalized_key = self._normalize_key(key)

                # Determine value type
                value_type = self._detect_value_type(value)
                normalized_value = self._normalize_value(value, value_type)

                # Calculate confidence based on key recognition
                confidence = 0.9 if normalized_key in self.FINANCIAL_KEYS.values() else 0.7

                results.append(KeyValueResult(
                    key=key,
                    value=value,
                    normalized_key=normalized_key,
                    normalized_value=normalized_value,
                    value_type=value_type,
                    confidence_score=confidence
                ))

        # Deduplicate
        seen = set()
        unique_results = []
        for r in results:
            key = (r.normalized_key, r.normalized_value)
            if key not in seen:
                seen.add(key)
                unique_results.append(r)

        return [r for r in unique_results if r.confidence_score >= min_confidence]

    def _normalize_key(self, key: str) -> str:
        """Normalize a key to standard format."""
        key_lower = key.lower().strip()

        # Check for known mappings
        for pattern, normalized in self.FINANCIAL_KEYS.items():
            if pattern in key_lower:
                return normalized

        # Convert to snake_case
        normalized = re.sub(r'[^a-z0-9]+', '_', key_lower)
        normalized = re.sub(r'_+', '_', normalized).strip('_')
        return normalized

    def _detect_value_type(self, value: str) -> str:
        """Detect the data type of a value."""
        value = value.strip()

        # Check for currency
        if re.match(r'^\$[\d,]+(?:\.\d{2})?$', value):
            return 'currency'

        # Check for percentage
        if re.match(r'^\d+(?:\.\d+)?%$', value):
            return 'percentage'

        # Check for date
        date_patterns = [
            r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$',
            r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}$',
            r'^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}$',
        ]
        for pattern in date_patterns:
            if re.match(pattern, value, re.IGNORECASE):
                return 'date'

        # Check for number
        if re.match(r'^[\d,]+(?:\.\d+)?$', value):
            return 'number'

        # Check for boolean
        if value.lower() in ('yes', 'no', 'true', 'false', 'y', 'n'):
            return 'boolean'

        return 'text'

    def _normalize_value(self, value: str, value_type: str) -> str:
        """Normalize a value based on its type."""
        if value_type == 'currency':
            return re.sub(r'[^\d.]', '', value)
        elif value_type == 'percentage':
            return re.sub(r'[^\d.]', '', value)
        elif value_type == 'number':
            return re.sub(r'[^\d.]', '', value)
        elif value_type == 'boolean':
            return 'true' if value.lower() in ('yes', 'true', 'y') else 'false'
        elif value_type == 'date':
            try:
                from dateutil import parser
                parsed = parser.parse(value, fuzzy=True)
                return parsed.strftime('%Y-%m-%d')
            except Exception:
                return value
        return value

    # =========================================================================
    # Document Summarization
    # =========================================================================

    def summarize(
        self,
        text: str,
        summary_type: str = 'STANDARD',
        max_length: int = 500
    ) -> SummaryResult:
        """
        Generate a summary of the document text.

        Uses extractive summarization to select key sentences.

        Args:
            text: Input text to summarize
            summary_type: Type of summary (BRIEF, STANDARD, DETAILED, BULLET_POINTS)
            max_length: Maximum summary length in words

        Returns:
            SummaryResult object
        """
        # Split into sentences
        sentences = self._split_sentences(text)

        if not sentences:
            return SummaryResult(
                summary_text="",
                summary_type=summary_type,
                word_count=0
            )

        # Score sentences
        scored = self._score_sentences(sentences, text)

        # Determine how many sentences to include
        if summary_type == 'BRIEF':
            num_sentences = min(2, len(scored))
        elif summary_type == 'BULLET_POINTS':
            num_sentences = min(7, len(scored))
        elif summary_type == 'DETAILED':
            num_sentences = min(10, len(scored))
        else:  # STANDARD
            num_sentences = min(5, len(scored))

        # Select top sentences
        top_sentences = sorted(scored[:num_sentences], key=lambda x: x[1])

        # Generate summary
        if summary_type == 'BULLET_POINTS':
            summary_text = '\n'.join([f"• {s[0]}" for s in top_sentences])
        else:
            summary_text = ' '.join([s[0] for s in top_sentences])

        # Truncate if too long
        words = summary_text.split()
        if len(words) > max_length:
            summary_text = ' '.join(words[:max_length]) + '...'

        # Extract key points
        key_points = [s[0] for s in scored[:5]]

        # Extract topics (simple keyword extraction)
        topics = self._extract_topics(text)

        # Simple sentiment analysis
        sentiment, sentiment_score = self._analyze_sentiment(text)

        # Calculate metrics
        word_count = len(summary_text.split())
        original_words = len(text.split())
        compression_ratio = word_count / original_words if original_words > 0 else 0

        return SummaryResult(
            summary_text=summary_text,
            summary_type=summary_type,
            key_points=key_points,
            topics=topics,
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            word_count=word_count,
            compression_ratio=compression_ratio
        )

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences."""
        # Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        # Clean and filter
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        return sentences

    def _score_sentences(
        self,
        sentences: List[str],
        full_text: str
    ) -> List[Tuple[str, int, float]]:
        """
        Score sentences for importance.

        Returns list of (sentence, original_index, score).
        """
        # Word frequency
        words = re.findall(r'\b\w+\b', full_text.lower())
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Skip short words
                word_freq[word] = word_freq.get(word, 0) + 1

        scored = []
        for i, sentence in enumerate(sentences):
            # Calculate score based on:
            # 1. Word frequency
            sentence_words = re.findall(r'\b\w+\b', sentence.lower())
            freq_score = sum(word_freq.get(w, 0) for w in sentence_words) / max(len(sentence_words), 1)

            # 2. Position (earlier sentences often more important)
            position_score = 1.0 / (i + 1)

            # 3. Length (prefer medium-length sentences)
            length = len(sentence_words)
            length_score = 1.0 if 10 <= length <= 30 else 0.5

            # 4. Contains numbers (often important facts)
            has_numbers = 1.2 if re.search(r'\d', sentence) else 1.0

            # Combined score
            score = (freq_score * 0.4 + position_score * 0.3 + length_score * 0.2) * has_numbers

            scored.append((sentence, i, score))

        # Sort by score descending
        scored.sort(key=lambda x: x[2], reverse=True)
        return scored

    def _extract_topics(self, text: str, max_topics: int = 5) -> List[str]:
        """Extract main topics from text using keyword frequency."""
        # Common words to exclude
        stopwords = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'both', 'either',
            'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very',
            'just', 'also', 'now', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'every', 'any', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'of', 'to', 'in', 'on', 'at',
            'by', 'with', 'about', 'against', 'between', 'into', 'through',
            'during', 'before', 'after', 'above', 'below', 'from', 'up',
            'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
            'once', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself',
            'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
            'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
            'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
            'themselves', 'what', 'which', 'who', 'whom', 'as', 'if', 'because',
        }

        # Extract words
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())

        # Count frequency
        word_freq = {}
        for word in words:
            if word not in stopwords:
                word_freq[word] = word_freq.get(word, 0) + 1

        # Get top words
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        topics = [word.title() for word, _ in sorted_words[:max_topics]]

        return topics

    def _analyze_sentiment(self, text: str) -> Tuple[str, float]:
        """
        Simple sentiment analysis using keyword matching.

        Returns (sentiment_label, sentiment_score).
        """
        positive_words = {
            'good', 'great', 'excellent', 'positive', 'success', 'successful',
            'approve', 'approved', 'agree', 'agreed', 'benefit', 'beneficial',
            'improve', 'improved', 'increase', 'increased', 'profit', 'profitable',
            'growth', 'gain', 'advantage', 'opportunity', 'outstanding', 'exceptional',
            'satisfied', 'satisfaction', 'pleased', 'happy', 'thank', 'thanks',
        }

        negative_words = {
            'bad', 'poor', 'negative', 'fail', 'failed', 'failure', 'loss',
            'decline', 'decrease', 'decreased', 'problem', 'issue', 'concern',
            'risk', 'risky', 'danger', 'dangerous', 'error', 'mistake',
            'reject', 'rejected', 'deny', 'denied', 'dispute', 'complaint',
            'dissatisfied', 'unhappy', 'disappointed', 'unfortunately', 'regret',
        }

        words = re.findall(r'\b\w+\b', text.lower())

        positive_count = sum(1 for w in words if w in positive_words)
        negative_count = sum(1 for w in words if w in negative_words)
        total = positive_count + negative_count

        if total == 0:
            return 'neutral', 0.0

        score = (positive_count - negative_count) / total

        if score > 0.2:
            return 'positive', score
        elif score < -0.2:
            return 'negative', score
        else:
            return 'neutral', score


# =============================================================================
# Table Extractor Class
# =============================================================================

class TableExtractor:
    """
    Extracts tables from PDF and image documents.

    Uses camelot for PDF table extraction with fallback to regex patterns
    for text-based tables.
    """

    def extract_tables_from_pdf(
        self,
        pdf_path: str,
        pages: str = 'all'
    ) -> List[ExtractedTableResult]:
        """
        Extract tables from a PDF file.

        Args:
            pdf_path: Path to PDF file
            pages: Pages to process ('all' or '1,2,3' or '1-5')

        Returns:
            List of ExtractedTableResult objects
        """
        tables = []

        try:
            import camelot

            # Extract tables using camelot
            extracted = camelot.read_pdf(
                pdf_path,
                pages=pages,
                flavor='lattice',  # Try lattice first (bordered tables)
            )

            if len(extracted) == 0:
                # Try stream flavor for borderless tables
                extracted = camelot.read_pdf(
                    pdf_path,
                    pages=pages,
                    flavor='stream',
                )

            for i, table in enumerate(extracted, 1):
                df = table.df

                # Extract headers (first row)
                headers = df.iloc[0].tolist() if len(df) > 0 else []

                # Extract rows (remaining rows)
                rows = df.iloc[1:].values.tolist() if len(df) > 1 else []

                # Generate markdown
                markdown = self._to_markdown(headers, rows)

                tables.append(ExtractedTableResult(
                    table_number=i,
                    headers=headers,
                    rows=rows,
                    page_number=table.page,
                    confidence_score=table.accuracy / 100,
                    raw_markdown=markdown,
                ))

        except ImportError:
            logger.warning("camelot not available. Table extraction requires camelot-py.")
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")

        return tables

    def extract_tables_from_text(self, text: str) -> List[ExtractedTableResult]:
        """
        Extract tables from text content.

        Looks for tabular patterns in the text.

        Args:
            text: Input text

        Returns:
            List of ExtractedTableResult objects
        """
        tables = []

        # Look for markdown-style tables
        markdown_pattern = r'(\|[^\n]+\|[\n\r]+\|[\-:| ]+\|[\n\r]+(?:\|[^\n]+\|[\n\r]*)+)'

        for i, match in enumerate(re.finditer(markdown_pattern, text), 1):
            table_text = match.group(1)
            headers, rows = self._parse_markdown_table(table_text)

            if headers:
                tables.append(ExtractedTableResult(
                    table_number=i,
                    headers=headers,
                    rows=rows,
                    confidence_score=0.9,
                    raw_markdown=table_text,
                ))

        # Look for tab-separated tables
        if not tables:
            lines = text.split('\n')
            current_table = []
            table_number = 0

            for line in lines:
                if '\t' in line and len(line.split('\t')) >= 2:
                    current_table.append(line.split('\t'))
                elif current_table and len(current_table) >= 2:
                    table_number += 1
                    headers = current_table[0]
                    rows = current_table[1:]

                    tables.append(ExtractedTableResult(
                        table_number=table_number,
                        headers=headers,
                        rows=rows,
                        confidence_score=0.7,
                    ))
                    current_table = []

            # Handle last table
            if current_table and len(current_table) >= 2:
                table_number += 1
                tables.append(ExtractedTableResult(
                    table_number=table_number,
                    headers=current_table[0],
                    rows=current_table[1:],
                    confidence_score=0.7,
                ))

        return tables

    def _parse_markdown_table(
        self,
        table_text: str
    ) -> Tuple[List[str], List[List[str]]]:
        """Parse a markdown table into headers and rows."""
        lines = [l.strip() for l in table_text.strip().split('\n') if l.strip()]

        if len(lines) < 2:
            return [], []

        # Parse header
        header_line = lines[0]
        headers = [c.strip() for c in header_line.strip('|').split('|')]

        # Skip separator line and parse rows
        rows = []
        for line in lines[2:]:
            if line.startswith('|'):
                cells = [c.strip() for c in line.strip('|').split('|')]
                rows.append(cells)

        return headers, rows

    def _to_markdown(
        self,
        headers: List[str],
        rows: List[List[str]]
    ) -> str:
        """Convert table to markdown format."""
        if not headers:
            return ''

        lines = []

        # Header row
        lines.append('| ' + ' | '.join(str(h) for h in headers) + ' |')

        # Separator
        lines.append('| ' + ' | '.join('---' for _ in headers) + ' |')

        # Data rows
        for row in rows:
            # Pad row to match header length
            padded = list(row) + [''] * (len(headers) - len(row))
            lines.append('| ' + ' | '.join(str(c) for c in padded[:len(headers)]) + ' |')

        return '\n'.join(lines)


# =============================================================================
# Document Intelligence Processor
# =============================================================================

class DocumentIntelligenceProcessor:
    """
    Main processor for document intelligence.

    Coordinates all extraction and processing tasks.
    """

    def __init__(self):
        self.nlp_engine = NLPEngine()
        self.table_extractor = TableExtractor()

    def process_document(
        self,
        text: str,
        pdf_path: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a document and extract all intelligence.

        Args:
            text: Extracted text content
            pdf_path: Path to PDF for table extraction (optional)
            options: Processing options

        Returns:
            Dictionary with all extracted data
        """
        options = options or {}

        results = {
            'entities': [],
            'tables': [],
            'key_values': [],
            'summary': None,
        }

        # Extract entities
        if options.get('extract_entities', True):
            results['entities'] = self.nlp_engine.extract_entities(
                text,
                entity_types=options.get('entity_types'),
                min_confidence=options.get('entity_confidence', 0.6)
            )

        # Extract tables
        if options.get('extract_tables', True):
            if pdf_path:
                results['tables'] = self.table_extractor.extract_tables_from_pdf(pdf_path)
            else:
                results['tables'] = self.table_extractor.extract_tables_from_text(text)

        # Extract key-value pairs
        if options.get('extract_key_values', True):
            results['key_values'] = self.nlp_engine.extract_key_values(
                text,
                document_type=options.get('document_type'),
                min_confidence=options.get('kv_confidence', 0.6)
            )

        # Generate summary
        if options.get('generate_summary', True):
            results['summary'] = self.nlp_engine.summarize(
                text,
                summary_type=options.get('summary_type', 'STANDARD'),
                max_length=options.get('max_summary_length', 500)
            )

        return results
