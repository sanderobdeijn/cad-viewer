# @mlightcad/data-model

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@mlightcad/data-model.svg)](https://www.npmjs.com/package/@mlightcad/data-model)

The data-model package provides the core classes for interacting with AutoCAD's database and entities. This package mimics AutoCAD ObjectARX's AcDb (Database) classes and implements the drawing database structure that AutoCAD developers are familiar with.

## Overview

This package contains the core classes for defining and manipulating AutoCAD entities (e.g., lines, circles, blocks), handling entity attributes and geometric data, and storing and retrieving data from the drawing database. It uses the same drawing database structure as AutoCAD ObjectARX, making it easier for AutoCAD developers to build applications based on this SDK.

## Key Features

- **Database Management**: Complete AutoCAD database structure with tables and records
- **Entity Support**: All major AutoCAD entity types (lines, circles, polylines, blocks, etc.)
- **Symbol Tables**: Layer, linetype, text style, and dimension style management
- **Block Management**: Block table and block reference handling
- **Dimension Support**: Comprehensive dimension entity types
- **Layout Management**: Paper space and model space layout handling

## Installation

```bash
npm install @mlightcad/data-model
```

## Key Classes

### Database and Base Classes
- **AcDbDatabase**: Main database class that contains all drawing data
- **AcDbObject**: Base class for all database-resident objects
- **AcDbHostApplicationServices**: Services provided by the host application

### Symbol Tables
- **AcDbSymbolTable**: Base class for symbol tables
- **AcDbSymbolTableRecord**: Base class for symbol table records
- **AcDbLayerTable, AcDbLayerTableRecord**: Layer management
- **AcDbLinetypeTable, AcDbLinetypeTableRecord**: Linetype management
- **AcDbTextStyleTable, AcDbTextStyleTableRecord**: Text style management
- **AcDbDimStyleTable, AcDbDimStyleTableRecord**: Dimension style management
- **AcDbBlockTable, AcDbBlockTableRecord**: Block management
- **AcDbViewportTable, AcDbViewportTableRecord**: Viewport management

### Entities
- **AcDbEntity**: Base class for all drawable objects
- **AcDbLine**: Line entity
- **AcDbCircle**: Circle entity
- **AcDbArc**: Arc entity
- **AcDbPolyline**: Polyline entity
- **AcDbText, AcDbMText**: Text and multiline text entities
- **AcDbBlockReference**: Block reference entity
- **AcDbPoint**: Point entity
- **AcDbEllipse**: Ellipse entity
- **AcDbSpline**: Spline curve entity
- **AcDbTable**: Table entity
- **AcDbLeader**: Leader entity
- **AcDbRay, AcDbXline**: Construction line entities
- **AcDbTrace**: Filled area entity

### Dimension Entities
- **AcDbDimension**: Base class for dimension entities
- **AcDbAlignedDimension**: Aligned dimension
- **AcDbRadialDimension**: Radial dimension
- **AcDbDiametricDimension**: Diametric dimension
- **AcDb3PointAngularDimension**: 3-point angular dimension
- **AcDbArcDimension**: Arc dimension
- **AcDbOrdinateDimension**: Ordinate dimension

### Objects and Layouts
- **AcDbDictionary**: Dictionary object for storing key-value pairs
- **AcDbLayout**: Layout object for paper space
- **AcDbLayoutDictionary**: Layout dictionary management
- **AcDbLayoutManager**: Layout manager for switching between layouts

### Utilities
- **AcDbConstants**: Database constants
- **AcDbObjectIterator**: Iterator for database objects
- **AcDbAngleUnits**: Angle unit utilities
- **AcDbUnitsValue**: Unit value handling
- **AcDbOsnapMode**: Object snap modes
- **AcDbRenderingCache**: Rendering cache management

## Usage Examples

### Database Operations
```typescript
import { AcDbDatabase } from '@mlightcad/data-model';

// Create a new database
const database = new AcDbDatabase();

// Get symbol tables
const layerTable = database.getLayerTable();
const blockTable = database.getBlockTable();
const linetypeTable = database.getLinetypeTable();
```

### Entity Creation
```typescript
import { AcDbLine, AcDbCircle, AcGePoint2d } from '@mlightcad/data-model';

// Create a line entity
const startPoint = new AcGePoint2d(0, 0);
const endPoint = new AcGePoint2d(10, 10);
const line = new AcDbLine(startPoint, endPoint);

// Create a circle entity
const center = new AcGePoint2d(0, 0);
const radius = 5;
const circle = new AcDbCircle(center, radius);

// Set entity properties
line.setColor(1); // Red
line.setLayer('0');
circle.setLinetype('CONTINUOUS');
```

### Layer Management
```typescript
import { AcDbLayerTableRecord } from '@mlightcad/data-model';

// Create a new layer
const layerRecord = new AcDbLayerTableRecord();
layerRecord.setName('MyLayer');
layerRecord.setColor(2); // Yellow
layerRecord.setLinetype('DASHED');

// Add layer to database
const layerTable = database.getLayerTable();
layerTable.add(layerRecord);
```

### Block Operations
```typescript
import { AcDbBlockReference, AcGePoint2d } from '@mlightcad/data-model';

// Create a block reference
const insertionPoint = new AcGePoint2d(0, 0);
const blockRef = new AcDbBlockReference(insertionPoint, 'MyBlock');

// Set block properties
blockRef.setScale(2.0);
blockRef.setRotation(Math.PI / 4);

// Add to model space
const modelSpace = database.getModelSpace();
modelSpace.appendEntity(blockRef);
```

### Font Loading

Fonts referenced by text entities are loaded on demand by the mtext renderer when a
font is first needed. Viewers such as `@mlightcad/cad-simple-viewer` typically resolve
font metadata from [mlightcad/cad-data](https://github.com/mlightcad/cad-data)
(default CDN: `https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/`).

To self-host fonts and templates (directory layout, `fonts.json`, CORS, and `baseUrl`
configuration), see the
[Self Hosted Fonts and Templates](https://github.com/mlightcad/cad-viewer/wiki/Self-Hosted-Fonts-and-Templates)
guide in the cad-viewer wiki.

### Dimension Creation
```typescript
import { AcDbAlignedDimension, AcGePoint2d } from '@mlightcad/data-model';

// Create an aligned dimension
const defPoint1 = new AcGePoint2d(0, 0);
const defPoint2 = new AcGePoint2d(10, 0);
const textPosition = new AcGePoint2d(5, 5);

const dimension = new AcDbAlignedDimension(defPoint1, defPoint2, textPosition);
dimension.setDimensionText('10.0');
dimension.setDimensionStyle('Standard');
```

### Layout Management
```typescript
import { AcDbLayoutManager } from '@mlightcad/data-model';

// Get layout manager
const layoutManager = database.getLayoutManager();

// Get current layout
const currentLayout = layoutManager.getCurrentLayout();

// Switch to model space
layoutManager.setCurrentLayout('Model');

// Create a new layout
const newLayout = layoutManager.createLayout('MyLayout');
newLayout.setPlotType('Extents');
newLayout.setPlotCentered(true);
```

## Dependencies

- **@mlightcad/common**: For common utilities (peer dependency)
- **@mlightcad/geometry-engine**: For geometric operations (peer dependency)
- **@mlightcad/graphic-interface**: For graphics interface (peer dependency)
- **iconv-lite**: For text encoding conversion
- **uid**: For unique ID generation

## API Documentation

For detailed API documentation, visit the [RealDWG-Web documentation](https://mlight-lee.github.io/realdwg-web/).

## Contributing

This package is part of the RealDWG-Web monorepo. Please refer to the main project README for contribution guidelines. 