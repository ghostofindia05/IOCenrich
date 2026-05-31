import { NextRequest, NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import Session from 'supertokens-node/recipe/session';
import supertokens from 'supertokens-node';
import { withSession } from "supertokens-node/nextjs";

initSuperTokens();

export async function GET(request: NextRequest) {
    return withSession(request, async (err, session) => {
        if (err) {
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
        
        if (!session) {
            return NextResponse.json({ session: null }, { status: 200 });
        }
        
        try {
            // Fetch user info to get the email address
            const userId = session.getUserId();
            const userInfo = await supertokens.getUser(userId);
            const email = userInfo?.emails[0] || "";
            
            return NextResponse.json({
                session: {
                    access_token: session.getAccessToken(),
                    user: {
                        id: userId,
                        email: email,
                    }
                }
            }, { status: 200 });
        } catch (innerErr: any) {
            return NextResponse.json({ error: innerErr.message }, { status: 500 });
        }
    }, { sessionRequired: false });
}
