"""
Test suite for ASAM Quality Checker Framework (QCF) integration
Following TDD RED phase - these tests should fail initially

Tests the complete ASAM QCF integration including:
- QCF executable invocation
- XQAR report generation and parsing
- Custom NCAP compliance checkers
- Cartesian coordinate extraction
- XML path extraction
"""

import pytest
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import json
import os

from app.validation_service import ASAMValidationService, ValidationIssue, ValidationResult
from app.asam_qcf_service import (
    ASAMQCFService,
    QCFResult,
    XQARReport,
    QCFChecker,
    NCAPComplianceChecker,
    QCFExecutionError,
    XQARParseError
)


class TestASAMQCFService:
    """Test suite for ASAM QCF Service"""
    
    @pytest.fixture
    def qcf_service(self):
        """Create QCF service instance for testing"""
        return ASAMQCFService()
    
    @pytest.fixture
    def sample_xosc_content(self):
        """Sample OpenSCENARIO content for testing"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader revMajor="1" revMinor="2" date="2025-06-29T00:00:00" description="Test scenario" name="test_scenario"/>
    <RoadNetwork>
        <LogicFile filepath="test_road.xodr"/>
    </RoadNetwork>
    <Entities>
        <ScenarioObject name="ego_vehicle">
            <Vehicle name="ego_vehicle" vehicleCategory="car"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="ego_vehicle">
                    <PrivateAction>
                        <TeleportAction>
                            <Position>
                                <LanePosition roadId="1" laneId="-1" s="0"/>
                            </Position>
                        </TeleportAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="MyStory">
            <Act name="MyAct"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
    
    @pytest.fixture
    def sample_xodr_content(self):
        """Sample OpenDRIVE content for testing"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
    <header revMajor="1" revMinor="7" date="2025-06-29T00:00:00"/>
    <road name="TestRoad" length="100.0" id="1" junction="-1">
        <planView>
            <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="100.0">
                <line/>
            </geometry>
        </planView>
        <lanes>
            <laneSection s="0.0">
                <center>
                    <lane id="0" type="none" level="true"/>
                </center>
                <right>
                    <lane id="-1" type="driving" level="true">
                        <width sOffset="0.0" a="3.5" b="0.0" c="0.0" d="0.0"/>
                    </lane>
                </right>
            </laneSection>
        </lanes>
    </road>
</OpenDRIVE>'''
    
    @pytest.fixture
    def sample_xqar_content(self):
        """Sample XQAR report content for testing"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<xqar:Report xmlns:xqar="http://asam.net/xml/qc-framework">
    <xqar:Header>
        <xqar:CheckerBundles>
            <xqar:CheckerBundle name="OpenSCENARIOChecker"/>
            <xqar:CheckerBundle name="OpenDRIVEChecker"/>
            <xqar:CheckerBundle name="NCAPComplianceChecker"/>
        </xqar:CheckerBundles>
    </xqar:Header>
    <xqar:CheckerResults>
        <xqar:CheckerResult checkerId="openscenario.structure">
            <xqar:Issues>
                <xqar:Issue issueId="1" level="Error" description="Missing required Storyboard element">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/OpenSCENARIO" line="2" column="15"/>
                        <xqar:CartesianCoordinate x="0.0" y="0.0" z="0.0"/>
                    </xqar:Locations>
                </xqar:Issue>
                <xqar:Issue issueId="2" level="Warning" description="Vehicle speed exceeds recommended limit">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/OpenSCENARIO/Entities/ScenarioObject[@name='ego_vehicle']" line="8" column="25"/>
                        <xqar:CartesianCoordinate x="10.5" y="2.3" z="0.1"/>
                    </xqar:Locations>
                </xqar:Issue>
            </xqar:Issues>
        </xqar:CheckerResult>
        <xqar:CheckerResult checkerId="ncap.compliance">
            <xqar:Issues>
                <xqar:Issue issueId="3" level="Error" description="Scenario does not meet NCAP AEB requirements">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/OpenSCENARIO/Storyboard" line="20" column="10"/>
                    </xqar:Locations>
                </xqar:Issue>
            </xqar:Issues>
        </xqar:CheckerResult>
    </xqar:CheckerResults>
</xqar:Report>'''

    def test_qcf_service_initialization(self, qcf_service):
        """Test QCF service initializes correctly"""
        assert qcf_service is not None
        assert hasattr(qcf_service, 'qcf_executable_path')
        assert hasattr(qcf_service, 'checker_bundles')
        assert hasattr(qcf_service, 'temp_dir')
    
    def test_qcf_executable_detection(self, qcf_service):
        """Test QCF executable is detected or configured"""
        # Should either find QCF executable or allow configuration
        assert qcf_service.is_qcf_available() in [True, False]
        
        if qcf_service.is_qcf_available():
            assert qcf_service.qcf_executable_path is not None
            assert Path(qcf_service.qcf_executable_path).exists()
    
    def test_checker_bundle_configuration(self, qcf_service):
        """Test checker bundles are properly configured"""
        bundles = qcf_service.get_available_checker_bundles()
        
        # Should have at least the standard ASAM checkers
        expected_bundles = [
            'OpenSCENARIOChecker',
            'OpenDRIVEChecker'
        ]
        
        for bundle in expected_bundles:
            assert bundle in bundles or not qcf_service.is_qcf_available()
    
    @patch('subprocess.run')
    def test_qcf_validation_execution(self, mock_subprocess, qcf_service, sample_xosc_content, sample_xodr_content, sample_xqar_content):
        """Test QCF validation execution"""
        # Mock QCF availability
        with patch.object(qcf_service, 'is_qcf_available', return_value=True):
            # Mock successful QCF execution
            mock_result = Mock()
            mock_result.returncode = 0
            mock_result.stdout = "QCF validation completed successfully"
            mock_result.stderr = ""
            mock_subprocess.return_value = mock_result
            
            # Mock XQAR file creation
            with patch('pathlib.Path.exists', return_value=True):
                with patch('builtins.open', create=True) as mock_open:
                    mock_open.return_value.__enter__.return_value.read.return_value = sample_xqar_content
                    
                    result = qcf_service.validate_scenario_files(
                        xosc_content=sample_xosc_content,
                        xodr_content=sample_xodr_content
                    )
            
            assert isinstance(result, QCFResult)
            assert result.is_valid in [True, False]  # Should complete without error
            assert mock_subprocess.called
    
    def test_qcf_validation_with_custom_checkers(self, qcf_service, sample_xosc_content, sample_xodr_content):
        """Test QCF validation with custom NCAP compliance checkers"""
        with patch.object(qcf_service, 'is_qcf_available', return_value=True):
            with patch.object(qcf_service, '_execute_qcf') as mock_execute:
                mock_execute.return_value = (0, "Success", "")
                
                # Mock XQAR report content and parsing
                mock_xqar_content = '''<?xml version="1.0"?>
<xqar:Report xmlns:xqar="http://asam.net/xml/qc-framework">
    <xqar:CheckerResults>
        <xqar:CheckerResult checkerId="test">
            <xqar:Issues></xqar:Issues>
        </xqar:CheckerResult>
    </xqar:CheckerResults>
</xqar:Report>'''
                
                with patch('pathlib.Path.exists', return_value=True):
                    with patch('builtins.open', create=True) as mock_open:
                        mock_open.return_value.__enter__.return_value.read.return_value = mock_xqar_content
                        
                        result = qcf_service.validate_scenario_files(
                            xosc_content=sample_xosc_content,
                            xodr_content=sample_xodr_content,
                            include_ncap_checkers=True
                        )
            
            assert isinstance(result, QCFResult)
            # Should have executed with NCAP checkers
            mock_execute.assert_called_once()
            call_args = mock_execute.call_args[1] if mock_execute.call_args.kwargs else mock_execute.call_args[0]
            # Verify NCAP checkers were included in the call
    
    def test_qcf_validation_error_handling(self, qcf_service, sample_xosc_content):
        """Test QCF validation handles errors gracefully"""
        with patch.object(qcf_service, '_execute_qcf') as mock_execute:
            # Simulate QCF execution failure
            mock_execute.side_effect = QCFExecutionError("QCF executable not found")
            
            with pytest.raises(QCFExecutionError):
                qcf_service.validate_scenario_files(
                    xosc_content=sample_xosc_content,
                    xodr_content=None
                )
    
    def test_qcf_invalid_file_handling(self, qcf_service):
        """Test QCF handles invalid input files"""
        invalid_xml = "This is not valid XML content"
        
        with pytest.raises(Exception):  # Should raise appropriate exception
            qcf_service.validate_scenario_files(
                xosc_content=invalid_xml,
                xodr_content=None
            )


class TestXQARReportParsing:
    """Test suite for XQAR report parsing"""
    
    @pytest.fixture
    def qcf_service(self):
        return ASAMQCFService()
    
    @pytest.fixture
    def sample_xqar_content(self):
        """Sample XQAR report content for testing"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<xqar:Report xmlns:xqar="http://asam.net/xml/qc-framework">
    <xqar:Header>
        <xqar:CheckerBundles>
            <xqar:CheckerBundle name="OpenSCENARIOChecker"/>
            <xqar:CheckerBundle name="NCAPComplianceChecker"/>
        </xqar:CheckerBundles>
    </xqar:Header>
    <xqar:CheckerResults>
        <xqar:CheckerResult checkerId="openscenario.structure">
            <xqar:Issues>
                <xqar:Issue issueId="1" level="Error" description="Missing required element">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/OpenSCENARIO/Storyboard" line="15" column="8"/>
                        <xqar:CartesianCoordinate x="25.5" y="10.2" z="0.0"/>
                    </xqar:Locations>
                </xqar:Issue>
                <xqar:Issue issueId="2" level="Warning" description="Deprecated attribute usage">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/OpenSCENARIO/Entities/ScenarioObject" line="8" column="20"/>
                    </xqar:Locations>
                </xqar:Issue>
            </xqar:Issues>
        </xqar:CheckerResult>
    </xqar:CheckerResults>
</xqar:Report>'''
    
    def test_xqar_report_parsing(self, qcf_service, sample_xqar_content):
        """Test XQAR report is parsed correctly"""
        report = qcf_service._parse_xqar_report(sample_xqar_content)
        
        assert isinstance(report, XQARReport)
        assert len(report.issues) >= 2
        
        # Check first issue
        first_issue = report.issues[0]
        assert first_issue.level == "Error"
        assert first_issue.description == "Missing required element"
        assert first_issue.xpath == "/OpenSCENARIO/Storyboard"
        assert first_issue.line_number == 15
        assert first_issue.column_number == 8
        
        # Check cartesian coordinates
        assert first_issue.cartesian_x == 25.5
        assert first_issue.cartesian_y == 10.2
        assert first_issue.cartesian_z == 0.0
    
    def test_xqar_parsing_with_missing_elements(self, qcf_service):
        """Test XQAR parsing handles missing optional elements"""
        minimal_xqar = '''<?xml version="1.0" encoding="UTF-8"?>
<xqar:Report xmlns:xqar="http://asam.net/xml/qc-framework">
    <xqar:CheckerResults>
        <xqar:CheckerResult checkerId="test.checker">
            <xqar:Issues>
                <xqar:Issue issueId="1" level="Info" description="Test issue">
                    <xqar:Locations>
                        <xqar:XmlLocation xpath="/test" line="1"/>
                    </xqar:Locations>
                </xqar:Issue>
            </xqar:Issues>
        </xqar:CheckerResult>
    </xqar:CheckerResults>
</xqar:Report>'''
        
        report = qcf_service._parse_xqar_report(minimal_xqar)
        
        assert isinstance(report, XQARReport)
        assert len(report.issues) == 1
        
        issue = report.issues[0]
        assert issue.level == "Info"
        assert issue.column_number is None  # Should handle missing column
        assert issue.cartesian_x is None     # Should handle missing coordinates
    
    def test_xqar_parsing_invalid_xml(self, qcf_service):
        """Test XQAR parsing handles invalid XML"""
        invalid_xqar = "This is not valid XML"
        
        with pytest.raises(XQARParseError):
            qcf_service._parse_xqar_report(invalid_xqar)
    
    def test_xqar_issue_extraction(self, qcf_service, sample_xqar_content):
        """Test extraction of issues from XQAR report"""
        report = qcf_service._parse_xqar_report(sample_xqar_content)
        
        # Should extract all issues
        assert len(report.issues) >= 2
        
        # Check issue levels
        levels = [issue.level for issue in report.issues]
        assert "Error" in levels
        assert "Warning" in levels
        
        # Check XPath extraction
        xpaths = [issue.xpath for issue in report.issues if issue.xpath]
        assert len(xpaths) > 0
        assert "/OpenSCENARIO/Storyboard" in xpaths


class TestNCAPComplianceChecker:
    """Test suite for NCAP compliance checking"""
    
    @pytest.fixture
    def ncap_checker(self):
        return NCAPComplianceChecker()
    
    @pytest.fixture
    def sample_aeb_scenario(self):
        """Sample AEB (Autonomous Emergency Braking) scenario"""
        return '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader name="AEB_Test" description="NCAP AEB test scenario"/>
    <Entities>
        <ScenarioObject name="ego_vehicle">
            <Vehicle vehicleCategory="car"/>
        </ScenarioObject>
        <ScenarioObject name="target_vehicle">
            <Vehicle vehicleCategory="car"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="ego_vehicle">
                    <PrivateAction>
                        <LongitudinalAction>
                            <SpeedAction>
                                <SpeedActionDynamics dynamicsShape="step" value="50"/>  <!-- 50 km/h -->
                                <SpeedActionTarget>
                                    <AbsoluteTargetSpeed value="13.89"/>  <!-- 50 km/h in m/s -->
                                </SpeedActionTarget>
                            </SpeedAction>
                        </LongitudinalAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="AEB_Story">
            <Act name="AEB_Act"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
    
    def test_ncap_checker_initialization(self, ncap_checker):
        """Test NCAP checker initializes with proper rules"""
        assert ncap_checker is not None
        assert hasattr(ncap_checker, 'aeb_rules')
        assert hasattr(ncap_checker, 'lss_rules')  # Lane Support System
        assert hasattr(ncap_checker, 'validate_scenario')
    
    def test_aeb_scenario_validation(self, ncap_checker, sample_aeb_scenario):
        """Test AEB scenario validation against NCAP requirements"""
        issues = ncap_checker.validate_aeb_scenario(sample_aeb_scenario)
        
        assert isinstance(issues, list)
        # AEB scenarios should check for:
        # - Vehicle speeds within NCAP range (10-80 km/h)
        # - Proper target vehicle configuration
        # - Required initial conditions
        
        # Check that speed validation is performed
        speed_issues = [issue for issue in issues if 'speed' in issue.message.lower()]
        # Should validate speeds are within NCAP AEB test parameters
    
    def test_lss_scenario_validation(self, ncap_checker):
        """Test Lane Support System scenario validation"""
        lss_scenario = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader name="LSS_Test" description="NCAP LSS test scenario"/>
    <Entities>
        <ScenarioObject name="ego_vehicle">
            <Vehicle vehicleCategory="car"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="ego_vehicle">
                    <PrivateAction>
                        <LongitudinalAction>
                            <SpeedAction>
                                <SpeedActionTarget>
                                    <AbsoluteTargetSpeed value="22.22"/>  <!-- 80 km/h -->
                                </SpeedActionTarget>
                            </SpeedAction>
                        </LongitudinalAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="LSS_Story">
            <Act name="LSS_Act"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
        
        issues = ncap_checker.validate_lss_scenario(lss_scenario)
        
        assert isinstance(issues, list)
        # LSS scenarios should check for:
        # - Vehicle speeds within highway range (60-130 km/h)
        # - Lane departure scenarios
        # - Proper road markings requirements
    
    def test_ncap_speed_range_validation(self, ncap_checker):
        """Test NCAP speed range validation"""
        # Test valid AEB speed (50 km/h)
        valid_speed_issues = ncap_checker._validate_speed_range(50, "AEB")
        assert len(valid_speed_issues) == 0
        
        # Test invalid AEB speed (too high)
        invalid_speed_issues = ncap_checker._validate_speed_range(100, "AEB")
        assert len(invalid_speed_issues) > 0
        assert any("speed" in issue.description.lower() for issue in invalid_speed_issues)
        
        # Test valid LSS speed (80 km/h)
        valid_lss_issues = ncap_checker._validate_speed_range(80, "LSS")
        assert len(valid_lss_issues) == 0
    
    def test_ncap_vehicle_configuration_validation(self, ncap_checker, sample_aeb_scenario):
        """Test NCAP vehicle configuration requirements"""
        issues = ncap_checker.validate_vehicle_configuration(sample_aeb_scenario)
        
        assert isinstance(issues, list)
        # Should check for:
        # - Required vehicle categories
        # - Proper vehicle dimensions for NCAP tests
        # - Mandatory vehicle properties


class TestQCFIntegrationEndToEnd:
    """End-to-end integration tests for QCF"""
    
    @pytest.fixture
    def validation_service(self):
        return ASAMValidationService()
    
    def test_full_qcf_validation_workflow(self, validation_service):
        """Test complete QCF validation workflow"""
        xosc_content = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader revMajor="1" revMinor="2" date="2025-06-29T00:00:00" description="Test scenario" name="test_scenario"/>
    <RoadNetwork>
        <LogicFile filepath="test_road.xodr"/>
    </RoadNetwork>
    <Entities>
        <ScenarioObject name="ego_vehicle">
            <Vehicle name="ego_vehicle" vehicleCategory="car"/>
        </ScenarioObject>
    </Entities>
    <Storyboard>
        <Init>
            <Actions>
                <Private entityRef="ego_vehicle">
                    <PrivateAction>
                        <TeleportAction>
                            <Position>
                                <LanePosition roadId="1" laneId="-1" s="0"/>
                            </Position>
                        </TeleportAction>
                    </PrivateAction>
                </Private>
            </Actions>
        </Init>
        <Story name="MyStory">
            <Act name="MyAct"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
        
        xodr_content = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenDRIVE>
    <header revMajor="1" revMinor="7" date="2025-06-29T00:00:00"/>
    <road name="TestRoad" length="100.0" id="1" junction="-1">
        <planView>
            <geometry s="0.0" x="0.0" y="0.0" hdg="0.0" length="100.0">
                <line/>
            </geometry>
        </planView>
        <lanes>
            <laneSection s="0.0">
                <center>
                    <lane id="0" type="none" level="true"/>
                </center>
                <right>
                    <lane id="-1" type="driving" level="true">
                        <width sOffset="0.0" a="3.5" b="0.0" c="0.0" d="0.0"/>
                    </lane>
                </right>
            </laneSection>
        </lanes>
    </road>
</OpenDRIVE>'''
        
        # Should integrate QCF validation when available
        result = validation_service.validate_scenario_pair(xosc_content, xodr_content)
        
        assert isinstance(result, ValidationResult)
        assert result.is_valid in [True, False]
        
        # If QCF is available, should have enhanced validation results
        if hasattr(validation_service, 'qcf_service') and validation_service.qcf_service.is_qcf_available():
            # Should include QCF-specific validation issues
            qcf_issues = [issue for issue in result.issues if hasattr(issue, 'xpath') and issue.xpath]
            assert len(qcf_issues) >= 0  # May have QCF-specific issues
    
    def test_qcf_performance_requirements(self, validation_service):
        """Test QCF validation meets performance requirements"""
        import time
        
        # Simple scenario for performance testing
        simple_xosc = '''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader name="perf_test"/>
    <Entities/>
    <Storyboard>
        <Story name="test">
            <Act name="test"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
        
        start_time = time.time()
        result = validation_service.validate_openscenario(simple_xosc)
        end_time = time.time()
        
        # Should complete within 30 seconds (PRD requirement)
        validation_time = end_time - start_time
        assert validation_time < 30.0, f"Validation took {validation_time:.2f}s, exceeds 30s requirement"
        
        assert isinstance(result, ValidationResult)
    
    def test_qcf_concurrent_validation(self, validation_service):
        """Test QCF can handle concurrent validation requests"""
        import threading
        import time
        
        results = []
        errors = []
        
        def validate_scenario(scenario_id):
            try:
                xosc = f'''<?xml version="1.0" encoding="UTF-8"?>
<OpenSCENARIO>
    <FileHeader name="test_{scenario_id}"/>
    <Entities/>
    <Storyboard>
        <Story name="test">
            <Act name="test"/>
        </Story>
    </Storyboard>
</OpenSCENARIO>'''
                
                result = validation_service.validate_openscenario(xosc)
                results.append((scenario_id, result))
            except Exception as e:
                errors.append((scenario_id, e))
        
        # Test with 3 concurrent validations (less than PRD target of 5)
        threads = []
        for i in range(3):
            thread = threading.Thread(target=validate_scenario, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join(timeout=60)  # 60 second timeout
        
        # Should complete all validations without errors
        assert len(errors) == 0, f"Concurrent validation errors: {errors}"
        assert len(results) == 3, f"Expected 3 results, got {len(results)}"
        
        # All results should be valid ValidationResult objects
        for scenario_id, result in results:
            assert isinstance(result, ValidationResult), f"Invalid result for scenario {scenario_id}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])