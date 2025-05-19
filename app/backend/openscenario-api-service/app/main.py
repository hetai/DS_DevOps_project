from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\nasync def read_root():\n    return {'message': 'OpenSCENARIO API is running'}
