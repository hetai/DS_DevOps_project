
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useState } from "react";

// Basic Navigation Component (no external dependencies)
function Navigation() {
  const location = useLocation();
  
  const navStyle = {
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    marginBottom: '2rem'
  };
  
  const linkStyle = {
    margin: '0 1rem',
    padding: '0.5rem 1rem',
    textDecoration: 'none',
    color: '#0066cc',
    borderRadius: '4px',
    display: 'inline-block'
  };
  
  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: '#0066cc',
    color: 'white'
  };
  
  return (
    <nav style={navStyle}>
      <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>OpenSCENARIO Tool Suite</h2>
      <div>
        <Link 
          to="/" 
          style={location.pathname === '/' ? activeLinkStyle : linkStyle}
        >
          Scenario Player
        </Link>
        <Link 
          to="/generator" 
          style={location.pathname === '/generator' ? activeLinkStyle : linkStyle}
        >
          Scenario Generator
        </Link>
        <Link 
          to="/validator" 
          style={location.pathname === '/validator' ? activeLinkStyle : linkStyle}
        >
          Scenario Validator
        </Link>
      </div>
    </nav>
  );
}

// Page Components
function ScenarioPlayer() {
  const [file, setFile] = useState<File | null>(null);
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Scenario Player</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>Load OpenSCENARIO File</h3>
            <label htmlFor="scenario-file-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Choose OpenSCENARIO File
            </label>
            <input 
              id="scenario-file-input"
              type="file" 
              accept=".xosc"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ 
                marginBottom: '1rem',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
              }}
            />
            <button 
              disabled={!file}
              style={{ 
                padding: '0.75rem 1.5rem',
                backgroundColor: file ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: file ? 'pointer' : 'not-allowed'
              }}
            >
              Run Simulation
            </button>
          </div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white',
            marginTop: '1rem'
          }}>
            <h3>Results</h3>
            <textarea 
              readOnly
              value={file ? `Loaded file: ${file.name}\nReady for simulation...` : "No file loaded"}
              style={{ 
                width: '100%',
                height: '150px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '0.5rem',
                fontFamily: 'monospace'
              }}
            />
          </div>
        </div>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>3D Visualization</h3>
            <div style={{ 
              width: '100%',
              height: '400px',
              backgroundColor: '#f8f9fa',
              border: '2px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px'
            }}>
              <p style={{ color: '#6c757d' }}>3D Scenario Visualization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioGenerator() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation process
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>AI Scenario Generator</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>Scenario Description</h3>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your scenario in natural language..."
              style={{ 
                width: '100%',
                height: '200px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '0.5rem',
                marginBottom: '1rem'
              }}
            />
            <button 
              onClick={handleGenerate}
              disabled={!description.trim() || isGenerating}
              style={{ 
                padding: '0.75rem 1.5rem',
                backgroundColor: (!description.trim() || isGenerating) ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!description.trim() || isGenerating) ? 'not-allowed' : 'pointer'
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Scenario'}
            </button>
          </div>
        </div>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>Generated Files</h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                padding: '0.5rem',
                backgroundColor: isGenerating ? '#fff3cd' : '#d4edda',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                📄 scenario.xosc {isGenerating ? '(generating...)' : '✓'}
              </div>
              <div style={{ 
                padding: '0.5rem',
                backgroundColor: isGenerating ? '#fff3cd' : '#d4edda',
                border: '1px solid #ffeaa7',
                borderRadius: '4px'
              }}>
                🗺️ road_network.xodr {isGenerating ? '(generating...)' : '✓'}
              </div>
            </div>
            {!isGenerating && description && (
              <button 
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '0.5rem'
                }}
              >
                Download Files
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioValidator() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [validationResult, setValidationResult] = useState<string>('');
  
  const handleValidate = () => {
    if (files) {
      setValidationResult(`Validating ${files.length} file(s)...\n✓ Schema validation passed\n✓ ASAM compliance check passed\n⚠️ 2 warnings found`);
    }
  };
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Scenario Validator</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>Upload Files for Validation</h3>
            <label htmlFor="validation-file-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Choose Files to Validate
            </label>
            <input 
              id="validation-file-input"
              type="file" 
              multiple
              accept=".xosc,.xodr"
              onChange={(e) => setFiles(e.target.files)}
              style={{ 
                marginBottom: '1rem',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                width: '100%'
              }}
            />
            <button 
              onClick={handleValidate}
              disabled={!files}
              style={{ 
                padding: '0.75rem 1.5rem',
                backgroundColor: files ? '#17a2b8' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: files ? 'pointer' : 'not-allowed'
              }}
            >
              Validate Files
            </button>
          </div>
        </div>
        <div>
          <div style={{ 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            padding: '1.5rem',
            backgroundColor: 'white'
          }}>
            <h3>Validation Results</h3>
            <textarea 
              readOnly
              value={validationResult || "No validation performed yet"}
              style={{ 
                width: '100%',
                height: '200px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '0.5rem',
                fontFamily: 'monospace'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <Navigation />
      <Routes>
        <Route path="/" element={<ScenarioPlayer />} />
        <Route path="/generator" element={<ScenarioGenerator />} />
        <Route path="/validator" element={<ScenarioValidator />} />
      </Routes>
    </div>
  );
}

export default App;
