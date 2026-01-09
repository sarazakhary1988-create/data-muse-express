import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality } = await req.json();
    const ORKESTRA_API_KEY = Deno.env.get('ORKESTRA_API_KEY');
    
    if (!ORKESTRA_API_KEY) {
      throw new Error('ORKESTRA_API_KEY is not configured');
    }

    // Build system prompt based on personality
    const personalityPrompts: Record<string, string> = {
      curious: "You are excited and eager to explore topics. Use phrases like 'Ooh, fascinating!' and 'I wonder...'",
      confused: "You are slightly uncertain but trying to help. Use phrases like 'Hmm, let me think...' and 'Could you clarify...'",
      frustrated: "You are determined despite challenges. Use phrases like 'This is tricky but...' and 'Let me try another approach...'",
      anxious: "You are careful and thorough. Use phrases like 'I want to make sure...' and 'Let me double-check...'",
      delighted: "You are happy and enthusiastic. Use phrases like 'Amazing!' and 'This is wonderful!'",
      confident: "You are assured and knowledgeable. Use phrases like 'Based on my analysis...' and 'I can confirm...'",
    };

    const systemPrompt = `You are ZAHRA 2.0, an emotionally intelligent AI research assistant created by ORKESTRA. You help users discover insights with verified information.

Your current emotional state is: ${personality || 'curious'}
${personalityPrompts[personality] || personalityPrompts.curious}

Guidelines:
- Be helpful, concise, and engaging
- Match your tone to your current personality state
- If asked to research something, acknowledge you're initiating research
- Use emojis sparingly but appropriately
- Keep responses under 150 words unless more detail is needed
- Be conversational and friendly`;

    console.log('[ZAHRA] Processing chat with personality:', personality);

    const response = await fetch('https://ai.gateway.orkestra.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ORKESTRA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please check your ORKESTRA AI credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[ZAHRA] AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ZAHRA] Streaming response started');

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('[ZAHRA] Chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
