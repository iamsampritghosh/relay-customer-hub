import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL missing"
      );
    }

    const response = await fetch(
      `${baseUrl}/api/sync/highlevel`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: true,
      synced: true,
      data,
    });
  } catch (err: any) {
    console.error(
      "cron sync failed:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}