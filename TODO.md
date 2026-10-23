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
