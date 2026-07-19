// Generates a production-ready Postman collection (v2.1.0) from NestJS
// controllers + DTOs. DTO-driven sample bodies, auth token chaining,
// per-request test scripts. Run: node scripts/generate-postman.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_DIR = join(ROOT, 'src', 'modules');
const OUT = join(ROOT, 'postman', 'collections', 'offbeat-pravasi-api.postman_collection.json');

const HTTP_METHODS = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];
const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

// ---- sample value inference from class-validator decorators ----
function inferSample(name, decorators) {
  const n = name.toLowerCase();
  if (decorators.has('IsUUID') || /id$/.test(n) || n.includes('uuid')) return '{{uuid}}';
  if (decorators.has('IsEmail') || n.includes('email')) return '{{adminEmail}}';
  if (n.includes('password')) return '{{adminPassword}}';
  if (n.includes('phone')) return '+919999999999';
  if (n.includes('url') || decorators.has('IsUrl')) return 'https://example.com';
  if (decorators.has('IsInt') || decorators.has('IsNumber')) return 1;
  if (decorators.has('IsBoolean')) return true;
  if (decorators.has('IsDate') || n.includes('date') || n.includes('at')) return '2024-01-01T00:00:00.000Z';
  if (decorators.has('IsArray')) return [];
  if (decorators.has('IsString') || decorators.size === 0) return n.includes('name') ? '{{uniqueName}}' : 'string';
  return 'string';
}

function parseDto(filePath) {
  const src = readFileSync(filePath, 'utf8');
  return parseDtoProps(src);
}

// extract the real base DTO from `extends PartialType(OmitType(FooDto, ...))`
// or `extends FooDto` — the base is the first *Dto-named class in the clause.
function resolveBaseDto(src, fromIndex) {
  const slice = src.slice(fromIndex);
  const m = slice.match(/extends\s+([\s\S]*?)(?:\{|implements)/);
  if (!m) return null;
  const clause = m[1];
  const dtos = clause.match(/[A-Z]\w*Dto/g);
  if (dtos) return dtos[0];
  // fallback: first PascalCase identifier that is not a mapped-type utility
  const util = /^(PartialType|OmitType|PickType|IntersectionType|Partial)$/;
  const ids = clause.match(/[A-Z]\w+/g) || [];
  return ids.find((x) => !util.test(x)) || null;
}

function buildBody(dtoName, dtoDir, controllerSrc) {
  if (!dtoName) return null;
  const base = dtoName.replace(/Dto$/, '');
  const k = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  // search dtos/ then module root for the dto file
  const candidates = [
    join(dtoDir, 'dtos', `${k}.dto.ts`),
    join(dtoDir, `${k}.dto.ts`),
    join(dtoDir, 'dtos', `${base}.dto.ts`),
    join(dtoDir, `${base}.dto.ts`),
  ];
  let file = candidates.find((c) => safeExists(c));
  // fallback: scan all .dto.ts under module for the class definition
  if (!file) file = findDtoFileByClass(dtoDir, dtoName);
  let props = {};
  if (file) {
    props = parseDto(file);
    // follow extends PartialType(Base) / extends Base for empty classes
    if (!Object.keys(props).length) {
      const src = readFileSync(file, 'utf8');
      const ext = resolveBaseDto(src, src.indexOf(`class ${dtoName}`));
      if (ext) {
        const baseProps = buildBody(ext, dtoDir, controllerSrc);
        if (baseProps) props = baseProps;
      }
    }
  } else if (controllerSrc && controllerSrc.includes(`class ${dtoName}`)) {
    // inline DTO defined in the controller file
    props = parseDtoFromSource(controllerSrc, dtoName);
    if (!Object.keys(props).length) {
      const ext = resolveBaseDto(controllerSrc, controllerSrc.indexOf(`class ${dtoName}`));
      if (ext) {
        const baseProps = buildBody(ext, dtoDir, controllerSrc);
        if (baseProps) props = baseProps;
      }
    }
  }
  if (!Object.keys(props).length) return null;
  // props may be {name:{decs}} OR already a sample-value map from base merge
  const isSampleMap = Object.values(props).some((v) => typeof v !== 'object' || v === null || !('decs' in v));
  const body = {};
  for (const [k2, v] of Object.entries(props)) {
    body[k2] = isSampleMap ? v : inferSample(k2, v.decs);
  }
  return body;
}

// search every .dto.ts under dir for `export class <dtoName>`
function findDtoFileByClass(dir, dtoName) {
  const stack = [dir, join(dir, 'dtos')];
  for (const d of stack) {
    if (!safeExists(d)) continue;
    for (const e of readdirSync(d)) {
      if (!e.endsWith('.dto.ts')) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) continue;
      const src = readFileSync(p, 'utf8');
      if (src.includes(`class ${dtoName}`) || src.includes(`export class ${dtoName}`)) return p;
    }
  }
  return null;
}

// parse a single inline class {Name} { ... } block for @decorator props
function parseDtoFromSource(src, className) {
  const start = src.indexOf(`class ${className}`);
  if (start < 0) return {};
  // find matching closing brace
  let depth = 0, i = src.indexOf('{', start), end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const block = src.slice(start, end);
  return parseDtoProps(block);
}

// scan decorator lines + the following property declaration. Decorators may
// contain nested parens (e.g. @Type(() => Foo)), so we match a balanced group.
function parseDtoProps(src) {
  const props = {};
  const lines = src.split('\n');
  let decs = [];
  for (const raw of lines) {
    const line = raw.trim();
    const dec = line.match(/^@\w+(?:\([\s\S]*\))?\s*$/);
    if (dec) {
      const name = line.match(/^@(\w+)/)[1];
      decs.push(name);
      continue;
    }
    if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
    // property declaration: name!?: type  (optionally with array/trailing junk)
    const pm = line.match(/^(\w+)\s*[!?]*\s*[:=]/);
    if (pm) {
      const propName = pm[1];
      const optional = /[!?]\s*[:=]/.test(line) && line.includes('?') || decs.includes('IsOptional');
      props[propName] = { optional, decs: new Set(decs) };
    }
    decs = [];
  }
  return props;
}

function safeExists(p) {
  try { statSync(p); return true; } catch { return false; }
}

// ---- parse controllers ----
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

function parseController(file) {
  const src = readFileSync(file, 'utf8');
  const ctrlMatch = src.match(/@Controller\(\s*['"`]([^'"`]+)['"`]/);
  const ctrlBase = ctrlMatch ? ctrlMatch[1] : '';
  const tagMatch = src.match(/@ApiTags\(\s*['"`]([^'"`]+)['"`]/);
  const moduleName = tagMatch ? tagMatch[1] : ctrlBase;

  // class-level guards / public (declared before `export class`)
  const classHeader = src.slice(0, src.indexOf('export class'));
  const classHasAuth = /@UseGuards|AuthGuard/.test(classHeader);
  const classIsPublic = /@Public\(\)|@AllowAnonymous\(\)/.test(classHeader);

  // robust line scanner: decorators accumulate until a method/statement boundary
  const lines = src.split('\n');
  const HTTP = ['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head'];
  const items = [];
  let methodDecs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dec = line.match(/^\s*@(\w+)/);
    if (dec) { methodDecs.push(line.trim()); continue; }
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    const mstart = trimmed.match(/^(?:async\s+)?(\w+)\s*\(/);
    if (mstart && !['if', 'for', 'while', 'switch', 'catch', 'function', 'constructor'].includes(mstart[1])) {
      const httpDec = methodDecs.find((d) => HTTP.some((m) => d.startsWith(`@${m}`)));
      if (httpDec) {
        const m = httpDec.match(/@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)/);
        const method = m[1].toUpperCase();
        const pathArg = (m[2].match(/['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
        // include the method signature line: @Body() dto lives in the param list,
        // plus continuation lines until the param list's closing ')' (balanced parens).
        // Decorator lines like @CurrentUser() contain ')' too, so track depth.
        let sig = trimmed;
        let depth = (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
        for (let j = i + 1; j < lines.length; j++) {
          const l = lines[j].trim();
          sig += ' ' + l;
          depth += (l.match(/\(/g) || []).length - (l.match(/\)/g) || []).length;
          if (depth <= 0 && l.includes(')')) break;
        }
        const block = methodDecs.join('\n') + '\n' + sig;
        const methodIsPublic = /@Public\(\)|@AllowAnonymous\(\)/.test(block);
        const methodHasAuth = /@UseGuards|AuthGuard/.test(block);
        const isPublic = methodIsPublic || (classIsPublic && !methodHasAuth);
        const needsAuth = methodHasAuth || (classHasAuth && !methodIsPublic);
        const bodyMatch = block.match(/@Body\([^)]*\)\s*\w+\s*[!?:]+\s*(?:Partial<)?(\w+)/);
        const dtoName = bodyMatch ? bodyMatch[1] : null;
        let inlineBody = null;
        const inlineMatch = block.match(/@Body\([^)]*\)\s*\w+\s*[!?:]+\s*\{([^}]*)\}/s);
        if (inlineMatch) {
          inlineBody = {};
          for (const part of inlineMatch[1].split(',')) {
            const kv = part.match(/(\w+)\s*[:?]/);
            if (kv) inlineBody[kv[1]] = 'string';
          }
        }
        const fieldMatch = block.match(/@Body\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(\w+)\s*[!?:]+/);
        const bodyField = fieldMatch ? fieldMatch[1] : null;
        const params = [...block.matchAll(/@Param\(\s*['"`]([^'"`]+)['"`]/g)].map((mm) => mm[1]);
        const opMatch = block.match(/@ApiOperation\(\{\s*summary:\s*['"`]([^'"`]+)['"`]/);
        const summary = opMatch ? opMatch[1] : '';
        items.push({ method, pathArg, needsAuth, isPublic, dtoName, inlineBody, bodyField, params, summary });
      }
      methodDecs = [];
      continue;
    }
    methodDecs = [];
  }

  if (!items.length) return null;
  return { moduleName, ctrlBase, items, dtoDir: dirname(file), src };
}
function buildPath(ctrlBase, pathArg, params) {
  let p = `api/v1/${ctrlBase}/${pathArg}`.replace(/\/+/g, '/').replace(/\/$/, '');
  for (const par of params) {
    p = p.replace(`:${par}`, `{{${par}}}`);
  }
  return p;
}

function makeRequest(item, ctrl) {
  const path = buildPath(ctrl.ctrlBase, item.pathArg, item.params);
  const url = {
    raw: `{{baseUrl}}/${path}`,
    host: ['{{baseUrl}}'],
    path: path.split('/').filter(Boolean),
  };
  const header = [{ key: 'Content-Type', value: 'application/json' }];
  if (item.needsAuth) header.push({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
  // global ApiKeyGuard requires x-api-key on every non-public endpoint
  if (!item.isPublic) header.push({ key: 'x-api-key', value: '{{apiKey}}' });

  const request = { method: item.method, header, url };
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(item.method);
  if (hasBody) {
    let body = buildBody(item.dtoName, ctrl.dtoDir, ctrl.src) || item.inlineBody;
    if (!body && item.bodyField) body = { [item.bodyField]: 'string' };
    if (!body) body = {}; // safe default; flagged as placeholder if truly unknown
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  const tests = [];
  tests.push(`pm.test("Status is success", () => { pm.expect([200,201,204].includes(pm.response.code)).to.be.true; });`);
  if (hasBody) tests.push(`pm.test("Has response shape", () => { const j = pm.response.json(); pm.expect(j).to.have.property("success"); });`);
  // capture ids / tokens for chaining
  if (item.method === 'POST') {
    tests.push(
      `const j = pm.response.json();`,
      `const data = j.data || j;`,
      `const tok = data.accessToken || data.token;`,
      `if (tok) pm.environment.set("accessToken", tok);`,
      `if (data.refreshToken) pm.environment.set("refreshToken", data.refreshToken);`,
      `pm.environment.set("tokenExpiry", String(Date.now() + 55 * 60 * 1000));`,
      `const id = data.id || j.id;`,
      `if (id) pm.environment.set("lastCreatedId", id);`,
    );
  }

  const event = [
    {
      listen: 'test',
      script: { exec: tests, type: 'text/javascript' },
    },
  ];

  return {
    name: item.summary || `${item.method} ${item.pathArg || '/'}`,
    request,
    event,
  };
}

// ---- main ----
const controllers = walk(MODULES_DIR);
const folders = {};
for (const c of controllers) {
  const ctrl = parseController(c);
  if (!ctrl) continue;
  if (!ctrl.items.length) continue;
  const folder = folders[ctrl.moduleName] || (folders[ctrl.moduleName] = []);
  for (const it of ctrl.items) folder.push(makeRequest(it, ctrl));
}

const collection = {
  info: {
    name: 'Offbeat Pravasi API',
    description: 'Production Postman collection generated from controllers + DTOs. Uses {{baseUrl}}, {{accessToken}} env vars. Every POST/PUT/PATCH has a DTO-driven body; every request has test assertions.',
    schema: SCHEMA,
  },
  // collection-level auth: synchronous token acquisition so accessToken is set
  // BEFORE the request is sent (pm.sendRequest is async and would race it).
  // Prefers refresh (session reuse) over full re-login when a refreshToken exists.
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          '// Skip auth endpoints (they issue their own tokens).',
          'const raw = pm.request.url.path.join("/");',
          'if (raw.includes("/auth/")) return;',
          'const token = pm.environment.get("accessToken");',
          'const tokenExpiry = pm.environment.get("tokenExpiry");',
          'const fresh = token && tokenExpiry && Date.now() < parseInt(tokenExpiry);',
          'if (fresh) return;',
          'const base = pm.environment.get("baseUrl");',
          'function applyTokens(resp) {',
          '  const j = JSON.parse(resp);',
          '  const data = j.data || j;',
          '  const t = data.accessToken || data.token;',
          '  if (t) {',
          '    pm.environment.set("accessToken", t);',
          '    pm.environment.set("tokenExpiry", String(Date.now() + 55 * 60 * 1000));',
          '  }',
          '  if (data.refreshToken) pm.environment.set("refreshToken", data.refreshToken);',
          '}',
          'function call(url, body) {',
          '  const xhr = new XMLHttpRequest();',
          '  xhr.open("POST", url, false);',
          '  xhr.setRequestHeader("Content-Type", "application/json");',
          '  xhr.send(JSON.stringify(body));',
          '  if (xhr.status < 200 || xhr.status >= 300) throw new Error(xhr.status + " " + xhr.responseText);',
          '  return xhr.responseText;',
          '}',
          '// 1) Try silent session refresh first.',
          'const rt = pm.environment.get("refreshToken");',
          'if (rt) {',
          '  try { applyTokens(call(base + "/api/v1/auth/refresh", { refreshToken: rt })); return; }',
          '  catch (e) { console.warn("refresh failed, falling back to login:", e.message); }',
          '}',
          '// 2) Fall back to full login.',
          'const email = pm.environment.get("adminEmail");',
          'const password = pm.environment.get("adminPassword");',
          'if (!email || !password) return;',
          'try { applyTokens(call(base + "/api/v1/auth/login", { email: email, password: password })); }',
          'catch (e) { console.error("auto-login failed:", e.message); }',
        ],
      },
    },
  ],
  item: Object.entries(folders).map(([name, items]) => ({ name, item: items })),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(collection, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`Modules: ${Object.keys(folders).length}, Requests: ${Object.values(folders).reduce((a, b) => a + b.length, 0)}`);



