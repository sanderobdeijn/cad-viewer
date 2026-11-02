export default {
  mainMenu: {
    new: 'New Drawing',
    drawingUnits: 'Drawing Units',
    about: 'About'
  },
  ribbon: {
    tab: {
      home: 'Home',
      measurement: 'Measurement',
      mtextEditorContext: 'Text Editor'
    },
    mtext: {
      group: {
        textStyle: 'Text Style',
        format: 'Format',
        paragraph: 'Paragraph',
        insert: 'Insert',
        close: 'Close'
      },
      field: {
        textStyle: 'Text Style',
        font: 'Font',
        color: 'Color',
        height: 'Height',
        obliqueAngle: 'Oblique angle',
        tracking: 'Tracking',
        widthFactor: 'Width factor'
      },
      characterMap: {
        title: 'Character Map',
        font: 'Font(F):',
        charsToCopy: 'Characters to copy(A):',
        select: 'Select(S)',
        copy: 'Copy(C)',
        noGlyphs: 'No characters are available for this font.',
        copyFailed: 'Unable to copy to the clipboard.'
      },
      command: {
        bold: 'Bold',
        underline: 'Underline',
        superscript: 'Superscript',
        italic: 'Italic',
        overline: 'Overline',
        subscript: 'Subscript',
        strikethrough: 'Strikethrough',
        stack: 'Stack',
        toggleCase: 'Upper/Lower Case',
        attachment: 'Justify',
        list: 'Bullets and Numbering',
        lineSpacing: 'Line Spacing',
        paragraphAlignment: 'Paragraph Alignment',
        symbol: 'Symbol',
        close: 'Close'
      },
      tooltip: {
        textStyle: 'Choose a text style from the current drawing.',
        bold: 'Toggle bold formatting.',
        underline: 'Toggle underline formatting.',
        superscript: 'Toggle superscript formatting.',
        italic: 'Toggle italic formatting.',
        overline: 'Toggle overline formatting.',
        subscript: 'Toggle subscript formatting.',
        strikethrough: 'Toggle strikethrough formatting.',
        stack: 'Stack or unstack selected fraction text.',
        toggleCase: 'Toggle the selected text between upper and lower case.',
        font: 'Set the current text font.',
        color: 'Set the current text color.',
        height: 'Set the current text height. Custom values are allowed.',
        obliqueAngle:
          'Set the slant angle in degrees for selected characters (negative tilts the other way).',
        tracking:
          'Increase or decrease spacing between selected characters (1 is default).',
        widthFactor:
          'Stretch or compress selected characters horizontally (1 is default).',
        attachment: 'Set the multiline text attachment point.',
        list: 'Insert or configure bullets and numbering.',
        lineSpacing: 'Set line spacing.',
        paragraphAlignment: 'Set paragraph horizontal alignment.',
        symbol: 'Insert a common drafting symbol.',
        close: 'Close the text editor and this contextual tab.'
      },
      attachment: {
        TL: 'Top Left TL',
        TC: 'Top Center TC',
        TR: 'Top Right TR',
        ML: 'Middle Left ML',
        MC: 'Middle Center MC',
        MR: 'Middle Right MR',
        BL: 'Bottom Left BL',
        BC: 'Bottom Center BC',
        BR: 'Bottom Right BR'
      },
      list: {
        off: 'Off',
        number: 'Numbered',
        letter: 'Lettered',
        bullet: 'Bulleted',
        start: 'Start',
        continue: 'Continue',
        auto: 'Allow Auto Bullets and Numbering',
        allowList: 'Allow Bullets and Lists'
      },
      lineSpacing: {
        more: 'More...',
        clear: 'Clear Paragraph Spacing'
      },
      paragraphAlign: {
        default: 'Default',
        left: 'Left',
        center: 'Center',
        right: 'Right',
        justified: 'Justified',
        distributed: 'Distributed'
      },
      symbol: {
        degree: 'Degrees  %%d',
        plusMinus: 'Plus/Minus  %%p',
        diameter: 'Diameter  %%c',
        almostEqual: 'Almost Equal  \\U+2248',
        angle: 'Angle  \\U+2220',
        boundary: 'Boundary Line  \\U+E100',
        centerLine: 'Center Line  \\U+2104',
        delta: 'Delta  \\U+0394',
        electricalPhase: 'Electrical Phase  \\U+0278',
        flowLine: 'Flow Line  \\U+E101',
        identical: 'Identical To  \\U+2261',
        notEqual: 'Not Equal  \\U+2260',
        ohm: 'Ohm  \\U+2126',
        omega: 'Omega  \\U+03A9',
        propertyLine: 'Property Line  \\U+214A',
        subscriptTwo: 'Subscript 2  \\U+2082',
        squared: 'Squared  \\U+00B2',
        cubed: 'Cubed  \\U+00B3',
        nbsp: 'Nonbreaking Space Ctrl+Shift+Space',
        other: 'Other...'
      }
    },
    group: {
      draw: 'Draw',
      modify: 'Modify',
      properties: 'Properties',
      utilities: 'Utilities',
      annotation: 'Annotation',
      measurement: 'Measurement',
      style: 'Style',
      lengthUnits: 'Length Units',
      angleUnits: 'Angle Units'
    },
    property: {
      color: 'Color',
      lineType: 'Linetype',
      lineWeight: 'Lineweight'
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
      spline: 'Draw a smooth spline curve through fit or control points.',
      sketch: 'Create a series of freehand line segments.',
      circle: 'Draw a circle with multiple construction methods.',
      arc: 'Draw an arc with multiple construction methods.',
      mline: 'Draw multiple parallel lines as a single multiline object.',
      ray: 'Draw a semi-infinite construction ray from a start point.',
      xline: 'Draw an infinite construction line.',
      ellipse: 'Draw an ellipse or elliptical arc.',
      rect: 'Draw a rectangle or regular polygon.',
      point: 'Place a point object in the drawing.',
      text: 'Create multiline text annotations in the drawing.',
      move: 'Move selected objects to a new position.',
      rotate: 'Rotate selected objects around a base point.',
      copy: 'Copy selected objects to a new location.',
      erase: 'Delete selected objects from the drawing.',
      offset: 'Create a parallel copy of an object at a specified distance.',
      undo: 'Undo the last editing operation.',
      redo: 'Redo the last undone editing operation.',
      properties: 'Open the Properties palette for the current selection.',
      quickSelect:
        'Open Quick Select to filter and select entities by criteria.',
      find: 'Open the Find palette to search text in the whole drawing or the current layout.',
      countList: 'Open the Count palette to view and manage block counts.',
      missingResources:
        'Open the Missing / External Resources palette for fonts, images, and xrefs.',
      drawingUnits:
        'Open Drawing Units to set coordinate formats, precision, and insertion scale.',
      propertyColor:
        'Set the color for newly created objects or selected entities.',
      propertyLineType:
        'Set the line type for newly created objects or selected entities.',
      propertyLineWeight:
        'Set the line weight for newly created objects or selected entities.',
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
      mline: 'MLine',
      ray: 'Ray',
      xline: 'XLine',
      ellipse: 'Ellipse',
      spline: 'Spline',
      sketch: 'Sketch',
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
      undo: 'Undo',
      redo: 'Redo',
      properties: 'Properties',
      quickSelect: 'Quick\nSelect',
      find: 'Find',
      countList: 'Count',
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
      description: 'Switches the drawing background between white and black',
      disabledInReadingMode:
        'Unavailable while reading mode is on (white canvas is fixed)'
    },
    readingMode: {
      text: 'Reading',
      description:
        'Toggles reading mode: black linework on a white canvas for easier review'
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
    },
    moreLayouts: 'More layouts'
  },
  toolPalette: {
    entityProperties: {
      tab: 'Properties',
      title: 'Entity Properties',
      propertyPanel: {
        noEntitySelected: 'No entity selected!',
        multipleEntitySelected: '{count} entities selected',
        propValCopied: 'Property value copied',
        failedToCopyPropVal: 'Failed to copy property value!'
      }
    },
    find: {
      tab: 'Find',
      title: 'Find',
      placeholder: 'Find text',
      input: 'Search text',
      find: 'Find',
      matchCase: 'Match case',
      currentLayoutOnly: 'Current layout only',
      hint: 'Press Enter to search text, multiline text, attributes and the text in blocks, dimensions, leaders and tables in the whole drawing (all layouts).',
      hintLayout:
        'Press Enter to search text, multiline text, attributes and the text in blocks, dimensions, leaders and tables in the current layout.',
      noResults: 'No text found',
      count: '{count} found',
      countLayouts: '{count} found in {layouts} layouts',
      countTruncated: 'First {count} results shown — refine the search',
      noDocument: 'Open a drawing to search',
      layoutUnavailable: 'Could not open layout "{layout}"',
      unnamedLayout: '(unnamed layout)',
      kind: {
        text: 'Text',
        mtext: 'MText',
        attribute: 'Attribute',
        block: 'Block text',
        dimension: 'Dimension',
        leader: 'Leader',
        table: 'Table'
      }
    },
    countList: {
      tab: 'Count',
      title: 'Count',
      searchPlaceholder: 'Search block name',
      countInArea: 'Count in Area',
      areaSet: 'Count area updated',
      areaCleared: 'Counting entire model space',
      blockName: 'Block',
      count: 'Count',
      empty: 'No visible blocks found',
      prompt: {
        firstCorner: 'Specify first corner of count area or [Entire]: ',
        secondCorner: 'Specify opposite corner: '
      }
    },
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
      dataModelCounts: '{entities} entities · {objects} objects · {total}',
      dataModelCategories: 'By category',
      dataModelEntityTypes: 'By entity type',
      categories: {
        heap: 'JS Heap',
        geometry: 'Geometry',
        mapping: 'Mapping',
        spatial: 'Spatial Index',
        dataModel: 'Data Model',
        materials: 'Materials',
        fonts: 'Fonts'
      },
      tabs: {
        geometry: 'Geometry',
        spatial: 'Spatial',
        dataModel: 'Data Model',
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
  lineTypeSelect: {
    placeholder: 'Linetype'
  },
  colorIndexPicker: {
    color: 'Color: ',
    colorIndex: 'Color Index: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: 'Color',
    lineType: 'Linetype'
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
    fetchingDrawingFile: 'Fetching file ...',
    unknownEntities:
      'This drawing contains {count} unknown or unsupported entities! Those entities will not be shown.',
    tianzhengEntities:
      'This drawing contains TArch / Tianzheng (or similar third-party) custom entities (about {count}). They cannot be fully parsed in this environment, so some content may not display.',
    emptyProxyEntities:
      'This drawing contains {count} custom entities without proxy graphics! Those entities will not be shown.'
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
      unsupportedEntities: 'Unsupported Entities',
      unsupportedEntitiesSummary:
        '{count} parsing-related messages. Click to expand details.',
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
      parsingWarning: 'Issues on Parsing Drawing',
      systemMessage: 'System Message',
      systemWarning: 'System Warning',
      systemError: 'System Error',
      systemInfo: 'System Info'
    }
  }
}
