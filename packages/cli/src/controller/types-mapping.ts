// Model type mapping

const typeMap = new Map()
typeMap.set('ID', 'string')
typeMap.set('Int', 'number')

export function transformTypes(fieldType: string) {
  // return entity[0]
  // console.log( typeMap.get(fieldType))

  const trim_type = fieldType.trim()
  return typeMap.get(trim_type)
}
