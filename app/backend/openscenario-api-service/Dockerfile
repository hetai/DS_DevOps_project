FROM python:3.9-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Create a simple health check endpoint
RUN if [ ! -f /app/main.py ]; then \
    echo 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\nasync def read_root():\n    return {"message": "OpenSCENARIO API is running"}\n\n@app.get("/health")\nasync def health_check():\n    return {"status": "healthy"}\n' > /app/main.py; \
    fi

# Set environment variables
ENV PORT=8080
ENV LOG_LEVEL=INFO

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
