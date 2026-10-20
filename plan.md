# Plano — Gerador de Schema para PDP de Carros

## Escopo e leitura da referência

O arquivo `tracker-2027-jsonld-v2.txt` foi lido integralmente e inspecionado como JSON: 4.364 linhas, JSON válido, um `@graph` com 63 entidades identificadas por `@id`. O modelo inclui `Organization`, `WebSite`, `WebPage`, `ProductGroup`, cinco `Vehicle`, `ItemList`, `FAQPage`, `BreadcrumbList` e 51 `ImageObject`, além de entidades aninhadas `Brand`, `EngineSpecification`, `QuantitativeValue`, `PropertyValue`, `Question`, `Answer` e `ListItem`. O texto não contém `Product`, `Offer` nem `VideoObject`; estes dois primeiros serão gerados quando apropriados e `VideoObject` somente quando os dados mínimos forem válidos.

Placeholders identificados: 25 `PREENCHER_COM_VALORES`, 2 tokens específicos de cores e 410 ocorrências de `PREENCHER` (metadados de imagem repetidos). O app não herdará os dados publicitários/especificações de exemplo da Chevrolet, para não apresentar informações como fatos sobre outro veículo. Placeholders importados ou digitados serão reconhecidos, reportados e excluídos dos schemas. Dados opcionais em branco serão omitidos.

## Mapeamento do TXT para o formulário e a geração

- **Identidade e página:** URL canônica, URL raiz/nome do site, idioma, título e descrição da página. `WebPage` aponta para `WebSite`, breadcrumb, entidade principal e mídia por `@id`; `WebSite.publisher` referencia `Organization` quando fornecida. Sem URL de PDP válida não há identificadores rastreáveis e a geração/exportação acusa erro.
- **Organização e marca:** nome/URL e campos de contato/logotipo/links da `Organization`; nome/URL/links de `Brand`; fabricante separado. Entidades só são emitidas com dados reais. Marca e fabricante referenciam entidades do grafo; dados de organização coincidentes são reutilizados, não duplicados.
- **Modelo e variações:** marca/modelo, ano, carroceria, categoria, texto descritivo, características e dimensões comuns. `ProductGroup` e `ItemList` relacionam as versões quando o grupo/lista é pertinente; a versão única continua utilizável sem entidade de agrupamento vazia. `hasVariant`, `isVariantOf`, `mainEntity`, `itemListElement` e posição serão construídos com IDs gerados deterministicamente e verificados.
- **Cada versão (`Vehicle` + `Product` no mesmo nó/ID):** nome/configuração, ano, imagens, cores exteriores/interiores, carroceria, combustível, tração, transmissão, portas, assentos, airbags, porta-malas/capacidade de combustível, consumo urbano/rodoviário por combustível, CO₂, comprimento/largura/altura/entre-eixos, torque, motor, cilindros, cilindrada, potência e equipamentos. Números são números JSON, nunca strings numéricas; quantitativos incluem unidade explícita. As potências e torques distintos por gasolina/etanol entram em `additionalProperty` como `PropertyValue` quando informados.
- **Mídia:** múltiplos `ImageObject` gerais ou associados a uma versão, com URL, thumbnail, nome/alt, legenda/descrição, formato, bytes, dimensões em pixels, datas, créditos, direitos e licença. Duplicatas pela mesma URL são consolidadas e reutilizadas. `VideoObject` aceita `contentUrl` ou `embedUrl`; só entra no grafo com nome, miniatura, data de upload e URL válida, com pendências visíveis caso contrário. Página e produto relacionam a mídia usando IDs existentes.
- **Listas e conteúdo adicional:** breadcrumbs repetíveis formam `BreadcrumbList`; FAQs só formam `FAQPage` quando pergunta e resposta estão preenchidas; equipamentos viram `PropertyValue`. Cores são listas independentes e deduplicadas, tanto comuns quanto específicas por versão.
- **Oferta:** oferta opcional por versão; `Offer` só é criado quando preço numérico e moeda são informados (e URL/validade/disponibilidade quando fornecidas). A versão a referencia por `offers` e a oferta aponta de volta com `itemOffered`.
- **Correções técnicas:** converter `QuantitativeValue.value` para number; descartar placeholders em vez de deixá-los como valores; não serializar campos vazios; usar `E37` para pixels e preservar códigos de unidade métricos/capacidade; remover referências inline duplicadas e usar `@id` no `@graph`; deduplicar URLs de mídia; criar `VideoObject` sob condição; não emitir `Offer` sem preço/moeda. Todos os tipos e referências são validados antes de permitir exportação.

## Abordagem de implementação

Aplicação Web React + TypeScript/Vite, sem servidor e sem banco gerenciado: é um editor local, por isso estado, projetos e schema permanecem no navegador. Persistência automática versionada em `localStorage`, com ações explícitas de salvar, duplicar, renomear, criar e excluir, além de exportação/importação de arquivo de projeto JSON para backup/transferência. Projetos ficam isolados por ID. Isso não sincroniza entre navegadores ou dispositivos e pode ser removido se o armazenamento do navegador for limpo.

O motor será puro, tipado e separado da interface: modelo de formulário → normalização/validação → construção do grafo → checagem JSON, IDs únicos e referências internas → serialização formatada. Não fará requisições de rede para validar URLs nem inventará propriedades/dados; valida formato e esquema dos valores localmente. Um único editor de código apresentará todo o JSON-LD (`@context` + um `@graph`); copiar copia tudo, download JSON salva esse objeto completo e download HTML envolve o mesmo objeto em exatamente um `<script type="application/ld+json">`. Erros bloqueiam exportação; avisos de opcionais ausentes continuam permitidos; itens incompletos/placeholders são omitidos e aparecem como pendências.

### Estrutura prevista

- `src/model/types.ts` — tipos TypeScript para projeto, marca, organizações, versões, especificações, ofertas, mídia, breadcrumbs e FAQ.
- `src/lib/generator.ts` — normalização, construção pura de IDs/entidades `@graph`, deduplicação e serialização.
- `src/lib/validation.ts` — URLs, números/unidades, placeholders, IDs, duplicatas, campos condicionais e referências quebradas.
- `src/lib/ids.ts` — factories de formulário, IDs internos, normalização de URLs, placeholders e números localizados.
- `src/lib/storage.ts` — repositório local versionado de projetos e backup/importação.
- `src/lib/*.test.ts` — regressões do grafo, escopos de mídia, ofertas, armazenamento e HTML exportado.
- `src/components/` — formulário por seções, lista/edição/reordenação de versões e mídias, painel de validação, lista de projetos e editor único do código.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css` — composição visual responsiva e interações.
- `public/manus-routes.json` — declaração da rota `/` antes do primeiro servidor Preview.
- `index.html`, `package.json`, configuração Vite/TypeScript e `app.config.ts` — execução, build estático e metadados do projeto.

## Direção visual

Três opções fora da distribuição comum (probabilidades de cauda, cada uma abaixo de 0,10):
1. **Console de calibração automotiva** — instrumentação de alto contraste e leitura densa. Probabilidade: 0,06.
2. **Catálogo editorial de oficina** — fichas técnicas tipográficas e papel claro. Probabilidade: 0,03.
3. **Painel cartográfico monocromático** — mapa de relações e navegação por trilhas. Probabilidade: 0,01.

**Escolha recomendada: Console de calibração automotiva.**

- **Movimento de design:** instrumentos de diagnóstico automotivo e mesas de engenharia, traduzidos em uma interface web precisa, sem imitar painel de carro literalmente.
- **Princípios:** leitura rápida do estado; hierarquia técnica consistente; densidade controlada; erros sempre explicados perto do dado e no resumo.
- **Filosofia de cor:** preto/grafite e superfícies neutras criam contraste limpo; branco quente mantém leitura; amarelo assina ações ativas; laranja marca atenção; vermelho fica reservado a bloqueios e erros; verde assinala geração válida.
- **Paradigma de layout:** trilho lateral estreito para projetos e etapas; formulário principal em painéis empilhados com versões expansíveis; coluna de validação/código persistente em telas grandes e aba alternável em telas menores.
- **Elementos de assinatura:** trilha vertical de etapas com estados; selos compactos de tipo Schema.org e severidade; cabeçalho de código com contagem de entidades.
- **Interação:** edição inline, salvar automático visível, adicionar/duplicar/reordenar sem perder contexto; cada aviso aponta para o campo correspondente; controles de exportação indicam bloqueios antes do clique.
- **Animação:** transições curtas de 140–180 ms em painéis/estados; feedback de copiar por breve confirmação; sem animações decorativas ou que retardem a edição.
- **Tipografia:** Inter para interface, IBM Plex Mono para IDs, valores técnicos e JSON; títulos 24/18 px, corpo 14 px, labels 12 px, line-height generoso no código.
- **Essência da marca:** oficina de dados estruturados para equipes de conteúdo automotivo; personalidade: precisa, transparente, prática.
- **Tom de voz:** títulos diretos, microcopy que revela a consequência técnica. Exemplos: “Dados completos. Grafo consistente.” / “Há campos pendentes; nenhum placeholder será publicado.”
- **Logotipo:** trilha angular de velocidade em traço contínuo, desenhada como um símbolo abstrato original, com gradiente amarelo–laranja–vermelho, sem reproduzir marcas automobilísticas de terceiros.
- **Cor de assinatura:** amarelo dourado, com laranja e vermelho como cores de progressão visual; estados semânticos de sucesso/erro permanecem distinguíveis.

## Fluxo de construção

Após a aprovação deste plano, criarei o `TODO.md` com critérios completos; habilitarei diagnósticos TypeScript e instalarei dependências Node com o gerenciador fixado; criarei o manifesto da rota; implementarei modelo, motor e testes unitários antes de ligar a interface; executarei build, testes automatizados e diagnósticos; corrigirei falhas; verificarei a aplicação e seu Preview; então registrarei um checkpoint. Publicação externa não será acionada sem pedido explícito.
