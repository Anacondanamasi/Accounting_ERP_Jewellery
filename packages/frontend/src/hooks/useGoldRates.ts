import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "@/services/inventoryService";

export const useGoldRates = () =>
  useQuery({
    queryKey: ["metal-rates", "today"],
    queryFn: inventoryService.getTodayRates,
    refetchInterval: 5 * 60 * 1000,
  });
