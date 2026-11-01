export default {
  mainMenu: {
    new: 'Nový výkres',
    drawingUnits: 'Jednotky výkresu',
    about: 'O aplikaci'
  },
  ribbon: {
    tab: {
      home: 'Domů',
      measurement: 'Měření',
      hatchContext: 'Šrafování',
      mtextEditorContext: 'Editor textu'
    },
    hatch: {
      group: {
        boundary: 'Hranice',
        pattern: 'Vzor',
        properties: 'Vlastnosti',
        options: 'Možnosti',
        close: 'Zavřít'
      },
      command: {
        pickPoints: 'Určit body',
        selectObjects: 'Vybrat objekty',
        close: 'Zavřít'
      },
      field: {
        pattern: 'Vzor',
        scale: 'Měřítko',
        angle: 'Úhel',
        style: 'Styl',
        associative: 'Asociativní',
        fillType: 'Typ výplně',
        fillColor: 'Barva',
        patternColor: 'Barva vzoru',
        gradient1Color: 'Barva přechodu 1',
        backgroundColor: 'Barva pozadí',
        gradient2Color: 'Barva přechodu 2',
        opacity: 'Průhlednost',
        imageScale: 'Měřítko obrázku'
      },
      style: {
        normal: 'Normální',
        outer: 'Vnější',
        ignore: 'Ignorovat'
      },
      fillType: {
        solid: 'Plná',
        pattern: 'Vzor',
        gradient: 'Přechod'
      },
      associative: {
        on: 'Zapnuto',
        off: 'Vypnuto'
      },
      tooltip: {
        pickPoints: 'Určete vnitřní body pro vytvoření šrafovaných oblastí.',
        selectObjects: 'Vyberte uzavřené hraniční objekty ke šrafování.',
        pattern: 'Zvolte název vzoru šrafování.',
        scale: 'Nastavte měřítko vzoru šrafování.',
        angle: 'Nastavte úhel vzoru šrafování ve stupních.',
        style: 'Určuje způsob detekce ostrůvků při šrafování.',
        associative: 'Přepne asociativní režim šrafování.',
        fillType: 'Zvolte typ výplně: plná, vzor nebo přechod.',
        fillColor: 'Zvolte barvu výplně.',
        patternColor: 'Zvolte barvu čar vzoru.',
        gradient1Color: 'Zvolte první barvu přechodu.',
        backgroundColor: 'Zvolte barvu pozadí výplně vzorem.',
        gradient2Color: 'Zvolte druhou barvu přechodu.',
        opacity: 'Nastavte průhlednost šrafování (0–90).',
        imageScale: 'Nastavte měřítko obrázkové výplně.',
        close: 'Ukončí šrafování a zavře tuto kontextovou kartu.'
      }
    },
    mtext: {
      group: {
        textStyle: 'Textový styl',
        format: 'Formát',
        paragraph: 'Odstavec',
        insert: 'Vložit',
        close: 'Zavřít'
      },
      field: {
        textStyle: 'Textový styl',
        font: 'Font',
        color: 'Barva',
        height: 'Výška',
        obliqueAngle: 'Úhel sklonu',
        tracking: 'Prostrkání',
        widthFactor: 'Faktor šířky'
      },
      characterMap: {
        title: 'Mapa znaků',
        font: 'Font(F):',
        charsToCopy: 'Znaky ke zkopírování(A):',
        select: 'Vybrat(S)',
        copy: 'Kopírovat(C)',
        noGlyphs: 'Pro tento font nejsou k dispozici žádné znaky.',
        copyFailed: 'Nelze zkopírovat do schránky.'
      },
      command: {
        bold: 'Tučné',
        underline: 'Podtržené',
        superscript: 'Horní index',
        italic: 'Kurzíva',
        overline: 'Nadtržené',
        subscript: 'Dolní index',
        strikethrough: 'Přeškrtnuté',
        stack: 'Zlomek',
        toggleCase: 'Velká/malá písmena',
        attachment: 'Zarovnání',
        list: 'Odrážky a číslování',
        lineSpacing: 'Řádkování',
        paragraphAlignment: 'Zarovnání odstavce',
        symbol: 'Symbol',
        close: 'Zavřít'
      },
      tooltip: {
        textStyle: 'Zvolte textový styl z aktuálního výkresu.',
        bold: 'Přepne tučné písmo.',
        underline: 'Přepne podtržení.',
        superscript: 'Přepne horní index.',
        italic: 'Přepne kurzívu.',
        overline: 'Přepne nadtržení.',
        subscript: 'Přepne dolní index.',
        strikethrough: 'Přepne přeškrtnutí.',
        stack: 'Vytvoří nebo zruší zlomek z vybraného textu.',
        toggleCase: 'Přepne vybraný text mezi velkými a malými písmeny.',
        font: 'Nastaví aktuální font textu.',
        color: 'Nastaví aktuální barvu textu.',
        height: 'Nastaví aktuální výšku textu. Lze zadat vlastní hodnotu.',
        obliqueAngle:
          'Nastaví úhel sklonu vybraných znaků ve stupních (záporná hodnota naklání na druhou stranu).',
        tracking:
          'Zvětší nebo zmenší mezery mezi vybranými znaky (výchozí je 1).',
        widthFactor:
          'Vodorovně roztáhne nebo stlačí vybrané znaky (výchozí je 1).',
        attachment: 'Nastaví bod ukotvení víceřádkového textu.',
        list: 'Vloží nebo nastaví odrážky a číslování.',
        lineSpacing: 'Nastaví řádkování.',
        paragraphAlignment: 'Nastaví vodorovné zarovnání odstavce.',
        symbol: 'Vloží běžný technický symbol.',
        close: 'Zavře editor textu a tuto kontextovou kartu.'
      },
      attachment: {
        TL: 'Vlevo nahoře TL',
        TC: 'Uprostřed nahoře TC',
        TR: 'Vpravo nahoře TR',
        ML: 'Vlevo uprostřed ML',
        MC: 'Uprostřed MC',
        MR: 'Vpravo uprostřed MR',
        BL: 'Vlevo dole BL',
        BC: 'Uprostřed dole BC',
        BR: 'Vpravo dole BR'
      },
      list: {
        off: 'Vypnuto',
        number: 'Číslované',
        letter: 'Písmena',
        bullet: 'Odrážky',
        start: 'Začít',
        continue: 'Pokračovat',
        auto: 'Povolit automatické odrážky a číslování',
        allowList: 'Povolit odrážky a seznamy'
      },
      lineSpacing: {
        more: 'Více…',
        clear: 'Zrušit mezery odstavce'
      },
      paragraphAlign: {
        default: 'Výchozí',
        left: 'Vlevo',
        center: 'Na střed',
        right: 'Vpravo',
        justified: 'Do bloku',
        distributed: 'Rovnoměrně'
      },
      symbol: {
        degree: 'Stupně  %%d',
        plusMinus: 'Plus/minus  %%p',
        diameter: 'Průměr  %%c',
        almostEqual: 'Přibližně rovno  \\U+2248',
        angle: 'Úhel  \\U+2220',
        boundary: 'Hraniční čára  \\U+E100',
        centerLine: 'Osa  \\U+2104',
        delta: 'Delta  \\U+0394',
        electricalPhase: 'Elektrická fáze  \\U+0278',
        flowLine: 'Čára toku  \\U+E101',
        identical: 'Identické s  \\U+2261',
        notEqual: 'Nerovná se  \\U+2260',
        ohm: 'Ohm  \\U+2126',
        omega: 'Omega  \\U+03A9',
        propertyLine: 'Hranice pozemku  \\U+214A',
        subscriptTwo: 'Dolní index 2  \\U+2082',
        squared: 'Na druhou  \\U+00B2',
        cubed: 'Na třetí  \\U+00B3',
        nbsp: 'Nezlomitelná mezera Ctrl+Shift+Mezerník',
        other: 'Další…'
      }
    },
    group: {
      draw: 'Kreslení',
      modify: 'Úpravy',
      properties: 'Vlastnosti',
      utilities: 'Nástroje',
      annotation: 'Poznámky',
      measurement: 'Měření',
      style: 'Styl',
      lengthUnits: 'Jednotky délky',
      angleUnits: 'Jednotky úhlu'
    },
    property: {
      color: 'Barva',
      lineType: 'Typ čáry',
      lineWeight: 'Tloušťka čáry'
    },
    arc: {
      threePoint: '3 body',
      startCenterEnd: 'Počátek, střed, konec',
      startCenterAngle: 'Počátek, střed, úhel',
      startCenterLength: 'Počátek, střed, délka',
      startEndAngle: 'Počátek, konec, úhel',
      startEndDirection: 'Počátek, konec, směr',
      startEndRadius: 'Počátek, konec, poloměr',
      centerStartEnd: 'Střed, počátek, konec',
      centerStartAngle: 'Střed, počátek, úhel',
      centerStartLength: 'Střed, počátek, délka'
    },
    circle: {
      centerRadius: 'Střed, poloměr',
      centerDiameter: 'Střed, průměr',
      twoPoint: '2 body',
      threePoint: '3 body',
      tanTanRadius: 'Tečna, tečna, poloměr',
      tanTanTan: 'Tečna, tečna, tečna'
    },
    ellipse: {
      ellipse: 'Elipsa',
      arc: 'Eliptický oblouk'
    },
    tooltip: {
      line: 'Nakreslí jednu úsečku.',
      polyline: 'Nakreslí spojenou řadu úseček nebo oblouků jako jeden objekt.',
      spline: 'Nakreslí hladkou křivku splajn proložením nebo řídicími body.',
      sketch: 'Vytvoří řadu úseček kreslených od ruky.',
      revcloud: 'Vytvoří revizní obláček pro zvýraznění oblastí výkresu.',
      circle: 'Nakreslí kružnici několika způsoby konstrukce.',
      arc: 'Nakreslí oblouk několika způsoby konstrukce.',
      mline: 'Nakreslí několik rovnoběžných čar jako jeden objekt.',
      ray: 'Nakreslí polopřímku z počátečního bodu.',
      xline: 'Nakreslí nekonečnou konstrukční přímku.',
      ellipse: 'Nakreslí elipsu nebo eliptický oblouk.',
      rect: 'Nakreslí obdélník nebo pravidelný mnohoúhelník.',
      point: 'Umístí do výkresu bod.',
      hatch: 'Vyplní uzavřenou oblast vzorem šrafování.',
      text: 'Vytvoří ve výkresu víceřádkový text.',
      move: 'Posune vybrané objekty na novou pozici.',
      rotate: 'Otočí vybrané objekty kolem základního bodu.',
      copy: 'Zkopíruje vybrané objekty na nové místo.',
      erase: 'Odstraní vybrané objekty z výkresu.',
      offset: 'Vytvoří rovnoběžnou kopii objektu v zadané vzdálenosti.',
      undo: 'Vrátí zpět poslední úpravu.',
      redo: 'Zopakuje poslední vrácenou úpravu.',
      properties: 'Otevře paletu Vlastnosti pro aktuální výběr.',
      quickSelect:
        'Otevře Rychlý výběr pro filtrování a výběr objektů podle kritérií.',
      find: 'Otevře paletu Hledat pro hledání textu v celém výkresu nebo v aktuálním layoutu.',
      countList: 'Otevře paletu Počet pro zobrazení a správu počtu bloků.',
      missingResources:
        'Otevře paletu Chybějící / externí zdroje pro fonty, obrázky a externí reference.',
      drawingUnits:
        'Otevře Jednotky výkresu pro nastavení formátu souřadnic, přesnosti a měřítka vkládání.',
      propertyColor: 'Nastaví barvu nových nebo vybraných objektů.',
      propertyLineType: 'Nastaví typ čáry nových nebo vybraných objektů.',
      propertyLineWeight:
        'Nastaví tloušťku čáry nových nebo vybraných objektů.',
      circleOption: {
        centerRadius: 'Vytvoří kružnici zadáním středu a poloměru.',
        centerDiameter: 'Vytvoří kružnici zadáním středu a průměru.',
        twoPoint: 'Vytvoří kružnici, jejíž průměr je určen dvěma body.',
        threePoint: 'Vytvoří kružnici procházející třemi body.',
        tanTanRadius:
          'Vytvoří kružnici tečnou ke dvěma objektům se zadaným poloměrem.',
        tanTanTan: 'Vytvoří kružnici tečnou ke třem objektům.'
      },
      arcOption: {
        threePoint:
          'Vytvoří oblouk procházející počátečním, druhým a koncovým bodem.',
        startCenterEnd:
          'Vytvoří oblouk zadáním počátečního bodu, středu a koncového bodu.',
        startCenterAngle:
          'Vytvoří oblouk z počátečního bodu, středu a sevřeného úhlu.',
        startCenterLength:
          'Vytvoří oblouk z počátečního bodu, středu a délky oblouku.',
        startEndAngle:
          'Vytvoří oblouk z počátečního a koncového bodu se sevřeným úhlem.',
        startEndDirection:
          'Vytvoří oblouk z počátečního a koncového bodu se směrem tečny v počátečním bodě.',
        startEndRadius:
          'Vytvoří oblouk z počátečního a koncového bodu se zadaným poloměrem.',
        centerStartEnd:
          'Vytvoří oblouk zadáním středu, počátečního a koncového bodu.',
        centerStartAngle:
          'Vytvoří oblouk zadáním středu, počátečního bodu a sevřeného úhlu.',
        centerStartLength:
          'Vytvoří oblouk zadáním středu, počátečního bodu a délky oblouku.'
      },
      rectOption: {
        rectangle: 'Vytvoří obdélník zadáním protilehlých rohů nebo rozměrů.',
        polygon:
          'Vytvoří pravidelný mnohoúhelník zadáním počtu stran a způsobu konstrukce.'
      },
      ellipseOption: {
        ellipse: 'Vytvoří celou elipsu zadáním hlavní a vedlejší osy.',
        arc: 'Vytvoří eliptický oblouk zadáním os elipsy a mezí oblouku.'
      }
    },
    command: {
      line: 'Úsečka',
      polyline: 'Křivka',
      circle: 'Kružnice',
      arc: 'Oblouk',
      mline: 'Multičára',
      ray: 'Polopřímka',
      xline: 'Přímka',
      ellipse: 'Elipsa',
      spline: 'Splajn',
      sketch: 'Skica',
      revcloud: 'Revizní obláček',
      rect: 'Obdélník',
      rectangle: 'Obdélník',
      polygon: 'Mnohoúhelník',
      point: 'Bod',
      divide: 'Rozdělit',
      hatch: 'Šrafování',
      text: 'Text',
      gradient: 'Přechod',
      move: 'Posunout',
      rotate: 'Otočit',
      copy: 'Kopírovat',
      erase: 'Vymazat',
      offset: 'Ekvidistanta',
      undo: 'Zpět',
      redo: 'Znovu',
      properties: 'Vlastnosti',
      quickSelect: 'Rychlý\nvýběr',
      find: 'Hledat',
      countList: 'Počet',
      drawingUnits: 'Jednotky\nvýkresu'
    }
  },
  verticalToolbar: {
    measure: {
      text: 'Měření',
      description: 'Nástroje pro měření'
    },
    measureDistance: {
      text: 'Vzdálenost',
      description: 'Změří vzdálenost mezi dvěma body'
    },
    measureContinuous: {
      text: 'Spojité',
      description:
        'Měří řetězené vzdálenosti postupným zadáváním bodů, dokud nestisknete Enter nebo Zrušit'
    },
    measureAngle: {
      text: 'Úhel',
      description: 'Změří úhel mezi dvěma čarami se společným vrcholem'
    },
    measureArea: {
      text: 'Plocha',
      description: 'Změří plochu mnohoúhelníku'
    },
    measureArc: {
      text: 'Oblouk',
      description: 'Změří délku oblouku určeného třemi body'
    },
    measurePoint: {
      text: 'Bod',
      description: 'Změří souřadnice X/Y vybraného bodu'
    },
    measurementPanel: {
      text: 'Panel měření',
      description: 'Otevře paletu měření'
    },
    clearMeasurements: {
      text: 'Vymazat',
      description: 'Odstraní všechna měření z aktuálního rozvržení'
    },
    measurementImport: {
      text: 'Importovat',
      description: 'Importuje měření ze sidecar JSON souboru'
    },
    measurementExport: {
      text: 'Exportovat',
      description: 'Exportuje měření do sidecar JSON souboru'
    },
    pan: {
      text: 'Posun',
      description: 'Posune pohled beze změny směru pohledu a zvětšení'
    },
    measurementColor: {
      text: 'Barva',
      description:
        'Nastaví barvu vybraného měření, nebo měření, která přidáte příště'
    },
    measurementFontSize: {
      text: 'Výška textu',
      description:
        'Otevře nastavení výšky textu vybraného měření, nebo měření, která přidáte příště',
      fit: 'Fit',
      wcs: 'WCS'
    },
    showMeasurements: {
      text: 'Zobrazit',
      description: 'Zobrazí měření'
    },
    hideMeasurements: {
      text: 'Skrýt',
      description: 'Skryje měření'
    },
    select: {
      text: 'Vybrat',
      description: 'Vybírá objekty'
    },
    switchBg: {
      text: 'Pozadí',
      description: 'Přepne pozadí výkresu mezi bílým a černým',
      disabledInReadingMode: 'Nedostupné v režimu čtení (bílé plátno je pevné)'
    },
    zoom: {
      text: 'Zoom',
      description:
        'Nástroje zoomu: uložený pohled, rozsah, chytrý rozsah a okno'
    },
    zoomSaved: {
      text: 'Uložený',
      description:
        'Obnoví uložený pohled AutoCAD (VPORT / limity rozvržení) nebo pohled při otevření'
    },
    zoomToExtent: {
      text: 'Rozsah',
      description: 'Zvětší na maximální rozsah všech objektů'
    },
    zoomSmartExtents: {
      text: 'Chytrý',
      description:
        'Zvětší na dominantní geometrický shluk a ignoruje vzdálené odlehlé objekty'
    },
    zoomToBox: {
      text: 'Okno',
      description: 'Zvětší na oblast určenou obdélníkovým oknem'
    }
  },
  statusBar: {
    setting: {
      tooltip: 'Nastavení zobrazení',
      commandLine: 'Příkazový řádek',
      coordinate: 'Souřadnice',
      entityInfo: 'Informace o objektu',
      languageSelector: 'Volba jazyka',
      ribbon: 'Pás karet',
      toolbar: 'Panel nástrojů',
      stats: 'Statistiky'
    },
    osnap: {
      tooltip: 'Uchopení objektů',
      endpoint: 'Koncový bod',
      midpoint: 'Střed úsečky',
      center: 'Střed',
      node: 'Uzel',
      quadrant: 'Kvadrant',
      intersection: 'Průsečík',
      insertion: 'Bod vložení',
      nearest: 'Nejbližší'
    },
    pointStyle: {
      tooltip: 'Změnit styl bodu'
    },
    fullScreen: {
      on: 'Vypnout režim celé obrazovky',
      off: 'Zapnout režim celé obrazovky'
    },
    dynamicInput: {
      on: 'Vypnout dynamické zadávání',
      off: 'Zapnout dynamické zadávání'
    },
    lineWidth: {
      on: 'Skrýt tloušťky čar',
      off: 'Zobrazit tloušťky čar'
    },
    orthoMode: {
      on: 'Vypnout režim ortho',
      off: 'Zapnout režim ortho'
    },
    polarTracking: {
      on: 'Vypnout polární trasování',
      off: 'Zapnout polární trasování'
    },
    theme: {
      dark: 'Přepnout na světlý motiv',
      light: 'Přepnout na tmavý motiv'
    },
    warning: {
      font: 'Následující fonty nebyly nalezeny!'
    },
    notification: {
      tooltip: 'Zobrazit oznámení'
    },
    export: {
      tooltip: 'Exportovat obrázek jako PNG'
    },
    moreLayouts: 'Další rozvržení'
  },
  toolPalette: {
    entityProperties: {
      tab: 'Vlastnosti',
      title: 'Vlastnosti objektu',
      propertyPanel: {
        noEntitySelected: 'Není vybrán žádný objekt!',
        multipleEntitySelected: 'Vybráno objektů: {count}',
        propValCopied: 'Hodnota vlastnosti zkopírována',
        failedToCopyPropVal: 'Nepodařilo se zkopírovat hodnotu vlastnosti!'
      }
    },
    find: {
      tab: 'Hledat',
      title: 'Hledat',
      placeholder: 'Hledat text',
      input: 'Hledaný text',
      find: 'Hledat',
      matchCase: 'Rozlišovat velikost písmen',
      currentLayoutOnly: 'Pouze aktuální layout',
      hint: 'Stiskněte Enter pro hledání textu, víceřádkového textu, atributů a textu v blocích, kótách, odkazech a tabulkách v celém výkresu (všechny layouty).',
      hintLayout:
        'Stiskněte Enter pro hledání textu, víceřádkového textu, atributů a textu v blocích, kótách, odkazech a tabulkách v aktuálním layoutu.',
      noResults: 'Nebyl nalezen žádný text',
      count: 'Nalezeno: {count}',
      countLayouts: 'Nalezeno: {count} (layouty: {layouts})',
      countTruncated: 'Zobrazeno prvních {count} výsledků – upřesněte hledání',
      noDocument: 'Pro hledání otevřete výkres',
      layoutUnavailable: 'Layout „{layout}“ se nepodařilo otevřít',
      unnamedLayout: '(nepojmenovaný layout)',
      kind: {
        text: 'Text',
        mtext: 'Mtext',
        attribute: 'Atribut',
        block: 'Text bloku',
        dimension: 'Kóta',
        leader: 'Odkaz',
        table: 'Tabulka'
      }
    },
    countList: {
      tab: 'Počet',
      title: 'Počet',
      searchPlaceholder: 'Hledat název bloku',
      countInArea: 'Počet v oblasti',
      areaSet: 'Oblast počítání aktualizována',
      areaCleared: 'Počítám celý modelový prostor',
      blockName: 'Blok',
      count: 'Počet',
      empty: 'Nenalezeny žádné viditelné bloky',
      prompt: {
        firstCorner: 'Zadejte první roh oblasti počítání nebo [Celý]: ',
        secondCorner: 'Zadejte protilehlý roh: '
      }
    },
    measurements: {
      tab: 'Měření',
      title: 'Měření',
      empty: 'Zatím žádná měření',
      type: 'Typ',
      value: 'Hodnota',
      filterAll: 'Vše',
      delete: 'Odstranit',
      clear: 'Vymazat vše',
      typeValues: {
        distance: 'Vzdálenost',
        angle: 'Úhel',
        area: 'Plocha',
        arc: 'Oblouk',
        point: 'XY'
      }
    },
    missingResources: {
      tab: 'Zdroje',
      title: 'Chybějící / externí zdroje',
      fontTab: 'Font',
      fileReferences: 'Odkazy na soubory',
      details: 'Podrobnosti',
      foundAt: 'Nalezeno v',
      selectReference: 'Vyberte referenci pro zobrazení podrobností',
      expandDetails: 'Rozbalit podrobnosti',
      collapseDetails: 'Sbalit podrobnosti',
      apply: 'Použít',
      applyDone: 'Náhrady použity',
      emptyFonts: 'Žádné chybějící fonty',
      emptyImages: 'Žádné chybějící obrázky',
      matchFontType: 'Shodný typ fontu (SHX / mesh)',
      missedFont: 'Chybějící font',
      replacedFont: 'Náhradní font',
      selectFont: 'Vyberte font pro nahrazení',
      selectLocalFont: 'Vyberte místní soubor fontu',
      file: 'Soubor',
      name: 'Název',
      path: 'Uložená cesta',
      type: 'Typ',
      typeAttach: 'Připojení',
      typeOverlay: 'Překrytí',
      status: 'Stav',
      statusMissing: 'Chybí',
      statusLoaded: 'Načteno',
      actions: 'Akce',
      visible: 'Viditelné',
      browse: 'Procházet…',
      fromUrl: 'URL…',
      unload: 'Uvolnit',
      load: 'Načíst',
      empty: 'V tomto výkresu nejsou žádné externí reference ani obrázky',
      urlRequired: 'Zadejte prosím URL',
      loadFailed: 'Nepodařilo se načíst referenci „{name}“'
    },
    memoryProfile: {
      tab: 'Paměť',
      title: 'Profil paměti',
      refresh: 'Obnovit',
      collecting: 'Analyzuji paměť…',
      showPie: 'Zobrazit souhrnný graf',
      hidePie: 'Skrýt souhrnný graf',
      collectedAt: 'Získáno v {time}',
      heapUsed: 'JS halda {used} / {total}',
      estimateNote:
        'Velikosti geometrie vycházejí z byteLength bufferu. Ostatní kategorie jsou odhadnuté.',
      estimated: 'odh.',
      pieTotal: 'Započteno',
      pieAriaLabel: 'Rozdělení paměti podle kategorií',
      empty: 'Žádná data',
      missedFonts: 'Chybějící fonty',
      fontMemory: 'Paměť fontů / mtextu',
      fontMemorySummary: 'Paměť {live} (hlavní {main} · workery {workers})',
      fontStorage: 'Úložiště IndexedDB (nikoli paměť)',
      fontStorageSummary: '{count} fontů v mezipaměti · {size}',
      materialPoint: 'Bod',
      materialLine: 'Čára',
      materialFill: 'Výplň',
      materialTotal: 'Celkem',
      dataModelCounts: '{entities} entit · {objects} objektů · {total}',
      dataModelCategories: 'Podle kategorie',
      dataModelEntityTypes: 'Podle typu objektu',
      categories: {
        heap: 'JS halda',
        geometry: 'Geometrie',
        mapping: 'Mapování',
        spatial: 'Prostorový index',
        dataModel: 'Datový model',
        materials: 'Materiály',
        fonts: 'Fonty'
      },
      tabs: {
        geometry: 'Geometrie',
        spatial: 'Prostorové',
        dataModel: 'Datový model',
        materials: 'Materiály',
        fonts: 'Fonty'
      },
      columns: {
        layout: 'Rozvržení',
        layer: 'Hladina',
        geometry: 'Geometrie',
        mapping: 'Mapování',
        entities: 'Objekty',
        rootItems: 'Kořen',
        childItems: 'Potomci',
        estimated: 'Odh. velikost',
        type: 'Typ',
        count: 'Počet',
        category: 'Kategorie',
        font: 'Font'
      }
    }
  },
  colorDropdown: {
    custom: 'Vlastní'
  },
  lineTypeSelect: {
    placeholder: 'Typ čáry'
  },
  colorIndexPicker: {
    color: 'Barva: ',
    colorIndex: 'Index barvy: ',
    inputPlaceholder: '0-256, BYLAYER, BYBLOCK',
    rgb: 'RGB: '
  },
  entityInfo: {
    color: 'Barva',
    lineType: 'Typ čáry'
  },
  ribbonProperty: {
    color: 'Barva',
    lineType: 'Typ čáry',
    lineWeight: 'Tloušťka čáry',
    layer: 'Hladina'
  },
  message: {
    loadingFonts: 'Načítám fonty…',
    fontsNotFound: 'Fonty {fonts} nebyly nalezeny v úložišti fontů!',
    fontsNotLoaded: 'Fonty {fonts} se nepodařilo načíst!',
    fontMissedInDrawing:
      'Font „{font}“ je potřeba pro {count} textových objektů, ale není k dispozici. Zobrazeno fontem „{replacementFont}“.',
    fontMissedReplacement: '„{font}“ (zobrazeno fontem „{replacement}“)',
    fontCached: 'Font „{font}“ byl úspěšně uložen do mezipaměti.',
    fontCacheFailed: 'Nepodařilo se uložit font „{fileName}“ do mezipaměti.',
    failedToGetAvaiableFonts: 'Nepodařilo se získat dostupné fonty z „{url}“!',
    fetchingDrawingFile: 'Načítám soubor…',
    unknownEntities:
      'Tento výkres obsahuje {count} neznámých nebo nepodporovaných objektů! Tyto objekty nebudou zobrazeny.',
    tianzhengEntities:
      'Tento výkres obsahuje vlastní objekty TArch / Tianzheng (nebo podobné třetí strany) (asi {count}). V tomto prostředí je nelze plně zpracovat, takže se část obsahu nemusí zobrazit.',
    emptyProxyEntities:
      'Tento výkres obsahuje {count} vlastních objektů bez proxy grafiky! Tyto objekty nebudou zobrazeny.'
  },
  notification: {
    center: {
      title: 'Oznámení',
      clearAll: 'Vymazat vše',
      noNotifications: 'Žádná oznámení'
    },
    group: {
      fontMissed: 'Chybějící fonty',
      fontMissedSummary:
        '{count} zpráv o fontech. Kliknutím zobrazíte podrobnosti.',
      unsupportedEntities: 'Nepodporované objekty',
      unsupportedEntitiesSummary:
        '{count} zpráv o načítání. Kliknutím zobrazíte podrobnosti.',
      genericSummary: '{count} zpráv. Kliknutím zobrazíte podrobnosti.'
    },
    time: {
      justNow: 'Právě teď',
      minutesAgo: 'před {count} minutou | před {count} minutami',
      hoursAgo: 'před {count} hodinou | před {count} hodinami',
      daysAgo: 'před {count} dnem | před {count} dny'
    },
    title: {
      fontNotFound: 'Font nenalezen',
      fontNotLoaded: 'Font nenačten',
      parsingWarning: 'Problémy při načítání výkresu',
      systemMessage: 'Systémová zpráva',
      systemWarning: 'Systémové varování',
      systemError: 'Systémová chyba',
      systemInfo: 'Systémové informace'
    }
  }
}
