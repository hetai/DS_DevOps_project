"""Simple schemas for testing"""
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class WorkflowRequest(BaseModel):
    """Simple workflow request for testing"""
    description: str = Field(..., min_length=1)
    parameters: Dict[str, Any] = {}


class WorkflowResponse(BaseModel):
    """Workflow response schema"""
    session_id: str
    status: str
    current_step: str = None
    progress: float
    scenario_files: Dict[str, str] = None


class WorkflowSummary(BaseModel):
    """Workflow summary schema"""
    session_id: str
    status: str
    current_step: Optional[str] = None
    progress: float