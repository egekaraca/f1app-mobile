type SessionTime = { date: string; time?: string };

export type Race = {
  season?: string;
  round?: string;
  raceName: string;
  date: string;   // "2025-03-14"
  time?: string;  // "15:00:00Z" (UTC)
  Circuit: {
    circuitId?: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };
  // Optional session schedule (present in season schedule endpoint)
  FirstPractice?:  SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?:  SessionTime;
  SprintQualifying?: SessionTime;
  Sprint?:         SessionTime;
  Qualifying?:     SessionTime;
};
  