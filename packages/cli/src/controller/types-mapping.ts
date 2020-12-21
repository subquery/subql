// Model type mapping

const typeMap = new Map();
typeMap.set('ID', 'string');
typeMap.set('Int', 'number');
typeMap.set('BigInt', 'BigInt');
typeMap.set('String', 'string');
typeMap.set('Date', 'Date');
typeMap.set('Float', 'number');
typeMap.set('BigDecimal', 'number');

export function transformTypes(className: string, fieldType: string): string {
  const trimType = fieldType.trim();
  return typeMap.get(trimType);
}
