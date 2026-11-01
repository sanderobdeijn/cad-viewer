# CAD-Viewer (Português)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

O cad-viewer é um editor de desenhos CAD que funciona `inteiramente no navegador, sem depender de nenhum serviço de backend`. Cada sessão começa com um novo desenho em branco; os desenhos não são carregados de arquivos nem salvos neles.
O processamento geométrico e a renderização acontecem diretamente no navegador, o que torna o cad-viewer ideal para uso offline e fluxos de trabalho sensíveis à privacidade.

- [**🌐 Página inicial**](https://mlightcad.com/)
- **🌐 Demo ao vivo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Documentação da API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versionada) · [Servidor MCP](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## Recursos

- Renderização **de alto desempenho** de desenhos grandes a 60+ FPS suaves
- **Sem backend necessário** — Os arquivos são analisados e processados inteiramente no navegador
- **Segurança de dados aprimorada** — Os arquivos nunca saem do seu dispositivo, garantindo privacidade total
- **Integração fácil** — Sem configuração de servidor ou infraestrutura de backend
- Arquitetura modular para integração fluida com terceiros
- **Layout móvel e toque** — UI responsiva para telefone/tablet e gestos de toque (pinça para zoom, pan com um dedo, toque para selecionar) integrados em `@mlightcad/cad-simple-viewer`, sem necessidade de um app móvel separado
- Fluxos de trabalho de edição offline e online
- Motores de renderização 3D THREE.js com técnicas avançadas de otimização
- Projetado para extensibilidade e integração com plataformas como CMS, Notion e WeChat

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
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | **UI de barra de ferramentas e paleta de medições** para `cad-simple-viewer` (DOM puro, sem Vue/React) | `measurementpanel`, barra de ferramentas padrão (visualização, medição, tema, idioma) |

### `@mlightcad/cad-simple-ui-plugin` — Interface de usuário para o visualizador simples

O [`cad-simple-viewer`](packages/cad-simple-viewer) deliberadamente **não inclui UI de aplicativo** — apenas o canvas e o núcleo CAD. Se você incorporar o visualizador simples em seu próprio app web e quiser chrome pronto sem adotar o shell completo baseado em Vue do [`cad-viewer`](packages/cad-viewer), **`cad-simple-ui-plugin` é a camada de UI indicada**.

Ele fornece:

- Uma **barra de ferramentas configurável** (posicionamento em qualquer borda, comandos CAD padrão, menus aninhados, itens personalizados)
- Um **painel dock** com aba de **medições**
- **Sincronização de tema** com a sysvar `COLORTHEME` e tokens CSS `--ml-ui-*` no seu elemento host
- **Sincronização de locale** com `AcApI18n` (inglês / chinês / tcheco / turco)

Todos os widgets são agnósticos a framework (DOM puro). O app completo Vue [`cad-viewer`](packages/cad-viewer) tem sua própria UI Element Plus e não requer este plugin; use `cad-simple-ui-plugin` quando construir diretamente sobre `cad-simple-viewer`.

→ **Início rápido, personalização da barra de ferramentas e opções:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## Desempenho

O CAD-Viewer foi projetado para **desempenho excepcional** e pode lidar com desenhos muito grandes mantendo altas taxas de quadros. Ele emprega múltiplas tecnologias avançadas de renderização para otimizar o desempenho:

- **Materiais Shader personalizados**: Usa materiais shader acelerados por GPU para renderizar tipos de linha complexos e padrões de preenchimento hatch com eficiência
- **Agrupamento de geometria**: Mescla pontos, linhas e áreas com o mesmo material para reduzir drasticamente draw calls
- **Renderização instanciada**: Otimiza a renderização de geometrias repetidas por meio de técnicas de instancing
- **Otimização de Buffer Geometry**: Gerenciamento eficiente de memória e mesclagem de geometria para reduzir overhead de GPU
- **Cache de materiais**: Reutiliza materiais entre entidades similares para minimizar mudanças de estado
- **Otimização WebGL**: Aproveita recursos modernos de WebGL para renderização acelerada por hardware

Essas otimizações permitem que o CAD-Viewer renderize suavemente desenhos CAD complexos com milhares de entidades mantendo interações responsivas do usuário.

## Roteiro

O objetivo deste projeto é criar um **sistema 2D semelhante ao AutoCAD no navegador** (visualizador + editor), com arquitetura modular e integração agnóstica a framework.

Legenda:
- [x] Concluído
- [ ] Planejado
- [ ] ⏳ Em andamento

### Camada central de arquivos e dados

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
* [ ] Edição de cor, tipo de linha
* [x] Atualização ao vivo na mudança

#### Painéis e UI

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