import { google } from "googleapis";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function getGmailClient(cookieStore: ReadonlyRequestCookies) {
  try {
    const accessToken = cookieStore.get("gmail_access_token")?.value;
    const refreshToken = cookieStore.get("gmail_refresh_token")?.value;

    if (!accessToken) {
      return null;
    }

    // Set initial credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Try to refresh the token if it's expired
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        // Update the access token in cookies
        cookieStore.set("gmail_access_token", credentials.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
        oauth2Client.setCredentials(credentials);
      }
    } catch (refreshError) {
      console.error("Error refreshing token:", refreshError);
      // If refresh fails, we'll try with the original token
    }

    return google.gmail({ version: "v1", auth: oauth2Client });
  } catch (error) {
    console.error("Error getting Gmail client:", error);
    return null;
  }
} 