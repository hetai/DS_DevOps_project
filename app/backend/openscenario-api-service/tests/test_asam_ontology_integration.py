"""
ASAM OpenXOntology Integration Tests
Tests for semantic error checking using ASAM OpenX domain knowledge

Following TDD methodology as per VERIFICATION.md - RED phase first
"""

import pytest
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.asam_ontology_service import ASAMOntologyService
from app.schemas import ScenarioParameters, Vehicle, VehicleCategory, BoundingBox, Performance


class TestASAMOntologyService:
    """Test suite for ASAM OpenX Ontology semantic validation"""
    
    def setup_method(self):
        """Setup test instance"""
        self.ontology_service = ASAMOntologyService()
    
    def test_ontology_service_initialization(self):
        """Test that ontology service initializes correctly"""
        service = ASAMOntologyService()
        assert service is not None
        assert hasattr(service, 'validate_scenario_semantics')
        assert hasattr(service, 'check_vehicle_compatibility')
        assert hasattr(service, 'validate_road_constraints')
    
    def test_vehicle_semantic_validation(self):
        """Test semantic validation of vehicle parameters"""
        # Valid vehicle
        valid_vehicle = Vehicle(
            name="ego",
            category=VehicleCategory.CAR,
            bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
            performance=Performance(max_speed=55.0, max_acceleration=3.0, max_deceleration=8.0),
            initial_speed=13.89  # 50 km/h in m/s
        )
        
        result = self.ontology_service.check_vehicle_compatibility(valid_vehicle)
        assert result.is_valid == True
        assert len(result.warnings) == 0
        assert len(result.errors) == 0
    
    def test_invalid_vehicle_dimensions(self):
        """Test detection of unrealistic vehicle dimensions"""
        # Unrealistic dimensions for a car
        invalid_vehicle = Vehicle(
            name="oversized_car",
            category=VehicleCategory.CAR,
            bounding_box=BoundingBox(width=15.0, length=30.0, height=8.0),  # Truck-sized car
            performance=Performance(max_speed=55.0, max_acceleration=3.0, max_deceleration=8.0),
            initial_speed=13.89
        )
        
        result = self.ontology_service.check_vehicle_compatibility(invalid_vehicle)
        assert result.is_valid == False
        assert any("unrealistic dimensions" in error.lower() for error in result.errors)
        assert any("car" in error and "dimensions" in error for error in result.errors)
    
    def test_invalid_vehicle_performance(self):
        """Test detection of unrealistic vehicle performance"""
        # Unrealistic performance for a bicycle
        invalid_vehicle = Vehicle(
            name="super_bike",
            category=VehicleCategory.BICYCLE,
            bounding_box=BoundingBox(width=0.6, length=1.8, height=1.2),
            performance=Performance(max_speed=83.33, max_acceleration=15.0, max_deceleration=15.0),  # 300 km/h bike
            initial_speed=27.78  # 100 km/h
        )
        
        result = self.ontology_service.check_vehicle_compatibility(invalid_vehicle)
        assert result.is_valid == False
        assert any("unrealistic performance" in error.lower() for error in result.errors)
        assert any("bicycle" in error.lower() and "speed" in error.lower() for error in result.errors)
    
    def test_scenario_semantic_validation_valid(self):
        """Test semantic validation of valid scenario"""
        valid_scenario = ScenarioParameters(
            scenario_name="Highway Overtaking",
            description="Car overtakes slower vehicle on highway",
            vehicles=[
                Vehicle(
                    name="ego",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
                    performance=Performance(max_speed=55.0, max_acceleration=3.0, max_deceleration=8.0),
                    initial_speed=25.0
                ),
                Vehicle(
                    name="target",
                    category=VehicleCategory.TRUCK,
                    bounding_box=BoundingBox(width=2.5, length=12.0, height=3.5),
                    performance=Performance(max_speed=27.0, max_acceleration=1.5, max_deceleration=5.0),
                    initial_speed=20.0
                )
            ],
            road_network={
                "road_description": "3-lane highway",
                "generate_simple_road": True
            },
            events=[]
        )
        
        result = self.ontology_service.validate_scenario_semantics(valid_scenario)
        assert result.is_valid == True
        assert result.semantic_score >= 0.8  # High semantic validity
    
    def test_scenario_semantic_validation_conflicts(self):
        """Test detection of semantic conflicts in scenario"""
        # Bicycle on highway - semantic conflict
        conflicted_scenario = ScenarioParameters(
            scenario_name="Bicycle Highway",
            description="Bicycle on high-speed highway",
            vehicles=[
                Vehicle(
                    name="bike",
                    category=VehicleCategory.BICYCLE,
                    bounding_box=BoundingBox(width=0.6, length=1.8, height=1.2),
                    performance=Performance(max_speed=13.89, max_acceleration=2.0, max_deceleration=4.0),
                    initial_speed=8.33  # 30 km/h
                )
            ],
            road_network={
                "road_description": "high-speed highway",
                "generate_simple_road": True
            },
            events=[]
        )
        
        result = self.ontology_service.validate_scenario_semantics(conflicted_scenario)
        assert result.is_valid == False
        assert any("highway" in error.lower() and "bicycle" in error.lower() for error in result.errors)
        assert result.semantic_score < 0.5  # Low semantic validity
    
    def test_ncap_compliance_validation(self):
        """Test NCAP test scenario compliance validation"""
        # Valid AEB test scenario
        aeb_scenario = ScenarioParameters(
            scenario_name="AEB Test",
            description="Automatic Emergency Braking test with stationary target",
            vehicles=[
                Vehicle(
                    name="ego",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
                    performance=Performance(max_speed=22.22, max_acceleration=3.0, max_deceleration=8.0),
                    initial_speed=13.89  # 50 km/h - within AEB test range
                ),
                Vehicle(
                    name="target",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
                    performance=Performance(max_speed=0.0, max_acceleration=0.0, max_deceleration=0.0),
                    initial_speed=0.0  # Stationary
                )
            ],
            road_network={
                "road_description": "straight test track",
                "generate_simple_road": True
            },
            events=[],
            ncap_compliance=True
        )
        
        result = self.ontology_service.validate_ncap_compliance(aeb_scenario)
        assert result.is_compliant == True
        assert result.test_type == "AEB"
        assert len(result.compliance_issues) == 0
    
    def test_speed_range_validation(self):
        """Test validation of speed ranges for different road types"""
        # Highway scenario with city speeds - semantic warning
        result = self.ontology_service.validate_speed_ranges(
            road_type="highway",
            vehicle_speeds=[8.33, 11.11],  # 30, 40 km/h - too slow for highway
            vehicle_categories=[VehicleCategory.CAR, VehicleCategory.VAN]
        )
        
        assert len(result.warnings) > 0
        assert any("highway" in warning.lower() and "speed" in warning.lower() for warning in result.warnings)
    
    def test_environmental_consistency_validation(self):
        """Test validation of environmental condition consistency"""
        # Inconsistent environmental conditions
        result = self.ontology_service.validate_environmental_consistency(
            weather="snowy",
            time_of_day="night",
            visibility=1000.0,  # High visibility despite snow and night
            road_surface="dry"   # Dry road despite snow
        )
        
        assert len(result.warnings) > 0
        assert any("inconsistent" in warning.lower() for warning in result.warnings)
    
    def test_road_geometry_validation(self):
        """Test validation of road geometry constraints"""
        # Unrealistic road geometry
        result = self.ontology_service.validate_road_constraints(
            road_type="intersection",
            lane_count=12,  # Too many lanes for intersection
            lane_width=1.0,  # Too narrow
            radius=5.0      # Too tight for high-speed roads
        )
        
        assert len(result.errors) > 0
        assert any("lane" in error.lower() for error in result.errors)
    
    def test_action_feasibility_validation(self):
        """Test validation of action feasibility given vehicle constraints"""
        vehicle = Vehicle(
            name="truck",
            category=VehicleCategory.TRUCK,
            bounding_box=BoundingBox(width=2.5, length=12.0, height=3.5),
            performance=Performance(max_speed=25.0, max_acceleration=1.5, max_deceleration=5.0),
            initial_speed=20.0
        )
        
        # Unrealistic lane change for truck
        result = self.ontology_service.validate_action_feasibility(
            vehicle=vehicle,
            action_type="lane_change",
            action_duration=0.5,  # Too fast for truck
            target_speed=None
        )
        
        assert len(result.warnings) > 0
        assert any("truck" in warning.lower() and "lane change" in warning.lower() for warning in result.warnings)
    
    def test_ontology_knowledge_base_loading(self):
        """Test that ASAM OpenX knowledge base is properly loaded"""
        knowledge = self.ontology_service.get_vehicle_standards()
        
        assert "car" in knowledge
        assert "truck" in knowledge
        assert "bicycle" in knowledge
        
        # Check car standards
        car_std = knowledge["car"]
        assert "typical_dimensions" in car_std
        assert "performance_ranges" in car_std
        assert "typical_speeds" in car_std
    
    def test_semantic_error_reporting(self):
        """Test comprehensive semantic error reporting"""
        # Create scenario with multiple semantic issues
        problematic_scenario = ScenarioParameters(
            scenario_name="Problematic Scenario",
            description="Multiple semantic issues for testing",
            vehicles=[
                Vehicle(
                    name="flying_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
                    performance=Performance(max_speed=200.0, max_acceleration=20.0, max_deceleration=30.0),
                    initial_speed=83.33  # 300 km/h
                )
            ],
            road_network={
                "road_description": "residential street",
                "generate_simple_road": True
            },
            events=[]
        )
        
        result = self.ontology_service.validate_scenario_semantics(problematic_scenario)
        
        assert result.is_valid == False
        assert len(result.errors) > 0
        assert len(result.warnings) > 0
        assert result.semantic_score < 0.3
        
        # Check for specific error types
        error_text = " ".join(result.errors).lower()
        warning_text = " ".join(result.warnings).lower()
        all_text = error_text + " " + warning_text
        
        assert "speed" in all_text or "performance" in all_text
        # Note: Road type validation might be in warnings rather than errors


if __name__ == "__main__":
    pytest.main([__file__, "-v"])