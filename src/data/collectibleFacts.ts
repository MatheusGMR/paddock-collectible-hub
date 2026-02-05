export interface CollectibleFact {
  id: string;
  category: "history" | "technical" | "records" | "culture" | "realCars";
  text: string;
  textEn: string;
}

export const collectibleFacts: CollectibleFact[] = [
  // ==========================================
  // HISTÓRIA DOS FABRICANTES (20+ fatos)
  // ==========================================
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
  {
    id: "corgi-1956",
    category: "history",
    text: "A Corgi Toys foi fundada em 1956 no País de Gales e foi a primeira marca a colocar janelas transparentes em miniaturas!",
    textEn: "Corgi Toys was founded in 1956 in Wales and was the first brand to put transparent windows in miniatures!",
  },
  {
    id: "dinky-1934",
    category: "history",
    text: "A Dinky Toys foi criada em 1934 pela Meccano e foi pioneira em criar miniaturas de carros em escala para crianças.",
    textEn: "Dinky Toys was created in 1934 by Meccano and pioneered creating scale car miniatures for children.",
  },
  {
    id: "burago-1974",
    category: "history",
    text: "A italiana Bburago foi fundada em 1974 e se especializou em modelos 1:18 de alta qualidade e preço acessível.",
    textEn: "Italian Bburago was founded in 1974 and specialized in high-quality, affordable 1:18 models.",
  },
  {
    id: "autoart-1998",
    category: "history",
    text: "A AutoArt foi fundada em 1998 em Hong Kong e rapidamente se tornou referência em miniaturas premium de alta fidelidade.",
    textEn: "AutoArt was founded in 1998 in Hong Kong and quickly became a reference in high-fidelity premium miniatures.",
  },
  {
    id: "kyosho-1963",
    category: "history",
    text: "A Kyosho japonesa começou em 1963 com automodelos RC e depois expandiu para miniaturas estáticas de altíssima qualidade.",
    textEn: "Japanese Kyosho started in 1963 with RC car models and later expanded to very high-quality static miniatures.",
  },
  {
    id: "greenlight-2002",
    category: "history",
    text: "A Greenlight foi fundada em 2002 e se destaca por licenciar veículos de filmes e séries como Hollywood, Fast & Furious e mais.",
    textEn: "Greenlight was founded in 2002 and stands out for licensing vehicles from movies and series like Hollywood and Fast & Furious.",
  },
  {
    id: "maisto-1990",
    category: "history",
    text: "A Maisto foi criada em 1990 e ficou famosa por oferecer miniaturas detalhadas a preços mais acessíveis que a concorrência.",
    textEn: "Maisto was created in 1990 and became famous for offering detailed miniatures at more affordable prices.",
  },
  {
    id: "hw-elliot-handler",
    category: "history",
    text: "Elliot Handler, co-fundador da Mattel e criador da Hot Wheels, também criou a boneca Barbie junto com sua esposa Ruth!",
    textEn: "Elliot Handler, Mattel co-founder and Hot Wheels creator, also created the Barbie doll with his wife Ruth!",
  },
  {
    id: "matchbox-lesney",
    category: "history",
    text: "A Matchbox foi originalmente produzida pela Lesney Products na Inglaterra. O nome veio do tamanho das caixas de fósforos britânicas!",
    textEn: "Matchbox was originally produced by Lesney Products in England. The name came from the size of British matchboxes!",
  },
  {
    id: "hw-16-cars-1968",
    category: "history",
    text: "A Hot Wheels lançou seus primeiros 16 modelos em 1968, conhecidos como 'Sweet 16'. Todos são extremamente valiosos hoje!",
    textEn: "Hot Wheels launched its first 16 models in 1968, known as 'Sweet 16'. All are extremely valuable today!",
  },
  {
    id: "solido-1932",
    category: "history",
    text: "A francesa Solido foi fundada em 1932 e é conhecida por seus modelos militares e carros clássicos franceses.",
    textEn: "French Solido was founded in 1932 and is known for its military models and classic French cars.",
  },
  {
    id: "schuco-1912",
    category: "history",
    text: "A alemã Schuco foi fundada em 1912! É uma das marcas mais antigas e produz miniaturas desde antes da Segunda Guerra Mundial.",
    textEn: "German Schuco was founded in 1912! It's one of the oldest brands and has been producing miniatures since before WWII.",
  },
  {
    id: "johnny-lightning-1969",
    category: "history",
    text: "A Johnny Lightning foi criada em 1969 pela Topper Toys para competir diretamente com a Hot Wheels, focando em muscle cars.",
    textEn: "Johnny Lightning was created in 1969 by Topper Toys to directly compete with Hot Wheels, focusing on muscle cars.",
  },
  {
    id: "norev-1946",
    category: "history",
    text: "A francesa Norev foi fundada em 1946 e é conhecida por produzir réplicas fiéis de carros franceses como Citroën e Peugeot.",
    textEn: "French Norev was founded in 1946 and is known for producing faithful replicas of French cars like Citroën and Peugeot.",
  },
  {
    id: "minichamps-1990",
    category: "history",
    text: "A alemã Minichamps foi fundada em 1990 e se tornou referência mundial em miniaturas de carros de Fórmula 1.",
    textEn: "German Minichamps was founded in 1990 and became a world reference in Formula 1 car miniatures.",
  },

  // ==========================================
  // CURIOSIDADES TÉCNICAS (20+ fatos)
  // ==========================================
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
  {
    id: "scale-118",
    category: "technical",
    text: "A escala 1:18 é considerada ideal para exibição detalhada. Um carro real de 4,5m mede cerca de 25cm nessa escala!",
    textEn: "1:18 scale is considered ideal for detailed display. A 4.5m real car measures about 25cm in this scale!",
  },
  {
    id: "scale-43",
    category: "technical",
    text: "A escala 1:43 é uma das mais antigas e foi padronizada para caber em trilhos de trem de brinquedo da época!",
    textEn: "1:43 scale is one of the oldest and was standardized to fit toy train tracks of the time!",
  },
  {
    id: "tampo-printing",
    category: "technical",
    text: "A técnica 'tampo printing' permite aplicar detalhes minúsculos como logotipos e stripes com precisão milimétrica nas miniaturas.",
    textEn: "The 'tampo printing' technique allows applying tiny details like logos and stripes with millimeter precision on miniatures.",
  },
  {
    id: "resin-models",
    category: "technical",
    text: "Modelos em resina são mais detalhados mas frágeis. São feitos em edições limitadas e geralmente mais caros que os de metal.",
    textEn: "Resin models are more detailed but fragile. They're made in limited editions and usually more expensive than metal ones.",
  },
  {
    id: "real-riders",
    category: "technical",
    text: "Real Riders são rodas com pneus de borracha de verdade, não plástico. São marca registrada das Hot Wheels Premium!",
    textEn: "Real Riders are wheels with actual rubber tires, not plastic. They're a trademark of Hot Wheels Premium!",
  },
  {
    id: "hw-prototypes",
    category: "technical",
    text: "Cada Hot Wheels passa por mais de 20 protótipos antes de chegar às lojas. O processo pode levar até 2 anos!",
    textEn: "Each Hot Wheels goes through over 20 prototypes before reaching stores. The process can take up to 2 years!",
  },
  {
    id: "opening-parts",
    category: "technical",
    text: "Miniaturas com partes que abrem (portas, capô, porta-malas) são mais caras de produzir e consideradas mais premium.",
    textEn: "Miniatures with opening parts (doors, hood, trunk) are more expensive to produce and considered more premium.",
  },
  {
    id: "axle-types",
    category: "technical",
    text: "Existem vários tipos de eixos: os 'speed wheels' são mais rápidos, enquanto os 'real riders' priorizam realismo.",
    textEn: "There are several axle types: 'speed wheels' are faster, while 'real riders' prioritize realism.",
  },
  {
    id: "paint-layers",
    category: "technical",
    text: "Uma Hot Wheels premium pode ter até 5 camadas de pintura: primer, base, cor, efeito metálico e verniz!",
    textEn: "A premium Hot Wheels can have up to 5 paint layers: primer, base, color, metallic effect, and clear coat!",
  },
  {
    id: "scale-comparison",
    category: "technical",
    text: "Escalas populares em ordem de tamanho: 1:64 (7cm) < 1:43 (10cm) < 1:24 (19cm) < 1:18 (25cm) < 1:12 (38cm).",
    textEn: "Popular scales in size order: 1:64 (7cm) < 1:43 (10cm) < 1:24 (19cm) < 1:18 (25cm) < 1:12 (38cm).",
  },
  {
    id: "uv-damage",
    category: "technical",
    text: "A luz UV pode desbotar a pintura das miniaturas. Por isso, colecionadores sérios guardam suas peças longe da luz solar direta.",
    textEn: "UV light can fade miniature paint. That's why serious collectors keep their pieces away from direct sunlight.",
  },
  {
    id: "wheel-variations",
    category: "technical",
    text: "Um mesmo modelo de Hot Wheels pode ter dezenas de variações de rodas ao longo dos anos. Cada combinação é única!",
    textEn: "A single Hot Wheels model can have dozens of wheel variations over the years. Each combination is unique!",
  },
  {
    id: "interior-details",
    category: "technical",
    text: "Linhas premium como AutoArt incluem interiores com painéis fotogravados, cintos de segurança em tecido e até carpetes em flock!",
    textEn: "Premium lines like AutoArt include interiors with photo-etched panels, fabric seat belts, and even flocked carpets!",
  },
  {
    id: "base-cards",
    category: "technical",
    text: "O 'base card' da Hot Wheels informa país de fabricação, nome do modelo, ano de copyright e outras informações importantes.",
    textEn: "The Hot Wheels 'base card' shows country of manufacture, model name, copyright year, and other important info.",
  },
  {
    id: "metal-vs-plastic",
    category: "technical",
    text: "Hot Wheels básicas têm base de plástico. Modelos premium usam base de metal, que adiciona peso e sensação de qualidade.",
    textEn: "Basic Hot Wheels have plastic bases. Premium models use metal bases, adding weight and quality feel.",
  },

  // ==========================================
  // RECORDES E RARIDADES (20+ fatos)
  // ==========================================
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
  {
    id: "most-reproduced",
    category: "records",
    text: "O modelo Hot Wheels mais reproduzido de todos os tempos é o Chevrolet Camaro, com mais de 200 versões diferentes!",
    textEn: "The most reproduced Hot Wheels model of all time is the Chevrolet Camaro, with over 200 different versions!",
  },
  {
    id: "fastest-hw",
    category: "records",
    text: "O recorde de velocidade de uma Hot Wheels em pista é de 230 km/h, alcançado com um protótipo especial em 2012!",
    textEn: "The speed record for a Hot Wheels on track is 230 km/h, achieved with a special prototype in 2012!",
  },
  {
    id: "rarest-matchbox",
    category: "records",
    text: "O Matchbox mais raro é o Sea Green Regular Wheel Lesney #75 Ferrari Berlinetta de 1965, avaliado em $10.000+!",
    textEn: "The rarest Matchbox is the Sea Green Regular Wheel Lesney #75 Ferrari Berlinetta from 1965, valued at $10,000+!",
  },
  {
    id: "longest-track",
    category: "records",
    text: "A pista Hot Wheels mais longa do mundo tinha 609 metros e foi construída na Califórnia em 2016!",
    textEn: "The longest Hot Wheels track in the world was 609 meters and was built in California in 2016!",
  },
  {
    id: "first-hw-sold",
    category: "records",
    text: "O primeiro Hot Wheels vendido foi um Custom Camaro azul escuro, em 1968. Hoje, em condição perfeita, vale mais de $3.000!",
    textEn: "The first Hot Wheels sold was a dark blue Custom Camaro in 1968. Today, in perfect condition, it's worth over $3,000!",
  },
  {
    id: "error-cars",
    category: "records",
    text: "Carros com erros de fábrica (pintura errada, rodas trocadas) são chamados de 'Error Cars' e podem valer muito para colecionadores!",
    textEn: "Cars with factory errors (wrong paint, swapped wheels) are called 'Error Cars' and can be very valuable to collectors!",
  },
  {
    id: "rlc-exclusive",
    category: "records",
    text: "O RLC (Red Line Club) da Mattel lança modelos exclusivos limitados a apenas 3.000-5.000 unidades no mundo todo!",
    textEn: "Mattel's RLC (Red Line Club) releases exclusive models limited to only 3,000-5,000 units worldwide!",
  },
  {
    id: "convention-exclusive",
    category: "records",
    text: "Hot Wheels de convenções são extremamente raras. Algumas edições de eventos têm tiragem de apenas 50 unidades!",
    textEn: "Convention Hot Wheels are extremely rare. Some event editions have runs of only 50 units!",
  },
  {
    id: "white-lightning",
    category: "records",
    text: "O 'White Lightning' da Johnny Lightning é o equivalente ao Super Treasure Hunt: pintura branca especial e muito raro!",
    textEn: "Johnny Lightning's 'White Lightning' is equivalent to Super Treasure Hunt: special white paint and very rare!",
  },
  {
    id: "pre-production",
    category: "records",
    text: "Modelos de pré-produção (amostras de fábrica) são os mais raros de todos e podem valer dezenas de milhares de dólares!",
    textEn: "Pre-production models (factory samples) are the rarest of all and can be worth tens of thousands of dollars!",
  },
  {
    id: "autoart-1-12",
    category: "records",
    text: "Miniaturas AutoArt 1:12 podem custar mais de $1.000 devido ao nível extremo de detalhamento e materiais premium.",
    textEn: "AutoArt 1:12 miniatures can cost over $1,000 due to extreme detailing and premium materials.",
  },
  {
    id: "zamac-bare-metal",
    category: "records",
    text: "Modelos ZAMAC (sem pintura, metal exposto) são chase variants especiais lançadas em quantidades limitadas.",
    textEn: "ZAMAC models (unpainted, exposed metal) are special chase variants released in limited quantities.",
  },
  {
    id: "japan-exclusive",
    category: "records",
    text: "Tomica e Hot Wheels lançam modelos exclusivos para o mercado japonês que nunca chegam ao resto do mundo!",
    textEn: "Tomica and Hot Wheels release exclusive models for the Japanese market that never reach the rest of the world!",
  },
  {
    id: "gasser-wars",
    category: "records",
    text: "O '55 Chevy Bel Air Gasser é um dos modelos mais disputados. Treasure Hunts dele esgotam em minutos!",
    textEn: "The '55 Chevy Bel Air Gasser is one of the most sought-after models. Treasure Hunts of it sell out in minutes!",
  },
  {
    id: "number-one-casting",
    category: "records",
    text: "O Custom Camaro foi oficialmente o casting #1 da Hot Wheels, lançado em 1968. É considerado o 'modelo original'!",
    textEn: "The Custom Camaro was officially Hot Wheels casting #1, released in 1968. It's considered the 'original model'!",
  },

  // ==========================================
  // CULTURA DE COLECIONISMO (20+ fatos)
  // ==========================================
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
  {
    id: "th-symbol",
    category: "culture",
    text: "Treasure Hunts regulares têm um pequeno símbolo de chama no card. Super THs têm 'TH' discreto pintado no carro!",
    textEn: "Regular Treasure Hunts have a small flame symbol on the card. Super THs have a subtle 'TH' painted on the car!",
  },
  {
    id: "case-codes",
    category: "culture",
    text: "As caixas de Hot Wheels têm códigos (A-Q) que indicam o mix de modelos. Colecionadores experientes sabem quais caçar!",
    textEn: "Hot Wheels cases have codes (A-Q) indicating the model mix. Experienced collectors know which to hunt!",
  },
  {
    id: "peg-warming",
    category: "culture",
    text: "'Peg warmers' são modelos que ficam eternamente nas lojas porque ninguém quer. Geralmente são cores ou modelos impopulares.",
    textEn: "'Peg warmers' are models that stay forever in stores because nobody wants them. Usually unpopular colors or models.",
  },
  {
    id: "wheel-swap",
    category: "culture",
    text: "'Wheel swap' é a prática de trocar as rodas de um carro por outras mais bonitas ou realistas. É muito popular entre customizadores!",
    textEn: "'Wheel swap' is the practice of swapping a car's wheels for prettier or more realistic ones. Very popular among customizers!",
  },
  {
    id: "short-card-long-card",
    category: "culture",
    text: "Hot Wheels vêm em 'short card' (card curto, internacional) e 'long card' (card longo, EUA). Alguns preferem um ao outro!",
    textEn: "Hot Wheels come in 'short card' (short card, international) and 'long card' (long card, USA). Some prefer one over the other!",
  },
  {
    id: "super-chase",
    category: "culture",
    text: "O termo 'grail' (graal) é usado para se referir ao modelo que um colecionador mais deseja mas ainda não conseguiu encontrar.",
    textEn: "The term 'grail' is used to refer to the model a collector most desires but hasn't found yet.",
  },
  {
    id: "diorama-hobby",
    category: "culture",
    text: "Criar dioramas (cenários em miniatura) para fotografar carrinhos é um hobby que cresceu muito com as redes sociais!",
    textEn: "Creating dioramas (miniature sceneries) to photograph cars is a hobby that has grown a lot with social media!",
  },
  {
    id: "unspun-prototype",
    category: "culture",
    text: "'Unspun' é um modelo de teste sem os eixos finais. São extremamente raros e cobiçados por colecionadores hardcore.",
    textEn: "'Unspun' is a test model without the final axles. They're extremely rare and coveted by hardcore collectors.",
  },
  {
    id: "liberator",
    category: "culture",
    text: "O termo 'liberator' é usado para quem tira carrinhos das embalagens para brincar ou exibir. O oposto de colecionadores MOC!",
    textEn: "The term 'liberator' is used for those who take cars out of packages to play or display. The opposite of MOC collectors!",
  },
  {
    id: "moc-collector",
    category: "culture",
    text: "MOC significa 'Mint On Card' - carrinhos perfeitos ainda lacrados na embalagem original. Condição mais valorizada!",
    textEn: "MOC means 'Mint On Card' - perfect cars still sealed in original packaging. Most valued condition!",
  },
  {
    id: "scalping-ethics",
    category: "culture",
    text: "Na comunidade, 'scalpers' que compram todos os raros para revender são mal vistos. A ética é pegar um de cada!",
    textEn: "In the community, 'scalpers' who buy all rare ones to resell are frowned upon. The ethics is to take one of each!",
  },
  {
    id: "hw-nation",
    category: "culture",
    text: "A 'Hot Wheels Nation' é a comunidade global de colecionadores que se conectam através de fóruns, grupos e convenções.",
    textEn: "'Hot Wheels Nation' is the global community of collectors who connect through forums, groups, and conventions.",
  },
  {
    id: "display-cases",
    category: "culture",
    text: "Colecionadores investem em vitrines especiais com proteção UV e controle de umidade para preservar suas miniaturas.",
    textEn: "Collectors invest in special display cases with UV protection and humidity control to preserve their miniatures.",
  },
  {
    id: "catalog-system",
    category: "culture",
    text: "Aplicativos e planilhas para catalogar coleções são essenciais. Muitos colecionadores têm milhares de itens para organizar!",
    textEn: "Apps and spreadsheets for cataloging collections are essential. Many collectors have thousands of items to organize!",
  },
  {
    id: "meet-and-trade",
    category: "culture",
    text: "Encontros de troca são eventos populares onde colecionadores trocam, vendem e compram miniaturas entre si.",
    textEn: "Trade meets are popular events where collectors trade, sell, and buy miniatures among themselves.",
  },

  // ==========================================
  // CARROS REAIS ICÔNICOS (20+ fatos)
  // ==========================================
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
  {
    id: "toyota-ae86",
    category: "realCars",
    text: "O Toyota AE86 Trueno ficou famoso com Initial D e virou objeto de culto. É um dos carros JDM mais reproduzidos em miniatura!",
    textEn: "The Toyota AE86 Trueno became famous with Initial D and became a cult object. It's one of the most reproduced JDM cars in miniature!",
  },
  {
    id: "mazda-rx7",
    category: "realCars",
    text: "O Mazda RX-7 com motor rotativo Wankel tem uma legião de fãs. A versão FD3S de 1992 é especialmente popular em miniaturas!",
    textEn: "The Mazda RX-7 with Wankel rotary engine has a legion of fans. The 1992 FD3S version is especially popular in miniatures!",
  },
  {
    id: "dodge-charger",
    category: "realCars",
    text: "O Dodge Charger de 1969 ficou icônico como 'General Lee' em Dukes of Hazzard e como carro do Dom em Velozes e Furiosos!",
    textEn: "The 1969 Dodge Charger became iconic as 'General Lee' in Dukes of Hazzard and as Dom's car in Fast and Furious!",
  },
  {
    id: "mustang-1965",
    category: "realCars",
    text: "O Ford Mustang de 1965 vendeu 1 milhão de unidades no primeiro ano! É um dos muscle cars mais colecionados em todas as escalas.",
    textEn: "The 1965 Ford Mustang sold 1 million units in the first year! It's one of the most collected muscle cars in all scales.",
  },
  {
    id: "vw-kombi",
    category: "realCars",
    text: "A VW Kombi (Type 2) é símbolo da cultura hippie e surf. Existem dezenas de versões, incluindo campervans com interiores detalhados!",
    textEn: "The VW Kombi (Type 2) is a symbol of hippie and surf culture. There are dozens of versions, including campervans with detailed interiors!",
  },
  {
    id: "chevrolet-corvette",
    category: "realCars",
    text: "O Corvette é o esportivo americano mais longevo, produzido desde 1953. Cada geração (C1 a C8) tem muitas versões em miniatura!",
    textEn: "The Corvette is the longest-running American sports car, produced since 1953. Each generation (C1 to C8) has many miniature versions!",
  },
  {
    id: "bmw-m3",
    category: "realCars",
    text: "O BMW M3 E30 de 1986 revolucionou os sedãs esportivos. É um dos carros alemães mais reproduzidos em todas as escalas!",
    textEn: "The 1986 BMW M3 E30 revolutionized sports sedans. It's one of the most reproduced German cars in all scales!",
  },
  {
    id: "ferrari-f40",
    category: "realCars",
    text: "A Ferrari F40 foi o último carro supervisionado por Enzo Ferrari antes de morrer. É uma das miniaturas mais desejadas de sempre!",
    textEn: "The Ferrari F40 was the last car supervised by Enzo Ferrari before he died. It's one of the most desired miniatures ever!",
  },
  {
    id: "mclaren-f1",
    category: "realCars",
    text: "O McLaren F1 foi o carro mais rápido do mundo por 7 anos (1998-2005). Apenas 106 foram feitos, mas milhares de miniaturas existem!",
    textEn: "The McLaren F1 was the world's fastest car for 7 years (1998-2005). Only 106 were made, but thousands of miniatures exist!",
  },
  {
    id: "honda-civic-eg6",
    category: "realCars",
    text: "O Honda Civic EG6 (1991-1995) é lenda no tuning. Suas versões Spoon e Type R são muito procuradas em miniatura!",
    textEn: "The Honda Civic EG6 (1991-1995) is a tuning legend. Its Spoon and Type R versions are highly sought after in miniature!",
  },
  {
    id: "audi-quattro",
    category: "realCars",
    text: "O Audi Quattro revolucionou os ralis nos anos 80 com sua tração integral. A versão S1 Pikes Peak é especialmente icônica!",
    textEn: "The Audi Quattro revolutionized rallying in the 80s with its all-wheel drive. The S1 Pikes Peak version is especially iconic!",
  },
  {
    id: "subaru-impreza",
    category: "realCars",
    text: "O Subaru Impreza WRX STI, com seu icônico azul e dourado de rally, é um dos carros japoneses mais populares em miniaturas!",
    textEn: "The Subaru Impreza WRX STI, with its iconic rally blue and gold, is one of the most popular Japanese cars in miniatures!",
  },
  {
    id: "lancia-delta",
    category: "realCars",
    text: "O Lancia Delta Integrale venceu 6 campeonatos de rally consecutivos (1987-1992). É muito procurado por fãs de rally em miniatura!",
    textEn: "The Lancia Delta Integrale won 6 consecutive rally championships (1987-1992). Highly sought after by rally fans in miniature!",
  },
];

export function getRandomFacts(count: number = 5): CollectibleFact[] {
  const shuffled = [...collectibleFacts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
