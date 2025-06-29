"""
NCAP Scenario Templates
Based on Euro NCAP AEB test protocols for integration with AI scenario generation
"""

from typing import Dict, List, Optional, Any
from .schemas import ScenarioParameters, Vehicle, VehicleCategory, BoundingBox, Performance, Event, Action, SpeedAction, Condition, EnvironmentalConditions, RoadNetwork, LanePosition

class NCAPTemplates:
    """Template generator for NCAP-compliant scenarios"""
    
    # Standard NCAP vehicle configurations
    NCAP_VEHICLES = {
        "ego_vehicle": {
            "name": "Ego",
            "category": VehicleCategory.CAR,
            "bounding_box": BoundingBox(width=1.815, length=4.358, height=1.55),
            "performance": Performance(max_speed=70.0, max_acceleration=5.0, max_deceleration=10.0),
            "bb_center_x": 1.349  # Distance from rear axle to bounding box center
        },
        "target_vehicle": {
            "name": "Target",
            "category": VehicleCategory.CAR,
            "bounding_box": BoundingBox(width=1.82, length=4.418, height=1.533),
            "performance": Performance(max_speed=70.0, max_acceleration=5.0, max_deceleration=10.0)
        },
        "bicycle": {
            "name": "VRU_Bicycle",
            "category": VehicleCategory.BICYCLE,
            "bounding_box": BoundingBox(width=0.5, length=1.89, height=1.2),
            "performance": Performance(max_speed=14.0, max_acceleration=2.0, max_deceleration=10.0)
        },
        "pedestrian": {
            "name": "VRU_Pedestrian", 
            "category": VehicleCategory.PEDESTRIAN,
            "bounding_box": BoundingBox(width=0.5, length=0.6, height=1.75),
            "performance": Performance(max_speed=8.0, max_acceleration=2.0, max_deceleration=5.0)
        }
    }
    
    # NCAP speed ranges and test parameters
    NCAP_PARAMETERS = {
        "ego_speeds_kph": [10, 20, 30, 40, 50, 60, 80],
        "overlap_percentages": [25, 50, 75],
        "ttc_range": [2.5, 6.0],  # Time-to-collision in seconds
        "vru_speeds_kph": [5, 8],  # Vulnerable road user speeds
        "initial_distances": [4, 50, 100]  # Initial positioning distances
    }
    
    @classmethod
    def create_car_to_pedestrian_nearside(
        cls, 
        overlap: int = 25,
        ego_speed_kph: float = 30,
        vru_speed_kph: float = 5,
        ttc: float = 6.0
    ) -> ScenarioParameters:
        """Create CPNA (Car-to-Pedestrian Nearside Adult) scenario template"""
        
        ego_vehicle = cls._create_vehicle_from_template("ego_vehicle")
        ego_vehicle.initial_speed = ego_speed_kph / 3.6  # Convert to m/s
        ego_vehicle.initial_position = LanePosition(road_id="0", lane_id=-1, s=50.0)
        
        pedestrian = cls._create_vehicle_from_template("pedestrian") 
        pedestrian.initial_speed = vru_speed_kph / 3.6
        
        # Calculate initial pedestrian position based on TTC
        vru_initial_s = 50.0 + ttc * (ego_speed_kph / 3.6)
        pedestrian.initial_position = LanePosition(road_id="0", lane_id=0, s=vru_initial_s, offset=-4.0)
        
        # Create crossing event for pedestrian
        crossing_event = Event(
            name="PedestrianCrossing",
            actions=[
                Action(
                    type="speed",
                    speed_action=SpeedAction(target_speed=vru_speed_kph / 3.6, transition_dynamics="linear"),
                    delay=1.0
                )
            ],
            start_conditions=[
                Condition(type="simulation_time", value=1.0, rule="greaterThan")
            ]
        )
        
        return ScenarioParameters(
            scenario_name=f"NCAP_CPNA_{overlap}",
            description=f"Car-to-Pedestrian Nearside Adult scenario with {overlap}% overlap at {ego_speed_kph} kph",
            road_network=RoadNetwork(
                road_description="Straight road with pedestrian crossing area",
                generate_simple_road=True
            ),
            vehicles=[ego_vehicle, pedestrian],
            events=[crossing_event],
            environment=EnvironmentalConditions(),
            ncap_compliance=True,
            parameter_variations={
                "overlap": overlap,
                "ego_speed_kph": ego_speed_kph,
                "vru_speed_kph": vru_speed_kph,
                "ttc": ttc
            }
        )
    
    @classmethod
    def create_car_to_car_rear_stationary(
        cls,
        ego_speed_kph: float = 50,
        initial_distance: float = 40.0
    ) -> ScenarioParameters:
        """Create CCRS (Car-to-Car Rear Stationary) scenario template"""
        
        ego_vehicle = cls._create_vehicle_from_template("ego_vehicle")
        ego_vehicle.initial_speed = ego_speed_kph / 3.6
        ego_vehicle.initial_position = LanePosition(road_id="0", lane_id=-1, s=50.0)
        
        target_vehicle = cls._create_vehicle_from_template("target_vehicle")
        target_vehicle.initial_speed = 0.0  # Stationary
        target_vehicle.initial_position = LanePosition(road_id="0", lane_id=-1, s=50.0 + initial_distance)
        
        return ScenarioParameters(
            scenario_name="NCAP_CCRs",
            description=f"Car-to-Car Rear Stationary scenario at {ego_speed_kph} kph with {initial_distance}m initial distance",
            road_network=RoadNetwork(
                road_description="Straight road for rear-end collision testing",
                generate_simple_road=True
            ),
            vehicles=[ego_vehicle, target_vehicle],
            events=[],
            environment=EnvironmentalConditions(),
            ncap_compliance=True,
            parameter_variations={
                "ego_speed_kph": ego_speed_kph,
                "initial_distance": initial_distance
            }
        )
    
    @classmethod
    def create_car_to_bicyclist_longitudinal(
        cls,
        overlap: int = 50,
        ego_speed_kph: float = 50,
        bicycle_speed_kph: float = 12
    ) -> ScenarioParameters:
        """Create CBLA (Car-to-Bicyclist Longitudinal Adult) scenario template"""
        
        ego_vehicle = cls._create_vehicle_from_template("ego_vehicle")
        ego_vehicle.initial_speed = ego_speed_kph / 3.6
        ego_vehicle.initial_position = LanePosition(road_id="0", lane_id=-1, s=50.0)
        
        bicycle = cls._create_vehicle_from_template("bicycle")
        bicycle.initial_speed = bicycle_speed_kph / 3.6
        bicycle.initial_position = LanePosition(road_id="0", lane_id=-1, s=120.0)  # Same lane, ahead
        
        return ScenarioParameters(
            scenario_name=f"NCAP_CBLA_{overlap}",
            description=f"Car-to-Bicyclist Longitudinal Adult scenario with {overlap}% overlap",
            road_network=RoadNetwork(
                road_description="Straight road with bicycle lane",
                generate_simple_road=True
            ),
            vehicles=[ego_vehicle, bicycle],
            events=[],
            environment=EnvironmentalConditions(),
            ncap_compliance=True,
            parameter_variations={
                "overlap": overlap,
                "ego_speed_kph": ego_speed_kph,
                "bicycle_speed_kph": bicycle_speed_kph
            }
        )
    
    @classmethod
    def get_template_by_name(cls, template_name: str, **kwargs) -> Optional[ScenarioParameters]:
        """Get a scenario template by name with optional parameters"""
        
        templates = {
            "CPNA": cls.create_car_to_pedestrian_nearside,
            "CCRs": cls.create_car_to_car_rear_stationary, 
            "CBLA": cls.create_car_to_bicyclist_longitudinal
        }
        
        if template_name in templates:
            return templates[template_name](**kwargs)
        return None
    
    @classmethod
    def list_available_templates(cls) -> List[Dict[str, str]]:
        """List all available NCAP scenario templates"""
        return [
            {
                "name": "CPNA",
                "description": "Car-to-Pedestrian Nearside Adult",
                "category": "VRU",
                "parameters": "overlap, ego_speed_kph, vru_speed_kph, ttc"
            },
            {
                "name": "CCRs", 
                "description": "Car-to-Car Rear Stationary",
                "category": "Car-to-Car",
                "parameters": "ego_speed_kph, initial_distance"
            },
            {
                "name": "CBLA",
                "description": "Car-to-Bicyclist Longitudinal Adult", 
                "category": "VRU",
                "parameters": "overlap, ego_speed_kph, bicycle_speed_kph"
            }
        ]
    
    @classmethod
    def validate_ncap_parameters(cls, params: Dict[str, Any]) -> List[str]:
        """Validate parameters against NCAP standards"""
        errors = []
        
        if "ego_speed_kph" in params:
            speed = params["ego_speed_kph"]
            if speed < 10 or speed > 80:
                errors.append(f"Ego speed {speed} kph outside NCAP range (10-80 kph)")
        
        if "overlap" in params:
            overlap = params["overlap"]
            if overlap not in cls.NCAP_PARAMETERS["overlap_percentages"]:
                errors.append(f"Overlap {overlap}% not standard NCAP value (25%, 50%, 75%)")
        
        if "ttc" in params:
            ttc = params["ttc"]
            if ttc < 2.5 or ttc > 6.0:
                errors.append(f"TTC {ttc}s outside NCAP range (2.5-6.0s)")
        
        return errors
    
    @classmethod
    def _create_vehicle_from_template(cls, template_name: str) -> Vehicle:
        """Create a Vehicle object from template data"""
        template = cls.NCAP_VEHICLES[template_name]
        
        return Vehicle(
            name=template["name"],
            category=template["category"],
            bounding_box=template["bounding_box"],
            performance=template["performance"]
        )