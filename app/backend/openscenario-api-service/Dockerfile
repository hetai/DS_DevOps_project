# Build stage
FROM python:3.9-slim as builder

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and extract OpenSCENARIO validator
# Replace this with your actual validator download URL or COPY from local
# For example:
# COPY path/to/OpenSCENARIOValidator /app/OpenSCENARIOValidator
# COPY path/to/*.so /usr/local/lib/
# Or download from a URL:
# RUN wget -O validator.zip https://example.com/OpenSCENARIOValidator-latest.zip \
#     && unzip validator.zip -d /app/validator \
#     && chmod +x /app/validator/OpenSCENARIOValidator \
#     && rm validator.zip


# Install Python dependencies
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Create app directory and set working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .

# Create a simple main.py if it doesn't exist
RUN if [ ! -f /app/main.py ]; then \
    echo 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\nasync def read_root():\n    return {"message": "OpenSCENARIO API is running"}\n' > /app/main.py; \
    fi && \
    chmod 644 /app/main.py && \
    echo "main.py content:" && \
    cat /app/main.py

# Copy OpenSCENARIO validator and its libraries
COPY --chown=appuser:appuser app/backend/openscenario.api.test/cpp/build/cgReleaseMakeShared/applications/openScenarioReader/OpenScenarioReader /app/OpenSCENARIOValidator
COPY --chown=root:root app/backend/openscenario.api.test/cpp/build/cgReleaseMakeShared/applications/openScenarioReader/lib*.so* /usr/local/lib/

# Verify files are in place
RUN ls -la /app && \
    ls -la /usr/local/lib/lib*

# Set up symbolic links for the libraries
RUN cd /usr/local/lib && \
    ln -sf libExpressionsLib.so.1.4.0 libExpressionsLib.so && \
    ln -sf libOpenScenarioLib.so.1.4.0 libOpenScenarioLib.so && \
    ldconfig

# Set environment variables
ENV VALIDATOR_PATH=/app/OpenSCENARIOValidator
ENV LD_LIBRARY_PATH=/usr/local/lib:${LD_LIBRARY_PATH}
ENV PORT=8080
ENV PATH="/home/appuser/.local/bin:$PATH"
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV HOME=/home/appuser

# Create a non-root user and set up permissions
RUN useradd -m appuser && \
    mkdir -p /home/appuser/.local && \
    chown -R appuser:appuser /app /home/appuser

# Switch to non-root user
USER appuser
WORKDIR /home/appuser

# Ensure the .local/bin directory exists and is in PATH
RUN mkdir -p /home/appuser/.local/bin

# Install Python packages as non-root user
ENV PATH="/home/appuser/.local/bin:${PATH}"
RUN pip install --user uvicorn fastapi python-multipart python-dotenv

# Set working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .

# Set proper permissions
RUN chmod +x /app/OpenSCENARIOValidator && \
    chown -R appuser:appuser /app && \
    find /app -type d -exec chmod 755 {} \; && \
    find /app -type f -exec chmod 644 {} \; && \
    chmod +x /app/OpenSCENARIOValidator && \
    echo "Python path:" && python -c "import sys; print('\n'.join(sys.path))" && \
    echo "\nApp directory contents:" && ls -la /app

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
