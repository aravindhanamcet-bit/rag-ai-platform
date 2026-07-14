from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from dotenv import load_dotenv
import os

load_dotenv(override=True)

# Absolute path to vectorstore
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VECTORSTORE_DIR = os.path.join(BASE_DIR, "vectorstore")

print(f"Using Gemini model: {os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite')}")


def get_llm():
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3,
    )


def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
    )


def rag_query(question: str):
    embeddings = get_embeddings()

    try:
        db = Chroma(
            persist_directory=VECTORSTORE_DIR,
            embedding_function=embeddings,
        )

        collection = db.get()
        num_docs = len(collection.get("ids", []))

        print(f"\nVector store path : {VECTORSTORE_DIR}")
        print(f"Vector store contains {num_docs} chunks")

        if num_docs == 0:
            return "No documents found. Please upload a PDF first."

    except Exception as e:
        print(f"Error loading vector store: {e}")
        return f"Error loading vector store: {e}"

    retriever = db.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 8,
            "fetch_k": 20,
        },
    )

    # ---------------- DEBUG ----------------
    docs = retriever.invoke(question)

    print("\n================ RETRIEVED DOCUMENTS ================\n")

    for i, doc in enumerate(docs):
        print(f"Document {i+1}")
        print("-" * 60)
        print(doc.page_content[:600])
        print()

    print("=====================================================\n")
    # ---------------------------------------

    prompt = ChatPromptTemplate.from_template(
        """
You are a helpful assistant that answers questions ONLY from the provided document.

DOCUMENT:
{context}

QUESTION:
{question}

Rules:
1. Use ONLY the document.
2. Never use outside knowledge.
3. If the answer is not present, reply:
"I couldn't find that information in the uploaded document."
4. Keep the answer concise and factual.

ANSWER:
"""
    )

    def format_docs(docs):
        if not docs:
            return "No relevant information found."

        return "\n\n".join(
            [
                f"[Chunk {i+1}]\n{doc.page_content}"
                for i, doc in enumerate(docs)
            ]
        )

    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
        }
        | prompt
        | get_llm()
        | StrOutputParser()
    )

    try:
        return chain.invoke(question)

    except Exception as e:
        print(f"Gemini Error: {e}")
        return f"Error processing query: {e}"