import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WelcomeUserClient from "./WelcomeUserClient";

export default async function WelcomeUser() {
  // ✅ Check session on SERVER where it always works!
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("=== WELCOME-USER SERVER COMPONENT ===");
  console.log("Session found:", !!session);
  console.log("User ID:", session?.user?.id);

  if (!session?.user) {
    console.log("No session on server, redirecting to login");
    redirect("/login");
  }

  // Get user's full name from metadata
  const fullName =
    session.user.user_metadata?.full_name ||
    session.user.email?.split("@")[0] ||
    "User";

  const userRole = session.user.app_metadata?.role || "user";

  console.log("User authenticated:", {
    userId: session.user.id,
    email: session.user.email,
    fullName,
    userRole,
  });

  // Pass to client component for interactivity
  return (
    <WelcomeUserClient
      userName={fullName}
      userRole={userRole}
      userId={session.user.id}
    />
  );
}
