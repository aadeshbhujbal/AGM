import { Request, Response } from "express";
import { fetchWithProxy } from "../utils/fetchWithProxy";
import config from "../config";
import logger from "../utils/logger";

export const healthCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
  res.json({
    status: "Healthy",
    timestamp: new Date().toISOString(),
    service: "Node Microservice",
    version: "1.0.0",
  });
};

export const statusCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Check Jira
  let jiraStatus = "ok";
  try {
    if (!config.jiraUrl || !config.jiraUser || !config.jiraToken) {
      throw new Error("Missing Jira env vars");
    }

    await fetchWithProxy(`${config.jiraUrl}/rest/api/3/myself`, {
      method: "GET",
      auth: { username: config.jiraUser, password: config.jiraToken },
    });
  } catch (err) {
    jiraStatus = (err as Error).message || "error";
    logger.error(`Jira health check failed: ${jiraStatus}`);
  }

  // Check Confluence
  let confluenceStatus = "ok";
  try {
    if (!config.confluenceUrl || !config.confluenceUser || !config.confluenceToken) {
      throw new Error("Missing Confluence env vars");
    }

    await fetchWithProxy(`${config.confluenceUrl}/wiki/rest/api/user/current`, {
      method: "GET",
      auth: { username: config.confluenceUser, password: config.confluenceToken },
    });
  } catch (err) {
    confluenceStatus = (err as Error).message || "error";
    logger.error(`Confluence health check failed: ${confluenceStatus}`);
  }

  // Check GitLab
  let gitlabStatus = "ok";
  try {
    if (!config.gitlabToken) {
      throw new Error("Missing GitLab token");
    }

    // Use native fetch instead of fetchWithProxy for GitLab
    const response = await fetch(`${config.gitlabHost}/api/v4/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.gitlabToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    logger.error(`GitLab health check failed: ${(err as Error).message}`);
    gitlabStatus = (err as Error).message || "error";
  }

  // System parameters
  const memoryUsage = process.memoryUsage();
  const system = {
    uptimeSeconds: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
  };

  // Overall status
  const overall =
    jiraStatus === "ok" && confluenceStatus === "ok" && gitlabStatus === "ok"
      ? "ok"
      : "degraded";
      
  logger.info(`Health check completed - Overall: ${overall}, Jira: ${jiraStatus}, Confluence: ${confluenceStatus}, GitLab: ${gitlabStatus}`);
  
  res.json({
    status: overall,
    jira: jiraStatus,
    confluence: confluenceStatus,
    gitlab: gitlabStatus,
    system,
  });
};
