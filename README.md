# Phishing URL Detection

COS30049 Computing Technology Innovation Project, Assignment 3. A React front end and a FastAPI back end that say whether a URL is phishing or benign, with the model's confidence.

```
backend/                 FastAPI back end
  app/main.py            the API routes (GET /api/health, POST /api/check), CORS, model loaded once
  app/schemas.py         request and response contracts (Pydantic)
  app/errors.py          one JSON format for every error
  app/ml_model.py        loads the ML model (hash checked) and labels URLs
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

### Back end: first time only
```powershell
cd backend
copy .env.example .env              # macOS/Linux: cp .env.example .env
py -3.12 -m venv .venv              # macOS/Linux: python3.12 -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```
Do not run the `venv` line again on an existing `.venv`: it switches the folder to whatever `python` is but keeps packages built for the old version, and the back end then fails to start (e.g. `ImportError ... pydantic_core`). To rebuild, delete `.venv` first (`Remove-Item -Recurse -Force .venv`).

### Back end: every time
```powershell
cd backend
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000   # add --reload while developing
```
API documentation: http://127.0.0.1:8000/docs

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

Every error: `{"error": {"status": 422, "message": "Request is not valid", "details": [{"field": "body.url", "message": "..."}]}}`

## Model
- `backend/models/MODEL_FINAL.joblib`: the Assignment 2 pipeline (character n-gram TF-IDF + SGD classifier).
- `backend/models/registry.json`: the file name, its SHA-256 hash (checked before loading) and the threshold.
- A URL is labelled phishing when its phishing probability is at or above `threshold` (currently 0.3). Change it in `registry.json` and restart the back end.
- `phishing_probability` is the model's probability that the URL is phishing (the same 0-1 scale for every result); the front end shows it as **Phishing risk**, so a higher number always means more phishing-like. `confidence` is how sure the model is of the label it gave (phishing: the probability; benign: 1 minus the probability).
- If the model file is replaced, update `sha256` too, or the back end will refuse to start.
- **Known limitation: the model is sensitive to how a URL is written.** It reads the URL text only (character n-grams) and never visits the site. In two of the three training datasets almost every benign URL starts with `https://www.` and almost no phishing URL does, so the model partly learned that prefix as a sign of safety. As a result, short addresses typed without `https://` (e.g. `google.com`) may be flagged as phishing, and adding `https://www.` lowers a phishing URL's score. URLs are sent to the model exactly as typed; rewriting them was measured and made phishing detection much worse. The form shows a tip when a URL has no `http(s)://`.

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
       responses={422: {"model": ErrorResponse, "description": "The text is missing, empty or too long"}, **ERRORS},
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
- [ ] Only GET and POST are allowed by CORS (`allow_methods` in `main.py`). Add PUT, PATCH or DELETE there if a new endpoint needs one.
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
