const TYPES = {
  csv: 'text/csv;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  feature: 'text/plain;charset=utf-8',
}

export function downloadText(filename: string, text: string) {
  const ext = filename.split('.').pop() as keyof typeof TYPES
  const url = URL.createObjectURL(new Blob([text], { type: TYPES[ext] ?? 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
