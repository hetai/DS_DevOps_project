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
from .ai_service import ai_service
from .scenario_generator import scenario_generator
from .rag_service import rag_service

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

# Initialize RAG service on startup
@app.on_event("startup")
def startup_event():
    """Initialize services on startup"""
    print("Initializing RAG knowledge base...")
    # Note: RAG initialization moved to background task to avoid blocking startup
    print("RAG knowledge base will initialize in background")

@app.get('/')
async def read_root():
    return {
        'message': 'AI-Enhanced OpenSCENARIO API is running',
        'version': '1.0.0',
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
        # Get NCAP context if RAG is available
        ncap_context = ""
        if rag_service.scenarios_indexed:
            ncap_context = await rag_service.get_ncap_context(request.message)
        
        # Add NCAP context to conversation if available
        enhanced_message = request.message
        if ncap_context and "No similar NCAP scenarios found" not in ncap_context:
            enhanced_message += f"\n\nFor reference, here are similar NCAP scenarios:\n{ncap_context}"
        
        # Process with AI service
        response = await ai_service.process_conversation(
            enhanced_message,
            request.conversation_history,
            request.session_id
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/api/generate', response_model=GenerationResponse)
async def generate_scenario(request: GenerationRequest):
    """Generate OpenSCENARIO and OpenDRIVE files from parameters"""
    try:
        # Generate scenario files
        files = scenario_generator.generate_scenario_files(request.parameters)
        
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
        return GenerationResponse(
            success=False,
            scenario_files={},
            error_message=str(e)
        )

@app.post('/api/validate')
async def validate_scenario(file: UploadFile = File(...)):
    """Validate uploaded OpenSCENARIO file"""
    try:
        if not file.filename.endswith('.xosc'):
            raise HTTPException(status_code=400, detail="Only .xosc files are supported")
        
        # Read file content
        content = await file.read()
        
        # TODO: Implement actual validation using ASAM Quality Checker
        # For now, return a mock validation result
        
        # Basic XML validation
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
        
        # Mock validation result
        result = {
            "valid": xml_valid,
            "messages": xml_errors if not xml_valid else []
        }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/scenarios/search')
async def search_scenarios(query: str, limit: int = 5):
    """Search NCAP scenarios by query"""
    try:
        if not rag_service.scenarios_indexed:
            return {"scenarios": [], "message": "Knowledge base not initialized"}
        
        scenarios = await rag_service.search_similar_scenarios(query, limit)
        return {"scenarios": scenarios}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/status')
async def get_api_status():
    """Get API and service status"""
    return {
        "api_status": "running",
        "rag_initialized": rag_service.scenarios_indexed,
        "services": {
            "ai_service": "available",
            "scenario_generator": "available",
            "rag_service": "available" if rag_service.scenarios_indexed else "initializing"
        }
    }