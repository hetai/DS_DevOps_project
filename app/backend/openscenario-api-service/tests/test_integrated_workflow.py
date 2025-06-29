"""
Test integrated workflow orchestration with seamless generation → validation → visualization workflow.
Following TDD RED phase - these tests should fail initially.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

from app.workflow_service import (
    WorkflowManager, WorkflowStatus, WorkflowStep, WorkflowState,
    workflow_manager
)
from app.schemas import (
    ScenarioParameters, Vehicle, Performance, BoundingBox, RoadNetwork,
    VehicleCategory, EnvironmentalConditions, WeatherCondition, TimeOfDay,
    LanePosition, Event, Action
)


class TestIntegratedWorkflowOrchestration:
    """Test seamless workflow progression from generation to visualization."""

    @pytest.fixture
    def sample_scenario_params(self):
        """Create sample scenario parameters for testing."""
        return ScenarioParameters(
            scenario_name="highway_overtaking",
            description="Highway overtaking scenario with two vehicles",
            vehicles=[
                Vehicle(
                    name="ego",
                    category=VehicleCategory.CAR,
                    performance=Performance(
                        max_speed=60.0,
                        max_acceleration=3.0,
                        max_deceleration=8.0
                    ),
                    bounding_box=BoundingBox(
                        width=2.0,
                        length=4.5,
                        height=1.5
                    ),
                    initial_speed=50.0
                ),
                Vehicle(
                    name="target",
                    category=VehicleCategory.CAR, 
                    performance=Performance(
                        max_speed=50.0,
                        max_acceleration=2.5,
                        max_deceleration=7.0
                    ),
                    bounding_box=BoundingBox(
                        width=1.8,
                        length=4.2,
                        height=1.4
                    ),
                    initial_speed=40.0
                )
            ],
            road_network=RoadNetwork(
                road_description="3-lane highway for overtaking",
                generate_simple_road=True
            ),
            events=[],
            environment=EnvironmentalConditions(
                weather=WeatherCondition.DRY,
                time_of_day=TimeOfDay.DAY,
                visibility=1000.0
            )
        )

    @pytest.fixture
    def workflow_mgr(self):
        """Create fresh workflow manager for each test."""
        return WorkflowManager()

    @pytest.mark.asyncio
    async def test_seamless_workflow_progression(self, workflow_mgr, sample_scenario_params):
        """Test that workflow automatically progresses through all steps without manual intervention."""
        # Create workflow
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Start complete workflow
        result_workflow = await workflow_mgr.execute_complete_workflow(session_id)
        
        # Should have progressed through all steps
        assert result_workflow.status == WorkflowStatus.COMPLETED
        assert result_workflow.progress == 1.0
        assert result_workflow.current_step is None  # Completed, no current step
        
        # Should have generated files
        assert result_workflow.scenario_files is not None
        assert len(result_workflow.scenario_files) >= 2  # .xosc and .xodr files
        assert any(f.endswith('.xosc') for f in result_workflow.scenario_files.keys())
        assert any(f.endswith('.xodr') for f in result_workflow.scenario_files.keys())
        
        # Should have validation results  
        assert result_workflow.validation_results is not None
        assert len(result_workflow.validation_results) > 0
        
        # Should have visualization metadata
        assert result_workflow.metadata is not None
        assert "visualization" in result_workflow.metadata
        viz_meta = result_workflow.metadata["visualization"]
        assert "road_network" in viz_meta
        assert "scenario_data" in viz_meta
        assert "validation_highlights" in viz_meta

    @pytest.mark.asyncio
    async def test_automatic_validation_after_generation(self, workflow_mgr, sample_scenario_params):
        """Test that validation automatically occurs after successful generation."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Execute generation and validation only (not full workflow)
        result_workflow = await workflow_mgr.execute_generate_and_validate(session_id)
        
        # Should have validated status
        assert result_workflow.status == WorkflowStatus.READY
        assert result_workflow.progress >= 0.8  # At least through validation
        
        # Should have both files and validation results
        assert result_workflow.scenario_files is not None
        assert result_workflow.validation_results is not None
        
        # Validation should have been performed on generated files
        file_names = list(result_workflow.scenario_files.keys())
        for filename in file_names:
            if filename.endswith(('.xosc', '.xodr')):
                assert filename in result_workflow.validation_results

    @pytest.mark.asyncio
    async def test_internal_file_management(self, workflow_mgr, sample_scenario_params):
        """Test that files are managed internally without requiring user upload/download."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Execute workflow
        await workflow_mgr.execute_complete_workflow(session_id)
        
        # Files should be saved to internal storage
        session_dir = workflow_mgr.temp_dir / session_id
        assert session_dir.exists()
        
        # Should have saved the generated files to disk
        generated_files = list(session_dir.glob("*"))
        assert len(generated_files) >= 2
        
        # Files should be accessible for subsequent steps
        workflow = workflow_mgr.get_workflow(session_id)
        for filename in workflow.scenario_files.keys():
            file_path = session_dir / filename
            assert file_path.exists()
            assert file_path.stat().st_size > 0  # Not empty

    @pytest.mark.asyncio
    async def test_workflow_state_tracking(self, workflow_mgr, sample_scenario_params):
        """Test that workflow state is tracked through all progression steps."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Initially should be pending
        workflow = workflow_mgr.get_workflow(session_id)
        assert workflow.status == WorkflowStatus.PENDING
        assert workflow.progress == 0.0
        
        # Mock execution to track state progression
        original_execute_generation = workflow_mgr._execute_generation_step
        original_execute_validation = workflow_mgr._execute_validation_step  
        original_execute_viz_prep = workflow_mgr._execute_visualization_prep_step
        
        state_progression = []
        
        async def track_generation(workflow_state):
            state_progression.append(("generation_start", workflow_state.status, workflow_state.progress))
            await original_execute_generation(workflow_state)
            state_progression.append(("generation_end", workflow_state.status, workflow_state.progress))
        
        async def track_validation(workflow_state):
            state_progression.append(("validation_start", workflow_state.status, workflow_state.progress))
            await original_execute_validation(workflow_state)
            state_progression.append(("validation_end", workflow_state.status, workflow_state.progress))
        
        async def track_viz_prep(workflow_state):
            state_progression.append(("viz_prep_start", workflow_state.status, workflow_state.progress))
            await original_execute_viz_prep(workflow_state)
            state_progression.append(("viz_prep_end", workflow_state.status, workflow_state.progress))
        
        workflow_mgr._execute_generation_step = track_generation
        workflow_mgr._execute_validation_step = track_validation
        workflow_mgr._execute_visualization_prep_step = track_viz_prep
        
        # Execute workflow
        await workflow_mgr.execute_complete_workflow(session_id)
        
        # Should have tracked progression through all states
        assert len(state_progression) >= 6  # Start/end for each of 3 steps
        
        # Progress should increase monotonically
        for i in range(1, len(state_progression)):
            prev_progress = state_progression[i-1][2]
            curr_progress = state_progression[i][2]
            assert curr_progress >= prev_progress
        
        # Should have reached completion
        final_workflow = workflow_mgr.get_workflow(session_id)
        assert final_workflow.status == WorkflowStatus.COMPLETED
        assert final_workflow.progress == 1.0

    @pytest.mark.asyncio
    async def test_scenario_state_transitions(self, workflow_mgr, sample_scenario_params):
        """Test proper scenario state transitions: Generated → Validated → Ready."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # After generation step
        await workflow_mgr._execute_generation_step(workflow_mgr.get_workflow(session_id))
        workflow_after_gen = workflow_mgr.get_workflow(session_id)
        assert workflow_after_gen.status == WorkflowStatus.GENERATED
        assert workflow_after_gen.scenario_files is not None
        assert len(workflow_after_gen.scenario_files) > 0
        
        # After validation step
        await workflow_mgr._execute_validation_step(workflow_mgr.get_workflow(session_id))
        workflow_after_val = workflow_mgr.get_workflow(session_id)
        assert workflow_after_val.status == WorkflowStatus.VALIDATED
        assert workflow_after_val.validation_results is not None
        
        # After visualization prep
        await workflow_mgr._execute_visualization_prep_step(workflow_mgr.get_workflow(session_id))
        workflow_after_viz = workflow_mgr.get_workflow(session_id)
        assert workflow_after_viz.metadata is not None
        assert "visualization" in workflow_after_viz.metadata

    @pytest.mark.asyncio
    async def test_cross_file_consistency_validation(self, workflow_mgr, sample_scenario_params):
        """Test that validation includes cross-file consistency checks between .xosc and .xodr."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Execute generation and validation
        await workflow_mgr.execute_generate_and_validate(session_id)
        
        workflow = workflow_mgr.get_workflow(session_id)
        
        # Should have performed cross-validation
        assert "cross_validation" in workflow.validation_results
        cross_val_result = workflow.validation_results["cross_validation"]
        
        assert "is_valid" in cross_val_result
        assert "issues" in cross_val_result
        assert "total_errors" in cross_val_result
        assert "total_warnings" in cross_val_result

    @pytest.mark.asyncio
    async def test_one_click_progression_between_steps(self, workflow_mgr, sample_scenario_params):
        """Test that users can progress through workflow steps with single API calls."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # One click: Generation + Validation
        workflow_after_gen_val = await workflow_mgr.execute_generate_and_validate(session_id)
        assert workflow_after_gen_val.status == WorkflowStatus.READY
        assert workflow_after_gen_val.scenario_files is not None
        assert workflow_after_gen_val.validation_results is not None
        
        # One click: Complete workflow (should continue from current state)
        workflow_final = await workflow_mgr.execute_complete_workflow(session_id)
        assert workflow_final.status == WorkflowStatus.COMPLETED
        assert workflow_final.metadata is not None

    @pytest.mark.asyncio
    async def test_direct_visualization_from_validation_results(self, workflow_mgr, sample_scenario_params):
        """Test that visualization can be directly initiated from validation results."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Execute through validation
        await workflow_mgr.execute_generate_and_validate(session_id)
        
        # Should be able to proceed directly to visualization
        await workflow_mgr._execute_visualization_prep_step(workflow_mgr.get_workflow(session_id))
        
        workflow = workflow_mgr.get_workflow(session_id)
        viz_metadata = workflow.metadata["visualization"]
        
        # Should have extracted validation highlights for visualization
        assert "validation_highlights" in viz_metadata
        highlights = viz_metadata["validation_highlights"]
        assert isinstance(highlights, list)
        
        # If there were validation errors, they should be included
        for highlight in highlights:
            assert "type" in highlight
            assert "message" in highlight
            assert "file" in highlight

    @pytest.mark.asyncio
    async def test_error_handling_with_workflow_progression(self, workflow_mgr, sample_scenario_params):
        """Test that workflow handles errors gracefully and maintains state."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Mock scenario generator to fail
        with patch('app.workflow_service.HAS_SCENARIO_GENERATOR', False), \
             patch.object(workflow_mgr, '_mock_generate_scenario_files') as mock_gen:
            mock_gen.side_effect = Exception("Generation failed")
            
            # Should handle error and set proper state
            with pytest.raises(Exception, match="Generation failed"):
                await workflow_mgr.execute_complete_workflow(session_id)
            
            workflow = workflow_mgr.get_workflow(session_id)
            assert workflow.status == WorkflowStatus.FAILED
            assert workflow.error_message is not None
            assert "Generation failed" in workflow.error_message
            assert workflow.error_step == WorkflowStep.GENERATION

    @pytest.mark.asyncio
    async def test_workflow_cleanup_and_session_management(self, workflow_mgr, sample_scenario_params):
        """Test workflow cleanup and session management functionality."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        # Execute workflow
        await workflow_mgr.execute_complete_workflow(session_id)
        
        # Should exist
        assert workflow_mgr.get_workflow(session_id) is not None
        session_dir = workflow_mgr.temp_dir / session_id
        assert session_dir.exists()
        
        # Manual cleanup
        await workflow_mgr.cleanup_session(session_id)
        
        # Should be removed from memory
        assert workflow_mgr.get_workflow(session_id) is None
        assert session_id not in workflow_mgr.active_workflows

    @pytest.mark.asyncio
    async def test_concurrent_workflow_execution(self, workflow_mgr, sample_scenario_params):
        """Test that multiple workflows can execute concurrently without interference."""
        # Create multiple workflows
        session_ids = []
        for i in range(3):
            modified_params = sample_scenario_params.model_copy()
            modified_params.scenario_name = f"scenario_{i}"
            session_id = workflow_mgr.create_workflow(modified_params)
            session_ids.append(session_id)
        
        # Execute all workflows concurrently
        tasks = [
            workflow_mgr.execute_complete_workflow(session_id)
            for session_id in session_ids
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should complete successfully
        for result in results:
            assert not isinstance(result, Exception)
            assert result.status == WorkflowStatus.COMPLETED
        
        # Each workflow should maintain separate state
        for i, session_id in enumerate(session_ids):
            workflow = workflow_mgr.get_workflow(session_id)
            assert workflow.parameters.scenario_name == f"scenario_{i}"
            assert workflow.scenario_files is not None
            assert workflow.validation_results is not None

    def test_workflow_summary_for_api_responses(self, workflow_mgr, sample_scenario_params):
        """Test workflow summary generation for API responses."""
        session_id = workflow_mgr.create_workflow(sample_scenario_params)
        
        summary = workflow_mgr.get_workflow_summary(session_id)
        
        # Should include all required fields for API
        assert summary["session_id"] == session_id
        assert summary["status"] == WorkflowStatus.PENDING
        assert summary["progress"] == 0.0
        assert "created_at" in summary
        assert "updated_at" in summary
        assert summary["has_files"] is False
        assert summary["has_validation"] is False
        assert summary["file_count"] == 0


class TestWorkflowIntegrationAPI:
    """Test workflow integration with FastAPI endpoints."""

    @pytest.mark.asyncio
    async def test_workflow_manager_singleton_behavior(self):
        """Test that workflow_manager behaves as singleton across the application."""
        from app.workflow_service import workflow_manager as wm1
        from app.workflow_service import workflow_manager as wm2
        
        # Should be the same instance
        assert wm1 is wm2
        
        # Should share state
        sample_params = ScenarioParameters(
            scenario_name="test_scenario",
            description="Test scenario",
            vehicles=[],
            road_network=RoadNetwork(
                road_description="Test road",
                generate_simple_road=True
            ),
            events=[],
            environment=EnvironmentalConditions()
        )
        
        session_id = wm1.create_workflow(sample_params)
        workflow_from_wm2 = wm2.get_workflow(session_id)
        
        assert workflow_from_wm2 is not None
        assert workflow_from_wm2.session_id == session_id

    @pytest.mark.asyncio  
    async def test_background_workflow_execution(self):
        """Test background workflow execution for async API responses."""
        from app.workflow_service import workflow_manager
        
        # Create mock request
        mock_request = type('MockRequest', (), {
            'description': 'Highway overtaking scenario',
            'parameters': {'road_type': 'highway', 'weather': 'clear'}
        })()
        
        # Should create workflow and return session_id immediately
        session_id = await workflow_manager.generate_and_validate(mock_request)
        assert isinstance(session_id, str)
        assert len(session_id) > 0
        
        # Should be in running state
        workflow = workflow_manager.get_workflow(session_id)
        assert workflow.status in [WorkflowStatus.RUNNING, WorkflowStatus.GENERATING]
        
        # Wait for background completion
        await asyncio.sleep(0.1)  # Give background task time to execute
        
        # Should eventually complete
        max_wait = 5  # seconds
        wait_time = 0
        while wait_time < max_wait:
            workflow = workflow_manager.get_workflow(session_id)
            if workflow.status in [WorkflowStatus.READY, WorkflowStatus.COMPLETED, WorkflowStatus.ERROR]:
                break
            await asyncio.sleep(0.1)
            wait_time += 0.1
        
        # Should have reached a terminal state
        assert workflow.status in [WorkflowStatus.READY, WorkflowStatus.COMPLETED, WorkflowStatus.ERROR]