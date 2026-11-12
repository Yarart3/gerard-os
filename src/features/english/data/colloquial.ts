// Formas coloquiales del inglés hablado (se pronuncian como se escriben en `say`).
export type Colloquial = { form: string; full: string; meaning: string; example: string; say: string }
export const COLLOQUIAL: Colloquial[] = [
  { form: 'gonna', full: 'going to', meaning: 'futuro / planes', example: "I'm gonna do one more round. Probably.", say: "I'm gonna do one more round. Probably." },
  { form: 'wanna', full: 'want to', meaning: 'querer', example: 'Do you wanna watch another episode?', say: 'Do you wanna watch another episode?' },
  { form: 'gotta', full: 'have got to', meaning: 'tener que', example: 'I gotta push this fix before lunch.', say: 'I gotta push this fix before lunch.' },
  { form: 'kinda', full: 'kind of', meaning: 'un poco, más o menos', example: "It's kinda heavy, but it's fine.", say: "It's kinda heavy, but it's fine." },
  { form: 'sorta', full: 'sort of', meaning: 'algo así', example: 'The build is sorta working.', say: 'The build is sorta working.' },
  { form: 'lemme', full: 'let me', meaning: 'déjame', example: 'Lemme check the logs.', say: 'Lemme check the logs.' },
  { form: 'gimme', full: 'give me', meaning: 'dame', example: 'Gimme five minutes and a coffee.', say: 'Gimme five minutes and a coffee.' },
  { form: 'dunno', full: "(I) don't know", meaning: 'ni idea', example: "Dunno, ask the one who wrote it.", say: 'I dunno, ask the one who wrote it.' },
  { form: "'cause", full: 'because', meaning: 'porque', example: "I'm late 'cause the stream froze.", say: "I'm late 'cause the stream froze." },
  { form: 'whatcha', full: 'what are you', meaning: '¿qué estás…?', example: 'Whatcha doing? Watching the finale again?', say: 'Whatcha doing? Watching the finale again?' },
  { form: 'shoulda / coulda / woulda', full: 'should/could/would have', meaning: 'debería / podría / habría', example: 'I shoulda gone to bed earlier.', say: 'I shoulda gone to bed earlier.' },
  { form: "y'know", full: 'you know', meaning: 'muletilla: ¿sabes?', example: "It's, y'know, a bit complicated.", say: "It's, y'know, a bit complicated." },
  { form: 'ain\'t', full: "am not / isn't / aren't / haven't", meaning: 'negación informal', example: "That ain't gonna compile.", say: "That ain't gonna compile." },
  { form: 'tryna', full: 'trying to', meaning: 'intentando', example: "I'm tryna fix it before the demo.", say: "I'm tryna fix it before the demo." },
  { form: 'innit', full: "isn't it", meaning: 'coletilla británica', example: "Cold today, innit?", say: 'Cold today, innit?' },
  { form: 'cuppa', full: 'cup of (tea)', meaning: 'taza de té (UK)', example: 'Fancy a cuppa?', say: 'Fancy a cuppa?' },
]
