import DashboardPage from "@/pages/dashboard/page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
