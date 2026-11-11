# @mlightcad/geometry-engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/geometry-engine.svg)](https://www.npmjs.com/package/@mlightcad/geometry-engine)

The geometry-engine package provides comprehensive geometric entities, mathematical operations, and transformations for 2D and 3D space. This package mimics AutoCAD ObjectARX's AcGe (Geometry) classes and provides the mathematical foundation for CAD operations.

## Overview

This package consists of two main categories of classes:

- **Math Classes**: Focus on mathematical operations that underpin geometric calculations, including vectors, matrices, transformations, and linear algebra operations
- **Geometry Classes**: Focus on complex geometric entities and their operations, including lines, curves, surfaces, and intersections

Most math classes are adapted from [THREE.js](https://threejs.org/docs/index.html) with modified class names to match AutoCAD ObjectARX conventions.

## Key Features

- **2D and 3D Geometry**: Support for both 2D and 3D geometric operations
- **Mathematical Foundation**: Comprehensive vector and matrix operations
- **Curve and Surface Support**: Advanced geometric entities
- **Transformation Utilities**: Matrix-based transformations for 2D and 3D space
- **Intersection Calculations**: Tools for computing geometric intersections
- **Performance Optimized**: Efficient mathematical operations for real-time CAD applications

## Installation

```bash
npm install @mlightcad/geometry-engine
```

## Key Classes

### Math Classes (2D and 3D)

#### Points and Vectors
- **GeometryPoint2d**: Represents a 2D point
- **GeometryVector2d**: Represents 2D vectors with magnitude and direction

#### Transformations
- **GeometryMatrix2d**: 2D transformation matrices

#### Mathematical Utilities
- **GeometryBox2d**: Bounding boxes in 2D space
- **GeometryTol**: Tolerance settings for geometric comparisons

### Geometry Classes

#### Basic Geometric Entities
- **GeometryLine2d**: Lines in the XY plane
- **GeometryCurve2d**: Abstract base class for curves
- **GeometryCircularArc2d**: Circular arcs
- **GeometryEllipseArc2d**: Elliptical arcs

#### Complex Geometric Entities
- **GeometryPolyline2d**: 2D polyline with multiple segments
- **GeometryShape2d**: Complex geometric shapes

#### Utility Classes
- **GeometryUtil**: Utility functions for geometric operations
- **GeometryMathUtil**: Mathematical utility functions
- **GeometryConstants**: Geometric constants and settings

## Usage Examples

### Basic Point and Vector Operations
```typescript
import { GeometryMatrix2d, GeometryPoint2d, GeometryVector2d } from '@mlightcad/geometry-engine';

// Create points and vectors
const point1 = new GeometryPoint2d(0, 0);
const point2 = new GeometryPoint2d(10, 10);
const vector = new GeometryVector2d(1, 0);

// Calculate distance between points
const distance = point1.distanceTo(point2);

// Transform a point
const matrix = new GeometryMatrix2d().makeTranslation(5, 5);
const transformedPoint = point1.clone().applyMatrix2d(matrix);
```

### Line and Curve Operations
```typescript
import { GeometryLine2d, GeometryCircularArc2d, GeometryPoint2d } from '@mlightcad/geometry-engine';

// Create a line
const startPoint = new GeometryPoint2d(0, 0);
const endPoint = new GeometryPoint2d(10, 0);
const line = new GeometryLine2d(startPoint, endPoint);

// Create a circular arc
const center = new GeometryPoint2d(0, 0);
const radius = 5;
const startAngle = 0;
const endAngle = Math.PI / 2;
const arc = new GeometryCircularArc2d(center, radius, startAngle, endAngle);

// Get points along the curve
const param = 0.5;
const pointOnLine = line.evalPoint(param);
const pointOnArc = arc.evalPoint(param);
```

### Matrix Transformations
```typescript
import { GeometryMatrix2d, GeometryPoint2d } from '@mlightcad/geometry-engine';

// Create transformation matrices
const translation = new GeometryMatrix2d().makeTranslation(10, 20);
const rotation = new GeometryMatrix2d().makeRotation(Math.PI / 4);
const scale = new GeometryMatrix2d().makeScale(2, 2);

// Combine transformations
const combined = translation.multiply(rotation).multiply(scale);

// Apply transformation to a point
const point = new GeometryPoint2d(1, 1);
const transformed = point.applyMatrix2d(combined);
```

### Polyline Operations
```typescript
import { GeometryPolyline2d, GeometryPoint2d } from '@mlightcad/geometry-engine';

// Create a polyline
const polyline = new GeometryPolyline2d();
polyline.addVertexAt(0, new GeometryPoint2d(0, 0));
polyline.addVertexAt(1, new GeometryPoint2d(10, 0));
polyline.addVertexAt(2, new GeometryPoint2d(10, 10));
polyline.addVertexAt(3, new GeometryPoint2d(0, 10));

// Close the polyline
polyline.setClosed(true);

// Get polyline properties
const length = polyline.length();
const area = polyline.area();
const isClosed = polyline.isClosed();
```

### Geometric Utilities
```typescript
import { GeometryLine2d, GeometryUtil, GeometryPoint2d } from '@mlightcad/geometry-engine';

// Calculate intersection between lines
const line1 = new GeometryLine2d(new GeometryPoint2d(0, 0), new GeometryPoint2d(1, 0));
const line2 = new GeometryLine2d(new GeometryPoint2d(0, 0), new GeometryPoint2d(0, 1));

const intersection = GeometryUtil.intersect(line1, line2);

// Check if points are collinear
const points = [
  new GeometryPoint2d(0, 0),
  new GeometryPoint2d(1, 1),
  new GeometryPoint2d(2, 2)
];

const areCollinear = GeometryUtil.areCollinear(points);
```

## Dependencies

- **@mlightcad/common**: For common utilities (peer dependency)

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines.