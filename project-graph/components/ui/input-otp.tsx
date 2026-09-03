"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const DIGITS = /\d/g

function InputOTP({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const inputs = React.useRef<(HTMLInputElement | null)[]>([])

  const focusAt = (index: number) => {
    const input = inputs.current[Math.max(0, Math.min(length - 1, index))]
    input?.focus()
    input?.select()
  }

  // Keep `value` authoritative: pad it out so every box maps to one character.
  const chars = value.padEnd(length, " ").slice(0, length).split("")

  const commit = (next: string) => {
    onChange(next)
  }

  const setCharAt = (index: number, char: string) => {
    const next = chars
      .map((c, i) => (i === index ? char : c))
      .join("")
      .trimEnd()
    commit(next)
  }

  const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value.match(DIGITS)?.join("") ?? ""
    if (!typed) return

    // Typing (or autofilling) more than one digit spills into the boxes to the right.
    const next = (
      chars.slice(0, index).join("") + typed + chars.slice(index + typed.length).join("")
    )
      .slice(0, length)
      .trimEnd()

    commit(next)
    focusAt(index + typed.length)
  }

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (chars[index].trim()) {
        setCharAt(index, " ")
      } else if (index > 0) {
        setCharAt(index - 1, " ")
        focusAt(index - 1)
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focusAt(index - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").match(DIGITS)?.join("").slice(0, length)
    if (!pasted) return
    e.preventDefault()
    commit(pasted)
    focusAt(pasted.length)
  }

  return (
    <div
      data-slot="input-otp"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el
          }}
          data-slot="input-otp-slot"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // maxLength is the full length so a browser autofill can drop the whole code in.
          maxLength={length}
          value={char.trim()}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 w-10 rounded-lg border border-input bg-transparent text-center text-lg font-medium tabular-nums transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80"
        />
      ))}
    </div>
  )
}

export { InputOTP }
