import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  isHoliday?: boolean;
}

export const useCalendarEvents = (timeMin?: string, timeMax?: string) => {
  return useQuery({
    queryKey: ["calendar-events", timeMin, timeMax],
    queryFn: async () => {
      let url = "/api/calendar";
      const params = new URLSearchParams();
      if (timeMin) params.append("timeMin", timeMin);
      if (timeMax) params.append("timeMax", timeMax);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch events");
      }
      const data = await res.json();
      return data.items as CalendarEvent[];
    },
    retry: false,
  });
};

export const useAddCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Partial<CalendarEvent>) => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        throw new Error("Failed to add event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, event }: { eventId: string; event: Partial<CalendarEvent> }) => {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        throw new Error("Failed to update event");
      }
      return res.json();
    },
    onMutate: async ({ eventId, event }) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-events"] });
      
      const previousQueries = queryClient.getQueriesData({ queryKey: ["calendar-events"] });
      
      queryClient.setQueriesData({ queryKey: ["calendar-events"] }, (old: CalendarEvent[] | undefined) => {
        if (!old) return old;
        return old.map(e => e.id === eventId ? { ...e, ...event } : e);
      });
      
      return { previousQueries };
    },
    onError: (err, newEvent, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete event");
      }
      return res.json();
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: ["calendar-events"] });
      
      const previousQueries = queryClient.getQueriesData({ queryKey: ["calendar-events"] });
      
      queryClient.setQueriesData({ queryKey: ["calendar-events"] }, (old: CalendarEvent[] | undefined) => {
        if (!old) return old;
        return old.filter(e => e.id !== eventId);
      });
      
      return { previousQueries };
    },
    onError: (err, eventId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
};

