"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "@/lib/auth-client" // This import is correct
import { LiveSessionUI } from "@/components/booking/LiveSessionUI"
import { SessionRating } from "@/components/booking/SessionRating"
import { CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Define the structure of the data we expect from our API
interface SessionData {
  id: string;
  mentorId: string;
  menteeId: string;
  mentor: { id: string; name: string; image: string | null };
  mentee: { id: string; name: string; image: string | null };
}

interface Reviewee {
  id: string;
  name: string;
  avatar?: string | null;
  role: 'mentor' | 'mentee';
}

type Stage = 'loading' | 'in-call' | 'rating' | 'success' | 'error';

export default function SessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  
  // --- THE FIX: Using the correct properties from your 'better-auth' hook ---
  const { data: authSession, isPending: isAuthLoading, error: authError } = useSession();

  const [stage, setStage] = useState<Stage>('loading');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [reviewee, setReviewee] = useState<Reviewee | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Media stream state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  useEffect(() => {
    // 1. Wait for auth to finish loading and for params to be available
    if (isAuthLoading || !params.id) {
      return;
    }

    // 2. Handle unauthenticated user or auth error
    if (!authSession || authError) {
      setError(authError?.message || "You must be logged in to view a session.");
      setStage('error');
      return;
    }

    const currentUser = authSession.user;

    const fetchAndPrepareSession = async () => {
      try {
        const response = await fetch(`/api/sessions/${params.id}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to load session data.");
        }
        const data: SessionData = await response.json();
        setSessionData(data);

        // *** CRITICAL LOGIC: Determine who is being reviewed ***
        if (currentUser.id === data.menteeId) {
          setReviewee({
            id: data.mentor.id,
            name: data.mentor.name,
            avatar: data.mentor.image,
            role: 'mentor',
          });
        } else if (currentUser.id === data.mentorId) {
          setReviewee({
            id: data.mentee.id,
            name: data.mentee.name,
            avatar: data.mentee.image,
            role: 'mentee',
          });
        } else {
          throw new Error("You are not a participant in this session.");
        }

        setStage('in-call');
      } catch (err: any) {
        setError(err.message);
        setStage('error');
      }
    };

    // Only run the fetch logic if the stage is still 'loading'
    if (stage === 'loading') {
        fetchAndPrepareSession();
    }
  }, [params.id, authSession, isAuthLoading, authError, stage]);

  // --- Camera and Cleanup Logic (no changes needed) ---
  const startCamera = async () => { /* ... */ };
  const stopCamera = () => { /* ... */ };
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);
  // ---

  const handleTimeUp = () => {
    setStage('rating');
  };

  const handleRatingComplete = () => {
    stopCamera();
    setStage('success');
    setTimeout(() => {
      router.push('/dashboard');
    }, 3000);
  };

  // --- Render Logic based on Stage ---
  // Use isAuthLoading for the initial page load indicator
  if (isAuthLoading) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center">
        <p className="text-white text-lg">Authenticating...</p>
      </div>
    );
  }

  if (stage === 'error' || !sessionData || !reviewee) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "An unknown error occurred."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-900">
      {stage === 'in-call' && (
        <LiveSessionUI
          mentorName={sessionData.mentor.name}
          mentorAvatar={sessionData.mentor.image ?? undefined}
          onTimeUp={handleTimeUp}
          isCameraOn={isCameraOn}
          mediaStream={mediaStream}
          startCamera={startCamera}
          stopCamera={stopCamera}
        />
      )}
      {(stage === 'rating' || stage === 'success') && (
        <div className="w-full h-full flex items-center justify-center p-4">
          {stage === 'rating' && (
            <SessionRating
              sessionId={params.id}
              reviewee={reviewee}
              onComplete={handleRatingComplete}
            />
          )}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center max-w-2xl w-full p-8 sm:p-12 bg-white dark:bg-gray-800 text-center rounded-2xl shadow-2xl">
              <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feedback Submitted!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">Thank you for helping us improve. You will be redirected shortly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}