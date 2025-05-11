import { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import Konva from "konva";
import type { Marker } from "./ImageMarkerPage";
import { Input } from "../ui/input";

interface ImageViewerProps {
  selection?: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  };
  onSelectionChange?: (selection: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    isNewSelection?: boolean;
  }) => void;
  markers?: Marker[];
  selectedMarkerId?: string | null;
  onMarkerSelect?: (id: string | null) => void;
  onMarkerMove?: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
}

export default function ImageViewer(props: ImageViewerProps) {
  const {
    selection: selectionProp,
    onSelectionChange,
    markers = [],
    selectedMarkerId = null,
    onMarkerSelect,
    onMarkerMove,
  } = props;

  // Image and canvas state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSelection, setImageSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  const stageRef = useRef<Konva.Stage | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const selectionRef = useRef<Konva.Rect | null>(null);
  const markerRefs = useRef<Map<string, Konva.Rect>>(new Map());

  // Synchronize internal imageSelection state with selectionProp
  useEffect(() => {
    if (selectionProp) {
      // Only update if there's an actual change in values to avoid unnecessary re-renders/loops
      if (
        selectionProp.x !== imageSelection.x ||
        selectionProp.y !== imageSelection.y ||
        selectionProp.width !== imageSelection.width ||
        selectionProp.height !== imageSelection.height ||
        selectionProp.visible !== imageSelection.visible
      ) {
        setImageSelection({
          x: selectionProp.x,
          y: selectionProp.y,
          width: selectionProp.width,
          height: selectionProp.height,
          visible: selectionProp.visible,
        });
      }
    } else if (imageSelection.visible) {
      // If selectionProp is not provided (e.g. undefined) and internal selection is visible, hide internal selection
      setImageSelection((prev) => ({ ...prev, visible: false }));
    }
  }, [selectionProp]); // Only depend on selectionProp

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setStageSize({
          width: clientWidth,
          height: clientHeight || 500,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result as string;
      img.onload = () => {
        // Set image and size state, preserving original quality
        setImage(img);
        setImageSize({
          width: img.width,
          height: img.height,
        });

        // Center the image in the container
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;

          setPosition({
            x: (containerWidth - img.width) / 2,
            y: (containerHeight - img.height) / 2,
          });
        }

        // Reset zoom
        setScale(1);
      };
    };
    reader.readAsDataURL(file);
  };

  // Convert stage point to image coordinates
  const stageToImageCoords = (stageX: number, stageY: number) => {
    return {
      x: (stageX - position.x) / scale,
      y: (stageY - position.y) / scale,
    };
  };

  // Handle mouse down on stage
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!image) return;

    // 如果点击的是标记元素或选区，不处理事件
    if (e.target.className === "Rect") {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    // Allow dragging with space + left mouse button
    if (spacePressed && e.evt.button === 0) {
      setIsDragging(true);
      document.body.style.cursor = "grabbing";
      return;
    }

    // Only draw selection when Alt key is pressed with left mouse button
    if (!e.evt.altKey || e.evt.button !== 0) return;

    const pointerPos = stage.getRelativePointerPosition();
    if (!pointerPos) return;

    // Convert to image coordinates
    const imageCoords = stageToImageCoords(pointerPos.x, pointerPos.y);

    setIsDrawing(true);
    setStartPoint(imageCoords);

    // Clear any existing selection and notify parent this is a new selection
    const newSelection = {
      x: imageCoords.x,
      y: imageCoords.y,
      width: 0,
      height: 0,
      visible: true,
    };
    setImageSelection(newSelection);

    if (onSelectionChange) {
      onSelectionChange({
        ...newSelection,
        isNewSelection: true,
      });
    }
  };

  // Handle mouse move on stage
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // 如果有标记正在拖拽中，不处理移动事件
    if (e.target.className === "Rect") {
      return;
    }

    // Handle image dragging (panning)
    if (isDragging && image) {
      e.evt.preventDefault();
      const dx = e.evt.movementX;
      const dy = e.evt.movementY;
      setPosition((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      return;
    }

    // Handle selection drawing (only when Alt is pressed)
    if (!isDrawing || !image || !e.evt.altKey) return;

    const pointerPos = stage.getRelativePointerPosition();
    if (!pointerPos) return;

    // Convert to image coordinates
    const imageCoords = stageToImageCoords(pointerPos.x, pointerPos.y);

    const newSelection = {
      x: Math.min(startPoint.x, imageCoords.x),
      y: Math.min(startPoint.y, imageCoords.y),
      width: Math.abs(imageCoords.x - startPoint.x),
      height: Math.abs(imageCoords.y - startPoint.y),
      visible: true,
    };

    setImageSelection(newSelection);
    if (onSelectionChange) {
      onSelectionChange({
        ...newSelection,
        isNewSelection: true,
      });
    }
  };

  // Handle mouse up on stage
  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // 如果释放鼠标的是标记元素，不处理事件
    if (e.target.className === "Rect") {
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = "default";
      return;
    }

    if (!isDrawing || !image) return;

    setIsDrawing(false);
  };

  // Handle wheel event for zooming
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    // Only handle zooming when Ctrl key is pressed
    if (!e.evt.ctrlKey) return;

    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage || !image) return;

    const oldScale = scale;

    // Calculate new scale
    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;

    // Limit scale to reasonable bounds
    const boundedScale = Math.max(0.1, Math.min(5, newScale));

    setScale(boundedScale);
  };

  // Handle click on a marker
  const handleMarkerClick = (id: string) => {
    // Clear current selection when selecting a marker
    const newSelection = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: false,
    };

    setImageSelection(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }

    // Select the marker
    if (onMarkerSelect) {
      // If clicking the already selected marker, deselect it
      if (selectedMarkerId === id) {
        onMarkerSelect(null);
      } else {
        onMarkerSelect(id);
      }
    }
  };

  // Handle marker drag start
  const handleMarkerDragStart = (
    e: Konva.KonvaEventObject<DragEvent>,
    markerId: string
  ) => {
    // 检查是否按下了Ctrl键
    if (!e.evt.ctrlKey) {
      // 如果没有按Ctrl键，取消拖动
      e.target.stopDrag();
      return;
    }

    // Prevent stage from handling this event
    e.cancelBubble = true;

    // Ensure this marker is selected
    if (onMarkerSelect && selectedMarkerId !== markerId) {
      onMarkerSelect(markerId);
    }

    // Change cursor to grabbing
    document.body.style.cursor = "grabbing";

    // Add visual effects to show the marker is being dragged
    const shape = e.target as Konva.Rect;
    shape.strokeWidth(3);
    shape.opacity(0.8);
  };

  // Handle marker drag move
  const handleMarkerDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Prevent stage from handling this event
    e.cancelBubble = true;

    // Update transformer position
    if (transformerRef.current) {
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  // Handle drag end - update marker position
  const handleMarkerDragEnd = (
    e: Konva.KonvaEventObject<DragEvent>,
    markerId: string
  ) => {
    // Prevent stage from handling this event
    e.cancelBubble = true;

    // Reset cursor
    document.body.style.cursor = "default";

    // Reset visual effects
    const shape = e.target as Konva.Rect;
    shape.strokeWidth(2);
    shape.opacity(1);

    if (!onMarkerMove) return;

    // Get the new position in image coordinates
    const x = (shape.x() - position.x) / scale;
    const y = (shape.y() - position.y) / scale;
    const width = shape.width() / scale;
    const height = shape.height() / scale;

    // Update the marker position
    onMarkerMove(markerId, x, y, width, height);

    // Update transformer position
    if (transformerRef.current) {
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  // 处理当前选区拖动开始
  const handleSelectionDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    // 检查是否按下了Ctrl键
    if (!e.evt.ctrlKey) {
      // 如果没有按Ctrl键，取消拖动
      e.target.stopDrag();
      return;
    }

    // 阻止事件冒泡
    e.cancelBubble = true;

    // 更改光标样式
    document.body.style.cursor = "grabbing";

    // 设置视觉效果
    const shape = e.target as Konva.Rect;
    shape.dash([2, 4]); // 更改虚线样式
    shape.opacity(0.8);
  };

  // 处理当前选区拖动移动
  const handleSelectionDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // 阻止事件冒泡
    e.cancelBubble = true;

    // Update transformer position
    if (transformerRef.current) {
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  // 处理当前选区拖动结束
  const handleSelectionDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    // 阻止事件冒泡
    e.cancelBubble = true;

    // 恢复光标样式
    document.body.style.cursor = "default";

    // 恢复视觉效果
    const shape = e.target as Konva.Rect;
    shape.dash([4, 4]); // 恢复原来的虚线样式
    shape.opacity(1);

    // 获取新位置（图像坐标系）
    const x = (shape.x() - position.x) / scale;
    const y = (shape.y() - position.y) / scale;

    // 更新选区位置
    if (onSelectionChange) {
      onSelectionChange({
        x: x,
        y: y,
        width: imageSelection.width,
        height: imageSelection.height,
        visible: true,
      });
    }

    // 直接更新本地状态，确保视觉上的一致性
    setImageSelection({
      x: x,
      y: y,
      width: imageSelection.width,
      height: imageSelection.height,
      visible: true,
    });

    // Update transformer position
    if (transformerRef.current) {
      transformerRef.current.getLayer()?.batchDraw();
    }
  };

  // 添加键盘事件监听，处理Space键和Alt键的状态
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space键按下时更改光标
      if (e.key === " " || e.code === "Space") {
        setSpacePressed(true);
        document.body.style.cursor = "grab";
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space键松开时恢复光标
      if (e.key === " " || e.code === "Space") {
        setSpacePressed(false);
        document.body.style.cursor = "default";
        // 如果正在拖动，停止拖动
        if (isDragging) {
          setIsDragging(false);
        }
      }

      // 如果Alt键松开且正在绘制，取消绘制
      if (
        (e.key === "Alt" || e.code === "AltLeft" || e.code === "AltRight") &&
        isDrawing
      ) {
        setIsDrawing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDragging, isDrawing]);

  // Add effect to attach/detach transformer
  useEffect(() => {
    if (!transformerRef.current) return;

    const updateTransformer = () => {
      // If there's a selected marker, attach transformer to it
      if (selectedMarkerId) {
        const selectedNode = markerRefs.current.get(selectedMarkerId);
        if (selectedNode) {
          transformerRef.current?.nodes([selectedNode]);
        }
      }
      // If selection is visible, attach transformer to it
      else if (imageSelection.visible && selectionRef.current) {
        transformerRef.current?.nodes([selectionRef.current]);
      }
      // If nothing is selected, clear transformer
      else {
        transformerRef.current?.nodes([]);
      }
    };

    updateTransformer();

    // Only redraw if we have a layer
    const layer = transformerRef.current.getLayer();
    if (layer) {
      layer.batchDraw();
    }
  }, [selectedMarkerId, imageSelection.visible]);

  // Handle transform end for markers
  const handleMarkerTransformEnd = (
    e: Konva.KonvaEventObject<Event>,
    markerId: string
  ) => {
    if (!onMarkerMove || !transformerRef.current) return;

    const node = e.target as Konva.Rect;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and apply it to width/height
    node.scaleX(1);
    node.scaleY(1);

    // Calculate new dimensions and position in image coordinates
    const x = (node.x() - position.x) / scale;
    const y = (node.y() - position.y) / scale;
    const width = (node.width() * scaleX) / scale;
    const height = (node.height() * scaleY) / scale;

    // Update marker position and size
    onMarkerMove(markerId, x, y, width, height);
  };

  // Handle transform end for selection
  const handleSelectionTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    if (!onSelectionChange || !transformerRef.current) return;

    const node = e.target as Konva.Rect;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and apply it to width/height
    node.scaleX(1);
    node.scaleY(1);

    // Calculate new dimensions and position in image coordinates
    const x = (node.x() - position.x) / scale;
    const y = (node.y() - position.y) / scale;
    const width = (node.width() * scaleX) / scale;
    const height = (node.height() * scaleY) / scale;

    // Update selection
    const newSelection = {
      x,
      y,
      width,
      height,
      visible: true,
    };

    setImageSelection(newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <div className="w-full h-[700px] flex flex-col">
      <div className="text-xs text-gray-500 ">
        <p>• 按住 Alt 键并拖动鼠标来在图片上创建选区矩形（会清除当前选区）</p>
        <p>• 按住 Ctrl 并点击选区或标记可拖动移动它们</p>
        <p>• 按住 Ctrl 并使用鼠标滚轮来放大/缩小</p>
        <p>• 按住 Space + 鼠标左键来平移图片</p>
        <p>• 点击标记来选择它（会清除当前选区）</p>
        <p>• 选中标记或选区后可以拖动边框或角点来调整大小</p>
      </div>
      <div className="my-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full"
        />
      </div>

      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden flex-grow"
        style={{ background: "#f9f9f9" }}
      >
        {!image && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Upload an image to begin marking</p>
          </div>
        )}

        {image && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className="mx-auto"
            draggable={false}
          >
            <Layer>
              {/* Use position and scale for pan/zoom */}
              <KonvaImage
                ref={imageRef}
                image={image}
                width={imageSize.width}
                height={imageSize.height}
                x={position.x}
                y={position.y}
                scaleX={scale}
                scaleY={scale}
              />

              {/* Current selection */}
              {imageSelection.visible && (
                <Rect
                  ref={selectionRef}
                  x={position.x + imageSelection.x * scale}
                  y={position.y + imageSelection.y * scale}
                  width={imageSelection.width * scale}
                  height={imageSelection.height * scale}
                  stroke="#00F"
                  strokeWidth={2}
                  dash={[4, 4]}
                  fill="rgba(0, 0, 255, 0.1)"
                  draggable={true}
                  onDragStart={handleSelectionDragStart}
                  onDragMove={handleSelectionDragMove}
                  onDragEnd={handleSelectionDragEnd}
                  onTransformEnd={handleSelectionTransformEnd}
                  listening={true}
                />
              )}

              {/* Saved markers */}
              {markers.map((marker) => (
                <Rect
                  key={marker.id}
                  ref={(node) => {
                    if (node) {
                      markerRefs.current.set(marker.id, node);
                    } else {
                      markerRefs.current.delete(marker.id);
                    }
                  }}
                  name="marker"
                  x={position.x + marker.x * scale}
                  y={position.y + marker.y * scale}
                  width={marker.width * scale}
                  height={marker.height * scale}
                  stroke={selectedMarkerId === marker.id ? "#F00" : "#0A0"}
                  strokeWidth={2}
                  fill={
                    selectedMarkerId === marker.id
                      ? "rgba(255, 0, 0, 0.1)"
                      : "rgba(0, 160, 0, 0.1)"
                  }
                  onClick={() => handleMarkerClick(marker.id)}
                  onTap={() => handleMarkerClick(marker.id)}
                  draggable={true}
                  onDragStart={(e) => handleMarkerDragStart(e, marker.id)}
                  onDragMove={(e) => handleMarkerDragMove(e)}
                  onDragEnd={(e) => handleMarkerDragEnd(e, marker.id)}
                  onTransformEnd={(e) => handleMarkerTransformEnd(e, marker.id)}
                  listening={true}
                />
              ))}

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  // Ensure minimum size
                  const minSize = 5 * scale;
                  if (newBox.width < minSize || newBox.height < minSize) {
                    return oldBox;
                  }
                  return newBox;
                }}
                rotateEnabled={false}
                keepRatio={false}
              />
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}
