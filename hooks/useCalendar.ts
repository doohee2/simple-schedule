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
  // other properties...
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
