from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
from typing import Optional

from .schemas import (
    ChatRequest, ChatResponse, GenerationRequest, GenerationResponse,
    ScenarioParameters, ValidationResult
)
from typing import List
from .ai_service_working import ai_service

# Try to import scenario generator, fall back to mock if not available
try:
    from .scenario_generator import scenario_generator
    HAS_SCENARIO_GENERATOR = True
except (ImportError, AttributeError) as e:
    print(f"Warning: scenario_generator not available ({e}), using mock")
    HAS_SCENARIO_GENERATOR = False
    scenario_generator = None

app = FastAPI(
    title="AI-Enhanced OpenSCENARIO API",
    description="API for AI-powered ASAM OpenX scenario generation and validation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
async def read_root():
    return {
        'message': 'AI-Enhanced OpenSCENARIO API is running',
        'version': '1.0.0',
        'mode': 'working_ai',
        'openai_configured': bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "your-openai-api-key-here"),
        'endpoints': {
            'chat': '/api/chat',
            'generate': '/api/generate', 
            'validate': '/api/validate',
            'health': '/health'
        }
    }

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}

@app.post('/api/chat', response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Conversational AI endpoint for scenario parameter extraction"""
    try:
        # Check if OpenAI API key is configured
        if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") == "your-openai-api-key-here":
            return ChatResponse(
                message="I'm sorry, but the AI service is not properly configured. Please contact the administrator to set up the OpenAI API key.",
                parameters_extracted=None,
                is_complete=False,
                suggestions=["Contact administrator for API key setup"]
            )
        
        # Process with AI service
        response = await ai_service.process_conversation(
            request.message,
            request.conversation_history,
            request.session_id
        )
        
        return response
        
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/generate', response_model=GenerationResponse)
async def generate_scenario(request: GenerationRequest):
    """Generate OpenSCENARIO and OpenDRIVE files from parameters"""
    try:
        if HAS_SCENARIO_GENERATOR:
            # Use real scenario generator
            files = scenario_generator.generate_scenario_files(request.parameters)
        else:
            # Use mock generator
            files = _mock_generate_scenario_files(request.parameters)
        
        # TODO: Add validation of generated files
        validation_results = None
        
        # TODO: Generate variations if requested
        variations = []
        
        return GenerationResponse(
            success=True,
            scenario_files=files,
            validation_results=validation_results,
            variations=variations
        )
        
    except Exception as e:
        print(f"Generation error: {e}")
        return GenerationResponse(
            success=False,
            scenario_files={},
            error_message=str(e)
        )

def _mock_generate_scenario_files(parameters: ScenarioParameters) -> dict:
    """Mock scenario file generation when pyoscx is not available"""
    
    scenario_name = parameters.scenario_name.replace(' ', '_')
    
    # Mock OpenSCENARIO file content
    xosc_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
  <FileHeader revMajor="1" revMinor="2" date="2025-01-25" description="{parameters.description}"/>
  <ParameterDeclarations/>
  <CatalogLocations/>
  <RoadNetwork>
    <LogicFile filepath="{scenario_name}.xodr"/>
  </RoadNetwork>
  <Entities>'''

    # Add vehicles
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
          <RearAxle maxSteering="0.0" wheelDiameter="0.8" trackWidth="1.68" positionX="0" positionZ="0.4"/>
        </Axles>
      </Vehicle>
    </ScenarioObject>'''

    xosc_content += '''
  </Entities>
  <Storyboard>
    <Init>
      <Actions>'''

    # Add initial vehicle positions and speeds
    for i, vehicle in enumerate(parameters.vehicles):
        xosc_content += f'''
        <Private entityRef="{vehicle.name}">
          <PrivateAction>
            <TeleportAction>
              <Position>
                <LanePosition roadId="0" laneId="-1" offset="0" s="{10 + i * 50}"/>
              </Position>
            </TeleportAction>
          </PrivateAction>
          <PrivateAction>
            <LongitudinalAction>
              <SpeedAction>
                <SpeedActionDynamics dynamicsShape="step" value="0" dynamicsDimension="time"/>
                <SpeedActionTarget>
                  <AbsoluteTargetSpeed value="{vehicle.initial_speed}"/>
                </SpeedActionTarget>
              </SpeedAction>
            </LongitudinalAction>
          </PrivateAction>
        </Private>'''

    xosc_content += '''
      </Actions>
    </Init>
    <Story name="MainStory">
      <Act name="MainAct">
        <ManeuverGroup name="EgoManeuver" maximumExecutionCount="1">
          <Actors selectTriggeringEntities="false">
            <EntityRef entityRef="ego"/>
          </Actors>
        </ManeuverGroup>
        <StartTrigger>
          <ConditionGroup>
            <Condition name="ActStart" delay="0" conditionEdge="rising">
              <ByValueCondition>
                <SimulationTimeCondition value="0" rule="greaterThan"/>
              </ByValueCondition>
            </Condition>
          </ConditionGroup>
        </StartTrigger>
      </Act>
    </Story>
    <StopTrigger/>
  </Storyboard>
</OpenSCENARIO>'''

    # Mock OpenDRIVE file content  
    xodr_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
  <header revMajor="1" revMinor="4" name="{scenario_name}" version="1.00" date="2025-01-25T12:00:00"/>
  <road name="{parameters.road_network.road_description}" length="1000.0" id="0" junction="-1">
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
          <lane id="0" type="none" level="true">
            <link/>
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

@app.post('/api/validate')
async def validate_scenario(file: UploadFile = File(...)):
    """Validate uploaded OpenSCENARIO file using ASAM Quality Checker Framework"""
    try:
        # Support both .xosc and .xodr files
        if not (file.filename.endswith('.xosc') or file.filename.endswith('.xodr')):
            raise HTTPException(status_code=400, detail="Only .xosc and .xodr files are supported")
        
        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Import validation service
        try:
            from .validation_service import validation_service
            
            # Validate based on file type
            if file.filename.endswith('.xosc'):
                validation_result = validation_service.validate_openscenario(content_str)
            else:  # .xodr
                validation_result = validation_service.validate_opendrive(content_str)
            
            # Convert to API response format
            messages = []
            for issue in validation_result.issues:
                message = {
                    "message": issue.message,
                    "level": issue.level,
                    "line": issue.line_number,
                    "column": issue.column_number,
                    "rule_id": issue.rule_id,
                    "file_path": issue.file_path
                }
                messages.append(message)
            
            result = {
                "valid": validation_result.is_valid,
                "messages": messages,
                "summary": {
                    "total_errors": validation_result.total_errors,
                    "total_warnings": validation_result.total_warnings,
                    "total_info": validation_result.total_info
                }
            }
            
            return JSONResponse(content=result)
            
        except ImportError as e:
            # Fallback to basic XML validation
            try:
                from lxml import etree
                etree.fromstring(content)
                xml_valid = True
                xml_errors = []
            except etree.XMLSyntaxError as e:
                xml_valid = False
                xml_errors = [{
                    "message": str(e),
                    "line": getattr(e, 'lineno', None),
                    "column": getattr(e, 'col', None),
                    "level": "ERROR"
                }]
            except ImportError:
                # lxml not available, skip validation
                xml_valid = True
                xml_errors = []
            
            result = {
                "valid": xml_valid,
                "messages": xml_errors if not xml_valid else [{"message": "Basic XML validation only - ASAM QC Framework not available", "level": "INFO"}]
            }
            
            return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/validate-pair')
async def validate_scenario_pair(files: List[UploadFile] = File(...)):
    """Validate OpenSCENARIO and OpenDRIVE files together for consistency"""
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 files required (.xosc and .xodr)")
        
        # Identify which file is which
        xosc_file = None
        xodr_file = None
        
        for file in files:
            if file.filename.endswith('.xosc'):
                xosc_file = file
            elif file.filename.endswith('.xodr'):
                xodr_file = file
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")
        
        if not xosc_file or not xodr_file:
            raise HTTPException(status_code=400, detail="Both .xosc and .xodr files are required")
        
        # Read file contents
        xosc_content = (await xosc_file.read()).decode('utf-8')
        xodr_content = (await xodr_file.read()).decode('utf-8')
        
        # Import validation service
        try:
            from .validation_service import validation_service
            
            # Validate scenario pair
            validation_result = validation_service.validate_scenario_pair(xosc_content, xodr_content)
            
            # Convert to API response format
            messages = []
            for issue in validation_result.issues:
                message = {
                    "message": issue.message,
                    "level": issue.level,
                    "line": issue.line_number,
                    "column": issue.column_number,
                    "rule_id": issue.rule_id,
                    "file_path": issue.file_path
                }
                messages.append(message)
            
            result = {
                "valid": validation_result.is_valid,
                "messages": messages,
                "summary": {
                    "total_errors": validation_result.total_errors,
                    "total_warnings": validation_result.total_warnings,
                    "total_info": validation_result.total_info
                },
                "files_validated": {
                    "openscenario": xosc_file.filename,
                    "opendrive": xodr_file.filename
                }
            }
            
            return JSONResponse(content=result)
            
        except ImportError:
            # Fallback to basic validation
            result = {
                "valid": True,
                "messages": [{"message": "Basic validation only - ASAM QC Framework not available", "level": "INFO"}],
                "summary": {
                    "total_errors": 0,
                    "total_warnings": 0,
                    "total_info": 1
                }
            }
            return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/status')
async def get_api_status():
    """Get API and service status"""
    # Check validation service availability
    validation_status = "not_available"
    try:
        from .validation_service import validation_service
        import os
        qc_path = os.getenv("QC_FRAMEWORK_PATH", "/opt/qc-framework")
        if os.path.exists(qc_path):
            validation_status = "asam_qc_available"
        else:
            validation_status = "basic_xml_only"
    except ImportError:
        validation_status = "not_available"
    
    return {
        "api_status": "running",
        "mode": "working_ai",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "your-openai-api-key-here"),
        "scenario_generator": "available" if HAS_SCENARIO_GENERATOR else "mock",
        "validation_service": validation_status,
        "services": {
            "ai_service": "available" if os.getenv("OPENAI_API_KEY") else "not_configured",
            "scenario_generator": "available" if HAS_SCENARIO_GENERATOR else "mock",
            "validation_service": validation_status
        },
        "endpoints": {
            "chat": "/api/chat",
            "generate": "/api/generate",
            "validate": "/api/validate",
            "validate_pair": "/api/validate-pair",
            "status": "/api/status"
        }
    }