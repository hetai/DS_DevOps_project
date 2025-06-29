"""
ASAM OpenXOntology Service
Provides semantic validation and error checking for ASAM OpenX scenario parameters
using domain knowledge and ontological constraints.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math
import re

from .schemas import ScenarioParameters, Vehicle, VehicleCategory, BoundingBox, Performance


@dataclass
class ValidationResult:
    """Result of semantic validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    semantic_score: float = 1.0
    suggestions: List[str] = None

    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []


@dataclass
class NCAPComplianceResult:
    """Result of NCAP compliance validation"""
    is_compliant: bool
    test_type: Optional[str]
    compliance_issues: List[str]
    compliance_score: float


class ASAMOntologyService:
    """
    Service for ASAM OpenX semantic validation using domain knowledge
    """
    
    def __init__(self):
        """Initialize ontology service with ASAM OpenX knowledge base"""
        self._load_vehicle_standards()
        self._load_road_standards()
        self._load_ncap_standards()
        self._load_environmental_standards()
    
    def _load_vehicle_standards(self):
        """Load vehicle category standards and constraints"""
        self.vehicle_standards = {
            "car": {
                "typical_dimensions": {
                    "width": (1.5, 2.0),
                    "length": (3.5, 5.5),
                    "height": (1.3, 1.8)
                },
                "performance_ranges": {
                    "max_speed": (10.0, 80.0),  # m/s (36-288 km/h)
                    "max_acceleration": (1.0, 8.0),  # m/s²
                    "max_deceleration": (3.0, 12.0)  # m/s²
                },
                "typical_speeds": {
                    "city": (5.56, 16.67),  # 20-60 km/h
                    "highway": (19.44, 36.11),  # 70-130 km/h
                    "residential": (2.78, 8.33)  # 10-30 km/h
                }
            },
            "van": {
                "typical_dimensions": {
                    "width": (1.8, 2.2),
                    "length": (4.0, 6.5),
                    "height": (1.8, 2.5)
                },
                "performance_ranges": {
                    "max_speed": (8.0, 50.0),
                    "max_acceleration": (0.8, 5.0),
                    "max_deceleration": (3.0, 10.0)
                },
                "typical_speeds": {
                    "city": (5.56, 13.89),
                    "highway": (16.67, 27.78),
                    "residential": (2.78, 8.33)
                }
            },
            "truck": {
                "typical_dimensions": {
                    "width": (2.0, 2.6),
                    "length": (8.0, 18.0),
                    "height": (2.5, 4.0)
                },
                "performance_ranges": {
                    "max_speed": (6.0, 30.0),
                    "max_acceleration": (0.5, 2.5),
                    "max_deceleration": (2.0, 8.0)
                },
                "typical_speeds": {
                    "city": (5.56, 11.11),
                    "highway": (13.89, 25.0),
                    "residential": (2.78, 6.94)
                }
            },
            "bus": {
                "typical_dimensions": {
                    "width": (2.2, 2.6),
                    "length": (8.0, 18.0),
                    "height": (2.8, 3.5)
                },
                "performance_ranges": {
                    "max_speed": (6.0, 25.0),
                    "max_acceleration": (0.5, 2.0),
                    "max_deceleration": (2.0, 6.0)
                },
                "typical_speeds": {
                    "city": (2.78, 11.11),
                    "highway": (11.11, 22.22),
                    "residential": (2.78, 5.56)
                }
            },
            "bicycle": {
                "typical_dimensions": {
                    "width": (0.4, 0.8),
                    "length": (1.5, 2.0),
                    "height": (1.0, 1.5)
                },
                "performance_ranges": {
                    "max_speed": (2.0, 15.0),
                    "max_acceleration": (0.5, 3.0),
                    "max_deceleration": (1.0, 5.0)
                },
                "typical_speeds": {
                    "city": (2.78, 8.33),
                    "highway": None,  # Bicycles not allowed on highways
                    "residential": (2.78, 6.94)
                }
            },
            "motorbike": {
                "typical_dimensions": {
                    "width": (0.6, 1.0),
                    "length": (1.8, 2.5),
                    "height": (1.0, 1.4)
                },
                "performance_ranges": {
                    "max_speed": (10.0, 70.0),
                    "max_acceleration": (2.0, 10.0),
                    "max_deceleration": (3.0, 15.0)
                },
                "typical_speeds": {
                    "city": (5.56, 16.67),
                    "highway": (16.67, 36.11),
                    "residential": (2.78, 8.33)
                }
            },
            "pedestrian": {
                "typical_dimensions": {
                    "width": (0.4, 0.8),
                    "length": (0.4, 0.8),
                    "height": (1.5, 2.0)
                },
                "performance_ranges": {
                    "max_speed": (0.5, 4.0),
                    "max_acceleration": (0.2, 2.0),
                    "max_deceleration": (1.0, 4.0)
                },
                "typical_speeds": {
                    "city": (1.0, 2.0),
                    "highway": None,  # Pedestrians not allowed on highways
                    "residential": (1.0, 1.8)
                }
            }
        }
    
    def _load_road_standards(self):
        """Load road type standards and constraints"""
        self.road_standards = {
            "highway": {
                "min_lanes": 2,
                "max_lanes": 8,
                "lane_width": (3.0, 4.0),
                "speed_limits": (19.44, 41.67),  # 70-150 km/h
                "allowed_vehicles": ["car", "van", "truck", "bus", "motorbike"],
                "prohibited_vehicles": ["bicycle", "pedestrian"],
                "typical_curvature": (500, 10000)  # radius in meters
            },
            "city": {
                "min_lanes": 1,
                "max_lanes": 6,
                "lane_width": (2.5, 3.5),
                "speed_limits": (5.56, 16.67),  # 20-60 km/h
                "allowed_vehicles": ["car", "van", "truck", "bus", "motorbike", "bicycle"],
                "prohibited_vehicles": [],
                "typical_curvature": (10, 500)
            },
            "residential": {
                "min_lanes": 1,
                "max_lanes": 4,
                "lane_width": (2.5, 3.5),
                "speed_limits": (2.78, 8.33),  # 10-30 km/h
                "allowed_vehicles": ["car", "van", "bus", "motorbike", "bicycle", "pedestrian"],
                "prohibited_vehicles": ["truck"],
                "typical_curvature": (5, 200)
            },
            "intersection": {
                "min_lanes": 2,
                "max_lanes": 8,
                "lane_width": (2.5, 3.5),
                "speed_limits": (2.78, 13.89),  # 10-50 km/h
                "allowed_vehicles": ["car", "van", "truck", "bus", "motorbike", "bicycle"],
                "prohibited_vehicles": [],
                "typical_curvature": (5, 100)
            }
        }
    
    def _load_ncap_standards(self):
        """Load Euro NCAP test standards"""
        self.ncap_standards = {
            "AEB": {
                "speed_range": (2.78, 22.22),  # 10-80 km/h
                "target_types": ["stationary", "moving"],
                "test_conditions": ["dry", "daylight"],
                "required_vehicles": 2,
                "scenario_types": ["rear-end collision"]
            },
            "LSS": {
                "speed_range": (16.67, 36.11),  # 60-130 km/h
                "lane_departure_angles": (0.1, 0.5),  # radians
                "test_conditions": ["dry", "daylight", "lane_markings"],
                "required_vehicles": 1,
                "scenario_types": ["lane departure"]
            },
            "SAS": {
                "speed_range": (13.89, 25.0),  # 50-90 km/h
                "steering_angles": (0.2, 1.0),  # radians
                "test_conditions": ["dry", "daylight"],
                "required_vehicles": 1,
                "scenario_types": ["steering assistance"]
            },
            "BSD": {
                "speed_range": (8.33, 22.22),  # 30-80 km/h
                "detection_range": (3.0, 70.0),  # meters
                "test_conditions": ["dry", "daylight"],
                "required_vehicles": 2,
                "scenario_types": ["blind spot detection"]
            }
        }
    
    def _load_environmental_standards(self):
        """Load environmental condition standards"""
        self.environmental_standards = {
            "weather_visibility": {
                "clear": (800, 10000),
                "rain": (200, 1000),
                "fog": (50, 500),
                "snow": (100, 800)
            },
            "time_visibility": {
                "day": (500, 10000),
                "night": (50, 300),
                "dawn": (200, 800),
                "dusk": (200, 800)
            },
            "consistent_conditions": {
                ("snowy", "dry"): False,  # Snow with dry road
                ("rain", "dry"): False,   # Rain with dry road
                ("clear", "wet"): False,  # Clear weather with wet road
                ("foggy", "high_visibility"): False
            }
        }
    
    def validate_scenario_semantics(self, scenario: ScenarioParameters) -> ValidationResult:
        """
        Comprehensive semantic validation of scenario parameters
        """
        errors = []
        warnings = []
        suggestions = []
        
        # Validate vehicles
        for vehicle in scenario.vehicles:
            vehicle_result = self.check_vehicle_compatibility(vehicle)
            errors.extend(vehicle_result.errors)
            warnings.extend(vehicle_result.warnings)
            suggestions.extend(vehicle_result.suggestions)
        
        # Validate road-vehicle compatibility
        road_result = self._validate_road_vehicle_compatibility(scenario)
        errors.extend(road_result.errors)
        warnings.extend(road_result.warnings)
        
        # Validate speed consistency
        speed_result = self._validate_scenario_speeds(scenario)
        errors.extend(speed_result.errors)
        warnings.extend(speed_result.warnings)
        
        # Validate environmental conditions
        env_result = self._validate_environmental_conditions(scenario)
        warnings.extend(env_result.warnings)
        
        # Calculate semantic score
        semantic_score = self._calculate_semantic_score(scenario, errors, warnings)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            semantic_score=semantic_score,
            suggestions=suggestions
        )
    
    def check_vehicle_compatibility(self, vehicle: Vehicle) -> ValidationResult:
        """
        Check if vehicle parameters are semantically consistent
        """
        errors = []
        warnings = []
        suggestions = []
        
        category = vehicle.category.value.lower()
        if category not in self.vehicle_standards:
            errors.append(f"Unknown vehicle category: {category}")
            return ValidationResult(False, errors, warnings, 0.0, suggestions)
        
        standards = self.vehicle_standards[category]
        
        # Check dimensions
        dims_result = self._validate_vehicle_dimensions(vehicle, standards)
        errors.extend(dims_result.errors)
        warnings.extend(dims_result.warnings)
        
        # Check performance
        perf_result = self._validate_vehicle_performance(vehicle, standards)
        errors.extend(perf_result.errors)
        warnings.extend(perf_result.warnings)
        
        # Check speed consistency
        speed_result = self._validate_vehicle_speed(vehicle, standards)
        warnings.extend(speed_result.warnings)
        suggestions.extend(speed_result.suggestions)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            semantic_score=1.0 if len(errors) == 0 else 0.5,
            suggestions=suggestions
        )
    
    def _validate_vehicle_dimensions(self, vehicle: Vehicle, standards: Dict) -> ValidationResult:
        """Validate vehicle dimensions against category standards"""
        errors = []
        warnings = []
        
        dims = standards["typical_dimensions"]
        bbox = vehicle.bounding_box
        
        # Check width
        if not (dims["width"][0] <= bbox.width <= dims["width"][1]):
            if bbox.width < dims["width"][0] * 0.5 or bbox.width > dims["width"][1] * 2:
                errors.append(
                    f"Unrealistic dimensions for {vehicle.category.value}: "
                    f"width {bbox.width:.1f}m outside expected range "
                    f"{dims['width'][0]:.1f}-{dims['width'][1]:.1f}m"
                )
            else:
                warnings.append(
                    f"Unusual width {bbox.width:.1f}m for {vehicle.category.value} "
                    f"(typical: {dims['width'][0]:.1f}-{dims['width'][1]:.1f}m)"
                )
        
        # Check length
        if not (dims["length"][0] <= bbox.length <= dims["length"][1]):
            if bbox.length < dims["length"][0] * 0.5 or bbox.length > dims["length"][1] * 2:
                errors.append(
                    f"Unrealistic dimensions for {vehicle.category.value}: "
                    f"length {bbox.length:.1f}m outside expected range "
                    f"{dims['length'][0]:.1f}-{dims['length'][1]:.1f}m"
                )
            else:
                warnings.append(
                    f"Unusual length {bbox.length:.1f}m for {vehicle.category.value} "
                    f"(typical: {dims['length'][0]:.1f}-{dims['length'][1]:.1f}m)"
                )
        
        # Check height
        if not (dims["height"][0] <= bbox.height <= dims["height"][1]):
            if bbox.height < dims["height"][0] * 0.5 or bbox.height > dims["height"][1] * 2:
                errors.append(
                    f"Unrealistic dimensions for {vehicle.category.value}: "
                    f"height {bbox.height:.1f}m outside expected range "
                    f"{dims['height'][0]:.1f}-{dims['height'][1]:.1f}m"
                )
            else:
                warnings.append(
                    f"Unusual height {bbox.height:.1f}m for {vehicle.category.value} "
                    f"(typical: {dims['height'][0]:.1f}-{dims['height'][1]:.1f}m)"
                )
        
        return ValidationResult(len(errors) == 0, errors, warnings)
    
    def _validate_vehicle_performance(self, vehicle: Vehicle, standards: Dict) -> ValidationResult:
        """Validate vehicle performance against category standards"""
        errors = []
        warnings = []
        
        perf_ranges = standards["performance_ranges"]
        perf = vehicle.performance
        
        # Check max speed
        if not (perf_ranges["max_speed"][0] <= perf.max_speed <= perf_ranges["max_speed"][1]):
            if perf.max_speed > perf_ranges["max_speed"][1] * 2:
                errors.append(
                    f"Unrealistic performance for {vehicle.category.value}: "
                    f"max speed {perf.max_speed:.1f}m/s ({perf.max_speed * 3.6:.0f}km/h) "
                    f"exceeds typical range"
                )
            else:
                warnings.append(
                    f"Unusual max speed {perf.max_speed:.1f}m/s for {vehicle.category.value}"
                )
        
        # Check acceleration
        if not (perf_ranges["max_acceleration"][0] <= perf.max_acceleration <= perf_ranges["max_acceleration"][1]):
            if perf.max_acceleration > perf_ranges["max_acceleration"][1] * 2:
                errors.append(
                    f"Unrealistic performance for {vehicle.category.value}: "
                    f"max acceleration {perf.max_acceleration:.1f}m/s² exceeds typical range"
                )
        
        # Check deceleration
        if not (perf_ranges["max_deceleration"][0] <= perf.max_deceleration <= perf_ranges["max_deceleration"][1]):
            if perf.max_deceleration > perf_ranges["max_deceleration"][1] * 2:
                errors.append(
                    f"Unrealistic performance for {vehicle.category.value}: "
                    f"max deceleration {perf.max_deceleration:.1f}m/s² exceeds typical range"
                )
        
        return ValidationResult(len(errors) == 0, errors, warnings)
    
    def _validate_vehicle_speed(self, vehicle: Vehicle, standards: Dict) -> ValidationResult:
        """Validate vehicle initial speed"""
        warnings = []
        suggestions = []
        
        initial_speed = vehicle.initial_speed
        max_speed = vehicle.performance.max_speed
        
        if initial_speed > max_speed:
            warnings.append(
                f"Vehicle {vehicle.name} initial speed {initial_speed:.1f}m/s "
                f"exceeds max speed {max_speed:.1f}m/s"
            )
            suggestions.append(f"Reduce initial speed for {vehicle.name} to below {max_speed:.1f}m/s")
        
        return ValidationResult(True, [], warnings, suggestions=suggestions)
    
    def _validate_road_vehicle_compatibility(self, scenario: ScenarioParameters) -> ValidationResult:
        """Validate that vehicles are appropriate for road type"""
        errors = []
        warnings = []
        
        # Extract road type from description
        road_desc = scenario.road_network.road_description.lower()
        road_type = self._infer_road_type(road_desc)
        
        if road_type in self.road_standards:
            standards = self.road_standards[road_type]
            prohibited = standards.get("prohibited_vehicles", [])
            
            for vehicle in scenario.vehicles:
                vehicle_type = vehicle.category.value.lower()
                if vehicle_type in prohibited:
                    errors.append(
                        f"{vehicle.category.value} '{vehicle.name}' not allowed on {road_type}"
                    )
        
        return ValidationResult(len(errors) == 0, errors, warnings)
    
    def _validate_scenario_speeds(self, scenario: ScenarioParameters) -> ValidationResult:
        """Validate speed consistency across scenario"""
        errors = []
        warnings = []
        
        # Extract road type and check speed appropriateness
        road_desc = scenario.road_network.road_description.lower()
        road_type = self._infer_road_type(road_desc)
        
        if road_type in self.road_standards:
            speed_limits = self.road_standards[road_type]["speed_limits"]
            
            for vehicle in scenario.vehicles:
                initial_speed = vehicle.initial_speed
                
                if initial_speed > speed_limits[1] * 1.5:
                    warnings.append(
                        f"Vehicle {vehicle.name} speed {initial_speed:.1f}m/s "
                        f"({initial_speed * 3.6:.0f}km/h) very high for {road_type}"
                    )
                elif initial_speed < speed_limits[0] * 0.5:
                    warnings.append(
                        f"Vehicle {vehicle.name} speed {initial_speed:.1f}m/s "
                        f"({initial_speed * 3.6:.0f}km/h) very low for {road_type}"
                    )
        
        return ValidationResult(len(errors) == 0, errors, warnings)
    
    def _validate_environmental_conditions(self, scenario: ScenarioParameters) -> ValidationResult:
        """Validate environmental condition consistency"""
        warnings = []
        
        env = scenario.environment
        weather = env.weather.value.lower()
        
        # Check visibility consistency
        if weather in self.environmental_standards["weather_visibility"]:
            expected_vis = self.environmental_standards["weather_visibility"][weather]
            if not (expected_vis[0] <= env.visibility <= expected_vis[1]):
                warnings.append(
                    f"Visibility {env.visibility}m inconsistent with {weather} weather"
                )
        
        return ValidationResult(True, [], warnings)
    
    def _infer_road_type(self, road_description: str) -> str:
        """Infer road type from description"""
        desc = road_description.lower()
        
        if any(word in desc for word in ["highway", "freeway", "motorway", "autobahn"]):
            return "highway"
        elif any(word in desc for word in ["intersection", "junction", "crossroad"]):
            return "intersection"
        elif any(word in desc for word in ["residential", "neighborhood", "suburb"]):
            return "residential"
        elif any(word in desc for word in ["city", "urban", "downtown"]):
            return "city"
        else:
            return "city"  # Default
    
    def _calculate_semantic_score(self, scenario: ScenarioParameters, errors: List[str], warnings: List[str]) -> float:
        """Calculate overall semantic validity score"""
        if errors:
            return 0.0
        
        warning_penalty = len(warnings) * 0.1
        base_score = 1.0 - min(warning_penalty, 0.8)
        
        # Bonus for realistic scenarios
        if len(scenario.vehicles) > 1 and base_score > 0.8:
            base_score = min(base_score + 0.1, 1.0)
        
        return base_score
    
    def validate_speed_ranges(self, road_type: str, vehicle_speeds: List[float], 
                            vehicle_categories: List[VehicleCategory]) -> ValidationResult:
        """Validate speed ranges for road type"""
        warnings = []
        
        if road_type in self.road_standards:
            speed_limits = self.road_standards[road_type]["speed_limits"]
            
            for speed, category in zip(vehicle_speeds, vehicle_categories):
                if speed < speed_limits[0] * 0.7 or speed > speed_limits[1] * 1.3:
                    warnings.append(
                        f"Speed {speed:.1f}m/s ({speed * 3.6:.0f}km/h) unusual for {road_type}"
                    )
        
        return ValidationResult(True, [], warnings)
    
    def validate_environmental_consistency(self, weather: str, time_of_day: str, 
                                         visibility: float, road_surface: str) -> ValidationResult:
        """Validate environmental condition consistency"""
        warnings = []
        
        # Check weather-road surface consistency
        inconsistent_pairs = [("snowy", "dry"), ("rain", "dry")]
        if (weather.lower(), road_surface.lower()) in inconsistent_pairs:
            warnings.append(f"Inconsistent: {weather} weather with {road_surface} road surface")
        
        return ValidationResult(True, [], warnings)
    
    def validate_road_constraints(self, road_type: str, lane_count: int, 
                                lane_width: float, radius: Optional[float] = None) -> ValidationResult:
        """Validate road geometry constraints"""
        errors = []
        warnings = []
        
        if road_type in self.road_standards:
            standards = self.road_standards[road_type]
            
            # Check lane count
            if lane_count > standards["max_lanes"]:
                errors.append(f"Too many lanes ({lane_count}) for {road_type}")
            
            # Check lane width
            if lane_width < standards["lane_width"][0]:
                errors.append(f"Lane width {lane_width:.1f}m too narrow for {road_type}")
        
        return ValidationResult(len(errors) == 0, errors, warnings)
    
    def validate_action_feasibility(self, vehicle: Vehicle, action_type: str, 
                                  action_duration: float, target_speed: Optional[float] = None) -> ValidationResult:
        """Validate action feasibility for vehicle type"""
        warnings = []
        
        category = vehicle.category.value.lower()
        
        if action_type == "lane_change" and category in ["truck", "bus"]:
            if action_duration < 2.0:  # Trucks need more time for lane changes
                warnings.append(f"Lane change duration {action_duration:.1f}s too fast for {category}")
        
        return ValidationResult(True, [], warnings)
    
    def validate_ncap_compliance(self, scenario: ScenarioParameters) -> NCAPComplianceResult:
        """Validate NCAP test compliance"""
        if not scenario.ncap_compliance:
            return NCAPComplianceResult(False, None, ["NCAP compliance not requested"], 0.0)
        
        # Infer test type from scenario characteristics
        test_type = self._infer_ncap_test_type(scenario)
        
        if test_type not in self.ncap_standards:
            return NCAPComplianceResult(False, test_type, ["Unknown NCAP test type"], 0.0)
        
        standards = self.ncap_standards[test_type]
        issues = []
        
        # Check vehicle count
        if len(scenario.vehicles) != standards["required_vehicles"]:
            issues.append(f"{test_type} requires {standards['required_vehicles']} vehicles")
        
        # Check speed ranges (allow stationary targets for AEB)
        for vehicle in scenario.vehicles:
            speed = vehicle.initial_speed
            # For AEB tests, allow stationary targets (0.0 m/s)
            if test_type == "AEB" and speed == 0.0:
                continue  # Stationary target is valid for AEB
            elif not (standards["speed_range"][0] <= speed <= standards["speed_range"][1]):
                issues.append(
                    f"Vehicle speed {speed:.1f}m/s outside {test_type} range "
                    f"{standards['speed_range'][0]:.1f}-{standards['speed_range'][1]:.1f}m/s"
                )
        
        compliance_score = 1.0 - (len(issues) * 0.25)
        
        return NCAPComplianceResult(
            is_compliant=len(issues) == 0,
            test_type=test_type,
            compliance_issues=issues,
            compliance_score=max(compliance_score, 0.0)
        )
    
    def _infer_ncap_test_type(self, scenario: ScenarioParameters) -> str:
        """Infer NCAP test type from scenario characteristics"""
        desc = scenario.description.lower()
        
        if any(word in desc for word in ["aeb", "emergency", "braking", "collision"]):
            return "AEB"
        elif any(word in desc for word in ["lane", "departure", "keeping", "lss"]):
            return "LSS"
        elif any(word in desc for word in ["steering", "assist", "sas"]):
            return "SAS"
        elif any(word in desc for word in ["blind", "spot", "bsd"]):
            return "BSD"
        else:
            return "AEB"  # Default
    
    def get_vehicle_standards(self) -> Dict[str, Any]:
        """Get vehicle standards for external use"""
        return self.vehicle_standards