import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface SignaturePadProps {
  width?: number;
  height?: number;
  penColor?: string;
}

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string | null;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  width = 400,
  height = 200,
  penColor = 'black',
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getContext = () => canvasRef.current?.getContext('2d');

  useEffect(() => {
    const context = getContext();
    if (context) {
      context.strokeStyle = penColor;
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    }
  }, [penColor]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = getCoords(nativeEvent);
    const context = getContext();
    if (context) {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoords(nativeEvent);
    const context = getContext();
    if (context) {
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const stopDrawing = () => {
    const context = getContext();
    if (context) {
      context.closePath();
      setIsDrawing(false);
    }
  };
  
  const getCoords = (event: MouseEvent | TouchEvent) => {
    if (event instanceof MouseEvent) {
      return { offsetX: event.offsetX, offsetY: event.offsetY };
    }
    if (event.touches && event.touches.length > 0) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top,
      };
    }
    return { offsetX: 0, offsetY: 0 };
  };

  const clear = () => {
    const context = getContext();
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const getSignature = () => {
    if (canvasRef.current) {
      const context = getContext();
      if(context){
        const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data.buffer);
        const isEmpty = !pixelBuffer.some(color => color !== 0);
        if (isEmpty) return null;
      }
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    clear,
    getSignature,
  }));

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-slate-500 rounded-md touch-none bg-white"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
});