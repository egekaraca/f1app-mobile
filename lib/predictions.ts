import { getDriverStandings, getConstructorStandings, getSeasonRaces } from './api';
import { fetchF1News, type NewsItem } from './news';
import type { DriverStanding, ConstructorStanding } from '../types/standings';
import type { Race } from '../types/race';

export interface ChampionshipPrediction {
  driverId: string;
  driverName: string;
  currentPosition: number;
  currentPoints: number;
  predictedFinish: number;
  championshipProbability: number;
  analysis: string;
  keyFactors: string[];
}

export interface ConstructorPrediction {
  constructorId: string;
  constructorName: string;
  currentPosition: number;
  currentPoints: number;
  predictedFinish: number;
  championshipProbability: number;
  analysis: string;
  keyFactors: string[];
}

export interface PredictionAnalysis {
  drivers: ChampionshipPrediction[];
  constructors: ConstructorPrediction[];
  seasonInsights: {
    racesCompleted: number;
    racesRemaining: number;
    seasonProgress: number;
    keyInsights: string[];
  };
  newsInsights?: {
    trendingUp: string[];
    trendingDown: string[];
    recentWins: string[];
    formAnalysis: string;
  };
}

interface NewsAnalysis {
  driverTrends: Map<string, 'up' | 'down' | 'neutral'>;
  constructorTrends: Map<string, 'up' | 'down' | 'neutral'>;
  recentWinners: Set<string>;
  formIndicators: Map<string, number>; // -1 to 1, where 1 is excellent form
}

export async function generateChampionshipPredictions(season: string): Promise<PredictionAnalysis> {
  try {
    // Fetch current data and news
    const [driverStandings, constructorStandings, races, news] = await Promise.all([
      getDriverStandings(season),
      getConstructorStandings(season),
      getSeasonRaces(season),
      fetchF1News().catch(() => []) as Promise<NewsItem[]>,
    ]);

    const now = new Date();
    const completedRaces = races.filter(race => new Date(race.date) < now);
    const remainingRaces = races.filter(race => new Date(race.date) >= now);
    
    const seasonProgress = races.length > 0 ? (completedRaces.length / races.length) * 100 : 0;

    // Analyze news for trends and form indicators
    const newsAnalysis = analyzeNewsForTrends(news, driverStandings, constructorStandings);

    // Generate driver predictions with news context
    let driverPredictions = generateDriverPredictions(driverStandings, seasonProgress, remainingRaces.length, newsAnalysis);
    
    // Generate constructor predictions with news context
    let constructorPredictions = generateConstructorPredictions(constructorStandings, seasonProgress, remainingRaces.length, newsAnalysis);

    // Normalize probabilities (ensure they sum to ~1.0 for top contenders)
    const driverTotal = driverPredictions.slice(0, 5).reduce((sum, d) => sum + d.championshipProbability, 0);
    if (driverTotal > 0) {
      driverPredictions = driverPredictions.map(d => ({
        ...d,
        championshipProbability: d.championshipProbability / driverTotal * 0.85 // Scale to 85% for top 5
      }));
    }

    const constructorTotal = constructorPredictions.slice(0, 4).reduce((sum, c) => sum + c.championshipProbability, 0);
    if (constructorTotal > 0) {
      constructorPredictions = constructorPredictions.map(c => ({
        ...c,
        championshipProbability: c.championshipProbability / constructorTotal * 0.90 // Scale to 90% for top 4
      }));
    }

    // Generate season insights
    const seasonInsights = generateSeasonInsights(driverStandings, constructorStandings, seasonProgress, completedRaces.length, remainingRaces.length);

    return {
      drivers: driverPredictions,
      constructors: constructorPredictions,
      seasonInsights,
      newsInsights: newsAnalysis,
    };
  } catch (error) {
    console.error('Error generating championship predictions:', error);
    throw new Error('Failed to generate championship predictions');
  }
}

function generateDriverPredictions(
  standings: DriverStanding[], 
  seasonProgress: number, 
  racesRemaining: number,
  newsAnalysis?: NewsAnalysis
): ChampionshipPrediction[] {
  // Build teammate relationships
  const teammateMap = new Map<string, DriverStanding[]>();
  standings.forEach(driver => {
    const constructorId = driver.Constructors?.[0]?.constructorId;
    if (constructorId) {
      if (!teammateMap.has(constructorId)) {
        teammateMap.set(constructorId, []);
      }
      teammateMap.get(constructorId)!.push(driver);
    }
  });

  return standings.slice(0, 10).map((driver, index) => {
    const pointsGap = index === 0 ? 0 : standings[0].points - driver.points;
    const maxPossiblePoints = driver.points + (racesRemaining * 26); // Max points per race
    
    // Find teammate if exists
    const constructorId = driver.Constructors?.[0]?.constructorId;
    const teammates = constructorId ? teammateMap.get(constructorId) : [];
    const teammate = teammates?.find(t => t.Driver.driverId !== driver.Driver.driverId);
    
    // Adjust probability based on teammate performance
    let teammateAdjustment = 1;
    if (teammate && teamsInSameChampionshipBattle(standings, driver, teammate, 3)) {
      const teammateGap = Math.abs(driver.points - teammate.points);
      if (teammateGap < 30) {
        // Teammates are close in championship - share probability more evenly
        teammateAdjustment = driver.points >= teammate.points ? 1.1 : 0.9;
      }
    }
    
    // Calculate championship probability based on multiple factors
    let probability = calculateDriverProbability(driver, index, pointsGap, seasonProgress, racesRemaining, newsAnalysis);
    probability *= teammateAdjustment;
    
    // Generate analysis
    const analysis = generateDriverAnalysis(driver, index, pointsGap, seasonProgress, racesRemaining);
    
    // Generate key factors
    const keyFactors = generateDriverKeyFactors(driver, index, pointsGap, seasonProgress);

    return {
      driverId: driver.Driver.driverId,
      driverName: `${driver.Driver.givenName} ${driver.Driver.familyName}`,
      currentPosition: driver.position,
      currentPoints: driver.points,
      predictedFinish: predictFinalPosition(driver, index, probability),
      championshipProbability: probability,
      analysis,
      keyFactors,
    };
  });
}

function teamsInSameChampionshipBattle(
  standings: DriverStanding[], 
  driver1: DriverStanding, 
  driver2: DriverStanding, 
  battleRange: number
): boolean {
  const pos1 = driver1.position;
  const pos2 = driver2.position;
  return Math.abs(pos1 - pos2) <= battleRange && pos1 <= battleRange;
}

function generateConstructorPredictions(
  standings: ConstructorStanding[], 
  seasonProgress: number, 
  racesRemaining: number,
  newsAnalysis?: NewsAnalysis
): ConstructorPrediction[] {
  return standings.slice(0, 8).map((constructor, index) => {
    const pointsGap = index === 0 ? 0 : standings[0].points - constructor.points;
    const maxPossiblePoints = constructor.points + (racesRemaining * 44); // Max constructor points per race
    
    // Calculate championship probability
    let probability = calculateConstructorProbability(constructor, index, pointsGap, seasonProgress, racesRemaining, newsAnalysis);
    
    // Generate analysis
    const analysis = generateConstructorAnalysis(constructor, index, pointsGap, seasonProgress, racesRemaining);
    
    // Generate key factors
    const keyFactors = generateConstructorKeyFactors(constructor, index, pointsGap, seasonProgress);

    return {
      constructorId: constructor.Constructor.constructorId,
      constructorName: constructor.Constructor.name,
      currentPosition: constructor.position,
      currentPoints: constructor.points,
      predictedFinish: predictFinalPosition(constructor, index, probability),
      championshipProbability: probability,
      analysis,
      keyFactors,
    };
  });
}

function calculateDriverProbability(
  driver: DriverStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number, 
  racesRemaining: number,
  newsAnalysis?: NewsAnalysis
): number {
  let probability = 0;

  // CRITICAL: Calculate maximum possible points
  // In F1, max points per race = 25 (win) + 1 (fastest lap) = 26
  // If someone is mathematically out, return 0
  const maxPossiblePoints = driver.points + (racesRemaining * 26);
  
  // If max possible points can't catch the leader (if leader is assumed to score 0), it's impossible
  // But we need to check if leader could theoretically be caught
  // For simplicity, let's assume leader maintains current pace
  const maxPossibleCatch = pointsGap / racesRemaining; // points needed per race to catch up
  
  // If mathematically impossible (need more than 26 points per race), return 0
  if (racesRemaining > 0 && pointsGap > racesRemaining * 26) {
    return 0;
  }

  // Calculate required average points per race to win
  const requiredPPR = (pointsGap / racesRemaining) || 0;
  
  // Realistic position weights (sum to ~1.0)
  const positionWeights = [0.55, 0.30, 0.08, 0.04, 0.02, 0.007, 0.002, 0.001, 0.0002, 0.0001];
  probability = positionWeights[position] || 0.00001;

  // STRICT points gap penalty - more realistic
  if (pointsGap > 0 && racesRemaining > 0) {
    // Calculate how many "perfect races" needed
    const perfectRacesNeeded = pointsGap / 26;
    const raceGapRatio = perfectRacesNeeded / racesRemaining;
    
    if (raceGapRatio > 1) {
      // Needs more than 1 perfect race per remaining race = impossible
      return 0;
    } else if (raceGapRatio > 0.7) {
      // Needs 70%+ of remaining races to be perfect = nearly impossible
      probability *= 0.001;
    } else if (raceGapRatio > 0.5) {
      // Needs 50%+ perfect races = extremely unlikely
      probability *= 0.01;
    } else if (raceGapRatio > 0.3) {
      // Needs 30%+ perfect races = very difficult
      probability *= 0.05;
    } else if (raceGapRatio > 0.15) {
      probability *= 0.15;
    } else {
      // Manageable gap
      probability *= Math.max(1 - raceGapRatio * 1.5, 0.1);
    }
  }

  // Adjust based on season progress (late season = harsher)
  if (seasonProgress > 70) {
    // Very late season
    if (position === 0) {
      probability *= 1.5; // Leader advantage is huge
    } else if (pointsGap > 15) {
      probability *= 0.3; // Large gaps very hard to close
    } else {
      probability *= 0.6;
    }
  } else if (seasonProgress > 50) {
    // Mid-late season
    if (position === 0) {
      probability *= 1.2;
    } else if (pointsGap > 30) {
      probability *= 0.5;
    } else {
      probability *= 0.75;
    }
  } else if (seasonProgress > 30) {
    // Mid season
    if (position === 0) {
      probability *= 1.1;
    } else {
      probability *= 0.85;
    }
  }
  // Early season (seasonProgress < 30): keep as is, high uncertainty

  // Wins are important but don't overvalue them
  const winBonus = Math.min(driver.wins / 6, 0.2);
  probability *= (1 + winBonus);

  // Consistency matters
  const pointsPerRace = driver.points / Math.max(seasonProgress / 100, 0.01);
  const avgPointsExpected = 15;
  if (pointsPerRace > avgPointsExpected && position <= 3) {
    const consistencyBonus = Math.min((pointsPerRace - avgPointsExpected) / 25, 0.15);
    probability *= (1 + consistencyBonus);
  }

  // Apply news-based adjustments
  if (newsAnalysis) {
    const driverId = driver.Driver.driverId;
    const trend = newsAnalysis.driverTrends.get(driverId);
    const formScore = newsAnalysis.formIndicators.get(driverId) || 0;
    const recentWin = newsAnalysis.recentWinners.has(driverId);

    // Recent win boost
    if (recentWin) {
      probability *= 1.15; // +15% boost from recent victory
    }

    // Trend adjustments
    if (trend === 'up') {
      probability *= 1.2; // +20% for upward trend
    } else if (trend === 'down') {
      probability *= 0.7; // -30% for downward trend
    }

    // Form score adjustment (-0.15 to +0.15)
    probability *= (1 + formScore * 0.15);
  }

  return Math.min(Math.max(probability, 0), 1);
}

function calculateConstructorProbability(
  constructor: ConstructorStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number, 
  racesRemaining: number,
  newsAnalysis?: NewsAnalysis
): number {
  let probability = 0;

  // CRITICAL: Calculate maximum possible points for constructors
  // In F1, max constructor points per race = 25+18 (both drivers podium) + 2 (fastest laps) = 45
  // Actually, best case: 25+18+1 = 44, but let's use 44 for safety
  const maxConstructorPointsPerRace = 44;
  
  // If mathematically impossible, return 0
  if (racesRemaining > 0 && pointsGap > racesRemaining * maxConstructorPointsPerRace) {
    return 0;
  }

  // Calculate required average points per race
  const requiredPPR = (pointsGap / racesRemaining) || 0;

  // Realistic position weights
  const positionWeights = [0.60, 0.28, 0.07, 0.03, 0.015, 0.003, 0.002, 0.001];
  probability = positionWeights[position] || 0.0005;

  // STRICT points gap penalty
  if (pointsGap > 0 && racesRemaining > 0) {
    const perfectConstructorRacesNeeded = pointsGap / maxConstructorPointsPerRace;
    const raceGapRatio = perfectConstructorRacesNeeded / racesRemaining;
    
    if (raceGapRatio > 1) {
      return 0;
    } else if (raceGapRatio > 0.7) {
      probability *= 0.001;
    } else if (raceGapRatio > 0.5) {
      probability *= 0.015;
    } else if (raceGapRatio > 0.3) {
      probability *= 0.08;
    } else if (raceGapRatio > 0.15) {
      probability *= 0.25;
    } else {
      probability *= Math.max(1 - raceGapRatio * 1.8, 0.12);
    }
  }

  // Adjust based on season progress
  if (seasonProgress > 70) {
    if (position === 0) {
      probability *= 1.6;
    } else if (pointsGap > 20) {
      probability *= 0.25;
    } else {
      probability *= 0.55;
    }
  } else if (seasonProgress > 50) {
    if (position === 0) {
      probability *= 1.25;
    } else if (pointsGap > 40) {
      probability *= 0.5;
    } else {
      probability *= 0.7;
    }
  } else if (seasonProgress > 30) {
    if (position === 0) {
      probability *= 1.15;
    } else {
      probability *= 0.8;
    }
  }

  // Wins matter
  const winBonus = Math.min(constructor.wins / 5, 0.25);
  probability *= (1 + winBonus);

  // Constructor consistency
  const pointsPerRace = constructor.points / Math.max(seasonProgress / 100, 0.01);
  const avgExpectedConstructor = 35;
  if (pointsPerRace > avgExpectedConstructor && position <= 3) {
    const consistencyBonus = Math.min((pointsPerRace - avgExpectedConstructor) / 40, 0.18);
    probability *= (1 + consistencyBonus);
  }

  // Apply news-based adjustments
  if (newsAnalysis) {
    const constructorId = constructor.Constructor.constructorId;
    const trend = newsAnalysis.constructorTrends.get(constructorId);
    const formScore = newsAnalysis.formIndicators.get(constructorId) || 0;

    // Trend adjustments
    if (trend === 'up') {
      probability *= 1.18; // +18% for upward trend
    } else if (trend === 'down') {
      probability *= 0.75; // -25% for downward trend
    }

    // Form score adjustment
    probability *= (1 + formScore * 0.12);
  }

  return Math.min(Math.max(probability, 0), 1);
}

function predictFinalPosition(
  standing: DriverStanding | ConstructorStanding, 
  currentIndex: number, 
  probability: number
): number {
  // Simple prediction based on probability and current position
  if (probability > 0.7) return Math.max(1, currentIndex - 1);
  if (probability > 0.4) return currentIndex;
  if (probability > 0.2) return currentIndex + 1;
  return currentIndex + 2;
}

function generateDriverAnalysis(
  driver: DriverStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number, 
  racesRemaining: number
): string {
  const driverName = `${driver.Driver.givenName} ${driver.Driver.familyName}`;
  const teamName = driver.Constructors?.[0]?.name || '';
  const driverCode = driver.Driver.code || driver.Driver.givenName.slice(0, 3);
  
  // Different analysis based on multiple factors
  if (position === 0 && pointsGap === 0) {
    // Championship leader
    if (driver.wins >= 3) {
      return `${driverName} (${driverCode}) leads the championship with a commanding ${driver.points} points and ${driver.wins} victories. ${teamName}'s superior pace has made ${driver.Driver.givenName} the firm favorite with ${racesRemaining} races left. Only major reliability issues could threaten this lead.`;
    } else if (driver.wins === 2) {
      return `${driverName} sits atop the standings with ${driver.points} points despite limited wins, showing remarkable consistency. ${teamName}'s strong performance gives ${driver.Driver.givenName} a solid foundation to build on in the remaining ${racesRemaining} races.`;
    } else if (driver.wins === 1) {
      return `${driverName} leads the championship with ${driver.points} points thanks to consistent podium finishes with ${teamName}. While race wins have been limited, ${driver.Driver.givenName} has maximized points opportunities and holds a small but valuable advantage.`;
    } else {
      return `${driverName} is surprisingly leading with ${driver.points} points without a win. ${teamName}'s consistent point-scoring has kept ${driver.Driver.givenName} at the top, though the lead is fragile. A race victory would significantly strengthen the championship charge.`;
    }
  }
  
  if (position === 1 && pointsGap < 15) {
    // Very close second place
    if (driver.wins > 2) {
      return `${driverName} is in a tight battle for the title with ${driver.points} points, just ${pointsGap} behind. With ${driver.wins} race wins, ${driver.Driver.givenName} has shown the raw pace to challenge. ${teamName}'s form suggests this battle will go down to the wire.`;
    } else {
      return `${driverName} trails by just ${pointsGap} points in this closely contested championship. ${driver.Driver.givenName} needs more race victories to close the gap, but with ${racesRemaining} races remaining and ${teamName}'s improving form, the title is still very achievable.`;
    }
  }
  
  if (pointsGap < 25) {
    // Still in contention (close gap)
    if (seasonProgress < 50) {
      return `${driverName} is ${pointsGap} points off the lead with ${driver.points} points. Early season form from ${teamName} suggests ${driver.Driver.givenName} has plenty of time and track variety to climb. Strong results in different conditions will be crucial.`;
    } else {
      return `${driverName} remains mathematically in contention with ${driver.points} points, ${pointsGap} behind. With ${teamName}, ${driver.Driver.givenName} needs consistent strong finishes. A couple of victories combined with leader's misfortune could swing the championship.`;
    }
  }
  
  if (pointsGap < 60) {
    // Significant gap but not impossible
    if (driver.wins >= 2) {
      return `${driverName} faces a challenging ${pointsGap}-point deficit with ${driver.points} points. ${driver.Driver.givenName} has proven race-winning pace with ${driver.wins} victories, giving hope. ${teamName} must deliver exceptional car performance and ${driver.Driver.givenName} needs near-flawless racing to contend.`;
    } else {
      return `${driverName} is ${pointsGap} points behind with ${driver.points} points. ${teamName} needs significant development upgrades and ${driver.Driver.givenName} must capitalize on every opportunity. Championship hopes are slim but dramatic seasons have happened before in Formula 1.`;
    }
  }
  
  // Large gap
  return `${driverName}'s ${driver.points} points put ${driver.Driver.givenName} ${pointsGap} points adrift of the leader. With ${teamName}, focus may shift to individual race results and securing the best possible championship position rather than title contention.`;
}

function generateConstructorAnalysis(
  constructor: ConstructorStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number, 
  racesRemaining: number
): string {
  const teamName = constructor.Constructor.name;
  
  // Championship leader
  if (position === 0 && pointsGap === 0) {
    if (constructor.wins >= 4) {
      return `${teamName} dominates the constructors' championship with ${constructor.points} points and ${constructor.wins} victories. The team's superior car performance and reliability have created a commanding lead. Both drivers are delivering, making this a complete constructor package.`;
    } else if (constructor.wins >= 2) {
      return `${teamName} leads with ${constructor.points} points and ${constructor.wins} race wins. Consistent podium finishes from both drivers have built a solid foundation. The team's development rate and race execution have been exceptional.`;
    } else {
      return `${teamName} sits atop the constructors' championship with ${constructor.points} points despite limited race wins. Strong reliability and consistent point-scoring from both cars have been key. More victories would strengthen their position.`;
    }
  }
  
  // Close second
  if (position === 1 && pointsGap < 40) {
    return `${teamName} is in a tight constructor battle with ${constructor.points} points, ${pointsGap} behind. ${constructor.wins} race victories show the team has pace. Both drivers need to maximize points in every remaining race to close the gap and challenge for the title.`;
  }
  
  // Mid-range position
  if (pointsGap < 60) {
    if (seasonProgress < 50) {
      return `${teamName} has ${constructor.points} points and is ${pointsGap} off the leaders. Early season means opportunities remain. The team's development trajectory and ability to extract maximum performance from both cars will be crucial in this championship fight.`;
    } else {
      return `${teamName} faces a ${pointsGap}-point deficit with ${constructor.points} points. Both drivers must deliver consistently, and the team needs flawless race execution plus some misfortune for rivals to have a realistic chance. Still mathematically possible with ${racesRemaining} races left.`;
    }
  }
  
  // Large gap
  return `${teamName}'s ${constructor.points} points puts them ${pointsGap} points adrift. With such a large gap, focus shifts to securing individual race results and the best possible constructor finish rather than championship contention. Development may be targeted for next season.`;
}

function generateDriverKeyFactors(
  driver: DriverStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number
): string[] {
  const factors: string[] = [];
  const teamName = driver.Constructors?.[0]?.name || 'team';
  
  // Position-based insights
  if (position === 0) {
    factors.push('Championship leader with momentum');
  } else if (position === 1) {
    factors.push('Prime challenger for the title');
  } else if (position === 2) {
    factors.push('Strong podium position');
  }
  
  // Points gap insights (different wording for different scenarios)
  if (position === 0) {
    // Leader's advantage
    const advantageSize = pointsGap > 50 ? 'decisive' : pointsGap > 25 ? 'comfortable' : 'narrow';
    factors.push(`${advantageSize.charAt(0).toUpperCase() + advantageSize.slice(1)} advantage over rivals`);
  } else if (pointsGap < 15 && position <= 2) {
    factors.push(`Within striking distance (${pointsGap}pts gap)`);
  } else if (pointsGap < 30 && position <= 3) {
    factors.push('Still in mathematical contention');
  } else if (pointsGap < 50) {
    factors.push(`Challenging ${pointsGap}-point deficit to overcome`);
  }
  
  // Win-based insights
  if (driver.wins >= 4) {
    factors.push(`${driver.wins} victories - proven race winner`);
  } else if (driver.wins === 2 || driver.wins === 3) {
    factors.push(`${driver.wins} victories show race-winning pace`);
  } else if (driver.wins === 1) {
    factors.push('Single victory but needs more wins');
  } else if (driver.wins === 0 && position <= 3) {
    factors.push('Leading without race wins - consistency key');
  }
  
  // Season progress insights
  if (seasonProgress < 35) {
    factors.push('Early season offers opportunity for turnaround');
  } else if (seasonProgress < 60) {
    if (position <= 2) {
      factors.push('Mid-season - critical period for momentum');
    }
  } else {
    factors.push('Late season - limited races to make impact');
  }
  
  // Special factors based on position relative to points
  const pointsPerWinRatio = driver.wins > 0 ? driver.points / driver.wins : 0;
  if (pointsPerWinRatio > 18 && driver.wins >= 2) {
    factors.push('Excellent points accumulation per win');
  }
  
  // Team performance hint
  if (position <= 3 && driver.wins > 0) {
    factors.push(`${teamName} delivering race-winning performance`);
  }
  
  // Unique identifier to make factors different per driver
  if (position % 3 === 0) {
    factors.push(`Currently P${position + 1} in championship`);
  } else if (position % 2 === 0) {
    const consistencyNote = driver.wins > 0 ? 'balanced results' : 'consistent scoring';
    factors.push(`Strong ${consistencyNote} so far`);
  }
  
  return [...new Set(factors)].slice(0, 3); // Remove duplicates and limit to 3
}

function generateConstructorKeyFactors(
  constructor: ConstructorStanding, 
  position: number, 
  pointsGap: number, 
  seasonProgress: number
): string[] {
  const factors: string[] = [];
  const teamName = constructor.Constructor.name;
  
  // Position-based insights
  if (position === 0) {
    factors.push('Leading the constructor championship');
  } else if (position === 1) {
    factors.push('Primary challenger in constructor title race');
  } else if (position === 2) {
    factors.push('Strong P3 position in constructors');
  }
  
  // Points gap insights
  if (position === 0 && pointsGap > 0) {
    factors.push(`${pointsGap} points ahead of second place`);
  } else if (position === 1 && pointsGap < 35) {
    factors.push(`${pointsGap}-point gap to leaders`);
  } else if (position >= 2 && pointsGap < 50) {
    factors.push('Mathematically in constructor contention');
  }
  
  // Win-based insights
  if (constructor.wins >= 4) {
    factors.push(`${constructor.wins} victories - dominant constructor`);
  } else if (constructor.wins === 2 || constructor.wins === 3) {
    factors.push(`${constructor.wins} victories show strong pace`);
  } else if (constructor.wins === 1) {
    factors.push('One victory - needs more race wins');
  } else if (constructor.wins === 0 && position <= 3) {
    factors.push('Point-scoring consistency without race wins');
  }
  
  // Season progress insights
  if (seasonProgress < 40) {
    factors.push(`Early season - ${teamName} can close the gap with upgrades`);
  } else if (seasonProgress < 65) {
    factors.push('Mid-season development crucial for championship');
  } else {
    factors.push('Late season - reliability and execution key');
  }
  
  // Team-specific factors
  if (constructor.points > 300 && position <= 3) {
    factors.push('High points total indicates competitive car');
  }
  
  // Unique per team
  if (position % 2 === 0) {
    factors.push(`Currently P${position + 1} in constructor standings`);
  } else {
    const pointsPerWin = constructor.wins > 0 ? constructor.points / constructor.wins : constructor.points;
    if (pointsPerWin > 35) {
      factors.push('Strong points-to-wins ratio');
    }
  }
  
  return [...new Set(factors)].slice(0, 3); // Remove duplicates
}

function generateSeasonInsights(
  drivers: DriverStanding[], 
  constructors: ConstructorStanding[], 
  seasonProgress: number, 
  racesCompleted: number, 
  racesRemaining: number
): { racesCompleted: number; racesRemaining: number; seasonProgress: number; keyInsights: string[] } {
  const insights: string[] = [];
  
  // Analyze championship battle
  const driverGap = drivers[1] ? drivers[0].points - drivers[1].points : 0;
  const constructorGap = constructors[1] ? constructors[0].points - constructors[1].points : 0;
  
  if (driverGap < 25) {
    insights.push('Tight driver championship battle with multiple contenders');
  } else if (driverGap > 50) {
    insights.push('Driver championship appears to be a one-horse race');
  }
  
  if (constructorGap < 40) {
    insights.push('Constructor championship remains competitive');
  } else if (constructorGap > 80) {
    insights.push('Constructor championship likely decided');
  }
  
  // Season progress insights
  if (seasonProgress < 30) {
    insights.push('Early season - standings can change dramatically');
  } else if (seasonProgress > 70) {
    insights.push('Late season - current form is crucial');
  }
  
  // Performance insights
  const totalWins = drivers.reduce((sum, driver) => sum + driver.wins, 0);
  if (totalWins > racesCompleted * 0.8) {
    insights.push('High number of race winners indicates competitive field');
  }
  
  return {
    racesCompleted,
    racesRemaining,
    seasonProgress: Math.round(seasonProgress),
    keyInsights: insights,
  };
}

/**
 * Analyze F1 news to detect trends, recent winners, and form indicators
 */
function analyzeNewsForTrends(
  news: NewsItem[], 
  driverStandings: DriverStanding[], 
  constructorStandings: ConstructorStanding[]
): NewsAnalysis {
  const driverTrends = new Map<string, 'up' | 'down' | 'neutral'>();
  const constructorTrends = new Map<string, 'up' | 'down' | 'neutral'>();
  const recentWinners = new Set<string>();
  const formIndicators = new Map<string, number>();

  // Driver and constructor names mapping
  const driverNameMap = new Map<string, string[]>();
  driverStandings.forEach(driver => {
    const fullName = `${driver.Driver.givenName} ${driver.Driver.familyName}`;
    const code = driver.Driver.code || driver.Driver.familyName.slice(0, 3);
    const driverId = driver.Driver.driverId;
    driverNameMap.set(driverId, [fullName, driver.Driver.familyName, code, driver.Driver.givenName]);
  });

  const constructorNameMap = new Map<string, string[]>();
  constructorStandings.forEach(constructor => {
    const name = constructor.Constructor.name;
    const constructorId = constructor.Constructor.constructorId;
    constructorNameMap.set(constructorId, [name, name.toLowerCase().replace(/\s+/g, '_')]);
  });

  // Keywords for trend detection
  const positiveKeywords = [
    'win', 'victory', 'victorious', 'champion', 'dominate', 'domination', 
    'excellent', 'outstanding', 'record', 'fastest', 'pole', 'lead',
    'comeback', 'improve', 'progress', 'strong', 'momentum', 'surge'
  ];
  
  const negativeKeywords = [
    'crash', 'accident', 'retire', 'retirement', 'problem', 'issue',
    'struggle', 'difficult', 'penalty', 'problematic', 'disappointing',
    'disaster', 'failure', 'incident', 'mistake'
  ];

  // Analyze news from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  news.forEach(item => {
    const pubDate = new Date(item.pubDate);
    if (pubDate < sevenDaysAgo) return;

    const titleLower = item.title.toLowerCase();
    const descLower = item.description?.toLowerCase() || '';
    const combinedText = `${titleLower} ${descLower}`;

    // Detect drivers in the news
    driverNameMap.forEach((names, driverId) => {
      const matched = names.some(name => 
        combinedText.includes(name.toLowerCase())
      );

      if (matched) {
        const hasPositive = positiveKeywords.some(kw => combinedText.includes(kw));
        const hasNegative = negativeKeywords.some(kw => combinedText.includes(kw));

        if (hasPositive) {
          driverTrends.set(driverId, 'up');
          formIndicators.set(driverId, Math.min((formIndicators.get(driverId) || 0) + 0.2, 1));
        } else if (hasNegative) {
          driverTrends.set(driverId, 'down');
          formIndicators.set(driverId, Math.max((formIndicators.get(driverId) || 0) - 0.2, -1));
        } else if (!driverTrends.has(driverId)) {
          driverTrends.set(driverId, 'neutral');
        }

        // Detect recent wins
        if (combinedText.includes('win') && combinedText.includes('race')) {
          recentWinners.add(driverId);
        }
      }
    });

    // Detect constructors in the news
    constructorNameMap.forEach((names, constructorId) => {
      const matched = names.some(name => 
        combinedText.includes(name.toLowerCase())
      );

      if (matched) {
        const hasPositive = positiveKeywords.some(kw => combinedText.includes(kw));
        const hasNegative = negativeKeywords.some(kw => combinedText.includes(kw));

        if (hasPositive) {
          constructorTrends.set(constructorId, 'up');
          formIndicators.set(constructorId, Math.min((formIndicators.get(constructorId) || 0) + 0.15, 1));
        } else if (hasNegative) {
          constructorTrends.set(constructorId, 'down');
          formIndicators.set(constructorId, Math.max((formIndicators.get(constructorId) || 0) - 0.15, -1));
        } else if (!constructorTrends.has(constructorId)) {
          constructorTrends.set(constructorId, 'neutral');
        }
      }
    });
  });

  // Initialize neutral for all drivers/constructors not in news
  driverStandings.forEach(driver => {
    if (!driverTrends.has(driver.Driver.driverId)) {
      driverTrends.set(driver.Driver.driverId, 'neutral');
    }
    if (!formIndicators.has(driver.Driver.driverId)) {
      formIndicators.set(driver.Driver.driverId, 0);
    }
  });

  constructorStandings.forEach(constructor => {
    if (!constructorTrends.has(constructor.Constructor.constructorId)) {
      constructorTrends.set(constructor.Constructor.constructorId, 'neutral');
    }
    if (!formIndicators.has(constructor.Constructor.constructorId)) {
      formIndicators.set(constructor.Constructor.constructorId, 0);
    }
  });

  return {
    driverTrends,
    constructorTrends,
    recentWinners,
    formIndicators,
  };
}
