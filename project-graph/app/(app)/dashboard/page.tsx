import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  return (
    <main>
      <p>Dashboard Page</p>
    </main>
  );
}
