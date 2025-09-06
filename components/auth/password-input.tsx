"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

export function PasswordInput({ value, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const hasMinLength = value.length >= 8
  const hasLetter = /[a-zA-Z]/.test(value)
  const hasNumber = /[0-9]/.test(value)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <div className="space-y-1 text-xs">
        <PasswordRequirement label="At least 8 characters" met={hasMinLength} />
        <PasswordRequirement label="Contains a letter" met={hasLetter} />
        <PasswordRequirement label="Contains a number" met={hasNumber} />
      </div>
    </div>
  )
}

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={cn("flex items-center", met ? "text-green-500" : "text-gray-500")}>
      {met ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
      {label}
    </div>
  )
}
