/**
 * Static link/button audit: every <button> needs an onClick (or type="submit" inside a form,
 * or to be a wrapper the parent handles), every <a> needs a real href (no "#", no empty).
 */
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

const problems: string[] = [];
let buttons = 0;
let anchors = 0;
function walk(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) scan(p);
  }
}
function attrs(el: ts.JsxOpeningLikeElement): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of el.attributes.properties) {
    if (ts.isJsxSpreadAttribute(a)) m.set('...spread', '');
    else m.set(a.name.getText(), a.initializer ? a.initializer.getText() : 'true');
  }
  return m;
}
function scan(file: string) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText();
      const a = attrs(n);
      const where = `${path.relative(process.cwd(), file)}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
      if (tag === 'button') {
        buttons++;
        const ok = a.has('onClick') || a.has('...spread') || a.get('type') === '"submit"' || a.has('onPointerDown') || a.has('onMouseDown');
        if (!ok) problems.push(`${where} <button> without onClick`);
      }
      if (tag === 'a') {
        anchors++;
        const href = a.get('href');
        if (!href || href === '"#"' || href === '""') problems.push(`${where} <a> with href=${href ?? '(none)'}`);
        if (a.get('target') === '"_blank"' && !/noopener/.test(a.get('rel') || '')) problems.push(`${where} target=_blank without rel=noopener`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
walk(path.resolve('src'));
console.log(`Scanned ${buttons} buttons and ${anchors} links.`);
for (const p of problems) console.log('  ❌ ' + p);
console.log(problems.length ? `${problems.length} problems` : '✅ every button has a handler, every link a real target');
if (problems.length) process.exit(1);
