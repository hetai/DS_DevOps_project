#!/usr/bin/env python3
"""
Performance testing and benchmarking suite for AI-Enhanced ASAM OpenX Scenario Generation
Following TDD RED phase - comprehensive performance tests against PRD targets

PRD Performance Requirements:
- Scenario Generation Latency: 5-10 seconds
- Validation Throughput: 30 seconds per scenario
- RAG Retrieval Speed: 2-3 seconds
- Web Visualization Load Time: 5 seconds
- Concurrent Users: 5 users without degradation
"""

import pytest
import time
import asyncio
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple
import tempfile
import json
from unittest.mock import patch, Mock

from app.ai_service import ai_service
from app.scenario_generator import scenario_generator
from app.validation_service import validation_service
from app.rag_service import rag_service
from app.workflow_service import workflow_manager


class TestScenarioGenerationPerformance:
    """Test scenario generation performance against PRD targets"""
    
    def test_scenario_generation_latency_target(self):
        """Test scenario generation completes within 5-10 seconds (PRD requirement)"""
        # Sample conversation parameters
        conversation_params = {
            "scenario_type": "highway_overtaking",
            "ego_vehicle": {"type": "car", "initial_speed": 50},
            "target_vehicle": {"type": "car", "initial_speed": 40},
            "road_type": "highway",
            "weather": "clear",
            "time_of_day": "day"
        }
        
        start_time = time.time()
        
        # Generate scenario files
        result = scenario_generator.generate_scenario_files(conversation_params)
        
        end_time = time.time()
        generation_time = end_time - start_time
        
        # Should complete within PRD target of 5-10 seconds
        assert generation_time <= 10.0, f"Generation took {generation_time:.2f}s, exceeds 10s limit"
        assert generation_time >= 2.0, f"Generation took {generation_time:.2f}s, suspiciously fast"
        
        # Verify result quality
        assert result["success"] is True
        assert "xosc_content" in result
        assert "xodr_content" in result
        assert len(result["xosc_content"]) > 100  # Non-trivial content
        assert len(result["xodr_content"]) > 100  # Non-trivial content
    
    def test_scenario_generation_performance_statistics(self):
        """Test scenario generation performance statistics over multiple runs"""
        generation_times = []
        num_runs = 5
        
        conversation_params = {
            "scenario_type": "intersection_crossing",
            "ego_vehicle": {"type": "car", "initial_speed": 30},
            "road_type": "urban",
            "weather": "clear"
        }
        
        for i in range(num_runs):
            start_time = time.time()
            result = scenario_generator.generate_scenario_files(conversation_params)
            end_time = time.time()
            
            generation_time = end_time - start_time
            generation_times.append(generation_time)
            
            # Verify each generation succeeds
            assert result["success"] is True
        
        # Statistical analysis
        avg_time = statistics.mean(generation_times)
        max_time = max(generation_times)
        min_time = min(generation_times)
        std_dev = statistics.stdev(generation_times) if len(generation_times) > 1 else 0
        
        # Performance assertions
        assert avg_time <= 8.0, f"Average generation time {avg_time:.2f}s exceeds 8s target"
        assert max_time <= 10.0, f"Max generation time {max_time:.2f}s exceeds 10s limit"
        assert std_dev <= 2.0, f"High variance in generation times (std dev: {std_dev:.2f}s)"
        
        print(f"Generation Performance Stats:")
        print(f"  Average: {avg_time:.2f}s")
        print(f"  Min: {min_time:.2f}s")
        print(f"  Max: {max_time:.2f}s")
        print(f"  Std Dev: {std_dev:.2f}s")
    
    def test_complex_scenario_generation_performance(self):
        """Test performance with complex multi-vehicle scenarios"""
        complex_params = {
            "scenario_type": "multi_vehicle_highway",
            "ego_vehicle": {"type": "car", "initial_speed": 80},
            "target_vehicles": [
                {"type": "car", "initial_speed": 70},
                {"type": "truck", "initial_speed": 60},
                {"type": "car", "initial_speed": 85}
            ],
            "road_type": "highway_with_ramps",
            "weather": "rain",
            "time_of_day": "night",
            "additional_objects": ["traffic_signs", "barriers"]
        }
        
        start_time = time.time()
        result = scenario_generator.generate_scenario_files(complex_params)
        end_time = time.time()
        
        generation_time = end_time - start_time
        
        # Complex scenarios should still meet PRD targets
        assert generation_time <= 10.0, f"Complex generation took {generation_time:.2f}s, exceeds 10s limit"
        assert result["success"] is True
        
        # Verify complexity is reflected in output
        xosc_content = result["xosc_content"]
        assert "ScenarioObject" in xosc_content
        assert xosc_content.count("ScenarioObject") >= 4  # Ego + 3 targets


class TestValidationPerformance:
    """Test validation performance against PRD targets"""
    
    @pytest.fixture
    def sample_scenario_files(self):
        """Sample scenario files for validation testing"""
        xosc_content = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader revMajor="1" revMinor="2" date="2025-06-29T00:00:00" description="Performance test scenario" name="perf_test"/>
    <RoadNetwork>
        <LogicFile filepath="perf_test.xodr"/>
    </RoadNetwork>
    <Entities>
        <ScenarioObject name="ego_vehicle">
            <Vehicle name="ego_vehicle" vehicleCategory="car"/>
        </ScenarioObject>
        <ScenarioObject name="target_vehicle">
            <Vehicle name="target_vehicle" vehicleCategory="car"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="ego_vehicle">
                    <PrivateAction>
                        <TeleportAction>
                            <Position>
                                <LanePosition roadId="1" laneId="-1" s="0"/>
                            </Position>
                        </TeleportAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="MainStory">
            <Act name="MainAct"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
        
        xodr_content = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
    <header revMajor="1" revMinor="7" date="2025-06-29T00:00:00"/>
    <road name="TestRoad" length="1000.0" id="1" junction="-1">
        <planView>
            <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="1000.0">
                <line/>
            </geometry>
        </planView>
        <lanes>
            <laneSection s="0.0">
                <center>
                    <lane id="0" type="none" level="true"/>
                </center>
                <right>
                    <lane id="-1" type="driving" level="true">
                        <width sOffset="0.0" a="3.5" b="0.0" c="0.0" d="0.0"/>
                    </lane>
                </right>
            </laneSection>
        </lanes>
    </road>
</OpenDRIVE>'''
        
        return xosc_content, xodr_content
    
    def test_validation_throughput_target(self, sample_scenario_files):
        """Test validation completes within 30 seconds (PRD requirement)"""
        xosc_content, xodr_content = sample_scenario_files
        
        start_time = time.time()
        result = validation_service.validate_scenario_pair(xosc_content, xodr_content)
        end_time = time.time()
        
        validation_time = end_time - start_time
        
        # Should complete within PRD target of 30 seconds
        assert validation_time <= 30.0, f"Validation took {validation_time:.2f}s, exceeds 30s limit"
        
        # Verify result quality
        assert hasattr(result, 'is_valid')
        assert hasattr(result, 'issues')
        assert hasattr(result, 'total_errors')
    
    def test_validation_performance_different_levels(self, sample_scenario_files):
        """Test validation performance across different validation levels"""
        xosc_content, xodr_content = sample_scenario_files
        
        # Test current validation level
        start_time = time.time()
        result = validation_service.validate_scenario_pair(xosc_content, xodr_content)
        end_time = time.time()
        
        current_level_time = end_time - start_time
        current_level = validation_service.validation_level
        
        # Performance should meet requirements regardless of validation level
        assert current_level_time <= 30.0, f"Validation at {current_level} took {current_level_time:.2f}s"
        
        print(f"Validation Performance ({current_level}):")
        print(f"  Time: {current_level_time:.2f}s")
        print(f"  Errors: {result.total_errors}")
        print(f"  Warnings: {result.total_warnings}")
    
    def test_validation_performance_batch(self, sample_scenario_files):
        """Test validation performance with multiple scenarios"""
        xosc_content, xodr_content = sample_scenario_files
        validation_times = []
        num_scenarios = 3
        
        for i in range(num_scenarios):
            # Modify content slightly for each scenario
            modified_xosc = xosc_content.replace('perf_test', f'perf_test_{i}')
            
            start_time = time.time()
            result = validation_service.validate_scenario_pair(modified_xosc, xodr_content)
            end_time = time.time()
            
            validation_time = end_time - start_time
            validation_times.append(validation_time)
            
            # Each validation should meet target
            assert validation_time <= 30.0, f"Scenario {i} validation took {validation_time:.2f}s"
            assert hasattr(result, 'is_valid')
        
        # Statistical analysis
        avg_time = statistics.mean(validation_times)
        max_time = max(validation_times)
        
        assert avg_time <= 25.0, f"Average validation time {avg_time:.2f}s too high"
        assert max_time <= 30.0, f"Max validation time {max_time:.2f}s exceeds limit"


class TestRAGPerformance:
    """Test RAG retrieval performance against PRD targets"""
    
    def test_rag_retrieval_speed_target(self):
        """Test RAG retrieval completes within 2-3 seconds (PRD requirement)"""
        # Test query for NCAP scenario retrieval
        test_query = "AEB autonomous emergency braking scenario highway speed 50 km/h"
        
        start_time = time.time()
        
        try:
            # Attempt RAG retrieval
            results = rag_service.search_similar_scenarios(test_query, top_k=5)
            end_time = time.time()
            
            retrieval_time = end_time - start_time
            
            # Should complete within PRD target of 2-3 seconds
            assert retrieval_time <= 3.0, f"RAG retrieval took {retrieval_time:.2f}s, exceeds 3s limit"
            
            # Verify result quality
            assert isinstance(results, list)
            
        except Exception as e:
            # If RAG service is not available, test fallback performance
            end_time = time.time()
            fallback_time = end_time - start_time
            
            # Fallback should still be fast
            assert fallback_time <= 1.0, f"RAG fallback took {fallback_time:.2f}s"
            
            print(f"RAG service not available, fallback used in {fallback_time:.2f}s")
    
    def test_rag_performance_multiple_queries(self):
        """Test RAG performance with multiple queries"""
        test_queries = [
            "AEB scenario highway vehicle braking",
            "LSS lane support system highway departure",
            "pedestrian crossing urban intersection",
            "parking scenario reverse vehicle detection",
            "overtaking maneuver highway multiple vehicles"
        ]
        
        retrieval_times = []
        
        for query in test_queries:
            start_time = time.time()
            
            try:
                results = rag_service.search_similar_scenarios(query, top_k=3)
                end_time = time.time()
                
                retrieval_time = end_time - start_time
                retrieval_times.append(retrieval_time)
                
                # Each query should meet target
                assert retrieval_time <= 3.0, f"Query '{query}' took {retrieval_time:.2f}s"
                
            except Exception:
                # Handle RAG service unavailability
                end_time = time.time()
                retrieval_times.append(end_time - start_time)
        
        if retrieval_times:
            avg_time = statistics.mean(retrieval_times)
            max_time = max(retrieval_times)
            
            # Performance statistics
            print(f"RAG Performance Stats:")
            print(f"  Average: {avg_time:.2f}s")
            print(f"  Max: {max_time:.2f}s")
            
            assert avg_time <= 2.5, f"Average RAG time {avg_time:.2f}s exceeds target"


class TestConcurrentUserPerformance:
    """Test concurrent user performance against PRD targets"""
    
    def test_concurrent_users_no_degradation(self):
        """Test 5 concurrent users without degradation (PRD requirement)"""
        num_concurrent_users = 5
        user_results = []
        errors = []
        
        def simulate_user_workflow(user_id: int) -> Dict:
            """Simulate a complete user workflow"""
            try:
                workflow_start = time.time()
                
                # Step 1: AI conversation (simulated)
                conversation_params = {
                    "scenario_type": f"user_{user_id}_scenario",
                    "ego_vehicle": {"type": "car", "initial_speed": 50 + user_id * 5},
                    "road_type": "highway"
                }
                
                # Step 2: Scenario generation
                generation_start = time.time()
                result = scenario_generator.generate_scenario_files(conversation_params)
                generation_time = time.time() - generation_start
                
                if not result.get("success", False):
                    raise Exception(f"Generation failed for user {user_id}")
                
                # Step 3: Validation
                validation_start = time.time()
                validation_result = validation_service.validate_scenario_pair(
                    result["xosc_content"], result["xodr_content"]
                )
                validation_time = time.time() - validation_start
                
                total_time = time.time() - workflow_start
                
                return {
                    "user_id": user_id,
                    "total_time": total_time,
                    "generation_time": generation_time,
                    "validation_time": validation_time,
                    "success": True,
                    "validation_valid": validation_result.is_valid
                }
                
            except Exception as e:
                errors.append((user_id, str(e)))
                return {
                    "user_id": user_id,
                    "success": False,
                    "error": str(e)
                }
        
        # Execute concurrent user workflows
        with ThreadPoolExecutor(max_workers=num_concurrent_users) as executor:
            futures = [
                executor.submit(simulate_user_workflow, user_id) 
                for user_id in range(num_concurrent_users)
            ]
            
            for future in as_completed(futures, timeout=120):  # 2 minute timeout
                result = future.result()
                user_results.append(result)
        
        # Analyze results
        successful_users = [r for r in user_results if r.get("success", False)]
        
        # Should have no errors
        assert len(errors) == 0, f"Concurrent user errors: {errors}"
        assert len(successful_users) == num_concurrent_users, f"Only {len(successful_users)}/{num_concurrent_users} users succeeded"
        
        # Performance should not degrade significantly
        generation_times = [r["generation_time"] for r in successful_users]
        validation_times = [r["validation_time"] for r in successful_users]
        total_times = [r["total_time"] for r in successful_users]
        
        avg_generation = statistics.mean(generation_times)
        avg_validation = statistics.mean(validation_times)
        avg_total = statistics.mean(total_times)
        
        # Performance assertions with concurrent load
        assert avg_generation <= 12.0, f"Concurrent generation avg {avg_generation:.2f}s exceeds degraded limit"
        assert avg_validation <= 35.0, f"Concurrent validation avg {avg_validation:.2f}s exceeds degraded limit"
        assert avg_total <= 50.0, f"Concurrent total workflow avg {avg_total:.2f}s too high"
        
        print(f"Concurrent User Performance ({num_concurrent_users} users):")
        print(f"  Avg Generation: {avg_generation:.2f}s")
        print(f"  Avg Validation: {avg_validation:.2f}s")
        print(f"  Avg Total: {avg_total:.2f}s")
        print(f"  Success Rate: {len(successful_users)}/{num_concurrent_users}")
    
    def test_concurrent_validation_performance(self):
        """Test concurrent validation requests performance"""
        num_concurrent_validations = 3
        validation_results = []
        errors = []
        
        # Sample scenario content
        xosc_content = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader name="concurrent_test"/>
    <Entities/>
    <Storyboard>
        <Story name="test">
            <Act name="test"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
        
        def concurrent_validation(validation_id: int) -> Dict:
            """Perform validation concurrently"""
            try:
                start_time = time.time()
                
                # Modify content for each validation
                modified_content = xosc_content.replace('concurrent_test', f'concurrent_test_{validation_id}')
                
                result = validation_service.validate_openscenario(modified_content)
                
                end_time = time.time()
                
                return {
                    "validation_id": validation_id,
                    "time": end_time - start_time,
                    "success": True,
                    "is_valid": result.is_valid,
                    "error_count": result.total_errors
                }
                
            except Exception as e:
                errors.append((validation_id, str(e)))
                return {"validation_id": validation_id, "success": False, "error": str(e)}
        
        # Execute concurrent validations
        with ThreadPoolExecutor(max_workers=num_concurrent_validations) as executor:
            futures = [
                executor.submit(concurrent_validation, val_id) 
                for val_id in range(num_concurrent_validations)
            ]
            
            for future in as_completed(futures, timeout=90):  # 90 second timeout
                result = future.result()
                validation_results.append(result)
        
        # Analyze concurrent validation performance
        successful_validations = [r for r in validation_results if r.get("success", False)]
        
        assert len(errors) == 0, f"Concurrent validation errors: {errors}"
        assert len(successful_validations) == num_concurrent_validations
        
        validation_times = [r["time"] for r in successful_validations]
        avg_time = statistics.mean(validation_times)
        max_time = max(validation_times)
        
        # Concurrent validations should still meet performance targets
        assert avg_time <= 35.0, f"Concurrent validation avg {avg_time:.2f}s exceeds limit"
        assert max_time <= 40.0, f"Concurrent validation max {max_time:.2f}s exceeds limit"


class TestIntegratedWorkflowPerformance:
    """Test integrated workflow performance end-to-end"""
    
    def test_complete_workflow_performance(self):
        """Test complete workflow from conversation to visualization"""
        workflow_start = time.time()
        
        # Step 1: Simulated AI conversation
        conversation_start = time.time()
        conversation_params = {
            "scenario_type": "performance_test_workflow",
            "ego_vehicle": {"type": "car", "initial_speed": 60},
            "target_vehicle": {"type": "car", "initial_speed": 50},
            "road_type": "highway",
            "weather": "clear"
        }
        conversation_time = time.time() - conversation_start
        
        # Step 2: Scenario generation
        generation_start = time.time()
        generation_result = scenario_generator.generate_scenario_files(conversation_params)
        generation_time = time.time() - generation_start
        
        assert generation_result["success"] is True
        
        # Step 3: Validation
        validation_start = time.time()
        validation_result = validation_service.validate_scenario_pair(
            generation_result["xosc_content"],
            generation_result["xodr_content"]
        )
        validation_time = time.time() - validation_start
        
        # Step 4: Prepare for visualization (simulated)
        visualization_start = time.time()
        # Simulated visualization preparation
        time.sleep(0.1)  # Minimal simulation
        visualization_time = time.time() - visualization_start
        
        total_workflow_time = time.time() - workflow_start
        
        # Performance assertions for complete workflow
        assert generation_time <= 10.0, f"Generation step took {generation_time:.2f}s"
        assert validation_time <= 30.0, f"Validation step took {validation_time:.2f}s"
        assert total_workflow_time <= 45.0, f"Complete workflow took {total_workflow_time:.2f}s"
        
        # Quality assertions
        assert validation_result.is_valid in [True, False]  # Should complete successfully
        
        print(f"Complete Workflow Performance:")
        print(f"  Conversation: {conversation_time:.2f}s")
        print(f"  Generation: {generation_time:.2f}s")
        print(f"  Validation: {validation_time:.2f}s")
        print(f"  Visualization Prep: {visualization_time:.2f}s")
        print(f"  Total: {total_workflow_time:.2f}s")


class TestPerformanceRegression:
    """Test for performance regression detection"""
    
    def test_performance_baseline_establishment(self):
        """Establish performance baselines for regression testing"""
        # This test should be run periodically to detect performance regressions
        baselines = {
            "scenario_generation": {"target": 10.0, "acceptable": 12.0},
            "validation_throughput": {"target": 30.0, "acceptable": 35.0},
            "rag_retrieval": {"target": 3.0, "acceptable": 4.0},
            "concurrent_users": {"target": 5, "acceptable": 3}
        }
        
        # Test each component
        results = {}
        
        # Test scenario generation
        start_time = time.time()
        gen_result = scenario_generator.generate_scenario_files({
            "scenario_type": "baseline_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50}
        })
        generation_time = time.time() - start_time
        results["scenario_generation"] = generation_time
        
        # Test validation
        if gen_result.get("success"):
            start_time = time.time()
            validation_service.validate_scenario_pair(
                gen_result["xosc_content"], gen_result["xodr_content"]
            )
            validation_time = time.time() - start_time
            results["validation_throughput"] = validation_time
        
        # Test RAG (if available)
        try:
            start_time = time.time()
            rag_service.search_similar_scenarios("test query", top_k=3)
            rag_time = time.time() - start_time
            results["rag_retrieval"] = rag_time
        except Exception:
            results["rag_retrieval"] = None
        
        # Performance regression checks
        for component, time_taken in results.items():
            if time_taken is not None:
                target = baselines[component]["target"]
                acceptable = baselines[component]["acceptable"]
                
                if time_taken > acceptable:
                    pytest.fail(f"Performance regression in {component}: {time_taken:.2f}s > {acceptable}s")
                elif time_taken > target:
                    print(f"Warning: {component} performance degraded: {time_taken:.2f}s > {target}s")
        
        print("Performance Baseline Results:")
        for component, time_taken in results.items():
            if time_taken is not None:
                status = "✅" if time_taken <= baselines[component]["target"] else "⚠️"
                print(f"  {component}: {time_taken:.2f}s {status}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])