import pytest
from httpx import AsyncClient
from app.main_working import app
from app.schemas import ScenarioParameters, RoadNetwork, Vehicle, BoundingBox, Performance, EnvironmentalConditions, WorkflowRequest
from app.workflow_service import WorkflowStatus, WorkflowStep
from app.workflow_service import workflow_manager
import asyncio

@pytest.fixture(autouse=True)
def clear_workflows():
    # Clear workflows before each test to ensure a clean state
    workflow_manager.active_workflows = {}
    yield
    workflow_manager.active_workflows = {}

@pytest.mark.asyncio
async def test_workflow_generate_and_validate_with_full_parameters():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Define a full ScenarioParameters object
        scenario_params = ScenarioParameters(
            scenario_name="Test Scenario",
            description="A simple test scenario for workflow.",
            road_network=RoadNetwork(
                road_description="A straight road",
                generate_simple_road=True
            ),
            vehicles=[
                Vehicle(
                    name="ego",
                    category="car",
                    bounding_box=BoundingBox(width=1.8, length=4.5, height=1.5),
                    performance=Performance(max_speed=50.0, max_acceleration=5.0, max_deceleration=10.0),
                    initial_speed=10.0
                )
            ],
            events=[],
            environment=EnvironmentalConditions(
                weather="dry",
                time_of_day="day"
            )
        )

        # Create a WorkflowRequest with the full ScenarioParameters
        workflow_request = WorkflowRequest(
            parameters=scenario_params,
            auto_validate=True,
            prepare_visualization=False
        )

        response = await ac.post("/api/workflow/generate-and-validate", json=workflow_request.dict())
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["status"] == "running"
        session_id = response_data["session_id"]

        # Poll for workflow completion
        for _ in range(20):  # Max 20 polls
            await asyncio.sleep(0.5)
            status_response = await ac.get(f"/api/workflow/{session_id}/status")
            assert status_response.status_code == 200
            status_data = status_response.json()
            if status_data["status"] == "ready":
                break
            elif status_data["status"] == "error" or status_data["status"] == "failed":
                pytest.fail(f"Workflow failed: {status_data.get('error_message')}")
        else:
            pytest.fail("Workflow did not complete in time.")

        assert status_data["status"] == "ready"

        # Verify generated files
        files_response = await ac.get(f"/api/workflow/{session_id}/files")
        assert files_response.status_code == 200
        files_data = files_response.json()
        assert "scenario_files" in files_data["files"]
        assert len(files_data["files"]["scenario_files"]) > 0
        assert any(".xosc" in filename for filename in files_data["files"]["scenario_files"].keys())
        assert any(".xodr" in filename for filename in files_data["files"]["scenario_files"].keys())

        # Verify validation results
        validation_response = await ac.get(f"/api/workflow/{session_id}/validation")
        assert validation_response.status_code == 200
        validation_data = validation_response.json()
        assert "validation_results" in validation_data
        assert len(validation_data["validation_results"]) > 0
        assert "cross_validation" in validation_data["validation_results"]
        assert validation_data["validation_results"]["cross_validation"]["is_valid"] is True
