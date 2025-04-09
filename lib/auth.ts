import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.email === "user@example.com" && credentials?.password === "password") {
          return {
            id: "0",
            email: "user@example.com",
            name: "John Doe",
          };
        }
        if (credentials?.email === process.env.USER_1_EMAIL && credentials?.password === process.env.USER_1_PASSWORD) {
          return {
            id: "1",
            email: process.env.USER_1_EMAIL,
            name: process.env.USER_1_NAME,
            image: "/profile/user-1-avatar.png",
          };
        }
        if (credentials?.email === process.env.USER_2_EMAIL && credentials?.password === process.env.USER_2_PASSWORD) {
          return {
            id: "2",
            email: process.env.USER_2_EMAIL,
            name: process.env.USER_2_NAME,
            image: "/profile/user-2-avatar.jpeg",
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
};
