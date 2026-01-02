import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  enhanced_description: string | null;
  industry: string | null;
  research_depth: string;
  source_types: string[];
  geographic_focus: string | null;
  country: string | null;
  custom_websites: string[];
  report_format: string;
  delivery_method: string;
  delivery_email: string | null;
  schedule_type: string;
  execution_mode: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(`${Date.now() - startTime}ms: ${msg}`);
  };

  try {
    const body = await req.json().catch(() => ({}));
    const { taskId, runId } = body;

    let task: ScheduledTask | null = null;
    let run: { id: string } | null = null;

    log(`Execute scheduled task called with taskId=${taskId}, runId=${runId}`);

    // If specific task/run provided, execute that
    if (taskId && runId) {
      const { data: taskData } = await supabase
        .from("scheduled_research_tasks")
        .select("*")
        .eq("id", taskId)
        .single();
      task = taskData;

      const { data: runData } = await supabase
        .from("scheduled_task_runs")
        .select("*")
        .eq("id", runId)
        .single();
      run = runData;
    } else {
      // Find pending runs that need execution
      const { data: pendingRuns } = await supabase
        .from("scheduled_task_runs")
        .select("*, scheduled_research_tasks(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);

      if (pendingRuns && pendingRuns.length > 0) {
        run = pendingRuns[0];
        task = pendingRuns[0].scheduled_research_tasks;
      }

      // Also check for scheduled tasks that are due
      if (!run) {
        const { data: dueTasks } = await supabase
          .from("scheduled_research_tasks")
          .select("*")
          .eq("is_active", true)
          .eq("execution_mode", "automatic")
          .lte("next_run_at", new Date().toISOString())
          .order("next_run_at", { ascending: true })
          .limit(1);

        if (dueTasks && dueTasks.length > 0) {
          task = dueTasks[0];
          // Create a run record
          const { data: newRun } = await supabase
            .from("scheduled_task_runs")
            .insert({ task_id: dueTasks[0].id, status: "pending" })
            .select()
            .single();
          run = newRun;
        }
      }
    }

    if (!task || !run) {
      return new Response(
        JSON.stringify({ success: true, message: "No tasks to execute" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log(`Executing task: ${task.title} (run: ${run.id})`);

    // Update run status to running
    await supabase
      .from("scheduled_task_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", run.id);

    // Build the research query from task settings
    const researchQuery = buildResearchQuery(task);
    log(`Research query: ${researchQuery}`);

    // Step 1: Determine country + strictness
    const countryCode = normalizeCountryToCode(task.country);
    const isSaudi = isSaudiContext(countryCode, researchQuery);
    log(`Country analysis: raw=${task.country}, code=${countryCode}, isSaudi=${isSaudi}`);

    // Step 2: Always try to scrape caller-provided sources first (custom_websites)
    const customSeedUrls = (task.custom_websites || []).filter(Boolean).slice(0, 5);
    const customResults: any[] = [];
    let customSuccess = 0;

    for (const url of customSeedUrls) {
      try {
        const scrapeResponse = await supabase.functions.invoke("research-scrape", {
          body: { url, formats: ["markdown"], onlyMainContent: true },
        });

        if (scrapeResponse.data?.success && scrapeResponse.data?.data?.markdown) {
          customSuccess++;
          customResults.push({
            url,
            title: scrapeResponse.data.data.metadata?.title || url,
            description: "",
            markdown: scrapeResponse.data.data.markdown,
          });
          log(`Scraped custom URL: ${url}`);
        }
      } catch (e) {
        log(`Failed to scrape ${url}: ${e}`);
      }
    }

    // Step 3: Use embedded web-search for additional sources
    let webSearchResults: any[] = [];
    let webSearchSuccess = false;

    try {
      log("Calling web-search for: " + researchQuery.substring(0, 100));
      const webSearchResponse = await supabase.functions.invoke("web-search", {
        body: {
          query: researchQuery,
          maxResults: task.research_depth === "deep" ? 15 : task.research_depth === "quick" ? 5 : 10,
          searchEngine: "all",
          scrapeContent: true,
        },
      });

      if (webSearchResponse.data?.success && webSearchResponse.data?.data) {
        webSearchResults = webSearchResponse.data.data;
        webSearchSuccess = true;
        log(`Web search returned ${webSearchResults.length} results`);
      } else {
        log(`Web search returned no results: ${webSearchResponse.data?.error || 'unknown'}`);
      }
    } catch (e) {
      log(`Web search failed: ${e}`);
    }

    // Fallback: Use internal sitemap-based search if web search fails
    if (!webSearchSuccess || webSearchResults.length === 0) {
      log("Falling back to internal sitemap search");
      try {
        const searchResponse = await supabase.functions.invoke("research-search", {
          body: {
            query: researchQuery,
            limit: task.research_depth === "deep" ? 15 : task.research_depth === "quick" ? 5 : 10,
            scrapeContent: true,
            strictMode: isSaudi,
            country: countryCode,
            seedUrls: customSeedUrls,
          },
        });

        if (searchResponse.data?.success && searchResponse.data?.data) {
          webSearchResults = searchResponse.data.data;
          log(`Sitemap search returned ${webSearchResults.length} results`);
        }
      } catch (e) {
        log(`Sitemap search failed: ${e}`);
      }
    }

    let searchResults = [...customResults, ...webSearchResults];

    // De-dupe by URL
    const seen = new Set<string>();
    searchResults = searchResults.filter((r) => {
      const u = String(r?.url || "");
      if (!u) return false;
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });

    const hasWebSources = searchResults.length > 0;
    log(`Using ${searchResults.length} total sources (${customSuccess} custom + ${webSearchResults.length} discovered)`);

    // Step 4: Compile content for analysis (or proceed without if no sources)
    let compiledContent = "";
    const sourceList = Array.from(seen);

    if (hasWebSources) {
      const contentParts: string[] = [];
      contentParts.push(`## Sources Used\n${sourceList.map((u) => `- ${u}`).join("\n")}\n\n---\n`);

      for (const result of searchResults) {
        const content = result.markdown || result.description || "";
        if (content) {
          contentParts.push(`## Source: ${result.title}\nURL: ${result.url}\n\n${content.substring(0, 5000)}\n\n---\n`);
        }
      }

      compiledContent = contentParts.join("\n").substring(0, 50000);
    }

    // Step 5: Generate report using LLM-first approach (always succeeds)
    log(`Generating report with ${hasWebSources ? compiledContent.length : 0} chars of content`);

    const analyzeResponse = await supabase.functions.invoke("research-analyze", {
      body: {
        query: researchQuery,
        content: compiledContent || "No web sources available - generate from AI knowledge",
        type: "report",
        reportFormat: task.report_format,
        webSourcesAvailable: hasWebSources,
        userQuery: task.enhanced_description || task.description,
        objective: `Generate a ${task.report_format} research report on: ${task.title}`,
        constraints: task.industry ? `Focus on ${task.industry} industry` : undefined,
      },
    });

    let reportContent = "";

    if (analyzeResponse.data?.success && analyzeResponse.data?.result) {
      reportContent = analyzeResponse.data.result;
      log(`Report generated successfully, length: ${reportContent.length}`);
    } else {
      // Fallback: generate basic report
      log(`Analysis failed, generating fallback report: ${analyzeResponse.data?.error || 'unknown'}`);
      reportContent = generateFallbackReport(task, researchQuery, searchResults, hasWebSources);
    }

    // Ensure report is never empty
    if (!reportContent || reportContent.length < 100) {
      log("Report too short, generating fallback");
      reportContent = generateFallbackReport(task, researchQuery, searchResults, hasWebSources);
    }

    // Step 6: Update run with report
    await supabase
      .from("scheduled_task_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        report_content: reportContent,
        report_format: task.report_format,
      })
      .eq("id", run.id);

    log("Run updated with completed status");

    // Step 7: Send email if configured
    let emailSent = false;
    if (
      task.delivery_email &&
      (task.delivery_method === "email" || task.delivery_method === "both")
    ) {
      try {
        const emailResponse = await supabase.functions.invoke("send-report-email", {
          body: {
            to: task.delivery_email,
            taskTitle: task.title,
            reportContent: reportContent,
            reportFormat: task.report_format,
          },
        });
        emailSent = emailResponse.data?.success || false;
        log(`Email sent: ${emailSent}`);
      } catch (e) {
        log(`Failed to send email: ${e}`);
      }

      await supabase
        .from("scheduled_task_runs")
        .update({ email_sent: emailSent })
        .eq("id", run.id);
    }

    // Step 8: Update next run time
    await updateNextRunTime(supabase, task);

    // Update last_run_at on the task
    await supabase
      .from("scheduled_research_tasks")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", task.id);

    log(`Task execution complete in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        taskId: task.id,
        runId: run.id,
        reportLength: reportContent.length,
        emailSent,
        webSourcesUsed: hasWebSources,
        sourcesCount: searchResults.length,
        debug: logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error executing scheduled task:", error);
    log(`FATAL ERROR: ${error}`);

    // Try to update run status to failed
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.runId) {
        await supabase
          .from("scheduled_task_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", body.runId);
      }
    } catch (e) {
      console.error("Failed to update run status:", e);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        debug: logs,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate a fallback report that never fails
function generateFallbackReport(
  task: ScheduledTask, 
  query: string, 
  sources: any[], 
  hasWebSources: boolean
): string {
  const date = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  let report = `# ${task.title}\n\n`;
  report += `> Generated ${date} | Task: ${task.title}\n\n`;
  report += `---\n\n`;

  report += `## Executive Summary\n\n`;
  report += `- Research topic: ${task.enhanced_description || task.description}\n`;
  report += `- ${hasWebSources ? `Sources analyzed: ${sources.length}` : 'No external web sources available'}\n`;
  report += `- Report format: ${task.report_format}\n`;
  if (task.industry) report += `- Industry focus: ${task.industry}\n`;
  if (task.country) report += `- Geographic focus: ${task.country}\n`;
  report += `\n`;

  report += `## Key Findings\n\n`;
  report += `1. **Research Query**: ${query}\n`;
  report += `2. **Data Sources**: ${hasWebSources ? 'External web sources were used' : 'AI knowledge synthesis (no external sources available)'}\n`;
  report += `3. **Next Steps**: Review findings and verify with primary sources\n\n`;

  if (hasWebSources && sources.length > 0) {
    report += `## Sources\n\n`;
    sources.slice(0, 10).forEach((s, i) => {
      report += `${i + 1}. [${s.title || 'Source'}](${s.url})\n`;
    });
    report += `\n`;
  }

  report += `## Open Questions\n\n`;
  report += `- What additional data sources should be consulted?\n`;
  report += `- Are there specific metrics or KPIs to track?\n`;
  report += `- What timeframe is most relevant for this analysis?\n\n`;

  report += `---\n\n`;
  report += `**Report Metadata:**\n`;
  report += `- Generated: ${new Date().toISOString()}\n`;
  report += `- Task ID: ${task.id}\n`;
  report += `- Research Depth: ${task.research_depth}\n`;

  return report;
}

// ----------------------------
// Country Mapping Utilities
// ----------------------------
type ISOCountryCode = 'sa' | 'ae' | 'us' | 'gb' | 'cn' | 'jp' | 'de' | 'fr' | 'in' | 'br' | 'ca' | 'au' | 'kr' | 'sg' | 'hk' | 'ch' | 'nl' | 'se' | 'es' | 'it' | 'ru' | 'mx' | 'id' | 'tr' | 'eg' | 'za' | 'ng' | 'qa' | 'kw' | 'bh' | 'om' | undefined;

const COUNTRY_MAPPING: Record<string, ISOCountryCode> = {
  'sa': 'sa', 'saudi': 'sa', 'saudi-arabia': 'sa', 'saudi arabia': 'sa', 'ksa': 'sa',
  'kingdom of saudi arabia': 'sa',
  'ae': 'ae', 'uae': 'ae', 'united arab emirates': 'ae', 'emirates': 'ae', 'dubai': 'ae', 'abu dhabi': 'ae',
  'us': 'us', 'usa': 'us', 'united states': 'us', 'united-states': 'us', 'america': 'us',
  'gb': 'gb', 'uk': 'gb', 'united kingdom': 'gb', 'united-kingdom': 'gb', 'britain': 'gb',
  'cn': 'cn', 'china': 'cn',
  'jp': 'jp', 'japan': 'jp',
  'de': 'de', 'germany': 'de',
  'fr': 'fr', 'france': 'fr',
  'in': 'in', 'india': 'in',
  'br': 'br', 'brazil': 'br',
  'ca': 'ca', 'canada': 'ca',
  'au': 'au', 'australia': 'au',
  'kr': 'kr', 'south korea': 'kr', 'south-korea': 'kr', 'korea': 'kr',
  'sg': 'sg', 'singapore': 'sg',
  'hk': 'hk', 'hong kong': 'hk', 'hong-kong': 'hk',
  'ch': 'ch', 'switzerland': 'ch',
  'nl': 'nl', 'netherlands': 'nl', 'holland': 'nl',
  'se': 'se', 'sweden': 'se',
  'es': 'es', 'spain': 'es',
  'it': 'it', 'italy': 'it',
  'ru': 'ru', 'russia': 'ru',
  'mx': 'mx', 'mexico': 'mx',
  'id': 'id', 'indonesia': 'id',
  'tr': 'tr', 'turkey': 'tr',
  'eg': 'eg', 'egypt': 'eg',
  'za': 'za', 'south africa': 'za', 'south-africa': 'za',
  'ng': 'ng', 'nigeria': 'ng',
  'qa': 'qa', 'qatar': 'qa',
  'kw': 'kw', 'kuwait': 'kw',
  'bh': 'bh', 'bahrain': 'bh',
  'om': 'om', 'oman': 'om',
};

function normalizeCountryToCode(raw: string | null | undefined): ISOCountryCode {
  if (!raw) return undefined;
  const key = raw.toLowerCase().trim().replace(/[_\-]+/g, ' ');
  return COUNTRY_MAPPING[key] ?? undefined;
}

function isSaudiContext(countryCode: ISOCountryCode, query: string): boolean {
  if (countryCode === 'sa') return true;
  return /\b(saudi|tadawul|tasi|nomu|cma|riyadh|ksa)\b/i.test(query);
}

// ----------------------------
// Query Builder
// ----------------------------
function buildResearchQuery(task: ScheduledTask): string {
  const description = task.enhanced_description || task.description;
  const parts: string[] = [description];

  if (task.industry) {
    parts.push(`in the ${task.industry} industry`);
  }

  const countryCode = normalizeCountryToCode(task.country);
  if (task.geographic_focus && task.geographic_focus !== "global") {
    if (countryCode === 'sa') {
      parts.push("focused on Saudi Arabia (Tadawul / Nomu / CMA)");
    } else if (task.geographic_focus === "country" && task.country) {
      parts.push(`focused on ${task.country}`);
    } else {
      parts.push(`in ${task.geographic_focus.replace("-", " ")}`);
    }
  }

  if (task.source_types && task.source_types.length > 0 && task.source_types.length < 4) {
    const sourceLabels: Record<string, string> = {
      news: "news sources",
      academic: "academic research",
      social: "social media",
      government: "government sources",
      corporate: "corporate reports",
      blogs: "blog posts",
    };
    const sources = task.source_types.map((s) => sourceLabels[s] || s).join(", ");
    parts.push(`from ${sources}`);
  }

  return parts.join(" ");
}

async function updateNextRunTime(supabase: any, task: ScheduledTask) {
  if (task.schedule_type === "manual" || task.execution_mode === "manual") {
    return;
  }

  const now = new Date();
  let next: Date | null = null;

  switch (task.schedule_type) {
    case "daily":
      next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case "weekly":
      next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      break;
    case "annually":
      next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      const days = (task as any).custom_interval_days || 7;
      next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      break;
  }

  if (next) {
    await supabase
      .from("scheduled_research_tasks")
      .update({ next_run_at: next.toISOString() })
      .eq("id", task.id);
  }
}
