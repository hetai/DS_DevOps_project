"""
Advanced Parameter Validation During Conversation Tests
Tests for real-time parameter validation and intelligent feedback during AI conversations

Following TDD methodology as per VERIFICATION.md - RED phase first
"""

import pytest
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.conversation_validator import ConversationValidator
from app.schemas import ChatMessage, ScenarioParameters


class TestAdvancedParameterValidation:
    """Test suite for advanced parameter validation during conversation"""
    
    def setup_method(self):
        """Setup test instance"""
        self.validator = ConversationValidator()
    
    def test_conversation_validator_initialization(self):
        """Test that conversation validator initializes correctly"""
        assert self.validator is not None
        assert hasattr(self.validator, 'validate_conversation_parameters')
        assert hasattr(self.validator, 'suggest_parameter_improvements')
        assert hasattr(self.validator, 'detect_parameter_conflicts')
    
    def test_real_time_speed_validation(self):
        """Test real-time validation of speed parameters during conversation"""
        conversation = [
            ChatMessage(role="user", content="I want a highway scenario"),
            ChatMessage(role="assistant", content="What kind of vehicles?"),
            ChatMessage(role="user", content="A car going 500 km/h"),  # Unrealistic speed
        ]
        
        validation_result = self.validator.validate_conversation_parameters(conversation)
        
        assert validation_result.has_issues == True
        assert any("speed" in issue.lower() for issue in validation_result.warnings)
        assert any("500 km/h" in issue or "unrealistic" in issue.lower() for issue in validation_result.warnings)
        
        # Should provide suggestions
        suggestions = validation_result.suggestions
        assert len(suggestions) > 0
        assert any("speed" in suggestion.lower() for suggestion in suggestions)
    
    def test_vehicle_road_compatibility_validation(self):
        """Test validation of vehicle-road compatibility during conversation"""
        conversation = [
            ChatMessage(role="user", content="I need a scenario on a highway"),
            ChatMessage(role="assistant", content="What vehicles should be involved?"),
            ChatMessage(role="user", content="A bicycle and a pedestrian"),  # Not allowed on highway
        ]
        
        validation_result = self.validator.validate_conversation_parameters(conversation)
        
        assert validation_result.has_issues == True
        assert any("highway" in issue.lower() and ("bicycle" in issue.lower() or "pedestrian" in issue.lower()) 
                  for issue in validation_result.errors)
        
        # Should suggest alternative roads or vehicles
        suggestions = validation_result.suggestions
        assert len(suggestions) > 0
    
    def test_ncap_compliance_validation(self):
        """Test NCAP compliance validation during conversation"""
        conversation = [
            ChatMessage(role="user", content="Create an AEB test scenario"),
            ChatMessage(role="assistant", content="What speed for the ego vehicle?"),
            ChatMessage(role="user", content="200 km/h"),  # Too fast for AEB test
        ]
        
        validation_result = self.validator.validate_conversation_parameters(conversation)
        
        assert validation_result.has_issues == True
        assert any("aeb" in issue.lower() and "speed" in issue.lower() for issue in validation_result.warnings)
        
        # Should suggest NCAP-compliant speeds
        suggestions = validation_result.suggestions
        assert any("10-80 km/h" in suggestion or "aeb" in suggestion.lower() for suggestion in suggestions)
    
    def test_vehicle_dimension_consistency_validation(self):
        """Test validation of vehicle dimension consistency"""
        conversation = [
            ChatMessage(role="user", content="I want a car scenario"),
            ChatMessage(role="assistant", content="What are the car dimensions?"),
            ChatMessage(role="user", content="10 meters wide and 20 meters long"),  # Unrealistic
        ]
        
        validation_result = self.validator.validate_conversation_parameters(conversation)
        
        assert validation_result.has_issues == True
        assert any("dimension" in issue.lower() or "size" in issue.lower() for issue in validation_result.warnings)
        
        # Should suggest realistic dimensions
        suggestions = validation_result.suggestions
        assert any("meter" in suggestion and "car" in suggestion.lower() for suggestion in suggestions)
    
    def test_environmental_consistency_validation(self):
        """Test validation of environmental condition consistency"""
        conversation = [
            ChatMessage(role="user", content="Create a winter scenario"),
            ChatMessage(role="assistant", content="What weather conditions?"),
            ChatMessage(role="user", content="Snowy weather but dry roads"),  # Inconsistent
        ]
        
        validation_result = self.validator.validate_conversation_parameters(conversation)
        
        assert validation_result.has_issues == True
        assert any("snow" in issue.lower() and "dry" in issue.lower() for issue in validation_result.warnings)
        
        # Should suggest consistent conditions
        suggestions = validation_result.suggestions
        assert any("wet" in suggestion.lower() or "slippery" in suggestion.lower() for suggestion in suggestions)
    
    def test_parameter_conflict_detection(self):
        """Test detection of conflicting parameters across conversation"""
        conversation = [
            ChatMessage(role="user", content="I want a high-speed highway scenario"),
            ChatMessage(role="assistant", content="What speeds are involved?"),
            ChatMessage(role="user", content="Cars going 120 km/h"),
            ChatMessage(role="assistant", content="What about road conditions?"),
            ChatMessage(role="user", content="Residential street with speed bumps"),  # Conflicts with high-speed
        ]
        
        conflicts = self.validator.detect_parameter_conflicts(conversation)
        
        assert len(conflicts) > 0
        assert any("highway" in conflict.lower() and "residential" in conflict.lower() for conflict in conflicts)
        assert any("120 km/h" in conflict and "residential" in conflict for conflict in conflicts)
    
    def test_progressive_validation_improvement(self):
        """Test that validation improves as conversation progresses"""
        # Start with basic conversation
        basic_conversation = [
            ChatMessage(role="user", content="I want a scenario"),
        ]
        
        basic_result = self.validator.validate_conversation_parameters(basic_conversation)
        basic_completeness = basic_result.completeness_score
        
        # Add more details
        detailed_conversation = [
            ChatMessage(role="user", content="I want a scenario"),
            ChatMessage(role="assistant", content="What type of scenario?"),
            ChatMessage(role="user", content="Highway overtaking with two cars"),
            ChatMessage(role="assistant", content="What speeds?"),
            ChatMessage(role="user", content="80 km/h and 100 km/h"),
        ]
        
        detailed_result = self.validator.validate_conversation_parameters(detailed_conversation)
        detailed_completeness = detailed_result.completeness_score
        
        # Detailed conversation should have higher completeness
        assert detailed_completeness > basic_completeness
        assert detailed_result.missing_parameters < basic_result.missing_parameters
    
    def test_intelligent_parameter_suggestions(self):
        """Test intelligent suggestions for missing parameters"""
        conversation = [
            ChatMessage(role="user", content="Create an emergency braking scenario"),
            ChatMessage(role="assistant", content="I'll help with that."),
            ChatMessage(role="user", content="Two cars involved"),
        ]
        
        suggestions = self.validator.suggest_parameter_improvements(conversation)
        
        assert len(suggestions) > 0
        
        # Should suggest specific parameters for emergency braking
        suggestion_text = " ".join(suggestions).lower()
        assert any(param in suggestion_text for param in ["speed", "distance", "reaction", "weather"])
        
        # Should be contextual to emergency braking
        assert "braking" in suggestion_text or "aeb" in suggestion_text or "collision" in suggestion_text
    
    def test_context_aware_validation(self):
        """Test that validation is aware of scenario context"""
        # AEB scenario context
        aeb_conversation = [
            ChatMessage(role="user", content="AEB test scenario"),
            ChatMessage(role="user", content="Car at 150 km/h"),  # Too fast for AEB
        ]
        
        aeb_result = self.validator.validate_conversation_parameters(aeb_conversation)
        
        # Should specifically mention AEB speed limits
        assert any("aeb" in issue.lower() for issue in aeb_result.warnings)
        
        # Highway scenario context
        highway_conversation = [
            ChatMessage(role="user", content="Highway scenario"),
            ChatMessage(role="user", content="Car at 30 km/h"),  # Too slow for highway
        ]
        
        highway_result = self.validator.validate_conversation_parameters(highway_conversation)
        
        # Should mention highway speed expectations
        assert any("highway" in issue.lower() for issue in highway_result.warnings)
    
    def test_real_time_feedback_integration(self):
        """Test integration with real-time conversation feedback"""
        conversation = [
            ChatMessage(role="user", content="I want a truck on a narrow residential street"),
        ]
        
        feedback = self.validator.get_real_time_feedback(conversation)
        
        assert feedback is not None
        assert hasattr(feedback, 'immediate_issues')
        assert hasattr(feedback, 'suggested_clarifications')
        assert hasattr(feedback, 'parameter_status')
        
        # Should flag potential truck/residential compatibility
        issues_text = " ".join(feedback.immediate_issues).lower()
        assert "truck" in issues_text and "residential" in issues_text
    
    def test_parameter_completeness_scoring(self):
        """Test parameter completeness scoring"""
        # Minimal conversation
        minimal = [ChatMessage(role="user", content="Create a scenario")]
        minimal_score = self.validator.calculate_completeness_score(minimal)
        
        # Complete conversation
        complete = [
            ChatMessage(role="user", content="Highway overtaking scenario"),
            ChatMessage(role="user", content="Ego car at 80 km/h, target truck at 60 km/h"),
            ChatMessage(role="user", content="Dry weather, daytime conditions"),
            ChatMessage(role="user", content="3-lane highway, ego starts in right lane"),
        ]
        complete_score = self.validator.calculate_completeness_score(complete)
        
        assert 0.0 <= minimal_score <= 1.0
        assert 0.0 <= complete_score <= 1.0
        assert complete_score > minimal_score
        assert complete_score > 0.7  # Should be quite complete
    
    def test_validation_performance(self):
        """Test that validation performs efficiently"""
        import time
        
        # Large conversation
        large_conversation = []
        for i in range(50):
            large_conversation.append(ChatMessage(role="user", content=f"Message {i} with scenario details"))
            large_conversation.append(ChatMessage(role="assistant", content=f"Response {i}"))
        
        start_time = time.time()
        result = self.validator.validate_conversation_parameters(large_conversation)
        end_time = time.time()
        
        # Should complete within reasonable time (< 1 second)
        assert (end_time - start_time) < 1.0
        assert result is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])