/**
 * Shared list pagination + sorting helpers for server-rendered tables.
 * Pages parse the URL search params into `ListParams`; data functions apply
 * them as SQL limit/offset/orderBy and return a `Paged<T>` envelope.
 */

export const PAGE_SIZE = 50;

export type SortDir = "asc" | "desc";

export type ListParams = {
  page: number;
  pageSize: number;
  offset: number;
  /** Validated sort key (one of the allowed sortable columns), or null. */
  sort: string | null;
  dir: SortDir;
  /** Free-text search term (lists that support it). */
  q: string;
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export function parseListParams(
  sp: RawParams,
  opts: { sortable: readonly string[] },
): ListParams {
  const page = Math.max(1, parseInt(str(sp.page), 10) || 1);
  const sortRaw = str(sp.sort);
  const sort = opts.sortable.includes(sortRaw) ? sortRaw : null;
  const dirRaw = str(sp.dir);
  const dir: SortDir = dirRaw === "asc" ? "asc" : "desc";
  return {
    page,
    pageSize: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    sort,
    dir,
    q: str(sp.q).trim(),
  };
}

export function paged<T>(rows: T[], total: number, p: ListParams): Paged<T> {
  return {
    rows,
    total,
    page: p.page,
    pageSize: p.pageSize,
    pageCount: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
