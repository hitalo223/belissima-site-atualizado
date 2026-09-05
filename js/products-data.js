// Base de produtos do site. Enquanto não temos backend/banco de dados real,
// os produtos ficam aqui. Cada um tem: id (usado na URL), categoria, nome,
// preço, badge opcional (NOVO, -15% etc.), cores disponíveis e tamanhos.

const CATEGORY_LABELS = {
  sutias: 'Sutiãs',
  calcinhas: 'Calcinhas',
  bodies: 'Bodies',
  conjuntos: 'Conjuntos',
  pijamas: 'Pijamas',
  modeladores: 'Modeladores',
  outlet: 'Outlet',
};

const PRODUCTS = [
  // SUTIÃS
  { id: 'sutia-renda-sem-costura', category: 'sutias', name: 'Sutiã Renda Sem Costura', price: 189.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'sutia-bojo-basico', category: 'sutias', name: 'Sutiã Bojo Básico', price: 129.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'sutia-triangulo-cropped', category: 'sutias', name: 'Sutiã Triângulo Cropped', price: 159.90, badge: '-15%', colors: ['#9B7D7D', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'sutia-pushup-renda', category: 'sutias', name: 'Sutiã Push-up Renda', price: 199.90, colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G', 'GG'] },

  // CALCINHAS
  { id: 'calcinha-biquini-lisa', category: 'calcinhas', name: 'Calcinha Biquíni Lisa', price: 79.90, badge: '-15%', colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'calcinha-tanga-renda', category: 'calcinhas', name: 'Calcinha Tanga Renda', price: 69.90, colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G'] },
  { id: 'calcinha-boyshort-algodao', category: 'calcinhas', name: 'Calcinha Boyshort Algodão', price: 59.90, colors: ['#9B7D7D', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'calcinha-fio-renda', category: 'calcinhas', name: 'Calcinha Fio Dental Renda', price: 49.90, badge: 'NOVO', colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G'] },

  // BODIES
  { id: 'body-decote-v', category: 'bodies', name: 'Body Decote V', price: 219.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-renda-costas-nu', category: 'bodies', name: 'Body Renda Costas Nu', price: 239.90, colors: ['#9B7D7D', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'body-manga-longa-tule', category: 'bodies', name: 'Body Manga Longa Tule', price: 259.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-basico-algodao', category: 'bodies', name: 'Body Básico Algodão', price: 179.90, colors: ['#604C43', '#A99586'], sizes: ['P', 'M', 'G'] },

  // CONJUNTOS
  { id: 'conjunto-seda-natural', category: 'conjuntos', name: 'Conjunto Seda Natural', price: 259.90, colors: ['#B88F70', '#604C43'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'conjunto-renda-floral', category: 'conjuntos', name: 'Conjunto Renda Floral', price: 279.90, badge: 'NOVO', colors: ['#9B7D7D', '#C8AD88'], sizes: ['P', 'M', 'G'] },
  { id: 'conjunto-basico-microfibra', category: 'conjuntos', name: 'Conjunto Básico Microfibra', price: 149.90, colors: ['#A99586', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'conjunto-noite-cetim', category: 'conjuntos', name: 'Conjunto Noite Cetim', price: 299.90, colors: ['#604C43', '#B88F70'], sizes: ['P', 'M', 'G'] },

  // PIJAMAS
  { id: 'pijama-longo-cetim', category: 'pijamas', name: 'Pijama Longo Cetim', price: 249.90, colors: ['#604C43', '#A99586'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'pijama-curto-algodao', category: 'pijamas', name: 'Pijama Curto Algodão', price: 159.90, colors: ['#9B7D7D', '#F3EDE4'], sizes: ['P', 'M', 'G'] },
  { id: 'camisola-renda', category: 'pijamas', name: 'Camisola Renda', price: 219.90, badge: 'NOVO', colors: ['#604C43', '#C8AD88'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'short-doll-seda', category: 'pijamas', name: 'Short Doll Seda', price: 199.90, colors: ['#B88F70', '#A99586'], sizes: ['P', 'M', 'G'] },

  // MODELADORES
  { id: 'cinta-modeladora-alta', category: 'modeladores', name: 'Cinta Modeladora Alta', price: 179.90, colors: ['#604C43', '#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'short-modelador', category: 'modeladores', name: 'Short Modelador', price: 139.90, colors: ['#A99586'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'body-modelador', category: 'modeladores', name: 'Body Modelador', price: 229.90, colors: ['#604C43', '#9B7D7D'], sizes: ['P', 'M', 'G'] },
  { id: 'cinta-pos-parto', category: 'modeladores', name: 'Cinta Cirúrgica Pós-parto', price: 199.90, colors: ['#F3EDE4'], sizes: ['P', 'M', 'G', 'GG'] },

  // OUTLET
  { id: 'outlet-sutia-basico', category: 'outlet', name: 'Sutiã Básico (Outlet)', price: 69.90, badge: '-40%', colors: ['#A99586', '#604C43'], sizes: ['P', 'M', 'G'] },
  { id: 'outlet-conjunto-renda', category: 'outlet', name: 'Conjunto Renda (Outlet)', price: 149.90, badge: '-30%', colors: ['#9B7D7D'], sizes: ['P', 'M', 'G', 'GG'] },
  { id: 'outlet-pijama-algodao', category: 'outlet', name: 'Pijama Algodão (Outlet)', price: 89.90, badge: '-35%', colors: ['#604C43', '#F3EDE4'], sizes: ['P', 'M'] },
  { id: 'outlet-body-tule', category: 'outlet', name: 'Body Tule (Outlet)', price: 119.90, badge: '-40%', colors: ['#C8AD88'], sizes: ['P', 'M', 'G'] },
];

function getProductsByCategory(cat) {
  return PRODUCTS.filter((p) => p.category === cat);
}

function getProductById(id) {
  return PRODUCTS.find((p) => p.id === id);
}
