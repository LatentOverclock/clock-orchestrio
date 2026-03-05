type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

export async function graphQLRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  const payload = (await res.json()) as GraphQLResponse<T>
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  if (!payload.data) throw new Error('No data returned')
  return payload.data
}
