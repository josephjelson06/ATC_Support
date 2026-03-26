export const parseSearchEntityId = (search: string) => {
  const digits = search.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  const parsedId = Number(digits);
  return Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null;
};
