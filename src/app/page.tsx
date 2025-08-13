import { CitrusIcon } from "lucide-react";
import { signIn } from "@/auth";
import { GoogleIcon } from "@/components/icons/google";
import { LemonSqueezyIcon } from "@/components/icons/lemonsqueezy";
import { SubmitButton } from "@/components/submit-button";

export default function Home() {
  return (
    <div className="grid min-h-lvh auto-rows-[1fr_auto] grid-cols-1 items-center justify-center gap-10 lg:auto-rows-auto lg:grid-cols-2">
      <main className="container w-full max-w-xl space-y-8 py-24 text-center lg:text-start">
        <div className="border-surface-100 shadow-wg-xs inline-flex size-20 items-center justify-center rounded-3xl border text-primary backdrop-blur-sm">
          <CitrusIcon size={32} strokeWidth={1.5} />
        </div>

        <h1 className="text-surface-900 text-balance text-3xl lg:text-4xl">
          Sign in to Shorts
        </h1>

        <p className="text-surface-500 text-balance text-lg">
          Lemon Stand is a Next.js billing app template powered by Lemon
          Squeezy.
        </p>

        <form
          className="pt-2"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <SubmitButton
            before={<GoogleIcon />}
            className="rounded-full py-2.5 text-base"
          >
            Sign in with Google
          </SubmitButton>
        </form>
      </main>

      <aside className="text-surface-900 relative isolate flex size-full flex-col items-center justify-center gap-10 overflow-hidden p-3 lg:p-6">
        <div className="lg:bg-surface-100/70 flex size-full flex-col items-center justify-center gap-10 rounded-xl p-8 pt-10">
          <a
            className="mt-auto text-black"
            href="https://www.lemonsqueezy.com"
            rel="noreferrer noopener"
            target="_blank"
          >
            <LemonSqueezyIcon className="h-6 lg:h-8" />
          </a>

          <footer className="text-surface-400 mt-auto flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href="https://github.com/lmsqueezy/nextjs-billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-surface-400 hover:text-surface-600 hover:underline"
            >
              View on GitHub ↗
            </a>

            <span>&bull;</span>

            <a
              href="https://docs.lemonsqueezy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-surface-400 hover:text-surface-600 hover:underline"
            >
              Lemon Squeezy Docs ↗
            </a>
          </footer>
        </div>
      </aside>
    </div>
  );
}
