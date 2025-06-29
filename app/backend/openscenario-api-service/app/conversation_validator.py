"""
Conversation Validator for Advanced Parameter Validation
Provides real-time parameter validation and intelligent feedback during AI conversations
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .schemas import ChatMessage
from .asam_ontology_service import ASAMOntologyService


@dataclass
class ValidationResult:
    """Result of conversation parameter validation"""
    has_issues: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]
    completeness_score: float
    missing_parameters: List[str]
    parameter_conflicts: List[str]


@dataclass
class RealTimeFeedback:
    """Real-time feedback for conversation"""
    immediate_issues: List[str]
    suggested_clarifications: List[str]
    parameter_status: Dict[str, str]
    completeness_percentage: float


class ParameterCategory(Enum):
    """Categories of parameters for tracking"""
    VEHICLE = "vehicle"
    SPEED = "speed"
    ROAD = "road"
    WEATHER = "weather"
    ACTION = "action"
    NCAP = "ncap"
    DIMENSIONS = "dimensions"


class ConversationValidator:
    """
    Advanced parameter validator for real-time conversation analysis
    """
    
    def __init__(self):
        """Initialize conversation validator with ASAM ontology service"""
        self.ontology_service = ASAMOntologyService()
        self._load_validation_patterns()
        self._load_parameter_requirements()
    
    def _load_validation_patterns(self):
        """Load regex patterns for parameter extraction and validation"""
        self.patterns = {
            "speed": [
                r"(\d+(?:\.\d+)?)\s*(?:km/h|kmh|kph|mph)",
                r"(\d+(?:\.\d+)?)\s*(?:m/s|meter|metres?)\s*(?:per\s*second)?",
                r"(\d+(?:\.\d+)?)\s*(?:speed|velocity)"
            ],
            "vehicle_types": [
                r"\b(car|truck|bus|bicycle|bike|motorbike|motorcycle|pedestrian|van)\b",
                r"\b(sedan|suv|hatchback|coupe|pickup)\b",
                r"\b(semi|trailer|lorry)\b"
            ],
            "road_types": [
                r"\b(highway|freeway|motorway|autobahn)\b",
                r"\b(city|urban|residential|street)\b",
                r"\b(intersection|junction|roundabout)\b"
            ],
            "weather": [
                r"\b(rain|rainy|wet|snowy|snow|fog|foggy|clear|dry|sunny)\b",
                r"\b(storm|cloudy|overcast|mist)\b"
            ],
            "ncap_tests": [
                r"\b(aeb|emergency\s*braking|automatic\s*emergency\s*braking)\b",
                r"\b(lss|lane\s*support|lane\s*keeping)\b",
                r"\b(sas|steering\s*assist)\b",
                r"\b(bsd|blind\s*spot)\b"
            ],
            "dimensions": [
                r"(\d+(?:\.\d+)?)\s*(?:meter|metre|m)\s*(?:wide|width)",
                r"(\d+(?:\.\d+)?)\s*(?:meter|metre|m)\s*(?:long|length)",
                r"(\d+(?:\.\d+)?)\s*(?:meter|metre|m)\s*(?:high|height)"
            ]
        }
    
    def _load_parameter_requirements(self):
        """Load parameter requirements for different scenario types"""
        self.requirements = {
            "basic_scenario": {
                "required": ["vehicle_types", "road_types"],
                "recommended": ["speed", "weather"],
                "optional": ["dimensions", "actions"]
            },
            "ncap_scenario": {
                "required": ["vehicle_types", "speed", "ncap_tests"],
                "recommended": ["weather", "road_types"],
                "optional": ["dimensions"]
            },
            "highway_scenario": {
                "required": ["vehicle_types", "speed"],
                "recommended": ["weather", "actions"],
                "optional": ["dimensions"]
            }
        }
    
    def validate_conversation_parameters(self, conversation: List[ChatMessage]) -> ValidationResult:
        """
        Comprehensive validation of parameters extracted from conversation
        """
        errors = []
        warnings = []
        suggestions = []
        
        # Extract parameters from conversation
        extracted_params = self._extract_parameters_from_conversation(conversation)
        
        # Validate speed parameters
        speed_issues = self._validate_speeds(extracted_params, conversation)
        warnings.extend(speed_issues)
        
        # Validate vehicle-road compatibility
        compatibility_issues = self._validate_vehicle_road_compatibility(extracted_params)
        errors.extend(compatibility_issues)
        
        # Validate NCAP compliance if applicable
        ncap_issues = self._validate_ncap_compliance(extracted_params, conversation)
        warnings.extend(ncap_issues)
        
        # Validate environmental consistency
        env_issues = self._validate_environmental_consistency(extracted_params)
        warnings.extend(env_issues)
        
        # Calculate completeness
        completeness_score = self.calculate_completeness_score(conversation)
        missing_parameters = self._identify_missing_parameters(extracted_params, conversation)
        
        # Detect conflicts
        conflicts = self.detect_parameter_conflicts(conversation)
        
        # Generate intelligent suggestions
        intelligent_suggestions = self.suggest_parameter_improvements(conversation)
        suggestions.extend(intelligent_suggestions)
        
        return ValidationResult(
            has_issues=len(errors) > 0 or len(warnings) > 0,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions,
            completeness_score=completeness_score,
            missing_parameters=missing_parameters,
            parameter_conflicts=conflicts
        )
    
    def _extract_parameters_from_conversation(self, conversation: List[ChatMessage]) -> Dict[str, List[str]]:
        """Extract parameters from conversation text"""
        conversation_text = " ".join([msg.content for msg in conversation]).lower()
        
        extracted = {}
        for param_type, patterns in self.patterns.items():
            extracted[param_type] = []
            for pattern in patterns:
                matches = re.findall(pattern, conversation_text, re.IGNORECASE)
                if isinstance(matches[0] if matches else None, tuple):
                    # Extract first group from tuple matches
                    extracted[param_type].extend([match[0] if isinstance(match, tuple) else match for match in matches])
                else:
                    extracted[param_type].extend(matches)
        
        return extracted
    
    def _validate_speeds(self, params: Dict[str, List[str]], conversation: List[ChatMessage]) -> List[str]:
        """Validate speed parameters in context"""
        warnings = []
        speeds = params.get("speed", [])
        
        if not speeds:
            return warnings
        
        # Convert speeds to m/s for validation
        for speed_str in speeds:
            try:
                speed_value = float(speed_str)
                
                # Determine context for speed validation
                context = self._determine_scenario_context(conversation)
                
                if context == "highway":
                    if speed_value < 50:  # Assuming km/h, too slow for highway
                        warnings.append(f"Speed {speed_value} km/h may be too slow for highway scenarios")
                    elif speed_value > 200:  # Too fast for realistic highway
                        warnings.append(f"Speed {speed_value} km/h is unrealistically high for highway scenarios")
                
                elif context == "aeb" or context == "ncap":
                    if speed_value > 80:  # AEB tests typically 10-80 km/h
                        warnings.append(f"Speed {speed_value} km/h is outside typical AEB test range (10-80 km/h)")
                    elif speed_value < 10:
                        warnings.append(f"Speed {speed_value} km/h may be too low for effective AEB testing")
                
                elif context == "residential":
                    if speed_value > 50:  # Too fast for residential
                        warnings.append(f"Speed {speed_value} km/h is too high for residential areas")
                
                # General unrealistic speed check
                if speed_value > 300:  # Unrealistic for any vehicle
                    warnings.append(f"Speed {speed_value} km/h is unrealistic for any road vehicle")
                
            except ValueError:
                continue  # Skip non-numeric speeds
        
        return warnings
    
    def _validate_vehicle_road_compatibility(self, params: Dict[str, List[str]]) -> List[str]:
        """Validate vehicle-road type compatibility"""
        errors = []
        
        vehicles = params.get("vehicle_types", [])
        roads = params.get("road_types", [])
        
        for vehicle in vehicles:
            for road in roads:
                if vehicle in ["bicycle", "bike", "pedestrian"] and road in ["highway", "freeway", "motorway"]:
                    errors.append(f"{vehicle.title()} is not allowed on {road}")
                
                if vehicle in ["truck", "semi", "trailer"] and road in ["residential"]:
                    # Warning rather than error for trucks in residential
                    pass  # Could add warnings here
        
        return errors
    
    def _validate_ncap_compliance(self, params: Dict[str, List[str]], conversation: List[ChatMessage]) -> List[str]:
        """Validate NCAP test compliance"""
        warnings = []
        
        ncap_tests = params.get("ncap_tests", [])
        speeds = params.get("speed", [])
        
        if ncap_tests and speeds:
            for test in ncap_tests:
                for speed_str in speeds:
                    try:
                        speed = float(speed_str)
                        
                        if "aeb" in test and speed > 80:
                            warnings.append(f"AEB test speeds should typically be 10-80 km/h, {speed} km/h may be too high")
                        elif "lss" in test and (speed < 60 or speed > 130):
                            warnings.append(f"LSS test speeds should typically be 60-130 km/h")
                        
                    except ValueError:
                        continue
        
        return warnings
    
    def _validate_environmental_consistency(self, params: Dict[str, List[str]]) -> List[str]:
        """Validate environmental condition consistency"""
        warnings = []
        
        weather_conditions = params.get("weather", [])
        
        # Check for inconsistent combinations
        weather_text = " ".join(weather_conditions).lower()
        
        if ("snow" in weather_text or "snowy" in weather_text) and "dry" in weather_text:
            warnings.append("Snowy weather with dry road conditions may be inconsistent")
        
        if ("rain" in weather_text or "rainy" in weather_text) and "dry" in weather_text:
            warnings.append("Rainy weather with dry road conditions may be inconsistent")
        
        return warnings
    
    def _determine_scenario_context(self, conversation: List[ChatMessage]) -> str:
        """Determine the overall scenario context from conversation"""
        conversation_text = " ".join([msg.content for msg in conversation]).lower()
        
        if any(word in conversation_text for word in ["aeb", "emergency braking", "ncap"]):
            return "aeb"
        elif any(word in conversation_text for word in ["highway", "freeway", "motorway"]):
            return "highway"
        elif any(word in conversation_text for word in ["residential", "neighborhood"]):
            return "residential"
        elif any(word in conversation_text for word in ["city", "urban"]):
            return "city"
        else:
            return "general"
    
    def _identify_missing_parameters(self, params: Dict[str, List[str]], conversation: List[ChatMessage]) -> List[str]:
        """Identify missing required parameters"""
        missing = []
        
        context = self._determine_scenario_context(conversation)
        requirements = self.requirements.get(f"{context}_scenario", self.requirements["basic_scenario"])
        
        for required_param in requirements["required"]:
            if not params.get(required_param):
                missing.append(required_param.replace("_", " "))
        
        return missing
    
    def detect_parameter_conflicts(self, conversation: List[ChatMessage]) -> List[str]:
        """Detect conflicting parameters across conversation"""
        conflicts = []
        
        conversation_text = " ".join([msg.content for msg in conversation]).lower()
        
        # Speed vs road type conflicts
        if "highway" in conversation_text and any(speed in conversation_text for speed in ["30 km/h", "20 km/h"]):
            conflicts.append("High-speed highway scenario with very low speeds mentioned")
        
        if "residential" in conversation_text and any(speed in conversation_text for speed in ["120 km/h", "100 km/h"]):
            conflicts.append("Residential scenario with high-speed driving mentioned")
        
        # Vehicle vs road conflicts (already covered in compatibility validation)
        
        return conflicts
    
    def suggest_parameter_improvements(self, conversation: List[ChatMessage]) -> List[str]:
        """Generate intelligent suggestions for missing or problematic parameters"""
        suggestions = []
        
        conversation_text = " ".join([msg.content for msg in conversation]).lower()
        context = self._determine_scenario_context(conversation)
        
        # Context-specific suggestions
        if context == "aeb":
            if "speed" not in conversation_text:
                suggestions.append("Consider specifying speeds between 10-80 km/h for realistic AEB testing")
            if "stationary" not in conversation_text and "target" in conversation_text:
                suggestions.append("AEB tests often involve stationary targets - consider specifying target vehicle state")
        
        elif context == "highway":
            if "speed" not in conversation_text:
                suggestions.append("Highway scenarios typically involve speeds of 70-130 km/h")
            if "lane" not in conversation_text:
                suggestions.append("Consider specifying lane configurations for highway scenarios")
        
        # General suggestions based on missing elements
        if not any(weather in conversation_text for weather in ["dry", "wet", "rain", "snow", "clear"]):
            suggestions.append("Consider specifying weather conditions (dry, wet, rainy, snowy)")
        
        if not any(time in conversation_text for time in ["day", "night", "dawn", "dusk"]):
            suggestions.append("Consider specifying time of day conditions")
        
        return suggestions[:3]  # Limit to 3 most relevant suggestions
    
    def get_real_time_feedback(self, conversation: List[ChatMessage]) -> RealTimeFeedback:
        """Get real-time feedback for current conversation state"""
        validation_result = self.validate_conversation_parameters(conversation)
        
        # Immediate issues that need attention
        immediate_issues = validation_result.errors + validation_result.warnings[:2]  # Top 2 warnings
        
        # Suggested clarifications
        clarifications = []
        if validation_result.missing_parameters:
            clarifications.append(f"Please specify: {', '.join(validation_result.missing_parameters[:3])}")
        
        # Parameter status
        extracted_params = self._extract_parameters_from_conversation(conversation)
        parameter_status = {}
        
        for param_category in ["vehicle_types", "speed", "road_types", "weather"]:
            if extracted_params.get(param_category):
                parameter_status[param_category] = "specified"
            else:
                parameter_status[param_category] = "missing"
        
        return RealTimeFeedback(
            immediate_issues=immediate_issues,
            suggested_clarifications=clarifications,
            parameter_status=parameter_status,
            completeness_percentage=validation_result.completeness_score * 100
        )
    
    def calculate_completeness_score(self, conversation: List[ChatMessage]) -> float:
        """Calculate completeness score for conversation parameters"""
        if not conversation:
            return 0.0
        
        conversation_text = " ".join([msg.content for msg in conversation]).lower()
        
        # Essential parameters for basic scenario
        essential_params = [
            "vehicle_types", "speed", "road_types", "weather", "actions"
        ]
        
        score = 0.0
        for param in essential_params:
            patterns = self.patterns.get(param, [])
            
            param_found = False
            for pattern in patterns:
                if re.search(pattern, conversation_text, re.IGNORECASE):
                    param_found = True
                    break
            
            if param_found:
                score += 1.0 / len(essential_params)
        
        # Bonus for detailed conversation
        if len(conversation) >= 6:  # Multi-turn conversation
            score += 0.1
        
        # Bonus for specific details
        if any(word in conversation_text for word in ["meter", "dimension", "lane", "specific"]):
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0