#!/usr/bin/env python3
"""
Performance testing and benchmarking CLI tool
Runs comprehensive performance tests against PRD targets
"""

import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.performance_service import performance_monitor
from app.scenario_generator import scenario_generator
from app.validation_service import validation_service
from app.rag_service import rag_service


def test_scenario_generation_performance(num_tests: int = 5):
    """Test scenario generation performance"""
    print("Testing Scenario Generation Performance...")
    print("=" * 50)
    
    times = []
    successes = 0
    
    for i in range(num_tests):
        params = {
            "scenario_type": f"perf_test_{i}",
            "ego_vehicle": {"type": "car", "initial_speed": 50 + i * 5},
            "road_type": "highway",
            "weather": "clear"
        }
        
        print(f"Test {i+1}/{num_tests}...", end=" ")
        
        with performance_monitor.measure_performance("scenario", "generation", 
                                                   session_id=f"perf_test_{i}"):
            try:
                result = scenario_generator.generate_scenario_files(params)
                if result.get("success", False):
                    successes += 1
                    print("✅")
                else:
                    print("❌")
            except Exception as e:
                print(f"❌ Error: {e}")
    
    # Get performance report
    report = performance_monitor.get_performance_report("scenario", "generation", hours_back=1)
    
    print(f"\nResults:")
    print(f"  Success Rate: {successes}/{num_tests} ({successes/num_tests*100:.1f}%)")
    print(f"  Average Time: {report.avg_duration:.2f}s")
    print(f"  Min Time: {report.min_duration:.2f}s")
    print(f"  Max Time: {report.max_duration:.2f}s")
    print(f"  PRD Target: ≤10.0s")
    print(f"  Status: {report.benchmark_status}")
    
    if report.avg_duration <= 10.0:
        print("  ✅ MEETS PRD REQUIREMENT")
    else:
        print("  ❌ EXCEEDS PRD REQUIREMENT")
    
    return report


def test_validation_performance(num_tests: int = 3):
    """Test validation performance"""
    print("\nTesting Validation Performance...")
    print("=" * 50)
    
    # Generate a sample scenario first
    sample_params = {
        "scenario_type": "validation_perf_test",
        "ego_vehicle": {"type": "car", "initial_speed": 50},
        "road_type": "highway"
    }
    
    print("Generating sample scenario for validation testing...", end=" ")
    gen_result = scenario_generator.generate_scenario_files(sample_params)
    
    if not gen_result.get("success", False):
        print("❌ Failed to generate sample scenario")
        return None
    
    print("✅")
    
    successes = 0
    
    for i in range(num_tests):
        print(f"Validation test {i+1}/{num_tests}...", end=" ")
        
        with performance_monitor.measure_performance("validation", "throughput", 
                                                   session_id=f"val_perf_test_{i}"):
            try:
                result = validation_service.validate_scenario_pair(
                    gen_result["xosc_content"], 
                    gen_result["xodr_content"]
                )
                successes += 1
                print("✅")
            except Exception as e:
                print(f"❌ Error: {e}")
    
    # Get performance report
    report = performance_monitor.get_performance_report("validation", "throughput", hours_back=1)
    
    print(f"\nResults:")
    print(f"  Success Rate: {successes}/{num_tests} ({successes/num_tests*100:.1f}%)")
    print(f"  Average Time: {report.avg_duration:.2f}s")
    print(f"  Min Time: {report.min_duration:.2f}s")
    print(f"  Max Time: {report.max_duration:.2f}s")
    print(f"  PRD Target: ≤30.0s")
    print(f"  Status: {report.benchmark_status}")
    
    if report.avg_duration <= 30.0:
        print("  ✅ MEETS PRD REQUIREMENT")
    else:
        print("  ❌ EXCEEDS PRD REQUIREMENT")
    
    return report


def test_rag_performance(num_tests: int = 5):
    """Test RAG retrieval performance"""
    print("\nTesting RAG Retrieval Performance...")
    print("=" * 50)
    
    test_queries = [
        "AEB autonomous emergency braking highway scenario",
        "LSS lane support system highway departure",
        "pedestrian crossing urban intersection scenario",
        "parking reverse vehicle detection scenario",
        "overtaking maneuver highway multiple vehicles"
    ]
    
    successes = 0
    
    for i in range(min(num_tests, len(test_queries))):
        query = test_queries[i]
        print(f"RAG test {i+1}/{num_tests}: '{query[:30]}...'", end=" ")
        
        with performance_monitor.measure_performance("rag", "retrieval", 
                                                   session_id=f"rag_perf_test_{i}"):
            try:
                results = rag_service.search_similar_scenarios(query, top_k=3)
                successes += 1
                print("✅")
            except Exception as e:
                print(f"⚠️ RAG not available or error: {e}")
    
    # Get performance report
    report = performance_monitor.get_performance_report("rag", "retrieval", hours_back=1)
    
    if report.total_measurements > 0:
        print(f"\nResults:")
        print(f"  Success Rate: {successes}/{num_tests} ({successes/num_tests*100:.1f}%)")
        print(f"  Average Time: {report.avg_duration:.2f}s")
        print(f"  Min Time: {report.min_duration:.2f}s")
        print(f"  Max Time: {report.max_duration:.2f}s")
        print(f"  PRD Target: ≤3.0s")
        print(f"  Status: {report.benchmark_status}")
        
        if report.avg_duration <= 3.0:
            print("  ✅ MEETS PRD REQUIREMENT")
        else:
            print("  ❌ EXCEEDS PRD REQUIREMENT")
    else:
        print(f"\nResults:")
        print(f"  ⚠️ RAG service not available or no successful retrievals")
        print(f"  This is expected if RAG service is using fallback mode")
    
    return report


def test_concurrent_users(num_users: int = 5):
    """Test concurrent user performance"""
    print(f"\nTesting Concurrent Users Performance ({num_users} users)...")
    print("=" * 50)
    
    print(f"Running concurrent user simulation...", end=" ")
    
    try:
        result = performance_monitor.test_concurrent_performance(num_users)
        
        print("✅" if result["success_rate"] > 80 else "⚠️")
        
        print(f"\nResults:")
        print(f"  Total Users: {result['num_users']}")
        print(f"  Successful Users: {result['successful_users']}")
        print(f"  Success Rate: {result['success_rate']:.1f}%")
        print(f"  Total Time: {result['total_time']:.2f}s")
        print(f"  Avg Time per User: {result['avg_time_per_user']:.2f}s")
        print(f"  PRD Target: 5 users without degradation")
        
        if result["meets_prd_target"]:
            print("  ✅ MEETS PRD REQUIREMENT")
        else:
            print("  ❌ DOES NOT MEET PRD REQUIREMENT")
        
        if result["errors"]:
            print(f"  Errors: {len(result['errors'])}")
            for user_id, error in result["errors"][:3]:  # Show first 3 errors
                print(f"    User {user_id}: {error}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_complete_workflow_performance():
    """Test complete workflow performance"""
    print(f"\nTesting Complete Workflow Performance...")
    print("=" * 50)
    
    print("Running complete workflow test...", end=" ")
    
    with performance_monitor.measure_performance("workflow", "complete", 
                                               session_id="complete_workflow_test"):
        try:
            # Step 1: Generate scenario
            with performance_monitor.measure_performance("scenario", "generation"):
                gen_result = scenario_generator.generate_scenario_files({
                    "scenario_type": "complete_workflow_test",
                    "ego_vehicle": {"type": "car", "initial_speed": 60},
                    "target_vehicle": {"type": "car", "initial_speed": 50},
                    "road_type": "highway"
                })
            
            if not gen_result.get("success", False):
                raise Exception("Scenario generation failed")
            
            # Step 2: Validate scenario
            with performance_monitor.measure_performance("validation", "throughput"):
                validation_result = validation_service.validate_scenario_pair(
                    gen_result["xosc_content"],
                    gen_result["xodr_content"]
                )
            
            print("✅")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    # Get reports
    workflow_report = performance_monitor.get_performance_report("workflow", "complete", hours_back=1)
    generation_report = performance_monitor.get_performance_report("scenario", "generation", hours_back=1)
    validation_report = performance_monitor.get_performance_report("validation", "throughput", hours_back=1)
    
    print(f"\nResults:")
    print(f"  Complete Workflow: {workflow_report.avg_duration:.2f}s")
    print(f"    Generation: {generation_report.avg_duration:.2f}s")
    print(f"    Validation: {validation_report.avg_duration:.2f}s")
    print(f"  PRD Targets:")
    print(f"    Generation: ≤10.0s")
    print(f"    Validation: ≤30.0s")
    print(f"    Total: ≤45.0s (estimated)")
    
    meets_generation = generation_report.avg_duration <= 10.0
    meets_validation = validation_report.avg_duration <= 30.0
    meets_total = workflow_report.avg_duration <= 45.0
    
    print(f"  Status:")
    print(f"    Generation: {'✅' if meets_generation else '❌'}")
    print(f"    Validation: {'✅' if meets_validation else '❌'}")
    print(f"    Total: {'✅' if meets_total else '❌'}")
    
    return {
        "workflow": workflow_report,
        "generation": generation_report,
        "validation": validation_report
    }


def generate_performance_summary():
    """Generate comprehensive performance summary"""
    print(f"\nGenerating Performance Summary...")
    print("=" * 50)
    
    summary = performance_monitor.generate_performance_summary(hours_back=1)
    
    print(f"Performance Summary Report")
    print(f"Period: {summary['period']['start']} to {summary['period']['end']}")
    print(f"Overall Status: {summary['overall_status']}")
    print()
    
    print("PRD Compliance:")
    for component, compliance in summary.get("prd_compliance", {}).items():
        status = "✅" if compliance["meets_prd"] else "❌"
        print(f"  {component}: {compliance['actual_avg_time']:.2f}s / {compliance['acceptable_time']:.2f}s {status}")
    
    print()
    print("Component Performance:")
    for component, report in summary.get("component_reports", {}).items():
        status_icon = {
            "EXCELLENT": "✅",
            "ACCEPTABLE": "⚠️", 
            "POOR": "❌",
            "CRITICAL": "🚨",
            "UNKNOWN": "❓"
        }.get(report["status"], "❓")
        
        print(f"  {component}: {report['avg_duration']:.2f}s ({report['status']}) {status_icon}")
    
    if summary.get("critical_issues"):
        print()
        print("🚨 Critical Issues:")
        for issue in summary["critical_issues"]:
            print(f"  - {issue}")
    
    if summary.get("recommendations"):
        print()
        print("💡 Recommendations:")
        for rec in summary["recommendations"]:
            print(f"  - {rec}")
    
    return summary


def save_performance_report(data: dict, filename: str = None):
    """Save performance report to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"performance_report_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"\n📄 Performance report saved to: {filename}")


def main():
    """Main performance testing function"""
    parser = argparse.ArgumentParser(description="ASAM OpenX Performance Testing Tool")
    parser.add_argument("--generation-tests", type=int, default=5, 
                       help="Number of scenario generation tests")
    parser.add_argument("--validation-tests", type=int, default=3,
                       help="Number of validation tests") 
    parser.add_argument("--rag-tests", type=int, default=5,
                       help="Number of RAG retrieval tests")
    parser.add_argument("--concurrent-users", type=int, default=5,
                       help="Number of concurrent users to test")
    parser.add_argument("--skip-generation", action="store_true",
                       help="Skip scenario generation tests")
    parser.add_argument("--skip-validation", action="store_true", 
                       help="Skip validation tests")
    parser.add_argument("--skip-rag", action="store_true",
                       help="Skip RAG tests")
    parser.add_argument("--skip-concurrent", action="store_true",
                       help="Skip concurrent user tests")
    parser.add_argument("--skip-workflow", action="store_true",
                       help="Skip complete workflow test")
    parser.add_argument("--save-report", type=str,
                       help="Save performance report to specified file")
    
    args = parser.parse_args()
    
    print("🚀 ASAM OpenX Performance Testing Tool")
    print("=" * 60)
    print(f"Testing against PRD requirements:")
    print(f"  - Scenario Generation: ≤10 seconds")
    print(f"  - Validation Throughput: ≤30 seconds")
    print(f"  - RAG Retrieval: ≤3 seconds")
    print(f"  - Concurrent Users: 5 users without degradation")
    print("=" * 60)
    
    results = {}
    
    # Run performance tests
    if not args.skip_generation:
        results["generation"] = test_scenario_generation_performance(args.generation_tests)
    
    if not args.skip_validation:
        results["validation"] = test_validation_performance(args.validation_tests)
    
    if not args.skip_rag:
        results["rag"] = test_rag_performance(args.rag_tests)
    
    if not args.skip_concurrent:
        results["concurrent"] = test_concurrent_users(args.concurrent_users)
    
    if not args.skip_workflow:
        results["workflow"] = test_complete_workflow_performance()
    
    # Generate summary
    summary = generate_performance_summary()
    results["summary"] = summary
    
    # Save report if requested
    if args.save_report:
        save_performance_report(results, args.save_report)
    
    print(f"\n🎯 Performance Testing Complete!")
    print(f"Overall System Status: {summary['overall_status']}")
    
    return results


if __name__ == "__main__":
    main()