// Model type mapping

const typeMap = new Map();
typeMap.set('ID', 'string');
typeMap.set('Int', 'number');
typeMap.set('BigInt', 'BN');
typeMap.set('String', 'string');
typeMap.set('Date', 'Date');
typeMap.set('Float', 'number');
typeMap.set('BigDecimal', 'number');

export function transformTypes(className: string, fieldType: string) {
  // return entity[0]
  // assert(!typeMap.has(fieldType) === false, `Cannot find field type name ${fieldType}`)

  const trim_type = fieldType.trim();
  return typeMap.get(trim_type);
}
