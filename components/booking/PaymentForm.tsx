"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Lock } from "lucide-react"

export function PaymentForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <div className="relative">
            <Input id="cardNumber" placeholder="0000 0000 0000 0000" />
            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input id="expiryDate" placeholder="MM / YY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvc">CVC</Label>
            <Input id="cvc" placeholder="123" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nameOnCard">Name on Card</Label>
          <Input id="nameOnCard" placeholder="John Doe" />
        </div>
        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 pt-2">
          <Lock className="h-3 w-3 mr-1.5" />
          Secure payment powered by Stripe
        </div>
      </CardContent>
    </Card>
  )
}
