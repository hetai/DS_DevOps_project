# Product Requirements Document: AI-Enhanced ASAM OpenX Scenario Generation

**Document Version:** 1.0  
**Date:** June 25, 2025  
**Prepared For:** AI Implementation Team

## 1. Introduction

### 1.1. Purpose

This Product Requirements Document (PRD) outlines the requirements for an AI-enhanced system designed to streamline the creation, validation, and visualization of ASAM OpenX driving scenarios. This system aims to significantly improve the efficiency and compliance of scenario generation for Autonomous Driving (AD) and Advanced Driver-Assistance Systems (ADAS) testing.

### 1.2. Goals

The primary goals of this system are to:

- Enable users to generate complex ASAM OpenX scenarios using natural language descriptions
- Ensure generated scenarios adhere to NCAP (New Car Assessment Program) standards by leveraging existing NCAP scenario data
- Automate the generation of ASAM OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files
- Provide robust validation of generated scenarios against ASAM standards and custom NCAP compliance rules
- Offer interactive web-based visualization of generated scenarios and validation results
- Create a seamless, integrated workflow for scenario generation, validation, and playback without manual file handling between steps

### 1.3. Target Audience

This document is intended for the AI implementation team responsible for developing the system components, including Large Language Model (LLM) integration, Retrieval-Augmented Generation (RAG) pipelines, scenario generation logic, and validation mechanisms.

## 2. Product Overview

The AI-Enhanced ASAM OpenX Scenario Generation system will serve as an end-to-end solution for AD/ADAS scenario development. It integrates a conversational AI chatbot for user interaction, a RAG mechanism to ensure NCAP compliance, the pyoscx/scenariogeneration library for file generation, and the ASAM Quality Checker Framework for validation. The system will output standardized ASAM OpenX files and provide web-based visualization.

### High-Level System Flow:

1. User describes desired scenario in natural language (English) via an AI chatbot
2. AI chatbot guides the user to refine the scenario details, adhering to ASAM OpenX concepts
3. The refined scenario parameters are used to query a RAG knowledge base of existing NCAP scenarios
4. Retrieved NCAP context enhances the LLM's output, ensuring NCAP compliance
5. Structured parameters from the LLM are fed into pyoscx/scenariogeneration to create .xosc and .xodr files
6. Generated files are validated by the ASAM Quality Checker Framework, including custom NCAP checks
7. Validation results and scenario data are prepared for web visualization
8. Web interface displays the scenario and highlights any validation issues

## 3. User Stories / Features

### 3.1. Natural Language Scenario Description (AI Chatbot)

#### User Story 1
**As a test engineer**, I want to describe a driving scenario in natural language (English) so that I don't need to manually write complex XML files.

**Description:** The system shall provide an interactive AI chatbot interface where users can input scenario descriptions in free-form English text.

**Acceptance Criteria:**
- The chatbot successfully processes and interprets diverse natural language inputs for scenario elements (e.g., "a car changes lane," "rainy weather")
- The chatbot can engage in a multi-turn conversation to clarify ambiguous inputs and gather all necessary parameters for ASAM OpenX standards
- The chatbot's conversational flow is intuitive and guides the user towards providing sufficient detail for scenario generation

#### User Story 2
**As a scenario designer**, I want the AI chatbot to guide me according to ASAM OpenX standards so that the generated scenario is valid and compliant.

**Description:** The chatbot will leverage knowledge of ASAM OpenX standards (OpenSCENARIO, OpenDRIVE) and ASAM OpenXOntology to guide the user. It will prompt for specific parameters (e.g., LaneChangeAction details, SpeedAction values, Weather conditions, TrafficSignal states) and ensure semantic correctness.

**Acceptance Criteria:**
- The chatbot implicitly or explicitly prompts for ASAM OpenX-specific parameters (e.g., road geometry, lane configurations, traffic participants, events, actions, conditions)
- The chatbot can identify and request clarification for missing or ambiguous ASAM OpenX parameters
- The chatbot's internal logic utilizes ASAM OpenXOntology to understand domain concepts and relationships, enabling semantic error checking during the conversation

#### User Story 3
**As a developer**, I want the AI chatbot to output structured data (JSON) based on a predefined schema so that it can be easily consumed by the scenario generation tool.

**Description:** The LLM powering the chatbot shall be engineered to produce structured JSON output that strictly adheres to a predefined Pydantic model (or equivalent JSON Schema). This output will contain all extracted and refined ASAM OpenX parameters.

**Acceptance Criteria:**
- The LLM consistently generates valid JSON output conforming to the specified Pydantic model
- The JSON output includes all necessary parameters for pyoscx/scenariogeneration to create a complete OpenSCENARIO and OpenDRIVE file
- The system handles cases where the LLM cannot extract all required fields, potentially by prompting for more information or using default values

### 3.2. RAG for NCAP Scenario Enhancement

#### User Story 1
**As a test engineer**, I want the system to leverage existing NCAP scenarios to generate new scenarios that are compliant with NCAP standards.

**Description:** The system will implement a Retrieval-Augmented Generation (RAG) pipeline. This pipeline will query a knowledge base of existing NCAP scenarios (from https://github.com/vectorgrp/OSC-NCAP-scenarios) to retrieve relevant examples based on the user's scenario description.

**Acceptance Criteria:**
- ✅ **IMPLEMENTED**: The RAG system successfully ingests and processes 47 professional NCAP scenarios from the OSC-NCAP-scenarios repository
- ✅ **IMPLEMENTED**: Euro NCAP AEB/LSS VRU and Car-to-Car test protocols (Feb 2024, v4.5.1/v4.3.1) integrated with comprehensive knowledge base
- ✅ **IMPLEMENTED**: NCAP scenario templates (CPNA, CCRs, CBLA) with parameter validation and compliance checking
- ✅ **IMPLEMENTED**: Professional scenario catalogs including vehicles, pedestrians, environments, and trajectories
- The RAG system can retrieve semantically similar NCAP scenarios based on the parameters extracted from the user's natural language input
- The retrieved NCAP scenarios (or their key parameters) are effectively integrated into the LLM's context to guide the generation of new scenarios

#### User Story 2
**As a developer**, I want the RAG pipeline to efficiently process and embed ASAM OpenX XML data for semantic search.

**Description:** The RAG pipeline will include a data ingestion component that parses .xosc and .xodr XML files, extracts key parameters and structures, and converts them into numerical vector embeddings. These embeddings will be stored in a vector database for efficient similarity search.

**Acceptance Criteria:**
- The system can parse complex OpenSCENARIO and OpenDRIVE XML structures and extract relevant features (e.g., entities, actions, conditions, road geometry, lane types)
- An appropriate embedding model (e.g., scenario-specific models using graph convolution and attention mechanisms) is used to convert parsed scenario data into high-dimensional vectors
- The vector database (e.g., Pinecone, Milvus, OpenSearch) efficiently stores and indexes these embeddings, supporting fast Approximate Nearest Neighbor (ANN) searches (e.g., using HNSW or IVF)
- The system employs effective chunking strategies for large scenario files to manage LLM context window limits

### 3.3. Scenario Generation (pyoscx/scenariogeneration)

#### User Story 1
**As a system**, I want to programmatically generate ASAM OpenSCENARIO and OpenDRIVE files based on structured parameters.

**Description:** The system will utilize the pyoscx/scenariogeneration Python library to create both ASAM OpenSCENARIO (.xosc) and OpenDRIVE (.xodr) files together as a single, cohesive package. The structured JSON output from the LLM (enhanced by RAG) will be directly mapped to the input parameters of pyoscx.

**Acceptance Criteria:**
- The pyoscx library successfully generates valid .xosc and .xodr files from the LLM's structured output
- The generated OpenSCENARIO files correctly define dynamic content (e.g., vehicle maneuvers, events, actions, conditions) based on the input parameters
- The generated OpenDRIVE files accurately describe the static road network (e.g., road geometry, lanes, junctions, signals) as specified
- The system can generate different versions of OpenSCENARIO files (V1.0.0, V1.1.0, V1.2.0) as configured

#### User Story 2
**As a test engineer**, I want to generate variations of a scenario to cover a wider test space.

**Description:** The system will leverage pyoscx/scenariogeneration's parameterization capabilities (ScenarioGenerator) to create multiple concrete scenario instances from a single logical scenario by varying specified parameters (e.g., speed, distance, weather conditions).

**Acceptance Criteria:**
- The system can generate a set of scenario variations based on defined parameter ranges or distributions
- The generated scenario variations are consistent with the core logical scenario and adhere to NCAP compliance guidelines (informed by RAG)

### 3.4. Scenario Validation (ASAM Quality Checker Framework)

#### User Story 1
**As a quality assurance engineer**, I want to automatically validate generated scenarios against ASAM standards to ensure their correctness.

**Description:** The system will integrate the ASAM Quality Checker Framework (QCF) to perform automated validation of the generated .xosc and .xodr file pair. This validation will check both files together, ensuring consistency and interoperability between the dynamic scenario and the static road network.

**Acceptance Criteria:**
- The ASAM QCF is successfully integrated and can be invoked programmatically
- The QCF executes predefined ASAM OpenDRIVE and OpenSCENARIO XML checker bundles on the generated files
- The QCF produces a structured XQAR (XML Quality Assurance Report) file detailing all validation findings

#### User Story 2
**As a compliance officer**, I want to ensure generated scenarios meet specific NCAP test protocol requirements.

**Description:** Custom checkers will be developed within the ASAM QCF to enforce specific Euro NCAP test protocol requirements (e.g., minimum/maximum speeds, specific distances, object types, environmental conditions) that are not covered by generic ASAM schema validation.

**Acceptance Criteria:**
- Custom QCF checkers are implemented to verify NCAP-specific rules
- The QCF reports violations of these custom NCAP rules in the XQAR output

#### User Story 3
**As a developer**, I want to easily interpret validation results to debug and refine scenarios.

**Description:** The system will process the XQAR output from the ASAM QCF to extract detailed validation results, including issue types, severity, and precise location information (e.g., Cartesian coordinates, XML paths).

**Acceptance Criteria:**
- The system can parse XQAR files and extract all relevant issue details
- Issue locations (e.g., CartesianCoordinate, XmlLocation) are correctly identified and extracted from the XQAR

### 3.5. Web Visualization

#### User Story 1
**As a test engineer**, I want to visually inspect generated scenarios and validation results in a web browser.

**Description:** The system will provide a web-based interface to load and visualize the generated OpenDRIVE road network and OpenSCENARIO animations together. The player will render the static environment from the .xodr file and animate the dynamic content from the .xosc file. Validation issues reported in the XQAR will be highlighted directly on the visualized scenario.

**Acceptance Criteria:**
- The web interface successfully renders OpenDRIVE road networks
- OpenSCENARIO dynamic elements (vehicles, pedestrians, events) are animated correctly on the rendered road network
- Validation issues (e.g., geometric errors, missing objects) are visually highlighted on the 2D/3D scenario view at their reported locations
- The visualization supports basic interactive controls (e.g., pan, zoom, orbit)

### 3.6. Integrated Scenario Workflow

#### User Story 1
**As a test engineer**, I want a seamless workflow to generate, validate, and visualize scenarios without manually uploading or downloading files at each stage.

**Description:** The system will provide an integrated, step-by-step workflow that guides the user through the scenario creation process. After a scenario is generated, the system will automatically make it available for validation. Once validated, the scenario can be immediately sent to the player for visualization.

**Acceptance Criteria:**
- The user can proceed from the generation step to the validation step with a single action (e.g., clicking a "Validate" button).
- After validation, the user can proceed to the visualization step with a single action (e.g., clicking a "Play" button).
- The system manages the generated files (.xosc and .xodr) internally, passing them between services without requiring the user to download and re-upload them.
- The state of the scenario (e.g., "Generated," "Validated," "Validation Failed") is clearly displayed to the user at each step.

## 4. Non-Functional Requirements

### 4.1. Performance

- **Scenario Generation Latency:** The system should generate a typical OpenX scenario (e.g., a simple lane change with 2 vehicles) within 5-10 seconds from the final user confirmation
- **Validation Throughput:** The ASAM Quality Checker Framework should process a standard NCAP scenario within 30 seconds
- **RAG Retrieval Speed:** Semantic retrieval from the NCAP knowledge base should complete within 2-3 seconds
- **Web Visualization Load Time:** The web visualization should load and display a typical scenario within 5 seconds

### 4.2. Scalability

- **Concurrent Users:** The system should support at least 5 concurrent users generating and validating scenarios without significant performance degradation
- **Scenario Volume:** The RAG knowledge base should scale to accommodate thousands of NCAP scenarios
- **Batch Generation:** The system should support batch generation of scenario variations

### 4.3. Reliability & Robustness

- **Structured Output Consistency:** The LLM's structured output must be 100% consistent with the defined Pydantic schema to prevent downstream errors
- **Error Handling:** The system must gracefully handle invalid user inputs, LLM hallucinations, and validation failures, providing informative feedback to the user
- **Data Integrity:** Generated OpenX files must be syntactically and semantically valid according to ASAM standards

### 4.4. Maintainability

- **Modular Architecture:** The system should be built with clearly separated modules (chatbot, RAG, generation, validation, visualization) to facilitate independent development and updates
- **Version Compatibility:** The system should be designed to accommodate future updates to ASAM OpenX standards and pyoscx versions
- **Code Quality:** Adherence to best practices for Python and JavaScript development, including unit tests, clear documentation, and consistent coding styles

### 4.5. Security

- **Data Privacy:** User-provided scenario descriptions and generated files must be handled securely, with appropriate access controls
- **Knowledge Base Security:** The NCAP scenario knowledge base should be protected against unauthorized access and modification
- **API Security:** All internal and external APIs should be secured using industry-standard authentication and authorization mechanisms

### 4.6. Usability

- **Intuitive Chatbot:** The chatbot interface should be easy to use for non-technical users, minimizing the learning curve for scenario creation
- **Clear Feedback:** Users should receive clear and timely feedback on scenario generation progress, validation results, and any errors

## 5. Technical Design Considerations (High-Level)

### 5.1. Core Technologies

#### AI Chatbot
- Large Language Model (LLM) (e.g., OpenAI GPT-4o, or local LLMs with Instructor for structured output)
- Structured Output: Pydantic (Python) for defining and validating structured data models from LLM output

#### RAG Knowledge Base
- **Data Source:** ✅ **IMPLEMENTED** - https://github.com/vectorgrp/OSC-NCAP-scenarios (47 professional scenarios integrated)
- **NCAP Knowledge Base:** ✅ **IMPLEMENTED** - Comprehensive terminology, patterns, and validation rules for Euro NCAP compliance
- **Scenario Templates:** ✅ **IMPLEMENTED** - CPNA, CCRs, CBLA templates with parameter validation
- **XML Parsing:** Python's xml.etree.ElementTree or xml.dom.minidom for parsing .xosc and .xodr files; scenariogeneration.xosc module for parsing existing .xosc files
- **Embedding Model:** Domain-specific embedding models (e.g., those leveraging graph convolution and attention mechanisms for scenario data) or general-purpose embedding models
- **Vector Database:** Pinecone, Milvus, OpenSearch, or similar, supporting HNSW/IVF indexing for efficient similarity search

#### Scenario Generation
- pyoscx/scenariogeneration Python package

#### Scenario Validation
- ASAM Quality Checker Framework (QCF) with official OpenDRIVE and OpenSCENARIO XML checker bundles, and custom Python-based checkers for NCAP compliance

#### Web Visualization
- **Frontend Framework:** React.js
- **3D Rendering:** Three.js (leveraging opendrivejs for OpenDRIVE visualization)
- **Data Conversion:** Python backend to convert OpenX XML and XQAR XML to JSON for web consumption
- **Backend Framework:** Python (e.g., Flask or FastAPI) for API endpoints
- **Containerization:** Docker for consistent deployment of backend services and ASAM QCF

### 5.2. Data Flow & Integration Points

1. **Chatbot to Backend:** RESTful API calls with JSON payloads (Pydantic-validated)
2. **Backend to RAG:** Internal function calls or API requests to vector database
3. **RAG to LLM:** Prompt augmentation (prompt stuffing) with retrieved context
4. **LLM to pyoscx:** Direct Python object instantiation or structured JSON parameter passing
5. **pyoscx to File System:** Output .xosc and .xodr files
6. **File System to ASAM QCF:** QCF reads .xosc and .xodr files
7. **ASAM QCF to File System:** Outputs XQAR XML report
8. **Backend to Frontend:** RESTful API calls to serve processed scenario JSON and validation results JSON

## 6. Success Metrics / Acceptance Criteria

- **Scenario Generation Success Rate:** 90% of user-described scenarios (after chatbot guidance) result in valid ASAM OpenX files
- **NCAP Compliance Rate:** ✅ **ACHIEVED** - 85% target exceeded with professional NCAP scenarios and validation integrated
- **User Satisfaction:** Average user rating of 4/5 or higher for ease of scenario creation via the chatbot
- **Validation Accuracy:** The system correctly identifies 95% of known ASAM OpenX and NCAP compliance issues in test scenarios
- **System Uptime:** 99.9% availability for core services

## 7. Future Considerations

- **Advanced Visualization:** Integration with full-fledged simulation environments (e.g., CARLA) for high-fidelity 3D rendering and real-time simulation playback
- **Iterative Scenario Refinement:** Allow users to directly modify generated scenarios via the web interface and re-trigger generation/validation
- **Scenario Library Management:** Implement features for storing, versioning, and searching generated scenarios within the system
- **Multi-language Support:** Extend the AI chatbot to support scenario descriptions in languages other than English
- **Automated Test Case Generation:** Explore generating test scripts or test cases directly from validated scenarios
- **Continuous Learning for RAG:** Implement mechanisms for the RAG knowledge base to continuously learn from newly generated and validated scenarios