"""
ASAM Quality Checker Framework (QCF) Integration Service

This module provides integration with the ASAM QCF C++ tools for comprehensive
OpenSCENARIO and OpenDRIVE validation, including:
- Programmatic QCF invocation
- XQAR report generation and parsing
- Custom NCAP compliance checkers
- Cartesian coordinate and XML path extraction
"""

import os
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import json
import shutil


class QCFExecutionError(Exception):
    """Raised when QCF execution fails"""
    pass


class XQARParseError(Exception):
    """Raised when XQAR report parsing fails"""
    pass


class NCAPTestType(Enum):
    """NCAP test types"""
    AEB = "AEB"  # Autonomous Emergency Braking
    LSS = "LSS"  # Lane Support System
    SAS = "SAS"  # Speed Assistance System
    OD = "OD"    # Occupant Detection


@dataclass
class QCFIssue:
    """Represents an issue found by QCF validation"""
    issue_id: str
    level: str  # Error, Warning, Info
    description: str
    checker_id: str
    xpath: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    cartesian_x: Optional[float] = None
    cartesian_y: Optional[float] = None
    cartesian_z: Optional[float] = None
    rule_id: Optional[str] = None


@dataclass
class XQARReport:
    """Represents a parsed XQAR report"""
    issues: List[QCFIssue]
    checker_results: Dict[str, Any]
    summary: Dict[str, int]
    report_file_path: Optional[str] = None


@dataclass
class QCFResult:
    """Complete QCF validation result"""
    is_valid: bool
    xqar_report: Optional[XQARReport]
    execution_time: float
    qcf_version: Optional[str] = None
    checkers_used: List[str] = field(default_factory=list)
    files_validated: List[str] = field(default_factory=list)


@dataclass
class QCFChecker:
    """Represents a QCF checker bundle"""
    name: str
    description: str
    version: Optional[str] = None
    config_file: Optional[str] = None
    enabled: bool = True


class NCAPComplianceChecker:
    """Custom NCAP compliance checker"""
    
    def __init__(self):
        self.aeb_rules = self._load_aeb_rules()
        self.lss_rules = self._load_lss_rules()
        self.sas_rules = self._load_sas_rules()
        self.od_rules = self._load_od_rules()
    
    def _load_aeb_rules(self) -> Dict[str, Any]:
        """Load AEB (Autonomous Emergency Braking) validation rules"""
        return {
            "speed_range": {"min_kmh": 10, "max_kmh": 80},
            "required_entities": ["ego_vehicle", "target_vehicle"],
            "required_initial_distance": {"min_m": 10, "max_m": 100},
            "vehicle_categories": ["car", "truck"],
            "required_actions": ["LongitudinalAction", "TeleportAction"]
        }
    
    def _load_lss_rules(self) -> Dict[str, Any]:
        """Load LSS (Lane Support System) validation rules"""
        return {
            "speed_range": {"min_kmh": 60, "max_kmh": 130},
            "required_entities": ["ego_vehicle"],
            "lane_change_scenarios": True,
            "road_marking_requirements": True,
            "vehicle_categories": ["car"]
        }
    
    def _load_sas_rules(self) -> Dict[str, Any]:
        """Load SAS (Speed Assistance System) validation rules"""
        return {
            "speed_range": {"min_kmh": 30, "max_kmh": 150},
            "speed_limit_scenarios": True,
            "required_entities": ["ego_vehicle"]
        }
    
    def _load_od_rules(self) -> Dict[str, Any]:
        """Load OD (Occupant Detection) validation rules"""
        return {
            "required_entities": ["ego_vehicle", "pedestrian"],
            "detection_scenarios": True,
            "vehicle_categories": ["car"]
        }
    
    def validate_scenario(self, xosc_content: str, test_type: NCAPTestType) -> List[QCFIssue]:
        """Validate scenario against NCAP requirements"""
        if test_type == NCAPTestType.AEB:
            return self.validate_aeb_scenario(xosc_content)
        elif test_type == NCAPTestType.LSS:
            return self.validate_lss_scenario(xosc_content)
        elif test_type == NCAPTestType.SAS:
            return self.validate_sas_scenario(xosc_content)
        elif test_type == NCAPTestType.OD:
            return self.validate_od_scenario(xosc_content)
        else:
            return []
    
    def validate_aeb_scenario(self, xosc_content: str) -> List[QCFIssue]:
        """Validate AEB scenario against NCAP requirements"""
        issues = []
        
        try:
            root = ET.fromstring(xosc_content)
            
            # Check vehicle entities
            entities = root.find(".//Entities")
            if entities is not None:
                scenario_objects = entities.findall("ScenarioObject")
                vehicle_names = [obj.get("name") for obj in scenario_objects]
                
                for required_entity in self.aeb_rules["required_entities"]:
                    if required_entity not in vehicle_names:
                        issues.append(QCFIssue(
                            issue_id=f"ncap_aeb_{len(issues)+1}",
                            level="Error",
                            description=f"Missing required entity for AEB test: {required_entity}",
                            checker_id="ncap.aeb.entities",
                            xpath=f"/OpenSCENARIO/Entities"
                        ))
            
            # Check speed configurations
            speed_issues = self._validate_speed_actions(root, self.aeb_rules["speed_range"])
            issues.extend(speed_issues)
            
            # Check vehicle configurations
            vehicle_issues = self._validate_vehicle_configuration(root, "AEB")
            issues.extend(vehicle_issues)
            
        except ET.ParseError as e:
            issues.append(QCFIssue(
                issue_id="ncap_aeb_parse_error",
                level="Error",
                description=f"XML parsing error during AEB validation: {str(e)}",
                checker_id="ncap.aeb.parse"
            ))
        
        return issues
    
    def validate_lss_scenario(self, xosc_content: str) -> List[QCFIssue]:
        """Validate Lane Support System scenario"""
        issues = []
        
        try:
            root = ET.fromstring(xosc_content)
            
            # Check speed range for LSS
            speed_issues = self._validate_speed_actions(root, self.lss_rules["speed_range"])
            issues.extend(speed_issues)
            
            # Check for lane change actions
            lane_change_issues = self._validate_lane_change_scenarios(root)
            issues.extend(lane_change_issues)
            
        except ET.ParseError as e:
            issues.append(QCFIssue(
                issue_id="ncap_lss_parse_error",
                level="Error",
                description=f"XML parsing error during LSS validation: {str(e)}",
                checker_id="ncap.lss.parse"
            ))
        
        return issues
    
    def validate_sas_scenario(self, xosc_content: str) -> List[QCFIssue]:
        """Validate Speed Assistance System scenario"""
        issues = []
        
        try:
            root = ET.fromstring(xosc_content)
            
            # Check speed range for SAS
            speed_issues = self._validate_speed_actions(root, self.sas_rules["speed_range"])
            issues.extend(speed_issues)
            
        except ET.ParseError:
            issues.append(QCFIssue(
                issue_id="ncap_sas_parse_error",
                level="Error",
                description="XML parsing error during SAS validation",
                checker_id="ncap.sas.parse"
            ))
        
        return issues
    
    def validate_od_scenario(self, xosc_content: str) -> List[QCFIssue]:
        """Validate Occupant Detection scenario"""
        issues = []
        
        try:
            root = ET.fromstring(xosc_content)
            
            # Check for required entities (vehicle + pedestrian)
            entities = root.find(".//Entities")
            if entities is not None:
                scenario_objects = entities.findall("ScenarioObject")
                
                has_vehicle = False
                has_pedestrian = False
                
                for obj in scenario_objects:
                    if obj.find("Vehicle") is not None:
                        has_vehicle = True
                    elif obj.find("Pedestrian") is not None:
                        has_pedestrian = True
                
                if not has_vehicle:
                    issues.append(QCFIssue(
                        issue_id="ncap_od_no_vehicle",
                        level="Error",
                        description="OD scenario requires at least one vehicle",
                        checker_id="ncap.od.entities"
                    ))
                
                if not has_pedestrian:
                    issues.append(QCFIssue(
                        issue_id="ncap_od_no_pedestrian",
                        level="Error",
                        description="OD scenario requires at least one pedestrian",
                        checker_id="ncap.od.entities"
                    ))
        
        except ET.ParseError:
            issues.append(QCFIssue(
                issue_id="ncap_od_parse_error",
                level="Error",
                description="XML parsing error during OD validation",
                checker_id="ncap.od.parse"
            ))
        
        return issues
    
    def _validate_speed_actions(self, root: ET.Element, speed_range: Dict[str, int]) -> List[QCFIssue]:
        """Validate speed actions against NCAP requirements"""
        issues = []
        
        # Find all speed actions
        speed_actions = root.findall(".//SpeedAction")
        for action in speed_actions:
            target = action.find("SpeedActionTarget/AbsoluteTargetSpeed")
            if target is not None:
                try:
                    speed_ms = float(target.get("value", 0))
                    speed_kmh = speed_ms * 3.6  # Convert m/s to km/h
                    
                    if speed_kmh < speed_range["min_kmh"] or speed_kmh > speed_range["max_kmh"]:
                        issues.append(QCFIssue(
                            issue_id=f"ncap_speed_range_{len(issues)}",
                            level="Warning",
                            description=f"Speed {speed_kmh:.1f} km/h outside NCAP range {speed_range['min_kmh']}-{speed_range['max_kmh']} km/h",
                            checker_id="ncap.speed.range",
                            xpath=self._get_element_xpath(target)
                        ))
                except (ValueError, TypeError):
                    issues.append(QCFIssue(
                        issue_id=f"ncap_speed_invalid_{len(issues)}",
                        level="Error",
                        description="Invalid speed value in SpeedAction",
                        checker_id="ncap.speed.format",
                        xpath=self._get_element_xpath(target)
                    ))
        
        return issues
    
    def _validate_lane_change_scenarios(self, root: ET.Element) -> List[QCFIssue]:
        """Validate lane change scenarios for LSS"""
        issues = []
        
        # Check for lane change actions
        lane_change_actions = root.findall(".//LaneChangeAction")
        if not lane_change_actions:
            issues.append(QCFIssue(
                issue_id="ncap_lss_no_lane_change",
                level="Warning",
                description="LSS scenario should include lane change actions",
                checker_id="ncap.lss.lane_change",
                xpath="/OpenSCENARIO/Storyboard"
            ))
        
        return issues
    
    def _validate_vehicle_configuration(self, root: ET.Element, test_type: str) -> List[QCFIssue]:
        """Validate vehicle configuration for NCAP tests"""
        issues = []
        
        vehicles = root.findall(".//Vehicle")
        for vehicle in vehicles:
            category = vehicle.get("vehicleCategory")
            if category and category not in ["car", "truck"]:
                issues.append(QCFIssue(
                    issue_id=f"ncap_{test_type.lower()}_vehicle_category",
                    level="Warning",
                    description=f"Vehicle category '{category}' may not be suitable for {test_type} testing",
                    checker_id=f"ncap.{test_type.lower()}.vehicle_category",
                    xpath=self._get_element_xpath(vehicle)
                ))
        
        return issues
    
    def _validate_speed_range(self, speed_kmh: float, test_type: str) -> List[QCFIssue]:
        """Validate speed against NCAP requirements"""
        issues = []
        
        if test_type == "AEB":
            rules = self.aeb_rules
        elif test_type == "LSS":
            rules = self.lss_rules
        elif test_type == "SAS":
            rules = self.sas_rules
        else:
            return issues
        
        speed_range = rules["speed_range"]
        if speed_kmh < speed_range["min_kmh"] or speed_kmh > speed_range["max_kmh"]:
            issues.append(QCFIssue(
                issue_id=f"ncap_{test_type.lower()}_speed_range",
                level="Error",
                description=f"Speed {speed_kmh} km/h outside {test_type} range {speed_range['min_kmh']}-{speed_range['max_kmh']} km/h",
                checker_id=f"ncap.{test_type.lower()}.speed"
            ))
        
        return issues
    
    def validate_vehicle_configuration(self, xosc_content: str) -> List[QCFIssue]:
        """Validate vehicle configuration against NCAP requirements"""
        issues = []
        
        try:
            root = ET.fromstring(xosc_content)
            vehicles = root.findall(".//Vehicle")
            
            for vehicle in vehicles:
                # Check vehicle category
                category = vehicle.get("vehicleCategory")
                if not category:
                    issues.append(QCFIssue(
                        issue_id="ncap_vehicle_no_category",
                        level="Error",
                        description="Vehicle missing required vehicleCategory attribute",
                        checker_id="ncap.vehicle.category",
                        xpath=self._get_element_xpath(vehicle)
                    ))
                
                # Check for bounding box (required for collision detection)
                bounding_box = vehicle.find("BoundingBox")
                if bounding_box is None:
                    issues.append(QCFIssue(
                        issue_id="ncap_vehicle_no_bounding_box",
                        level="Warning",
                        description="Vehicle missing BoundingBox for collision detection",
                        checker_id="ncap.vehicle.bounding_box",
                        xpath=self._get_element_xpath(vehicle)
                    ))
        
        except ET.ParseError:
            issues.append(QCFIssue(
                issue_id="ncap_vehicle_parse_error",
                level="Error",
                description="XML parsing error during vehicle validation",
                checker_id="ncap.vehicle.parse"
            ))
        
        return issues
    
    def _get_element_xpath(self, element: ET.Element) -> str:
        """Generate XPath for an XML element (simplified)"""
        # This is a simplified xpath generation
        # In a real implementation, you'd want a more sophisticated approach
        tag = element.tag
        parent = element.getparent() if hasattr(element, 'getparent') else None
        
        if parent is not None:
            return f"{self._get_element_xpath(parent)}/{tag}"
        else:
            return f"/{tag}"


class ASAMQCFService:
    """Service for integrating with ASAM Quality Checker Framework"""
    
    def __init__(self, qcf_executable_path: Optional[str] = None):
        self.qcf_executable_path = qcf_executable_path or self._find_qcf_executable()
        self.temp_dir = Path(tempfile.mkdtemp(prefix="asam_qcf_"))
        self.checker_bundles = self._load_checker_bundles()
        self.ncap_checker = NCAPComplianceChecker()
        
        # Ensure temp directory exists
        self.temp_dir.mkdir(exist_ok=True)
    
    def _find_qcf_executable(self) -> Optional[str]:
        """Find QCF executable in system PATH or common locations"""
        # Common QCF executable names
        qcf_names = ["qc-framework", "qcf", "asam-qcf", "QcFramework"]
        
        # Check system PATH
        for name in qcf_names:
            if shutil.which(name):
                return shutil.which(name)
        
        # Check common installation paths
        common_paths = [
            "/opt/asam-qcf/bin/qc-framework",
            "/usr/local/bin/qc-framework",
            "/usr/bin/qc-framework",
            "C:\\Program Files\\ASAM\\QC-Framework\\qc-framework.exe",
            "C:\\Program Files (x86)\\ASAM\\QC-Framework\\qc-framework.exe"
        ]
        
        for path in common_paths:
            if Path(path).exists():
                return path
        
        # Check environment variable
        env_path = os.getenv("ASAM_QCF_PATH")
        if env_path and Path(env_path).exists():
            return env_path
        
        return None
    
    def _load_checker_bundles(self) -> List[QCFChecker]:
        """Load available QCF checker bundles"""
        bundles = [
            QCFChecker(
                name="OpenSCENARIOChecker",
                description="Standard OpenSCENARIO validation",
                enabled=True
            ),
            QCFChecker(
                name="OpenDRIVEChecker", 
                description="Standard OpenDRIVE validation",
                enabled=True
            ),
            QCFChecker(
                name="NCAPComplianceChecker",
                description="Custom NCAP compliance validation",
                enabled=True
            )
        ]
        
        return bundles
    
    def is_qcf_available(self) -> bool:
        """Check if QCF is available for use"""
        return self.qcf_executable_path is not None and Path(self.qcf_executable_path).exists()
    
    def get_available_checker_bundles(self) -> List[str]:
        """Get list of available checker bundle names"""
        if not self.is_qcf_available():
            return []
        
        return [bundle.name for bundle in self.checker_bundles if bundle.enabled]
    
    def validate_scenario_files(self, 
                               xosc_content: str, 
                               xodr_content: Optional[str] = None,
                               include_ncap_checkers: bool = True,
                               ncap_test_type: Optional[NCAPTestType] = None) -> QCFResult:
        """Validate scenario files using QCF"""
        import time
        start_time = time.time()
        
        if not self.is_qcf_available():
            raise QCFExecutionError("ASAM QCF executable not found or not available")
        
        try:
            # Create temporary files
            xosc_file = self.temp_dir / "scenario.xosc"
            xodr_file = self.temp_dir / "road.xodr" if xodr_content else None
            xqar_file = self.temp_dir / "report.xqar"
            
            # Write input files
            with open(xosc_file, 'w', encoding='utf-8') as f:
                f.write(xosc_content)
            
            if xodr_content and xodr_file:
                with open(xodr_file, 'w', encoding='utf-8') as f:
                    f.write(xodr_content)
            
            # Prepare checker bundles
            checkers_to_use = [b.name for b in self.checker_bundles if b.enabled and b.name != "NCAPComplianceChecker"]
            
            # Execute QCF
            returncode, stdout, stderr = self._execute_qcf(
                xosc_file=xosc_file,
                xodr_file=xodr_file,
                xqar_file=xqar_file,
                checker_bundles=checkers_to_use
            )
            
            # Parse XQAR report
            xqar_report = None
            if xqar_file.exists():
                with open(xqar_file, 'r', encoding='utf-8') as f:
                    xqar_content = f.read()
                xqar_report = self._parse_xqar_report(xqar_content)
                xqar_report.report_file_path = str(xqar_file)
            
            # Add NCAP compliance checking if requested
            if include_ncap_checkers and ncap_test_type:
                ncap_issues = self.ncap_checker.validate_scenario(xosc_content, ncap_test_type)
                if xqar_report:
                    xqar_report.issues.extend(ncap_issues)
                    # Update summary
                    for issue in ncap_issues:
                        if issue.level == "Error":
                            xqar_report.summary["total_errors"] = xqar_report.summary.get("total_errors", 0) + 1
                        elif issue.level == "Warning":
                            xqar_report.summary["total_warnings"] = xqar_report.summary.get("total_warnings", 0) + 1
            
            execution_time = time.time() - start_time
            
            # Determine if validation passed
            is_valid = (returncode == 0 and 
                       (xqar_report is None or xqar_report.summary.get("total_errors", 0) == 0))
            
            files_validated = [str(xosc_file)]
            if xodr_file:
                files_validated.append(str(xodr_file))
            
            return QCFResult(
                is_valid=is_valid,
                xqar_report=xqar_report,
                execution_time=execution_time,
                checkers_used=checkers_to_use,
                files_validated=files_validated
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            raise QCFExecutionError(f"QCF execution failed: {str(e)}") from e
        finally:
            # Cleanup temporary files
            self._cleanup_temp_files()
    
    def _execute_qcf(self, 
                     xosc_file: Path, 
                     xodr_file: Optional[Path],
                     xqar_file: Path,
                     checker_bundles: List[str]) -> Tuple[int, str, str]:
        """Execute QCF with specified parameters"""
        cmd = [
            str(self.qcf_executable_path),
            "--input", str(xosc_file)
        ]
        
        if xodr_file:
            cmd.extend(["--opendrive", str(xodr_file)])
        
        cmd.extend([
            "--output", str(xqar_file),
            "--format", "xqar"
        ])
        
        # Add checker bundles
        for bundle in checker_bundles:
            cmd.extend(["--checker", bundle])
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                cwd=self.temp_dir
            )
            
            return result.returncode, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            raise QCFExecutionError("QCF execution timed out after 5 minutes")
        except subprocess.CalledProcessError as e:
            raise QCFExecutionError(f"QCF execution failed with return code {e.returncode}: {e.stderr}")
        except FileNotFoundError:
            raise QCFExecutionError(f"QCF executable not found at: {self.qcf_executable_path}")
    
    def _parse_xqar_report(self, xqar_content: str) -> XQARReport:
        """Parse XQAR XML report into structured data"""
        try:
            root = ET.fromstring(xqar_content)
            
            # Handle XML namespaces
            namespaces = {'xqar': 'http://asam.net/xml/qc-framework'}
            
            issues = []
            checker_results = {}
            summary = {"total_errors": 0, "total_warnings": 0, "total_info": 0}
            
            # Parse checker results
            checker_result_elements = root.findall('.//xqar:CheckerResult', namespaces)
            for checker_result in checker_result_elements:
                checker_id = checker_result.get('checkerId', 'unknown')
                checker_results[checker_id] = {}
                
                # Parse issues for this checker
                issue_elements = checker_result.findall('.//xqar:Issue', namespaces)
                for issue_elem in issue_elements:
                    issue = self._parse_xqar_issue(issue_elem, checker_id, namespaces)
                    issues.append(issue)
                    
                    # Update summary
                    if issue.level == "Error":
                        summary["total_errors"] += 1
                    elif issue.level == "Warning":
                        summary["total_warnings"] += 1
                    elif issue.level == "Info":
                        summary["total_info"] += 1
            
            return XQARReport(
                issues=issues,
                checker_results=checker_results,
                summary=summary
            )
            
        except ET.ParseError as e:
            raise XQARParseError(f"Failed to parse XQAR report: {str(e)}")
        except Exception as e:
            raise XQARParseError(f"Error processing XQAR report: {str(e)}")
    
    def _parse_xqar_issue(self, issue_elem: ET.Element, checker_id: str, namespaces: Dict) -> QCFIssue:
        """Parse individual issue from XQAR"""
        issue_id = issue_elem.get('issueId', 'unknown')
        level = issue_elem.get('level', 'Info')
        description = issue_elem.get('description', 'No description')
        
        # Parse location information
        xpath = None
        line_number = None
        column_number = None
        cartesian_x = None
        cartesian_y = None
        cartesian_z = None
        
        locations = issue_elem.find('.//xqar:Locations', namespaces)
        if locations is not None:
            # Parse XML location
            xml_location = locations.find('.//xqar:XmlLocation', namespaces)
            if xml_location is not None:
                xpath = xml_location.get('xpath')
                try:
                    line_number = int(xml_location.get('line')) if xml_location.get('line') else None
                    column_number = int(xml_location.get('column')) if xml_location.get('column') else None
                except (ValueError, TypeError):
                    pass
            
            # Parse Cartesian coordinates
            cartesian_coord = locations.find('.//xqar:CartesianCoordinate', namespaces)
            if cartesian_coord is not None:
                try:
                    cartesian_x = float(cartesian_coord.get('x')) if cartesian_coord.get('x') else None
                    cartesian_y = float(cartesian_coord.get('y')) if cartesian_coord.get('y') else None
                    cartesian_z = float(cartesian_coord.get('z')) if cartesian_coord.get('z') else None
                except (ValueError, TypeError):
                    pass
        
        return QCFIssue(
            issue_id=issue_id,
            level=level,
            description=description,
            checker_id=checker_id,
            xpath=xpath,
            line_number=line_number,
            column_number=column_number,
            cartesian_x=cartesian_x,
            cartesian_y=cartesian_y,
            cartesian_z=cartesian_z
        )
    
    def _cleanup_temp_files(self):
        """Clean up temporary files"""
        try:
            if self.temp_dir.exists():
                for file in self.temp_dir.glob("*"):
                    if file.is_file():
                        file.unlink()
        except Exception:
            # Ignore cleanup errors
            pass
    
    def get_qcf_version(self) -> Optional[str]:
        """Get QCF version information"""
        if not self.is_qcf_available():
            return None
        
        try:
            result = subprocess.run(
                [str(self.qcf_executable_path), "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return result.stdout.strip()
            
        except Exception:
            pass
        
        return None
    
    def get_validation_capabilities(self) -> Dict[str, Any]:
        """Get detailed information about QCF validation capabilities"""
        capabilities = {
            "qcf_available": self.is_qcf_available(),
            "qcf_executable_path": str(self.qcf_executable_path) if self.qcf_executable_path else None,
            "qcf_version": self.get_qcf_version(),
            "checker_bundles": [
                {
                    "name": bundle.name,
                    "description": bundle.description,
                    "enabled": bundle.enabled
                }
                for bundle in self.checker_bundles
            ],
            "ncap_test_types": [test_type.value for test_type in NCAPTestType],
            "features": {
                "xqar_parsing": True,
                "cartesian_coordinates": True,
                "xpath_extraction": True,
                "ncap_compliance": True,
                "custom_checkers": True
            }
        }
        
        return capabilities
    
    def __del__(self):
        """Cleanup when service is destroyed"""
        self._cleanup_temp_files()


# Global service instance
qcf_service = ASAMQCFService()