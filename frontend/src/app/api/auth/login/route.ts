import { NextRequest, NextResponse } from 'next/server';
import { initSuperTokens } from '@/utils/supertokens';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import Session from 'supertokens-node/recipe/session';
import { PreParsedRequest, CollectingResponse } from 'supertokens-node/framework/custom';

initSuperTokens();

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();
        
        // Sign in user using SuperTokens EmailPassword recipe
        const loginResponse = await EmailPassword.signIn("public", email, password);
        
        if (loginResponse.status !== "OK") {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
        }
        
        // Construct pre-parsed request for SuperTokens compatibility
        const query = Object.fromEntries(request.nextUrl.searchParams.entries());
        const cookies = Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value]));
        
        const baseRequest = new PreParsedRequest({
            method: request.method.toLowerCase() as any,
            url: request.url,
            query: query,
            headers: request.headers,
            cookies: cookies,
            getFormBody: () => request.formData(),
            getJSONBody: async () => ({ email, password })
        });
        
        const baseResponse = new CollectingResponse();
        
        // Create session
        await Session.createNewSession(baseRequest, baseResponse, "public", loginResponse.recipeUserId);
        
        const response = NextResponse.json({ user: loginResponse.user }, { status: 200 });
        
        // Explicitly set cookies in NextResponse to guarantee browser saves them
        for (const respCookie of baseResponse.cookies) {
            response.cookies.set(respCookie.key, respCookie.value, {
                domain: respCookie.domain,
                expires: new Date(respCookie.expires),
                httpOnly: respCookie.httpOnly,
                path: respCookie.path,
                sameSite: respCookie.sameSite as any,
                secure: respCookie.secure,
            });
        }
        
        // Copy custom headers (like access tokens/expose headers)
        baseResponse.headers.forEach((val, key) => {
            response.headers.set(key, val);
        });
        
        return response;
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
