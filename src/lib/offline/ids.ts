/** ID generado en el cliente: permite crear filas dependientes sin red y reintentar sin duplicar. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const h = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, '0')
  return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}`
}

/** Variables de un guardado offline: el ID lo pone el cliente y `isNew` decide alta (idempotente) o edición. */
export type SaveVars<T> = T & { id: string; isNew: boolean }

export const withNewId = <T extends { id?: string }>(row: T): SaveVars<T> => ({
  ...row,
  id: row.id ?? newId(),
  isNew: !row.id,
})

/** La fila sin la marca `isNew`. */
export function rowOf<T extends { isNew: boolean }>(v: T): Omit<T, 'isNew'> {
  const copy: Partial<T> = { ...v }
  delete copy.isNew
  return copy as Omit<T, 'isNew'>
}
