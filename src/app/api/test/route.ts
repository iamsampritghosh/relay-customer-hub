import { NextResponse } from "next/server";

import { db } from "@/db";

export async function GET() {
  const locations =
    await db.query.locations.findMany();

  return NextResponse.json(locations);
}