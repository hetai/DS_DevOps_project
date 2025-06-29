#!/usr/bin/env python3
"""
Scenario Variations and Batch Generation Service
Implements parameterized scenario generation with batch capabilities

Features:
- Parameter variation generation (ranges, distributions, sets)
- Batch scenario generation with optimization
- Scenario template system with variable substitution
- NCAP test parameter variations for compliance
- Statistical distributions (uniform, normal, custom)
- Performance optimization (parallel, caching, streaming)
"""

import copy
import json
import hashlib
import tempfile
import threading
import time
import random
import statistics
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ParameterRange:
    """Parameter range configuration"""
    min_value: float
    max_value: float
    step: Optional[float] = None
    count: Optional[int] = None


@dataclass
class ParameterDistribution:
    """Parameter distribution configuration"""
    type: str  # uniform, normal, custom
    parameters: Dict[str, Any]
    count: int = 100


@dataclass
class VariationConfig:
    """Configuration for parameter variations"""
    parameter_ranges: Optional[Dict[str, ParameterRange]] = None
    parameter_sets: Optional[Dict[str, List[Any]]] = None
    parameter_distributions: Optional[Dict[str, ParameterDistribution]] = None
    max_combinations: Optional[int] = None


@dataclass
class BatchGenerationConfig:
    """Configuration for batch scenario generation"""
    variation_config: VariationConfig
    max_scenarios: Optional[int] = None
    parallel: bool = False
    max_workers: Optional[int] = None
    enable_caching: bool = False
    streaming: bool = False
    chunk_size: int = 10
    output_format: str = "dict"  # dict, files, compressed


@dataclass
class ScenarioTemplate:
    """Scenario template with parameterization"""
    name: str
    description: str
    parameters: Dict[str, Any]
    variables: List[str]
    validation_rules: Optional[Dict[str, Any]] = None


class ParameterVariationGenerator:
    """Generates parameter variations for scenario generation"""
    
    @staticmethod
    def generate_range_variations(parameter_ranges: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate parameter variations from ranges"""
        variations = []
        
        # Convert range specifications to actual values
        parameter_values = {}
        for param_path, range_spec in parameter_ranges.items():
            if "step" in range_spec:
                values = []
                current = range_spec["min"]
                while current <= range_spec["max"]:
                    values.append(current)
                    current += range_spec["step"]
            elif "count" in range_spec:
                step = (range_spec["max"] - range_spec["min"]) / (range_spec["count"] - 1)
                values = [range_spec["min"] + i * step for i in range(range_spec["count"])]
            else:
                # Default to 5 values
                step = (range_spec["max"] - range_spec["min"]) / 4
                values = [range_spec["min"] + i * step for i in range(5)]
            
            parameter_values[param_path] = values
        
        # Generate all combinations
        import itertools
        
        param_names = list(parameter_values.keys())
        value_combinations = list(itertools.product(*[parameter_values[name] for name in param_names]))
        
        for combination in value_combinations:
            variation = {}
            for i, param_path in enumerate(param_names):
                ParameterVariationGenerator._set_nested_parameter(variation, param_path, combination[i])
            variations.append(variation)
        
        return variations
    
    @staticmethod
    def generate_set_variations(parameter_sets: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
        """Generate parameter variations from value sets"""
        import itertools
        
        variations = []
        param_names = list(parameter_sets.keys())
        value_combinations = list(itertools.product(*[parameter_sets[name] for name in param_names]))
        
        for combination in value_combinations:
            variation = {}
            for i, param_path in enumerate(param_names):
                ParameterVariationGenerator._set_nested_parameter(variation, param_path, combination[i])
            variations.append(variation)
        
        return variations
    
    @staticmethod
    def generate_distribution_variations(parameter_distributions: Dict[str, Dict[str, Any]], 
                                       num_scenarios: int) -> List[Dict[str, Any]]:
        """Generate parameter variations from statistical distributions"""
        variations = []
        
        for i in range(num_scenarios):
            variation = {}
            
            for param_path, dist_config in parameter_distributions.items():
                value = ParameterVariationGenerator._sample_from_distribution(dist_config)
                ParameterVariationGenerator._set_nested_parameter(variation, param_path, value)
            
            variations.append(variation)
        
        return variations
    
    @staticmethod
    def _sample_from_distribution(dist_config: Dict[str, Any]) -> float:
        """Sample a value from a distribution"""
        dist_type = dist_config["type"]
        
        if dist_type == "uniform":
            return random.uniform(dist_config["min"], dist_config["max"])
        
        elif dist_type == "normal":
            value = random.gauss(dist_config["mean"], dist_config["std"])
            # Clip to bounds if specified
            if "min" in dist_config:
                value = max(value, dist_config["min"])
            if "max" in dist_config:
                value = min(value, dist_config["max"])
            return value
        
        elif dist_type == "custom":
            values = dist_config["values"]
            weights = dist_config.get("weights", [1.0] * len(values))
            return random.choices(values, weights=weights)[0]
        
        else:
            raise ValueError(f"Unknown distribution type: {dist_type}")
    
    @staticmethod
    def _set_nested_parameter(target: Dict[str, Any], param_path: str, value: Any):
        """Set a nested parameter value using dot notation"""
        # Handle array indexing like "target_vehicles[0].initial_speed"
        if '[' in param_path and ']' in param_path:
            # Parse array access
            parts = param_path.split('[')
            array_key = parts[0]
            remaining = '[' + parts[1]
            
            # Extract index and remaining path
            index_end = remaining.find(']')
            index = int(remaining[1:index_end])
            remaining_path = remaining[index_end + 1:]
            
            if remaining_path.startswith('.'):
                remaining_path = remaining_path[1:]
            
            # Ensure array exists
            if array_key not in target:
                target[array_key] = []
            
            # Extend array if needed
            while len(target[array_key]) <= index:
                target[array_key].append({})
            
            # Set nested value
            if remaining_path:
                ParameterVariationGenerator._set_nested_parameter(
                    target[array_key][index], remaining_path, value
                )
            else:
                target[array_key][index] = value
        
        else:
            # Regular dot notation
            keys = param_path.split('.')
            current = target
            
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            current[keys[-1]] = value


class NCAPParameterGenerator:
    """Generates NCAP-specific test parameter variations"""
    
    NCAP_TEST_CONFIGS = {
        "AEB": {
            "ego_speed_range_kmh": (10, 80),
            "target_speed_kmh": 0,  # Stationary
            "required_parameters": ["ego_vehicle.initial_speed", "target_vehicle.initial_speed"],
            "optional_parameters": ["ttc_threshold", "deceleration_rate"]
        },
        "LSS": {
            "ego_speed_range_kmh": (60, 130),
            "lane_departure_angles": [1.0, 2.0, 3.0, 4.0, 5.0],
            "required_parameters": ["ego_vehicle.initial_speed", "lane_departure_angle"],
            "optional_parameters": ["road_curvature", "line_visibility"]
        },
        "SAS": {
            "ego_speed_range_kmh": (20, 60),
            "steering_angles": [90, 180, 270],  # degrees
            "required_parameters": ["ego_vehicle.initial_speed", "steering_angle"],
            "optional_parameters": ["surface_friction", "tire_pressure"]
        },
        "OD": {
            "ego_speed_range_kmh": (20, 60),
            "pedestrian_scenarios": ["crossing", "running", "child"],
            "required_parameters": ["ego_vehicle.initial_speed", "pedestrian.scenario_type"],
            "optional_parameters": ["visibility", "pedestrian.size"]
        }
    }
    
    @classmethod
    def generate_ncap_variations(cls, base_params: Dict[str, Any], 
                                test_type: str) -> List[Dict[str, Any]]:
        """Generate NCAP-specific test variations"""
        if test_type not in cls.NCAP_TEST_CONFIGS:
            raise ValueError(f"Unknown NCAP test type: {test_type}")
        
        config = cls.NCAP_TEST_CONFIGS[test_type]
        variations = []
        
        if test_type == "AEB":
            variations = cls._generate_aeb_variations(base_params, config)
        elif test_type == "LSS":
            variations = cls._generate_lss_variations(base_params, config)
        elif test_type == "SAS":
            variations = cls._generate_sas_variations(base_params, config)
        elif test_type == "OD":
            variations = cls._generate_od_variations(base_params, config)
        
        return variations
    
    @classmethod
    def _generate_aeb_variations(cls, base_params: Dict[str, Any], 
                               config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AEB test variations"""
        variations = []
        
        # AEB speed variations (convert km/h to m/s)
        min_speed_ms = config["ego_speed_range_kmh"][0] / 3.6
        max_speed_ms = config["ego_speed_range_kmh"][1] / 3.6
        
        # Generate speed variations every 5 km/h
        speed_step_ms = 5.0 / 3.6  # 5 km/h in m/s
        current_speed = min_speed_ms
        
        while current_speed <= max_speed_ms:
            variation = copy.deepcopy(base_params)
            
            # Set ego vehicle speed
            ParameterVariationGenerator._set_nested_parameter(
                variation, "ego_vehicle.initial_speed", round(current_speed, 2)
            )
            
            # Set target vehicle as stationary
            ParameterVariationGenerator._set_nested_parameter(
                variation, "target_vehicle.initial_speed", 0.0
            )
            
            # Add NCAP-specific metadata
            variation["ncap_test_type"] = "AEB"
            variation["ego_speed_kmh"] = round(current_speed * 3.6, 1)
            
            variations.append(variation)
            current_speed += speed_step_ms
        
        return variations
    
    @classmethod
    def _generate_lss_variations(cls, base_params: Dict[str, Any], 
                               config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate LSS test variations"""
        variations = []
        
        # LSS speed variations
        min_speed_ms = config["ego_speed_range_kmh"][0] / 3.6
        max_speed_ms = config["ego_speed_range_kmh"][1] / 3.6
        
        # Speed steps for LSS (every 10 km/h)
        speed_step_ms = 10.0 / 3.6
        speeds = []
        current_speed = min_speed_ms
        while current_speed <= max_speed_ms:
            speeds.append(current_speed)
            current_speed += speed_step_ms
        
        # Generate combinations of speed and departure angle
        for speed in speeds:
            for angle in config["lane_departure_angles"]:
                variation = copy.deepcopy(base_params)
                
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "ego_vehicle.initial_speed", round(speed, 2)
                )
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "lane_departure_angle", angle
                )
                
                variation["ncap_test_type"] = "LSS"
                variation["ego_speed_kmh"] = round(speed * 3.6, 1)
                
                variations.append(variation)
        
        return variations
    
    @classmethod
    def _generate_sas_variations(cls, base_params: Dict[str, Any], 
                               config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate SAS (Speed Assistance Systems) test variations"""
        variations = []
        
        min_speed_ms = config["ego_speed_range_kmh"][0] / 3.6
        max_speed_ms = config["ego_speed_range_kmh"][1] / 3.6
        
        # Generate variations for different speeds and steering angles
        speed_step_ms = 10.0 / 3.6
        current_speed = min_speed_ms
        
        while current_speed <= max_speed_ms:
            for steering_angle in config["steering_angles"]:
                variation = copy.deepcopy(base_params)
                
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "ego_vehicle.initial_speed", round(current_speed, 2)
                )
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "steering_angle", steering_angle
                )
                
                variation["ncap_test_type"] = "SAS"
                variation["ego_speed_kmh"] = round(current_speed * 3.6, 1)
                
                variations.append(variation)
            
            current_speed += speed_step_ms
        
        return variations
    
    @classmethod
    def _generate_od_variations(cls, base_params: Dict[str, Any], 
                              config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate OD (Occupant Detection) test variations"""
        variations = []
        
        min_speed_ms = config["ego_speed_range_kmh"][0] / 3.6
        max_speed_ms = config["ego_speed_range_kmh"][1] / 3.6
        
        # Generate variations for different speeds and pedestrian scenarios
        speed_step_ms = 10.0 / 3.6
        current_speed = min_speed_ms
        
        while current_speed <= max_speed_ms:
            for scenario_type in config["pedestrian_scenarios"]:
                variation = copy.deepcopy(base_params)
                
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "ego_vehicle.initial_speed", round(current_speed, 2)
                )
                ParameterVariationGenerator._set_nested_parameter(
                    variation, "pedestrian.scenario_type", scenario_type
                )
                
                variation["ncap_test_type"] = "OD"
                variation["ego_speed_kmh"] = round(current_speed * 3.6, 1)
                
                variations.append(variation)
            
            current_speed += speed_step_ms
        
        return variations


class ScenarioTemplateManager:
    """Manages scenario templates with parameterization"""
    
    @staticmethod
    def parse_scenario_template(template_content: Dict[str, Any]) -> ScenarioTemplate:
        """Parse a scenario template"""
        name = template_content.get("name", "unnamed_template")
        description = template_content.get("description", "")
        parameters = template_content.get("parameters", {})
        
        # Extract template variables
        variables = ScenarioTemplateManager.extract_template_variables(template_content)
        
        return ScenarioTemplate(
            name=name,
            description=description,
            parameters=parameters,
            variables=variables,
            validation_rules=template_content.get("validation_rules")
        )
    
    @staticmethod
    def extract_template_variables(template_content: Dict[str, Any]) -> List[str]:
        """Extract template variables from template content"""
        variables = set()
        
        def extract_from_value(value):
            if isinstance(value, str):
                # Find ${variable} patterns
                matches = re.findall(r'\$\{([^}]+)\}', value)
                variables.update(matches)
            elif isinstance(value, dict):
                for v in value.values():
                    extract_from_value(v)
            elif isinstance(value, list):
                for item in value:
                    extract_from_value(item)
        
        extract_from_value(template_content)
        return list(variables)
    
    @staticmethod
    def substitute_template_variables(template: Dict[str, Any], 
                                    variable_values: Dict[str, Any]) -> Dict[str, Any]:
        """Substitute template variables with actual values"""
        def substitute_value(value):
            if isinstance(value, str):
                # Replace ${variable} patterns
                for var_name, var_value in variable_values.items():
                    pattern = f"${{{var_name}}}"
                    if pattern in value:
                        if value == pattern:
                            # Entire value is a variable, replace with actual type
                            return var_value
                        else:
                            # Partial substitution, convert to string
                            value = value.replace(pattern, str(var_value))
                return value
            elif isinstance(value, dict):
                return {k: substitute_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [substitute_value(item) for item in value]
            else:
                return value
        
        return substitute_value(copy.deepcopy(template))
    
    @staticmethod
    def validate_scenario_template(template: Dict[str, Any]) -> bool:
        """Validate a scenario template"""
        try:
            # Check required fields
            if "parameters" not in template:
                return False
            
            # Check that all variables can be resolved
            variables = ScenarioTemplateManager.extract_template_variables(template)
            
            # Basic validation passed
            return True
            
        except Exception as e:
            logger.error(f"Template validation failed: {e}")
            return False
    
    @staticmethod
    def generate_template_combinations(template: ScenarioTemplate,
                                     variable_values: Dict[str, List[Any]],
                                     max_combinations: Optional[int] = None) -> List[Dict[str, Any]]:
        """Generate all combinations of template variables"""
        import itertools
        
        # Get variable names and their possible values
        var_names = [var for var in template.variables if var in variable_values]
        var_value_lists = [variable_values[var] for var in var_names]
        
        # Generate all combinations
        combinations = list(itertools.product(*var_value_lists))
        
        # Limit combinations if specified
        if max_combinations and len(combinations) > max_combinations:
            combinations = random.sample(combinations, max_combinations)
        
        # Generate scenarios for each combination
        scenarios = []
        for combination in combinations:
            var_dict = dict(zip(var_names, combination))
            scenario = ScenarioTemplateManager.substitute_template_variables(
                template.parameters, var_dict
            )
            scenarios.append(scenario)
        
        return scenarios


class BatchScenarioGenerator:
    """Generates batches of scenario variations with optimization"""
    
    def __init__(self):
        self.cache = {}
        self.cache_lock = threading.Lock()
    
    def generate_batch_scenarios(self, base_params: Dict[str, Any],
                               config: BatchGenerationConfig) -> Dict[str, Any]:
        """Generate a batch of scenario variations"""
        try:
            # Generate parameter variations
            variations = self._generate_parameter_variations(
                base_params, config.variation_config
            )
            
            # Limit scenarios if specified
            if config.max_scenarios:
                variations = variations[:config.max_scenarios]
            
            # Generate scenarios
            if config.parallel and len(variations) > 3:
                scenarios = self._generate_scenarios_parallel(
                    variations, config.max_workers
                )
            else:
                scenarios = self._generate_scenarios_sequential(variations)
            
            return {
                "success": True,
                "total_scenarios": len(scenarios),
                "scenarios": scenarios,
                "generation_time": time.time(),
                "config": asdict(config)
            }
            
        except Exception as e:
            logger.error(f"Batch generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "scenarios": []
            }
    
    def _generate_parameter_variations(self, base_params: Dict[str, Any],
                                     variation_config: VariationConfig) -> List[Dict[str, Any]]:
        """Generate parameter variations based on configuration"""
        all_variations = []
        
        # Generate from ranges
        if variation_config.parameter_ranges:
            range_variations = ParameterVariationGenerator.generate_range_variations(
                variation_config.parameter_ranges
            )
            all_variations.extend(range_variations)
        
        # Generate from sets
        if variation_config.parameter_sets:
            set_variations = ParameterVariationGenerator.generate_set_variations(
                variation_config.parameter_sets
            )
            all_variations.extend(set_variations)
        
        # Generate from distributions
        if variation_config.parameter_distributions:
            num_scenarios = variation_config.max_combinations or 100
            dist_variations = ParameterVariationGenerator.generate_distribution_variations(
                variation_config.parameter_distributions, num_scenarios
            )
            all_variations.extend(dist_variations)
        
        # Merge variations with base parameters
        merged_variations = []
        for variation in all_variations:
            merged = copy.deepcopy(base_params)
            merged = self._deep_merge_dict(merged, variation)
            merged_variations.append(merged)
        
        # Limit combinations if specified
        if variation_config.max_combinations and len(merged_variations) > variation_config.max_combinations:
            merged_variations = random.sample(merged_variations, variation_config.max_combinations)
        
        return merged_variations
    
    def _generate_scenarios_sequential(self, variations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate scenarios sequentially"""
        scenarios = []
        
        for i, variation in enumerate(variations):
            try:
                # Import here to avoid circular imports
                from .scenario_generator import scenario_generator
                
                # Generate scenario files
                result = scenario_generator.generate_scenario_files(variation)
                
                scenario_data = {
                    f"scenario_{i}": {
                        "xosc_content": result.get("xosc_content", ""),
                        "xodr_content": result.get("xodr_content", ""),
                        "parameters": variation,
                        "generation_success": result.get("success", False)
                    }
                }
                
                scenarios.append(scenario_data)
                
            except Exception as e:
                logger.error(f"Failed to generate scenario {i}: {e}")
                scenario_data = {
                    f"scenario_{i}": {
                        "xosc_content": "",
                        "xodr_content": "",
                        "parameters": variation,
                        "generation_success": False,
                        "error": str(e)
                    }
                }
                scenarios.append(scenario_data)
        
        return scenarios
    
    def _generate_scenarios_parallel(self, variations: List[Dict[str, Any]],
                                   max_workers: Optional[int] = None) -> List[Dict[str, Any]]:
        """Generate scenarios in parallel"""
        scenarios = [None] * len(variations)
        max_workers = max_workers or min(len(variations), 4)
        
        def generate_single_scenario(index: int, variation: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
            try:
                from .scenario_generator import scenario_generator
                
                result = scenario_generator.generate_scenario_files(variation)
                
                scenario_data = {
                    f"scenario_{index}": {
                        "xosc_content": result.get("xosc_content", ""),
                        "xodr_content": result.get("xodr_content", ""),
                        "parameters": variation,
                        "generation_success": result.get("success", False)
                    }
                }
                
                return index, scenario_data
                
            except Exception as e:
                logger.error(f"Failed to generate scenario {index}: {e}")
                scenario_data = {
                    f"scenario_{index}": {
                        "xosc_content": "",
                        "xodr_content": "",
                        "parameters": variation,
                        "generation_success": False,
                        "error": str(e)
                    }
                }
                return index, scenario_data
        
        # Execute in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(generate_single_scenario, i, variation)
                for i, variation in enumerate(variations)
            ]
            
            for future in as_completed(futures, timeout=300):  # 5 minute timeout
                try:
                    index, scenario_data = future.result()
                    scenarios[index] = scenario_data
                except Exception as e:
                    logger.error(f"Parallel generation error: {e}")
        
        # Filter out None values (failed generations)
        return [s for s in scenarios if s is not None]
    
    @staticmethod
    def _deep_merge_dict(base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries"""
        result = copy.deepcopy(base)
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = BatchScenarioGenerator._deep_merge_dict(result[key], value)
            else:
                result[key] = value
        
        return result


class ScenarioVariationsService:
    """Main service for scenario variations and batch generation"""
    
    def __init__(self):
        self.batch_generator = BatchScenarioGenerator()
        self.template_manager = ScenarioTemplateManager()
        self.parameter_generator = ParameterVariationGenerator()
        self.ncap_generator = NCAPParameterGenerator()
    
    def generate_parameter_variations(self, base_params: Dict[str, Any],
                                    parameter_ranges: Optional[Dict[str, Dict[str, Any]]] = None,
                                    parameter_sets: Optional[Dict[str, List[Any]]] = None) -> List[Dict[str, Any]]:
        """Generate parameter variations from ranges or sets"""
        variations = []
        
        if parameter_ranges:
            variations.extend(
                self.parameter_generator.generate_range_variations(parameter_ranges)
            )
        
        if parameter_sets:
            variations.extend(
                self.parameter_generator.generate_set_variations(parameter_sets)
            )
        
        # Merge with base parameters
        merged_variations = []
        for variation in variations:
            merged = copy.deepcopy(base_params)
            merged = BatchScenarioGenerator._deep_merge_dict(merged, variation)
            merged_variations.append(merged)
        
        return merged_variations
    
    def generate_ncap_test_variations(self, base_params: Dict[str, Any], 
                                    test_type: str) -> List[Dict[str, Any]]:
        """Generate NCAP-specific test variations"""
        return self.ncap_generator.generate_ncap_variations(base_params, test_type)
    
    def generate_from_template(self, template: Dict[str, Any],
                             template_variables: Dict[str, List[Any]], 
                             max_combinations: Optional[int] = None) -> Dict[str, Any]:
        """Generate scenarios from a template with variable substitution"""
        try:
            # Parse template
            parsed_template = self.template_manager.parse_scenario_template(template)
            
            # Generate combinations
            scenarios = self.template_manager.generate_template_combinations(
                parsed_template, template_variables, max_combinations
            )
            
            # Generate actual scenario files for each combination
            generated_scenarios = []
            for i, scenario_params in enumerate(scenarios):
                try:
                    from .scenario_generator import scenario_generator
                    result = scenario_generator.generate_scenario_files(scenario_params)
                    
                    scenario_data = {
                        f"scenario_{i}": {
                            "xosc_content": result.get("xosc_content", ""),
                            "xodr_content": result.get("xodr_content", ""),
                            "parameters": scenario_params,
                            "generation_success": result.get("success", False)
                        }
                    }
                    generated_scenarios.append(scenario_data)
                    
                except Exception as e:
                    logger.error(f"Template scenario generation failed for {i}: {e}")
            
            return {
                "success": True,
                "template_name": parsed_template.name,
                "total_scenarios": len(generated_scenarios),
                "scenarios": generated_scenarios
            }
            
        except Exception as e:
            logger.error(f"Template processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "scenarios": []
            }
    
    def generate_batch_scenarios(self, base_params: Dict[str, Any],
                               variation_config: Dict[str, Any],
                               max_scenarios: Optional[int] = None,
                               parallel: bool = False,
                               max_workers: Optional[int] = None,
                               enable_caching: bool = False,
                               streaming: bool = False,
                               chunk_size: int = 10) -> Dict[str, Any]:
        """Generate a batch of scenario variations"""
        
        # Create configuration objects
        var_config = VariationConfig(
            parameter_ranges=variation_config.get("parameter_ranges"),
            parameter_sets=variation_config.get("parameter_sets"), 
            parameter_distributions=variation_config.get("parameter_distributions"),
            max_combinations=variation_config.get("max_combinations")
        )
        
        batch_config = BatchGenerationConfig(
            variation_config=var_config,
            max_scenarios=max_scenarios,
            parallel=parallel,
            max_workers=max_workers,
            enable_caching=enable_caching,
            streaming=streaming,
            chunk_size=chunk_size
        )
        
        return self.batch_generator.generate_batch_scenarios(base_params, batch_config)
    
    def generate_parameter_distribution(self, distribution_config: Dict[str, Any]) -> List[float]:
        """Generate parameter values from a distribution"""
        dist_type = distribution_config["type"]
        count = distribution_config.get("count", 100)
        
        values = []
        for _ in range(count):
            value = ParameterVariationGenerator._sample_from_distribution(distribution_config)
            values.append(value)
        
        return values


# Global service instance
scenario_variations_service = ScenarioVariationsService()