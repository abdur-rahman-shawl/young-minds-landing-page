import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlanFeatures, getUserSubscription } from "@/lib/subscriptions/enforcement";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let subscription = null;
    let features = [];

    try {
      subscription = await getUserSubscription(userId);
      features = await getPlanFeatures(userId);
    } catch (error) {
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
