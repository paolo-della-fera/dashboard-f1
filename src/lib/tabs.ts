/**
 * Index of the tab to move to for a key pressed in a tab list (ARIA tabs
 * pattern): arrows wrap around, Home and End jump to the ends. `null` for any
 * other key.
 */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count
    case 'ArrowLeft':
      return (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
