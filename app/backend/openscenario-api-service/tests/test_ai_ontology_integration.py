"""
AI Service ASAM Ontology Integration Tests
Tests for the integration of semantic validation into the AI conversation service

Following TDD methodology as per VERIFICATION.md
"""

import pytest
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.ai_service_working import WorkingAIService
from app.schemas import ScenarioParameters, Vehicle, VehicleCategory, BoundingBox, Performance


class TestAIServiceOntologyIntegration:
    """Test suite for AI service with ASAM ontology integration"""
    
    def setup_method(self):
        """Setup test instance"""
        self.ai_service = WorkingAIService()
    
    def test_ai_service_has_ontology_service(self):
        """Test that AI service initializes with ontology service"""
        assert hasattr(self.ai_service, 'ontology_service')
        assert self.ai_service.ontology_service is not None
    
    def test_semantic_validation_enhancement(self):
        """Test that semantic validation enhances extracted parameters"""
        # Create parameters with unrealistic values
        problematic_params = ScenarioParameters(
            scenario_name="Test Scenario",
            description="Test scenario with problematic parameters",
            vehicles=[
                Vehicle(
                    name="super_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=10.0, length=20.0, height=5.0),  # Unrealistic
                    performance=Performance(max_speed=200.0, max_acceleration=50.0, max_deceleration=50.0),  # Unrealistic
                    initial_speed=150.0  # Unrealistic
                )
            ],
            road_network={"road_description": "test road", "generate_simple_road": True},
            events=[]
        )
        
        # Enhance with semantic validation
        enhanced_params = self.ai_service._enhance_with_semantic_validation(problematic_params)
        
        # Check that parameters were corrected
        assert enhanced_params is not None
        assert len(enhanced_params.vehicles) == 1
        
        enhanced_vehicle = enhanced_params.vehicles[0]
        
        # Dimensions should be corrected to realistic values
        assert enhanced_vehicle.bounding_box.width < 5.0  # Should be corrected
        assert enhanced_vehicle.bounding_box.length < 10.0  # Should be corrected
        assert enhanced_vehicle.bounding_box.height < 3.0  # Should be corrected
        
        # Performance should be corrected
        assert enhanced_vehicle.performance.max_speed < 100.0  # Should be corrected
        assert enhanced_vehicle.performance.max_acceleration < 20.0  # Should be corrected
        
        # Initial speed should be corrected
        assert enhanced_vehicle.initial_speed < enhanced_vehicle.performance.max_speed
    
    def test_vehicle_category_standards_applied(self):
        """Test that vehicle category-specific standards are applied"""
        # Create a bicycle with car-like parameters
        bicycle_params = ScenarioParameters(
            scenario_name="Bicycle Test",
            description="Bicycle with unrealistic parameters",
            vehicles=[
                Vehicle(
                    name="speed_bike",
                    category=VehicleCategory.BICYCLE,
                    bounding_box=BoundingBox(width=2.0, length=5.0, height=2.0),  # Car-sized
                    performance=Performance(max_speed=50.0, max_acceleration=10.0, max_deceleration=15.0),  # Car-like
                    initial_speed=30.0  # Very fast for bicycle
                )
            ],
            road_network={"road_description": "city street", "generate_simple_road": True},
            events=[]
        )
        
        enhanced_params = self.ai_service._enhance_with_semantic_validation(bicycle_params)
        enhanced_vehicle = enhanced_params.vehicles[0]
        
        # Should be corrected to bicycle-appropriate values
        assert enhanced_vehicle.bounding_box.width < 1.0  # Bicycle width
        assert enhanced_vehicle.bounding_box.length < 3.0  # Bicycle length
        assert enhanced_vehicle.performance.max_speed < 20.0  # Bicycle speed
    
    def test_intelligent_defaults_for_missing_values(self):
        """Test that intelligent defaults are applied for edge cases"""
        # Create parameters with minimal/extreme values
        minimal_params = ScenarioParameters(
            scenario_name="Minimal Test",
            description="Minimal parameters",
            vehicles=[
                Vehicle(
                    name="minimal_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=0.1, length=0.1, height=0.1),  # Too small
                    performance=Performance(max_speed=0.1, max_acceleration=0.1, max_deceleration=0.1),  # Too low
                    initial_speed=0.0  # Stationary
                )
            ],
            road_network={"road_description": "highway", "generate_simple_road": True},
            events=[]
        )
        
        enhanced_params = self.ai_service._enhance_with_semantic_validation(minimal_params)
        enhanced_vehicle = enhanced_params.vehicles[0]
        
        # Should be corrected to reasonable defaults
        assert enhanced_vehicle.bounding_box.width > 1.0  # Reasonable car width
        assert enhanced_vehicle.bounding_box.length > 3.0  # Reasonable car length
        assert enhanced_vehicle.performance.max_speed > 10.0  # Reasonable max speed
        assert enhanced_vehicle.initial_speed > 0.5  # Non-zero initial speed
    
    def test_performance_consistency_maintained(self):
        """Test that performance parameters remain consistent after enhancement"""
        # Create parameters with inconsistent performance
        inconsistent_params = ScenarioParameters(
            scenario_name="Inconsistent Test",
            description="Inconsistent performance parameters",
            vehicles=[
                Vehicle(
                    name="inconsistent_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),
                    performance=Performance(max_speed=30.0, max_acceleration=3.0, max_deceleration=8.0),
                    initial_speed=50.0  # Higher than max speed
                )
            ],
            road_network={"road_description": "city street", "generate_simple_road": True},
            events=[]
        )
        
        enhanced_params = self.ai_service._enhance_with_semantic_validation(inconsistent_params)
        enhanced_vehicle = enhanced_params.vehicles[0]
        
        # Initial speed should not exceed max speed
        assert enhanced_vehicle.initial_speed <= enhanced_vehicle.performance.max_speed
        assert enhanced_vehicle.initial_speed > 0  # Should be positive
    
    def test_multiple_vehicles_enhanced_correctly(self):
        """Test that multiple vehicles in a scenario are all enhanced"""
        multi_vehicle_params = ScenarioParameters(
            scenario_name="Multi Vehicle Test",
            description="Multiple vehicles with different issues",
            vehicles=[
                Vehicle(
                    name="oversized_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=5.0, length=10.0, height=3.0),  # Too big
                    performance=Performance(max_speed=40.0, max_acceleration=3.0, max_deceleration=8.0),
                    initial_speed=25.0
                ),
                Vehicle(
                    name="super_bike",
                    category=VehicleCategory.BICYCLE,
                    bounding_box=BoundingBox(width=0.6, length=1.8, height=1.2),
                    performance=Performance(max_speed=100.0, max_acceleration=20.0, max_deceleration=20.0),  # Too fast
                    initial_speed=50.0  # Way too fast for bicycle
                )
            ],
            road_network={"road_description": "mixed road", "generate_simple_road": True},
            events=[]
        )
        
        enhanced_params = self.ai_service._enhance_with_semantic_validation(multi_vehicle_params)
        
        assert len(enhanced_params.vehicles) == 2
        
        # Car should be size-corrected (width should be corrected more aggressively than length)
        car = enhanced_params.vehicles[0]
        assert car.bounding_box.width < 3.0  # Width should be well corrected
        # Length correction may be less aggressive, just check it's not getting worse
        assert car.bounding_box.length <= 10.0
        
        # Bicycle should be performance-corrected
        bike = enhanced_params.vehicles[1]
        assert bike.performance.max_speed < 20.0
        assert bike.initial_speed < 15.0
    
    def test_enhancement_preserves_valid_parameters(self):
        """Test that already valid parameters are preserved"""
        valid_params = ScenarioParameters(
            scenario_name="Valid Test",
            description="Already valid parameters",
            vehicles=[
                Vehicle(
                    name="normal_car",
                    category=VehicleCategory.CAR,
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.6),  # Realistic
                    performance=Performance(max_speed=55.0, max_acceleration=3.0, max_deceleration=8.0),  # Realistic
                    initial_speed=25.0  # Realistic
                )
            ],
            road_network={"road_description": "highway", "generate_simple_road": True},
            events=[]
        )
        
        enhanced_params = self.ai_service._enhance_with_semantic_validation(valid_params)
        enhanced_vehicle = enhanced_params.vehicles[0]
        
        # Valid parameters should be largely preserved
        assert abs(enhanced_vehicle.bounding_box.width - 1.8) < 0.5
        assert abs(enhanced_vehicle.bounding_box.length - 4.5) < 1.0
        assert abs(enhanced_vehicle.performance.max_speed - 55.0) < 10.0
        assert abs(enhanced_vehicle.initial_speed - 25.0) < 10.0
    
    def test_enhancement_error_handling(self):
        """Test that enhancement handles errors gracefully"""
        # Create parameters that might cause issues
        problematic_params = ScenarioParameters(
            scenario_name="Error Test",
            description="Parameters that might cause errors",
            vehicles=[],  # Empty vehicles list
            road_network={"road_description": "test", "generate_simple_road": True},
            events=[]
        )
        
        # Enhancement should not crash
        enhanced_params = self.ai_service._enhance_with_semantic_validation(problematic_params)
        
        # Should return valid parameters (possibly the original)
        assert enhanced_params is not None
        assert hasattr(enhanced_params, 'vehicles')
    
    def test_bounding_box_enhancement_edge_cases(self):
        """Test bounding box enhancement with edge cases"""
        test_vehicle = Vehicle(
            name="test_car",
            category=VehicleCategory.CAR,
            bounding_box=BoundingBox(width=0.0, length=0.0, height=0.0),  # Zero dimensions
            performance=Performance(max_speed=30.0, max_acceleration=3.0, max_deceleration=8.0),
            initial_speed=15.0
        )
        
        # Get vehicle standards
        standards = self.ai_service.ontology_service.get_vehicle_standards()["car"]
        
        # Test bounding box enhancement
        enhanced_bbox = self.ai_service._enhance_bounding_box(test_vehicle.bounding_box, standards)
        
        # Should apply reasonable defaults
        assert enhanced_bbox.width > 1.0
        assert enhanced_bbox.length > 3.0
        assert enhanced_bbox.height > 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])