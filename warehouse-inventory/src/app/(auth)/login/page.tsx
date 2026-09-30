"use client";

import { useState } from "react";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-3">
            <Package className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Warehouse IMS</h1>
          <p className="text-sm text-gray-500 mt-1">Globe AT HOME Contractor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@warehouse.local"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-6">
          Internal system — authorized personnel only
        </p>
      </div>
    </div>
  );
}
