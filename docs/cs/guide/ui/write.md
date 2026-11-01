---
title: Režim zápisu
---

# Režim zápisu

Režim zápisu podporuje přímé vytváření, úpravy a mazání entit — skutečné kreslení na webu. Každá relace začíná novým prázdným výkresem.

## Desktop

### Celkové rozložení

<WriteModeLayout />

### Horní Ribbon

Ribbon plně zobrazuje všechny karty ve stylu AutoCAD:

| Karta | Příkazy |
|---|---|
| Soubor | Otevřít |
| Kreslení | Čára, Kružnice, Oblouk, Obdélník, Polylinie, Šrafování, Text, MText atd. |
| Úpravy | Přesun, Kopírovat, Odsazení, Oříznout, Prodloužit, Otočit, Měnit měřítko, Zrcadlit, Pole atd. |
| Vlastnosti | Barva, typ čáry, tloušťka čáry |
| Měření | Všechny příkazy měření |

### Command Line

Okno Command Line ve spodní části plátna umožňuje přímo zadávat názvy příkazů (např. `L` + Enter pro nakreslení čáry, `C` + Enter pro nakreslení kružnice). Podporuje:
- Zobrazování výzev příkazů a historie
- Zadávání číselných hodnot a souřadnic
- Používání šipek nahoru/dolů pro procházení historie příkazů

### Pravý panel nástrojů

Panel nástrojů obsahuje také **Skupinu nástrojů pro výběr / úpravy**:

- Vybrat
- Posun
- Přiblížit na rozsah
- Přiblížit oknem
- Skupina měřicích nástrojů
- Režim čtení
- Přepnout světlé/tmavé pozadí

### Ukotvené panely

| Panel | Popis |
|---|---|
| Vlastnosti | Vlastnosti vybrané entity (typ, souřadnice, barva, typ čáry, tloušťka čáry atd.), upravitelné |
| Měření | Správa výsledků měření |
| Statistiky | Statistiky používání bloků |
| Chybějící prostředky | Upozornění na písma / externí odkazy |

### Stavový panel

Úplný stavový panel CAD, zleva doprava:

| Oblast | Popis |
|---|---|
| Karty rozložení | Přepínání prostoru modelu / rozložení |
| Výzva příkazu | Text výzvy pro aktuálně aktivní příkaz (např. „Zadejte počáteční bod:“) |
| Souřadnice | Souřadnice kurzoru v reálném čase |
| OSNAP | Přepnutí a konfigurace uchopování objektů |
| ORTHO | Kolmý režim |
| POLAR | Polární sledování |
| Sledování uchopování objektů (OTRACK) | |
| Zobrazení tloušťky čáry | |
| Dynamický vstup | Přepnutí plovoucího vstupního pole |
| Isometrické zobrazení | |
| Motiv | |
| Celá obrazovka | |

## Tablet (Pad)

Rozložení tabletu je mezi desktopem a mobilem, ale režim zápisu zachovává úplné komponenty potřebné pro úpravy:

- Ribbon zachovává úplné karty, ale tlačítka příkazů se sbalí na ikony
- Pravý panel nástrojů je zachován
- Command Line je ve výchozím stavu sbalená do malé lišty; kliknutím rozbalíte
- Ukotvené panely lze rozbalit jako postranní zásuvky
- Stavový panel zobrazuje základní tlačítka ve zjednodušené podobě

## Mobil

V režimu zápisu na mobilu jsou Command Line a úplné možnosti kreslení/úprav implementovány prostřednictvím **Mobilního překryvu příkazů**, který nahrazuje spodní lištu karet.

### Překryv příkazů

Při spuštění příkazu kreslení nebo úprav se ve spodní části obrazovky objeví panel operací příkazu, který obsahuje:
- Aktuální výzvu příkazu
- Tlačítka ✓ Potvrdit / ✗ Zrušit
- Vyskakovací panel dynamického vstupu (DYN)

### Metody vstupu

Mobilní kreslení používá následující metody vstupu:
- **Zadání bodu klepnutím**: klepněte na obrazovku (<0,5 s) pro vytvoření bodu
- **Zadání bodu tažením**: dlouze stiskněte obrazovku (>0,5 s), vstupte do režimu výběru tažením a uvolněte
- **Simulovaná myš**: ve výchozím stavu zapnuto; při dlouhém stisku se nad prstem objeví zaměřovač; skutečná pozice vstupu je založena na zaměřovači
- **Lupa**: přepínač v nastavení; kruhová lupa HUD zvětší oblast prstu

### Automatické vrácení

Během provádění příkazu je stavový panel dočasně skryt (vstup přebírá překryv příkazů). Po skončení příkazu je stavový panel obnoven.
