import { NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import EmailPassword from 'supertokens-node/recipe/emailpassword';

initSuperTokens();

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();
        
        // Reset password using the token
        const resetResponse = await EmailPassword.resetPasswordUsingToken("public", token, password);
        if (resetResponse.status !== "OK") {
            return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
