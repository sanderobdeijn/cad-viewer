export default {
  arc: {
    startPointOrCenter: 'Zadejte počáteční bod oblouku nebo',
    secondPointOrOptions: 'Zadejte druhý bod oblouku nebo',
    secondPoint: 'Zadejte druhý bod oblouku',
    startPoint: 'Zadejte počáteční bod oblouku',
    centerPoint: 'Zadejte středový bod oblouku',
    endPoint: 'Zadejte koncový bod oblouku',
    endPointOrOptions: 'Zadejte koncový bod oblouku nebo',
    centerPointOrOptions: 'Zadejte středový bod oblouku',
    includedAngle: 'Zadejte středový úhel',
    chordLength: 'Zadejte délku tětivy',
    tangentDirection: 'Zadejte směr tečny v počátečním bodě oblouku',
    radius: 'Zadejte poloměr oblouku',
    keywords: {
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      end: {
        display: 'Konec(E)',
        local: 'Konec',
        global: 'End'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      chordLength: {
        display: 'délka Tětivy(L)',
        local: 'Délka tětivy',
        global: 'ChordLength'
      },
      direction: {
        display: 'Směr(D)',
        local: 'Směr',
        global: 'Direction'
      },
      radius: {
        display: 'Poloměr(R)',
        local: 'Poloměr',
        global: 'Radius'
      }
    },
    invalid: {
      threePoint:
        'Neplatný 3bodový oblouk: body jsou kolineární nebo nelze definovat oblouk.',
      center:
        'Neplatný vstup středu: počáteční a koncový bod musí ležet na stejné kružnici.',
      angle:
        'Neplatný vstup úhlu: středový úhel musí být větší než 0 a menší než 360 stupňů.',
      chordLength:
        'Neplatná délka tětivy: hodnota je mimo rozsah pro aktuální poloměr.',
      direction: 'Neplatný směr: z tohoto směru tečny nelze sestrojit oblouk.',
      radius:
        'Neplatný poloměr: zadaný poloměr nemůže spojit počáteční a koncový bod.'
    }
  },
  circle: {
    center: 'Zadejte střed kružnice',
    centerOrOptions: 'Zadejte středový bod kružnice nebo',
    radius: 'Zadejte poloměr kružnice',
    radiusOrDiameter: 'Zadejte poloměr kružnice nebo',
    diameter: 'Zadejte průměr kružnice',
    twoPointFirst: 'Zadejte první koncový bod průměru kružnice',
    twoPointSecond: 'Zadejte druhý koncový bod průměru kružnice',
    threePointFirst: 'Zadejte první bod na kružnici',
    threePointSecond: 'Zadejte druhý bod na kružnici',
    threePointThird: 'Zadejte třetí bod na kružnici',
    keywords: {
      threeP: {
        display: '3B(3P)',
        local: '3B',
        global: '3P'
      },
      twoP: {
        display: '2B(2P)',
        local: '2B',
        global: '2P'
      },
      diameter: {
        display: 'Průměr(D)',
        local: 'Průměr',
        global: 'Diameter'
      }
    }
  },
  copy: {
    basePointOrOptions: 'Zadejte základní bod nebo',
    displacementOrArray: 'Zadejte přemístění nebo',
    secondPointOrArray: 'Zadejte druhý bod nebo',
    modePrompt: 'Zadejte volbu režimu kopírování',
    arrayItemCount: 'Zadejte počet položek v poli včetně originálu',
    arraySecondPointOrFit: 'Zadejte druhý bod nebo',
    arrayFitSecondPoint: 'Zadejte druhý bod',
    keywords: {
      displacement: {
        display: 'Přemístění(D)',
        local: 'Přemístění',
        global: 'Displacement'
      },
      mode: {
        display: 'Režim(O)',
        local: 'Režim',
        global: 'Mode'
      },
      multiple: {
        display: 'Vícenásobné(M)',
        local: 'Vícenásobné',
        global: 'Multiple'
      },
      single: {
        display: 'Jednoduché(S)',
        local: 'Jednoduché',
        global: 'Single'
      },
      array: {
        display: 'Pole(A)',
        local: 'Pole',
        global: 'Array'
      },
      fit: {
        display: 'Přizpůsobit(F)',
        local: 'Přizpůsobit',
        global: 'Fit'
      }
    }
  },
  dimlinear: {
    xLine1Point: 'Zadejte počátek první pomocné čáry',
    xLine2Point: 'Zadejte počátek druhé pomocné čáry',
    dimLinePoint: 'Zadejte umístění kótovací čáry'
  },
  ellipse: {
    axisEndpointOrOptions: 'Zadejte koncový bod osy elipsy nebo',
    arcAxisEndpointOrCenter: 'Zadejte koncový bod osy eliptického oblouku nebo',
    center: 'Zadejte střed elipsy',
    firstAxisEndpoint: 'Zadejte koncový bod osy',
    secondAxisEndpoint: 'Zadejte druhý koncový bod osy',
    otherAxisOrRotation: 'Zadejte vzdálenost k druhé ose nebo',
    rotationAngle: 'Zadejte úhel otočení kolem hlavní osy',
    arcStartAngle: 'Zadejte počáteční úhel eliptického oblouku',
    arcEndAngle: 'Zadejte koncový úhel eliptického oblouku',
    keywords: {
      arc: {
        display: 'Oblouk(A)',
        local: 'Oblouk',
        global: 'Arc'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      rotation: {
        display: 'Otočení(R)',
        local: 'Otočení',
        global: 'Rotation'
      }
    },
    invalid: {
      axis: 'Neplatný vstup osy: délka osy musí být větší než 0.',
      otherAxis: 'Neplatný vstup druhé osy: vzdálenost musí být větší než 0.',
      rotation:
        'Neplatný vstup otočení: výsledná vedlejší osa musí být větší než 0.'
    }
  },
  hatch: {
    prompt: 'Vyberte objekt hranice nebo',
    pickPoint: 'Zadejte vnitřní bod (nebo stiskněte Enter pro dokončení)',
    select: 'Vyberte objekty k šrafování',
    patternName: 'Zadejte název vzoru šrafování',
    scale: 'Zadejte měřítko vzoru šrafování',
    angle: 'Zadejte úhel vzoru šrafování',
    style: 'Zadejte styl šrafování',
    associative: 'Zadejte asociativitu',
    invalidBoundary: 'Vybrané objekty netvoří uzavřenou hranici.',
    keywords: {
      pick: {
        display: 'Vybrat body(P)',
        local: 'Vybrat body',
        global: 'PickPoints'
      },
      select: {
        display: 'Vybrat objekty(S)',
        local: 'Vybrat objekty',
        global: 'SelectObjects'
      },
      cancel: {
        display: 'Zrušit(C)',
        local: 'Zrušit',
        global: 'Cancel'
      },
      pattern: {
        display: 'Vzor(P)',
        local: 'Vzor',
        global: 'Pattern'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      style: {
        display: 'Styl(T)',
        local: 'Styl',
        global: 'HatchStyle'
      },
      associative: {
        display: 'Asociativní(AS)',
        local: 'Asociativní',
        global: 'AssociativeMode'
      },
      normal: {
        display: 'Normální(N)',
        local: 'Normální',
        global: 'Normal'
      },
      outer: {
        display: 'Vnější(O)',
        local: 'Vnější',
        global: 'Outer'
      },
      ignore: {
        display: 'Ignorovat(I)',
        local: 'Ignorovat',
        global: 'Ignore'
      },
      yes: {
        display: 'Ano(Y)',
        local: 'Ano',
        global: 'Yes'
      },
      no: {
        display: 'Ne(N)',
        local: 'Ne',
        global: 'No'
      }
    }
  },
  hideobjects: {
    hidden: 'objekt(ů) skryto',
    restored: 'objekt(ů) obnoveno',
    nothingToRestore: 'Žádné skryté objekty k obnovení'
  },
  line: {
    firstPoint: 'Zadejte první bod',
    firstPointOrContinue: 'Zadejte první bod nebo',
    nextPoint: 'Zadejte další bod',
    nextPointWithOptions: 'Zadejte další bod nebo',
    keywords: {
      continue: {
        display: 'Pokračovat(C)',
        local: 'Pokračovat',
        global: 'Continue'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      }
    }
  },
  xline: {
    firstPointOrOptions: 'Zadejte bod nebo',
    secondPoint: 'Zadejte druhý bod',
    throughPoint: 'Zadejte bod, kterým má přímka procházet',
    angle: 'Zadejte úhel konstrukční přímky',
    invalidDirection: 'Neplatný směr pro XLINE.',
    keywords: {
      hor: {
        display: 'Vodorovně(H)',
        local: 'Vodorovně',
        global: 'Hor'
      },
      ver: {
        display: 'Svisle(V)',
        local: 'Svisle',
        global: 'Ver'
      },
      ang: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Ang'
      }
    }
  },
  ray: {
    startPoint: 'Zadejte počáteční bod',
    throughPoint: 'Zadejte bod, kterým má polopřímka procházet'
  },
  mline: {
    startPointWithOptions: 'Zadejte počáteční bod nebo',
    nextPointWithOptions: 'Zadejte další bod nebo',
    justificationPrompt: 'Zadejte typ zarovnání',
    scalePrompt: 'Zadejte měřítko multičáry',
    stylePrompt: 'Zadejte název stylu multičáry nebo [?] pro seznam',
    styleNotFound: 'Styl multičáry nenalezen',
    styleListHeader: 'Načtené styly multičáry',
    styleListEmpty: 'V aktuálním výkresu není načten žádný styl multičáry.',
    keywords: {
      justification: {
        display: 'Zarovnání(J)',
        local: 'Zarovnání',
        global: 'Justification'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      style: {
        display: 'Styl(ST)',
        local: 'Styl',
        global: 'Style'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      top: {
        display: 'Nahoře(T)',
        local: 'Nahoře',
        global: 'Top'
      },
      zero: {
        display: 'Nula(Z)',
        local: 'Nula',
        global: 'Zero'
      },
      bottom: {
        display: 'Dole(B)',
        local: 'Dole',
        global: 'Bottom'
      }
    }
  },
  measureAngle: {
    vertex: 'Zadejte vrchol',
    arm1: 'Zadejte bod na prvním rameni',
    arm2: 'Zadejte bod na druhém rameni'
  },
  measureArc: {
    startPoint: 'Zadejte počáteční bod oblouku',
    throughPoint: 'Zadejte bod na oblouku',
    endPoint: 'Zadejte koncový bod oblouku',
    lockedEndPoint:
      'Zadejte koncový bod oblouku (Ctrl přepne velký/malý oblouk)',
    invalidPoints: 'Tři body jsou kolineární a nedefinují oblouk.'
  },
  measureArea: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)'
  },
  measureDistance: {
    firstPoint: 'Zadejte první bod',
    secondPoint: 'Zadejte druhý bod'
  },
  measureContinuous: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)'
  },
  measurePoint: {
    point: 'Zadejte bod'
  },
  measurement: {
    import: {
      chooseFile: 'Vyberte sidecar JSON soubor měření'
    }
  },
  move: {
    basePointOrDisplacement: 'Zadejte základní bod nebo',
    secondPointOrDisplacement: 'Zadejte druhý bod nebo',
    displacement: 'Zadejte přemístění',
    keywords: {
      displacement: {
        display: 'Přemístění(D)',
        local: 'Přemístění',
        global: 'Displacement'
      }
    }
  },
  offset: {
    distance: 'Zadejte vzdálenost offsetu',
    selectObject: 'Vyberte objekt k offsetu nebo stiskněte Enter pro dokončení',
    sidePoint: 'Zadejte bod na straně pro offset',
    invalidDistance: 'Vzdálenost offsetu musí být větší než 0.',
    invalidSelection: 'Vybraný objekt nelze offsetovat.',
    offsetFailed: 'Nelze vytvořit offsetovou křivku na zadané straně.'
  },
  mtext: {
    point: 'Zadejte bod vložení víceřádkového textu'
  },
  point: {
    point: 'Zadejte bod'
  },
  polygon: {
    numberOfSides: 'Zadejte počet stran',
    centerOrEdge: 'Zadejte střed mnohoúhelníku nebo',
    radiusOrType: 'Zadejte volby',
    edgeStart: 'Zadejte první koncový bod hrany',
    edgeEnd: 'Zadejte druhý koncový bod hrany',
    keywords: {
      edge: {
        display: 'Hrana(E)',
        local: 'Hrana',
        global: 'Edge'
      },
      inscribed: {
        display: 'Vepsaný do kružnice(I)',
        local: 'Vepsaný do kružnice',
        global: 'Inscribed'
      },
      circumscribed: {
        display: 'Opsaný kolem kružnice(C)',
        local: 'Opsaný kolem kružnice',
        global: 'Circumscribed'
      }
    },
    invalid: {
      sides: 'Neplatný počet stran. Zadejte celé číslo mezi 3 a 1024.',
      radius: 'Neplatný poloměr. Poloměr musí být větší než 0.',
      edge: 'Neplatná hrana. Délka hrany musí být větší než 0.'
    }
  },
  polyline: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)',
    nextPointWithOptions: 'Zadejte další bod nebo',
    nextPointWithArcOptions: 'Zadejte další bod nebo',
    keywords: {
      arc: {
        display: 'Oblouk(A)',
        local: 'Oblouk',
        global: 'Arc'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      line: {
        display: 'Úsečka(L)',
        local: 'Úsečka',
        global: 'Line'
      },
      angle: {
        display: 'Úhel(A)',
        local: 'Úhel',
        global: 'Angle'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      secondPoint: {
        display: 'Druhý bod(P)',
        local: 'Druhý bod',
        global: 'SecondPoint'
      },
      radius: {
        display: 'Poloměr(R)',
        local: 'Poloměr',
        global: 'Radius'
      }
    },
    arcAngle: 'Zadejte úhel oblouku',
    arcCenter: 'Zadejte středový bod',
    arcSecondPoint: 'Zadejte druhý bod na oblouku',
    arcEndPoint: 'Zadejte koncový bod oblouku',
    arcRadius: 'Zadejte poloměr oblouku'
  },
  rect: {
    firstPoint: 'Zadejte první roh',
    nextPoint: 'Zadejte druhý roh',
    firstPointWithOptions: 'Zadejte první roh nebo',
    otherCornerWithOptions: 'Zadejte druhý roh nebo',
    chamferFirst: 'Zadejte první vzdálenost zkosení',
    chamferSecond: 'Zadejte druhou vzdálenost zkosení',
    filletRadius: 'Zadejte poloměr zaoblení',
    segmentWidth: 'Zadejte šířku čáry obdélníku',
    elevationValue: 'Zadejte výšku',
    thicknessValue: 'Zadejte tloušťku',
    rotationAngle: 'Zadejte úhel otočení obdélníku',
    dimensionLength: 'Zadejte délku obdélníku',
    dimensionWidth: 'Zadejte šířku obdélníku',
    areaValue: 'Zadejte plochu obdélníku',
    areaLengthOrWidth: 'Zadejte délku obdélníku',
    areaSpecifyWidth: 'Zadejte šířku obdélníku',
    invalidPositive: 'Neplatný vstup. Zadejte hodnotu větší než 0.',
    invalidRect: 'Nelze vytvořit obdélník. Zadejte platné rohy nebo rozměry.',
    thicknessNotSupported:
      'Tloušťka obdélníku se aktuálně nezapisuje do dat entity. Nastavení tloušťky se ignoruje.',
    keywords: {
      chamfer: {
        display: 'Zkosení(C)',
        local: 'Zkosení',
        global: 'Chamfer'
      },
      elevation: {
        display: 'Výška(E)',
        local: 'Výška',
        global: 'Elevation'
      },
      fillet: {
        display: 'Zaoblení(F)',
        local: 'Zaoblení',
        global: 'Fillet'
      },
      thickness: {
        display: 'Tloušťka(T)',
        local: 'Tloušťka',
        global: 'Thickness'
      },
      width: {
        display: 'Šířka(W)',
        local: 'Šířka',
        global: 'Width'
      },
      area: {
        display: 'Plocha(A)',
        local: 'Plocha',
        global: 'Area'
      },
      dimensions: {
        display: 'Rozměry(D)',
        local: 'Rozměry',
        global: 'Dimensions'
      },
      rotation: {
        display: 'Otočení(R)',
        local: 'Otočení',
        global: 'Rotation'
      },
      length: {
        display: 'Délka(L)',
        local: 'Délka',
        global: 'Length'
      },
      rectWidth: {
        display: 'Šířka(W)',
        local: 'Šířka',
        global: 'Width'
      }
    }
  },
  rotate: {
    basePoint: 'Zadejte základní bod',
    rotationAngleOrOptions: 'Zadejte úhel otočení nebo',
    referenceAngleOrPoints: 'Zadejte referenční úhel nebo',
    firstReferencePoint: 'Zadejte první bod referenčního úhlu',
    secondReferencePoint: 'Zadejte druhý bod',
    newAngle: 'Zadejte nový úhel',
    keywords: {
      copy: {
        display: 'Kopírovat(C)',
        local: 'Kopírovat',
        global: 'Copy'
      },
      reference: {
        display: 'Reference(R)',
        local: 'Reference',
        global: 'Reference'
      },
      points: {
        display: 'Body(P)',
        local: 'Body',
        global: 'Points'
      }
    },
    invalid: {
      referencePoints: 'Neplatné referenční body: body musí být různé.'
    }
  },
  revcloud: {
    firstCornerOrOptions: 'Zadejte první rohový bod nebo',
    firstCorner: 'Zadejte první rohový bod',
    oppositeCorner: 'Zadejte protilehlý roh',
    startPoint: 'Zadejte počáteční bod',
    nextPoint: 'Zadejte další bod',
    nextPointOrUndo: 'Zadejte další bod nebo',
    firstPoint: 'Zadejte první bod',
    guideCursor: 'Veďte kurzor podél obláčku (Enter dokončí)',
    arcLength: 'Zadejte délku oblouku',
    selectObject: 'Vyberte objekt',
    style: 'Zadejte styl oblouků revizního obláčku',
    reverseDirection: 'Obrátit směr',
    invalidArcLength: 'Délka oblouku musí být větší než 0.',
    invalidObject: 'Vybraný objekt nelze převést na revizní obláček.',
    keywords: {
      arcLength: {
        display: 'Délka oblouku(A)',
        local: 'Délka oblouku',
        global: 'ArcLength'
      },
      object: {
        display: 'Objekt(O)',
        local: 'Objekt',
        global: 'Object'
      },
      rectangular: {
        display: 'Obdélníkový(R)',
        local: 'Obdélníkový',
        global: 'Rectangular'
      },
      polygonal: {
        display: 'Mnohoúhelníkový(P)',
        local: 'Mnohoúhelníkový',
        global: 'Polygonal'
      },
      freehand: {
        display: 'Od ruky(F)',
        local: 'Od ruky',
        global: 'Freehand'
      },
      style: {
        display: 'Styl(S)',
        local: 'Styl',
        global: 'Style'
      },
      normal: {
        display: 'Normální(N)',
        local: 'Normální',
        global: 'Normal'
      },
      calligraphy: {
        display: 'Kaligrafie(C)',
        local: 'Kaligrafie',
        global: 'Calligraphy'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      yes: {
        display: 'Ano(Y)',
        local: 'Ano',
        global: 'Yes'
      },
      no: {
        display: 'Ne(N)',
        local: 'Ne',
        global: 'No'
      }
    }
  },
  sketch: {
    specifySketch: 'Zadejte skicu nebo',
    sketching: 'Pohybem ukazatele kreslete (kliknutím nebo Enter zastavíte)',
    type: 'Zadejte typ skici',
    increment: 'Zadejte přírůstek skici',
    tolerance: 'Zadejte toleranci splajnu',
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte koncový bod',
    keywords: {
      type: {
        display: 'Typ(T)',
        local: 'Typ',
        global: 'Type'
      },
      increment: {
        display: 'Přírůstek(I)',
        local: 'Přírůstek',
        global: 'Increment'
      },
      tolerance: {
        display: 'toLerance(L)',
        local: 'toLerance',
        global: 'Tolerance'
      },
      line: {
        display: 'Úsečky(L)',
        local: 'Úsečky',
        global: 'Lines'
      },
      polyline: {
        display: 'Křivka(P)',
        local: 'Křivka',
        global: 'Polyline'
      },
      spline: {
        display: 'Splajn(S)',
        local: 'Splajn',
        global: 'Spline'
      }
    }
  },
  spline: {
    firstPoint: 'Zadejte první bod',
    nextPoint: 'Zadejte další bod (nebo stiskněte Enter pro dokončení)',
    firstPointWithOptions: 'Zadejte první bod nebo',
    nextPointWithFitOptions: 'Zadejte další bod nebo',
    nextPointWithCvOptions: 'Zadejte další řídicí bod nebo',
    methodPrompt: 'Zadejte metodu vytvoření splajnu',
    knotsPrompt: 'Zadejte parametrizaci uzlů',
    degreePrompt: 'Zadejte stupeň splajnu',
    keywords: {
      method: {
        display: 'Metoda(M)',
        local: 'Metoda',
        global: 'Method'
      },
      fit: {
        display: 'Přizpůsobit(F)',
        local: 'Přizpůsobit',
        global: 'Fit'
      },
      cv: {
        display: 'ŘB(C)',
        local: 'ŘB',
        global: 'CV'
      },
      knots: {
        display: 'Uzly(K)',
        local: 'Uzly',
        global: 'Knots'
      },
      degree: {
        display: 'Stupeň(D)',
        local: 'Stupeň',
        global: 'Degree'
      },
      undo: {
        display: 'Zpět(U)',
        local: 'Zpět',
        global: 'Undo'
      },
      close: {
        display: 'Uzavřít(C)',
        local: 'Uzavřít',
        global: 'Close'
      },
      chord: {
        display: 'Tětiva(C)',
        local: 'Tětiva',
        global: 'Chord'
      },
      sqrtChord: {
        display: 'Odmocnina tětivy(S)',
        local: 'Odmocnina tětivy',
        global: 'SqrtChord'
      },
      uniform: {
        display: 'Rovnoměrné(U)',
        local: 'Rovnoměrné',
        global: 'Uniform'
      }
    }
  },
  sysvar: {
    prompt: 'Zadejte novou hodnotu'
  },
  zoom: {
    mainPrompt: 'Zadejte roh okna nebo',
    firstCorner: 'Zadejte první roh',
    secondCorner: 'Zadejte protilehlý roh',
    centerPoint: 'Zadejte středový bod',
    heightOrScale: 'Zadejte výšku nebo faktor měřítka (nX nebo nXP)',
    scaleFactor: 'Zadejte faktor měřítka (nX nebo nXP)',
    keywords: {
      all: {
        display: 'Vše(A)',
        local: 'Vše',
        global: 'All'
      },
      center: {
        display: 'Střed(C)',
        local: 'Střed',
        global: 'Center'
      },
      extents: {
        display: 'Rozsah(E)',
        local: 'Rozsah',
        global: 'Extents'
      },
      previous: {
        display: 'Předchozí(P)',
        local: 'Předchozí',
        global: 'Previous'
      },
      original: {
        display: 'Původní(O)',
        local: 'Původní',
        global: 'Original'
      },
      saved: {
        display: 'Uložený(V)',
        local: 'Uložený',
        global: 'Saved'
      },
      smart: {
        display: 'Chytrý(I)',
        local: 'Chytrý',
        global: 'Smart'
      },
      scale: {
        display: 'Měřítko(S)',
        local: 'Měřítko',
        global: 'Scale'
      },
      window: {
        display: 'Okno(W)',
        local: 'Okno',
        global: 'Window'
      }
    }
  }
}
