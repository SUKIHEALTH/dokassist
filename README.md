# DokAssist

AI-ondersteunde protocolcoach voor medewerkers in de huisartspraktijk.
Praktijkhouders uploaden protocollen en werkwijzes; teamleden stellen
vragen die beantwoord worden op basis van de eigen praktijkdocumenten.

**DokAssist neemt geen medische beslissingen.** Bij twijfel of spoed
wordt altijd verwezen naar de eindverantwoordelijke professional.

## Structuur

```
dokassist/
  backend/    # FastAPI + ChromaDB + Anthropic Claude (RAG)
  frontend/   # Next.js + Tailwind CSS (UI)
```

## Deployment

### 1. Backend → Railway

1. Ga naar [railway.app](https://railway.app) → New Project → Deploy from folder
2. Selecteer de `backend/` map
3. **Volume mount**: voeg een Volume toe, mount aan `/data`
4. **Environment variables**:
   - `ANTHROPIC_API_KEY` = jouw Anthropic API key (vereist)
   - `ALLOWED_ORIGIN` = jouw Vercel URL (na stap 2)
   - `DATA_DIR` = `/data`
5. Noteer de Railway URL (bijv. `https://dokassist-backend.up.railway.app`)

### 2. Frontend → Vercel

1. Ga naar [vercel.com](https://vercel.com) → New Project → Import de `frontend/` map
2. **Environment variables**:
   - `NEXT_PUBLIC_API_URL` = de Railway URL uit stap 1
3. Deploy
4. Ga terug naar Railway en zet `ALLOWED_ORIGIN` naar je Vercel URL

### 3. Testen

1. Open de Vercel URL
2. Klik "Praktijkhouder" → vul je naam → maak een praktijk aan
3. Upload protocollen (PDF/DOCX/TXT)
4. Stel werkafspraken in (optioneel)
5. Deel de **aanmeldcode** met je team
6. Teamleden klikken "Medewerker" → vullen hun naam in → voeren de code in → stellen vragen

## Lokaal draaien

```bash
# Backend
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --reload --port 8000

# Frontend (andere terminal)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## API

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/practice` | Praktijk aanmaken → join_code |
| GET | `/api/practice/{join_code}` | Praktijk ophalen via code |
| GET | `/api/practice/{id}/documents` | Documenten ophalen |
| POST | `/api/practice/{id}/upload` | Documenten uploaden (PDF/DOCX/TXT) |
| DELETE | `/api/practice/{id}/documents/{doc_id}` | Document verwijderen |
| PUT | `/api/practice/{id}/conditions` | Werkafspraken opslaan |
| POST | `/api/practice/{id}/chat` | Vraag stellen aan protocolcoach |
