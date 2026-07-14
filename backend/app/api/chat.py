from fastapi import APIRouter
from pydantic import BaseModel

from app.rag.rag_pipeline import rag_query

router = APIRouter(prefix="/chat")

class Query(BaseModel):
    question: str

@router.post("/")
async def chat(query: Query):

    answer = rag_query(query.question)

    return {"answer": answer}