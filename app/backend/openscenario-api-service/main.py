#!/usr/bin/env python3
"""
Main entry point for the AI-Enhanced OpenSCENARIO API
"""

from app.main_working import app

# This is the main entry point when running the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
