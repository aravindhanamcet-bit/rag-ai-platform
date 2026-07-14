from fastapi import APIRouter
from app.database.mongo import files_collection

router = APIRouter(prefix="/files")

@router.get("/")
async def list_files():

    files = []

    for file in files_collection.find({}, {"_id":0}):
        files.append(file)

    return {"files": files}