export const getAdapterConnectionString = (databaseUrl: string) => {
  const normalizedUrl = new URL(databaseUrl);
  normalizedUrl.searchParams.delete('schema');
  return normalizedUrl.toString();
};

export const getAdapterSchema = (databaseUrl: string) => {
  const normalizedUrl = new URL(databaseUrl);
  return normalizedUrl.searchParams.get('schema') ?? undefined;
};
