import os
import json
from typing import List, Optional, Tuple
from openai import OpenAI
import instructor
from .schemas import ScenarioParameters, ChatMessage, ChatResponse

class AIScenarioService:
    """AI service for conversational scenario parameter extraction"""
    
    def __init__(self):
        self.client = instructor.patch(OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your-api-key-here")
        ))
        
        self.system_prompt = """You are an expert ASAM OpenSCENARIO scenario generation assistant. Your role is to help users create compliant OpenSCENARIO and OpenDRIVE files through natural conversation.

Key responsibilities:
1. Guide users to provide all necessary ASAM OpenX parameters
2. Ensure NCAP compliance by asking relevant questions
3. Extract structured scenario parameters from natural language
4. Suggest improvements for scenario completeness and realism

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
2. Gradually collect specific parameters through follow-up questions
3. Validate completeness before marking scenario as ready
4. Provide helpful suggestions and alternatives

Always be conversational, helpful, and guide users towards creating realistic, compliant scenarios."""

    async def process_conversation(
        self, 
        user_message: str, 
        conversation_history: List[ChatMessage],
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """Process user message and return AI response with potential parameter extraction"""
        
        try:
            # Build conversation context
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add conversation history
            for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                messages.append({"role": msg.role, "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Determine if we should try to extract parameters
            should_extract = self._should_extract_parameters(user_message, conversation_history)
            
            if should_extract:
                # Try to extract structured parameters
                try:
                    response = self.client.chat.completions.create(
                        model="gpt-4o",
                        messages=messages + [{
                            "role": "system", 
                            "content": "Based on the conversation, extract all available scenario parameters. If information is missing, set appropriate defaults or None values. Only mark as complete if you have enough information to generate a basic scenario."
                        }],
                        response_model=ScenarioParameters,
                        max_retries=2
                    )
                    
                    # Generate conversational response
                    chat_response = self.client.chat.completions.create(
                        model="gpt-4o",
                        messages=messages + [{
                            "role": "system",
                            "content": "Provide a helpful conversational response. If the scenario is complete enough for generation, mention that. Otherwise, ask for any missing critical information."
                        }],
                        max_tokens=300
                    )
                    
                    # Determine if scenario is complete enough for generation
                    is_complete = self._is_scenario_complete(response)
                    
                    return ChatResponse(
                        message=chat_response.choices[0].message.content,
                        parameters_extracted=response,
                        is_complete=is_complete,
                        suggestions=self._generate_suggestions(response, is_complete)
                    )
                    
                except Exception as e:
                    print(f"Parameter extraction failed: {e}")
                    # Fall back to regular conversation
                    pass
            
            # Regular conversational response without parameter extraction
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=300
            )
            
            return ChatResponse(
                message=response.choices[0].message.content,
                parameters_extracted=None,
                is_complete=False,
                suggestions=self._generate_general_suggestions(user_message)
            )
            
        except Exception as e:
            return ChatResponse(
                message=f"I apologize, but I encountered an error processing your request. Please try again. Error: {str(e)}",
                parameters_extracted=None,
                is_complete=False,
                suggestions=["Try rephrasing your request", "Start with a simple scenario description"]
            )
    
    def _should_extract_parameters(self, user_message: str, history: List[ChatMessage]) -> bool:
        """Determine if we should attempt parameter extraction"""
        # Extract if conversation has enough content or user seems to be providing details
        if len(history) >= 2:  # After some back-and-forth
            return True
            
        # Look for keywords that suggest scenario details
        detail_keywords = [
            "vehicle", "car", "truck", "lane", "speed", "highway", "road",
            "overtake", "brake", "accelerate", "weather", "rain", "night",
            "scenario", "situation", "maneuver"
        ]
        
        return any(keyword in user_message.lower() for keyword in detail_keywords)
    
    def _is_scenario_complete(self, params: ScenarioParameters) -> bool:
        """Check if extracted parameters are sufficient for scenario generation"""
        # Minimum requirements for generation
        if not params.vehicles or len(params.vehicles) == 0:
            return False
            
        if not params.road_network.road_description:
            return False
            
        # Check if at least one vehicle has reasonable parameters
        ego_vehicle = params.vehicles[0]
        if not ego_vehicle.name or not ego_vehicle.category:
            return False
            
        return True
    
    def _generate_suggestions(self, params: ScenarioParameters, is_complete: bool) -> List[str]:
        """Generate helpful suggestions based on current parameters"""
        suggestions = []
        
        if not is_complete:
            if not params.vehicles:
                suggestions.append("What type of vehicles should be in the scenario?")
            if not params.road_network.road_description:
                suggestions.append("Can you describe the road layout?")
            if not params.events:
                suggestions.append("What specific actions or events should occur?")
        else:
            suggestions = [
                "Generate the scenario files",
                "Add more vehicles or complexity",
                "Modify environmental conditions",
                "Create parameter variations"
            ]
            
        return suggestions
    
    def _generate_general_suggestions(self, user_message: str) -> List[str]:
        """Generate general conversation suggestions"""
        return [
            "Describe the type of driving scenario you want to create",
            "Tell me about the vehicles and road layout",
            "What specific maneuvers or events should happen?"
        ]

# Global service instance
ai_service = AIScenarioService()