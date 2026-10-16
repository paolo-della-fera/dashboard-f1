// Types mirroring the Jolpica (Ergast-compatible) JSON responses.
// Numeric values are kept as strings, exactly as the API returns them.
// Fields that are often missing in older seasons are optional.

export type Season = number | 'current'

export interface Location {
  lat: string
  long: string
  locality: string
  country: string
}

export interface Circuit {
  circuitId: string
  url?: string
  circuitName: string
  Location: Location
}

export interface Driver {
  driverId: string
  permanentNumber?: string
  code?: string
  url?: string
  givenName: string
  familyName: string
  dateOfBirth?: string
  nationality?: string
}

export interface Constructor {
  constructorId: string
  url?: string
  name: string
  nationality?: string
}

export interface SessionTime {
  date: string
  time?: string
}

export interface ResultTime {
  millis?: string
  time: string
}

export interface FastestLap {
  rank?: string
  lap?: string
  Time?: { time: string }
  AverageSpeed?: { units: string; speed: string }
}

export interface Result {
  number?: string
  position: string
  positionText: string
  points: string
  Driver: Driver
  Constructor: Constructor
  grid?: string
  laps?: string
  status?: string
  Time?: ResultTime
  FastestLap?: FastestLap
}

export type SprintResult = Result

export interface QualifyingResult {
  number?: string
  position: string
  Driver: Driver
  Constructor: Constructor
  Q1?: string
  Q2?: string
  Q3?: string
}

export interface Race {
  season: string
  round: string
  url?: string
  raceName: string
  Circuit: Circuit
  date: string
  time?: string
  FirstPractice?: SessionTime
  SecondPractice?: SessionTime
  ThirdPractice?: SessionTime
  Qualifying?: SessionTime
  Sprint?: SessionTime
  SprintQualifying?: SessionTime
  SprintShootout?: SessionTime
  Results?: Result[]
  QualifyingResults?: QualifyingResult[]
  SprintResults?: SprintResult[]
}

export interface DriverStanding {
  position?: string
  positionText: string
  points: string
  wins: string
  Driver: Driver
  Constructors: Constructor[]
}

export interface ConstructorStanding {
  position?: string
  positionText: string
  points: string
  wins: string
  Constructor: Constructor
}

export interface StandingsList {
  season: string
  round: string
  DriverStandings?: DriverStanding[]
  ConstructorStandings?: ConstructorStanding[]
}

export interface RaceTable {
  season?: string
  round?: string
  driverId?: string
  Races: Race[]
}

export interface DriverTable {
  Drivers: Driver[]
}

export interface SeasonEntry {
  season: string
  url?: string
}

export interface SeasonTable {
  driverId?: string
  Seasons: SeasonEntry[]
}

export interface StandingsTable {
  season?: string
  driverId?: string
  StandingsLists: StandingsList[]
}

export interface MRData {
  xmlns?: string
  series?: string
  url?: string
  limit: string
  offset: string
  total: string
  RaceTable?: RaceTable
  DriverTable?: DriverTable
  SeasonTable?: SeasonTable
  StandingsTable?: StandingsTable
}

export interface JolpicaResponse {
  MRData: MRData
}
