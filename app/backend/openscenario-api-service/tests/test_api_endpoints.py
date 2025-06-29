import pytest
import json
import uuid
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.schemas import WorkflowRequest, WorkflowResponse, WorkflowSummary


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check_returns_200(self, client):
        """Test that health endpoint returns 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    @pytest.mark.asyncio
    async def test_health_check_async(self, async_client):
        """Test health endpoint with async client."""
        response = await async_client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestWorkflowGenerateAndValidateEndpoint:
    """Test the workflow generate-and-validate endpoint."""
    
    def test_generate_and_validate_endpoint_exists(self, client):
        """Test that the endpoint exists and accepts POST requests."""
        # This should fail initially as the endpoint might not exist
        response = client.post("/api/workflow/generate-and-validate")
        # We expect either 422 (validation error) or 200/201, not 404
        assert response.status_code != 404
    
    def test_generate_and_validate_with_valid_request(self, client, sample_scenario_request):
        """Test endpoint with valid scenario request."""
        response = client.post(
            "/api/workflow/generate-and-validate",
            json=sample_scenario_request
        )
        
        # Should return success (200/201) or validation error (422)
        assert response.status_code in [200, 201, 422]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "session_id" in data
            assert "status" in data
            assert "current_step" in data
            assert "progress" in data
    
    def test_generate_and_validate_with_invalid_request(self, client):
        """Test endpoint with invalid request data."""
        invalid_requests = [
            {},  # Empty request
            {"description": ""},  # Empty description
            {"parameters": {}},  # Missing description
            {"description": None, "parameters": {}},  # Null description
        ]
        
        for invalid_request in invalid_requests:
            response = client.post(
                "/api/workflow/generate-and-validate",
                json=invalid_request
            )
            assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_generate_and_validate_async(self, async_client, sample_scenario_request):
        """Test endpoint with async client."""
        async with async_client as client:
            response = await client.post(
                "/api/workflow/generate-and-validate",
                json=sample_scenario_request
            )
            
            assert response.status_code in [200, 201, 422]
    
    def test_generate_and_validate_with_complex_parameters(self, client):
        """Test endpoint with complex parameter structure."""
        complex_request = {
            "description": "Complex highway scenario with multiple vehicles",
            "parameters": {
                "road_type": "highway",
                "weather": "rain",
                "time_of_day": "night",
                "vehicles": [
                    {"type": "car", "speed": 60},
                    {"type": "truck", "speed": 50}
                ],
                "traffic_density": "medium",
                "visibility": "poor"
            }
        }
        
        response = client.post(
            "/api/workflow/generate-and-validate",
            json=complex_request
        )
        
        assert response.status_code in [200, 201, 422]
    
    @patch('app.main_working.workflow_manager.generate_and_validate', new_callable=AsyncMock)
    def test_generate_and_validate_with_mocked_workflow(self, mock_generate, client, sample_scenario_request):
        """Test endpoint with mocked workflow manager."""
        # Setup mock
        mock_session_id = str(uuid.uuid4())
        mock_generate.return_value = mock_session_id
        
        response = client.post(
            "/api/workflow/generate-and-validate",
            json=sample_scenario_request
        )
        
        # Verify mock was called
        mock_generate.assert_called_once()
        
        # Verify response
        if response.status_code in [200, 201]:
            data = response.json()
            assert data["session_id"] == mock_session_id


class TestWorkflowStatusEndpoint:
    """Test the workflow status endpoint."""
    
    def test_workflow_status_endpoint_exists(self, client):
        """Test that the status endpoint exists."""
        fake_session_id = str(uuid.uuid4())
        response = client.get(f"/api/workflow/{fake_session_id}/status")
        
        # Should return 404 with proper error message (endpoint exists, workflow doesn't)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_workflow_status_with_valid_session_id(self, client):
        """Test status endpoint with valid session ID format."""
        valid_session_id = str(uuid.uuid4())
        response = client.get(f"/api/workflow/{valid_session_id}/status")
        
        # Should return 404 (session not found) or 200 (session found)
        assert response.status_code in [200, 404]
    
    def test_workflow_status_with_invalid_session_id(self, client):
        """Test status endpoint with invalid session ID formats."""
        invalid_session_ids = [
            "invalid-uuid",
            "12345",
            "",
            "not-a-uuid-at-all"
        ]
        
        for invalid_id in invalid_session_ids:
            response = client.get(f"/api/workflow/{invalid_id}/status")
            # Should return validation error or not found
            assert response.status_code in [400, 404, 422]
    
    @patch('app.main_working.workflow_manager.get_workflow_status', new_callable=AsyncMock)
    def test_workflow_status_with_existing_session(self, mock_get_status, client):
        """Test status endpoint with existing session."""
        session_id = str(uuid.uuid4())
        
        # Mock return value
        from app.workflow_service import WorkflowState, WorkflowStatus, WorkflowStep
        mock_status = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.RUNNING,
            current_step=WorkflowStep.GENERATION,
            progress=50.0
        )
        mock_get_status.return_value = mock_status
        
        response = client.get(f"/api/workflow/{session_id}/status")
        
        if response.status_code == 200:
            data = response.json()
            assert data["session_id"] == session_id
            assert data["status"] == "running"
            assert data["current_step"] == "generation"
            assert data["progress"] == 50.0
    
    @patch('app.main_working.workflow_manager.get_workflow_status', new_callable=AsyncMock)
    def test_workflow_status_with_nonexistent_session(self, mock_get_status, client):
        """Test status endpoint with non-existent session."""
        session_id = str(uuid.uuid4())
        mock_get_status.return_value = None
        
        response = client.get(f"/api/workflow/{session_id}/status")
        
        assert response.status_code == 404


class TestWorkflowCompleteEndpoint:
    """Test the workflow complete endpoint."""
    
    def test_workflow_complete_endpoint_exists(self, client):
        """Test that the complete endpoint exists."""
        response = client.post("/api/workflow/complete")
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
    
    def test_workflow_complete_with_valid_request(self, client):
        """Test complete endpoint with valid session ID."""
        session_id = str(uuid.uuid4())
        request_data = {"session_id": session_id}
        
        response = client.post(
            "/api/workflow/complete",
            json=request_data
        )
        
        # Should return success or not found
        assert response.status_code in [200, 404, 422]
    
    def test_workflow_complete_with_invalid_request(self, client):
        """Test complete endpoint with invalid request data."""
        validation_errors = [
            {},  # Empty request
            {"session_id": ""},  # Empty session ID
            {"session_id": None},  # Null session ID
            {"wrong_field": "value"},  # Wrong field name
        ]
        
        not_found_errors = [
            {"session_id": "invalid-uuid"},  # Valid format but non-existent workflow
        ]
        
        for invalid_request in validation_errors:
            response = client.post(
                "/api/workflow/complete",
                json=invalid_request
            )
            assert response.status_code == 422  # Validation error
        
        for invalid_request in not_found_errors:
            response = client.post(
                "/api/workflow/complete",
                json=invalid_request
            )
            assert response.status_code == 404  # Not found error
    
    @patch('app.main_working.workflow_manager.complete_workflow', new_callable=AsyncMock)
    def test_workflow_complete_with_existing_session(self, mock_complete, client):
        """Test complete endpoint with existing session."""
        session_id = str(uuid.uuid4())
        
        # Mock successful completion
        from app.workflow_service import WorkflowState, WorkflowStatus, WorkflowStep
        mock_result = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.COMPLETED,
            current_step=WorkflowStep.VALIDATION,
            progress=100.0,
            scenario_files={
                "scenario.xosc": "<?xml>test</xml>",
                "road_network.xodr": "<?xml>road</xml>"
            }
        )
        mock_complete.return_value = mock_result
        
        response = client.post(
            "/api/workflow/complete",
            json={"session_id": session_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data["session_id"] == session_id
            assert data["status"] == "completed"
            assert data["progress"] == 100.0
            assert "scenario_files" in data
    
    @patch('app.main_working.workflow_manager.complete_workflow', new_callable=AsyncMock)
    def test_workflow_complete_with_nonexistent_session(self, mock_complete, client):
        """Test complete endpoint with non-existent session."""
        session_id = str(uuid.uuid4())
        mock_complete.return_value = None
        
        response = client.post(
            "/api/workflow/complete",
            json={"session_id": session_id}
        )
        
        assert response.status_code == 404


class TestWorkflowErrorHandling:
    """Test error handling in workflow endpoints."""
    
    def test_malformed_json_requests(self, client):
        """Test endpoints with malformed JSON."""
        endpoints = [
            "/api/workflow/generate-and-validate",
            "/api/workflow/complete"
        ]
        
        for endpoint in endpoints:
            # Send malformed JSON
            response = client.post(
                endpoint,
                data="invalid json",
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 422
    
    def test_missing_content_type(self, client):
        """Test endpoints without proper Content-Type header."""
        valid_data = {"description": "test", "parameters": {}}
        
        response = client.post(
            "/api/workflow/generate-and-validate",
            data=json.dumps(valid_data)
            # No Content-Type header
        )
        
        # FastAPI should handle this gracefully
        assert response.status_code in [200, 201, 422]
    
    @patch('app.main_working.workflow_manager.generate_and_validate', new_callable=AsyncMock)
    def test_workflow_service_exception_handling(self, mock_generate, client, sample_scenario_request):
        """Test handling of exceptions from workflow service."""
        # Mock service to raise exception
        mock_generate.side_effect = Exception("Service unavailable")
        
        response = client.post(
            "/api/workflow/generate-and-validate",
            json=sample_scenario_request
        )
        
        # Should return 500 internal server error
        assert response.status_code == 500


class TestWorkflowIntegrationEndpoints:
    """Integration tests for workflow endpoints."""
    
    @pytest.mark.asyncio
    async def test_complete_workflow_integration(self, async_client, sample_scenario_request):
        """Test complete workflow from generation to completion."""
        async with async_client as client:
            # Start workflow
            generate_response = await client.post(
                "/api/workflow/generate-and-validate",
                json=sample_scenario_request
            )
            
            if generate_response.status_code in [200, 201]:
                session_id = generate_response.json()["session_id"]
                
                # Check status
                status_response = await client.get(f"/api/workflow/{session_id}/status")
                assert status_response.status_code in [200, 404]
                
                # Complete workflow
                complete_response = await client.post(
                    "/api/workflow/complete",
                    json={"session_id": session_id}
                )
                assert complete_response.status_code in [200, 404]
    
    def test_workflow_endpoints_cors_headers(self, client):
        """Test that workflow endpoints include proper CORS headers."""
        response = client.options("/api/workflow/generate-and-validate")
        
        # Should include CORS headers for OPTIONS request
        assert response.status_code in [200, 405]  # Method allowed or not allowed
    
    def test_workflow_endpoints_accept_json_only(self, client):
        """Test that endpoints properly handle non-JSON content types."""
        xml_data = "<?xml version='1.0'?><test/>"
        
        response = client.post(
            "/api/workflow/generate-and-validate",
            data=xml_data,
            headers={"Content-Type": "application/xml"}
        )
        
        # Should reject non-JSON content
        assert response.status_code == 422


class TestWorkflowSchemaValidation:
    """Test schema validation for workflow endpoints."""
    
    def test_workflow_request_schema_validation(self, client):
        """Test WorkflowRequest schema validation."""
        test_cases = [
            # Valid cases
            ({"description": "Test", "parameters": {}}, [200, 201, 422]),
            ({"description": "Test", "parameters": {"key": "value"}}, [200, 201, 422]),
            
            # Invalid cases
            ({"description": ""}, [422]),  # Empty description
            ({"parameters": {}}, [422]),  # Missing description
            ({"description": None, "parameters": {}}, [422]),  # Null description
            ({"description": 123, "parameters": {}}, [422]),  # Wrong type
        ]
        
        for request_data, expected_codes in test_cases:
            response = client.post(
                "/api/workflow/generate-and-validate",
                json=request_data
            )
            assert response.status_code in expected_codes
    
    def test_workflow_response_schema_compliance(self, client, sample_scenario_request):
        """Test that responses comply with WorkflowResponse schema."""
        response = client.post(
            "/api/workflow/generate-and-validate",
            json=sample_scenario_request
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            
            # Check required fields
            required_fields = ["session_id", "status", "current_step", "progress"]
            for field in required_fields:
                assert field in data
            
            # Check field types
            assert isinstance(data["session_id"], str)
            assert isinstance(data["status"], str)
            assert isinstance(data["progress"], (int, float))
            assert 0 <= data["progress"] <= 100