// app/page.tsx

"use client";

import { signIn } from "next-auth/react";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-6">
      <h1 className="text-4xl font-bold">UCG Social Scheduler</h1>
      <p className="text-gray-600">Login to begin scheduling posts</p>

      <button
        onClick={() => signIn("google")}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg"
      >
        Sign in with Google
      </button>

      <button
        onClick={() => signIn("facebook")}
        className="px-6 py-3 bg-gray-800 text-white rounded-lg"
      >
        Sign in with Facebook
      </button>
    </main>
  );
}
