import os
import json
import asyncio
import tempfile
import uuid
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

from .schemas import ScenarioParameters, GenerationRequest, ValidationResult
from .validation_service import validation_service
from .ai_service_working import ai_service

# Try to import scenario generator, fall back to mock if not available
try:
    from .scenario_generator import scenario_generator
    HAS_SCENARIO_GENERATOR = True
except (ImportError, AttributeError) as e:
    print(f"Warning: scenario_generator not available ({e}), using mock")
    HAS_SCENARIO_GENERATOR = False
    scenario_generator = None


class WorkflowStatus(str, Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running"
    GENERATING = "generating"
    GENERATED = "generated"
    VALIDATING = "validating"
    VALIDATED = "validated"
    READY = "ready"
    FAILED = "failed"
    ERROR = "error"
    COMPLETED = "completed"


class WorkflowStep(str, Enum):
    """Individual workflow steps"""
    GENERATION = "generation"
    VALIDATION = "validation"
    VISUALIZATION_PREP = "visualization_prep"


@dataclass
class WorkflowState:
    """Complete workflow state tracking"""
    session_id: str
    status: WorkflowStatus
    current_step: Optional[WorkflowStep]
    progress: float  # 0.0 to 1.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Scenario data
    parameters: Optional[ScenarioParameters] = None
    
    # Generated files
    scenario_files: Dict[str, str] = None  # filename -> content
    
    # Validation results
    validation_results: Dict[str, Any] = None  # filename -> validation result
    
    # Error information
    error_message: Optional[str] = None
    error_step: Optional[WorkflowStep] = None
    
    # Metadata
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.scenario_files is None:
            self.scenario_files = {}
        if self.validation_results is None:
            self.validation_results = {}
        if self.metadata is None:
            self.metadata = {}
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()


class WorkflowManager:
    """Central orchestrator for multi-step scenario operations"""
    
    def __init__(self):
        self.active_workflows: Dict[str, WorkflowState] = {}
        self.workflows: Dict[str, WorkflowState] = {}  # Alias for active_workflows
        self.temp_dir = Path(tempfile.mkdtemp(prefix="workflow_"))
        self.cleanup_interval = timedelta(hours=24)  # Clean up old workflows
        
        # Make sure both attributes point to the same dict
        self.workflows = self.active_workflows
        
    def create_workflow(self, parameters: ScenarioParameters) -> str:
        """Create a new workflow session"""
        session_id = str(uuid.uuid4())
        
        workflow = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.PENDING,
            current_step=None,
            progress=0.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            parameters=parameters
        )
        
        self.workflows[session_id] = workflow
        return session_id
    
    def get_workflow(self, session_id: str) -> Optional[WorkflowState]:
        """Get workflow state by session ID"""
        return self.workflows.get(session_id)
    
    def update_workflow(self, session_id: str, **kwargs) -> bool:
        """Update workflow state"""
        if session_id not in self.workflows:
            return False
        
        workflow = self.workflows[session_id]
        for key, value in kwargs.items():
            if hasattr(workflow, key):
                setattr(workflow, key, value)
        
        workflow.updated_at = datetime.now()
        return True
    
    async def execute_generate_and_validate(self, session_id: str) -> WorkflowState:
        """Execute generation followed by automatic validation"""
        workflow = self.get_workflow(session_id)
        if not workflow:
            raise ValueError(f"Workflow {session_id} not found")
        
        try:
            # Step 1: Generation
            await self._execute_generation_step(workflow)
            
            # Step 2: Validation
            await self._execute_validation_step(workflow)
            
            # Mark as ready for visualization
            self.update_workflow(
                session_id,
                status=WorkflowStatus.READY,
                current_step=None,
                progress=1.0
            )
            
            return workflow
            
        except Exception as e:
            self.update_workflow(
                session_id,
                status=WorkflowStatus.FAILED,
                error_message=str(e),
                error_step=workflow.current_step
            )
            raise
    
    async def execute_complete_workflow(self, session_id: str) -> WorkflowState:
        """Execute full workflow: generation → validation → visualization prep"""
        workflow = self.get_workflow(session_id)
        if not workflow:
            raise ValueError(f"Workflow {session_id} not found")
        
        try:
            # Step 1: Generation
            await self._execute_generation_step(workflow)
            
            # Step 2: Validation
            await self._execute_validation_step(workflow)
            
            # Step 3: Visualization Preparation
            await self._execute_visualization_prep_step(workflow)
            
            # Mark as completed
            self.update_workflow(
                session_id,
                status=WorkflowStatus.COMPLETED,
                current_step=None,
                progress=1.0
            )
            
            return workflow
            
        except Exception as e:
            self.update_workflow(
                session_id,
                status=WorkflowStatus.FAILED,
                error_message=str(e),
                error_step=workflow.current_step
            )
            raise
    
    async def _execute_generation_step(self, workflow: WorkflowState):
        """Execute scenario generation step"""
        self.update_workflow(
            workflow.session_id,
            status=WorkflowStatus.GENERATING,
            current_step=WorkflowStep.GENERATION,
            progress=0.1
        )
        
        try:
            # Generate scenario files (using mock for demo until pyoscx issues are resolved)
            print("Using mock generation for demo (pyoscx API compatibility issues)")
            files = self._mock_generate_scenario_files(workflow.parameters)
            
            # Store files in workflow
            workflow.scenario_files = files
            
            self.update_workflow(
                workflow.session_id,
                status=WorkflowStatus.GENERATED,
                scenario_files=files,
                progress=0.4
            )
            
            # Save files to disk for internal management
            await self._save_files_to_disk(workflow.session_id, files)
            
        except Exception as e:
            raise Exception(f"Generation failed: {str(e)}")
    
    async def _execute_validation_step(self, workflow: WorkflowState):
        """Execute validation step"""
        self.update_workflow(
            workflow.session_id,
            status=WorkflowStatus.VALIDATING,
            current_step=WorkflowStep.VALIDATION,
            progress=0.5
        )
        
        try:
            validation_results = {}
            
            # Find .xosc and .xodr files
            xosc_files = {k: v for k, v in workflow.scenario_files.items() if k.endswith('.xosc')}
            xodr_files = {k: v for k, v in workflow.scenario_files.items() if k.endswith('.xodr')}
            
            # Validate individual files
            for filename, content in workflow.scenario_files.items():
                if filename.endswith('.xosc'):
                    result = validation_service.validate_openscenario(content)
                elif filename.endswith('.xodr'):
                    result = validation_service.validate_opendrive(content)
                else:
                    continue  # Skip non-scenario files
                
                validation_results[filename] = {
                    "is_valid": result.is_valid,
                    "issues": [asdict(issue) for issue in result.issues],
                    "total_errors": result.total_errors,
                    "total_warnings": result.total_warnings,
                    "total_info": result.total_info
                }
            
            # Perform cross-validation if we have both files
            if xosc_files and xodr_files:
                xosc_content = list(xosc_files.values())[0]
                xodr_content = list(xodr_files.values())[0]
                
                pair_result = validation_service.validate_scenario_pair(xosc_content, xodr_content)
                validation_results["cross_validation"] = {
                    "is_valid": pair_result.is_valid,
                    "issues": [asdict(issue) for issue in pair_result.issues],
                    "total_errors": pair_result.total_errors,
                    "total_warnings": pair_result.total_warnings,
                    "total_info": pair_result.total_info
                }
            
            # Store validation results
            workflow.validation_results = validation_results
            
            self.update_workflow(
                workflow.session_id,
                status=WorkflowStatus.VALIDATED,
                validation_results=validation_results,
                progress=0.8
            )
            
        except Exception as e:
            raise Exception(f"Validation failed: {str(e)}")
    
    async def _execute_visualization_prep_step(self, workflow: WorkflowState):
        """Prepare data for 3D visualization"""
        self.update_workflow(
            workflow.session_id,
            current_step=WorkflowStep.VISUALIZATION_PREP,
            progress=0.9
        )
        
        try:
            # Extract visualization metadata
            viz_metadata = {}
            
            # Extract road network information from OpenDRIVE
            xodr_files = {k: v for k, v in workflow.scenario_files.items() if k.endswith('.xodr')}
            if xodr_files:
                xodr_content = list(xodr_files.values())[0]
                viz_metadata["road_network"] = await self._extract_road_metadata(xodr_content)
            
            # Extract scenario information from OpenSCENARIO
            xosc_files = {k: v for k, v in workflow.scenario_files.items() if k.endswith('.xosc')}
            if xosc_files:
                xosc_content = list(xosc_files.values())[0]
                viz_metadata["scenario_data"] = await self._extract_scenario_metadata(xosc_content)
            
            # Add validation highlights
            viz_metadata["validation_highlights"] = await self._extract_validation_highlights(workflow)
            
            # Store visualization metadata
            if workflow.metadata is None:
                workflow.metadata = {}
            workflow.metadata["visualization"] = viz_metadata
            
            self.update_workflow(
                workflow.session_id,
                metadata=workflow.metadata,
                progress=0.95
            )
            
        except Exception as e:
            raise Exception(f"Visualization preparation failed: {str(e)}")
    
    async def _save_files_to_disk(self, session_id: str, files: Dict[str, str]):
        """Save generated files to disk for internal management"""
        session_dir = self.temp_dir / session_id
        session_dir.mkdir(exist_ok=True)
        
        for filename, content in files.items():
            file_path = session_dir / filename
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
    
    async def _extract_road_metadata(self, xodr_content: str) -> Dict[str, Any]:
        """Extract road network metadata for visualization"""
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(xodr_content)
            
            metadata = {
                "roads": [],
                "junctions": [],
                "bounds": {"min_x": 0, "max_x": 0, "min_y": 0, "max_y": 0}
            }
            
            # Extract road information
            for road in root.findall('.//road'):
                road_info = {
                    "id": road.get("id", ""),
                    "name": road.get("name", ""),
                    "length": float(road.get("length", 0)),
                    "junction": road.get("junction", "-1")
                }
                metadata["roads"].append(road_info)
            
            # Extract junction information
            for junction in root.findall('.//junction'):
                junction_info = {
                    "id": junction.get("id", ""),
                    "name": junction.get("name", "")
                }
                metadata["junctions"].append(junction_info)
            
            return metadata
            
        except Exception as e:
            return {"error": f"Failed to extract road metadata: {str(e)}"}
    
    async def _extract_scenario_metadata(self, xosc_content: str) -> Dict[str, Any]:
        """Extract scenario metadata for visualization"""
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(xosc_content)
            
            metadata = {
                "entities": [],
                "events": [],
                "initial_conditions": []
            }
            
            # Extract entities
            for obj in root.findall('.//ScenarioObject'):
                entity_info = {
                    "name": obj.get("name", ""),
                    "type": "unknown"
                }
                
                vehicle = obj.find('.//Vehicle')
                if vehicle is not None:
                    entity_info["type"] = "vehicle"
                    entity_info["category"] = vehicle.get("vehicleCategory", "")
                
                metadata["entities"].append(entity_info)
            
            # Extract events
            for event in root.findall('.//Event'):
                event_info = {
                    "name": event.get("name", ""),
                    "priority": event.get("priority", "")
                }
                metadata["events"].append(event_info)
            
            return metadata
            
        except Exception as e:
            return {"error": f"Failed to extract scenario metadata: {str(e)}"}
    
    async def _extract_validation_highlights(self, workflow: WorkflowState) -> List[Dict[str, Any]]:
        """Extract validation issues for 3D highlighting"""
        highlights = []
        
        if workflow.validation_results:
            for filename, result in workflow.validation_results.items():
                if isinstance(result, dict) and "issues" in result:
                    for issue in result["issues"]:
                        if issue.get("level") == "ERROR":
                            highlight = {
                                "type": "error",
                                "message": issue.get("message", ""),
                                "file": filename,
                                "line": issue.get("line_number"),
                                "xpath": issue.get("xpath")
                            }
                            highlights.append(highlight)
        
        return highlights
    
    def _mock_generate_scenario_files(self, parameters: ScenarioParameters) -> Dict[str, str]:
        """Generate mock scenario files when real generator is not available"""
        scenario_name = getattr(parameters, 'scenario_name', 'scenario') or 'mock_scenario'
        
        # Generate basic OpenSCENARIO content
        xosc_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="2025-01-25" description="{parameters.description}"/>
  <ParameterDeclarations/>
  <CatalogLocations/>
  <RoadNetwork>
    <LogicFile filepath="{scenario_name}.xodr"/>
  </RoadNetwork>
  <Entities>'''

        # Add vehicles from parameters
        if hasattr(parameters, 'vehicles') and parameters.vehicles:
            for vehicle in parameters.vehicles:
                xosc_content += f'''
    <ScenarioObject name="{vehicle.name}">
      <Vehicle name="{vehicle.category}" vehicleCategory="{vehicle.category}">
        <Performance maxSpeed="{vehicle.performance.max_speed}" maxDeceleration="{vehicle.performance.max_deceleration}" maxAcceleration="{vehicle.performance.max_acceleration}"/>
        <BoundingBox>
          <Center x="0" y="0" z="0"/>
          <Dimensions width="{vehicle.bounding_box.width}" length="{vehicle.bounding_box.length}" height="{vehicle.bounding_box.height}"/>
        </BoundingBox>
        <Axles>
          <FrontAxle maxSteering="0.5" wheelDiameter="0.8" trackWidth="1.68" positionX="2.98" positionZ="0.4"/>
          <RearAxle maxSteering="0" wheelDiameter="0.8" trackWidth="1.68" positionX="0" positionZ="0.4"/>
        </Axles>
      </Vehicle>
    </ScenarioObject>'''
        else:
            # Default vehicle if none specified
            xosc_content += '''
    <ScenarioObject name="Ego">
      <Vehicle name="car" vehicleCategory="car">
        <Performance maxSpeed="69.4" maxDeceleration="9.0" maxAcceleration="3.0"/>
        <BoundingBox>
          <Center x="0" y="0" z="0"/>
          <Dimensions width="1.8" length="4.5" height="1.5"/>
        </BoundingBox>
        <Axles>
          <FrontAxle maxSteering="0.5" wheelDiameter="0.8" trackWidth="1.68" positionX="2.98" positionZ="0.4"/>
          <RearAxle maxSteering="0" wheelDiameter="0.8" trackWidth="1.68" positionX="0" positionZ="0.4"/>
        </Axles>
      </Vehicle>
    </ScenarioObject>'''

        xosc_content += '''
  </Entities>
  <Storyboard>
    <Init>
      <Actions>
        <GlobalAction>
          <EnvironmentAction>
            <Environment name="Environment">
              <TimeOfDay animation="false" dateTime="2024-01-01T12:00:00"/>
              <Weather cloudState="free">
                <Sun intensity="1.0" azimuth="0" elevation="1.571"/>
                <Fog visualRange="100000.0"/>
                <Precipitation precipitationType="dry" intensity="0.0"/>
              </Weather>
              <RoadCondition frictionScaleFactor="1.0"/>
            </Environment>
          </EnvironmentAction>
        </GlobalAction>
        <Private entityRef="Ego">
          <PrivateAction>
            <TeleportAction>
              <Position>
                <LanePosition roadId="1" laneId="-1" s="10.0" offset="0.0">
                  <Orientation type="relative" h="0.0" p="0.0" r="0.0"/>
                </LanePosition>
              </Position>
            </TeleportAction>
          </PrivateAction>
        </Private>
      </Actions>
    </Init>
    <Story name="MyStory">
      <Act name="MyAct">
        <ManeuverGroup maximumExecutionCount="1" name="MySequence">
          <Actors selectTriggeringEntities="false">
            <EntityRef entityRef="Ego"/>
          </Actors>
        </ManeuverGroup>
        <StartTrigger>
          <ConditionGroup>
            <Condition name="OverallStartCondition" delay="0" conditionEdge="rising">
              <ByValueCondition>
                <SimulationTimeCondition value="0" rule="greaterThan"/>
              </ByValueCondition>
            </Condition>
          </ConditionGroup>
        </StartTrigger>
      </Act>
    </Story>
    <StopTrigger>
      <ConditionGroup>
        <Condition name="OverallStopCondition" delay="0" conditionEdge="rising">
          <ByValueCondition>
            <SimulationTimeCondition value="10.0" rule="greaterThan"/>
          </ByValueCondition>
        </Condition>
      </ConditionGroup>
    </StopTrigger>
  </Storyboard>
</OpenSCENARIO>'''

        # Generate basic OpenDRIVE content
        xodr_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="7" name="{scenario_name}" version="1.0" date="2025-01-25" north="0" south="0" east="1000" west="0" vendor="MockGenerator"/>
  <road name="Road1" length="1000.0" id="1" junction="-1">
    <link/>
    <planView>
      <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="1000.0">
        <line/>
      </geometry>
    </planView>
    <elevationProfile>
      <elevation s="0" a="0" b="0" c="0" d="0"/>
    </elevationProfile>
    <lateralProfile/>
    <lanes>
      <laneSection s="0">
        <center>
          <lane id="0" type="driving" level="true">
            <link/>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="solid" weight="standard" color="standard" width="0.13"/>
          </lane>
        </center>
        <right>
          <lane id="-1" type="driving" level="true">
            <link/>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="broken" weight="standard" color="standard" width="0.13"/>
          </lane>
          <lane id="-2" type="driving" level="true">
            <link/>
            <width sOffset="0" a="3.5" b="0" c="0" d="0"/>
            <roadMark sOffset="0" type="solid" weight="standard" color="standard" width="0.13"/>
          </lane>
        </right>
      </laneSection>
    </lanes>
  </road>
</OpenDRIVE>'''

        return {
            f"{scenario_name}.xosc": xosc_content,
            f"{scenario_name}.xodr": xodr_content
        }
    
    async def start_complete_workflow(self, session_id: str, parameters: ScenarioParameters, 
                                    auto_validate: bool = True, prepare_visualization: bool = True,
                                    validation_level: str = "enhanced") -> WorkflowState:
        """Start a complete workflow with given parameters"""
        # Create workflow state
        workflow = WorkflowState(
            session_id=session_id,
            status=WorkflowStatus.PENDING,
            current_step=None,
            progress=0.0,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            parameters=parameters
        )
        
        # Store workflow
        self.workflows[session_id] = workflow
        
        # Start background execution
        asyncio.create_task(self._background_complete_workflow(session_id, auto_validate, prepare_visualization))
        
        return workflow
    
    async def _background_complete_workflow(self, session_id: str, auto_validate: bool, prepare_visualization: bool):
        """Execute complete workflow in background"""
        try:
            if auto_validate and prepare_visualization:
                await self.execute_complete_workflow(session_id)
            elif auto_validate:
                await self.execute_generate_and_validate(session_id)
            else:
                # Just generation
                workflow = self.get_workflow(session_id)
                if workflow:
                    await self._execute_generation_step(workflow)
                    self.update_workflow(session_id, status=WorkflowStatus.READY, progress=1.0)
        except Exception as e:
            print(f"Background complete workflow execution failed: {e}")
            self.update_workflow(
                session_id,
                status=WorkflowStatus.ERROR,
                error_message=str(e)
            )
    
    
    
    def cleanup_old_workflows(self):
        """Clean up workflows older than cleanup_interval"""
        cutoff_time = datetime.now() - self.cleanup_interval
        to_remove = []
        
        for session_id, workflow in self.workflows.items():
            if workflow.created_at < cutoff_time:
                to_remove.append(session_id)
        
        for session_id in to_remove:
            self._cleanup_workflow(session_id)
    
    def _cleanup_workflow(self, session_id: str):
        """Clean up a specific workflow"""
        # Remove from memory
        if session_id in self.workflows:
            del self.workflows[session_id]
        
        # Remove temporary files
        session_dir = self.temp_dir / session_id
        if session_dir.exists():
            import shutil
            shutil.rmtree(session_dir, ignore_errors=True)
    
    def get_workflow_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of workflow state for API responses"""
        workflow = self.get_workflow(session_id)
        if not workflow:
            return None
        
        return {
            "session_id": workflow.session_id,
            "status": workflow.status,
            "current_step": workflow.current_step,
            "progress": workflow.progress,
            "created_at": workflow.created_at.isoformat() if workflow.created_at else datetime.now().isoformat(),
            "updated_at": workflow.updated_at.isoformat() if workflow.updated_at else datetime.now().isoformat(),
            "has_files": bool(workflow.scenario_files),
            "has_validation": bool(workflow.validation_results),
            "error_message": workflow.error_message,
            "error_step": workflow.error_step,
            "file_count": len(workflow.scenario_files) if workflow.scenario_files else 0
        }
    
    # Methods expected by tests
    async def generate_and_validate(self, request) -> str:
        """Generate and validate scenario based on WorkflowRequest"""
        try:
            # Create workflow
            session_id = self.create_workflow(request.parameters)
            
            # Update status to running
            self.update_workflow(session_id, status=WorkflowStatus.RUNNING)
            
            # Execute generation and validation in background
            asyncio.create_task(self._background_generate_and_validate(session_id))
            
            return session_id
            
        except Exception as e:
            # Create error session
            session_id = str(uuid.uuid4())
            workflow = WorkflowState(
                session_id=session_id,
                status=WorkflowStatus.ERROR,
                current_step=None,
                progress=0.0,
                error_message=str(e)
            )
            self.active_workflows[session_id] = workflow
            return session_id
    
    async def _background_generate_and_validate(self, session_id: str):
        """Execute generation and validation in background"""
        try:
            await self.execute_generate_and_validate(session_id)
        except Exception as e:
            print(f"Background workflow execution failed: {e}")
            self.update_workflow(
                session_id,
                status=WorkflowStatus.ERROR,
                error_message=str(e)
            )
    
    async def get_workflow_status(self, session_id: str) -> Optional[WorkflowState]:
        """Get workflow status by session ID"""
        return self.get_workflow(session_id)
    
    async def complete_workflow(self, session_id: str) -> Optional[WorkflowState]:
        """Complete a workflow"""
        workflow = self.get_workflow(session_id)
        if not workflow:
            return None
        
        try:
            # Update status to completed
            self.update_workflow(
                session_id,
                status=WorkflowStatus.COMPLETED,
                progress=1.0
            )
            return workflow
        except Exception:
            return None
    
    async def cleanup_session(self, session_id: str):
        """Clean up a workflow session"""
        if session_id in self.active_workflows:
            del self.active_workflows[session_id]


    

# Global workflow manager instance
workflow_manager = WorkflowManager()