# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    git \
    # For Tesseract OCR
    tesseract-ocr \
    libtesseract-dev \
    # For python-magic
    libmagic1 \
    # For Pillow (image processing)
    libjpeg-dev \
    libpng-dev \
    # For document processing
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY requirements/base.txt /app/requirements/base.txt
COPY requirements/development.txt /app/requirements/development.txt

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements/development.txt

# Copy project files
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/media /app/staticfiles /app/logs

# Collect static files (optional, can be done at runtime)
# RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run migrations and start server (can be overridden in docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
