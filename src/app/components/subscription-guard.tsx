"use client";

import { useEffect, useState } from "react";
import { useCoachAuth } from "@/app/hooks/use-coach-auth";
import { getFirebaseFirestore } from "@/lib/firebase";
import { getUserAccount, getTrialDaysRemaining, type UserAccount } from "@/lib/firestore-user";
import Link from "next/link";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { authUser, authConfigured, signInWithGoogle } = useCoachAuth();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!authConfigured) {
      if (active) {
        Promise.resolve().then(() => {
          setLoading(false);
        });
      }
      return;
    }

    if (!authUser) {
      if (active) {
        Promise.resolve().then(() => {
          setAccount(null);
          setLoading(false);
        });
      }
      return;
    }

    const db = getFirebaseFirestore();
    if (!db) {
      if (active) {
        Promise.resolve().then(() => {
          setLoading(false);
        });
      }
      return;
    }

    getUserAccount(db, authUser.uid)
      .then((acc) => {
        if (active) {
          setAccount(acc);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error checking subscription user account:", err);
        if (active) {
          Promise.resolve().then(() => {
            setLoading(false);
          });
        }
      });

    return () => {
      active = false;
    };
  }, [authUser, authConfigured]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-[--accent]" />
          <p className="text-sm font-medium tracking-wide">Loading account details...</p>
        </div>
      </div>
    );
  }

  // REQUIRE Google login (remove guest mode)
  if (!authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center shadow-2xl">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-[--accent]/10 p-3 text-[--accent]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Sign in required</h2>
            <p className="text-sm text-slate-400">
              Calm Daily Coach requires a secure, authenticated account to access your daily cycles and routines.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-[--accent] px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-[--accent-strong] shadow-lg hover:shadow-[--accent]/20"
            >
              <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.85h2.64c1.55-1.42 2.43-3.51 2.43-6.03z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.05c-.73.49-1.66.78-2.64.78-2.85 0-5.27-1.92-5.13-4.51H2.01v2.13C3.82 20.18 7.63 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.87 14.56c-.11-.33-.18-.68-.18-1.06s.07-.73.18-1.06V10.3H2.01c-.38.79-.61 1.67-.61 2.7s.23 1.91.61 2.7l3.87-2.14z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09(14.97 1 12 1 7.63 1 3.82 3.82 2.01 7.69l3.87 3.01c1.14-2.59 3.56-5.32 6.12-5.32z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysLeft = account ? getTrialDaysRemaining(account.createdAt) : 0;
  const isTrialFinished = daysLeft <= 0;
  const isSubscribed = account?.subscriptionStatus === "active";

  const isBlocked = isTrialFinished && !isSubscribed;

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-rose-900/30 bg-slate-950 p-8 text-center shadow-2xl">
          <div className="space-y-2">
            <span className="inline-block rounded-full bg-rose-500/10 p-3 text-rose-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Your Trial Has Ended</h2>
            <p className="text-sm text-slate-400">
              Your 30-day free trial has expired. To continue customizing targets, executing plans, and reviewing daily focus cycles, please subscribe.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 mt-4">
            <p className="text-[10px] font-bold text-[--accent] uppercase tracking-wider">Premium Access</p>
            <p className="text-3xl font-extrabold text-white mt-1">$5<span className="text-sm font-normal text-slate-400">/mo</span></p>
            <p className="text-xs text-slate-400 mt-2">Unlimited execution timelines, custom categories, analytics review, and secure cloud backups.</p>
          </div>

          <div className="mt-8 space-y-4">
            <Link
              href="/pricing"
              className="flex w-full items-center justify-center rounded-full bg-[--accent] px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-[--accent-strong] shadow-lg hover:shadow-[--accent]/20"
            >
              Subscribe for $5/month
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
