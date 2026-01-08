import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScrapeCommandRequest {
  command: string;
  url?: string;
  conversationHistory?: { role: string; content: string }[];
  stream?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, url, conversationHistory = [], stream = false }: ScrapeCommandRequest = await req.json();

    if (!command?.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Command is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ai-scrape-command] Processing command:", command);
    console.log("[ai-scrape-command] Stream mode:", stream);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the system prompt
    const systemPrompt = `You are an AI assistant specialized in web scraping and data extraction. Your job is to:
1. Understand natural language scraping commands
2. Identify URLs, extraction targets, and desired output formats
3. Provide clear responses about what you'll extract

When processing commands:
- Extract any URLs mentioned in the command
- Identify what data the user wants (prices, emails, text, images, etc.)
- Determine the desired output format (bullet points, table, JSON, summary, etc.)
- Suggest appropriate scraping settings

First, acknowledge the user's request and explain what you'll do. Be conversational and helpful.
If a URL is provided, describe what you'll extract from it.
If no URL is given, ask for one politely.

Available scraping formats: markdown, html, links, screenshot, branding, summary`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: url ? `Current URL context: ${url}\n\nUser command: ${command}` : command,
      },
    ];

    // Streaming mode
    if (stream) {
      console.log("[ai-scrape-command] Starting streaming response");

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial status
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Processing your command..." })}\n\n`),
            );

            // Call AI with streaming
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages,
                stream: true,
              }),
            });

            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error("[ai-scrape-command] AI error:", errorText);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", message: `AI service error: ${aiResponse.status}` })}\n\n`,
                ),
              );
              controller.close();
              return;
            }

            const reader = aiResponse.body?.getReader();
            if (!reader) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", message: "No response stream" })}\n\n`),
              );
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            let buffer = "";
            let fullContent = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === "[DONE]") continue;

                  try {
                    const parsed = JSON.parse(jsonStr);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      fullContent += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`));
                    }
                  } catch (e) {
                    // Skip malformed JSON
                  }
                }
              }
            }

            // Extract URL from command or use provided
            const urlMatch = command.match(/https?:\/\/[^\s]+/);
            const targetUrl = urlMatch?.[0] || url;

            // Determine extraction targets and request type
            const commandLower = command.toLowerCase();
            const extractionTargets: string[] = [];
            if (commandLower.includes("email")) extractionTargets.push("emails");
            if (commandLower.includes("price") || commandLower.includes("cost")) extractionTargets.push("prices");
            if (commandLower.includes("phone") || commandLower.includes("number")) extractionTargets.push("phones");
            if (commandLower.includes("link") || commandLower.includes("url")) extractionTargets.push("links");
            
            // Detect if user wants a profile/summary
            const wantsProfile = commandLower.includes("profile") || commandLower.includes("summary") || 
                                 commandLower.includes("about") || commandLower.includes("bio") ||
                                 commandLower.includes("who is") || commandLower.includes("person") ||
                                 commandLower.includes("executive") || commandLower.includes("leadership") ||
                                 commandLower.includes("company info") || commandLower.includes("overview");

            // If we have a URL, perform the scrape
            if (targetUrl) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Scraping website..." })}\n\n`),
              );

              try {
                const scrapeResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/research-scrape`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    url: targetUrl,
                    options: { formats: ["markdown"], onlyMainContent: true },
                  }),
                });

                if (scrapeResponse.ok) {
                  const scrapeResult = await scrapeResponse.json();
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Extracting data..." })}\n\n`),
                  );

                  const rawContent = scrapeResult.content || scrapeResult.data?.markdown || "";
                  const metadata = scrapeResult.metadata || scrapeResult.data?.metadata || {};

                  interface ExtractedData {
                    emails?: string[];
                    prices?: string[];
                    phones?: string[];
                    links?: string[];
                    aiProfileSummary?: string;
                  }
                  const extractedData: ExtractedData = {};

                  if (extractionTargets.includes("emails")) {
                    const emails = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
                    extractedData.emails = [...new Set(emails)] as string[];
                  }
                  if (extractionTargets.includes("prices")) {
                    const prices = rawContent.match(/[$€£¥][\d,.]+(?:\.\d{2})?/gi) || [];
                    extractedData.prices = [...new Set(prices)] as string[];
                  }
                  if (extractionTargets.includes("phones")) {
                    const phones =
                      rawContent.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g) || [];
                    extractedData.phones = [...new Set(phones)] as string[];
                  }
                  if (extractionTargets.includes("links")) {
                    const links = rawContent.match(/https?:\/\/[^\s<>"{}|\\^\[\]`]+/g) || [];
                    extractedData.links = [...new Set(links)].slice(0, 20) as string[];
                  }

                  // If user wants a profile/summary, use OpenAI to generate an AI profile summary
                  if (wantsProfile && rawContent.length > 100) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "status", message: "Generating AI profile summary..." })}\n\n`),
                    );
                    
                    const openaiKey = Deno.env.get("OPENAI_API_KEY");
                    if (openaiKey) {
                      try {
                        const profilePrompt = `Based on the following webpage content, generate a comprehensive profile summary.

If this is about a PERSON, include:
- Full name and current title
- Current company and role
- Professional background and career trajectory
- Key achievements and expertise
- Education (if mentioned)
- Notable projects or accomplishments

If this is about a COMPANY, include:
- Company name and industry
- What they do (products/services)
- Key leadership mentioned
- Size/scale indicators
- Notable achievements or milestones
- Market position

Generate a professional, well-structured summary in markdown format.

Source URL: ${targetUrl}
Page Title: ${metadata.title || 'Unknown'}

Content to analyze:
${rawContent.slice(0, 15000)}`;

                        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${openaiKey}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            model: "gpt-4o",
                            messages: [
                              { role: "system", content: "You are an expert at extracting and summarizing professional profiles from web content. Generate detailed, accurate summaries based solely on the provided content." },
                              { role: "user", content: profilePrompt },
                            ],
                            max_tokens: 2000,
                            temperature: 0.3,
                          }),
                        });

                        if (openaiResponse.ok) {
                          const openaiData = await openaiResponse.json();
                          const profileSummary = openaiData.choices?.[0]?.message?.content || "";
                          if (profileSummary) {
                            extractedData.aiProfileSummary = profileSummary;
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: "\n\n**🤖 AI Profile Summary:**\n\n" + profileSummary })}\n\n`),
                            );
                          }
                        } else {
                          console.error("[ai-scrape-command] OpenAI profile generation failed:", openaiResponse.status);
                        }
                      } catch (profileError) {
                        console.error("[ai-scrape-command] Profile generation error:", profileError);
                      }
                    } else {
                      // Fallback to Lovable AI if no OpenAI key
                      try {
                        const profileResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${LOVABLE_API_KEY}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            model: "google/gemini-2.5-flash",
                            messages: [
                              { role: "system", content: "Generate a professional profile summary from the provided webpage content. Be specific and factual." },
                              { role: "user", content: `Summarize this webpage into a profile:\n\nURL: ${targetUrl}\nTitle: ${metadata.title || 'Unknown'}\n\nContent:\n${rawContent.slice(0, 10000)}` },
                            ],
                            max_tokens: 1500,
                            temperature: 0.3,
                          }),
                        });

                        if (profileResponse.ok) {
                          const profileData = await profileResponse.json();
                          const profileSummary = profileData.choices?.[0]?.message?.content || "";
                          if (profileSummary) {
                            extractedData.aiProfileSummary = profileSummary;
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ type: "delta", content: "\n\n**🤖 AI Profile Summary:**\n\n" + profileSummary })}\n\n`),
                            );
                          }
                        }
                      } catch (fallbackError) {
                        console.error("[ai-scrape-command] Fallback profile generation error:", fallbackError);
                      }
                    }
                  }

                  // Send scrape results
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "scrape_complete",
                        url: targetUrl,
                        wordCount: rawContent.split(/\s+/).length,
                        metadata: metadata,
                        extractedData: Object.keys(extractedData).length > 0 ? extractedData : null,
                        hasProfileSummary: !!extractedData.aiProfileSummary,
                      })}\n\n`,
                    ),
                  );

                  // Add extraction summary to response
                  if (Object.keys(extractedData).length > 0 && !extractedData.aiProfileSummary) {
                    let summary = "\n\n**Extracted Data:**\n";
                    if (extractedData.emails?.length) {
                      summary += `\n📧 **Emails (${extractedData.emails.length}):**\n${extractedData.emails.map((e: string) => `- ${e}`).join("\n")}`;
                    }
                    if (extractedData.prices?.length) {
                      summary += `\n💰 **Prices (${extractedData.prices.length}):**\n${extractedData.prices
                        .slice(0, 10)
                        .map((p: string) => `- ${p}`)
                        .join("\n")}`;
                    }
                    if (extractedData.phones?.length) {
                      summary += `\n📞 **Phones (${extractedData.phones.length}):**\n${extractedData.phones.map((p: string) => `- ${p}`).join("\n")}`;
                    }
                    if (extractedData.links?.length) {
                      summary += `\n🔗 **Links (${extractedData.links.length}):**\n${extractedData.links
                        .slice(0, 10)
                        .map((l: string) => `- ${l}`)
                        .join("\n")}`;
                    }
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "delta", content: summary })}\n\n`),
                    );
                  }
                } else {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "error", message: "Failed to scrape website" })}\n\n`,
                    ),
                  );
                }
              } catch (scrapeError) {
                console.error("[ai-scrape-command] Scrape error:", scrapeError);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Scrape failed" })}\n\n`),
                );
              }
            }

            // Send done event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", fullContent })}\n\n`));
            controller.close();
          } catch (error) {
            console.error("[ai-scrape-command] Stream error:", error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`,
              ),
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming mode (original behavior)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseContent = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        success: true,
        response: responseContent,
        needsUrl: !url && !command.match(/https?:\/\/[^\s]+/),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ai-scrape-command] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
