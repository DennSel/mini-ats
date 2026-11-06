import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Shield, User as UserIcon } from "lucide-react";
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
  const { login } = useAts();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = (v: Values) => {
    const user = login(v.email, v.password);
    if (!user) {
      setError("Fel e-postadress eller lösenord.");
      return;
    }
    navigate({ to: homePathFor(user) });
  };

  const fill = (email: string, password: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", password, { shouldValidate: true });
    setError(null);
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
          <Button type="submit" variant="gradient" size="lg" className="w-full">
            <LogIn /> Logga in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="label-caps text-faint">Demo (endast mock)</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => fill("admin@kandsys.se", "admin123")}>
            <Shield className="text-primary" /> Admin
          </Button>
          <Button type="button" variant="outline" onClick={() => fill("anna@nordvik.se", "kund123")}>
            <UserIcon className="text-accent-3" /> Kund
          </Button>
        </div>
      </div>
    </div>
  );
}
