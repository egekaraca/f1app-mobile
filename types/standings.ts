export type DriverStanding = {
    position: number;
    points: number;
    wins: number;
    Driver: {
      driverId: string;
      code?: string;
      givenName: string;
      familyName: string;
      nationality?: string;
      permanentNumber?: string;
    };
    Constructors: Array<{
      constructorId: string;
      name: string;
      nationality?: string;
    }>;
  };
  
  export type ConstructorStanding = {
    position: number;
    points: number;
    wins: number;
    Constructor: {
      constructorId: string;
      name: string;
      nationality?: string;
    };
  };
  