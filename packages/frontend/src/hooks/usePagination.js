import { useMemo, useState } from "react";
export const usePagination = (initialPageSize = 10) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [total, setTotal] = useState(0);
    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
    return { page, pageSize, total, totalPages, setPage, setPageSize, setTotal };
};
