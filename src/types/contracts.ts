export enum ProductCategory {
  Electronics,
  Clothes,
  Luxury,
  Food,
  Medicine,
  Furniture,
  Books,
  Automobiles,
  Cosmetics,
  Other
}

export enum RequestStatus {
  Pending,
  Approved,
  Rejected,
  Completed
}

export interface ProductBatch {
  batchId: bigint;
  name: string;
  description: string;
  category: ProductCategory;
  owner: string;
  totalQuantity: bigint;
  unitPrice: bigint;
  isListed: boolean;
  parentBatch: bigint;
  timestamp: bigint;
}

export interface TransferRequest {
  requestId: bigint;
  batchId: bigint;
  seller: string;
  buyer: string;
  quantityRequested: bigint;
  totalAmount: bigint;
  status: RequestStatus;
  timestamp: bigint;
}
