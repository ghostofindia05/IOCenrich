import { NextRequest, NextResponse } from "next/server";
import { initSuperTokens } from "@/utils/supertokens";
import { getAppDirRequestHandler } from "supertokens-node/nextjs";

initSuperTokens();

const handler = getAppDirRequestHandler(NextResponse);

export async function GET(request: NextRequest) {
    return handler(request);
}

export async function POST(request: NextRequest) {
    return handler(request);
}

export async function DELETE(request: NextRequest) {
    return handler(request);
}

export async function PUT(request: NextRequest) {
    return handler(request);
}
