import { useEffect, useState } from 'react'

/**
 * 初回に load で読み込み、値が変わるたびに save で端末内に保存する。
 * 戻り値の 3 番目は直近の保存が失敗したかどうか。
 */
export function usePersistentState<T>(
  load: () => T,
  save: (value: T) => boolean,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(load)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    setSaveFailed(!save(value))
  }, [value, save])

  return [value, setValue, saveFailed]
}
