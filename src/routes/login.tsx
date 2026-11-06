import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/login/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Logga in – KandSys" },
      { name: "description", content: "Logga in till KandSys." },
      { property: "og:title", content: "Logga in – KandSys" },
      { property: "og:description", content: "Logga in till KandSys." },
    ],
  }),
  component: LoginPage,
});
