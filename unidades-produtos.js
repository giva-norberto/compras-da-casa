// ListaLar - unidades padrão dos produtos
// Este arquivo pode ser ampliado sem aumentar o tamanho do index.html.

export const unidadesPadrao = {
  // Alimentos básicos
  arroz: 'kg',
  feijao: 'kg',
  acucar: 'kg',
  sal: 'kg',
  farinha: 'kg',
  farofa: 'kg',
  'farelo de aveia': 'kg',
  aveia: 'kg',
  cacau: 'kg',
  'cacau em po': 'kg',
  cafe: 'pct',
  neston: 'pct',
  toddy: 'pct',
  whey: 'pct',

  // Carnes e frios
  carne: 'kg',
  frango: 'kg',
  'peito de frango': 'kg',
  asinha: 'kg',
  linguica: 'kg',
  salmao: 'kg',
  tilapia: 'kg',
  bacon: 'kg',
  mussarela: 'kg',
  queijo: 'kg',
  'queijo parmesao': 'pct',
  requeijao: 'un',
  manteiga: 'un',

  // Hortifruti
  cebola: 'kg',
  cebolinha: 'mç',
  cenoura: 'kg',
  'couve flor': 'un',
  alho: 'kg',
  alecrim: 'mç',
  ameixa: 'kg',
  banana: 'kg',
  'batata inglesa': 'kg',
  limao: 'kg',
  mamao: 'un',
  mandioca: 'kg',
  manga: 'kg',
  maca: 'kg',
  pimentao: 'kg',
  'tomate cereja': 'bdj',
  tomilho: 'mç',

  // Bebidas e líquidos
  leite: 'L',
  oleo: 'L',
  azeite: 'ml',
  'suco de uva': 'L',
  'vinagre de maca': 'L',
  'vinagre de alcool': 'L',
  'agua sanitaria': 'L',

  // Padaria e lanches
  pao: 'un',
  'pao de forma': 'pct',
  bisnaguinha: 'pct',
  biscoito: 'pct',
  pipoca: 'pct',
  bala: 'pct',
  'batata frita': 'pct',
  'batata palha': 'pct',
  'massa de pastel': 'pct',

  // Enlatados e conservas
  ervilha: 'lata',
  milho: 'lata',
  azeitona: 'vd',
  'atum em pedacos no oleo': 'lata',
  'atum em pedacos no oleo defumado': 'lata',

  // Ovos e laticínios
  ovo: 'un',
  ovos: 'un',
  iorgute: 'un',

  // Limpeza
  detergente: 'un',
  desinfetante: 'L',
  desengordurante: 'un',
  amaciante: 'L',
  'sabao em po': 'kg',
  'saco de lixo': 'pct',

  // Higiene e cuidados pessoais
  absorvente: 'pct',
  algodao: 'pct',
  'creme dental': 'un',
  sabonete: 'un',
  shampoo: 'un',
  'papel higienico': 'pct',

  // Casa e utilidades
  canecas: 'un',
  'balde pequeno': 'un',

  // Outros
  petisco: 'pct',
  faro: 'un'
};

export function normalizarNomeProduto(valor) {
  return String(valor || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function obterUnidadePadrao(nomeProduto) {
  const nomeNormalizado = normalizarNomeProduto(nomeProduto);

  return unidadesPadrao[nomeNormalizado] || 'un';
}
