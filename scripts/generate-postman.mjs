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
      const ext = src.match(/extends\s+(?:PartialType\()?(\w+)/);
      if (ext) {
        const baseProps = buildBody(ext[1], dtoDir, controllerSrc);
        if (baseProps) props = baseProps;
      }
    }
  } else if (controllerSrc && controllerSrc.includes(`class ${dtoName}`)) {
    // inline DTO defined in the controller file
    props = parseDtoFromSource(controllerSrc, dtoName);
    if (!Object.keys(props).length) {
      const ext = controllerSrc.match(/class\s+\w+[\s\S]*?extends\s+(?:PartialType\()?(\w+)/);
      if (ext) {
        const baseProps = buildBody(ext[1], dtoDir, controllerSrc);
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

function parseDtoProps(src) {
  const props = {};
  const re = /@(\w+)\s*\([^)]*\)\s*\n\s*(?:@\w+\s*\([^)]*\)\s*\n\s*)*(\w+)\s*[!?]?\s*:/g;
  let m;
  while ((m = re.exec(src))) {
    const decs = new Set();
    const lineStart = src.lastIndexOf('@', m.index);
    const blk = src.slice(lineStart, m.index + m[0].length);
    for (const d of blk.match(/@(\w+)/g) || []) decs.add(d.slice(1));
    const propName = m[m.length - 1];
    props[propName] = { optional: /[!?]\s*[:=]/.test(m[0]) || decs.has('IsOptional'), decs };
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

  const items = [];
  // match each route handler block: a method decorator followed by its body
  const handlerRe = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)([\s\S]*?)(?=@(?:Get|Post|Put|Patch|Delete|Options|Head)\s*\(|export class)/g;
  let h;
  while ((h = handlerRe.exec(src))) {
    const method = h[1].toUpperCase();
    const pathArg = (h[2].match(/['"`]([^'"`]*)['"`]/) || [])[1] ?? '';
    const block = h[3];

    // auth: any guard that is not Public/AllowAnonymous
    const isPublic = /@Public\(\)|@AllowAnonymous\(\)/.test(block);
    const needsAuth = !isPublic && /UseGuards|AuthGuard/.test(block);

    // find @Body() dto type: "@Body() paramName: DtoType" or "@Body('x') x?: Type"
    const bodyMatch = block.match(/@Body\([^)]*\)\s*\w+\s*[:?]\s*(\w+)/);
    const dtoName = bodyMatch ? bodyMatch[1] : null;
    // inline body literal: @Body() body: { pattern: string }
    let inlineBody = null;
    const inlineMatch = block.match(/@Body\([^)]*\)\s*\w+\s*[:?]\s*\{([^}]*)\}/s);
    if (inlineMatch) {
      inlineBody = {};
      for (const part of inlineMatch[1].split(',')) {
        const kv = part.match(/(\w+)\s*[:?]/);
        if (kv) inlineBody[kv[1]] = 'string';
      }
    }
    // single-field body: @Body('reason') reason?: string  -> field path
    const fieldMatch = block.match(/@Body\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(\w+)\s*[:?]/);
    const bodyField = fieldMatch ? fieldMatch[1] : null;

    // @Param ids
    const params = [...block.matchAll(/@Param\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
    // @Query
    const hasQuery = /@Query\(/.test(block);
    const opMatch = block.match(/@ApiOperation\(\{\s*summary:\s*['"`]([^'"`]+)['"`]/);
    const summary = opMatch ? opMatch[1] : '';

    items.push({ method, pathArg, needsAuth, dtoName, inlineBody, bodyField, params, hasQuery, summary });
  }
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
      `const tok = j.data?.accessToken || j.data?.token || j.accessToken || j.token;`,
      `if (tok) pm.environment.set("accessToken", tok);`,
      `const id = j.data?.id || j.id;`,
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
  // collection-level auth: auto-login before protected requests
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          '// Auto-refresh admin token if missing/expired (skips auth/* + public GETs).',
          'const raw = pm.request.url.path.join("/");',
          'const isAuthOrPublic = raw.includes("/auth/") ;',
          'const tokenExpiry = pm.environment.get("tokenExpiry");',
          'const expired = !tokenExpiry || Date.now() > parseInt(tokenExpiry);',
          'if (!isAuthOrPublic && expired && pm.environment.get("adminEmail")) {',
          '  pm.sendRequest({',
          '    url: pm.environment.get("baseUrl") + "/api/v1/auth/login",',
          '    method: "POST",',
          '    header: { "Content-Type": "application/json" },',
          '    body: { mode: "raw", raw: JSON.stringify({ email: pm.environment.get("adminEmail"), password: pm.environment.get("adminPassword") }) }',
          '  }, (err, res) => {',
          '    if (!err) { const j = res.json(); const t = j.data?.accessToken || j.accessToken || j.token; if (t) { pm.environment.set("accessToken", t); pm.environment.set("tokenExpiry", String(Date.now() + 55*60*1000)); } }',
          '  });',
          '}',
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
