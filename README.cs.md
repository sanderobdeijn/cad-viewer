# CAD-Viewer (Čeština)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

cad-viewer je CAD editor výkresů, který běží `zcela v prohlížeči a nevyžaduje žádné backendové služby`. Každá relace začíná novým prázdným výkresem; výkresy se nenačítají ze souborů ani se do nich neukládají.
Zpracování geometrie a vykreslování probíhá přímo v prohlížeči, díky čemuž je cad-viewer ideální pro offline použití a pracovní postupy citlivé na soukromí.

- [**🌐 Domovská stránka**](https://mlightcad.com/)
- **🌐 Živé demo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Dokumentace API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (verzovaná) · [MCP server](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## Funkce

- **Vysoký výkon** — vykreslování rozsáhlých výkresů s plynulými 60+ FPS
- **Bez backendu** — soubory se parsují a zpracovávají zcela v prohlížeči
- **Vyšší bezpečnost dat** — soubory nikdy neopustí vaše zařízení, zajištění úplného soukromí
- **Snadná integrace** — není potřeba nastavení serveru ani backendové infrastruktury
- Modulární architektura pro bezproblémovou integraci třetích stran
- **Mobilní rozložení a dotykové ovládání** — responzivní UI pro telefon/tablet a dotyková gesta (štípnutí pro zoom, posun jedním prstem, klepnutí pro výběr) vestavěná v `@mlightcad/cad-simple-viewer`, bez nutnosti samostatné mobilní aplikace
- Offline i online editační pracovní postupy
- 3D vykreslovací engine THREE.js s pokročilými optimalizačními technikami
- Navrženo pro rozšiřitelnost a integraci s platformami jako CMS, Notion a WeChat

## Začínáme

### Požadavky

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Instalace

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Vývoj

```bash
# Spustit plnohodnotný prohlížeč (cad-viewer)
pnpm dev

# Nebo spustit jednoduchý prohlížeč
pnpm dev:simple
```

### Sestavení

```bash
pnpm build
```

### Náhled

```bash
# Náhled plnohodnotného prohlížeče
pnpm preview

# Náhled jednoduchého prohlížeče
pnpm preview:simple
```

## Jak používat

Jste v CAD Viewer noví? **[Uživatelská příručka](https://mlightcad.com/cad-viewer/docs/)** nabízí podrobné návody k rozhraní prohlížeče, ovládání na počítači i dotykových zařízeních a k nástrojům pro poznámky a měření.

### Ovládání v desktopovém prohlížeči
- **Výběr**: levé tlačítko myši na entitách
- **Přiblížení/oddálení**: kolečko myši nahoru/dolů
- **Posun**: podržte prostřední tlačítko myši a táhněte
- **Smazání**: vyberte entity a stiskněte klávesu `Del`

### Ovládání v prohlížeči na tabletu/mobilu
- **Výběr**: klepněte na entity
- **Přiblížení**: stažení dvěma prsty
- **Posun**: tažení jedním prstem

## Systém pluginů

CAD-Viewer je postaven kolem modulárního **systému pluginů** v [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer). Pluginy implementují rozhraní `AcApPlugin` a napojují se na životní cyklus prohlížeče přes `onLoad` / `onUnload` — typicky pro registraci příkazů, přidání UI nebo propojení exportních/importních pipeline.

Pluginy načítejte přes `AcApDocManager.instance.pluginManager` (`loadPlugin`, `registerLazyPlugin` nebo `plugins.fromConfig` při vytváření správce dokumentů). Pluginy podporují **lazy loading**: zaregistrujte malý stub předem a stáhněte těžký balíček až když uživatel spustí související příkaz.

Monorepo dodává několik oficiálních pluginů. Každý se zaměřuje na jednu oblast; kombinujte je podle potřeby. **Instalace, registrace a podrobnosti API jsou v README každého balíčku** — viz odkazy níže.

### Oficiální pluginy

| Balíček | Účel | Příkazy / schopnosti |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | **Panel nástrojů a paleta měření** pro `cad-simple-viewer` (čisté DOM, bez Vue/React) | `measurementpanel`, výchozí panel nástrojů (zobrazení, měření, motiv, jazyk) |

### `@mlightcad/cad-simple-ui-plugin` — UI vrstva pro jednoduchý prohlížeč

[`cad-simple-viewer`](packages/cad-simple-viewer) záměrně **nedodává aplikační UI** — pouze plátno a CAD jádro. Pokud vkládáte jednoduchý prohlížeč do vlastní webové aplikace a chcete hotovou UI vrstvu bez plné Vue [`cad-viewer`](packages/cad-viewer) shell aplikace, **`cad-simple-ui-plugin` je určená UI vrstva**.

Poskytuje:

- **Konfigurovatelný panel nástrojů** (umístění na libovolném okraji, výchozí CAD příkazy, vnořená menu, vlastní položky)
- **Dokovací panel** se záložkou **měření**
- **Synchronizaci motivu** se sysvar `COLORTHEME` a CSS tokeny `--ml-ui-*` na hostitelském elementu
- **Synchronizaci jazyka** s `AcApI18n` (angličtina / čínština / čeština / turečtina)

Všechny widgety jsou nezávislé na frameworku (čisté DOM). Plná Vue aplikace [`cad-viewer`](packages/cad-viewer) má vlastní Element Plus UI a tento plugin nevyžaduje; použijte `cad-simple-ui-plugin`, když stavíte přímo na `cad-simple-viewer`.

→ **Rychlý start, přizpůsobení panelu nástrojů a možnosti:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## Výkon

CAD-Viewer je navržen pro **výjimečný výkon** a zvládne velmi rozsáhlé výkresy při zachování vysoké snímkové frekvence. Využívá několik pokročilých vykreslovacích technologií pro optimalizaci výkonu:

- **Vlastní shader materiály**: GPU-akcelerované shader materiály pro efektivní vykreslování složitých typů čar a vzorů výplně šrafování
- **Dávkování geometrie**: slučování bodů, čar a ploch se stejným materiálem pro výrazné snížení počtu draw callů
- **Instancované vykreslování**: optimalizace vykreslování opakující se geometrie pomocí instancing technik
- **Optimalizace buffer geometrie**: efektivní správa paměti a slučování geometrie pro snížení GPU režie
- **Cache materiálů**: opakované použití materiálů u podobných entit pro minimalizaci změn stavu
- **WebGL optimalizace**: využití moderních WebGL funkcí pro hardwarově akcelerované vykreslování

Tyto optimalizace umožňují CAD-Viewer plynule vykreslovat složité CAD výkresy s tisíci entitami při zachování responzivní interakce s uživatelem.

## Plán vývoje

Cílem tohoto projektu je vytvořit plnohodnotný **2D systém podobný AutoCADu v prohlížeči** (prohlížeč + editor) s modulární architekturou a integrací nezávislou na frameworku.

Legenda:
- [x] Dokončeno
- [ ] Plánováno
- [ ] ⏳ Probíhá

### Jádro souborů a datové vrstvy

#### Datový model

* [x] Jednotný datový model entit
* [x] Podpora tabulky vrstev
* [x] Struktura bloků / vložení
* [ ] ⏳ Správa handle a object ID: v současnosti je objectId stejný jako handle a reprezentován jako jeden řetězec místo bigint (int64).
* [ ] ⏳ Podpora XData / rozšiřujícího slovníku
* [ ] Zpracování proxy entit

### Vykreslování a výkon

#### Vykreslovací engine

* [x] Vykreslování založené na WebGL (Three.js)
* [x] Pipeline optimalizovaná pouze pro 2D
* [x] Organizace scény podle vrstev
* [x] Vykreslování layoutu / papírového prostoru
* [ ] Podpora entit viewportu

#### Optimalizace výkonu

* [x] Slučování a dávkování geometrie
* [x] Prostorové indexování (základní)
* [x] Pokročilý prostorový index (R-tree / BVH)
* [ ] Vykreslování s úrovní detailu (LOD)
* [ ] Více pláten / dlaždicové vykreslování pro velmi rozsáhlé výkresy

### Prohlížení a navigace

#### Ovládání zobrazení

* [x] Posun
* [x] Přiblížení (kolečko / rámečkové přiblížení)
* [x] Přizpůsobení zobrazení / rozsah
* [ ] Pojmenovaná zobrazení
* [ ] Historie zobrazení (zpět / vpřed u změn zobrazení)

#### Ovládání zobrazení obsahu

* [x] Zobrazení tloušťky čar
* [ ] Měřítko typů čar
* [x] Přepínání pozadí / motivu

### Výběr a interakce

#### Výběr

* [x] Výběr jedné entity
* [x] Zvýraznění vybraných entit
* [x] Výběr oknem
* [x] Křížový výběr
* [x] Filtry výběru (podle typu / vrstvy)
* [x] Cyklický výběr

#### Přichycení (OSNAP)

* [x] Koncový bod
* [x] Střed
* [x] Střed kružnice
* [x] Průsečík
* [ ] Kolmice / tečna
* [x] Nejbližší
* [ ] Sledování přichycení


### Úpravy a modifikace

#### Základní úpravy

* [x] Rámec pro úpravu entit
* [x] Posun
* [x] Kopírování
* [x] Otočení
* [ ] Měřítko
* [x] Smazání
* [x] Zpět / vpřed

#### Úpravy geometrie

* [x] Úchopové body
* [ ] Protažení
* [ ] Oříznutí
* [ ] Prodloužení
* [x] Odsazení
* [ ] Rozložení
* [ ] Spojení / zaoblení / zkosení (2D)

### Kreslení a nástroje pro tvorbu

#### Základní entity

* [x] Čára
* [x] Polyline
* [x] Spline
* [x] Kružnice
* [x] Oblouk
* [x] Elipsa
* [x] Obdélník / polygon

#### Pokročilé entity

* [x] Šrafování
* [ ] Text (jednořádkový / víceřádkový)
* [ ] Kóty (lineární, zarovnané, úhlové)
* [ ] Vytváření a vkládání bloků

### Měření

* [x] Vzdálenost
* [x] Délka oblouku
* [x] Plocha
* [x] Úhel
* [ ] Souřadnice
* [ ] Statistiky entit (délka, plocha, počet)

### Kóty

* [x] Lineární kóta
* [ ] Úhlová kóta
* [ ] Souřadnice

### Vlastnosti a UI panely

#### Paleta vlastností

* [x] Vlastnosti vybrané entity
* [ ] Úprava barvy, typu čáry
* [x] Živá aktualizace při změně

#### Panely a UI

* [ ] Správce bloků
* [x] Historie příkazů / konzole
* [x] Stavový řádek (přichycení, orto, mřížka)

#### Systém příkazů

* [x] Registr příkazů
* [x] Aliasy příkazů
* [x] Výzvy příkazů (ve stylu AutoCADu)

### Integrace a rozšiřitelnost

#### Integrace frameworků

* [x] Jádro nezávislé na frameworku
* [ ] Příklad integrace React
* [x] Příklad integrace Vue
* [ ] Integrace OpenLayers / Map
* [ ] Vkládání do CMS / Notion

#### Systém pluginů

* [x] Plugin API
* [ ] Podpora vlastních entit
* [x] Vlastní příkaz

### Offline a online úpravy

#### Offline editor

* [x] Lokální úpravy v prohlížeči
* [ ] Uložení sady změn / diff
* [ ] Perzistence IndexedDB

#### Online editor

* [ ] Návrh backend API
* [ ] Autentizace uživatelů
* [ ] Verzování souborů
* [ ] Řízení přístupu pro více uživatelů
* [ ] Real-time spolupráce (budoucnost)

### Cílové platformy

* [ ] Prohlížeč pro WeChat Mini Program
* [x] Podpora mobilního prohlížeče (responzivní rozložení a dotykové ovládání)

### Dokumentace a komunita

* [x] Dokumentace architektury
* [x] Referenční dokumentace API
* [ ] Průvodce pro přispěvatele
* [x] Ukázkové projekty
* [x] Údržba plánu vývoje a changelogu

Tento plán vývoje je záměrně podrobný, aby přispěvatelé jasně viděli, **co existuje**, **co chybí** a **kde je potřeba pomoc**.

## Přispívání

Příspěvky jsou vítány! Otevírejte issue nebo pull requesty pro opravy chyb, nové funkce nebo návrhy. U hlášení chyb pomůže poskytnutí odkazu na problematický výkres při reprodukci a opravě problému.

## Licence

Monorepo cad-viewer je primárně licencováno pod [MIT](LICENSE).