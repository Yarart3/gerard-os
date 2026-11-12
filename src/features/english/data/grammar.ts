// Reglas de construcción de frases con ejemplos en bloques de colores según su función.
export type Role = 'subject' | 'verb' | 'object' | 'adverb' | 'place' | 'time' | 'conj' | 'aux' | 'question' | 'neg' | 'rel'
export const ROLE_LABEL: Record<Role, string> = {
  subject: 'Sujeto',
  verb: 'Verbo',
  object: 'Objeto',
  adverb: 'Adverbio',
  place: 'Lugar',
  time: 'Tiempo',
  conj: 'Conjunción',
  aux: 'Auxiliar',
  question: 'Pregunta',
  neg: 'Negación',
  rel: 'Relativo',
}
export type Part = { t: string; r: Role }
export type GrammarRule = { id: string; title: string; rule: string; trick: string; examples: Part[][] }
const P = (t: string, r: Role): Part => ({ t, r })

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: 'svo',
    title: 'Orden básico: sujeto + verbo + objeto',
    rule: 'En inglés el orden casi nunca cambia: sujeto, verbo, objeto. No se puede mover el objeto delante como en castellano ("El código lo escribí yo").',
    trick: 'Piensa S-V-O siempre; lugar antes que tiempo al final (M-L-T: modo, lugar, tiempo).',
    examples: [
      [P('The intern', 'subject'), P('broke', 'verb'), P('the build', 'object'), P('in the office', 'place'), P('on Friday', 'time')],
      [P('I', 'subject'), P('lifted', 'verb'), P('a heavy barbell', 'object'), P('at the box', 'place'), P('this morning', 'time')],
    ],
  },
  {
    id: 'adverbs',
    title: 'Posición de los adverbios de frecuencia',
    rule: 'Los adverbios de frecuencia (always, usually, never…) van delante del verbo principal y detrás de "to be" o del primer auxiliar.',
    trick: 'Antes del verbo, después de "be": I never skip leg day / I am never late.',
    examples: [
      [P('I', 'subject'), P('usually', 'adverb'), P('watch', 'verb'), P('one episode', 'object')],
      [P('She', 'subject'), P('is', 'verb'), P('always', 'adverb'), P('on time', 'time')],
      [P('We', 'subject'), P('have', 'aux'), P('never', 'adverb'), P('deployed', 'verb'), P('on Friday', 'time')],
    ],
  },
  {
    id: 'questions',
    title: 'Preguntas: auxiliar delante del sujeto',
    rule: 'Para preguntar se coloca el auxiliar (do/does/did, have, can…) antes del sujeto. Después del auxiliar el verbo va en infinitivo sin "to".',
    trick: 'Palabra interrogativa + auxiliar + sujeto + verbo: Where did you train?',
    examples: [
      [P('Where', 'question'), P('did', 'aux'), P('you', 'subject'), P('train', 'verb'), P('yesterday', 'time')],
      [P('Can', 'aux'), P('your laptop', 'subject'), P('run', 'verb'), P('this code', 'object')],
    ],
  },
  {
    id: 'negation',
    title: 'Negación',
    rule: 'La negación se forma con el auxiliar + not (don\'t, doesn\'t, didn\'t, haven\'t…). Con "be" se añade not directamente. No hay doble negación: "I don\'t know nothing" se dice "I don\'t know anything".',
    trick: 'Un solo negativo por frase: not … any / nothing sin "not".',
    examples: [
      [P('He', 'subject'), P("doesn't", 'neg'), P('like', 'verb'), P('spoilers', 'object')],
      [P('They', 'subject'), P("haven't", 'neg'), P('seen', 'verb'), P('anything', 'object'), P('yet', 'time')],
    ],
  },
  {
    id: 'subordinate',
    title: 'Subordinadas: la conjunción abre y el orden se mantiene',
    rule: 'Después de because, although, when, if, that… la subordinada conserva el orden sujeto + verbo. Con condicionales, se usa presente (no futuro) tras if / when.',
    trick: 'if / when + presente, will + infinitivo. Nunca "if I will".',
    examples: [
      [P('If', 'conj'), P('the tests', 'subject'), P('pass', 'verb'), P(',', 'conj'), P('we', 'subject'), P('will deploy', 'verb')],
      [P('Although', 'conj'), P('he', 'subject'), P('was tired', 'verb'), P(',', 'conj'), P('he', 'subject'), P('finished', 'verb'), P('the WOD', 'object')],
    ],
  },
  {
    id: 'relative',
    title: 'Oraciones de relativo',
    rule: 'who (personas), which (cosas), that (ambos, sin coma), whose (posesión). El relativo es el sujeto de la subordinada, así que no se repite el sujeto.',
    trick: 'Quita el pronombre repetido: "the guy who he fixed" mal; "the guy who fixed it" bien.',
    examples: [
      [P('The developer', 'subject'), P('who', 'rel'), P('wrote this', 'verb'), P('has left', 'verb'), P('the company', 'object')],
      [P('The series', 'subject'), P('that', 'rel'), P('everyone is talking about', 'verb'), P('is overrated', 'verb')],
    ],
  },
  {
    id: 'indirect',
    title: 'Preguntas indirectas',
    rule: 'En una pregunta indirecta ("Could you tell me…", "I wonder…") se recupera el orden afirmativo: sin auxiliar delante ni do/does/did.',
    trick: 'Pregunta indirecta = orden de frase normal: I wonder where he is, no where is he.',
    examples: [
      [P('Do you know', 'aux'), P('where', 'question'), P('the barbell', 'subject'), P('is', 'verb')],
      [P('I wonder', 'aux'), P('why', 'question'), P('the build', 'subject'), P('failed', 'verb')],
    ],
  },
  {
    id: 'phrasal',
    title: 'Phrasal verbs con objeto',
    rule: 'En phrasal verbs separables el objeto puede ir en medio; si el objeto es un pronombre, SIEMPRE va en medio.',
    trick: 'Pronombre en medio: turn it off (no "turn off it").',
    examples: [
      [P('Please', 'adverb'), P('turn', 'verb'), P('the music', 'object'), P('off', 'verb')],
      [P('Please', 'adverb'), P('turn', 'verb'), P('it', 'object'), P('off', 'verb')],
    ],
  },
]
