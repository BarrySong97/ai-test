import DashboardLayout from "@/pages/dashboard/layout";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => (
    <>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
      <TanStackRouterDevtools />
    </>
  ),
});
