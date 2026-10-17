import React from 'react';
import { Line, Rect, Circle, Text, Group } from 'react-konva';
import { CanvasElement } from '../../types';

interface ShapeRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  isSelectTool: boolean;
  onSelect: (id: string, e: any) => void;
  onChange: (id: string, newProps: Record<string, any>) => void;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = React.memo(
  ({ element, isSelected, isSelectTool, onSelect, onChange }) => {
    const { id, type, props } = element;

    const handleDragEnd = (e: any) => {
      const node = e.target;
      if (type === 'circle') {
        onChange(id, {
          x: Math.round(node.x()),
          y: Math.round(node.y())
        });
      } else {
        onChange(id, {
          x: Math.round(node.x()),
          y: Math.round(node.y())
        });
      }
    };

    const handleClick = (e: any) => {
      if (isSelectTool) {
        e.cancelBubble = true;
        onSelect(id, e);
      }
    };

    switch (type) {
      case 'stroke': {
        const points = (props.points as number[]) || [];
        if (points.length < 2) return null;

        return (
          <Line
            id={id}
            points={points}
            stroke={props.stroke || '#6366f1'}
            strokeWidth={props.strokeWidth || 3}
            tension={0.4}
            lineCap="round"
            lineJoin="round"
            listening={isSelectTool}
            onClick={handleClick}
            onTap={handleClick}
            shadowColor="#111110"
            shadowBlur={isSelected ? 6 : 0}
            shadowOpacity={isSelected ? 0.4 : 0}
          />
        );
      }

      case 'rect': {
        const x = Number(props.x || 0);
        const y = Number(props.y || 0);
        const width = Number(props.width || 100);
        const height = Number(props.height || 100);
        const fill = props.fill || 'transparent';
        const stroke = props.stroke || '#111110';
        const strokeWidth = Number(props.strokeWidth || 2);
        const cornerRadius = Number(props.cornerRadius || 8);

        return (
          <Rect
            id={id}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill === 'transparent' ? 'rgba(0,0,0,0.01)' : fill}
            stroke={isSelected ? '#111110' : stroke}
            strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
            cornerRadius={cornerRadius}
            draggable={isSelectTool && isSelected}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
            shadowColor="#111110"
            shadowBlur={isSelected ? 8 : 2}
            shadowOpacity={isSelected ? 0.35 : 0.08}
          />
        );
      }

      case 'circle': {
        const x = Number(props.x || 0);
        const y = Number(props.y || 0);
        const radius = Math.max(2, Number(props.radius || 40));
        const fill = props.fill || 'transparent';
        const stroke = props.stroke || '#111110';
        const strokeWidth = Number(props.strokeWidth || 2);

        return (
          <Circle
            id={id}
            x={x}
            y={y}
            radius={radius}
            fill={fill === 'transparent' ? 'rgba(0,0,0,0.01)' : fill}
            stroke={isSelected ? '#111110' : stroke}
            strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
            draggable={isSelectTool && isSelected}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
            shadowColor="#111110"
            shadowBlur={isSelected ? 8 : 2}
            shadowOpacity={isSelected ? 0.35 : 0.08}
          />
        );
      }

      case 'text': {
        const x = Number(props.x || 0);
        const y = Number(props.y || 0);
        const text = String(props.text || 'Double click to edit');
        const fontSize = Number(props.fontSize || 20);
        const fontFamily = props.fontFamily || 'Geist';
        const fill = props.fill || '#111110';

        return (
          <Text
            id={id}
            x={x}
            y={y}
            text={text}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fill={isSelected ? '#111110' : fill}
            draggable={isSelectTool && isSelected}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onTap={handleClick}
            shadowColor="#111110"
            shadowBlur={isSelected ? 6 : 0}
            shadowOpacity={isSelected ? 0.35 : 0}
          />
        );
      }

      default:
        return null;
    }
  },
  (prev, next) => {
    // Custom memo equality comparator for extreme rendering performance
    return (
      prev.isSelected === next.isSelected &&
      prev.isSelectTool === next.isSelectTool &&
      prev.element.updatedAt === next.element.updatedAt &&
      JSON.stringify(prev.element.props) === JSON.stringify(next.element.props)
    );
  }
);

export default ShapeRenderer;
