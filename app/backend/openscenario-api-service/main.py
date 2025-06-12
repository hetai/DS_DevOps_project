from fastapi import FastAPI

app = FastAPI()

@app.get('/')
async def read_root():
    return {'message': 'OpenSCENARIO API is running'}

@app.get('/health')
async def health_check():
    return {'status': 'healthy'}
