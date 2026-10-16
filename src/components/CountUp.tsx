import { useCountUp } from '../hooks/useCountUp.ts'

interface CountUpProps {
  value: number
  format?: (value: number) => string
}

/** A number that counts up to its value when it appears or changes. */
export default function CountUp({ value, format = String }: CountUpProps) {
  return <span>{format(useCountUp(value))}</span>
}
