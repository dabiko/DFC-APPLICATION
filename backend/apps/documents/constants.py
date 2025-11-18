"""
Controlled vocabularies and constants for document management.

This module defines all standardized values for document classification,
confidentiality levels, and retention periods used throughout the system.
"""

# Document Types - Controlled vocabulary for document classification
DOCUMENT_TYPES = [
    ('INVOICE', 'Invoice'),
    ('CONTRACT', 'Contract'),
    ('REPORT', 'Report'),
    ('KYC_RECORD', 'KYC Record'),
    ('STATEMENT', 'Statement'),
    ('LOAN_APPLICATION', 'Loan Application'),
    ('CORRESPONDENCE', 'Correspondence'),
    ('PASSPORT', 'Passport'),
    ('ID_CARD', 'ID Card'),
    ('UTILITY_BILL', 'Utility Bill'),
    ('BANK_STATEMENT', 'Bank Statement'),
    ('PAYSLIP', 'Payslip'),
    ('TAX_DOCUMENT', 'Tax Document'),
    ('LEGAL_DOCUMENT', 'Legal Document'),
    ('COMPLIANCE_REPORT', 'Compliance Report'),
    ('AUDIT_REPORT', 'Audit Report'),
    ('MEETING_MINUTES', 'Meeting Minutes'),
    ('POLICY_DOCUMENT', 'Policy Document'),
    ('PROCEDURE_DOCUMENT', 'Procedure Document'),
    ('MEMO', 'Memo'),
    ('FORM', 'Form'),
    ('APPLICATION', 'Application'),
    ('CERTIFICATE', 'Certificate'),
    ('LICENSE', 'License'),
    ('RECEIPT', 'Receipt'),
    ('VOUCHER', 'Voucher'),
    ('PURCHASE_ORDER', 'Purchase Order'),
    ('DELIVERY_NOTE', 'Delivery Note'),
    ('CREDIT_NOTE', 'Credit Note'),
    ('DEBIT_NOTE', 'Debit Note'),
    ('PROPOSAL', 'Proposal'),
    ('QUOTATION', 'Quotation'),
    ('AGREEMENT', 'Agreement'),
    ('AMENDMENT', 'Amendment'),
    ('ADDENDUM', 'Addendum'),
    ('PRESENTATION', 'Presentation'),
    ('SPREADSHEET', 'Spreadsheet'),
    ('IMAGE', 'Image'),
    ('PHOTO', 'Photo'),
    ('SCAN', 'Scan'),
    ('OTHER', 'Other'),
]

# Confidentiality Levels - Security classification
CONFIDENTIALITY_LEVELS = [
    ('PUBLIC', 'Public'),
    ('INTERNAL', 'Internal'),
    ('CONFIDENTIAL', 'Confidential'),
    ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
]

# Retention Periods - Document retention in years
RETENTION_PERIODS = [
    (1, '1 year'),
    (3, '3 years'),
    (5, '5 years'),
    (7, '7 years'),
    (10, '10 years'),
    (25, '25 years'),
    (-1, 'Permanent'),
]

# File Size Limits (in bytes)
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
CHUNK_SIZE = 5 * 1024 * 1024  # 5MB for chunked uploads

# Allowed File Extensions
ALLOWED_EXTENSIONS = [
    # Documents
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    # Spreadsheets
    '.xls', '.xlsx', '.csv', '.ods',
    # Presentations
    '.ppt', '.pptx', '.odp',
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg',
    # Archives
    '.zip', '.rar', '.7z', '.tar', '.gz',
    # Other
    '.xml', '.json', '.html', '.eml', '.msg',
]

# Mime Types
ALLOWED_MIME_TYPES = [
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    # Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
    # Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    # Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    # Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    # Other
    'application/xml',
    'text/xml',
    'application/json',
    'text/html',
    'message/rfc822',
]

# Document Status
DOCUMENT_STATUS = [
    ('DRAFT', 'Draft'),
    ('PENDING_REVIEW', 'Pending Review'),
    ('APPROVED', 'Approved'),
    ('REJECTED', 'Rejected'),
    ('ARCHIVED', 'Archived'),
    ('DELETED', 'Deleted'),
]

# Version Status
VERSION_STATUS = [
    ('CURRENT', 'Current'),
    ('SUPERSEDED', 'Superseded'),
    ('ARCHIVED', 'Archived'),
]
