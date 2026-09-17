import { getCreditLedger } from "@/renderer/request"
import type { CreditLedgerResponse } from "@/shared/types"
import { type UseQueryOptions, useQuery } from "@tanstack/react-query"

const CREDIT_RECORDS_QUERY_CONFIG = {
	STALE_TIME: 1000 * 60 * 3,
	RETRY: 3,
	RETRY_DELAY: 2000,
} as const

export const useCreditRecords = (
	enabled = true,
	page = 1,
	size = 20,
	options?: Partial<UseQueryOptions<CreditLedgerResponse | null, Error>>,
) => {
	const {
		data: creditRecords,
		isLoading: isLoadingCreditRecords,
		isFetching: isFetchingCreditRecords,
		refetch: refetchCreditRecords,
	} = useQuery({
		queryKey: ["credit-ledger", page, size],
		queryFn: async () => {
			try {
				return await getCreditLedger({ page, size })
			} catch (error) {
				console.error("查询积分流水失败:", error)
				throw error
			}
		},
		enabled,
		staleTime: CREDIT_RECORDS_QUERY_CONFIG.STALE_TIME,
		retry: CREDIT_RECORDS_QUERY_CONFIG.RETRY,
		retryDelay: CREDIT_RECORDS_QUERY_CONFIG.RETRY_DELAY,
		refetchOnReconnect: true,
		refetchOnWindowFocus: "always",
		...options,
	})

	return {
		creditRecords,
		isLoadingCreditRecords,
		isFetchingCreditRecords,
		refetchCreditRecords,
	}
}
