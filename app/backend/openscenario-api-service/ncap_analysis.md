# NCAP Scenarios Analysis

## Overview
The OSC-NCAP-scenarios repository contains professional-grade OpenSCENARIO implementations of Euro NCAP test protocols for autonomous emergency braking (AEB) systems.

## Key Scenario Categories

### 1. Car-to-Pedestrian (CP) Scenarios
- **CPNA** (Nearside Adult): 25%, 75% overlap variants
- **CPFA** (Farside Adult): 50% overlap
- **CPNCO** (Nearside Child Obstructed): 50% overlap  
- **CPLA** (Longitudinal Adult): 25%, 50% variants
- **CPRA** (Reverse Adult): Moving/stationary variants
- **CPTA** (Turning Adult): 50% overlap

### 2. Car-to-Bicyclist (CB) Scenarios  
- **CBNA** (Nearside Adult): 50% overlap
- **CBNAO** (Nearside Adult Obstructed): 50% overlap
- **CBFA** (Farside Adult): 50% overlap
- **CBLA** (Longitudinal Adult): 25%, 50% variants

### 3. Car-to-Motorcyclist (CM) Scenarios
- **CMFtap** (Front Turn Across Path): Similar to CCFtap

### 4. Car-to-Car (CC) Scenarios
- **CCFhol** (Front Head-On Lane change)
- **CCFhos** (Front Head-On Straight)  
- **CCFtap** (Front Turn-Across-Path)
- **CCRs** (Rear Stationary)
- **CCRm** (Rear Moving)
- **CCRb** (Rear Braking)

## Technical Patterns

### Parameter Structure
- **Overlap**: Collision overlap percentage (25%, 50%, 75%)
- **Speed Parameters**: Both kph and m/s conversions
- **Vehicle Dimensions**: Ego vehicle length, width, bounding box
- **Initial Conditions**: TTC (time-to-collision), positions, speeds
- **VRU Properties**: Width, collision point offset, trajectory orientation

### Common Parameters
```xml
<ParameterDeclaration name="Overlap" parameterType="double" value="25"/>
<ParameterDeclaration name="Ego_speed_kph" parameterType="double" value="30"/>
<ParameterDeclaration name="Ego_initTTC" parameterType="double" value="6"/>
<ParameterDeclaration name="VRU_finalSpeed_kph" parameterType="double" value="5"/>
```

### Scenario Structure
- Uses OpenSCENARIO XML 1.3
- Parameter-driven "logical scenarios" for variations
- Catalog-based entity definitions
- Event-driven story structure with conditions and actions

### Entity Catalogs
- **Vehicles**: Various car types, bicycles, obstruction vehicles
- **Pedestrians**: Adult and child pedestrians with NCAP specifications
- **Environments**: Weather and lighting conditions
- **Trajectories**: Predefined paths for complex maneuvers

## Integration Opportunities

### 1. Template System
- Use NCAP scenarios as base templates for AI generation
- Extract parameter ranges and validation rules
- Implement NCAP compliance checking

### 2. Parameter Learning
- Common speed ranges: 10-80 kph
- TTC values: 2.5-6 seconds typically
- Overlap percentages: 25%, 50%, 75%
- Standard vehicle dimensions and performance characteristics

### 3. Validation Framework
- Compare generated scenarios against NCAP standards
- Validate parameter ranges and physical constraints
- Ensure OpenSCENARIO 1.3 compliance

### 4. RAG Enhancement
- Index scenario descriptions and patterns
- Create searchable knowledge base of NCAP test cases
- Enable natural language queries for specific test scenarios

## Implementation Recommendations

1. **Parse NCAP catalogs** to extract vehicle/pedestrian definitions
2. **Create parameter validators** based on NCAP constraints
3. **Implement scenario templates** for each NCAP test type
4. **Add NCAP compliance flags** to generation parameters
5. **Enhance AI prompts** with NCAP terminology and patterns