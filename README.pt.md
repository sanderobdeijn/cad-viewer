# CAD-Viewer (Português)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

O cad-viewer é `o primeiro visualizador e editor web de DXF/DWG do mundo que funciona inteiramente no navegador, sem depender de nenhum serviço de backend`.
Ao realizar a análise de DWG/DXF, o processamento geométrico e a renderização diretamente no navegador, o cad-viewer possibilita visualização e edição CAD verdadeiramente serverless, ideal para aplicativos em nuvem, uso offline e fluxos de trabalho sensíveis à privacidade.

- [**🌐 Página inicial**](https://mlightcad.com/)
- **🌐 Demo ao vivo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Documentação da API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versionada) · [Servidor MCP](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

### Aplicativos construídos com cad-viewer

A equipe [Thingraph](https://cad.thingraph.site/) constrói visualizadores DWG/DXF em produção e integrações de plataforma sobre o cad-viewer, atendendo dezenas de milhares de usuários em todo o mundo:

- [DWG Viewer Web App](https://cad.thingraph.site/dwg-viewer) — Visualizador DWG/DXF baseado em navegador usado por equipes de engenharia em todo o mundo para acesso rápido e serverless a desenhos. Instale para sua plataforma:
  - [Google Drive](https://workspace.google.com/marketplace/app/dwg_viewer/641533811831) — abra DWG/DXF do Drive com **Abrir com**
  - [VS Code](https://marketplace.visualstudio.com/items?itemName=thingraph.dwg-viewer) — editor somente leitura personalizado para `.dwg` / `.dxf`
  - [Cursor](https://open-vsx.org/extension/thingraph/dwg-viewer) — mesma extensão via Open VSX
  - [Confluence](https://marketplace.atlassian.com/apps/2890472615/dwg-viewer-for-confluence) — incorpore pré-visualizações DWG/DXF em páginas
  - [Windows Explorer](https://cad.thingraph.site/install/windows) — miniatura e pré-visualização no Explorador de Arquivos

Aplicativos e integrações da comunidade:

- [flyfish-dev/cad-viewer](https://github.com/flyfish-dev/cad-viewer) — Visualizador CAD orientado à produção para DWG, DXF, DWF, DWFx e XPS ([demo ao vivo](https://cad-viewer-iys.pages.dev))
- [Nextcloud CAD Viewer](https://github.com/ashcoft/nextcloud-cad-viewer) — App nativo do Nextcloud para visualizar DWG/DXF no navegador ([App Store](https://apps.nextcloud.com/apps/cad_viewer))

Pacotes desktop Linux da comunidade:

- [CAD Viewer AppImage](https://github.com/pass-wind/cad-viewer-appimage) — AppImage baseado em Electron para Linux (~114 MB), testado no Fedora
- [cad-viewer (AUR)](https://aur.archlinux.org/packages/cad-viewer) — Pacote fonte Arch Linux usando Electron do sistema (~5,4 MB)
- [cad-viewer-bin (AUR)](https://aur.archlinux.org/packages/cad-viewer-bin) — Pacote binário Arch Linux com fontes/templates incluídos para abertura totalmente offline de desenhos

### Apps de demonstração (Demo Apps)

Apps de exemplo oficiais que mostram como integrar o cad-viewer no seu próprio produto:

- [cad-simple-viewer-example](https://github.com/mlightcad/cad-simple-viewer-example) — Host mínimo em TypeScript vanilla para [`@mlightcad/cad-simple-viewer`](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer): abra DXF/DWG locais ou de CDN, execute comandos por uma barra de ferramentas compacta e carregue sob demanda plugins de exportação HTML/PDF/SVG sem a UI Vue completa.
- [cad-viewer-example](https://github.com/mlightcad/cad-viewer-example) — App Vue 3 completa baseada em [`@mlightcad/cad-viewer`](https://www.npmjs.com/package/@mlightcad/cad-viewer) com menus, ribbons, diálogos, linha de comando e barra de status ([demo ao vivo](https://mlightcad.github.io/cad-viewer-example/)).
- [cad-viewer-nextjs-demo](https://github.com/mlightcad/cad-viewer-nextjs-demo) — Demo de “unidade CAD” em Next.js: upload retomável em chunks de DWG/DXF, lista de arquivos com SQLite e miniaturas de pré-visualização, e abertura com **parse ao vivo no navegador** (`cad-simple-viewer`) ou **pré-renderização ACEX no servidor** (abertura mais rápida, menos memória).

![Demonstração rápida do CAD-Viewer](./assets/cad-viewer.gif)

## Recursos

- Visualização **de alto desempenho** de arquivos DWG/DXF grandes com renderização suave a 60+ FPS
- **Sem backend necessário** — Os arquivos são analisados e processados inteiramente no navegador
- **Segurança de dados aprimorada** — Os arquivos nunca saem do seu dispositivo, garantindo privacidade total
- **Integração fácil** — Sem configuração de servidor ou infraestrutura de backend
- Arquitetura modular para integração fluida com terceiros
- **Layout móvel e toque** — UI responsiva para telefone/tablet e gestos de toque (pinça para zoom, pan com um dedo, toque para selecionar) integrados em `@mlightcad/cad-simple-viewer`, sem necessidade de um app móvel separado
- Fluxos de trabalho de edição offline e online
- Motores de renderização 3D THREE.js com técnicas avançadas de otimização
- Projetado para extensibilidade e integração com plataformas como CMS, Notion e WeChat

## Incorporar DWG/DXF com uma linha de código

Adicione visualização de DWG/DXF a qualquer site com um único `<iframe>` — sem backend CAD e sem enviar desenhos para a nuvem de terceiros. O arquivo é buscado da **sua** URL e analisado inteiramente no navegador do visitante, com ferramentas de revisão (pan, zoom, medição, anotação) prontas para uso.

```html
<iframe
  src="https://mlightcad.com/embed.html?url=https://example.com/plans/floor.dwg&mode=review&toolbar=1"
  style="width:100%;height:600px;border:0"
  allowfullscreen>
</iframe>
```

Artigo e playground ao vivo: [Embed DWG/DXF on Your Website Without Uploading a Single Byte](https://medium.com/@mlightcad/embed-dwg-dxf-on-your-website-without-uploading-a-single-byte-cf5f6ad484c4).

## Primeiros passos

### Pré-requisitos

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Instalação

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Desenvolvimento

```bash
# Iniciar o visualizador completo (cad-viewer)
pnpm dev

# Ou iniciar o visualizador simples
pnpm dev:simple
```

### Compilação

```bash
pnpm build
```

### Pré-visualização

```bash
# Pré-visualizar o visualizador completo
pnpm preview

# Pré-visualizar o visualizador simples
pnpm preview:simple
```

## Como usar

Novo no CAD Viewer? O **[guia do usuário](https://mlightcad.com/cad-viewer/docs/)** traz instruções passo a passo sobre a interface do visualizador, operações em desktop e toque, marcações e ferramentas de medição.

### Operações no navegador desktop
- **Selecionar**: Clique com o botão esquerdo nas entidades
- **Ampliar/reduzir zoom**: Role a roda do mouse para cima/baixo
- **Pan**: Segure o botão do meio do mouse e arraste
- **Apagar**: Selecione entidades e pressione a tecla `Del`

### Operações no navegador tablet/mobile
- **Selecionar**: Toque nas entidades
- **Zoom**: Pinça com dois dedos
- **Pan**: Arraste com um dedo

## Sistema de plugins

O CAD-Viewer é construído em torno de um **sistema de plugins** modular em [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer). Os plugins implementam a interface `AcApPlugin` e se conectam ao ciclo de vida do visualizador via `onLoad` / `onUnload` — normalmente para registrar comandos, adicionar UI ou conectar pipelines de exportação/importação.

Carregue plugins por meio de `AcApDocManager.instance.pluginManager` (`loadPlugin`, `registerLazyPlugin` ou `plugins.fromConfig` ao criar o gerenciador de documentos). Plugins suportam **lazy loading**: registre um stub pequeno antecipadamente e baixe o bundle pesado somente quando o usuário executar o comando relacionado.

O monorepo inclui vários plugins oficiais. Cada um foca em uma preocupação; combine-os conforme necessário. **Instalação, registro e detalhes da API estão no README de cada pacote** — veja os links abaixo.

### Plugins oficiais

| Pacote | Função | Comandos / capacidades |
|--------|--------|------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | **UI de barra de ferramentas, gerenciador de camadas e paleta de revisão** para `cad-simple-viewer` (DOM puro, sem Vue/React) | `layer`, `markuppanel`, barra de ferramentas padrão (visualização, medição, exportação, revisão, tema, idioma) |

### `@mlightcad/cad-simple-ui-plugin` — Interface de usuário para o visualizador simples

O [`cad-simple-viewer`](packages/cad-simple-viewer) deliberadamente **não inclui UI de aplicativo** — apenas o canvas e o núcleo CAD. Se você incorporar o visualizador simples em seu próprio app web e quiser chrome pronto sem adotar o shell completo baseado em Vue do [`cad-viewer`](packages/cad-viewer), **`cad-simple-ui-plugin` é a camada de UI indicada**.

Ele fornece:

- Uma **barra de ferramentas configurável** (posicionamento em qualquer borda, comandos CAD padrão, menus aninhados, itens personalizados)
- Um **painel dock** com aba de **gerenciador de camadas** (camada ligada/desligada, seletor de cor ACI, zoom para camada com duplo clique) e aba de **paleta de revisão** (lista de markups, status, comentários)
- **Sincronização de tema** com a sysvar `COLORTHEME` e tokens CSS `--ml-ui-*` no seu elemento host
- **Sincronização de locale** com `AcApI18n` (inglês / chinês / tcheco / turco)

Todos os widgets são agnósticos a framework (DOM puro). O app completo Vue [`cad-viewer`](packages/cad-viewer) tem sua própria UI Element Plus e não requer este plugin; use `cad-simple-ui-plugin` quando construir diretamente sobre `cad-simple-viewer`.

→ **Início rápido, personalização da barra de ferramentas e opções:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## Desempenho

O CAD-Viewer foi projetado para **desempenho excepcional** e pode lidar com arquivos DXF/DWG muito grandes mantendo altas taxas de quadros. Ele emprega múltiplas tecnologias avançadas de renderização para otimizar o desempenho:

- **Materiais Shader personalizados**: Usa materiais shader acelerados por GPU para renderizar tipos de linha complexos e padrões de preenchimento hatch com eficiência
- **Agrupamento de geometria**: Mescla pontos, linhas e áreas com o mesmo material para reduzir drasticamente draw calls
- **Renderização instanciada**: Otimiza a renderização de geometrias repetidas por meio de técnicas de instancing
- **Otimização de Buffer Geometry**: Gerenciamento eficiente de memória e mesclagem de geometria para reduzir overhead de GPU
- **Cache de materiais**: Reutiliza materiais entre entidades similares para minimizar mudanças de estado
- **Otimização WebGL**: Aproveita recursos modernos de WebGL para renderização acelerada por hardware

Essas otimizações permitem que o CAD-Viewer renderize suavemente desenhos CAD complexos com milhares de entidades mantendo interações responsivas do usuário.

## Problemas conhecidos

O caminho DWG open-source padrão é baseado em [LibreDWG](https://github.com/LibreDWG/libredwg) por meio do pacote opcional `@mlightcad/libredwg-converter`. Funciona bem para muitos desenhos, mas sua cobertura de entidades ainda é limitada, o bundle WASM é muito maior, a inicialização é mais lenta, o uso de memória é alto e arquivos DWG muito grandes podem encontrar erros de falta de memória. Também introduz considerações de licenciamento GPL para produtos comerciais closed-source. O `@mlightcad/cad-simple-viewer` **não** depende nem registra esse conversor por padrão — os apps host (veja os pacotes de exemplo) optam explicitamente.

Se você precisa de melhor compatibilidade, menor uso de memória, suporte a arquivos grandes ou uma história de licenciamento comercial mais limpa, veja nosso [**parser DWG proprietário**](./PROPRIETARY-PARSER.md).

| Item | Parser baseado em LibreDWG | Parser DWG proprietário |
|------|----------------------------|-------------------------|
| Entidades suportadas | Cobertura limitada | Cobertura mais ampla |
| Tamanho do bundle | ~13 MB | ~437 KB |
| Velocidade de carregamento | Inicialização mais lenta | Inicialização muito mais rápida |
| Uso de memória | Maior | Menor |
| Arquivos DWG grandes | Pode causar OOM em arquivos grandes | Sem esse problema |
| Licença | Risco de propagação GPL | Sem problema de propagação GPL |

## Roteiro

O objetivo deste projeto é criar um **sistema 2D semelhante ao AutoCAD no navegador** (visualizador + editor), com arquitetura modular e integração agnóstica a framework.

Legenda:
- [x] Concluído
- [ ] Planejado
- [ ] ⏳ Em andamento

### Camada central de arquivos e dados

#### Suporte a arquivos

* [x] Carregamento DXF
* [x] Carregamento DWG
* [x] Streaming de arquivos grandes / carregamento incremental
* [ ] ⏳ Compatibilidade de versão de arquivo (R12–Latest)

#### Modelo de dados

* [x] Modelo de dados unificado de entidades
* [x] Suporte a tabela de camadas
* [x] Estrutura de bloco / insert
* [ ] ⏳ Gerenciamento de handle e object ID: atualmente objectId é igual ao handle e representado como uma string em vez de bigint (int64).
* [ ] ⏳ Suporte a XData / dicionário de extensão
* [ ] Tratamento de entidades proxy

### Renderização e desempenho

#### Motor de renderização

* [x] Renderização baseada em WebGL (Three.js)
* [x] Pipeline otimizado apenas 2D
* [x] Organização de cena baseada em camadas
* [x] Renderização de layout / paper space
* [ ] Suporte a entidade viewport

#### Otimização de desempenho

* [x] Mesclagem e agrupamento de geometria
* [x] Indexação espacial (básica)
* [x] Índice espacial avançado (R-tree / BVH)
* [ ] Renderização level-of-detail (LOD)
* [ ] Multi-canvas / renderização em tiles para desenhos muito grandes

### Visualização e navegação

#### Controles de visualização

* [x] Panorâmica
* [x] Zoom (roda / zoom por janela)
* [x] Ajustar à visualização / extensão
* [ ] Visualizações nomeadas
* [ ] Histórico de visualização (desfazer / refazer mudanças de visualização)

#### Controles de exibição

* [x] Visibilidade de camada ligada/desligada
* [x] Congelar / bloquear camada
* [x] Exibição de espessura de linha
* [ ] Escala de tipo de linha
* [x] Alternância de fundo / tema

### Seleção e interação

#### Seleção

* [x] Seleção de entidade única
* [x] Destacar entidades selecionadas
* [x] Seleção por janela
* [x] Seleção por cruzamento
* [x] Filtros de seleção (por tipo / camada)
* [x] Ciclo de seleção

#### Captura (OSNAP)

* [x] Ponto final
* [x] Ponto médio
* [x] Centro
* [x] Interseção
* [ ] Perpendicular / tangente
* [x] Mais próximo
* [ ] Rastreamento de captura


### Edição e modificação

#### Edição básica

* [x] Framework de edição de entidades
* [x] Mover
* [x] Copiar
* [x] Rotacionar
* [ ] Escalar
* [x] Excluir
* [x] Desfazer / refazer

#### Edição geométrica

* [x] Pontos de aderência
* [ ] Esticar
* [ ] Recortar
* [ ] Estender
* [x] Deslocamento
* [ ] Explodir
* [ ] Unir / filete / chanfro (2D)

### Ferramentas de desenho e criação

#### Entidades básicas

* [x] Linha
* [x] Polilinha
* [x] Spline
* [x] Círculo
* [x] Arco
* [x] Elipse
* [x] Retângulo / polígono

#### Entidades avançadas

* [x] Hachura
* [ ] Texto (linha única / multilinha)
* [ ] Cotas (linear, alinhada, angular)
* [ ] Criação e inserção de blocos

### Medição

* [x] Distância
* [x] Comprimento de arco
* [x] Área
* [x] Ângulo
* [ ] Coordenada
* [ ] Estatísticas de entidades (comprimento, área, contagem)

### Cota

* [x] Cota linear
* [ ] Cota angular
* [ ] Coordenada

### Propriedades e painéis de UI

#### Paleta de propriedades

* [x] Propriedades da entidade selecionada
* [ ] Edição de camada, cor, tipo de linha
* [x] Atualização ao vivo na mudança

#### Painéis e UI

* [x] Gerenciador de camadas
* [ ] Gerenciador de blocos
* [x] Histórico de comandos / console
* [x] Barra de status (captura, ortogonal, grade)

#### Sistema de comandos

* [x] Registro de comandos
* [x] Aliases de comandos
* [x] Prompts de comando (estilo AutoCAD)

### Integração e extensibilidade

#### Integração com frameworks

* [x] Núcleo agnóstico a framework
* [ ] Exemplo de integração React
* [x] Exemplo de integração Vue
* [ ] Integração OpenLayers / Map
* [ ] Incorporação CMS / Notion

#### Sistema de plugins

* [x] API de plugins
* [ ] Suporte a entidades personalizadas
* [x] Comando personalizado

### Edição offline e online

#### Editor offline

* [x] Edição local no navegador
* [ ] Salvar conjunto de alterações / diff
* [ ] Persistência IndexedDB

#### Editor online

* [ ] Design de API de backend
* [ ] Autenticação de usuário
* [ ] Versionamento de arquivos
* [ ] Controle de acesso multiusuário
* [ ] Colaboração em tempo real (futuro)

### Plataformas-alvo

* [ ] Visualizador WeChat Mini Program
* [x] Suporte a navegador mobile (layout responsivo e gestos de toque)

### Documentação e comunidade

* [x] Documentação de arquitetura
* [x] Referência de API
* [ ] Guia de contribuição
* [x] Projetos de exemplo
* [x] Manutenção de roteiro e changelog

Este roteiro é intencionalmente granular para que os colaboradores possam ver claramente **o que existe**, **o que falta** e **onde a ajuda é necessária**.

## Contribuindo

Contribuições são bem-vindas! Abra issues ou pull requests para correções de bugs, novos recursos ou sugestões. Para relatórios de bug, fornecer um link para o desenho problemático ajudará a reproduzir e corrigir o problema.

## Licença

O monorepo cad-viewer é licenciado principalmente sob [MIT](LICENSE).

O carregamento DXF usa o parser MIT integrado em `@mlightcad/data-model`. O carregamento DWG é **opt-in**: o `@mlightcad/cad-simple-viewer` não depende de pacotes GPL do LibreDWG. Hosts que desejam suporte DWG open-source adicionam `@mlightcad/libredwg-converter` (GPL-3.0) por conta própria, implantam o worker + wasm e registram o conversor. Se você distribui um produto closed-source e não pode distribuir código GPL aos seus clientes, use o [**parser DWG proprietário**](./PROPRIETARY-PARSER.md).

→ **Parser comercial:** [PROPRIETARY-PARSER.md](./PROPRIETARY-PARSER.md) (escopo, licenciamento, preços, integração, conformidade GPL, suporte)
