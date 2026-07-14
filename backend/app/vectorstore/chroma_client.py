from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
import os
from dotenv import load_dotenv

load_dotenv()

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

def create_vector_store(chunks):

    vectordb = Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory="vector_db"
    )

    vectordb.persist()

    return vectordb