import os
import json
from typing import List, Optional
from openai import OpenAI
from .schemas import ScenarioParameters, ChatMessage, ChatResponse
from .asam_ontology_service import ASAMOntologyService
from .monitoring import track_openai_api_call, metrics_collector

class WorkingAIService:
    """Working AI service with real OpenAI integration but without Instructor"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your-api-key-here")
        )
        self.ontology_service = ASAMOntologyService()
        
        self.system_prompt = """You are an expert ASAM OpenSCENARIO scenario generation assistant. Your role is to help users create compliant OpenSCENARIO and OpenDRIVE files through natural conversation.

Key responsibilities:
1. Guide users to provide all necessary ASAM OpenX parameters through conversation
2. Ask follow-up questions to gather missing information
3. Ensure NCAP compliance by asking relevant questions
4. Only mark scenarios as complete when you have sufficient information
5. Be conversational and helpful

ASAM OpenX Knowledge:
- OpenSCENARIO defines dynamic scenario content (vehicles, events, actions, conditions)
- OpenDRIVE defines static road network (geometry, lanes, signals, objects)
- Key entities: vehicles, pedestrians, obstacles
- Key actions: speed changes, lane changes, teleportation
- Key conditions: time-based, distance-based, relative position/speed
- Environmental factors: weather, time of day, visibility

NCAP Compliance Guidelines:
- Test speeds typically 50-120 km/h for highway scenarios
- Consider Euro NCAP test protocols for AEB, LKA, BSD scenarios
- Ensure realistic vehicle dimensions and performance characteristics
- Include appropriate reaction times and safety margins

Conversation Flow:
1. Start by understanding the high-level scenario intent
2. Ask specific questions about missing parameters:
   - What types of vehicles are involved?
   - What are their speeds and positions?
   - What specific actions/events should occur?
   - What are the environmental conditions?
   - What type of road/intersection is this?
3. Gradually collect all necessary information through follow-up questions
4. Only when you have enough information for a basic scenario, suggest generation
5. Provide helpful suggestions and alternatives

Important: Do NOT immediately suggest generation after the first message. Always ask follow-up questions to gather more details first."""

    @track_openai_api_call(model="gpt-4", endpoint="chat")
    async def process_conversation(
        self, 
        user_message: str, 
        conversation_history: List[ChatMessage],
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """Process user message and return AI response with potential parameter extraction"""
        
        try:
            # Track chat session
            if session_id:
                metrics_collector.track_chat_session(session_id, "start")
            
            # Build conversation context
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add conversation history
            for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                messages.append({"role": msg.role, "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Get AI response
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                max_tokens=400,
                temperature=0.7
            )
            
            ai_message = response.choices[0].message.content
            
            # Determine if we should extract parameters (only after substantial conversation)
            should_extract = self._should_extract_parameters(user_message, conversation_history)
            extracted_parameters = None
            
            if should_extract:
                # Try to extract parameters using a separate AI call
                try:
                    extracted_parameters = await self._extract_parameters(messages)
                    # Enhance with semantic validation if parameters were extracted
                    if extracted_parameters:
                        extracted_parameters = self._enhance_with_semantic_validation(extracted_parameters)
                except Exception as e:
                    print(f"Parameter extraction failed: {e}")
                    # Continue without parameters
            
            # Determine if scenario is complete enough for generation
            is_complete = self._is_scenario_complete(conversation_history, ai_message)
            
            # Generate suggestions
            suggestions = self._generate_suggestions(user_message, conversation_history, is_complete)
            
            return ChatResponse(
                message=ai_message,
                parameters_extracted=extracted_parameters,
                is_complete=is_complete,
                suggestions=suggestions
            )
            
        except Exception as e:
            return ChatResponse(
                message=f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}",
                parameters_extracted=None,
                is_complete=False,
                suggestions=["Try rephrasing your request", "Start with a simple scenario description"]
            )
    
    async def _extract_parameters(self, conversation_messages: List[dict]) -> Optional[ScenarioParameters]:
        """Extract structured parameters from conversation using AI"""
        
        extraction_prompt = """Based on the conversation above, extract scenario parameters in JSON format. Only include parameters that were explicitly mentioned or can be reasonably inferred.

Return a JSON object with this structure:
{
  "scenario_name": "string",
  "description": "string", 
  "road_network": {
    "road_description": "string",
    "generate_simple_road": true
  },
  "vehicles": [
    {
      "name": "string",
      "category": "car|truck|bus|motorcycle|bicycle|pedestrian",
      "bounding_box": {"width": 2.0, "length": 4.5, "height": 1.8},
      "performance": {
        "max_speed": 50.0,
        "max_acceleration": 5.0, 
        "max_deceleration": 8.0
      },
      "initial_speed": 25.0
    }
  ],
  "events": [],
  "environment": {
    "weather": "dry|wet|foggy|snowy",
    "time_of_day": "day|night|dawn|dusk",
    "precipitation": 0.0,
    "visibility": 1000.0,
    "wind_speed": 0.0
  },
  "openscenario_version": "1.2",
  "ncap_compliance": true,
  "parameter_variations": {}
}

If information is missing, use reasonable defaults or omit optional fields. Only return the JSON, no other text."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=conversation_messages + [{"role": "system", "content": extraction_prompt}],
                max_tokens=800,
                temperature=0.1
            )
            
            # Parse JSON response
            json_text = response.choices[0].message.content.strip()
            if json_text.startswith("```json"):
                json_text = json_text[7:-3]
            elif json_text.startswith("```"):
                json_text = json_text[3:-3]
            
            params_dict = json.loads(json_text)
            return ScenarioParameters(**params_dict)
            
        except Exception as e:
            print(f"Parameter extraction error: {e}")
            return None
    
    def _should_extract_parameters(self, user_message: str, history: List[ChatMessage]) -> bool:
        """Determine if we should attempt parameter extraction"""
        # Extract if we have substantial conversation
        if len(history) >= 6:  # After 3+ exchanges
            return True
            
        # Look for generation-related keywords
        generation_keywords = [
            "generate", "create files", "ready", "done", "complete", 
            "that's all", "sounds good", "yes, generate", "start generate",
            "let's generate", "proceed", "go ahead"
        ]
        
        return any(keyword in user_message.lower() for keyword in generation_keywords)
    
    def _is_scenario_complete(self, history: List[ChatMessage], ai_response: str) -> bool:
        """Check if scenario has enough information for generation"""
        
        # Need substantial conversation
        if len(history) < 4:  # At least 2 full exchanges
            return False
        
        # Look for completion indicators in AI response or user messages
        completion_indicators = [
            "ready to generate", "enough information", "can create", 
            "generate the scenario", "create the files", "start creating",
            "summary of the scenario", "with this information"
        ]
        
        user_wants_generation = any(word in history[-1].content.lower() if history else False for word in [
            "generate", "create", "start", "proceed", "go ahead", "ready"
        ])
        
        # Check if AI is suggesting generation or user wants generation
        ai_suggests_generation = any(indicator in ai_response.lower() for indicator in completion_indicators)
        
        # Look for comprehensive scenario description in conversation
        conversation_text = " ".join([msg.content for msg in history])
        has_vehicles = any(word in conversation_text.lower() for word in ["car", "vehicle", "truck", "bus"])
        has_actions = any(word in conversation_text.lower() for word in ["overtake", "brake", "accelerate", "change", "turn", "speed"])
        has_road = any(word in conversation_text.lower() for word in ["highway", "road", "street", "lane", "intersection"])
        has_details = any(word in conversation_text.lower() for word in ["km/h", "mph", "meter", "second", "lane", "width", "length"])
        
        # More lenient completion criteria
        return (ai_suggests_generation or user_wants_generation) and has_vehicles and has_road and (has_actions or has_details)
    
    def _generate_suggestions(self, user_message: str, history: List[ChatMessage], is_complete: bool) -> List[str]:
        """Generate helpful suggestions based on conversation state"""
        
        if is_complete:
            return [
                "Generate the scenario files",
                "Add more complexity to the scenario", 
                "Modify environmental conditions",
                "Create parameter variations"
            ]
        
        # Analyze what information might be missing
        conversation_text = " ".join([msg.content for msg in history] + [user_message])
        
        suggestions = []
        
        if len(history) == 0:
            suggestions = [
                "Describe the type of driving scenario you want to create",
                "Tell me about the vehicles involved",
                "What kind of road or environment?"
            ]
        else:
            if not any(word in conversation_text.lower() for word in ["car", "vehicle", "truck"]):
                suggestions.append("What types of vehicles should be involved?")
            
            if not any(word in conversation_text.lower() for word in ["speed", "km/h", "mph"]):
                suggestions.append("What speeds should the vehicles travel?")
            
            if not any(word in conversation_text.lower() for word in ["weather", "rain", "dry", "fog"]):
                suggestions.append("What weather conditions?")
            
            if not any(word in conversation_text.lower() for word in ["overtake", "brake", "change", "action"]):
                suggestions.append("What specific actions or events should occur?")
        
        return suggestions[:3]  # Limit to 3 suggestions
    
    def _enhance_with_semantic_validation(self, parameters: ScenarioParameters) -> ScenarioParameters:
        """
        Enhance extracted parameters with ASAM OpenX semantic validation
        and provide intelligent default values for missing parameters
        """
        try:
            # Perform semantic validation
            validation_result = self.ontology_service.validate_scenario_semantics(parameters)
            
            # Apply intelligent defaults and corrections based on validation
            enhanced_parameters = self._apply_semantic_enhancements(parameters, validation_result)
            
            # Log validation results for debugging
            if validation_result.errors:
                print(f"Semantic validation errors: {validation_result.errors}")
            if validation_result.warnings:
                print(f"Semantic validation warnings: {validation_result.warnings}")
            
            return enhanced_parameters
            
        except Exception as e:
            print(f"Semantic validation failed: {e}")
            return parameters  # Return original if validation fails
    
    def _apply_semantic_enhancements(self, parameters: ScenarioParameters, validation_result) -> ScenarioParameters:
        """
        Apply intelligent defaults and corrections based on semantic validation
        """
        # Create a copy to avoid modifying the original
        enhanced_params = parameters
        
        # Apply vehicle enhancements
        if parameters.vehicles:
            enhanced_vehicles = []
            for vehicle in parameters.vehicles:
                enhanced_vehicle = self._enhance_vehicle_parameters(vehicle, validation_result)
                enhanced_vehicles.append(enhanced_vehicle)
            
            # Create new parameters with enhanced vehicles
            enhanced_params = ScenarioParameters(
                scenario_name=parameters.scenario_name,
                description=parameters.description,
                road_network=parameters.road_network,
                vehicles=enhanced_vehicles,
                events=parameters.events,
                environment=parameters.environment,
                openscenario_version=parameters.openscenario_version,
                ncap_compliance=parameters.ncap_compliance,
                parameter_variations=parameters.parameter_variations
            )
        
        return enhanced_params
    
    def _enhance_vehicle_parameters(self, vehicle, validation_result):
        """
        Enhance individual vehicle parameters with intelligent defaults
        """
        category = vehicle.category.value.lower()
        
        # Get vehicle standards for this category
        vehicle_standards = self.ontology_service.get_vehicle_standards()
        
        if category not in vehicle_standards:
            return vehicle  # Return unchanged if unknown category
        
        standards = vehicle_standards[category]
        
        # Apply intelligent defaults for missing or unrealistic values
        enhanced_bbox = self._enhance_bounding_box(vehicle.bounding_box, standards)
        enhanced_performance = self._enhance_performance(vehicle.performance, standards)
        enhanced_speed = self._enhance_initial_speed(vehicle.initial_speed, enhanced_performance, standards)
        
        from .schemas import Vehicle
        return Vehicle(
            name=vehicle.name,
            category=vehicle.category,
            bounding_box=enhanced_bbox,
            performance=enhanced_performance,
            initial_speed=enhanced_speed,
            initial_position=vehicle.initial_position
        )
    
    def _enhance_bounding_box(self, bbox, standards):
        """Apply realistic bounding box defaults"""
        dims = standards["typical_dimensions"]
        
        # Apply defaults if dimensions are missing or unrealistic
        width = bbox.width
        length = bbox.length
        height = bbox.height
        
        # Correct unrealistic dimensions
        if width < dims["width"][0] * 0.5 or width > dims["width"][1] * 2:
            width = (dims["width"][0] + dims["width"][1]) / 2
        
        if length < dims["length"][0] * 0.5 or length > dims["length"][1] * 2:
            length = (dims["length"][0] + dims["length"][1]) / 2
            
        if height < dims["height"][0] * 0.5 or height > dims["height"][1] * 2:
            height = (dims["height"][0] + dims["height"][1]) / 2
        
        from .schemas import BoundingBox
        return BoundingBox(width=width, length=length, height=height)
    
    def _enhance_performance(self, performance, standards):
        """Apply realistic performance defaults"""
        perf_ranges = standards["performance_ranges"]
        
        # Correct unrealistic performance values
        max_speed = performance.max_speed
        max_acceleration = performance.max_acceleration
        max_deceleration = performance.max_deceleration
        
        if max_speed < perf_ranges["max_speed"][0] or max_speed > perf_ranges["max_speed"][1] * 1.5:
            max_speed = (perf_ranges["max_speed"][0] + perf_ranges["max_speed"][1]) / 2
            
        if max_acceleration < perf_ranges["max_acceleration"][0] or max_acceleration > perf_ranges["max_acceleration"][1] * 1.5:
            max_acceleration = (perf_ranges["max_acceleration"][0] + perf_ranges["max_acceleration"][1]) / 2
            
        if max_deceleration < perf_ranges["max_deceleration"][0] or max_deceleration > perf_ranges["max_deceleration"][1] * 1.5:
            max_deceleration = (perf_ranges["max_deceleration"][0] + perf_ranges["max_deceleration"][1]) / 2
        
        from .schemas import Performance
        return Performance(
            max_speed=max_speed,
            max_acceleration=max_acceleration,
            max_deceleration=max_deceleration
        )
    
    def _enhance_initial_speed(self, initial_speed, performance, standards):
        """Apply realistic initial speed defaults"""
        # Ensure initial speed doesn't exceed max speed
        if initial_speed > performance.max_speed:
            initial_speed = performance.max_speed * 0.8  # 80% of max speed
        
        # Apply minimum reasonable speed
        if initial_speed < 0.5:  # Less than 0.5 m/s (1.8 km/h)
            initial_speed = 5.0  # Default to 5 m/s (18 km/h)
        
        return initial_speed

# Global service instance
ai_service = WorkingAIService()