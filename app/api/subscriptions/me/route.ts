import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlanFeatures, getUserSubscription } from "@/lib/subscriptions/enforcement";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;
    const { searchParams } = new URL(request.url);
    const audienceParam = searchParams.get('audience');
    const audience =
      audienceParam === 'mentor' || audienceParam === 'mentee' ? audienceParam : null;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (audienceParam && !audience) {
      return NextResponse.json(
        { success: false, message: "Invalid audience. Use 'mentor' or 'mentee'." },
        { status: 400 }
      );
    }

    let subscription = null;
    let features = [];
    const subscriptionContext = audience ? { audience, actorRole: audience } : undefined;

    try {
      subscription = await getUserSubscription(userId, subscriptionContext);
      features = await getPlanFeatures(userId, subscriptionContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('audience context is required')) {
        return NextResponse.json(
          {
            success: false,
            message: 'Multiple active subscriptions found. Please provide audience=mentor|mentee.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          subscription: null,
          features: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        features,
      },
    });
  } catch (error) {
    console.error("Failed to load subscription:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load subscription" },
      { status: 500 }
    );
  }
}
