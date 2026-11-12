// Ejercicios semilla (estáticos, sin IA) para que cada apartado sirva desde el primer día.
export type OrderPuzzle = { id: string; es: string; accepted_orders: string[]; rule: string; tip?: string }
export type RephrasePuzzle = { id: string; sentence: string; instruction: string; model_answers: string[]; rule: string }
export type Dictation = { id: string; text: string }

export const REPHRASE_TOPICS = [
  { value: 'passive', label: 'Pasiva' },
  { value: 'conditionals', label: 'Condicionales' },
  { value: 'reported', label: 'Estilo indirecto' },
  { value: 'linking', label: 'Conectores' },
  { value: 'inversion', label: 'Inversión' },
  { value: 'relative', label: 'Relativos' },
] as const

export const REPHRASE_SEED: (RephrasePuzzle & { topic: string })[] = [
  { id: 'r1', topic: 'passive', sentence: 'The intern deleted the production database on Friday.', instruction: 'Turn it into the passive.', model_answers: ['The production database was deleted by the intern on Friday.'], rule: 'Passive voice' },
  { id: 'r2', topic: 'passive', sentence: 'They are fixing the bug right now.', instruction: 'Use the passive voice.', model_answers: ['The bug is being fixed right now.'], rule: 'Passive continuous' },
  { id: 'r3', topic: 'conditionals', sentence: "I didn't stretch, so my shoulder hurts.", instruction: 'Start with "If" (third/mixed conditional).', model_answers: ['If I had stretched, my shoulder would not hurt.', "If I had stretched, my shoulder wouldn't hurt."], rule: 'Mixed conditional' },
  { id: 'r4', topic: 'conditionals', sentence: 'Do not touch the code or it will break.', instruction: 'Use "unless".', model_answers: ['Unless you leave the code alone, it will break.', 'Unless you leave the code alone it will break.'], rule: 'Unless' },
  { id: 'r5', topic: 'reported', sentence: '"I will finish the episode tonight," she said.', instruction: 'Use reported speech.', model_answers: ['She said (that) she would finish the episode that night.'], rule: 'Reported speech' },
  { id: 'r6', topic: 'reported', sentence: '"Have you pushed the changes?" he asked me.', instruction: 'Use reported speech.', model_answers: ['He asked me if I had pushed the changes.', 'He asked me whether I had pushed the changes.'], rule: 'Reported questions' },
  { id: 'r7', topic: 'linking', sentence: 'The workout was brutal. We finished it anyway.', instruction: 'Join them using "Although".', model_answers: ['Although the workout was brutal, we finished it anyway.', 'Although the workout was brutal, we finished it.'], rule: 'Concession' },
  { id: 'r8', topic: 'linking', sentence: 'He missed the deadline because the server crashed.', instruction: 'Start with "Due to".', model_answers: ['Due to the server crash, he missed the deadline.', 'Due to the server crashing, he missed the deadline.'], rule: 'Cause connectors' },
  { id: 'r9', topic: 'inversion', sentence: 'I had never seen such a bad plot twist.', instruction: 'Start with "Never".', model_answers: ['Never had I seen such a bad plot twist.'], rule: 'Negative inversion' },
  { id: 'r10', topic: 'inversion', sentence: 'You must not open the door under any circumstances.', instruction: 'Start with "Under no circumstances".', model_answers: ['Under no circumstances must you open the door.'], rule: 'Negative inversion' },
  { id: 'r11', topic: 'relative', sentence: 'My coach is a woman. She never lets me skip warm-ups.', instruction: 'Join them with a relative clause.', model_answers: ['My coach is a woman who never lets me skip warm-ups.', 'My coach, who never lets me skip warm-ups, is a woman.'], rule: 'Relative clauses' },
  { id: 'r12', topic: 'relative', sentence: 'The series has a brilliant cast. I told you about it.', instruction: 'Join them with a relative clause.', model_answers: ['The series I told you about has a brilliant cast.', 'The series that I told you about has a brilliant cast.', 'The series which I told you about has a brilliant cast.'], rule: 'Defining relative clauses' },
]

export const ORDER_SEED: OrderPuzzle[] = [
  { id: 'o1', es: 'Normalmente entreno por la mañana.', accepted_orders: ['I usually train in the morning.', 'Usually I train in the morning.', 'In the morning I usually train.'], rule: 'Adverbs of frequency', tip: 'El adverbio de frecuencia va antes del verbo.' },
  { id: 'o2', es: 'Nunca despliego los viernes.', accepted_orders: ['I never deploy on Fridays.'], rule: 'Adverbs of frequency' },
  { id: 'o3', es: '¿Dónde entrenaste ayer?', accepted_orders: ['Where did you train yesterday?'], rule: 'Questions', tip: 'Interrogativo + auxiliar + sujeto + verbo.' },
  { id: 'o4', es: '¿Puedes decirme dónde está la barra?', accepted_orders: ['Can you tell me where the barbell is?', 'Could you tell me where the barbell is?'], rule: 'Indirect questions', tip: 'En la pregunta indirecta vuelve el orden normal.' },
  { id: 'o5', es: 'Terminó el entreno en el gimnasio esta mañana.', accepted_orders: ['He finished the workout at the gym this morning.', 'He finished the workout this morning at the gym.'], rule: 'Place before time' },
  { id: 'o6', es: 'Apágala, por favor.', accepted_orders: ['Please turn it off.', 'Turn it off, please.'], rule: 'Phrasal verbs', tip: 'El pronombre va en medio del phrasal verb.' },
  { id: 'o7', es: 'Si los tests pasan, desplegaremos.', accepted_orders: ["If the tests pass, we'll deploy.", 'If the tests pass, we will deploy.', "We'll deploy if the tests pass.", 'We will deploy if the tests pass.'], rule: 'Conditionals', tip: 'Tras if, presente.' },
  { id: 'o8', es: 'La serie que me recomendaste es genial.', accepted_orders: ['The series you recommended to me is great.', 'The series that you recommended to me is great.', 'The series you recommended is great.'], rule: 'Relative clauses' },
  { id: 'o9', es: 'No tengo nada que ponerme.', accepted_orders: ["I don't have anything to wear.", 'I have nothing to wear.'], rule: 'Negation', tip: 'Un solo negativo por frase.' },
  { id: 'o10', es: 'Aún no he visto el final.', accepted_orders: ["I haven't seen the ending yet.", "I haven't seen the finale yet.", "I still haven't seen the ending."], rule: 'Negation' },
  { id: 'o11', es: 'Aunque estaba cansado, terminó la rutina.', accepted_orders: ['Although he was tired, he finished the routine.', 'He finished the routine although he was tired.'], rule: 'Subordinate clauses' },
  { id: 'o12', es: '¿Sabes por qué ha fallado el despliegue?', accepted_orders: ['Do you know why the deployment failed?', 'Do you know why the deploy failed?'], rule: 'Indirect questions' },
]

export const DICTATION_SEED: Dictation[] = [
  { id: 'd1', text: "I'm gonna push the fix before lunch, I promise." },
  { id: 'd2', text: 'She would have finished the workout if she had not lost count of the rounds.' },
  { id: 'd3', text: "I don't know about you, but I could binge this series all weekend." },
  { id: 'd4', text: 'Could you tell me where the nearest coffee machine is?' },
  { id: 'd5', text: "Whatever you do, don't deploy on a Friday afternoon." },
  { id: 'd6', text: 'It turned out that the bug was caused by a missing semicolon.' },
  { id: 'd7', text: "They've been training for months, so they ought to be ready." },
  { id: 'd8', text: "Lemme check the logs and I'll get back to you in a bit." },
]
