export default {
  arc: {
    startPointOrCenter: 'Specify start point of arc or',
    secondPointOrOptions: 'Specify second point of arc or',
    secondPoint: 'Specify second point of arc',
    startPoint: 'Specify start point of arc',
    centerPoint: 'Specify center point of arc',
    endPoint: 'Specify end point of arc',
    endPointOrOptions: 'Specify end point of arc or',
    centerPointOrOptions: 'Specify center point of arc',
    includedAngle: 'Specify included angle',
    chordLength: 'Specify chord length',
    tangentDirection: 'Specify tangent direction for start point of arc',
    radius: 'Specify radius of arc',
    keywords: {
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      end: {
        display: 'End(E)',
        local: 'End',
        global: 'End'
      },
      angle: {
        display: 'Angle(A)',
        local: 'Angle',
        global: 'Angle'
      },
      chordLength: {
        display: 'chord Length(L)',
        local: 'Chord Length',
        global: 'ChordLength'
      },
      direction: {
        display: 'Direction(D)',
        local: 'Direction',
        global: 'Direction'
      },
      radius: {
        display: 'Radius(R)',
        local: 'Radius',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'Invalid 3-point arc: points are collinear or cannot define an arc.',
      center:
        'Invalid center input: start and end points must lie on the same circle.',
      angle:
        'Invalid angle input: included angle must be greater than 0 and less than 360 degrees.',
      chordLength:
        'Invalid chord length: value is out of range for the current radius.',
      direction:
        'Invalid direction: cannot construct an arc from this tangent direction.',
      radius:
        'Invalid radius: the specified radius cannot connect start and end points.'
    }
  },
  circle: {
    center: 'Specify the center of circle',
    centerOrOptions: 'Specify center point of circle or',
    radius: 'Specify the radius of circle',
    radiusOrDiameter: 'Specify radius of circle or',
    diameter: 'Specify diameter of circle',
    twoPointFirst: 'Specify first endpoint of circle diameter',
    twoPointSecond: 'Specify second endpoint of circle diameter',
    threePointFirst: 'Specify first point on circle',
    threePointSecond: 'Specify second point on circle',
    threePointThird: 'Specify third point on circle',
    keywords: {
      threeP: {
        display: '3P(3P)',
        local: '3P',
        global: '3P'
      },
      twoP: {
        display: '2P(2P)',
        local: '2P',
        global: '2P'
      },
      diameter: {
        display: 'Diameter(D)',
        local: 'Diameter',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'Specify base point or',
    displacementOrArray: 'Specify displacement or',
    secondPointOrArray: 'Specify second point or',
    modePrompt: 'Enter copy mode option',
    arrayItemCount:
      'Enter the number of items in the array including the original',
    arraySecondPointOrFit: 'Specify second point or',
    arrayFitSecondPoint: 'Specify second point',
    keywords: {
      displacement: {
        display: 'Displacement(D)',
        local: 'Displacement',
        global: 'Displacement'
      },
      mode: {
        display: 'Mode(O)',
        local: 'Mode',
        global: 'Mode'
      },
      multiple: {
        display: 'Multiple(M)',
        local: 'Multiple',
        global: 'Multiple'
      },
      single: {
        display: 'Single(S)',
        local: 'Single',
        global: 'Single'
      },
      array: {
        display: 'Array(A)',
        local: 'Array',
        global: 'Array'
      },
      fit: {
        display: 'Fit(F)',
        local: 'Fit',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: 'Specify the first extension line origin',
    xLine2Point: 'Specify the second extension line origin',
    dimLinePoint: 'Specify dimension line location'
  },
  ellipse: {
    axisEndpointOrOptions: 'Specify axis endpoint of ellipse or',
    arcAxisEndpointOrCenter: 'Specify axis endpoint of elliptical arc or',
    center: 'Specify center of ellipse',
    firstAxisEndpoint: 'Specify endpoint of axis',
    secondAxisEndpoint: 'Specify other endpoint of axis',
    otherAxisOrRotation: 'Specify distance to other axis or',
    rotationAngle: 'Specify rotation angle around major axis',
    arcStartAngle: 'Specify start angle of elliptical arc',
    arcEndAngle: 'Specify end angle of elliptical arc',
    keywords: {
      arc: {
        display: 'Arc(A)',
        local: 'Arc',
        global: 'Arc'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      rotation: {
        display: 'Rotation(R)',
        local: 'Rotation',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'Invalid axis input: axis length must be greater than 0.',
      otherAxis: 'Invalid other-axis input: distance must be greater than 0.',
      rotation:
        'Invalid rotation input: resulting minor axis must be greater than 0.'
    }
  },
  hideobjects: {
    hidden: 'object(s) hidden',
    restored: 'object(s) restored',
    nothingToRestore: 'No hidden objects to restore'
  },
  line: {
    firstPoint: 'Specify the first point',
    firstPointOrContinue: 'Specify first point or',
    nextPoint: 'Specify the next point',
    nextPointWithOptions: 'Specify next point or',
    keywords: {
      continue: {
        display: 'Continue(C)',
        local: 'Continue',
        global: 'Continue'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      }
    }
  },
  measureAngle: {
    vertex: 'Specify vertex point',
    arm1: 'Specify point on first arm',
    arm2: 'Specify point on second arm'
  },
  measureArc: {
    startPoint: 'Specify arc start point',
    throughPoint: 'Specify a point on the arc',
    endPoint: 'Specify arc end point',
    lockedEndPoint: 'Specify arc end point (Ctrl to switch major/minor arc)',
    invalidPoints: 'The three points are collinear and do not define an arc.'
  },
  measureArea: {
    firstPoint: 'Specify first point',
    nextPoint: 'Specify next point (or press Enter to finish)'
  },
  measureDistance: {
    firstPoint: 'Specify first point',
    secondPoint: 'Specify second point'
  },
  measureContinuous: {
    firstPoint: 'Specify first point',
    nextPoint: 'Specify next point (or press Enter to finish)'
  },
  measurePoint: {
    point: 'Specify point'
  },
  measurement: {
    import: {
      chooseFile: 'Choose a measurement sidecar JSON file'
    }
  },
  move: {
    basePointOrDisplacement: 'Specify base point or',
    secondPointOrDisplacement: 'Specify second point or',
    displacement: 'Specify displacement',
    keywords: {
      displacement: {
        display: 'Displacement(D)',
        local: 'Displacement',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'Specify offset distance',
    selectObject: 'Select object to offset or press Enter to finish',
    sidePoint: 'Specify point on side to offset',
    invalidDistance: 'Offset distance must be greater than 0.',
    invalidSelection: 'Selected object cannot be offset.',
    offsetFailed: 'Unable to create an offset curve for the specified side.'
  },
  point: {
    point: 'Specify a point'
  },
  polygon: {
    numberOfSides: 'Enter number of sides',
    centerOrEdge: 'Specify center of polygon or',
    radiusOrType: 'Enter options',
    edgeStart: 'Specify first endpoint of edge',
    edgeEnd: 'Specify second endpoint of edge',
    keywords: {
      edge: {
        display: 'Edge(E)',
        local: 'Edge',
        global: 'Edge'
      },
      inscribed: {
        display: 'Inscribed in circle(I)',
        local: 'Inscribed in circle',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'Circumscribed about circle(C)',
        local: 'Circumscribed about circle',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'Invalid number of sides. Enter an integer between 3 and 1024.',
      radius: 'Invalid radius. Radius must be greater than 0.',
      edge: 'Invalid edge. The edge length must be greater than 0.'
    }
  },
  polyline: {
    firstPoint: 'Specify the first point',
    nextPoint: 'Specify the next point (or press Enter to finish)',
    nextPointWithOptions: 'Specify next point or',
    nextPointWithArcOptions: 'Specify next point or',
    keywords: {
      arc: {
        display: 'Arc(A)',
        local: 'Arc',
        global: 'Arc'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      },
      line: {
        display: 'Line(L)',
        local: 'Line',
        global: 'Line'
      },
      angle: {
        display: 'Angle(A)',
        local: 'Angle',
        global: 'Angle'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      secondPoint: {
        display: 'Second point(P)',
        local: 'Second point',
        global: 'SecondPoint'
      },
      radius: {
        display: 'Radius(R)',
        local: 'Radius',
        global: 'Radius'
      }
    },
    arcAngle: 'Specify arc angle',
    arcCenter: 'Specify center point',
    arcSecondPoint: 'Specify second point on arc',
    arcEndPoint: 'Specify arc end point',
    arcRadius: 'Specify arc radius'
  },
  rect: {
    firstPoint: 'Specify first corner point',
    nextPoint: 'Specify other corner point',
    firstPointWithOptions: 'Specify first corner point or',
    otherCornerWithOptions: 'Specify other corner point or',
    chamferFirst: 'Specify first chamfer distance',
    chamferSecond: 'Specify second chamfer distance',
    filletRadius: 'Specify fillet radius',
    segmentWidth: 'Specify rectangle line width',
    rotationAngle: 'Specify rectangle rotation angle',
    dimensionLength: 'Specify rectangle length',
    dimensionWidth: 'Specify rectangle width',
    areaValue: 'Specify rectangle area',
    areaLengthOrWidth: 'Specify rectangle length',
    areaSpecifyWidth: 'Specify rectangle width',
    invalidPositive: 'Invalid input. Please enter a value greater than 0.',
    invalidRect:
      'Unable to create rectangle. Please specify valid corners or dimensions.',
    keywords: {
      chamfer: {
        display: 'Chamfer(C)',
        local: 'Chamfer',
        global: 'Chamfer'
      },
      fillet: {
        display: 'Fillet(F)',
        local: 'Fillet',
        global: 'Fillet'
      },
      width: {
        display: 'Width(W)',
        local: 'Width',
        global: 'Width'
      },
      area: {
        display: 'Area(A)',
        local: 'Area',
        global: 'Area'
      },
      dimensions: {
        display: 'Dimensions(D)',
        local: 'Dimensions',
        global: 'Dimensions'
      },
      rotation: {
        display: 'Rotation(R)',
        local: 'Rotation',
        global: 'Rotation'
      },
      length: {
        display: 'Length(L)',
        local: 'Length',
        global: 'Length'
      },
      rectWidth: {
        display: 'Width(W)',
        local: 'Width',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'Specify base point',
    rotationAngleOrOptions: 'Specify rotation angle or',
    referenceAngleOrPoints: 'Specify reference angle or',
    firstReferencePoint: 'Specify first point of reference angle',
    secondReferencePoint: 'Specify second point',
    newAngle: 'Specify new angle',
    keywords: {
      copy: {
        display: 'Copy(C)',
        local: 'Copy',
        global: 'Copy'
      },
      reference: {
        display: 'Reference(R)',
        local: 'Reference',
        global: 'Reference'
      },
      points: {
        display: 'Points(P)',
        local: 'Points',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: 'Invalid reference points: points must be different.'
    }
  },
  spline: {
    firstPoint: 'Specify the first point',
    nextPoint: 'Specify the next point (or press Enter to finish)',
    firstPointWithOptions: 'Specify first point or',
    nextPointWithFitOptions: 'Specify next point or',
    nextPointWithCvOptions: 'Specify next control vertex or',
    methodPrompt: 'Enter spline creation method',
    knotsPrompt: 'Enter knot parameterization',
    degreePrompt: 'Specify spline degree',
    keywords: {
      method: {
        display: 'Method(M)',
        local: 'Method',
        global: 'Method'
      },
      fit: {
        display: 'Fit(F)',
        local: 'Fit',
        global: 'Fit'
      },
      cv: {
        display: 'CV(C)',
        local: 'CV',
        global: 'CV'
      },
      knots: {
        display: 'Knots(K)',
        local: 'Knots',
        global: 'Knots'
      },
      degree: {
        display: 'Degree(D)',
        local: 'Degree',
        global: 'Degree'
      },
      close: {
        display: 'Close(C)',
        local: 'Close',
        global: 'Close'
      },
      chord: {
        display: 'Chord(C)',
        local: 'Chord',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'Sqrt chord(S)',
        local: 'Sqrt chord',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'Uniform(U)',
        local: 'Uniform',
        global: 'Uniform'
      }
    }
  },
  sysvar: {
    prompt: 'Please input new value'
  },
  zoom: {
    mainPrompt: 'Specify corner of window or',
    firstCorner: 'Specify first corner',
    secondCorner: 'Specify opposite corner',
    centerPoint: 'Specify center point',
    heightOrScale: 'Enter height or scale factor (nX or nXP)',
    scaleFactor: 'Enter scale factor (nX or nXP)',
    keywords: {
      all: {
        display: 'All(A)',
        local: 'All',
        global: 'All'
      },
      center: {
        display: 'Center(C)',
        local: 'Center',
        global: 'Center'
      },
      extents: {
        display: 'Extents(E)',
        local: 'Extents',
        global: 'Extents'
      },
      previous: {
        display: 'Previous(P)',
        local: 'Previous',
        global: 'Previous'
      },
      original: {
        display: 'Original(O)',
        local: 'Original',
        global: 'Original'
      },
      saved: {
        display: 'Saved(V)',
        local: 'Saved',
        global: 'Saved'
      },
      smart: {
        display: 'Smart(I)',
        local: 'Smart',
        global: 'Smart'
      },
      scale: {
        display: 'Scale(S)',
        local: 'Scale',
        global: 'Scale'
      },
      window: {
        display: 'Window(W)',
        local: 'Window',
        global: 'Window'
      }
    }
  }
}
