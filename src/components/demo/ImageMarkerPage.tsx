import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageViewer from "@/components/demo/ImageViewer";
import ImageMarkerForm from "@/components/demo/ImageMarkerForm";

// Define the marker type
export interface Marker {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ocrText?: string;
}

export default function ImageMarkerPage() {
  // Store multiple markers
  const [markers, setMarkers] = useState<Marker[]>([]);

  // Current selection that might become a marker
  const [selection, setSelection] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  // Currently selected marker (for editing)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Handle selection change from the ImageViewer component
  const handleSelectionChange = (selection: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    isNewSelection?: boolean;
  }) => {
    setSelection(selection);
    // Only clear selected marker when making a new selection with Alt key
    if (selection.visible && selection.isNewSelection) {
      setSelectedMarkerId(null);
    }
  };

  // Add a new marker
  const handleAddMarker = (marker: Omit<Marker, "id">) => {
    const newMarker = {
      ...marker,
      id: `marker-${Date.now()}`,
    };
    setMarkers((prev) => [...prev, newMarker]);
    return newMarker.id;
  };

  // Update an existing marker
  const handleUpdateMarker = (id: string, markerData: Partial<Marker>) => {
    setMarkers((prev) =>
      prev.map((marker) =>
        marker.id === id ? { ...marker, ...markerData } : marker
      )
    );
  };

  // Handle marker position change
  const handleMarkerMove = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    handleUpdateMarker(id, { x, y, width, height });
  };

  // Delete a marker
  const handleDeleteMarker = (id: string) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
    if (selectedMarkerId === id) {
      setSelectedMarkerId(null);
    }
  };

  // Get the currently selected marker
  const selectedMarker = selectedMarkerId
    ? markers.find((m) => m.id === selectedMarkerId) || null
    : null;

  console.log(selectedMarkerId, selectedMarker);

  return (
    <div className="flex flex-col md:flex-row gap-6  p-6 w-full">
      {/* Left column - Image and Konva (2/3 width) */}
      <Card className="flex-[2] gap-0 h-[800px]">
        <CardHeader className="pb-2">
          <CardTitle>Image Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageViewer
            selection={selection}
            onSelectionChange={handleSelectionChange}
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onMarkerSelect={setSelectedMarkerId}
            onMarkerMove={handleMarkerMove}
          />
        </CardContent>
      </Card>

      {/* Right column - Form (1/3 width) */}
      <ImageMarkerForm
        selection={selection}
        markers={markers}
        selectedMarker={selectedMarker}
        selectedMarkerId={selectedMarkerId}
        onSelectMarker={setSelectedMarkerId}
        onAddMarker={handleAddMarker}
        onUpdateMarker={handleUpdateMarker}
        onDeleteMarker={handleDeleteMarker}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
