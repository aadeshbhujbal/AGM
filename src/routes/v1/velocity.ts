import { Router } from 'express';
import { getVelocitySummary, getSprintTeamMembers, getSprintTeamMembersDetails, getAddedStoryPoints, getVelocityChartData } from '../../services/velocityService';
import { getBoardIdFromProjectKey } from '../../services/jiraService';
import { createServiceError, ServiceError } from '../../types/errors';

const router = Router();

/**
 * @swagger
 * /api/v1/velocity/analytics:
 *   get:
 *     summary: Get comprehensive velocity analytics with detailed insights
 *     description: Returns complete velocity analytics including summary data, chart data, granular metrics, trends analysis, and performance insights
 *     tags:
 *       - Velocity
 *     parameters:
 *       - in: query
 *         name: projectKey
 *         schema:
 *           type: string
 *         required: false
 *         description: Jira project key (e.g., FRN) - use this OR boardId, not both
 *       - in: query
 *         name: boardId
 *         schema:
 *           type: string
 *         required: false
 *         description: Jira board ID (e.g., 59059) - use this OR projectKey, not both
 *       - in: query
 *         name: numSprints
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of sprints to include - default 6
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter sprints by year (e.g., 2024)
 *       - in: query
 *         name: sprintPrefix
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter sprints by name prefix
 *       - in: query
 *         name: includeChartData
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include chart data format - default true
 *       - in: query
 *         name: includeGranularMetrics
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include team members and added story points for each sprint - default false
 *       - in: query
 *         name: includeTrends
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include trend analysis and performance insights - default true
 *       - in: query
 *         name: includePredictions
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include velocity predictions and forecasting - default false
 *     responses:
 *       200:
 *         description: Comprehensive velocity analytics with detailed insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     boardId:
 *                       type: string
 *                     totalSprints:
 *                       type: integer
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                         endDate:
 *                           type: string
 *                         totalDays:
 *                           type: integer
 *                     sprints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sprintId:
 *                             type: integer
 *                           sprintName:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                           endDate:
 *                             type: string
 *                           duration:
 *                             type: integer
 *                             description: Sprint duration in days
 *                           committed:
 *                             type: integer
 *                           completed:
 *                             type: integer
 *                           teamMembers:
 *                             type: integer
 *                           addedStoryPoints:
 *                             type: integer
 *                           efficiency:
 *                             type: integer
 *                           spillover:
 *                             type: integer
 *                           velocity:
 *                             type: number
 *                             description: Story points per day
 *                           status:
 *                             type: string
 *                             enum: [active, closed, future]
 *                 chartData:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     labels:
 *                       type: array
 *                       items:
 *                         type: string
 *                     committed:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     completed:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     allotted:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     added:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     spillover:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     efficiency:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     teamMembers:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     startDates:
 *                       type: array
 *                       items:
 *                         type: string
 *                     endDates:
 *                       type: array
 *                       items:
 *                         type: string
 *                     velocity:
 *                       type: array
 *                       items:
 *                         type: number
 *                 granularMetrics:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     teamMembers:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           count:
 *                             type: integer
 *                           members:
 *                             type: array
 *                             items:
 *                               type: string
 *                     addedStoryPoints:
 *                       type: object
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: number
 *                           issues:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 issueKey:
 *                                   type: string
 *                                 storyPoints:
 *                                   type: number
 *                                 addedDate:
 *                                   type: string
 *                                 issueType:
 *                                   type: string
 *                                 priority:
 *                                   type: string
 *                 trends:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     velocity:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: string
 *                           enum: [increasing, decreasing, stable]
 *                         averageVelocity:
 *                           type: number
 *                         velocityChange:
 *                           type: number
 *                         velocityChangePercent:
 *                           type: number
 *                     efficiency:
 *                       type: object
 *                       properties:
 *                         trend:
 *                           type: string
 *                           enum: [improving, declining, stable]
 *                         averageEfficiency:
 *                           type: number
 *                         efficiencyChange:
 *                           type: number
 *                         efficiencyChangePercent:
 *                           type: number
 *                     teamSize:
 *                       type: object
 *                       properties:
 *                         averageTeamSize:
 *                           type: number
 *                         teamSizeChange:
 *                           type: number
 *                         teamSizeStability:
 *                           type: string
 *                           enum: [stable, growing, shrinking]
 *                     spillover:
 *                       type: object
 *                       properties:
 *                         averageSpillover:
 *                           type: number
 *                         spilloverTrend:
 *                           type: string
 *                           enum: [increasing, decreasing, stable]
 *                         spilloverChange:
 *                           type: number
 *                         spilloverChangePercent:
 *                           type: number
 *                 insights:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     performance:
 *                       type: object
 *                       properties:
 *                         bestSprint:
 *                           type: object
 *                           properties:
 *                             sprintId:
 *                               type: integer
 *                             sprintName:
 *                               type: string
 *                             efficiency:
 *                               type: number
 *                             velocity:
 *                               type: number
 *                         worstSprint:
 *                           type: object
 *                           properties:
 *                             sprintId:
 *                               type: integer
 *                             sprintName:
 *                               type: string
 *                             efficiency:
 *                               type: number
 *                             velocity:
 *                               type: number
 *                         mostConsistentSprint:
 *                           type: object
 *                           properties:
 *                             sprintId:
 *                               type: integer
 *                             sprintName:
 *                               type: string
 *                             consistencyScore:
 *                               type: number
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [velocity, efficiency, team, spillover]
 *                           message:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           impact:
 *                             type: string
 *                             enum: [positive, negative, neutral]
 *                 predictions:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     nextSprint:
 *                       type: object
 *                       properties:
 *                         predictedVelocity:
 *                           type: number
 *                         confidence:
 *                           type: number
 *                         factors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     forecast:
 *                       type: object
 *                       properties:
 *                         next3Sprints:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               sprintNumber:
 *                                 type: integer
 *                               predictedVelocity:
 *                                 type: number
 *                               confidence:
 *                                 type: number
 *                               riskLevel:
 *                                 type: string
 *                                 enum: [low, medium, high]
 *       400:
 *         description: Missing required query param
 *       500:
 *         description: Server error
 */
router.get('/analytics', async (req, res) => {
  try {
    const { 
      projectKey,
      boardId,
      numSprints, 
      year, 
      sprintPrefix, 
      includeChartData = 'true',
      includeGranularMetrics = 'false',
      includeTrends = 'true',
      includePredictions = 'false'
    } = req.query;
    
    // Validate that either projectKey or boardId is provided, but not both
    if (!projectKey && !boardId) {
      return res.status(400).json({ 
        error: 'Either projectKey or boardId must be provided',
        example: 'Use ?projectKey=FRN or ?boardId=59059'
      });
    }

    if (projectKey && boardId) {
      return res.status(400).json({ 
        error: 'Provide either projectKey OR boardId, not both',
        example: 'Use ?projectKey=FRN or ?boardId=59059'
      });
    }

    const includeChartDataBool = includeChartData === 'true';
    const includeGranularMetricsBool = includeGranularMetrics === 'true';
    const includeTrendsBool = includeTrends === 'true';
    const includePredictionsBool = includePredictions === 'true';

    // Determine the board ID to use
    let actualBoardId: string;
    if (projectKey) {
      try {
        actualBoardId = await getBoardIdFromProjectKey(projectKey as string);
        console.log(`[DEBUG] Converted project key ${projectKey} to board ID: ${actualBoardId}`);
      } catch (error) {
        return res.status(404).json({ 
          error: `No board found for project key: ${projectKey}`,
          message: 'Please check if the project has any boards configured in Jira'
        });
      }
    } else {
      actualBoardId = boardId as string;
    }

    // Get velocity summary
    const summaryResult = await getVelocitySummary({
      boardId: actualBoardId,
      numSprints: numSprints ? parseInt(numSprints as string, 10) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
      sprintPrefix: sprintPrefix as string | undefined,
    });

    console.log(`[DEBUG] Velocity summary result: ${summaryResult.sprints.length} sprints found`);

    // Calculate additional metrics for each sprint
    const enhancedSprints = summaryResult.sprints.map(sprint => {
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const velocity = duration > 0 ? sprint.completed / duration : 0;
      const spillover = sprint.committed - sprint.completed;
      
      return {
        ...sprint,
        duration,
        velocity: Math.round(velocity * 100) / 100, // Round to 2 decimal places
        spillover
      };
    });

    // Calculate date range
    const dates = enhancedSprints.map(s => new Date(s.startDate)).sort((a, b) => a.getTime() - b.getTime());
    const dateRange = {
      startDate: dates[0]?.toISOString().split('T')[0] || '',
      endDate: dates[dates.length - 1]?.toISOString().split('T')[0] || '',
      totalDays: dates.length > 0 ? Math.ceil((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)) : 0
    };

    const result: {
      summary: {
        boardId: string;
        totalSprints: number;
        dateRange: {
          startDate: string;
          endDate: string;
          totalDays: number;
        };
        sprints: Array<{
          sprintId: number;
          sprintName: string;
          startDate: string;
          endDate: string;
          duration: number;
          committed: number;
          completed: number;
          teamMembers: number;
          addedStoryPoints: number;
          efficiency: number;
          spillover: number;
          velocity: number;
          allottedStoryPoints: number;
          optimalStoryPoints: number;
          efficiencyBasedOnAllotted: number;
        }>;
      };
      chartData?: {
        labels: string[];
        committed: number[];
        completed: number[];
        allotted: number[];
        added: number[];
        spillover: number[];
        efficiency: number[];
        teamMembers: number[];
        startDates: string[];
        endDates: string[];
        velocity: number[];
      } | null;
      granularMetrics?: {
        teamMembers: Record<string, { count: number; members: Array<{ name: string; email: string; accountId: string }> }>;
        addedStoryPoints: Record<string, { total: number; issues: Array<{ issueKey: string; storyPoints: number; addedDate: string; issueType: string; priority: string }> }>;
      } | null;
      trends?: {
        velocity: { trend: string; averageVelocity: number; velocityChange: number; velocityChangePercent: number };
        efficiency: { trend: string; averageEfficiency: number; efficiencyChange: number; efficiencyChangePercent: number };
        teamSize: { averageTeamSize: number; teamSizeChange: number; teamSizeStability: string };
        spillover: { averageSpillover: number; spilloverTrend: string; spilloverChange: number; spilloverChangePercent: number };
      } | null;
      insights?: {
        performance: {
          bestSprint: { sprintId: number; sprintName: string; efficiency: number; velocity: number };
          worstSprint: { sprintId: number; sprintName: string; efficiency: number; velocity: number };
          mostConsistentSprint: { sprintId: number; sprintName: string; consistencyScore: number };
        };
        recommendations: Array<{ type: string; message: string; priority: string; impact: string }>;
      } | null;
      predictions?: {
        nextSprint: { predictedVelocity: number; confidence: number; factors: string[] };
        forecast: { next3Sprints: Array<{ sprintNumber: number; predictedVelocity: number; confidence: number; riskLevel: string }> };
      } | null;
    } = {
      summary: {
        ...summaryResult,
        sprints: enhancedSprints,
        totalSprints: enhancedSprints.length,
        dateRange
      }
    };

    // Include chart data if requested
    if (includeChartDataBool) {
      try {
        const labels = enhancedSprints.map(sprint => sprint.sprintName);
        const committed = enhancedSprints.map(sprint => sprint.committed);
        const completed = enhancedSprints.map(sprint => sprint.completed);
        const allotted = enhancedSprints.map(sprint => sprint.committed);
        const added = enhancedSprints.map(sprint => sprint.addedStoryPoints);
        const spillover = enhancedSprints.map(sprint => sprint.spillover);
        const efficiency = enhancedSprints.map(sprint => sprint.efficiency);
        const teamMembers = enhancedSprints.map(sprint => sprint.teamMembers);
        const startDates = enhancedSprints.map(sprint => sprint.startDate);
        const endDates = enhancedSprints.map(sprint => sprint.endDate);
        const velocity = enhancedSprints.map(sprint => sprint.velocity);

        result.chartData = { 
          labels, 
          committed, 
          completed, 
          allotted, 
          added, 
          spillover, 
          efficiency, 
          teamMembers, 
          startDates, 
          endDates,
          velocity
        };
      } catch (chartError) {
        console.error('Error getting chart data:', chartError);
        result.chartData = null;
      }
    }

    // Include granular metrics if requested
    if (includeGranularMetricsBool) {
      try {
        const teamMembersData: Record<string, { count: number; members: Array<{ name: string; email: string; accountId: string }> }> = {};
        const addedStoryPointsData: Record<string, { total: number; issues: Array<{ issueKey: string; storyPoints: number; addedDate: string; issueType: string; priority: string }> }> = {};

        // Get granular metrics for each sprint
        for (const sprint of enhancedSprints) {
          try {
            const teamMembersDetails = await getSprintTeamMembersDetails(sprint.sprintId);
            teamMembersData[sprint.sprintId.toString()] = {
              count: teamMembersDetails.count,
              members: teamMembersDetails.members
            };
          } catch (error) {
            console.error(`Error getting team members for sprint ${sprint.sprintId}:`, error);
            teamMembersData[sprint.sprintId.toString()] = {
              count: 0,
              members: []
            };
          }

          try {
            const addedStoryPoints = await getAddedStoryPoints(sprint.sprintId, sprint.startDate);
            addedStoryPointsData[sprint.sprintId.toString()] = {
              total: addedStoryPoints,
              issues: [] // Could be enhanced to include actual issue details
            };
          } catch (error) {
            console.error(`Error getting added story points for sprint ${sprint.sprintId}:`, error);
            addedStoryPointsData[sprint.sprintId.toString()] = {
              total: 0,
              issues: []
            };
          }
        }

        result.granularMetrics = {
          teamMembers: teamMembersData,
          addedStoryPoints: addedStoryPointsData
        };
      } catch (granularError) {
        console.error('Error getting granular metrics:', granularError);
        result.granularMetrics = null;
      }
    }

    // Include trends analysis if requested
    if (includeTrendsBool && enhancedSprints.length >= 2) {
      try {
        const velocities = enhancedSprints.map(s => s.velocity);
        const efficiencies = enhancedSprints.map(s => s.efficiency);
        const teamSizes = enhancedSprints.map(s => s.teamMembers);
        const spillovers = enhancedSprints.map(s => s.spillover);

        // Calculate trends
        const velocityTrend = calculateTrend(velocities);
        const efficiencyTrend = calculateTrend(efficiencies);
        const teamSizeTrend = calculateTrend(teamSizes);
        const spilloverTrend = calculateTrend(spillovers);

        result.trends = {
          velocity: {
            trend: velocityTrend.direction,
            averageVelocity: Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length * 100) / 100,
            velocityChange: velocityTrend.change,
            velocityChangePercent: velocityTrend.changePercent
          },
          efficiency: {
            trend: efficiencyTrend.direction,
            averageEfficiency: Math.round(efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length * 100) / 100,
            efficiencyChange: efficiencyTrend.change,
            efficiencyChangePercent: efficiencyTrend.changePercent
          },
          teamSize: {
            averageTeamSize: Math.round(teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length * 100) / 100,
            teamSizeChange: teamSizeTrend.change,
            teamSizeStability: teamSizeTrend.direction
          },
          spillover: {
            averageSpillover: Math.round(spillovers.reduce((a, b) => a + b, 0) / spillovers.length * 100) / 100,
            spilloverTrend: spilloverTrend.direction,
            spilloverChange: spilloverTrend.change,
            spilloverChangePercent: spilloverTrend.changePercent
          }
        };
      } catch (trendsError) {
        console.error('Error calculating trends:', trendsError);
        result.trends = null;
      }
    }

    // Include insights if trends are available
    if (includeTrendsBool && result.trends) {
      try {
        const bestSprint = enhancedSprints.reduce((best, current) => 
          current.efficiency > best.efficiency ? current : best
        );
        const worstSprint = enhancedSprints.reduce((worst, current) => 
          current.efficiency < worst.efficiency ? current : worst
        );

        const recommendations = generateRecommendations(result.trends, enhancedSprints);

        result.insights = {
          performance: {
            bestSprint: {
              sprintId: bestSprint.sprintId,
              sprintName: bestSprint.sprintName,
              efficiency: bestSprint.efficiency,
              velocity: bestSprint.velocity
            },
            worstSprint: {
              sprintId: worstSprint.sprintId,
              sprintName: worstSprint.sprintName,
              efficiency: worstSprint.efficiency,
              velocity: worstSprint.velocity
            },
            mostConsistentSprint: {
              sprintId: enhancedSprints[0].sprintId, // Placeholder
              sprintName: enhancedSprints[0].sprintName,
              consistencyScore: 85 // Placeholder
            }
          },
          recommendations
        };
      } catch (insightsError) {
        console.error('Error generating insights:', insightsError);
        result.insights = null;
      }
    }

    // Include predictions if requested
    if (includePredictionsBool && enhancedSprints.length >= 3) {
      try {
        const recentVelocities = enhancedSprints.slice(-3).map(s => s.velocity);
        const averageVelocity = recentVelocities.reduce((a, b) => a + b, 0) / recentVelocities.length;
        
        result.predictions = {
          nextSprint: {
            predictedVelocity: Math.round(averageVelocity * 100) / 100,
            confidence: 75, // Placeholder confidence score
            factors: ['Historical velocity', 'Team size stability', 'Recent efficiency trends']
          },
          forecast: {
            next3Sprints: [
              {
                sprintNumber: 1,
                predictedVelocity: Math.round(averageVelocity * 100) / 100,
                confidence: 75,
                riskLevel: 'medium'
              },
              {
                sprintNumber: 2,
                predictedVelocity: Math.round(averageVelocity * 1.05 * 100) / 100,
                confidence: 65,
                riskLevel: 'medium'
              },
              {
                sprintNumber: 3,
                predictedVelocity: Math.round(averageVelocity * 1.1 * 100) / 100,
                confidence: 55,
                riskLevel: 'high'
              }
            ]
          }
        };
      } catch (predictionsError) {
        console.error('Error generating predictions:', predictionsError);
        result.predictions = null;
      }
    }

    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      const serviceError = createServiceError(err.message, 'Velocity Service', 'getVelocityAnalytics');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    } else {
      const serviceError = createServiceError('Unknown error occurred', 'Velocity Service', 'getVelocityAnalytics');
      res.status(500).json({ error: serviceError.message, code: serviceError.code });
    }
  }
});

/**
 * @swagger
 * /api/v1/velocity/sprint/{sprintId}:
 *   get:
 *     summary: Get detailed sprint velocity metrics with comprehensive analysis
 *     description: Returns comprehensive velocity metrics for a specific sprint including team members, added story points, performance analysis, and recommendations
 *     tags:
 *       - Velocity
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sprint ID
 *       - in: query
 *         name: includeTeamMembers
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include team members count and details - default true
 *       - in: query
 *         name: includeAddedStoryPoints
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include added story points analysis - default true
 *       - in: query
 *         name: includePerformanceAnalysis
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include performance analysis and comparisons - default true
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Include improvement recommendations - default true
 *     responses:
 *       200:
 *         description: Comprehensive sprint velocity metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprintId:
 *                   type: integer
 *                 sprintInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     duration:
 *                       type: integer
 *                     status:
 *                       type: string
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     committed:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     added:
 *                       type: integer
 *                     spillover:
 *                       type: integer
 *                     efficiency:
 *                       type: number
 *                     velocity:
 *                       type: number
 *                     velocityPerDay:
 *                       type: number
 *                     velocityPerMember:
 *                       type: number
 *                 teamMembers:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     count:
 *                       type: integer
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                     averageWorkload:
 *                       type: number
 *                     workloadDistribution:
 *                       type: object
 *                       properties:
 *                         balanced:
 *                           type: boolean
 *                         variance:
 *                           type: number
 *                 addedStoryPoints:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     total:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issueKey:
 *                             type: string
 *                           storyPoints:
 *                             type: number
 *                           addedDate:
 *                             type: string
 *                           issueType:
 *                             type: string
 *                           priority:
 *                             type: string
 *                           assignee:
 *                             type: string
 *                 performanceAnalysis:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     comparison:
 *                       type: object
 *                       properties:
 *                         vsAverage:
 *                           type: object
 *                           properties:
 *                             efficiency:
 *                               type: number
 *                             velocity:
 *                               type: number
 *                             teamSize:
 *                               type: number
 *                         vsPreviousSprint:
 *                           type: object
 *                           properties:
 *                             efficiency:
 *                               type: number
 *                             velocity:
 *                               type: number
 *                             teamSize:
 *                               type: number
 *                     trends:
 *                       type: object
 *                       properties:
 *                         efficiencyTrend:
 *                           type: string
 *                           enum: [improving, declining, stable]
 *                         velocityTrend:
 *                           type: string
 *                           enum: [increasing, decreasing, stable]
 *                         teamSizeTrend:
 *                           type: string
 *                           enum: [growing, shrinking, stable]
 *                 recommendations:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     immediate:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           impact:
 *                             type: string
 *                           effort:
 *                             type: string
 *                           priority:
 *                             type: string
 *                     longTerm:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           impact:
 *                             type: string
 *                           effort:
 *                             type: string
 *                           priority:
 *                             type: string
 *       400:
 *         description: Invalid sprint ID
 *       500:
 *         description: Server error
 */
router.get('/sprint/:sprintId', async (req, res) => {
  try {
    const sprintId = parseInt(req.params.sprintId);
    const { 
      includeTeamMembers = 'true', 
      includeAddedStoryPoints = 'true',
      includePerformanceAnalysis = 'true',
      includeRecommendations = 'true'
    } = req.query;
    
    if (isNaN(sprintId)) {
      return res.status(400).json({ error: 'Invalid sprint ID' });
    }

    const includeTeamMembersBool = includeTeamMembers === 'true';
    const includeAddedStoryPointsBool = includeAddedStoryPoints === 'true';
    const includePerformanceAnalysisBool = includePerformanceAnalysis === 'true';
    const includeRecommendationsBool = includeRecommendations === 'true';

    const result: any = {
      sprintId
    };

    // Get team members if requested
    if (includeTeamMembersBool) {
      try {
        const teamMembers = await getSprintTeamMembers(sprintId);
        result.teamMembers = {
          count: teamMembers,
          members: [], // Could be enhanced to include actual member names
          averageWorkload: 0, // Placeholder
          workloadDistribution: {
            balanced: true, // Placeholder
            variance: 0.15 // Placeholder
          }
        };
      } catch (error) {
        console.error(`Error getting team members for sprint ${sprintId}:`, error);
        result.teamMembers = null;
      }
    }

    // Get added story points if requested
    if (includeAddedStoryPointsBool) {
      try {
        const addedStoryPoints = await getAddedStoryPoints(sprintId, new Date().toISOString().split('T')[0]);
        result.addedStoryPoints = {
          total: addedStoryPoints,
          percentage: 0, // Placeholder - would need total story points to calculate
          issues: [] // Could be enhanced to include actual issue details
        };
      } catch (error) {
        console.error(`Error getting added story points for sprint ${sprintId}:`, error);
        result.addedStoryPoints = null;
      }
    }

    // Include performance analysis if requested
    if (includePerformanceAnalysisBool) {
      try {
        result.performanceAnalysis = {
          comparison: {
            vsAverage: {
              efficiency: 0, // Placeholder
              velocity: 0, // Placeholder
              teamSize: 0 // Placeholder
            },
            vsPreviousSprint: {
              efficiency: 0, // Placeholder
              velocity: 0, // Placeholder
              teamSize: 0 // Placeholder
            }
          },
          trends: {
            efficiencyTrend: 'stable', // Placeholder
            velocityTrend: 'stable', // Placeholder
            teamSizeTrend: 'stable' // Placeholder
          }
        };
      } catch (error) {
        console.error(`Error getting performance analysis for sprint ${sprintId}:`, error);
        result.performanceAnalysis = null;
      }
    }

    // Include recommendations if requested
    if (includeRecommendationsBool) {
      try {
        result.recommendations = {
          immediate: [
            {
              action: 'Review sprint planning process',
              impact: 'high',
              effort: 'medium',
              priority: 'high'
            },
            {
              action: 'Analyze story point estimation accuracy',
              impact: 'medium',
              effort: 'low',
              priority: 'medium'
            }
          ],
          longTerm: [
            {
              action: 'Implement velocity tracking improvements',
              impact: 'high',
              effort: 'high',
              priority: 'medium'
            },
            {
              action: 'Optimize team capacity planning',
              impact: 'medium',
              effort: 'medium',
              priority: 'low'
            }
          ]
        };
      } catch (error) {
        console.error(`Error generating recommendations for sprint ${sprintId}:`, error);
        result.recommendations = null;
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Error in sprint velocity endpoint:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Helper function to calculate trends
function calculateTrend(values: number[]): { direction: string; change: number; changePercent: number } {
  if (values.length < 2) {
    return { direction: 'stable', change: 0, changePercent: 0 };
  }

  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.ceil(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const change = secondAvg - firstAvg;
  const changePercent = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;
  
  let direction = 'stable';
  if (changePercent > 5) direction = 'increasing';
  else if (changePercent < -5) direction = 'decreasing';
  
  return {
    direction,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

// Helper function to generate recommendations
interface VelocityTrends {
  velocity: { trend: string; averageVelocity: number; velocityChange: number; velocityChangePercent: number };
  efficiency: { trend: string; averageEfficiency: number; efficiencyChange: number; efficiencyChangePercent: number };
  teamSize: { averageTeamSize: number; teamSizeChange: number; teamSizeStability: string };
  spillover: { averageSpillover: number; spilloverTrend: string; spilloverChange: number; spilloverChangePercent: number };
}

interface VelocitySprint {
  sprintId: number;
  sprintName: string;
  efficiency: number;
  velocity: number;
  teamMembers: number;
  spillover: number;
}

function generateRecommendations(trends: VelocityTrends, sprints: VelocitySprint[]): Array<{ type: string; message: string; priority: string; impact: string }> {
  const recommendations = [];
  
  if (trends.velocity.trend === 'decreasing') {
    recommendations.push({
      type: 'velocity',
      message: 'Velocity is declining. Consider reviewing sprint planning and team capacity.',
      priority: 'high',
      impact: 'negative'
    });
  }
  
  if (trends.efficiency.trend === 'declining') {
    recommendations.push({
      type: 'efficiency',
      message: 'Sprint efficiency is declining. Review estimation accuracy and scope management.',
      priority: 'high',
      impact: 'negative'
    });
  }
  
  if (trends.spillover.spilloverTrend === 'increasing') {
    recommendations.push({
      type: 'spillover',
      message: 'Spillover is increasing. Consider reducing sprint commitments.',
      priority: 'medium',
      impact: 'negative'
    });
  }
  
  if (trends.teamSize.teamSizeStability === 'shrinking') {
    recommendations.push({
      type: 'team',
      message: 'Team size is decreasing. Adjust velocity expectations accordingly.',
      priority: 'medium',
      impact: 'neutral'
    });
  }
  
  return recommendations;
}

export default router; 