#!/usr/bin/env python3
"""
Generate OpenAPI specification file
"""

import json
import yaml
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.dirname(__file__))

from app.main_working import app

def generate_openapi_spec():
    """Generate and save OpenAPI specification"""
    
    # Get the OpenAPI schema
    openapi_schema = app.openapi()
    
    # Save as JSON
    json_file = "openapi.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Generated OpenAPI JSON: {json_file}")
    
    # Save as YAML  
    yaml_file = "openapi.yaml"
    with open(yaml_file, 'w', encoding='utf-8') as f:
        yaml.dump(openapi_schema, f, default_flow_style=False, allow_unicode=True, indent=2)
    
    print(f"✅ Generated OpenAPI YAML: {yaml_file}")
    
    # Print summary
    paths_count = len(openapi_schema.get("paths", {}))
    components_count = len(openapi_schema.get("components", {}).get("schemas", {}))
    
    print(f"\n📊 API Documentation Summary:")
    print(f"   - Title: {openapi_schema['info']['title']}")
    print(f"   - Version: {openapi_schema['info']['version']}")
    print(f"   - Endpoints: {paths_count}")
    print(f"   - Components: {components_count}")
    
    # List endpoints
    print(f"\n🔗 Documented Endpoints:")
    for path, methods in openapi_schema.get("paths", {}).items():
        for method in methods.keys():
            if method != "parameters":  # Skip parameter definitions
                summary = methods[method].get("summary", "No summary")
                print(f"   {method.upper():6} {path:45} - {summary}")

if __name__ == "__main__":
    generate_openapi_spec()