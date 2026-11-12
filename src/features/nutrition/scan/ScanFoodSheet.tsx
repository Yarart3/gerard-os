import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { NeedsConnection, NumberInput, Sheet, useToast } from '../../../components/ui'
import { useOnline } from '../../../lib/offline/connectivity'
import { findFoodByBarcode, useCreateFood, useFoods, type Food } from '../api'
import { fetchOffProduct, normalizeBarcode, type ScannedFood } from '../logic/barcode'
import { cameraErrorMessage, createDetector } from './detector'
import g from '../../gym/Gym.module.css'
import s from './Scan.module.css'

type Step =
  | { kind: 'scan' }
  | { kind: 'loading'; code: string }
  | { kind: 'review'; code: string; food: ScannedFood; notFound: boolean }

/**
 * Escanea (o escribe) un código y devuelve el alimento de `foods`: el que ya existe con ese código o uno
 * nuevo creado tras revisar los datos de Open Food Facts. Requiere conexión. Se carga de forma perezosa.
 */
export default function ScanFoodSheet({
  onClose,
  onFood,
}: {
  onClose: () => void
  onFood: (food: Food) => void
}) {
  const foods = useFoods()
  const online = useOnline()
  const toast = useToast()
  const [step, setStep] = useState<Step>({ kind: 'scan' })
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(
    async (raw: string) => {
      const code = normalizeBarcode(raw)
      if (!code) {
        setError('Código no válido: debe ser un EAN-13, EAN-8 o UPC con dígito de control correcto.')
        return
      }
      setError(null)
      const existing = findFoodByBarcode(foods.data ?? [], code)
      if (existing) {
        toast(`Ya lo tenías: ${existing.name}`)
        onFood(existing)
        return
      }
      setStep({ kind: 'loading', code })
      try {
        const res = await fetchOffProduct(code)
        setStep({
          kind: 'review',
          code,
          notFound: !res.found,
          food: res.found
            ? res.food
            : { name: '', brand: null, kcal: null, protein: null, carbs: null, fat: null, fiber: null },
        })
      } catch {
        setError('No se ha podido consultar Open Food Facts. Comprueba la conexión e inténtalo de nuevo.')
        setStep({ kind: 'scan' })
      }
    },
    [foods.data, onFood, toast],
  )

  return (
    <Sheet open onClose={onClose} title="Escanear alimento">
      <NeedsConnection />
      {error && (
        <p className={`${s.msg} ${s.error}`} role="alert">
          {error}
        </p>
      )}
      {step.kind === 'scan' && <ScanStep enabled={online} onCode={lookup} onError={setError} />}
      {step.kind === 'loading' && <p className={g.muted}>Buscando {step.code}…</p>}
      {step.kind === 'review' && (
        <ReviewStep
          code={step.code}
          initial={step.food}
          notFound={step.notFound}
          onBack={() => setStep({ kind: 'scan' })}
          onSaved={onFood}
        />
      )}
    </Sheet>
  )
}

function ScanStep({
  enabled,
  onCode,
  onError,
}: {
  enabled: boolean
  onCode: (code: string) => void
  onError: (msg: string | null) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onCodeRef.current = onCode
    onErrorRef.current = onError
  })
  const [starting, setStarting] = useState(() => !!navigator.mediaDevices?.getUserMedia)
  const [manual, setManual] = useState('')

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop()) // apaga la cámara al cerrar
      if (video.current) video.current.srcObject = null
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current('Este navegador no permite usar la cámara aquí. Escribe el código a mano.')
      return stop
    }
    ;(async () => {
      try {
        const st = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (stopped) {
          st.getTracks().forEach((t) => t.stop())
          return
        }
        stream = st
        const el = video.current!
        el.srcObject = st
        await el.play()
        setStarting(false)
        const detect = await createDetector()
        const tick = async () => {
          if (stopped) return
          let code: string | null = null
          try {
            code = await detect(el)
          } catch {
            /* un fotograma fallido no es grave */
          }
          if (stopped) return
          if (code) {
            stop()
            onCodeRef.current(code)
            return
          }
          timer = setTimeout(tick, 250)
        }
        tick()
      } catch (e) {
        if (!stopped) {
          onErrorRef.current(cameraErrorMessage(e))
          setStarting(false)
        }
      }
    })()
    return stop
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onCode(manual)
  }

  return (
    <>
      <div className={s.frame}>
        <video ref={video} className={s.video} playsInline muted aria-label="Vista de la cámara" />
        <div className={s.guide} aria-hidden />
      </div>
      <p className={g.muted} style={{ margin: 0 }}>
        {starting ? 'Abriendo la cámara…' : 'Apunta al código de barras del envase.'}
      </p>
      <form className={g.inline} onSubmit={submit}>
        <input
          className="input"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Código de barras"
          placeholder="O escribe el código"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button
          className="btn btn-primary"
          style={{ width: 'auto', padding: '0 20px' }}
          disabled={!enabled || !manual.trim()}
        >
          Buscar
        </button>
      </form>
    </>
  )
}

const FIELDS = [
  ['kcal', 'Calorías (kcal)'],
  ['protein', 'Proteína (g)'],
  ['carbs', 'Carbohidratos (g)'],
  ['fat', 'Grasa (g)'],
  ['fiber', 'Fibra (g)'],
] as const
type Key = (typeof FIELDS)[number][0]

function ReviewStep({
  code,
  initial,
  notFound,
  onBack,
  onSaved,
}: {
  code: string
  initial: ScannedFood
  notFound: boolean
  onBack: () => void
  onSaved: (f: Food) => void
}) {
  const create = useCreateFood()
  const online = useOnline()
  const toast = useToast()
  const [name, setName] = useState(initial.name)
  const [values, setValues] = useState<Record<Key, number | null>>({
    kcal: initial.kcal,
    protein: initial.protein,
    carbs: initial.carbs,
    fat: initial.fat,
    fiber: initial.fiber,
  })
  const missing = initial.kcal === null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const food = await create.mutateAsync({
        name: name.replace(/\s+/g, ' ').trim(),
        barcode: code,
        kcal: values.kcal ?? 0,
        protein: values.protein ?? 0,
        carbs: values.carbs ?? 0,
        fat: values.fat ?? 0,
        fiber: values.fiber ?? 0,
      })
      toast('Alimento guardado')
      onSaved(food)
    } catch (err) {
      toast(
        err instanceof Error && err.message === 'duplicate'
          ? 'Ya existe un alimento con ese nombre o ese código'
          : 'No se ha podido guardar',
        'error',
      )
    }
  }

  return (
    <form className={g.form} onSubmit={submit}>
      <div className={g.full}>
        <p className={s.msg}>
          {notFound
            ? 'Producto no encontrado en Open Food Facts. Rellénalo a mano.'
            : missing
              ? 'Faltan los datos nutricionales: complétalos a mano.'
              : 'Revisa los datos antes de guardar.'}
        </p>
        <p className={s.brand}>
          Código {code}
          {initial.brand ? ` · ${initial.brand}` : ''}
        </p>
      </div>
      <label className={`field ${g.full}`}>
        <span className="field-label">Nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <p className={`${g.small} ${g.full}`} style={{ margin: 0 }}>
        Valores por 100 g
      </p>
      {FIELDS.map(([key, label]) => (
        <label key={key} className="field">
          <span className="field-label">{label}</span>
          <NumberInput
            decimals={2}
            placeholder="0"
            value={values[key]}
            onCommit={(v) => setValues((p) => ({ ...p, [key]: v }))}
          />
        </label>
      ))}
      <div className={g.full}>
        <button className="btn btn-primary" disabled={create.isPending || !online || !name.trim()}>
          Guardar alimento
        </button>
      </div>
      <div className={g.full} style={{ display: 'flex', justifyContent: 'center' }}>
        <button type="button" className="btn btn-plain" onClick={onBack}>
          Escanear otro
        </button>
      </div>
    </form>
  )
}
