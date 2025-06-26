import os
import tempfile
from typing import Dict, List, Optional, Tuple
from pathlib import Path

try:
    import scenariogeneration as pyoscx
    from scenariogeneration import xosc, xodr
except ImportError:
    print("Warning: scenariogeneration library not installed. Install with: pip install scenariogeneration")
    pyoscx = None
    xosc = None
    xodr = None

from .schemas import ScenarioParameters, Vehicle, Action, Event, RoadNetwork

class ScenarioGenerationService:
    """Service for generating ASAM OpenSCENARIO and OpenDRIVE files using pyoscx"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="openscenario_")
        
    def generate_scenario_files(self, params: ScenarioParameters) -> Dict[str, str]:
        """Generate OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files"""
        if not pyoscx:
            raise ImportError("scenariogeneration library not available")
            
        try:
            files = {}
            
            # Generate OpenDRIVE file first (needed for OpenSCENARIO)
            xodr_content = self._generate_opendrive(params.road_network)
            xodr_filename = f"{params.scenario_name.replace(' ', '_')}.xodr"
            files[xodr_filename] = xodr_content
            
            # Generate OpenSCENARIO file
            xosc_content = self._generate_openscenario(params, xodr_filename)
            xosc_filename = f"{params.scenario_name.replace(' ', '_')}.xosc"
            files[xosc_filename] = xosc_content
            
            return files
            
        except Exception as e:
            raise Exception(f"Scenario generation failed: {str(e)}")
    
    def _generate_opendrive(self, road_network: RoadNetwork) -> str:
        """Generate OpenDRIVE file content"""
        if road_network.opendrive_file and os.path.exists(road_network.opendrive_file):
            # Use existing OpenDRIVE file
            with open(road_network.opendrive_file, 'r') as f:
                return f.read()
        
        # Generate simple road based on description
        if road_network.generate_simple_road:
            return self._create_simple_road(road_network.road_description)
        else:
            raise ValueError("No OpenDRIVE file provided and simple road generation disabled")
    
    def _create_simple_road(self, description: str) -> str:
        """Create a simple OpenDRIVE road based on description"""
        # Analyze description to determine road type
        description_lower = description.lower()
        
        # Determine road configuration
        if any(keyword in description_lower for keyword in ["highway", "freeway", "motorway"]):
            return self._create_highway_road()
        elif any(keyword in description_lower for keyword in ["intersection", "junction", "crossroad"]):
            return self._create_intersection_road()
        else:
            return self._create_basic_road()
    
    def _create_highway_road(self) -> str:
        """Create a simple 3-lane highway"""
        # Create a straight 3-lane highway (2 lanes each direction + center)
        road = xodr.create_road(
            xodr.Line(1000),  # 1km straight road
            id=0,
            left_lanes=2,
            right_lanes=2,
            lane_width=3.5
        )
        
        # Create OpenDRIVE with the road
        odr = xodr.OpenDrive("Simple Highway")
        odr.add_road(road)
        odr.adjust_roads_and_lanes()
        
        return odr.get_xml()
    
    def _create_intersection_road(self) -> str:
        """Create a simple 4-way intersection"""
        # This is a simplified intersection - in practice, you'd want more complex geometry
        roads = []
        
        # Create 4 approach roads
        for i in range(4):
            road = xodr.create_road(
                xodr.Line(100),  # 100m approach
                id=i,
                left_lanes=1,
                right_lanes=1,
                lane_width=3.5
            )
            roads.append(road)
        
        odr = xodr.OpenDrive("Simple Intersection")
        for road in roads:
            odr.add_road(road)
        odr.adjust_roads_and_lanes()
        
        return odr.get_xml()
    
    def _create_basic_road(self) -> str:
        """Create a basic 2-lane road"""
        road = xodr.create_road(
            xodr.Line(500),  # 500m straight road
            id=0,
            left_lanes=1,
            right_lanes=1,
            lane_width=3.5
        )
        
        odr = xodr.OpenDrive("Basic Road")
        odr.add_road(road)
        odr.adjust_roads_and_lanes()
        
        return odr.get_xml()
    
    def _generate_openscenario(self, params: ScenarioParameters, xodr_filename: str) -> str:
        """Generate OpenSCENARIO file content"""
        # Create the main scenario
        scenario = xosc.Scenario(
            name=params.scenario_name,
            author="AI Scenario Generator",
            description=params.description
        )
        
        # Add parameter declarations (if any)
        # This would be extended based on parameter_variations
        
        # Set up road network reference
        scenario.add_road_network(xosc.RoadNetwork(roadfile=xodr_filename))
        
        # Add entities (vehicles)
        entities = xosc.Entities()
        
        for vehicle in params.vehicles:
            # Create vehicle properties
            bb = xosc.BoundingBox(
                vehicle.bounding_box.width,
                vehicle.bounding_box.length,
                vehicle.bounding_box.height,
                0, 0, 0  # center offset
            )
            
            fa = xosc.Axle(0.5, 0.8, 1.68, 2.98, 0.4)  # Front axle
            ra = xosc.Axle(0.0, 0.8, 1.68, 0, 0.4)     # Rear axle
            
            vehicle_obj = xosc.Vehicle(
                name=vehicle.name,
                vehicle_type=xosc.VehicleCategory[vehicle.category.value.upper()],
                bounding_box=bb,
                front_axle=fa,
                rear_axle=ra,
                max_speed=vehicle.performance.max_speed,
                max_acceleration=vehicle.performance.max_acceleration,
                max_deceleration=vehicle.performance.max_deceleration
            )
            
            entities.add_scenario_object(xosc.ScenarioObject(vehicle.name, vehicle_obj))
        
        scenario.add_entities(entities)
        
        # Create storyboard with initialization and events
        storyboard = xosc.StoryBoard(
            self._create_init_actions(params),
            self._create_story(params)
        )
        
        scenario.add_storyboard(storyboard)
        
        return scenario.get_xml()
    
    def _create_init_actions(self, params: ScenarioParameters) -> xosc.Init:
        """Create initialization actions for all vehicles"""
        init = xosc.Init()
        
        for i, vehicle in enumerate(params.vehicles):
            actions = xosc.InitActions()
            
            # Set initial position
            if vehicle.initial_position:
                pos = xosc.LanePosition(
                    s=vehicle.initial_position.s,
                    offset=vehicle.initial_position.offset,
                    lane_id=vehicle.initial_position.lane_id,
                    road_id=int(vehicle.initial_position.road_id)
                )
            else:
                # Default positioning - spread vehicles along the road
                pos = xosc.LanePosition(
                    s=10 + i * 50,  # Space vehicles 50m apart
                    offset=0,
                    lane_id=-1,  # Right lane
                    road_id=0
                )
            
            actions.add_init_action(
                vehicle.name,
                xosc.TeleportAction(pos)
            )
            
            # Set initial speed
            if vehicle.initial_speed > 0:
                actions.add_init_action(
                    vehicle.name,
                    xosc.AbsoluteSpeedAction(vehicle.initial_speed)
                )
            
            init.add_init_actions(actions)
        
        return init
    
    def _create_story(self, params: ScenarioParameters) -> xosc.Story:
        """Create the main story with events and actions"""
        story = xosc.Story("MainStory")
        
        if not params.events:
            # Create a simple default story if no events specified
            act = self._create_default_act(params)
            story.add_act(act)
        else:
            # Convert parameter events to pyoscx events
            act = xosc.Act("MainAct")
            
            for event_params in params.events:
                event = self._create_event_from_params(event_params)
                
                # Create maneuver group for this event
                mg = xosc.ManeuverGroup("MG_" + event_params.name)
                mg.add_actor(xosc.EntityRef(params.vehicles[0].name))  # Assume first vehicle is ego
                
                maneuver = xosc.Maneuver("Maneuver_" + event_params.name)
                maneuver.add_event(event)
                mg.add_maneuver(maneuver)
                
                act.add_maneuver_group(mg)
            
            # Add start trigger for the act
            start_trigger = xosc.Trigger()
            start_trigger.add_condition(
                xosc.SimulationTimeCondition(0, xosc.Rule.greaterThan)
            )
            act.add_trigger(start_trigger)
            
            story.add_act(act)
        
        return story
    
    def _create_default_act(self, params: ScenarioParameters) -> xosc.Act:
        """Create a default act with basic vehicle movement"""
        act = xosc.Act("DefaultAct")
        
        if params.vehicles:
            # Create a simple speed action for the first vehicle
            mg = xosc.ManeuverGroup("DefaultManeuverGroup")
            mg.add_actor(xosc.EntityRef(params.vehicles[0].name))
            
            maneuver = xosc.Maneuver("DefaultManeuver")
            
            # Simple speed increase event
            event = xosc.Event("SpeedUpEvent", xosc.Priority.overwrite)
            
            speed_action = xosc.AbsoluteSpeedAction(
                value=20,  # 20 m/s target speed
                transition_dynamics=xosc.TransitionDynamics(
                    xosc.DynamicsShapes.linear,
                    xosc.DynamicsDimension.time,
                    5  # 5 second transition
                )
            )
            
            event.add_action("speed_action", speed_action)
            
            # Start immediately
            start_trigger = xosc.Trigger()
            start_trigger.add_condition(
                xosc.SimulationTimeCondition(1, xosc.Rule.greaterThan)
            )
            event.add_trigger(start_trigger)
            
            maneuver.add_event(event)
            mg.add_maneuver(maneuver)
            act.add_maneuver_group(mg)
        
        # Act start trigger
        start_trigger = xosc.Trigger()
        start_trigger.add_condition(
            xosc.SimulationTimeCondition(0, xosc.Rule.greaterThan)
        )
        act.add_trigger(start_trigger)
        
        return act
    
    def _create_event_from_params(self, event_params: Event) -> xosc.Event:
        """Convert event parameters to pyoscx Event"""
        event = xosc.Event(event_params.name, xosc.Priority[event_params.priority])
        
        for action_params in event_params.actions:
            action = self._create_action_from_params(action_params)
            if action:
                event.add_action(action_params.type, action)
        
        # Add start conditions
        if event_params.start_conditions:
            start_trigger = xosc.Trigger()
            for condition_params in event_params.start_conditions:
                condition = self._create_condition_from_params(condition_params)
                if condition:
                    start_trigger.add_condition(condition)
            event.add_trigger(start_trigger)
        
        return event
    
    def _create_action_from_params(self, action_params: Action):
        """Convert action parameters to pyoscx action"""
        if action_params.type == "speed" and action_params.speed_action:
            speed_action = xosc.AbsoluteSpeedAction(
                value=action_params.speed_action.target_speed,
                transition_dynamics=xosc.TransitionDynamics(
                    xosc.DynamicsShapes.linear,
                    xosc.DynamicsDimension.time,
                    action_params.speed_action.duration or 3.0
                )
            )
            return speed_action
        
        elif action_params.type == "lane_change" and action_params.lane_change_action:
            lane_change_action = xosc.RelativeLaneChangeAction(
                value=action_params.lane_change_action.target_lane_offset,
                target=xosc.EntityRef("ego"),  # Relative to ego vehicle
                transition_dynamics=xosc.TransitionDynamics(
                    xosc.DynamicsShapes.sinusoidal,
                    xosc.DynamicsDimension.time,
                    action_params.lane_change_action.duration or 4.0
                )
            )
            return lane_change_action
        
        return None
    
    def _create_condition_from_params(self, condition_params):
        """Convert condition parameters to pyoscx condition"""
        rule = xosc.Rule[condition_params.rule]
        
        if condition_params.type == "simulation_time":
            return xosc.SimulationTimeCondition(condition_params.value, rule)
        elif condition_params.type == "traveled_distance":
            return xosc.TraveledDistanceCondition(condition_params.value, rule)
        
        return None

# Global service instance
scenario_generator = ScenarioGenerationService()