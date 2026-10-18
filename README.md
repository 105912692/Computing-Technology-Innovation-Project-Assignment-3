# Phishing URL Detection

COS30049 Computing Technology Innovation Project, Assignment 3. A React front end and a FastAPI back end that say whether a URL is phishing or legitimate, with the model's confidence.

```
backend/                 FastAPI back end
  app/main.py            the API routes (GET /api/health, POST /api/check), CORS, model loaded once
  app/schemas.py         request and response contracts (Pydantic)
  app/errors.py          one JSON format for every error
  app/model.py           loads the model (hash checked) and labels URLs
  models/                MODEL_FINAL.joblib and registry.json (file, SHA-256, threshold)
  app/settings.py        settings read from .env
frontend/                React front end (Vite)
  src/api/client.js      every call to the back end
  src/components/        layout (header, footer) and the error boundary
  src/pages/             one file per page (home, 404)
  src/theme.js           MUI theme
```

## Requirements
- Python 3.12 or newer (needed by numpy 2.5 and scipy 1.18)
- Node.js 20.19+ or 22.12+ (needed by Vite 8) and npm

## Setup and run
Use two terminals, both starting in the project folder.

### Back end
```powershell
cd backend
copy .env.example .env
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
API documentation: http://127.0.0.1:8000/docs

### Front end
```powershell
cd frontend
npm ci                      # installs the exact versions in package-lock.json
npm run dev                 # http://localhost:5173 (calls to /api are forwarded to the back end)
```

## API contract
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | none | `{"status": "ok", "model": "MODEL_FINAL.joblib"}` |
| POST | `/api/check` | `{"url": "example.com/login"}` | `{"url": "...", "label": "phishing" or "legitimate", "confidence": 0.0-1.0}` |

Every error: `{"error": {"status": 422, "message": "Request is not valid", "details": [{"field": "body.url", "message": "..."}]}}`

## Model
- `backend/models/MODEL_FINAL.joblib`: the Assignment 2 pipeline (character n-gram TF-IDF + SGD classifier).
- `backend/models/registry.json`: the file name, its SHA-256 hash (checked before loading) and the threshold.
- A URL is labelled phishing when its phishing probability is at or above `threshold` (currently 0.3). Change it in `registry.json` and restart the back end.
- If the model file is replaced, update `sha256` too, or the back end will refuse to start.

## Architecture
TODO: diagram (browser -> React -> FastAPI -> model)

## Pinned dependencies
- Back end: `backend/requirements.txt`
- Front end: `frontend/package.json` (exact versions) and `frontend/package-lock.json`

## Threat model
TODO: who would attack the app, what they want, what they can do (half a page)

## Security defences (marked)
TODO: name the two defences, how each works, and how it was tested

## Advanced security (marked)
TODO: name the one attack, with before/after measurements

## Use of generative AI
TODO

## References
TODO (Harvard style)

---

## TEMP: Brief restrictions (delete before submission)
What the assignment brief explicitly says to use or not to use. Section numbers refer to the brief.

### Must use
- **React.js** for the front end (2.1) and **FastAPI** for the back end (2.2)
- **Pydantic** request and response models (2.2)
- **At least two HTTP methods**, each used for a genuine purpose (2.2)
- **One consistent JSON format** for every error, including unexpected ones (2.2)
- **Load the model once** when the server starts, not on every request (2.2)
- **Environment variables** (or similar) for passwords, keys and secrets (2.3)
- **A back-end size limit** on text inputs and file uploads (2.3)
- **Pinned dependency versions** (2.4)
- **FastAPI's `/docs` page** as the API documentation, with a description plus an example request and response for every endpoint (3)
- **Harvard style** references (3)
- **curl or Postman** to demonstrate attacks that bypass the interface (2.7)

### Must not use or do
- **`dangerouslySetInnerHTML`**, or any other way of rendering user input as HTML (2.3)
- **A user-supplied URL passed to `window.open` or assigned to `window.location`**: React does not protect these (2.3)
- **CORS for every origin (`*`)**: only our own front end is allowed (2.3)
- **Secrets in source code** (2.3)
- **Stack traces or other internal details** in error responses (2.2)
- **Front-end checks as the security measure**: front-end checks are for usability, back-end checks are for security (2.7)
- **A shell for system commands** (e.g. `whois`): validate the input and pass it as a list of arguments (2.7, command injection)
- **SQL built by pasting input into the query text**: use parameters or an ORM such as SQLAlchemy (2.7, SQL injection)
- **Saving uploads under the user's own filename** (2.7, unsafe file upload)
- **`joblib.load` / pickle without checking the file's hash first** (2.7, unsafe model loading)
- **Slow inference inside an `async def` endpoint**: it blocks every other request (2.7, denial of service)
- **The same mechanism for both rate limiting and denial of service**, if both are chosen (2.7)
- **`node_modules`** in the submitted ZIP (3)
- **Attacking anything other than our own application on our own machine** (2.8)

### Marking limits
- **More than two defences:** only two are marked, capped at 8 marks together. Full marks need one Advanced plus one Intermediate or Advanced (2.7).
- **A defence that is not in the video** earns nothing. Show the attack succeeding without the defence and failing with it (2.7).
- **More than one advanced attack:** only one is marked. It needs numbers before and after the defence, and only counts once section 2.3 is met (2.8).
- **More charts** do not earn more marks. At least two are needed, each answering a different question (2.1).

### Not restricted (our choice)
- Styling: MUI, plain HTML/CSS in JSX, or a mix
- Input type: we take a URL (2.5)
- A database, user accounts or file uploads are optional, but each adds the risks listed in 2.7 if we add it
