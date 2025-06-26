#!/usr/bin/env python3
"""
Basic system integration test for AI-Enhanced OpenSCENARIO system
"""

import asyncio
import requests
import json
import sys
import os
from typing import Dict, Any

API_BASE_URL = "http://localhost:8080"

class SystemTester:
    def __init__(self):
        self.test_results = []
    
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        self.test_results.append((test_name, passed, message))
        print(f"{status} {test_name}: {message}")
    
    def test_api_health(self):
        """Test basic API health"""
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("API Health Check", True, "API is responding")
                return True
            else:
                self.log_test("API Health Check", False, f"Status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_api_status(self):
        """Test API status endpoint"""
        try:
            response = requests.get(f"{API_BASE_URL}/api/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test("API Status", True, f"Services: {list(data.get('services', {}).keys())}")
                return data
            else:
                self.log_test("API Status", False, f"Status code: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            self.log_test("API Status", False, f"Error: {str(e)}")
            return None
    
    def test_chat_endpoint(self):
        """Test chat endpoint with a simple message"""
        try:
            payload = {
                "message": "Create a simple highway scenario with one car",
                "conversation_history": [],
                "session_id": "test_session"
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/chat", 
                json=payload, 
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                has_message = "message" in data
                self.log_test("Chat Endpoint", has_message, 
                             f"AI responded: {data.get('message', '')[:50]}...")
                return data
            else:
                self.log_test("Chat Endpoint", False, 
                             f"Status code: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test("Chat Endpoint", False, f"Error: {str(e)}")
            return None
    
    def test_generation_endpoint(self):
        """Test scenario generation with mock parameters"""
        try:
            # Simple test parameters
            payload = {
                "parameters": {
                    "scenario_name": "Test Highway Scenario",
                    "description": "A simple test scenario",
                    "road_network": {
                        "road_description": "Straight highway",
                        "generate_simple_road": True
                    },
                    "vehicles": [{
                        "name": "ego",
                        "category": "car",
                        "bounding_box": {"width": 2.0, "length": 4.5, "height": 1.8},
                        "performance": {
                            "max_speed": 50.0,
                            "max_acceleration": 5.0,
                            "max_deceleration": 8.0
                        },
                        "initial_speed": 20.0
                    }],
                    "events": [],
                    "environment": {
                        "weather": "dry",
                        "time_of_day": "day",
                        "precipitation": 0.0,
                        "visibility": 1000.0,
                        "wind_speed": 0.0
                    },
                    "openscenario_version": "1.2",
                    "ncap_compliance": True,
                    "parameter_variations": {}
                },
                "generate_variations": False,
                "output_format": "1.2"
            }
            
            response = requests.post(
                f"{API_BASE_URL}/api/generate", 
                json=payload, 
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                files = data.get("scenario_files", {})
                self.log_test("Generation Endpoint", success, 
                             f"Generated {len(files)} files: {list(files.keys())}")
                return data
            else:
                self.log_test("Generation Endpoint", False, 
                             f"Status code: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test("Generation Endpoint", False, f"Error: {str(e)}")
            return None
    
    def run_tests(self):
        """Run all system tests"""
        print("🧪 Running AI-Enhanced OpenSCENARIO System Tests")
        print("=" * 50)
        
        # Test 1: Basic API health
        if not self.test_api_health():
            print("\n❌ API is not responding. Make sure the system is running:")
            print("   docker-compose -f docker-compose.dev.yml up -d")
            return False
        
        # Test 2: API status and services
        status_data = self.test_api_status()
        
        # Test 3: Chat functionality
        self.test_chat_endpoint()
        
        # Test 4: Scenario generation
        self.test_generation_endpoint()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 Test Summary:")
        
        passed = sum(1 for _, result, _ in self.test_results if result)
        total = len(self.test_results)
        
        for test_name, result, message in self.test_results:
            status = "✅" if result else "❌"
            print(f"  {status} {test_name}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! The system is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the logs above for details.")
        
        return passed == total

def main():
    """Main test function"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("AI-Enhanced OpenSCENARIO System Tester")
        print("Usage: python test_system.py")
        print("\nThis script tests the AI system integration:")
        print("- API health and status")
        print("- Chat functionality")
        print("- Scenario generation")
        print("\nMake sure the system is running first:")
        print("  docker-compose -f docker-compose.dev.yml up -d")
        return
    
    tester = SystemTester()
    success = tester.run_tests()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()