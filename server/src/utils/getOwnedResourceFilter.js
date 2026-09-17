export function getOwnedResourceFilter(resourceId, userId) {
  return { _id: resourceId, userId };
}
