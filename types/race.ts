export type Race = {
    season?: string;
    round?: string;
    raceName: string;
    date: string;   // "2025-03-14" gibi
    time?: string;  // "15:00:00Z" gibi (UTC)
    Circuit: {
      circuitName: string;
      Location: {
        locality: string;
        country: string;
      };
    };
  };
  