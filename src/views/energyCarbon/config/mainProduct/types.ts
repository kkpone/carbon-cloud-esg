/** 产品分页行。 */
export interface ProductRecord {
  id: number;
  productName: string;
  productCode: string;
  productSpecification?: string | null;
  productModel?: string | null;
  unit: string;
  unitName?: string | null;
  standardCoefficient: string | number;
  standardProduct: boolean;
  description?: string | null;
  updateByName?: string | null;
  updateTime?: string | null;
}

/** 产品分页查询参数。 */
export interface ProductListParams {
  pageNum: number;
  pageSize: number;
  productName?: string;
  productCode?: string;
}

/** 产品分页响应。 */
export interface ProductPage {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: ProductRecord[];
}

/** 产品新增业务字段。 */
export interface ProductAddReq {
  productName: string;
  productCode: string;
  productSpecification?: string;
  productModel?: string;
  unit: string;
  standardCoefficient: string;
  standardProduct: boolean;
  description?: string;
}

/** 产品编辑请求。 */
export interface ProductEditReq extends ProductAddReq {
  id: number;
}
