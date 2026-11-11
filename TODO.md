# TODO — Gerador de Schema para PDP de Carros

## Mapeamento do TXT e modelo de dados — Concluído

- [x] O TXT anexado será lido integralmente antes de programar; todos os schemas, propriedades, placeholders e relacionamentos serão identificados, mapeados para campos do formulário e regras de geração, preservando informações relevantes e corrigindo inconsistências técnicas.
- [x] O mapeamento incluirá todas as propriedades de organização/site/página, `ProductGroup`, versões `Vehicle`, motor, `QuantitativeValue`, `PropertyValue`, cores, equipamentos, consumo, dimensões, `ItemList`, imagens, breadcrumbs e `FAQPage`/`Question`/`Answer` encontrados no arquivo, bem como o motivo condicional para `Product`, `Offer` e `VideoObject`.
- [x] Placeholders, campos vazios, unidades, números, datas, URLs e referências incompletas serão classificados: placeholders não podem ser publicados; campos opcionais vazios não serão serializados; números Schema.org serão gerados com tipo correto.

## Formulário PDP e versões independentes — Concluído

- [x] A interface permitirá cadastrar dados da página, URLs, marca, fabricante, organização e modelo, além de versões, dimensões, motor, potência, torque, transmissão, combustível, consumo, equipamentos, cores, imagens, galerias, vídeos e ofertas.
- [x] A quantidade de versões será dinâmica, incluindo 1, 2, 6 ou mais. O usuário poderá adicionar, editar, duplicar, excluir e reordenar versões; cada versão manterá dados independentes.
- [x] Imagens, cores e vídeos poderão ser múltiplos, gerais ou específicos por versão. Campos opcionais continuarão opcionais e não serão preenchidos com dados inventados ou valores de exemplo do veículo do TXT.

## Motor e relações Schema.org — Concluído

- [x] Um motor de geração real, puro e separado da interface produzirá os schemas aplicáveis: `WebSite`, `Organization`, `Brand`, `WebPage`, `BreadcrumbList`, `Vehicle`, `Product`, `ItemList`, `ImageObject`, `Offer` e `VideoObject`, além de `ProductGroup` e FAQ quando pertinentes ao conteúdo.
- [x] `VideoObject` não será emitido sem vídeo válido; sem vídeos válidos nenhum `VideoObject` aparecerá.
- [x] Todos os schemas sairão juntos em um único objeto JSON-LD com um único `@graph`, ligados com IDs estáveis `@id` e propriedades compatíveis. O resultado não conterá duplicações, referências quebradas, entidades vazias, valores inventados nem placeholders.

## Validação, editor único e exportação — Concluído

- [x] A validação verificará sintaxe JSON, tipos, URLs, identificadores, relacionamentos, duplicatas e placeholders, exibindo erros, avisos e pendências antes da exportação.
- [x] O código completo será apresentado em uma única área formatada. Um botão copiará o JSON-LD completo; opções baixarão o objeto JSON ou HTML com exatamente um `<script type="application/ld+json">` contendo o objeto completo. Os schemas nunca serão separados em blocos.
- [x] Exportações serão bloqueadas em erros impeditivos. Informações opcionais ausentes não serão tratadas como erros; valores incompletos serão omitidos e apresentados como pendências.

## Projetos e persistência — Concluído

- [x] Será possível criar, salvar, editar, duplicar, excluir e exportar projetos independentes.
- [x] A persistência será funcional na infraestrutura disponível e suas limitações serão informadas; a proposta aprovada é armazenamento local no navegador, com arquivo de backup/importação, sem sincronização entre navegadores/dispositivos.

## Aplicação funcional e critérios de entrega — Concluído

- [x] A entrega será uma aplicação funcional, não apenas um protótipo visual, adequada a qualquer PDP automotiva e capaz de gerar automaticamente um único bloco JSON-LD consistente, pronto para implementação.
- [x] Serão exercitados casos com diferentes quantidades de versões, com e sem vídeos, várias imagens e cores, dados opcionais ausentes e placeholders pendentes. Os problemas encontrados serão corrigidos antes da entrega.
- [x] A entrega informará funcionalidades implementadas, testes realizados e limitações conhecidas, incluindo a forma/escopo da persistência.


## Atualizações solicitadas — 22/10/2026

### Crédito de autoria — Concluído

- [x] Exibir no rodapé o texto exato “Desenvolvido por Vívian Ferreira - Marketing Estratégico 360”, como link para `https://www.linkedin.com/in/vivianfmkt`.
- [x] Exibir a atribuição também no cabeçalho, onde fizer sentido, mantendo o link acessível, responsivo e abrindo em nova aba com proteção `noopener`/`noreferrer`.

### Catálogo pré-carregado de propriedades automotivas — Concluído

- [x] Pré-carregar, sem inserir respostas ou valores fictícios, as quatro propriedades compartilhadas de `ProductGroup` presentes no TXT: “Assistente de permanência em faixa”, “Detecção de pedestres”, “Detecção de ciclistas” e “Controle eletrônico de estabilidade”.
- [x] Pré-carregar por versão as 43 propriedades de veículo ainda não cobertas pelos controles técnicos dedicados da v1: Direção; Rodas; Assistente de Partida em Aclive; Ar-condicionado; Câmera de Ré; Chave com Sensor de Aproximação; Controlador de Limite de Velocidade; Easy Entry; Easy Start; Painel Digital; Sistema de Luz Siga-me; Sistema de Luz Leve-me; Travas Elétricas; Vidros Elétricos; Central Multimídia; Rádio AM/FM; Entrada USB; Android Auto; Apple CarPlay; Wi-Fi embarcado; OnStar; Alerta de Frenagem de Emergência; ISOFIX; TOP TETHER; ABS; EBD; Assistência de Frenagem de Urgência; Ar-condicionado Digital Automático; Câmera de Ré Digital; Alerta de Colisão Frontal; Alerta de Ponto Cego; Frenagem Automática de Emergência em Baixa Velocidade; Indicador de Distância do Veículo da Frente; Monitoramento da Pressão dos Pneus; Lanternas em LED; Rack de Teto; Acabamento Externo; Design das Rodas; Carregador sem Fio; Easy Park; Grade Frontal; Logomarca Chevrolet (Bow Tie); Parachoques.
- [x] Os campos pré-carregados aceitarão “Sim”, “Não” ou uma descrição/especificação livre, ficarão vazios até preenchimento e só gerarão `PropertyValue` quando houver valor. Permanecem independentes para cada versão; propriedades comuns do modelo ficam disponíveis no nível comum apropriado.
- [x] Manter controles tipados já existentes para Motorização, potências, torques, transmissão, tração e airbags, evitando duplicá-los no catálogo ou no JSON-LD.
- [x] Manter a possibilidade de adicionar e excluir propriedades personalizadas que não estejam no TXT, tanto comuns quanto por versão.
- [x] Ao abrir projetos locais e backups da v1, adicionar somente propriedades de catálogo ausentes com valores vazios; preservar respostas existentes, IDs/dados das entradas customizadas e não escrever informações inventadas no JSON-LD.


## Atualização solicitada — consumo, emissões e propriedades compartilhadas (11/11/2026)

### Consumo e emissões numéricas — Concluído

- [x] Os campos de consumo urbano/rodoviário para gasolina/etanol e emissões de CO₂ aceitarão números e intervalos numéricos, não faixas armazenadas ou emitidas como texto. A UI deverá permitir um valor pontual ou os limites mínimo e máximo; no JSON-LD, valores pontuais serão números JSON e intervalos usarão `minValue`/`maxValue` como números JSON, dentro da representação quantitativa compatível com Schema.org.
- [x] Os consumos continuarão identificando o contexto (urbano/rodoviário e combustível) e a unidade `km/L`; emissões manterão a unidade `g/km`. A interface indicará uso de ponto decimal (`.`); valores localizados/v1 com vírgula deverão ser normalizados corretamente na migração.
- [x] Campos numéricos opcionais vazios continuarão ausentes do JSON-LD. Quando um intervalo for iniciado, os limites serão validados para números finitos, mínimo não maior que máximo e entrada completa; erros/pêndencias serão exibidos antes da exportação.

### Propriedades pré-carregadas comuns do modelo — Concluído

- [x] Na seção “Modelo e dados compartilhados”, pré-carregar estes campos Schema.org: combustível `fuelType`; configuração das rodas motrizes `driveWheelConfiguration`; transmissão do veículo `vehicleTransmission`; número de portas `numberOfDoors`; número de lugares `seatingCapacity`; número de airbags `numberOfAirbags`.
- [x] Marco da decisão final: os seis valores são informados uma vez na seção comum do modelo e aplicados como propriedades diretas de cada `Vehicle`; não são inseridos no `ProductGroup` nem como `additionalProperty` dele.
- [x] Os valores de `numberOfDoors`, `seatingCapacity` e `numberOfAirbags` são serializados como números JSON em cada `Vehicle` quando numéricos; combustível, rodas motrizes e transmissão permanecem textuais.
- [x] Manter compatibilidade com projetos locais e backups já existentes: migrar valores pontuais antigos e campos comuns ausentes sem apagar dados, aceitar vírgula decimal legada e preservar valores que precisem de correção para serem mostrados pela validação.
- [x] A versão de backup exportada/importada identificará a nova estrutura, continuará aceitando arquivos v1 e migrará seus dados para o formato atual sem perda.


## Atualização solicitada — dados comuns em ProductGroup, omissão de vazios e nomes técnicos (11/11/2026)

### Campos opcionais vazios e ausência de herança indesejada — Concluído

- [x] Ao apagar um valor opcional específico de uma versão, a propriedade correspondente deve desaparecer daquela entidade `Vehicle`; não deve reaparecer por herança automática de valores comuns em campos que têm entrada por versão. Os seis campos que existem somente na seção comum do modelo são uma exceção intencional: seus valores comuns são aplicados diretamente a cada `Vehicle`, pois esse é o domínio Schema.org de cada propriedade.
- [x] Campos opcionais realmente vazios não devem deixar texto, `null`, `undefined`, objeto vazio ou propriedade redundante no JSON-LD; campos obrigatórios e seus bloqueios de validação permanecem inalterados.

### Propriedades compartilhadas distribuídas pelo tipo Schema.org adequado — Concluído

- [x] Incluir no nível `ProductGroup` a medida comum `wheelbase` (Entre-eixos) e não a duplicar em cada `Vehicle`.
- [x] Mover para as propriedades comuns do modelo e para o `ProductGroup`, sem emissão por versão: `additionalProperty` Direção; Assistente de Partida em Aclive; Chave com Sensor de Aproximação; Controlador de Limite de Velocidade; Easy Entry; Easy Start; Sistema de Luz Siga-me; Sistema de Luz Leve-me; Travas Elétricas; Vidros Elétricos; Rádio AM/FM; Android Auto; Apple CarPlay; Wi-Fi embarcado; OnStar; Alerta de Frenagem de Emergência; ISOFIX; TOP TETHER; ABS; EBD; Assistência de Frenagem de Urgência.
- [x] Manter no nível comum do modelo e retirar da seção/entrada individual das versões os campos já adicionados: combustível `fuelType`; configuração das rodas motrizes `driveWheelConfiguration`; transmissão `vehicleTransmission`; número de portas `numberOfDoors`; número de lugares `seatingCapacity`; número de airbags `numberOfAirbags`. Aplicar os valores comuns diretamente em cada `Vehicle` gerado.
- [x] Respeitar a estrutura confirmada pela usuária: `fuelType`, `driveWheelConfiguration`, `vehicleTransmission`, `numberOfDoors`, `seatingCapacity` e `numberOfAirbags` são propriedades diretas de `Vehicle`, não de `ProductGroup`; não as serializar como `additionalProperty` do grupo. `wheelbase` compartilhado inclui valor numérico e unidade `MMT` em `ProductGroup.additionalProperty`; portas, lugares e airbags são números JSON quando numéricos.
- [x] Ao migrar dados já salvos/importados, manter valores comuns existentes. Valores legados só são migrados automaticamente quando todas as versões têm o mesmo valor não vazio, com comparação numérica normalizada para campos numéricos. Se divergirem ou algumas versões estiverem sem valor, preservar os candidatos e apresentar conflito visível para escolha, sem descartar nem publicar os candidatos por versão.
- [x] Migrar automaticamente os valores antigos de `wheelbase` por versão para o campo comum quando forem unânimes; preservar e expor divergências/parcialidades como conflito. Importação de backups v1/v2 e abertura do armazenamento local permanecem funcionais e idempotentes após a atualização do formato v3.

### Nomes amigáveis e identificadores técnicos no formulário — Concluído

- [x] Exibir para os campos do gerador o rótulo amigável em português junto do termo/caminho técnico Schema.org correspondente, por exemplo `Carroceria · bodyType`; não substituir o nome amigável pelo código técnico.
- [x] Para os itens genéricos do catálogo, indicar que são `additionalProperty` e que o texto do recurso compõe `PropertyValue.name`, sem apresentar esse caminho genérico como um termo Schema.org específico.
