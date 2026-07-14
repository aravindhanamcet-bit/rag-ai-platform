from fastapi import APIRouter, UploadFile, File
import shutil
import os
from datetime import datetime
from langchain_community.document_loaders import PyPDFLoader
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

os.makedirs(UPLOAD_DIR, exist_ok=True)


def clean_extracted_text(text: str) -> str:
    """
    Clean text extracted from PDF.
    """
    cleaned = re.sub(r'(\S)\s(?=\S)', r'\1', text)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
    return cleaned.strip()


def reset_vector_store():
    """
    Fully reset the Chroma vector store by:
    1. Deleting all collections via chromadb client
    2. Deleting the directory on disk
    """
    try:
        # Step 1: Connect to Chroma and delete all collections
        if os.path.exists(VECTORSTORE_DIR):
            client = chromadb.PersistentClient(path=VECTORSTORE_DIR)
            collections = client.list_collections()
            for col in collections:
                client.delete_collection(col.name)
                print(f"🗑️ Deleted Chroma collection: {col.name}")
            del client
    except Exception as e:
        print(f"Warning: Could not clear Chroma collections: {e}")

    try:
        # Step 2: Delete the directory on disk
        if os.path.exists(VECTORSTORE_DIR):
            shutil.rmtree(VECTORSTORE_DIR, ignore_errors=True)
            print("🗑️ Vector store directory deleted")
    except Exception as e:
        print(f"Warning: Could not delete vector store directory: {e}")

    # Step 3: Recreate empty directory
    os.makedirs(VECTORSTORE_DIR, exist_ok=True)
    print("✅ Fresh vector store directory created")


@router.post("/")
async def upload_file(file: UploadFile = File(...)):

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
        # Fully Reset Vector Store
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
        loader = PyPDFLoader(filepath)
        docs = loader.load()

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
        # Create Embeddings & New Vector Store
        # -------------------------------------------------
        embeddings = get_embeddings()

        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            persist_directory=VECTORSTORE_DIR,
        )

        # Release Handle
        del vectorstore

        print("\n✅ New Vector Store Created")
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

        return {
            "message": "File upload failed.",
            "error": str(e),
        }