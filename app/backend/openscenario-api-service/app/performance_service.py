#!/usr/bin/env python3
"""
Performance monitoring and benchmarking service for AI-Enhanced ASAM OpenX Scenario Generation
Implements comprehensive performance tracking against PRD targets
"""

import time
import json
import threading
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import tempfile
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    component: str
    operation: str
    duration: float
    timestamp: datetime
    success: bool
    metadata: Dict[str, Any] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None


@dataclass
class PerformanceBenchmark:
    """Performance benchmark thresholds"""
    target_time: float
    acceptable_time: float
    critical_time: float
    description: str


@dataclass
class PerformanceReport:
    """Performance analysis report"""
    component: str
    operation: str
    total_measurements: int
    avg_duration: float
    min_duration: float
    max_duration: float
    p95_duration: float
    p99_duration: float
    success_rate: float
    benchmark_status: str
    recommendations: List[str]
    period_start: datetime
    period_end: datetime


class PerformanceMonitor:
    """Performance monitoring and benchmarking service"""
    
    # PRD Performance Benchmarks
    BENCHMARKS = {
        "scenario_generation": PerformanceBenchmark(
            target_time=7.5,      # Middle of 5-10s range
            acceptable_time=10.0,  # PRD upper limit
            critical_time=15.0,    # Critical threshold
            description="Scenario Generation Latency (PRD: 5-10 seconds)"
        ),
        "validation_throughput": PerformanceBenchmark(
            target_time=20.0,     # Better than PRD target
            acceptable_time=30.0,  # PRD limit
            critical_time=45.0,    # Critical threshold
            description="Validation Throughput (PRD: 30 seconds per scenario)"
        ),
        "rag_retrieval": PerformanceBenchmark(
            target_time=2.0,      # Lower end of 2-3s range
            acceptable_time=3.0,   # PRD upper limit
            critical_time=5.0,     # Critical threshold
            description="RAG Retrieval Speed (PRD: 2-3 seconds)"
        ),
        "web_visualization": PerformanceBenchmark(
            target_time=3.0,      # Better than PRD target
            acceptable_time=5.0,   # PRD limit
            critical_time=8.0,     # Critical threshold
            description="Web Visualization Load Time (PRD: 5 seconds)"
        ),
        "ai_conversation": PerformanceBenchmark(
            target_time=3.0,      # Fast AI response
            acceptable_time=5.0,   # Acceptable delay
            critical_time=10.0,    # Too slow
            description="AI Conversation Response Time"
        ),
        "complete_workflow": PerformanceBenchmark(
            target_time=35.0,     # Sum of optimal times
            acceptable_time=50.0,  # Sum of acceptable times
            critical_time=75.0,    # Critical threshold
            description="Complete Workflow End-to-End Time"
        )
    }
    
    def __init__(self, metrics_file: Optional[str] = None):
        """Initialize performance monitor"""
        self.metrics: List[PerformanceMetrics] = []
        self.metrics_lock = threading.Lock()
        self.metrics_file = metrics_file or self._get_default_metrics_file()
        self._load_metrics()
    
    def _get_default_metrics_file(self) -> str:
        """Get default metrics file path"""
        temp_dir = tempfile.gettempdir()
        return str(Path(temp_dir) / "asam_performance_metrics.json")
    
    def _load_metrics(self):
        """Load existing metrics from file"""
        try:
            if Path(self.metrics_file).exists():
                with open(self.metrics_file, 'r') as f:
                    metrics_data = json.load(f)
                    self.metrics = [
                        PerformanceMetrics(**metric) 
                        for metric in metrics_data
                    ]
                logger.info(f"Loaded {len(self.metrics)} performance metrics")
        except Exception as e:
            logger.warning(f"Could not load metrics: {e}")
            self.metrics = []
    
    def _save_metrics(self):
        """Save metrics to file"""
        try:
            with open(self.metrics_file, 'w') as f:
                metrics_data = []
                for metric in self.metrics:
                    metric_dict = asdict(metric)
                    metric_dict['timestamp'] = metric.timestamp.isoformat()
                    metrics_data.append(metric_dict)
                json.dump(metrics_data, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save metrics: {e}")
    
    @contextmanager
    def measure_performance(self, component: str, operation: str, 
                          user_id: Optional[str] = None, 
                          session_id: Optional[str] = None,
                          metadata: Optional[Dict] = None):
        """Context manager for measuring performance"""
        start_time = time.time()
        success = True
        
        try:
            yield
        except Exception as e:
            success = False
            logger.error(f"Performance measurement failed for {component}.{operation}: {e}")
            raise
        finally:
            duration = time.time() - start_time
            
            metric = PerformanceMetrics(
                component=component,
                operation=operation,
                duration=duration,
                timestamp=datetime.now(),
                success=success,
                metadata=metadata or {},
                user_id=user_id,
                session_id=session_id
            )
            
            self.record_metric(metric)
    
    def record_metric(self, metric: PerformanceMetrics):
        """Record a performance metric"""
        with self.metrics_lock:
            self.metrics.append(metric)
            
            # Keep only last 10000 metrics to manage memory
            if len(self.metrics) > 10000:
                self.metrics = self.metrics[-10000:]
            
            # Save metrics periodically
            if len(self.metrics) % 100 == 0:
                self._save_metrics()
        
        # Log performance issues
        self._check_performance_threshold(metric)
    
    def _check_performance_threshold(self, metric: PerformanceMetrics):
        """Check if metric exceeds performance thresholds"""
        benchmark_key = f"{metric.component}_{metric.operation}"
        if benchmark_key in self.BENCHMARKS:
            benchmark = self.BENCHMARKS[benchmark_key]
            
            if metric.duration > benchmark.critical_time:
                logger.error(f"CRITICAL: {benchmark_key} took {metric.duration:.2f}s > {benchmark.critical_time}s")
            elif metric.duration > benchmark.acceptable_time:
                logger.warning(f"SLOW: {benchmark_key} took {metric.duration:.2f}s > {benchmark.acceptable_time}s")
            elif metric.duration > benchmark.target_time:
                logger.info(f"SUBOPTIMAL: {benchmark_key} took {metric.duration:.2f}s > {benchmark.target_time}s")
    
    def get_performance_report(self, component: str, operation: str, 
                             hours_back: int = 24) -> PerformanceReport:
        """Generate performance report for a specific component/operation"""
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        
        # Filter metrics
        filtered_metrics = [
            m for m in self.metrics 
            if m.component == component 
            and m.operation == operation 
            and m.timestamp >= cutoff_time
        ]
        
        if not filtered_metrics:
            return PerformanceReport(
                component=component,
                operation=operation,
                total_measurements=0,
                avg_duration=0.0,
                min_duration=0.0,
                max_duration=0.0,
                p95_duration=0.0,
                p99_duration=0.0,
                success_rate=0.0,
                benchmark_status="NO_DATA",
                recommendations=["No performance data available"],
                period_start=cutoff_time,
                period_end=datetime.now()
            )
        
        # Calculate statistics
        durations = [m.duration for m in filtered_metrics]
        successful_metrics = [m for m in filtered_metrics if m.success]
        
        avg_duration = statistics.mean(durations)
        min_duration = min(durations)
        max_duration = max(durations)
        
        # Calculate percentiles
        sorted_durations = sorted(durations)
        p95_duration = sorted_durations[int(len(sorted_durations) * 0.95)]
        p99_duration = sorted_durations[int(len(sorted_durations) * 0.99)]
        
        success_rate = len(successful_metrics) / len(filtered_metrics) * 100
        
        # Determine benchmark status
        benchmark_key = f"{component}_{operation}"
        benchmark_status = "UNKNOWN"
        recommendations = []
        
        if benchmark_key in self.BENCHMARKS:
            benchmark = self.BENCHMARKS[benchmark_key]
            
            if avg_duration <= benchmark.target_time:
                benchmark_status = "EXCELLENT"
                recommendations.append("Performance meets target expectations")
            elif avg_duration <= benchmark.acceptable_time:
                benchmark_status = "ACCEPTABLE"
                recommendations.append("Performance within acceptable range but could be improved")
            elif avg_duration <= benchmark.critical_time:
                benchmark_status = "POOR"
                recommendations.append("Performance exceeds acceptable limits - optimization needed")
                recommendations.append("Consider caching, code optimization, or infrastructure scaling")
            else:
                benchmark_status = "CRITICAL"
                recommendations.append("Performance critically poor - immediate attention required")
                recommendations.append("Check for system bottlenecks, resource constraints, or code issues")
        
        # Additional recommendations based on statistics
        if success_rate < 95:
            recommendations.append(f"Low success rate ({success_rate:.1f}%) - investigate error causes")
        
        if max_duration > avg_duration * 3:
            recommendations.append("High variance in performance - check for intermittent issues")
        
        return PerformanceReport(
            component=component,
            operation=operation,
            total_measurements=len(filtered_metrics),
            avg_duration=avg_duration,
            min_duration=min_duration,
            max_duration=max_duration,
            p95_duration=p95_duration,
            p99_duration=p99_duration,
            success_rate=success_rate,
            benchmark_status=benchmark_status,
            recommendations=recommendations,
            period_start=cutoff_time,
            period_end=datetime.now()
        )
    
    def get_all_performance_reports(self, hours_back: int = 24) -> Dict[str, PerformanceReport]:
        """Get performance reports for all tracked components"""
        reports = {}
        
        # Get unique component/operation combinations
        unique_ops = set()
        for metric in self.metrics:
            unique_ops.add((metric.component, metric.operation))
        
        for component, operation in unique_ops:
            key = f"{component}_{operation}"
            reports[key] = self.get_performance_report(component, operation, hours_back)
        
        return reports
    
    def test_concurrent_performance(self, num_users: int = 5) -> Dict[str, Any]:
        """Test concurrent user performance"""
        from .scenario_generator import scenario_generator
        from .validation_service import validation_service
        
        results = []
        errors = []
        
        def simulate_user_workflow(user_id: int) -> Dict:
            """Simulate user workflow with performance tracking"""
            try:
                with self.measure_performance("concurrent_test", "complete_workflow", 
                                            user_id=f"test_user_{user_id}"):
                    
                    # Generate scenario
                    with self.measure_performance("scenario", "generation", 
                                                user_id=f"test_user_{user_id}"):
                        gen_result = scenario_generator.generate_scenario_files({
                            "scenario_type": f"concurrent_test_{user_id}",
                            "ego_vehicle": {"type": "car", "initial_speed": 50 + user_id}
                        })
                    
                    if not gen_result.get("success", False):
                        raise Exception(f"Generation failed for user {user_id}")
                    
                    # Validate scenario
                    with self.measure_performance("validation", "throughput", 
                                                user_id=f"test_user_{user_id}"):
                        validation_result = validation_service.validate_scenario_pair(
                            gen_result["xosc_content"], 
                            gen_result["xodr_content"]
                        )
                    
                    return {
                        "user_id": user_id,
                        "success": True,
                        "validation_valid": validation_result.is_valid
                    }
                    
            except Exception as e:
                errors.append((user_id, str(e)))
                return {"user_id": user_id, "success": False, "error": str(e)}
        
        # Execute concurrent tests
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [
                executor.submit(simulate_user_workflow, user_id)
                for user_id in range(num_users)
            ]
            
            for future in as_completed(futures, timeout=120):
                result = future.result()
                results.append(result)
        
        total_time = time.time() - start_time
        successful_users = [r for r in results if r.get("success", False)]
        
        return {
            "num_users": num_users,
            "total_time": total_time,
            "successful_users": len(successful_users),
            "success_rate": len(successful_users) / num_users * 100,
            "errors": errors,
            "avg_time_per_user": total_time / num_users if num_users > 0 else 0,
            "meets_prd_target": len(successful_users) >= num_users and total_time <= 60.0
        }
    
    def generate_performance_summary(self, hours_back: int = 24) -> Dict[str, Any]:
        """Generate comprehensive performance summary"""
        reports = self.get_all_performance_reports(hours_back)
        
        summary = {
            "period": {
                "start": (datetime.now() - timedelta(hours=hours_back)).isoformat(),
                "end": datetime.now().isoformat(),
                "hours": hours_back
            },
            "overall_status": "UNKNOWN",
            "prd_compliance": {},
            "component_reports": {},
            "recommendations": [],
            "critical_issues": []
        }
        
        # Analyze PRD compliance
        prd_components = [
            "scenario_generation",
            "validation_throughput", 
            "rag_retrieval",
            "web_visualization"
        ]
        
        excellent_count = 0
        acceptable_count = 0
        poor_count = 0
        critical_count = 0
        
        for report_key, report in reports.items():
            summary["component_reports"][report_key] = {
                "status": report.benchmark_status,
                "avg_duration": report.avg_duration,
                "success_rate": report.success_rate,
                "total_measurements": report.total_measurements
            }
            
            # Count status distribution
            if report.benchmark_status == "EXCELLENT":
                excellent_count += 1
            elif report.benchmark_status == "ACCEPTABLE":
                acceptable_count += 1
            elif report.benchmark_status == "POOR":
                poor_count += 1
            elif report.benchmark_status == "CRITICAL":
                critical_count += 1
                summary["critical_issues"].append(f"{report_key}: {report.avg_duration:.2f}s")
        
        # Determine overall status
        if critical_count > 0:
            summary["overall_status"] = "CRITICAL"
        elif poor_count > acceptable_count + excellent_count:
            summary["overall_status"] = "POOR"
        elif acceptable_count + excellent_count > poor_count:
            summary["overall_status"] = "ACCEPTABLE"
        else:
            summary["overall_status"] = "EXCELLENT"
        
        # PRD compliance analysis
        for component in prd_components:
            component_reports = [r for k, r in reports.items() if k.startswith(component)]
            if component_reports:
                report = component_reports[0]  # Take first matching report
                benchmark_key = f"{report.component}_{report.operation}"
                
                if benchmark_key in self.BENCHMARKS:
                    benchmark = self.BENCHMARKS[benchmark_key]
                    summary["prd_compliance"][component] = {
                        "target_time": benchmark.target_time,
                        "acceptable_time": benchmark.acceptable_time,
                        "actual_avg_time": report.avg_duration,
                        "status": report.benchmark_status,
                        "meets_prd": report.avg_duration <= benchmark.acceptable_time
                    }
        
        # Generate recommendations
        if critical_count > 0:
            summary["recommendations"].append("Immediate attention required for critical performance issues")
        if poor_count > 0:
            summary["recommendations"].append("Optimization needed for components with poor performance")
        if len(summary["prd_compliance"]) > 0:
            non_compliant = [k for k, v in summary["prd_compliance"].items() if not v["meets_prd"]]
            if non_compliant:
                summary["recommendations"].append(f"PRD compliance issues: {', '.join(non_compliant)}")
        
        return summary
    
    def cleanup_old_metrics(self, days_back: int = 30):
        """Clean up old metrics to manage storage"""
        cutoff_time = datetime.now() - timedelta(days=days_back)
        
        with self.metrics_lock:
            original_count = len(self.metrics)
            self.metrics = [m for m in self.metrics if m.timestamp >= cutoff_time]
            removed_count = original_count - len(self.metrics)
            
            if removed_count > 0:
                logger.info(f"Cleaned up {removed_count} old performance metrics")
                self._save_metrics()


# Global performance monitor instance
performance_monitor = PerformanceMonitor()