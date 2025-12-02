"use client";

import useSWR from "swr";
import { executeQuery } from "@/lib/baseql";
import type { Cohort } from "@/types/schema";

/**
 * Hook to fetch all cohorts (excluding those with classes)
 */
export function useCohorts() {
  const { data, error, isLoading } = useSWR(
    "/api/cohorts",
    async () => {
      const query = `
        query GetCohorts {
          cohorts(
            _order_by: { startDate: "desc" }
          ) {
            id
            shortName
            cohortNumber
            startDate
            endDate
            status
            topics {
              id
              name
            }
            initiative {
              id
              name
            }
            classes {
              id
            }
          }
        }
      `;

      const result = await executeQuery<{ cohorts: any[] }>(query);

      // Filter out cohorts that have classes
      const filteredCohorts = (result.cohorts || []).filter(
        (cohort) => !cohort.classes || cohort.classes.length === 0
      );

      // Transform cohorts to add display name (Topic Name - Initiative Name)
      const transformedCohorts = filteredCohorts.map((cohort) => {
        const topicName = cohort.topics?.[0]?.name || "";
        const initiativeName = cohort.initiative?.[0]?.name || "";

        let displayName = cohort.shortName;
        if (topicName && initiativeName) {
          displayName = `${topicName} - ${initiativeName}`;
        } else if (topicName) {
          displayName = topicName;
        } else if (initiativeName) {
          displayName = initiativeName;
        }

        return {
          ...cohort,
          displayName,
        };
      });

      return transformedCohorts;
    }
  );

  return {
    cohorts: data || [],
    isLoading,
    error,
  };
}
