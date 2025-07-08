"""
Monitoring module for OpenSCENARIO API service.
Provides metrics collection and tracking functionality.
"""

import time
import logging
from typing import Dict, Any, Optional
from functools import wraps
import psutil
import os
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
OPENAI_CALLS = Counter('openai_api_calls_total', 'Total OpenAI API calls', ['model', 'status'])
WORKFLOW_STEPS = Counter('workflow_steps_total', 'Total workflow steps', ['step', 'status'])
VALIDATION_RESULTS = Counter('openscenario_validation_total', 'Total validations', ['status'])
SYSTEM_CPU = Gauge('system_cpu_percent', 'System CPU usage percentage')
SYSTEM_MEMORY = Gauge('system_memory_percent', 'System memory usage percentage')
PROCESS_MEMORY = Gauge('process_memory_percent', 'Process memory usage percentage')

class MetricsCollector:
    """Simple metrics collector for tracking application metrics."""
    
    def __init__(self):
        self.metrics = {}
        self.counters = {}
        self.timers = {}
    
    def increment(self, metric_name: str, value: int = 1):
        """Increment a counter metric."""
        if metric_name not in self.counters:
            self.counters[metric_name] = 0
        self.counters[metric_name] += value
    
    def record_time(self, metric_name: str, duration: float):
        """Record a timing metric."""
        if metric_name not in self.timers:
            self.timers[metric_name] = []
        self.timers[metric_name].append(duration)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics."""
        return {
            'counters': self.counters,
            'timers': self.timers,
            'metrics': self.metrics,
            'system': self.get_system_metrics()
        }
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level metrics."""
        try:
            process = psutil.Process(os.getpid())
            system_metrics = {
                'cpu_percent': process.cpu_percent(),
                'memory_percent': process.memory_percent(),
                'memory_info': process.memory_info()._asdict(),
                'num_threads': process.num_threads(),
                'open_files': len(process.open_files()) if hasattr(process, 'open_files') else 0,
                'connections': len(process.connections()) if hasattr(process, 'connections') else 0,
                'system_cpu_percent': psutil.cpu_percent(),
                'system_memory_percent': psutil.virtual_memory().percent,
                'system_disk_percent': psutil.disk_usage('/').percent
            }
            
            # Update Prometheus gauges
            SYSTEM_CPU.set(system_metrics['system_cpu_percent'])
            SYSTEM_MEMORY.set(system_metrics['system_memory_percent'])
            PROCESS_MEMORY.set(system_metrics['memory_percent'])
            
            return system_metrics
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
            return {}

# Global metrics collector instance
metrics_collector = MetricsCollector()

def track_openai_api_call(model: Optional[str] = None, endpoint: Optional[str] = None):
    """Decorator to track OpenAI API calls."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                metrics_collector.increment('openai_api_calls_success')
                OPENAI_CALLS.labels(model=model or 'unknown', status='success').inc()
                if model:
                    metrics_collector.increment(f'openai_api_calls_{model}_success')
                if endpoint:
                    metrics_collector.increment(f'openai_api_calls_{endpoint}_success')
                return result
            except Exception as e:
                metrics_collector.increment('openai_api_calls_error')
                OPENAI_CALLS.labels(model=model or 'unknown', status='error').inc()
                if model:
                    metrics_collector.increment(f'openai_api_calls_{model}_error')
                if endpoint:
                    metrics_collector.increment(f'openai_api_calls_{endpoint}_error')
                logger.error(f"OpenAI API call failed: {e}")
                raise
            finally:
                duration = time.time() - start_time
                metrics_collector.record_time('openai_api_call_duration', duration)
        return wrapper
    return decorator

def track_workflow_step(step_name: str):
    """Decorator to track workflow steps."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                metrics_collector.increment(f'workflow_step_{step_name}_success')
                return result
            except Exception as e:
                metrics_collector.increment(f'workflow_step_{step_name}_error')
                logger.error(f"Workflow step {step_name} failed: {e}")
                raise
            finally:
                duration = time.time() - start_time
                metrics_collector.record_time(f'workflow_step_{step_name}_duration', duration)
        return wrapper
    return decorator

def track_openscenario_validation(func):
    """Decorator to track OpenSCENARIO validation operations."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            metrics_collector.increment('openscenario_validation_success')
            # Track validation result details
            if isinstance(result, dict) and 'is_valid' in result:
                if result['is_valid']:
                    metrics_collector.increment('openscenario_validation_passed')
                else:
                    metrics_collector.increment('openscenario_validation_failed')
            return result
        except Exception as e:
            metrics_collector.increment('openscenario_validation_error')
            logger.error(f"OpenSCENARIO validation failed: {e}")
            raise
        finally:
            duration = time.time() - start_time
            metrics_collector.record_time('openscenario_validation_duration', duration)
    return wrapper

def track_scenario_generation(func):
    """Decorator to track scenario generation operations."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            metrics_collector.increment('scenario_generation_success')
            return result
        except Exception as e:
            metrics_collector.increment('scenario_generation_error')
            logger.error(f"Scenario generation failed: {e}")
            raise
        finally:
            duration = time.time() - start_time
            metrics_collector.record_time('scenario_generation_duration', duration)
    return wrapper

def track_file_upload(func):
    """Decorator to track file upload operations."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            metrics_collector.increment('file_upload_success')
            return result
        except Exception as e:
            metrics_collector.increment('file_upload_error')
            logger.error(f"File upload failed: {e}")
            raise
        finally:
            duration = time.time() - start_time
            metrics_collector.record_time('file_upload_duration', duration)
    return wrapper

def setup_monitoring(app):
    """Setup monitoring for the FastAPI application."""
    @app.middleware("http")
    async def add_process_time_header(request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        metrics_collector.record_time('http_request_duration', process_time)
        return response
    
    # Add Prometheus metrics endpoint
    @app.get("/metrics")
    async def get_prometheus_metrics():
        """Get Prometheus metrics."""
        from fastapi import Response
        # Update system metrics before returning
        metrics_collector.get_system_metrics()
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
    
    # Add JSON metrics endpoint for debugging
    @app.get("/metrics/json")
    async def get_json_metrics():
        """Get application metrics in JSON format."""
        return metrics_collector.get_metrics()
    
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint for monitoring."""
        system_metrics = metrics_collector.get_system_metrics()
        is_healthy = (
            system_metrics.get('system_cpu_percent', 0) < 90 and
            system_metrics.get('system_memory_percent', 0) < 90 and
            system_metrics.get('system_disk_percent', 0) < 90
        )
        
        status = "healthy" if is_healthy else "unhealthy"
        return {
            "status": status,
            "timestamp": time.time(),
            "system": system_metrics,
            "uptime": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0
        }
    
    # Track application start time
    app.state.start_time = time.time()
    
    logger.info("Monitoring setup complete")
    return app