export default {
  mainMenu: {
    new: 'New Drawing',
    drawingUnits: 'Drawing Units',
    about: 'About'
  },
  ribbon: {
    tab: {
      home: 'Home',
      measurement: 'Measurement'
    },
    group: {
      draw: 'Draw',
      modify: 'Modify',
      utilities: 'Utilities',
      annotation: 'Annotation',
      measurement: 'Measurement',
      style: 'Style',
      lengthUnits: 'Length Units',
      angleUnits: 'Angle Units'
    },
    property: {
      color: 'Color'
    },
    arc: {
      threePoint: '3-Point',
      startCenterEnd: 'Start, Center, End',
      startCenterAngle: 'Start, Center, Angle',
      startCenterLength: 'Start, Center, Length',
      startEndAngle: 'Start, End, Angle',
      startEndDirection: 'Start, End, Direction',
      startEndRadius: 'Start, End, Radius',
      centerStartEnd: 'Center, Start, End',
      centerStartAngle: 'Center, Start, Angle',
      centerStartLength: 'Center, Start, Length'
    },
    circle: {
      centerRadius: 'Center, Radius',
      centerDiameter: 'Center, Diameter',
      twoPoint: '2-Point',
      threePoint: '3-Point',
      tanTanRadius: 'Tan, Tan, Radius',
      tanTanTan: 'Tan, Tan, Tan'
    },
    ellipse: {
      ellipse: 'Ellipse',
      arc: 'Elliptical Arc'
    },
    tooltip: {
      line: 'Draw a single straight line segment.',
      polyline:
        'Draw a connected series of line or arc segments as one object.',
      circle: 'Draw a circle with multiple construction methods.',
      arc: 'Draw an arc with multiple construction methods.',
      ellipse: 'Draw an ellipse or elliptical arc.',
      rect: 'Draw a rectangle or regular polygon.',
      point: 'Place a point object in the drawing.',
      text: 'Create multiline text annotations in the drawing.',
      move: 'Move selected objects to a new position.',
      rotate: 'Rotate selected objects around a base point.',
      copy: 'Copy selected objects to a new location.',
      erase: 'Delete selected objects from the drawing.',
      offset: 'Create a parallel copy of an object at a specified distance.',
      missingResources:
        'Open the Missing / External Resources palette for fonts, images, and xrefs.',
      drawingUnits:
        'Open Drawing Units to set coordinate formats, precision, and insertion scale.',
      circleOption: {
        centerRadius:
          'Create a circle by specifying a center point and a radius.',
        centerDiameter:
          'Create a circle by specifying a center point and a diameter.',
        twoPoint: 'Create a circle whose diameter is defined by two points.',
        threePoint: 'Create a circle that passes through three points.',
        tanTanRadius:
          'Create a circle tangent to two objects with a specified radius.',
        tanTanTan: 'Create a circle tangent to three objects.'
      },
      arcOption: {
        threePoint:
          'Create an arc that passes through a start point, a second point, and an end point.',
        startCenterEnd:
          'Create an arc by specifying a start point, center point, and end point.',
        startCenterAngle:
          'Create an arc using a start point, center point, and included angle.',
        startCenterLength:
          'Create an arc using a start point, center point, and arc length.',
        startEndAngle:
          'Create an arc from start and end points with an included angle.',
        startEndDirection:
          'Create an arc from start and end points with a tangent direction at the start point.',
        startEndRadius:
          'Create an arc from start and end points with a specified radius.',
        centerStartEnd:
          'Create an arc by specifying a center point, start point, and end point.',
        centerStartAngle:
          'Create an arc by specifying a center point, start point, and included angle.',
        centerStartLength:
          'Create an arc by specifying a center point, start point, and arc length.'
      },
      rectOption: {
        rectangle:
          'Create a rectangle by specifying opposite corners or dimensions.',
        polygon:
          'Create a regular polygon by specifying the number of sides and construction method.'
      },
      ellipseOption: {
        ellipse: 'Create a full ellipse by specifying major and minor axes.',
        arc: 'Create an elliptical arc by specifying ellipse axes and arc limits.'
      }
    },
    command: {
      line: 'Line',
      polyline: 'Polyline',
      circle: 'Circle',
      arc: 'Arc',
      ellipse: 'Ellipse',
      rect: 'Rect',
      rectangle: 'Rectangle',
      polygon: 'Polygon',
      point: 'Point',
      divide: 'Divide',
      text: 'Text',
      gradient: 'Gradient',
      move: 'Move',
      rotate: 'Rotate',
      copy: 'Copy',
      erase: 'Erase',
      offset: 'Offset',
      drawingUnits: 'Drawing\nUnits'
    }
  },
  verticalToolbar: {
    measure: {
      text: 'Measure',
      description: 'Measurement tools'
    },
    measureDistance: {
      text: 'Distance',
      description: 'Measures the distance between two points'
    },
    measureContinuous: {
      text: 'Continuous',
      description:
        'Measures chained distances by picking successive points until Enter or Cancel'
    },
    measureAngle: {
      text: 'Angle',
      description:
        'Measures the angle between two lines sharing a common vertex'
    },
    measureArea: {
      text: 'Area',
      description: 'Measures the area of a polygon'
    },
    measureArc: {
      text: 'Arc',
      description: 'Measures the length of an arc defined by three points'
    },
    measurePoint: {
      text: 'Point',
      description: 'Measures the X/Y coordinates of a picked point'
    },
    measurementPanel: {
      text: 'Panel',
      description: 'Open the measurement palette'
    },
    clearMeasurements: {
      text: 'Clear',
      description: 'Removes all measurements from the current layout'
    },
    measurementImport: {
      text: 'Import',
      description: 'Import measurements from a sidecar JSON file'
    },
    measurementExport: {
      text: 'Export',
      description: 'Export measurements to a sidecar JSON file'
    },
    pan: {
      text: 'Pan',
      description:
        'Shifts the view without changing the viewing direction or magnification'
    },
    measurementColor: {
      text: 'Color',
      description:
        'Set the color for the selected measurement, or for measurements you add next'
    },
    measurementFontSize: {
      text: 'Text height',
      description:
        'Open text height settings for the selected measurement, or for measurements you add next',
      fit: 'Fit',
      wcs: 'WCS'
    },
    showMeasurements: {
      text: 'Show',
      description: 'Shows measurements'
    },
    hideMeasurements: {
      text: 'Hide',
      description: 'Hides measurements'
    },
    select: {
      text: 'Select',
      description: 'Selects entities'
    },
    switchBg: {
      text: 'Switch',
      description: 'Switches the drawing background between white and black'
    },
    zoom: {
      text: 'Zoom',
      description: 'Zoom tools: saved view, extents, smart extents, and window'
    },
    zoomSaved: {
      text: 'Saved',
      description:
        'Restores AutoCAD saved view (VPORT / layout limits), or the open-time view'
    },
    zoomToExtent: {
      text: 'Extents',
      description: 'Zooms to display the maximum extents of all entities'
    },
    zoomSmartExtents: {
      text: 'Smart',
      description:
        'Zooms to the dominant geometry cluster, ignoring far outlier entities'
    },
    zoomToBox: {
      text: 'Window',
      description: 'Zooms to display an area specified by a rectangular window'
    }
  },
  statusBar: {
    setting: {
      tooltip: 'Display Settings',
      commandLine: 'Command Line',
      coordinate: 'Coordinate',
      entityInfo: 'Entity Info',
      ribbon: 'Ribbon',
      toolbar: 'Toolbar',
      stats: 'Statistics'
    },
    osnap: {
      tooltip: 'Object Snap',
      endpoint: 'Endpoint',
      midpoint: 'Midpoint',
      center: 'Center',
      node: 'Node',
      quadrant: 'Quadrant',
      intersection: 'Intersection',
      insertion: 'Insertion',
      nearest: 'Nearest'
    },
    pointStyle: {
      tooltip: 'Modify point style'
    },
    fullScreen: {
      on: 'Turn off full screen mode',
      off: 'Turn on full screen mode'
    },
    dynamicInput: {
      on: 'Turn off dynamic input',
      off: 'Turn on dynamic input'
    },
    lineWidth: {
      on: 'Hide line widths',
      off: 'Show line widths'
    },
    orthoMode: {
      on: 'Turn off ortho mode',
      off: 'Turn on ortho mode'
    },
    polarTracking: {
      on: 'Turn off polar tracking',
      off: 'Turn on polar tracking'
    },
    theme: {
      dark: 'Switch to light light',
      light: 'Switch to dark theme'
    },
    warning: {
      font: 'The following fonts are not found!'
    },
    notification: {
      tooltip: 'Show notifications'
    },
    export: {
      tooltip: 'Export image as PNG'
    }
  },
  toolPalette: {
    measurements: {
      tab: 'Measure',
      title: 'Measurements',
      empty: 'No measurements yet',
      type: 'Type',
      value: 'Value',
      filterAll: 'All',
      delete: 'Delete',
      clear: 'Clear all',
      typeValues: {
        distance: 'Distance',
        angle: 'Angle',
        area: 'Area',
        arc: 'Arc',
        point: 'XY'
      }
    },
    missingResources: {
      tab: 'Resources',
      title: 'Missing / External Resources',
      fontTab: 'Font',
      fileReferences: 'File References',
      details: 'Details',
      foundAt: 'Found at',
      selectReference: 'Select a reference to view details',
      expandDetails: 'Expand details',
      collapseDetails: 'Collapse details',
      apply: 'Apply',
      applyDone: 'Replacements applied',
      emptyFonts: 'No missing fonts',
      emptyImages: 'No missing images',
      matchFontType: 'Match font type (SHX / mesh)',
      missedFont: 'Missed Font',
      replacedFont: 'Replaced Font',
      selectFont: 'Select font to replace',
      selectLocalFont: 'Select local font file',
      file: 'File',
      name: 'Name',
      path: 'Saved path',
      type: 'Type',
      typeAttach: 'Attach',
      typeOverlay: 'Overlay',
      status: 'Status',
      statusMissing: 'Missing',
      statusLoaded: 'Loaded',
      actions: 'Actions',
      visible: 'Visible',
      browse: 'Browse…',
      fromUrl: 'URL…',
      unload: 'Unload',
      load: 'Load',
      empty: 'No external references or images in this drawing',
      urlRequired: 'Please enter a URL',
      loadFailed: 'Failed to load reference "{name}"'
    },
    memoryProfile: {
      tab: 'Memory',
      title: 'Memory Profile',
      refresh: 'Refresh',
      collecting: 'Analyzing memory ...',
      showPie: 'Show summary chart',
      hidePie: 'Hide summary chart',
      collectedAt: 'Collected at {time}',
      heapUsed: 'JS heap {used} / {total}',
      estimateNote:
        'Geometry sizes come from buffer byteLength. Other categories are estimated.',
      estimated: 'est.',
      pieTotal: 'Accounted',
      pieAriaLabel: 'Memory breakdown by category',
      empty: 'No data',
      missedFonts: 'Missed fonts',
      fontMemory: 'Font / mtext memory',
      fontMemorySummary: 'Memory {live} (main {main} · workers {workers})',
      fontStorage: 'IndexedDB storage (not memory)',
      fontStorageSummary: '{count} cached fonts · {size}',
      materialPoint: 'Point',
      materialLine: 'Line',
      materialFill: 'Fill',
      materialTotal: 'Total',
      categories: {
        heap: 'JS Heap',
        geometry: 'Geometry',
        mapping: 'Mapping',
        spatial: 'Spatial Index',
        materials: 'Materials',
        fonts: 'Fonts'
      },
      tabs: {
        geometry: 'Geometry',
        spatial: 'Spatial',
        materials: 'Materials',
        fonts: 'Fonts'
      },
      columns: {
        layout: 'Layout',
        layer: 'Layer',
        geometry: 'Geometry',
        mapping: 'Mapping',
        entities: 'Entities',
        rootItems: 'Root',
        childItems: 'Children',
        estimated: 'Est. size',
        type: 'Type',
        count: 'Count',
        category: 'Category',
        font: 'Font'
      }
    }
  },
  colorDropdown: {
    custom: 'Custom'
  },
  colorIndexPicker: {
    color: 'Color: ',
    colorIndex: 'Color Index: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  ribbonProperty: {
    color: 'Color',
    lineType: 'Linetype',
    lineWeight: 'Lineweight',
    layer: 'Layer'
  },
  message: {
    loadingFonts: 'Loading fonts ...',
    fontsNotFound: 'Fonts {fonts} can not be found in font repository!',
    fontsNotLoaded: 'Fonts {fonts} can not be loaded!',
    fontMissedInDrawing:
      'Font "{font}" is required by {count} text object(s) but is not available. Displaying with "{replacementFont}".',
    fontMissedReplacement: '"{font}" (displaying with "{replacement}")',
    fontCached: 'Font "{font}" cached successfully.',
    fontCacheFailed: 'Failed to cache font "{fileName}".',
    failedToGetAvaiableFonts: 'Failed to get avaiable fonts from "{url}"!',
    fetchingDrawingFile: 'Fetching file ...'
  },
  notification: {
    center: {
      title: 'Notifications',
      clearAll: 'Clear All',
      noNotifications: 'No notifications'
    },
    group: {
      fontMissed: 'Missing Fonts',
      fontMissedSummary:
        '{count} font-related messages. Click to expand details.',
      genericSummary: '{count} messages. Click to expand details.'
    },
    time: {
      justNow: 'Just now',
      minutesAgo: '{count} minute ago | {count} minutes ago',
      hoursAgo: '{count} hour ago | {count} hours ago',
      daysAgo: '{count} day ago | {count} days ago'
    },
    title: {
      fontNotFound: 'Font Not Found',
      fontNotLoaded: 'Font Not Loaded',
      systemMessage: 'System Message',
      systemWarning: 'System Warning',
      systemError: 'System Error',
      systemInfo: 'System Info'
    }
  }
}
