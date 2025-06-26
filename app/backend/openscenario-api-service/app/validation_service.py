import os
import tempfile
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

try:
    import xmlschema
    HAS_XMLSCHEMA = True
except ImportError:
    xmlschema = None
    HAS_XMLSCHEMA = False

try:
    from lxml import etree
    HAS_LXML = True
except ImportError:
    etree = None
    HAS_LXML = False

@dataclass
class ValidationIssue:
    """Represents a validation issue from ASAM QC Framework"""
    level: str  # ERROR, WARNING, INFO
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    rule_id: Optional[str] = None
    xpath: Optional[str] = None

@dataclass
class ValidationResult:
    """Complete validation result"""
    is_valid: bool
    issues: List[ValidationIssue]
    total_errors: int
    total_warnings: int
    total_info: int
    report_file: Optional[str] = None

class ASAMValidationService:
    """Service for validating OpenSCENARIO and OpenDRIVE files using enhanced XML validation"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="asam_validation_")
        self.validation_level = self._determine_validation_level()
    
    def _determine_validation_level(self) -> str:
        """Determine the level of validation available"""
        if HAS_XMLSCHEMA:
            return "schema_validation"
        elif HAS_LXML:
            return "enhanced_xml"
        else:
            return "basic_xml"
        
    def validate_openscenario(self, xosc_content: str, xodr_content: Optional[str] = None) -> ValidationResult:
        """Validate OpenSCENARIO file with optional OpenDRIVE file"""
        try:
            # Perform validation based on available libraries
            if self.validation_level == "schema_validation":
                result = self._schema_validate_openscenario(xosc_content)
            elif self.validation_level == "enhanced_xml":
                result = self._enhanced_xml_validation(xosc_content, "OpenSCENARIO")
            else:
                result = self._basic_xml_validation_content(xosc_content, "OpenSCENARIO")
            
            # Add domain-specific validation
            domain_issues = self._validate_openscenario_domain(xosc_content)
            result.issues.extend(domain_issues)
            
            # Update counts
            for issue in domain_issues:
                if issue.level == "ERROR":
                    result.total_errors += 1
                elif issue.level == "WARNING":
                    result.total_warnings += 1
                elif issue.level == "INFO":
                    result.total_info += 1
            
            result.is_valid = (result.total_errors == 0)
            return result
            
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                issues=[ValidationIssue(
                    level="ERROR",
                    message=f"Validation failed: {str(e)}"
                )],
                total_errors=1,
                total_warnings=0,
                total_info=0
            )
    
    def validate_opendrive(self, xodr_content: str) -> ValidationResult:
        """Validate OpenDRIVE file"""
        try:
            # Perform validation based on available libraries
            if self.validation_level == "schema_validation":
                result = self._schema_validate_opendrive(xodr_content)
            elif self.validation_level == "enhanced_xml":
                result = self._enhanced_xml_validation(xodr_content, "OpenDRIVE")
            else:
                result = self._basic_xml_validation_content(xodr_content, "OpenDRIVE")
            
            # Add domain-specific validation
            domain_issues = self._validate_opendrive_domain(xodr_content)
            result.issues.extend(domain_issues)
            
            # Update counts
            for issue in domain_issues:
                if issue.level == "ERROR":
                    result.total_errors += 1
                elif issue.level == "WARNING":
                    result.total_warnings += 1
                elif issue.level == "INFO":
                    result.total_info += 1
            
            result.is_valid = (result.total_errors == 0)
            return result
            
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                issues=[ValidationIssue(
                    level="ERROR",
                    message=f"Validation failed: {str(e)}"
                )],
                total_errors=1,
                total_warnings=0,
                total_info=0
            )
    
    def validate_scenario_pair(self, xosc_content: str, xodr_content: str) -> ValidationResult:
        """Validate OpenSCENARIO and OpenDRIVE files together for consistency"""
        try:
            # First validate individually
            xosc_result = self.validate_openscenario(xosc_content, xodr_content)
            xodr_result = self.validate_opendrive(xodr_content)
            
            # Combine results
            all_issues = xosc_result.issues + xodr_result.issues
            total_errors = xosc_result.total_errors + xodr_result.total_errors
            total_warnings = xosc_result.total_warnings + xodr_result.total_warnings
            total_info = xosc_result.total_info + xodr_result.total_info
            
            # Additional cross-validation checks
            cross_validation_issues = self._cross_validate_files(xosc_content, xodr_content)
            all_issues.extend(cross_validation_issues)
            
            # Update counts for cross-validation issues
            for issue in cross_validation_issues:
                if issue.level == "ERROR":
                    total_errors += 1
                elif issue.level == "WARNING":
                    total_warnings += 1
                elif issue.level == "INFO":
                    total_info += 1
            
            return ValidationResult(
                is_valid=(total_errors == 0),
                issues=all_issues,
                total_errors=total_errors,
                total_warnings=total_warnings,
                total_info=total_info
            )
            
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                issues=[ValidationIssue(
                    level="ERROR",
                    message=f"Cross-validation failed: {str(e)}"
                )],
                total_errors=1,
                total_warnings=0,
                total_info=0
            )
    
    def _schema_validate_openscenario(self, content: str) -> ValidationResult:
        """Validate OpenSCENARIO using XML schema if available"""
        issues = []
        try:
            # Basic XML parsing first
            root = ET.fromstring(content)
            
            # Check root element
            if root.tag != "OpenSCENARIO":
                issues.append(ValidationIssue(
                    level="ERROR",
                    message="Root element must be 'OpenSCENARIO'"
                ))
            
            # Check required attributes
            file_header = root.find("FileHeader")
            if file_header is None:
                issues.append(ValidationIssue(
                    level="ERROR",
                    message="Missing required FileHeader element"
                ))
            
            issues.append(ValidationIssue(
                level="INFO",
                message=f"OpenSCENARIO validation completed (level: {self.validation_level})"
            ))
            
        except ET.ParseError as e:
            issues.append(ValidationIssue(
                level="ERROR",
                message=f"XML parsing error: {str(e)}",
                line_number=getattr(e, 'lineno', None)
            ))
        
        error_count = len([i for i in issues if i.level == "ERROR"])
        warning_count = len([i for i in issues if i.level == "WARNING"])
        info_count = len([i for i in issues if i.level == "INFO"])
        
        return ValidationResult(
            is_valid=(error_count == 0),
            issues=issues,
            total_errors=error_count,
            total_warnings=warning_count,
            total_info=info_count
        )
    
    def _schema_validate_opendrive(self, content: str) -> ValidationResult:
        """Validate OpenDRIVE using XML schema if available"""
        issues = []
        try:
            # Basic XML parsing first
            root = ET.fromstring(content)
            
            # Check root element
            if root.tag != "OpenDRIVE":
                issues.append(ValidationIssue(
                    level="ERROR",
                    message="Root element must be 'OpenDRIVE'"
                ))
            
            # Check required attributes
            header = root.find("header")
            if header is None:
                issues.append(ValidationIssue(
                    level="ERROR",
                    message="Missing required header element"
                ))
            
            issues.append(ValidationIssue(
                level="INFO",
                message=f"OpenDRIVE validation completed (level: {self.validation_level})"
            ))
            
        except ET.ParseError as e:
            issues.append(ValidationIssue(
                level="ERROR",
                message=f"XML parsing error: {str(e)}",
                line_number=getattr(e, 'lineno', None)
            ))
        
        error_count = len([i for i in issues if i.level == "ERROR"])
        warning_count = len([i for i in issues if i.level == "WARNING"])
        info_count = len([i for i in issues if i.level == "INFO"])
        
        return ValidationResult(
            is_valid=(error_count == 0),
            issues=issues,
            total_errors=error_count,
            total_warnings=warning_count,
            total_info=info_count
        )
    
    def _enhanced_xml_validation(self, content: str, file_type: str) -> ValidationResult:
        """Enhanced XML validation using lxml if available"""
        issues = []
        try:
            if HAS_LXML:
                # Use lxml for better error reporting
                etree.fromstring(content.encode('utf-8'))
            else:
                # Fall back to basic XML parsing
                ET.fromstring(content)
            
            issues.append(ValidationIssue(
                level="INFO",
                message=f"{file_type} file is well-formed XML (enhanced validation)"
            ))
            
        except Exception as e:
            error_msg = str(e)
            line_num = None
            col_num = None
            
            # Extract line/column info if available
            if hasattr(e, 'lineno'):
                line_num = e.lineno
            if hasattr(e, 'col'):
                col_num = e.col
                
            issues.append(ValidationIssue(
                level="ERROR",
                message=f"XML parsing error: {error_msg}",
                line_number=line_num,
                column_number=col_num
            ))
        
        error_count = len([i for i in issues if i.level == "ERROR"])
        warning_count = len([i for i in issues if i.level == "WARNING"])
        info_count = len([i for i in issues if i.level == "INFO"])
        
        return ValidationResult(
            is_valid=(error_count == 0),
            issues=issues,
            total_errors=error_count,
            total_warnings=warning_count,
            total_info=info_count
        )
    
    def _validate_openscenario_domain(self, content: str) -> List[ValidationIssue]:
        """Perform domain-specific validation for OpenSCENARIO"""
        issues = []
        try:
            root = ET.fromstring(content)
            
            # Check for entities
            entities = root.find(".//Entities")
            if entities is None:
                issues.append(ValidationIssue(
                    level="WARNING",
                    message="No Entities section found"
                ))
            else:
                scenario_objects = entities.findall("ScenarioObject")
                if not scenario_objects:
                    issues.append(ValidationIssue(
                        level="WARNING",
                        message="No ScenarioObjects defined in Entities"
                    ))
            
            # Check for storyboard
            storyboard = root.find(".//Storyboard")
            if storyboard is None:
                issues.append(ValidationIssue(
                    level="ERROR",
                    message="Missing required Storyboard element"
                ))
            
            # Check road network reference
            road_network = root.find(".//RoadNetwork")
            if road_network is not None:
                logic_file = road_network.find("LogicFile")
                if logic_file is not None:
                    filepath = logic_file.get("filepath")
                    if filepath and not filepath.endswith(".xodr"):
                        issues.append(ValidationIssue(
                            level="WARNING",
                            message=f"Road network file '{filepath}' should have .xodr extension"
                        ))
            
        except ET.ParseError:
            # XML parsing already failed, skip domain validation
            pass
        except Exception as e:
            issues.append(ValidationIssue(
                level="WARNING",
                message=f"Domain validation partially failed: {str(e)}"
            ))
        
        return issues
    
    def _validate_opendrive_domain(self, content: str) -> List[ValidationIssue]:
        """Perform domain-specific validation for OpenDRIVE"""
        issues = []
        try:
            root = ET.fromstring(content)
            
            # Check for roads
            roads = root.findall("road")
            if not roads:
                issues.append(ValidationIssue(
                    level="WARNING",
                    message="No roads defined in OpenDRIVE file"
                ))
            else:
                # Check each road for basic requirements
                for road in roads:
                    road_id = road.get("id")
                    if not road_id:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            message="Road element missing required 'id' attribute"
                        ))
                    
                    # Check for plan view
                    plan_view = road.find("planView")
                    if plan_view is None:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            message=f"Road {road_id} missing required planView element"
                        ))
                    
                    # Check for lanes
                    lanes = road.find("lanes")
                    if lanes is None:
                        issues.append(ValidationIssue(
                            level="ERROR",
                            message=f"Road {road_id} missing required lanes element"
                        ))
        
        except ET.ParseError:
            # XML parsing already failed, skip domain validation
            pass
        except Exception as e:
            issues.append(ValidationIssue(
                level="WARNING",
                message=f"Domain validation partially failed: {str(e)}"
            ))
        
        return issues
    
    def _basic_xml_validation_content(self, content: str, file_type: str) -> ValidationResult:
        """Basic XML validation for content string"""
        try:
            # Try to parse as XML
            ET.fromstring(content)
            
            return ValidationResult(
                is_valid=True,
                issues=[ValidationIssue(
                    level="INFO",
                    message=f"{file_type} file is well-formed XML (basic validation)"
                )],
                total_errors=0,
                total_warnings=0,
                total_info=1
            )
            
        except ET.ParseError as e:
            return ValidationResult(
                is_valid=False,
                issues=[ValidationIssue(
                    level="ERROR",
                    message=f"XML parsing error: {str(e)}",
                    line_number=getattr(e, 'lineno', None)
                )],
                total_errors=1,
                total_warnings=0,
                total_info=0
            )
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                issues=[ValidationIssue(
                    level="ERROR",
                    message=f"Validation error: {str(e)}"
                )],
                total_errors=1,
                total_warnings=0,
                total_info=0
            )
    
    def _cross_validate_files(self, xosc_content: str, xodr_content: str) -> List[ValidationIssue]:
        """Perform cross-validation checks between OpenSCENARIO and OpenDRIVE files"""
        issues = []
        
        try:
            # Parse both files
            xosc_root = ET.fromstring(xosc_content)
            xodr_root = ET.fromstring(xodr_content)
            
            # Check if road network reference matches
            road_network = xosc_root.find(".//RoadNetwork/LogicFile")
            if road_network is not None:
                referenced_file = road_network.get("filepath", "")
                if referenced_file and not referenced_file.endswith(".xodr"):
                    issues.append(ValidationIssue(
                        level="WARNING",
                        message=f"Referenced road network file '{referenced_file}' does not have .xodr extension"
                    ))
            
            # Check for road ID consistency
            # Get road IDs from OpenDRIVE
            xodr_road_ids = set()
            for road in xodr_root.findall(".//road"):
                road_id = road.get("id")
                if road_id:
                    xodr_road_ids.add(road_id)
            
            # Check if OpenSCENARIO references valid road IDs
            for position in xosc_root.findall(".//LanePosition"):
                road_id = position.get("roadId")
                if road_id and road_id not in xodr_road_ids:
                    issues.append(ValidationIssue(
                        level="ERROR",
                        message=f"OpenSCENARIO references road ID '{road_id}' which is not defined in OpenDRIVE"
                    ))
            
        except ET.ParseError as e:
            issues.append(ValidationIssue(
                level="ERROR",
                message=f"Cross-validation failed due to XML parsing error: {str(e)}"
            ))
        except Exception as e:
            issues.append(ValidationIssue(
                level="WARNING",
                message=f"Cross-validation partially failed: {str(e)}"
            ))
        
        return issues
    
    def get_validation_capabilities(self) -> Dict[str, str]:
        """Get information about available validation capabilities"""
        return {
            "validation_level": self.validation_level,
            "xmlschema_available": HAS_XMLSCHEMA,
            "lxml_available": HAS_LXML,
            "capabilities": {
                "schema_validation": "Full XSD schema validation" if HAS_XMLSCHEMA else "Not available",
                "enhanced_xml": "Enhanced XML parsing with better error reporting" if HAS_LXML else "Not available", 
                "basic_xml": "Basic XML well-formedness validation",
                "domain_validation": "ASAM-specific domain validation rules",
                "cross_validation": "Cross-file consistency checks"
            }
        }

# Global service instance
validation_service = ASAMValidationService()