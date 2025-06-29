"""
NCAP Knowledge Base for RAG-Enhanced Scenario Generation
Contains structured knowledge about Euro NCAP test scenarios and protocols
"""

from typing import Dict, List, Any
import json

class NCAPKnowledgeBase:
    """Knowledge base containing NCAP scenario patterns and terminology for AI generation"""
    
    # NCAP terminology and definitions
    NCAP_TERMINOLOGY = {
        "AEB": "Autonomous Emergency Braking - system that automatically applies brakes to prevent or mitigate collisions",
        "LSS": "Lane Support Systems - systems that help keep vehicle in lane",
        "VRU": "Vulnerable Road Users - pedestrians, cyclists, motorcyclists",
        "TTC": "Time-to-Collision - time until collision occurs at current trajectories",
        "Overlap": "Percentage of ego vehicle width that overlaps with target at collision point",
        "Nearside": "Side of road closest to traffic (right side in right-hand traffic)",
        "Farside": "Side of road furthest from traffic (left side in right-hand traffic)",
        "CCF": "Car-to-Car Front collision scenarios",
        "CCR": "Car-to-Car Rear collision scenarios", 
        "CP": "Car-to-Pedestrian collision scenarios",
        "CB": "Car-to-Bicyclist collision scenarios",
        "CM": "Car-to-Motorcyclist collision scenarios"
    }
    
    # NCAP scenario patterns and descriptions
    SCENARIO_PATTERNS = {
        "car_to_pedestrian": {
            "description": "Vehicle approaching pedestrian crossing road perpendicularly",
            "typical_speeds": "10-80 kph for ego vehicle, 4-8 kph for pedestrian",
            "key_parameters": ["overlap_percentage", "ego_speed", "pedestrian_speed", "crossing_angle", "ttc"],
            "variations": {
                "CPNA": "Pedestrian crossing from nearside (25%, 75% overlap variants)",
                "CPFA": "Pedestrian crossing from farside (50% overlap)",
                "CPLA": "Pedestrian moving longitudinally same direction (25%, 50% overlap)",
                "CPNCO": "Pedestrian crossing from nearside with obstruction (50% overlap)",
                "CPRA": "Pedestrian in reverse scenario - vehicle backing up (moving/stationary)",
                "CPTA": "Pedestrian crossing during vehicle turn (50% overlap)"
            },
            "environmental_factors": ["lighting conditions", "weather", "road surface", "visibility"],
            "typical_geometry": "Straight road with perpendicular crossing path"
        },
        
        "car_to_bicyclist": {
            "description": "Vehicle approaching bicyclist in various traffic situations", 
            "typical_speeds": "30-80 kph for ego vehicle, 12-25 kph for bicyclist",
            "key_parameters": ["overlap_percentage", "ego_speed", "bicycle_speed", "relative_position"],
            "variations": {
                "CBNA": "Bicyclist crossing from nearside (50% overlap)",
                "CBNAO": "Bicyclist crossing from nearside with obstruction (50% overlap)",
                "CBFA": "Bicyclist crossing from farside (50% overlap)",
                "CBLA": "Bicyclist moving longitudinally same direction (25%, 50% overlap)"
            },
            "typical_geometry": "Road with bicycle lane or shared roadway"
        },
        
        "car_to_car": {
            "description": "Vehicle-to-vehicle collision scenarios testing AEB systems",
            "typical_speeds": "10-80 kph depending on scenario type",
            "key_parameters": ["ego_speed", "target_speed", "relative_speed", "initial_distance", "deceleration_rate"],
            "variations": {
                "CCRs": "Rear collision with stationary target vehicle",
                "CCRm": "Rear collision with moving slower target vehicle", 
                "CCRb": "Rear collision with braking target vehicle",
                "CCFhol": "Head-on collision during lane change maneuver",
                "CCFhos": "Head-on collision on straight road",
                "CCFtap": "Front collision during turn across path"
            },
            "typical_geometry": "Straight roads, intersections, or lane change areas"
        }
    }
    
    # Standard NCAP test parameters and ranges
    PARAMETER_RANGES = {
        "ego_vehicle_speeds_kph": {
            "minimum": 10,
            "maximum": 80, 
            "common_values": [10, 20, 30, 40, 50, 60, 80],
            "description": "Test vehicle speeds according to NCAP protocols"
        },
        "overlap_percentages": {
            "values": [25, 50, 75],
            "description": "Percentage overlap of ego vehicle with target at collision point"
        },
        "time_to_collision": {
            "minimum": 2.5,
            "maximum": 6.0,
            "typical": 4.0,
            "description": "Time before collision occurs if no intervention"
        },
        "pedestrian_speeds_kph": {
            "minimum": 4,
            "maximum": 8,
            "typical": 5,
            "description": "Walking speeds for pedestrian scenarios"
        },
        "bicycle_speeds_kph": {
            "minimum": 12,
            "maximum": 25,
            "typical": 15,
            "description": "Typical cycling speeds in urban environments"
        },
        "initial_distances_m": {
            "minimum": 20,
            "maximum": 100,
            "typical_values": [40, 50, 80],
            "description": "Initial separation distances for various scenarios"
        }
    }
    
    # Environmental conditions for NCAP testing
    ENVIRONMENTAL_CONDITIONS = {
        "lighting": {
            "day": "Standard daylight conditions with good visibility",
            "night": "Nighttime conditions with artificial lighting",
            "dawn_dusk": "Low light conditions during twilight hours"
        },
        "weather": {
            "dry": "Clear, dry conditions with good traction",
            "wet": "Wet road surface with reduced traction",
            "adverse": "Challenging conditions like fog, rain, or snow"
        },
        "road_surface": {
            "asphalt": "Standard road surface with normal friction coefficient",
            "concrete": "Concrete surface with different friction characteristics",
            "wet_asphalt": "Wet road with reduced friction"
        }
    }
    
    # Vehicle specifications used in NCAP testing
    VEHICLE_SPECIFICATIONS = {
        "ego_vehicle": {
            "category": "car",
            "typical_dimensions": {"length": 4.3, "width": 1.8, "height": 1.5},
            "performance": {"max_speed": 70, "max_acceleration": 5, "max_deceleration": 10},
            "description": "Standard passenger car for NCAP testing"
        },
        "target_vehicle": {
            "category": "car", 
            "typical_dimensions": {"length": 4.4, "width": 1.8, "height": 1.5},
            "description": "Target vehicle for car-to-car scenarios"
        },
        "bicycle": {
            "category": "bicycle",
            "typical_dimensions": {"length": 1.9, "width": 0.5, "height": 1.2},
            "performance": {"max_speed": 14, "max_acceleration": 2},
            "description": "Standard bicycle for VRU testing"
        },
        "pedestrian": {
            "category": "pedestrian",
            "typical_dimensions": {"length": 0.6, "width": 0.5, "height": 1.75},
            "performance": {"max_speed": 8, "walking_speed": 5},
            "description": "Adult pedestrian for VRU testing"
        }
    }
    
    @classmethod
    def get_scenario_guidance(cls, scenario_type: str, user_input: str = "") -> Dict[str, Any]:
        """Get guidance for generating a specific type of NCAP scenario"""
        
        if scenario_type.lower() in ["pedestrian", "cp", "car_to_pedestrian"]:
            pattern = cls.SCENARIO_PATTERNS["car_to_pedestrian"]
        elif scenario_type.lower() in ["bicycle", "cb", "car_to_bicyclist"]:
            pattern = cls.SCENARIO_PATTERNS["car_to_bicyclist"]
        elif scenario_type.lower() in ["car", "cc", "car_to_car"]:
            pattern = cls.SCENARIO_PATTERNS["car_to_car"]
        else:
            return {"error": f"Unknown scenario type: {scenario_type}"}
        
        return {
            "pattern": pattern,
            "parameter_ranges": cls.PARAMETER_RANGES,
            "environmental_options": cls.ENVIRONMENTAL_CONDITIONS,
            "vehicle_specs": cls.VEHICLE_SPECIFICATIONS,
            "terminology": cls.NCAP_TERMINOLOGY
        }
    
    @classmethod
    def extract_ncap_parameters(cls, description: str) -> Dict[str, Any]:
        """Extract NCAP-specific parameters from natural language description"""
        
        extracted = {
            "scenario_type": None,
            "ego_speed": None,
            "overlap": None,
            "target_type": None,
            "environmental_conditions": {}
        }
        
        description_lower = description.lower()
        
        # Detect scenario type
        if any(word in description_lower for word in ["pedestrian", "person", "walking"]):
            extracted["scenario_type"] = "car_to_pedestrian"
            extracted["target_type"] = "pedestrian"
        elif any(word in description_lower for word in ["bicycle", "bike", "cyclist"]):
            extracted["scenario_type"] = "car_to_bicyclist" 
            extracted["target_type"] = "bicycle"
        elif any(word in description_lower for word in ["car", "vehicle", "rear"]):
            extracted["scenario_type"] = "car_to_car"
            extracted["target_type"] = "car"
        
        # Extract speed information
        import re
        speed_patterns = [
            r'(\d+)\s*kph',
            r'(\d+)\s*km/h', 
            r'(\d+)\s*mph',
            r'(\d+)\s*m/s'
        ]
        
        for pattern in speed_patterns:
            match = re.search(pattern, description_lower)
            if match:
                speed_value = int(match.group(1))
                if 'mph' in pattern:
                    speed_value = int(speed_value * 1.60934)  # Convert mph to kph
                elif 'm/s' in pattern:
                    speed_value = int(speed_value * 3.6)  # Convert m/s to kph
                extracted["ego_speed"] = speed_value
                break
        
        # Extract overlap information
        overlap_match = re.search(r'(\d+)%?\s*overlap', description_lower)
        if overlap_match:
            extracted["overlap"] = int(overlap_match.group(1))
        
        # Extract environmental conditions
        if any(word in description_lower for word in ["night", "dark", "nighttime"]):
            extracted["environmental_conditions"]["lighting"] = "night"
        elif any(word in description_lower for word in ["day", "daylight", "sunny"]):
            extracted["environmental_conditions"]["lighting"] = "day"
        
        if any(word in description_lower for word in ["wet", "rain", "rainy"]):
            extracted["environmental_conditions"]["weather"] = "wet"
        elif any(word in description_lower for word in ["dry", "clear", "sunny"]):
            extracted["environmental_conditions"]["weather"] = "dry"
        
        return extracted
    
    @classmethod
    def get_ncap_prompts(cls) -> List[str]:
        """Get sample prompts that demonstrate NCAP scenario generation"""
        
        return [
            "Generate a car-to-pedestrian scenario where an adult crosses from the nearside at 50 kph with 25% overlap",
            "Create a rear-end collision scenario with the ego vehicle at 60 kph approaching a stationary target",
            "Design a bicyclist scenario where the cyclist crosses from the farside with 50% overlap at 40 kph", 
            "Generate a CPNA-75 scenario with nighttime conditions and wet road surface",
            "Create a CCRs scenario with 2.5 second time-to-collision and maximum braking",
            "Design a CBLA scenario with the bicycle moving at 15 kph in the same lane",
            "Generate a car turning scenario with a pedestrian crossing the path (CPTA)",
            "Create a head-on collision scenario during lane change maneuver (CCFhol)"
        ]
    
    @classmethod
    def validate_ncap_compliance(cls, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that scenario parameters comply with NCAP standards"""
        
        validation_result = {
            "is_compliant": True,
            "warnings": [],
            "errors": [],
            "suggestions": []
        }
        
        # Check ego vehicle speed
        if "ego_speed_kph" in parameters:
            speed = parameters["ego_speed_kph"]
            if speed < 10 or speed > 80:
                validation_result["errors"].append(f"Ego speed {speed} kph outside NCAP range (10-80 kph)")
                validation_result["is_compliant"] = False
            elif speed not in cls.PARAMETER_RANGES["ego_vehicle_speeds_kph"]["common_values"]:
                validation_result["warnings"].append(f"Speed {speed} kph not a common NCAP test speed")
        
        # Check overlap percentage
        if "overlap" in parameters:
            overlap = parameters["overlap"]
            if overlap not in cls.PARAMETER_RANGES["overlap_percentages"]["values"]:
                validation_result["errors"].append(f"Overlap {overlap}% not a standard NCAP value (25%, 50%, 75%)")
                validation_result["is_compliant"] = False
        
        # Check time-to-collision
        if "ttc" in parameters:
            ttc = parameters["ttc"]
            ttc_range = cls.PARAMETER_RANGES["time_to_collision"]
            if ttc < ttc_range["minimum"] or ttc > ttc_range["maximum"]:
                validation_result["errors"].append(f"TTC {ttc}s outside NCAP range ({ttc_range['minimum']}-{ttc_range['maximum']}s)")
                validation_result["is_compliant"] = False
        
        # Add suggestions for improvement
        if not validation_result["errors"]:
            validation_result["suggestions"].append("Consider adding parameter variations for comprehensive testing")
            validation_result["suggestions"].append("Include environmental condition variations (day/night, dry/wet)")
        
        return validation_result