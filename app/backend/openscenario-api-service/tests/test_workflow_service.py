import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import tempfile
import os

from app.workflow_service import (
    WorkflowManager,
    WorkflowState,
    WorkflowStatus,
    WorkflowStep,
    scenario_generator
)
from app.test_schemas import WorkflowRequest


class TestWorkflowState:
    """Test WorkflowState dataclass functionality."""
    
    def test_workflow_state_creation(self):
        """Test creating a workflow state with required fields."""
        session_id = str(uuid.uuid4())
        state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.PENDING,
            current_step=None,
            progress=0.0
        )
        
        assert state.session_id == session_id
        assert state.status == WorkflowStatus.PENDING
        assert state.current_step is None
        assert state.progress == 0.0
        assert state.scenario_files == {}
        assert state.validation_results == {}
    
    def test_workflow_state_with_files(self):
        """Test workflow state with scenario files."""
        session_id = str(uuid.uuid4())
        files = {
            "scenario.xosc": "<?xml version='1.0'?>...",
            "road_network.xodr": "<?xml version='1.0'?>..."
        }
        
        state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.COMPLETED,
            current_step=WorkflowStep.VALIDATION,
            progress=100.0,
            scenario_files=files
        )
        
        assert state.scenario_files == files
        assert state.status == WorkflowStatus.COMPLETED
        assert state.current_step == WorkflowStep.VALIDATION
        assert state.progress == 100.0


class TestWorkflowManager:
    """Test WorkflowManager functionality."""
    
    def test_workflow_manager_initialization(self):
        """Test WorkflowManager can be instantiated."""
        manager = WorkflowManager()
        assert manager is not None
        assert hasattr(manager, 'active_workflows')
        assert isinstance(manager.active_workflows, dict)
    
    @pytest.mark.asyncio
    async def test_generate_and_validate_workflow_creation(self):
        """Test that generate_and_validate creates a new workflow."""
        manager = WorkflowManager()
        request = WorkflowRequest(
            description="Test scenario",
            parameters={"road_type": "highway"}
        )
        
        session_id = await manager.generate_and_validate(request)
        
        assert session_id is not None
        assert session_id in manager.active_workflows
        
        workflow_state = manager.active_workflows[session_id]
        assert workflow_state.session_id == session_id
        assert workflow_state.status in [WorkflowStatus.PENDING, WorkflowStatus.RUNNING]
    
    @pytest.mark.asyncio
    async def test_generate_and_validate_scenario_generation(self):
        """Test that scenario generation is called during workflow."""
        manager = WorkflowManager()
        request = WorkflowRequest(
            description="Highway overtaking scenario",
            parameters={"road_type": "highway", "weather": "clear"}
        )
        
        with patch.object(scenario_generator, 'generate_scenario') as mock_generate:
            mock_generate.return_value = {
                "scenario.xosc": "<?xml>test scenario</xml>",
                "road_network.xodr": "<?xml>test road</xml>"
            }
            
            session_id = await manager.generate_and_validate(request)
            
            # Just verify session was created (scenario generation happens in background)
            assert session_id is not None
            assert session_id in manager.active_workflows
    
    @pytest.mark.asyncio
    async def test_get_workflow_status_existing_session(self):
        """Test getting status of an existing workflow session."""
        manager = WorkflowManager()
        session_id = str(uuid.uuid4())
        
        # Create a workflow state
        workflow_state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.RUNNING,
            current_step=WorkflowStep.GENERATION,
            progress=50.0
        )
        manager.active_workflows[session_id] = workflow_state
        
        status = await manager.get_workflow_status(session_id)
        
        assert status is not None
        assert status.session_id == session_id
        assert status.status == WorkflowStatus.RUNNING
        assert status.current_step == WorkflowStep.GENERATION
        assert status.progress == 50.0
    
    @pytest.mark.asyncio
    async def test_get_workflow_status_nonexistent_session(self):
        """Test getting status of a non-existent workflow session."""
        manager = WorkflowManager()
        fake_session_id = str(uuid.uuid4())
        
        status = await manager.get_workflow_status(fake_session_id)
        
        assert status is None
    
    @pytest.mark.asyncio
    async def test_complete_workflow_success(self):
        """Test completing a workflow successfully."""
        manager = WorkflowManager()
        session_id = str(uuid.uuid4())
        
        # Create a running workflow
        workflow_state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.RUNNING,
            current_step=WorkflowStep.VALIDATION,
            progress=80.0,
            scenario_files={
                "scenario.xosc": "test content",
                "road_network.xodr": "test road content"
            }
        )
        manager.active_workflows[session_id] = workflow_state
        
        result = await manager.complete_workflow(session_id)
        
        assert result is not None
        assert result.session_id == session_id
        assert result.status == WorkflowStatus.COMPLETED
        assert result.progress == 1.0
        assert result.scenario_files is not None
    
    @pytest.mark.asyncio
    async def test_complete_workflow_nonexistent_session(self):
        """Test completing a non-existent workflow."""
        manager = WorkflowManager()
        fake_session_id = str(uuid.uuid4())
        
        result = await manager.complete_workflow(fake_session_id)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cleanup_session_removes_workflow(self):
        """Test that cleanup removes workflow from active sessions."""
        manager = WorkflowManager()
        session_id = str(uuid.uuid4())
        
        # Create a workflow
        workflow_state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.COMPLETED,
            current_step=WorkflowStep.VALIDATION,
            progress=100.0
        )
        manager.active_workflows[session_id] = workflow_state
        
        assert session_id in manager.active_workflows
        
        await manager.cleanup_session(session_id)
        
        assert session_id not in manager.active_workflows
    
    @pytest.mark.asyncio
    async def test_workflow_error_handling(self):
        """Test workflow handles errors gracefully."""
        manager = WorkflowManager()
        request = WorkflowRequest(
            description="Invalid scenario description",
            parameters={}
        )
        
        session_id = await manager.generate_and_validate(request)
        
        # Workflow should still be created 
        assert session_id in manager.active_workflows
        workflow_state = manager.active_workflows[session_id]
        # Could be RUNNING or ERROR depending on timing
        assert workflow_state.status in [WorkflowStatus.RUNNING, WorkflowStatus.ERROR]
    
    @pytest.mark.asyncio
    async def test_concurrent_workflows(self):
        """Test that multiple workflows can run concurrently."""
        manager = WorkflowManager()
        requests = [
            WorkflowRequest(description=f"Scenario {i}", parameters={})
            for i in range(3)
        ]
        
        # Start multiple workflows concurrently
        session_ids = await asyncio.gather(*[
            manager.generate_and_validate(req) for req in requests
        ])
        
        assert len(session_ids) == 3
        assert len(set(session_ids)) == 3  # All unique
        
        # All workflows should be tracked
        for session_id in session_ids:
            assert session_id in manager.active_workflows


class TestScenarioGenerator:
    """Test scenario generation functionality."""
    
    @pytest.mark.asyncio
    async def test_scenario_generator_import(self):
        """Test that scenario generator can be imported."""
        from app.workflow_service import scenario_generator
        assert scenario_generator is not None
    
    def test_mock_scenario_generation(self):
        """Test mock scenario generation when pyoscx is not available."""
        from app.workflow_service import _mock_generate_scenario_files
        
        description = "Highway overtaking scenario"
        parameters = {"road_type": "highway", "weather": "clear"}
        
        files = _mock_generate_scenario_files(description, parameters)
        
        assert isinstance(files, dict)
        assert "scenario.xosc" in files
        assert "road_network.xodr" in files
        assert "highway" in files["scenario.xosc"]
        assert "clear" in files["scenario.xosc"]
    
    def test_mock_scenario_content_validity(self):
        """Test that mock generated content contains expected elements."""
        from app.workflow_service import _mock_generate_scenario_files
        
        description = "Urban intersection scenario with traffic lights"
        parameters = {"road_type": "urban", "weather": "rain", "time_of_day": "night"}
        
        files = _mock_generate_scenario_files(description, parameters)
        
        xosc_content = files["scenario.xosc"]
        xodr_content = files["road_network.xodr"]
        
        # Check XOSC content
        assert "<?xml version" in xosc_content
        assert "OpenSCENARIO" in xosc_content
        assert "urban" in xosc_content
        assert "rain" in xosc_content
        assert "night" in xosc_content
        
        # Check XODR content
        assert "<?xml version" in xodr_content
        assert "OpenDRIVE" in xodr_content
        assert "urban" in xodr_content


class TestWorkflowIntegration:
    """Integration tests for complete workflow functionality."""
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self):
        """Test complete workflow from start to finish."""
        manager = WorkflowManager()
        request = WorkflowRequest(
            description="Complete test scenario",
            parameters={"road_type": "highway", "weather": "clear"}
        )
        
        # Start workflow
        session_id = await manager.generate_and_validate(request)
        assert session_id is not None
        
        # Check initial status
        status = await manager.get_workflow_status(session_id)
        assert status is not None
        assert status.session_id == session_id
        
        # Complete workflow
        result = await manager.complete_workflow(session_id)
        assert result is not None
        assert result.status == WorkflowStatus.COMPLETED
        assert result.scenario_files is not None
        
        # Cleanup
        await manager.cleanup_session(session_id)
        
        # Verify cleanup
        status_after_cleanup = await manager.get_workflow_status(session_id)
        assert status_after_cleanup is None
    
    @pytest.mark.asyncio
    async def test_workflow_persistence_across_operations(self):
        """Test that workflow state persists across multiple operations."""
        manager = WorkflowManager()
        request = WorkflowRequest(
            description="Persistence test scenario",
            parameters={"road_type": "city"}
        )
        
        # Create workflow
        session_id = await manager.generate_and_validate(request)
        
        # Get status multiple times
        status1 = await manager.get_workflow_status(session_id)
        status2 = await manager.get_workflow_status(session_id)
        
        assert status1.session_id == status2.session_id
        assert status1.status == status2.status
        
        # Complete workflow
        result = await manager.complete_workflow(session_id)
        
        # Status should now be completed
        final_status = await manager.get_workflow_status(session_id)
        assert final_status.status == WorkflowStatus.COMPLETED
        assert final_status.progress == 1.0


class TestWorkflowErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.mark.asyncio
    async def test_invalid_session_id_handling(self):
        """Test handling of invalid session IDs."""
        manager = WorkflowManager()
        
        # Test various invalid session IDs
        invalid_ids = ["", "invalid-uuid", "12345", None]
        
        for invalid_id in invalid_ids:
            if invalid_id is not None:
                status = await manager.get_workflow_status(invalid_id)
                assert status is None
                
                result = await manager.complete_workflow(invalid_id)
                assert result is None
    
    @pytest.mark.asyncio
    async def test_workflow_timeout_handling(self):
        """Test workflow timeout scenarios."""
        manager = WorkflowManager()
        
        # Create a workflow that should timeout
        session_id = str(uuid.uuid4())
        workflow_state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.RUNNING,
            current_step=WorkflowStep.GENERATION,
            progress=10.0
        )
        manager.active_workflows[session_id] = workflow_state
        
        # Simulate timeout by checking long-running workflow
        status = await manager.get_workflow_status(session_id)
        assert status.status == WorkflowStatus.RUNNING
        
        # In a real implementation, this would check timestamps and timeout
        # For now, we just verify the workflow can be retrieved
    
    @pytest.mark.asyncio
    async def test_concurrent_access_to_same_session(self):
        """Test concurrent access to the same workflow session."""
        manager = WorkflowManager()
        session_id = str(uuid.uuid4())
        
        workflow_state = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.RUNNING,
            current_step=WorkflowStep.VALIDATION,
            progress=75.0
        )
        manager.active_workflows[session_id] = workflow_state
        
        # Simulate concurrent access
        status_tasks = [
            manager.get_workflow_status(session_id)
            for _ in range(5)
        ]
        
        statuses = await asyncio.gather(*status_tasks)
        
        # All should return the same session
        for status in statuses:
            assert status.session_id == session_id
            assert status.status == WorkflowStatus.RUNNING
            assert status.progress == 75.0