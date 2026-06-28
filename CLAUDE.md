# Project: Meter Scan

Mobile app — photograph fuel dispenser meter, read number via on-device OCR.

## Stack
- **Ionic 8** + **Angular 20** (`@angular/*` 20.3.x), **standalone: false** (NgModule pattern)
- **Capacitor 8** — iOS + Android native
- **Custom CRNN (ONNX)** via **onnxruntime-web** (WASM) — on-device 7-seg reader, fully offline. Trained in `local-llm/` (Tesseract.js kept as dep but no longer the engine — weak on 7-segment LCD).
- Bundle ID: `com.supasin.meterscan` (no hyphen — Android rejects hyphens in applicationId/namespace)

## Architecture
- **Module-based** (NOT standalone components). Each page = `.page.ts` + `.module.ts` + `-routing.module.ts`.
- `src/app/services/` — singleton services, `@Injectable({ providedIn: 'root' })`
  - `camera.service.ts` — Capacitor Camera wrapper (camera + gallery)
  - `meter-onnx.service.ts` — CRNN ONNX reader (onnxruntime-web). Loads `assets/models/crnn.onnx`, `readField(img, roi)` → digit string. Preprocess + CTC decode ported from `local-llm/src/utils.py`.
  - `ocr.service.ts` — legacy Tesseract worker (unused; kept for reference)
- `src/app/home/` — scan page: camera/gallery → user drags ROI box on canvas → onnx readField → history

## OCR conventions (CRNN ONNX)
- Model: `src/assets/models/crnn.onnx` (5.3MB). IO: input `image` f32 [1,1,32,128] NCHW; output `logits` f32 [1,T,12]. Charset `0123456789.`, index 0 = CTC blank.
- Preprocess MUST match `local-llm/src/utils.py:preprocess_field` exactly: grayscale → resize 128×32 → invert → percentile(5,99) stretch → gamma 2.4 (suppresses ghost segments). No binarize/CLAHE.
- onnxruntime-web: `ort.env.wasm.wasmPaths='assets/ort/'`, `numThreads=1` (webview not cross-origin-isolated). WASM in `src/assets/ort/` (ort-wasm-simd-threaded.{wasm,mjs}).
- Localize = manual ROI (user drags box). Auto-detect (classical CV) failed; deferred until more real data.
- `Capacitor.convertFileSrc(uri)` on the photo before drawing to canvas → keeps canvas untainted (getImageData works) on native.
- Retrain / add photos workflow: `local-llm/docs/ADDING_DATA.md`. Re-export → copy crnn.onnx to `src/assets/models/` → `npx cap sync`.

## Build / run
- `npm run build` — Angular build (output `www/`)
- `npx cap sync` — sync web → native (run from project ROOT, not subfolder)
- `ionic cap build ios` — opens Xcode for device deploy
- After retraining: copy `local-llm/export/crnn.onnx` → `src/assets/models/crnn.onnx`, then build + sync

## Native gotchas
- Camera needs permissions: iOS `NSCameraUsageDescription` + photo keys in Info.plist; Android `CAMERA` + `READ_MEDIA_IMAGES` in AndroidManifest.xml
- Web/PWA camera needs `@ionic/pwa-elements` — `defineCustomElements(window)` in main.ts
- Changing bundle ID → also move/rename `MainActivity.java` package dir + `package` decl to match Android namespace, else runtime crash

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
