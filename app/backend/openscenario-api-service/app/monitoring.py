"""
Monitoring module for OpenSCENARIO API service.
Provides metrics collection and tracking functionality.
"""

import time
import logging
from typing import Dict, Any, Optional
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
            'metrics': self.metrics
        }

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
                if model:
                    metrics_collector.increment(f'openai_api_calls_{model}_success')
                if endpoint:
                    metrics_collector.increment(f'openai_api_calls_{endpoint}_success')
                return result
            except Exception as e:
                metrics_collector.increment('openai_api_calls_error')
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
    
    # Add metrics endpoint
    @app.get("/metrics")
    async def get_metrics():
        """Get application metrics."""
        return metrics_collector.get_metrics()
    
    logger.info("Monitoring setup complete")
    return app