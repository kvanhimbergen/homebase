import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthCallback } from "@/components/auth/AuthCallback";
import { AcceptInvitePage } from "@/components/household/AcceptInvitePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginForm /> },
  { path: "/signup", element: <SignupForm /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/invite/:token", element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            lazy: () => import("@/components/dashboard/DashboardPage"),
          },
          {
            path: "/transactions",
            lazy: () => import("@/components/transactions/TransactionsPage"),
          },
          {
            path: "/accounts",
            lazy: () => import("@/components/accounts/AccountsPage"),
          },
          {
            path: "/budgets",
            lazy: () => import("@/components/budgets/BudgetsPage"),
          },
          {
            path: "/reports",
            lazy: () => import("@/components/reports/ReportsPage"),
          },
          {
            path: "/documents",
            lazy: () => import("@/components/documents/DocumentsPage"),
          },
          {
            path: "/settings",
            lazy: () => import("@/components/settings/SettingsPage"),
          },
        ],
      },
    ],
  },
]);
