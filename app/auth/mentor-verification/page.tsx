"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Mail } from "lucide-react";
import Link from "next/link";

export default function MentorVerificationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Application Submitted!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Thank you for your interest in becoming a mentor
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                Your mentor application is currently being reviewed by our team. 
                This process typically takes 2-3 business days.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">What happens next?</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  Our team will review your application and background
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  We may reach out for additional information if needed
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  You&apos;ll receive an email notification with our decision
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  Once approved, you&apos;ll get access to your mentor dashboard
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Check your email
                </span>
              </div>
              <p className="text-sm text-blue-800">
                We&apos;ve sent a confirmation email with your application details.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <Link href="/dashboard?section=profile">
            <Button className="w-full">
              Complete Profile
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return to Homepage
            </Button>
          </Link>
          
          <p className="text-xs text-gray-500">
            Questions? Contact us at{" "}
            <a href="mailto:support@youngminds.com" className="text-blue-600 hover:underline">
              support@youngminds.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 
