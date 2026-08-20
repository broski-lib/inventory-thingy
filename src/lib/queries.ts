import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import {
  createItem,
  updateItem,
  deleteItem,
  bulkDeleteItems,
  bulkUpdateStatus,
  bulkUpdateLocation,
  uploadItemImage,
} from "./inventory"
import type { CreateItemInput, UpdateItemInput } from "./inventory"
import type { ItemCondition, ItemStatus } from "./constants"
import { createTag, updateTag, deleteTag, setItemTags } from "./tags"
import { addBatch, moveBatchQty, setBatchQty, deleteBatch } from "./batches"
import { createRack, updateRack, deleteRack } from "./racks"
import type { CreateRackInput, UpdateRackInput } from "./racks"

function useInvalidate() {
  const router = useRouter()
  return () => {
    router.invalidate()
  }
}

export function useCreateItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreateItemInput) => createItem({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useUpdateItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useDeleteItem() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteItem({ data: id }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useBulkDeleteItems() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteItems({ data: ids }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useBulkUpdateStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { ids: string[]; status: ItemStatus }) =>
      bulkUpdateStatus({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useBulkUpdateLocation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { ids: string[]; location: string }) =>
      bulkUpdateLocation({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useUploadItemImage() {
  return useMutation({
    mutationFn: (formData: FormData) => uploadItemImage({ data: formData }),
  })
}

export function useCreateTag() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      createTag({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useUpdateTag() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { id: string; name?: string; color?: string }) =>
      updateTag({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useDeleteTag() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteTag({ data: id }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useSetItemTags() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { itemId: string; tagIds: string[] }) =>
      setItemTags({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useAddBatch() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (
      input: { itemId: string; qty: number } & {
        location: string
        status: ItemStatus
        condition: ItemCondition
      }
    ) => addBatch({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useMoveBatchQty() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (
      input: { itemId: string; fromBatchId: string; qty: number } & {
        location: string
        status: ItemStatus
        condition: ItemCondition
      }
    ) => moveBatchQty({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useSetBatchQty() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { batchId: string; itemId: string; qty: number }) =>
      setBatchQty({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useDeleteBatch() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { batchId: string; itemId: string }) =>
      deleteBatch({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useCreateRack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: CreateRackInput) => createRack({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useUpdateRack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: UpdateRackInput) => updateRack({ data: input }),
    onSuccess: () => {
      invalidate()
    },
  })
}

export function useDeleteRack() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => deleteRack({ data: id }),
    onSuccess: () => {
      invalidate()
    },
  })
}
