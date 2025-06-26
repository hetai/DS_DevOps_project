#!/bin/bash

echo "🤖 Setting up AI-Enhanced OpenSCENARIO System"
echo "=============================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
else
    echo "✅ Docker found"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
else
    echo "✅ Docker Compose found"
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
else
    echo "✅ Git found"
fi

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data/ncap_data
mkdir -p data/validator
mkdir -p data/generated_scenarios

# Set up environment variables
echo "🔧 Setting up environment variables..."

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# OpenAI API Key (required for AI functionality)
OPENAI_API_KEY=your-openai-api-key-here

# System Configuration
LOG_LEVEL=INFO
EOF
    echo "⚠️  Please edit .env file and add your OpenAI API key"
fi

# Check for existing OpenAI key
if grep -q "your-openai-api-key-here" .env 2>/dev/null; then
    echo "⚠️  Warning: Please update the OPENAI_API_KEY in .env file"
    echo "   You can get an API key from: https://platform.openai.com/account/api-keys"
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo ""
echo "1. Edit .env file and add your OpenAI API key:"
echo "   nano .env"
echo ""
echo "2. Start the development environment:"
echo "   docker-compose -f docker-compose.dev.yml up -d --build"
echo ""
echo "3. View logs:"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8080"
echo "   API Docs: http://localhost:8080/docs"
echo ""
echo "5. Stop the system:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""
echo "📚 For more information, see docs/development.md"
echo ""

# Make the script executable
chmod +x setup_ai_system.sh