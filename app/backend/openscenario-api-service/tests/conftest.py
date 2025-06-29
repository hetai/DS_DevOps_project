import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
import tempfile
import os

# Import the app
from app.main_working import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)


@pytest.fixture
def async_client():
    """Create an async test client for the FastAPI application."""
    return AsyncClient(app=app, base_url="http://test")


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_workflow_manager():
    """Mock workflow manager for testing."""
    from app.workflow_service import WorkflowManager
    
    mock = MagicMock(spec=WorkflowManager)
    mock.generate_and_validate = AsyncMock()
    mock.complete_workflow = AsyncMock()
    mock.get_workflow_status = AsyncMock()
    mock.cleanup_session = AsyncMock()
    
    return mock


@pytest.fixture
def sample_scenario_request():
    """Sample workflow request for testing."""
    return {
        "description": "A car overtaking scenario on a highway with two lanes",
        "parameters": {
            "road_type": "highway",
            "weather": "clear",
            "time_of_day": "day"
        }
    }


@pytest.fixture
def sample_file_upload():
    """Sample file upload for testing."""
    content = b"""<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader description="Test scenario" name="test_scenario" revMajor="1" revMinor="2"/>
    <ParameterDeclarations/>
    <CatalogLocations/>
    <RoadNetwork>
        <LogicFile filepath="test_road.xodr"/>
    </RoadNetwork>
    <Entities>
        <ScenarioObject name="Ego">
            <CatalogReference catalogName="VehicleCatalog" entryName="car_white"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="Ego">
                    <PrivateAction>
                        <TeleportAction>
                            <Position>
                                <WorldPosition x="0" y="0" z="0" h="0" p="0" r="0"/>
                            </Position>
                        </TeleportAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="MyStory">
            <Act name="MyAct">
                <ManeuverGroup maximumExecutionCount="1" name="MyManeuverGroup">
                    <Actors selectTriggeringEntities="false">
                        <EntityRef entityRef="Ego"/>
                    </Actors>
                </ManeuverGroup>
                <StartTrigger>
                    <ConditionGroup>
                        <Condition name="StartCondition">
                            <ByValueCondition>
                                <SimulationTimeCondition rule="greaterThan" value="0"/>
                            </ByValueCondition>
                        </Condition>
                    </ConditionGroup>
                </StartTrigger>
            </Act>
        </Story>
        <StopTrigger>
            <ConditionGroup>
                <Condition name="StopCondition">
                    <ByValueCondition>
                        <SimulationTimeCondition rule="greaterThan" value="10"/>
                    </ByValueCondition>
                </Condition>
            </ConditionGroup>
        </StopTrigger>
    </Storyboard>
</OpenSCENARIO>"""
    
    return ("test_scenario.xosc", content, "application/xml")


@pytest.fixture
def clean_temp_files():
    """Clean up temporary files after tests."""
    temp_files = []
    
    def _add_temp_file(filepath):
        temp_files.append(filepath)
    
    yield _add_temp_file
    
    # Cleanup
    for filepath in temp_files:
        if os.path.exists(filepath):
            os.remove(filepath)