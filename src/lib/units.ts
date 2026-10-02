/**
 * Lista oficial de unidades de saúde (AP 53) aceitas no login.
 * O usuário só enxerga registros da unidade selecionada.
 */
export const UNITS = [
  'SMS CF DEOLINDO COUTO AP 53',
  'SMS CF EDSON ABDALLA SAAD AP 53',
  'SMS CF HELANDE DE MELLO GONCALVES AP 53',
  'SMS CF ILZO MOTTA DE MELLO AP 53',
  'SMS CF JAMIL HADDAD AP 53',
  'SMS CF JOSE ANTONIO CIRAUDO AP 53',
  'SMS CF LENICE MARIA MONTEIRO COELHO AP 53',
  'SMS CF SERGIO AROUCA AP 53',
  'SMS CMS CYRO DE MELLO MANGUARIBA AP 53',
  'SMS CMS ADELINO SIMOES NOVA SEPETIBA AP 53',
  'SMS CF ERNANI DE PAIVA FERREIRA BRAGA AP 53',
  'SMS CF JOAO BATISTA CHAGAS AP 53',
  'SMS CMS ALOYSIO AMANCIO DA SILVA AP 53',
  'SMS CF ALICE DE JESUS REGO AP 53',
  'SMS CMS CATTAPRETA AP 53',
  'SMS CMS FLORIPES GALDINO PEREIRA AP 53',
  'SMS CMS CESARIO DE MELLO AP 53',
  'SMS CMS EMYDIO CABRAL AP 53',
  'SMS CMS MARIA APARECIDA DE ALMEIDA AP 53',
  'SMS CF WALDEMAR BERARDINELLI AP 53',
  'SMS CMS DECIO AMARAL FILHO AP 53',
  'SMS CMS SAVIO ANTUNES ANTARES AP 53',
  'SMS CF VALERIA GOMES ESTEVES AP 53',
  'SMS CF LOURENCO DE MELLO AP 53',
  'SMS CF SAMUEL PENHA VALLE AP 53',
] as const;

export type UnitName = (typeof UNITS)[number];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const NORMALIZED_UNITS: ReadonlyMap<string, UnitName> = new Map(
  UNITS.map((unit) => [normalize(unit), unit]),
);

export function isUnit(value: unknown): value is UnitName {
  return typeof value === 'string' && UNITS.includes(value as UnitName);
}

/**
 * Resolve um valor vindo de CSV/importação para a unidade canônica.
 * Aceita variações de acento, caixa e espaços.
 * Retorna `null` quando o valor está vazio ou não corresponde a nenhuma unidade.
 */
export function matchUnit(value: string): UnitName | null {
  if (value.trim() === '') {
    return null;
  }

  return NORMALIZED_UNITS.get(normalize(value)) ?? null;
}

/** Nome curto exibido no header (remove o sufixo "AP 53"). */
export function unitLabel(unit: UnitName): string {
  return unit.replace(/\s+AP\s+\d+$/i, '');
}

/** Tipo da unidade — CF ou CMS — usado como chip visual. */
export function unitKind(unit: UnitName): 'CF' | 'CMS' {
  return unit.includes(' CMS ') ? 'CMS' : 'CF';
}
