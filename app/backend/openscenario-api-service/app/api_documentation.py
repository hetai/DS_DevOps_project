"""
OpenAPI Documentation Enhancement
Provides comprehensive API documentation with examples and detailed descriptions
"""

from typing import Dict, Any, List
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

def get_enhanced_openapi_schema(app: FastAPI) -> Dict[str, Any]:
    """
    Generate enhanced OpenAPI schema with comprehensive documentation
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="AI-Enhanced OpenSCENARIO API",
        version="1.0.0",
        description="""
# AI-Enhanced ASAM OpenX Scenario Generation API

This API provides AI-powered conversational scenario generation and validation for ASAM OpenX standards (OpenSCENARIO and OpenDRIVE).

## Features

- **🤖 Conversational AI**: Natural language scenario description using OpenAI GPT-4
- **🔧 Scenario Generation**: Real OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) file generation using pyoscx
- **✅ Comprehensive Validation**: ASAM Quality Checker Framework integration with multiple validation levels
- **🎯 Integrated Workflow**: Seamless generation → validation → visualization pipeline
- **📊 3D Visualization Support**: Metadata preparation for Three.js-based 3D rendering
- **🧪 NCAP Compliance**: Euro NCAP test scenario generation and validation

## API Usage Flow

1. **Chat with AI** (`/api/chat`) - Describe your scenario in natural language
2. **Generate Scenario** (`/api/generate`) - Create OpenSCENARIO/OpenDRIVE files
3. **Validate Files** (`/api/validate` or `/api/validate-pair`) - Ensure ASAM compliance
4. **Integrated Workflow** (`/api/workflow/*`) - Execute complete pipeline automatically

## Authentication

Currently no authentication required. API is designed for internal use with proper network security.

## Rate Limits

- Chat endpoints: Limited by OpenAI API quotas
- Generation endpoints: No specific limits
- Validation endpoints: No specific limits

## Error Handling

All endpoints return structured error responses with:
- HTTP status codes (400, 404, 422, 500)
- Detailed error messages
- Context-specific error information
        """,
        routes=app.routes,
        tags=[
            {
                "name": "Core",
                "description": "Basic API status and health endpoints"
            },
            {
                "name": "Chat",
                "description": "Conversational AI for scenario parameter extraction"
            },
            {
                "name": "Generation", 
                "description": "OpenSCENARIO and OpenDRIVE file generation"
            },
            {
                "name": "Validation",
                "description": "ASAM OpenX file validation using Quality Checker Framework"
            },
            {
                "name": "Workflow",
                "description": "Integrated scenario workflow management"
            }
        ]
    )
    
    # Enhance endpoint documentation
    enhance_endpoint_documentation(openapi_schema)
    
    # Add response examples
    add_response_examples(openapi_schema)
    
    # Add security schemes (future use)
    add_security_schemes(openapi_schema)
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

def enhance_endpoint_documentation(schema: Dict[str, Any]) -> None:
    """Add detailed documentation to endpoints"""
    
    paths = schema.get("paths", {})
    
    # Root endpoint
    if "/" in paths:
        paths["/"]["get"]["tags"] = ["Core"]
        paths["/"]["get"]["summary"] = "API Information"
        paths["/"]["get"]["description"] = "Get basic API information, version, and available endpoints"
    
    # Health check
    if "/health" in paths:
        paths["/health"]["get"]["tags"] = ["Core"]
        paths["/health"]["get"]["summary"] = "Health Check"
        paths["/health"]["get"]["description"] = "Simple health check endpoint for monitoring"
    
    # Chat endpoint
    if "/api/chat" in paths:
        paths["/api/chat"]["post"]["tags"] = ["Chat"]
        paths["/api/chat"]["post"]["summary"] = "Conversational AI Chat"
        paths["/api/chat"]["post"]["description"] = """
        Engage in natural language conversation to extract scenario parameters.
        
        The AI assistant will:
        - Ask clarifying questions about your scenario
        - Extract technical parameters from natural language
        - Determine when enough information is collected
        - Provide suggestions for scenario improvements
        
        **Example conversation flow:**
        1. User: "Create a highway overtaking scenario"
        2. AI: "I'd like to help you create a highway overtaking scenario. Could you tell me more about..."
        3. User provides details about vehicles, speeds, conditions
        4. AI extracts parameters and asks for missing information
        5. When complete, `is_complete` becomes `true` and `parameters_extracted` contains full scenario data
        """
    
    # Generation endpoint
    if "/api/generate" in paths:
        paths["/api/generate"]["post"]["tags"] = ["Generation"]
        paths["/api/generate"]["post"]["summary"] = "Generate Scenario Files"
        paths["/api/generate"]["post"]["description"] = """
        Generate OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files from scenario parameters.
        
        Uses the pyoscx library for ASAM-compliant file generation:
        - Creates realistic vehicle models with proper physics
        - Generates road networks (highways, intersections, custom roads)
        - Implements event and action systems
        - Supports multiple OpenSCENARIO versions
        
        **Input**: Complete scenario parameters from chat extraction
        **Output**: Dictionary of generated files (filename -> content)
        """
    
    # Validation endpoints
    if "/api/validate" in paths:
        paths["/api/validate"]["post"]["tags"] = ["Validation"]
        paths["/api/validate"]["post"]["summary"] = "Validate Single File"
        paths["/api/validate"]["post"]["description"] = """
        Validate a single OpenSCENARIO (.xosc) or OpenDRIVE (.xodr) file.
        
        Validation levels (automatic detection):
        1. **ASAM QCF**: Full Quality Checker Framework validation (if available)
        2. **Enhanced XML**: Schema validation with domain-specific rules
        3. **Basic XML**: Fallback XML syntax validation
        
        **Supported files**: .xosc, .xodr
        **Output**: Validation results with error details, line numbers, and rule IDs
        """
    
    if "/api/validate-pair" in paths:
        paths["/api/validate-pair"]["post"]["tags"] = ["Validation"] 
        paths["/api/validate-pair"]["post"]["summary"] = "Validate File Pair"
        paths["/api/validate-pair"]["post"]["description"] = """
        Validate OpenSCENARIO and OpenDRIVE files together for cross-file consistency.
        
        Additional validation checks:
        - Road ID consistency between .xosc and .xodr
        - Lane reference validation
        - Entity positioning consistency
        - Network topology validation
        
        **Required**: Exactly 2 files (.xosc and .xodr)
        **Output**: Combined validation results for both files
        """
    
    # Workflow endpoints
    if "/api/workflow/generate-and-validate" in paths:
        paths["/api/workflow/generate-and-validate"]["post"]["tags"] = ["Workflow"]
        paths["/api/workflow/generate-and-validate"]["post"]["summary"] = "Generate and Validate Workflow"
        paths["/api/workflow/generate-and-validate"]["post"]["description"] = """
        Execute integrated workflow: Generation → Validation
        
        Workflow steps:
        1. Generate OpenSCENARIO and OpenDRIVE files from parameters
        2. Automatically validate generated files
        3. Return session ID for status polling
        
        **Use case**: When you want automatic validation after generation
        **Output**: Workflow session with real-time status tracking
        """
    
    if "/api/workflow/complete" in paths:
        paths["/api/workflow/complete"]["post"]["tags"] = ["Workflow"]
        paths["/api/workflow/complete"]["post"]["summary"] = "Complete Workflow"
        paths["/api/workflow/complete"]["post"]["description"] = """
        Complete a workflow session with visualization preparation.
        
        Additional steps:
        1. Prepare 3D visualization metadata
        2. Extract road network geometry
        3. Process validation results for visual highlighting
        
        **Use case**: When you want to visualize generated scenarios in 3D
        **Input**: Existing workflow session ID
        """
    
    if "/api/workflow/{session_id}/status" in paths:
        paths["/api/workflow/{session_id}/status"]["get"]["tags"] = ["Workflow"]
        paths["/api/workflow/{session_id}/status"]["get"]["summary"] = "Get Workflow Status"
        paths["/api/workflow/{session_id}/status"]["get"]["description"] = """
        Get current status and progress of a workflow session.
        
        **Status values**:
        - `pending`: Workflow created but not started
        - `in_progress`: Currently executing
        - `completed`: Successfully finished
        - `failed`: Error occurred
        
        **Use case**: Real-time progress monitoring in UI
        """
    
    if "/api/workflow/{session_id}/files" in paths:
        paths["/api/workflow/{session_id}/files"]["get"]["tags"] = ["Workflow"]
        paths["/api/workflow/{session_id}/files"]["get"]["summary"] = "Get Workflow Files"
        paths["/api/workflow/{session_id}/files"]["get"]["description"] = """
        Retrieve generated files from a completed workflow.
        
        **Returns**: Dictionary of filenames and content
        **Use case**: Download generated .xosc/.xodr files
        """
    
    if "/api/workflow/{session_id}/validation" in paths:
        paths["/api/workflow/{session_id}/validation"]["get"]["tags"] = ["Workflow"]
        paths["/api/workflow/{session_id}/validation"]["get"]["summary"] = "Get Workflow Validation"
        paths["/api/workflow/{session_id}/validation"]["get"]["description"] = """
        Retrieve validation results from a workflow session.
        
        **Returns**: Validation results for all generated files
        **Use case**: Display validation errors and warnings in UI
        """
    
    # Status endpoint
    if "/api/status" in paths:
        paths["/api/status"]["get"]["tags"] = ["Core"]
        paths["/api/status"]["get"]["summary"] = "Service Status"
        paths["/api/status"]["get"]["description"] = """
        Get comprehensive API and service status information.
        
        **Returns**:
        - API operational status
        - OpenAI configuration status
        - Scenario generator availability
        - Validation service capabilities
        - Available endpoints
        
        **Use case**: Service health monitoring and capability detection
        """

def add_response_examples(schema: Dict[str, Any]) -> None:
    """Add response examples to endpoints"""
    
    paths = schema.get("paths", {})
    
    # Chat endpoint example
    if "/api/chat" in paths and "post" in paths["/api/chat"]:
        chat_responses = paths["/api/chat"]["post"].setdefault("responses", {})
        if "200" in chat_responses:
            chat_responses["200"]["content"] = {
                "application/json": {
                    "schema": chat_responses["200"].get("content", {}).get("application/json", {}).get("schema", {}),
                    "examples": {
                        "initial_response": {
                            "summary": "Initial AI response",
                            "value": {
                                "message": "I'd like to help you create a highway overtaking scenario. Could you tell me more about the vehicles involved and their initial speeds?",
                                "parameters_extracted": None,
                                "is_complete": False,
                                "suggestions": [
                                    "What type of vehicles are involved? (car, truck, etc.)",
                                    "What are their initial speeds?",
                                    "What are the road conditions?"
                                ]
                            }
                        },
                        "complete_response": {
                            "summary": "Complete scenario extracted",
                            "value": {
                                "message": "Perfect! I have all the information needed to generate your highway overtaking scenario.",
                                "parameters_extracted": {
                                    "scenario_name": "Highway Overtaking Scenario",
                                    "description": "A sedan overtakes a slower truck on a 2-lane highway",
                                    "vehicles": [
                                        {
                                            "name": "ego",
                                            "category": "car",
                                            "initial_speed": 25.0
                                        }
                                    ]
                                },
                                "is_complete": True,
                                "suggestions": []
                            }
                        }
                    }
                }
            }
    
    # Generation endpoint example
    if "/api/generate" in paths and "post" in paths["/api/generate"]:
        gen_responses = paths["/api/generate"]["post"].setdefault("responses", {})
        if "200" in gen_responses:
            gen_responses["200"]["content"] = {
                "application/json": {
                    "schema": gen_responses["200"].get("content", {}).get("application/json", {}).get("schema", {}),
                    "examples": {
                        "successful_generation": {
                            "summary": "Successful file generation",
                            "value": {
                                "success": True,
                                "scenario_files": {
                                    "Highway_Overtaking_Scenario.xosc": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n<OpenSCENARIO>...",
                                    "Highway_Overtaking_Scenario.xodr": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\\n<OpenDRIVE>..."
                                },
                                "validation_results": None,
                                "variations": [],
                                "error_message": None
                            }
                        }
                    }
                }
            }
    
    # Validation endpoint example
    if "/api/validate" in paths and "post" in paths["/api/validate"]:
        val_responses = paths["/api/validate"]["post"].setdefault("responses", {})
        if "200" in val_responses:
            val_responses["200"]["content"] = {
                "application/json": {
                    "schema": val_responses["200"].get("content", {}).get("application/json", {}).get("schema", {}),
                    "examples": {
                        "valid_file": {
                            "summary": "Valid file result",
                            "value": {
                                "valid": True,
                                "messages": [],
                                "summary": {
                                    "total_errors": 0,
                                    "total_warnings": 0,
                                    "total_info": 1
                                }
                            }
                        },
                        "invalid_file": {
                            "summary": "Invalid file with errors",
                            "value": {
                                "valid": False,
                                "messages": [
                                    {
                                        "message": "Missing required attribute 'name' in Vehicle element",
                                        "level": "ERROR",
                                        "line": 15,
                                        "column": 8,
                                        "rule_id": "ASAM_OSC_001",
                                        "file_path": "scenario.xosc"
                                    }
                                ],
                                "summary": {
                                    "total_errors": 1,
                                    "total_warnings": 0,
                                    "total_info": 0
                                }
                            }
                        }
                    }
                }
            }

def add_security_schemes(schema: Dict[str, Any]) -> None:
    """Add security schemes for future authentication"""
    
    # Placeholder for future authentication
    components = schema.setdefault("components", {})
    components["securitySchemes"] = {
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API key authentication (future implementation)"
        },
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Bearer token authentication (future implementation)"
        }
    }

def setup_api_documentation(app: FastAPI) -> None:
    """
    Setup comprehensive API documentation for the FastAPI app
    """
    
    # Custom OpenAPI schema
    def custom_openapi():
        return get_enhanced_openapi_schema(app)
    
    app.openapi = custom_openapi
    
    # Update app metadata
    app.title = "AI-Enhanced OpenSCENARIO API"
    app.description = "API for AI-powered ASAM OpenX scenario generation and validation"
    app.version = "1.0.0"
    
    # Add tags metadata
    app.openapi_tags = [
        {
            "name": "Core",
            "description": "Basic API status and health endpoints"
        },
        {
            "name": "Chat", 
            "description": "Conversational AI for scenario parameter extraction"
        },
        {
            "name": "Generation",
            "description": "OpenSCENARIO and OpenDRIVE file generation using pyoscx"
        },
        {
            "name": "Validation",
            "description": "ASAM OpenX file validation using Quality Checker Framework"
        },
        {
            "name": "Workflow",
            "description": "Integrated scenario workflow management and orchestration"
        }
    ]