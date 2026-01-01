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

  try {
    const body = await req.json().catch(() => ({}));
    const { taskId, runId } = body;

    let task: ScheduledTask | null = null;
    let run: { id: string } | null = null;

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

    console.log(`Executing task: ${task.title} (run: ${run.id})`);

    // Update run status to running
    await supabase
      .from("scheduled_task_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", run.id);

    // Build the research query from task settings
    const researchQuery = buildResearchQuery(task);
    console.log("Research query:", researchQuery);

    // Step 1: Search for content (strict no-fabrication for Saudi market)
    const countryCode = normalizeCountryToCode(task.country);
    const isSaudi = isSaudiContext(countryCode, researchQuery);

    console.log("Country analysis:", { rawCountry: task.country, countryCode, isSaudi });

    const searchResponse = await supabase.functions.invoke("research-search", {
      body: {
        query: researchQuery,
        limit: task.research_depth === "deep" ? 15 : task.research_depth === "quick" ? 5 : 10,
        scrapeContent: true,
        strictMode: isSaudi, // Enforce strict mode for Saudi only
        minSources: isSaudi ? 3 : 2, // Higher bar for Saudi
        country: countryCode,
      },
    });

    if (searchResponse.error) {
      throw new Error(`Search failed: ${searchResponse.error.message || "unknown error"}`);
    }

    if (!searchResponse.data?.success) {
      const unreachable = (searchResponse.data?.unreachableSources || [])
        .map((s: any) => `${s.name} (${s.reason})`)
        .join(", ");
      throw new Error(`${searchResponse.data?.error || "Search returned no results"}${unreachable ? ` | Unreachable: ${unreachable}` : ""}`);
    }

    let searchResults = searchResponse.data?.data || [];
    console.log(`Found ${searchResults.length} search results`);

    // Step 2: Scrape custom websites if provided
    if (task.custom_websites && task.custom_websites.length > 0) {
      for (const url of task.custom_websites.slice(0, 5)) {
        try {
          const scrapeResponse = await supabase.functions.invoke("research-scrape", {
            body: { url, formats: ["markdown"], onlyMainContent: true },
          });
          if (scrapeResponse.data?.success && scrapeResponse.data?.data?.markdown) {
            searchResults.push({
              url,
              title: scrapeResponse.data.data.metadata?.title || url,
              description: "",
              markdown: scrapeResponse.data.data.markdown,
            });
          }
        } catch (e) {
          console.error(`Failed to scrape ${url}:`, e);
        }
      }
    }

    // Step 3: Compile content for analysis
    const contentParts: string[] = [];
    for (const result of searchResults) {
      const content = result.markdown || result.description || "";
      if (content) {
        contentParts.push(`## Source: ${result.title}\nURL: ${result.url}\n\n${content.substring(0, 5000)}\n\n---\n`);
      }
    }

    const compiledContent = contentParts.join("\n").substring(0, 50000);

    if (!compiledContent || compiledContent.length < 100) {
      throw new Error("Insufficient content found for report generation");
    }

    // Step 4: Generate report
    const analyzeResponse = await supabase.functions.invoke("research-analyze", {
      body: {
        query: researchQuery,
        content: compiledContent,
        type: "report",
        reportFormat: task.report_format,
      },
    });

    if (!analyzeResponse.data?.success || !analyzeResponse.data?.result) {
      throw new Error(analyzeResponse.data?.error || "Failed to generate report");
    }

    const reportContent = analyzeResponse.data.result;
    console.log("Report generated, length:", reportContent.length);

    // Step 5: Update run with report
    await supabase
      .from("scheduled_task_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        report_content: reportContent,
        report_format: task.report_format,
      })
      .eq("id", run.id);

    // Step 6: Send email if configured
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
        console.log("Email sent:", emailSent);
      } catch (e) {
        console.error("Failed to send email:", e);
      }

      await supabase
        .from("scheduled_task_runs")
        .update({ email_sent: emailSent })
        .eq("id", run.id);
    }

    // Step 7: Update next run time
    await updateNextRunTime(supabase, task);

    // Update last_run_at on the task
    await supabase
      .from("scheduled_research_tasks")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", task.id);

    return new Response(
      JSON.stringify({
        success: true,
        taskId: task.id,
        runId: run.id,
        reportLength: reportContent.length,
        emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error executing scheduled task:", error);

    // Update run status to failed
    const body = await req.json().catch(() => ({}));
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

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ----------------------------
// Country Mapping Utilities
// ----------------------------
type ISOCountryCode = 'sa' | 'ae' | 'us' | 'gb' | 'cn' | 'jp' | 'de' | 'fr' | 'in' | 'br' | 'ca' | 'au' | 'kr' | 'sg' | 'hk' | 'ch' | 'nl' | 'se' | 'es' | 'it' | 'ru' | 'mx' | 'id' | 'tr' | 'eg' | 'za' | 'ng' | 'qa' | 'kw' | 'bh' | 'om' | undefined;

const COUNTRY_MAPPING: Record<string, ISOCountryCode> = {
  // Saudi Arabia variants
  'sa': 'sa', 'saudi': 'sa', 'saudi-arabia': 'sa', 'saudi arabia': 'sa', 'ksa': 'sa',
  'kingdom of saudi arabia': 'sa',
  // UAE
  'ae': 'ae', 'uae': 'ae', 'united arab emirates': 'ae', 'emirates': 'ae', 'dubai': 'ae', 'abu dhabi': 'ae',
  // US
  'us': 'us', 'usa': 'us', 'united states': 'us', 'united-states': 'us', 'america': 'us',
  // UK
  'gb': 'gb', 'uk': 'gb', 'united kingdom': 'gb', 'united-kingdom': 'gb', 'britain': 'gb',
  // China
  'cn': 'cn', 'china': 'cn',
  // Japan
  'jp': 'jp', 'japan': 'jp',
  // Germany
  'de': 'de', 'germany': 'de',
  // France
  'fr': 'fr', 'france': 'fr',
  // India
  'in': 'in', 'india': 'in',
  // Brazil
  'br': 'br', 'brazil': 'br',
  // Canada
  'ca': 'ca', 'canada': 'ca',
  // Australia
  'au': 'au', 'australia': 'au',
  // South Korea
  'kr': 'kr', 'south korea': 'kr', 'south-korea': 'kr', 'korea': 'kr',
  // Singapore
  'sg': 'sg', 'singapore': 'sg',
  // Hong Kong
  'hk': 'hk', 'hong kong': 'hk', 'hong-kong': 'hk',
  // Switzerland
  'ch': 'ch', 'switzerland': 'ch',
  // Netherlands
  'nl': 'nl', 'netherlands': 'nl', 'holland': 'nl',
  // Sweden
  'se': 'se', 'sweden': 'se',
  // Spain
  'es': 'es', 'spain': 'es',
  // Italy
  'it': 'it', 'italy': 'it',
  // Russia
  'ru': 'ru', 'russia': 'ru',
  // Mexico
  'mx': 'mx', 'mexico': 'mx',
  // Indonesia
  'id': 'id', 'indonesia': 'id',
  // Turkey
  'tr': 'tr', 'turkey': 'tr',
  // Egypt
  'eg': 'eg', 'egypt': 'eg',
  // South Africa
  'za': 'za', 'south africa': 'za', 'south-africa': 'za',
  // Nigeria
  'ng': 'ng', 'nigeria': 'ng',
  // Qatar
  'qa': 'qa', 'qatar': 'qa',
  // Kuwait
  'kw': 'kw', 'kuwait': 'kw',
  // Bahrain
  'bh': 'bh', 'bahrain': 'bh',
  // Oman
  'om': 'om', 'oman': 'om',
};

function normalizeCountryToCode(raw: string | null | undefined): ISOCountryCode {
  if (!raw) return undefined;
  const key = raw.toLowerCase().trim().replace(/[_\-]+/g, ' ');
  return COUNTRY_MAPPING[key] ?? undefined;
}

function isSaudiContext(countryCode: ISOCountryCode, query: string): boolean {
  if (countryCode === 'sa') return true;
  // Fallback keyword detection in query
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
