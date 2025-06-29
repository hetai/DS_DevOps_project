import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import App from '../App'

const AppWithRouter = ({ initialEntries = ['/'] }: { initialEntries?: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <App />
  </MemoryRouter>
)

describe('App Component', () => {
  beforeEach(() => {
    // Clear any mocks or state before each test
  })

  describe('Navigation', () => {
    it('should render navigation with all three main links', () => {
      render(<AppWithRouter />)
      
      expect(screen.getByText('OpenSCENARIO Tool Suite')).toBeInTheDocument()
      expect(screen.getByText('Scenario Player')).toBeInTheDocument()
      expect(screen.getByText('Scenario Generator')).toBeInTheDocument()
      expect(screen.getByText('Scenario Validator')).toBeInTheDocument()
    })

    it('should highlight active navigation link', () => {
      render(<AppWithRouter initialEntries={['/generator']} />)
      
      const generatorLink = screen.getByText('Scenario Generator')
      const playerLink = screen.getByText('Scenario Player')
      
      // Active link should have different styling
      expect(generatorLink).toHaveStyle('background-color: #0066cc')
      expect(playerLink).not.toHaveStyle('background-color: #0066cc')
    })

    it('should navigate between pages when links are clicked', async () => {
      const user = userEvent.setup()
      render(<AppWithRouter />)
      
      // Start on Scenario Player page
      expect(screen.getByText('Load OpenSCENARIO File')).toBeInTheDocument()
      
      // Navigate to Generator
      await user.click(screen.getByText('Scenario Generator'))
      expect(screen.getByText('AI Scenario Generator')).toBeInTheDocument()
      expect(screen.getByText('Scenario Description')).toBeInTheDocument()
      
      // Navigate to Validator
      await user.click(screen.getByText('Scenario Validator'))
      expect(screen.getByText('Upload Files for Validation')).toBeInTheDocument()
    })
  })

  describe('Scenario Player Page', () => {
    it('should render file upload and simulation controls', () => {
      render(<AppWithRouter />)
      
      expect(screen.getByText('Load OpenSCENARIO File')).toBeInTheDocument()
      expect(screen.getByText('Run Simulation')).toBeInTheDocument()
      expect(screen.getByText('3D Visualization')).toBeInTheDocument()
      expect(screen.getByDisplayValue('No file loaded')).toBeInTheDocument()
    })

    it('should enable simulation button when file is selected', async () => {
      const user = userEvent.setup()
      render(<AppWithRouter />)
      
      const fileInput = screen.getByLabelText(/choose openscenario file/i) as HTMLInputElement
      const runButton = screen.getByText('Run Simulation')
      
      // Initially disabled
      expect(runButton).toBeDisabled()
      
      // Create a mock file
      const file = new File(['test content'], 'test.xosc', { type: 'application/xml' })
      
      await user.upload(fileInput, file)
      
      expect(runButton).toBeEnabled()
      expect(screen.getByDisplayValue(/Loaded file: test.xosc/)).toBeInTheDocument()
    })
  })

  describe('Scenario Generator Page', () => {
    beforeEach(() => {
      render(<AppWithRouter initialEntries={['/generator']} />)
    })

    it('should render scenario description form', () => {
      expect(screen.getByText('AI Scenario Generator')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Describe your scenario in natural language...')).toBeInTheDocument()
      expect(screen.getByText('Generate Scenario')).toBeInTheDocument()
    })

    it('should enable generate button when description is provided', async () => {
      const user = userEvent.setup()
      
      const textarea = screen.getByPlaceholderText('Describe your scenario in natural language...')
      const generateButton = screen.getByText('Generate Scenario')
      
      // Initially disabled
      expect(generateButton).toBeDisabled()
      
      await user.type(textarea, 'A car overtaking scenario on a highway')
      
      expect(generateButton).toBeEnabled()
    })

    it('should show generation progress when generating', async () => {
      const user = userEvent.setup()
      
      const textarea = screen.getByPlaceholderText('Describe your scenario in natural language...')
      const generateButton = screen.getByText('Generate Scenario')
      
      await user.type(textarea, 'Test scenario')
      await user.click(generateButton)
      
      expect(screen.getByText('Generating...')).toBeInTheDocument()
      expect(screen.getByText('📄 scenario.xosc (generating...)')).toBeInTheDocument()
      expect(screen.getByText('🗺️ road_network.xodr (generating...)')).toBeInTheDocument()
      
      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getByText('Generate Scenario')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      expect(screen.getByText('📄 scenario.xosc ✓')).toBeInTheDocument()
      expect(screen.getByText('🗺️ road_network.xodr ✓')).toBeInTheDocument()
      expect(screen.getByText('Download Files')).toBeInTheDocument()
    })
  })

  describe('Scenario Validator Page', () => {
    beforeEach(() => {
      render(<AppWithRouter initialEntries={['/validator']} />)
    })

    it('should render file upload and validation controls', () => {
      expect(screen.getByText('Upload Files for Validation')).toBeInTheDocument()
      expect(screen.getByText('Validate Files')).toBeInTheDocument()
      expect(screen.getByText('Validation Results')).toBeInTheDocument()
      expect(screen.getByDisplayValue('No validation performed yet')).toBeInTheDocument()
    })

    it('should enable validate button when files are selected', async () => {
      const user = userEvent.setup()
      
      const fileInput = screen.getByLabelText(/choose files to validate/i) as HTMLInputElement
      const validateButton = screen.getByText('Validate Files')
      
      // Initially disabled
      expect(validateButton).toBeDisabled()
      
      const file1 = new File(['content1'], 'test1.xosc', { type: 'application/xml' })
      const file2 = new File(['content2'], 'test2.xodr', { type: 'application/xml' })
      
      await user.upload(fileInput, [file1, file2])
      
      expect(validateButton).toBeEnabled()
    })

    it('should show validation results when validating', async () => {
      const user = userEvent.setup()
      
      const fileInput = screen.getByLabelText(/choose files to validate/i) as HTMLInputElement
      const validateButton = screen.getByText('Validate Files')
      
      const file = new File(['content'], 'test.xosc', { type: 'application/xml' })
      await user.upload(fileInput, file)
      await user.click(validateButton)
      
      expect(screen.getByDisplayValue(/Validating 1 file\(s\)/)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/Schema validation passed/)).toBeInTheDocument()
      expect(screen.getByDisplayValue(/ASAM compliance check passed/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<AppWithRouter />)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      const h3s = screen.getAllByRole('heading', { level: 3 })
      
      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
      expect(h3s.length).toBeGreaterThan(0)
    })

    it('should have keyboard navigation support', () => {
      render(<AppWithRouter />)
      
      // Verify that navigation links are focusable
      const playerLink = screen.getByText('Scenario Player')
      const generatorLink = screen.getByText('Scenario Generator')
      const validatorLink = screen.getByText('Scenario Validator')
      
      // Links should be focusable elements
      expect(playerLink.tagName).toBe('A')
      expect(generatorLink.tagName).toBe('A')
      expect(validatorLink.tagName).toBe('A')
      
      // Focus functionality
      playerLink.focus()
      expect(playerLink).toHaveFocus()
    })
  })

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // This test would require a component that throws an error
      // For now, we'll test that the app renders without crashing
      expect(() => render(<AppWithRouter />)).not.toThrow()
    })
  })
})