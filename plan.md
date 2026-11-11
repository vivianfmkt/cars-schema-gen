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


## Atualização solicitada — autoria e catálogo completo de propriedades

Em 22/10/2026, a solicitação amplia a versão publicada: o rodapé e o cabeçalho identificam a autoria como **Desenvolvido por Vívian Ferreira - Marketing Estratégico 360**, com link para `https://www.linkedin.com/in/vivianfmkt`. O catálogo será baseado na leitura integral do TXT (4.365 linhas; JSON válido; 63 entidades), mas não copiará os valores reais/exemplares do Tracker para projetos novos.

A extração do `additionalProperty` de `ProductGroup` e das cinco entidades `Vehicle` identifica quatro propriedades compartilhadas no modelo e 51 propriedades distintas de versão. Oito propriedades veiculares já são atendidas por controles tipados da v1 (`Motorização`, potências máximas gasolina/etanol, torques máximos gasolina/etanol, `Transmissão`, `Tração` e `Airbags`); não serão duplicadas no novo catálogo. Serão pré-carregadas as outras **43 propriedades de versão** e as quatro comuns:

- **Comuns ao modelo/ProductGroup:** Assistente de permanência em faixa; Detecção de pedestres; Detecção de ciclistas; Controle eletrônico de estabilidade.
- **Versão — direção, rodagem e acabamento:** Direção; Rodas; Lanternas em LED; Rack de Teto; Acabamento Externo; Design das Rodas; Grade Frontal; Logomarca Chevrolet (Bow Tie); Parachoques.
- **Versão — conforto e conveniência:** Assistente de Partida em Aclive; Ar-condicionado; Ar-condicionado Digital Automático; Câmera de Ré; Câmera de Ré Digital; Chave com Sensor de Aproximação; Controlador de Limite de Velocidade; Easy Entry; Easy Park; Easy Start; Sistema de Luz Siga-me; Sistema de Luz Leve-me; Travas Elétricas; Vidros Elétricos; Carregador sem Fio.
- **Versão — conectividade e multimídia:** Painel Digital; Central Multimídia; Rádio AM/FM; Entrada USB; Android Auto; Apple CarPlay; Wi-Fi embarcado; OnStar.
- **Versão — segurança:** Alerta de Frenagem de Emergência; Alerta de Colisão Frontal; Alerta de Ponto Cego; Frenagem Automática de Emergência em Baixa Velocidade; Indicador de Distância do Veículo da Frente; Monitoramento da Pressão dos Pneus; ISOFIX; TOP TETHER; ABS; EBD; Assistência de Frenagem de Urgência.

Os valores novos começam vazios e independem por versão. A interface organiza o catálogo por categoria, facilita valores Sim/Não e permite texto técnico descritivo; os itens personalizados continuam disponíveis para qualquer propriedade fora do TXT. O motor omite itens sem valor, conserva a associação ao `ProductGroup`/`Vehicle` adequada e evita propriedades duplicadas. Projetos no armazenamento local e backups antigos são migrados apenas adicionando campos ausentes vazios, preservando respostas e propriedades personalizadas existentes.

A implementação preserva a arquitetura React/TypeScript já aprovada, adicionando um módulo de catálogo reutilizável, UI categorizada e regressões de inventário, serialização, migração e créditos. O dado de autoria será um link externo acessível, sem alterar os schemas da PDP.


## Atualização solicitada — consumo, emissões e especificações comuns (11/11/2026)

Os quatro consumos (urbano/rodoviário por gasolina/etanol) e emissões de CO₂ passam de strings numéricas para entradas numéricas estruturadas que permitem valor pontual ou intervalo. Valor pontual será serializado como número JSON; intervalo como `QuantitativeValue` com `minValue` e `maxValue` numéricos. Consumo manterá `unitText: "km/L"` e contexto no `name`; CO₂ em faixa usará `unitText: "g/km"`. A interface oferecerá valor exato ou par mínimo/máximo, documentará o uso de ponto decimal e a importação de valores antigos aceitará vírgula local e os normalizará. A validação rejeitará entradas parciais/ambíguas, números inválidos e mínimo maior que máximo, sem penalizar campos vazios.

A seção comum do modelo pré-carrega `fuelType`, `driveWheelConfiguration`, `vehicleTransmission`, `numberOfDoors`, `seatingCapacity` e `numberOfAirbags`, mas esses valores são serializados como propriedades Schema.org diretas em cada entidade `Vehicle`, conforme seus domínios oficiais. A entrada continua comum no formulário para não duplicar controles por versão; o valor é repetido somente na saída das versões correspondentes. Não inserir esses seis termos no `ProductGroup` nem em `additionalProperty`. Portas, lugares e airbags são números JSON quando numéricos; valores vazios são omitidos. A migração preserva dados legados e a estrutura de backup mantém leitura de v1/v2.

A implementação altera tipos, factories/migração, controles de formulário, validação, geração e testes existentes, sem alterar a direção visual, a persistência local ou os demais schemas.


## Fontes Schema.org consultadas para a atualização numérica

`QuantitativeValue` define `value` como número para pontos e `minValue`/`maxValue` como números para intervalos; a documentação pede ponto (`.`) como separador decimal. `fuelConsumption` espera `QuantitativeValue` e indica `unitText` para km/L. `emissionsCO2` espera `Number`, mas documenta que, quando usado com `QuantitativeValue`, a unidade `g/km` deve ir em `unitText`; portanto o ponto será número, e o intervalo quantitativo terá `minValue`, `maxValue` e `unitText`. Os valores numéricos de portas/lugares/airbags continuam sendo números JSON, diretamente nas entidades `Vehicle`.

Fontes oficiais: [QuantitativeValue](https://schema.org/QuantitativeValue), [fuelConsumption](https://schema.org/fuelConsumption), [emissionsCO2](https://schema.org/emissionsCO2), [Vehicle](https://schema.org/Vehicle) e [ProductGroup](https://schema.org/ProductGroup).
Os campos de consumo e CO₂ usam um parser decimal contextual: um único ponto é sempre separador decimal (`11.500` → `11.5`), enquanto vírgula decimal localizada também é aceita para migração. Isso não altera a interpretação existente de campos legados como dimensões, em que `4.304` pode representar agrupamento de milhares. A migração também reconhece intervalos textuais com hífen junto ou separado dos valores, travessões e `a`/`até`.


## Atualização solicitada — propriedades comuns em Vehicle e ProductGroup, campos vazios e rótulos técnicos (11/11/2026)

A saída do `Vehicle` não recupera campos específicos da versão que foram apagados. Separadamente, os seis campos `fuelType`, `driveWheelConfiguration`, `vehicleTransmission`, `numberOfDoors`, `seatingCapacity` e `numberOfAirbags` têm entrada única nos dados comuns do modelo e são deliberadamente emitidos como propriedades diretas em cada `Vehicle`, porque esses termos têm domínio em `Vehicle`, não em `ProductGroup`. Em contraste, `wheelbase` compartilhado é um `PropertyValue` numérico com `unitCode: "MMT"` no `ProductGroup.additionalProperty`; as 21 características de equipamentos migradas são propriedades genéricas `additionalProperty` no nível do grupo. Comprimento, largura e altura comuns usam `QuantitativeValue` nas propriedades de produto compatíveis, enquanto capacidades comuns usam `PropertyValue`. Outros campos opcionais vazios continuam omitidos.

Migração de projetos locais/backups existentes preserva dados: valor compartilhado preenchido tem precedência; valores de versão legados iguais e não vazios em todas as versões migram automaticamente ao campo comum; valores distintos ou preenchidos apenas parcialmente ficam preservados em conflitos legados visíveis para escolha manual e não são gerados enquanto houver conflito. Após a escolha explícita, o valor fica comum e é emitido nos nós `Vehicle` como definido acima. Comparações numéricas normalizam representações equivalentes. Atualizar o formato de backup mantendo leitura de arquivos v1/v2 e migração local idempotente.

Os campos relacionados a Schema.org no formulário exibem simultaneamente rótulo em português e termo/caminho técnico. Catálogos de `additionalProperty` identificam esse mecanismo e mantêm o nome descritivo usado em `PropertyValue.name`. Implementação reaproveita React/TypeScript/Vite, catálogos, normalização de projetos e gerador existentes; sem dependências novas. Executar check, testes, build congelado do repositório e revisar o resultado do grafo. Publicação externa somente mediante pedido explícito.

### Referências técnicas verificadas para as propriedades comuns

Consulta às páginas oficiais Schema.org em 11/11/2026: `ProductGroup` permite `additionalProperty` com `PropertyValue`; `wheelbase` e as 21 características compartilhadas ficam nesse nível por escolha de agrupamento. Os seis termos técnicos `fuelType`, `driveWheelConfiguration`, `vehicleTransmission`, `numberOfDoors`, `seatingCapacity` e `numberOfAirbags` são propriedades de `Vehicle`, não de `ProductGroup`; por isso são emitidos diretamente em cada `Vehicle`, com dados digitados uma vez no modelo. `PropertyValue.value` aceita números e `unitCode` qualifica a medida de entre-eixos no `ProductGroup`.

Fontes: [ProductGroup](https://schema.org/ProductGroup), [wheelbase](https://schema.org/wheelbase), [Vehicle](https://schema.org/Vehicle), [fuelType](https://schema.org/fuelType), [driveWheelConfiguration](https://schema.org/driveWheelConfiguration), [vehicleTransmission](https://schema.org/vehicleTransmission), [numberOfDoors](https://schema.org/numberOfDoors), [additionalProperty](https://schema.org/additionalProperty) e [PropertyValue](https://schema.org/PropertyValue).
