import { NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import supertokens from 'supertokens-node';

initSuperTokens();

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        
        // Find user by email using listUsersByAccountInfo
        const users = await supertokens.listUsersByAccountInfo("public", { email });
        if (users.length === 0) {
            return NextResponse.json({ success: true, message: "If the email exists, a reset code has been sent." }, { status: 200 });
        }
        
        const user = users[0];
        
        // Create reset token
        const tokenResponse = await EmailPassword.createResetPasswordToken("public", user.id, email);
        if (tokenResponse.status !== "OK") {
            return NextResponse.json({ error: "Failed to generate reset token" }, { status: 400 });
        }
        
        // Log the token in server logs for local dev/open-source ease
        console.log(`[PASSWORD RESET] Token for user ${email} (ID: ${user.id}): ${tokenResponse.token}`);
        
        // Return the token in the API response so the local user can auto-reset
        return NextResponse.json({ success: true, token: tokenResponse.token }, { status: 200 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
