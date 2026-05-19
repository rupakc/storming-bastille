import { Suspense } from "react";
import { LoginPage } from "@/components/auth/LoginPage";

export default function LoginRoute() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
