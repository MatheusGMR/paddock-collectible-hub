export interface CollectibleFact {
  id: string;
  category: "history" | "technical" | "records" | "culture" | "realCars";
  text: string;
  textEn: string;
}

export const collectibleFacts: CollectibleFact[] = [
  // História dos Fabricantes
  {
    id: "hw-1968",
    category: "history",
    text: "A Hot Wheels foi criada em 1968 para competir com a Matchbox. O segredo? Rodas de baixo atrito que faziam os carrinhos andarem 30% mais rápido!",
    textEn: "Hot Wheels was created in 1968 to compete with Matchbox. The secret? Low-friction wheels that made the cars go 30% faster!",
  },
  {
    id: "matchbox-1953",
    category: "history",
    text: "A Matchbox começou em 1953, quando Jack Odell fez um pequeno rolo compressor para a filha levar à escola numa caixa de fósforos!",
    textEn: "Matchbox started in 1953 when Jack Odell made a small road roller for his daughter to take to school in a matchbox!",
  },
  {
    id: "tomica-1970",
    category: "history",
    text: "A Tomica japonesa lançou seu primeiro modelo em 1970: um Nissan Bluebird na escala 1:64. Hoje já são mais de 1.000 modelos!",
    textEn: "Japanese Tomica launched its first model in 1970: a Nissan Bluebird in 1:64 scale. Today there are over 1,000 models!",
  },
  {
    id: "majorette-1961",
    category: "history",
    text: "A Majorette francesa foi fundada em 1961 e é famosa por suas ambulâncias e carros de polícia europeus super detalhados.",
    textEn: "French Majorette was founded in 1961 and is famous for its highly detailed European ambulances and police cars.",
  },
  {
    id: "siku-1921",
    category: "history",
    text: "A alemã Siku existe desde 1921! É uma das marcas de miniaturas mais antigas do mundo ainda em atividade.",
    textEn: "German Siku has been around since 1921! It's one of the oldest miniature brands still in business.",
  },

  // Curiosidades Técnicas
  {
    id: "scale-164",
    category: "technical",
    text: "Na escala 1:64, um carro de verdade de 4,5m vira uma miniatura de apenas 7cm. Cada 1mm na miniatura equivale a 6,4cm no carro real!",
    textEn: "In 1:64 scale, a 4.5m real car becomes just a 7cm miniature. Each 1mm on the miniature equals 6.4cm on the real car!",
  },
  {
    id: "zamac-metal",
    category: "technical",
    text: "ZAMAC é a liga metálica usada na maioria das miniaturas: zinco, alumínio, magnésio e cobre. Leve, durável e perfeita para detalhes!",
    textEn: "ZAMAC is the metal alloy used in most miniatures: zinc, aluminum, magnesium, and copper. Light, durable, and perfect for details!",
  },
  {
    id: "thailand-factory",
    category: "technical",
    text: "A maioria das Hot Wheels são fabricadas na Tailândia e Malásia. Antigamente, muitas vinham do Brasil e da França!",
    textEn: "Most Hot Wheels are made in Thailand and Malaysia. In the past, many came from Brazil and France!",
  },
  {
    id: "redline-wheels",
    category: "technical",
    text: "As famosas 'Redline Wheels' da Hot Wheels (1968-1977) tinham uma linha vermelha na lateral que indicava pneus de alta performance.",
    textEn: "The famous Hot Wheels 'Redline Wheels' (1968-1977) had a red line on the side indicating high-performance tires.",
  },
  {
    id: "spectraflame-paint",
    category: "technical",
    text: "A pintura Spectraflame usada nas primeiras Hot Wheels era aplicada sobre metal polido, criando cores vibrantes e brilhantes únicas!",
    textEn: "Spectraflame paint used on early Hot Wheels was applied over polished metal, creating unique vibrant and bright colors!",
  },

  // Recordes e Raridades
  {
    id: "pink-beach-bomb",
    category: "records",
    text: "O Hot Wheels mais caro já vendido foi um Pink Rear-Loading Beach Bomb de 1969, avaliado em mais de $150.000!",
    textEn: "The most expensive Hot Wheels ever sold was a 1969 Pink Rear-Loading Beach Bomb, valued at over $150,000!",
  },
  {
    id: "sth-1995",
    category: "records",
    text: "Os Super Treasure Hunts foram introduzidos em 1995. Apenas 1 a cada 50 caixas contém um STH com pintura especial e rodas de borracha real!",
    textEn: "Super Treasure Hunts were introduced in 1995. Only 1 in 50 cases contains an STH with special paint and real rubber tires!",
  },
  {
    id: "billions-produced",
    category: "records",
    text: "Já foram produzidos mais de 8 bilhões de Hot Wheels desde 1968. São 16 carrinhos por segundo, 24 horas por dia!",
    textEn: "Over 8 billion Hot Wheels have been produced since 1968. That's 16 cars per second, 24 hours a day!",
  },
  {
    id: "largest-collection",
    category: "records",
    text: "A maior coleção de Hot Wheels do mundo tem mais de 30.000 carrinhos diferentes e pertence a Bruce Pascal, nos EUA.",
    textEn: "The world's largest Hot Wheels collection has over 30,000 different cars and belongs to Bruce Pascal in the USA.",
  },
  {
    id: "diamond-hw",
    category: "records",
    text: "Em 2008, a Hot Wheels criou uma miniatura coberta com 2.700 diamantes e rubi para comemorar 40 anos. Valor: $140.000!",
    textEn: "In 2008, Hot Wheels created a miniature covered with 2,700 diamonds and rubies to celebrate 40 years. Value: $140,000!",
  },

  // Cultura de Colecionismo
  {
    id: "loose-vs-carded",
    category: "culture",
    text: "Um carrinho 'carded' (na embalagem) pode valer 10x mais que o mesmo modelo 'loose' (fora da embalagem). Preservação é tudo!",
    textEn: "A 'carded' car (in package) can be worth 10x more than the same 'loose' model. Preservation is everything!",
  },
  {
    id: "mainline-vs-premium",
    category: "culture",
    text: "Hot Wheels 'Mainline' são os básicos. A linha 'Premium' tem detalhes extras, rodas de borracha e embalagens especiais.",
    textEn: "Hot Wheels 'Mainline' are the basic ones. The 'Premium' line has extra details, rubber tires, and special packaging.",
  },
  {
    id: "chase-variants",
    category: "culture",
    text: "Alguns modelos têm variantes 'Chase' com cores ou detalhes diferentes e muito mais raros. Encontrar um é sorte grande!",
    textEn: "Some models have 'Chase' variants with different colors or details and are much rarer. Finding one is pure luck!",
  },
  {
    id: "custom-culture",
    category: "culture",
    text: "Customizar miniaturas é uma arte! Colecionadores modificam pintura, rodas e até interiores para criar peças únicas.",
    textEn: "Customizing miniatures is an art! Collectors modify paint, wheels, and even interiors to create unique pieces.",
  },
  {
    id: "hunting-tips",
    category: "culture",
    text: "Dica de caçador: visite lojas pela manhã após a reposição. Os modelos mais raros costumam ir embora primeiro!",
    textEn: "Hunter tip: visit stores in the morning after restocking. The rarest models usually go first!",
  },

  // Carros Reais Icônicos
  {
    id: "delorean-bttf",
    category: "realCars",
    text: "O DeLorean DMC-12 ficou imortalizado em 'De Volta para o Futuro'. A Hot Wheels lançou dezenas de versões, incluindo hover mode!",
    textEn: "The DeLorean DMC-12 was immortalized in 'Back to the Future'. Hot Wheels has released dozens of versions, including hover mode!",
  },
  {
    id: "skyline-gtr",
    category: "realCars",
    text: "O Nissan Skyline GT-R é tão popular em miniaturas que existem mais de 50 versões diferentes em Hot Wheels e Tomica!",
    textEn: "The Nissan Skyline GT-R is so popular in miniatures that there are over 50 different versions in Hot Wheels and Tomica!",
  },
  {
    id: "batmobile-versions",
    category: "realCars",
    text: "O Batmóvel é um dos modelos licenciados mais produzidos. Existem versões de todos os filmes, séries e HQs do Batman!",
    textEn: "The Batmobile is one of the most produced licensed models. There are versions from all Batman movies, series, and comics!",
  },
  {
    id: "lamborghini-countach",
    category: "realCars",
    text: "O Lamborghini Countach foi o carro dos sonhos dos anos 80. A Hot Wheels lança versões dele desde 1974!",
    textEn: "The Lamborghini Countach was the dream car of the 80s. Hot Wheels has been releasing versions of it since 1974!",
  },
  {
    id: "ford-gt40",
    category: "realCars",
    text: "O Ford GT40 venceu Le Mans 4 vezes seguidas (1966-1969). É um dos modelos mais desejados entre colecionadores!",
    textEn: "The Ford GT40 won Le Mans 4 times in a row (1966-1969). It's one of the most desired models among collectors!",
  },
  {
    id: "porsche-911",
    category: "realCars",
    text: "O Porsche 911 existe desde 1964 e sua silhueta quase não mudou. É o carro esportivo com mais versões em miniatura!",
    textEn: "The Porsche 911 has existed since 1964 and its silhouette has barely changed. It's the sports car with the most miniature versions!",
  },
  {
    id: "vw-beetle",
    category: "realCars",
    text: "O Fusca é o carro mais produzido da história: mais de 21 milhões de unidades! Também é um dos mais colecionados em miniatura.",
    textEn: "The VW Beetle is the most produced car in history: over 21 million units! It's also one of the most collected in miniature.",
  },
  {
    id: "ferrari-250-gto",
    category: "realCars",
    text: "A Ferrari 250 GTO é o carro mais valioso do mundo: uma foi vendida por $70 milhões! A miniatura é mais acessível...",
    textEn: "The Ferrari 250 GTO is the most valuable car in the world: one sold for $70 million! The miniature is more accessible...",
  },
  {
    id: "senna-mclaren",
    category: "realCars",
    text: "O McLaren MP4/4 de Ayrton Senna de 1988 venceu 15 de 16 corridas. A Tomica tem uma versão linda deste carro lendário!",
    textEn: "Ayrton Senna's 1988 McLaren MP4/4 won 15 of 16 races. Tomica has a beautiful version of this legendary car!",
  },
];

export function getRandomFacts(count: number = 5): CollectibleFact[] {
  const shuffled = [...collectibleFacts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
