from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
from datetime import datetime
from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
import chromadb
import re

from app.database.mongo import files_collection
from app.rag.rag_pipeline import get_embeddings

router = APIRouter(prefix="/upload")

# Absolute Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOAD_DIR = os.path.join(BASE_DIR, "app", "uploads")
VECTORSTORE_DIR = os.path.join(BASE_DIR, "vectorstore")
COLLECTION_NAME = "langchain"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTORSTORE_DIR, exist_ok=True)

# -------------------------------------------------------------------
# Single, process-wide Chroma client.
#
# IMPORTANT: chromadb's Rust core caches its SQLite connection per
# directory path for the lifetime of the process. Previously this code
# deleted VECTORSTORE_DIR on every upload and reopened a brand new
# PersistentClient at the same path — but the cached connection from
# the *previous* client would still be referencing the now-deleted
# database file, causing:
#
#   chromadb.errors.InternalError: Database error: error returned
#   from database: (code: 1032) attempt to write a readonly database
#
# on every upload after the first. The fix is to open ONE client for
# the whole process and clear data through it (delete/recreate the
# collection), never delete the directory on disk while the process
# is running.
# -------------------------------------------------------------------
_chroma_client = chromadb.PersistentClient(path=VECTORSTORE_DIR)


def clean_extracted_text(text: str) -> str:
    """
    Clean text extracted from PDF.
    """
    cleaned = re.sub(r'(\S)\s(?=\S)', r'\1', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
    return cleaned.strip()


def load_pdf(filepath: str):
    """
    Load a PDF into LangChain Document objects using pypdf directly,
    avoiding the heavier langchain-community dependency chain.
    """
    reader = PdfReader(filepath)
    docs = [
        Document(
            page_content=page.extract_text() or "",
            metadata={"source": filepath, "page": i},
        )
        for i, page in enumerate(reader.pages)
    ]
    return docs


def reset_vector_store():
    """
    Clear all existing data from the vector store WITHOUT deleting the
    underlying directory/database file on disk, and WITHOUT creating a
    new client. Reuses the single process-wide _chroma_client so its
    internal connection stays valid.
    """
    try:
        collections = _chroma_client.list_collections()
        for col in collections:
            _chroma_client.delete_collection(col.name)
            print(f"🗑️ Deleted Chroma collection: {col.name}")
    except Exception as e:
        print(f"Warning: Could not clear Chroma collections: {e}")

    print("✅ Vector store cleared (directory untouched)")


@router.post("/")
async def upload_file(file: UploadFile = File(...)):

    result = None  # defined upfront so the except block can safely reference it

    try:

        # -------------------------------------------------
        # Delete Previous Uploaded Files
        # -------------------------------------------------
        if os.path.exists(UPLOAD_DIR):
            for existing_file in os.listdir(UPLOAD_DIR):
                existing_path = os.path.join(UPLOAD_DIR, existing_file)
                if os.path.isfile(existing_path):
                    try:
                        os.remove(existing_path)
                    except Exception as e:
                        print(f"Could not delete {existing_file}: {e}")

        # -------------------------------------------------
        # Clear Vector Store (in place, same client)
        # -------------------------------------------------
        reset_vector_store()

        # -------------------------------------------------
        # Keep only latest MongoDB record
        # -------------------------------------------------
        files_collection.delete_many({})

        # -------------------------------------------------
        # Save Uploaded File
        # -------------------------------------------------
        filepath = os.path.join(UPLOAD_DIR, file.filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        meta = {
            "filename": file.filename,
            "file_type": file.content_type,
            "upload_time": datetime.utcnow(),
            "vector_index_status": "pending",
        }

        result = files_collection.insert_one(meta)

        # -------------------------------------------------
        # Only Process PDFs
        # -------------------------------------------------
        if not file.filename.lower().endswith(".pdf"):

            files_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"vector_index_status": "skipped"}},
            )

            return {
                "message": "Only PDF files are supported.",
                "filename": file.filename,
            }

        print("\n" + "=" * 60)
        print(f"Processing PDF : {file.filename}")
        print("=" * 60)

        # -------------------------------------------------
        # Load PDF
        # -------------------------------------------------
        docs = load_pdf(filepath)

        print(f"✅ Loaded {len(docs)} pages")

        # -------------------------------------------------
        # Clean Text
        # -------------------------------------------------
        for doc in docs:
            doc.page_content = clean_extracted_text(doc.page_content)

        print("\nPreview:")
        print(docs[0].page_content[:300])

        # -------------------------------------------------
        # Split Document
        # -------------------------------------------------
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,
            chunk_overlap=400,
            separators=["\n\n", "\n", ":", " ", ""],
        )

        splits = splitter.split_documents(docs)

        print(f"\n✅ Created {len(splits)} chunks")

        if splits:
            print("\nFirst Chunk Preview:\n")
            print(splits[0].page_content[:250])

        # -------------------------------------------------
        # Create Embeddings & Populate Vector Store
        # (reuse the same process-wide client — do NOT create a
        # new PersistentClient here)
        # -------------------------------------------------
        embeddings = get_embeddings()

        vectorstore = Chroma(
            client=_chroma_client,
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
        vectorstore.add_documents(splits)

        print("\n✅ Vector Store Populated")
        print(f"Location : {VECTORSTORE_DIR}")
        print(f"Total chunks stored: {len(splits)}")

        # -------------------------------------------------
        # Update MongoDB
        # -------------------------------------------------
        files_collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"vector_index_status": "completed"}},
        )

        print(f"\n✅ Successfully Processed {file.filename}")
        print("=" * 60)

        return {
            "message": "File uploaded and indexed successfully.",
            "filename": file.filename,
            "chunks_created": len(splits),
            "vector_status": "completed",
        }

    except Exception as e:

        import traceback
        traceback.print_exc()

        if result is not None:
            try:
                files_collection.update_one(
                    {"_id": result.inserted_id},
                    {
                        "$set": {
                            "vector_index_status": "failed",
                            "error": str(e),
                        }
                    },
                )
            except:
                pass

        # Raise a real HTTP error instead of returning 200, so the
        # frontend's axios `catch` block correctly detects the failure.
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}",
        )