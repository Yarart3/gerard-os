// Lectura de códigos de barras desde un <video>. `BarcodeDetector` si existe (Chrome, Safari de macOS/Android);
// Safari de iOS no lo tiene: se carga `zxing-wasm` (lector EAN/UPC) solo en ese caso y solo al escanear.
import { normalizeBarcode } from '../logic/barcode'

export type Detect = (video: HTMLVideoElement) => Promise<string | null>

type NativeDetector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> }
type NativeCtor = {
  new (opts: { formats: string[] }): NativeDetector
  getSupportedFormats?: () => Promise<string[]>
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

export async function createDetector(): Promise<Detect> {
  const Native = (globalThis as { BarcodeDetector?: NativeCtor }).BarcodeDetector
  if (Native) {
    try {
      const supported = (await Native.getSupportedFormats?.()) ?? NATIVE_FORMATS
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f))
      if (formats.length) {
        const det = new Native({ formats })
        return async (video) => {
          const found = await det.detect(video)
          for (const r of found) {
            const code = normalizeBarcode(r.rawValue)
            if (code) return code
          }
          return null
        }
      }
    } catch {
      /* cae al lector ZXing */
    }
  }

  const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // El .wasm se sirve desde el propio sitio (por defecto la librería lo pediría a un CDN).
  await prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
    fireImmediately: true,
  })
  const canvas = document.createElement('canvas')
  return async (video) => {
    if (!video.videoWidth) return null
    // Reducir el fotograma acelera la lectura sin perder barras legibles.
    const scale = Math.min(1, 960 / video.videoWidth)
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const results = await readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), {
      formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    })
    for (const r of results) {
      const code = normalizeBarcode(r.text)
      if (code) return code
    }
    return null
  }
}

/** Mensaje en castellano para un error de `getUserMedia`. */
export function cameraErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Permiso de cámara denegado. Actívalo en los ajustes del navegador o de iOS (Ajustes > Safari > Cámara) o escribe el código a mano.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'No se ha encontrado ninguna cámara. Escribe el código a mano.'
  if (name === 'NotReadableError')
    return 'La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.'
  return 'No se ha podido abrir la cámara. Escribe el código a mano.'
}
