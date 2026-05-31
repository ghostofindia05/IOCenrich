import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import EmailPassword from "supertokens-node/recipe/emailpassword";

export function initSuperTokens() {
    try {
        supertokens.init({
            framework: "custom",
            supertokens: {
                // Connect to the SuperTokens public demo server for testing/development
                connectionURI: "https://try.supertokens.com",
            },
            appInfo: {
                appName: "IOCenrich",
                apiDomain: "http://localhost:3000",
                websiteDomain: "http://localhost:3000",
                apiBasePath: "/api/auth",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({
                    getTokenTransferMethod: () => "cookie",
                }),
            ],
        });
    } catch (err: any) {
        // Already initialized or setup error
    }
}
