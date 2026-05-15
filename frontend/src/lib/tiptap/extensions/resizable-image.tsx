import Image from "@tiptap/extension-image";
import { NodeSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useRef } from "react";

const DEFAULT_WIDTH = 360;
const MIN_WIDTH = 120;
const MAX_WIDTH = 900;

const clampWidth = (value: number): number => {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
};

const ResizableImageNodeView = (props: NodeViewProps) => {
  const startWidthRef = useRef<number>(DEFAULT_WIDTH);
  const startClientXRef = useRef<number>(0);

  const imageWidth =
    typeof props.node.attrs.width === "number"
      ? props.node.attrs.width
      : DEFAULT_WIDTH;

  const executeSelectImage = useCallback(() => {
    const nodePosition = props.getPos();
    if (typeof nodePosition !== "number") return;
    const transaction = props.editor.state.tr.setSelection(
      NodeSelection.create(props.editor.state.doc, nodePosition),
    );
    props.editor.view.dispatch(transaction);
    props.editor.view.focus();
  }, [props]);

  const executeResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      executeSelectImage();
      startWidthRef.current = imageWidth;
      startClientXRef.current = event.clientX;
      const executeMouseMove = (moveEvent: MouseEvent) => {
        const nextWidth = clampWidth(
          startWidthRef.current + (moveEvent.clientX - startClientXRef.current),
        );
        props.updateAttributes({ width: nextWidth });
      };
      const executeMouseUp = () => {
        window.removeEventListener("mousemove", executeMouseMove);
        window.removeEventListener("mouseup", executeMouseUp);
      };
      window.addEventListener("mousemove", executeMouseMove);
      window.addEventListener("mouseup", executeMouseUp);
    },
    [executeSelectImage, imageWidth, props],
  );

  const isSelected = props.selected;

  return (
    <NodeViewWrapper
      as="div"
      className="relative my-3 inline-flex max-w-full"
      data-drag-handle
      contentEditable={false}
      onClick={executeSelectImage}
    >
      <img
        src={props.node.attrs.src as string}
        alt={(props.node.attrs.alt as string | undefined) ?? ""}
        title={(props.node.attrs.title as string | undefined) ?? ""}
        draggable={true}
        style={{ width: `${imageWidth}px`, maxWidth: "100%", height: "auto" }}
        className="rounded-md"
      />
      {isSelected ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-primary/70" />
          <button
            type="button"
            className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border border-primary bg-background"
            onMouseDown={executeResizeStart}
            aria-label="Resize image"
          />
        </>
      ) : null}
    </NodeViewWrapper>
  );
};

export const ResizableImageExtension = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: DEFAULT_WIDTH,
        parseHTML: (element: HTMLElement) => {
          const widthAttr = element.getAttribute("width");
          if (widthAttr) return clampWidth(Number(widthAttr));
          const inlineWidth = element.style.width;
          if (inlineWidth?.endsWith("px")) {
            return clampWidth(Number(inlineWidth.replace("px", "")));
          }
          return DEFAULT_WIDTH;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const widthValue = Number(attributes.width ?? DEFAULT_WIDTH);
          return {
            width: String(clampWidth(widthValue)),
            style: `width: ${clampWidth(widthValue)}px; max-width: 100%; height: auto;`,
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});
