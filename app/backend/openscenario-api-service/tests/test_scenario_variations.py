#!/usr/bin/env python3
"""
Test suite for Scenario Variations and Batch Generation
Following TDD RED phase - comprehensive tests for parameterized scenario generation

Features to test:
- Parameter variation generation (speed, position, weather, etc.)
- Batch scenario generation with parameter ranges
- Parameter distribution support (uniform, normal, custom)
- Scenario template system with parameterization
- Multi-vehicle scenario variations
- NCAP test parameter variations for compliance testing
- Performance optimization for batch operations
"""

import pytest
import tempfile
import json
from pathlib import Path
from typing import Dict, List, Any, Union
from unittest.mock import Mock, patch
import statistics

from app.scenario_generator import scenario_generator
from app.schemas import ScenarioParameters, Vehicle, VehicleCategory, WeatherCondition, TimeOfDay


class TestParameterVariationGeneration:
    """Test parameter variation generation capabilities"""
    
    def test_speed_parameter_variations(self):
        """Test generation of speed parameter variations"""
        # Test speed range variations for AEB scenarios
        base_params = {
            "scenario_type": "AEB_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50},
            "target_vehicle": {"type": "car", "initial_speed": 40}
        }
        
        # Generate speed variations
        speed_variations = scenario_generator.generate_parameter_variations(
            base_params,
            parameter_ranges={
                "ego_vehicle.initial_speed": {"min": 30, "max": 80, "step": 10},
                "target_vehicle.initial_speed": {"min": 20, "max": 60, "step": 10}
            }
        )
        
        # Should generate multiple speed combinations
        assert len(speed_variations) > 1
        
        # Verify speed variations are within NCAP AEB range (10-80 km/h)
        for variation in speed_variations:
            ego_speed = variation["ego_vehicle"]["initial_speed"]
            target_speed = variation["target_vehicle"]["initial_speed"]
            
            assert 30 <= ego_speed <= 80  # km/h converted to m/s bounds
            assert 20 <= target_speed <= 60
            assert ego_speed != target_speed  # Should have different speeds
    
    def test_position_parameter_variations(self):
        """Test generation of position parameter variations"""
        base_params = {
            "scenario_type": "overtaking_maneuver",
            "ego_vehicle": {
                "type": "car",
                "position": {"x": 0, "y": 0, "heading": 0}
            },
            "target_vehicle": {
                "type": "car", 
                "position": {"x": 50, "y": 3.5, "heading": 0}
            }
        }
        
        # Generate position variations
        position_variations = scenario_generator.generate_parameter_variations(
            base_params,
            parameter_ranges={
                "target_vehicle.position.x": {"min": 30, "max": 100, "step": 20},
                "target_vehicle.position.y": {"min": -3.5, "max": 7.0, "step": 3.5}
            }
        )
        
        assert len(position_variations) > 1
        
        # Verify position variations
        for variation in position_variations:
            target_pos = variation["target_vehicle"]["position"]
            assert 30 <= target_pos["x"] <= 100
            assert -3.5 <= target_pos["y"] <= 7.0
    
    def test_weather_and_time_variations(self):
        """Test weather and time of day variations"""
        base_params = {
            "scenario_type": "highway_scenario",
            "weather": "clear",
            "time_of_day": "day",
            "ego_vehicle": {"type": "car", "initial_speed": 60}
        }
        
        # Generate weather/time variations
        environmental_variations = scenario_generator.generate_parameter_variations(
            base_params,
            parameter_sets={
                "weather": ["clear", "rain", "fog", "snow"],
                "time_of_day": ["day", "night", "dawn", "dusk"]
            }
        )
        
        assert len(environmental_variations) == 16  # 4 weather × 4 time combinations
        
        # Verify all combinations are present
        weather_values = {v["weather"] for v in environmental_variations}
        time_values = {v["time_of_day"] for v in environmental_variations}
        
        assert weather_values == {"clear", "rain", "fog", "snow"}
        assert time_values == {"day", "night", "dawn", "dusk"}
    
    def test_multi_vehicle_parameter_variations(self):
        """Test parameter variations for multi-vehicle scenarios"""
        base_params = {
            "scenario_type": "multi_vehicle_highway",
            "ego_vehicle": {"type": "car", "initial_speed": 70},
            "target_vehicles": [
                {"type": "car", "initial_speed": 60},
                {"type": "truck", "initial_speed": 50},
                {"type": "car", "initial_speed": 80}
            ]
        }
        
        # Generate multi-vehicle variations
        multi_variations = scenario_generator.generate_parameter_variations(
            base_params,
            parameter_ranges={
                "ego_vehicle.initial_speed": {"min": 60, "max": 90, "step": 15},
                "target_vehicles[0].initial_speed": {"min": 50, "max": 70, "step": 10},
                "target_vehicles[2].initial_speed": {"min": 70, "max": 100, "step": 15}
            }
        )
        
        assert len(multi_variations) > 1
        
        # Verify multi-vehicle speed variations
        for variation in multi_variations:
            assert 60 <= variation["ego_vehicle"]["initial_speed"] <= 90
            assert 50 <= variation["target_vehicles"][0]["initial_speed"] <= 70
            assert 70 <= variation["target_vehicles"][2]["initial_speed"] <= 100
    
    def test_ncap_test_parameter_variations(self):
        """Test NCAP-specific test parameter variations"""
        # AEB test variations
        aeb_base = {
            "scenario_type": "NCAP_AEB",
            "ego_vehicle": {"type": "car", "initial_speed": 50},
            "target_vehicle": {"type": "car", "initial_speed": 0},  # Stationary
            "ttc_threshold": 1.5  # Time to collision
        }
        
        aeb_variations = scenario_generator.generate_ncap_test_variations(
            aeb_base, 
            test_type="AEB"
        )
        
        # Should generate NCAP AEB speed range variations (10-80 km/h)
        assert len(aeb_variations) >= 8  # Multiple speed combinations
        
        # Verify AEB-specific requirements
        for variation in aeb_variations:
            ego_speed_kmh = variation["ego_vehicle"]["initial_speed"] * 3.6
            assert 10 <= ego_speed_kmh <= 80  # NCAP AEB speed range
            assert variation["target_vehicle"]["initial_speed"] == 0  # Stationary target
        
        # LSS test variations
        lss_base = {
            "scenario_type": "NCAP_LSS",
            "ego_vehicle": {"type": "car", "initial_speed": 80},
            "lane_departure_angle": 3.0  # degrees
        }
        
        lss_variations = scenario_generator.generate_ncap_test_variations(
            lss_base,
            test_type="LSS"
        )
        
        # Verify LSS-specific requirements
        for variation in lss_variations:
            ego_speed_kmh = variation["ego_vehicle"]["initial_speed"] * 3.6
            assert 60 <= ego_speed_kmh <= 130  # NCAP LSS speed range
            assert 1.0 <= variation["lane_departure_angle"] <= 5.0


class TestBatchScenarioGeneration:
    """Test batch generation of scenario variations"""
    
    def test_batch_generation_basic(self):
        """Test basic batch generation functionality"""
        base_params = {
            "scenario_type": "batch_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50},
            "road_type": "highway"
        }
        
        variation_config = {
            "parameter_ranges": {
                "ego_vehicle.initial_speed": {"min": 40, "max": 70, "step": 10}
            }
        }
        
        # Generate batch of scenarios
        batch_result = scenario_generator.generate_batch_scenarios(
            base_params, 
            variation_config,
            max_scenarios=4
        )
        
        assert batch_result["success"] is True
        assert "scenarios" in batch_result
        assert len(batch_result["scenarios"]) == 4
        
        # Verify each scenario has valid content
        for i, scenario in enumerate(batch_result["scenarios"]):
            assert f"scenario_{i}" in scenario
            assert "xosc_content" in scenario[f"scenario_{i}"]
            assert "xodr_content" in scenario[f"scenario_{i}"]
            assert "parameters" in scenario[f"scenario_{i}"]
    
    def test_batch_generation_with_distributions(self):
        """Test batch generation with statistical distributions"""
        base_params = {
            "scenario_type": "distribution_test",
            "ego_vehicle": {"type": "car", "initial_speed": 60},
            "target_vehicle": {"type": "car", "initial_speed": 50}
        }
        
        variation_config = {
            "parameter_distributions": {
                "ego_vehicle.initial_speed": {
                    "type": "normal",
                    "mean": 60,
                    "std": 10,
                    "min": 30,
                    "max": 90
                },
                "target_vehicle.initial_speed": {
                    "type": "uniform", 
                    "min": 40,
                    "max": 80
                }
            }
        }
        
        # Generate batch with distributions
        batch_result = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            num_scenarios=20
        )
        
        assert batch_result["success"] is True
        assert len(batch_result["scenarios"]) == 20
        
        # Analyze generated distributions
        ego_speeds = []
        target_speeds = []
        
        for scenario in batch_result["scenarios"]:
            scenario_data = list(scenario.values())[0]
            params = scenario_data["parameters"]
            ego_speeds.append(params["ego_vehicle"]["initial_speed"])
            target_speeds.append(params["target_vehicle"]["initial_speed"])
        
        # Verify normal distribution characteristics for ego speed
        ego_mean = statistics.mean(ego_speeds)
        ego_std = statistics.stdev(ego_speeds)
        
        assert 55 <= ego_mean <= 65  # Should be close to target mean (60)
        assert 8 <= ego_std <= 12   # Should be close to target std (10)
        
        # Verify uniform distribution for target speed
        assert min(target_speeds) >= 40
        assert max(target_speeds) <= 80
    
    def test_batch_generation_performance(self):
        """Test batch generation performance requirements"""
        import time
        
        base_params = {
            "scenario_type": "performance_batch",
            "ego_vehicle": {"type": "car", "initial_speed": 50}
        }
        
        variation_config = {
            "parameter_ranges": {
                "ego_vehicle.initial_speed": {"min": 30, "max": 80, "step": 5}
            }
        }
        
        # Measure batch generation time
        start_time = time.time()
        
        batch_result = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            max_scenarios=10
        )
        
        generation_time = time.time() - start_time
        
        # Performance requirements
        assert generation_time <= 30.0  # Should complete within 30 seconds
        assert batch_result["success"] is True
        assert len(batch_result["scenarios"]) == 10
        
        # Verify generation efficiency
        avg_time_per_scenario = generation_time / len(batch_result["scenarios"])
        assert avg_time_per_scenario <= 5.0  # Max 5 seconds per scenario
    
    def test_batch_generation_with_templates(self):
        """Test batch generation using scenario templates"""
        # Define scenario template
        template = {
            "scenario_type": "template_based",
            "description": "Template for highway overtaking scenarios",
            "parameters": {
                "ego_vehicle": {
                    "type": "car",
                    "initial_speed": "${ego_speed}",
                    "position": {"x": 0, "y": 0}
                },
                "target_vehicle": {
                    "type": "${target_type}",
                    "initial_speed": "${target_speed}",
                    "position": {"x": "${target_distance}", "y": 3.5}
                },
                "weather": "${weather_condition}",
                "road_type": "highway"
            }
        }
        
        # Define template variable values
        template_variables = {
            "ego_speed": [50, 60, 70],
            "target_type": ["car", "truck"],
            "target_speed": [40, 50],
            "target_distance": [30, 50, 100],
            "weather_condition": ["clear", "rain"]
        }
        
        # Generate scenarios from template
        template_result = scenario_generator.generate_from_template(
            template,
            template_variables,
            max_combinations=12
        )
        
        assert template_result["success"] is True
        assert len(template_result["scenarios"]) == 12
        
        # Verify template substitution worked correctly
        for scenario in template_result["scenarios"]:
            scenario_data = list(scenario.values())[0]
            params = scenario_data["parameters"]
            
            # Check that template variables were substituted
            assert params["ego_vehicle"]["initial_speed"] in [50, 60, 70]
            assert params["target_vehicle"]["type"] in ["car", "truck"]
            assert params["weather"] in ["clear", "rain"]


class TestParameterDistributions:
    """Test parameter distribution support"""
    
    def test_uniform_distribution_generation(self):
        """Test uniform distribution parameter generation"""
        distribution_config = {
            "type": "uniform",
            "min": 30,
            "max": 80,
            "count": 100
        }
        
        values = scenario_generator.generate_parameter_distribution(distribution_config)
        
        assert len(values) == 100
        assert all(30 <= v <= 80 for v in values)
        
        # Check uniform distribution characteristics
        assert min(values) >= 30
        assert max(values) <= 80
        
        # Values should be reasonably distributed
        bins = [0, 0, 0, 0, 0]  # 5 bins
        for v in values:
            bin_idx = min(int((v - 30) / 10), 4)
            bins[bin_idx] += 1
        
        # Each bin should have reasonable representation (not perfect due to randomness)
        for bin_count in bins:
            assert bin_count >= 10  # At least 10% in each bin
    
    def test_normal_distribution_generation(self):
        """Test normal distribution parameter generation"""
        distribution_config = {
            "type": "normal",
            "mean": 60,
            "std": 10,
            "min": 30,
            "max": 90,
            "count": 100
        }
        
        values = scenario_generator.generate_parameter_distribution(distribution_config)
        
        assert len(values) == 100
        assert all(30 <= v <= 90 for v in values)  # Clipped to bounds
        
        # Check normal distribution characteristics
        mean_val = statistics.mean(values)
        std_val = statistics.stdev(values)
        
        # Should be close to target (allowing for clipping at bounds)
        assert 55 <= mean_val <= 65
        assert 8 <= std_val <= 12
    
    def test_custom_distribution_generation(self):
        """Test custom weighted distribution generation"""
        distribution_config = {
            "type": "custom",
            "values": [40, 50, 60, 70, 80],
            "weights": [0.1, 0.2, 0.4, 0.2, 0.1],  # Normal-like weights
            "count": 100
        }
        
        values = scenario_generator.generate_parameter_distribution(distribution_config)
        
        assert len(values) == 100
        assert all(v in [40, 50, 60, 70, 80] for v in values)
        
        # Count occurrences
        value_counts = {v: values.count(v) for v in [40, 50, 60, 70, 80]}
        
        # Center value (60) should be most common
        assert value_counts[60] >= value_counts[40]
        assert value_counts[60] >= value_counts[80]


class TestScenarioTemplateSystem:
    """Test scenario template system"""
    
    def test_template_parsing(self):
        """Test parsing of scenario templates"""
        template_content = {
            "name": "highway_overtaking_template",
            "description": "Parameterized highway overtaking scenario",
            "parameters": {
                "ego_vehicle": {
                    "type": "car",
                    "initial_speed": "${ego_speed}",
                    "lane_id": -1
                },
                "target_vehicle": {
                    "type": "${target_type}",
                    "initial_speed": "${target_speed}",
                    "lane_id": -2
                },
                "maneuver": {
                    "type": "overtaking",
                    "trigger_distance": "${trigger_dist}",
                    "completion_distance": "${completion_dist}"
                }
            }
        }
        
        # Parse template
        template = scenario_generator.parse_scenario_template(template_content)
        
        assert template["name"] == "highway_overtaking_template"
        assert "parameters" in template
        
        # Extract template variables
        variables = scenario_generator.extract_template_variables(template)
        
        expected_vars = {"ego_speed", "target_type", "target_speed", "trigger_dist", "completion_dist"}
        assert set(variables) == expected_vars
    
    def test_template_variable_substitution(self):
        """Test template variable substitution"""
        template = {
            "parameters": {
                "ego_vehicle": {
                    "initial_speed": "${speed}",
                    "type": "${vehicle_type}"
                },
                "weather": "${conditions}"
            }
        }
        
        variable_values = {
            "speed": 60,
            "vehicle_type": "car",
            "conditions": "rain"
        }
        
        # Substitute variables
        result = scenario_generator.substitute_template_variables(template, variable_values)
        
        assert result["parameters"]["ego_vehicle"]["initial_speed"] == 60
        assert result["parameters"]["ego_vehicle"]["type"] == "car"
        assert result["parameters"]["weather"] == "rain"
    
    def test_template_validation(self):
        """Test template validation"""
        # Valid template
        valid_template = {
            "name": "valid_template",
            "parameters": {
                "ego_vehicle": {"type": "car", "speed": "${speed}"}
            }
        }
        
        assert scenario_generator.validate_scenario_template(valid_template) is True
        
        # Invalid template (missing required fields)
        invalid_template = {
            "parameters": {"ego_vehicle": {"speed": "${undefined_var}"}}
        }
        
        assert scenario_generator.validate_scenario_template(invalid_template) is False


class TestBatchOperationOptimization:
    """Test optimization features for batch operations"""
    
    def test_parallel_generation(self):
        """Test parallel batch generation"""
        base_params = {
            "scenario_type": "parallel_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50}
        }
        
        variation_config = {
            "parameter_ranges": {
                "ego_vehicle.initial_speed": {"min": 30, "max": 80, "step": 10}
            }
        }
        
        # Test parallel generation
        import time
        
        start_time = time.time()
        parallel_result = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            max_scenarios=6,
            parallel=True,
            max_workers=3
        )
        parallel_time = time.time() - start_time
        
        # Test sequential generation
        start_time = time.time()
        sequential_result = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            max_scenarios=6,
            parallel=False
        )
        sequential_time = time.time() - start_time
        
        # Parallel should be faster (or at least not significantly slower)
        assert parallel_result["success"] is True
        assert sequential_result["success"] is True
        assert len(parallel_result["scenarios"]) == len(sequential_result["scenarios"])
        
        # Parallel should provide speedup for larger batches
        if sequential_time > 1.0:  # Only check if sequential takes meaningful time
            assert parallel_time <= sequential_time * 1.2  # Allow 20% tolerance
    
    def test_batch_result_caching(self):
        """Test caching of batch generation results"""
        base_params = {
            "scenario_type": "cache_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50}
        }
        
        variation_config = {
            "parameter_ranges": {
                "ego_vehicle.initial_speed": {"min": 40, "max": 60, "step": 10}
            }
        }
        
        # First generation (should cache)
        import time
        start_time = time.time()
        
        result1 = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            enable_caching=True
        )
        
        first_time = time.time() - start_time
        
        # Second generation (should use cache)
        start_time = time.time()
        
        result2 = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            enable_caching=True
        )
        
        second_time = time.time() - start_time
        
        # Results should be identical
        assert result1["success"] is True
        assert result2["success"] is True
        assert len(result1["scenarios"]) == len(result2["scenarios"])
        
        # Second generation should be significantly faster
        assert second_time <= first_time * 0.5  # At least 50% faster
    
    def test_batch_memory_management(self):
        """Test memory management for large batch operations"""
        base_params = {
            "scenario_type": "memory_test",
            "ego_vehicle": {"type": "car", "initial_speed": 50}
        }
        
        variation_config = {
            "parameter_ranges": {
                "ego_vehicle.initial_speed": {"min": 30, "max": 80, "step": 2}
            }
        }
        
        # Generate large batch
        large_batch_result = scenario_generator.generate_batch_scenarios(
            base_params,
            variation_config,
            streaming=True,  # Use streaming to manage memory
            chunk_size=5     # Process in chunks of 5
        )
        
        assert large_batch_result["success"] is True
        
        # Verify streaming result structure
        assert "total_scenarios" in large_batch_result
        assert "chunks_processed" in large_batch_result
        assert large_batch_result["chunks_processed"] > 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])