import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import type { Marker } from "./ImageMarkerPage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ListIcon, Trash2Icon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define form schema with Zod
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  selectionX: z.number().min(0),
  selectionY: z.number().min(0),
  selectionWidth: z.number().min(0),
  selectionHeight: z.number().min(0),
  ocrTextDisplay: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

interface ImageMarkerFormProps {
  selection: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  };
  markers: Marker[];
  selectedMarker: Marker | null;
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onAddMarker: (marker: Omit<Marker, "id">) => string;
  onUpdateMarker: (id: string, markerData: Partial<Marker>) => void;
  onDeleteMarker: (id: string) => void;
  onSelectionChange?: (selection: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }) => void;
}

export default function ImageMarkerForm({
  selection,
  markers,
  selectedMarker,
  selectedMarkerId,
  onSelectMarker,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onSelectionChange,
}: ImageMarkerFormProps) {
  // Form setup with react-hook-form and zod
  const { control, setValue, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      selectionX: 0,
      selectionY: 0,
      selectionWidth: 0,
      selectionHeight: 0,
      ocrTextDisplay: "",
    },
  });

  // Update form when selection changes
  useEffect(() => {
    if (selection.visible && !selectedMarkerId) {
      // This is a new selection, not an existing marker being edited
      setValue("name", ""); // Reset the name field for a new selection
      setValue("selectionX", selection.x);
      setValue("selectionY", selection.y);
      setValue("selectionWidth", selection.width);
      setValue("selectionHeight", selection.height);

      // Mock OCR result (in a real app, this would be from an API call)
      if (selection.width > 5 && selection.height > 5) {
        setValue("ocrTextDisplay", "Sample OCR text from selected area");
      } else {
        setValue("ocrTextDisplay", ""); // Clear OCR if selection is too small
      }
    }
  }, [selection, setValue, selectedMarkerId]);

  // Update form when a marker is selected
  useEffect(() => {
    if (selectedMarker) {
      reset({
        name: selectedMarker.name,
        selectionX: selectedMarker.x,
        selectionY: selectedMarker.y,
        selectionWidth: selectedMarker.width,
        selectionHeight: selectedMarker.height,
        ocrTextDisplay: selectedMarker.ocrText || "",
      });
    }
  }, [selectedMarker, reset]);

  // Clear form when selection is cleared
  useEffect(() => {
    if (!selection.visible && !selectedMarkerId) {
      reset({
        name: "",
        selectionX: 0,
        selectionY: 0,
        selectionWidth: 0,
        selectionHeight: 0,
        ocrTextDisplay: "",
      });
    }
  }, [selection, reset, selectedMarkerId]);

  const onSubmit = (data: FormValues) => {
    if (selectedMarkerId) {
      // Update existing marker
      onUpdateMarker(selectedMarkerId, {
        name: data.name,
        x: data.selectionX,
        y: data.selectionY,
        width: data.selectionWidth,
        height: data.selectionHeight,
        ocrText: data.ocrTextDisplay,
      });
      // Keep the marker selected after updating
      onSelectMarker(selectedMarkerId);
    } else if (selection.visible) {
      // Create new marker
      const newMarkerId = onAddMarker({
        name: data.name,
        x: data.selectionX,
        y: data.selectionY,
        width: data.selectionWidth,
        height: data.selectionHeight,
        ocrText: data.ocrTextDisplay,
      });

      // Select the newly created marker
      onSelectMarker(newMarkerId);
    }

    // Clear selection after saving
    if (onSelectionChange) {
      onSelectionChange({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
      });
    }
  };

  const handleDeleteMarker = () => {
    if (selectedMarkerId) {
      onDeleteMarker(selectedMarkerId);
    }
  };

  const hasValidSelection = selection.visible || selectedMarkerId !== null;

  return (
    <Card className="flex-[1]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>{selectedMarkerId ? "Edit Marker" : "New Marker"}</CardTitle>

        {markers.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Marker Directory">
                <ListIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="font-medium px-4 py-2 border-b">
                Markers List ({markers.length})
              </div>
              <ScrollArea className="h-[200px]">
                <div className="py-2">
                  {markers.map((marker) => (
                    <div
                      key={marker.id}
                      className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted ${
                        selectedMarkerId === marker.id ? "bg-muted" : ""
                      }`}
                      onClick={() => onSelectMarker(marker.id)}
                    >
                      <div className="truncate flex-1">
                        <div className="font-medium">
                          {marker.name || "Unnamed"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(marker.width)} x{" "}
                          {Math.round(marker.height)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>
      <CardContent>
        {!hasValidSelection ? (
          <div className="flex items-center justify-center py-6 text-center text-muted-foreground">
            <p>Hold Ctrl and drag on the image to create a selection</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Marker Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="name"
                      placeholder="Enter marker name"
                      {...field}
                      className={fieldState.error ? "border-red-500" : ""}
                    />
                    {fieldState.error && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="selectionX">X Position</Label>
                <Controller
                  name="selectionX"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="selectionX"
                      {...field}
                      value={field.value}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="selectionY">Y Position</Label>
                <Controller
                  name="selectionY"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="selectionY"
                      {...field}
                      value={field.value}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="selectionWidth">Width</Label>
                <Controller
                  name="selectionWidth"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="selectionWidth"
                      {...field}
                      value={field.value}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="selectionHeight">Height</Label>
                <Controller
                  name="selectionHeight"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="selectionHeight"
                      {...field}
                      value={field.value}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ocrTextDisplay">OCR Text Result</Label>
              <Controller
                name="ocrTextDisplay"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="ocrTextDisplay"
                    {...field}
                    className="min-h-24"
                    placeholder="OCR text will appear here after selection"
                  />
                )}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {selectedMarkerId ? "Update Marker" : "Save Marker"}
              </Button>

              {selectedMarkerId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleDeleteMarker}
                  title="Delete marker"
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
