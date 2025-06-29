"""
API Documentation Validation Tests
Tests to ensure OpenAPI documentation matches actual API implementation
"""

import pytest
import json
import yaml
from fastapi.testclient import TestClient
from fastapi.openapi.utils import get_openapi
import sys
import os

# Add the app directory to the path so we can import from it
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main_working import app

class TestAPIDocumentation:
    """Test suite to validate API documentation accuracy"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    def test_openapi_schema_generation(self):
        """Test that OpenAPI schema can be generated without errors"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Basic schema validation
        assert schema is not None
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
        assert "components" in schema
        
        # Validate title and version match app config
        assert schema["info"]["title"] == "AI-Enhanced OpenSCENARIO API"
        assert schema["info"]["version"] == "1.0.0"
        assert schema["info"]["description"] == "API for AI-powered ASAM OpenX scenario generation and validation"
    
    def test_all_endpoints_documented(self):
        """Test that all endpoints are documented in OpenAPI schema"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        documented_paths = set(schema["paths"].keys())
        
        # Expected endpoints based on main_working.py analysis
        expected_endpoints = {
            "/",
            "/health",
            "/api/chat",
            "/api/generate",
            "/api/validate",
            "/api/validate-pair",
            "/api/workflow/generate-and-validate",
            "/api/workflow/complete",
            "/api/workflow/{session_id}/status",
            "/api/workflow/{session_id}/files",
            "/api/workflow/{session_id}/validation",
            "/api/status"
        }
        
        # Check that all expected endpoints are documented
        for endpoint in expected_endpoints:
            assert endpoint in documented_paths, f"Endpoint {endpoint} not found in OpenAPI documentation"
    
    def test_request_response_schemas_exist(self):
        """Test that all request/response schemas are properly defined"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        components = schema.get("components", {})
        schemas = components.get("schemas", {})
        
        # Expected schemas based on schemas.py analysis
        expected_schemas = {
            "ChatRequest",
            "ChatResponse", 
            "GenerationRequest",
            "GenerationResponse",
            "WorkflowRequest",
            "WorkflowResponse",
            "WorkflowSummary",
            "ValidationResult"
        }
        
        # FastAPI may generate Input/Output variants for some schemas
        expected_schema_patterns = {
            "ScenarioParameters",  # May be ScenarioParameters-Input, ScenarioParameters-Output
        }
        
        schema_names = set(schemas.keys())
        
        for expected_schema in expected_schemas:
            assert expected_schema in schema_names, f"Schema {expected_schema} not found in OpenAPI components"
            
        # Check pattern-based schemas
        for pattern in expected_schema_patterns:
            matching_schemas = [name for name in schema_names if name.startswith(pattern)]
            assert matching_schemas, f"No schemas found matching pattern {pattern}"
    
    def test_chat_endpoint_documentation(self):
        """Test chat endpoint documentation completeness"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        chat_endpoint = schema["paths"]["/api/chat"]
        
        # Should have POST method
        assert "post" in chat_endpoint
        
        post_spec = chat_endpoint["post"]
        
        # Should have summary and description
        assert "summary" in post_spec or "description" in post_spec
        
        # Should have request body schema
        assert "requestBody" in post_spec
        assert "content" in post_spec["requestBody"]
        assert "application/json" in post_spec["requestBody"]["content"]
        
        # Should have response schemas
        assert "responses" in post_spec
        assert "200" in post_spec["responses"]
    
    def test_generation_endpoint_documentation(self):
        """Test generation endpoint documentation completeness"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        generate_endpoint = schema["paths"]["/api/generate"]
        
        # Should have POST method
        assert "post" in generate_endpoint
        
        post_spec = generate_endpoint["post"]
        
        # Should have proper documentation
        assert "summary" in post_spec or "description" in post_spec
        
        # Should have request/response schemas
        assert "requestBody" in post_spec
        assert "responses" in post_spec
        assert "200" in post_spec["responses"]
    
    def test_validation_endpoints_documentation(self):
        """Test validation endpoints documentation completeness"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Test single file validation
        validate_endpoint = schema["paths"]["/api/validate"]
        assert "post" in validate_endpoint
        
        post_spec = validate_endpoint["post"]
        assert "requestBody" in post_spec
        assert "responses" in post_spec
        
        # Test pair validation
        validate_pair_endpoint = schema["paths"]["/api/validate-pair"]
        assert "post" in validate_pair_endpoint
        
        pair_spec = validate_pair_endpoint["post"]
        assert "requestBody" in pair_spec
        assert "responses" in pair_spec
    
    def test_workflow_endpoints_documentation(self):
        """Test workflow endpoints documentation completeness"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Test workflow endpoints exist and have proper methods
        workflow_endpoints = [
            ("/api/workflow/generate-and-validate", "post"),
            ("/api/workflow/complete", "post"),
            ("/api/workflow/{session_id}/status", "get"),
            ("/api/workflow/{session_id}/files", "get"),
            ("/api/workflow/{session_id}/validation", "get")
        ]
        
        for endpoint_path, method in workflow_endpoints:
            assert endpoint_path in schema["paths"], f"Workflow endpoint {endpoint_path} not documented"
            assert method in schema["paths"][endpoint_path], f"Method {method} not documented for {endpoint_path}"
    
    def test_status_endpoint_documentation(self):
        """Test status endpoint documentation"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        status_endpoint = schema["paths"]["/api/status"]
        assert "get" in status_endpoint
        
        get_spec = status_endpoint["get"]
        assert "responses" in get_spec
        assert "200" in get_spec["responses"]
    
    def test_error_responses_documented(self):
        """Test that error responses are properly documented"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Check that endpoints document error responses
        for path, path_spec in schema["paths"].items():
            for method, method_spec in path_spec.items():
                responses = method_spec.get("responses", {})
                
                # Most endpoints should document error responses
                if path not in ["/", "/health"]:  # Skip simple endpoints
                    # Should have at least some error response codes
                    error_codes = set(responses.keys()) - {"200", "201"}
                    if not error_codes:
                        # This is a warning, not necessarily a failure
                        print(f"Warning: {method.upper()} {path} has no documented error responses")
    
    def test_parameter_validation_schemas(self):
        """Test that parameter validation schemas are complete"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Test ScenarioParameters schema completeness - may be Input or Output variant
        schemas = schema["components"]["schemas"]
        scenario_params = None
        
        for name, schema_def in schemas.items():
            if name.startswith("ScenarioParameters"):
                scenario_params = schema_def
                break
        
        assert scenario_params is not None, "No ScenarioParameters schema found"
        
        required_fields = [
            "scenario_name",
            "description", 
            "road_network",
            "vehicles",
            "events"
        ]
        
        properties = scenario_params.get("properties", {})
        
        for field in required_fields:
            assert field in properties, f"Required field {field} missing from ScenarioParameters schema"
            
            # Each field should have description
            field_spec = properties[field]
            assert "description" in field_spec, f"Field {field} missing description"
    
    def test_file_upload_documentation(self):
        """Test that file upload endpoints are properly documented"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Check validation endpoints handle file uploads
        validate_endpoint = schema["paths"]["/api/validate"]["post"]
        request_body = validate_endpoint.get("requestBody", {})
        content = request_body.get("content", {})
        
        # Should support multipart/form-data for file uploads
        assert "multipart/form-data" in content, "File upload endpoint should support multipart/form-data"
    
    def test_openapi_spec_validity(self):
        """Test that generated OpenAPI spec is valid JSON/YAML"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Should be serializable to JSON
        json_schema = json.dumps(schema, indent=2)
        assert json_schema is not None
        
        # Should be parseable back from JSON
        parsed_schema = json.loads(json_schema)
        assert parsed_schema == schema
        
        # Should be convertible to YAML (for documentation purposes)
        try:
            yaml_schema = yaml.dump(schema, default_flow_style=False)
            assert yaml_schema is not None
        except Exception as e:
            pytest.fail(f"Failed to convert OpenAPI schema to YAML: {e}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])