// Mini parser XML (suficiente para las respuestas multistatus de WebDAV/CalDAV).
// Los nombres se guardan sin prefijo de espacio de nombres ("D:href" → "href").
export type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[]; text: string }

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e] ?? m
  })
}

export const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const local = (n: string) => n.slice(n.lastIndexOf(':') + 1)

const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g
const ATTR = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

export function parseXml(xml: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '' }
  const stack: XmlNode[] = [root]
  TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN.exec(xml))) {
    const top = stack[stack.length - 1]!
    if (m[1] !== undefined) top.text += m[1]
    else if (m[2] !== undefined) {
      if (stack.length > 1) stack.pop()
    } else if (m[3] !== undefined) {
      const attrs: Record<string, string> = {}
      for (const a of (m[4] ?? '').matchAll(ATTR)) attrs[local(a[1]!)] = decodeEntities(a[2] ?? a[3] ?? '')
      const node: XmlNode = { name: local(m[3]), attrs, children: [], text: '' }
      top.children.push(node)
      if (!m[5]) stack.push(node)
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6])
  }
  return root
}

/** Hijo directo por nombre local. */
export const child = (n: XmlNode | undefined, name: string) => n?.children.find((c) => c.name === name)
export const childrenNamed = (n: XmlNode | undefined, name: string) =>
  n ? n.children.filter((c) => c.name === name) : []
/** Descendiente siguiendo una ruta de nombres. */
export function path(n: XmlNode | undefined, ...names: string[]): XmlNode | undefined {
  let cur = n
  for (const name of names) cur = child(cur, name)
  return cur
}
export const textOf = (n: XmlNode | undefined) => (n ? n.text.trim() : '')
