import { createFileRoute } from "@tanstack/react-router";
import ImageMarkerPage from "@/components/demo/ImageMarkerPage";

export const Route = createFileRoute("/demo/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ImageMarkerPage />;
}
