import fs from 'fs';
import path from 'path';

const roots = ['lib', path.join('app', 'api'), 'prisma', 'test'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function transform(s) {
  return s
    .replace(/\(db as any\)\.repair\b/g, '(db as any).serviceJob')
    .replace(/\b(db|tx)\.customer\b/g, (_, a) => `${a}.party`)
    .replace(/\bprisma\.customer\b/g, 'prisma.party')
    .replace(/\b(db|tx)\.repair\b/g, (_, a) => `${a}.serviceJob`)
    .replace(/\bprisma\.repair\b/g, 'prisma.serviceJob')
    .replace(/\b(db|tx)\.product\b/g, (_, a) => `${a}.item`)
    .replace(/\bprisma\.product\b/g, 'prisma.item');
}

const files = roots.flatMap((r) => walk(path.join(process.cwd(), r)));
let n = 0;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const t = transform(c);
  if (t !== c) {
    fs.writeFileSync(f, t);
    n++;
  }
}
console.log('updated', n, 'files');
