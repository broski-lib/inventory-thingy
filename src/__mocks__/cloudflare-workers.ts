const mockImages = {
  put: async (_key: string, _body: ArrayBuffer | Uint8Array) => {},
  get: async (_key: string) => null as R2ObjectBody | null,
  delete: async (_key: string) => {},
}

export function setMockImages(mock: Partial<typeof mockImages>) {
  Object.assign(mockImages, mock)
}

export const env = {
  ITEM_IMAGES: mockImages as unknown as R2Bucket,
}
