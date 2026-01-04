import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactSubmissions } from '@/lib/db/schema';
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json();
    const { isResolved } = body;

    if (typeof isResolved !== "boolean") {
      return new NextResponse("Invalid body: 'isResolved' must be a boolean", { 
        status: 400 
      });
    }

    const [updatedEnquiry] = await db
      .update(contactSubmissions)
      .set({ 
        isResolved,
      })
      .where(eq(contactSubmissions.id, id))
      .returning();

    if (!updatedEnquiry) {
      return new NextResponse("Enquiry not found", { status: 404 });
    }

    return NextResponse.json(updatedEnquiry);

  } catch (error) {
    console.error("[ENQUIRY_PATCH]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}