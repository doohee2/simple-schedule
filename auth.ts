import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

async function refreshAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error("Missing refreshToken");
    }

    const url = "https://oauth2.googleapis.com/token";
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: body.toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    const { error, ...tokenWithoutError } = token;

    return {
      ...tokenWithoutError,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, 
    }
  } catch (error: any) {
    if (error?.error === "invalid_grant" || error?.message === "Missing refreshToken") {
      console.error("[Auth] Fatal refresh token error (invalid_grant or missing):", error);
      return {
        ...token,
        error: "RefreshAccessTokenError",
      }
    }
    
    console.warn("[Auth] Transient refresh token failure (will retry on next request):", error);
    return token;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 180 * 24 * 60 * 60, // 180 days
    updateAge: 24 * 60 * 60,    // 24 hours
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          expiresAt: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
        }
      }

      // Return previous token if the access token has not expired yet (with 60s buffer)
      // @ts-ignore
      if (Date.now() < token.expiresAt - 60_000) {
        return token
      }

      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken as string
      // @ts-ignore
      session.error = token.error as string | undefined
      return session
    }
  }
})
