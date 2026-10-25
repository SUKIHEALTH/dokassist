"""
DokAssist — AI protocol coach for GP practice onboarding & daily support.

Simplified multi-practice RAG system:
- Practice owners upload their own protocols/werkwijzes (PDF, DOCX, TXT)
- Team members join via a practice code and ask questions
- The AI answers from the practice's own documents, with source citations
- Always defers clinical decisions to the responsible professional
"""

import os
import sqlite3
import secrets
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import chromadb
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
import docx
from openai import OpenAI

# ---------- Config ----------
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DATA_DIR = os.environ.get("DATA_DIR", "/data")
MAX_FILES = 20
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")

PROTOCOLS_DIR = Path(__file__).parent

Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "dokassist.db")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma")

# ---------- System prompt ----------
SYSTEM_PROMPT = """Je bent DokAssist, een AI-protocolcoach voor medewerkers in een huisartsenpraktijk.

Context: Je beantwoordt vragen op basis van de protocollen, werkwijzen en werkafspraken die deze specifieke praktijk heeft geüpload. Dit zijn echte praktijkdocumenten — behandel de inhoud als de autoriteit voor hoe het in deze praktijk werkt.

Taak: Beantwoord vragen ALLEEN met informatie uit de geüplode documenten die in elk bericht worden meegeleverd. Antwoord in dezelfde taal als de vraag wordt gesteld (Nederlands of Engels). Als het antwoord niet in de documenten staat, zeg dat dan duidelijk en stel voor om het na te vragen bij de praktijkhouder of eindverantwoordelijke huisarts.

Beperkingen:
- Je neemt NOOIT medische beslissingen. Bij twijfel, spoed of afwijkende situaties verwijs je altijd door naar overleg met de eindverantwoordelijke professional (huisarts of praktijkhouder).
- Citeer altijd de bronnaam van het document waarop je je antwoord baseert.
- Houd antwoorden kort en direct.
- Als de praktijk aanvullende voorwaarden of werkafspraken heeft opgegeven (in het 'practice conditions' veld), neem die dan mee in je antwoorden.
- Benoem bij elk antwoord over spoed/urgentie dat bij twijfel altijd de huisarts moet worden overlegd."""

PRACTICE_CONDITIONS_PROMPT = (
    "\n\nAanvullende werkafspraken en voorwaarden van deze praktijk:\n{conditions}\n"
)

# ---------- App ----------
app = FastAPI(title="DokAssist")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB ----------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""CREATE TABLE IF NOT EXISTS practices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        join_code TEXT UNIQUE NOT NULL,
        conditions TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        practice_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        chunk_count INTEGER DEFAULT 0,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (practice_id) REFERENCES practices(id)
    )""")
    conn.commit()
    conn.close()


init_db()


def gen_id() -> str:
    return secrets.token_hex(12)


def gen_join_code() -> str:
    """6-character alphanumeric code, easy to share."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusable chars
    return "".join(secrets.choice(alphabet) for _ in range(6))


# ---------- RAG ----------
embedder = SentenceTransformer("all-MiniLM-L6-v2")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)


def get_or_create_collection(practice_id: str):
    return chroma_client.get_or_create_collection(f"practice_{practice_id}")


def extract_text(filename: str, content: bytes) -> str:
    ext = filename.lower().split(".")[-1]
    tmp_path = f"/tmp/{secrets.token_hex(8)}_{filename}"
    with open(tmp_path, "wb") as f:
        f.write(content)
    try:
        if ext == "pdf":
            reader = PdfReader(tmp_path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext == "docx":
            d = docx.Document(tmp_path)
            return "\n".join(p.text for p in d.paragraphs)
        elif ext == "txt":
            return content.decode("utf-8", errors="ignore")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    return ""


def prettify_filename(filename: str) -> str:
    name = filename.rsplit(".", 1)[0]
    name = name.replace("_", " ").replace("Protocol", "").strip()
    return name


def retrieve(collection, query: str, n_results: int = 5) -> list:
    query_embedding = embedder.encode([query]).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=n_results)
    docs = results.get("documents", [[]])
    metas = results.get("metadatas", [[]])
    if not docs or not docs[0]:
        return []
    return list(zip(docs[0], metas[0]))


# ---------- Models ----------
class PracticeCreate(BaseModel):
    name: str
    owner_name: str = ""


class ConditionsUpdate(BaseModel):
    conditions: str


class ChatRequest(BaseModel):
    message: str
    user_name: str = ""
    history: list = []


# ---------- Practice routes ----------
@app.get("/api/health")
def health():
    return {"status": "ok", "has_key": bool(OPENAI_API_KEY)}


@app.post("/api/practice")
def create_practice(req: PracticeCreate):
    if not req.name.strip():
        raise HTTPException(400, "Praktijknaam is verplicht.")
    practice_id = gen_id()
    join_code = gen_join_code()
    # Ensure unique join code
    conn = sqlite3.connect(DB_PATH)
    while conn.execute("SELECT 1 FROM practices WHERE join_code=?", (join_code,)).fetchone():
        join_code = gen_join_code()
    conn.execute(
        "INSERT INTO practices (id, name, join_code, conditions, created_at) VALUES (?, ?, ?, '', ?)",
        (practice_id, req.name.strip(), join_code, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    get_or_create_collection(practice_id)
    return {
        "id": practice_id,
        "name": req.name.strip(),
        "join_code": join_code,
        "conditions": "",
    }


@app.get("/api/practice/{join_code}")
def get_practice_by_code(join_code: str):
    join_code = join_code.upper().strip()
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT id, name, join_code, conditions FROM practices WHERE join_code=?",
        (join_code,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Praktijk niet gevonden. Controleer de code.")
    return {"id": row[0], "name": row[1], "join_code": row[2], "conditions": row[3]}


@app.get("/api/practice/{practice_id}/documents")
def list_documents(practice_id: str):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, filename, chunk_count, uploaded_at FROM documents WHERE practice_id=? ORDER BY uploaded_at DESC",
        (practice_id,),
    ).fetchall()
    conn.close()
    return {
        "documents": [
            {
                "id": r[0],
                "filename": prettify_filename(r[1]),
                "original_filename": r[1],
                "chunk_count": r[2],
                "uploaded_at": r[3],
            }
            for r in rows
        ]
    }


@app.post("/api/practice/{practice_id}/upload")
async def upload_documents(
    practice_id: str,
    files: List[UploadFile] = File(...),
):
    # Verify practice exists
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT id FROM practices WHERE id=?", (practice_id,)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Praktijk niet gevonden.")

    if len(files) > MAX_FILES:
        conn.close()
        raise HTTPException(400, f"Maximaal {MAX_FILES} bestanden tegelijk.")

    collection = get_or_create_collection(practice_id)
    total_chunks = 0
    processed_files = []

    for file in files:
        ext = file.filename.lower().split(".")[-1]
        if ext not in ALLOWED_EXTENSIONS:
            conn.close()
            raise HTTPException(400, f"Bestandstype niet ondersteund: {file.filename}. Toegestaan: PDF, DOCX, TXT.")

        content = await file.read()
        if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
            conn.close()
            raise HTTPException(400, f"{file.filename} is groter dan {MAX_FILE_SIZE_MB}MB.")

        text = extract_text(file.filename, content)
        if not text.strip():
            continue

        # Chunk the text
        words = text.split()
        chunks, metadatas, ids = [], [], []
        for i in range(0, len(words), 500):
            chunk = " ".join(words[i : i + 550])
            if chunk.strip():
                chunks.append(chunk)
                metadatas.append({"source": file.filename})
                ids.append(f"{file.filename}_{i}")

        if chunks:
            embeddings = embedder.encode(chunks).tolist()
            collection.add(embeddings=embeddings, documents=chunks, metadatas=metadatas, ids=ids)
            total_chunks += len(chunks)
            doc_id = conn.execute(
                "INSERT INTO documents (practice_id, filename, chunk_count, uploaded_at) VALUES (?, ?, ?, ?)",
                (practice_id, file.filename, len(chunks), datetime.utcnow().isoformat()),
            ).lastrowid
            processed_files.append({"filename": file.filename, "chunks": len(chunks), "id": doc_id})

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "files_processed": len(processed_files),
        "total_chunks": total_chunks,
        "files": processed_files,
    }


@app.delete("/api/practice/{practice_id}/documents/{doc_id}")
def delete_document(practice_id: str, doc_id: int):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT filename FROM documents WHERE id=? AND practice_id=?",
        (doc_id, practice_id),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Document niet gevonden.")
    filename = row[0]

    # Remove from ChromaDB
    collection = get_or_create_collection(practice_id)
    try:
        all_data = collection.get()
        ids_to_delete = [
            mid
            for mid, meta in zip(all_data.get("ids", []), all_data.get("metadatas", []))
            if meta.get("source") == filename
        ]
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
    except Exception:
        pass

    conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.put("/api/practice/{practice_id}/conditions")
def update_conditions(practice_id: str, req: ConditionsUpdate):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id FROM practices WHERE id=?", (practice_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Praktijk niet gevonden.")
    conn.execute("UPDATE practices SET conditions=? WHERE id=?", (req.conditions.strip(), practice_id))
    conn.commit()
    conn.close()
    return {"status": "ok", "conditions": req.conditions.strip()}


# ---------- Chat ----------
@app.post("/api/practice/{practice_id}/chat")
def chat(practice_id: str, req: ChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(500, "Server is niet correct geconfigureerd: ontbrekende API-sleutel.")

    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(
        "SELECT name, conditions FROM practices WHERE id=?", (practice_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Praktijk niet gevonden.")
    practice_name, conditions = row[0], row[1] or ""

    collection = get_or_create_collection(practice_id)
    if collection.count() == 0:
        return {
            "answer": "Er zijn nog geen protocollen of werkwijzen geüpload voor deze praktijk. Vraag de praktijkhouder om documenten toe te voegen via de DokAssist-app.",
            "sources": [],
        }

    retrieved = retrieve(collection, req.message, n_results=5)
    if not retrieved:
        return {
            "answer": "Ik kon geen relevante informatie vinden in de geüplode documenten. Probeer je vraag anders te stellen, of raadpleeg de praktijkhouder of eindverantwoordelijke huisarts.",
            "sources": [],
        }

    context = "\n\n---\n\n".join(
        f"[Bron: {meta.get('source', 'onbekend')}]\n{doc}" for doc, meta in retrieved
    )

    system = SYSTEM_PROMPT
    if conditions.strip():
        system += PRACTICE_CONDITIONS_PROMPT.format(conditions=conditions.strip())

    user_message = f"Geüploade protocollen en werkwijzen van {practice_name}:\n\n{context}\n\nVraag van medewerker: {req.message}"

    # Build message history
    messages = []
    for h in req.history[-10:]:  # last 10 turns max
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        # OpenAI uses a different message format - system goes in the messages array
        openai_messages = [{"role": "system", "content": system}] + messages
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1200,
            messages=openai_messages,
        )
        answer = response.choices[0].message.content
        if not answer:
            answer = "Ik kon geen antwoord genereren. Probeer het opnieuw."
    except Exception as e:
        answer = f"Er ging iets mis bij het genereren van een antwoord. Probeer het opnieuw. ({type(e).__name__}: {str(e)[:200]})"

    sources = list({meta.get("source", "onbekend") for _, meta in retrieved})

    return {
        "answer": answer,
        "sources": [prettify_filename(s) for s in sources],
    }
