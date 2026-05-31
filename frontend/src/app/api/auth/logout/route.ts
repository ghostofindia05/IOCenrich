import { NextRequest, NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import Session from 'supertokens-node/recipe/session';
import { withSession } from "supertokens-node/nextjs";

initSuperTokens();

export async function POST(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        
        const response = NextResponse.json({ success: true }, { status: 200 });
        if (session !== undefined) {
            await session.revokeSession();
        }
        
        return response;
    }, { sessionRequired: false });
}
