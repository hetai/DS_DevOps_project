from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum

class WeatherCondition(str, Enum):
    DRY = "dry"
    WET = "wet"
    FOGGY = "foggy"
    SNOWY = "snowy"

class TimeOfDay(str, Enum):
    DAY = "day"
    NIGHT = "night"
    DAWN = "dawn"
    DUSK = "dusk"

class VehicleCategory(str, Enum):
    CAR = "car"
    VAN = "van"
    TRUCK = "truck"
    SEMITRAILER = "semitrailer"
    BUS = "bus"
    MOTORBIKE = "motorbike"
    BICYCLE = "bicycle"
    PEDESTRIAN = "pedestrian"

class Position(BaseModel):
    x: float = Field(..., description="X coordinate in meters")
    y: float = Field(..., description="Y coordinate in meters")
    z: float = Field(default=0.0, description="Z coordinate in meters")
    heading: float = Field(default=0.0, description="Heading angle in radians")

class LanePosition(BaseModel):
    road_id: str = Field(..., description="Road ID from OpenDRIVE")
    lane_id: int = Field(..., description="Lane ID (negative for right lanes, positive for left)")
    s: float = Field(..., description="Position along road centerline in meters")
    offset: float = Field(default=0.0, description="Lateral offset from lane center in meters")

class BoundingBox(BaseModel):
    width: float = Field(..., description="Vehicle width in meters")
    length: float = Field(..., description="Vehicle length in meters") 
    height: float = Field(..., description="Vehicle height in meters")

class Performance(BaseModel):
    max_speed: float = Field(..., description="Maximum speed in m/s")
    max_acceleration: float = Field(..., description="Maximum acceleration in m/s²")
    max_deceleration: float = Field(..., description="Maximum deceleration in m/s²")

class Vehicle(BaseModel):
    name: str = Field(..., description="Unique vehicle identifier")
    category: VehicleCategory = Field(..., description="Vehicle category")
    bounding_box: BoundingBox = Field(..., description="Vehicle dimensions")
    performance: Performance = Field(..., description="Vehicle performance characteristics")
    initial_speed: float = Field(default=0.0, description="Initial speed in m/s")
    initial_position: Optional[LanePosition] = Field(None, description="Initial lane position")

class SpeedAction(BaseModel):
    target_speed: float = Field(..., description="Target speed in m/s")
    transition_dynamics: str = Field(default="linear", description="Speed transition type")
    duration: Optional[float] = Field(None, description="Transition duration in seconds")

class LaneChangeAction(BaseModel):
    target_lane_offset: int = Field(..., description="Number of lanes to change (+ for left, - for right)")
    transition_dynamics: str = Field(default="sinusoidal", description="Lane change dynamics")
    duration: Optional[float] = Field(None, description="Lane change duration in seconds")

class Action(BaseModel):
    type: Literal["speed", "lane_change", "teleport"] = Field(..., description="Action type")
    speed_action: Optional[SpeedAction] = Field(None, description="Speed action parameters")
    lane_change_action: Optional[LaneChangeAction] = Field(None, description="Lane change parameters")
    delay: float = Field(default=0.0, description="Action start delay in seconds")

class Condition(BaseModel):
    type: Literal["simulation_time", "traveled_distance", "relative_speed"] = Field(..., description="Condition type")
    value: float = Field(..., description="Condition threshold value")
    rule: Literal["greaterThan", "lessThan", "equalTo"] = Field(..., description="Comparison rule")

class Event(BaseModel):
    name: str = Field(..., description="Event name")
    actions: List[Action] = Field(..., description="Actions to execute")
    start_conditions: List[Condition] = Field(..., description="Conditions to start event")
    priority: Literal["overwrite", "skip", "parallel"] = Field(default="overwrite", description="Event priority")

class EnvironmentalConditions(BaseModel):
    weather: WeatherCondition = Field(default=WeatherCondition.DRY, description="Weather conditions")
    time_of_day: TimeOfDay = Field(default=TimeOfDay.DAY, description="Time of day")
    precipitation: float = Field(default=0.0, description="Precipitation intensity (0.0-1.0)")
    visibility: float = Field(default=1000.0, description="Visibility range in meters")
    wind_speed: float = Field(default=0.0, description="Wind speed in m/s")

class RoadNetwork(BaseModel):
    opendrive_file: Optional[str] = Field(None, description="OpenDRIVE file path")
    road_description: str = Field(..., description="Natural language description of road network")
    generate_simple_road: bool = Field(default=True, description="Generate simple road if no OpenDRIVE file")

class ScenarioParameters(BaseModel):
    """Complete ASAM OpenX scenario parameters extracted from natural language"""
    
    # Scenario metadata
    scenario_name: str = Field(..., description="Scenario name/title")
    description: str = Field(..., description="Detailed scenario description")
    
    # Road network
    road_network: RoadNetwork = Field(..., description="Road network configuration")
    
    # Entities (vehicles, pedestrians, etc.)
    vehicles: List[Vehicle] = Field(..., description="All vehicles in the scenario")
    
    # Story and events
    events: List[Event] = Field(..., description="Sequence of events in the scenario")
    
    # Environmental conditions
    environment: EnvironmentalConditions = Field(default_factory=EnvironmentalConditions, description="Environmental conditions")
    
    # OpenSCENARIO version
    openscenario_version: str = Field(default="1.2", description="OpenSCENARIO version to generate")
    
    # Additional metadata
    ncap_compliance: bool = Field(default=True, description="Ensure NCAP compliance")
    parameter_variations: Dict[str, Any] = Field(default_factory=dict, description="Parameter ranges for variations")

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"] = Field(..., description="Message sender role")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    conversation_history: List[ChatMessage] = Field(default_factory=list, description="Previous conversation")
    session_id: Optional[str] = Field(None, description="Conversation session ID")

class ChatResponse(BaseModel):
    message: str = Field(..., description="Assistant response")
    parameters_extracted: Optional[ScenarioParameters] = Field(None, description="Extracted scenario parameters")
    is_complete: bool = Field(default=False, description="Whether scenario is complete and ready for generation")
    suggestions: List[str] = Field(default_factory=list, description="Suggested follow-up questions or clarifications")

class GenerationRequest(BaseModel):
    parameters: ScenarioParameters = Field(..., description="Complete scenario parameters")
    generate_variations: bool = Field(default=False, description="Generate parameter variations")
    output_format: Literal["1.0", "1.1", "1.2", "1.3"] = Field(default="1.2", description="OpenSCENARIO version")

class ValidationResult(BaseModel):
    valid: bool = Field(..., description="Whether the file is valid")
    messages: List[Dict[str, Any]] = Field(default_factory=list, description="Validation messages")
    file_name: Optional[str] = Field(None, description="Name of validated file")

class GenerationResponse(BaseModel):
    success: bool = Field(..., description="Generation success status")
    scenario_files: Dict[str, str] = Field(default_factory=dict, description="Generated files (filename -> content)")
    validation_results: Optional[ValidationResult] = Field(None, description="Validation results")
    variations: List[Dict[str, str]] = Field(default_factory=list, description="Generated variations")
    error_message: Optional[str] = Field(None, description="Error message if generation failed")