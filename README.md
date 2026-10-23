# Phishing URL Detection

COS30049 Computing Technology Innovation Project, Assignment 3. A React front end and a FastAPI back end that say whether a URL is phishing or benign, with the model's confidence. Users can sign up and log in to keep their check history in a PostgreSQL database.

```
backend/                 FastAPI back end
  app/main.py            the API routes (health, check, sign up, login, history), CORS, model loaded once, tables created
  app/schemas.py         request and response contracts (Pydantic)
  app/errors.py          one JSON format for every error
  app/settings.py        settings read from .env
  app/ml_model.py        loads the ML model (hash checked) and labels URLs
  app/database.py        PostgreSQL connection (engine, one session per request)
  app/db_models.py       database tables: user_data and history_data (JSONB)
  app/auth.py            login: Argon2 password hashing, JWT tokens, finding the logged-in user
  app/rate_limit.py      limits login attempts per IP (against password guessing)
  models/                MODEL_FINAL.joblib and registry.json (file, SHA-256, threshold)
  tests/                 automated API tests (pytest), one test_<file>.py per app file, run against a separate test database
  requirements.txt       pinned packages to run the back end (requirements-dev.txt adds the test tools)
frontend/                React front end (Vite)
  src/api/client.js      every call to the back end
  src/pages/             one file per page (home, 404)
  src/components/layout/ page layout (header, theme toggle, footer)
  src/components/common/ reusable parts: result card, risk ring, panel, accordion, file upload, error boundary
  src/hooks/             useUrlHistory: the check history (saved in the browser)
  src/utils/             phishingRisk: works out the phishing risk shown for each result
  src/data/              sample history used during development
  src/theme.js           MUI theme (light and dark)
```

## Requirements
- Python 3.12 or newer (needed by numpy 2.5 and scipy 1.18)
- Node.js 20.19+ or 22.12+ (needed by Vite 8) and npm
- PostgreSQL (tested with 18) and a client to run SQL, e.g. pgAdmin (included in the Windows installer) or DBeaver

## Setup and run
Use two terminals, both starting in the project folder.

### Database: first time only
1. Install PostgreSQL from https://www.postgresql.org/download/ (Windows: keep port 5432, the default locale, and tick pgAdmin 4). Remember the password set for the `postgres` superuser.
2. In pgAdmin, connect to the server, click the `postgres` database, open **Tools > Query Tool**, and run these two lines one at a time (highlight a line, press F5). Pick your own password with letters and numbers only:
   ```sql
   CREATE USER app_user WITH PASSWORD 'choose-a-password';
   CREATE DATABASE phishing OWNER app_user;
   ```
   The app connects as `app_user`, a normal user that only owns this database (never as the `postgres` superuser).
3. The tables (`user_data`, `history_data`) are created automatically the first time the back end starts.

### Back end: first time only
```powershell
cd backend
copy .env.example .env              # macOS/Linux: cp .env.example .env
py -3.12 -m venv .venv              # macOS/Linux: python3.12 -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```
Then open `backend/.env` and set `DATABASE_URL` to the password chosen above:
```
DATABASE_URL=postgresql+psycopg://app_user:choose-a-password@localhost:5432/phishing
```
Also set `SECRET_KEY` (signs login tokens) to a long random value, made with:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
`.env` is git-ignored; never put the real password or key in `.env.example`. The back end will not start if either is missing. To check the connection: `python -c "from app.database import engine; print(engine.connect().exec_driver_sql('select version()').scalar())"` should print `PostgreSQL ...`.

Do not run the `venv` line again on an existing `.venv`: it switches the folder to whatever `python` is but keeps packages built for the old version, and the back end then fails to start (e.g. `ImportError ... pydantic_core`). To rebuild, delete `.venv` first (`Remove-Item -Recurse -Force .venv`).

### Back end: every time
PostgreSQL must be running (on Windows it starts automatically as the `postgresql-x64-18` service), or the back end will not start.
```powershell
cd backend
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000   # add --reload while developing
```
API documentation: http://127.0.0.1:8000/docs

### Back end tests (optional)
The tests wipe their database, so they use a **separate** one. Once, in pgAdmin (as `postgres`):
```sql
CREATE DATABASE phishing_test OWNER app_user;
```
and in `backend/.env`:
```
TEST_DATABASE_URL=postgresql+psycopg://app_user:choose-a-password@localhost:5432/phishing_test
```
Then, in `backend` with the venv active:
```powershell
pip install -r requirements-dev.txt     # first time only (pytest and the test client)
python -m pytest                        # runs every test in backend/tests, about 5 seconds
                                        # (python -m makes sure the venv's pytest is used, not another install)
```

### Front end: first time only
```powershell
cd frontend
npm ci                      # installs the exact versions in package-lock.json
```

### Front end: every time
```powershell
cd frontend
npm run dev                 # http://localhost:5173 (calls to /api are forwarded to the back end)
```

## API contract
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | none | `{"status": "ok", "model": "MODEL_FINAL.joblib"}` |
| POST | `/api/check` | `{"url": "example.com/login"}` | `{"url": "...", "label": "phishing" or "benign", "confidence": 0.0-1.0, "phishing_probability": 0.0-1.0}` |
| POST | `/api/users` | `{"user_name": "demo", "user_email": "demo@example.com", "password": "at least 8 characters"}` | 201 `{"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}` (409 if the email is taken) |
| POST | `/api/login` | `{"user_email": "demo@example.com", "password": "..."}` | `{"access_token": "...", "token_type": "bearer"}` (401 if wrong) |
| GET | `/api/me` | login | `{"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}` |
| DELETE | `/api/me` | login | 204: deletes the account and all its saved checks |
| POST | `/api/history` | login + `{"data_saved": {"url": "...", "label": "phishing", "confidence": 0.85, "phishingProbability": 0.85, "time": 120, "checkedAt": "2026-10-23T00:20:00.000Z"}}` | 201 `{"history_id": 1, "user_id": 1, "data_saved": {...}}` |
| GET | `/api/history` | login | `[{"history_id": ..., "user_id": ..., "data_saved": {...}}, ...]` newest first |
| DELETE | `/api/history` | login | 204: deletes all of this user's saved checks |
| DELETE | `/api/history/{history_id}` | login | 204 (404 if it does not exist or belongs to someone else) |

- **login** means the request must send `Authorization: Bearer <access_token>` from `/api/login`. A missing, invalid, forged or expired token returns 401. Tokens last 30 minutes. In `/docs`, log in, copy the token, click **Authorize** and paste it.
- Users only ever see and change their own saved checks (the user comes from the token, not from the URL).
- `/api/login` allows 5 attempts per minute per IP address; more return 429 with a `Retry-After` header (seconds to wait). The count is kept in memory, so it resets when the back end restarts. IPs with no attempts in the last minute are removed automatically, so memory does not keep growing.
- Passwords are stored only as Argon2 hashes (`password_hash` column) and are never returned. A wrong email and a wrong password get the same message, so the login does not reveal which emails are registered. Emails are stored in lower case, so each address can register once.
- `data_saved` must match a history entry from the front end (`id`, `url`, `label`, `confidence`, `phishingProbability`, `reasons`, `time`, `checkedAt`). Unknown fields are rejected (422).
- Database queries go through the SQLAlchemy ORM, which sends values as parameters (never pasted into SQL).

Every error: `{"error": {"status": 422, "message": "Request is not valid", "details": [{"field": "body.url", "message": "..."}]}}`

## Model
- `backend/models/MODEL_FINAL.joblib`: the Assignment 2 pipeline (character n-gram TF-IDF + SGD classifier).
- `backend/models/registry.json`: the file name, its SHA-256 hash (checked before loading) and the threshold.
- A URL is labelled phishing when its phishing probability is at or above `threshold` (currently 0.3). Change it in `registry.json` and restart the back end.
- `phishing_probability` is the model's probability that the URL is phishing (the same 0-1 scale for every result); the front end shows it as **Phishing risk**, so a higher number always means more phishing-like. `confidence` is how sure the model is of the label it gave (phishing: the probability; benign: 1 minus the probability).
- If the model file is replaced, update `sha256` too, or the back end will refuse to start.
- **Known limitation: the model is sensitive to how a URL is written.** It reads the URL text only (character n-grams) and never visits the site. In two of the three training datasets almost every benign URL starts with `https://www.` and almost no phishing URL does, so the model partly learned that prefix as a sign of safety. As a result, short addresses typed without `https://` (e.g. `google.com`) may be flagged as phishing, and adding `https://www.` lowers a phishing URL's score. URLs are sent to the model exactly as typed; rewriting them was measured and made phishing detection much worse. The form shows a tip when a URL has no `http(s)://`.

## Architecture
TODO: diagram (browser -> React -> FastAPI -> model, and FastAPI -> PostgreSQL)

## Pinned dependencies
- Back end: `backend/requirements.txt` (and `backend/requirements-dev.txt` for the tests)
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
Harvard style. TODO: add the remaining sources from **Developer resources** that the final submission uses.

### Database (PostgreSQL)
- FastAPI (n.d.) *SQL (relational) databases*. Available at: https://fastapi.tiangolo.com/tutorial/sql-databases/ (Accessed: 22 October 2026).
- FastAPI (n.d.) *OAuth2 with Password (and hashing), Bearer with JWT tokens*. Available at: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/ (Accessed: 23 October 2026).
- FastAPI (n.d.) *Full Stack FastAPI Template* [source code]. GitHub. Available at: https://github.com/fastapi/full-stack-fastapi-template (Accessed: 22 October 2026).
- OWASP Foundation (n.d.) *Password Storage Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (Accessed: 23 October 2026).
- pwdlib (2026) *pwdlib 0.3.1* [software]. PyPI. Available at: https://pypi.org/project/pwdlib/ (Accessed: 23 October 2026).
- PyJWT (n.d.) *PyJWT documentation: usage examples*. Available at: https://pyjwt.readthedocs.io/en/stable/usage.html (Accessed: 23 October 2026).
- Roby, E. (2023) *How to build a FastAPI app with PostgreSQL* [video]. YouTube, 11 June. Available at: https://www.youtube.com/watch?v=398DuQbQJq0 (Accessed: 22 October 2026).
- sabyda (2025) *Building a RESTful API with FastAPI and PostgreSQL*. SQLServerCentral, 17 October. Available at: https://www.sqlservercentral.com/articles/building-a-restful-api-with-fastapi-and-postgresql (Accessed: 22 October 2026).
- SQLAlchemy (n.d.) *Writing SELECT statements for ORM mapped classes* (SQLAlchemy 2.1 documentation). Available at: https://docs.sqlalchemy.org/en/21/orm/queryguide/select.html (Accessed: 23 October 2026).

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

---

## Developer guide: adding a GET or POST endpoint
Every endpoint touches the same four files, in this order. `GET /api/health` and `POST /api/check` are working examples of each.

```
backend/app/schemas.py  ->  backend/app/main.py  ->  frontend/src/api/client.js  ->  frontend/src/pages/<Page>.jsx
(data shape)                (route + function)       (the fetch call)               (call it and show the result)
```

### GET (read data, nothing sent in the body)
1. **Schema** (`backend/app/schemas.py`): describe the response.
   ```python
   class ExampleResponse(BaseModel):
       """What GET /api/example returns."""

       model_config = ConfigDict(json_schema_extra={"examples": [{"message": "Hello"}]})

       message: str
   ```
2. **Route** (`backend/app/main.py`): import the schema, then add the function. The decorator links it to the URL.
   ```python
   @app.get("/api/example", responses=ERRORS)
   def example() -> ExampleResponse:
       """One-line description shown on /docs."""
       return ExampleResponse(message="Hello")
   ```
3. **Client** (`frontend/src/api/client.js`): one function per endpoint. Pages never call `fetch` directly.
   ```js
   /** GET /api/example - {message} */
   export const getExample = () => request('/api/example')
   ```
4. **Page**: call it when the page loads.
   ```jsx
   const [example, setExample] = useState(null)
   useEffect(() => {
     getExample().then(setExample).catch((e) => setError(e.message))
   }, [])
   // in the JSX: {example && <Typography>{example.message}</Typography>}
   ```

### POST (send data in the body)
1. **Schemas**: one for the request and one for the response. Give every input field limits; the back end must enforce them (brief 2.3).
   ```python
   class ExampleRequest(BaseModel):
       """What the front end sends. Anything else in the body returns 422."""

       model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{"text": "hello"}]})

       text: str = Field(min_length=1, max_length=500)
   ```
2. **Route**: FastAPI validates the body against the request schema before the function runs, and returns 422 in our error format if it fails.
   ```python
   @app.post(
       "/api/example",
       responses={**error_doc(422, "The text is missing, empty or too long", "Request is not valid"), **ERRORS},
   )
   def create_example(request: ExampleRequest) -> ExampleResponse:
       """One-line description shown on /docs."""
       return ExampleResponse(message=request.text.upper())
   ```
3. **Client**:
   ```js
   /** POST /api/example - {message} */
   export const postExample = (text) => request('/api/example', { method: 'POST', body: JSON.stringify({ text }) })
   ```
4. **Page**: call it from an event (form submit), not from `useEffect`.
   ```jsx
   const handleSubmit = (event) => {
     event.preventDefault()
     postExample(text).then(setResult).catch((e) => setError(e.message))
   }
   ```

### Checklist for every new endpoint
- [ ] Path starts with `/api/`, so the Vite proxy forwards it (no change to `vite.config.js` needed).
- [ ] Request and response use Pydantic schemas with an example (brief 2.2 and 3: every endpoint needs a description and an example on `/docs`).
- [ ] Input fields have size limits (`max_length`, `ge`/`le`) and `extra="forbid"` (brief 2.3).
- [ ] Use plain `def`, not `async def`, for anything that runs the model or other slow work: FastAPI runs plain `def` in a thread pool, so one slow request does not block the others (brief 2.7, denial of service).
- [ ] Do not return internal details; errors go through `app/errors.py` automatically.
- [ ] Only GET, POST and DELETE are allowed by CORS (`allow_methods` in `main.py`). Add PUT or PATCH there if a new endpoint needs one.
- [ ] Needs login? Add `user: CurrentUser` to the function (from `app/auth.py`), add `**AUTH` to `responses`, and only read or change that user's rows.
- [ ] Uses the database? Add `db: DbSession` to the function and use the ORM (`select`, `db.get`, `db.add`), never SQL built from strings.
- [ ] Add a comment above the route with an example request body and response (like the others in `main.py`).
- [ ] Add a test to the matching file in `backend/tests/` (`test_<file it tests>.py`, e.g. `test_main.py` for a new route, `test_schemas.py` for validation) and run `python -m pytest`.
- [ ] Show user input with `{value}` in JSX, never `dangerouslySetInnerHTML` (brief 2.3).
- [ ] Restart `uvicorn` (or run it with `--reload`), then test on http://127.0.0.1:8000/docs with **Try it out**.
- [ ] Add the endpoint to the **API contract** table above

---

## Developer resources
Documentation used to build the project so far. When a source is cited in the final submission, move it to the **References** section above (Harvard style).

### Back end
- FastAPI (n.d.) *First steps*. Available at: https://fastapi.tiangolo.com/tutorial/first-steps/ (Accessed: 19 October 2026).
- FastAPI (n.d.) *Request body*. Available at: https://fastapi.tiangolo.com/tutorial/body/ (Accessed: 19 October 2026).
- FastAPI (n.d.) *Response model - return type*. Available at: https://fastapi.tiangolo.com/tutorial/response-model/ (Accessed: 19 October 2026).
- FastAPI (n.d.) *Handling errors*. Available at: https://fastapi.tiangolo.com/tutorial/handling-errors/ (Accessed: 19 October 2026).
- FastAPI (n.d.) *CORS (Cross-Origin Resource Sharing)*. Available at: https://fastapi.tiangolo.com/tutorial/cors/ (Accessed: 19 October 2026).
- FastAPI (n.d.) *Concurrency and async / await*. Available at: https://fastapi.tiangolo.com/async/ (Accessed: 19 October 2026).
- Pydantic (n.d.) *Fields*. Available at: https://docs.pydantic.dev/latest/concepts/fields/ (Accessed: 19 October 2026).
- Uvicorn (n.d.) *Settings*. Available at: https://www.uvicorn.org/settings/ (Accessed: 19 October 2026).
- scikit-learn developers (n.d.) *Model persistence*. Available at: https://scikit-learn.org/stable/model_persistence.html (Accessed: 19 October 2026).
- joblib developers (n.d.) *Persistence*. Available at: https://joblib.readthedocs.io/en/stable/persistence.html (Accessed: 19 October 2026).
- Python Software Foundation (n.d.) *hashlib - secure hashes and message digests*. Available at: https://docs.python.org/3/library/hashlib.html (Accessed: 19 October 2026).
- Python Software Foundation (n.d.) *venv - creation of virtual environments*. Available at: https://docs.python.org/3/library/venv.html (Accessed: 19 October 2026).
- Python Software Foundation (n.d.) *Using Python on Windows: the Python install manager and `py` launcher*. Available at: https://docs.python.org/3/using/windows.html (Accessed: 21 October 2026).

### Back end: database, login and tests
Sources used for the PostgreSQL, login and test code that are not already in **References** above.
- FastAPI (n.d.) *Dependencies*. Available at: https://fastapi.tiangolo.com/tutorial/dependencies/ (Accessed: 23 October 2026).
- FastAPI (n.d.) *Testing*. Available at: https://fastapi.tiangolo.com/tutorial/testing/ (Accessed: 23 October 2026).
- GeeksforGeeks (n.d.) *Login registration system with JWT in FastAPI*. Available at: https://www.geeksforgeeks.org/python/login-registration-system-with-jwt-in-fastapi/ (Accessed: 23 October 2026). (compared with `app/auth.py`: same JWT and pwdlib pattern; its login skips the hash for unknown users, the timing leak the dummy hash closes)
- pytest developers (n.d.) *pytest documentation*. Available at: https://docs.pytest.org/en/stable/ (Accessed: 23 October 2026). (test discovery, `pytest.ini`, running tests)
- pytest developers (n.d.) *How to use fixtures*. Available at: https://docs.pytest.org/en/stable/how-to/fixtures.html (Accessed: 23 October 2026).
- Tech With Tim (2025) *Please learn how to write tests in Python... Pytest tutorial* [video]. YouTube, 25 February. Available at: https://www.youtube.com/watch?v=EgpLj86ZHFQ (Accessed: 23 October 2026). (test files named `test_<file it tests>.py`, as in `backend/tests/`)
- Pydantic (n.d.) *Validators*. Available at: https://docs.pydantic.dev/latest/concepts/validators/ (Accessed: 23 October 2026).
- SQLAlchemy (n.d.) *ORM quick start* (SQLAlchemy 2.1 documentation). Available at: https://docs.sqlalchemy.org/en/21/orm/quickstart.html (Accessed: 22 October 2026).
- SQLAlchemy (n.d.) *Cascades* (SQLAlchemy 2.1 documentation). Available at: https://docs.sqlalchemy.org/en/21/orm/cascades.html (Accessed: 22 October 2026).
- Psycopg (n.d.) *Basic module usage* (Psycopg 3 documentation). Available at: https://www.psycopg.org/psycopg3/docs/basic/usage.html (Accessed: 22 October 2026).
- PostgreSQL Global Development Group (n.d.) *JSON types* (PostgreSQL 18 documentation). Available at: https://www.postgresql.org/docs/18/datatype-json.html (Accessed: 22 October 2026).
- PostgreSQL Global Development Group (n.d.) *CREATE ROLE* (PostgreSQL 18 documentation). Available at: https://www.postgresql.org/docs/18/sql-createrole.html (Accessed: 23 October 2026).
- pgAdmin Development Team (n.d.) *Query Tool* (pgAdmin 4 documentation). Available at: https://www.pgadmin.org/docs/pgadmin4/latest/query_tool.html (Accessed: 23 October 2026).
- OWASP Foundation (n.d.) *Authentication Cheat Sheet* (generic login errors, login throttling). Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (Accessed: 23 October 2026).
- MDN Web Docs (n.d.) *429 Too Many Requests*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429 (Accessed: 23 October 2026).
- MDN Web Docs (n.d.) *Retry-After*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After (Accessed: 23 October 2026). (the header sent with 429 by `app/rate_limit.py`)
- Dhandala, N. (2025) *How to implement rate limiting in FastAPI without external services*. OneUptime, 6 January. Available at: https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view (Accessed: 23 October 2026). (closest to `app/rate_limit.py`: an in-memory sliding window of request timestamps per key, 429 with `Retry-After`, applied with `Depends`. Ours uses a `deque` instead of a list, adds a `threading.Lock`, and sets `Retry-After` to the real seconds left)
- Ugbovo, P. (2026) *How to implement token bucket rate limiting with FastAPI*. freeCodeCamp, 27 March. Available at: https://www.freecodecamp.org/news/token-bucket-rate-limiting-fastapi/ (Accessed: 23 October 2026). (another in-memory limiter: per-IP buckets with a `threading.Lock`, applied as middleware, 429 with `Retry-After`; a token bucket allows short bursts, where `app/rate_limit.py` counts requests in a sliding window. It never removes old IPs, which `app/rate_limit.py` does once per window)
- Singh, A.P. (2024) *Rate limiting algorithms explained with code*. AlgoMaster, 17 July. Available at: https://blog.algomaster.io/p/rate-limiting-algorithms-explained-with-code (Accessed: 23 October 2026). (the algorithm `app/rate_limit.py` uses is the "sliding window log"; compares it with token bucket, leaky bucket and fixed window)
- Cloudflare (n.d.) *What is rate limiting?* Available at: https://www.cloudflare.com/learning/bots/what-is-rate-limiting/ (Accessed: 23 October 2026). (why limit requests per IP: brute-force logins, DoS)
- OWASP Foundation (2023) *API4:2023 Unrestricted Resource Consumption* (OWASP API Security Top 10). Available at: https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ (Accessed: 23 October 2026). (the risk a rate limit reduces)
- FastAPI (n.d.) *Dependencies in path operation decorators*. Available at: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-in-path-operation-decorators/ (Accessed: 23 October 2026). (`dependencies=[Depends(login_rate_limit)]` on `/api/login`)
- Python Software Foundation (n.d.) *collections.deque*. Available at: https://docs.python.org/3/library/collections.html#collections.deque (Accessed: 23 October 2026). (the per-IP list of request times; `popleft()` drops ones older than the window)
- Python Software Foundation (n.d.) *threading - Lock objects*. Available at: https://docs.python.org/3/library/threading.html#lock-objects (Accessed: 23 October 2026). (stops two requests at once from miscounting)
- Python Software Foundation (n.d.) *time.monotonic()*. Available at: https://docs.python.org/3/library/time.html#time.monotonic (Accessed: 23 October 2026). (a clock that never jumps back when the system time changes)
- Python Software Foundation (n.d.) *secrets - generate secure random numbers for managing secrets*. Available at: https://docs.python.org/3/library/secrets.html (Accessed: 23 October 2026).

### Security: side channels and attacks on the model (sections 2.7 and 2.8)
Sources cited in the COS30049 Week 11 lecture that match this project's likely 2.8 attack (login timing or detection evasion). Move the ones the final write-up uses to **References**.
- Bortz, A. and Boneh, D. (2007) 'Exposing private information by timing web applications', *Proceedings of the 16th International Conference on World Wide Web*. ACM, pp. 621-628. (login timing)
- Boucher, N., Shumailov, I., Anderson, R. and Papernot, N. (2022) 'Bad characters: Imperceptible NLP attacks', *2022 IEEE Symposium on Security and Privacy*. IEEE. (detection evasion with invisible and look-alike characters)
- Chen, S., Wang, R., Wang, X. and Zhang, K. (2010) 'Side-channel leaks in web applications: A reality today, a challenge tomorrow', *2010 IEEE Symposium on Security and Privacy*. IEEE, pp. 191-206. (response size)
- Python Software Foundation (n.d.) *unicodedata - Unicode Database*. Available at: https://docs.python.org/3/library/unicodedata.html (Accessed: 23 October 2026). (NFKC normalisation)
- Shokri, R., Stronati, M., Song, C. and Shmatikov, V. (2017) 'Membership inference attacks against machine learning models', *2017 IEEE Symposium on Security and Privacy*. IEEE, pp. 3-18.
- Tramèr, F., Zhang, F., Juels, A., Reiter, M.K. and Ristenpart, T. (2016) 'Stealing machine learning models via prediction APIs', *Proceedings of the 25th USENIX Security Symposium*. USENIX Association, pp. 601-618. (model extraction; query budget as the defence)
- Unicode Consortium (n.d.) *Unicode Technical Standard #39: Unicode Security Mechanisms*. Available at: https://unicode.org/reports/tr39 (Accessed: 23 October 2026). (confusables "skeleton" for look-alike letters)
- Zheng, X. (2017) *Phishing with Unicode domains*. Available at: https://www.xudongz.com/blog/2017/idn-phishing/ (Accessed: 23 October 2026). (look-alike domain example)

### Front end
- React (n.d.) *Quick start*. Available at: https://react.dev/learn (Accessed: 19 October 2026).
- React (n.d.) *Writing markup with JSX*. Available at: https://react.dev/learn/writing-markup-with-jsx (Accessed: 19 October 2026).
- React (n.d.) *Conditional rendering*. Available at: https://react.dev/learn/conditional-rendering (Accessed: 19 October 2026).
- React (n.d.) *Responding to events*. Available at: https://react.dev/learn/responding-to-events (Accessed: 19 October 2026).
- React (n.d.) *Synchronizing with Effects*. Available at: https://react.dev/learn/synchronizing-with-effects (Accessed: 19 October 2026).
- React (n.d.) *Preserving and resetting state*. Available at: https://react.dev/learn/preserving-and-resetting-state (Accessed: 19 October 2026).
- React Router (n.d.) *Routing*. Available at: https://reactrouter.com/start/declarative/routing (Accessed: 19 October 2026).
- Vite (n.d.) *Server options: server.proxy*. Available at: https://vite.dev/config/server-options#server-proxy (Accessed: 19 October 2026).
- Vite (n.d.) *Static asset handling: the public directory*. Available at: https://vite.dev/guide/assets#the-public-directory (Accessed: 19 October 2026).
- MUI (n.d.) *The sx prop*. Available at: https://mui.com/system/getting-started/the-sx-prop/ (Accessed: 19 October 2026).
- MUI (n.d.) *Palette*. Available at: https://mui.com/material-ui/customization/palette/ (Accessed: 19 October 2026).
- MUI (n.d.) *Dark mode*. Available at: https://mui.com/material-ui/customization/dark-mode/ (Accessed: 19 October 2026).
- MUI (n.d.) *Composition: the component prop*. Available at: https://mui.com/material-ui/guides/composition/#component-prop (Accessed: 19 October 2026).
- MUI (n.d.) *Tabs*. Available at: https://mui.com/material-ui/react-tabs/ (Accessed: 19 October 2026).
- MUI (n.d.) *Text Field*. Available at: https://mui.com/material-ui/react-text-field/ (Accessed: 19 October 2026).
- Lucide (n.d.) *Icons*. Available at: https://lucide.dev/icons/ (Accessed: 19 October 2026).
- React (n.d.) *Your first component*. Available at: https://react.dev/learn/your-first-component (Accessed: 21 October 2026).
- React (n.d.) *Passing props to a component*. Available at: https://react.dev/learn/passing-props-to-a-component (Accessed: 21 October 2026).
- React (n.d.) *Rendering lists*. Available at: https://react.dev/learn/rendering-lists (Accessed: 21 October 2026).
- React (n.d.) *Keeping components pure*. Available at: https://react.dev/learn/keeping-components-pure (Accessed: 21 October 2026).
- React (n.d.) *State: a component's memory*. Available at: https://react.dev/learn/state-a-components-memory (Accessed: 21 October 2026).
- React (n.d.) *Sharing state between components (controlled and uncontrolled components)*. Available at: https://react.dev/learn/sharing-state-between-components (Accessed: 21 October 2026).
- React (n.d.) *Reusing logic with custom Hooks*. Available at: https://react.dev/learn/reusing-logic-with-custom-hooks (Accessed: 21 October 2026).
- React (n.d.) *Built-in React Hooks*. Available at: https://react.dev/reference/react/hooks (Accessed: 21 October 2026).
- React (n.d.) *useState*. Available at: https://react.dev/reference/react/useState (Accessed: 21 October 2026).
- React (n.d.) *useCallback*. Available at: https://react.dev/reference/react/useCallback (Accessed: 21 October 2026).
- React (n.d.) *Rules of Hooks*. Available at: https://react.dev/reference/rules/rules-of-hooks (Accessed: 21 October 2026).
- React (n.d.) *React calls components and Hooks*. Available at: https://react.dev/reference/rules/react-calls-components-and-hooks (Accessed: 21 October 2026).
- React (n.d.) *lazy*. Available at: https://react.dev/reference/react/lazy (Accessed: 21 October 2026).
- React (n.d.) *Suspense*. Available at: https://react.dev/reference/react/Suspense (Accessed: 21 October 2026).
- React (2024) *React 19 upgrade guide: removed propTypes and defaultProps*. Available at: https://react.dev/blog/2024/04/25/react-19-upgrade-guide (Accessed: 21 October 2026).
- Vite (n.d.) *Features: JSON*. Available at: https://vite.dev/guide/features#json (Accessed: 21 October 2026).
- MUI (n.d.) *CSS theme variables*. Available at: https://mui.com/material-ui/customization/css-theme-variables/overview/ (Accessed: 21 October 2026).
- MUI (n.d.) *Stack*. Available at: https://mui.com/material-ui/react-stack/ (Accessed: 21 October 2026).
- MUI (n.d.) *Button (including IconButton)*. Available at: https://mui.com/material-ui/react-button/ (Accessed: 21 October 2026).
- MUI (n.d.) *Progress (CircularProgress)*. Available at: https://mui.com/material-ui/react-progress/ (Accessed: 21 October 2026).
- MUI (n.d.) *CssBaseline*. Available at: https://mui.com/material-ui/react-css-baseline/ (Accessed: 21 October 2026).
- UI Monk (n.d.) *Ep1 - Display JSON Data in React* [video]. YouTube. Available at: https://www.youtube.com/watch?v=yC0T-_aEndw (Accessed: 21 October 2026).

### Web fundamentals
- MDN Web Docs (n.d.) *Using the Fetch API*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch (Accessed: 19 October 2026).
- MDN Web Docs (n.d.) *Cross-Origin Resource Sharing (CORS)*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS (Accessed: 19 October 2026).
- MDN Web Docs (n.d.) *SPA (single-page application)*. Available at: https://developer.mozilla.org/en-US/docs/Glossary/SPA (Accessed: 19 October 2026).
- MDN Web Docs (n.d.) *Inheritance (CSS)*. Available at: https://developer.mozilla.org/en-US/docs/Web/CSS/Inheritance (Accessed: 19 October 2026).
- WebAIM (n.d.) *Contrast checker*. Available at: https://webaim.org/resources/contrastchecker/ (Accessed: 19 October 2026).
- MDN Web Docs (n.d.) *Window: localStorage property*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Crypto: randomUUID() method*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Blob*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Blob (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Blob: text() method*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/Blob/text (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *URL: createObjectURL() static method*. Available at: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *<input type="file">*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *<a>: the download attribute*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *<label>*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *inert*. Available at: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *ARIA: progressbar role*. Available at: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *conic-gradient()*. Available at: https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *attr()*. Available at: https://developer.mozilla.org/en-US/docs/Web/CSS/attr (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *@property*. Available at: https://developer.mozilla.org/en-US/docs/Web/CSS/@property (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *JSON.parse()*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Destructuring*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Template literals*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Truthy*. Available at: https://developer.mozilla.org/en-US/docs/Glossary/Truthy (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Nullish coalescing operator (??)*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Array.prototype.every()*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *Set*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *String.prototype.localeCompare()*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *How to use promises: async and await*. Available at: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises (Accessed: 21 October 2026).
- MDN Web Docs (n.d.) *export*. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export (Accessed: 21 October 2026).

### Course material
- COS30049 Week 8 React Showcase (demo project):
  - `App.jsx` and `components/layout/Layout.jsx`: routes, `<Outlet />`, lazy-loaded pages with `<Suspense>`, 404 route
  - `components/common/ErrorBoundary.jsx` and `api/client.js`
  - `pages/jsx/demos/Composition.jsx`: the `Panel` component (adapted in `components/common/Panel.jsx`)
  - `pages/components/demos/Accordion.jsx`: the accordion (adapted in `components/common/Accordion/`)
  - `pages/media/demos/ProgressRing.jsx`: SVG progress ring (compared with `components/common/Progress/`)
  - `hooks/useLocalStorage.js` and `pages/state/demos/TodoApp.jsx`: basis for `hooks/useUrlHistory.js` (localStorage + add/edit/delete on a list)
  - `pages/forms/demos/RegistrationForm.jsx`: the file input pattern (adapted in `components/common/FileUploader.jsx`)
  - `fullstack-ml`, `mui` and `forms` demos
- COS30049 Week 9 MUI React project setup guide, and additional resource for React Router.
- COS30049 Week 10 FastAPI back end guide.
- COS30049 Week 10 lecture: FastAPI endpoint with Pydantic models, CORS, loading the model once, SHA-256 check before `joblib.load`, plain `def` for slow work.
- COS30049 A3 Secure Web App Sample (tutor's demonstration project): project and API structure compared; session history pattern.
- COS30049 Week 11 lecture, *When the model itself leaks*: section 2.8 marked on before-and-after measurements; side channels (timing, cache, response size, login timing); attacks through the API (membership inference, model extraction, detection evasion). Matches the dummy-hash login check already in `app/auth.py`, and is the basis for the 2.8 measurement plan.
- COS30049 Week 12 lectures 1 and 2, *Software Testing*: testing types (unit, integration, system, security, regression), risk-based testing, test case design (equivalence partitioning, boundary values, decision tables, state transitions) and automated testing. Applied in `backend/tests/` and the manual `/docs` checks.
