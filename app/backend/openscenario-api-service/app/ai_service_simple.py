import os
import json
from typing import List, Optional
from openai import OpenAI
from .schemas import ScenarioParameters, ChatMessage, ChatResponse

class SimpleAIService:
    """Simplified AI service without Instructor dependency"""
    
    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "your-api-key-here")
        )
        
        self.system_prompt = """You are an expert ASAM OpenSCENARIO scenario generation assistant. Your role is to help users create compliant OpenSCENARIO and OpenDRIVE files through natural conversation.

Key responsibilities:
1. Guide users to provide all necessary ASAM OpenX parameters
2. Ensure NCAP compliance by asking relevant questions
3. Suggest improvements for scenario completeness and realism

ASAM OpenX Knowledge:
- OpenSCENARIO defines dynamic scenario content (vehicles, events, actions, conditions)
- OpenDRIVE defines static road network (geometry, lanes, signals, objects)
- Key entities: vehicles, pedestrians, obstacles
- Key actions: speed changes, lane changes, teleportation
- Key conditions: time-based, distance-based, relative position/speed
- Environmental factors: weather, time of day, visibility

Always be conversational, helpful, and guide users towards creating realistic, compliant scenarios."""

    async def process_conversation(
        self, 
        user_message: str, 
        conversation_history: List[ChatMessage],
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """Process user message and return AI response"""
        
        try:
            # Build conversation context
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add conversation history
            for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                messages.append({"role": msg.role, "content": msg.content})
            
            # Add current user message
            messages.append({"role": "user", "content": user_message})
            
            # Get AI response
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=300
            )
            
            ai_message = response.choices[0].message.content
            
            # Simple check for completion keywords
            is_complete = any(keyword in user_message.lower() for keyword in [
                "generate", "create", "ready", "done", "complete"
            ]) and len(conversation_history) > 2
            
            # Generate simple suggestions
            suggestions = self._generate_suggestions(user_message, is_complete)
            
            return ChatResponse(
                message=ai_message,
                parameters_extracted=None,  # Simplified - no parameter extraction
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
    
    def _generate_suggestions(self, user_message: str, is_complete: bool) -> List[str]:
        """Generate helpful suggestions based on user message"""
        if is_complete:
            return [
                "Generate the scenario files",
                "Add more vehicles or complexity",
                "Modify environmental conditions"
            ]
        else:
            return [
                "Describe the type of driving scenario you want to create",
                "Tell me about the vehicles and road layout",
                "What specific maneuvers or events should happen?"
            ]

# Global service instance
ai_service = SimpleAIService()