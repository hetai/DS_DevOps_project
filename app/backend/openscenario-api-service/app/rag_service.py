import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
import subprocess
import tempfile
import shutil

try:
    import chromadb
    from chromadb.config import Settings
    from sentence_transformers import SentenceTransformer
    import pandas as pd
    from lxml import etree
except ImportError as e:
    print(f"Warning: RAG dependencies not available: {e}")
    chromadb = None

class NCAPScenarioRAG:
    """RAG system for NCAP scenario knowledge base"""
    
    def __init__(self, data_dir: str = "./ncap_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except:
            print("Warning: Could not load sentence transformer model")
            self.embedding_model = None
        
        # Initialize ChromaDB
        if chromadb:
            self.chroma_client = chromadb.PersistentClient(
                path=str(self.data_dir / "chroma_db"),
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.chroma_client.get_or_create_collection(
                name="ncap_scenarios",
                metadata={"description": "NCAP OpenSCENARIO scenarios for RAG"}
            )
        else:
            self.chroma_client = None
            self.collection = None
        
        self.scenarios_indexed = False
    
    async def initialize_knowledge_base(self) -> bool:
        """Initialize the RAG knowledge base with NCAP scenarios"""
        try:
            # Check if NCAP scenarios are already downloaded and indexed
            if self._is_knowledge_base_ready():
                self.scenarios_indexed = True
                return True
            
            # Download NCAP scenarios
            await self._download_ncap_scenarios()
            
            # Parse and index scenarios
            await self._parse_and_index_scenarios()
            
            self.scenarios_indexed = True
            return True
            
        except Exception as e:
            print(f"Failed to initialize knowledge base: {e}")
            return False
    
    def _is_knowledge_base_ready(self) -> bool:
        """Check if knowledge base is already initialized"""
        if not self.collection:
            return False
            
        try:
            count = self.collection.count()
            return count > 0
        except:
            return False
    
    async def _download_ncap_scenarios(self):
        """Download OSC-NCAP-scenarios repository"""
        repo_url = "https://github.com/vectorgrp/OSC-NCAP-scenarios.git"
        repo_dir = self.data_dir / "OSC-NCAP-scenarios"
        
        if repo_dir.exists():
            print("NCAP scenarios already downloaded")
            return
        
        try:
            # Clone the repository
            result = subprocess.run(
                ["git", "clone", repo_url, str(repo_dir)],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                raise Exception(f"Git clone failed: {result.stderr}")
                
            print(f"Successfully downloaded NCAP scenarios to {repo_dir}")
            
        except subprocess.TimeoutExpired:
            raise Exception("Git clone timed out")
        except FileNotFoundError:
            raise Exception("Git not found. Please install git to download NCAP scenarios")
    
    async def _parse_and_index_scenarios(self):
        """Parse NCAP scenarios and create embeddings"""
        if not self.collection or not self.embedding_model:
            raise Exception("ChromaDB or embedding model not available")
        
        repo_dir = self.data_dir / "OSC-NCAP-scenarios"
        if not repo_dir.exists():
            raise Exception("NCAP scenarios not downloaded")
        
        # Find all .xosc files
        xosc_files = list(repo_dir.rglob("*.xosc"))
        print(f"Found {len(xosc_files)} OpenSCENARIO files")
        
        documents = []
        metadatas = []
        ids = []
        
        for i, xosc_file in enumerate(xosc_files):
            try:
                scenario_data = self._parse_xosc_file(xosc_file)
                if scenario_data:
                    # Create a searchable text representation
                    doc_text = self._create_searchable_text(scenario_data)
                    
                    documents.append(doc_text)
                    metadatas.append({
                        "file_path": str(xosc_file),
                        "scenario_name": scenario_data.get("name", "Unknown"),
                        "description": scenario_data.get("description", ""),
                        "vehicle_count": len(scenario_data.get("vehicles", [])),
                        "event_count": len(scenario_data.get("events", []))
                    })
                    ids.append(f"scenario_{i}")
                    
            except Exception as e:
                print(f"Error parsing {xosc_file}: {e}")
                continue
        
        if documents:
            # Generate embeddings and store in ChromaDB
            embeddings = self.embedding_model.encode(documents).tolist()
            
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings,
                ids=ids
            )
            
            print(f"Indexed {len(documents)} scenarios in knowledge base")
        else:
            print("No scenarios could be parsed and indexed")
    
    def _parse_xosc_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Parse OpenSCENARIO XML file and extract key information"""
        try:
            tree = etree.parse(str(file_path))
            root = tree.getroot()
            
            # Remove namespace for easier parsing
            for elem in root.getiterator():
                if elem.tag.startswith('{'):
                    elem.tag = elem.tag.split('}', 1)[1]
            
            scenario_data = {
                "name": file_path.stem,
                "description": "",
                "vehicles": [],
                "events": [],
                "actions": [],
                "conditions": [],
                "road_network": None
            }
            
            # Extract file header info
            file_header = root.find(".//FileHeader")
            if file_header is not None:
                scenario_data["description"] = file_header.get("description", "")
            
            # Extract entities (vehicles)
            entities = root.find(".//Entities")
            if entities is not None:
                for obj in entities.findall(".//ScenarioObject"):
                    vehicle_info = {
                        "name": obj.get("name", ""),
                        "type": "unknown"
                    }
                    
                    vehicle = obj.find(".//Vehicle")
                    if vehicle is not None:
                        vehicle_info["type"] = "vehicle"
                        vehicle_info["category"] = vehicle.get("vehicleCategory", "")
                    
                    scenario_data["vehicles"].append(vehicle_info)
            
            # Extract events and actions
            for event in root.findall(".//Event"):
                event_info = {
                    "name": event.get("name", ""),
                    "priority": event.get("priority", ""),
                    "actions": []
                }
                
                # Extract actions
                for action in event.findall(".//Action"):
                    action_info = self._extract_action_info(action)
                    if action_info:
                        event_info["actions"].append(action_info)
                        scenario_data["actions"].append(action_info)
                
                scenario_data["events"].append(event_info)
            
            # Extract road network
            road_network = root.find(".//RoadNetwork")
            if road_network is not None:
                logic_file = road_network.find(".//LogicFile")
                if logic_file is not None:
                    scenario_data["road_network"] = logic_file.get("filepath", "")
            
            return scenario_data
            
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return None
    
    def _extract_action_info(self, action_elem) -> Optional[Dict[str, Any]]:
        """Extract action information from XML element"""
        action_info = {"type": "unknown", "parameters": {}}
        
        # Check for different action types
        speed_action = action_elem.find(".//SpeedAction")
        if speed_action is not None:
            action_info["type"] = "speed"
            target = speed_action.find(".//AbsoluteTargetSpeed")
            if target is not None:
                action_info["parameters"]["target_speed"] = target.get("value", "")
        
        lane_change_action = action_elem.find(".//LaneChangeAction")
        if lane_change_action is not None:
            action_info["type"] = "lane_change"
            target = lane_change_action.find(".//LaneChangeTarget")
            if target is not None:
                rel_target = target.find(".//RelativeTargetLane")
                if rel_target is not None:
                    action_info["parameters"]["lane_offset"] = rel_target.get("value", "")
        
        teleport_action = action_elem.find(".//TeleportAction")
        if teleport_action is not None:
            action_info["type"] = "teleport"
            position = teleport_action.find(".//Position")
            if position is not None:
                action_info["parameters"]["position_type"] = "specified"
        
        return action_info if action_info["type"] != "unknown" else None
    
    def _create_searchable_text(self, scenario_data: Dict[str, Any]) -> str:
        """Create a searchable text representation of the scenario"""
        text_parts = []
        
        # Add scenario name and description
        text_parts.append(f"Scenario: {scenario_data['name']}")
        if scenario_data["description"]:
            text_parts.append(f"Description: {scenario_data['description']}")
        
        # Add vehicle information
        if scenario_data["vehicles"]:
            vehicle_types = [v.get("category", v.get("type", "")) for v in scenario_data["vehicles"]]
            text_parts.append(f"Vehicles: {', '.join(filter(None, vehicle_types))}")
            text_parts.append(f"Vehicle count: {len(scenario_data['vehicles'])}")
        
        # Add action information
        if scenario_data["actions"]:
            action_types = [a["type"] for a in scenario_data["actions"]]
            text_parts.append(f"Actions: {', '.join(action_types)}")
            
            # Add specific action details
            for action in scenario_data["actions"]:
                if action["type"] == "speed":
                    target_speed = action.get("parameters", {}).get("target_speed", "")
                    if target_speed:
                        text_parts.append(f"Speed target: {target_speed}")
                elif action["type"] == "lane_change":
                    lane_offset = action.get("parameters", {}).get("lane_offset", "")
                    if lane_offset:
                        text_parts.append(f"Lane change offset: {lane_offset}")
        
        # Add event information
        if scenario_data["events"]:
            text_parts.append(f"Events: {len(scenario_data['events'])} events")
        
        return " ".join(text_parts)
    
    async def search_similar_scenarios(
        self, 
        query: str, 
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar NCAP scenarios based on query"""
        if not self.scenarios_indexed or not self.collection:
            return []
        
        try:
            # Generate query embedding
            if not self.embedding_model:
                return []
            
            query_embedding = self.embedding_model.encode([query]).tolist()
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            scenarios = []
            for i in range(len(results["documents"][0])):
                scenarios.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "similarity": 1 - results["distances"][0][i]  # Convert distance to similarity
                })
            
            return scenarios
            
        except Exception as e:
            print(f"Error searching scenarios: {e}")
            return []
    
    async def get_ncap_context(self, scenario_description: str) -> str:
        """Get relevant NCAP context for scenario generation"""
        similar_scenarios = await self.search_similar_scenarios(scenario_description, n_results=3)
        
        if not similar_scenarios:
            return "No similar NCAP scenarios found."
        
        context_parts = ["Relevant NCAP scenarios for guidance:"]
        
        for i, scenario in enumerate(similar_scenarios, 1):
            context_parts.append(f"\n{i}. {scenario['metadata']['scenario_name']}")
            if scenario['metadata']['description']:
                context_parts.append(f"   Description: {scenario['metadata']['description']}")
            context_parts.append(f"   Vehicles: {scenario['metadata']['vehicle_count']}")
            context_parts.append(f"   Events: {scenario['metadata']['event_count']}")
            context_parts.append(f"   Similarity: {scenario['similarity']:.2f}")
        
        return "\n".join(context_parts)

# Global RAG service instance
rag_service = NCAPScenarioRAG()