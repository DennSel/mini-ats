import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, ShieldCheck, UserCheck } from "lucide-react";
import { signIn } from "@/lib/auth";
import { useAts } from "@/lib/ats-store";
import { homePathFor } from "@/lib/ats-logic";
import { Button } from "@/components/ui/button";
import { AmbientBackground, FieldError, Logo, inputClass, labelClass } from "@/components/shared";

const schema = z.object({
  email: z.string().min(1, "Ange e-postadress").email("Ogiltig e-postadress"),
  password: z.string().min(1, "Ange lösenord"),
});
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { refreshUser, startDemoSession, demoLoginEnabled, setDemoLoginEnabled } = useAts();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get("demo");
    if (demoParam === "1" || demoParam === "true") {
      setDemoLoginEnabled(true);
    } else if (demoParam === "0" || demoParam === "false") {
      setDemoLoginEnabled(false);
    }
  }, [setDemoLoginEnabled]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (v: Values) => {
    setError(null);
    const { error: signInError } = await signIn(v.email.trim(), v.password);
    if (signInError) {
      setError("Fel e-postadress eller lösenord.");
      return;
    }
    const user = await refreshUser();
    if (!user) {
      setError("Ingen profil hittades för kontot.");
      return;
    }
    navigate({ to: homePathFor(user) });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <AmbientBackground />
      <div className="w-full max-w-[400px] rounded-2xl gradient-border p-7 shadow-2xl sm:p-8">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-center text-2xl font-bold tracking-tight">Logga in</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={labelClass}>
              E-postadress
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="namn@foretag.se"
              className={inputClass}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Lösenord
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${inputClass} pr-10`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Dölj lösenord" : "Visa lösenord"}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-faint hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError message={errors.password?.message} />
          </div>
          {error && (
            <div className="rounded-xl border border-error/30 bg-error-bg px-3 py-2 text-[12px] font-medium text-error">
              {error}
            </div>
          )}
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            <LogIn /> Logga in
          </Button>
        </form>

        {demoLoginEnabled && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-surface px-2 text-faint font-medium">Eller prova direkt</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-center gap-2 text-[13px]"
                onClick={() => {
                  startDemoSession("owner");
                  navigate({ to: "/board" });
                }}
              >
                <UserCheck className="h-4 w-4 text-accent-3 shrink-0" />
                <span>Demo: Rekryterare</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-center gap-2 text-[13px]"
                onClick={() => {
                  startDemoSession("admin");
                  navigate({ to: "/admin" });
                }}
              >
                <ShieldCheck className="h-4 w-4 text-accent-3 shrink-0" />
                <span>Demo: Admin</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
